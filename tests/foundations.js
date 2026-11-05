/* Tests des fondations : sources, graphe validable, journal d'observations, maîtrise prouvée, sauvegarde.
   Lancer depuis la racine du dépôt :  node tests/foundations.js   (Playwright requis, voir README). */
const http = require('http');
const fs = require('fs');
const os = require('os');
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
const D = 86400000, now = Date.now();
const day = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const leaf = (id, title, notes, extra = {}) => ({ id, title, notes, explain: '', keyPoints: [`${title} : idée clé`], exercises: [], srs: null, status: 'todo', collapsed: false, children: [], ...extra });

function sample() {
  const strong = { s: 40, d: 4, last: now - 3 * D, due: now + 30 * D, reps: 4, lapses: 0, lastG: 3 };
  const ip = leaf('fnip0000001', 'Adresse IP', "Une adresse IP identifie une interface. L'adresse IP est codée sur 32 bits.", { srs: { ...strong }, ev: { n: 1, ok: 1, recall: [day(now - 3 * D)], lastOkAt: now - 3 * D } });
  const mask = leaf('fnmask00001', 'Masque de sous-réseau', "Le masque indique quelle partie de l'adresse IP désigne le réseau.", { srs: { ...strong }, ev: { n: 2, ok: 2, recall: [day(now - 13 * D), day(now - 3 * D)], lastOkAt: now - 3 * D } });
  const route = leaf('fnroute0001', 'Routage', "Le routage choisit la passerelle grâce au masque et à l'adresse IP de destination.", { srs: { ...strong }, ev: { n: 3, ok: 2, recall: [day(now - 20 * D), day(now - 5 * D)], lastOkAt: now - 5 * D, mis: [{ label: 'confond masque et passerelle', at: now - 2 * D }] } });
  const legacy = leaf('fnlegacy001', 'Classes d’adresses', 'Les classes A, B et C.', { srs: { ...strong } });
  const fresh = leaf('fnfresh0001', 'DNS', 'Le DNS traduit un nom en adresse IP.', { srs: { s: 2, d: 5, last: now - D, due: now - 1000, reps: 1, lapses: 0, lastG: 3 } });
  const ch = { id: 'fnchap00001', title: 'Adressage', notes: '', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, children: [ip, mask, route, legacy] };
  const ch2 = { id: 'fnchap00002', title: 'Nommage', notes: '', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, children: [fresh] };
  const root = { id: 'fnroot00001', title: 'Réseaux', notes: '', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, children: [ch, ch2] };
  return { subjects: [{ id: 'fnsubj00001', title: 'Réseaux', color: '#3451D1', icon: 'code', createdAt: 1, updatedAt: 5, root }], settings: { theme: 'light', mascot: false }, stats: { days: {}, calib: {} }, trophies: {}, xp: 0 };
}

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce', acceptDownloads: true });
  await ctx.addInitScript((d) => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.clear(); localStorage.setItem('arbor:v1', d); } }, JSON.stringify(sample()));
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const settle = (ms = 700) => page.waitForTimeout(ms);
  await page.goto(URL0); await settle(1000);
  const st = () => page.evaluate(() => JSON.parse(localStorage.getItem('arbor:v1')));
  const stateOf = (id) => page.evaluate((id) => { const s = JSON.parse(localStorage.getItem('arbor:v1')).subjects[0]; const x = Mastery.notions(s).find((y) => y.n.id === id); return { state: x.state, why: Mastery.reasonOf(x.n, x.state) }; }, id);

  /* A. Maîtrise prouvée */
  const a1 = await stateOf('fnip0000001');
  check('A1 mémoire stable mais un seul rappel juste : pas encore maîtrisée', a1.state === 'learning' && /deuxième/.test(a1.why), JSON.stringify(a1));
  const a2 = await stateOf('fnmask00001');
  check('A2 deux rappels justes à 10 jours d’écart : maîtrisée, avec sa raison', a2.state === 'mastered' && /2 rappels justes/.test(a2.why), JSON.stringify(a2));
  const a3 = await stateOf('fnroute0001');
  check('A3 une confusion repérée après le dernier succès : fragile, et la confusion est nommée', a3.state === 'fragile' && /masque et passerelle/.test(a3.why), JSON.stringify(a3));
  const a4 = await stateOf('fnlegacy001');
  check('A4 données d’avant le journal : l’historique FSRS suffit (pas de régression)', a4.state === 'mastered');

  /* B. Journal d'observations, depuis une vraie révision */
  await page.goto(`${URL0}#/s/fnsubj00001/fnfresh0001/revision`); await settle(900);
  await page.click('#paneBody').catch(() => {});
  const startBtn = await page.$('[data-act=study-start]'); if (startBtn) { await startBtn.click(); await settle(500); }
  const typed = await page.$('#typed'); if (typed) await typed.fill('traduit les noms en adresses');
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press('Enter'); await settle(400); await page.keyboard.press('3'); await settle(700);
  const obs = await page.evaluate(() => Obs.byNotion('fnfresh0001'));
  check('B1 la réponse est versée au journal (activité, résultat, note, réponse tapée)', obs.length === 1 && obs[0].activity === 'rappel' && obs[0].outcome === 'juste' && obs[0].grade === 3 && /traduit/.test(obs[0].answer || ''), JSON.stringify(obs[0] || {}));
  const ev = (await st()).subjects[0].root.children[1].children[0].ev;
  check('B2 la notion garde un résumé (1 rappel juste aujourd’hui)', ev && ev.ok === 1 && ev.recall.includes(day(Date.now())), JSON.stringify(ev));

  /* C. Graphe : valider puis rejeter un lien proposé */
  await page.goto(`${URL0}#/s/fnsubj00001/fnroot00001/carte`); await settle(900);
  await page.click('.xn[data-id="fnroute0001"]'); await settle(400);
  const relIds = await page.$$eval('.xpanel [data-rel]', (b) => [...new Set(b.map((x) => x.dataset.rel))]);
  check('C1 les liens calculés sont « proposés », avec leurs mots communs', relIds.length >= 1 && /proposé · mots communs/.test(await page.textContent('.xpanel')), JSON.stringify(relIds));
  await page.click(`.xpanel [data-rel="${relIds[0]}"][data-st="valide"]`); await settle(600);
  await page.click('.xn[data-id="fnroute0001"]').catch(() => {}); await settle(300);
  const dec = (await st()).subjects[0].graph;
  check('C2 un lien validé est enregistré avec sa date', dec && dec.decisions[relIds[0]] && dec.decisions[relIds[0]].status === 'valide');
  // rejet : on repart d'un lien non décidé, on le rejette, puis on recharge
  await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('arbor:v1')); d.subjects[0].graph = { v: 1, decisions: {} }; localStorage.setItem('arbor:v1', JSON.stringify(d)); });
  await page.reload(); await settle(1000);
  await page.click('.xn[data-id="fnroute0001"]'); await settle(400);
  await page.click(`.xpanel [data-rel="${relIds[0]}"][data-st="rejete"]`); await settle(600);
  await page.reload(); await settle(1000);
  await page.click('.xn[data-id="fnroute0001"]'); await settle(400);
  const still = await page.$$eval('.xpanel .xrel', (l) => l.length);
  check('C3 un lien rejeté disparaît, même après rechargement', still === relIds.length - 1 && (await st()).subjects[0].graph.decisions[relIds[0]].status === 'rejete', `${still} lien(s) restant(s)`);

  /* D. Sauvegarde : le journal et les décisions voyagent avec le fichier */
  await page.click('#settingsBtn'); await settle(400);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#expAll')]);
  const file = path.join(os.tmpdir(), 'arbor-foundations.json'); await dl.saveAs(file);
  const b = JSON.parse(fs.readFileSync(file, 'utf8'));
  check('D1 la sauvegarde contient le journal et les décisions du graphe', Array.isArray(b.obs) && b.obs.length >= 1 && !!b.data.subjects[0].graph);
  const ctx2 = await browser.newContext({ serviceWorkers: 'block' }); const p2 = await ctx2.newPage(); p2.on('pageerror', (e) => errors.push(e.message));
  await p2.goto(URL0); await p2.waitForTimeout(900);
  await p2.setInputFiles('#jsonInput', file); await p2.waitForTimeout(500);
  await Promise.all([p2.waitForNavigation().catch(() => {}), p2.click('#rsReplace')]); await p2.waitForTimeout(1000);
  const restored = await p2.evaluate(async () => ({ obs: (await Obs.all()).length, graph: !!JSON.parse(localStorage.getItem('arbor:v1')).subjects[0].graph, ev: !!JSON.parse(localStorage.getItem('arbor:v1')).subjects[0].root.children[0].children[1].ev }));
  check('D2 restauration : journal, résumés et décisions retrouvés sur un autre appareil', restored.obs === b.obs.length && restored.graph && restored.ev, JSON.stringify(restored));
  await ctx2.close();

  /* E. Sources : un PDF de deux pages garde la page et l'extrait de chaque partie */
  const maker = await browser.newPage();
  await maker.setContent(`<!doctype html><meta charset="utf-8"><style>body{font:11pt Helvetica;margin:40px}h1{font-size:24pt}h2{font-size:16pt}.b{page-break-before:always}</style>
    <h1>Réseaux locaux</h1><h2>1 Ethernet</h2><p>Ethernet est une technologie de réseau local. Elle transmet des trames entre des machines reliées au même segment.</p>
    <h2 class="b">2 Le Wi-Fi</h2><p>Le Wi-Fi est un réseau local sans fil. Il utilise des ondes radio et des points d'accès.</p>`);
  const pdf = path.join(os.tmpdir(), 'arbor-src.pdf'); await maker.pdf({ path: pdf, format: 'A4' });
  await page.evaluate(() => { const i = document.createElement('input'); i.type = 'file'; i.id = '__f'; document.body.appendChild(i); });
  await page.setInputFiles('#__f', pdf);
  const tree = await page.evaluate(async () => (await PdfImport.analyze(document.getElementById('__f').files[0])).tree);
  const wifi = tree.children.find((c) => /Wi-Fi/.test(c.title));
  check('E1 chaque partie garde sa page et son extrait d’origine', wifi && wifi.src && wifi.src.pages[0] === 2 && /sans fil/.test(wifi.src.quote) && wifi.src.doc === 'arbor-src.pdf', JSON.stringify(wifi && wifi.src));
  check('E2 accents séparés des PDF LaTeX recollés', await page.evaluate(() => PdfImport.fixAccents('r´ eseaux, re¸ cu, acc` es ` a, connaı̂tre')) === 'réseaux, reçu, accès à, connaître');

  check('F1 aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
