/* Découverte Business (docs/ux-v51.md, P0 « reverse-onboarding ») : montrer la valeur avant de configurer.
   1. Une situation de terrain (secteur + une phrase).  2. Une simulation Client Mystère jouable tout de suite.
   3. Un débrief clair.  4. « Rendre la simulation fidèle à vos procédures » : importer, écrire une règle ou continuer.
   Rien n'est enregistré pendant la démonstration (serveur : tâches decouverte_*, sans organisation ni preuve).
   Les règles que le client suppose sont des connaissances SUGGÉRÉES par l'IA : affichées comme telles, jamais comme des
   règles de l'entreprise, et jamais enregistrées dans la Base de savoir. Le contexte (secteur, situation, choix) est
   transmis à la mise en route express pour ne rien redemander. */
(function () {
  let d = null;
  const K = 'arbor:discover';
  const SECTORS = [
    ['Commerce et distribution', 'storefront', 'Un client exige le remboursement d’un article soldé, acheté il y a six semaines, et commence à s’énerver devant la file d’attente.'],
    ['Hôtellerie et restauration', 'fork-knife', 'Un client attend son plat depuis quarante minutes, interpelle le serveur devant toute la salle et exige que son repas soit offert.'],
    ['Services', 'handshake', 'Un client conteste une facture plus élevée que le devis et menace de partir chez un concurrent.'],
    ['Santé', 'first-aid', 'Un patient s’impatiente à l’accueil : son rendez-vous a une heure de retard et il doit récupérer ses enfants.'],
    ['Éducation et formation', 'graduation-cap', 'Un parent conteste la note de son enfant et demande à voir l’enseignant immédiatement.'],
    ['Autre', 'dots-three', ''],
  ];
  const ctxGet = () => { try { return JSON.parse(sessionStorage.getItem(K) || 'null'); } catch (e) { return null; } };
  const ctxSet = (v) => { try { if (v) sessionStorage.setItem(K, JSON.stringify({ ...v, at: Date.now() })); else sessionStorage.removeItem(K); } catch (e) { /* session privée : le contexte n'est pas transmis, rien ne casse */ } };
  const srv = (p, onWait) => (window.OrgLearn && OrgLearn.srv ? OrgLearn.srv(p, onWait) : Tutor.ask(p));
  // serveur pas encore mis à jour : la démonstration n'existe pas, on le dit et on propose la création directe
  const notDeployed = (e) => /mode invalide|inconnu|not found|404/i.test(String(e && e.message));

  function frame(step, body, foot) {
    const S = ['Votre situation', 'Simulation', 'Débrief'];
    return `<section class="obz sx dc">
      <header class="obz-head"><a class="obz-quit" href="#/">${d.ic('x')}<span>Plus tard</span></a>
        <div class="sx-steps" aria-label="Étape ${step + 1} sur 3">${S.map((l, j) => `<span class="${j < step ? 'done' : j === step ? 'cur' : ''}">${j < step ? d.ic('check', true) : j + 1}<small>${l}</small></span>`).join('')}</div></header>
      <div class="obz-body">${body}</div><footer class="obz-foot">${foot}</footer></section>`;
  }

  /* ---------- 1. La situation ---------- */
  function intro(app) {
    const prev = ctxGet() || {};
    let sector = prev.sector || '';
    app.innerHTML = frame(0, `<span class="obz-badge">${(window.Mascot && Mascot.mini({ size: 56, mood: 'happy' })) || d.ic('storefront', true)}</span>
      <h1>Voyez Arbor en action avec votre équipe</h1>
      <p class="obz-lede">Décrivez une situation que vivent vos collaborateurs. Arbor en fait une simulation que vous jouez tout de suite, puis vous montre le débrief. Aucune configuration, rien n’est enregistré.</p>
      <form class="obz-form" id="dcForm" novalidate>
        <fieldset class="field"><legend>Votre secteur</legend><div class="sx-sectors" role="radiogroup">${SECTORS.map(([l, icn]) => `<label><input type="radio" name="dcSector" value="${l}" ${sector === l ? 'checked' : ''} /><span>${d.ic(icn, true)}${l}</span></label>`).join('')}</div></fieldset>
        <div class="field"><label for="dcSit">Une situation de terrain</label>
          <textarea id="dcSit" rows="3" maxlength="600" placeholder="Un client exige un remboursement hors délai et commence à s’énerver.">${d.esc(prev.situation || '')}</textarea>
          <p class="fb-help">Une ou deux phrases suffisent. <button type="button" class="link-btn" id="dcEx">Utiliser un exemple</button></p>
          <p class="wel-err" id="dcErr" role="alert"></p></div>
      </form>`,
      `<a class="btn ghost" href="#/org/nouvelle/espace" id="dcDirect">Créer directement mon espace</a><button class="btn big" id="dcGo">${d.ic('play', true)}Lancer la simulation</button>`);
    const sit = app.querySelector('#dcSit');
    app.querySelectorAll('input[name="dcSector"]').forEach((r) => { r.onchange = () => { sector = r.value; }; });
    app.querySelector('#dcEx').onclick = () => {
      const row = SECTORS.find(([l, , ex]) => l === sector && ex) || SECTORS[0];
      if (!sector || !row[2]) { sector = row[0]; const r = app.querySelector(`input[name="dcSector"][value="${row[0]}"]`); if (r) r.checked = true; }
      sit.value = row[2]; sit.focus();
    };
    app.querySelector('#dcDirect').onclick = () => ctxSet({ ...(ctxGet() || {}), sector });
    app.querySelector('#dcGo').onclick = async () => {
      const situation = sit.value.trim(), err = app.querySelector('#dcErr');
      if (situation.length < 20) { err.textContent = 'Décrivez la situation en une phrase complète (ou utilisez un exemple).'; sit.focus(); return; }
      err.textContent = '';
      const b = app.querySelector('#dcGo'); b.disabled = true;
      app.querySelector('.obz-foot').insertAdjacentHTML('afterbegin', `<span class="hint" id="dcWait" role="status">${d.ic('hourglass-medium')}Le client arrive…</span>`);
      try {
        const s = await srv({ task: 'decouverte_start', sector, situation }, (m) => { const w = app.querySelector('#dcWait'); if (w) w.textContent = m; });
        ctxSet({ sector, situation, assumptions: s.spec.assumptions || [] });
        play(app, s, [{ role: 'client', text: s.opening }]);
      } catch (e) {
        b.disabled = false; const w = app.querySelector('#dcWait'); if (w) w.remove();
        err.innerHTML = notDeployed(e) ? 'La simulation de découverte n’est pas encore disponible. Vous pouvez créer votre espace directement : elle sera proposée ensuite avec vos propres règles.' : /connexion|network|fetch/i.test(e.message) ? 'Pas de connexion : réessayez dans un instant.' : d.esc(e.message);
      }
    };
  }

  /* ---------- 2. La simulation ---------- */
  function play(app, s, log) {
    const left = () => s.max_turns - log.filter((t) => t.role === 'vous').length;
    const line = (t) => `<div class="ms-line ${t.role === 'client' ? 'client' : 'toi'}"><b>${t.role === 'client' ? d.esc(s.spec.name) : 'Vous'}</b><p>${d.esc(t.text)}</p></div>`;
    app.innerHTML = frame(1, `<div class="ms-chat dc-chat">
        <p class="dc-note">${d.ic('info')}<span><b>Démonstration.</b> Le client ne connaît pas encore vos procédures : les règles évoquées sont des hypothèses. Répondez comme le ferait un collaborateur.</span></p>
        <div class="ms-head"><span class="org-badge" aria-hidden="true">${d.ic('user', true)}</span><div><b>${d.esc(s.spec.name)}</b><small>${d.esc(s.spec.profile || 'Client')}</small></div><span class="dc-left num" id="dcLeft">${left()} réponse${left() > 1 ? 's' : ''} restante${left() > 1 ? 's' : ''}</span></div>
        <div class="ms-feed" id="dcFeed" aria-live="polite">${log.map(line).join('')}</div>
        <form class="ms-form" id="dcChat"><label for="dcText" class="sr-only">Votre réponse au client</label><textarea id="dcText" rows="2" maxlength="800" placeholder="Votre réponse au client…" required></textarea>
          <div class="row-btns"><button class="btn" id="dcSend">${d.ic('paper-plane-tilt')}Répondre</button></div><p class="hint" id="dcMsg" role="status"></p></form></div>`,
      `<span></span><button class="btn ghost" id="dcEnd" ${log.some((t) => t.role === 'vous') ? '' : 'disabled'}>${d.ic('flag-checkered')}Terminer et voir le débrief</button>`);
    const feed = app.querySelector('#dcFeed'); feed.scrollTop = feed.scrollHeight;
    const text = app.querySelector('#dcText'); text.focus();
    const end = async () => {
      const m = app.querySelector('#dcMsg'); m.textContent = 'Préparation du débrief…';
      app.querySelectorAll('#dcSend, #dcEnd').forEach((x) => { x.disabled = true; });
      try { const r = await srv({ task: 'decouverte_fin', spec: s.spec, transcript: log }); debrief(app, s, log, r.debrief); }
      catch (e) { m.textContent = e.message; app.querySelectorAll('#dcSend, #dcEnd').forEach((x) => { x.disabled = false; }); }
    };
    app.querySelector('#dcEnd').onclick = end;
    text.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); app.querySelector('#dcChat').requestSubmit(); } });
    app.querySelector('#dcChat').onsubmit = async (e) => {
      e.preventDefault();
      const msg = text.value.trim(); if (msg.length < 2) return;
      const m = app.querySelector('#dcMsg'); m.textContent = `${s.spec.name} réfléchit…`;
      app.querySelector('#dcSend').disabled = true;
      try {
        const r = await srv({ task: 'decouverte_tour', spec: s.spec, transcript: log, message: msg });
        log.push({ role: 'vous', text: msg }, { role: 'client', text: r.reply });
        if (r.done) { play(app, s, log); const n = app.querySelector('#dcMsg'); n.textContent = r.satisfied ? 'Le client est apaisé. Voyons le débrief…' : r.leaves ? 'Le client est parti. Voyons le débrief…' : 'Fin de la simulation. Voyons le débrief…'; await new Promise((ok) => setTimeout(ok, 900)); return end(); }
        play(app, s, log);
      } catch (x) { m.textContent = x.message; app.querySelector('#dcSend').disabled = false; }
    };
  }

  /* ---------- 3. Débrief, puis 4. connecter les connaissances ---------- */
  function debrief(app, s, log, db) {
    const L = (items, icon) => items.map((x) => `<li>${d.ic(icon, true)}<span>${d.esc(x)}</span></li>`).join('');
    app.innerHTML = frame(2, `<h1>Votre débrief</h1>
      <p class="obz-lede">Voici ce que votre équipe verrait après chaque simulation. Ce débrief de démonstration n’est pas enregistré et ne compte pour personne.</p>
      <div class="dc-grid">
        ${db.decisions.length ? `<section class="dc-box"><h2>${d.ic('signpost')}Décisions prises</h2><ul class="dc-list">${L(db.decisions, 'arrow-right')}</ul></section>` : ''}
        <section class="dc-box"><h2>${d.ic('thumbs-up')}Points forts</h2>${db.strengths.length ? `<ul class="dc-list">${db.strengths.map((x) => `<li>${d.ic('check-circle', true)}<span>${d.esc(x.text)}<small>« ${d.esc(x.quote)} »</small></span></li>`).join('')}</ul>` : '<p class="hint">Aucun point fort relevé avec une phrase précise de l’échange.</p>'}</section>
        ${db.misses.length ? `<section class="dc-box"><h2>${d.ic('warning-circle')}Oublis et points à travailler</h2><ul class="dc-list dc-miss">${L(db.misses, 'circle-dashed')}</ul></section>` : ''}
        ${db.improvements.length ? `<section class="dc-box"><h2>${d.ic('lightbulb')}Pistes pour la prochaine fois</h2><ul class="dc-list">${L(db.improvements, 'arrow-up-right')}</ul></section>` : ''}
      </div>
      ${db.skills.length ? `<p class="dc-skills"><b>Compétences mobilisées :</b> ${db.skills.map((x) => `<span class="tb-tag">${d.esc(x)}</span>`).join(' ')}</p>` : ''}
      <section class="dc-connect">
        <h2>Rendez cette simulation fidèle à vos procédures</h2>
        <p>Pour jouer cette scène, Arbor a dû supposer des règles. Ajoutez votre politique (par exemple vos conditions de remboursement) : vos collaborateurs s’entraîneront sur <b>vos</b> règles, et leurs réponses seront vérifiées par rapport à elles.</p>
        ${db.assumptions.length ? `<ul class="dc-hyp" aria-label="Règles supposées par l’IA">${db.assumptions.map((x) => `<li><span class="tb-tag warn">Suggérée par l’IA</span>${d.esc(x.replace(/^Hypothèse\s*:\s*/i, ''))}</li>`).join('')}</ul>
          <p class="hint">${d.ic('info')}Une règle suggérée n’est jamais utilisée comme règle de l’entreprise. Elle le devient seulement si vous la retrouvez dans un document ou l’écrivez vous-même, puis la confirmez.</p>` : ''}
        <div class="sx-choice dc-choice">
          <button type="button" class="sx-opt" data-dc="file">${d.ic('file-arrow-up', true)}<b>Importer un document</b><small>Procédure, règlement, fiche produit (PDF).</small></button>
          <button type="button" class="sx-opt" data-dc="rule">${d.ic('pencil-simple-line', true)}<b>Écrire une règle</b><small>Quelques phrases suffisent.</small></button>
          <button type="button" class="sx-opt" data-dc="skip">${d.ic('arrow-right', true)}<b>Continuer sans document</b><small>Vous ajouterez vos règles plus tard.</small></button>
        </div>
        <p class="hint">Chaque choix crée d’abord votre espace : il ne faut que son nom.</p>
      </section>`,
      `<button type="button" class="btn ghost" id="dcAgain">${d.ic('arrow-counter-clockwise')}Rejouer une situation</button><span></span>`);
    app.querySelector('#dcAgain').onclick = () => intro(app);
    app.querySelectorAll('[data-dc]').forEach((b) => { b.onclick = () => { ctxSet({ ...(ctxGet() || {}), choice: b.dataset.dc }); d.go('#/org/nouvelle/espace'); }; });
  }

  function render(app, deps) {
    d = deps;
    if (!window.Tutor || !Tutor.signedIn()) {
      app.innerHTML = `<section class="sec org-join"><h1>Arbor pour les équipes</h1><p>Décrivez une situation de terrain : Arbor en fait une simulation que vous jouez tout de suite. Il faut un compte (gratuit) ; vos cours personnels restent sur cet appareil.</p><div class="row-btns"><button class="btn" id="dcLogin">${d.ic('sign-in')}Se connecter ou créer un compte</button></div></section>`;
      app.querySelector('#dcLogin').onclick = () => Welcome.auth({ after: () => render(app, deps) }, 'signup');
      return;
    }
    return intro(app);
  }

  window.OrgDiscover = { render, context: ctxGet, clear: () => ctxSet(null), SECTORS };
})();
