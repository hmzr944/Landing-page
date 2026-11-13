/* Formulaire de retour du pilote (js/feedback.js, migration 010) dans le navigateur : ouverture depuis l'espace pro et
   depuis l'espace personnel, une question par écran, brouillon gardé, envoi, échec réseau sans perte, base sans 010,
   personne non connectée, synthèse pour le manager, téléphone, accessibilité clavier, animations réduites.
   Base simulée : tests/fixtures/org-mock.js (les règles d'accès réelles sont testées par tests/db-rls.js, section F).
   Lancer depuis la racine du dépôt :  node tests/feedback.js   (Playwright requis). */
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
const ORG = M.ORG, db = () => M.state.db;

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const errors = [], reqs = [];
  async function as(who, { viewport = { width: 1280, height: 860 }, motion = 'reduce', offline = false } = {}) {
    const ctx = await browser.newContext({ viewport, serviceWorkers: 'block', reducedMotion: motion });
    if (who) await ctx.addInitScript(...M.init(who));
    else await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.clear(); localStorage.setItem('arbor:welcome', '{"how":"guest"}'); } } catch (e) { /* about:blank */ } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${who || 'invité'}: ${e.message}`));
    await page.route(`${M.SB}/**`, (route) => { const r = route.request(); reqs.push({ who, method: r.method(), url: r.url(), body: r.postData() || '' });
      if (offline && r.url().includes('/rest/v1/feedback')) return route.abort('internetdisconnected');
      return route.fulfill(M.handle(r)); });
    return { ctx, page };
  }
  const wait = (page, ms = 500) => page.waitForTimeout(ms);
  const next = async (page) => { await page.click('.fb [data-fb="next"]'); await wait(page, 250); };
  const title = (page) => page.textContent('.fb-stage h2');

  /* A. Collaborateur, espace pro : parcours complet */
  M.state.reset();
  {
    const { ctx, page } = await as('bob', { viewport: { width: 390, height: 844 } });
    await page.goto(`${URL0}#/org/${ORG}`); await wait(page, 1300);
    await page.click('.fb-card'); await wait(page, 500);
    const dlg = await page.$('.fb[role="dialog"][aria-modal="true"]');
    check('A1 « Donner mon avis » ouvre un dialogue accessible, avec la pousse de progression', !!dlg && /Ton avis fait grandir Arbor/.test(await title(page)) && !!(await page.$('.fb-sprout')));
    check('A2 il dit qui lira la réponse (les responsables de l’organisation)', /responsables de Magasin de Lyon/.test(await page.textContent('.fb-stage')));
    const sheet = await page.evaluate(() => { const r = document.querySelector('.fb').getBoundingClientRect(); return { bottom: Math.round(innerHeight - r.bottom), w: Math.round(r.width), vw: innerWidth, over: document.documentElement.scrollWidth > innerWidth + 1 }; });
    check('A3 téléphone : feuille ancrée en bas, pleine largeur, aucun débordement', sheet.bottom <= 1 && sheet.w === sheet.vw && !sheet.over, JSON.stringify(sheet));
    await page.selectOption('#fbStep', 'Étape 6 du pilote'); await next(page);
    check('A4 une question par écran (question 1)', /bloqué ou semblé confus/.test(await title(page)));
    await page.fill('#fbBlocked', 'Je ne trouvais pas le bouton pour terminer la simulation.');
    await page.click('.fb [data-fb="close"], .fb-close'); await wait(page, 400);
    check('A5 fermer garde le brouillon sur l’appareil', !(await page.$('.fb')) && /terminer la simulation/.test(await page.evaluate(() => JSON.stringify(localStorage))));
    await page.click('.fb-card'); await wait(page, 500);
    check('A6 en rouvrant, on reprend à la même question avec la saisie', /bloqué/.test(await title(page)) && /terminer la simulation/.test(await page.inputValue('#fbBlocked')));
    await next(page);
    await page.click('.fb-scale .fb-pill:nth-child(4)'); await page.fill('#fbLearned', 'Le délai de retour est de 30 jours.');
    check('A7 question 2 : échelle de 1 à 5 avec libellés, réponse libre', /apprendre quelque chose/.test(await title(page)) && (await page.$$('.fb-scale .fb-pill')).length === 5);
    await next(page);
    await page.click('.fb-choices .fb-choice:nth-child(2)'); await page.fill('#fbWhy', 'Si mon responsable me le propose.'); await page.click('.fb-scale .fb-pill:nth-child(5)');
    const p3 = await page.evaluate(() => getComputedStyle(document.querySelector('.fb')).getPropertyValue('--p').trim());
    check('A8 question 3 : oui / peut-être / non, facilité ; la pousse a avancé', /sans qu’on te le demande/.test(await title(page)) && Number(p3) > 0.7, p3);
    await next(page);
    const recap = await page.textContent('.fb-recap');
    check('A9 récapitulatif fidèle avant l’envoi', /Étape 6 du pilote/.test(recap) && /terminer la simulation/.test(recap) && /4\/5/.test(recap) && /Peut-être/.test(recap) && /5\/5/.test(recap));
    await page.click('.fb [data-fb="send"]'); await page.click('.fb [data-fb="send"]').catch(() => {}); await wait(page, 700);
    const row = db().feedback[0] || {};
    check('A10 envoyé une seule fois, rattaché à l’organisation, sans identifiant fourni par le navigateur', db().feedback.length === 1 && row.space === 'business' && row.org_id === ORG && row.learned_score === 4 && row.would_use === 'peut_etre' && row.ease === 5 && row.pilot_step === 'Étape 6 du pilote' && !reqs.some((r) => /feedback/.test(r.url) && /user_id/.test(r.body)), JSON.stringify(row));
    check('A11 confirmation avec Pousse, brouillon effacé', /Merci, c’est envoyé/.test(await title(page)) && !/terminer la simulation/.test(await page.evaluate(() => JSON.stringify(localStorage))));
    const sent = JSON.stringify(reqs.filter((r) => r.who === 'bob').map((r) => r.body));
    check('A12 rien de l’espace personnel n’est envoyé', !/Mon cours perso confidentiel|secret personnel/.test(sent));
    if (process.env.ARBOR_SHOTS) await page.screenshot({ path: path.join(process.env.ARBOR_SHOTS, 'fb-merci-mobile.png') });
    await ctx.close();
  }

  /* B. Échec réseau : rien n'est perdu ; base sans 010 : réponses copiables */
  {
    const { ctx, page } = await as('chloe', { offline: true });
    await page.goto(`${URL0}#/org/${ORG}`); await wait(page, 1300);
    await page.click('[data-org-feedback]'); await wait(page, 400);
    await next(page); await page.fill('#fbBlocked', 'Le diagnostic était trop long.'); await next(page); await next(page); await next(page);
    await page.click('.fb [data-fb="send"]'); await wait(page, 700);
    check('B1 hors ligne : message clair, on reste sur le récapitulatif, le brouillon est gardé', /Pas de connexion/.test(await page.textContent('#fbErr')) && /Prêt à envoyer/.test(await title(page)) && /diagnostic était trop long/.test(await page.evaluate(() => JSON.stringify(localStorage))));
    check('B2 et l’on peut copier ses réponses', !!(await page.$('.fb [data-fb="copy"]')) && !(await page.isDisabled('.fb [data-fb="send"]')));
    // même appareil, base sans la migration 010 : le retour reste affiché pour être copié ou téléchargé
    M.state.db.no010 = true;
    await page.unroute(`${M.SB}/**`);
    await page.route(`${M.SB}/**`, (route) => route.fulfill(M.handle(route.request())));
    await page.click('.fb [data-fb="send"]'); await wait(page, 600);
    check('B3 base sans la migration 010 : le retour n’est pas perdu, il est affiché pour être copié ou téléchargé', /pas perdu/.test(await title(page)) && /diagnostic était trop long/.test(await page.textContent('.fb-copy')) && !!(await page.$('[data-fb="dl"]')));
    check('B4 et le brouillon reste sur l’appareil', /diagnostic était trop long/.test(await page.evaluate(() => JSON.stringify(localStorage))));
    M.state.db.no010 = false;
    await ctx.close();
  }

  /* C. Espace personnel, sans compte : le retour reste sur l'appareil */
  {
    const { ctx, page } = await as(null);
    await page.goto(URL0); await wait(page, 1200);
    await page.click('#settingsBtn'); await wait(page, 400);
    await page.click('#fbOpen'); await wait(page, 500);
    check('C1 Réglages, « Donner mon avis sur Arbor » : lu par l’équipe Arbor seulement, aucun cours envoyé', /équipe Arbor seulement/.test(await page.textContent('.fb-stage')));
    await next(page); await page.fill('#fbBlocked', 'Je veux importer un Word.'); await next(page); await next(page); await next(page);
    const before = reqs.length;
    await page.click('.fb [data-fb="send"]'); await wait(page, 500);
    check('C2 sans compte : rien n’est envoyé, les réponses sont proposées à copier', /pas perdu/.test(await title(page)) && /Connecte-toi/.test(await page.textContent('.fb-stage')) && reqs.length === before);
    // clavier : Échap ferme, le focus reste dans le dialogue
    await page.keyboard.press('Escape'); await wait(page, 400);
    check('C3 Échap ferme le dialogue', !(await page.$('.fb')));
    await page.click('#settingsBtn'); await wait(page, 300); await page.click('#fbOpen'); await wait(page, 400);
    for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
    check('C4 le focus clavier reste dans le dialogue', await page.evaluate(() => !!document.activeElement.closest('.fb')));
    await ctx.close();
  }

  /* D. Manager : synthèse des retours dans Intelligence */
  {
    const { ctx, page } = await as('eve');
    await page.goto(`${URL0}#/org/${ORG}/intelligence`); await wait(page, 1500);
    const t = await page.textContent('#fbkBox');
    check('D1 synthèse réelle : nombre de retours, moyennes avec leur nombre de réponses, textes', /1 retour/.test(t) && /4,0\/5/.test(t) && /\(1 réponse\)/.test(t) && /terminer la simulation/.test(t) && /bob@magasin\.fr/.test(t), t.replace(/\s+/g, ' ').slice(0, 200));
    await page.goto(`${URL0}#/org/${ORG}`); await wait(page, 1200);
    const sbar = await page.$('.org-side-foot [data-org-feedback]');
    check('D2 ordinateur : « Donner mon avis » dans la barre latérale', !!sbar && await sbar.isVisible());
    await ctx.close();
  }

  /* E. Animations : présentes normalement, coupées si l'utilisateur les réduit */
  {
    const { ctx, page } = await as('bob', { motion: 'no-preference' });
    await page.goto(`${URL0}#/org/${ORG}`); await wait(page, 1300);
    await page.click('.fb-card'); await wait(page, 100);
    await next(page);
    const anim = await page.evaluate(() => getComputedStyle(document.querySelector('.fb-stage')).animationName);
    check('E1 transition d’une question à l’autre (glissement)', /fbIn/.test(anim), anim);
    await ctx.close();
    const r = await as('bob', { motion: 'reduce' });
    await r.page.goto(`${URL0}#/org/${ORG}`); await wait(r.page, 1300);
    await r.page.click('.fb-card'); await wait(r.page, 100); await next(r.page);
    const none = await r.page.evaluate(() => getComputedStyle(document.querySelector('.fb-stage')).animationName);
    check('E2 animations réduites : aucune animation', none === 'none', none);
    await r.ctx.close();
  }

  check('Z aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
