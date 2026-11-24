/* Arbor Learning 2.0 (js/spaces.js) : huit espaces, arbre de savoir, compagnon sourcé, courbe de mémoire.
   Données fabriquées (reprises de tests/learning-flow.js). Lancer :  node tests/spaces.js   (Playwright requis) */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'tests/learning-flow.js'), 'utf8');
const D = 86400000, now = Date.now(); // eslint-disable-line no-unused-vars
eval(src.slice(src.indexOf('const leaf ='), src.indexOf('(async () =>'))); // définit sample()
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' : ' + extra : ''}`); if (!ok) failed++; };

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await ctx.addInitScript((d) => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.clear(); localStorage.setItem('arbor:v1', d); localStorage.setItem('arbor:onboarded', '1'); } }, JSON.stringify(sample()));
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    const tag = `${w}px`;
    const go = async (hash) => { await page.goto(URL0 + hash); await page.waitForTimeout(700); };
    const t = async () => (await page.textContent('#app')).replace(/\s+/g, ' ');
    await go('#/');
    if (w > 1000) {
      const labels = await page.$$eval('#spNav a', (as) => as.map((a) => a.textContent.trim()));
      check(`S01 ${tag} barre latérale Learning : huit espaces dans l’ordre`, labels.join('|') === 'Mon espace|Explorer|Mon apprentissage|Studio pédagogique|Pratiquer|Ma connaissance|Compagnon Arbor|Progression et mémoire', labels.join('|'));
    } else {
      check(`S01 ${tag} téléphone : la barre latérale ne s’impose pas, la barre du bas reste`, !(await page.isVisible('#spNav a')) && await page.isVisible('.bottom-nav'));
    }
    await go('#/explorer');
    check(`S02 ${tag} Explorer : nouveau sujet, document, démonstration, discussion ; tes domaines`, (await page.$$('.sp-tile')).length === 4 && /TSSR/.test(await t()));
    await go('#/studio');
    check(`S03 ${tag} Studio pédagogique : structure Situation → Maîtrise et trois points de départ`, (await page.$$('.d2-flow li')).length === 6 && (await page.$$('.sp-tile')).length === 3);
    await go('#/pratiquer');
    check(`S04 ${tag} Pratiquer : révisions dues comptées, notions fragiles avec leur raison`, /1\s*carte à retrouver/.test(await t()) && /Routage statique/.test(await t()));
    await go('#/connaissance');
    const leaves = await page.$$('.ktree .kt-leaf');
    check(`S05 ${tag} Ma connaissance : arbre de savoir, une feuille par notion (9), une branche par chapitre (2)`, leaves.length === 9 && (await page.$$('.ktree .kt-ch')).length === 2, String(leaves.length));
    check(`S06 ${tag} la couleur d’une feuille suit l’état réel (maîtrisée, fragile, à découvrir)`, !!(await page.$('.kt-leaf.st-mastered')) && !!(await page.$('.kt-leaf.st-fragile')) && !!(await page.$('.kt-leaf.st-new')));
    await go('#/compagnon/adressage');
    check(`S07 ${tag} Compagnon : réponse sourcée (sujet › notion) depuis les cours`, /TSSR › Adressage IP/.test(await t()));
    await go('#/compagnon/photosynthèse');
    check(`S08 ${tag} Compagnon : sans source, il le dit et n’invente rien`, /Rien dans tes cours ne répond/.test(await t()));
    await go('#/progression');
    check(`S09 ${tag} Progression et mémoire : courbe d’oubli FSRS sur 30 jours, présentée comme une estimation`, !!(await page.$('.mem-curve')) && /Estimation FSRS, pas une certitude/.test(await t()));
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`S10 ${tag} aucun défilement horizontal`, over <= 0, String(over));
    check(`S11 ${tag} aucune erreur JavaScript`, !errors.length, errors.join(' | '));
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
