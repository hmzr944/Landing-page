/* Moteurs Business dans le navigateur (js/org-engines.js) : scénarios, Watchdog, graphe, parcours, radar,
   validation humaine, droits sur ses données, invitation par e-mail, conservation. Le serveur et la base sont simulés
   avec les contrats de supabase/functions/tutor/engines.ts et de la migration 008 (dont la logique réelle est testée
   par Deno et tests/db-rls.js) : ici on vérifie les écrans, ce qui est envoyé, et le repli sans migration 008.
   Lancer depuis la racine du dépôt :  node tests/org-engines.js   (Playwright requis). */
const http = require('http');
const fs = require('fs');
const path = require('path');
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
const ORG = '44444444-4444-4444-8444-444444444444';
const U = { bob: { id: 'u-bob', role: 'member', email: 'bob@magasin.fr' }, chloe: { id: 'u-chloe', role: 'member', email: 'chloe@magasin.fr' }, eve: { id: 'u-eve', role: 'manager', email: 'eve@magasin.fr' }, ana: { id: 'u-ana', role: 'admin', email: 'ana@magasin.fr' } };
const tokens = Object.fromEntries(Object.values(U).map((u) => [jwt(u.id), u]));
const K = [
  { id: 'k-autonomie', kind: 'produit', title: 'Autonomie de l’Alto 500', body: '90 km en mode éco.', quote: 'Son autonomie annoncée est de 90 km en mode éco', page: 1, status: 'valide', source_version_id: 'v1' },
  { id: 'k-batterie', kind: 'sensible', title: 'Batterie endommagée', body: 'Ne jamais recharger une batterie endommagée.', quote: 'Ne jamais recharger une batterie endommagée', page: 2, status: 'valide', source_version_id: 'v1' },
  { id: 'k-retour', kind: 'regle', title: 'Délai de retour', body: '30 jours pour un retour.', quote: 'Le client dispose de 30 jours pour un retour', page: 2, status: 'valide', source_version_id: 'v1' },
];
const iso = (d) => new Date(Date.now() - d * 864e5).toISOString();
const fresh = () => ({
  no008: false, mail: false, sent: [], calls: [],
  scenarios: [], versions: [],
  evidence: [
    { user_id: 'u-bob', knowledge_id: 'k-autonomie', activity: 'simulation', outcome: 'juste', level: 4, context: 'simulation:client', session_id: 's1', at: iso(3) },
    { user_id: 'u-bob', knowledge_id: 'k-retour', activity: 'diagnostic', outcome: 'juste', level: 2, confidence: 'sait', at: iso(3) },
    { user_id: 'u-bob', knowledge_id: 'k-batterie', activity: 'diagnostic', outcome: 'faux', confidence: 'sait', at: iso(2) },
    { user_id: 'u-chloe', knowledge_id: 'k-batterie', activity: 'diagnostic', outcome: 'faux', confidence: 'reflexe', at: iso(2) },
    { user_id: 'u-chloe', knowledge_id: 'k-batterie', activity: 'simulation', outcome: 'juste', at: iso(1) },
    { user_id: 'u-chloe', knowledge_id: 'k-retour', activity: 'simulation', outcome: 'non_documente', at: iso(1) },
  ],
  skills: [{ id: 'sk1', name: 'Conseiller un vélo', description: '', importance: 3 }, { id: 'sk2', name: 'Manipuler les batteries en sécurité', description: '', importance: 2 }],
  links: [{ skill_id: 'sk1', knowledge_id: 'k-autonomie' }, { skill_id: 'sk1', knowledge_id: 'k-retour' }, { skill_id: 'sk2', knowledge_id: 'k-batterie' }],
  actions: [{ id: 'a1', user_id: 'u-bob', kind: 'revalidation', reason: 'La procédure de retour a changé : refais la mise en situation.', status: 'a_faire', due: null, created_at: iso(1) }],
  edges: [],
  items: [
    { id: 'it1', change_id: 'ch1', change: 'modifie', knowledge_id: 'k-retour', sensitive: false, new_title: 'Délai de retour', new_quote: 'Le client dispose de 14 jours pour un retour', new_page: 2, explanation: 'Le délai passe de 30 à 14 jours.', decision: 'a_valider' },
    { id: 'it2', change_id: 'ch1', change: 'nouveau', knowledge_id: null, sensitive: true, new_title: 'Stockage des batteries', new_quote: 'Les batteries sont stockées dans l’armoire ignifugée', new_page: 3, explanation: '', decision: 'a_valider' },
    { id: 'it3', change_id: 'ch1', change: 'inchange', knowledge_id: 'k-autonomie', sensitive: false, decision: 'accepte' },
  ],
  retention: 365,
});
let db = fresh();
const MISSING = { code: 'PGRST205', message: "Could not find the table 'public.x' in the schema cache" };

