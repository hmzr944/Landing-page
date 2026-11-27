/* Arbor Learning universel, de bout en bout dans le navigateur (serveur et Wikipédia SIMULÉS) :
   Explorer (une question) → source ouverte réelle (simulée ici) → fiche écrite par le serveur → contrôle par le
   validateur → parcours guidé ; fiche défaillante reprise une fois puis refusée ; compagnon sourcé ; transmission.
   Lancer :  node tests/universel.js   (Playwright requis) */
const http = require('http'), fs = require('fs'), path = require('path');
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
const LEVIER = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/fiches/essai-levier.json'), 'utf8'));
const WIKI = { query: { pages: { 1: { title: 'Levier', fullurl: 'https://fr.wikipedia.org/wiki/Levier', extract: `${LEVIER.sources[0].extrait} Le point d’appui est aussi appelé pivot. Plus le bras de levier est long, moins l’effort à fournir est grand. On distingue trois genres de leviers selon la position du point d’appui, de la force et de la charge.` } } } };
// fiche renvoyée par le serveur simulé : la fiche d'essai, en v2, brouillon d'origine serveur, sources = le passage reçu
const ficheServeur = (passages, casse) => {
  const f = JSON.parse(JSON.stringify(LEVIER));
  f.format = 'fiche-v2'; delete f.meta.essai; f.meta.origine = 'serveur'; f.meta.statut = 'brouillon';
  const p = passages[0];
  f.sources = [{ id: p.id, titre: p.titre, url: p.url, licence: p.licence, extrait: LEVIER.sources[0].extrait }];
  ['simple', 'standard'].forEach((n) => { f.explication[n].sources = [p.id]; });
  if (casse) f.situation.texte += ' Samir utilise donc un levier.'; // V-ordre-01 : la situation nomme la notion
  return f;
};

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const open = async (opts = {}) => {
    M.state.reset();
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await ctx.addInitScript(...M.init('bob'));
    await ctx.addInitScript(() => { if (!sessionStorage.getItem('u')) { sessionStorage.setItem('u', 1); localStorage.setItem('arbor:onboarded', '1'); localStorage.setItem('arbor:v1', JSON.stringify({ subjects: [], settings: { theme: 'light', mascot: false }, stats: { days: {}, calib: {} }, trophies: {}, xp: 0 })); } });
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    const calls = [];
    await page.route('**/fr.wikipedia.org/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(WIKI) }));
    await page.route(`${M.SB}/**`, (route) => {
      const r = route.request();
      if (r.url().endsWith('/functions/v1/tutor')) {
        const b = JSON.parse(r.postData() || '{}'); calls.push(b);
        if (b.task === 'fiche_rediger') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ fiche: ficheServeur(b.passages, opts.casse), usage: { used: 1, limit: 150 } }) });
        if (b.task === 'compagnon') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(opts.compagnon(b)) });
      }
      return route.fulfill(M.handle(r));
    });
    return { ctx, page, errors, calls };
  };

  { // 1. Une question → parcours guidé construit et servi
    const { ctx, page, errors, calls } = await open();
    await page.goto(URL0 + '#/explorer'); await page.waitForTimeout(800);
    await page.fill('#exStart input[name="q"]', 'Comment fonctionne un levier ?');
    await page.selectOption('#exStart select[name="niveau"]', 'intermediaire');
    await page.selectOption('#exStart select[name="intention"]', 'examen');
    await page.click('#exStart button'); await page.waitForTimeout(800);
    check('U01 Explorer : une question devient un domaine et mène à la construction de son parcours', /#\/apprendre\//.test(page.url()) && !!(await page.$('#buildForm')));
    check('U02 le niveau et l’intention choisis sont repris', (await page.inputValue('#buildForm select[name="niveau"]')) === 'intermediaire' && (await page.inputValue('#buildForm select[name="intention"]')) === 'examen');
    await page.click('#buildForm button'); await page.waitForSelector('.learn-stage', { timeout: 15000 }).catch(() => {});
    const b = calls.find((c) => c.task === 'fiche_rediger') || {};
    check('U03 sans document : une source ouverte réelle est envoyée avec son adresse (aucune source inventée)', (b.passages || []).length > 0 && b.passages.every((p) => p.url === 'https://fr.wikipedia.org/wiki/Levier' && /CC BY-SA/.test(p.licence)), JSON.stringify((b.passages || [])[0] || {}).slice(0, 160));
    check('U04 la demande porte le niveau, l’intention et la question de départ', b.niveau === 'intermediaire' && b.intention === 'examen' && /levier/i.test(b.question || ''));
    check('U05 fiche contrôlée par le validateur puis servie : le parcours commence par un exemple concret', /exemple concret/i.test(await page.textContent('.learn-stage .learn-eyebrow').catch(() => '')));
    await page.waitForTimeout(800);
    const st = await page.evaluate(() => { const ss = JSON.parse(localStorage.getItem('arbor:v1')).subjects; const s = ss.find((x) => x.root && x.root.fiche) || ss[0]; return [s.root.fiche ? s.root.fiche.meta.statut : null, s.root.fiche ? s.root.fiche.meta.origine : null, s.profil ? s.profil.intention : null]; });
    check('U06 la fiche est enregistrée « générée et vérifiée », d’origine serveur, avec le profil d’apprentissage', JSON.stringify(st) === JSON.stringify(['generee_validee', 'serveur', 'examen']), JSON.stringify(st));
    check('U07 aucune erreur JavaScript', !errors.length, errors.join(' | '));
    await ctx.close();
  }
  { // 2. Fiche défaillante : reprise une fois avec les défauts, puis refusée
    const { ctx, page, calls } = await open({ casse: true });
    await page.goto(URL0 + '#/explorer'); await page.waitForTimeout(800);
    await page.fill('#exStart input[name="q"]', 'Le levier'); await page.click('#exStart button'); await page.waitForTimeout(800);
    await page.click('#buildForm button'); await page.waitForTimeout(2500);
    const fc = calls.filter((c) => c.task === 'fiche_rediger');
    check('U08 fiche défaillante : renvoyée une fois au serveur avec ses défauts (V-ordre-01)', fc.length === 2 && (fc[1].retour || []).some((x) => /V-ordre-01/.test(x)), JSON.stringify(fc.map((c) => c.retour || [])).slice(0, 200));
    check('U09 toujours défaillante : refusée, jamais servie, et l’écran le dit', !(await page.$('.learn-stage')) && /ne passe pas les contrôles/.test(await page.textContent('#buildMsg')));
    await ctx.close();
  }
  { // 3. Compagnon : réponse sourcée, puis information absente
    const subj = { subjects: [{ id: 'subjunivers1', title: 'Physique', color: '#3451D1', icon: 'atom', createdAt: 1, updatedAt: Date.now(), root: { id: 'rootunivers1', title: 'Physique', notes: '', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false,
      children: [{ id: 'nlevierunv01', title: 'Le levier', notes: `${LEVIER.sources[0].extrait} Plus le bras de levier est long, moins l’effort est grand.`, explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, children: [] }] } }], settings: { theme: 'light', mascot: false }, stats: { days: {}, calib: {} }, trophies: {}, xp: 0 };
    let mode = 'ok';
    const { ctx, page, calls } = await open({ compagnon: (b) => (mode === 'ok'
      ? { repond: true, reponse: 'Le levier multiplie une force grâce au point d’appui.', citations: [{ passage: b.passages[0].id, extrait: LEVIER.sources[0].extrait }], absent: '', exercice: 'Où placer la cale ?', attendu: 'Près de la charge', approfondir: ['Moment d’une force'], usage: {} }
      : { repond: false, reponse: '', citations: [], absent: 'Tes cours ne parlent pas de l’histoire du levier.', exercice: '', attendu: '', approfondir: [], usage: {} }) });
    await page.goto(URL0 + '#/compagnon/levier'); await page.waitForTimeout(500);
    await page.evaluate((d) => { localStorage.setItem('arbor:v1', d); }, JSON.stringify(subj));
    await page.reload(); await page.waitForTimeout(800);
    await page.click('#cpIA'); await page.waitForTimeout(800);
    const t = (await page.textContent('#cpAnswer')).replace(/\s+/g, ' ');
    const sent = calls.find((c) => c.task === 'compagnon') || {};
    check('U10 compagnon : seuls les passages des cours sont envoyés, avec un contexte d’apprentissage', (sent.passages || []).length > 0 && /notion/.test(sent.contexte || ''));
    check('U11 réponse sourcée : citation reliée à sa notion, exercice et piste d’approfondissement', /Physique › Le levier/.test(t) && /Où placer la cale/.test(t) && /Moment d’une force/.test(t), t.slice(0, 200));
    mode = 'absent';
    await page.goto(URL0 + '#/compagnon/histoire%20du%20levier'); await page.waitForTimeout(600);
    await page.click('#cpIA'); await page.waitForTimeout(800);
    check('U12 information absente des sources : dite clairement, avec une suite (ajouter une source)', /Information absente de tes sources/.test(await page.textContent('#cpAnswer')) && /Explorer/.test(await page.textContent('#cpAnswer')));
    await ctx.close();
  }
  { // 4. Transmission : soumise par un membre, relue par une experte ; jamais validée par son auteur
    M.state.reset();
    const run = async (who, fn) => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
      await ctx.addInitScript(...M.init(who));
      const page = await ctx.newPage();
      await page.route(`${M.SB}/**`, (route) => route.fulfill(M.handle(route.request())));
      await page.goto(`${URL0}#/org/${M.ORG}/transmission`); await page.waitForTimeout(1400);
      await fn(page); await ctx.close();
    };
    await run('bob', async (page) => {
      check('U13 collaborateur : « Transmettre » dans sa navigation ; sa transmission en attente est visible, sans bouton de validation', !!(await page.$('.org-tabs a[href$="/transmission"]')) && /Choisir la taille d’un vélo/.test(await page.textContent('#app')) && !(await page.$('[data-dec]')));
      await page.fill('#tmForm [name="titre"]', 'Accueillir un client pressé');
      await page.fill('#tmForm [name="situation"]', 'Un client entre cinq minutes avant la fermeture.');
      await page.fill('#tmForm [name="etapes"]', 'Le saluer\nDemander ce qu’il cherche\nProposer de revenir si besoin');
      await page.click('#tmForm button'); await page.waitForTimeout(900);
      check('U14 soumise : elle apparaît « À relire », pas dans les savoir-faire partagés', /Accueillir un client pressé/.test(await page.textContent('.dbento .b-card:nth-child(2)')) && !/Accueillir un client pressé/.test(await page.textContent('.dbento .b-card:nth-child(3)')));
    });
    await run('paul', async (page) => {
      check('U15 experte : la file « À relire » contient les transmissions des autres', (await page.$$('[data-dec="validee"]')).length === 2);
      await page.click('[data-dec="rejetee"]'); await page.waitForTimeout(400);
      check('U16 un rejet sans note est refusé', (await page.$$('[data-dec="validee"]')).length === 2);
      await page.click('[data-dec="validee"]'); await page.waitForTimeout(1200);
      check('U17 validée : statut et relectrice conservés, elle rejoint les savoir-faire partagés', /relue par paul/.test(await page.textContent('.dbento .b-card:nth-child(3)')));
    });
  }
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})();
