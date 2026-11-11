/* Experience Architecture (js/org-shell.js, js/org-sandbox.js) : navigation selon le rôle, routes directes protégées,
   vue d'ensemble calculée, Intelligence (matrice confiance × compétence, revalidations, hors référentiel), cinq portes
   d'entrée Business, mise en page ordinateur / tablette / téléphone, et isolation de l'aperçu collaborateur.
   Base et serveur simulés (tests/fixtures/org-mock.js) ; la logique réelle est testée par Deno et tests/db-rls.js.
   Lancer depuis la racine du dépôt :  node tests/org-shell.js   (Playwright requis). */
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

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const errors = [];
  const reqs = [];
  async function as(who, viewport = { width: 1280, height: 860 }) {
    const ctx = await browser.newContext({ viewport, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await ctx.addInitScript(...M.init(who));
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${who}: ${e.message}`));
    page.on('dialog', (dg) => dg.accept());
    await page.route(`${M.SB}/**`, (route) => { const r = route.request(); reqs.push({ who, method: r.method(), url: r.url(), body: r.postData() || '' }); return route.fulfill(M.handle(r)); });
    return { ctx, page };
  }
  const wait = (page, ms = 800) => page.waitForTimeout(ms);
  const go = async (page, hash, ms = 1100) => { await page.evaluate((h) => { location.hash = h; }, hash); await wait(page, ms); };
  const navHrefs = (page) => page.$$eval('.org-tabs a', (as) => as.map((a) => a.getAttribute('href').split('/').slice(3).join('/') || 'accueil'));
  const text = (page) => page.textContent('#app');
  const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);

  /* A. Navigation selon le rôle et routes directes */
  {
    const expect = { ana: ['accueil', 'suivi', 'intelligence', 'documents', 'competences', 'scenarios', 'apprendre', 'resultats', 'equipe', 'apercu', 'parametres'],
      eve: ['accueil', 'suivi', 'intelligence', 'documents', 'competences', 'scenarios', 'apprendre', 'resultats', 'equipe', 'apercu'],
      paul: ['accueil', 'documents', 'apprendre', 'resultats'], bob: ['accueil', 'apprendre', 'resultats'] };
    for (const who of Object.keys(expect)) {
      const { ctx, page } = await as(who);
      await page.goto(`${URL0}#/org/${ORG}`); await wait(page, 1200);
      const got = await navHrefs(page);
      check(`A1 ${M.U[who].role} : la navigation montre exactement ses écrans`, got.join() === expect[who].join(), got.join());
      await ctx.close();
    }
    const { ctx, page } = await as('bob');
    const r0 = reqs.length;
    await page.goto(`${URL0}#/org/${ORG}/intelligence`); await wait(page, 1000);
    const t1 = await text(page);
    await go(page, `#/org/${ORG}/apercu`); const t2 = await text(page);
    await go(page, `#/org/${ORG}/parametres`); const t3 = await text(page);
    check('A2 route directe : un collaborateur n’ouvre ni Intelligence, ni l’aperçu, ni les paramètres', /réservé aux managers/.test(t1) && /réservé aux managers/.test(t2) && /réservé aux administrateurs/.test(t3));
    check('A3 et aucune donnée d’équipe n’a été demandée pour ces écrans', !reqs.slice(r0).some((r) => /evidence_events|skill_revalidations|out_of_scope_knowledge|memberships\?/.test(r.url)), reqs.slice(r0).map((r) => r.url.split('/rest/v1/')[1] || '').join(' '));
    await ctx.close();
    const m = await as('eve');
    await m.page.goto(`${URL0}#/org/${ORG}/parametres`); await wait(m.page, 1000);
    check('A4 un manager n’ouvre pas les paramètres (administrateur)', /réservé aux administrateurs/.test(await text(m.page)));
    await m.ctx.close();
  }

  /* B. Vue d'ensemble (manager) et mise en page ordinateur */
  {
    const { ctx, page } = await as('eve');
    await page.goto(`${URL0}#/org/${ORG}`); await wait(page, 1400);
    const t = await text(page);
    check('B1 indicateurs calculés avec leur base (compétences, fragilités, revalidations, procédures, activité, fausses certitudes)',
      /compétences acquises/.test(t) && /fragilité collective/.test(t) && /à revalider/.test(t) && /procédure/.test(t) && /observations cette semaine/.test(t) && /fausses certitudes/.test(t) && (await page.$$('.ov-metric small')).length === 6);
    check('B2 sans assez de mesures, la confiance est dite « non mesurée » au lieu d’un chiffre inventé', /confiance non mesurée/.test(t));
    const acts = await page.$$eval('.ov-list b', (bs) => bs.map((b) => b.textContent));
    check('B3 actions prioritaires réelles : revalidation en attente, angle mort, connaissance de terrain', acts.some((a) => /revalidation/.test(a)) && acts.some((a) => /Batterie endommagée/.test(a)) && acts.some((a) => /hors référentiel/.test(a)), acts.join(' | '));
    check('B4 accès directs conservés (suivi, diagnostic, client mystère, parcours)', !!(await page.$('a.org-card[href$="/suivi"]')) && !!(await page.$('a.org-card[href$="/mystere"]')) && !!(await page.$('a.org-card[href$="/diagnostic"]')));
    const box = await page.evaluate(() => { const h = document.querySelector('.org-head').getBoundingClientRect(), s = document.querySelector('#app > .sec').getBoundingClientRect(); return { pos: getComputedStyle(document.querySelector('.org-head')).position, hr: h.right, sl: s.left, dir: getComputedStyle(document.querySelector('.org-tabs')).flexDirection }; });
    check('B5 ordinateur : barre latérale fixe à gauche, le contenu commence après elle', box.pos === 'fixed' && box.dir === 'column' && box.hr <= box.sl, JSON.stringify(box));
    if (process.env.ARBOR_SHOTS) await page.screenshot({ path: path.join(process.env.ARBOR_SHOTS, 'xp-overview.png'), fullPage: true });
    await page.click('[data-org-space]'); await wait(page, 500);
    check('B6 « Changer d’espace » ouvre le choix des espaces', /Mes espaces/.test(await page.textContent('#modal')));
    await ctx.close();
  }

  /* C. Intelligence */
  {
    const { ctx, page } = await as('eve');
    await page.goto(`${URL0}#/org/${ORG}/intelligence`); await wait(page, 1500);
    const t = await text(page);
    const cells = await page.$$eval('.mx-cell', (cs) => Object.fromEntries(cs.map((c) => [c.querySelector('span').textContent, c.querySelector('b').textContent])));
    check('C1 matrice : quatre cases distinctes, comptées sur la confiance déclarée', cells['Maîtrise solide'] === '1' && cells['Fausse certitude'] === '1' && cells['Lacune reconnue'] === '0' && cells['Compétence sous-estimée'] === '0', JSON.stringify(cells));
    check('C2 réponses sans confiance déclarée : « non mesurée », pas de conclusion d’équipe sous 5 mesures', /confiance non mesurée pour 2 réponses/.test(t) && /Pas de conclusion d’équipe sous 5 mesures/.test(t));
    check('C3 vue d’équipe sans nom dans la matrice', !/bob@|chloe@/.test(await page.textContent('#mxBox')));
    check('C4 radar, parcours d’intégration, procédures, revalidations et hors référentiel réunis', /Radar des angles morts/.test(t) && /Parcours d’intégration/.test(t) && /Procédures modifiées/.test(t) && /Revalidations ciblées/.test(t) && /hors référentiel/.test(t));
    check('C5 parcours : chaque personne, ses compétences et l’action recommandée', /bob@magasin\.fr/.test(await page.textContent('#loopBox')) && /à revalider/.test(await page.textContent('#loopBox')));
    await page.click('[data-oos="oo1"][data-s="a_documenter"]'); await wait(page, 500);
    check('C6 une connaissance de terrain est marquée « à documenter » par l’équipe', db().oos[0].status === 'a_documenter');
    await page.click('[data-cancel="rv1"]'); await wait(page, 500);
    check('C7 une revalidation peut être annulée par le manager (après confirmation)', db().revals[0].status === 'annulee');
    if (process.env.ARBOR_SHOTS) await page.screenshot({ path: path.join(process.env.ARBOR_SHOTS, 'xp-intelligence.png'), fullPage: true });
    await ctx.close();
  }

  /* D. Collaborateur : vue d'ensemble, cinq portes, mon parcours */
  M.state.reset();
  {
    const { ctx, page } = await as('bob', { width: 390, height: 844 });
    await page.goto(`${URL0}#/org/${ORG}`); await wait(page, 1300);
    const t = await text(page);
    check('D1 le collaborateur voit sa revalidation, son plan et les cinq portes', /compétence à revalider/.test(t) && /14 jours/.test(t) && (await page.$$('.doors .door')).length === 5);
    const pos = await page.evaluate(() => getComputedStyle(document.querySelector('.org-head')).position);
    check('D2 téléphone : pas de barre latérale, onglets en haut, aucun débordement', pos !== 'fixed' && !(await overflow(page)));
    const before = reqs.length;
    await go(page, `#/org/${ORG}/apprendre/conversation`, 1300);
    const first = JSON.parse(reqs.slice(before).find((r) => r.url.endsWith('/functions/v1/tutor')).body);
    check('D3 discuter avec Pousse : sur une connaissance VALIDÉE de l’organisation, extrait cité', first.mode === 'socratique' && M.K.some((k) => JSON.stringify(first.passages).includes(k.quote)) && /Que sais-tu/.test(await page.textContent('#tkFeed')));
    await page.fill('#tkText', 'Il faut le ticket de caisse.'); await page.click('#tkSend'); await wait(page, 700);
    check('D4 la réponse part avec l’historique ; la citation s’affiche', /tk-cite/.test(await page.innerHTML('#tkFeed')));
    await go(page, `#/org/${ORG}/apprendre/dicter`, 1000);
    await page.fill('#tkText', 'Pour un retour il faut le ticket.'); await page.click('#tkSend'); await wait(page, 700);
    const fb = await page.textContent('#tkFeed');
    check('D5 dire ce que je sais : comparaison avec la fiche (juste / à compléter), présentée comme une déclaration', /Juste/.test(fb) && /À compléter/.test(fb) && /ne compte pas comme preuve/.test(await text(page)));
    await go(page, `#/org/${ORG}/apprendre/photo`, 1000);
    await page.fill('#phTxt', 'AFFICHE : le client dispose de 30 jours pour un retour avec le ticket de caisse');
    await page.click('#phGo'); await wait(page, 300);
    check('D6 photo : le texte lu est rapproché de la bonne connaissance validée', /Délai de retour/.test(await page.textContent('#phOut')));
    await page.fill('#phTxt', 'Horaires de la cafétéria du personnel'); await page.click('#phGo'); await wait(page, 300);
    check('D7 photo sans correspondance : on le dit, sans inventer', /Aucune connaissance validée ne correspond/.test(await page.textContent('#phOut')));
    await go(page, `#/org/${ORG}/apprendre/epreuve`, 1000);
    check('D8 épreuve initiale : diagnostic et situation simulée, scénario publié proposé', !!(await page.$(`a[href="#/org/${ORG}/diagnostic"]`)) && !!(await page.$(`a[href="#/org/${ORG}/mystere"]`)));
    await go(page, `#/org/${ORG}/apprendre/importer`, 800);
    check('D9 importer : expliqué au collaborateur (réservé à l’équipe de contenu), sans lien vers un écran interdit', /équipe de contenu/.test(await text(page)) && !(await page.$(`#app a[href="#/org/${ORG}/documents"]`)));
    const writes = reqs.slice(before).filter((r) => r.method !== 'GET' && !r.url.endsWith('/functions/v1/tutor'));
    check('D10 les portes n’écrivent aucune preuve depuis le navigateur', writes.length === 0, writes.map((w) => w.url).join(' '));
    await go(page, `#/org/${ORG}/resultats`, 1500);
    const r = await text(page);
    check('D11 mon parcours : compétence « à revalider » avec la raison, et ma matrice de confiance', /À revalider : la règle a changé/.test(r) && /maintenant « 14 jours »/.test(r) && /Ma confiance et mes réponses/.test(r));
    if (process.env.ARBOR_SHOTS) await page.screenshot({ path: path.join(process.env.ARBOR_SHOTS, 'xp-member-mobile.png'), fullPage: true });
    await ctx.close();
  }

  /* E. Aperçu collaborateur : isolé */
  M.state.reset();
  {
    const { ctx, page } = await as('eve');
    const snap = JSON.stringify({ e: db().evidence, a: db().actions, r: db().revals, o: db().oos });
    await page.goto(`${URL0}#/org/${ORG}/apercu`); await wait(page, 1300);
    const start = reqs.length;
    check('E1 bandeau de simulation et distinction visuelle explicites', /Aperçu collaborateur : simulation/.test(await text(page)) && await page.evaluate(() => document.documentElement.classList.contains('in-sandbox')));
    check('E2 l’aperçu s’appuie sur les compétences validées de l’organisation, en lecture seule', /en lecture seule/.test(await text(page)) && (await page.$$eval('#sbxSkill option', (o) => o.map((x) => x.textContent))).includes('Conseiller un vélo'));
    await page.click('.sbx-persona:nth-child(2)'); await page.selectOption('#sbxSkill', 'sk1'); await page.click('#sbxGo'); await wait(page, 900);
    check('E3 parcours du profil fictif (Karim) : plan expliqué et niveaux de preuve', /Le parcours de Karim/.test(await text(page)) && (await page.$$('.pw-skills > li')).length >= 1);
    await page.click(`a[href="#/org/${ORG}/apercu/diagnostic"]`); await wait(page, 800);
    for (let i = 0; i < 3; i++) {
      if (!(await page.$('.dg-opt'))) break;
      await page.click('.dg-opt:nth-child(1)'); await page.click('.conf-pick label:nth-child(2)'); await page.click('#sbxOk'); await wait(page, 200); await page.click('#sbxNext'); await wait(page, 300);
    }
    check('E4 diagnostic fictif corrigé sur l’appareil', /Diagnostic terminé/.test(await text(page)) && /restent fictives/.test(await text(page)));
    await page.click(`a[href="#/org/${ORG}/apercu/scenario"]`); await wait(page, 700);
    await page.fill('#sbxT', 'Le client dispose de 30 jours pour un retour avec le ticket.'); await page.click('.sbx .conf-pick label:nth-child(3)'); await page.click('#sbxF .btn'); await wait(page, 300);
    check('E5 situation simulée : l’événement survient', !!(await page.$('.ms-event')));
    await page.fill('#sbxT', 'Je ne sais pas trop.'); await page.click('#sbxF .btn'); await wait(page, 300);
    await page.click('#sbxDeb'); await wait(page, 400);
    const deb = await text(page);
    check('E6 débrief fictif, clairement indiqué, catégories distinctes', /Débrief/.test(deb) && /fictif/.test(deb) && /conforme à la fiche/.test(deb) && /non retrouvée dans la fiche/.test(deb));
    await page.click(`a[href="#/org/${ORG}/apercu/progression"]`); await wait(page, 800);
    const pg = await text(page);
    check('E7 progression simulée par les moteurs réels (avant / après, plan, matrice)', /Progression simulée de Karim/.test(pg) && /Avant/.test(pg) && /Après l’aperçu/.test(pg) && /Confiance et compétence/.test(pg));
    const blocked = await page.evaluate(async (sb) => { try { await fetch(`${sb}/rest/v1/evidence_events`, { method: 'POST', body: '{}' }); return 'parti'; } catch (e) { return e.message; } }, M.SB);
    check('E8 barrière : une écriture vers la base est bloquée pendant l’aperçu', /aucune écriture/.test(blocked), blocked);
    const during = reqs.slice(start);
    check('E9 pendant tout l’aperçu : aucune écriture, aucune tâche serveur, aucun e-mail, aucune invitation', during.every((r) => r.method === 'GET') && !during.some((r) => /functions\/v1|invitation|rpc\//.test(r.url)), during.filter((r) => r.method !== 'GET').map((r) => r.url).join(' '));
    check('E10 données de l’organisation inchangées (preuves, actions, revalidations, signalements)', JSON.stringify({ e: db().evidence, a: db().actions, r: db().revals, o: db().oos }) === snap);
    check('E11 rien de l’aperçu n’est gardé dans le stockage du navigateur', !/sbx-|Karim/.test(await page.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage))));
    check('E12 aucun débordement sur ordinateur', !(await overflow(page)));
    if (process.env.ARBOR_SHOTS) await page.screenshot({ path: path.join(process.env.ARBOR_SHOTS, 'xp-sandbox.png'), fullPage: true });
    await go(page, `#/org/${ORG}`, 1000);
    const after = await page.evaluate(async (sb) => { try { await fetch(`${sb}/rest/v1/rpc/my_organizations`, { method: 'POST', body: '{}' }); return 'ok'; } catch (e) { return e.message; } }, M.SB);
    check('E13 en quittant l’aperçu, la barrière est levée et le bandeau disparaît', after === 'ok' && !(await page.evaluate(() => document.documentElement.classList.contains('in-sandbox'))));
    await ctx.close();
  }

  /* F. Responsive : 4 largeurs, écrans Business principaux */
  {
    const bad = [];
    for (const w of [390, 768, 1024, 1440]) {
      const { ctx, page } = await as('ana', { width: w, height: 900 });
      for (const tab of ['', '/intelligence', '/apprendre', '/apprendre/photo', '/apercu', '/parametres', '/suivi', '/documents']) {
        await page.goto(`${URL0}#/org/${ORG}${tab}`); await wait(page, 900);
        if (await overflow(page)) bad.push(`${w}${tab || '/'}`);
      }
      await ctx.close();
    }
    check('F1 aucun débordement horizontal (390, 768, 1024, 1440 px × 8 écrans)', !bad.length, bad.join(', '));
  }

  const all = reqs.map((r) => `${r.url} ${r.body}`).join('\n');
  check('G1 aucune donnée de l’espace personnel envoyée (cours, notes)', !/Mon cours perso confidentiel|secret personnel|persosub001/.test(all));
  check('G2 aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
