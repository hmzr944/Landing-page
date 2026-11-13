/* Captures d'écran Arbor Business sur ordinateur (avant / après une refonte), aux résolutions 1366×768, 1440×900 et
   1920×1080, plus un téléphone. DONNÉES SIMULÉES (tests/fixtures/org-mock.js) : ces captures montrent la mise en page,
   jamais des données de production.
   Usage :  ARBOR_SHOTS=/chemin/dossier node tests/desktop-shots.js   (Playwright requis). */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const M = require('./fixtures/org-mock.js');

const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.ARBOR_SHOTS || path.join(require('os').tmpdir(), 'arbor-shots');
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
const ORG = M.ORG;
const PAGES = [
  ['ana', 'cockpit', ''], ['ana', 'equipe', '/equipe'], ['ana', 'savoir', '/savoir'], ['ana', 'developper', '/developper'],
  ['ana', 'entrainer', '/developper/entrainer'], ['ana', 'apprendre', '/apprendre'], ['ana', 'parametres', '/parametres'],
  ['bob', 'membre-accueil', ''], ['bob', 'canopee', '/canopee'],
];
const SIZES = (process.env.ARBOR_SIZES || '1366x768,1440x900,1920x1080').split(',').map((s) => s.split('x').map(Number));

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const errors = [];
  for (const [w, h] of SIZES) {
    for (const [who, name, hash] of PAGES) {
      M.state.reset();
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block', reducedMotion: 'reduce', deviceScaleFactor: 1 });
      await ctx.addInitScript(...M.init(who));
      const page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(`${name}@${w}: ${e.message}`));
      await page.route(`${M.SB}/**`, (route) => route.fulfill(M.handle(route.request())));
      await page.goto(`${URL0}#/org/${ORG}${hash}`); await page.waitForTimeout(1600);
      await page.screenshot({ path: path.join(OUT, `${w}-${name}.png`) });
      await ctx.close();
    }
  }
  // téléphone : le shell ordinateur ne doit pas s'imposer
  for (const [who, name, hash] of [['ana', 'cockpit', ''], ['bob', 'membre-accueil', '']]) {
    M.state.reset();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await ctx.addInitScript(...M.init(who));
    const page = await ctx.newPage();
    await page.route(`${M.SB}/**`, (route) => route.fulfill(M.handle(route.request())));
    await page.goto(`${URL0}#/org/${ORG}${hash}`); await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT, `390-${name}.png`) });
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`captures dans ${OUT}${errors.length ? `\nErreurs : ${errors.join(' | ')}` : ''}`);
})();
