/* Tests de sûreté des données d'Arbor (phase 1).
   Lancer depuis la racine du dépôt :  node tests/data-safety.js
   Prérequis : Playwright (npm i -D playwright && npx playwright install chromium).
   Le script sert lui-même les fichiers du dépôt sur un port libre ; aucun réseau externe n'est nécessaire
   pour les vérifications (les polices et icônes distantes peuvent échouer sans effet). */
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
const KEY = 'arbor:v1';

// Un état réaliste : un sujet, une leçon faite, une source piégée, des stats
function sampleState() {
  const leaf = { id: 'leafaaaaaa1', title: 'Hyperviseur', notes: 'Un hyperviseur est un logiciel qui fait tourner des machines virtuelles.', explain: '', keyPoints: ['Type 1 et type 2'], exercises: [], srs: { s: 30, d: 4, last: Date.now() - 86400000, due: Date.now() + 20 * 86400000, reps: 3, lapses: 0 }, status: 'done', collapsed: false, children: [], course: { from: 'local', sources: [{ title: 'Piège', url: 'javascript:alert(1)' }, { title: 'Wikipédia', url: 'https://fr.wikipedia.org/wiki/Hyperviseur' }] } };
  const mod = { id: 'modaaaaaaa1', title: 'Virtualisation', notes: '', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, children: [leaf], module: { pretest: '', learned: true, generated: true, sources: [], date: null, lessonDone: { at: 1, good: 3, asked: 4 } } };
  const root = { id: 'rootaaaaaa1', title: 'TSSR', notes: '', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, children: [mod] };
  return { subjects: [{ id: 'subjaaaaaa1', title: 'TSSR', color: '#3451D1', icon: 'code', createdAt: 1, updatedAt: 1000, root }], settings: { apiKey: 'sk-ant-secret-test', theme: 'light' }, stats: { days: { '2026-11-01': { reviews: 12, newCards: 2, correct: 10, focusMin: 25 } }, calib: {}, bestStreak: 4 }, trophies: { reviews: { tier: 0, at: 1 } }, xp: 321 };
}

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const errors = [];
  async function fresh(init) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true, serviceWorkers: 'block' });
    if (init) await ctx.addInitScript(init.fn, init.arg);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    return { ctx, page };
  }
  const settle = (page, ms = 900) => page.waitForTimeout(ms);

  /* A. Données illisibles : jamais écrasées, mises de côté, et l'étudiant est prévenu */
  {
    const { ctx, page } = await fresh({ fn: (k) => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.setItem(k, '{"subjects":[{"title":"Mon cours précieux"'); } }, arg: KEY });
    await page.goto(URL0); await settle(page);
    check('A1 une fenêtre explique que les données étaient abîmées', /abîmées/.test(await page.textContent('#modalBody').catch(() => '')));
    await page.click('#rcOk').catch(() => {});
    await page.click('#themeBtn'); await settle(page, 500);
    const rescue = await page.evaluate((k) => localStorage.getItem(k + ':rescue'), KEY);
    check('A2 l’original illisible est gardé à part', !!rescue && rescue.includes('Mon cours précieux'));
    await page.click('#settingsBtn'); await settle(page, 400);
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 3000 }).catch(() => null), page.click('#rescueDl').catch(() => {})]);
    const txt = dl ? fs.readFileSync(await dl.path(), 'utf8') : '';
    check('A3 les données illisibles se téléchargent depuis les Réglages', txt.includes('Mon cours précieux'));
    await ctx.close();
  }

  /* B. Données illisibles + copie de secours de la veille : la copie est rouverte */
  {
    const good = JSON.stringify(sampleState());
    const { ctx, page } = await fresh({ fn: ([k, g]) => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.setItem(k, '{broken'); localStorage.setItem(k + ':bak', g); localStorage.setItem(k + ':bakDay', '2026-11-03'); } }, arg: [KEY, good] });
    await page.goto(URL0); await settle(page);
    check('B1 la copie de secours est rouverte', /copie de secours/.test(await page.textContent('#modalBody').catch(() => '')));
    await page.click('#rcOk').catch(() => {});
    await page.goto(URL0 + '#/cours'); await settle(page, 1500);
    const titles = await page.evaluate(() => [...document.querySelectorAll('#app h2, #app h3, #app a')].map((e) => e.textContent).join(' '));
    check('B2 le cours de la copie est affiché', titles.includes('TSSR'));
    await ctx.close();
  }

  /* C. Stockage plein : bandeau visible, qui disparaît quand l'écriture réussit à nouveau */
  {
    const { ctx, page } = await fresh();
    await page.goto(URL0); await settle(page);
    await page.evaluate(() => { const big = 'x'.repeat(256 * 1024); for (let i = 0; i < 80; i++) { try { localStorage.setItem('fill' + i, big); } catch (e) { break; } } });
    // remplir le dernier octet disponible
    await page.evaluate(() => { let n = 16384; while (n >= 1) { try { localStorage.setItem('fillz' + n + Math.random(), 'x'.repeat(n)); } catch (e) { n = Math.floor(n / 2); } } });
    await page.click('#themeBtn'); await settle(page, 600);
    check('C1 un bandeau prévient que la sauvegarde a échoué', await page.isVisible('#saveAlert'), await page.textContent('#saveAlert').catch(() => 'absent'));
    await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('fill')).forEach((k) => localStorage.removeItem(k)));
    await page.click('#themeBtn'); await settle(page, 600);
    check('C2 le bandeau disparaît quand ça remarche', !(await page.$('#saveAlert')));
    await ctx.close();
  }

  /* D. Sauvegarde complète puis restauration « Tout remplacer » sur un appareil vierge */
  let backupFile = null;
  {
    const st = JSON.stringify(sampleState());
    const { ctx, page } = await fresh({ fn: ([k, v]) => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.setItem(k, v); } }, arg: [KEY, st] });
    await page.goto(URL0); await settle(page);
    check('D0 aucune fenêtre d’alerte sur des données saines', !(await page.isVisible('#modal')));
    await page.click('#settingsBtn'); await settle(page, 400);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#expAll')]);
    backupFile = path.join(require('os').tmpdir(), 'arbor-backup-test.json');
    await dl.saveAs(backupFile);
    const b = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    check('D1 le fichier est une sauvegarde complète', b.format === 'arbor-backup' && !!b.data.stats.days['2026-11-01'] && !!b.data.trophies.reviews && b.data.xp >= 321);
    const savedXp = b.data.xp;
    check('D2 la clé API n’est pas dans le fichier', !JSON.stringify(b).includes('sk-ant-secret-test'));
    await ctx.close();

    const f2 = await fresh();
    await f2.page.goto(URL0); await settle(f2.page);
    await f2.page.setInputFiles('#jsonInput', backupFile); await settle(f2.page, 500);
    await Promise.all([f2.page.waitForNavigation().catch(() => {}), f2.page.click('#rsReplace')]);
    await settle(f2.page);
    const r = await f2.page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
    const mod = r.subjects[0] && r.subjects[0].root.children[0];
    check('D3 restauration : cours, XP, stats et trophées retrouvés', r.subjects.length === 1 && r.subjects[0].id === 'subjaaaaaa1' && r.xp === savedXp && r.stats.bestStreak === 4 && !!r.trophies.reviews);
    check('D4 restauration : la leçon faite et la mémoire sont conservées', !!(mod && mod.module.lessonDone && mod.module.lessonDone.good === 3) && mod.children[0].srs.s === 30);

    /* E. « Ajouter les cours » deux fois : aucun doublon */
    for (let i = 0; i < 2; i++) {
      await f2.page.setInputFiles('#jsonInput', backupFile); await settle(f2.page, 500);
      await f2.page.click('#rsMerge'); await settle(f2.page, 500);
    }
    const n = await f2.page.evaluate((k) => JSON.parse(localStorage.getItem(k)).subjects.filter((s) => s.title === 'TSSR').length, KEY);
    check('E1 importer deux fois le même fichier ne crée pas de doublon', n === 1, `${n} sujet(s) TSSR`);

    /* F. Source piégée en javascript: jamais rendue comme lien */
    await f2.page.goto(`${URL0}#/s/subjaaaaaa1/modaaaaaaa1/fiche`); await settle(f2.page);
    const links = await f2.page.evaluate(() => ({ bad: document.querySelectorAll('a[href^="javascript"]').length, good: document.querySelectorAll('a[href^="https://fr.wikipedia.org"]').length }));
    check('F1 un lien « javascript: » n’est jamais cliquable', links.bad === 0 && links.good >= 1, JSON.stringify(links));

    /* G. Modification juste avant de quitter la page : rien n'est perdu */
    const before = await f2.page.evaluate((k) => JSON.parse(localStorage.getItem(k)).settings.theme, KEY);
    await f2.page.click('#themeBtn');
    await f2.page.reload(); // moins de 150 ms après : seule l'écriture à la fermeture peut la sauver
    const after = await f2.page.evaluate((k) => JSON.parse(localStorage.getItem(k)).settings.theme, KEY);
    check('G1 la dernière modification survit à une fermeture immédiate', before !== after, `${before} → ${after}`);

    /* H. Les écrans principaux s'affichent sans erreur */
    for (const h of ['#/', '#/reviser', '#/methode', '#/trophees', '#/s/subjaaaaaa1/modaaaaaaa1/fiche', '#/s/subjaaaaaa1/modaaaaaaa1/carte']) { await f2.page.goto(URL0 + h); await settle(f2.page, 500); }
    await f2.ctx.close();
  }
  check('H1 aucune erreur JavaScript pendant les tests', errors.length === 0, errors.join(' | '));

  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