function fn(me, b) {
  const lead = ['admin', 'manager'].includes(me.role);
  if (b.task === 'scenario_concevoir') {
    if (!lead) return [403, { error: 'accès refusé' }];
    const spec = { name: 'M. Martin', role_play: 'un client qui rapporte un vélo sans ticket', role_label: 'Conseiller de vente', context: 'Samedi, 17 h, file d’attente à la caisse.', objective: 'Appliquer la procédure de retour sans perdre le client.', need: 'Il a besoin du vélo lundi pour aller travailler.', objections: [{ text: 'Je n’ai pas le ticket' }], constraints: ['Pas de remboursement sans preuve d’achat'], events: [{ turn: 1, text: 'Un autre client s’impatiente derrière.' }], rubric: [{ id: 'procedure', label: 'Applique la procédure de retour' }, { id: 'calme', label: 'Garde son calme' }], opening: 'Bonjour, je veux rendre ce vélo.', knowledge: [{ id: 'k-retour', title: 'Délai de retour' }] };
    db.scenarios.push({ id: 'sc1', title: 'Retour sans ticket', kind: b.kind, status: 'brouillon', current_version: 1 });
    db.versions.push({ id: 'ver1', scenario_id: 'sc1', version: 1, status: 'brouillon', spec, created_at: iso(0) });
    return { scenario: 'sc1', version: 'ver1', title: 'Retour sans ticket', spec };
  }
  if (b.task === 'scenario_start') {
    const v = db.versions.find((x) => x.id === b.version);
    if (!v || (v.status !== 'valide' && !lead)) return [404, { error: 'scénario introuvable' }];
    db.turns = 0;
    return { id: 'sess1', opening: v.spec.opening, client: { name: v.spec.name, style: 'scenario' }, scenario: { context: v.spec.context, objective: v.spec.objective, role_label: v.spec.role_label, constraints: v.spec.constraints } };
  }
  if (b.task === 'mystere_tour') { db.turns++; return { reply: db.turns >= 2 ? 'Bon, d’accord, merci.' : 'Je n’ai pas le ticket, mais je l’ai acheté ici !', ended: db.turns >= 2, turn: db.turns, event: db.turns === 1 ? 'Un autre client s’impatiente derrière.' : null }; }
  if (b.task === 'mystere_fin') return { debrief: { outcome: 'satisfait', turns: 2, need: { found: true, text: 'Il a besoin du vélo lundi' }, objections: [], behaviors: [{ id: 'procedure', label: 'Applique la procédure de retour', observed: true, evidence: 'Je regarde votre achat dans notre système' }],
    correct: [], incorrect: [], undocumented: [], insufficient: [{ text: 'on peut sûrement s’arranger', quote: 'Le client dispose de 30 jours pour un retour' }], events: [{ turn: 1, text: 'Un autre client s’impatiente derrière.' }], note: 'Une simulation réussie ne suffit pas à valider une compétence.' } };
  if (b.task === 'relations') { if (!lead) return [403, { error: 'accès refusé' }]; db.edges.push({ id: 'e1', from_id: 'k-retour', to_id: 'k-batterie', relation: 'confusion_frequente', status: 'propose', method: 'ia', note: 'Les deux procédures se suivent au comptoir.' }); return { proposed: 1 }; }
  if (b.task === 'invitation_envoyer') { if (!db.mail) return [501, { error: 'envoi par e-mail non configuré : partage le lien' }]; return { sent: true }; }
  return [400, { error: 'tâche inconnue' }];
}
function rpc(me, name, b) {
  const lead = ['admin', 'manager'].includes(me.role);
  if (name === 'my_organizations') return [{ id: ORG, name: 'Magasin de Lyon', sector: 'Commerce', role: me.role }];
  if (db.no008 && !['create_invitation'].includes(name)) return [404, MISSING];
  if (name === 'scenario_spec') return db.versions.find((v) => v.id === b.p_version).spec;
  if (name === 'publish_scenario_version') { const v = db.versions.find((x) => x.id === b.p_version); v.status = 'valide'; const s = db.scenarios.find((x) => x.id === v.scenario_id); s.status = 'publie'; return null; }
  if (name === 'decide_change_item') { const it = db.items.find((x) => x.id === b.p_item); if (it.sensitive && !lead) return [403, { message: 'manager requis' }]; it.decision = b.p_decision; it.decided_at = new Date().toISOString(); return null; }
  if (name === 'policy_change_impact') return { knowledge: 1, skills: [{ id: 'sk1', name: 'Conseiller un vélo' }], scenarios: [{ id: 'sc1', title: 'Retour sans ticket' }], people: ['u-bob', 'u-chloe'] };
  if (name === 'assign_learning_actions') { if (!lead) return [403, { message: 'accès refusé' }]; return b.p_users.length; }
  if (name === 'set_action_status') { const a = db.actions.find((x) => x.id === b.p_id); a.status = b.p_status; return null; }
  if (name === 'set_edge_status') { db.edges.find((x) => x.id === b.p_id).status = b.p_status; return null; }
  if (name === 'record_human_validation') { if (!lead || b.p_user === me.id) return [403, { message: 'accès refusé' }]; db.evidence.push({ user_id: b.p_user, skill_id: b.p_skill, activity: 'validation_humaine', outcome: b.p_outcome, level: 5, at: new Date().toISOString() }); return null; }
  if (name === 'export_my_org_data') return { organization: ORG, evidence: db.evidence.filter((e) => e.user_id === me.id), actions: db.actions.filter((a) => a.user_id === me.id) };
  if (name === 'erase_my_org_data') { const n = db.evidence.filter((e) => e.user_id === me.id).length; db.evidence = db.evidence.filter((e) => e.user_id !== me.id); return { evidence: n, simulations: 1, actions: 1 }; }
  if (name === 'set_retention') { if (me.role !== 'admin') return [403, { message: 'accès refusé' }]; db.retention = b.p_days; return null; }
  if (name === 'create_invitation') return 'ab'.repeat(24);
  return [404, { message: `rpc inconnue ${name}` }];
}
function handle(r) {
  const u = new URL(r.url()); const p = u.pathname; const raw = r.postData() || '';
  const me = tokens[(r.headers().authorization || '').replace('Bearer ', '')];
  const ok = (data, status = 200) => ({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: data === undefined || data === null ? (status === 200 ? 'null' : '') : JSON.stringify(data) });
  if (!me) return ok({ message: 'JWT invalide' }, 401);
  const b = raw ? JSON.parse(raw) : {};
  db.sent.push({ path: p, query: u.search, body: b, user: me.id });
  const lead = ['admin', 'manager'].includes(me.role);
  const eq = (k) => (u.searchParams.get(k) || '').replace(/^eq\./, '');
  const out = (x) => (Array.isArray(x) && typeof x[0] === 'number' ? ok(x[1], x[0]) : ok(x));
  if (p.startsWith('/rest/v1/rpc/')) return out(rpc(me, p.slice(13), b));
  if (p === '/functions/v1/tutor') { const x = fn(me, b); return Array.isArray(x) ? ok(x[1], x[0]) : ok({ ...x, usage: { used: 1, limit: 400 } }); }
  const T008 = ['/rest/v1/scenarios', '/rest/v1/scenario_versions', '/rest/v1/learning_actions', '/rest/v1/knowledge_edges', '/rest/v1/policy_changes', '/rest/v1/policy_change_items'];
  if (db.no008 && T008.includes(p)) return ok(MISSING, 404);
  if (p === '/rest/v1/evidence_events') return ok(db.evidence.filter((e) => (lead || e.user_id === me.id) && (!eq('user_id') || e.user_id === eq('user_id'))));
  if (p === '/rest/v1/knowledge_nodes') { const ids = (u.searchParams.get('id') || '').match(/^in\.\((.*)\)$/); return ok(K.filter((k) => !ids || ids[1].split(',').includes(k.id))); }
  if (p === '/rest/v1/memberships') { const all = Object.values(U).map((x) => ({ user_id: x.id, role: x.role, email: x.email, status: 'active', unit_id: null })); return ok(all.filter((m) => (lead || m.user_id === me.id) && (!eq('user_id') || m.user_id === eq('user_id')))); }
  if (p === '/rest/v1/skills') return ok(db.skills);
  if (p === '/rest/v1/skill_knowledge') return ok(db.links);
  if (p === '/rest/v1/skill_units' || p === '/rest/v1/org_units') return ok([]);
  if (p === '/rest/v1/learning_actions') return ok(db.actions.filter((a) => a.user_id === me.id));
  if (p === '/rest/v1/scenarios') return ok(db.scenarios.filter((s) => (lead || s.status === 'publie') && (!eq('status') || s.status === eq('status'))));
  if (p === '/rest/v1/scenario_versions') return ok(db.versions.filter((v) => (lead || v.status === 'valide') && (!eq('status') || v.status === eq('status'))).map(({ spec, ...v }) => v)); // spec jamais lisible ici
  if (p === '/rest/v1/knowledge_edges') return ok(db.edges.filter((e) => lead || e.status === 'valide'));
  if (p === '/rest/v1/sources') return ok([{ id: 'src1', title: 'Procédure retours', current_version: 2 }]);
  if (p === '/rest/v1/source_versions') return ok([{ id: 'v1', version: 1, page_count: 3 }, { id: 'v2', version: 2, page_count: 3 }]);
  if (p === '/rest/v1/policy_changes') return ok(lead || me.role === 'expert' ? [{ id: 'ch1', status: 'ouvert', to_version_id: 'v2', created_at: iso(0), summary: { modifie: 1, supprime: 0, nouveau: 1, reformule: 0, inchange: 1, analysed: true } }] : []);
  if (p === '/rest/v1/policy_change_items') return ok(db.items);
  if (p === '/rest/v1/invitations') return ok(r.method() === 'GET' ? [{ id: 'inv1', email: 'zoe@magasin.fr', role: 'member', expires_at: new Date(Date.now() + 6e8).toISOString(), created_at: iso(0) }].filter(() => u.searchParams.get('email')) : null);
  if (p === '/rest/v1/organizations') return ok([{ retention_days: db.retention }]);
  return ok({ message: `route inconnue ${p}` }, 404);
}
const calls = (pathEnd) => db.sent.filter((x) => x.path.endsWith(pathEnd));
const tasks = (t) => db.sent.filter((x) => x.path === '/functions/v1/tutor' && x.body.task === t);

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const errors = [];
  async function as(user) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce', acceptDownloads: true });
    await ctx.addInitScript(([tok, email, org, role]) => {
      try { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.clear(); localStorage.setItem('arbor:auth', JSON.stringify({ access_token: tok, refresh_token: 'r', expires_at: Date.now() + 3e6, email })); localStorage.setItem('arbor:orgs', JSON.stringify([{ id: org, name: 'Magasin de Lyon', sector: 'Commerce', role }])); localStorage.setItem('arbor:v1', JSON.stringify({ subjects: [], settings: { theme: 'light', mascot: false }, stats: { days: {}, calib: {} }, trophies: {}, xp: 0, profile: { done: true, goals: [] } })); } } catch (e) { /* about:blank */ }
    }, [jwt(U[user].id), U[user].email, ORG, U[user].role]);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('dialog', (dg) => dg.accept());
    await page.route(`${SB}/**`, (route) => route.fulfill(handle(route.request())));
    return { ctx, page };
  }
  const wait = (page, ms = 700) => page.waitForTimeout(ms);
  const go = async (page, hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await wait(page, 1000); };
  const text = (page) => page.textContent('#app');

  /* A. Eve, manager : concevoir, relire et publier un scénario */
  {
    const { ctx, page } = await as('eve');
    await page.goto(`${URL0}#/org/${ORG}`); await wait(page, 900);
    check('A1 un manager a l’onglet Scénarios', !!(await page.$('.org-tabs a[href$="/scenarios"]')));
    await go(page, `#/org/${ORG}/scenarios`);
    await page.selectOption('#scKind', 'procedure'); await page.fill('#scBrief', 'Un client sans ticket');
    await page.click('#scForm button'); await wait(page, 900);
    const sent = tasks('scenario_concevoir')[0];
    const t = await page.textContent('#scDraft');
    check('A2 la conception part au serveur avec le type et la consigne', sent && sent.body.kind === 'procedure' && sent.body.brief === 'Un client sans ticket');
    check('A3 relecture complète avant publication : contexte, objectif, enjeu caché, événements, grille, connaissances', /Samedi, 17 h/.test(t) && /Appliquer la procédure/.test(t) && /besoin du vélo lundi/.test(t) && /Au tour 1 : Un autre client/.test(t) && /Garde son calme/.test(t) && /Délai de retour/.test(t));
    if (process.env.ARBOR_SHOTS) await page.screenshot({ path: path.join(process.env.ARBOR_SHOTS, 'engines-scenario.png'), fullPage: true });
    await page.click('#scPub'); await wait(page, 900);
    check('A4 publier appelle publish_scenario_version, la liste indique « publié »', calls('/publish_scenario_version').length === 1 && /publié \(version 1\)/.test(await text(page)));
    await ctx.close();
  }

  /* B. Bob, collaborateur : jouer le scénario publié, événement, débrief, parcours, données */
  {
    const { ctx, page } = await as('bob');
    await page.goto(`${URL0}#/org/${ORG}`); await wait(page, 900);
    check('B1 un collaborateur n’a pas l’onglet Scénarios', !(await page.$('.org-tabs a[href$="/scenarios"]')));
    await go(page, `#/org/${ORG}/mystere`);
    check('B2 le scénario publié est proposé sur l’écran Client mystère', /Scénarios de ton équipe/.test(await text(page)) && /Retour sans ticket/.test(await text(page)));
    await page.click('#msScen [data-play]'); await wait(page, 900);
    const c = await text(page);
    check('B3 la situation est affichée (contexte, rôle, objectif, contrainte), pas l’enjeu caché ni la grille', /Samedi, 17 h/.test(c) && /Conseiller de vente/.test(c) && /Pas de remboursement sans preuve/.test(c) && !/besoin du vélo lundi/.test(c) && !/Garde son calme/.test(c));
    await page.fill('#msText', 'Je regarde votre achat dans notre système.'); await page.click('#msSend'); await wait(page, 900);
    check('B4 l’événement du scénario s’affiche dans la conversation', !!(await page.$('.ms-event')) && /s’impatiente/.test(await page.textContent('#msFeed')));
    await page.fill('#msText', 'On peut sûrement s’arranger.'); await page.click('#msSend'); await wait(page, 1500);
    const deb = await text(page);
    check('B5 débrief : réponse « trop peu étayée » distincte d’une erreur, événements rappelés', /Réponses trop peu étayées/.test(deb) && /Ni juste ni fausse/.test(deb) && !/Informations inexactes/.test(deb) && /Événements de la situation/.test(deb));

    await go(page, `#/org/${ORG}/resultats`);
    const r = await text(page);
    if (process.env.ARBOR_SHOTS) await page.screenshot({ path: path.join(process.env.ARBOR_SHOTS, 'engines-parcours.png'), fullPage: true });
    check('B6 Mon parcours : compétences du poste avec niveau de preuve', /Mon parcours/.test(r) && /Conseiller un vélo/.test(r) && /4 · Appliquée/.test(r) && /2 · Reconnue/.test(r));
    const plan = await page.$$eval('.pw-plan li', (ls) => ls.map((l) => l.textContent));
    check('B7 plan expliqué : la demande du responsable d’abord, puis la fausse certitude', /procédure de retour a changé/.test(plan[0] || '') && /annoncée comme sûre/.test(plan[1] || ''), plan.join(' | '));
    check('B8 une compétence sensible exige une validation au poste', /Règle de sécurité ou réglementaire/.test(r));
    await page.click('[data-done="a1"]'); await wait(page, 500);
    check('B9 « Fait » sur une action demandée', db.actions[0].status === 'fait' && calls('/set_action_status').length === 1);
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 4000 }).catch(() => null), page.click('#myExport')]);
    let exported = null; if (dl) { try { exported = JSON.parse(fs.readFileSync(await dl.path(), 'utf8')); } catch (e) { exported = null; } }
    check('B10 export de mes données : fichier JSON avec mes seules preuves', exported && exported.evidence.length > 0 && exported.evidence.every((e) => e.user_id === 'u-bob') && /mes-donnees\.json$/.test(dl.suggestedFilename()));
    await page.click('#myErase'); await wait(page, 900);
    check('B11 effacement après confirmation : mes preuves sont supprimées, pas celles des autres', calls('/erase_my_org_data').length === 1 && !db.evidence.some((e) => e.user_id === 'u-bob') && db.evidence.some((e) => e.user_id === 'u-chloe'));
    await ctx.close();
  }

  /* C. Eve : radar, validation humaine, Watchdog, graphe, invitation par e-mail */
  db = fresh();
  {
    const { ctx, page } = await as('eve');
    await page.goto(`${URL0}#/org/${ORG}/suivi`); await wait(page, 1300);
    const s = await text(page);
    if (process.env.ARBOR_SHOTS) await page.screenshot({ path: path.join(process.env.ARBOR_SHOTS, 'engines-radar.png'), fullPage: true });
    check('C1 radar : angle mort sur la connaissance sensible, gravité, couverture et limites affichées', /Radar des angles morts/.test(s) && /Gravité élevée/.test(s) && /Batterie endommagée/.test(s) && /couverture/.test(s) && /pas un jugement des personnes/.test(s));
    check('C2 une affirmation non documentée n’est pas un angle mort', !(await page.$$eval('.radar-list b', (bs) => bs.map((b) => b.textContent))).includes('Délai de retour'));
    await page.click('.radar-list [data-assign]'); await wait(page, 600);
    const as1 = calls('/assign_learning_actions')[0];
    check('C3 activité corrective proposée aux seules personnes concernées', as1 && as1.body.p_users.sort().join() === 'u-bob,u-chloe' && as1.body.p_knowledge[0] === 'k-batterie');
    await go(page, `#/org/${ORG}/suivi/u-bob`);
    check('C4 validation au poste proposée sur la fiche d’une personne', !!(await page.$('#hvForm')));
    await page.selectOption('#hvSkill', 'sk2'); await page.fill('#hvNote', 'A isolé une batterie gonflée sans aide'); await page.click('#hvForm button'); await wait(page, 600);
    const hv = calls('/record_human_validation')[0];
    check('C5 la validation humaine part avec la personne, la compétence et l’observation', hv && hv.body.p_user === 'u-bob' && hv.body.p_skill === 'sk2' && hv.body.p_outcome === 'juste' && /batterie gonflée/.test(hv.body.p_note));

    await go(page, `#/org/${ORG}/documents/src1`); await wait(page, 600);
    const w = await text(page);
    if (process.env.ARBOR_SHOTS) await page.screenshot({ path: path.join(process.env.ARBOR_SHOTS, 'engines-watchdog.png'), fullPage: true });
    check('C6 Watchdog : avant / maintenant, nouvelle règle sensible, impact (compétences, scénarios, personnes)', /Changements de cette version/.test(w) && /30 jours/.test(w) && /14 jours/.test(w) && /Sensible/.test(w) && /Conseiller un vélo/.test(w) && /Retour sans ticket/.test(w) && /2 personnes/.test(w));
    await page.click('[data-dec="it1"][data-v="accepte"]'); await wait(page, 800);
    check('C7 décision humaine transmise, l’élément passe « Accepté »', calls('/decide_change_item').length === 1 && db.items[0].decision === 'accepte' && /Accepté/.test(await page.textContent('#wdBox')));
    await page.click('#wdAssign'); await wait(page, 600);
    const as2 = calls('/assign_learning_actions').pop();
    check('C8 revalidation demandée aux personnes concernées, sur la connaissance modifiée', as2.body.p_kind === 'revalidation' && as2.body.p_users.length === 2 && as2.body.p_knowledge.includes('k-retour') && as2.body.p_change === 'ch1');
    await page.click('#relGo'); await wait(page, 900);
    check('C9 relations proposées par Arbor, à valider par un humain', /se confond souvent avec/.test(await page.textContent('#relBox')) && !!(await page.$('[data-edge="e1"][data-s="valide"]')));
    await page.click('[data-edge="e1"][data-s="valide"]'); await wait(page, 700);
    check('C10 relation validée', db.edges[0].status === 'valide' && calls('/set_edge_status').length === 1);

    await go(page, `#/org/${ORG}/equipe`);
    await page.fill('#ivEmail', 'zoe@magasin.fr'); await page.click('#ivForm button[type="submit"], #ivForm .btn:not([type])'); await wait(page, 700);
    const sendBtn = await page.$('#ivOut button:has-text("Envoyer par e-mail")');
    check('C11 l’invitation propose l’envoi par e-mail en plus du lien', !!sendBtn);
    if (sendBtn) {
      await sendBtn.click(); await wait(page, 700);
      check('C12 e-mail non configuré : message clair, le lien reste partageable', /pas encore configuré : partage le lien/.test(await page.textContent('body')) && !!(await page.$('#oiLink')));
      db.mail = true; await sendBtn.click(); await wait(page, 700);
      const inv = tasks('invitation_envoyer').pop();
      check('C13 e-mail configuré : envoi par le serveur, avec l’identifiant et le jeton (jamais la clé)', inv.body.invitation === 'inv1' && inv.body.token === 'ab'.repeat(24) && /Envoyée/.test(await sendBtn.textContent()));
    }
    check('C14 un manager ne règle pas la conservation des données (réservé à l’administrateur)', !(await page.$('#retForm')));
    await ctx.close();
  }

  /* D. Ana, administratrice : conservation */
  {
    const { ctx, page } = await as('ana');
    await page.goto(`${URL0}#/org/${ORG}/equipe`); await wait(page, 1200);
    check('D1 l’administratrice règle la durée de conservation des conversations', !!(await page.$('#retForm')));
    await page.selectOption('#retDays', '180'); await page.click('#retForm button'); await wait(page, 500);
    check('D2 durée enregistrée', db.retention === 180);
    await ctx.close();
  }

  /* E. Base sans migration 008 : rien ne casse */
  db = fresh(); db.no008 = true;
  {
    const { ctx, page } = await as('eve');
    await page.goto(`${URL0}#/org/${ORG}/scenarios`); await wait(page, 1000);
    check('E1 Scénarios sans 008 : message de mise à jour, pas d’erreur', /migration 008/.test(await text(page)));
    await go(page, `#/org/${ORG}/suivi`);
    check('E2 Suivi sans 008 : les fragilités et le radar restent calculés', /Les 3 fragilités prioritaires/.test(await text(page)) && /Radar des angles morts/.test(await text(page)));
    await go(page, `#/org/${ORG}/documents/src1`);
    check('E3 Document sans 008 : pas de panneau Watchdog, la validation reste disponible', !(await page.$('.wd')) && /Procédure retours/.test(await text(page)));
    await ctx.close();
  }
  {
    const { ctx, page } = await as('bob');
    await page.goto(`${URL0}#/org/${ORG}/mystere`); await wait(page, 1000);
    check('E4 Client mystère sans 008 : la simulation improvisée reste proposée', !!(await page.$('#msGo')) && !/Scénarios de ton équipe/.test(await text(page)));
    await go(page, `#/org/${ORG}/resultats`);
    check('E5 Mes résultats sans 008 : parcours calculé sans actions', /Mon parcours/.test(await text(page)) && /Conseiller un vélo/.test(await text(page)));
    await ctx.close();
  }

  check('F1 aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  check('F2 la fiche complète d’un scénario n’est jamais demandée par un collaborateur', !db.sent.some((x) => x.user === 'u-bob' && (/scenario_spec/.test(x.path) || /select=[^&]*spec/.test(decodeURIComponent(x.query)))));
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
