/* Accueil Student adaptatif (docs/ux-v51.md, P0) : une seule action principale selon l'état réel de l'apprentissage
   (révisions dues, difficulté durable, reprise, exploration). Les autres fonctions restent accessibles ; les cinq
   portes gardent leur place. Une seule erreur ne suffit pas à déclarer une difficulté. FSRS n'est pas modifié :
   la session lancée est celle d'avant.
   Lancer depuis la racine du dépôt :  node tests/home-adaptive.js   (Playwright requis). */
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
const leaf = (id, title, srs) => ({ id, title, notes: `${title} est une notion du cours, avec un exemple concret.`, explain: '', keyPoints: [`${title} : point clé`], exercises: [], srs, status: 'todo', collapsed: false, children: [] });
// Un cours, une leçon faite : chaque cas ne change que l'état de mémoire des notions
function course(leaves, extra = {}) {
  const m1 = { id: 'modaaaaaa01', title: 'Réseaux', notes: '', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false,
    module: { pretest: '', learned: true, generated: true, sources: [], date: '2026-01-01', lessonDone: { at: now - 2 * D, good: 4, asked: 5 } }, children: leaves };
  const root = { id: 'rootaaaaa01', title: 'TSSR', notes: '', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, children: [m1] };
  return { subjects: [{ id: 'subjaaaaa01', title: 'TSSR', color: '#3451D1', icon: 'code', createdAt: 1, updatedAt: now, program: true, root }],
    settings: { theme: 'light', mascot: false, newPerDay: 0, dailyGoal: 20 }, stats: { days: {}, calib: {} }, trophies: {}, xp: 0, ...extra };
}
const ok = (id, t) => leaf(id, t, { s: 30, d: 4, last: now - 2 * D, due: now + 25 * D, reps: 5, lapses: 0, lastG: 3 });
const CASES = {
  review: course([leaf('ndue0000001', 'Masque de sous-réseau', { s: 3, d: 6, last: now - 5 * D, due: now - D, reps: 2, lapses: 0, lastG: 3 }), ok('nok00000001', 'Adressage IP')]),
  struggle: course([leaf('nhard000001', 'Routage statique', { s: 4, d: 7, last: now - D, due: now + 3 * D, reps: 4, lapses: 2, lastG: 3 }), ok('nok00000001', 'Adressage IP')]),
  oneSlip: course([leaf('nslip000001', 'Passerelle', { s: 2, d: 6, last: now - D / 2, due: now + 2 * D, reps: 3, lapses: 0, lastG: 1 }), ok('nok00000001', 'Adressage IP')]),
  resume: course([ok('nok00000001', 'Adressage IP'), ok('nok00000002', 'DNS')], { lastVisit: { sid: 'subjaaaaa01', nid: 'nok00000002', at: now - 3600e3 } }),
  explore: course([ok('nok00000001', 'Adressage IP'), ok('nok00000002', 'DNS')]),
};

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const errors = [];
  async function open(state, viewport = { width: 390, height: 844 }) {
    const ctx = await browser.newContext({ viewport, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await ctx.addInitScript((d) => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.clear(); localStorage.setItem('arbor:v1', d); localStorage.setItem('arbor:journey', JSON.stringify({ workspace: 'student', done: true })); } }, JSON.stringify(state));
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(URL0); await page.waitForTimeout(1300);
    return { ctx, page };
  }
  const primaries = (page) => page.$$eval('.b-hero .btn.big', (bs) => bs.map((b) => b.textContent.trim()));
  const focus = (page) => page.getAttribute('.home', 'data-focus');
  const shot = async (page, name) => { if (process.env.ARBOR_SHOTS) await page.screenshot({ path: path.join(process.env.ARBOR_SHOTS, `home-${name}.png`) }); };

  /* A. Révisions dues : « Lancer mon défi du jour », la session FSRS d'avant */
  {
    const { ctx, page } = await open(CASES.review);
    const p = await primaries(page);
    await shot(page, 'review');
    check('A1 révisions dues : une seule action principale, « Lancer mon défi du jour »', (await focus(page)) === 'review' && p.length === 1 && /Lancer mon défi du jour/.test(p[0]), p.join(' | '));
    check('A2 le titre dit ce qui attend', /1 révision t’attend/.test(await page.textContent('.b-hero')));
    await page.click('.b-hero .btn.big'); await page.waitForTimeout(900);
    check('A3 le défi lance la session de révision existante, en commençant par la notion échue', /#\/reviser$/.test(page.url()) && /Masque/.test(await page.textContent('#app')), page.url());
    await ctx.close();
  }
  /* B. Difficulté durable : « On reprend ce point ensemble ? » */
  {
    const { ctx, page } = await open(CASES.struggle);
    const p = await primaries(page);
    await shot(page, 'struggle');
    check('B1 deux oublis : « On reprend ce point ensemble ? », la notion est nommée', (await focus(page)) === 'struggle' && /On reprend ce point ensemble/.test(await page.textContent('.b-hero')) && /Routage statique/.test(await page.textContent('.b-hero')) && p.length === 1, p.join(' | '));
    check('B2 l’action ouvre la notion (explication, exemple, exercices, Pousse)', (await page.getAttribute('.b-hero .btn.big', 'href')) === '#/s/subjaaaaa01/nhard000001/fiche');
    check('B3 la notion n’est pas répétée dans les missions', !/Routage statique/.test(await page.textContent('.missions').catch(() => '')));
    await ctx.close();
    const s = await open(CASES.oneSlip);
    check('B4 une seule erreur ne déclenche pas « difficulté » : on continue simplement', (await focus(s.page)) !== 'struggle' && !/On reprend ce point/.test(await s.page.textContent('.b-hero')), await focus(s.page));
    await s.ctx.close();
  }
  /* C. Reprise */
  {
    const { ctx, page } = await open(CASES.resume);
    const p = await primaries(page);
    check('C1 apprentissage en cours, rien d’urgent : « Reprendre mon apprentissage », là où on s’était arrêté', (await focus(page)) === 'resume' && p.length === 1 && /Reprendre mon apprentissage/.test(p[0]) && /DNS/.test(await page.textContent('.b-hero')), p.join(' | '));
    check('C2 pas de doublon « Reprendre » dans les missions', !(await page.$('.missions a[href$="nok00000002/fiche"]')));
    await ctx.close();
  }
  /* D. Exploration, et les portes toujours là */
  {
    const { ctx, page } = await open(CASES.explore);
    const p = await primaries(page);
    await shot(page, 'explore');
    check('D1 tout est à jour : « Explorer mes cours » (la carte) en action principale', (await focus(page)) === 'explore' && p.length === 1 && /Explorer mes cours/.test(p[0]) && /carte$/.test(await page.getAttribute('.b-hero .btn.big', 'href')), p.join(' | '));
    check('D2 en exploration, les cinq portes sont mises en avant', (await page.$$('.st-doors.is-open .door')).length === 5 && /Explorer et créer/.test(await page.textContent('.st-doors h2')));
    await ctx.close();
    const r = await open(CASES.review);
    check('D3 dans les autres états, les cinq portes restent au même endroit, en version compacte', (await r.page.$$('.st-doors.is-compact .door')).length === 5);
    await r.page.click('[data-act="show-doors"]'); await r.page.waitForTimeout(400);
    check('D4 « Choisir autre chose » mène aux autres façons d’apprendre (reprise de contrôle)', await r.page.evaluate(() => document.activeElement && document.activeElement.id === 'stDoorsT'));
    await r.ctx.close();
  }
  /* E. Ordinateur : même logique, sans débordement */
  {
    const { ctx, page } = await open(CASES.struggle, { width: 1366, height: 768 });
    await shot(page, 'desktop');
    check('E1 ordinateur : même état, même action, aucun débordement', (await focus(page)) === 'struggle' && (await primaries(page)).length === 1 && !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
    await ctx.close();
  }
  check('Z aucune erreur JavaScript', !errors.length, errors.join(' | '));
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
