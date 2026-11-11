/* Accueil et compte : la porte d'entrée d'Arbor (docs/onboarding.md).
   Parcours : accueil → créer un compte ou se connecter (e-mail et mot de passe, Google s'il est activé, code)
   → confirmer son adresse → choisir son espace (Student ou Business, ses organisations) → introduction de l'espace.
   Aussi : mot de passe oublié, nouveau mot de passe, lien expiré ou déjà utilisé, invitation, essai sans compte.
   Téléphone : s'ouvre au premier lancement. Ordinateur : seuls les écrans de compte et le choix d'espace servent. */
(function () {
  const FLAG = 'arbor:welcome';
  let el = null, io = null, lot = null, d = {}, screen = '', history = [], email = '', cool = 0, coolTimer = null;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ic = (n, fill) => `<i class="${fill ? 'ph-fill' : 'ph'} ph-${n}" aria-hidden="true"></i>`;
  const pousse = (size, mood = 'happy') => (window.Mascot && Mascot.mini({ size, mood })) || '';
  const okEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const rules = (p) => ({ len: p.length >= 8, mix: /[a-zà-ÿ]/i.test(p) && /\d/.test(p) });
  const okPass = (p) => { const r = rules(p); return r.len && r.mix; };
  const done = () => { try { return !!localStorage.getItem(FLAG); } catch (e) { return true; } };
  const mark = (how) => { try { localStorage.setItem(FLAG, JSON.stringify({ how, at: Date.now() })); } catch (e) { /* rien */ } };

  // Le logo de la barre du haut, avec des identifiants de dégradés propres à l'accueil
  function logo() {
    const src = document.querySelector('.topbar .logo');
    return src ? src.outerHTML.replace(/\b(lg)([ATL])\b/g, 'wl$2').replace('class="logo"', 'class="logo wel-logo"') : '';
  }

  const TITLES = { landing: '', signup: 'Créer un compte', login: 'Connexion', forgot: 'Mot de passe oublié', check: 'Vérifie tes e-mails', code: 'Connexion par code', reset: 'Nouveau mot de passe', ready: '', space: '', business: 'Business', linkerr: 'Lien e-mail' };
  const orgs = () => (window.Org ? Org.list() : []);
  const ROLE = (r) => (window.Org && Org.ROLES[r]) || r;

  /* Animation de la pousse (fichier Lottie d'Arbor, lu par lottie-web, open source).
     Chargée seulement ici ; sans réseau ou si elle échoue, Pousse reste affichée à sa place. */
  const LOTTIE_JS = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie_light.min.js';
  function loadLottie() {
    if (window.lottie) return Promise.resolve(window.lottie);
    if (loadLottie.p) return loadLottie.p;
    loadLottie.p = new Promise((ok, ko) => {
      const sc = document.createElement('script'); sc.src = LOTTIE_JS; sc.async = true; sc.crossOrigin = 'anonymous';
      sc.onload = () => (window.lottie ? ok(window.lottie) : ko(new Error('lottie'))); sc.onerror = () => { loadLottie.p = null; ko(new Error('lottie')); };
      document.head.appendChild(sc);
    });
    return loadLottie.p;
  }
  function playSprout(box) {
    if (!box) return;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    loadLottie().then((L) => {
      if (!box.isConnected) return;
      if (lot) { try { lot.destroy(); } catch (e) { /* déjà détruite */ } }
      lot = L.loadAnimation({ container: box, renderer: 'svg', loop: false, autoplay: !still, path: 'assets/pousse-grow.json', rendererSettings: { preserveAspectRatio: 'xMidYMid meet' } });
      lot.addEventListener('DOMLoaded', () => { box.classList.add('is-lottie'); if (still) lot.goToAndStop(lot.totalFrames - 1, true); });
      lot.addEventListener('data_failed', () => box.classList.remove('is-lottie'));
    }).catch(() => { /* Pousse reste affichée */ });
  }

  function shell() {
    el = document.createElement('div');
    el.className = 'wel';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Bienvenue dans Arbor');
    el.innerHTML = `<header class="wel-head">
        <div class="wel-bar">
          <button type="button" class="wel-back" data-wel="back" aria-label="Retour" hidden>${ic('caret-left', false)}</button>
          <span class="wel-brand">${logo()}<b translate="no">Arbor</b></span>
          <span class="wel-title" aria-hidden="true"></span>
          <button type="button" class="wel-login-chip" data-wel="to-login">Connexion</button>
        </div>
      </header>
      <main class="wel-stage"></main>`;
    document.body.appendChild(el);
    document.documentElement.classList.add('in-onboarding', 'in-welcome');
    requestAnimationFrame(() => el.classList.add('show'));
    el.querySelector('[data-wel="back"]').onclick = back;
    el.querySelector('[data-wel="to-login"]').onclick = () => go('login');
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape' && history.length) back(); });
  }
  const stage = () => el.querySelector('.wel-stage');

  // Changement d'écran : glissé vers la gauche quand on avance, vers la droite quand on revient
  function paint(html, dir) {
    const s = stage();
    s.innerHTML = html;
    s.classList.remove('slide-next', 'slide-prev'); void s.offsetWidth;
    if (dir) s.classList.add(`slide-${dir}`);
    s.scrollTop = 0; el.scrollTop = 0;
    const land = screen === 'landing';
    el.classList.toggle('is-landing', land);
    el.querySelector('[data-wel="to-login"]').hidden = !land;
    el.querySelector('[data-wel="back"]').hidden = land || !history.length;
    el.querySelector('.wel-title').textContent = TITLES[screen] || '';
    el.querySelector('.wel-brand').hidden = !land && !!TITLES[screen];
    // l'en-tête devient opaque dès que le contenu passe dessous (sans écouteur de défilement)
    const sentinel = s.querySelector('.wel-sentinel');
    if (io) { io.disconnect(); io = null; }
    if (sentinel && 'IntersectionObserver' in window) {
      const node = el;
      io = new IntersectionObserver(([e]) => node.classList.toggle('scrolled', !e.isIntersecting), { root: node });
      io.observe(sentinel);
    } else el.classList.remove('scrolled');
    const f = s.querySelector('[autofocus]');
    if (f && matchMedia('(hover: hover)').matches) f.focus();
    if (land) playSprout(s.querySelector('.wel-lottie'));
    if (s.querySelector('[data-google]')) showGoogle(s);
  }
  // « Continuer avec Google » n'apparaît que si le fournisseur est activé sur le projet
  function showGoogle(s) {
    if (!window.Tutor || !Tutor.authProviders) return;
    Tutor.authProviders().then((p) => { const g = s.querySelector('[data-google]'); if (g && p.google) { g.hidden = false; g.querySelector('button').onclick = () => { try { localStorage.setItem('arbor:auth-pending', 'google'); } catch (e) { /* rien */ } Tutor.signInGoogle(); }; } });
  }
  function go(name, opts = {}) {
    if (screen && !opts.replace) history.push(screen);
    screen = name;
    paint(SCREENS[name](opts), opts.dir || 'next');
    bind[name] && bind[name](opts);
  }
  function back() {
    const prev = history.pop();
    if (!prev) return;
    screen = prev;
    paint(SCREENS[prev]({}), 'prev');
    bind[prev] && bind[prev]({});
  }

  /* ---------- Écrans ---------- */
  function landing() {
    const entries = [['chat-circle-dots', 'Une question'], ['microphone', 'Ce que tu sais'], ['file-text', 'Un document'], ['camera', 'Une photo'], ['puzzle-piece', 'Un problème']];
    return `<span class="wel-sentinel"></span>
      <section class="wel-hero">
        <div class="wel-lottie" aria-hidden="true"><span class="wel-lottie-fallback">${pousse(104, 'joy')}</span></div>
        <h1>Tout peut devenir un point de départ pour apprendre.</h1>
        <p>Une question, une conversation, un document, une expérience ou un problème à résoudre. Arbor transforme ce que tu explores en connaissances durables.</p>
        <ul class="wel-entries" aria-label="Points de départ possibles">${entries.map(([i, t], k) => `<li style="--k:${k}">${ic(i, true)}<span>${t}</span></li>`).join('')}</ul>
        <div class="wel-ctas">
          <button type="button" class="btn big" data-wel="signup">Commencer</button>
          <button type="button" class="btn big ghost" data-wel="login">Se connecter</button>
        </div>
        <button type="button" class="link-btn wel-invite" data-wel="join">${ic('envelope-open')}J’ai une invitation</button>
      </section>
      <footer class="wel-foot"><button type="button" class="link-btn" data-wel="guest">Essayer sans compte</button><p>Sans compte, tes cours restent sur ce téléphone ; Pousse, l’analyse avancée et l’espace Business demandent un compte.</p></footer>`;
  }

  // Choix de l'espace : un seul compte, deux environnements, rien n'est définitif
  function orgList() {
    const os = orgs();
    if (!os.length) return '';
    return `<div class="wel-orgs"><h2>Tes organisations</h2>${os.map((o) => `<button type="button" class="wel-org" data-org="${esc(o.id)}">${ic('buildings', true)}<span><b>${esc(o.name)}</b><small>${esc(ROLE(o.role))}${o.owner ? ' · propriétaire' : ''}${o.unit ? ` · ${esc(o.unit)}` : ''}</small></span>${ic('caret-right')}</button>`).join('')}</div>`;
  }

  const field = (id, label, input, help = '') => `<div class="wel-field"><label for="${id}">${label}</label>${input}<p class="wel-err" id="${id}Err" role="alert"></p>${help}</div>`;
  const emailInput = (id, auto = true) => `<input id="${id}" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" ${auto ? 'autofocus' : ''} value="${esc(email)}" placeholder="toi@exemple.fr" />`;
  const passInput = (id, auto) => `<div class="wel-pass"><input id="${id}" type="password" autocomplete="${auto}" autocapitalize="off" spellcheck="false" /><button type="button" class="wel-eye" data-eye="${id}" aria-label="Afficher le mot de passe" aria-pressed="false">${ic('eye')}</button></div>`;
  const ruleList = `<ul class="wel-rules" aria-live="polite"><li data-rule="len">${ic('check-circle', true)}8 caractères minimum</li><li data-rule="mix">${ic('check-circle', true)}Au moins une lettre et un chiffre</li></ul>`;
  const submit = (label) => `<button type="submit" class="btn big wel-submit">${label}</button>`;
  const formErr = '<p class="wel-form-err" role="alert" hidden></p>';

  const SCREENS = {
    landing,
    signup: () => `<section class="wel-auth">
        <h1>Crée ton compte</h1><p class="wel-lede">Gratuit. Un seul compte pour apprendre seul et pour rejoindre ton organisation.</p>
        <form class="wel-form" data-form="signup" novalidate>
          ${field('welEmail', 'E-mail', emailInput('welEmail'))}
          ${field('welPass', 'Mot de passe', passInput('welPass', 'new-password'), ruleList)}
          ${formErr}${submit('Créer mon compte')}
        </form>
        <div class="wel-google" data-google hidden><div class="wel-or"><span>ou</span></div><button type="button" class="btn big ghost wel-wide">${ic('google-logo', true)}Continuer avec Google</button></div>
        <p class="wel-alt">Déjà un compte ? <button type="button" class="link-btn" data-wel="login" data-replace="1">Se connecter</button></p>
      </section>`,
    login: () => `<section class="wel-auth">
        <h1>Content de te revoir</h1><p class="wel-lede">Connecte-toi pour retrouver Pousse et ton espace professionnel.</p>
        <form class="wel-form" data-form="login" novalidate>
          ${field('welEmail', 'E-mail', emailInput('welEmail'))}
          ${field('welPass', 'Mot de passe', passInput('welPass', 'current-password'))}
          <button type="button" class="link-btn wel-forgot" data-wel="forgot">Mot de passe oublié ?</button>
          ${formErr}${submit('Se connecter')}
        </form>
        <div class="wel-or"><span>ou</span></div>
        <div class="wel-google" data-google hidden><button type="button" class="btn big ghost wel-wide">${ic('google-logo', true)}Continuer avec Google</button></div>
        <button type="button" class="btn big ghost wel-wide" data-wel="code">${ic('envelope-simple')}Recevoir un code par e-mail</button>
        <p class="wel-alt">Pas encore de compte ? <button type="button" class="link-btn" data-wel="signup" data-replace="1">Créer un compte</button></p>
      </section>`,
    forgot: (o) => o.sent ? `<section class="wel-auth wel-center">
        <span class="wel-badge">${ic('paper-plane-tilt', true)}</span>
        <h1>Regarde tes e-mails</h1>
        <p class="wel-lede">Si un compte existe pour <b>${esc(email)}</b>, un lien pour choisir un nouveau mot de passe vient de partir. Ouvre-le sur ce téléphone.</p>
        <button type="button" class="btn big wel-wide" data-wel="login" data-replace="1">Retour à la connexion</button>
      </section>` : `<section class="wel-auth">
        <h1>Mot de passe oublié</h1><p class="wel-lede">Indique ton adresse : tu recevras un lien pour en choisir un nouveau.</p>
        <form class="wel-form" data-form="forgot" novalidate>
          ${field('welEmail', 'E-mail', emailInput('welEmail'))}
          ${formErr}${submit('Envoyer le lien')}
        </form>
      </section>`,
    check: () => `<section class="wel-auth wel-center">
        <span class="wel-badge">${ic('envelope-simple-open', true)}</span>
        <h1>Confirme ton adresse</h1>
        <p class="wel-lede">On a envoyé un lien à <b>${esc(email)}</b>. Ouvre-le sur ce téléphone pour activer ton compte.</p>
        <p class="wel-note">Rien reçu ? Regarde dans les courriers indésirables. Si tu avais déjà un compte avec cette adresse, connecte-toi plutôt.</p>
        <div class="wel-stack">
          <button type="button" class="btn big wel-wide" data-wel="login" data-replace="1">J’ai confirmé, me connecter</button>
          <button type="button" class="btn big ghost wel-wide" data-wel="resend">Renvoyer l’e-mail</button>
          <button type="button" class="link-btn" data-wel="signup" data-replace="1">Modifier l’adresse</button>
        </div>
        ${formErr}
      </section>`,
    code: (o) => `<section class="wel-auth">
        <h1>Connexion par code</h1><p class="wel-lede">${o.sent ? `Code envoyé à <b>${esc(email)}</b>. Il expire au bout d’une heure.` : 'Pratique si ton compte a été créé sans mot de passe.'}</p>
        <form class="wel-form" data-form="${o.sent ? 'verify' : 'send-code'}" novalidate>
          ${o.sent ? field('welCode', 'Code reçu', '<input id="welCode" inputmode="numeric" autocomplete="one-time-code" maxlength="10" autofocus placeholder="123456" />') : field('welEmail', 'E-mail', emailInput('welEmail'))}
          ${formErr}${submit(o.sent ? 'Valider le code' : 'Recevoir le code')}
        </form>
        ${o.sent ? '<p class="wel-alt">Tu peux aussi ouvrir le lien reçu dans l’e-mail.</p>' : ''}
      </section>`,
    reset: () => `<section class="wel-auth">
        <h1>Choisis un nouveau mot de passe</h1><p class="wel-lede">Tu es connecté grâce au lien reçu. Il ne reste qu’à le définir.</p>
        <form class="wel-form" data-form="reset" novalidate>
          ${field('welPass', 'Nouveau mot de passe', passInput('welPass', 'new-password'), ruleList)}
          ${formErr}${submit('Enregistrer')}
        </form>
      </section>`,
    ready: (o) => `<section class="wel-auth wel-center wel-ready">
        <div class="wel-hero-art" aria-hidden="true">${pousse(120, 'joy')}</div>
        <h1>${o.how === 'signup' ? 'Ton compte est prêt' : o.how === 'reset' ? 'Mot de passe enregistré' : 'Te revoilà'}</h1>
        <p class="wel-lede">${o.how === 'reset' ? 'Tu es connecté avec ton nouveau mot de passe.' : 'Ton adresse est confirmée. Choisis maintenant par où commencer.'}</p>
        <button type="button" class="btn big wel-wide" data-wel="${o.how === 'reset' ? 'finish' : 'space'}">Continuer</button>
      </section>`,
    space: () => `<section class="wel-auth wel-space">
        <h1>Où veux-tu commencer ?</h1>
        <p class="wel-lede">Un seul compte pour les deux. Tes données personnelles et professionnelles restent séparées, et tu changes d’espace quand tu veux.</p>
        <button type="button" class="wel-choice wel-student" data-wel="pick-student">
          <span class="wel-choice-ic">${ic('plant', true)}</span>
          <span class="wel-choice-tx"><b>Student</b><em>Apprends à ta manière. Comprends réellement. Fais grandir tes connaissances.</em><small>Études, reconversion, curiosité, métier : pour apprendre seul.</small></span>
        </button>
        <button type="button" class="wel-choice wel-business" data-wel="business">
          <span class="wel-choice-ic">${ic('buildings', true)}</span>
          <span class="wel-choice-tx"><b>Business</b><em>Transformez vos formations en compétences démontrées et mesurables.</em><small>Entreprise, commerce, restaurant, organisme de formation, équipe.</small></span>
        </button>
        <div class="wel-orgs-slot">${orgList()}</div>
      </section>`,
    business: () => `<section class="wel-auth">
        <h1>Arbor pour ton organisation</h1>
        <p class="wel-lede">Ton organisation a son propre espace, séparé de ton espace personnel.</p>
        <div class="wel-orgs-slot">${orgList()}</div>
        <button type="button" class="wel-choice" data-wel="create-org"><span class="wel-choice-ic">${ic('plus-circle', true)}</span><span class="wel-choice-tx"><b>Créer une organisation</b><small>Pour former ton équipe à partir de tes documents. Environ 10 minutes, reprenable.</small></span></button>
        <button type="button" class="wel-choice" data-wel="join"><span class="wel-choice-ic">${ic('envelope-open', true)}</span><span class="wel-choice-tx"><b>J’ai une invitation</b><small>Ton responsable t’a envoyé un lien : rejoins ton équipe sans rien configurer.</small></span></button>
      </section>`,
    linkerr: (o) => `<section class="wel-auth wel-center">
        <span class="wel-badge wel-badge-warn">${ic('link-break', true)}</span>
        <h1>Ce lien ne marche plus</h1>
        <p class="wel-lede">${esc(o.msg || 'Le lien de connexion n’a pas fonctionné.')}</p>
        <div class="wel-stack">
          <button type="button" class="btn big wel-wide" data-wel="login" data-replace="1">Se connecter</button>
          ${email ? '<button type="button" class="btn big ghost wel-wide" data-wel="resend">Renvoyer l’e-mail de confirmation</button>' : ''}
          <button type="button" class="link-btn" data-wel="forgot">Mot de passe oublié ?</button>
        </div>
        ${formErr}
      </section>`,
  };

  /* ---------- Comportements ---------- */
  function setBusy(form, on, label) {
    const b = form.querySelector('.wel-submit');
    if (on) { b.dataset.label = b.textContent; b.textContent = label; b.disabled = true; b.setAttribute('aria-busy', 'true'); }
    else { b.textContent = b.dataset.label || b.textContent; b.disabled = false; b.removeAttribute('aria-busy'); }
  }
  function fieldErr(id, msg) {
    const p = stage().querySelector(`#${id}Err`), i = stage().querySelector(`#${id}`);
    if (p) p.textContent = msg || '';
    if (i) { i.setAttribute('aria-invalid', msg ? 'true' : 'false'); if (msg) i.setAttribute('aria-describedby', `${id}Err`); }
  }
  function formError(msg, action) {
    const p = stage().querySelector('.wel-form-err');
    if (!p) return;
    p.hidden = !msg;
    p.innerHTML = msg ? `${ic('warning-circle', true)}<span>${esc(msg)}</span>${action ? ` <button type="button" class="link-btn" data-wel="${action[0]}">${action[1]}</button>` : ''}` : '';
    wire();
    if (msg && !matchMedia('(prefers-reduced-motion: reduce)').matches) { p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake'); }
  }
  const val = (id) => { const i = stage().querySelector(`#${id}`); return i ? i.value.trim() : ''; };
  const raw = (id) => { const i = stage().querySelector(`#${id}`); return i ? i.value : ''; };
  function checkEmail() {
    const v = val('welEmail').toLowerCase();
    if (!v) { fieldErr('welEmail', 'Indique ton adresse e-mail.'); return ''; }
    if (!okEmail(v)) { fieldErr('welEmail', 'Cette adresse ne semble pas valide.'); return ''; }
    fieldErr('welEmail', ''); email = v; return v;
  }

  // Liens et boutons des écrans
  function wire() {
    stage().querySelectorAll('[data-wel]').forEach((b) => {
      if (b.dataset.wired) return; b.dataset.wired = '1';
      const k = b.dataset.wel;
      b.onclick = () => {
        const e = stage().querySelector('#welEmail'); if (e && e.value.trim()) email = e.value.trim().toLowerCase();
        if (k === 'guest') return finish('guest');
        if (k === 'join') return finish('join');
        if (k === 'create-org') return finish('create');
        if (k === 'pick-student') return finish('student');
        if (k === 'finish') return finish(d.lastHow || 'login');
        if (k === 'space' || k === 'business') { go(k, { replace: k === 'space' }); refreshOrgs(); return; }
        if (k === 'resend') return resend(b);
        go(k, { replace: !!b.dataset.replace, dir: 'next' });
      };
    });
    stage().querySelectorAll('[data-eye]').forEach((b) => {
      if (b.dataset.wired) return; b.dataset.wired = '1';
      b.onclick = () => {
        const i = stage().querySelector(`#${b.dataset.eye}`), show = i.type === 'password';
        i.type = show ? 'text' : 'password';
        b.setAttribute('aria-pressed', String(show)); b.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
        b.innerHTML = ic(show ? 'eye-slash' : 'eye');
      };
    });
    stage().querySelectorAll('[data-org]').forEach((b) => {
      if (b.dataset.wired) return; b.dataset.wired = '1';
      b.onclick = () => finish(`org:${b.dataset.org}`);
    });
    const pass = stage().querySelector('#welPass'), list = stage().querySelector('.wel-rules');
    if (pass && list && !pass.dataset.wired) {
      pass.dataset.wired = '1';
      pass.addEventListener('input', () => { const r = rules(pass.value); list.querySelectorAll('[data-rule]').forEach((li) => li.classList.toggle('ok', r[li.dataset.rule])); fieldErr('welPass', ''); });
    }
  }

  async function resend(b) {
    if (cool > Date.now()) return;
    const old = b.textContent; b.disabled = true; b.textContent = 'Envoi…';
    try {
      await Tutor.resend(email);
      cool = Date.now() + 60000;
      const tick = () => { const s = Math.ceil((cool - Date.now()) / 1000); if (!b.isConnected) return; if (s <= 0) { b.disabled = false; b.textContent = old; return; } b.textContent = `E-mail renvoyé (${s} s)`; coolTimer = setTimeout(tick, 1000); };
      tick();
    } catch (e) { b.disabled = false; b.textContent = old; formError(e.message); }
  }

  // Liste des organisations, mise à jour depuis la base pendant que l'écran est affiché
  function refreshOrgs() {
    if (!window.Org || !window.Tutor || !Tutor.signedIn()) return;
    Org.refresh().then(() => { const slot = el && stage().querySelector('.wel-orgs-slot'); if (slot) { slot.innerHTML = orgList(); wire(); } }).catch(() => {});
  }
  /* Connecté : écran de compte ouvert seul (réglages) → on referme ; sinon on reprend là où la personne en était
     (espace déjà choisi sur un autre appareil, organisations existantes) ou on lui fait choisir son espace. */
  async function afterSignIn() {
    if (standalone) return finish('login');
    const j = window.Journey ? await Journey.pull().catch(() => Journey.get()) : {};
    if (window.Org) await Org.refresh().catch(() => []);
    if (j.workspace === 'student' && j.studentDone) return finish('student');
    if (j.workspace === 'business' && orgs().length === 1) return finish(`org:${orgs()[0].id}`);
    go('space', { replace: true });
  }

  const bind = {
    landing: () => wire(),
    ready: () => wire(),
    check: () => wire(),
    space: () => wire(),
    business: () => wire(),
    linkerr: () => wire(),
    forgot: (o) => {
      wire(); if (o.sent) return;
      onSubmit('forgot', async (form) => {
        if (!checkEmail()) return;
        setBusy(form, true, 'Envoi…');
        try { await Tutor.recover(email); go('forgot', { sent: true, replace: true }); }
        catch (e) { setBusy(form, false); formError(e.message); }
      });
    },
    signup: () => {
      wire();
      onSubmit('signup', async (form) => {
        const em = checkEmail(), p = raw('welPass');
        let bad = !em;
        if (!okPass(p)) { fieldErr('welPass', p ? 'Le mot de passe ne respecte pas encore les règles ci-dessous.' : 'Choisis un mot de passe.'); bad = true; }
        if (bad) return;
        setBusy(form, true, 'Création…');
        try {
          const r = await Tutor.signUp(em, p);
          d.lastHow = 'signup';
          if (r.session) { if (window.Journey) Journey.set({ accountAt: Date.now() }); go('ready', { how: 'signup', replace: true }); }
          else go('check', { replace: true });
        } catch (e) {
          setBusy(form, false);
          if (e.code === 'exists') formError(e.message, ['login', 'Se connecter']);
          else if (e.code === 'weak') fieldErr('welPass', e.message);
          else formError(e.message);
        }
      });
    },
    login: () => {
      wire();
      onSubmit('login', async (form) => {
        const em = checkEmail(), p = raw('welPass');
        if (!p) fieldErr('welPass', 'Indique ton mot de passe.');
        if (!em || !p) return;
        setBusy(form, true, 'Connexion…');
        try { await Tutor.signInPassword(em, p); d.lastHow = 'login'; await afterSignIn(); }
        catch (e) {
          setBusy(form, false);
          if (e.code === 'unconfirmed') formError(e.message, ['resend', 'Renvoyer le lien']);
          else if (e.code === 'invalid') formError(`${e.message} Si ton compte a été créé avec un code, choisis « Mot de passe oublié » pour en définir un.`);
          else formError(e.message);
        }
      });
    },
    code: (o) => {
      wire();
      if (!o.sent) onSubmit('send-code', async (form) => {
        if (!checkEmail()) return;
        setBusy(form, true, 'Envoi…');
        try { await Tutor.signIn(email); go('code', { sent: true, replace: true }); }
        catch (e) { setBusy(form, false); formError(e.message); }
      });
      else onSubmit('verify', async (form) => {
        const c = val('welCode').replace(/\s/g, '');
        if (!/^\d{6,10}$/.test(c)) { fieldErr('welCode', 'Le code contient des chiffres seulement.'); return; }
        setBusy(form, true, 'Vérification…');
        try { await Tutor.verifyCode(email, c); d.lastHow = 'login'; await afterSignIn(); }
        catch (e) { setBusy(form, false); fieldErr('welCode', e.message); }
      });
    },
    reset: () => {
      wire();
      onSubmit('reset', async (form) => {
        const p = raw('welPass');
        if (!okPass(p)) { fieldErr('welPass', p ? 'Le mot de passe ne respecte pas encore les règles ci-dessous.' : 'Choisis un mot de passe.'); return; }
        setBusy(form, true, 'Enregistrement…');
        try { await Tutor.updatePassword(p); d.lastHow = 'reset'; go('ready', { how: 'reset', replace: true }); }
        catch (e) { setBusy(form, false); if (e.code === 'expired') formError(e.message, ['forgot', 'Nouveau lien']); else if (e.code === 'weak' || e.code === 'same') fieldErr('welPass', e.message); else formError(e.message); }
      });
    },
  };
  function onSubmit(name, fn) {
    const form = stage().querySelector(`form[data-form="${name}"]`);
    if (!form) return;
    form.addEventListener('submit', (e) => { e.preventDefault(); formError(''); if (!form.querySelector('.wel-submit').disabled) fn(form); });
    form.querySelectorAll('input').forEach((i) => i.addEventListener('input', () => { if (i.getAttribute('aria-invalid') === 'true') fieldErr(i.id, ''); }));
  }

  function close() {
    if (!el) return;
    clearTimeout(coolTimer);
    if (io) { io.disconnect(); io = null; }
    if (lot) { try { lot.destroy(); } catch (e) { /* déjà détruite */ } lot = null; }
    const node = el; el = null; history = []; screen = '';
    node.classList.remove('show');
    document.documentElement.classList.remove('in-onboarding', 'in-welcome');
    setTimeout(() => node.remove(), 320);
  }
  function finish(how) {
    mark(how);
    if (window.Journey && how !== 'login') Journey.set({ workspace: how === 'student' || how === 'guest' ? 'student' : 'business' });
    close();
    if (d.after) d.after(how);
  }
  let standalone = false;
  function open(deps, start = 'landing', opts = {}) {
    d = deps || {};
    if (el) el.remove();
    history = []; screen = ''; standalone = !!opts.standalone;
    shell();
    if (start !== 'landing') history.push('landing');
    screen = start;
    paint(SCREENS[start](opts), null);
    bind[start] && bind[start](opts);
    if (start === 'space' || start === 'business') refreshOrgs();
    // écran de compte ouvert seul (réglages, lien de récupération) : le retour ferme
    if (start !== 'landing' && opts.standalone) { history = []; const b = el.querySelector('[data-wel="back"]'); b.hidden = false; b.onclick = () => (history.length ? back() : close()); }
  }

  window.Welcome = {
    shouldOpen: () => !done() && !(window.Tutor && Tutor.signedIn()),
    open: (deps) => open(deps, 'landing'),
    // Écran de compte seul, par exemple depuis les réglages : 'login' ou 'signup'
    auth: (deps, start = 'login') => { email = (window.Tutor && Tutor.lastEmail()) || email; open(deps, start, { standalone: true }); },
    active: () => !!el,
    deps: (x) => { d = x || d; },
    // Choisir son espace (reprise après connexion, ou depuis les réglages)
    space: (deps) => open(deps, 'space', {}),
    needsSpace: () => !!(window.Tutor && Tutor.signedIn() && window.Journey && !Journey.get().workspace),
    // Retour d'un lien e-mail (confirmation, mot de passe, Google) pendant que l'app est ouverte, ou au lancement
    handle(n) {
      if (!n) return false;
      email = email || (window.Tutor && Tutor.lastEmail()) || '';
      if (!n.ok) { open(d, 'linkerr', { msg: n.msg, standalone: true }); return true; }
      if (n.type === 'recovery') { mark('reset'); open(d, 'reset', { standalone: true }); history = []; return true; }
      if (window.Journey) Journey.set({ accountAt: Journey.get().accountAt || Date.now() });
      if (el) { mark('signup'); d.lastHow = 'signup'; go('ready', { how: 'signup', replace: true }); return true; }
      // Adresse confirmée ou retour de Google sur un appareil où rien n'est encore choisi : choisir son espace
      if (window.Journey && !Journey.get().workspace) { d.lastHow = n.type === 'signup' ? 'signup' : 'login'; open(d, n.type === 'signup' ? 'ready' : 'space', { how: 'signup' }); if (n.type !== 'signup') refreshOrgs(); return true; }
      mark(n.type === 'signup' ? 'signup' : 'login');
      return false;
    },
    reset: () => { try { localStorage.removeItem(FLAG); } catch (e) { /* rien */ } },
  };
})();
