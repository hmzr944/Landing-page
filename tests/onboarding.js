/* Onboarding : premier lancement → promesse, objectifs, profil, cours de démonstration, question, carte du cours.
   Vérifie aussi « Passer », l'absence de trophées pendant l'introduction et le rendu sans débordement sur mobile.
   Lancer depuis la racine du dépôt :  node tests/onboarding.js   (Playwright requis). */
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

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const errors = [];
  const fresh = async (scheme) => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, serviceWorkers: 'block', reducedMotion: 'reduce', colorScheme: scheme || 'light' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(URL0); await page.waitForTimeout(900);
    return { ctx, page };
  };
  const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const next = async (page, sel = '[data-onb="next"]') => { await page.click(`.onb ${sel}`); await page.waitForTimeout(350); };

  /* A. Parcours complet avec le cours de démonstration */
  for (const scheme of ['light', 'dark']) {
    const { ctx, page } = await fresh(scheme);
    const t = `(${scheme})`;
    check(`A1 l'introduction s'ouvre au premier lancement ${t}`, await page.isVisible('.onb'));
    check(`A2 l'écran 1 porte la promesse ${t}`, /oubliés dans un dossier/.test(await page.textContent('.onb')));
    check(`A3 pas de débordement horizontal ${t}`, await noOverflow(page));
    await next(page);
    await page.click('.onb .onb-choice[data-k]:nth-child(1)'); await page.click('.onb .onb-choice[data-k]:nth-child(3)');
    check(`A4 objectifs multi-sélection ${t}`, (await page.$$('.onb .onb-choice[aria-pressed="true"]')).length === 2);
    await next(page);
    await page.selectOption('#onbLevel', { index: 1 });
    await page.fill('#onbSubject', 'Réseaux');
    await next(page);
    check(`A5 trois façons d'ajouter un premier cours ${t}`, (await page.$$('.onb [data-onb="pdf"], .onb [data-onb="manual"], .onb [data-onb="demo"]')).length === 3);
    await next(page, '[data-onb="demo"]'); await page.waitForTimeout(400);
    const txt = await page.textContent('.onb');
    check(`A6 le moment « wow » montre chapitres et notions ${t}`, /chapitre/i.test(txt) && /notion/i.test(txt));
    check(`A7 la navigation et les trophées restent cachés pendant l'introduction ${t}`, !(await page.isVisible('.bottom-nav')));
    await next(page, '[data-onb="quiz"]');
    await page.click('.onb .onb-opt'); await page.waitForTimeout(300);
    check(`A8 la réponse reçoit un retour ${t}`, await page.isVisible('.onb .onb-fb p'));
    await next(page); // progrès
    await next(page); // explorer
    await page.waitForTimeout(500);
    check(`A9 l'introduction est fermée et mène à la carte du cours ${t}`, !(await page.isVisible('.onb')) && /carte/.test(page.url()), page.url());
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('arbor:v1')));
    check(`A10 profil enregistré ${t}`, !!st.profile && st.profile.goals.length === 2 && st.profile.subject === 'Réseaux', JSON.stringify(st.profile));
    check(`A11 un seul cours : la démo réseaux ${t}`, st.subjects.length === 1 && /Passerelle/.test(JSON.stringify(st.subjects[0].root)), st.subjects.map((x) => x.title).join(', '));
    check(`A12 pas de débordement horizontal après l'introduction ${t}`, await noOverflow(page));
    await page.reload(); await page.waitForTimeout(800);
    check(`A13 l'introduction ne revient pas au rechargement ${t}`, !(await page.isVisible('.onb')));
    await ctx.close();
  }

  /* B. Passer dès le premier écran */
  {
    const { ctx, page } = await fresh();
    await page.click('.onb [data-onb="skip"]'); await page.waitForTimeout(500);
    check('B1 « Passer » ferme l\'introduction', !(await page.isVisible('.onb')));
    check('B2 la navigation est de nouveau visible', await page.isVisible('.bottom-nav'));
    await page.reload(); await page.waitForTimeout(800);
    check('B3 elle ne revient pas après un « Passer »', !(await page.isVisible('.onb')));
    await page.click('#settingsBtn'); await page.waitForTimeout(300);
    check('B4 le thème se choisit dans les réglages, plus dans l\'en-tête', await page.isVisible('#theme') && !(await page.$('#themeBtn')));
    await page.click('#onbAgain'); await page.waitForTimeout(500);
    check('B5 « Revoir l\'introduction » la rouvre', await page.isVisible('.onb'));
    await ctx.close();
  }

  check('C1 aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
