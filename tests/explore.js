/* Tests de la phase 3 : analyse du cours (liens, difficulté, objectifs, thèmes) et carte d'exploration.
   Lancer depuis la racine du dépôt :  node tests/explore.js   (Playwright requis, voir README). */
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

let k = 0;
const node = (title, notes = '', children = [], extra = {}) => ({ id: `node${String(++k).padStart(7, '0')}`, title, notes, explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, children, ...extra });
function sample() {
  const ip = node('Adressage IP', "Une adresse IP identifie une machine sur un réseau. L'adresse IP comporte une partie réseau et une partie hôte, séparées grâce au masque. On distingue IPv4 et IPv6, et les adresses privées des adresses publiques routées sur Internet.");
  const dhcp = node('DNS et DHCP', "Le serveur DHCP attribue automatiquement une adresse IP à chaque poste du réseau. Le DNS traduit les noms de domaine en adresses. Sans DHCP, chaque poste doit être configuré à la main, ce qui provoque des conflits d'adresses.");
  const vlan = node('Switch et VLAN', 'Un switch relie les postes. Un VLAN sépare logiquement le réseau.');
  const ad = node('Créer un domaine', "Un domaine Active Directory s'appuie sur le DNS : chaque contrôleur de domaine enregistre ses services dans le DNS, et les postes trouvent le domaine grâce au DNS. Un DNS mal configuré empêche de joindre le domaine.");
  const audit = node('Faire un audit simple', '');
  const fw = node('Configurer le pare-feu', '');
  const m1 = node('Maîtriser les bases réseau', '', [ip, dhcp, vlan], { module: { pretest: '', learned: false, generated: true, sources: [], date: '2026-01-01' } });
  const m2 = node('Windows Server et Active Directory', '', [ad], { module: { pretest: '', learned: false, generated: true, sources: [], date: '2026-01-02' } });
  const m3 = node('Sécurité', '', [audit, fw], { module: { pretest: '', learned: false, generated: true, sources: [], date: '2026-01-03' } });
  const root = node('TSSR', '', [m1, m2, m3]);
  return { ids: { ip: ip.id, dhcp: dhcp.id, ad: ad.id, m1: m1.id, root: root.id }, state: { subjects: [{ id: 'subjexpl001', title: 'TSSR', color: '#3451D1', icon: 'code', createdAt: 1, updatedAt: 5, program: true, root }], settings: { theme: 'light', mascot: false }, stats: { days: {}, calib: {} }, trophies: {}, xp: 0 } };
}

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const { ids, state } = sample();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  await ctx.addInitScript((d) => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.clear(); localStorage.setItem('arbor:v1', d); } }, JSON.stringify(state));
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL0); await page.waitForTimeout(800);

  /* A. Analyse */
  const a = await page.evaluate((ids) => {
    const st = JSON.parse(localStorage.getItem('arbor:v1')); const s = st.subjects[0];
    const A = Insight.analyze(s);
    const name = (id) => A.byId.get(id).title;
    return {
      dhcpPre: A.rel.get(ids.dhcp).pre.map((x) => [name(x.id), x.why]),
      adPre: A.rel.get(ids.ad).pre.map((x) => name(x.id)),
      ipNext: A.rel.get(ids.ip).next.map((x) => name(x.id)),
      themes: A.zones.map((z) => z.theme.k),
      objectives: A.zones.flatMap((z) => z.objectives),
      emptyDiff: A.zones[2].difficulty,
      zoneNeeds: A.zones[1].needs,
    };
  }, ids);
  check('A1 « DNS et DHCP » s’appuie sur « Adressage IP », avec les mots qui le justifient', a.dhcpPre.some(([t, why]) => t === 'Adressage IP' && why.includes('IP')), JSON.stringify(a.dhcpPre));
  check('A2 « Créer un domaine » s’appuie sur « DNS et DHCP » (autre chapitre)', a.adPre.includes('DNS et DHCP'), JSON.stringify(a.adPre));
  check('A3 le lien inverse « prépare à » existe', a.ipNext.includes('DNS et DHCP'));
  check('A4 la zone 2 dépend de la zone 1', JSON.stringify(a.zoneNeeds) === '[0]', JSON.stringify(a.zoneNeeds));
  check('A5 thèmes visuels détectés : réseau, systèmes, sécurité', JSON.stringify(a.themes) === '["network","system","security"]', JSON.stringify(a.themes));
  check('A6 objectifs formulés à partir des titres', a.objectives.includes('Savoir faire un audit simple') && a.objectives.includes('Savoir configurer le pare-feu') && a.objectives.includes('Expliquer ce qu’est « Adressage IP »'), a.objectives.join(' | '));
  check('A7 pas de difficulté inventée pour un chapitre sans texte', a.emptyDiff === 0);
  check('A8 aucun lien sans mot commun (Switch et VLAN isolé)', await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('arbor:v1')).subjects[0]; const A = Insight.analyze(s); const v = [...A.byId.values()].find((n) => n.title === 'Switch et VLAN'); const r = A.rel.get(v.id); return !r.pre.length && !r.next.length; }));

  /* B. Carte */
  await page.goto(`${URL0}#/s/subjexpl001/${ids.root}/carte`); await page.waitForTimeout(900);
  check('B1 trois zones affichées, dans l’ordre du cours', (await page.$$eval('.zone h3', (e) => e.map((x) => x.textContent.trim()))).join('|') === 'Maîtriser les bases réseau|Windows Server et Active Directory|Sécurité');
  check('B2 la première zone est recommandée (prochaine leçon)', await page.$eval('.zone[data-z="0"]', (e) => e.classList.contains('reco')));
  await page.click(`.xn[data-id="${ids.ad}"]`); await page.waitForTimeout(400);
  const panel = await page.textContent('.xpanel');
  check('B3 toucher une notion ouvre son détail avec ses prérequis', /Créer un domaine/.test(panel) && /S’appuie sur/.test(panel) && /DNS et DHCP/.test(panel), panel.replace(/\s+/g, ' ').slice(0, 120));
  check('B4 le prérequis est mis en évidence et relié par une ligne', (await page.getAttribute(`.xn[data-id="${ids.dhcp}"]`, 'data-rel')) === 'pre' && (await page.$$('.xlinks path')).length >= 1);
  await page.click('.xpanel .xn-link'); await page.waitForTimeout(400);
  check('B5 on navigue de prérequis en prérequis', /DNS et DHCP/.test(await page.textContent('.xpanel h3')));
  await page.click('.zone[data-z="0"] [data-act=start-lesson]'); await page.waitForTimeout(600);
  check('B6 le bouton Leçon d’une zone lance la leçon', !!(await page.$('.lesson')));
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await page.click('[data-act=map-tree]'); await page.waitForTimeout(400);
  check('B7 on peut revenir à l’arbre complet', !!(await page.$('.mindmap')));
  await page.click('[data-act=map-zones]'); await page.waitForTimeout(400);
  check('B8 et repasser aux zones', !!(await page.$('.zone')));

  /* C. Mobile */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check('C1 pas de défilement horizontal sur mobile', overflow <= 1, `${overflow}px`);
  check('C2 aucune erreur JavaScript', errors.length === 0, errors.join(' | '));

  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
