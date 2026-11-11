/* Motion design : les animations se déclenchent vraiment (cartes qui poussent, feuille au toucher, gerbe sur
   une réussite, modale qui éclôt ou panneau qui monte, pastille qui s'étire, titres mot à mot),
   et tout s'arrête avec « réduire les animations » ou le mode calme. Les cartes ne restent jamais invisibles.
   Lancer depuis la racine du dépôt :  node tests/motion.js   (Playwright requis). */
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
const leaf = (id, t) => ({ id, title: t, notes: `${t} : une notion du cours.`, explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, children: [] });
const state = (calm) => JSON.stringify({ subjects: ['Biologie', 'Réseaux', 'Histoire'].map((t, i) => ({ id: `subj0000000${i}`, title: t, color: '#3451D1', icon: 'code', createdAt: 1, updatedAt: Date.now(), root: { id: `root000000${i}`, title: t, notes: '', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, children: [leaf(`n${i}aaaaaaaa1`, 'Notion A'), leaf(`n${i}aaaaaaaa2`, 'Notion B')] } })),
  settings: { theme: 'light', mascot: true, calm: !!calm }, stats: { days: {}, calib: {} }, trophies: {}, xp: 0, profile: { done: true, how: 'skip', at: 1 } });

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const errors = [];
  async function open({ motion = 'no-preference', calm = false, viewport = { width: 390, height: 844 } } = {}) {
    const ctx = await browser.newContext({ viewport, isMobile: viewport.width < 900, hasTouch: true, serviceWorkers: 'block', reducedMotion: motion });
    await ctx.addInitScript((d) => { try { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.clear(); localStorage.setItem('arbor:v1', d); localStorage.setItem('arbor:welcome', '{"how":"t"}'); } } catch (e) { /* rien */ } }, state(calm));
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${URL0}#/cours`); await page.waitForTimeout(250);
    return { ctx, page };
  }
  const shots = process.env.ARBOR_SHOTS;

  /* A. Animations actives */
  {
    const { ctx, page } = await open();
    const grow = await page.evaluate(() => document.querySelectorAll('.mo-grow').length);
    check('A1 les cartes de cours sont prises en charge par « pousse » à l’arrivée', grow >= 3, `${grow} cartes`);
    if (shots) { await page.waitForTimeout(140); await page.screenshot({ path: path.join(shots, 'motion-sprout.png') }); }
    await page.waitForTimeout(1800);
    const vis = await page.evaluate(() => [...document.querySelectorAll('.subject-card')].every((c) => getComputedStyle(c).opacity === '1'));
    check('A2 après l’animation, toutes les cartes sont pleinement visibles (jamais bloquées invisibles)', vis);
    const box = await page.locator('.subject-card').first().boundingBox();
    await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down();
    const leaves = await page.evaluate(() => document.querySelectorAll('.mo-layer .mo-leaf').length);
    await page.mouse.up();
    check('A3 un appui fait s’envoler une feuille depuis le doigt', leaves >= 1);
    await page.evaluate(() => FX.toast('Bravo', 'success'));
    await page.waitForTimeout(80);
    check('A4 une réussite projette une gerbe de feuilles', await page.evaluate(() => document.querySelectorAll('.mo-burst').length) >= 6);
    await page.waitForTimeout(1300);
    check('A5 les feuilles disparaissent d’elles-mêmes (rien ne s’accumule)', await page.evaluate(() => document.querySelectorAll('.mo-leaf').length) === 0);
    await page.click('#settingsBtn'); await page.waitForTimeout(120);
    check('A6 sur téléphone, la modale monte comme un panneau souple', await page.evaluate(() => document.querySelector('.modal').classList.contains('mo-sheet')));
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    const nav = await page.$('.bottom-nav');
    if (nav) {
      await page.click('.bottom-nav a[href="#/progression"]'); await page.waitForTimeout(60);
      check('A7 la pastille des onglets s’étire pendant qu’elle glisse', await page.evaluate(() => document.querySelector('.bottom-nav').classList.contains('mo-goo')));
    }
    await ctx.close();
  }
  {
    const { ctx, page } = await open({ viewport: { width: 1280, height: 800 } });
    await page.click('#settingsBtn'); await page.waitForTimeout(300);
    const pop = await page.evaluate(() => { const m = document.querySelector('.modal'); return m.classList.contains('mo-pop') && !!m.style.getPropertyValue('--ox'); });
    check('A8 sur ordinateur, la modale éclôt depuis le bouton touché', pop);
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block', reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('https://nnqtgwgwalbbhqzceged.supabase.co/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await page.goto(URL0); await page.waitForTimeout(700);
    const w = await page.evaluate(() => { const h = document.querySelector('.wel-hero h1'); return h ? { n: h.querySelectorAll('.mo-w').length, text: h.textContent, label: h.getAttribute('aria-label') } : null; });
    check('A9 le titre de l’accueil monte mot à mot, sans changer son texte ni ce que lit un lecteur d’écran', !!w && w.n >= 6 && w.text === 'Tout peut devenir un point de départ pour apprendre.' && w.label === w.text, JSON.stringify(w));
    await ctx.close();
  }

  /* B. « Réduire les animations » et mode calme : rien ne bouge */
  for (const [label, opt] of [['réduire les animations', { motion: 'reduce' }], ['mode calme', { calm: true }]]) {
    const { ctx, page } = await open(opt);
    await page.waitForTimeout(200);
    const s = await page.evaluate(() => ({ grow: document.querySelectorAll('.mo-grow').length, op: [...document.querySelectorAll('.subject-card')].every((c) => getComputedStyle(c).opacity === '1') }));
    const box = await page.locator('.subject-card').first().boundingBox();
    await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down();
    const leaves = await page.evaluate(() => document.querySelectorAll('.mo-leaf').length);
    await page.mouse.up();
    check(`B ${label} : aucune animation d’arrivée, aucune feuille, tout est visible immédiatement`, s.grow === 0 && leaves === 0 && s.op, JSON.stringify({ ...s, leaves }));
    await ctx.close();
  }

  check('Z aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} échec(s)` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
