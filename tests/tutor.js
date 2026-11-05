/* Prototype pédagogique : dialogue avec Pousse, de bout en bout, avec un serveur Supabase simulé.
   Scénario : connexion → première question → réponse confuse → confusion nommée, citation, activité corrective,
   notion « fragile », révision avancée → bonne réponse → confusion réparée. Puis Enseigne-moi et les cas d'erreur.
   Lancer depuis la racine du dépôt :  node tests/tutor.js   (Playwright requis, voir README). */
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
const D = 86400000, now = Date.now();
const leaf = (id, title, notes, extra = {}) => ({ id, title, notes, explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, children: [], ...extra });
function sample() {
  const ip = leaf('tuip0000001', 'Adresse IP', "Une adresse IP identifie une interface du réseau. L'adresse IP est codée sur 32 bits, en notation décimale pointée.", { src: { pages: [1], quote: 'Une adresse IP identifie une interface du réseau.', doc: 'tcpip.pdf' } });
  const mask = leaf('tumask00001', 'Masque de sous-réseau', "Le masque désigne le nombre de bits constituant l'identifiant de réseau dans l'adresse IP. On obtient l'adresse du réseau par un et logique entre l'adresse IP et le masque.",
    { src: { pages: [3], quote: "Le masque désigne le nombre de bits constituant l'identifiant de réseau", doc: 'tcpip.pdf' }, srs: { s: 6, d: 5, last: now - 2 * D, due: now + 5 * D, reps: 2, lapses: 0, lastG: 3 } });
  const ch = { id: 'tuchap00001', title: 'Adressage', notes: '', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, children: [ip, mask] };
  const root = { id: 'turoot00001', title: 'Protocoles TCP-IP', notes: '', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, children: [ch] };
  return { subjects: [{ id: 'tusubj00001', title: 'Protocoles TCP-IP', color: '#3451D1', icon: 'code', createdAt: 1, updatedAt: 5, root }], settings: { theme: 'light', mascot: false }, stats: { days: {}, calib: {} }, trophies: {}, xp: 0 };
}
const SB = 'https://nnqtgwgwalbbhqzceged.supabase.co';
const tutorReplies = [];
const reply = (o) => ({ reply: '', verdict: 'sans_reponse', misconception: '', hint_level: 0, citations: [], citations_dropped: 0, correct_points: [], missing: [], done: false, next_activity: 'continuer', usage: { used: 1, limit: 60 }, ...o });

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  await ctx.addInitScript((d) => { try { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.clear(); localStorage.setItem('arbor:v1', d); } } catch (e) { /* about:blank */ } }, JSON.stringify(sample()));
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const sent = []; // requêtes reçues par le « serveur »
  let mode = 'normal';
  await page.route(`${SB}/**`, async (route) => {
    const r = route.request(); const u = new URL(r.url());
    const body = r.postData() ? JSON.parse(r.postData()) : null;
    sent.push({ path: u.pathname, headers: r.headers(), body });
    const ok = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(data) });
    if (u.pathname === '/auth/v1/otp') return ok({});
    if (u.pathname === '/auth/v1/verify') return body.token === '123456' ? ok({ access_token: 'jwt-test', refresh_token: 'rt', expires_in: 3600, user: { email: body.email } }) : ok({ msg: 'Token has expired or is invalid' }, 403);
    if (u.pathname === '/functions/v1/tutor') {
      if (mode === 'quota') return ok({ error: 'quota', used: 60, limit: 60 }, 429);
      if (mode === 'auth') return ok({ error: 'connexion requise' }, 401);
      return ok(tutorReplies.shift() || reply({ reply: 'Continue.' }));
    }
    return ok({});
  });
  const settle = (ms = 600) => page.waitForTimeout(ms);
  const st = () => page.evaluate(() => JSON.parse(localStorage.getItem('arbor:v1')));
  const mask = async () => (await st()).subjects[0].root.children[0].children[1];

  /* A. Connexion depuis le dialogue */
  await page.goto(`${URL0}#/s/tusubj00001/tumask00001/fiche`); await settle(1000);
  check('A1 la fiche d’une notion propose de pratiquer avec Pousse', !!(await page.$('.practice-card [data-mode="socratique"]')));
  await page.click('.practice-card [data-mode="socratique"]'); await settle(500);
  check('A2 sans compte, le dialogue demande de se connecter et explique ce qui est envoyé', /Connecte-toi/.test(await page.textContent('.dlg')) && /ne sont pas conservés/.test(await page.textContent('.dlg')));
  await page.fill('#dlgEmail', 'etudiant@exemple.fr'); await page.click('[data-dlg="send-link"]'); await settle(400);
  check('A3 le lien est demandé à Supabase, avec retour vers le site', sent.some((x) => x.path === '/auth/v1/otp' && x.body.email === 'etudiant@exemple.fr'));
  await page.fill('#dlgCode', '000000'); await page.click('[data-dlg="verify"]'); await settle(300);
  check('A4 un code faux affiche une erreur claire', /Code incorrect/.test(await page.textContent('.dlg-err')));
  tutorReplies.push(reply({ reply: 'Quand ton PC compare son adresse à celle de 10.0.0.5, à quoi sert le masque ?' }));
  await page.fill('#dlgCode', '123456'); await page.click('[data-dlg="verify"]'); await settle(700);
  const first = sent.find((x) => x.path === '/functions/v1/tutor');
  check('A5 connecté : Pousse pose la première question', /à quoi sert le masque/.test(await page.textContent('.dlg-feed')));
  check('A6 la requête porte le jeton de l’étudiant et les passages du cours (avec la page), jamais de clé Claude',
    first && first.headers.authorization === 'Bearer jwt-test' && first.body.passages.some((p) => p.page === 3 && /identifiant de réseau/.test(p.text)) && !JSON.stringify(sent).includes('sk-ant'), JSON.stringify(first && first.body.passages[0]));
  check('A7 le tuteur connaît le prérequis tiré du graphe', first && first.body.learner.prerequisites.includes('Adresse IP'), JSON.stringify(first && first.body.learner));

  /* B. Réponse confuse : confusion, citation, activité corrective, notion fragile, révision avancée */
  const dueBefore = (await mask()).srs.due;
  tutorReplies.push(reply({ reply: 'Le masque n’envoie rien : il sert à comparer. Que dit ton cours ?', verdict: 'faux', misconception: 'confond masque et passerelle', next_activity: 'revoir_prerequis',
    citations: [{ passage: 1, page: 3, quote: "le nombre de bits constituant l'identifiant de réseau" }] }));
  await page.fill('#dlgInput', 'Le masque envoie le paquet vers le bon réseau.'); await page.keyboard.press('Enter'); await settle(800);
  const feed = await page.textContent('.dlg-feed');
  check('B1 la réponse reçoit son verdict', !!(await page.$('.dlg-verdict.v-faux')));
  check('B2 la citation du cours s’affiche avec sa page', /p\. 3 · « le nombre de bits/.test(feed));
  check('B3 la confusion est nommée, avec une activité corrective vers le prérequis', /Confusion repérée : confond masque et passerelle/.test(feed) && !!(await page.$('.corrective a[href*="tuip0000001"]')));
  await page.click('[data-dlg="reread"]'); await settle(200);
  check('B4 « Relire le passage » montre le texte du cours', /Cours, p\. 3/.test(await page.textContent('.dlg-passage')));
  const m1 = await mask();
  const obs = await page.evaluate(() => Obs.byNotion('tumask00001'));
  check('B5 l’observation est journalisée avec la confusion', obs.length === 1 && obs[0].activity === 'socratique' && obs[0].outcome === 'faux' && obs[0].misconception === 'confond masque et passerelle', JSON.stringify(obs[0]));
  const s1 = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('arbor:v1')).subjects[0]; const x = Mastery.notions(s).find((y) => y.n.id === 'tumask00001'); return [x.state, Mastery.reasonOf(x.n, x.state)]; });
  check('B6 la notion devient « fragile » et en donne la raison', s1[0] === 'fragile' && /confond masque et passerelle/.test(s1[1]), JSON.stringify(s1));
  check('B7 une révision est programmée plus tôt (dans les 12 heures)', m1.srs.due < dueBefore && m1.srs.due <= Date.now() + 12 * 3600 * 1000 + 1000);

  /* C. Bonne réponse : la confusion est réparée, fin du dialogue */
  tutorReplies.push(reply({ reply: 'Exactement : le masque sépare la partie réseau de la partie machine. Bravo !', verdict: 'juste', done: true, next_activity: 'terminer' }));
  await page.fill('#dlgInput', 'Il indique quels bits de l’adresse désignent le réseau, pour savoir si la destination est locale.'); await page.keyboard.press('Enter'); await settle(800);
  check('C1 bonne réponse : verdict « juste » et fin du dialogue avec l’état de la notion', !!(await page.$('.dlg-verdict.v-juste')) && /État de la notion/.test(await page.textContent('.dlg-feed')));
  const s2 = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('arbor:v1')).subjects[0]; return Mastery.notions(s).find((y) => y.n.id === 'tumask00001').state; });
  check('C2 la confusion est réparée : la notion n’est plus fragile', s2 !== 'fragile', s2);
  check('C3 l’historique de l’échange est envoyé au tour suivant', sent.filter((x) => x.path === '/functions/v1/tutor').slice(-1)[0].body.history.some((h) => /envoie le paquet/.test(h.text)));
  await page.click('[data-dlg="close"]'); await settle(400);

  /* D. Enseigne-moi */
  await page.click('.practice-card [data-mode="enseigne"]'); await settle(400);
  check('D1 Enseigne-moi commence sans appel (consigne locale)', /Explique « Masque de sous-réseau »/.test(await page.textContent('.dlg-feed')));
  tutorReplies.push(reply({ reply: 'Bon début ! Que se passe-t-il quand on fait le et logique ?', verdict: 'partiel', correct_points: ['Le masque sert à identifier le réseau'], missing: ['Le et logique entre adresse et masque donne l’adresse du réseau'] }));
  await page.fill('#dlgInput', 'Le masque sert à savoir quel est le réseau.'); await page.keyboard.press('Enter'); await settle(800);
  const t2 = await page.textContent('.dlg-feed');
  check('D2 retour précis : ce qui est juste et ce qui manque', /Juste/.test(t2) && /À compléter/.test(t2) && /et logique/.test(t2));
  await page.click('.ls-close'); await settle(400);

  /* E. Erreurs : quota, hors ligne, session expirée */
  mode = 'quota';
  await page.click('.practice-card [data-mode="socratique"]'); await settle(700);
  check('E1 quota atteint : message clair, révisions toujours disponibles', /échanges avec Pousse ce mois-ci/.test(await page.textContent('.dlg-feed')));
  await page.click('.ls-close'); await settle(300);
  mode = 'normal'; await ctx.setOffline(true);
  await page.click('.practice-card [data-mode="socratique"]'); await settle(500);
  check('E2 hors ligne : le tuteur l’explique, sans planter', /Pas de connexion internet/.test(await page.textContent('.dlg-feed')));
  await ctx.setOffline(false); await page.click('.ls-close'); await settle(300);
  mode = 'auth';
  await page.click('.practice-card [data-mode="socratique"]'); await settle(700);
  check('E3 session expirée : retour au formulaire de connexion', /session a expiré/.test(await page.textContent('.dlg-feed')));
  await page.click('.ls-close'); await settle(300);

  /* F. Retour par le lien e-mail */
  await page.goto('about:blank');
  await page.goto(`${URL0}#access_token=jwt-lien&refresh_token=rt2&expires_in=3600&token_type=bearer&type=magiclink`); await settle(1200);
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem('arbor:auth')));
  check('F1 le lien e-mail connecte l’étudiant et nettoie l’adresse', auth && auth.access_token === 'jwt-lien' && (await page.evaluate(() => location.hash)) === '#/');
  check('F2 aucune erreur JavaScript', errors.length === 0, errors.join(' | '));

  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
