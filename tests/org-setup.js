/* Setup Express (docs/business-v2.md, A3) : identité, premier savoir (règle écrite devenue PDF, ou document), cartes
   de connaissances (modifier, exclure, « Tout valider » sans contourner la provenance), compétences proposées à partir
   des seules connaissances validées, première expérience (client mystère ou invitation facultative).
   Supabase et la fonction sont simulés avec les mêmes règles que la base : la validation est refusée tant que le serveur
   n'a pas retrouvé l'extrait dans le fichier stocké (migration 009, testée pour de vrai dans tests/db-rls.js), et
   l'extraction ne garde que des extraits copiés mot pour mot (tests Deno de la fonction).
   Lancer depuis la racine du dépôt :  node tests/org-setup.js   (Playwright requis). */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.mjs': 'text/javascript' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' : ' + extra : ''}`); if (!ok) failed++; };
const SB = 'https://nnqtgwgwalbbhqzceged.supabase.co';
const jwt = (sub) => `x.${Buffer.from(JSON.stringify({ sub })).toString('base64url')}.y`;
const ME = { id: 'u-alice', email: 'alice@boulangerie.fr' };
const TOKEN = jwt(ME.id);
const RULE = 'Lorsqu’un client demande un remboursement, vérifier le ticket de caisse et l’état du produit. Le client dispose de 30 jours pour un retour. Un avoir est proposé sous 48 heures. Ne jamais rembourser en espèces au-delà de 150 euros.';

