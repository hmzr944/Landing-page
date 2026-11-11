/* Espace professionnel, côté apprentissage et suivi (étapes E à G) :
   - Mon diagnostic : questions posées et corrigées par le serveur, confiance déclarée, retour avec l'extrait du document.
   - Client mystère : une conversation libre avec un client simulé ; débrief calculé à partir de ce qui a été observé.
   - Mes résultats : mes preuves, l'état de chaque connaissance et ma prochaine activité (OrgInsight).
   - Compétences (manager) : propositions à partir des connaissances validées, ajoutées seulement si le manager le décide.
   - Suivi (manager) : les 3 fragilités prioritaires de l'équipe (si l'échantillon suffit), chaque personne, sa recommandation.
   Rien ici ne lit l'espace personnel. Tout résultat affiché vient de preuves réelles, écrites par le serveur. */
(function () {
  let d = null;
  const q = (s) => encodeURIComponent(s);
  const CONF = [['devine', 'Je devine'], ['sait', 'Je sais'], ['reflexe', 'C’est un réflexe']];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Appel au serveur ; s'il est saturé (offre gratuite), on réessaie deux fois en le disant
  async function srv(payload, onWait) {
    for (let i = 0; i < 3; i++) {
      try { return await Tutor.ask(payload); }
      catch (e) {
        if (e.kind === 'busy' && i < 2) { for (let s = 15; s > 0; s--) { onWait && onWait(`Beaucoup de demandes en ce moment, nouvel essai dans ${s} s…`); await wait(1000); } continue; }
        if (e.kind === 'quota') throw new Error('Le quota du mois est atteint pour l’espace professionnel.');
        throw e;
      }
    }
  }
  const confChips = (name) => `<div class="conf-pick" role="radiogroup" aria-label="Ta confiance">${CONF.map(([k, l]) => `<label><input type="radio" name="${name}" value="${k}" /><span>${l}</span></label>`).join('')}</div>`;
  const confOf = (el, name) => { const c = el.querySelector(`input[name="${name}"]:checked`); return c ? c.value : null; };
  const fmtDate = (t) => (t ? new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '');

  /* ---------- Mon diagnostic ---------- */
  async function diagnosticView(app, o, head) {
    app.innerHTML = `${head}<section class="sec org-learn"><h2>Mon diagnostic</h2>
      <p>Quelques questions sur les connaissances validées de ${d.esc(o.name)}. Pas de note : chaque réponse t’aide, toi et ton responsable, à savoir quoi travailler. Indique aussi ta confiance, honnêtement.</p>
      <div class="row-btns"><button class="btn big" id="dgGo">${d.ic('play', true)}Commencer</button></div><p class="hint" id="dgMsg" role="status"></p></section>`;
    app.querySelector('#dgGo').onclick = async () => {
      const msg = app.querySelector('#dgMsg'); msg.textContent = 'Préparation des questions…';
      let s;
      try { s = await srv({ task: 'diagnostic_start', org: o.id }, (m) => { msg.textContent = m; }); }
      catch (e) { msg.textContent = e.message; return; }
      runDiagnostic(app, o, head, s.items, 0, { ok: 0, falseCert: 0, n: s.items.length });
    };
  }
  function runDiagnostic(app, o, head, items, i, score) {
    if (i >= items.length) {
      app.innerHTML = `${head}<section class="sec org-learn"><h2>Diagnostic terminé</h2>
        <p><b>${score.ok}</b> réponse${score.ok > 1 ? 's' : ''} juste${score.ok > 1 ? 's' : ''} sur ${score.n}.${score.falseCert ? ` <b>${score.falseCert}</b> erreur${score.falseCert > 1 ? 's' : ''} annoncée${score.falseCert > 1 ? 's' : ''} comme sûre${score.falseCert > 1 ? 's' : ''} : ce sont les points à revoir en premier.` : ''}</p>
        <p class="hint">Ce n’est pas une note. Ces réponses deviennent des preuves dans ton parcours ; une réussite ponctuelle ne valide pas une compétence.</p>
        <div class="row-btns"><a class="btn" href="#/org/${o.id}/resultats">${d.ic('chart-line-up')}Voir mes résultats</a><a class="btn ghost" href="#/org/${o.id}/mystere">${d.ic('storefront')}Jouer un client mystère</a></div></section>`;
      return;
    }
    const it = items[i];
    app.innerHTML = `${head}<section class="sec org-learn"><p class="hint">Question ${i + 1} sur ${items.length}</p>
      <h2 class="dg-q">${d.esc(it.question)}</h2>
      <div class="dg-opts" role="radiogroup">${it.options.map((op, k) => `<label class="dg-opt"><input type="radio" name="dgOpt" value="${k}" /><span>${d.esc(op)}</span></label>`).join('')}</div>
      <p class="label-like">Ta confiance</p>${confChips('dgConf')}
      <div class="row-btns"><button class="btn" id="dgOk" disabled>${d.ic('check')}Valider</button></div>
      <div id="dgFb" aria-live="polite"></div></section>`;
    const btn = app.querySelector('#dgOk');
    const ready = () => { btn.disabled = !(app.querySelector('input[name="dgOpt"]:checked') && confOf(app, 'dgConf')); };
    app.querySelectorAll('input').forEach((x) => { x.onchange = ready; });
    btn.onclick = async () => {
      btn.disabled = true;
      const choice = Number(app.querySelector('input[name="dgOpt"]:checked').value), confidence = confOf(app, 'dgConf');
      let r;
      try { r = await srv({ task: 'diagnostic_answer', org: o.id, item: it.id, choice, confidence }); }
      catch (e) { app.querySelector('#dgFb').innerHTML = `<p class="hint">${d.esc(e.message)}</p>`; btn.disabled = false; return; }
      if (r.outcome === 'juste') score.ok++;
      if (r.falseCertainty) score.falseCert++;
      app.querySelectorAll('.dg-opt').forEach((l, k) => { l.classList.add(k === r.correct ? 'right' : k === choice ? 'wrong' : 'dim'); l.querySelector('input').disabled = true; });
      app.querySelector('#dgFb').innerHTML = `<div class="dg-fb ${r.outcome}">
        <p><b>${r.outcome === 'juste' ? 'Juste.' : r.falseCertainty ? 'Faux, alors que tu étais sûr : c’est le plus important à revoir.' : 'Pas tout à fait.'}</b> ${d.esc(r.explanation || '')}</p>
        ${r.quote ? `<blockquote>« ${d.esc(r.quote)} »<cite>${d.esc(r.title || '')}${r.page ? ` · p. ${r.page}` : ''}</cite></blockquote>` : ''}
        <div class="row-btns"><button class="btn" id="dgNext">${i + 1 < items.length ? 'Question suivante' : 'Terminer'}</button></div></div>`;
      app.querySelector('#dgNext').onclick = () => runDiagnostic(app, o, head, items, i + 1, score);
    };
  }

  /* ---------- Client mystère ---------- */
  function mystereView(app, o, head) {
    app.innerHTML = `${head}<section class="sec org-learn"><h2>Client mystère</h2>
      <p>Un client simulé entre dans le magasin. Réponds librement, comme en vrai. Il a un besoin qu’il ne dit pas tout de suite, et quelques objections. À la fin, tu reçois un débrief sur des comportements observables et l’exactitude de tes informations.</p>
      <p class="label-like">Type de client</p>
      <div class="conf-pick" role="radiogroup" aria-label="Type de client">${[['hésitant', 'Hésitant'], ['pressé', 'Pressé'], ['exigeant', 'Exigeant']].map(([k, l], i) => `<label><input type="radio" name="msStyle" value="${k}" ${i ? '' : 'checked'} /><span>${l}</span></label>`).join('')}</div>
      <div class="row-btns"><button class="btn big" id="msGo">${d.ic('door-open', true)}Accueillir le client</button></div><p class="hint" id="msMsg" role="status"></p>
      <div id="msScen" class="ms-scen"></div></section>`;
    if (window.OrgEngines) OrgEngines.publishedList(app.querySelector('#msScen'), o, head, app, d);
    app.querySelector('#msGo').onclick = async () => {
      const msg = app.querySelector('#msMsg'); msg.textContent = 'Le client arrive…';
      let s;
      try { s = await srv({ task: 'mystere_start', org: o.id, style: confOf(app, 'msStyle') || 'hésitant' }, (m) => { msg.textContent = m; }); }
      catch (e) { msg.textContent = e.message; return; }
      chat(app, o, head, s, [{ role: 'client', text: s.opening }]);
    };
  }
  function chat(app, o, head, s, log) {
    const line = (t) => (t.role === 'event' ? `<p class="ms-event">${d.ic('lightning', true)}${d.esc(t.text)}</p>` : `<div class="ms-line ${t.role}"><b>${t.role === 'client' ? d.esc(s.client.name) : 'Toi'}</b><p>${d.esc(t.text)}</p></div>`);
    const sc = s.scenario;
    app.innerHTML = `${head}<section class="sec org-learn ms-chat">
      <div class="ms-head"><span class="org-badge" aria-hidden="true">${d.ic('user', true)}</span><div><b>${d.esc(s.client.name)}</b><small>${sc ? 'Mise en situation' : `Client ${d.esc(s.client.style)}`}</small></div><button class="btn ghost sm" id="msEnd">Terminer</button></div>
      ${sc ? `<details class="ms-ctx" ${log.length < 2 ? 'open' : ''}><summary>La situation</summary><p>${d.esc(sc.context || '')}</p>${sc.role_label ? `<p><b>Ton rôle :</b> ${d.esc(sc.role_label)}</p>` : ''}${sc.objective ? `<p><b>Objectif :</b> ${d.esc(sc.objective)}</p>` : ''}${(sc.constraints || []).length ? `<ul>${sc.constraints.map((c) => `<li>${d.esc(c)}</li>`).join('')}</ul>` : ''}</details>` : ''}
      <div class="ms-feed" id="msFeed" aria-live="polite">${log.map(line).join('')}</div>
      <form class="ms-form" id="msForm"><label for="msText" class="sr-only">Ta réponse</label><textarea id="msText" rows="2" maxlength="800" placeholder="Ta réponse au client…" required></textarea>
        <p class="label-like">Ta confiance dans ce que tu affirmes <small>(facultatif)</small></p>${confChips('msConf')}
        <div class="row-btns"><button class="btn" id="msSend">${d.ic('paper-plane-tilt')}Répondre</button></div><p class="hint" id="msMsg" role="status"></p></form></section>`;
    const feed = app.querySelector('#msFeed'); feed.scrollTop = feed.scrollHeight;
    const end = async () => {
      app.querySelector('#msMsg').textContent = 'Préparation du débrief…';
      try { const r = await srv({ task: 'mystere_fin', org: o.id, session: s.id }); debriefView(app, o, head, r.debrief); }
      catch (e) { app.querySelector('#msMsg').textContent = e.message; }
    };
    app.querySelector('#msEnd').onclick = end;
    app.querySelector('#msForm').onsubmit = async (e) => {
      e.preventDefault();
      const text = app.querySelector('#msText').value.trim(); if (!text) return;
      const btn = app.querySelector('#msSend'); btn.disabled = true;
      const msg = app.querySelector('#msMsg'); msg.textContent = `${s.client.name} réfléchit…`;
      try {
        const r = await srv({ task: 'mystere_tour', org: o.id, session: s.id, message: text, confidence: confOf(app, 'msConf') }, (m) => { msg.textContent = m; });
        log.push({ role: 'vendeur', text });
        if (r.event) log.push({ role: 'event', text: r.event });
        log.push({ role: 'client', text: r.reply });
        if (r.ended) { chat(app, o, head, s, log); app.querySelector('#msForm').hidden = true; app.querySelector('#msFeed').insertAdjacentHTML('beforeend', '<p class="hint">Le client a terminé l’échange.</p>'); return end(); }
        chat(app, o, head, s, log);
      } catch (x) { msg.textContent = x.message; btn.disabled = false; }
    };
  }
  function debriefView(app, o, head, db) {
    const OUT = { satisfait: 'Le client est satisfait.', parti: 'Le client est parti.', 'temps ecoule': 'L’échange a atteint sa durée maximale.', termine: 'Échange terminé.', interrompu: 'Échange interrompu.' };
    const seen = db.behaviors.filter((b) => b.observed);
    app.innerHTML = `${head}<section class="sec org-learn debrief">
      <h2>Débrief</h2>
      <p><b>${OUT[db.outcome] || 'Échange terminé.'}</b> ${db.turns} réponse${db.turns > 1 ? 's' : ''}. Besoin du client ${db.need.found ? 'découvert' : 'non découvert'} : « ${d.esc(db.need.text)} ».</p>
      ${db.objections.length ? `<h3>Objections</h3><ul>${db.objections.map((x) => `<li>${x.resolved ? d.ic('check-circle', true) : d.ic('circle')} ${d.esc(x.text)}</li>`).join('')}</ul>` : ''}
      <h3>Comportements observés <small>${seen.length}/${db.behaviors.length}</small></h3>
      <ul class="db-beh">${db.behaviors.map((b) => `<li class="${b.observed ? 'ok' : ''}">${b.observed ? d.ic('check-circle', true) : d.ic('circle')}<span>${d.esc(b.label)}${b.observed ? `<small>« ${d.esc(b.evidence)} »</small>` : ''}</span></li>`).join('')}</ul>
      ${db.incorrect.length ? `<h3>Informations inexactes</h3><ul class="db-claims">${db.incorrect.map((c) => `<li><b>${c.falseCertainty ? 'Fausse certitude : ' : ''}« ${d.esc(c.text)} »</b><span>Le document dit : « ${d.esc(c.quote)} »${c.page ? ` (p. ${c.page})` : ''}</span></li>`).join('')}</ul>` : ''}
      ${db.undocumented.length ? `<h3>Affirmations non retrouvées dans les fiches validées</h3><ul class="db-claims">${db.undocumented.map((c) => `<li>« ${d.esc(c.text)} »<span>À vérifier : aucune fiche validée ne le confirme.</span></li>`).join('')}</ul>` : ''}
      ${(db.insufficient || []).length ? `<h3>Réponses trop peu étayées</h3><ul class="db-claims">${db.insufficient.map((c) => `<li>« ${d.esc(c.text)} »<span>Ni juste ni fausse : il manque un élément pour conclure${c.quote ? `. Le document dit : « ${d.esc(c.quote)} »` : ''}.</span></li>`).join('')}</ul>` : ''}
      ${(db.events || []).length ? `<h3>Événements de la situation</h3><ul>${db.events.map((e) => `<li>Au tour ${e.turn} : ${d.esc(e.text)}</li>`).join('')}</ul>` : ''}
      ${db.correct.length ? `<p>${db.correct.length} information${db.correct.length > 1 ? 's' : ''} exacte${db.correct.length > 1 ? 's' : ''}, conforme${db.correct.length > 1 ? 's' : ''} aux fiches.</p>` : ''}
      <p class="hint">${d.esc(db.note)}</p>
      <div class="row-btns"><a class="btn" href="#/org/${o.id}/resultats">${d.ic('chart-line-up')}Mes résultats</a><button class="btn ghost" id="msAgain">${d.ic('arrow-counter-clockwise')}Rejouer</button></div></section>`;
    app.querySelector('#msAgain').onclick = () => mystereView(app, o, head);
  }

  /* ---------- Données de suivi (les règles d'accès limitent ce qui est lisible) ---------- */
  const evidenceOf = (org, userId) => Tutor.rest('/rest/v1/evidence_events', { method: 'GET', query: `?org_id=eq.${q(org)}${userId ? `&user_id=eq.${q(userId)}` : ''}&select=user_id,knowledge_id,skill_id,activity,outcome,confidence,session_id,detail,at&order=at&limit=5000` });
  const knowledgeOrg = (org) => Tutor.rest('/rest/v1/knowledge_nodes', { method: 'GET', query: `?org_id=eq.${q(org)}&select=id,kind,title,page,status&limit=2000` });
  const membersOrg = (org) => Tutor.rest('/rest/v1/memberships', { method: 'GET', query: `?org_id=eq.${q(org)}&status=eq.active&select=user_id,role,email` });

  const stateRows = (p) => p.items.length ? `<ul class="st-list">${p.items.map((x) => `<li class="st-${x.state}"><span class="st-pill">${x.label}</span><b>${d.esc(x.knowledge.title)}</b><small>${x.why} · ${x.n} preuve${x.n > 1 ? 's' : ''}${x.knowledge.page ? ` · p. ${x.knowledge.page}` : ''}${x.level ? ` · niveau ${x.level} : ${x.levelLabel}` : ''}</small></li>`).join('')}</ul>` : '<p class="hint">Aucune preuve pour l’instant.</p>';
  const nextBox = (o, n) => `<div class="next-box">${d.ic('compass', true)}<div><b>Prochaine activité : ${d.esc(n.text)}</b><small>${d.esc(n.why)}</small></div>${n.kind === 'diagnostic' ? `<a class="btn sm" href="#/org/${o.id}/diagnostic">Commencer</a>` : n.kind === 'mystere' || n.kind === 'revoir' ? `<a class="btn sm" href="#/org/${o.id}/mystere">Client mystère</a>` : ''}</div>`;

  async function resultsView(app, o, head) {
    app.innerHTML = `${head}<section class="sec"><p class="hint">Chargement…</p></section>`;
    const me = Tutor.userId();
    let evs, ks;
    try { [evs, ks] = await Promise.all([evidenceOf(o.id, me), knowledgeOrg(o.id)]); } catch (e) { app.querySelector('.sec').innerHTML = `<p class="hint">${d.esc(e.message)}</p>`; return; }
    const p = OrgInsight.person(me, evs, ks);
    app.innerHTML = `${head}<section class="sec org-learn"><h2>Mes résultats</h2>
      <p class="hint">Calculés à partir de ${p.n} preuve${p.n > 1 ? 's' : ''} réelle${p.n > 1 ? 's' : ''} : ${p.diagnostics} diagnostic${p.diagnostics > 1 ? 's' : ''}, ${p.simulations} simulation${p.simulations > 1 ? 's' : ''}. Ton espace personnel n’entre pas dans ce calcul.</p>
      ${nextBox(o, p.next)}${stateRows(p)}</section><div id="pwBox"></div>`;
    if (window.OrgEngines) OrgEngines.pathway(app.querySelector('#pwBox'), o, d, evs, ks);
  }

  /* ---------- Compétences (manager) ---------- */
  async function skillsView(app, o, head) {
    app.innerHTML = `${head}<section class="sec"><p class="hint">Chargement…</p></section>`;
    let skills, links, ks;
    try { [skills, links, ks] = await Promise.all([Tutor.rest('/rest/v1/skills', { method: 'GET', query: `?org_id=eq.${q(o.id)}&select=id,name,description&order=created_at` }), Tutor.rest('/rest/v1/skill_knowledge', { method: 'GET', query: `?org_id=eq.${q(o.id)}&select=skill_id,knowledge_id` }), knowledgeOrg(o.id)]); }
    catch (e) { app.querySelector('.sec').innerHTML = `<p class="hint">${d.esc(e.message)}</p>`; return; }
    const kt = new Map(ks.map((k) => [k.id, k.title]));
    app.innerHTML = `${head}<section class="sec org-learn"><h2>Compétences</h2>
      <p class="hint">Une compétence est une capacité observable au travail. Arbor peut en proposer à partir des connaissances validées : tu choisis celles à garder.</p>
      ${skills.length ? `<ul class="org-list">${skills.map((s) => `<li><span><b>${d.esc(s.name)}</b><small> ${d.esc(s.description || '')}</small></span><small>${links.filter((l) => l.skill_id === s.id).map((l) => d.esc(kt.get(l.knowledge_id) || '')).join(' · ')}</small></li>`).join('')}</ul>` : '<p class="hint">Aucune compétence pour l’instant.</p>'}
      <div class="row-btns"><button class="btn" id="skPropose">${d.ic('sparkle')}Proposer des compétences</button></div><p class="hint" id="skMsg" role="status"></p><div id="skProps"></div></section>`;
    app.querySelector('#skPropose').onclick = async () => {
      const msg = app.querySelector('#skMsg'); msg.textContent = 'Analyse des connaissances validées…';
      let r;
      try { r = await srv({ task: 'competences', org: o.id }, (m) => { msg.textContent = m; }); } catch (e) { msg.textContent = e.message; return; }
      msg.textContent = r.skills.length ? 'Propositions (rien n’est ajouté sans ton accord) :' : 'Aucune proposition exploitable.';
      const box = app.querySelector('#skProps');
      box.innerHTML = `<ul class="org-list">${r.skills.map((s, i) => `<li><span><b>${d.esc(s.name)}</b><small> ${d.esc(s.description)}</small><small> Connaissances : ${s.knowledge.map((k) => d.esc(kt.get(k) || '')).join(' · ')}</small></span><button class="btn sm" data-add="${i}">${d.ic('plus')}Ajouter</button></li>`).join('')}</ul>`;
      box.querySelectorAll('[data-add]').forEach((b) => { b.onclick = async () => {
        const s = r.skills[Number(b.dataset.add)]; b.disabled = true;
        try {
          const [row] = await Tutor.rest('/rest/v1/skills', { body: { org_id: o.id, name: s.name, description: s.description, created_by: Tutor.userId() }, headers: { Prefer: 'return=representation' } });
          await Tutor.rest('/rest/v1/skill_knowledge', { body: s.knowledge.map((k) => ({ org_id: o.id, skill_id: row.id, knowledge_id: k })) });
          d.toast('Compétence ajoutée', 'success'); skillsView(app, o, head);
        } catch (x) { d.toast(x.message, 'error'); b.disabled = false; }
      }; });
    };
  }

  /* ---------- Suivi de l'équipe (manager) ---------- */
  async function teamView(app, o, head, focus) {
    app.innerHTML = `${head}<section class="sec"><p class="hint">Chargement…</p></section>`;
    let evs, ks, ms;
    try { [evs, ks, ms] = await Promise.all([evidenceOf(o.id), knowledgeOrg(o.id), membersOrg(o.id)]); } catch (e) { app.querySelector('.sec').innerHTML = `<p class="hint">${d.esc(e.message)}</p>`; return; }
    const learners = ms.filter((m) => m.role === 'member' || evs.some((e) => e.user_id === m.user_id));
    const t = OrgInsight.team(evs, ks, ms);
    const nameOf = (u) => { const m = ms.find((x) => x.user_id === u); return m && m.email ? m.email : 'Membre'; };
    if (focus) {
      const p = OrgInsight.person(focus, evs, ks);
      app.innerHTML = `${head}<section class="sec org-learn"><p><a href="#/org/${o.id}/suivi">${d.ic('arrow-left')} L’équipe</a></p><h2>${d.esc(nameOf(focus))}</h2>
        <p class="hint">${p.n} preuve${p.n > 1 ? 's' : ''} · ${p.diagnostics} diagnostic${p.diagnostics > 1 ? 's' : ''} · ${p.simulations} simulation${p.simulations > 1 ? 's' : ''}${p.last ? ` · dernière activité le ${fmtDate(p.last)}` : ''}. Seule l’activité dans cet espace professionnel est visible ; l’espace personnel ne l’est jamais.</p>
        ${nextBox(o, p.next)}${stateRows(p)}</section><div id="hvBox"></div>`;
      if (window.OrgEngines) OrgEngines.humanValidation(app.querySelector('#hvBox'), o, d, focus);
      return;
    }
    const period = t.sample.from ? `du ${fmtDate(t.sample.from)} au ${fmtDate(t.sample.to)}` : 'aucune période';
    app.innerHTML = `${head}<section class="sec org-learn"><h2>Les 3 fragilités prioritaires</h2>
        <p class="hint">${t.sample.evidence} preuve${t.sample.evidence > 1 ? 's' : ''}, ${t.sample.people} personne${t.sample.people > 1 ? 's' : ''} observée${t.sample.people > 1 ? 's' : ''} sur ${t.sample.members}, ${period}. Une fragilité n’est affichée qu’à partir de 3 observations sur 2 personnes.</p>
        ${t.fragile.length ? `<ol class="fragile">${t.fragile.map((r) => `<li><b>${d.esc(r.knowledge.title)}</b><span>${r.wrong} erreur${r.wrong > 1 ? 's' : ''} sur ${r.n} observation${r.n > 1 ? 's' : ''} (${r.wrongPeople} personne${r.wrongPeople > 1 ? 's' : ''})${r.falseCert ? `, dont <b>${r.falseCert} fausse${r.falseCert > 1 ? 's' : ''} certitude${r.falseCert > 1 ? 's' : ''}</b>` : ''}</span><small>Confiance ${r.confidence}${r.knowledge.page ? ` · p. ${r.knowledge.page} du document` : ''}</small></li>`).join('')}</ol>`
          : `<p class="empty-note">${d.ic('info')}Pas assez de données pour conclure${t.insufficient ? ` (${t.insufficient} connaissance${t.insufficient > 1 ? 's' : ''} avec des erreurs, mais un échantillon trop petit)` : ''}. Propose le diagnostic et un client mystère à l’équipe.</p>`}
      </section>
      <section class="sec org-learn"><h2>L’équipe</h2>
        ${learners.length ? `<ul class="org-list team-rows">${learners.map((m) => { const p = OrgInsight.person(m.user_id, evs, ks); return `<li><a href="#/org/${o.id}/suivi/${m.user_id}">${d.esc(m.email || 'Membre')}</a><small>${p.n ? `${p.diagnostics} diag. · ${p.simulations} simul.${p.falseCertainties ? ` · <b>${p.falseCertainties} fausse${p.falseCertainties > 1 ? 's' : ''} certitude${p.falseCertainties > 1 ? 's' : ''}</b>` : ''}` : 'aucune activité'}</small><small class="nx">${d.esc(p.next.text)}</small></li>`; }).join('')}</ul>` : '<p class="hint">Aucun collaborateur pour l’instant. Invite ton équipe depuis l’onglet Équipe.</p>'}
      </section><div id="rdBox"></div>`;
    if (window.OrgEngines) OrgEngines.radar(app.querySelector('#rdBox'), o, d, evs, ks, ms);
  }

  function render(app, o, view, deps, head) {
    d = deps;
    const lead = ['admin', 'manager'].includes(o.role);
    if (view.tab === 'diagnostic') return diagnosticView(app, o, head);
    if (view.tab === 'mystere') return mystereView(app, o, head);
    if (view.tab === 'resultats') return resultsView(app, o, head);
    if (view.tab === 'competences' && lead) return skillsView(app, o, head);
    if (view.tab === 'suivi' && lead) return teamView(app, o, head, view.sub || null);
    app.innerHTML = `${head}<section class="sec"><p class="hint">Cet écran est réservé aux managers et administrateurs.</p></section>`;
  }

  window.OrgLearn = { render, srv, chat, TABS: ['diagnostic', 'mystere', 'resultats', 'competences', 'suivi'] };
})();
