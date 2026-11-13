/* Arbor Business sur ordinateur (D14) : barre latérale ancrée et repliable, sélecteur d'espace unique, barre supérieure
   contextuelle, recherche globale Ctrl/Cmd + K sur les données lisibles par la personne, actions principales, tableau
   d'équipe (recherche, filtres), trois résolutions, téléphone et Student inchangés, contraste, mouvement réduit.
   Base simulée (tests/fixtures/org-mock.js) : les règles d'accès réelles sont testées par tests/db-rls.js.
   Lancer depuis la racine du dépôt :  node tests/org-desktop.js   (Playwright requis). */
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
const lum = (hex) => { const c = hex.match(/\w\w/g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const errors = [];
  const reqs = [];
  async function as(who, viewport = { width: 1366, height: 768 }, motion = 'reduce') {
    const ctx = await browser.newContext({ viewport, serviceWorkers: 'block', reducedMotion: motion });
    await ctx.addInitScript(...M.init(who));
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${who}: ${e.message}`));
    page.on('dialog', (dg) => dg.accept());
    await page.route(`${M.SB}/**`, (route) => { const r = route.request(); reqs.push({ who, url: r.url() }); return route.fulfill(M.handle(r)); });
    return { ctx, page };
  }
  const wait = (page, ms = 900) => page.waitForTimeout(ms);
  const go = async (page, hash, ms = 1300) => { await page.evaluate((h) => { location.hash = h; }, hash); await wait(page, ms); };
  const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);

  /* A. Shell à 1366 × 768 */
  M.state.reset();
  {
    const { ctx, page } = await as('ana');
    await page.goto(`${URL0}#/org/${ORG}`); await wait(page, 1500);
    const side = await page.evaluate(() => { const r = document.querySelector('#app > .org-head').getBoundingClientRect(); const cs = getComputedStyle(document.querySelector('#app > .org-head')); return { x: r.left, y: r.top, w: Math.round(r.width), h: Math.round(r.height), pos: cs.position, bg: cs.backgroundColor, radius: cs.borderTopRightRadius }; });
    check('A1 barre latérale ancrée : collée à gauche, toute la hauteur, 248 px, fond mat, sans arrondi', side.x === 0 && side.y === 0 && side.h === 768 && side.w === 248 && side.pos === 'fixed' && side.bg === 'rgb(15, 26, 23)' && side.radius === '0px', JSON.stringify(side));
    const top = await page.evaluate(() => { const t = document.querySelector('.org-top').getBoundingClientRect(); const c = document.querySelector('.pg-h').getBoundingClientRect(); return { h: Math.round(t.height), left: Math.round(t.left), cl: Math.round(c.left) }; });
    check('A2 barre supérieure compacte (48 à 56 px), à droite de la barre latérale ; le contenu ne passe pas dessous', top.h >= 48 && top.h <= 56 && top.left >= 248 && top.cl >= 248, JSON.stringify(top));
    check('A3 un seul sélecteur d’espace visible (la barre Student et « Changer d’espace » ont disparu)', (await page.isVisible('[data-space-menu]')) && !(await page.isVisible('#spaceBtn')) && !(await page.isVisible('.topbar')) && (await page.$$eval('[data-org-space]', (xs) => xs.filter((x) => x.offsetParent).length)) === 0);
    const navs = await page.$$eval('.org-head .org-tabs a', (as2) => as2.map((a) => a.textContent.trim()));
    check('A4 les cinq rubriques, chacune avec icône et libellé ; Cockpit actif', navs.join('|') === 'Cockpit|Mon équipe|Base de savoir|Développer|Mon apprentissage' && (await page.$$('.org-head .org-tabs a i')).length === 5 && /Cockpit/.test(await page.textContent('.org-tabs a[aria-current]')), navs.join('|'));
    const crumbs = await page.$$eval('.desk-crumbs li', (ls) => ls.map((l) => l.textContent.trim()));
    check('A5 fil d’Ariane contextuel : Arbor Business / organisation / rubrique', crumbs.join(' / ') === 'Arbor Business / Magasin de Lyon / Cockpit', crumbs.join(' / '));
    check('A6 pied de barre : centre d’aide, avis, paramètres, profil compact', (await page.isVisible('[data-desk-help]')) && (await page.isVisible('.org-side-foot [data-org-feedback]')) && (await page.isVisible('[data-desk-set]')) && (await page.isVisible('[data-me-menu]')));
    check('A7 action principale contextuelle du Cockpit : « Inviter »', /Inviter/.test(await page.textContent('.desk-act')));
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    check('A8 palette Arbor sombre appliquée (fond #0B1412)', bg === 'rgb(11, 20, 18)', bg);
    // repli
    await page.click('[data-side-toggle]'); await wait(page, 400);
    const w2 = await page.evaluate(() => Math.round(document.querySelector('#app > .org-head').getBoundingClientRect().width));
    const lblHidden = await page.evaluate(() => { const s = document.querySelector('.org-tabs a span'); return s.getBoundingClientRect().width <= 1; });
    check('A9 repli manuel : 64 px, icônes seules, libellés en infobulle (title) et pour les lecteurs d’écran', w2 === 64 && lblHidden && (await page.getAttribute('.org-tabs a', 'title')) === 'Cockpit' && (await page.getAttribute('[data-side-toggle]', 'aria-pressed')) === 'true', String(w2));
    await page.reload(); await wait(page, 1500);
    const w3 = await page.evaluate(() => Math.round(document.querySelector('#app > .org-head').getBoundingClientRect().width));
    check('A10 la préférence de repli est mémorisée sur l’appareil', w3 === 64, String(w3));
    await page.click('[data-side-toggle]'); await wait(page, 300);
    check('A11 et se déplie à nouveau', (await page.evaluate(() => Math.round(document.querySelector('#app > .org-head').getBoundingClientRect().width))) === 248);

    /* B. Menus d'espace et de profil */
    await page.click('[data-space-menu]'); await wait(page, 200);
    const items = await page.$$eval('.desk-menu [role="menuitem"]', (bs) => bs.map((b) => b.textContent.trim()));
    check('B1 le sélecteur d’espace liste l’espace personnel, l’organisation (cochée), créer et rejoindre', items.some((t) => /Espace personnel/.test(t)) && items.some((t) => /Magasin de Lyon/.test(t)) && items.some((t) => /Créer une organisation/.test(t)) && items.some((t) => /Rejoindre/.test(t)) && !!(await page.$('.desk-menu [aria-current] >> text=Magasin de Lyon')), items.join(' | '));
    check('B2 clavier : le menu prend le focus, Échap le ferme et rend le focus au bouton', await page.evaluate(() => document.activeElement.closest('.desk-menu') !== null));
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Escape'); await wait(page, 150);
    check('B2b', !(await page.$('.desk-menu')) && await page.evaluate(() => document.activeElement.matches('[data-space-menu]')) && (await page.getAttribute('[data-space-menu]', 'aria-expanded')) === 'false');
    await page.click('[data-me-menu]'); await wait(page, 200);
    check('B3 menu du profil : réglages, espace personnel, déconnexion', /Réglages de l’application/.test(await page.textContent('.desk-menu')) && /Se déconnecter/.test(await page.textContent('.desk-menu')));
    await page.mouse.click(700, 400); await wait(page, 150);
    check('B4 un clic ailleurs ferme le menu', !(await page.$('.desk-menu')));
    await page.click('[data-desk-help]'); await wait(page, 400);
    check('B5 centre d’aide : rubriques expliquées et raccourcis clavier', /Raccourcis clavier/.test(await page.textContent('#modal')) && /Base de savoir/.test(await page.textContent('#modal')));
    await page.keyboard.press('Escape'); await wait(page, 300);

    /* C. Recherche globale */
    const r0 = reqs.length;
    await page.keyboard.press('Control+k'); await wait(page, 700);
    check('C1 Ctrl + K ouvre la recherche, le champ a le focus', !!(await page.$('.cmdk')) && await page.evaluate(() => document.activeElement.id === 'cmdkQ'));
    check('C2 sans saisie : pages et actions', /Pages/.test(await page.textContent('.cmdk-list')) && /Actions/.test(await page.textContent('.cmdk-list')));
    await page.fill('#cmdkQ', 'chloe'); await wait(page, 200);
    check('C3 un collaborateur se trouve par son adresse (données réelles de l’organisation)', /Collaborateurs/.test(await page.textContent('.cmdk-list')) && /chloe@magasin\.fr/.test(await page.textContent('.cmdk-list')));
    await page.fill('#cmdkQ', 'batterie'); await wait(page, 200);
    check('C4 une connaissance se trouve, accents et majuscules ignorés', /Connaissances/.test(await page.textContent('.cmdk-list')) && /Batterie endommagée/.test(await page.textContent('.cmdk-list')));
    await page.fill('#cmdkQ', 'procedure'); await wait(page, 200);
    check('C5 un document se trouve', /Documents/.test(await page.textContent('.cmdk-list')) && /Procédure retours/.test(await page.textContent('.cmdk-list')));
    await page.fill('#cmdkQ', 'zzzz introuvable'); await wait(page, 200);
    check('C6 aucun résultat : dit simplement', /Aucun résultat/.test(await page.textContent('.cmdk-list')));
    await page.fill('#cmdkQ', 'chloe'); await wait(page, 150);
    await page.keyboard.press('Enter'); await wait(page, 1300);
    check('C7 Entrée ouvre le résultat (fiche du collaborateur) et ferme la recherche', /\/suivi\/u-chloe$/.test(page.url()) && !(await page.$('.cmdk')), page.url());
    check('C8 la recherche lit la base (membres, documents, connaissances, compétences)', ['memberships', 'sources', 'knowledge_nodes', 'skills'].every((t) => reqs.slice(r0).some((r) => r.url.includes(`/rest/v1/${t}`))));
    await page.click('[data-cmdk]'); await wait(page, 300);
    await page.fill('#cmdkQ', 'inviter'); await wait(page, 150);
    check('C9 les actions aussi : « Inviter un collaborateur »', /Inviter un collaborateur/.test(await page.textContent('.cmdk-list')));
    await page.keyboard.press('Escape'); await wait(page, 200);
    check('C10 Échap ferme la recherche', !(await page.$('.cmdk')));

    /* D. Actions principales */
    await go(page, `#/org/${ORG}`);
    await page.click('.desk-act'); await wait(page, 2200);
    check('D1 « Inviter » (Cockpit) ouvre Mon équipe et place le curseur dans l’adresse à inviter', /\/equipe$/.test(page.url()) && await page.evaluate(() => document.activeElement && document.activeElement.id === 'ivEmail'), page.url());
    await go(page, `#/org/${ORG}/savoir`);
    check('D2 Base de savoir : action « Nouveau document »', /Nouveau document/.test(await page.textContent('.desk-act')));
    await page.click('.desk-act'); await wait(page, 900);
    check('D2b qui place le curseur dans le formulaire d’ajout', await page.evaluate(() => ['dfTitle', 'dfFile'].includes(document.activeElement && document.activeElement.id)));
    await go(page, `#/org/${ORG}/developper`, 1600);
    check('D3 Développer : « Nouveau scénario », et le parcours Diagnostiquer → Comprendre → Entraîner → Mesurer', /Nouveau scénario/.test(await page.textContent('.desk-act')) && (await page.$$eval('.journey a b', (bs) => bs.map((b) => b.textContent).join('>'))) === 'Diagnostiquer>Comprendre>Entraîner>Mesurer');
    await page.click('.desk-act'); await wait(page, 2200);
    check('D3b qui ouvre Entraîner sur le formulaire de scénario', /\/developper\/entrainer$/.test(page.url()) && await page.evaluate(() => document.activeElement && document.activeElement.id === 'scKind'), page.url());
    await go(page, `#/org/${ORG}/parametres`);
    const pc = await page.$$eval('.desk-crumbs li', (ls) => ls.map((l) => l.textContent.trim()).join(' / '));
    check('D4 Paramètres : fil d’Ariane juste, pas d’action hors sujet, lien du pied de barre actif', pc === 'Arbor Business / Magasin de Lyon / Paramètres' && !(await page.$('.desk-act')) && !!(await page.$('[data-desk-set][aria-current]')), pc);

    /* E. Mon équipe : tableau, recherche, filtres */
    await go(page, `#/org/${ORG}/equipe`, 1600);
    const rows = () => page.$$eval('.hub-people-tb tbody tr', (trs) => trs.filter((t) => !t.hidden).map((t) => t.dataset.q));
    check('E1 tableau : une ligne par personne, colonnes lisibles, détail accessible', (await rows()).length === 2 && (await page.$$('.hub-people-tb thead th')).length === 7 && !!(await page.$('.hub-people-tb a[href$="/suivi/u-bob"]')));
    await page.fill('#tmQ', 'chlo'); await wait(page, 150);
    check('E2 recherche', (await rows()).join() === 'chloe@magasin.fr');
    await page.fill('#tmQ', ''); await page.click('.seg [data-f="reval"]'); await wait(page, 150);
    check('E3 filtre « À revalider »', (await rows()).join() === 'bob@magasin.fr' && (await page.getAttribute('.seg [data-f="reval"]', 'aria-pressed')) === 'true');
    await page.fill('#tmQ', 'personne'); await wait(page, 150);
    check('E4 aucun résultat : message', await page.isVisible('#tmEmpty'));
    check('E5 pas de bouton « Inviter » en double avec l’action de la barre supérieure', !(await page.isVisible('#hubInvite')) && /Ajouter un collaborateur/.test(await page.textContent('.desk-act')));
    await ctx.close();
  }

  /* F. Collaborateur : recherche limitée à ce qu'il peut lire */
  {
    const { ctx, page } = await as('bob');
    await page.goto(`${URL0}#/org/${ORG}`); await wait(page, 1400);
    const navs = await page.$$eval('.org-head .org-tabs a', (as2) => as2.map((a) => a.textContent.trim()));
    check('F1 collaborateur : sa navigation, pas d’action de gestion ni de lien Paramètres', navs.join('|') === 'Accueil|Canopée|Explorer|Mon parcours' && !(await page.$('.desk-act')) && !(await page.$('[data-desk-set]')), navs.join('|'));
    const r0 = reqs.length;
    await page.keyboard.press('Control+k'); await wait(page, 700);
    await page.fill('#cmdkQ', 'chloe'); await wait(page, 200);
    check('F2 sa recherche ne demande ni la liste des membres ni les documents, et ne trouve pas ses collègues', !reqs.slice(r0).some((r) => /\/rest\/v1\/(memberships|sources|knowledge_nodes|skills)/.test(r.url)) && !/chloe@/.test(await page.textContent('.cmdk-list')));
    await page.keyboard.press('Escape');
    await ctx.close();
  }

  /* G. Résolutions : pas de débordement, largeur de contenu maîtrisée */
  for (const [w, h] of [[1366, 768], [1440, 900], [1920, 1080]]) {
    const { ctx, page } = await as('ana', { width: w, height: h });
    const bad = [];
    for (const hash of ['', '/equipe', '/savoir', '/developper', '/developper/entrainer', '/apprendre', '/parametres', '/suivi/u-bob']) {
      await page.goto(`${URL0}#/org/${ORG}${hash}`); await wait(page, 1300);
      if (await overflow(page)) bad.push(`${hash || '/'} déborde`);
      const g = await page.evaluate(() => { const s = [...document.querySelectorAll('#app > :not(.org-head):not(.org-top)')].map((e) => e.getBoundingClientRect()).filter((r) => r.width); return { minL: Math.min(...s.map((r) => r.left)), maxW: Math.max(...s.map((r) => r.width)) }; });
      if (g.minL < 248 || g.maxW > 1441) bad.push(`${hash || '/'} ${JSON.stringify(g)}`);
    }
    check(`G ${w}×${h} : 8 écrans sans débordement, contenu à droite de la barre, largeur ≤ 1440 px`, !bad.length, bad.join(' ; '));
    if (w === 1366) {
      await page.goto(`${URL0}#/org/${ORG}`); await wait(page, 1400);
      const fold = await page.evaluate(() => { const t = document.querySelector('.hub-todo'); return t.getBoundingClientRect().top < innerHeight; });
      check('G2 1366 × 768 : les actions prioritaires commencent au-dessus de la ligne de flottaison', fold);
    }
    if (w === 1920) {
      await page.goto(`${URL0}#/org/${ORG}`); await wait(page, 1400);
      const cols = await page.evaluate(() => { const m = document.querySelector('.ck-main'), s = document.querySelector('.ck-side'); return m && s ? [Math.round(m.getBoundingClientRect().width), Math.round(s.getBoundingClientRect().width)] : []; });
      check('G3 1920 : grille asymétrique (environ 65 / 35)', cols.length === 2 && cols[0] / (cols[0] + cols[1]) > 0.6 && cols[0] / (cols[0] + cols[1]) < 0.7, cols.join('/'));
    }
    await ctx.close();
  }

  /* H. Téléphone et Student : rien ne s'impose */
  {
    const { ctx, page } = await as('ana', { width: 390, height: 844 });
    await page.goto(`${URL0}#/org/${ORG}`); await wait(page, 1400);
    const pos = await page.evaluate(() => getComputedStyle(document.querySelector('.org-head')).position);
    check('H1 téléphone : pas de barre latérale ni de barre supérieure d’ordinateur ; sélecteur d’espace habituel', pos !== 'fixed' && !(await page.isVisible('.org-top')) && !(await page.isVisible('.desk-space')) && await page.isVisible('#spaceBtn') && !(await overflow(page)));
    await ctx.close();
    const s = await as('ana');
    await s.page.goto(`${URL0}#/`); await wait(s.page, 1200);
    const sbg = await s.page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    check('H2 Student sur ordinateur : barre habituelle, thème inchangé (pas de palette Business)', (await s.page.isVisible('.topbar')) && sbg !== 'rgb(11, 20, 18)' && !(await s.page.$('.org-top')), sbg);
    await s.ctx.close();
  }

  /* I. Lisibilité et mouvement */
  {
    const T = { bg: '0B1412', surface: '14221E', text: 'E8F1EC', text2: '9AADA3', text3: '71877C', accent: '10B981', onAccent: '03140D', ink: '34D399' };
    const r = { t: ratio(T.text, T.surface), t2: ratio(T.text2, T.surface), t3: ratio(T.text3, T.bg), btn: ratio(T.onAccent, T.accent), ink: ratio(T.ink, T.surface) };
    check('I1 contrastes : texte 4,5:1 au moins (secondaire compris), bouton primaire lisible, texte discret ≥ 3:1', r.t >= 7 && r.t2 >= 4.5 && r.btn >= 4.5 && r.ink >= 4.5 && r.t3 >= 3, JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.toFixed(2)]))));
    const { ctx, page } = await as('ana', { width: 1366, height: 768 }, 'reduce');
    await page.goto(`${URL0}#/org/${ORG}`); await wait(page, 1200);
    const tr = await page.evaluate(() => getComputedStyle(document.querySelector('.org-tabs a')).transitionDuration);
    check('I2 mouvement réduit respecté (aucune transition)', tr === '0s', tr);
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    const ring = await page.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); return cs.outlineStyle !== 'none' || cs.boxShadow !== 'none'; });
    check('I3 focus clavier visible', ring);
    await ctx.close();
  }
  check('Z aucune erreur JavaScript', !errors.length, errors.join(' | '));

  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
