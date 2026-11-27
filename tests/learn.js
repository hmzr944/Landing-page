/* Arbor 2 : écran « Apprendre une notion » (js/learn.js) dans le navigateur, sur ordinateur et téléphone.
   Démonstration (fiche d'essai fabriquée) et notion avec fiche : ordre des écrans, remède d'une confusion, preuves
   enregistrées sur la notion, refus d'une fiche non validée. Lancer :  node tests/learn.js   (Playwright requis) */
const http = require('http'), fs = require('fs'), path = require('path');
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
const LEVIER = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/fiches/essai-levier.json'), 'utf8'));

function etat(fiche) {
  const leaf = (id, title, extra = {}) => ({ id, title, notes: `${title} : notes.`, explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, children: [], ...extra });
  const root = { id: 'rootlearn01', title: 'Physique', notes: '', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false,
    children: [leaf('nlevier0001', 'Le levier', { fiche }), leaf('nsansfiche1', 'La poulie')] };
  return { subjects: [{ id: 'subjlearn01', title: 'Physique', color: '#3451D1', icon: 'atom', createdAt: 1, updatedAt: Date.now(), root }],
    settings: { theme: 'light', mascot: false, newPerDay: 0 }, stats: { days: {}, calib: {} }, trophies: {}, xp: 0 };
}

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const ref = JSON.parse(JSON.stringify(LEVIER)); ref.meta.statut = 'generee_validee'; ref.meta.origine = 'serveur'; delete ref.meta.essai;
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await ctx.addInitScript((d) => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.clear(); localStorage.setItem('arbor:v1', d); localStorage.setItem('arbor:onboarded', '1'); } }, JSON.stringify(etat(ref)));
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    const tag = `${w}px`;
    const click = async (sel) => { await page.click(sel); await page.waitForTimeout(150); };
    const eyebrow = () => page.textContent('.learn-stage .learn-eyebrow');

    // Démonstration
    await page.goto(URL0 + '#/apprendre/demo'); await page.waitForSelector('.learn-stage');
    check(`L01 ${tag} démonstration : un exemple concret vient en premier (rien à deviner), étiquetée « fiche d’essai », rien n’est enregistré`, /exemple concret/i.test(await eyebrow()) && !/d’après toi/i.test(await page.textContent('.learn-stage')) && /essai/i.test(await page.textContent('.learn-rail')) && /Rien n’est enregistré/.test(await page.textContent('.learn-rail')));
    await click('[data-learn="sait-pas"]');
    check(`L02 ${tag} « je découvre » → explication simple`, /simple/i.test(await eyebrow()));
    await click('[data-learn="next"]');
    check(`L02b ${tag} puis un exemple résolu pas à pas, avant toute question (R7)`, /exemple résolu/i.test(await eyebrow()) && !(await page.$('[data-learn="choix"]')));
    await click('[data-learn="next"]');
    await click('[data-learn="choix"][data-i="1"]'); // lq1 : choix porteur de la confusion c1
    check(`L03 ${tag} erreur portant une confusion : la confusion est nommée`, /confusion fréquente/.test(await page.textContent('.learn-fb')));
    await click('[data-learn="next"]');
    check(`L04 ${tag} puis son remède (contre-exemple) et la raison affichée`, /contre-exemple/i.test(await eyebrow()) && /défaire la confusion/.test(await page.textContent('.learn-why')));

    // Notion avec fiche validée : les preuves sont enregistrées sur la notion
    await page.goto(URL0 + '#/s/subjlearn01/nlevier0001'); await page.waitForTimeout(500);
    check(`L05 ${tag} la fiche d’une notion qui a un parcours propose « Apprendre cette notion »`, await page.isVisible('.learn-cta'));
    await click('.learn-cta'); await page.waitForSelector('.learn-stage');
    await click('[data-learn="sait"]'); await click('[data-learn="next"]');
    let garde = 0;
    while (garde++ < 30) {
      if (await page.$('.learn-fb')) { await click('[data-learn="next"]'); continue; }
      const good = await page.$$eval('[data-learn="choix"]', () => null).catch(() => null);
      if (await page.$('[data-learn="choix"]')) {
        const i = await page.evaluate(() => { const q = document.querySelector('.learn-q').textContent; const f = JSON.parse(localStorage.getItem('arbor:v1')).subjects[0].root.children[0].fiche;
          const all = [...Object.values(f.questions).flat(), ...f.confusions.map((c) => c.controle)]; const it = all.find((x) => x.q === q); return it.choix.findIndex((c) => c.juste); });
        await click(`[data-learn="choix"][data-i="${i}"]`); continue;
      }
      if (await page.$('.learn-sum')) break;
      if (await page.$('[data-learn="next"]')) { await click('[data-learn="next"]'); continue; }
      break;
    }
    check(`L06 ${tag} parcours complet : bilan « appliquée et transférée »`, /appliquée et transférée/.test(await page.textContent('.learn-stage')));
    const ev = await page.evaluate(() => JSON.parse(localStorage.getItem('arbor:v1')).subjects[0].root.children[0].ev);
    check(`L07 ${tag} preuves enregistrées sur la notion : application et transfert du jour`, !!(ev && ev.app && ev.app.length === 1 && ev.tr && ev.tr.length === 1), JSON.stringify(ev));

    // Notion sans fiche : mode lecture annoncé, aucun parcours inventé
    await page.goto(URL0 + '#/apprendre/subjlearn01/nsansfiche1'); await page.waitForTimeout(500);
    check(`L08 ${tag} notion sans fiche : pas de parcours, « mode lecture » expliqué`, /mode lecture/.test(await page.textContent('#app')) && !(await page.$('.learn-stage')));
    // Fiche non validée (brouillon) : refusée
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('arbor:v1')); s.subjects[0].root.children[0].fiche.meta.statut = 'brouillon'; localStorage.setItem('arbor:v1', JSON.stringify(s)); });
    await page.goto(URL0 + '#/'); await page.reload(); await page.goto(URL0 + '#/apprendre/subjlearn01/nlevier0001'); await page.waitForTimeout(600);
    check(`L09 ${tag} fiche en brouillon : jamais servie`, !(await page.$('.learn-stage')));
    if (w > 1000) {
      const box = await page.evaluate(() => { const t = document.querySelector('.topbar').getBoundingClientRect(); return { w: t.width, h: t.height }; });
      check(`L10 ${tag} Student sur ordinateur : barre latérale à gauche (pleine hauteur)`, box.w < 260 && box.h >= 890, JSON.stringify(box));
    }
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`L11 ${tag} aucun défilement horizontal`, over <= 0, String(over));
    check(`L12 ${tag} aucune erreur JavaScript`, !errors.length, errors.join(' | '));
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
