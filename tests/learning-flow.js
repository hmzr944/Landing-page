/* Tests de la phase 2 : trois espaces, états des notions, session du jour.
   Lancer depuis la racine du dépôt :  node tests/learning-flow.js   (Playwright requis, voir README). */
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

const D = 86400000, now = Date.now();
const leaf = (id, title, srs, notes = '') => ({ id, title, notes: notes || `${title} est une notion importante du cours, expliquée avec un exemple concret.`, explain: '', keyPoints: [`${title} : point clé`], exercises: [], srs, status: 'todo', collapsed: false, children: [] });
// Un parcours : module 1 (leçon faite), module 2 (leçon à faire) ; des notions dans chaque état
function sample() {
  const m1 = { id: 'modaaaaaa01', title: 'Réseaux', notes: '', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false,
    module: { pretest: '', learned: true, generated: true, sources: [], date: '2026-01-01', lessonDone: { at: now - 2 * D, good: 4, asked: 5 } },
    children: [
      leaf('nmastered01', 'Adressage IP', { s: 40, d: 4, last: now - 3 * D, due: now + 30 * D, reps: 6, lapses: 0, lastG: 3 }),
      leaf('ndue0000001', 'Masque de sous-réseau', { s: 3, d: 6, last: now - 5 * D, due: now - D, reps: 2, lapses: 0, lastG: 3 }),
      leaf('nfragile001', 'Routage statique', { s: 4, d: 7, last: now - D, due: now + 3 * D, reps: 4, lapses: 2, lastG: 3 }),
      leaf('nlearning01', 'Passerelle', { s: 8, d: 5, last: now - D, due: now + 6 * D, reps: 3, lapses: 0, lastG: 3 }),
      leaf('nseen000001', 'DNS', null),
    ] };
  const m2 = { id: 'modaaaaaa02', title: 'Virtualisation', notes: '', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false,
    module: { pretest: '', learned: false, generated: true, sources: [], date: '2026-01-02' },
    children: [leaf('nnew0000001', 'Hyperviseur', null), leaf('nnew0000002', 'Machine virtuelle', null), leaf('nnew0000003', 'Instantané', null)] };
  const root = { id: 'rootaaaaa01', title: 'TSSR', notes: '', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, children: [m1, m2] };
  return { subjects: [{ id: 'subjaaaaa01', title: 'TSSR', color: '#3451D1', icon: 'code', createdAt: 1, updatedAt: now, program: true, examDate: new Date(now + 30 * D).toISOString().slice(0, 10), root }],
    settings: { theme: 'light', mascot: false, newPerDay: 0 }, stats: { days: {}, calib: {} }, trophies: {}, xp: 0 };
}

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  await ctx.addInitScript((d) => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.clear(); localStorage.setItem('arbor:v1', d); } }, JSON.stringify(sample()));
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const settle = (ms = 700) => page.waitForTimeout(ms);
  await page.goto(URL0); await settle(1200);

  /* A. États des notions */
  const states = await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('arbor:v1'));
    return Object.fromEntries(Mastery.notions(st.subjects[0]).map((x) => [x.n.id, x.state]));
  });
  check('A1 révisée 3 semaines et juste : maîtrisée', states.nmastered01 === 'mastered');
  check('A2 révision échue : à réviser', states.ndue0000001 === 'due');
  check('A3 oubliée 2 fois : fragile', states.nfragile001 === 'fragile');
  check('A4 révisée récemment : en apprentissage', states.nlearning01 === 'learning');
  check('A5 leçon faite, jamais rappelée : découverte (pas maîtrisée)', states.nseen000001 === 'seen');
  check('A6 jamais vue : non étudiée', states.nnew0000001 === 'new');
  check('A7 les modules ne comptent pas comme des notions', !('modaaaaaa01' in states) && Object.keys(states).length === 8);

  /* B. Aujourd'hui : le plan et le bouton unique */
  const plan = await page.textContent('.b-hero');
  check('B1 le plan annonce révision, notion fragile et leçon', /1 révision/.test(plan) && /1 notion fragile/.test(plan) && /Virtualisation/.test(plan), plan.replace(/\s+/g, ' ').slice(0, 140));
  check('B2 les missions proposent la prochaine leçon', /Virtualisation/.test(await page.textContent('.missions').catch(() => '')));
  await page.click('.b-hero [data-act=session-start]');
  await page.waitForSelector('#paneBody .study-card, #paneBody #studyCard', { timeout: 5000 }).catch(() => {}); await settle(400);
  const q = await page.evaluate(() => location.hash);
  const first = await page.textContent('#paneBody').catch(() => '');
  check('B3 « Commencer » ouvre la révision, en commençant par la notion échue', q === '#/reviser' && /Masque/.test(first), q + ' ' + first.replace(/\s+/g, ' ').slice(0, 90));

  // Répondre aux cartes (Entrée pour voir la réponse, 3 = Bien) jusqu'à la fin de la session
  for (let k = 0; k < 6 && !(await page.$('.summary')); k++) {
    await page.click('#paneBody'); await page.keyboard.press('Escape');
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('Enter'); await settle(400); await page.keyboard.press('3'); await settle(500);
  }
  const sum = await page.textContent('.summary').catch(() => '');
  check('B4 la fin de session propose la leçon suivante', /Leçon : Virtualisation/.test(sum), sum.replace(/\s+/g, ' ').slice(0, 120));
  const hist = await page.evaluate(() => (JSON.parse(localStorage.getItem('arbor:v1')).stats.sessions || [])[0]);
  check('B5 la session est enregistrée dans l’historique', !!hist && hist.kind === 'review' && hist.n >= 2, JSON.stringify(hist));
  await page.click('[data-act=lesson-next]'); await settle(700);
  check('B6 « Continuer » lance la leçon du module', /Virtualisation/.test(await page.textContent('.lesson').catch(() => '')));
  await page.click('.ls-close'); await settle(500);

  /* C. Mes cours et Ma progression */
  await page.click('.bottom-nav a[href="#/cours"]'); await settle(900);
  check('C1 Mes cours liste le sujet avec sa barre d’états', /TSSR/.test(await page.textContent('#app')) && !!(await page.$('.courses-page .state-bar')));
  await page.click('.bottom-nav a[href="#/progression"]'); await settle(900);
  const prog = await page.textContent('#app');
  check('C2 Ma progression compte 1 notion maîtrisée sur 8', /1\s*notion maîtrisée\s*sur 8/.test(prog.replace(/\s+/g, ' ')), prog.replace(/\s+/g, ' ').slice(0, 80));
  check('C3 « À retravailler » garde la notion fragile ; l’échue, révisée, en sort', /Routage statique/.test(prog) && !/Masque de sous-réseau[^]*À réviser/.test(prog.split('Les plus solides')[0]));
  check('C4 l’examen et ce qu’il reste à voir sont affichés', /dans 30 jours/.test(prog));
  check('C5 la navigation marque l’espace courant', (await page.getAttribute('.bottom-nav a[href="#/progression"]', 'aria-current')) === 'page');

  /* D. Anciennes adresses toujours valides */
  for (const h of ['#/reviser', '#/trophees', '#/methode', '#/s/subjaaaaa01/modaaaaaa02/fiche']) { await page.goto(URL0 + h); await settle(500); }
  check('D1 les anciennes adresses s’ouvrent', !!(await page.$('.lesson-card')));
  check('D2 aucune erreur JavaScript', errors.length === 0, errors.join(' | '));

  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
