/* Site public (site/) : pages générées à jour, chargement sans erreur, liens internes valides, aucun débordement
   sur téléphone ni ordinateur, page Télécharger honnête (aucune version publiée -> aucun bouton actif ; version
   publiée -> les bons fichiers), aucun faux lien App Store, téléphone reconnu.
   Lancer :  node tests/site.js   (Playwright requis) */
const http = require('http'), fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');
const { chromium, devices } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(/^\/+/, ''));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' : ' + extra : ''}`); if (!ok) failed++; };

const PAGES = ['site/index.html', 'site/telecharger.html', 'site/mobile.html', ...fs.readdirSync(path.join(ROOT, 'site/docs')).filter((f) => f.endsWith('.html')).map((f) => `site/docs/${f}`)];
const RELEASE = { tag_name: 'v2.0.0', published_at: '2026-11-24T10:00:00Z', html_url: 'https://github.com/hmzr944/Landing-page/releases/tag/v2.0.0', assets: [
  { name: 'Arbor_2.0.0_x64-setup.exe', size: 1991906, browser_download_url: 'https://github.com/hmzr944/Landing-page/releases/download/v2.0.0/Arbor_2.0.0_x64-setup.exe' },
  { name: 'Arbor_2.0.0_x64_en-US.msi', size: 2568192, browser_download_url: 'https://github.com/hmzr944/Landing-page/releases/download/v2.0.0/Arbor_2.0.0_x64_en-US.msi' },
  { name: 'Arbor_2.0.0_aarch64.dmg', size: 3234126, browser_download_url: 'https://github.com/hmzr944/Landing-page/releases/download/v2.0.0/Arbor_2.0.0_aarch64.dmg' },
  { name: 'SHA256SUMS.txt', size: 300, browser_download_url: 'https://github.com/hmzr944/Landing-page/releases/download/v2.0.0/SHA256SUMS.txt' }] };

(async () => {
  try { execFileSync(process.execPath, [path.join(ROOT, 'tools/build-site.js'), '--check'], { stdio: 'pipe' }); check('W01 pages générées à jour avec leurs sources (tools/build-site.js --check)', true); }
  catch (x) { check('W01 pages générées à jour avec leurs sources (tools/build-site.js --check)', false, String(x.stdout || x.message).trim()); }
  check('W02 18 pages : accueil, télécharger, mobile, 15 pages de documentation', PAGES.length === 18, String(PAGES.length));

  await new Promise((r) => server.listen(0, r));
  const BASE = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const api = (ctx, body, status = 200) => ctx.route('https://api.github.com/**', (r) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }));

  // Toutes les pages, deux tailles
  const bad = { err: [], over: [], links: [], h1: [], store: [] };
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    await api(ctx, {}, 404);
    await ctx.route(/fonts\.(googleapis|gstatic)\.com|unpkg\.com/, (r) => r.fulfill({ status: 200, body: '' }));
    const page = await ctx.newPage();
    for (const pg of PAGES) {
      const errs = []; const on = (e) => errs.push(e.message); page.on('pageerror', on);
      await page.goto(BASE + pg); await page.waitForTimeout(250);
      page.off('pageerror', on);
      if (errs.length) bad.err.push(`${w} ${pg} ${errs[0]}`);
      const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (ov > 1) bad.over.push(`${w} ${pg} +${ov}px`);
      if (w === 1440) {
        if ((await page.$$('h1')).length !== 1 || !(await page.title())) bad.h1.push(pg);
        const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => ({ raw: a.getAttribute('href'), abs: a.href })));
        for (const { raw, abs } of hrefs) {
          if (/apps\.apple\.com|play\.google\.com/.test(abs)) bad.store.push(`${pg} -> ${abs}`);
          if (/^(https?:|mailto:)/.test(raw) || raw === '#') continue;
          const u = new URL(abs); const f = path.join(ROOT, decodeURIComponent(u.pathname));
          if (!fs.existsSync(f)) { bad.links.push(`${pg} -> ${raw}`); continue; }
          if (u.hash && !/^#\//.test(u.hash) && f.endsWith('.html') && !fs.readFileSync(f, 'utf8').includes(`id="${u.hash.slice(1)}"`)) bad.links.push(`${pg} -> ${raw} (ancre)`);
        }
      }
    }
    await ctx.close();
  }
  check('W03 aucune erreur JavaScript, sur ordinateur et téléphone', !bad.err.length, bad.err.join(' | '));
  check('W04 aucun débordement horizontal (1440 px et 390 px)', !bad.over.length, bad.over.join(' | '));
  check('W05 chaque page a un titre et un seul h1', !bad.h1.length, bad.h1.join(', '));
  check('W06 tous les liens internes mènent à un fichier (et à une ancre) existants', !bad.links.length, bad.links.slice(0, 6).join(' | '));
  check('W07 aucun lien vers une boutique d’applications (l’app iPhone n’est pas publiée)', !bad.store.length, bad.store.join(' | '));
  const home = fs.readFileSync(path.join(ROOT, 'site/index.html'), 'utf8');
  check('W08 « Ouvrir Arbor Web » mène à l’application (../index.html#/)', /href="\.\.\/index\.html#\/"[^>]*>Ouvrir Arbor Web/.test(home));
  check('W09 l’accueil dit que la synchronisation est en préparation (pas de promesse fausse)', /Synchronisation entre appareils : en préparation/.test(home));

  // Télécharger : aucune version publiée
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await api(ctx, { message: 'Not Found' }, 404);
    const p = await ctx.newPage();
    await p.goto(BASE + 'site/telecharger.html'); await p.waitForFunction(() => document.querySelector('#dl').dataset.state);
    const st = await p.getAttribute('#dl', 'data-state');
    const active = await p.$$eval('[data-get]', (as) => as.filter((a) => a.getAttribute('aria-disabled') !== 'true' || a.getAttribute('href') !== '#').length);
    check('W10 aucune version publiée : on le dit, aucun bouton de téléchargement actif', st === 'aucune' && active === 0 && /Aucune version publique/.test(await p.textContent('#dlState')));
    check('W11 aucune version publiée : Arbor Web est proposé à la place', await p.isVisible('a[href="../index.html#/"]'));
    await ctx.close();
  }
  // Télécharger : version publiée
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36' });
    await api(ctx, RELEASE);
    const p = await ctx.newPage();
    await p.goto(BASE + 'site/telecharger.html'); await p.waitForFunction(() => document.querySelector('#dl').dataset.state);
    const win = await p.getAttribute('[data-os="win"] [data-get]', 'href'), mac = await p.getAttribute('[data-os="mac"] [data-get]', 'href');
    check('W12 version publiée : Windows -> setup.exe, macOS -> .dmg', /x64-setup\.exe$/.test(win) && /aarch64\.dmg$/.test(mac), `${win} ${mac}`);
    check('W13 version publiée : taille, version, empreintes SHA-256, paquet .msi', /1,9 Mo/.test(await p.textContent('[data-os="win"]')) && /v2\.0\.0/.test(await p.textContent('#dlState')) && await p.isVisible('#dlState a[href$="SHA256SUMS.txt"]') && await p.isVisible('[data-os="win"] [data-alt][href$=".msi"]'));
    check('W14 Windows reconnu : sa carte est mise en avant', await p.$eval('[data-os="win"]', (e) => e.classList.contains('mine')));
    await ctx.close();
  }
  // Téléphone sur la page Télécharger
  {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    await api(ctx, {}, 404);
    const p = await ctx.newPage();
    await p.goto(BASE + 'site/telecharger.html'); await p.waitForTimeout(500);
    check('W15 iPhone : la page oriente vers l’installation depuis le navigateur', await p.isVisible('#dlMobile a[href="mobile.html"]'));
    await p.goto(BASE + 'site/index.html'); await p.click('.s-menu'); await p.waitForTimeout(200);
    check('W16 menu téléphone : s’ouvre et mène à la documentation', await p.isVisible('.s-nav a[href="docs/index.html"]'));
    await ctx.close();
  }
  // Design « Clairière » (docs/site-design.md) : images réelles présentes, récit, sélecteur, mouvement réduit, palette
  {
    const imgs = [...new Set(PAGES.flatMap((pg) => [...fs.readFileSync(path.join(ROOT, pg), 'utf8').matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => path.join(path.dirname(path.join(ROOT, pg)), m[1]))))];
    const missing = imgs.filter((f) => !fs.existsSync(f));
    check('W17 toutes les images des pages existent (captures réelles, simulateur iPhone)', imgs.length >= 10 && !missing.length, missing.map((f) => path.relative(ROOT, f)).join(', ') || `${imgs.length} images`);
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com|unpkg\.com/, (r) => r.fulfill({ status: 200, body: '' }));
    const p = await ctx.newPage();
    await p.goto(BASE + 'site/index.html'); await p.waitForTimeout(400);
    check('W18 récit : six étapes et six écrans de téléphone', (await p.$$('.story-steps li')).length === 6 && (await p.$$('.story-phone .scr img')).length === 6);
    const pane = async () => p.$$eval('.xp-media > [data-pane]', (els) => els.filter((e) => e.getAttribute('aria-hidden') === 'false').map((e) => e.dataset.pane).join(','));
    const before = await pane();
    await p.click('.seg button[data-key="phone"]'); await p.waitForTimeout(400);
    const after = await pane();
    const pillX = await p.$eval('.seg .pill', (e) => e.style.transform);
    check('W19 sélecteur segmenté : un seul panneau visible, il change au toucher, la pastille suit', before === 'web' && after === 'phone' && /translateX\((?!0px)/.test(pillX), `${before} -> ${after} ${pillX}`);
    await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(300);
    check('W20 sélecteur segmenté au clavier (flèches)', (await pane()) === 'desk');
    await ctx.close();
    const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const q = await rm.newPage();
    await q.goto(BASE + 'site/index.html'); await q.waitForTimeout(300);
    const t = await q.evaluate(() => ({ p: document.querySelector('.tree-art').style.getPropertyValue('--p'), lit: document.querySelectorAll('.tree-art .nd.lit').length }));
    check('W21 mouvement réduit : l’arbre est entièrement dessiné, les notions allumées, sans attendre le défilement', t.p === '1.000' && t.lit >= 7, JSON.stringify(t));
    await rm.close();
    const css = fs.readFileSync(path.join(ROOT, 'site/site.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const ALLOWED = ['#F5F5F7', '#FFFFFF', '#1D1D1F', '#6E6E73', '#86868B', '#000000', '#1C1C1E', '#98989D', '#8E8E93', '#0B3B2E', '#17874D', '#4CD787', '#032614', '#0E1512', '#F3F8F6', '#9FB8AE', '#636366', '#000', '#FFF'];
    const hex = [...new Set([...css.matchAll(/#[0-9A-Fa-f]{3,8}\b/g)].map((m) => m[0].toUpperCase()))];
    const extra = hex.filter((h) => !ALLOWED.includes(h));
    check('W22 règle des trois couleurs : aucune teinte hors Givre (gris Apple), Sous-bois et Canopée', !extra.length, extra.join(' ') || `${hex.length} valeurs, toutes déclarées`);
  }

  await browser.close(); server.close();
  console.log(failed ? `\n${failed} échec(s)` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