/* ---------- Faux Supabase ---------- */
const db = { orgs: [], sources: [], versions: [], knowledge: [], uploads: [], calls: [], skills: [], links: [], invites: [] };
function handle(r) {
  const u = new URL(r.url()); const p = u.pathname; const raw = r.postData() || '';
  const ok = (data, status = 200) => ({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: data === undefined ? '' : JSON.stringify(data) });
  if ((r.headers().authorization || '').replace('Bearer ', '') !== TOKEN) return ok({ message: 'JWT invalide' }, 401);
  const body = raw && !p.startsWith('/storage/') ? JSON.parse(raw) : {};
  db.calls.push({ p, method: r.method(), body });
  const eq = (k) => (u.searchParams.get(k) || '').replace(/^eq\./, '');
  const mine = (org) => db.orgs.some((o) => o.id === org);
  if (p === '/rest/v1/rpc/my_organizations') return ok(db.orgs.map((o) => ({ id: o.id, name: o.name, sector: o.sector, role: 'admin', setup: o.setup, onboarded: o.onboarded })));
  if (p === '/rest/v1/rpc/create_organization') { const id = crypto.randomUUID(); db.orgs.push({ id, name: body.p_name, sector: body.p_sector, setup: {}, onboarded: false }); return ok(id); }
  if (p === '/rest/v1/rpc/update_organization') { const o = db.orgs.find((x) => x.id === body.p_org); if (!o) return ok({ message: 'accès refusé' }, 400); o.setup = body.p_setup; return ok(null); }
  if (p === '/rest/v1/rpc/mark_onboarded') { const o = db.orgs.find((x) => x.id === body.p_org); o.onboarded = true; return ok(null); }
  if (p === '/rest/v1/rpc/add_source') {
    if (!mine(body.p_org)) return ok({ message: 'accès refusé' }, 400);
    const sid = crypto.randomUUID(), vid = crypto.randomUUID();
    db.sources.push({ id: sid, org_id: body.p_org, title: body.p_title, current_version: 1, created_at: new Date().toISOString() });
    db.versions.push({ id: vid, source_id: sid, version: 1, checksum: body.p_checksum, page_count: body.p_pages, storage_path: `${body.p_org}/${sid}/v1.pdf` });
    return ok([{ source_id: sid, version_id: vid, version: 1, storage_path: `${body.p_org}/${sid}/v1.pdf` }]);
  }
  if (p.startsWith('/storage/v1/object/org-sources/')) { db.uploads.push({ key: p.replace('/storage/v1/object/org-sources/', ''), type: r.headers()['content-type'], size: (r.postDataBuffer() || Buffer.alloc(0)).length }); return ok({ Key: 'k' }); }
  if (p === '/functions/v1/tutor' && body.task === 'extraire') {
    // comme le vrai serveur : une connaissance par phrase, extrait copié mot pour mot, page du passage
    const items = body.passages.flatMap((ps) => ps.text.split(/(?<=\.)\s+/).filter((x) => x.length > 20).map((x) => ({ kind: /Ne jamais/.test(x) ? 'sensible' : 'regle', title: x.split(' ').slice(0, 6).join(' '), body: x, quote: x.replace(/\.$/, ''), page: ps.page, confidence: 0.8 })));
    return ok({ items, dropped: 0, usage: { used: 1, limit: 150 } });
  }
  if (p === '/functions/v1/tutor' && body.task === 'verifier_provenance') {
    // le serveur relit le fichier stocké : ici, l'extrait « 48 heures » n'y est pas retrouvé (cas d'échec à couvrir)
    const ks = db.knowledge.filter((k) => k.source_version_id === body.version);
    ks.forEach((k) => { k.provenance = /48 heures/.test(k.quote) ? 'introuvable' : 'verifiee'; });
    return ok({ verified: ks.filter((k) => k.provenance === 'verifiee').length, notFound: ks.filter((k) => k.provenance === 'introuvable').map((k) => k.id) });
  }
  if (p === '/functions/v1/tutor' && body.task === 'competences') {
    // proposées à partir des seules connaissances validées
    const valid = db.knowledge.filter((k) => k.status === 'valide');
    return ok({ skills: valid.length ? [{ name: 'Traiter une demande de retour', description: 'Vérifier le ticket et proposer la bonne solution.', knowledge: valid.map((k) => k.id) }, { name: 'Appliquer les délais', description: 'Respecter le délai de retour.', knowledge: valid.slice(0, 1).map((k) => k.id) }] : [] });
  }
  if (p === '/functions/v1/tutor') return ok({ message: `tâche inconnue ${body.task}` }, 400);
  if (p === '/rest/v1/rpc/set_knowledge_status') {
    const k = db.knowledge.find((x) => x.id === body.p_id);
    // migration 009 : pas de validation sans provenance vérifiée par le serveur
    if (body.p_status === 'valide' && k.provenance !== 'verifiee') return ok({ message: 'provenance non vérifiée : l’extrait doit être retrouvé par le serveur dans le document stocké' }, 400);
    k.status = body.p_status; return ok(null);
  }
  if (p === '/rest/v1/source_versions') return ok(db.versions.filter((v) => v.source_id === eq('source_id') && (!u.searchParams.get('version') || `${v.version}` === eq('version'))).map(({ checksum, storage_path, ...v }) => v));
  if (p === '/rest/v1/knowledge_nodes' && r.method() === 'GET') {
    const sv = u.searchParams.get('source_version_id') || ''; const ids = sv.startsWith('in.') ? sv.replace(/^in\.\(|\)$/g, '').split(',') : [sv.replace(/^eq\./, '')];
    return ok(db.knowledge.filter((k) => (!sv || ids.includes(k.source_version_id)) && (!u.searchParams.get('status') || k.status === eq('status'))));
  }
  if (p === '/rest/v1/knowledge_nodes' && r.method() === 'POST') {
    const rows = Array.isArray(body) ? body : [body];
    if (rows.some((x) => x.created_by !== ME.id || !mine(x.org_id))) return ok({ message: 'refusé par la règle d’accès' }, 403);
    rows.forEach((x) => db.knowledge.push({ ...x, id: crypto.randomUUID(), status: 'propose', provenance: 'non_verifiee', created_at: new Date().toISOString() }));
    return ok(undefined, 201);
  }
  if (p === '/rest/v1/knowledge_nodes' && r.method() === 'PATCH') {
    const k = db.knowledge.find((x) => x.id === eq('id'));
    // droits de colonne : le navigateur ne peut pas écrire la provenance ni le statut
    if (Object.keys(body).some((c) => ['provenance', 'status', 'provenance_sha256'].includes(c))) return ok({ message: 'permission denied for column' }, 403);
    Object.assign(k, body); return ok(undefined, 204);
  }
  if (p === '/rest/v1/skills' && r.method() === 'POST') { const row = { ...body, id: crypto.randomUUID() }; db.skills.push(row); return ok([row], 201); }
  if (p === '/rest/v1/skill_knowledge' && r.method() === 'POST') { db.links.push(...body); return ok(undefined, 201); }
  if (p === '/rest/v1/rpc/create_invitation') { const token = crypto.randomBytes(24).toString('hex'); db.invites.push({ email: body.p_email, token }); return ok(token); }
  if (r.method() === 'GET' && p.startsWith('/rest/v1/') && !p.startsWith('/rest/v1/rpc/')) return ok([]);
  if (p.startsWith('/rest/v1/rpc/')) return ok({ code: 'PGRST202', message: `Could not find the function public.${p.split('/').pop()}` }, 404);
  return ok({ message: `route inconnue ${p}` }, 404);
}

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  await ctx.addInitScript(([tok, email]) => {
    try { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.clear(); localStorage.setItem('arbor:auth', JSON.stringify({ access_token: tok, refresh_token: 'r', expires_at: Date.now() + 3e6, email })); localStorage.setItem('arbor:v1', JSON.stringify({ subjects: [], settings: { theme: 'light', mascot: false }, stats: { days: {}, calib: {} }, trophies: {}, xp: 0, profile: { done: true, goals: [] } })); } } catch (e) { /* about:blank */ }
  }, [TOKEN, ME.email]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(`${SB}/**`, (route) => route.fulfill(handle(route.request())));
  const wait = (ms = 700) => page.waitForTimeout(ms);
  const text = () => page.textContent('#app');

  /* A. Étape 1 : identité (nom et secteur seulement) */
  await page.goto(`${URL0}#/org/nouvelle`); await wait(900);
  check('A1 étape 1 sur 3 : seulement le nom et le secteur', !!(await page.$('#sxName')) && (await page.$$('.obz-body input:not([type="radio"]), .obz-body select, .obz-body textarea')).length === 1 && (await page.$$('.sx-steps span')).length === 3);
  await page.click('#sxNext'); await wait(300);
  check('A2 nom manquant : message clair, rien n’est créé', /Indiquez le nom/.test(await page.textContent('#sxNameErr')) && db.orgs.length === 0);
  await page.fill('#sxName', 'Boulangerie Martin'); await page.click('.sx-sectors label:has-text("Hôtellerie")');
  await Promise.all([page.click('#sxNext'), page.click('#sxNext').catch(() => {})]); await wait(1200);
  const org = db.orgs[0] || {};
  check('A3 un double clic ne crée qu’une organisation, avec son secteur', db.orgs.length === 1 && org.name === 'Boulangerie Martin' && org.sector === 'Hôtellerie et restauration');
  check('A4 on passe au premier savoir ; l’étape est mémorisée pour reprendre plus tard', /\/demarrer\/savoir$/.test(page.url()) && org.setup && org.setup.step === 'savoir' && org.setup.express === true, page.url());

  /* B. Étape 2 : une règle écrite devient un PDF, lu et vérifié comme un document importé */
  await page.click('#sxWrite'); await wait(200);
  await page.fill('#sxRule', 'Trop court.'); await page.click('#sxRuleForm .btn'); await wait(400);
  check('B1 règle trop courte : refusée sans appel au serveur', !db.calls.some((c) => c.p === '/rest/v1/rpc/add_source'));
  await page.fill('#sxRule', RULE); await page.click('#sxRuleForm .btn');
  await page.waitForSelector('.sx-cards, #sxRetry', { timeout: 30000 }).catch(() => {}); await wait(600);
  const up = db.uploads[0] || {};
  check('B2 la règle est déposée comme un PDF dans le dossier privé de l’organisation', db.sources.length === 1 && /^Règle : /.test(db.sources[0].title) && up.type === 'application/pdf' && up.key === `${org.id}/${db.sources[0].id}/v1.pdf` && up.size > 400, JSON.stringify(up));
  const extr = db.calls.filter((c) => c.body && c.body.task === 'extraire').flatMap((c) => c.body.passages);
  check('B3 le PDF est relu par le navigateur : le texte de la règle part à l’extraction, page 1', extr.some((x) => x.page === 1 && /ticket de caisse/.test(x.text) && /30 jours/.test(x.text)), JSON.stringify(extr).slice(0, 200));
  check('B4 la provenance est vérifiée par le serveur sur le fichier stocké', db.calls.some((c) => c.body && c.body.task === 'verifier_provenance'));
  const cards = await page.$$('.sx-card');
  check('B5 entre 3 et 5 cartes, chacune avec son statut, sa provenance et sa page', cards.length >= 3 && cards.length <= 5 && (await page.$$('.sx-card .sx-st')).length === cards.length && (await page.$$('.sx-card .kn-prov')).length === cards.length && /p\. 1 de « Règle :/.test(await text()), String(cards.length));
  check('B6 provenance honnête : « retrouvé » pour les extraits vérifiés, « introuvable » pour l’autre', (await page.$$('.kn-prov.prov-verifiee')).length === cards.length - 1 && (await page.$$('.kn-prov.prov-introuvable')).length === 1);
  check('B7 la règle sensible est signalée', !!(await page.$('.sx-card .wd-tag.s')));
  check('B8 rien n’est validé avant l’action de l’administrateur', db.knowledge.every((k) => k.status === 'propose'));

  // modifier une carte
  const k0 = db.knowledge.find((k) => /ticket de caisse/.test(k.quote));
  await page.click(`[data-edit="${k0.id}"]`); await wait(200);
  await page.fill('#sxT', 'Vérifier le ticket avant tout remboursement'); await page.click('#sxSave'); await wait(500);
  check('B9 modifier : titre enregistré, sans toucher au statut ni à la provenance', k0.title === 'Vérifier le ticket avant tout remboursement' && k0.status === 'propose' && k0.provenance === 'verifiee' && /Vérifier le ticket avant tout remboursement/.test(await text()));
  // exclure une carte
  const kx = db.knowledge.find((k) => /30 jours/.test(k.quote));
  await page.click(`[data-excl="${kx.id}"]`); await wait(200);
  check('B10 exclure : la carte est marquée « Exclue » et sort du compte de « Tout valider »', /Exclue/.test(await page.textContent(`[data-k="${kx.id}"]`)) && new RegExp(`Tout valider \\(${cards.length - 1}\\)`).test(await page.textContent('#sxAll')));

  // tout valider : la base refuse la carte dont l'extrait est introuvable
  await page.click('#sxAll'); await wait(1200);
  const kbad = db.knowledge.find((k) => /48 heures/.test(k.quote));
  check('B11 « Tout valider » valide les cartes gardées et vérifiées', db.knowledge.filter((k) => k.provenance === 'verifiee' && k.id !== kx.id).every((k) => k.status === 'valide'));
  check('B12 la carte sans provenance n’est pas validée ; la raison est dite sur la carte', kbad.status === 'propose' && /non vérifié dans le document/.test(await page.textContent(`[data-k="${kbad.id}"]`)));
  check('B13 la carte exclue est écartée (décision explicite), jamais validée', kx.status === 'rejete');
  check('B14 « Tout valider » n’a touché que les cartes présentées', db.calls.filter((c) => c.p === '/rest/v1/rpc/set_knowledge_status').every((c) => cards.length && db.knowledge.slice(0, 5).some((k) => k.id === c.body.p_id)));
  check('B15 on ne passe pas aux compétences tant qu’une carte gardée reste à valider', !(await page.$('.sx-skills')) && !!(await page.$('#sxAll')));
  await page.click(`[data-excl="${kbad.id}"]`); await wait(200);
  await page.click('#sxOn'); await page.waitForSelector('.sx-skills, .sx-choice', { timeout: 15000 }).catch(() => {}); await wait(500);

  /* C. Compétences proposées à partir des connaissances validées */
  const comp = db.calls.find((c) => c.body && c.body.task === 'competences');
  check('C1 les compétences sont demandées après la validation, et proposées', !!comp && (await page.$$('.sx-skills [data-sk]')).length === 2);
  await page.uncheck('[data-sk="1"]'); await page.click('#sxSkOk'); await wait(1200);
  const valid = new Set(db.knowledge.filter((k) => k.status === 'valide').map((k) => k.id));
  check('C2 seule la compétence gardée est créée', db.skills.length === 1 && db.skills[0].name === 'Traiter une demande de retour' && db.skills[0].org_id === org.id);
  check('C3 elle n’est reliée qu’à des connaissances validées', db.links.length > 0 && db.links.every((l) => valid.has(l.knowledge_id) && l.skill_id === db.skills[0].id));

  /* D. Étape 3 : première expérience */
  check('D1 étape 3 : client mystère ou invitation', /\/demarrer\/experience$/.test(page.url()) && !!(await page.$(`a[href="#/org/${org.id}/mystere"]`)) && !!(await page.$('#sxInv')));
  await wait(400);
  check('D2 la mise en route est marquée terminée', org.setup && org.setup.done === true && org.onboarded === true, JSON.stringify(org.setup));
  await page.click('#sxInv'); await wait(500);
  check('D3 « Inviter mon équipe » ouvre le formulaire d’invitation sur place', await page.isVisible('#ivEmail'));
  await page.fill('#ivEmail', 'bob@boulangerie.fr'); await page.click('#ivForm .btn'); await wait(600);
  check('D4 l’invitation donne un lien unique', db.invites.length === 1 && /#\/rejoindre\/[0-9a-f]{48}$/.test(await page.inputValue('#oiLink').catch(() => '')));
  await page.click('#sxSolo'); await wait(1300);
  const t = await text();
  check('D5 « Continuer seul » mène au Cockpit, sans bandeau de reprise', /Cockpit/.test(t) && !(await page.$('.obz-resume')));
  check('D6 le Cockpit compte les connaissances validées par la mise en route, sans rien inventer', !/NaN|undefined/.test(t));

  /* E. Reprise : un administrateur qui quitte à l'étape 2 retrouve où il en était */
  org.setup = { step: 'savoir', express: true };
  await page.evaluate(() => Org.refresh()); // comme à la prochaine ouverture de l'application
  await page.evaluate(() => { location.hash = '#/'; }); await wait(300);
  await page.evaluate((h) => { location.hash = h; }, `#/org/${org.id}`); await wait(1200);
  check('E1 bandeau « Reprendre la mise en route » vers l’étape 2 sur 3', /Étape 2 sur 3/.test(await page.textContent('.obz-resume').catch(() => '')) && (await page.getAttribute('.obz-resume', 'href')) === `#/org/${org.id}/demarrer/savoir`);

  /* F. Accès : la mise en route est réservée à l'administrateur ; « Passer » ne crée rien */
  const nSources = db.sources.length;
  await page.evaluate((h) => { location.hash = h; }, `#/org/${org.id}/demarrer/savoir`); await wait(800);
  await page.click('.obz-foot a:has-text("Passer")'); await wait(900);
  check('F1 « Passer » revient au Cockpit sans rien créer', db.sources.length === nSources && /Cockpit/.test(await text()));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  check('F2 téléphone : aucun débordement horizontal', !overflow);
  check('F3 aucune erreur JavaScript', !errors.length, errors.join(' | '));

  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
