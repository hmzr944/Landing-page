/* Parcours étudiant réel (docs/audit-student.md) : défauts trouvés en important de vrais PDF, verrouillés ici.
   - L'introduction fermée n'intercepte plus les clics (on pouvait choisir « Un PDF » mais plus rien cliquer ensuite).
   - Une longue partie n'est plus coupée à 6 000 caractères ; des morceaux de mot collés ne reçoivent plus d'espace
     (« P rophase ») ; les guillemets LaTeX « ✭✭ … ✮✮ » redeviennent « … ».
   - L'accueil ne renvoie plus vers une leçon terminée (l'étudiant ne révisait jamais) ; une notion difficile déjà
     rouverte aujourd'hui ne bloque plus l'accueil ; « Essayer sans compte » est visible sans défiler.
   Les PDF sont fabriqués par le navigateur de test (aucun fichier personnel).
   Lancer depuis la racine du dépôt :  node tests/student-path.js   (Playwright requis). */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
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
const D = 86400000, now = Date.now();

// Un cours : une très longue partie (plus de 6 000 caractères), un mot écrit en deux polices collées, des guillemets LaTeX
const para = (i) => `<p>Le routeur numéro ${i} reçoit un datagramme, consulte sa table de routage, choisit la meilleure interface de sortie et décrémente la durée de vie du paquet avant de le retransmettre vers le réseau suivant, sans jamais modifier les adresses de source ni de destination du datagramme.</p>`;
const COURSE = `<html><head><meta charset="utf-8"><style>body{font-family:Arial;font-size:12px;margin:40px} h1{font-size:22px} h2{font-size:17px}</style></head><body>
<h1>Réseaux et routage</h1>
<h2>Le routage</h2>${Array.from({ length: 30 }, (_, i) => para(i + 1)).join('')}<p>FIN-DE-LA-PARTIE-ROUTAGE : le dernier paragraphe doit être conservé.</p>
<h2>La <span style="font-family:'Times New Roman',serif">P</span><span style="font-family:Arial">rophase</span> du protocole</h2>
<p>La phase d’ouverture est ✭✭ gérée ✮✮ par le client, qui envoie une demande de connexion au serveur avant tout échange de données utiles.</p>
<p>Le serveur répond par une acceptation, puis le client confirme : la connexion est alors établie dans les deux sens et les données peuvent circuler.</p>
</body></html>`;

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arbor-path-'));
  const maker = await browser.newPage();
  await maker.setContent(COURSE); const PDF = path.join(tmp, 'cours.pdf'); await maker.pdf({ path: PDF, format: 'A4' }); await maker.close();
  const errors = [];

  /* A. Nouveau venu sur téléphone : le lien sans compte se voit, l'introduction mène à un import qui marche */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(URL0); await page.waitForTimeout(1300);
    const y = await page.evaluate(() => { const b = document.querySelector('[data-wel="guest"]'); const r = b.getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; });
    check('A1 « Essayer sans compte » est visible sans défiler', y);
    await page.click('[data-wel="guest"]'); await page.waitForTimeout(900);
    await page.click('.onb-entry[data-entry="importer"]'); await page.waitForTimeout(500);
    for (let i = 0; i < 5 && !(await page.isVisible('[data-onb="pdf"]')); i++) { const b = await page.$('.onb [data-onb="next"], .onb .onb-foot .btn.big'); if (!b) break; await b.click(); await page.waitForTimeout(500); }
    await page.click('[data-onb="pdf"]'); await page.waitForTimeout(600);
    const top = await page.evaluate(() => { const r = document.getElementById('drop').getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e && (e.id === 'drop' || !!e.closest('#drop')); });
    check('A2 après « Un PDF » dans l’introduction, la zone de dépôt reçoit bien le clic (l’introduction fermée ne la couvre plus)', top);
    const [fc] = await Promise.all([page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null), page.click('#drop', { timeout: 5000 }).catch(() => null)]);
    check('A3 un vrai clic ouvre le choix du fichier', !!fc);
    if (fc) await fc.setFiles(PDF); else await page.setInputFiles('#pdfInput', PDF);
    await page.click('#pdfGo', { timeout: 5000 }).catch(() => {});
    await page.waitForSelector('text=Créer le cours', { timeout: 30000 }).catch(() => {});
    await page.click('text=Créer le cours', { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(1500);
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('arbor:v1')));
    const s = st.subjects.find((x) => /Réseaux/.test(x.title)) || {};
    const all = []; (function w(n) { if (!n) return; all.push(n); (n.children || []).forEach(w); })(s.root);
    const routage = all.find((n) => /routage/i.test(n.title) && (n.notes || '').length > 1000) || {};
    check('A4 le cours est créé depuis l’introduction', !!s.root, st.subjects.map((x) => x.title).join(', '));
    check('A5 une partie de plus de 6 000 caractères est gardée en entier (son dernier paragraphe est là)', (routage.notes || '').length > 6000 && /FIN-DE-LA-PARTIE-ROUTAGE/.test(routage.notes || ''), String((routage.notes || '').length));
    const titles = all.map((n) => n.title).join(' | ');
    check('A6 un mot écrit en deux polices collées reste un mot (« Prophase », pas « P rophase »)', /Prophase/.test(titles) && !/P rophase/.test(titles), titles);
    const txt = all.map((n) => n.notes || '').join(' ');
    check('A7 les guillemets LaTeX « ✭✭ … ✮✮ » deviennent « … »', /« gérée »/.test(txt) && !/✭|✮/.test(txt));
    await ctx.close();
  }

  /* B. Accueil : jamais renvoyé vers une leçon déjà faite ; une notion difficile rouverte ne bloque plus */
  const leaf = (id, title, srs) => ({ id, title, notes: `${title} : explication avec un exemple concret.`, explain: '', keyPoints: [`${title} : point clé`], exercises: [], srs, status: 'todo', collapsed: false, children: [] });
  const base = (leaves2, extra = {}) => {
    const m1 = { id: 'modaaaaaa01', title: 'Liens', notes: '', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, module: { pretest: '', learned: true, generated: true, sources: [], date: '2026-01-01', lessonDone: { at: now - 3600e3, good: 4, asked: 5 } }, children: [leaf('nslip000001', 'La liaison SLIP', null), leaf('nppp0000001', 'La liaison PPP', null)] };
    const m2 = { id: 'modaaaaaa02', title: 'Le protocole IP', notes: '', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, module: { pretest: '', learned: false, generated: true, sources: [], date: '2026-01-02' }, children: leaves2 };
    return { subjects: [{ id: 'subjaaaaa01', title: 'TCP-IP', color: '#3451D1', icon: 'code', createdAt: 1, updatedAt: now, program: true, root: { id: 'rootaaaaa01', title: 'TCP-IP', notes: '', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, children: [m1, m2] } }],
      settings: { theme: 'light', mascot: false, newPerDay: 10, dailyGoal: 15 }, stats: { days: {}, calib: {} }, trophies: {}, xp: 0, ...extra };
  };
  async function home(state) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await ctx.addInitScript((d) => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.clear(); localStorage.setItem('arbor:v1', d); localStorage.setItem('arbor:journey', JSON.stringify({ workspace: 'student', done: true })); } }, JSON.stringify(state));
    const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(URL0); await page.waitForTimeout(1200);
    return { ctx, page };
  }
  {
    const { ctx, page } = await home(base([leaf('nip00000001', 'Le datagramme IP', null)], { lastVisit: { sid: 'subjaaaaa01', nid: 'modaaaaaa01', at: now - 600e3, kind: 'lesson' } }));
    const f = await page.getAttribute('.home', 'data-focus');
    const act = await page.getAttribute('.b-hero .btn.big', 'data-act');
    check('B1 juste après une leçon terminée, l’accueil propose la suite (leçon suivante), pas de rouvrir la leçon finie', f === 'lesson' && act === 'lesson-next' && /Le protocole IP/.test(await page.textContent('.b-hero')), `${f} ${act}`);
    check('B2 le titre de la leçon n’est pas répété dans « ensuite »', !/ensuite : la leçon « Le protocole IP »/.test(await page.textContent('.b-hero')));
    await ctx.close();
  }
  {
    const hard = leaf('nhard000001', 'Le routage IP', { s: 4, d: 7, last: now - D, due: now + 3 * D, reps: 4, lapses: 2, lastG: 3 });
    const a = await home(base([hard]));
    check('B3 une notion manquée deux fois est proposée : « On reprend ce point ensemble ? »', (await a.page.getAttribute('.home', 'data-focus')) === 'struggle');
    await a.ctx.close();
    const b = await home(base([hard], { lastVisit: { sid: 'subjaaaaa01', nid: 'nhard000001', at: now - 1800e3, kind: 'fiche' } }));
    check('B4 rouverte il y a 30 minutes : l’accueil passe à la suite au lieu de la reproposer', (await b.page.getAttribute('.home', 'data-focus')) !== 'struggle', await b.page.getAttribute('.home', 'data-focus'));
    await b.ctx.close();
  }
  check('Z aucune erreur JavaScript', !errors.length, errors.join(' | '));
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
