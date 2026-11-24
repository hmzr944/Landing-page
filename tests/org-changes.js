/* Arbor 2 : Business « Changements » (js/org-changes.js), l'onde de changement. DONNÉES SIMULÉES (org-mock).
   Lancer :  node tests/org-changes.js   (Playwright requis) */
const http = require('http'), fs = require('fs'), path = require('path');
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

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const open = async (who, hash, w = 1440, h = 900) => {
    M.state.reset();
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await ctx.addInitScript(...M.init(who));
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.route(`${M.SB}/**`, (route) => route.fulfill(M.handle(route.request())));
    await page.goto(`${URL0}#/org/${M.ORG}${hash}`); await page.waitForTimeout(1500);
    return { ctx, page, errors };
  };

  {
    const { ctx, page, errors } = await open('ana', '');
    check('C01 manager : « Knowledge & Impact » dans la navigation, avec une pastille de décisions à prendre', await page.isVisible('.org-tabs a[href$="/savoir"]') && /\d/.test(await page.textContent('.org-tabs a[href$="/savoir"] .nav-attn').catch(() => '')));
    const action = await page.getAttribute('.b-acts a[href*="/savoir/impact/"]', 'href').catch(() => '');
    check('C02 Cockpit : l’action prioritaire « Décider des changements » mène au Diff & Impact Studio', /\/savoir\/impact\/ch1$/.test(action || ''), action);
    await page.goto(`${URL0}#/org/${M.ORG}/savoir/impact`); await page.waitForTimeout(1500);
    const txt = (await page.textContent('.chg')).replace(/\s+/g, ' ');
    check('C03 onde de changement : règles, compétences touchées, personnes, dans cet ordre', (await page.$$('.cw-col')).length === 3 && /Règles.*Compétences touchées.*Personnes/.test(txt));
    check('C04 le document est nommé, la règle modifiée montre l’avant et le maintenant, avec sa page', /Procédure retours/.test(txt) && /30 jours/.test(await page.textContent('.cw-old')) && /14 jours/.test(txt) && /p\. 2/.test(txt));
    check('C05 compétence touchée et personnes dont la preuve porte sur l’ancienne version', /Conseiller un vélo/.test(txt) && /bob/.test(txt) && /chloe/.test(txt));
    check('C06 état de revalidation par personne : « À revalider » (bob), « Non demandée » (chloe)', /bob ?À revalider/.test(txt) && /chloe ?Non demandée/.test(txt), txt.slice(txt.indexOf('Personnes'), txt.indexOf('Personnes') + 160));
    check('C07 la règle nouvelle et sensible est signalée', /Sensible/.test(txt) && /Stockage des batteries/.test(txt));
    await page.click('[data-dec="it1"][data-v="accepte"]'); await page.waitForTimeout(800);
    check('C08 décision humaine : « Accepter » passe par la base et s’affiche', /Acceptée/.test(await page.textContent('.chg')));
    check('C09 règle sensible non décidée : validation humaine obligatoire, revalidation bloquée', /Validation humaine obligatoire/.test(await page.textContent('.chg')) && await page.isDisabled('#chgAssign'));
    await page.click('[data-dec="it2"][data-v="accepte"]'); await page.waitForTimeout(800);
    check('C09b une fois la règle sensible décidée, l’impact est « confirmé » et la revalidation possible', /Impact confirmé/.test(await page.textContent('.impact-radius')) && !(await page.isDisabled('#chgAssign')));
    await page.click('#chgAssign'); await page.waitForTimeout(600);
    check('C09c « Demander la revalidation » : demande envoyée, bouton désactivé', await page.isDisabled('#chgAssign'));
    check('C09d comparaison mot à mot : « 30 » retiré, « 14 » ajouté', /30/.test(await page.textContent('.diff-col mark.del')) && /14/.test(await page.textContent('.diff-col mark.ins')), String(await page.$$eval('.diff mark', (m) => m.map((x) => x.className + ':' + x.textContent).join(' '))));
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const aligne = await page.evaluate(() => { const c = [...document.querySelectorAll('.cw-col')].map((x) => x.getBoundingClientRect().top); return Math.abs(c[0] - c[2]) < 2; });
    check('C10 ordinateur : trois colonnes côte à côte, sans défilement horizontal', over <= 0 && aligne, `${over} ${aligne}`);
    check('C11 aucune erreur JavaScript', !errors.length, errors.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page } = await open('bob', '/changements');
    const lien = await page.$('.org-tabs a[href$="/savoir"]');
    check('C12 collaborateur : ni lien ni écran de changements', !(await page.$('.chg-wave')) && !lien);
    await ctx.close();
  }
  {
    const { ctx, page } = await open('ana', '/savoir/impact', 390, 844);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('C13 téléphone : les colonnes s’empilent, sans défilement horizontal', over <= 0 && (await page.$$('.cw-col')).length === 3, String(over));
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
