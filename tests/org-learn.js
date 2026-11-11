/* Espace pro, apprentissage et suivi (étapes E à G), de bout en bout dans le navigateur.
   Le serveur est simulé avec les mêmes contrats que supabase/functions/tutor/org.ts (dont la logique réelle est testée
   par Deno : correction, extraits, preuves) : ici on vérifie les écrans, les parcours et ce qui est envoyé ou affiché.
   Lancer depuis la racine du dépôt :  node tests/org-learn.js   (Playwright requis). */
const http = require('http');
const fs = require('fs');
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
const ORG = '33333333-3333-4333-8333-333333333333';
const U = { bob: { id: 'u-bob', role: 'member', email: 'bob@magasin.fr' }, chloe: { id: 'u-chloe', role: 'member', email: 'chloe@magasin.fr' }, eve: { id: 'u-eve', role: 'manager', email: 'eve@magasin.fr' } };
const tokens = Object.fromEntries(Object.values(U).map((u) => [jwt(u.id), u]));
const K = [
  { id: 'k-autonomie', kind: 'produit', title: 'Autonomie de l’Alto 500', body: 'L’Alto 500 a une autonomie de 90 km en mode éco.', quote: 'Son autonomie annoncée est de 90 km en mode éco', page: 1, status: 'valide', source_version_id: 'v1' },
  { id: 'k-batterie', kind: 'sensible', title: 'Batterie endommagée', body: 'Ne jamais recharger une batterie endommagée.', quote: 'Ne jamais recharger une batterie endommagée', page: 2, status: 'valide', source_version_id: 'v1' },
  { id: 'k-retour', kind: 'regle', title: 'Délai de retour', body: 'Le client dispose de 30 jours pour un retour.', quote: 'Le client dispose de 30 jours pour un retour', page: 2, status: 'valide', source_version_id: 'v1' },
];
const db = { items: {}, scen: {}, evidence: [], skills: [], links: [], sent: [], responses: [] };

