/* Setup Express (docs/business-v2.md, A3) : découvrir Arbor en trois étapes, environ 90 secondes.
   1. Identité : nom et secteur.  2. Premier savoir : un document, ou une règle écrite (devenue un PDF signé, vérifiée
   par le serveur comme un import).  3. Première expérience : client mystère ou invitation (facultative).
   Le pipeline (lecture, extraction, vérification des extraits, provenance) reste celui de la Base de savoir ; il n'est
   pas montré étape par étape. « Tout valider » ne valide que les cartes présentées et gardées, une par une, par la base.
   L'assistant détaillé reste dans Paramètres. */
(function () {
  let d = null, busy = false;
  const q = (s) => encodeURIComponent(s);
  const rpc = (name, body) => Tutor.rest(`/rest/v1/rpc/${name}`, { body });
  const SECTORS = [['Commerce et distribution', 'storefront'], ['Hôtellerie et restauration', 'fork-knife'], ['Santé', 'first-aid'], ['Industrie', 'factory'], ['Services', 'handshake'], ['Éducation et formation', 'graduation-cap'], ['Informatique', 'desktop-tower'], ['Autre', 'dots-three']];
  const STEPS = [['identite', 'Votre organisation'], ['savoir', 'Premier savoir'], ['experience', 'Première expérience']];
  const missing = (e) => /could not find|PGRST20[25]|schema cache|does not exist/i.test(String(e && e.message));

  function frame(key, body, foot = '') {
    const i = STEPS.findIndex(([k]) => k === key);
    return `<section class="obz sx">
      <header class="obz-head"><a class="obz-quit" href="#/">${d.ic('x')}<span>Plus tard</span></a>
        <div class="sx-steps" aria-label="Étape ${i + 1} sur 3">${STEPS.map(([k, l], j) => `<span class="${j < i ? 'done' : j === i ? 'cur' : ''}">${j < i ? d.ic('check', true) : j + 1}<small>${l}</small></span>`).join('')}</div></header>
      <div class="obz-body">${body}</div><footer class="obz-foot">${foot}</footer></section>`;
  }
  // l'étape est enregistrée côté serveur puis dans la liste locale des espaces (bandeau de reprise juste)
  const saveStep = async (o, step, extra = {}) => { await rpc('update_organization', { p_org: o.id, p_setup: { step, express: true, ...extra } }).catch(() => {}); if (o.name) await Org.refresh().catch(() => {}); };

  /* ---------- 1. Identité ---------- */
  function identity(app) {
    let sector = '';
    app.innerHTML = frame('identite', `<span class="obz-badge">${(window.Mascot && Mascot.mini({ size: 56, mood: 'happy' })) || d.ic('buildings', true)}</span>
      <h1>Créons votre espace</h1><p class="obz-lede">Deux informations suffisent. Tout le reste se règle plus tard, au moment utile.</p>
      <form class="obz-form" id="sxForm" novalidate>
        <div class="field"><label for="sxName">Nom de l’organisation</label><input id="sxName" maxlength="120" autocomplete="organization" placeholder="Boulangerie Martin" /><p class="wel-err" id="sxNameErr" role="alert"></p></div>
        <fieldset class="field"><legend>Secteur</legend><div class="sx-sectors" role="radiogroup">${SECTORS.map(([l, icn]) => `<label><input type="radio" name="sxSector" value="${l}" /><span>${d.ic(icn, true)}${l}</span></label>`).join('')}</div></fieldset>
        <p class="wel-form-err" id="sxErr" role="alert" hidden></p></form>`,
      `<span></span><button class="btn big" id="sxNext">Créer mon espace${d.ic('arrow-right')}</button>`);
    app.querySelectorAll('input[name="sxSector"]').forEach((r) => { r.onchange = () => { sector = r.value; }; });
    let created = null;
    app.querySelector('#sxNext').onclick = async () => {
      if (busy) return;
      const name = app.querySelector('#sxName').value.trim();
      if (name.length < 2) { app.querySelector('#sxNameErr').textContent = 'Indiquez le nom de l’organisation.'; app.querySelector('#sxName').focus(); return; }
      busy = true; const b = app.querySelector('#sxNext'); b.disabled = true;
      try {
        const id = created || await rpc('create_organization', { p_name: name, p_sector: sector || null });
        created = id;
        await saveStep({ id }, 'savoir');
        await Org.refresh().catch(() => {});
        Org.setSpace(id);
        if (window.Journey) Journey.set({ workspace: 'business', businessIntent: 'create' });
        busy = false;
        d.go(`#/org/${id}/demarrer/savoir`);
      } catch (e) { busy = false; b.disabled = false; const er = app.querySelector('#sxErr'); er.hidden = false; er.textContent = /connexion/i.test(e.message) ? 'Pas de connexion : rien n’a été créé. Réessayez.' : e.message; }
    };
  }

  /* ---------- 2. Premier savoir ---------- */
  function knowledgeStep(app, o) {
    app.innerHTML = frame('savoir', `<h1>Votre premier savoir</h1>
      <p class="obz-lede">Arbor transforme une procédure, une fiche ou une simple règle en connaissances que votre équipe pourra pratiquer.</p>
      <div class="sx-choice">
        <label class="sx-opt" for="sxFile">${d.ic('file-arrow-up', true)}<b>Importer un document</b><small>Un PDF : procédure, fiche produit, règlement.</small><input id="sxFile" type="file" accept="application/pdf" /></label>
        <button type="button" class="sx-opt" id="sxWrite">${d.ic('pencil-simple-line', true)}<b>Écrire une règle</b><small>Une règle de votre métier, en quelques phrases.</small></button>
      </div>
      <form class="obz-form" id="sxRuleForm" hidden>
        <div class="field"><label for="sxRule">Votre règle</label><textarea id="sxRule" rows="5" maxlength="4000" placeholder="Lorsqu’un client demande un remboursement, nous devons vérifier le ticket de caisse et l’état du produit avant de proposer une solution."></textarea>
        <p class="fb-help">Elle devient un document signé de votre nom, conservé dans votre Base de savoir.</p></div>
        <div class="row-btns"><button class="btn">${d.ic('sparkle', true)}Analyser ma règle</button></div></form>
      <div id="sxWork" aria-live="polite"></div>`,
      `<a class="btn ghost" href="#/org/${o.id}">Passer</a><span></span>`);
    app.querySelector('#sxWrite').onclick = () => { const f = app.querySelector('#sxRuleForm'); f.hidden = false; app.querySelector('#sxRule').focus(); };
    app.querySelector('#sxFile').onchange = (e) => { const f = e.target.files && e.target.files[0]; if (f) process(app, o, f, f.name.replace(/\.pdf$/i, '')); };
    app.querySelector('#sxRuleForm').onsubmit = (e) => {
      e.preventDefault();
      const t = app.querySelector('#sxRule').value.trim();
      if (t.length < 30) { d.toast('Écrivez au moins une phrase complète.', 'error'); return; }
      const title = `Règle : ${t.split(/\s+/).slice(0, 6).join(' ')}…`;
      const who = (window.Tutor && Tutor.lastEmail && Tutor.lastEmail()) || '';
      const bytes = TextPdf.make(t, { title, author: who.split('@')[0] });
      process(app, o, new File([bytes], 'regle.pdf', { type: 'application/pdf' }), title);
    };
  }
  async function process(app, o, file, title) {
    if (busy) return; busy = true;
    const work = app.querySelector('#sxWork');
    app.querySelectorAll('.sx-choice, #sxRuleForm').forEach((x) => { x.hidden = true; });
    work.innerHTML = `<div class="sx-reading">${(window.Mascot && Mascot.mini({ size: 64, mood: 'smile', writing: true })) || ''}<b id="sxPhase">Arbor lit votre document…</b><span class="sx-bar"><i id="sxBar"></i></span></div>`;
    const phase = (k) => { const el = app.querySelector('#sxBar'); if (el) el.style.transform = `scaleX(${Math.max(0.08, k)})`; const p = app.querySelector('#sxPhase'); if (p) p.textContent = k < 0.5 ? 'Arbor lit votre document…' : k < 0.95 ? 'Arbor repère les connaissances…' : 'Arbor vérifie chaque extrait…'; };
    try {
      const r = await OrgDocs.addDocument(o, file, { title, onStep: (_m, k) => phase(k) });
      phase(1);
      if (r.provenance && r.provenance.error) throw new Error(r.provenance.error);
      const v = (await Tutor.rest('/rest/v1/source_versions', { method: 'GET', query: `?source_id=eq.${q(r.sourceId)}&version=eq.${r.version}&select=id` }))[0];
      const ks = v ? await Tutor.rest('/rest/v1/knowledge_nodes', { method: 'GET', query: `?source_version_id=eq.${q(v.id)}&status=eq.propose&select=*&order=created_at` }) : [];
      busy = false;
      cards(app, o, ks, r, title);
    } catch (e) {
      busy = false;
      work.innerHTML = `<p class="wel-form-err">${d.esc(e.message)}</p><div class="row-btns"><button type="button" class="btn ghost" id="sxRetry">${d.ic('arrow-counter-clockwise')}Réessayer</button></div>`;
      work.querySelector('#sxRetry').onclick = () => knowledgeStep(app, o);
    }
  }
  // Cartes : 3 à 5 connaissances proposées ; modifier, exclure ; « Tout valider » ne touche que ces cartes
  function cards(app, o, all, r, title) {
    const shown = all.slice(0, 5), state = new Map(shown.map((k) => [k.id, { excluded: false, status: 'propose', err: '' }]));
    const PROV = { verifiee: ['seal-check', 'Extrait retrouvé dans le document'], introuvable: ['warning', 'Extrait introuvable : ne peut pas être validé'], non_verifiee: ['hourglass-medium', 'Vérification en cours'] };
    const render = () => {
      const body = app.querySelector('.obz-body');
      body.innerHTML = `<h1>${shown.length ? 'Voici ce qu’Arbor a compris' : 'Rien à proposer pour l’instant'}</h1>
        <p class="obz-lede">${shown.length ? 'Relisez, corrigez si besoin, excluez ce qui ne convient pas. Rien n’est utilisé avant votre validation.' : 'Ce document ne contient pas de règle exploitable, ou ses extraits n’ont pas pu être vérifiés. Essayez avec une autre source.'}</p>
        <ul class="sx-cards">${shown.map((k) => { const st = state.get(k.id);
          // provenance inconnue (base sans la migration 009) : on n'affirme rien, on cite seulement la page
          const pv2 = k.provenance === undefined ? null : (PROV[k.provenance] || PROV.non_verifiee);
          return `<li class="sx-card ${st.excluded ? 'off' : ''} ${st.status}" data-k="${k.id}">
            <div class="sx-card-h"><span class="sx-st">${st.status === 'valide' ? `${d.ic('check-circle', true)}Validée` : st.excluded ? 'Exclue' : 'À valider'}</span>${k.kind === 'sensible' ? `<span class="wd-tag s">${d.ic('shield-warning', true)}Sensible</span>` : ''}</div>
            <b class="sx-t">${d.esc(k.title)}</b><p class="sx-b">${d.esc(k.body)}</p>
            <p class="kn-prov prov-${pv2 ? k.provenance : 'sans'}">${pv2 ? `${d.ic(pv2[0])}${pv2[1]} · ` : ''}p. ${k.page} de « ${d.esc(title)} »</p>
            ${st.err ? `<p class="wel-form-err">${d.esc(st.err)}</p>` : ''}
            ${st.status !== 'valide' ? `<div class="row-btns"><button type="button" class="btn ghost sm" data-edit="${k.id}">${d.ic('pencil-simple')}Modifier</button><button type="button" class="btn ghost sm" data-excl="${k.id}">${st.excluded ? `${d.ic('arrow-counter-clockwise')}Remettre` : `${d.ic('x')}Exclure`}</button></div>` : ''}</li>`; }).join('')}</ul>
        ${all.length > shown.length ? `<p class="hint">${all.length - shown.length} autre${all.length - shown.length > 1 ? 's' : ''} proposition${all.length - shown.length > 1 ? 's' : ''} à revoir dans la Base de savoir.</p>` : ''}`;
      const kept = shown.filter((k) => !state.get(k.id).excluded && state.get(k.id).status !== 'valide');
      app.querySelector('.obz-foot').innerHTML = `<a class="btn ghost" href="#/org/${o.id}/demarrer/experience">Plus tard</a>
        ${kept.length ? `<button class="btn big" id="sxAll">${d.ic('checks', true)}Tout valider (${kept.length})</button>` : `<button class="btn big" id="sxOn">Continuer${d.ic('arrow-right')}</button>`}`;
      body.querySelectorAll('[data-excl]').forEach((b) => { b.onclick = () => { const st = state.get(b.dataset.excl); st.excluded = !st.excluded; render(); }; });
      body.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => edit(b.dataset.edit); });
      const all2 = app.querySelector('#sxAll'); if (all2) all2.onclick = validateAll;
      const on = app.querySelector('#sxOn'); if (on) on.onclick = () => skillsThen();
    };
    const edit = (id) => {
      const k = shown.find((x) => x.id === id), li = app.querySelector(`[data-k="${id}"]`);
      li.querySelector('.sx-t').outerHTML = `<input class="sx-in" id="sxT" maxlength="200" value="${d.esc(k.title)}" aria-label="Titre" />`;
      li.querySelector('.sx-b').outerHTML = `<textarea class="sx-in" id="sxB" rows="3" maxlength="2000" aria-label="Reformulation">${d.esc(k.body)}</textarea>`;
      li.querySelector('.row-btns').innerHTML = `<button type="button" class="btn sm" id="sxSave">${d.ic('check')}Enregistrer</button>`;
      li.querySelector('#sxSave').onclick = async () => {
        const title2 = li.querySelector('#sxT').value.trim(), body2 = li.querySelector('#sxB').value.trim();
        try { await Tutor.rest('/rest/v1/knowledge_nodes', { method: 'PATCH', query: `?id=eq.${q(id)}`, body: { title: title2, body: body2 } }); k.title = title2; k.body = body2; render(); }
        catch (x) { d.toast(x.message, 'error'); }
      };
    };
    async function validateAll() {
      if (busy) return; busy = true;
      const b = app.querySelector('#sxAll'); b.disabled = true;
      for (const k of shown) {
        const st = state.get(k.id);
        if (st.status === 'valide') continue;
        try {
          await rpc('set_knowledge_status', { p_id: k.id, p_status: st.excluded ? 'rejete' : 'valide' });
          if (!st.excluded) st.status = 'valide';
          st.err = '';
        } catch (x) { st.err = /provenance/.test(x.message) ? 'Extrait non vérifié dans le document : non validée.' : x.message; }
      }
      busy = false;
      render();
      if (shown.some((k) => state.get(k.id).status === 'valide') && !shown.some((k) => !state.get(k.id).excluded && state.get(k.id).status !== 'valide')) skillsThen();
    }
    // compétences proposées à partir des seules connaissances validées ; ajoutées en un geste, modifiables ensuite
    async function skillsThen() {
      const body = app.querySelector('.obz-body');
      body.insertAdjacentHTML('beforeend', `<div class="sx-reading" id="sxSk">${d.ic('target', true)}<b>Arbor relie vos connaissances à des compétences…</b></div>`);
      let props = [];
      try { props = ((await OrgLearn.srv({ task: 'competences', org: o.id })) || {}).skills || []; } catch (e) { props = []; }
      const box = app.querySelector('#sxSk');
      if (!props.length) { box.remove(); return finishStep(); }
      box.outerHTML = `<div class="sx-skills"><h2>${d.ic('target', true)}Compétences proposées</h2><ul>${props.slice(0, 4).map((s, i) => `<li><label><input type="checkbox" data-sk="${i}" checked /><span><b>${d.esc(s.name)}</b><small>${d.esc(s.description || '')}</small></span></label></li>`).join('')}</ul></div>`;
      app.querySelector('.obz-foot').innerHTML = `<a class="btn ghost" href="#/org/${o.id}/demarrer/experience">Plus tard</a><button class="btn big" id="sxSkOk">${d.ic('check', true)}Garder ces compétences</button>`;
      app.querySelector('#sxSkOk').onclick = async () => {
        const chosen = [...app.querySelectorAll('[data-sk]:checked')].map((c) => props[Number(c.dataset.sk)]);
        for (const s of chosen) {
          try {
            const [row] = await Tutor.rest('/rest/v1/skills', { body: { org_id: o.id, name: s.name, description: s.description, created_by: Tutor.userId() }, headers: { Prefer: 'return=representation' } });
            if (s.knowledge && s.knowledge.length) await Tutor.rest('/rest/v1/skill_knowledge', { body: s.knowledge.map((k) => ({ org_id: o.id, skill_id: row.id, knowledge_id: k })) });
          } catch (x) { /* une compétence en double n'arrête pas les autres */ }
        }
        finishStep();
      };
    }
    const finishStep = async () => { await saveStep(o, 'experience'); d.go(`#/org/${o.id}/demarrer/experience`); };
    render();
  }

  /* ---------- 3. Première expérience ---------- */
  async function experience(app, o) {
    app.innerHTML = frame('experience', `<span class="obz-badge">${(window.Mascot && Mascot.mini({ size: 60, mood: 'happy' })) || d.ic('confetti', true)}</span>
      <h1>Votre espace est prêt</h1><p class="obz-lede">Découvrez ce que vivra votre équipe, ou invitez-la tout de suite.</p>
      <div class="sx-choice">
        <a class="sx-opt" href="#/org/${o.id}/mystere">${d.ic('storefront', true)}<b>Tester mon client mystère</b><small>Une situation simulée, fondée uniquement sur vos connaissances validées.</small></a>
        <button type="button" class="sx-opt" id="sxInv">${d.ic('user-plus', true)}<b>Inviter mon équipe</b><small>Un lien sécurisé, valable 7 jours, par personne.</small></button>
      </div>
      <div id="sxInvite" hidden></div>`,
      `<span></span><a class="btn big ghost" href="#/org/${o.id}" id="sxSolo">Continuer seul${d.ic('arrow-right')}</a>`);
    rpc('mark_onboarded', { p_org: o.id }).catch(() => {}).then(() => saveStep(o, 'fin', { done: true }));
    app.querySelector('#sxInv').onclick = () => { const b = app.querySelector('#sxInvite'); b.hidden = false; OrgOnboarding.inviteBox(b, o); b.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  }

  function render(app, o, step, deps) {
    d = deps;
    if (!window.Tutor || !Tutor.signedIn()) { app.innerHTML = `<section class="sec org-join"><h1>Créer une organisation</h1><p>Une organisation a besoin d’un compte (gratuit). Vos cours personnels restent sur cet appareil.</p><div class="row-btns"><button class="btn" id="sxLogin">${d.ic('sign-in')}Se connecter ou créer un compte</button></div></section>`; app.querySelector('#sxLogin').onclick = () => Welcome.auth({ after: () => render(app, o, step, deps) }, 'signup'); return; }
    if (!o) return identity(app);
    if (o.role !== 'admin') { app.innerHTML = `<section class="sec"><p class="hint">La mise en route est réservée aux administrateurs.</p><div class="row-btns"><a class="btn ghost" href="#/org/${o.id}">Retour</a></div></section>`; return; }
    if (step === 'experience') return experience(app, o);
    return knowledgeStep(app, o);
  }

  window.OrgSetup = { render, missing };
})();
