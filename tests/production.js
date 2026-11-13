/* Préparation à la production (G7) : le site PUBLIÉ (GitHub Pages par défaut), sur ordinateur, en 1366 × 768 et
   1920 × 1080, pour Student (sans compte, données sur l'appareil) et Business (base simulée par tests/fixtures/org-mock.js :
   le code testé est celui du site publié, seules les réponses de Supabase sont simulées) ; puis la PWA : manifeste,
   icônes, service worker, mise en cache, fonctionnement hors connexion.
   Lancer depuis la racine du dépôt :  node tests/production.js
   Autre adresse :  ARBOR_BASE=http://localhost:8765/ node tests/production.js   (captures : ARBOR_SHOTS=dossier) */
const path = require('path');
const { chromium } = require('playwright');
const M = require('./fixtures/org-mock.js');

const BASE = (process.env.ARBOR_BASE || 'https://hmzr944.github.io/Landing-page/').replace(/\/?$/, '/');
const SHOTS = process.env.ARBOR_SHOTS;
const SIZES = [[1366, 768], [1920, 1080]];
const ORG = M.ORG;
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' : ' + extra : ''}`); if (!ok) failed++; };

(async () => {
  console.log(`Site testé : ${BASE}`);
  const browser = await chromium.launch();
  const errors = [];
  const watch = (page, tag) => page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  const wait = (page, ms = 900) => page.waitForTimeout(ms);
  const go = async (page, hash, ms = 1100) => { await page.evaluate((h) => { location.hash = h; }, hash); await wait(page, ms); };
  // Mesures de mise en page : débordement, chevauchement de la barre du haut, contenu centré et lisible
  const layout = (page) => page.evaluate(() => {
    const vw = innerWidth, top = document.querySelector('.topbar').getBoundingClientRect();
    const kids = [...document.querySelectorAll('#app > *')].filter((x) => x.getBoundingClientRect().height > 0 && getComputedStyle(x).position !== 'fixed');
    const first = kids[0] ? kids[0].getBoundingClientRect() : null;
    const right = Math.max(0, ...kids.map((x) => x.getBoundingClientRect().right)), left = Math.min(vw, ...kids.map((x) => x.getBoundingClientRect().left));
    return { overflow: document.documentElement.scrollWidth > vw + 1, under: first ? first.top + scrollY >= top.bottom - 1 : false, left, right, vw, width: right - left };
  });
  const shot = async (page, n) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `prod-${n}.png`), fullPage: false }); };

  /* A. Student, sans compte, sur ordinateur */
  for (const [w, h] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.clear(); localStorage.setItem('arbor:welcome', '{"how":"guest"}'); } } catch (e) { /* about:blank */ } });
    const page = await ctx.newPage(); watch(page, `student ${w}`);
    await page.goto(BASE); await wait(page, 1500);
    // un vrai cours créé par l'interface : sujet et plan
    await go(page, '#/cours', 1000);
    await page.click('[data-act="new-subject"]'); await wait(page, 400);
    await page.fill('#nsTitle', 'Réseaux informatiques');
    await page.fill('#nsPlan', 'Adressage IP\n  Masque de sous-réseau\n  Passerelle\nRoutage\n  Table de routage\nServices\n  DHCP\n  DNS');
    await page.click('#nsForm .row-btns .btn:not(.ghost)'); await wait(page, 1200);
    const [sid, rid] = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('arbor:v1')).subjects.slice(-1)[0]; return [s.id, s.root.id]; });
    check(`A1 ${w}×${h} : un cours se crée par l’interface et reste sur l’appareil`, !!sid);
    const bad = [], narrow = [];
    for (const [hash, name] of [['#/', 'accueil'], ['#/cours', 'cours'], [`#/s/${sid}`, 'fiche'], [`#/s/${sid}/${rid}/carte`, 'carte'], ['#/progression', 'progression'], ['#/methode', 'methode']]) {
      await go(page, hash, 1200);
      const L = await layout(page);
      if (L.overflow || !L.under) bad.push(`${name}${L.overflow ? ' (débordement)' : ''}${!L.under ? ' (sous la barre du haut)' : ''}`);
      // sur grand écran, le contenu ne s'étire pas d'un bord à l'autre et reste centré
      // pages à colonne latérale (un cours) : c'est la colonne de lecture qui doit rester étroite ; la carte utilise tout l'écran
      if (w >= 1920 && name === 'fiche') {
        const col = await page.evaluate(() => Math.max(0, ...[...document.querySelectorAll('#app .sec-head')].map((x) => x.parentElement).filter((x) => !x.closest('aside, nav, #treePane')).map((x) => x.getBoundingClientRect().width)));
        if (col > 1000) narrow.push(`${name} (colonne de ${Math.round(col)} px)`);
      } else if (w >= 1920 && name !== 'carte' && (L.width > 1500 || Math.abs(L.left - (L.vw - L.right)) > 80)) narrow.push(`${name} (${Math.round(L.left)}–${Math.round(L.right)})`);
      await shot(page, `student-${w}-${name}`);
    }
    check(`A2 ${w}×${h} : 6 écrans Student sans débordement, rien sous la barre du haut`, !bad.length, bad.join(', '));
    if (w >= 1920) check('A3 1920×1080 : contenu centré et à largeur de lecture (la carte du cours, elle, utilise tout l’écran)', !narrow.length, narrow.join(', '));
    const nav = await page.evaluate(() => [...document.querySelectorAll('.topnav a')].filter((a) => a.getBoundingClientRect().width > 0).length);
    check(`A4 ${w}×${h} : navigation d’ordinateur visible (Aujourd’hui, Mes cours, Progression), pas de barre basse`, nav === 3 && !(await page.isVisible('.bottom-nav')));
    await go(page, '#/', 1000);
    check(`A5 ${w}×${h} : les cinq portes d’entrée sont sur l’accueil`, (await page.$$('.st-doors .door')).length === 5);
    await page.click('#settingsBtn'); await wait(page, 500);
    const modal = await page.evaluate(() => { const r = document.querySelector('.modal').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1 && r.width <= 640; });
    check(`A6 ${w}×${h} : la fenêtre des réglages tient à l’écran`, modal);
    await ctx.close();
  }

  /* B. Business sur ordinateur : le code publié, la base simulée */
  for (const [w, h] of SIZES) {
    M.state.reset();
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await ctx.addInitScript(...M.init('ana'));
    const page = await ctx.newPage(); watch(page, `business ${w}`);
    page.on('dialog', (dg) => dg.dismiss());
    await page.route(`${M.SB}/**`, (route) => route.fulfill(M.handle(route.request())));
    await page.goto(`${BASE}#/org/${ORG}`); await wait(page, 1600);
    const bad = [], overlap = [];
    for (const tab of ['', '/intelligence', '/suivi', '/documents', '/documents/src1', '/competences', '/scenarios', '/apprendre', '/equipe', '/apercu', '/parametres', '/resultats']) {
      await go(page, `#/org/${ORG}${tab}`, 1300);
      const r = await page.evaluate(() => {
        const head = document.querySelector('.org-head'); if (!head) return { none: true };
        const hb = head.getBoundingClientRect(), content = [...document.querySelectorAll('#app > :not(.org-head)')].filter((x) => x.getBoundingClientRect().height > 0);
        return { overflow: document.documentElement.scrollWidth > innerWidth + 1, fixed: getComputedStyle(head).position === 'fixed', hr: hb.right, cl: Math.min(...content.map((x) => x.getBoundingClientRect().left)), fits: hb.bottom <= innerHeight + 1, scrolls: head.scrollHeight <= head.clientHeight + 1 || getComputedStyle(head).overflowY === 'auto' };
      });
      if (r.none || r.overflow) bad.push(`${tab || '/'}${r.overflow ? ' (débordement)' : ' (sans en-tête)'}`);
      else if (!r.fixed || r.hr > r.cl || !r.fits || !r.scrolls) overlap.push(`${tab || '/'} ${JSON.stringify(r)}`);
      await shot(page, `business-${w}${tab.replace(/\//g, '-') || '-accueil'}`);
    }
    check(`B1 ${w}×${h} : 12 écrans Business sans débordement`, !bad.length, bad.join(', '));
    check(`B2 ${w}×${h} : barre latérale fixe, entièrement accessible (défilement interne si besoin), jamais sur le contenu`, !overlap.length, overlap.join(' | '));
    const last = await page.evaluate(() => { const a = [...document.querySelectorAll('.org-tabs a')].pop(); a.scrollIntoView({ block: 'nearest' }); const r = a.getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; });
    check(`B3 ${w}×${h} : le dernier lien de la barre latérale (Paramètres) est atteignable`, last);
    await ctx.close();
  }

  /* C. PWA : manifeste, icônes, service worker, cache, hors connexion (site publié, HTTPS) */
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'allow' });
    await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.setItem('arbor:welcome', '{"how":"guest"}'); } } catch (e) { /* about:blank */ } });
    const page = await ctx.newPage(); watch(page, 'pwa');
    await page.goto(BASE); await wait(page, 1500);
    const man = await page.evaluate(async () => {
      const href = document.querySelector('link[rel="manifest"]').href; const m = await (await fetch(href)).json();
      const icons = await Promise.all(m.icons.map((i) => new Promise((ok) => { const img = new Image(); img.onload = () => ok({ src: i.src, sizes: i.sizes, real: `${img.naturalWidth}x${img.naturalHeight}`, purpose: i.purpose || 'any' }); img.onerror = () => ok({ src: i.src, real: 'introuvable' }); img.src = new URL(i.src, href).href; })));
      return { name: m.name, short: m.short_name, start: m.start_url, scope: m.scope, display: m.display, theme: m.theme_color, bg: m.background_color, icons, secure: isSecureContext };
    });
    check('C1 manifeste complet (nom, adresse de départ, affichage autonome, couleurs)', !!man.name && !!man.start && ['standalone', 'fullscreen', 'minimal-ui'].includes(man.display) && !!man.theme && !!man.bg, JSON.stringify({ ...man, icons: undefined }));
    check('C2 icônes 192 et 512 réelles, dont une « maskable »', man.icons.every((i) => i.real === i.sizes) && man.icons.some((i) => i.sizes === '192x192') && man.icons.some((i) => i.sizes === '512x512') && man.icons.some((i) => /maskable/.test(i.purpose)), JSON.stringify(man.icons));
    check('C3 servi en HTTPS (condition d’installation)', man.secure || !/^https:/.test(BASE) === false ? man.secure : true);
    const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return { scope: r.scope, active: !!r.active }; });
    await page.reload(); await wait(page, 1500);
    const ctl = await page.evaluate(() => !!navigator.serviceWorker.controller);
    check('C4 le service worker s’installe et contrôle la page après rechargement', sw.active && ctl, JSON.stringify(sw));
    const cache = await page.evaluate(async () => { const keys = await caches.keys(); const v = keys.find((k) => /arbor-v\d+/.test(k)); const c = v ? await caches.open(v) : null; return { v, n: c ? (await c.keys()).length : 0 }; });
    check('C5 le cache de l’application est celui de la version publiée (version publiée) et contient l’application', cache.v === (process.env.ARBOR_CACHE || 'arbor-v46') && cache.n >= 40, JSON.stringify(cache));
    // hors connexion : on crée un cours, on coupe le réseau, on recharge
    await go(page, '#/cours', 1000);
    await page.click('[data-act="new-subject"]'); await wait(page, 400);
    await page.fill('#nsTitle', 'Révisions hors ligne'); await page.fill('#nsPlan', 'Chapitre 1\nChapitre 2');
    await page.click('#nsForm .row-btns .btn:not(.ghost)'); await wait(page, 1000);
    await ctx.setOffline(true);
    await page.goto(BASE); await wait(page, 1800);
    const off = await page.evaluate(() => ({ app: document.querySelector('#app').textContent.length, course: JSON.parse(localStorage.getItem('arbor:v1') || '{}').subjects?.some((s) => s.title === 'Révisions hors ligne'), title: document.title }));
    check('C6 hors connexion : l’application se recharge depuis le cache, avec le cours de l’appareil', off.app > 50 && off.course, JSON.stringify(off));
    await go(page, '#/cours', 1200);
    check('C7 hors connexion : la navigation fonctionne (Mes cours)', /Révisions hors ligne/.test(await page.textContent('#app')));
    const sid = await page.evaluate(() => JSON.parse(localStorage.getItem('arbor:v1')).subjects.find((s) => s.title === 'Révisions hors ligne').id);
    await go(page, `#/s/${sid}`, 1200);
    check('C8 hors connexion : un cours s’ouvre et se modifie (enregistré sur l’appareil)', /Chapitre 1/.test(await page.textContent('#app')));
    await shot(page, 'offline');
    await ctx.setOffline(false);
    await ctx.close();
  }
  /* C'. Espace pro hors connexion : manager connecté, organisation connue, base injoignable */
  {
    M.state.reset();
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'allow' });
    await ctx.addInitScript(...M.init('eve'));
    const page = await ctx.newPage(); watch(page, 'pwa-business');
    let online = true;
    await page.route(`${M.SB}/**`, (route) => (online ? route.fulfill(M.handle(route.request())) : route.abort('internetdisconnected')));
    await page.goto(`${BASE}#/org/${ORG}`); await wait(page, 1800);
    await page.reload(); await wait(page, 1500);
    online = false; await ctx.setOffline(true);
    await page.reload(); await wait(page, 2000);
    const t = (await page.textContent('#app')).replace(/\s+/g, ' ').trim();
    const nav = await page.$$('.org-tabs a');
    check('C9 hors connexion, espace pro : l’application s’ouvre, la navigation reste, et l’absence de réseau est dite (pas de faux chiffres)', nav.length >= 5 && /connexion/i.test(t) && !/compétences acquises/.test(t), t.slice(0, 160));
    await shot(page, 'offline-business');
    await ctx.setOffline(false);
    await ctx.close();
  }

  check('Z aucune erreur JavaScript sur le site publié', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
