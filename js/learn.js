/* Arbor 3 · « Apprendre une notion » : l'écran du moteur de parcours (js/pedagogie/parcours.js).
   Exemple concret → Explication → (exemple résolu si l'on découvre) → Compréhension → Application → Transfert → Bilan.
   Rien n'est à deviner : l'apprenant déclare où il en est, puis voit un cas expliqué avant de s'exercer. L'ordre, la remédiation et les preuves
   viennent du moteur ; cet écran ne fait qu'afficher et transmettre les réponses.
   - Notion avec fiche : les réussites sont enregistrées dans le journal (activité « fiche ») et comptent pour la
     maîtrise v2 (application, transfert).
   - Démonstration (#/apprendre/demo) : fiche d'essai fabriquée, rien n'est enregistré, et l'écran le dit.
   Une fiche n'est servie que si le validateur l'accepte (statut « reference » ou « generee_validee ») ; une fiche
   « en relecture » n'est servie qu'en démonstration, avec son étiquette. */
(function () {
  let S = null; // { st, fiche, ctx, demo, fb, ordre, sid, nid }
  const ETAPES = [['situation', 'Exemple'], ['explication', 'Explication'], ['comprehension', 'Compréhension'], ['application', 'Application'], ['transfert', 'Transfert'], ['bilan', 'Bilan']];
  const ENS_LABEL = { comprehension: 'Compréhension', comprehension_reserve: 'Compréhension', controle: 'Vérifier une confusion', application: 'Application', application_reserve: 'Application', transfert: 'Transfert : autre contexte', transfert_reserve: 'Transfert : autre contexte' };
  const REP_LABEL = { exemple: 'Exemple', etapes: 'Étape par étape', analogie: 'Analogie', contre_exemple: 'Contre-exemple', schema: 'Schéma' };
  const STATUT = {
    reference: ['Fiche relue', 'seal-check'], generee_validee: ['Générée et vérifiée', 'shield-check'],
    en_relecture: ['En relecture', 'hourglass'], brouillon: ['Brouillon', 'pencil-simple'],
  };

  function etapeCourante(e) {
    if (e.type === 'situation') return 'situation';
    if (e.type === 'explication' || e.type === 'representation') return S.lastEns ? Parcours.baseOf(S.lastEns) : 'explication';
    if (e.type === 'item') return Parcours.baseOf(e.ens);
    if (e.type === 'epuise') return e.ens;
    return 'bilan';
  }

  async function charger(view, d) {
    if (view.demo) {
      const r = await fetch('assets/fiches/demo-levier.json');
      return { fiche: await r.json(), demo: true };
    }
    const node = d.node(view.sid, view.nid);
    return { fiche: node && node.fiche, demo: false, node };
  }

  async function render(app, view, d) {
    if (!S || S.key !== view.key) {
      app.innerHTML = `<section class="learn"><p class="muted">Chargement…</p></section>`;
      let c;
      try { c = await charger(view, d); } catch (e) { c = { fiche: null }; }
      const verdict = c.fiche ? FicheValidateur.valider(c.fiche, { jeu: null, shaJeu: null }) : null;
      // hors jeu 3a fourni, le contrôle de chevauchement n'est pas vérifiable : on ne retient ici que la forme et l'ordre
      const bloquants = verdict ? verdict.bloquants.filter((b) => !/^V-chevauchement/.test(b.regle)) : [];
      const servable = c.fiche && !bloquants.length && (c.demo || ['reference', 'generee_validee'].includes(c.fiche.meta.statut));
      if (!servable && !c.demo && c.node && window.Universel) return construire(app, view, d, c.node);
      if (!servable) {
        app.innerHTML = `<section class="learn learn-empty card"><h1>Pas encore de parcours pour cette notion</h1>
          <p>Arbor ne sert un parcours que depuis une fiche vérifiée : situation, explication, confusions et exercices fondés sur les sources. ${c.fiche ? 'La fiche de cette notion ne passe pas les contrôles.' : ''}</p>
          <p class="muted">En attendant, la notion reste en <b>mode lecture</b> : fiche, révisions espacées et rappel. Sa mémoire est suivie, mais pas sa compréhension.</p>
          <a class="btn" href="${d.back(view)}">${d.ic('arrow-left')} Retour</a></section>`;
        return;
      }
      S = { key: view.key, view, fiche: c.fiche, demo: c.demo, st: Parcours.creer(c.fiche, { compte: !!d.compte }), fb: null, ordre: null, lastEns: null };
    }
    paint(app, d);
  }

  /* Construire le parcours guidé d'une notion : niveau, intention, puis fiche écrite par le serveur et contrôlée ici */
  function construire(app, view, d, node) {
    const s = d.subject(view.sid), prof = (s && s.profil) || {};
    const sel = (name, opts, cur) => `<select class="input" name="${name}">${opts.map(([v, l]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    app.innerHTML = `<section class="learn learn-empty card build"><p class="learn-eyebrow">Parcours guidé</p><h1>${d.esc(node.title)}</h1>
      <p>Arbor peut construire le parcours de cette notion : une situation concrète, une explication à ton niveau, les confusions courantes et des exercices d’application et de transfert. Tout vient de tes notes ou d’une source ouverte, citée.</p>
      ${d.compte ? `<form class="build-form" id="buildForm">
        <label>Ton niveau${sel('niveau', [['debutant', 'Je découvre'], ['intermediaire', 'J’ai des bases'], ['avance', 'Je veux approfondir']], prof.niveau || 'debutant')}</label>
        <label>Ton intention${sel('intention', [['comprendre', 'Comprendre vraiment'], ['examen', 'Réussir un examen'], ['pratique', 'M’en servir au travail'], ['curiosite', 'Par curiosité']], prof.intention || 'comprendre')}</label>
        <button class="btn">${d.ic('sparkle')}Construire le parcours</button><p class="hint" id="buildMsg" role="status"></p></form>`
        : `<p class="muted">La construction d’un parcours demande un compte gratuit (Réglages, puis Compte). En attendant, la notion reste en <b>mode lecture</b> : fiche, révisions espacées et rappel.</p>`}
      <a class="btn ghost" href="${d.back(view)}">${d.ic('arrow-left')} Retour</a></section>`;
    const f = app.querySelector('#buildForm');
    if (!f) return;
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const msg = f.querySelector('#buildMsg'), btn = f.querySelector('button');
      btn.disabled = true;
      const profil = { niveau: f.elements.niveau.value, intention: f.elements.intention.value };
      if (s) s.profil = { ...(s.profil || {}), ...profil };
      try {
        await Universel.construireFiche(s, node, { profil, onStatus: (m) => { msg.textContent = m; } });
        d.saved();
        S = null; render(app, view, d);
      } catch (e) { msg.textContent = e.message; btn.disabled = false; }
    };
  }

  function rail(e, d) {
    const cur = etapeCourante(e), idx = ETAPES.findIndex(([k]) => k === cur);
    const f = S.fiche, [lab, icn] = STATUT[f.meta.statut] || ['', 'info'];
    const b = Parcours.bilan(S.st);
    return `<aside class="learn-rail">
      <p class="learn-eyebrow">${S.demo ? 'Démonstration' : 'Apprendre'}</p>
      <h1 class="learn-title">${d.esc(f.meta.notion)}</h1>
      <p class="prov-chip">${d.ic(icn)} ${S.demo ? 'Fiche d’essai fabriquée' : lab}</p>
      <ol class="learn-steps">${ETAPES.map(([k, l], i) => `<li class="${i < idx ? 'done' : i === idx ? 'now' : ''}" ${i === idx ? 'aria-current="step"' : ''}><span class="ls-dot">${i < idx ? d.ic('check') : i + 1}</span>${l}</li>`).join('')}</ol>
      <dl class="learn-meta">
        <div><dt>Explication</dt><dd>${S.st.niveau === 'simple' ? 'simple' : 'standard'}</dd></div>
        <div><dt>Remèdes</dt><dd class="num">${b.remedes}</dd></div>
        <div><dt>Changements de méthode</dt><dd class="num">${b.changements}</dd></div>
      </dl>
      ${S.demo ? '<p class="learn-note">Rien n’est enregistré pendant la démonstration.</p>' : ''}
    </aside>`;
  }

  function itemHtml(e, d) {
    const it = e.item, t = it.type || 'choix', done = !!S.fb;
    const raison = e.raison && e.raison.controle ? `<p class="learn-why">${d.ic('magnifying-glass')} On vérifie que la confusion « ${d.esc(e.raison.controle)} » est levée.</p>`
      : e.raison && e.raison.reserve ? `<p class="learn-why">${d.ic('arrows-clockwise')} Une autre question, pour t’exercer encore.</p>` : '';
    let corps = '';
    if (t === 'choix') {
      corps = `<div class="learn-choices">${it.choix.map((c, i) => {
        const etat = !done ? '' : c.juste ? 'ok' : S.fb.rep === i ? 'ko' : 'off';
        return `<button type="button" class="learn-choice ${etat}" data-learn="choix" data-i="${i}" ${done ? 'disabled' : ''}><span class="lc-key">${'ABCD'[i]}</span>${d.esc(c.texte)}</button>`;
      }).join('')}</div>`;
    } else if (t === 'courte') {
      corps = `<form class="learn-short" data-learn-form="courte"><input class="input" name="r" autocomplete="off" placeholder="Ta réponse" ${done ? 'disabled' : ''} aria-label="Ta réponse" /><button class="btn" ${done ? 'disabled' : ''}>Valider</button></form>`;
    } else if (t === 'ordre') {
      S.ordre = S.ordre || it.etapes.map((_, i) => i).reverse();
      corps = `<ol class="learn-order">${S.ordre.map((k, i) => `<li><span>${d.esc(it.etapes[k])}</span>${done ? '' : `<span class="lo-btns"><button type="button" class="icon-btn sm" data-learn="up" data-i="${i}" aria-label="Monter" ${i === 0 ? 'disabled' : ''}>${d.ic('caret-up')}</button><button type="button" class="icon-btn sm" data-learn="down" data-i="${i}" aria-label="Descendre" ${i === S.ordre.length - 1 ? 'disabled' : ''}>${d.ic('caret-down')}</button></span>`}</li>`).join('')}</ol>
        ${done ? '' : '<button type="button" class="btn" data-learn="ordre">Valider l’ordre</button>'}`;
    } else if (t === 'libre') {
      corps = `<form class="learn-free" data-learn-form="libre"><textarea class="input" name="r" rows="5" placeholder="Explique avec tes mots" ${done ? 'disabled' : ''} aria-label="Ton explication"></textarea>
        <p class="muted small">${d.compte ? 'Ton explication sera jugée sur une grille, à partir des sources.' : 'Sans compte, une explication libre n’est pas notée : elle t’entraîne, mais ne compte pas comme preuve.'}</p>
        <button class="btn" ${done ? 'disabled' : ''}>Envoyer</button></form>`;
    }
    return `<p class="learn-eyebrow">${ENS_LABEL[e.ens] || ''}</p>${raison}<h2 class="learn-q">${d.esc(it.q)}</h2>${corps}${done ? feedback(d) : ''}`;
  }

  function feedback(d) {
    const c = S.fb.correction;
    const titre = c.outcome === 'juste' ? 'Juste' : c.outcome === 'partiel' ? 'Presque' : c.outcome === 'non_note' ? 'Non notée' : 'Pas tout à fait';
    const conf = c.confusion && (S.fiche.confusions || []).find((x) => x.id === c.confusion);
    return `<div class="learn-fb ${c.outcome}" role="status">
      <b>${titre}</b>
      ${c.outcome === 'non_note' ? `<p>${d.esc(c.note)}</p>` : ''}
      ${c.outcome !== 'juste' && c.attendu ? `<p>Réponse attendue : ${d.esc(c.attendu)}</p>` : ''}
      ${conf ? `<p class="learn-conf">${d.ic('lightbulb')} C’est une confusion fréquente : <b>${d.esc(conf.libelle)}</b>. On va la regarder autrement.</p>` : ''}
      <button type="button" class="btn" data-learn="next" autofocus>Continuer ${d.ic('arrow-right')}</button></div>`;
  }

  function stage(e, d) {
    const f = S.fiche;
    if (e.type === 'situation') return `<p class="learn-eyebrow">Un exemple concret</p><p class="learn-lead">${d.esc(e.texte)}</p>
      <p class="learn-goal">${d.ic('target')} Ce que cet exemple va te faire comprendre : <b>${d.esc(String(e.question || '').replace(/,?\s*(d[’']après toi|selon toi|à ton avis),?/gi, '').replace(/\s{2,}/g, ' '))}</b></p>
      <fieldset class="learn-level"><legend>Où en es-tu sur cette notion ?</legend>
      <div class="learn-actions"><button type="button" class="btn" data-learn="sait-pas">Je découvre</button><button type="button" class="btn ghost" data-learn="sait">J’ai déjà des bases</button></div>
      <p class="muted small">Si tu découvres, Arbor ajoute un exemple résolu pas à pas avant les exercices.</p></fieldset>`;
    if (e.type === 'explication') return `<p class="learn-eyebrow">Explication · ${e.niveau === 'simple' ? 'simple' : 'standard'}</p>
      ${e.raison && e.raison.methode ? `<p class="learn-why">${d.ic('shuffle')} On reprend plus simplement.</p>` : ''}
      <p class="learn-text">${d.esc(e.texte)}</p>
      <div class="learn-key"><p class="learn-idea">${d.esc(e.idee)}</p><ul>${e.elements.map((x) => `<li>${d.esc(x)}</li>`).join('')}</ul></div>
      ${e.glossaire.length ? `<details class="learn-glo"><summary>Glossaire (${e.glossaire.length})</summary><dl>${e.glossaire.map((g) => `<dt>${d.esc(g.terme)}</dt><dd>${d.esc(g.explication)}</dd>`).join('')}</dl></details>` : ''}
      <div class="learn-actions"><button type="button" class="btn" data-learn="next">S’exercer ${d.ic('arrow-right')}</button></div>`;
    if (e.type === 'representation') {
      const r = e.rep || {};
      const why = e.raison && e.raison.confusion ? `Pour défaire la confusion « ${d.esc(e.raison.confusion)} »` : e.raison && e.raison.resolu ? 'Avant de t’exercer, voici le raisonnement complet sur un cas.' : 'Une autre façon de voir';
      return `<p class="learn-eyebrow">${e.raison && e.raison.resolu ? 'Exemple résolu, pas à pas' : REP_LABEL[r.type] || 'Représentation'}</p><p class="learn-why">${d.ic('shuffle')} ${why}</p>
        <p class="learn-text">${d.esc(r.texte || '')}</p>${r.limite ? `<p class="learn-limit"><b>Limite de cette image :</b> ${d.esc(r.limite)}</p>` : ''}
        <div class="learn-actions"><button type="button" class="btn" data-learn="next">Continuer ${d.ic('arrow-right')}</button></div>`;
    }
    if (e.type === 'item') return itemHtml(e, d);
    if (e.type === 'epuise') return `<p class="learn-eyebrow">${ENS_LABEL[e.ens] || ''}</p><h2 class="learn-q">Plus de question de réserve ici</h2>
      <p class="learn-text">Arbor n’invente pas de question quand les ressources vérifiées sont épuisées. La notion est marquée <b>à reprendre</b>${d.compte ? ' ; tu peux aussi en parler avec Pousse.' : '.'}</p>
      <div class="learn-actions"><button type="button" class="btn" data-learn="next">Continuer ${d.ic('arrow-right')}</button></div>`;
    const b = Parcours.bilan(S.st);
    const ligne = (k, l) => { const x = b.par[k]; return `<li><span>${l}</span><b class="num">${x ? `${x.juste}/${x.total}` : '–'}</b></li>`; };
    return `<p class="learn-eyebrow">Bilan</p><h2 class="learn-q">${b.aReprendre ? 'Notion à reprendre' : 'Notion appliquée et transférée'}</h2>
      <ul class="learn-sum">${ligne('comprehension', 'Compréhension')}${ligne('application', 'Application')}${ligne('transfert', 'Transfert')}</ul>
      <p class="learn-text">${b.aReprendre ? `Ce qui reste fragile reviendra en révision.${b.epuise.length ? ` Réserve épuisée : ${b.epuise.join(', ')}.` : ''}` : 'La mémoire se confirme ensuite par les révisions espacées : deux rappels justes à au moins 7 jours d’écart.'}</p>
      <p class="muted small">${S.demo ? 'Démonstration : rien n’a été enregistré.' : 'Tes réponses sont enregistrées sur cet appareil comme preuves datées.'}</p>
      <div class="learn-actions"><a class="btn" href="${d.back(S.view)}">Terminer</a></div>`;
  }

  function paint(app, d) {
    const e = Parcours.courant(S.st);
    if (e.type === 'item') S.lastEns = e.ens;
    app.innerHTML = `<section class="learn">${rail(e, d)}<article class="learn-stage card" aria-live="polite">${stage(e, d)}</article></section>`;
    const f = app.querySelector('[autofocus]'); if (f) f.focus();
    bind(app, d);
  }

  function enregistrer(d, preuve) {
    if (S.demo || !preuve) return;
    d.record({ sid: S.view.sid, nid: S.view.nid, activity: 'fiche', outcome: preuve.outcome, contexte: preuve.contexte, niveau: preuve.niveau, item: preuve.item_id, confusion: preuve.confusion,
      confusionLabel: preuve.confusion ? ((S.fiche.confusions || []).find((c) => c.id === preuve.confusion) || {}).libelle : undefined });
  }
  function repondre(app, d, rep) {
    const r = Parcours.repondre(S.st, rep);
    S.fb = { correction: r.correction, rep };
    enregistrer(d, r.preuve);
    paint(app, d);
  }

  function bind(app, d) {
    app.querySelectorAll('[data-learn]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.learn;
      if (k === 'sait' || k === 'sait-pas') { Parcours.ouvrir(S.st, { sait: k === 'sait' }); paint(app, d); return; }
      if (k === 'next') { S.fb = null; S.ordre = null; Parcours.avancer(S.st); paint(app, d); return; }
      if (k === 'choix') return repondre(app, d, Number(b.dataset.i));
      if (k === 'up' || k === 'down') { const i = Number(b.dataset.i), j = k === 'up' ? i - 1 : i + 1; [S.ordre[i], S.ordre[j]] = [S.ordre[j], S.ordre[i]]; paint(app, d); return; }
      if (k === 'ordre') return repondre(app, d, S.ordre.slice());
    }));
    app.querySelectorAll('[data-learn-form]').forEach((f) => f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const v = f.elements.r.value.trim(); if (!v) return;
      if (f.dataset.learnForm === 'courte') return repondre(app, d, v);
      // explication libre : jugée par le serveur avec un compte, sinon non notée (Q6)
      let jugement = null;
      if (d.compte && d.juger) { try { jugement = await d.juger(S.fiche, Parcours.courant(S.st).item, v); } catch (e) { jugement = null; } }
      return repondre(app, d, jugement ? { jugement } : v);
    }));
  }

  window.Learn = { render, reset: () => { S = null; } };
})();
