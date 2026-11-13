/* Formulaire de retour des participants (pilote G7, migration 010).
   Une question par écran, une pousse qui grandit d'étape en étape, une confirmation avec Pousse.
   - Rien d'obligatoire : chaque réponse aide, aucune n'est exigée (il en faut au moins une pour envoyer).
   - Le brouillon reste sur l'appareil jusqu'à l'envoi confirmé par la base ; un envoi raté ne perd rien
     (réessayer, copier ou télécharger ses réponses).
   - Retour Business : lisible par son auteur et par les responsables de l'organisation. Retour Student : par son auteur
     et l'équipe Arbor seulement. Aucun contenu de cours n'est envoyé. */
(function () {
  let el = null, S = null, d = null, lastFocus = null;
  const STEPS = ['intro', 'blocked', 'learned', 'use', 'recap'];
  const LEARN = [[1, 'Pas du tout'], [2, 'Un peu'], [3, 'Moyennement'], [4, 'Oui'], [5, 'Beaucoup']];
  const EASE = [[1, 'Très difficile'], [2, 'Difficile'], [3, 'Correct'], [4, 'Facile'], [5, 'Très facile']];
  const USE = [['oui', 'Oui', 'thumbs-up'], ['peut_etre', 'Peut-être', 'hand-palm'], ['non', 'Non', 'thumbs-down']];
  const PILOT = ['Utilisation libre', ...Array.from({ length: 13 }, (_, i) => `Étape ${i + 1} du pilote`)];
  const key = () => `arbor:feedback-draft:${S.space}:${S.org ? S.org.id : 'perso'}`;
  const store = { get: (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }, del: (k) => { try { localStorage.removeItem(k); } catch (e) { /* rien */ } } };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const blank = () => ({ pilot_step: '', blocked: '', learned_score: null, learned: '', would_use: null, would_use_why: '', ease: null });
  const hasAnswer = (a) => !!(a.blocked.trim() || a.learned_score || a.learned.trim() || a.would_use || a.ease);
  const label = (list, v) => (list.find((x) => x[0] === v) || [])[1] || 'pas de réponse';

  function open({ space, org = null, deps }) {
    d = deps; lastFocus = document.activeElement;
    S = { space, org, step: 0, a: blank(), sending: false, done: false };
    const draft = store.get(key());
    if (draft) { S.a = { ...blank(), ...draft.a }; S.step = Math.min(draft.step || 0, STEPS.length - 1); }
    if (el) el.remove();
    el = document.createElement('div');
    el.className = 'fb-veil';
    el.innerHTML = `<section class="fb" role="dialog" aria-modal="true" aria-labelledby="fbTitle">
      <header class="fb-top"><div class="fb-grow" aria-hidden="true"><span class="fb-track"><i class="fb-fill"></i></span><span class="fb-sprout">${d.ic('plant', true)}</span></div>
        <button type="button" class="icon-btn fb-close" aria-label="Fermer (le brouillon est gardé)">${d.ic('x')}</button></header>
      <div class="fb-stage" aria-live="polite"></div>
      <footer class="fb-foot"></footer></section>`;
    document.body.appendChild(el);
    document.documentElement.classList.add('fb-open');
    requestAnimationFrame(() => el.classList.add('in'));
    el.querySelector('.fb-close').onclick = close;
    el.addEventListener('mousedown', (e) => { if (e.target === el) close(); });
    document.addEventListener('keydown', onKey, true); // au niveau du document : le focus ne peut pas sortir du dialogue
    paint(0);
  }
  function close() {
    if (!el) return;
    saveDraft();
    const node = el; el = null;
    document.removeEventListener('keydown', onKey, true);
    node.classList.remove('in'); node.classList.add('out');
    document.documentElement.classList.remove('fb-open');
    setTimeout(() => node.remove(), reduced() ? 0 : 260);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function onKey(e) {
    if (!el) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = [...el.querySelectorAll('button:not([disabled]), [href], input, select, textarea')].filter((x) => x.getClientRects().length);
    if (!f.length) return;
    const i = f.indexOf(document.activeElement);
    // focus hors du dialogue, ou en bout de liste : on boucle à l'intérieur
    if (i === -1) { e.preventDefault(); (e.shiftKey ? f[f.length - 1] : f[0]).focus(); }
    else if (e.shiftKey && i === 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  }
  const saveDraft = () => { if (S && !S.done && (hasAnswer(S.a) || S.a.pilot_step)) store.set(key(), { a: S.a, step: S.step, at: Date.now() }); };

  // Écran d'une étape : la pousse avance, le contenu glisse dans le sens de la navigation
  function paint(dir) {
    const stage = el.querySelector('.fb-stage');
    const name = STEPS[S.step];
    el.querySelector('.fb').style.setProperty('--p', String(S.step / (STEPS.length - 1)));
    el.querySelector('.fb-grow').setAttribute('aria-label', `Question ${Math.min(S.step, 3)} sur 3`);
    stage.classList.remove('from-next', 'from-prev'); void stage.offsetWidth;
    if (dir) stage.classList.add(dir > 0 ? 'from-next' : 'from-prev');
    stage.innerHTML = SCREENS[name]();
    el.querySelector('.fb-foot').innerHTML = foot(name);
    bind(name);
    const first = stage.querySelector('[data-autofocus]') || stage.querySelector('h2');
    if (first) { if (first.tagName === 'H2') first.setAttribute('tabindex', '-1'); first.focus({ preventScroll: true }); }
  }
  const go = (n) => { const dir = n > S.step ? 1 : -1; S.step = Math.max(0, Math.min(STEPS.length - 1, n)); saveDraft(); paint(dir); };
  const who = () => (S.space === 'business'
    ? `Lu par les responsables de ${d.esc(S.org.name)} et par l’équipe Arbor.`
    : 'Lu par l’équipe Arbor seulement. Ton espace personnel et tes cours ne sont pas envoyés.');
  const scale = (name, list, cur) => `<div class="fb-scale" role="radiogroup">${list.map(([v, l]) => `<label class="fb-pill"><input type="radio" name="${name}" value="${v}" ${cur === v ? 'checked' : ''} /><span><b>${v}</b><small>${l}</small></span></label>`).join('')}</div>`;

  const SCREENS = {
    intro: () => `<div class="fb-hero">${(window.Mascot && Mascot.mini({ size: 64, mood: 'happy' })) || d.ic('plant', true)}
        <h2 id="fbTitle">Ton avis fait grandir Arbor</h2>
        <p>Trois questions, environ deux minutes. Aucune réponse n’est obligatoire, et il n’y a pas de bonne réponse.</p></div>
      <div class="field"><label for="fbStep">Où en es-tu ?</label><select id="fbStep" data-autofocus>${PILOT.map((p) => `<option ${S.a.pilot_step === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
      <p class="fb-note">${d.ic('lock-simple')}${who()}</p>`,
    blocked: () => `<h2 id="fbTitle"><span class="fb-n">1</span>Qu’est-ce qui t’a bloqué ou semblé confus ?</h2>
      <div class="field"><label for="fbBlocked">Ce qui a coincé</label><textarea id="fbBlocked" rows="5" maxlength="2000" data-autofocus placeholder="Un écran, un mot, une étape où tu ne savais plus quoi faire…">${d.esc(S.a.blocked)}</textarea>
      <p class="fb-help">Plus c’est précis (l’écran, le bouton, le message), plus c’est utile.</p></div>`,
    learned: () => `<h2 id="fbTitle"><span class="fb-n">2</span>As-tu eu l’impression d’apprendre quelque chose ?</h2>
      ${scale('fbLearn', LEARN, S.a.learned_score)}
      <div class="field"><label for="fbLearned">Quoi, par exemple ?</label><textarea id="fbLearned" rows="3" maxlength="2000" placeholder="Une règle, une erreur que tu faisais, une façon de t’entraîner…">${d.esc(S.a.learned)}</textarea></div>`,
    use: () => `<h2 id="fbTitle"><span class="fb-n">3</span>Utiliserais-tu Arbor sans qu’on te le demande ?</h2>
      <div class="fb-choices" role="radiogroup">${USE.map(([v, l, icn]) => `<label class="fb-choice"><input type="radio" name="fbUse" value="${v}" ${S.a.would_use === v ? 'checked' : ''} /><span>${d.ic(icn, true)}<b>${l}</b></span></label>`).join('')}</div>
      <div class="field"><label for="fbWhy">Pourquoi ?</label><textarea id="fbWhy" rows="2" maxlength="1000" placeholder="Ce qui te ferait revenir, ou ce qui t’en empêche">${d.esc(S.a.would_use_why)}</textarea></div>
      <p class="label-like">Et l’application, facile à utiliser ?</p>${scale('fbEase', EASE, S.a.ease)}`,
    recap: () => `<h2 id="fbTitle">Prêt à envoyer</h2>
      <dl class="fb-recap">
        <dt>Moment</dt><dd>${d.esc(S.a.pilot_step || 'Utilisation libre')}</dd>
        <dt>Ce qui a coincé</dt><dd>${S.a.blocked.trim() ? d.esc(S.a.blocked) : '<i>pas de réponse</i>'}</dd>
        <dt>Apprendre</dt><dd>${S.a.learned_score ? `${S.a.learned_score}/5, ${label(LEARN, S.a.learned_score).toLowerCase()}` : '<i>pas de réponse</i>'}${S.a.learned.trim() ? `<br>${d.esc(S.a.learned)}` : ''}</dd>
        <dt>Y revenir</dt><dd>${S.a.would_use ? label(USE, S.a.would_use) : '<i>pas de réponse</i>'}${S.a.would_use_why.trim() ? `<br>${d.esc(S.a.would_use_why)}` : ''}</dd>
        <dt>Facilité</dt><dd>${S.a.ease ? `${S.a.ease}/5, ${label(EASE, S.a.ease).toLowerCase()}` : '<i>pas de réponse</i>'}</dd>
      </dl>
      <p class="fb-note">${d.ic('lock-simple')}${who()}</p>
      <p class="wel-form-err fb-err" id="fbErr" role="alert" hidden></p>`,
  };
  function foot(name) {
    const i = STEPS.indexOf(name);
    const back = i > 0 ? `<button type="button" class="btn ghost" data-fb="back">${d.ic('arrow-left')}Retour</button>` : '<span></span>';
    if (name === 'recap') return `${back}<button type="button" class="btn big" data-fb="send" ${hasAnswer(S.a) ? '' : 'disabled'}>${d.ic('paper-plane-tilt', true)}Envoyer</button>`;
    return `${back}<button type="button" class="btn big" data-fb="next">${i === 0 ? 'Commencer' : 'Continuer'}${d.ic('arrow-right')}</button>`;
  }
  // Chaque saisie est gardée tout de suite (brouillon sur l'appareil)
  function bind(name) {
    const $ = (s) => el.querySelector(s);
    const keep = () => saveDraft();
    if (name === 'intro') $('#fbStep').onchange = (e) => { S.a.pilot_step = e.target.value === PILOT[0] ? '' : e.target.value; keep(); };
    if (name === 'blocked') $('#fbBlocked').oninput = (e) => { S.a.blocked = e.target.value; keep(); };
    if (name === 'learned') { $('#fbLearned').oninput = (e) => { S.a.learned = e.target.value; keep(); }; }
    if (name === 'use') { $('#fbWhy').oninput = (e) => { S.a.would_use_why = e.target.value; keep(); }; }
    el.querySelectorAll('input[type="radio"]').forEach((r) => { r.onchange = () => {
      const v = r.name === 'fbUse' ? r.value : Number(r.value);
      if (r.name === 'fbLearn') S.a.learned_score = v; if (r.name === 'fbEase') S.a.ease = v; if (r.name === 'fbUse') S.a.would_use = v;
      const box = r.closest('.fb-pill, .fb-choice'); box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
      keep();
    }; });
    const nx = el.querySelector('[data-fb="next"]'); if (nx) nx.onclick = () => go(S.step + 1);
    const bk = el.querySelector('[data-fb="back"]'); if (bk) bk.onclick = () => go(S.step - 1);
    const sd = el.querySelector('[data-fb="send"]'); if (sd) sd.onclick = send;
  }

  const textOf = () => [`Retour Arbor (${S.space === 'business' ? S.org.name : 'espace personnel'}), ${new Date().toLocaleString('fr-FR')}`,
    `Moment : ${S.a.pilot_step || 'Utilisation libre'}`, `Ce qui a coincé : ${S.a.blocked || '-'}`,
    `Apprendre : ${S.a.learned_score ? `${S.a.learned_score}/5` : '-'} ${S.a.learned || ''}`.trim(),
    `Y revenir : ${S.a.would_use ? label(USE, S.a.would_use) : '-'} ${S.a.would_use_why || ''}`.trim(), `Facilité : ${S.a.ease ? `${S.a.ease}/5` : '-'}`].join('\n');

  async function send() {
    if (S.sending || !hasAnswer(S.a)) return;
    const btn = el.querySelector('[data-fb="send"]'), err = el.querySelector('#fbErr');
    err.hidden = true;
    if (!window.Tutor || !Tutor.signedIn()) return fallback('Connecte-toi pour envoyer ton retour, ou garde tes réponses ci-dessous pour les transmettre autrement.');
    S.sending = true; btn.disabled = true; btn.setAttribute('aria-busy', 'true');
    const row = { space: S.space, org_id: S.org ? S.org.id : null, pilot_step: S.a.pilot_step || null, blocked: S.a.blocked.trim().slice(0, 2000), learned_score: S.a.learned_score,
      learned: S.a.learned.trim().slice(0, 2000), would_use: S.a.would_use, would_use_why: S.a.would_use_why.trim().slice(0, 1000), ease: S.a.ease, app_version: String(window.ARBOR_VERSION || '') };
    try {
      await Promise.race([Tutor.rest('/rest/v1/feedback', { body: row }), new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('délai dépassé'), { kind: 'timeout' })), 15000))]);
      S.done = true; store.del(key());
      success(btn);
    } catch (e) {
      S.sending = false; btn.disabled = false; btn.removeAttribute('aria-busy');
      const missing = /could not find|PGRST20[25]|does not exist|42P01/i.test(String(e.message));
      if (missing) return fallback('Le formulaire n’est pas encore activé sur le serveur (mise à jour 010). Tes réponses sont gardées sur cet appareil.');
      err.hidden = false;
      err.textContent = e.kind === 'offline' || /connexion impossible/i.test(e.message) ? 'Pas de connexion : ton retour n’est pas envoyé. Il est gardé ici, réessaie dans un instant.'
        : e.kind === 'timeout' ? 'Le serveur met trop de temps à répondre. Ton retour est gardé ici, réessaie.'
        : e.kind === 'auth' ? 'Ta session a expiré : reconnecte-toi, ton retour est gardé ici.'
        : `Envoi impossible (${e.message}). Ton retour est gardé ici.`;
      el.querySelector('.fb-foot').insertAdjacentHTML('afterbegin', el.querySelector('[data-fb="copy"]') ? '' : `<button type="button" class="btn ghost" data-fb="copy">${d.ic('copy')}Copier mes réponses</button>`);
      el.querySelector('[data-fb="copy"]').onclick = copy;
    }
  }
  function copy() {
    const t = textOf();
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => d.toast('Réponses copiées', 'success'), () => download());
  }
  function download() {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([textOf()], { type: 'text/plain;charset=utf-8' }));
    a.download = 'arbor-mon-retour.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function fallback(msg) {
    const stage = el.querySelector('.fb-stage');
    stage.innerHTML = `<h2 id="fbTitle" tabindex="-1">Ton retour n’est pas perdu</h2><p>${d.esc(msg)}</p><pre class="fb-copy">${d.esc(textOf())}</pre>`;
    el.querySelector('.fb-foot').innerHTML = `<button type="button" class="btn ghost" data-fb="dl">${d.ic('download-simple')}Télécharger</button><button type="button" class="btn" data-fb="copy">${d.ic('copy')}Copier</button>`;
    el.querySelector('[data-fb="copy"]').onclick = copy; el.querySelector('[data-fb="dl"]').onclick = download;
    stage.querySelector('h2').focus();
  }
  function success(btn) {
    const r = btn.getBoundingClientRect();
    el.querySelector('.fb').style.setProperty('--p', '1');
    el.querySelector('.fb').classList.add('fb-done');
    const stage = el.querySelector('.fb-stage');
    stage.classList.remove('from-next', 'from-prev'); void stage.offsetWidth; stage.classList.add('from-next');
    stage.innerHTML = `<div class="fb-hero fb-thanks">${(window.Mascot && Mascot.mini({ size: 84, mood: 'happy' })) || d.ic('plant', true)}
      <h2 id="fbTitle" tabindex="-1">Merci, c’est envoyé</h2><p>Chaque retour est lu. Il servira à décider de la suite d’Arbor, avant toute nouvelle fonctionnalité.</p></div>`;
    el.querySelector('.fb-foot').innerHTML = `<span></span><button type="button" class="btn big" data-fb="done">Fermer</button>`;
    el.querySelector('[data-fb="done"]').onclick = close;
    stage.querySelector('h2').focus();
    if (window.Motion && Motion.burst) Motion.burst(r.left + r.width / 2, r.top + r.height / 2, 12);
  }

  window.Feedback = { open, close, _state: () => S };
})();
