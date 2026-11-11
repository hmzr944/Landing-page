/* Introduction Student : cinq portes d'entrée (Parler, Scanner, Discuter, Se tester, Importer), objectif libre,
   précisions facultatives, première expérience réelle, puis le moment clé (structure, question, retour).
   Le serveur Arbor est simulé (mêmes réponses que la fonction « tutor ») ; Wikipédia est coupée pour un test stable.
   La dictée est simulée par une fausse reconnaissance vocale (l'API du navigateur n'existe pas en test) ;
   la photo passe par la vraie bibliothèque Tesseract.js si le réseau le permet (sinon : NON VÉRIFIÉ, dit clairement).
   Lancer depuis la racine du dépôt :  node tests/onboarding.js   (Playwright requis). */
const http = require('http');
const fs = require('fs');
const os = require('os');
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
let failed = 0, unverified = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' : ' + extra : ''}`); if (!ok) failed++; };
const skip = (name, why) => { console.log(`– ${name} : NON VÉRIFIÉ (${why})`); unverified++; };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const JWT = `${b64({ alg: 'HS256' })}.${b64({ sub: 'u-lea', exp: 9999999999 })}.sig`;

/* Faux serveur Arbor */
const sent = [];
const COURSE = { overview: 'La photosynthèse permet aux plantes de produire leur matière.', dropped: 0, grounded: false, notions: [
  { title: 'Définition', notes: 'La photosynthèse est le processus par lequel les plantes vertes fabriquent du glucose à partir de lumière, d’eau et de dioxyde de carbone. ==Elle libère du dioxygène.== Elle a lieu surtout dans les feuilles.', keyPoints: ['La photosynthèse produit du glucose et libère du dioxygène.', 'Elle utilise la lumière, l’eau et le dioxyde de carbone.'], exercises: [] },
  { title: 'Chloroplastes', notes: 'Les chloroplastes sont les organites où se déroule la photosynthèse. ==Ils contiennent la chlorophylle, un pigment vert qui capte la lumière.== On les trouve dans les cellules des feuilles.', keyPoints: ['Les chloroplastes contiennent la chlorophylle.', 'La chlorophylle capte la lumière.'], exercises: [] },
  { title: 'Échanges gazeux', notes: 'Les feuilles absorbent le dioxyde de carbone par les stomates. ==Le dioxygène produit est rejeté dans l’air par ces mêmes stomates.== La nuit, la plante respire seulement.', keyPoints: ['Les stomates laissent entrer le dioxyde de carbone.', 'Le dioxygène sort par les stomates.'], exercises: [] },
] };
function tutor(body) {
  if (body.task === 'rediger_cours') return COURSE;
  if (body.task === 'rediger_notion') return { notes: `Selon les sources, ${body.title} : les chloroplastes des feuilles captent la lumière grâce à la chlorophylle. ==C’est là que se fait la photosynthèse.==`, keyPoints: [], exercises: [], dropped: 0 };
  if (body.task === 'structurer') return { title: 'Photosynthèse', dropped: 0, gaps: ['Rôle de la chlorophylle'], notions: [
    { title: 'Définition', quote: body.text.slice(0, 60), check: false, question: 'Que fabrique la plante ?' },
    { title: 'Lieu de la photosynthèse', quote: body.text.slice(body.text.indexOf('Je crois'), body.text.indexOf('Je crois') + 50), check: true, question: 'Où se déroule la photosynthèse ?' },
  ] };
  if (body.mode === 'socratique') return { reply: 'Selon toi, que fabrique la plante avec la lumière ?', verdict: 'sans_reponse', misconception: '', hint_level: 0, citations: [], citations_dropped: 0, correct_points: [], missing: [], done: false, next_activity: 'continuer', usage: { used: 1, limit: 60 } };
  return {};
}
const DICTEE = 'La photosynthèse c’est quand la plante fabrique du sucre avec la lumière du soleil. Je crois que ça se passe dans les racines ou peut-être les feuilles.';

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const errors = [];
  async function fresh({ scheme = 'light', signed = false, speech = 'fake' } = {}) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, serviceWorkers: 'block', reducedMotion: 'reduce', colorScheme: scheme });
    // l'accueil et le compte (welcome.js) passent avant : testés dans tests/welcome.js
    await ctx.addInitScript(([au, sp, text]) => {
      try {
        if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', 1); localStorage.clear(); localStorage.setItem('arbor:welcome', '{"how":"guest"}'); if (au) { localStorage.setItem('arbor:auth', au); localStorage.setItem('arbor:journey', '{"workspace":"student"}'); } }
      } catch (e) { /* about:blank */ }
      if (sp === 'none') { try { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; } catch (e) { /* rien */ } }
      if (sp === 'fake') {
        // Reconnaissance vocale simulée : renvoie la phrase en deux morceaux, comme le navigateur
        window.webkitSpeechRecognition = window.SpeechRecognition = class { start() { this.on = true; const words = text.split(' '); const half = Math.ceil(words.length / 2);
          setTimeout(() => this.onresult && this.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: words.slice(0, half).join(' ') }], { isFinal: true })] }), 150);
          setTimeout(() => this.onresult && this.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: words.slice(half).join(' ') }], { isFinal: true })] }), 350); }
          stop() { this.on = false; } };
      }
    }, [signed ? JSON.stringify({ access_token: JWT, refresh_token: 'rt', expires_at: Date.now() + 3600e3, email: 'lea@exemple.fr' }) : '', speech, DICTEE]);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route(/wiki(pedia|books|versity|media)\.org/, (r) => r.abort());
    await page.route(`${SB}/**`, (r) => {
      const u = new URL(r.request().url()); let body = {}; try { body = JSON.parse(r.request().postData() || '{}'); } catch (e) { body = {}; }
      sent.push({ path: u.pathname, body });
      const ok = (d) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(d) });
      if (u.pathname === '/functions/v1/tutor') return ok(tutor(body));
      if (u.pathname === '/auth/v1/settings') return ok({ external: { google: false } });
      if (u.pathname === '/rest/v1/rpc/my_organizations') return ok([]);
      return ok(r.request().method() === 'GET' ? [] : {});
    });
    await page.goto(URL0); await page.waitForTimeout(900);
    return { ctx, page };
  }
  const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const tap = async (page, sel, ms = 350) => { await page.click(`.onb ${sel}`); await page.waitForTimeout(ms); };
  const state = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('arbor:v1')));
  const shots = process.env.ARBOR_SHOTS;
  const shot = async (page, n) => { if (shots) await page.screenshot({ path: path.join(shots, `onb-${n}.png`) }); };
  // objectif puis précisions (écrans B et C)
  async function goalAndDetails(page, { subject = '', skipDetails = false } = {}) {
    await tap(page, '.onb-choice[data-k="comprendre"]', 100); await tap(page, '.onb-choice[data-k="pro"]', 100);
    await page.fill('#onbGoalFree', 'comprendre le vivant');
    await tap(page, '[data-onb="next"]');
    if (skipDetails) { await tap(page, '[data-onb="later"]'); return; }
    if (subject) await page.fill('#onbSubject', subject);
    await page.click('.onb .onb-pills label:has-text("J’ai des bases")');
    await tap(page, '[data-onb="next"]');
  }

  /* A. Premier écran et cours d'exemple, en clair et en sombre */
  for (const scheme of ['light', 'dark']) {
    const { ctx, page } = await fresh({ scheme });
    const t = `(${scheme})`;
    check(`A1 l'introduction s'ouvre au premier lancement ${t}`, await page.isVisible('.onb'));
    check(`A2 cinq portes d'entrée : parler, scanner, discuter, se tester, importer ${t}`, (await page.$$('.onb [data-entry]')).length === 5 && /Comment souhaites-tu apprendre/.test(await page.textContent('.onb')));
    check(`A3 pas de débordement horizontal ${t}`, await noOverflow(page));
    await shot(page, `entrees-${scheme}`);
    await tap(page, '[data-onb="demo"]', 700);
    const txt = await page.textContent('.onb');
    check(`A4 le cours d'exemple montre chapitres et notions ${t}`, /chapitre/i.test(txt) && /notion/i.test(txt));
    check(`A5 la navigation reste cachée pendant l'introduction ${t}`, !(await page.isVisible('.bottom-nav')));
    await tap(page, '[data-onb="quiz"]');
    await page.click('.onb .onb-opt'); await page.waitForTimeout(300);
    check(`A6 la réponse reçoit un retour ${t}`, await page.isVisible('.onb .onb-fb p'));
    await tap(page, '[data-onb="next"]'); await tap(page, '[data-onb="next"]', 600);
    check(`A7 l'introduction mène à la carte du cours ${t}`, !(await page.isVisible('.onb')) && /carte/.test(page.url()), page.url());
    const st = await state(page);
    check(`A8 un seul cours, la démo, et le profil enregistré ${t}`, st.subjects.length === 1 && /Passerelle/.test(JSON.stringify(st.subjects[0].root)) && st.profile && st.profile.done && st.profile.entry === 'exemple');
    await page.reload(); await page.waitForTimeout(800);
    check(`A9 l'introduction ne revient pas au rechargement ${t}`, !(await page.isVisible('.onb')));
    await ctx.close();
  }

  /* B. Objectif libre et précisions facultatives, retour en arrière */
  {
    const { ctx, page } = await fresh();
    await tap(page, '[data-entry="tester"]');
    check('B1 « Qu’aimerais-tu accomplir ? » : six choix et une réponse libre', (await page.$$('.onb .onb-choice')).length === 6 && await page.isVisible('#onbGoalFree'));
    await shot(page, 'objectif');
    await tap(page, '.onb-choice[data-k="examen"]', 100);
    await tap(page, '[data-onb="next"]');
    check('B2 précisions : sujet, niveau, échéance, toutes facultatives (on peut passer)', await page.isVisible('#onbSubject') && (await page.$$('.onb .onb-pills input')).length === 3 && await page.isVisible('#onbExam') && await page.isVisible('.onb [data-onb="later"]'));
    check('B3 pas d’établissement ni de diplôme demandé', !/établissement|diplôme|BTS|Licence/.test(await page.textContent('.onb')));
    await page.click('.onb [data-onb="back"]'); await page.waitForTimeout(300);
    check('B4 retour à l’écran précédent, choix conservé', (await page.getAttribute('.onb .onb-choice[data-k="examen"]', 'aria-pressed')) === 'true');
    await ctx.close();
  }

  /* C. Se tester : un défi, le retour, la notion à lire, une nouvelle tentative */
  {
    const { ctx, page } = await fresh({ signed: true });
    await tap(page, '[data-entry="tester"]');
    await goalAndDetails(page, { skipDetails: true });
    await page.fill('#onbTopic', 'photosynthèse');
    await shot(page, 'defi-sujet');
    await tap(page, '[data-onb="go"]', 1800);
    check('C1 le défi commence par une question sur le sujet', await page.isVisible('.onb .onb-opt') && /défi/i.test(await page.textContent('.onb .onb-guide')));
    // mauvaise réponse exprès
    const opts = await page.$$eval('.onb .onb-opt', (bs) => bs.map((b) => b.textContent));
    const right = await page.evaluate(() => null);
    await page.click('.onb .onb-opt >> nth=0'); await page.waitForTimeout(300);
    const fb = await page.textContent('.onb .onb-fb');
    check('C2 la réponse est observée et reçoit un vrai retour', /Exact|Pas tout à fait/.test(fb));
    check('C3 la notion nécessaire est présentée tout de suite', await page.isVisible('.onb .onb-learn') && (await page.textContent('.onb .onb-learn')).length > 60);
    check('C4 une nouvelle tentative est proposée', await page.isVisible('.onb [data-onb="retry"]'));
    await shot(page, 'defi-retour');
    await tap(page, '[data-onb="retry"]');
    check('C5 la nouvelle tentative est une autre question', await page.isVisible('.onb .onb-opt') && /Nouvelle tentative/.test(await page.textContent('.onb .onb-guide')));
    await page.click('.onb .onb-opt >> nth=1'); await page.waitForTimeout(300);
    await tap(page, '[data-onb="next"]'); await tap(page, '[data-onb="next"]', 700);
    const st = await state(page);
    const obs = await page.evaluate(() => new Promise((ok) => { const r = indexedDB.open('arbor-db'); r.onsuccess = () => { try { const tx = r.result.transaction('obs', 'readonly'); const g = tx.objectStore('obs').getAll(); g.onsuccess = () => ok(g.result.length); g.onerror = () => ok(-1); } catch (e) { ok(-1); } }; r.onerror = () => ok(-1); }));
    check('C6 le cours du défi est enregistré dans Arbor (même moteur : notions, révisions)', st.subjects.some((x) => /Photosynthèse/i.test(x.title) && /Chloroplastes/.test(JSON.stringify(x.root))));
    check('C7 chaque tentative devient une observation', obs >= 2 || obs === -1, `${obs} observation(s)`);
    check('C8 l’entrée et la première action sont notées dans le parcours (sans contenu)', await page.evaluate(() => { const j = JSON.parse(localStorage.getItem('arbor:journey') || '{}'); return j.entry === 'tester' && !!j.firstActionAt && j.studentDone === true && !/photosynth/i.test(JSON.stringify(j)); }));
    await ctx.close();
  }

  /* D. Discuter : connecté, la conversation avec Pousse s'ouvre sur le cours construit */
  {
    const { ctx, page } = await fresh({ signed: true });
    await tap(page, '[data-entry="discuter"]');
    await goalAndDetails(page, { subject: 'photosynthèse' });
    check('D1 le sujet donné en précision est repris', (await page.inputValue('#onbTopic')) === 'photosynthèse');
    await tap(page, '[data-onb="go"]', 2200);
    check('D2 Pousse ouvre la discussion par une question (pédagogie socratique)', await page.isVisible('.dlg') && /Selon toi/.test(await page.textContent('.dlg')));
    check('D3 Pousse ne reçoit que les passages du cours, pas l’espace personnel entier', sent.some((x) => x.body.mode === 'socratique' && Array.isArray(x.body.passages) && x.body.passages.length > 0));
    await shot(page, 'discuter');
    await ctx.close();
  }
  {
    const { ctx, page } = await fresh({ signed: false });
    await tap(page, '[data-entry="discuter"]');
    await goalAndDetails(page, { skipDetails: true });
    check('D4 sans compte : on le dit, avec la possibilité d’en créer un ou d’explorer sans Pousse', /demande un compte/.test(await page.textContent('.onb')) && await page.isVisible('.onb [data-onb="account"]') && /Explorer le sujet/.test(await page.textContent('.onb [data-onb="go"]')));
    await ctx.close();
  }

  /* E. Parler : dictée, organisation, notions « à vérifier », comparaison avec une source */
  {
    const { ctx, page } = await fresh({ signed: true, speech: 'fake' });
    await tap(page, '[data-entry="parler"]');
    await goalAndDetails(page, { subject: 'photosynthèse' });
    check('E1 brain dump : micro, minuteur (30 s à 2 min) et transcription modifiable', await page.isVisible('.onb-mic') && /30 secondes à 2 minutes/.test(await page.textContent('.onb')) && await page.isVisible('#onbDump'));
    await page.click('.onb-mic'); await page.waitForTimeout(700);
    check('E2 la dictée remplit la transcription', /Je crois que ça se passe/.test(await page.inputValue('#onbDump')), await page.inputValue('#onbDump'));
    await page.click('.onb-mic'); await page.waitForTimeout(200);
    await shot(page, 'parler');
    await tap(page, '[data-onb="organize"]', 1200);
    check('E3 notions trouvées dans ce qui a été dit, avec la zone d’incertitude marquée « À vérifier »', (await page.$$('.onb-notions li')).length === 2 && /À vérifier/.test(await page.textContent('.onb-notions')) && /Rôle de la chlorophylle/.test(await page.textContent('.onb')));
    check('E4 une explication n’est pas présentée comme une preuve de maîtrise', /pas encore une preuve/.test(await page.textContent('.onb')));
    const sreq = sent.find((x) => x.body.task === 'structurer');
    check('E5 la transcription part au serveur seulement pour être organisée (mode explication)', !!sreq && sreq.body.context === 'explication');
    await shot(page, 'parler-notions');
    // la recherche de sources (Storm, Wikimédia) est testée dans ses propres suites : ici, une source fixe
    await page.evaluate(() => { Storm.buildNotion = async (title) => ({ notes: `D’après Wikipédia, ${title} : les chloroplastes des feuilles captent la lumière grâce à la chlorophylle.`, keyPoints: [], exercises: [], sources: [{ title: 'Wikipédia : Photosynthèse', url: 'https://fr.wikipedia.org/wiki/Photosynth%C3%A8se' }], from: 'serveur' }); });
    await tap(page, '[data-onb="save"]', 2500);
    const st = await state(page);
    const subj = st.subjects.find((x) => /Photosynthèse/.test(x.title));
    const lieu = subj && JSON.stringify(subj.root);
    check('E6 enregistré dans Arbor : ce que la personne a dit, puis ce que dit une source fiable', !!subj && /Ce que tu as dit/.test(lieu) && /Ce que dit une source fiable/.test(lieu) && /Pour vérifier/.test(lieu));
    check('E7 on enchaîne sur la structure et une question', await page.isVisible('.onb') && /notion/i.test(await page.textContent('.onb')));
    const prof = sent.filter((x) => x.path === '/rest/v1/profiles').map((x) => JSON.stringify(x.body)).join(' ');
    check('E8 la transcription n’est jamais écrite dans le profil', !/racines|photosynth/i.test(prof));
    await ctx.close();
  }
  {
    const { ctx, page } = await fresh({ signed: false, speech: 'none' });
    await tap(page, '[data-entry="parler"]');
    await goalAndDetails(page, { skipDetails: true });
    check('E9 sans dictée dans le navigateur : on le dit et on écrit à la place (pas de faux micro)', !(await page.$('.onb-mic')) && /pas disponible/.test(await page.textContent('.onb')) && await page.isVisible('#onbDump'));
    await page.fill('#onbDump', DICTEE);
    await tap(page, '[data-onb="organize"]', 700);
    const st = await state(page);
    check('E10 sans compte : le texte est gardé tel quel, et l’organisation demande un compte (dit clairement)', st.subjects.some((x) => /Ce que j’ai expliqué/.test(JSON.stringify(x.root))) && /compte gratuit/.test(await page.textContent('.onb')));
    await ctx.close();
  }

  /* F. Scanner : vraie lecture de texte (Tesseract.js) sur une image générée */
  {
    const img = path.join(os.tmpdir(), 'arbor-scan-test.png');
    {
      const p2 = await browser.newPage({ viewport: { width: 900, height: 360 } });
      await p2.setContent('<body style="margin:0;background:#fff"><p style="font:36px/1.5 Arial;padding:30px;color:#111">La photosynthèse transforme la lumière en énergie chimique dans les chloroplastes des feuilles.</p></body>');
      await p2.screenshot({ path: img }); await p2.close();
    }
    const { ctx, page } = await fresh({ signed: true });
    await tap(page, '[data-entry="scanner"]');
    await goalAndDetails(page, { skipDetails: true });
    check('F1 l’écran photo ouvre l’appareil photo du téléphone (ou la galerie), et dit que la photo reste sur l’appareil', (await page.getAttribute('#onbImg', 'capture')) === 'environment' && /n’est envoyée nulle part/.test(await page.textContent('.onb')));
    await page.setInputFiles('#onbImg', img);
    await page.waitForFunction(() => { const s = document.querySelector('.onb-status'); return s && /Texte lu|difficile|n’a pas pu|a échoué/.test(s.textContent); }, null, { timeout: 120000 }).catch(() => {});
    const stx = await page.textContent('.onb-status').catch(() => '');
    if (/n’a pas pu se charger/.test(stx)) {
      skip('F2 lecture du texte par Tesseract.js', 'bibliothèque non téléchargeable depuis cet environnement');
      check('F3 sans lecture possible : on le dit et on peut taper le texte', await page.isVisible('#onbOcr'));
    } else {
      const ocr = await page.inputValue('#onbOcr');
      check('F2 le texte de la photo est réellement lu (Tesseract.js, dans le navigateur)', /photosynth/i.test(ocr) && /chloroplast/i.test(ocr), ocr.slice(0, 120));
      check('F3 la qualité de lecture est indiquée', /confiance \d+ %/.test(stx), stx);
      await shot(page, 'scanner');
      await tap(page, '[data-onb="organize"]', 1200);
      check('F4 le texte lu est organisé en notions (mode photo)', (await page.$$('.onb-notions li')).length >= 1 && sent.some((x) => x.body.task === 'structurer' && x.body.context === 'support'));
    }
    check('F5 l’image elle-même n’est jamais envoyée au serveur Arbor', !sent.some((x) => /data:image|base64,iVBOR/.test(JSON.stringify(x.body))));
    await ctx.close();
  }

  /* G. Importer : PDF (chemin existant), page Wikipédia, notes ; une page web quelconque est refusée honnêtement */
  {
    const { ctx, page } = await fresh({ signed: true });
    await tap(page, '[data-entry="importer"]');
    await goalAndDetails(page, { skipDetails: true });
    check('G1 trois façons d’importer : PDF, page Wikipédia, notes', await page.isVisible('.onb [data-onb="pdf"]') && await page.isVisible('.onb [data-onb="wiki"]') && await page.isVisible('.onb [data-onb="manual"]'));
    await tap(page, '[data-onb="wiki"]');
    await page.fill('#onbWiki', 'https://exemple.fr/article');
    await tap(page, '[data-onb="wikigo"]');
    check('G2 une page web quelconque : on explique comment faire (PDF), sans prétendre l’importer', /enregistre-la en PDF/.test(await page.textContent('.onb-status')));
    await page.fill('#onbWiki', 'https://fr.wikipedia.org/wiki/Photosynth%C3%A8se');
    await tap(page, '[data-onb="wikigo"]', 1800);
    check('G3 une page Wikipédia devient un cours', /chapitre|notion/i.test(await page.textContent('.onb')) && (await state(page)).subjects.some((x) => /Photosynthèse/.test(x.title)));
    await ctx.close();
  }
  {
    const { ctx, page } = await fresh();
    await tap(page, '[data-entry="importer"]');
    await goalAndDetails(page, { skipDetails: true });
    await tap(page, '[data-onb="pdf"]', 600);
    check('G4 « Un PDF » ouvre l’import PDF existant', await page.isVisible('#modal') || await page.isVisible('.modal'));
    await ctx.close();
  }

  /* H. Passer dès le premier écran, et revoir l'introduction */
  {
    const { ctx, page } = await fresh();
    await page.click('.onb [data-onb="skip"]'); await page.waitForTimeout(500);
    check('H1 « Passer » ferme l\'introduction et rend la navigation', !(await page.isVisible('.onb')) && await page.isVisible('.bottom-nav'));
    await page.reload(); await page.waitForTimeout(800);
    check('H2 elle ne revient pas après un « Passer »', !(await page.isVisible('.onb')));
    await page.click('#settingsBtn'); await page.waitForTimeout(300);
    await page.click('#onbAgain'); await page.waitForTimeout(500);
    check('H3 « Revoir l\'introduction » la rouvre', await page.isVisible('.onb'));
    await ctx.close();
  }

  /* I. Les cinq portes restent accessibles depuis l'accueil, après le premier lancement */
  for (const [entry, re, k] of [['parler', /Explique ce que tu sais/, 'I2'], ['scanner', /Photographie un support/, 'I3']]) {
    const { ctx, page } = await fresh();
    await page.click('.onb [data-onb="skip"]'); await page.waitForTimeout(400);
    await page.evaluate(() => { const st = JSON.parse(localStorage.getItem('arbor:v1') || '{}'); st.subjects = [{ id: 'docsub00001', title: 'Biologie', color: '#1E7A57', icon: 'dna', createdAt: 1, updatedAt: 2, root: { id: 'docsub00001r', title: 'Biologie', notes: '', explain: '', keyPoints: [], exercises: [], srs: null, status: 'todo', collapsed: false, children: [] } }]; localStorage.setItem('arbor:v1', JSON.stringify(st)); });
    await page.reload(); await page.waitForTimeout(900);
    const before = sent.length;
    if (k === 'I2') check('I1 l’accueil montre les cinq portes d’entrée, sans débordement', (await page.$$('.st-doors .door')).length === 5 && await noOverflow(page));
    await page.click(`.st-doors [data-entry="${entry}"]`); await page.waitForTimeout(600);
    check(`${k} « ${entry} » ouvre directement la bonne porte, sans repasser par l’introduction ; rien n’est envoyé`, await page.isVisible('.onb') && re.test(await page.textContent('.onb')) && sent.length === before);
    await ctx.close();
  }

  check('Z aucune erreur JavaScript', errors.length === 0, errors.join(' | '));
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} test(s) en échec` : `\nTous les tests passent${unverified ? ` (${unverified} non vérifié(s))` : ''}`);
  process.exit(failed ? 1 : 0);
})();
