/* Arbor League (docs/business-v2.md, phases C à E) côté navigateur : Canopée (rang, arbre, trophées avec leur preuve),
   tableau d'équipe sans aucune fragilité, cordées, mentorat (règles d'éligibilité), saisons et défis collectifs,
   comportement sans la migration 011. Base simulée (tests/fixtures/org-mock.js) : les vraies règles (trophée daté par
   sa preuve, rang qui ne redescend pas, anti-collusion, tableau sans erreurs) sont testées par tests/db-rls.js, section L.
   Lancer depuis la racine du dépôt :  node tests/league.js   (Playwright requis). */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const M = require('./fixtures/org-mock.js');

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
const ORG = M.ORG;
const db = () => M.state.db;
// mots qui trahiraient une fragilité individuelle sur un écran partagé
const FRAGILE = /fausse certitude|à retravailler|erreur de|faux\b|confiance déclarée|réponse fausse/i;

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const errors = [];
  async function as(who, viewport = { width: 1280, height: 860 }) {
    const ctx = await browser.newContext({ viewport, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await ctx.addInitScript(...M.init(who));
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${who}: ${e.message}`));
    page.on('dialog', (dg) => dg.accept());
    await page.route(`${M.SB}/**`, (route) => route.fulfill(M.handle(route.request())));
    return { ctx, page };
  }
  const wait = (page, ms = 900) => page.waitForTimeout(ms);
  const go = async (page, hash, ms = 1200) => { await page.evaluate((h) => { location.hash = h; }, hash); await wait(page, ms); };
  const text = (page) => page.textContent('#app');

  /* A. Canopée d'un collaborateur */
  M.state.reset();
  {
    const { ctx, page } = await as('bob', { width: 390, height: 844 });
    await page.goto(`${URL0}#/org/${ORG}/canopee`); await wait(page, 1300);
    const t = await text(page);
    check('A1 la Canopée montre le rang, l’arbre et ce qui manque pour le rang suivant', /Pousse/.test(await page.textContent('.lg-hero')) && !!(await page.$('.lg-hero-tree svg')) && /Vers Arbuste/.test(t));
    const got = await page.$$('.lg-trophies li.got'), locked = await page.$$('.lg-trophies li.locked');
    check('A2 seuls les trophées obtenus sont dorés ; les autres disent leur règle', got.length === 1 && locked.length >= 5 && /Première pousse/.test(await got[0].textContent()));
    await page.click('.lg-trophies li.got details summary'); await wait(page, 200);
    check('A3 chaque trophée obtenu montre sa preuve (activité, contexte, date)', /Preuve/.test(await page.textContent('.lg-trophies li.got details')) && /simulation:client/.test(await page.textContent('.lg-trophies li.got details')));
    check('A4 l’arbre explique qu’il ne grandit qu’avec des preuves', /ne grandit qu’avec des preuves/.test(t));
    const boardTxt = await page.textContent('.lg-board');
    check('A5 tableau d’équipe : rangs et trophées, aucune fragilité individuelle', /bob/.test(boardTxt) && /chloe/.test(boardTxt) && !FRAGILE.test(boardTxt) && /Les erreurs et les résultats détaillés restent privés/.test(t));
    check('A6 la Canopée n’affiche ni erreur, ni confiance, ni score de personne', !FRAGILE.test(t) && !/%/.test(boardTxt));
    check('A7 téléphone : aucun débordement horizontal', !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
    await ctx.close();
  }

  /* B. Mon équipe (manager) : cordées et mentorat */
  {
    const { ctx, page } = await as('eve');
    await page.goto(`${URL0}#/org/${ORG}/equipe`); await wait(page, 1500);
    const t = await text(page);
    check('B1 Mon équipe : chaque personne avec son rang et ses trophées', /Mon équipe/.test(t) && /Pousse/.test(t) && !!(await page.$('#lgCordNew')));
    await page.click('#lgCordNew'); await wait(page, 200);
    await page.fill('#lgCName', 'Équipe du matin'); await page.selectOption('#lgCKind', 'equipe');
    await page.check('#lgCordForm input[value="u-bob"]'); await page.check('#lgCordForm input[value="u-chloe"]');
    await page.click('#lgCordForm .btn'); await wait(page, 900);
    const c = db().cordees[0] || {};
    check('B2 une cordée est créée avec ses membres et apparaît dans la liste', c.name === 'Équipe du matin' && c.member_ids.join() === 'u-bob,u-chloe' && /Équipe du matin/.test(await text(page)) && /2 membres/.test(await text(page)));
    // mentorat : même personne
    await page.selectOption('#lgMMentor', 'u-bob'); await page.selectOption('#lgMMentee', 'u-bob'); await page.click('#lgMentForm .btn'); await wait(page, 500);
    check('B3 mentorat : une personne ne peut pas s’accompagner elle-même', /deux personnes différentes/.test(await page.textContent('#lgMMsg')) && db().mentorships.length === 0);
    // mentor sans preuve d'application
    await page.selectOption('#lgMMentor', 'u-eve'); await page.selectOption('#lgMMentee', 'u-bob'); await page.click('#lgMentForm .btn'); await wait(page, 500);
    check('B4 mentorat : le mentor doit avoir lui-même appliqué la connaissance', /doit avoir lui-même appliqué/.test(await page.textContent('#lgMMsg')) && db().mentorships.length === 0);
    await page.selectOption('#lgMMentor', 'u-bob'); await page.selectOption('#lgMMentee', 'u-chloe'); await page.click('#lgMentForm .btn'); await wait(page, 900);
    check('B5 un mentorat valide est lancé et listé', db().mentorships.length === 1 && /bob accompagne chloe/.test(await text(page)));
    check('B6 Mon équipe ne nomme aucune fausse certitude', !/Fausse certitude/.test(await text(page)));
    await ctx.close();
  }

  /* C. Développer > Entraîner : saison et défi collectif */
  {
    const { ctx, page } = await as('eve');
    await page.goto(`${URL0}#/org/${ORG}/developper/entrainer`); await wait(page, 1600);
    check('C1 sans saison : on peut en ouvrir une', !!(await page.$('#lgSeForm')));
    await page.fill('#lgSeN', 'Printemps 2027'); await page.click('#lgSeForm .btn'); await wait(page, 900);
    check('C2 la saison est ouverte, le formulaire de défi apparaît', db().season && db().season.name === 'Printemps 2027' && !!(await page.$('#lgChForm')));
    await page.fill('#lgChT', 'Toute l’équipe maîtrise les retours'); await page.selectOption('#lgChR', '0.8');
    const opts = await page.$$eval('#lgChC option', (os) => os.map((o) => o.textContent));
    check('C3 un défi peut viser toute l’organisation ou une cordée', opts.includes('Toute l’organisation') && opts.includes('Équipe du matin'), opts.join());
    await page.click('#lgChForm .btn'); await wait(page, 900);
    const ch = db().challenges[0] || {};
    check('C4 le défi est lancé sur une connaissance validée, avec la part du groupe à atteindre', ch.title === 'Toute l’équipe maîtrise les retours' && ch.target_ratio === 0.8 && /Toute l’équipe maîtrise les retours/.test(await text(page)));
    await ctx.close();
  }

  /* D. Le collaborateur voit sa cordée et le défi */
  {
    const { ctx, page } = await as('bob', { width: 390, height: 844 });
    await page.goto(`${URL0}#/org/${ORG}/canopee`); await wait(page, 1300);
    const t = await text(page);
    check('D1 sa cordée et le défi de saison apparaissent dans sa Canopée', /Équipe du matin/.test(t) && /Printemps 2027/.test(t) && /Toute l’équipe maîtrise les retours/.test(t));
    await go(page, `#/org/${ORG}/equipe`);
    check('D2 un collaborateur n’ouvre pas Mon équipe (ni cordées ni mentorat)', !(await page.$('#lgCordNew')) && !(await page.$('#lgMentForm')));
    await ctx.close();
  }

  /* E. Sans la migration 011 : rien ne casse, la League attend la mise à jour */
  M.state.reset(); db().no011 = true;
  {
    const { ctx, page } = await as('bob', { width: 390, height: 844 });
    await page.goto(`${URL0}#/org/${ORG}/canopee`); await wait(page, 1200);
    check('E1 Canopée : « disponible après la mise à jour de la base (migration 011) »', /migration 011/.test(await text(page)));
    await go(page, `#/org/${ORG}`);
    check('E2 l’accueil collaborateur fonctionne quand même', /Ta mission|Ta progression|Explorer/.test(await text(page)));
    await ctx.close();
    const m = await as('eve');
    await m.page.goto(`${URL0}#/org/${ORG}`); await wait(m.page, 1500);
    check('E3 le Cockpit fonctionne sans la League', /Cockpit/.test(await text(m.page)) && /compétences acquises/.test(await text(m.page)));
    await go(m.page, `#/org/${ORG}/equipe`, 1500);
    check('E4 Mon équipe : les cordées attendent la migration 011, la liste et les invitations restent', /Les cordées sera disponible|migration 011/.test(await text(m.page)) && !!(await m.page.$('#ivEmail')));
    await m.ctx.close();
  }
  check('F1 aucune erreur JavaScript', !errors.length, errors.join(' | '));

  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
