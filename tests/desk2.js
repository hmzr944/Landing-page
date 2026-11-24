/* Arbor Desktop 2 (js/desk2.js) : Cockpit, Blind Spots, Evidence & Governance, Scenario Studio, mode sombre.
   DONNÉES SIMULÉES (tests/fixtures/org-mock.js). Lancer :  node tests/desk2.js   (Playwright requis) */
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
  const open = async (who, hash, opts = {}) => {
    M.state.reset();
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce', acceptDownloads: true, colorScheme: opts.scheme || 'light' });
    await ctx.addInitScript(...M.init(who));
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.route(`${M.SB}/**`, (route) => route.fulfill(M.handle(route.request())));
    await page.goto(`${URL0}#/org/${M.ORG}${hash}`); await page.waitForTimeout(1600);
    return { ctx, page, errors };
  };
  const txt = async (page) => (await page.textContent('#app')).replace(/\s+/g, ' ');

  { // Cockpit
    const { ctx, page, errors } = await open('ana', '');
    const t = await txt(page);
    const titres = await page.$$eval('.dbento .b-card h2', (hs) => hs.map((h) => h.textContent.trim()));
    check('K01 Cockpit : 7 cartes, chacune répond à une question (état, actions, procédures, fausses certitudes, compétences fragiles, équipes, activité)', titres.join('|') === 'État des connaissances|Actions prioritaires|Procédures qui ont évolué|Fausses certitudes|Compétences fragiles|Équipes à surveiller|Activité', titres.join('|'));
    check('K02 chiffres comptés depuis les preuves simulées (6), aucune donnée inventée : équipes absentes annoncées comme telles', /Données réelles · 6 preuves/.test(t) && /Aucune équipe définie/.test(t) && /6\s*réponses sur 14 jours/.test(t));
    check('K03 fausse certitude « indicative » tant que la base est insuffisante', /Indicatif : 2 mesures, conclusion à partir de 5/.test(t));
    check('K04 pastilles d’attention : décisions à prendre (Knowledge & Impact) et revalidations (Evidence & Governance)', /\d/.test(await page.textContent('.org-tabs a[href$="/savoir"] .nav-attn').catch(() => '')) && /1/.test(await page.textContent('.org-tabs a[href$="/preuves"] .nav-attn').catch(() => '')));
    check('K05 typographie : titres en Outfit, texte en Inter, versions et dates en monospace', /Outfit/.test(await page.evaluate(() => getComputedStyle(document.querySelector('.d2-head h1')).fontFamily)) && /Inter/.test(await page.evaluate(() => getComputedStyle(document.body).fontFamily)) && /JetBrains Mono/.test(await page.evaluate(() => getComputedStyle(document.querySelector('.mono')).fontFamily)));
    check('K06 aucune erreur JavaScript', !errors.length, errors.join(' | '));
    await ctx.close();
  }
  { // Blind Spots
    const { ctx, page, errors } = await open('ana', '/angles');
    const t = await txt(page);
    check('B01 matrice à quatre quadrants : maîtrise solide 1, fausse certitude 1', (await page.$$('.quad .q')).length === 4 && /1\s*Maîtrise solide/.test(t) && /1\s*Fausse certitude/.test(t));
    check('B02 fausse certitude listée avec sa base (2 erreurs sûres d’elles, 2 personnes) et sa fiabilité', /Batterie endommagée/.test(t) && /2 erreurs sûres d’elles · 2 personnes/.test(t) && /Récurrente/.test(t));
    check('B03 base insuffisante dite clairement (indicatif)', /Indicatif · 2 mesures sur 5 requises/.test(t));
    await page.click('[data-remed]'); await page.waitForTimeout(500);
    check('B04 « Remédier » demande une mise en situation ciblée aux personnes concernées', await page.isDisabled('[data-remed]'));
    check('B05 aucune erreur JavaScript', !errors.length, errors.join(' | '));
    await ctx.close();
  }
  { // Evidence & Governance
    const { ctx, page, errors } = await open('ana', '/preuves');
    const rows = await page.$$('.tbl tbody tr');
    const t = await txt(page);
    check('E01 dossier de preuves : 6 preuves + 1 revalidation, avec date, personne, règle, activité, résultat, niveau, version, évaluateur', rows.length === 7 && /Date\s*Personne\s*Règle ou compétence\s*Activité\s*Résultat\s*Niveau de preuve\s*Version\s*Évaluateur/.test(t));
    check('E02 niveau de preuve calculé par le moteur (Appliquée 4, Reconnue 2) ; règle sensible signalée', /4\s*Appliquée/.test(t) && /2\s*Reconnue/.test(t) && /sensible/.test(t));
    check('E03 confidentialité affichée : réservé aux responsables, pas un outil de surveillance', /Réservé aux managers et administrateurs/.test(t) && /pas à surveiller/.test(t));
    await page.selectOption('#evOut', 'faux'); await page.waitForTimeout(300);
    check('E04 filtre par résultat : 2 preuves « incorrect »', (await page.$$('.dbento > .b-card:first-child .tbl tbody tr')).length === 2);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#evCsv')]);
    const csv = fs.readFileSync(await dl.path(), 'utf8');
    check('E05 export CSV : en-têtes d’audit et lignes filtrées', /^﻿date,personne,regle,competence,activite,contexte,resultat,niveau,confiance_declaree,version_source,evaluateur/.test(csv) && csv.trim().split('\n').length === 3, csv.split('\n')[0]);
    check('E06 aucune erreur JavaScript', !errors.length, errors.join(' | '));
    await ctx.close();
  }
  { // Collaborateur : aucun accès aux espaces de gouvernance
    const { ctx, page } = await open('bob', '/preuves');
    check('G01 collaborateur : ni « Evidence & Governance » ni « Blind Spots » dans sa navigation, et pas de dossier de preuves', !(await page.$('.org-tabs a[href$="/preuves"]')) && !(await page.$('.org-tabs a[href$="/angles"]')) && !(await page.$('.tbl')));
    await ctx.close();
  }
  { // Mode sombre : variante propre, quand l'utilisateur la choisit
    const { ctx, page } = await open('ana', '', { scheme: 'dark' });
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    check('D01 mode sombre : fond ardoise sombre', bg === 'rgb(14, 19, 17)', bg);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
