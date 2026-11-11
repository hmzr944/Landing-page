/* Documents d'une organisation (étape D) : envoi d'un PDF, extraction des connaissances, validation, nouvelle version.
   Supabase et la fonction d'extraction sont simulés avec les mêmes règles que la base (rôles, sensible réservé aux
   managers, empreinte identique refusée) ; les vraies règles sont testées dans tests/db-rls.js, l'extraction réelle
   (extraits vérifiés mot pour mot) dans les tests Deno de la fonction.
   Lancer depuis la racine du dépôt :  node tests/org-docs.js   (Playwright requis). */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
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
const ORG = '22222222-2222-2222-2222-222222222222';
const U = { alice: { id: 'u-alice', role: 'admin', email: 'alice@magasin.fr' }, dan: { id: 'u-dan', role: 'expert', email: 'dan@magasin.fr' }, bob: { id: 'u-bob', role: 'member', email: 'bob@magasin.fr' } };
const tokens = Object.fromEntries(Object.entries(U).map(([k, u]) => [jwt(u.id), u]));
const COMMENT = 'Je te conseille de bien retenir ces chiffres, ton niveau est encore fragile.';

/* ---------- Faux Supabase ---------- */
const db = { sources: [], versions: [], knowledge: [], uploads: [], extractCalls: [] };
const sent = [];
function handle(r) {
  const u = new URL(r.url()); const p = u.pathname; const raw = r.postData() || '';
  const me = tokens[(r.headers().authorization || '').replace('Bearer ', '')];
  sent.push({ url: r.url(), body: p.startsWith('/storage/') ? '[fichier]' : raw });
  const ok = (data, status = 200) => ({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: data === undefined ? '' : JSON.stringify(data) });
  if (!me) return ok({ message: 'JWT invalide' }, 401);
  const body = raw && !p.startsWith('/storage/') ? JSON.parse(raw) : {};
  const content = ['admin', 'manager', 'expert'].includes(me.role);
  const eq = (k) => (u.searchParams.get(k) || '').replace(/^eq\./, '');
  if (p === '/rest/v1/rpc/my_organizations') return ok([{ id: ORG, name: 'Magasin de Lyon', sector: 'Commerce et distribution', role: me.role }]);
  if (p === '/rest/v1/rpc/add_source') {
    if (!content) return ok({ message: 'accès refusé' }, 400);
    const sid = crypto.randomUUID(), vid = crypto.randomUUID();
    db.sources.push({ id: sid, org_id: body.p_org, title: body.p_title, current_version: 1, created_at: new Date().toISOString() });
    db.versions.push({ id: vid, source_id: sid, version: 1, checksum: body.p_checksum, page_count: body.p_pages, created_at: new Date().toISOString(), storage_path: `${body.p_org}/${sid}/v1.pdf` });
    return ok([{ source_id: sid, version_id: vid, version: 1, storage_path: `${body.p_org}/${sid}/v1.pdf` }]);
  }
  if (p === '/rest/v1/rpc/add_version') {
    if (!content) return ok({ message: 'accès refusé' }, 400);
    const s = db.sources.find((x) => x.id === body.p_source);
    const last = db.versions.filter((v) => v.source_id === s.id).sort((a, b) => b.version - a.version)[0];
    if (last.checksum === body.p_checksum) return ok({ message: 'document inchangé' }, 400);
    const vid = crypto.randomUUID(), n = last.version + 1; s.current_version = n;
    db.versions.push({ id: vid, source_id: s.id, version: n, checksum: body.p_checksum, page_count: body.p_pages, created_at: new Date().toISOString(), storage_path: `${s.org_id}/${s.id}/v${n}.pdf` });
    return ok([{ source_id: s.id, version_id: vid, version: n, storage_path: `${s.org_id}/${s.id}/v${n}.pdf` }]);
  }
  if (p === '/rest/v1/rpc/set_knowledge_status') {
    const k = db.knowledge.find((x) => x.id === body.p_id);
    if (!content || (k.kind === 'sensible' && !['admin', 'manager'].includes(me.role))) return ok({ message: 'accès refusé' }, 400);
    k.status = body.p_status; return ok(null);
  }
  if (p.startsWith('/storage/v1/object/org-sources/')) {
    const key = p.replace('/storage/v1/object/org-sources/', '');
    if (!content || !key.startsWith(ORG + '/')) return ok({ message: 'refusé' }, 403);
    db.uploads.push({ key, type: r.headers()['content-type'] }); return ok({ Key: key });
  }
  if (p === '/functions/v1/tutor' && body.task === 'extraire') {
    db.extractCalls.push(body);
    // comme le vrai serveur : chaque connaissance a un extrait copié mot pour mot d'un passage, avec la page de ce passage
    const items = [];
    body.passages.forEach((ps) => ps.text.split(/(?<=\.)\s+/).filter((x) => /\d|Ne jamais/.test(x)).forEach((x) => items.push({ kind: /Ne jamais|rembours/i.test(x) ? 'sensible' : /jours/.test(x) ? 'regle' : 'produit', title: x.split(' ').slice(0, 5).join(' '), body: x, quote: x.replace(/\.$/, ''), page: ps.page, confidence: 0.8 })));
    return ok({ items, dropped: 1, usage: { used: 1, limit: 150 } });
  }
  if (p === '/rest/v1/sources') return ok(content ? db.sources.filter((s) => (eq('org_id') ? s.org_id === eq('org_id') : s.id === eq('id'))) : []);
  if (p === '/rest/v1/source_versions') return ok(content ? db.versions.filter((v) => v.source_id === eq('source_id')).map(({ checksum, storage_path, ...v }) => v) : []);
  if (p === '/rest/v1/knowledge_nodes' && r.method() === 'GET') {
    const ids = (u.searchParams.get('source_version_id') || '').replace(/^in\.\(|\)$/g, '').split(',');
    return ok(db.knowledge.filter((k) => ids.includes(k.source_version_id) && (content || k.status === 'valide')));
  }
  if (p === '/rest/v1/knowledge_nodes' && r.method() === 'POST') {
    const rows = Array.isArray(body) ? body : [body];
    if (!content || rows.some((x) => x.created_by !== me.id || x.org_id !== ORG || !db.versions.some((v) => v.id === x.source_version_id))) return ok({ message: 'refusé par la règle d’accès' }, 403);
    rows.forEach((x) => db.knowledge.push({ ...x, id: crypto.randomUUID(), status: 'propose', created_at: new Date().toISOString() }));
    return ok(undefined, 201);
  }
  return ok({ message: `route inconnue ${p}` }, 404);
}

