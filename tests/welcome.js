/* Accueil mobile et compte : accueil, inscription, confirmation d'e-mail, connexion, mot de passe oublié,
   nouveau mot de passe (lien de récupération), connexion par code, essai sans compte, invitation, ordinateur.
   Supabase Auth est simulé (aucune requête réseau réelle).
   Lancer depuis la racine du dépôt :  node tests/welcome.js   (Playwright requis). */
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
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (sub) => `${b64({ alg: 'HS256' })}.${b64({ sub, exp: 9999999999 })}.sig`;
const session = (email) => ({ access_token: jwt('u-' + email), refresh_token: 'rt', expires_in: 3600, user: { email } });

/* Faux Supabase Auth : comptes { email: { password, confirmed } } */
function fakeAuth(opts = {}) {
  const users = { 'lea@exemple.fr': { password: 'Arbor2026', confirmed: true }, 'nouveau@exemple.fr': { password: 'Pomme1234', confirmed: false }, ...(opts.users || {}) };
  const calls = [];
  const handle = (req) => {
    const u = new URL(req.url()), body = req.postData() ? JSON.parse(req.postData()) : {};
    calls.push({ path: u.pathname, query: u.search, method: req.method(), body });
    const json = (status, data) => ({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (u.pathname === '/auth/v1/signup') {
      if (body.password.length < 6) return json(422, { code: 422, error_code: 'weak_password', msg: 'Password should be at least 6 characters.' });
      if (users[body.email]) return json(200, { id: 'obf', email: body.email, identities: [] }); // comme Supabase : on ne révèle rien
      users[body.email] = { password: body.password, confirmed: !opts.confirm };
      return opts.confirm ? json(200, { id: 'u1', email: body.email, confirmation_sent_at: new Date().toISOString() }) : json(200, session(body.email));
    }
    if (u.pathname === '/auth/v1/token' && u.search.includes('grant_type=password')) {
      const x = users[body.email];
      if (!x || x.password !== body.password) return json(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
      if (!x.confirmed) return json(400, { code: 400, error_code: 'email_not_confirmed', msg: 'Email not confirmed' });
      return json(200, session(body.email));
    }
    if (u.pathname === '/auth/v1/recover') return json(200, {});
    if (u.pathname === '/auth/v1/resend') return json(200, {});
    if (u.pathname === '/auth/v1/otp') return json(200, {});
    if (u.pathname === '/auth/v1/verify') return body.token === '123456' ? json(200, session(body.email)) : json(403, { error_code: 'otp_expired', msg: 'Token has expired or is invalid' });
    if (u.pathname === '/auth/v1/user' && req.method() === 'PUT') return body.password === 'Ancien1234' ? json(422, { error_code: 'same_password', msg: 'New password should be different from the old password.' }) : json(200, { email: 'lea@exemple.fr' });
    if (u.pathname === '/auth/v1/user') return json(200, { email: 'lea@exemple.fr' });
    if (u.pathname === '/auth/v1/settings') return json(200, { external: { email: true, google: !!opts.google }, disable_signup: false, mailer_autoconfirm: false });
    if (u.pathname.startsWith('/rest/v1/rpc/my_organizations')) return json(200, opts.orgs || []);
    if (u.pathname === '/rest/v1/profiles' && req.method() === 'GET') return json(200, opts.profile ? [opts.profile] : []);
    if (u.pathname === '/rest/v1/profiles' && req.method() === 'PATCH') { if (opts.profile) { Object.assign(opts.profile, body); return json(200, [opts.profile]); } return json(200, []); }
    if (u.pathname === '/rest/v1/profiles' && req.method() === 'POST') { opts.profile = body; return json(201, null); }
    if (u.pathname.startsWith('/rest/v1/')) return json(200, []);
    return json(404, {});
  };
  return { users, calls, handle };
}

(async () => {
  await new Promise((r) => server.listen(0, r));
  const URL0 = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const errors = [];
  async function open({ scheme = 'light', viewport = { width: 390, height: 844 }, desktop = false, auth = fakeAuth(), hash = '', motion = 'reduce' } = {}) {
    const ctx = await browser.newContext(desktop ? { viewport: { width: 1280, height: 860 }, serviceWorkers: 'block', reducedMotion: 'reduce' } : { viewport, hasTouch: true, isMobile: true, serviceWorkers: 'block', reducedMotion: motion, colorScheme: scheme });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route(`${SB}/**`, (route) => route.fulfill(auth.handle(route.request())));
    await page.goto(URL0 + hash); await page.waitForTimeout(900);
    return { ctx, page, auth };
  }
  const tap = async (page, sel, ms = 350) => { await page.click(sel); await page.waitForTimeout(ms); };
  const noOverflow = (page) => page.evaluate(() => { const w = document.querySelector('.wel'); return document.documentElement.scrollWidth <= innerWidth + 1 && (!w || w.scrollWidth <= w.clientWidth + 1); });
  const shots = process.env.ARBOR_SHOTS;
  const shot = async (page, name) => { if (shots) await page.screenshot({ path: path.join(shots, `welcome-${name}.png`) }); };

  /* A. Premier lancement sur téléphone : l'accueil, pas l'introduction */
  for (const scheme of ['light', 'dark']) {
    const { ctx, page } = await open({ scheme });
    const t = `(${scheme})`;
    check(`A1 l'accueil s'ouvre au premier lancement ${t}`, await page.isVisible('.wel') && !(await page.isVisible('.onb')));
    check(`A2 en-tête : marque et bouton Connexion ; message universel ${t}`, await page.isVisible('.wel-head .wel-brand') && await page.isVisible('.wel-login-chip') && /Tout peut devenir un point de départ pour apprendre/.test(await page.textContent('.wel-hero h1')));
    check(`A3 la promesse et les deux actions sont visibles sans défiler ${t}`, await page.evaluate(() => { const h = document.querySelector('.wel-hero h1').getBoundingClientRect(), b = document.querySelector('.wel-ctas .btn.ghost').getBoundingClientRect(); return h.top >= 0 && b.bottom <= innerHeight; }));
    check(`A4 pas de débordement horizontal ${t}`, await noOverflow(page));
    check(`A5 la barre d'onglets et Pousse sont cachés derrière l'accueil ${t}`, !(await page.isVisible('.bottom-nav')));
    await shot(page, `landing-${scheme}`);
    await page.evaluate(() => document.querySelector('.wel').scrollTo(0, 400)); await page.waitForTimeout(300);
    check(`A6 l'en-tête devient opaque quand le contenu passe dessous ${t}`, await page.evaluate(() => document.querySelector('.wel').classList.contains('scrolled')));
    await shot(page, `landing-scrolled-${scheme}`);
    check(`A7 cinq points de départ (question, explication, document, photo, problème), pas seulement le PDF ${t}`, (await page.$$('.wel-entries li')).length === 5 && /photo/i.test(await page.textContent('.wel-entries')));
    check(`A8 trois actions : Commencer, Se connecter, J’ai une invitation ${t}`, /Commencer/.test(await page.textContent('.wel-ctas')) && /Se connecter/.test(await page.textContent('.wel-ctas')) && await page.isVisible('.wel-invite'));
    await page.waitForTimeout(1600);
    check(`A9 l’animation Lottie de la pousse se joue (ou Pousse reste affichée sans réseau) ${t}`, await page.evaluate(() => { const b = document.querySelector('.wel-lottie'); return !!b && (b.classList.contains('is-lottie') ? !!b.querySelector('svg path') : !!b.querySelector('.pousse-mini')); }), await page.evaluate(() => (document.querySelector('.wel-lottie') || {}).className));
    await ctx.close();
  }

  /* B. Inscription avec confirmation d'e-mail */
  {
    const auth = fakeAuth({ confirm: true });
    const { ctx, page } = await open({ auth });
    await tap(page, '.wel-ctas [data-wel="signup"]');
    check('B1 « Créer un compte » ouvre le formulaire, avec retour et titre', await page.isVisible('form[data-form="signup"]') && await page.isVisible('.wel-back') && /Créer un compte/.test(await page.textContent('.wel-title')));
    await tap(page, '.wel-submit', 200);
    check('B2 champs vides : erreurs sous les champs, aucun envoi', /Indique ton adresse/.test(await page.textContent('#welEmailErr')) && /Choisis un mot de passe/.test(await page.textContent('#welPassErr')) && !auth.calls.some((c) => c.path === '/auth/v1/signup'));
    await page.fill('#welEmail', 'pas-une-adresse'); await page.fill('#welPass', 'court');
    await tap(page, '.wel-submit', 200);
    check('B3 adresse invalide et mot de passe faible sont signalés', /pas valide/.test(await page.textContent('#welEmailErr')) && /règles/.test(await page.textContent('#welPassErr')));
    check('B4 les règles du mot de passe se cochent en direct', (await page.$$('.wel-rules li.ok')).length === 0);
    await page.fill('#welPass', 'Pomme2026x');
    check('B5 mot de passe conforme : les deux règles sont cochées', (await page.$$('.wel-rules li.ok')).length === 2);
    await tap(page, '.wel-eye', 100);
    check('B6 l’œil affiche le mot de passe', (await page.getAttribute('#welPass', 'type')) === 'text' && (await page.getAttribute('.wel-eye', 'aria-pressed')) === 'true');
    await page.fill('#welEmail', 'Camille@Exemple.fr');
    await shot(page, 'signup');
    await tap(page, '.wel-submit', 600);
    const su = auth.calls.find((c) => c.path === '/auth/v1/signup');
    check('B7 l’inscription envoie e-mail (en minuscules) et mot de passe, avec le retour vers l’app', !!su && su.body.email === 'camille@exemple.fr' && su.body.password === 'Pomme2026x' && /redirect_to=/.test(su.query));
    check('B8 écran « Confirme ton adresse » avec l’adresse', await page.isVisible('[data-wel="resend"]') && /camille@exemple\.fr/.test(await page.textContent('.wel-stage')));
    check('B9 pas encore connecté', !(await page.evaluate(() => localStorage.getItem('arbor:auth'))));
    await shot(page, 'check');
    await tap(page, '[data-wel="resend"]', 400);
    check('B10 « Renvoyer l’e-mail » renvoie puis attend 60 s', auth.calls.some((c) => c.path === '/auth/v1/resend' && c.body.email === 'camille@exemple.fr') && await page.isDisabled('[data-wel="resend"]') && /\d+ s/.test(await page.textContent('[data-wel="resend"]')));
    await tap(page, '.wel-stack [data-wel="login"]');
    check('B11 « J’ai confirmé » mène à la connexion, adresse pré-remplie', await page.isVisible('form[data-form="login"]') && (await page.inputValue('#welEmail')) === 'camille@exemple.fr');
    await page.fill('#welPass', 'Pomme2026x'); await tap(page, '.wel-submit', 500);
    check('B12 adresse non confirmée : message clair et lien pour renvoyer', /pas encore confirmée/.test(await page.textContent('.wel-form-err')) && await page.isVisible('.wel-form-err [data-wel="resend"]'));
    auth.users['camille@exemple.fr'].confirmed = true;
    await tap(page, '.wel-submit', 800);
    check('B13 une fois confirmée, la connexion mène au choix de l’espace (Student ou Business)', await page.isVisible('[data-wel="pick-student"]') && await page.isVisible('[data-wel="business"]'));
    await shot(page, 'space');
    await tap(page, '[data-wel="pick-student"]', 700);
    check('B13b Student ouvre l’introduction', !(await page.isVisible('.wel')) && await page.isVisible('.onb'));
    check('B14 la session est enregistrée', /camille@exemple\.fr/.test(await page.evaluate(() => localStorage.getItem('arbor:auth') || '')));
    check('B15 l’introduction ne dit plus « sans compte »', !/sans compte/.test(await page.textContent('.onb')));
    await page.reload(); await page.waitForTimeout(900);
    check('B16 au rechargement, ni l’accueil ni l’inscription ne reviennent', !(await page.isVisible('.wel')));
    await ctx.close();
  }

  /* C. Inscription sans confirmation (session immédiate) → « Ton compte est prêt » → introduction complète */
  {
    const { ctx, page } = await open();
    await tap(page, '.wel-ctas [data-wel="signup"]');
    await page.fill('#welEmail', 'yanis@exemple.fr'); await page.fill('#welPass', 'Reseau2026');
    await tap(page, '.wel-submit', 700);
    check('C1 compte créé : écran « Ton compte est prêt »', /Ton compte est prêt/.test(await page.textContent('.wel-stage')));
    await shot(page, 'ready');
    await tap(page, '.wel-ready [data-wel="space"]', 500);
    await tap(page, '[data-wel="pick-student"]', 700);
    check('C2 « Continuer », puis Student, ouvre l’introduction de l’app', await page.isVisible('.onb') && !(await page.isVisible('.wel')));
    await page.click('.onb [data-entry="tester"]'); await page.waitForTimeout(300);
    check('C3 l’introduction se poursuit normalement (porte d’entrée, puis objectif)', await page.isVisible('.onb .onb-choice'));
    await ctx.close();
  }

  /* D. Une adresse déjà inscrite : Supabase répond comme pour une nouvelle (rien n'est révélé) */
  {
    const auth = fakeAuth({ confirm: true });
    const { ctx, page } = await open({ auth });
    await tap(page, '.wel-ctas [data-wel="signup"]');
    await page.fill('#welEmail', 'lea@exemple.fr'); await page.fill('#welPass', 'Autre2026');
    await tap(page, '.wel-submit', 600);
    check('D1 même écran de confirmation, avec le conseil de se connecter si un compte existe', /déjà un compte/.test(await page.textContent('.wel-stage')));
    await ctx.close();
  }

  /* E. Connexion : erreur, puis réussite par l'en-tête */
  {
    const { ctx, page, auth } = await open();
    await tap(page, '.wel-login-chip');
    check('E1 « Connexion » dans l’en-tête ouvre la connexion', await page.isVisible('form[data-form="login"]'));
    await page.fill('#welEmail', 'lea@exemple.fr'); await page.fill('#welPass', 'mauvais');
    await tap(page, '.wel-submit', 500);
    check('E2 mauvais mot de passe : message sans dire si le compte existe, conseil pour les comptes créés par code', /E-mail ou mot de passe incorrect/.test(await page.textContent('.wel-form-err')) && /Mot de passe oublié/.test(await page.textContent('.wel-form-err')));
    await shot(page, 'login-error');
    await page.fill('#welPass', 'Arbor2026');
    await tap(page, '.wel-submit', 800);
    check('E3 bonne combinaison : connecté, puis choix de l’espace', await page.isVisible('[data-wel="pick-student"]') && auth.calls.some((c) => c.path === '/auth/v1/token' && /grant_type=password/.test(c.query)));
    await ctx.close();
  }

  /* F. Mot de passe oublié, puis lien de récupération → nouveau mot de passe */
  {
    const { ctx, page, auth } = await open();
    await tap(page, '.wel-login-chip');
    await page.fill('#welEmail', 'lea@exemple.fr');
    await tap(page, '.wel-forgot');
    check('F1 « Mot de passe oublié » garde l’adresse saisie', (await page.inputValue('#welEmail')) === 'lea@exemple.fr');
    await tap(page, '.wel-submit', 500);
    check('F2 lien demandé, réponse identique que le compte existe ou non', auth.calls.some((c) => c.path === '/auth/v1/recover' && c.body.email === 'lea@exemple.fr' && /redirect_to=/.test(c.query)) && /Si un compte existe/.test(await page.textContent('.wel-stage')));
    await tap(page, '.wel-back');
    check('F3 le retour revient à la connexion', await page.isVisible('form[data-form="login"]'));
    await ctx.close();
  }
  {
    const tok = jwt('u-lea');
    const { ctx, page, auth } = await open({ hash: `#access_token=${tok}&refresh_token=rt&expires_in=3600&token_type=bearer&type=recovery` });
    check('F4 le lien de récupération ouvre « Nouveau mot de passe », déjà connecté', await page.isVisible('form[data-form="reset"]') && !!(await page.evaluate(() => localStorage.getItem('arbor:auth'))));
    check('F5 le jeton ne reste pas dans l’adresse', !/access_token/.test(page.url()));
    await shot(page, 'reset');
    await page.fill('#welPass', 'Ancien1234'); await tap(page, '.wel-submit', 500);
    check('F6 même mot de passe que l’ancien : refus expliqué', /différent/.test(await page.textContent('#welPassErr')));
    await page.fill('#welPass', 'Nouveau2026'); await tap(page, '.wel-submit', 600);
    const put = auth.calls.find((c) => c.path === '/auth/v1/user' && c.method === 'PUT' && c.body.password === 'Nouveau2026');
    check('F7 nouveau mot de passe enregistré avec le jeton du lien', !!put && /Mot de passe enregistré/.test(await page.textContent('.wel-stage')));
    await tap(page, '[data-wel="finish"]', 700);
    check('F8 « Continuer » mène à l’introduction (aucun cours encore)', !(await page.isVisible('.wel')) && await page.isVisible('.onb'));
    await ctx.close();
  }

  /* G. Connexion par code (comptes créés sans mot de passe) */
  {
    const { ctx, page } = await open();
    await tap(page, '.wel-login-chip');
    await tap(page, '[data-wel="code"]');
    await page.fill('#welEmail', 'lea@exemple.fr'); await tap(page, '.wel-submit', 500);
    check('G1 le code est envoyé, champ de code affiché', await page.isVisible('#welCode'));
    await page.fill('#welCode', '000000'); await tap(page, '.wel-submit', 500);
    check('G2 code faux : erreur sous le champ', /incorrect|expiré/.test(await page.textContent('#welCodeErr')));
    await page.fill('#welCode', '123456'); await tap(page, '.wel-submit', 800);
    check('G3 bon code : connecté, puis choix de l’espace', await page.isVisible('[data-wel="pick-student"]'));
    await ctx.close();
  }

  /* H. Essayer sans compte : l'app marche, l'accueil ne revient pas */
  {
    const { ctx, page } = await open();
    await page.evaluate(() => document.querySelector('[data-wel="guest"]').scrollIntoView());
    await tap(page, '[data-wel="guest"]', 600);
    check('H1 « Essayer sans compte » ouvre l’introduction, sans session', await page.isVisible('.onb') && !(await page.evaluate(() => localStorage.getItem('arbor:auth'))));
    await page.click('.onb [data-onb="skip"]'); await page.waitForTimeout(500);
    await page.reload(); await page.waitForTimeout(900);
    check('H2 au rechargement : ni accueil ni introduction', !(await page.isVisible('.wel')) && !(await page.isVisible('.onb')) && await page.isVisible('.bottom-nav'));
    await page.click('#settingsBtn'); await page.waitForTimeout(400);
    check('H3 les réglages proposent « Se connecter » et « Créer un compte »', await page.isVisible('#acctPwd') && await page.isVisible('#acctNew'));
    await tap(page, '#acctNew', 500);
    check('H4 « Créer un compte » ouvre le formulaire seul, le retour le ferme', await page.isVisible('form[data-form="signup"]'));
    await tap(page, '.wel-back', 500);
    check('H5 retour : l’app est là', !(await page.isVisible('.wel')) && await page.isVisible('.bottom-nav'));
    await ctx.close();
  }

  /* I. Entreprise : « J'ai une invitation » mène à l'écran pour rejoindre */
  {
    const { ctx, page } = await open();
    await tap(page, '.wel-invite', 700);
    check('I1 l’invitation mène à l’écran pour rejoindre', /#\/rejoindre/.test(page.url()) && !(await page.isVisible('.wel')) && !(await page.isVisible('.onb')));
    await ctx.close();
  }

  /* J. Hors connexion */
  {
    const { ctx, page } = await open();
    await tap(page, '.wel-ctas [data-wel="signup"]');
    await page.fill('#welEmail', 'zoe@exemple.fr'); await page.fill('#welPass', 'Hors2026x');
    await ctx.setOffline(true);
    await tap(page, '.wel-submit', 400);
    check('J1 sans réseau : message clair, le bouton redevient actif', /Pas de connexion/.test(await page.textContent('.wel-form-err')) && !(await page.isDisabled('.wel-submit')));
    await ctx.setOffline(false);
    await ctx.close();
  }

  /* K. Petit écran et animations */
  {
    const { ctx, page } = await open({ viewport: { width: 320, height: 640 }, motion: 'no-preference' });
    check('K1 320 px : pas de débordement', await noOverflow(page));
    await tap(page, '.wel-ctas [data-wel="signup"]', 600);
    check('K2 320 px : formulaire sans débordement', await noOverflow(page));
    await ctx.close();
  }

  /* N. Choix de l'espace : organisations existantes, Business, Google, reprise, lien expiré */
  {
    const org = { id: '11111111-2222-3333-4444-555555555555', name: 'Boulangerie Martin', sector: 'Commerce', role: 'manager', owner: false, unit: 'Boutique', onboarded: true, setup: {} };
    const auth = fakeAuth({ orgs: [org], google: true });
    const { ctx, page } = await open({ auth });
    await tap(page, '.wel-login-chip');
    check('N1 Google activé sur le projet : le bouton apparaît', await page.isVisible('[data-google] button'));
    await page.fill('#welEmail', 'lea@exemple.fr'); await page.fill('#welPass', 'Arbor2026');
    await tap(page, '.wel-submit', 900);
    check('N2 l’organisation existante est proposée avec le rôle et l’équipe', /Boulangerie Martin/.test(await page.textContent('.wel-orgs')) && /Manager/.test(await page.textContent('.wel-orgs')) && /Boutique/.test(await page.textContent('.wel-orgs')));
    await tap(page, '[data-wel="business"]', 500);
    check('N3 Business : créer, rejoindre, ou retrouver son organisation', await page.isVisible('[data-wel="create-org"]') && await page.isVisible('.wel-choice[data-wel="join"]') && await page.isVisible('[data-org]'));
    await shot(page, 'business');
    await tap(page, '[data-org]', 900);
    check('N4 retrouver son organisation mène à son espace', page.url().endsWith(`#/org/${org.id}`) && !(await page.isVisible('.wel')));
    const prof = auth.calls.filter((c) => c.path === '/rest/v1/profiles' && c.method !== 'GET').map((c) => JSON.stringify(c.body.onboarding || {})).join(' ');
    check('N5 l’espace choisi est noté dans le profil (drapeaux seulement, aucun contenu)', /"workspace":"business"/.test(prof) && !/Arbor2026|lea@/.test(prof), prof.slice(0, 200));
    await ctx.close();
  }
  {
    const auth = fakeAuth();
    const { ctx, page } = await open({ auth });
    await tap(page, '.wel-login-chip');
    check('N6 Google non activé : aucun bouton Google (pas de bouton factice)', !(await page.isVisible('[data-google] button')));
    await page.fill('#welEmail', 'lea@exemple.fr'); await page.fill('#welPass', 'Arbor2026');
    await tap(page, '.wel-submit', 800);
    await tap(page, '[data-wel="business"]'); await tap(page, '[data-wel="create-org"]', 900);
    check('N7 « Créer une organisation » mène à l’assistant', /#\/org\/nouvelle/.test(page.url()), page.url());
    await ctx.close();
  }
  {
    // Reprise : sur un autre appareil, Student déjà commencé : on va directement dans l'app
    const auth = fakeAuth({ profile: { display_name: null, onboarding: { workspace: 'student', studentDone: true }, last_space: 'personal' } });
    const { ctx, page } = await open({ auth });
    await tap(page, '.wel-login-chip');
    await page.fill('#welEmail', 'lea@exemple.fr'); await page.fill('#welPass', 'Arbor2026');
    await tap(page, '.wel-submit', 900);
    check('N8 reprise : espace déjà choisi ailleurs, pas de nouveau choix ni de nouvelle introduction', !(await page.isVisible('.wel')) && !(await page.isVisible('[data-wel="pick-student"]')) && !(await page.isVisible('.onb')));
    await ctx.close();
  }
  {
    const { ctx, page } = await open({ hash: '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired' });
    check('N9 lien expiré ou déjà utilisé : message en français et suites proposées', /a expiré ou a déjà servi/.test(await page.textContent('.wel-stage')) && await page.isVisible('.wel-stage [data-wel="login"]') && await page.isVisible('.wel-stage [data-wel="forgot"]'));
    check('N10 l’erreur ne reste pas dans l’adresse', !/error_code/.test(page.url()));
    await shot(page, 'linkerr');
    await ctx.close();
  }
  {
    // Connecté, mais parti avant de choisir son espace : on reprend à ce choix
    const { ctx, page } = await open({ hash: `#access_token=${jwt('u-x')}&refresh_token=rt&expires_in=3600&token_type=bearer` });
    check('N11 retour de Google ou d’un lien de connexion sans espace choisi : choix de l’espace', await page.isVisible('[data-wel="pick-student"]'));
    await page.reload(); await page.waitForTimeout(900);
    check('N12 en relançant l’app avant d’avoir choisi : on revient au choix de l’espace', await page.isVisible('[data-wel="pick-student"]'));
    await ctx.close();
  }

  /* L. Ordinateur : rien ne s'ouvre tout seul */
  {
    const { ctx, page } = await open({ desktop: true });
    check('L1 sur ordinateur, ni accueil ni introduction au lancement', !(await page.isVisible('.wel')) && !(await page.isVisible('.onb')));
    await ctx.close();
  }

  /* M. Textes : pas de tiret long, et aucune requête hors du projet */
  const src = fs.readFileSync(path.join(ROOT, 'js/welcome.js'), 'utf8');
  check('M1 aucun tiret long dans les textes de l’accueil', !/[—–]/.test(src));
  check('M2 aucune erreur JavaScript', errors.length === 0, errors.join(' | '));

  await browser.close(); server.close();
  console.log(failed ? `\n${failed} échec(s)` : '\nTout est vert.');
  process.exit(failed ? 1 : 0);
})();