function fn(me, b) {
  if (b.task === 'diagnostic_start') {
    const session = crypto.randomUUID();
    const qs = [[K[0], 'Un client demande l’autonomie en mode éco ?', ['90 km', '150 km', '40 km'], 0], [K[1], 'Une batterie gonflée revient. Que fais-tu ?', ['Je la recharge', 'Je ne la recharge jamais et je l’isole', 'Je la remets en rayon'], 1], [K[2], 'Retour après 20 jours avec ticket ?', ['Non', 'Oui, 30 jours', 'Seulement le lundi'], 1]];
    const items = qs.map(([k, question, options, correct]) => { const id = crypto.randomUUID(); db.items[id] = { k, correct, user: me.id, session }; return { id, question, options }; });
    return { session, items };
  }
  if (b.task === 'diagnostic_answer') {
    const it = db.items[b.item]; if (!it || it.user !== me.id || it.done) return [409, { error: 'question déjà répondue' }];
    it.done = true; const outcome = b.choice === it.correct ? 'juste' : 'faux';
    db.evidence.push({ user_id: me.id, knowledge_id: it.k.id, activity: 'diagnostic', outcome, confidence: b.confidence, session_id: it.session, detail: {}, at: new Date().toISOString() });
    return { outcome, correct: it.correct, falseCertainty: outcome === 'faux' && ['sait', 'reflexe'].includes(b.confidence), explanation: it.k.body, quote: it.k.quote, page: it.k.page, title: it.k.title };
  }
  if (b.task === 'mystere_start') { const id = crypto.randomUUID(); db.scen[id] = { user: me.id, turns: 0 }; return { id, opening: 'Bonjour, je cherche un vélo pour aller au travail…', client: { name: 'Nadia', style: b.style } }; }
  if (b.task === 'mystere_tour') {
    const sc = db.scen[b.session]; sc.turns++; sc.last = b;
    if (/150 km/.test(b.message)) db.evidence.push({ user_id: me.id, knowledge_id: 'k-autonomie', activity: 'simulation', outcome: 'faux', confidence: b.confidence, session_id: b.session, detail: { claim: '150 km' }, at: new Date().toISOString() });
    db.evidence.push({ user_id: me.id, knowledge_id: null, activity: 'simulation', outcome: 'juste', confidence: null, session_id: b.session, detail: { behavior: 'decouverte' }, at: new Date().toISOString() });
    return { reply: sc.turns >= 2 ? 'Merci, je vais réfléchir.' : 'Environ 35 km par jour. Ça tiendra ?', ended: sc.turns >= 2, turn: sc.turns };
  }
  if (b.task === 'mystere_fin') return { debrief: { outcome: 'parti', turns: db.scen[b.session].turns, need: { found: false, text: 'un vélo pour 35 km par jour' }, objections: [{ text: 'C’est cher', resolved: false }],
    behaviors: [{ id: 'decouverte', label: 'Pose des questions pour comprendre le besoin', observed: true, evidence: 'Quelle distance faites-vous ?' }, { id: 'reformulation', label: 'Reformule le besoin du client', observed: false, evidence: '' }],
    correct: [], incorrect: [{ text: 'il fait 150 km', quote: 'Son autonomie annoncée est de 90 km en mode éco', page: 1, falseCertainty: true }], undocumented: [{ text: 'garanti 10 ans' }], note: 'Une simulation réussie ne suffit pas à valider une compétence : elle s’ajoute aux autres preuves, dans le temps.' } };
  if (b.task === 'competences') return me.role === 'manager' ? { skills: [{ name: 'Conseiller un vélo électrique', description: 'Recommander selon le trajet', knowledge: ['k-autonomie', 'k-retour'] }] } : [403, { error: 'accès refusé' }];
  return [400, { error: 'tâche inconnue' }];
}
function handle(r) {
  const u = new URL(r.url()); const p = u.pathname; const raw = r.postData() || '';
  const me = tokens[(r.headers().authorization || '').replace('Bearer ', '')];
  db.sent.push({ url: r.url(), body: raw, headers: r.headers() });
  const ok = (data, status = 200) => { db.responses.push(JSON.stringify(data)); return { status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: data === undefined ? '' : JSON.stringify(data) }; };
  if (!me) return ok({ message: 'JWT invalide' }, 401);
  const b = raw ? JSON.parse(raw) : {};
  const lead = me.role === 'manager';
  const eq = (k) => (u.searchParams.get(k) || '').replace(/^eq\./, '');
  if (p === '/rest/v1/rpc/my_organizations') return ok([{ id: ORG, name: 'Magasin de Lyon', sector: 'Commerce', role: me.role }]);
  if (p === '/functions/v1/tutor') { const out = fn(me, b); return Array.isArray(out) ? ok(out[1], out[0]) : ok({ ...out, usage: { used: 1, limit: 400 } }); }
  if (p === '/rest/v1/evidence_events') return ok(db.evidence.filter((e) => (lead || e.user_id === me.id) && (!eq('user_id') || e.user_id === eq('user_id'))));
  if (p === '/rest/v1/knowledge_nodes') return ok(K.filter((k) => lead || k.status === 'valide').map(({ id, kind, title, page, status }) => ({ id, kind, title, page, status })));
  if (p === '/rest/v1/memberships') return ok(lead ? Object.values(U).map((x) => ({ user_id: x.id, role: x.role, email: x.email })) : [{ user_id: me.id, role: me.role, email: me.email }]);
  if (p === '/rest/v1/skills' && r.method() === 'GET') return ok(db.skills);
  if (p === '/rest/v1/skills' && r.method() === 'POST') { if (!lead) return ok({ message: 'refusé' }, 403); const row = { id: crypto.randomUUID(), name: b.name, description: b.description }; db.skills.push(row); db.skillPrefer = r.headers().prefer; return ok([row], 201); }
  if (p === '/rest/v1/skill_knowledge' && r.method() === 'GET') return ok(db.links);
  if (p === '/rest/v1/skill_knowledge' && r.method() === 'POST') { db.links.push(...b); return ok(undefined, 201); }
  return ok({ message: `route inconnue ${p}` }, 404);
}

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const errors = [];
  async function as(user) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await ctx.addInitScript(([tok, email, org, role]) => {
      try { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.clear(); localStorage.setItem('arbor:auth', JSON.stringify({ access_token: tok, refresh_token: 'r', expires_at: Date.now() + 3e6, email })); localStorage.setItem('arbor:orgs', JSON.stringify([{ id: org, name: 'Magasin de Lyon', sector: 'Commerce', role }])); localStorage.setItem('arbor:v1', JSON.stringify({ subjects: [{ id: 'persosub001', title: 'Mon cours perso confidentiel', color: '#1E7A57', icon: 'dna', createdAt: 1, updatedAt: 2, root: { id: 'persoroot01', title: 'Mon cours perso confidentiel', notes: '', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, children: [] } }], settings: { theme: 'light', mascot: false }, stats: { days: {}, calib: {} }, trophies: {}, xp: 0, profile: { done: true, goals: [] } })); } } catch (e) { /* about:blank */ }
    }, [jwt(U[user].id), U[user].email, ORG, U[user].role]);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route(`${SB}/**`, (route) => route.fulfill(handle(route.request())));
    return { ctx, page };
  }
  const wait = (page, ms = 600) => page.waitForTimeout(ms);
  const go = async (page, hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await wait(page, 900); };

  /* A. Bob, collaborateur : diagnostic */
  {
    const { ctx, page } = await as('bob');
    await page.goto(`${URL0}#/org/${ORG}`); await wait(page, 900);
    check('A1 l’accueil propose le diagnostic, le client mystère et les résultats (plus de « Bientôt »)', !!(await page.$(`a[href="#/org/${ORG}/diagnostic"]`)) && !!(await page.$(`a[href="#/org/${ORG}/mystere"]`)) && !(await page.$('.org-card.soon')));
    check('A2 un collaborateur n’a ni Suivi ni Compétences', !(await page.$('.org-tabs a[href$="/suivi"]')) && !(await page.$('.org-tabs a[href$="/competences"]')));
    await go(page, `#/org/${ORG}/diagnostic`);
    await page.click('#dgGo'); await wait(page, 800);
    // question 1 : juste, en sachant
    await page.click('.dg-opt:nth-child(1)'); await page.click('.conf-pick label:nth-child(2)');
    check('A3 il faut une réponse ET une confiance pour valider', !(await page.isDisabled('#dgOk')));
    await page.click('#dgOk'); await wait(page, 600);
    check('A4 réponse juste : retour avec l’extrait et la page du document', /Juste/.test(await page.textContent('#dgFb')) && /« Son autonomie annoncée est de 90 km en mode éco »/.test(await page.textContent('#dgFb')) && /p\. 1/.test(await page.textContent('#dgFb')));
    await page.click('#dgNext'); await wait(page, 400);
    // question 2 : fausse, avec « C'est un réflexe »
    await page.click('.dg-opt:nth-child(1)'); await page.click('.conf-pick label:nth-child(3)'); await page.click('#dgOk'); await wait(page, 600);
    if (process.env.ARBOR_SHOTS) await page.screenshot({ path: path.join(process.env.ARBOR_SHOTS, 'learn-diag.png') });
    check('A5 erreur annoncée comme un réflexe : signalée comme le plus important à revoir', /alors que tu étais sûr/.test(await page.textContent('#dgFb')) && !!(await page.$('.dg-opt.right')) && !!(await page.$('.dg-opt.wrong')));
    await page.click('#dgNext'); await wait(page, 400);
    await page.click('.dg-opt:nth-child(2)'); await page.click('.conf-pick label:nth-child(1)'); await page.click('#dgOk'); await wait(page, 600);
    await page.click('#dgNext'); await wait(page, 500);
    const end = await page.textContent('#app');
    check('A6 fin : 2 justes sur 3, 1 erreur sûre, et « ce n’est pas une note »', /2<\/b>|2 réponses justes sur 3/.test(await page.innerHTML('#app')) && /pas une note/.test(end) && /annoncée comme sûre/.test(end));
    check('A7 les réponses sont devenues des preuves (diagnostic, confiance)', db.evidence.filter((e) => e.user_id === 'u-bob' && e.activity === 'diagnostic').length === 3 && db.evidence.some((e) => e.outcome === 'faux' && e.confidence === 'reflexe'));

    /* B. Résultats */
    await go(page, `#/org/${ORG}/resultats`);
    const res = await page.textContent('#app');
    check('B1 mes résultats : fausse certitude en tête, prochaine activité expliquée', /Fausse certitude/.test(res) && /Prochaine activité : Revoir « Batterie endommagée » \(p\. 2 du document\)/.test(res) && /3 preuves réelles/.test(res));

    /* C. Client mystère */
    await go(page, `#/org/${ORG}/mystere`);
    await page.click('#msGo'); await wait(page, 700);
    check('C1 le client ouvre la conversation, son besoin reste caché', /je cherche un vélo/.test(await page.textContent('#msFeed')) && !/35 km/.test(await page.textContent('#app')));
    await page.fill('#msText', 'Quelle distance faites-vous ? L’Alto 500 fait 150 km.'); await page.click('#msForm .conf-pick label:nth-child(3)'); await page.click('#msSend'); await wait(page, 700);
    const lastSent = JSON.parse(db.sent.filter((x) => x.url.endsWith('/functions/v1/tutor')).pop().body);
    check('C2 la réponse et la confiance déclarée partent au serveur ; le client répond', lastSent.task === 'mystere_tour' && lastSent.confidence === 'reflexe' && /35 km par jour/.test(await page.textContent('#msFeed')));
    await page.fill('#msText', 'Il est garanti 10 ans.'); await page.click('#msSend'); await wait(page, 1500);
    const deb = await page.textContent('#app');
    if (process.env.ARBOR_SHOTS) await page.screenshot({ path: path.join(process.env.ARBOR_SHOTS, 'learn-debrief.png'), fullPage: false });
    check('C3 débrief : comportements observés avec la phrase citée, erreur avec l’extrait du document', /Débrief/.test(deb) && /« Quelle distance faites-vous \? »/.test(deb) && /Fausse certitude/.test(deb) && /Le document dit : « Son autonomie annoncée est de 90 km en mode éco » \(p\. 1\)/.test(deb));
    check('C4 les affirmations non documentées sont signalées, et une simulation ne valide pas une compétence', /non retrouvées dans les fiches validées/.test(deb) && /ne suffit pas à valider une compétence/.test(deb));
    await go(page, `#/org/${ORG}/suivi`);
    check('C5 le suivi d’équipe est fermé à un collaborateur', /réservé aux managers/.test(await page.textContent('#app')));
    await ctx.close();
  }

  /* D. Eve, manager : suivi d'équipe */
  {
    const { ctx, page } = await as('eve');
    await page.goto(`${URL0}#/org/${ORG}/suivi`); await wait(page, 1200);
    const t1 = await page.textContent('#app');
    check('D1 une seule personne observée : pas de conclusion d’équipe, échantillon affiché', /Pas assez de données/.test(t1) && /personne observée sur 3/.test(t1));
    // Chloé fait le diagnostic (même erreur sûre sur la batterie)
    db.evidence.push({ user_id: 'u-chloe', knowledge_id: 'k-batterie', activity: 'diagnostic', outcome: 'faux', confidence: 'sait', session_id: 'dc', detail: {}, at: new Date().toISOString() },
      { user_id: 'u-chloe', knowledge_id: 'k-autonomie', activity: 'diagnostic', outcome: 'juste', confidence: 'sait', session_id: 'dc', detail: {}, at: new Date().toISOString() });
    await page.reload(); await wait(page, 1200);
    const t2 = await page.textContent('#app');
    if (process.env.ARBOR_SHOTS) await page.screenshot({ path: path.join(process.env.ARBOR_SHOTS, 'learn-suivi.png') });
    check('D2 avec deux personnes, les fragilités apparaissent avec leur échantillon et la page', /Batterie endommagée/.test(t2) && /2 erreurs sur 2 observations|erreurs? sur \d+ observations?/.test(t2) && /fausses? certitudes?/.test(t2) && /p\. 2 du document/.test(t2));
    check('D3 chaque personne a sa prochaine activité', /Revoir « Batterie endommagée »/.test(t2) && (await page.$$('.team-rows li')).length >= 2);
    await page.click(`a[href="#/org/${ORG}/suivi/u-bob"]`); await wait(page, 1000);
    const t3 = await page.textContent('#app');
    check('D4 le détail d’une personne : états expliqués, rappel que l’espace personnel n’est jamais visible', /bob@magasin\.fr/.test(t3) && /Fausse certitude/.test(t3) && /espace personnel ne l’est jamais/.test(t3));

    /* E. Compétences */
    await go(page, `#/org/${ORG}/competences`);
    await page.click('#skPropose'); await wait(page, 800);
    check('E1 propositions de compétences avec leurs connaissances, rien d’ajouté sans accord', /Conseiller un vélo électrique/.test(await page.textContent('#skProps')) && db.skills.length === 0);
    await page.click('[data-add="0"]'); await wait(page, 1000);
    check('E2 ajoutée sur décision du manager, reliée à ses connaissances', db.skills.length === 1 && db.links.length === 2 && db.skillPrefer === 'return=representation' && /Conseiller un vélo électrique/.test(await page.textContent('#app')));
    await ctx.close();
  }

  const all = db.sent.map((x) => `${x.url} ${x.body}`).join('\n');
  check('F1 aucune donnée de l’espace personnel envoyée', !/Mon cours perso confidentiel|persosub001/.test(all));
  check('F2 la bonne réponse d’une question n’est jamais envoyée au navigateur avant la réponse', db.responses.filter((x) => /"items":\[/.test(x)).every((x) => !/"correct"/.test(x)));
  check('F3 aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