const fiche = (autonomy) => `<html><head><meta charset="utf-8"></head><body style="font-family:Arial;font-size:13px;margin:40px">
<h1>Fiche produit Alto 500</h1>
<h2>Caractéristiques</h2>
<p>Le vélo électrique Alto 500 dispose d’une batterie de 500 Wh. Son autonomie annoncée est de ${autonomy} km en mode éco. Le cadre en aluminium pèse 21 kg.</p>
<p>${COMMENT}</p>
<div style="page-break-before:always"></div>
<h2>Sécurité et retours</h2>
<p>Ne jamais recharger une batterie endommagée ou gonflée : l’isoler dans le bac prévu et prévenir le responsable. Le client dispose de 30 jours pour un retour avec le ticket de caisse.</p>
</body></html>`;

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const errors = [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arbor-docs-'));
  const maker = await browser.newPage();
  const pdf = async (html, name) => { await maker.setContent(html); const f = path.join(tmp, name); await maker.pdf({ path: f, format: 'A4' }); return f; };
  const v1 = await pdf(fiche(90), 'alto-v1.pdf'), v2 = await pdf(fiche(100), 'alto-v2.pdf');

  async function as(user) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await ctx.addInitScript(([tok, email, org, role]) => {
      try { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.clear(); localStorage.setItem('arbor:auth', JSON.stringify({ access_token: tok, refresh_token: 'r', expires_at: Date.now() + 3e6, email })); localStorage.setItem('arbor:orgs', JSON.stringify([{ id: org, name: 'Magasin de Lyon', sector: 'Commerce', role }])); localStorage.setItem('arbor:v1', JSON.stringify({ subjects: [], settings: { theme: 'light', mascot: false }, stats: { days: {}, calib: {} }, trophies: {}, xp: 0, profile: { done: true, goals: [] } })); } } catch (e) { /* about:blank */ }
    }, [jwt(U[user].id), U[user].email, ORG, U[user].role]);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route(`${SB}/**`, (route) => route.fulfill(handle(route.request())));
    return { ctx, page };
  }
  const wait = (page, ms = 700) => page.waitForTimeout(ms);
  const upload = async (page, file, title) => {
    if (title) await page.fill('#dfTitle', title);
    await page.setInputFiles('#dfFile', file);
    await page.click('#docForm .btn');
    await page.waitForFunction(() => /\/documents\/[0-9a-f-]{36}$/.test(location.hash) && document.querySelector('.kn-list') || /identique|impossible|refus/.test((document.getElementById('dfOut') || {}).textContent || ''), null, { timeout: 30000 }).catch(() => {});
    await wait(page, 1200);
  };

  /* A. L'administratrice envoie la fiche produit */
  {
    const { ctx, page } = await as('alice');
    await page.goto(`${URL0}#/org/${ORG}`); await wait(page, 900);
    check('A1 l’espace propose l’onglet Documents à l’équipe de contenu', !!(await page.$('.org-tabs a[href$="/documents"]')));
    await page.click('.org-tabs a[href$="/documents"]'); await wait(page);
    await upload(page, v1, 'Fiche produit Alto 500');
    check('A2 le fichier est déposé dans le dossier privé de l’organisation', db.uploads.length === 1 && db.uploads[0].key === `${ORG}/${db.sources[0].id}/v1.pdf` && db.uploads[0].type === 'application/pdf');
    const passages = db.extractCalls.flatMap((c) => c.passages);
    check('A3 seul le contenu pédagogique est envoyé à l’extraction (pas le commentaire sur l’apprenant)', passages.length >= 2 && !passages.some((x) => /te conseille|ton niveau/.test(x.text)) && passages.some((x) => /500 Wh/.test(x.text)), JSON.stringify(passages.map((x) => x.text.slice(0, 50))));
    check('A4 chaque passage porte sa page', passages.some((x) => x.page === 1 && /500 Wh/.test(x.text)) && passages.some((x) => x.page === 2 && /Ne jamais/.test(x.text)));
    const k = db.knowledge;
    check('A5 les connaissances sont enregistrées « à valider », reliées à la version 1, signées par l’auteur', k.length >= 3 && k.every((x) => x.status === 'propose' && x.source_version_id === db.versions[0].id && x.created_by === U.alice.id && x.quote && x.page));
    const order = await page.$$eval('.kn', (els) => els.map((e) => e.className));
    check('A6 les informations sensibles à valider sont en tête de liste', /kn-sensible/.test(order[0]), order[0]);
    check('A7 chaque connaissance montre son extrait, sa page et sa version', /«[^»]*Ne jamais recharger[^»]*»\s*p\. 2 · version 1/.test(await page.textContent('.kn-list')));
    if (process.env.ARBOR_SHOTS) await page.screenshot({ path: path.join(process.env.ARBOR_SHOTS, 'org-docs.png') });
    const report = await page.textContent('#docReport').catch(() => '');
    check('A8 le compte rendu dit ce qui a été écarté et ce qui n’a pas été envoyé', /écartée/.test(report) && /hors cours non envoy/.test(report), report);
    await ctx.close();
  }

  /* B. L'expert métier valide ce qui n'est pas sensible ; le sensible lui est fermé */
  {
    const { ctx, page } = await as('dan');
    await page.goto(`${URL0}#/org/${ORG}/documents/${db.sources[0].id}`); await wait(page, 1200);
    check('B1 pour un expert, une connaissance sensible n’a pas de bouton Valider', /Validation par un manager/.test(await page.textContent('.kn-sensible')) && !(await page.$('.kn-sensible [data-s="valide"]')));
    await page.click('#kAll'); await wait(page, 1200);
    check('B2 « Valider les propositions non sensibles » valide tout sauf le sensible', db.knowledge.filter((x) => x.kind !== 'sensible').every((x) => x.status === 'valide') && db.knowledge.filter((x) => x.kind === 'sensible').every((x) => x.status === 'propose'));
    await ctx.close();
  }

  /* C. L'administratrice valide l'information sensible */
  {
    const { ctx, page } = await as('alice');
    await page.goto(`${URL0}#/org/${ORG}/documents/${db.sources[0].id}`); await wait(page, 1200);
    await page.click('.kn-sensible [data-s="valide"]'); await wait(page, 1000);
    check('C1 l’administratrice valide l’information sensible', db.knowledge.filter((x) => x.kind === 'sensible').every((x) => x.status === 'valide'));

    /* D. Nouvelle version : l'autonomie change, la consigne de sécurité reste */
    const before = db.knowledge.length;
    await upload(page, v2);
    const auto90 = db.knowledge.find((x) => /90 km/.test(x.quote)), safety = db.knowledge.find((x) => /Ne jamais/.test(x.quote));
    check('D1 la version 2 est enregistrée dans son propre fichier', db.versions.length === 2 && db.uploads[1].key.endsWith('/v2.pdf'));
    check('D2 la connaissance dont l’extrait a disparu (90 km) passe « à revalider »', auto90 && auto90.status === 'a_revalider');
    check('D3 celle dont l’extrait figure toujours (sécurité) reste validée', safety && safety.status === 'valide');
    check('D4 la nouvelle donnée (100 km) est proposée, sans doublon de ce qui reste valable', db.knowledge.some((x) => /100 km/.test(x.quote) && x.status === 'propose' && x.source_version_id === db.versions[1].id) && db.knowledge.filter((x) => /Ne jamais/.test(x.quote)).length === 1, `${before} → ${db.knowledge.length}`);
    const report = await page.textContent('#docReport').catch(() => '');
    check('D5 le compte rendu dit combien restent valables et combien sont à revalider', /toujours valable/.test(report) && /1 à revalider/.test(report), report);

    /* E. Le même fichier une deuxième fois */
    await upload(page, v2);
    check('E1 un fichier identique à la dernière version est refusé avec un message clair', /identique à la dernière version/.test(await page.textContent('#dfOut')) && db.versions.length === 2);
    await ctx.close();
  }

  /* F. Un collaborateur n'a pas accès aux documents bruts */
  {
    const { ctx, page } = await as('bob');
    await page.goto(`${URL0}#/org/${ORG}`); await wait(page, 900);
    check('F1 un collaborateur n’a pas l’onglet Documents', !(await page.$('.org-tabs a[href$="/documents"]')));
    await page.evaluate((o) => { location.hash = `#/org/${o}/documents`; }, ORG); await wait(page, 800);
    check('F2 même en tapant l’adresse, il ne peut pas envoyer de document', !(await page.$('#docForm')) && /équipe de contenu/.test(await page.textContent('#app')));
    await ctx.close();
  }

  const all = sent.map((x) => `${x.url} ${x.body}`).join('\n');
  check('G1 aucune requête ne part ailleurs que vers le projet Supabase, aucune clé secrète', sent.every((x) => x.url.startsWith(SB)) && !/sk-ant|gsk_|service_role/.test(all));
  check('G2 aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
