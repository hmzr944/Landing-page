/* Audit responsive de toute l'application : chaque écran principal, chaque modale, sur 6 largeurs.
   Ce qui est cherché, mesuré dans la page (pas à l'œil) :
   - débordement horizontal de la page ou d'un élément visible hors de l'écran (hors zones prévues pour défiler) ;
   - texte coupé ou qui dépasse dans un bouton ;
   - modale plus haute ou plus large que l'écran ;
   - Pousse hors de l'écran, trop grand, ou posé sur un bouton ou la barre d'onglets ;
   - texte de lecture plus petit que 12 px.
   Lancer depuis la racine du dépôt :  node tests/responsive.js   (Playwright requis).  AUDIT=1 : liste tout, sans échouer. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SB = 'https://nnqtgwgwalbbhqzceged.supabase.co';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' : ' + extra : ''}`); if (!ok) failed++; };

const now = Date.now(), D = 864e5;
const leaf = (id, title, srs) => ({ id, title, notes: `${title} est une notion importante du cours, expliquée avec un exemple concret et une phrase assez longue pour remplir plusieurs lignes sur un petit écran de téléphone.`, explain: '', keyPoints: [`${title} : point clé à retenir absolument`], exercises: [{ id: `ex${id}`, q: `Explique ${title} avec tes mots`, a: 'Réponse attendue' }], srs, status: 'todo', collapsed: false, children: [] });
function sample() {
  const m1 = { id: 'modaaaaaa01', title: 'Réseaux informatiques et adressage', notes: 'Ce module présente les bases.', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false,
    module: { pretest: '', learned: true, generated: true, sources: [], date: '2026-01-01', lessonDone: { at: now - 2 * D, good: 4, asked: 5 } },
    children: [leaf('nmastered01', 'Adressage IP', { s: 40, d: 4, last: now - 3 * D, due: now + 30 * D, reps: 6, lapses: 0, lastG: 3 }), leaf('ndue0000001', 'Masque de sous-réseau variable (VLSM)', { s: 3, d: 6, last: now - 5 * D, due: now - D, reps: 2, lapses: 0, lastG: 3 }), leaf('nseen000001', 'DNS', null)] };
  const m2 = { id: 'modaaaaaa02', title: 'Virtualisation', notes: '', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false,
    module: { pretest: '', learned: false, generated: true, sources: [], date: '2026-01-02' }, children: [leaf('nnew0000001', 'Hyperviseur de type 1 et de type 2', null), leaf('nnew0000002', 'Machine virtuelle', null)] };
  const root = { id: 'rootaaaaa01', title: 'Technicien supérieur systèmes et réseaux', notes: '', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, children: [m1, m2] };
  return { subjects: [{ id: 'subjaaaaa01', title: 'Technicien supérieur systèmes et réseaux', color: '#3451D1', icon: 'code', createdAt: 1, updatedAt: now, program: true, examDate: new Date(now + 30 * D).toISOString().slice(0, 10), root }],
    settings: { theme: 'light', mascot: true, newPerDay: 0 }, stats: { days: {}, calib: {} }, trophies: {}, xp: 120, profile: { done: true, how: 'skip', at: 1 } };
}
const SID = 'subjaaaaa01';

/* Mesures faites dans la page */
function measure(opts) {
  const vw = innerWidth, vh = innerHeight, out = [];
  const name = (e) => { const t = (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40); return `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${e.classList.length ? '.' + [...e.classList].slice(0, 2).join('.') : ''}${t ? ` « ${t} »` : ''}`; };
  const visible = (e) => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  // dans une zone faite pour défiler horizontalement (carte, carrousel) : pas un défaut
  const inScroller = (e) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth + 2) return true; if (s.overflowX === 'hidden' || s.overflow === 'hidden' || s.overflow === 'clip') return true; } return false; };
  if (document.documentElement.scrollWidth > vw + 1) out.push(`page plus large que l'écran (${document.documentElement.scrollWidth} px pour ${vw} px)`);
  const all = [...document.body.querySelectorAll('*')].filter((e) => !e.closest('svg') && visible(e));
  for (const e of all) {
    const r = e.getBoundingClientRect();
    if ((r.right > vw + 2 || r.left < -2) && !inScroller(e) && getComputedStyle(e).position !== 'fixed' && !e.closest('.mascot, .bg, [aria-hidden="true"]')) {
      if (r.width < vw * 3) out.push(`dépasse de l'écran : ${name(e)} (${Math.round(r.left)} → ${Math.round(r.right)})`);
    }
  }
  // boutons : texte coupé, qui dépasse ou trop petit pour le doigt
  for (const b of all.filter((e) => e.matches('button, .btn, a.btn, [role="tab"], .chip, .pill'))) {
    if (b.closest('.mascot, svg')) continue;
    if (b.scrollWidth > b.clientWidth + 2 && getComputedStyle(b).overflowX !== 'auto') out.push(`texte qui dépasse du bouton : ${name(b)} (${b.scrollWidth} > ${b.clientWidth})`);
    const r = b.getBoundingClientRect();
    if (opts.touch && r.height < 30 && r.width < 30 && !b.closest('.md, .notes-view')) out.push(`bouton trop petit pour le doigt : ${name(b)} (${Math.round(r.width)}×${Math.round(r.height)})`);
  }
  // texte de lecture trop petit
  for (const e of all.filter((x) => x.matches('p, li, small, label, span, a, button') && x.childNodes.length && [...x.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 3))) {
    const fs = parseFloat(getComputedStyle(e).fontSize);
    if (fs < 11.5 && !e.closest('svg, .xp, .mascot, [aria-hidden="true"]')) out.push(`texte trop petit (${fs} px) : ${name(e)}`);
  }
  // modale
  const m = document.querySelector('.modal-backdrop.show .modal, .modal-backdrop:not([hidden]) .modal');
  if (m && visible(m)) {
    const r = m.getBoundingClientRect();
    if (r.width > vw + 1 || r.left < -1) out.push(`modale plus large que l'écran (${Math.round(r.width)} px)`);
    if (r.height > vh + 1 && getComputedStyle(m).overflowY === 'visible') out.push(`modale plus haute que l'écran sans défilement (${Math.round(r.height)} px)`);
    if (r.top < -1) out.push('le haut de la modale est hors de l’écran');
  }
  // Pousse
  // Pousse lui-même (sa bulle, passagère et sans clic, n'est pas comptée) ; derrière une modale ouverte, il est caché
  const p = document.querySelector('.mascot:not(.pousse-mini):not(.off) .mascot-btn');
  if (p && visible(p) && visible(p.closest('.mascot'))) {
    const r = p.getBoundingClientRect();
    if (r.right > vw + 1 || r.bottom > vh + 1 || r.left < -1) out.push(`Pousse sort de l’écran (${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)})`);
    if (r.width > vw * 0.3) out.push(`Pousse trop grand pour l’écran (${Math.round(r.width)} px sur ${vw})`);
    const hit = all.filter((e) => e.matches('.btn, button, .bottom-nav, input, textarea') && !e.closest('.mascot') && !p.contains(e)).find((e) => {
      // comme un bouton flottant, Pousse peut frôler un coin ; il ne doit cacher ni le centre ni plus de 40 % d'un bouton
      const q = e.getBoundingClientRect(); const ix = Math.max(0, Math.min(r.right - 8, q.right) - Math.max(r.left + 8, q.left)), iy = Math.max(0, Math.min(r.bottom - 8, q.bottom) - Math.max(r.top + 8, q.top));
      const cx = (q.left + q.right) / 2, cy = (q.top + q.bottom) / 2;
      return (cx > r.left + 8 && cx < r.right - 8 && cy > r.top + 8 && cy < r.bottom - 8) || ix * iy > 0.4 * q.width * q.height;
    });
    if (hit) out.push(`Pousse recouvre : ${name(hit)}`);
  }
  return [...new Set(out)];
}

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const errors = [];
  const SIZES = [
    { w: 320, h: 620, touch: true, label: 'petit téléphone 320' }, { w: 360, h: 740, touch: true, label: 'Android 360' }, { w: 390, h: 844, touch: true, label: 'iPhone 390' },
    { w: 768, h: 1024, touch: true, label: 'tablette 768' }, { w: 1024, h: 768, touch: false, label: 'portable 1024' }, { w: 1440, h: 900, touch: false, label: 'écran 1440' },
  ];
  const SCREENS = [
    ['accueil', '#/'], ['cours', '#/cours'], ['carte', `#/s/${SID}/rootaaaaa01/carte`], ['fiche', `#/s/${SID}/ndue0000001/fiche`], ['module', `#/s/${SID}/modaaaaaa01/fiche`],
    ['révision', `#/s/${SID}/rootaaaaa01/revision`], ['progression', '#/progression'], ['méthode', '#/methode'], ['trophées', '#/trophees'], ['réviser', '#/reviser'],
    ['réglages', '#/', '#settingsBtn'], ['nouveau sujet', '#/cours', '[data-act="new-subject"], #newSubject, .new-subject'], ['rejoindre', '#/rejoindre'],
  ];
  const report = [];
  for (const sz of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: sz.w, height: sz.h }, isMobile: sz.touch && sz.w < 900, hasTouch: sz.touch, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await ctx.addInitScript((d) => { try { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.clear(); localStorage.setItem('arbor:v1', d); localStorage.setItem('arbor:welcome', '{"how":"test"}'); } } catch (e) { /* about:blank */ } }, JSON.stringify(sample()));
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${sz.w}: ${e.message}`));
    await page.route(`${SB}/**`, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.route(/wiki(pedia|books|versity|media)\.org/, (r) => r.abort());
    await page.goto(URL0); await page.waitForTimeout(900);
    for (const [label, hash, click] of SCREENS) {
      await page.evaluate((h) => { if (location.hash === h) location.hash = '#/x'; location.hash = h; }, hash); await page.waitForTimeout(800);
      if (click) { const el = await page.$(click.split(', ').map((s) => s).join(', ')); if (!el) { report.push([sz.label, label, ['bouton d’ouverture introuvable']]); continue; } await el.click(); await page.waitForTimeout(450); }
      const issues = await page.evaluate(measure, { touch: sz.touch });
      if (issues.length) report.push([sz.label, label, issues]);
      if (click) { await page.keyboard.press('Escape'); await page.waitForTimeout(250); }
    }
    await ctx.close();
    // accueil, compte et introduction (appareil neuf)
    const c2 = await browser.newContext({ viewport: { width: sz.w, height: sz.h }, isMobile: sz.touch && sz.w < 900, hasTouch: sz.touch, serviceWorkers: 'block', reducedMotion: 'reduce' });
    const p2 = await c2.newPage();
    p2.on('pageerror', (e) => errors.push(`${sz.w}: ${e.message}`));
    await p2.route(`${SB}/**`, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await p2.route(/(cdnjs|jsdelivr)/, (r) => r.continue());
    await p2.goto(URL0); await p2.waitForTimeout(1000);
    if (await p2.$('.wel')) {
      for (const [label, sel] of [['accueil Arbor', null], ['inscription', '.wel-ctas [data-wel="signup"]']]) {
        if (sel) { await p2.click(sel); await p2.waitForTimeout(400); }
        const issues = await p2.evaluate(measure, { touch: sz.touch });
        if (issues.length) report.push([sz.label, label, issues]);
      }
      await p2.click('.wel-back'); await p2.waitForTimeout(300);
      await p2.click('[data-wel="guest"]'); await p2.waitForTimeout(700);
    } else {
      await p2.evaluate(() => { try { localStorage.setItem('arbor:welcome', '{"how":"test"}'); } catch (e) { /* rien */ } });
    }
    if (!(await p2.$('.onb'))) { await p2.click('#settingsBtn').catch(() => {}); await p2.waitForTimeout(300); await p2.click('#onbAgain').catch(() => {}); await p2.waitForTimeout(500); }
    if (await p2.$('.onb')) {
      let issues = await p2.evaluate(measure, { touch: sz.touch });
      if (issues.length) report.push([sz.label, 'introduction : portes d’entrée', issues]);
      await p2.click('.onb [data-entry="tester"]'); await p2.waitForTimeout(350);
      issues = await p2.evaluate(measure, { touch: sz.touch });
      if (issues.length) report.push([sz.label, 'introduction : objectif', issues]);
    }
    await c2.close();
  }
  for (const [sz, label, issues] of report) console.log(`\n[${sz}] ${label}\n  - ${issues.join('\n  - ')}`);
  const n = report.reduce((a, r) => a + r[2].length, 0);
  if (process.env.AUDIT) { console.log(`\n${n} défaut(s) relevé(s) sur ${report.length} écran(s)`); await browser.close(); server.close(); return; }
  check(`aucun défaut responsive sur ${SIZES.length} largeurs × ${SCREENS.length + 4} écrans`, n === 0, `${n} défaut(s)`);
  check('aucune erreur JavaScript', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} échec(s)` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
