/* Arbor Business : écrans d'assemblage de l'Experience Architecture (docs/experience-architecture.md, D12).
   - Vue d'ensemble selon le rôle : indicateurs calculés à partir des données réelles, avec leur base (jamais inventés).
   - Intelligence (managers) : Blind Spot Radar, matrice confiance × compétence, parcours d'intégration, Live Policy Watchdog,
     revalidations ciblées, connaissances hors référentiel, recommandations.
   - Paramètres (administrateur) : configuration, conservation, données.
   - Apprendre : cinq portes d'entrée sur les connaissances validées de l'organisation.
   Aucun moteur ici : on assemble OrgInsight, Evidence, Adaptive, OrgEngines, OrgLearn. Les droits sont vérifiés par la base. */
(function () {
  let d = null;
  const q = (s) => encodeURIComponent(s);
  const rest = (path, query) => Tutor.rest(path, { method: 'GET', query });
  const rpc = (name, body) => Tutor.rest(`/rest/v1/rpc/${name}`, { body });
  const soft = (p, dflt = null) => p.catch(() => dflt); // table absente (base plus ancienne) : écran dégradé, pas d'erreur
  const fmt = (t) => (t ? new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '');
  const plural = (n, one, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
  const lead = (o) => ['admin', 'manager'].includes(o.role);
  const content = (o) => ['admin', 'manager', 'expert'].includes(o.role);
  const emailOf = (ms, u) => ((ms || []).find((m) => m.user_id === u) || {}).email || 'Membre';

  // Données de l'organisation lisibles par la personne (les règles d'accès décident de ce qui revient)
  async function load(o, what) {
    const W = new Set(what);
    const get = {
      evs: () => rest('/rest/v1/evidence_events', `?org_id=eq.${q(o.id)}&select=user_id,knowledge_id,skill_id,activity,outcome,confidence,level,context,session_id,detail,at&order=at&limit=5000`),
      ks: () => rest('/rest/v1/knowledge_nodes', `?org_id=eq.${q(o.id)}&select=*&limit=3000`),
      ms: () => rest('/rest/v1/memberships', `?org_id=eq.${q(o.id)}&status=eq.active&select=user_id,role,email,unit_id`),
      skills: () => soft(rest('/rest/v1/skills', `?org_id=eq.${q(o.id)}&select=*`), []),
      links: () => soft(rest('/rest/v1/skill_knowledge', `?org_id=eq.${q(o.id)}&select=skill_id,knowledge_id`), []),
      su: () => soft(rest('/rest/v1/skill_units', `?org_id=eq.${q(o.id)}&select=skill_id,unit_id`), []),
      revals: () => soft(rest('/rest/v1/skill_revalidations', `?org_id=eq.${q(o.id)}&select=*&order=created_at.desc`), null),
      changes: () => soft(rest('/rest/v1/policy_changes', `?org_id=eq.${q(o.id)}&select=id,source_id,status,summary,created_at&order=created_at.desc&limit=30`), null),
      feedback: () => soft(rest('/rest/v1/feedback', `?org_id=eq.${q(o.id)}&select=*&order=created_at.desc&limit=200`), null),
      oos: () => soft(rest('/rest/v1/out_of_scope_knowledge', `?org_id=eq.${q(o.id)}&select=*&order=created_at.desc&limit=100`), null),
      sources: () => soft(rest('/rest/v1/sources', `?org_id=eq.${q(o.id)}&select=id,title`), []),
      actions: () => soft(rest('/rest/v1/learning_actions', `?org_id=eq.${q(o.id)}&user_id=eq.${q(Tutor.userId())}&select=*&order=created_at.desc`), []),
    };
    const keys = Object.keys(get).filter((k) => W.has(k));
    const vals = await Promise.all(keys.map((k) => get[k]()));
    return Object.fromEntries(keys.map((k, i) => [k, vals[i]]));
  }
  const learnersOf = (ms, evs) => ms.filter((m) => m.role === 'member' || evs.some((e) => e.user_id === m.user_id));
  const metric = (icon, value, label, basis, href) => `<${href ? `a href="${href}"` : 'div'} class="ov-metric">${d.ic(icon)}<b class="num">${value}</b><span>${label}</span><small>${basis}</small></${href ? 'a' : 'div'}>`;
  const loading = (app, head) => { app.innerHTML = `${head}<section class="sec"><p class="hint">Chargement…</p></section>`; };

  /* ---------- Vue d'ensemble ---------- */
  async function overview(app, o, head, deps) {
    d = deps;
    loading(app, head);
    const resume = window.OrgOnboarding ? OrgOnboarding.resumeBanner(o, d) : '';
    try {
      if (lead(o)) return await overviewLead(app, o, head, resume);
      if (content(o)) return await overviewExpert(app, o, head, resume);
      return await overviewMember(app, o, head, resume);
    } catch (e) { app.innerHTML = `${head}${resume}<section class="sec"><p class="hint">${d.esc(e.message)}</p></section>${quick(o)}`; }
  }
  // Accès directs, mêmes destinations pour tous les rôles concernés
  function quick(o) {
    const card = (tab, icn, t, txt) => `<a class="org-card" href="#/org/${o.id}/${tab}"><span>${d.ic(icn)}</span><div><b>${t}</b><p>${txt}</p></div></a>`;
    return `<section class="org-grid ov-quick" aria-label="Accès directs">
      ${lead(o) ? card('suivi', 'users-three', 'Suivi de l’équipe', 'Chaque personne, ses preuves et sa prochaine activité.') : ''}
      ${card('diagnostic', 'target', 'Mon diagnostic', 'Quelques questions sur les connaissances validées, sans note.')}
      ${card('mystere', 'storefront', 'Client mystère', 'Une situation simulée et un débrief sur des comportements observables.')}
      ${card('resultats', 'chart-line-up', 'Mon parcours', 'Mes compétences, mes preuves et la suite.')}
      ${window.Feedback ? `<button type="button" class="org-card fb-card" data-org-feedback><span>${d.ic('chat-teardrop-text')}</span><div><b>Donner mon avis</b><p>Trois questions sur ton expérience, environ deux minutes.</p></div></button>` : ''}
    </section>`;
  }
  async function overviewLead(app, o, head, resume) {
    const x = await load(o, ['evs', 'ks', 'ms', 'skills', 'links', 'su', 'revals', 'changes', 'oos', 'sources']);
    const { evs, ks, ms } = x;
    const learners = learnersOf(ms, evs);
    // Progression des compétences : chaque personne × compétences de son poste, d'après ses preuves
    const pw = learners.map((m) => OrgInsight.pathway(m.user_id, evs, ks, x.skills, x.links, x.su, m.unit_id, [], { revalidations: x.revals || [] }));
    const cells = pw.reduce((a, p) => a + p.total, 0), done = pw.reduce((a, p) => a + p.done, 0);
    const radar = OrgInsight.radar(evs, ks, ms);
    const toReval = ks.filter((k) => k.status === 'a_revalider').length;
    const openReval = (x.revals || []).filter((r) => r.status === 'requires_revalidation');
    const pendingChanges = (x.changes || []).filter((c) => c.status === 'a_valider');
    const toValidate = ks.filter((k) => k.status === 'propose').length;
    const oosOpen = (x.oos || []).filter((r) => r.status === 'a_examiner');
    const week = 7 * 864e5, now = Date.now();
    const last7 = evs.filter((e) => now - new Date(e.at) < week), prev7 = evs.filter((e) => now - new Date(e.at) >= week && now - new Date(e.at) < 2 * week);
    const mx = OrgInsight.matrix(evs, ks);
    const srcTitle = (id) => ((x.sources || []).find((s) => s.id === id) || {}).title || 'Document';
    const acts = [
      ...pendingChanges.map((c) => ({ icon: 'siren', t: `Décider des changements de « ${srcTitle(c.source_id)} »`, why: `${(c.summary || {}).modifie || 0} modifiée(s), ${(c.summary || {}).supprime || 0} supprimée(s), ${(c.summary || {}).nouveau || 0} nouvelle(s) : rien n’est appliqué sans décision.`, href: `#/org/${o.id}/documents/${c.source_id}` })),
      ...(openReval.length ? [{ icon: 'arrows-clockwise', t: `${plural(openReval.length, 'revalidation')} en attente`, why: `${plural(new Set(openReval.map((r) => r.user_id)).size, 'personne')} dont la preuve portait sur une règle qui a changé.`, href: `#/org/${o.id}/intelligence` }] : []),
      ...(radar.blind[0] ? [{ icon: 'binoculars', t: `Angle mort : « ${radar.blind[0].knowledge.title} »`, why: radar.blind[0].action, href: `#/org/${o.id}/intelligence` }] : []),
      ...(toValidate ? [{ icon: 'seal-check', t: `${plural(toValidate, 'connaissance')} à valider`, why: 'Proposées par l’extraction ; seules les connaissances validées servent aux activités.', href: `#/org/${o.id}/documents` }] : []),
      ...(oosOpen.length ? [{ icon: 'question', t: `${plural(oosOpen.length, 'connaissance de terrain')} hors référentiel`, why: 'Affirmations plausibles absentes des documents : à documenter ou à écarter.', href: `#/org/${o.id}/intelligence` }] : []),
      ...(!x.skills.length ? [{ icon: 'target', t: 'Définir les compétences du poste', why: 'Sans compétences, la progression ne peut pas être suivie.', href: `#/org/${o.id}/competences` }] : []),
    ].slice(0, 5);
    app.innerHTML = `${head}${resume}
      <section class="sec ov">
        <h2>Vue d’ensemble</h2>
        <p class="hint">Chaque chiffre est calculé à partir des preuves et des décisions enregistrées dans cette organisation ; sa base est indiquée dessous.</p>
        <div class="ov-metrics">
          ${metric('target', cells ? `${done}/${cells}` : '0', 'compétences acquises', cells ? `${plural(learners.length, 'personne')} × compétences de leur poste` : 'aucune compétence ou aucune personne à suivre', `#/org/${o.id}/suivi`)}
          ${metric('binoculars', radar.blind.length, `fragilité${radar.blind.length > 1 ? 's' : ''} collective${radar.blind.length > 1 ? 's' : ''}`, radar.blind.length || !radar.insufficient ? `${plural(radar.limits.evidence, 'observation')}, ${radar.limits.people}/${radar.limits.members} personnes` : `échantillon insuffisant (${plural(radar.insufficient, 'signal', 'signaux')} à confirmer)`, `#/org/${o.id}/intelligence`)}
          ${metric('arrows-clockwise', toReval + openReval.length, 'à revalider', `${plural(toReval, 'connaissance')}, ${plural(openReval.length, 'compétence')} de personnes${x.revals === null ? ' (base sans 009)' : ''}`, `#/org/${o.id}/intelligence`)}
          ${metric('siren', pendingChanges.length, `procédure${pendingChanges.length > 1 ? 's' : ''} modifiée${pendingChanges.length > 1 ? 's' : ''} à décider`, x.changes === null ? 'suivi des versions indisponible' : `${plural((x.changes || []).length, 'changement')} détecté${(x.changes || []).length > 1 ? 's' : ''} au total`, `#/org/${o.id}/documents`)}
          ${metric('pulse', last7.length, 'observations cette semaine', `${plural(new Set(last7.map((e) => e.user_id)).size, 'personne')} ; ${prev7.length} la semaine précédente`)}
          ${metric('warning-diamond', mx.enough ? mx.trend.recent : '–', 'fausses certitudes (30 jours)', mx.enough ? `${mx.trend.previous} les 30 jours précédents ; ${plural(mx.measured, 'mesure')}` : `confiance non mesurée : ${plural(mx.measured, 'mesure')}, il en faut ${mx.minMeasured}`, `#/org/${o.id}/intelligence`)}
        </div>
      </section>
      <section class="sec ov-actions"><h2>Actions prioritaires</h2>
        ${acts.length ? `<ol class="ov-list">${acts.map((a) => `<li><a href="${a.href}">${d.ic(a.icon, true)}<span><b>${d.esc(a.t)}</b><small>${d.esc(a.why)}</small></span>${d.ic('caret-right')}</a></li>`).join('')}</ol>` : `<p class="empty-note">${d.ic('check-circle')}Rien d’urgent. Les prochaines priorités apparaîtront ici dès que des preuves ou des changements les justifieront.</p>`}
      </section>
      ${quick(o)}
      <p class="org-note">${d.ic('lock-simple')}Tu ne vois que ce qui concerne cette organisation. L’espace personnel des collaborateurs n’est jamais visible.</p>`;
  }
  async function overviewExpert(app, o, head, resume) {
    const x = await load(o, ['ks', 'changes', 'oos', 'sources']);
    const toValidate = x.ks.filter((k) => k.status === 'propose'), toReval = x.ks.filter((k) => k.status === 'a_revalider');
    const pending = (x.changes || []).filter((c) => c.status === 'a_valider');
    const oosOpen = (x.oos || []).filter((r) => r.status === 'a_examiner');
    app.innerHTML = `${head}${resume}
      <section class="sec ov"><h2>Vue d’ensemble</h2><p class="hint">Ton rôle : faire de chaque document de référence des connaissances vérifiées et à jour.</p>
        <div class="ov-metrics">
          ${metric('seal-check', toValidate.length, 'connaissances à valider', `dont ${toValidate.filter((k) => k.kind === 'sensible').length} sensibles (manager requis)`, `#/org/${o.id}/documents`)}
          ${metric('arrows-clockwise', toReval.length, 'à revalider', 'extrait absent de la nouvelle version ou modifié', `#/org/${o.id}/documents`)}
          ${metric('siren', pending.length, 'changements à décider', x.changes === null ? 'suivi des versions indisponible' : 'versions comparées par le serveur', `#/org/${o.id}/documents`)}
          ${metric('question', x.oos === null ? '–' : oosOpen.length, 'connaissances de terrain à examiner', x.oos === null ? 'base sans 009' : 'affirmations plausibles absentes des documents')}
        </div></section>
      ${oosOpen.length ? `<section class="sec" id="oosBox"></section>` : ''}
      ${quick(o)}`;
    if (oosOpen.length) renderOos(app.querySelector('#oosBox'), o, x.oos, null);
  }
  async function overviewMember(app, o, head, resume) {
    const me = Tutor.userId();
    const x = await load(o, ['evs', 'ks', 'skills', 'links', 'su', 'revals', 'actions', 'ms']);
    const mine = (x.ms || []).find((m) => m.user_id === me) || {};
    const pw = OrgInsight.pathway(me, x.evs, x.ks, x.skills, x.links, x.su, mine.unit_id, x.actions, { revalidations: x.revals || [] });
    const reval = (x.revals || []).filter((r) => r.user_id === me && r.status === 'requires_revalidation');
    app.innerHTML = `${head}${resume}
      <section class="sec ov"><h2>Bonjour</h2>
        <p class="hint">${pw.total ? `${pw.done} compétence${pw.done > 1 ? 's' : ''} acquise${pw.done > 1 ? 's' : ''} sur ${pw.total} pour ton poste, d’après tes preuves.` : 'Ton responsable n’a pas encore défini les compétences de ton poste : commence par apprendre.'}</p>
        ${reval.length ? `<div class="ov-alert">${d.ic('arrows-clockwise', true)}<div><b>${plural(reval.length, 'compétence')} à revalider</b><small>${d.esc(reval[0].reason)}</small></div><a class="btn sm" href="#/org/${o.id}/resultats">Voir</a></div>` : ''}
        ${pw.plan.length ? `<ol class="pw-plan">${pw.plan.slice(0, 3).map((a) => `<li>${d.ic(a.icon, true)}<span><b>${d.esc(a.label)}${a.item ? ` : ${d.esc(a.item.title)}` : ''}</b><small>${d.esc(a.reason)}</small></span></li>`).join('')}</ol>` : ''}
      </section>
      <section class="sec"><h2>Par où commencer ?</h2><p class="hint">Cinq façons d’entrer dans l’apprentissage. Tu choisis, tu changes quand tu veux.</p>${doorsGrid(o)}</section>
      ${quick(o)}
      <p class="org-note">${d.ic('lock-simple')}Ton espace personnel (cours, révisions, progression) reste sur ton appareil. Ton organisation n’y a pas accès.</p>`;
  }

  /* ---------- Intelligence ---------- */
  async function intelligence(app, o, head, deps) {
    d = deps;
    loading(app, head);
    let x;
    try { x = await load(o, ['evs', 'ks', 'ms', 'skills', 'links', 'su', 'revals', 'changes', 'oos', 'sources', 'feedback']); }
    catch (e) { app.querySelector('.sec').innerHTML = `<p class="hint">${d.esc(e.message)}</p>`; return; }
    const { evs, ks, ms } = x;
    app.innerHTML = `${head}
      <section class="sec intel-intro"><h2>Intelligence</h2><p class="hint">Les signaux de l’équipe, calculés par les mêmes moteurs que le reste d’Arbor, avec leurs limites. Ce sont des pistes à vérifier, jamais un jugement des personnes.</p>
        <nav class="intel-toc" aria-label="Sections">${[['rdBox', 'Angles morts'], ['mxBox', 'Confiance'], ['loopBox', 'Parcours'], ['wdList', 'Procédures'], ['rvBox', 'Revalidations'], ['oosBox', 'Hors référentiel'], ['fbkBox', 'Retours']].map(([id, l]) => `<a href="#${id}" data-jump="${id}">${l}</a>`).join('')}</nav></section>
      <div id="rdBox"></div>
      <section class="sec" id="mxBox"></section>
      <section class="sec" id="loopBox"></section>
      <section class="sec" id="wdList"></section>
      <section class="sec" id="rvBox"></section>
      <section class="sec" id="oosBox"></section>
      <section class="sec" id="fbkBox"></section>`;
    app.querySelectorAll('[data-jump]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); const t = app.querySelector(`#${a.dataset.jump}`); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; });
    OrgEngines.radar(app.querySelector('#rdBox'), o, d, evs, ks, ms);
    renderMatrix(app.querySelector('#mxBox'), OrgInsight.matrix(evs, ks), { team: true });
    renderLoop(app.querySelector('#loopBox'), o, x);
    renderChanges(app.querySelector('#wdList'), o, x);
    renderRevals(app.querySelector('#rvBox'), o, x);
    renderOos(app.querySelector('#oosBox'), o, x.oos, ms);
    renderFeedback(app.querySelector('#fbkBox'), x.feedback, ms);
  }
  // Retours des participants (migration 010) : seulement ce qui a été écrit, avec le nombre de réponses derrière chaque moyenne
  function renderFeedback(box, rows, ms) {
    const H = `<h2>${d.ic('chat-teardrop-text', true)}Retours des participants</h2>`;
    if (rows === null) { box.innerHTML = `${H}<p class="empty-note">${d.ic('info')}Disponible après la mise à jour de la base (migration 010).</p>`; return; }
    if (!rows.length) { box.innerHTML = `${H}<p class="hint">Aucun retour pour l’instant. Chacun peut en donner depuis « Donner mon avis ».</p>`; return; }
    const avg = (k) => { const v = rows.map((r) => r[k]).filter((n) => n); return v.length ? { m: (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1).replace('.', ','), n: v.length } : null; };
    const L = avg('learned_score'), E = avg('ease');
    const use = (v) => rows.filter((r) => r.would_use === v).length, used = rows.filter((r) => r.would_use).length;
    const W = { oui: 'Oui', peut_etre: 'Peut-être', non: 'Non' };
    box.innerHTML = `${H}<p class="hint">${plural(rows.length, 'retour')}, de ${plural(new Set(rows.map((r) => r.user_id)).size, 'personne')}. Les moyennes indiquent le nombre de réponses sur lesquelles elles portent.</p>
      <div class="fbk-sum">
        <div><b class="num">${L ? `${L.m}/5` : '–'}</b><small>impression d’apprendre${L ? ` (${plural(L.n, 'réponse')})` : ''}</small></div>
        <div><b class="num">${used ? `${use('oui')} oui` : '–'}</b><small>${used ? `${use('peut_etre')} peut-être, ${use('non')} non : y reviendraient d’eux-mêmes` : 'personne n’a encore répondu'}</small></div>
        <div><b class="num">${E ? `${E.m}/5` : '–'}</b><small>facilité d’utilisation${E ? ` (${plural(E.n, 'réponse')})` : ''}</small></div>
      </div>
      <ul class="fbk-list">${rows.slice(0, 30).map((r) => `<li><small>${d.esc(emailOf(ms, r.user_id))} · ${fmt(r.created_at)}${r.pilot_step ? ` · ${d.esc(r.pilot_step)}` : ''}</small>
        ${r.blocked ? `<span><b>Ce qui a coincé :</b> ${d.esc(r.blocked)}</span>` : ''}
        ${r.learned || r.learned_score ? `<span><b>Apprendre :</b> ${r.learned_score ? `${r.learned_score}/5` : ''}${r.learned ? ` ${d.esc(r.learned)}` : ''}</span>` : ''}
        ${r.would_use ? `<span><b>Y revenir :</b> ${W[r.would_use]}${r.would_use_why ? `, ${d.esc(r.would_use_why)}` : ''}</span>` : ''}</li>`).join('')}</ul>`;
  }
  // Matrice confiance × compétence : 2 × 2, toujours avec le nombre de mesures et ce qui n'est pas mesuré
  function renderMatrix(box, m, { team = false } = {}, deps) {
    if (deps) d = deps;
    const cell = (q, cls) => { const c = m.cells[q]; return `<div class="mx-cell ${cls}"><b class="num">${c.n}</b><span>${c.label}</span><small>${c.why}</small>${c.knowledge.length ? `<small class="mx-k">${c.knowledge.slice(0, 3).map((k) => d.esc(k.title)).join(' · ')}</small>` : ''}</div>`; };
    box.innerHTML = `<h2>${d.ic('crosshair', true)}Confiance et compétence</h2>
      <p class="hint">La confiance est celle que chacun a déclarée en répondant (« je devine », « je sais », « réflexe »), jamais déduite. Dernière réponse de chaque personne sur chaque connaissance.${team ? ' Vue d’équipe : personne n’est nommé ici.' : ''}</p>
      ${m.measured ? `<div class="mx" role="table" aria-label="Matrice confiance et compétence">
        <span class="mx-ax mx-ax-y">Compétence démontrée</span><span class="mx-ax mx-ax-x">Confiance déclarée</span>
        ${cell('sous_estimee', 'q-under')}${cell('solide', 'q-solid')}${cell('lacune_reconnue', 'q-gap')}${cell('fausse_certitude', 'q-false')}
      </div>` : ''}
      <p class="hint">${m.measured ? `${plural(m.measured, 'mesure')}` : 'Aucune mesure'}${m.unmeasured ? ` ; confiance non mesurée pour ${plural(m.unmeasured, 'réponse')} (aucune conclusion)` : ''}.${team && !m.enough ? ` Pas de conclusion d’équipe sous ${m.minMeasured} mesures.` : ''}${m.enough ? ` Fausses certitudes : ${m.trend.recent} sur les 30 derniers jours, ${m.trend.previous} les 30 précédents.` : ''}</p>`;
  }
  // Dynamic Onboarding Loop : chaque personne, son parcours, ses écarts et l'action recommandée
  function renderLoop(box, o, x) {
    const learners = learnersOf(x.ms, x.evs);
    const rows = learners.map((m) => ({ m, p: OrgInsight.pathway(m.user_id, x.evs, x.ks, x.skills, x.links, x.su, m.unit_id, [], { revalidations: x.revals || [] }) }));
    const n = (p, st) => p.skills.filter((s) => s.status === st).length;
    box.innerHTML = `<h2>${d.ic('path', true)}Parcours d’intégration</h2>
      <p class="hint">Compétences du poste de chacun, ce qui est démontré, ce qui manque, et la prochaine activité (moteur adaptatif). Une compétence sensible exige une validation au poste.</p>
      ${rows.length ? `<ul class="loop-list">${rows.map(({ m, p }) => `<li><a href="#/org/${o.id}/suivi/${m.user_id}"><b>${d.esc(m.email || 'Membre')}</b>
        <span class="loop-bar" aria-hidden="true"><i style="--w:${p.total ? Math.round((p.done / p.total) * 100) : 0}%"></i></span>
        <small>${p.total ? `${p.done}/${p.total} acquises` : 'aucune compétence de poste'}${n(p, 'a_revalider') ? ` · ${n(p, 'a_revalider')} à revalider` : ''}${n(p, 'validation_humaine') ? ` · ${n(p, 'validation_humaine')} en attente de validation au poste` : ''}</small>
        <small class="nx">${p.plan[0] ? d.esc(`${p.plan[0].label}${p.plan[0].item ? ` : ${p.plan[0].item.title}` : ''}`) : 'Rien d’urgent'}</small></a></li>`).join('')}</ul>` : '<p class="hint">Aucun collaborateur pour l’instant.</p>'}`;
  }
  // Live Policy Watchdog, vue d'ensemble : chaque document modifié et ce qui reste à décider
  function renderChanges(box, o, x) {
    if (x.changes === null) { box.innerHTML = `<h2>${d.ic('siren', true)}Procédures modifiées</h2><p class="empty-note">${d.ic('info')}Le suivi des versions demande la migration 008.</p>`; return; }
    const title = (id) => ((x.sources || []).find((s) => s.id === id) || {}).title || 'Document';
    box.innerHTML = `<h2>${d.ic('siren', true)}Procédures modifiées</h2>
      <p class="hint">À chaque nouvelle version, le serveur relit le fichier, vérifie son empreinte et compare les règles. Seul ce qui a changé sur le fond déclenche une revalidation ciblée.</p>
      ${x.changes.length ? `<ul class="org-list">${x.changes.map((c) => { const s = c.summary || {}; return `<li><a href="#/org/${o.id}/documents/${c.source_id}"><b>${d.esc(title(c.source_id))}</b></a><small>${fmt(c.created_at)} · ${s.modifie || 0} modifiée(s), ${s.supprime || 0} supprimée(s), ${s.nouveau || 0} nouvelle(s), ${s.reformule || 0} reformulée(s) · ${c.status === 'a_valider' ? '<b>à décider</b>' : 'traité'}</small></li>`; }).join('')}</ul>` : '<p class="hint">Aucun changement de version pour l’instant.</p>'}`;
  }
  // Revalidations ciblées (migration 009)
  function renderRevals(box, o, x) {
    if (x.revals === null) { box.innerHTML = `<h2>${d.ic('arrows-clockwise', true)}Revalidations ciblées</h2><p class="empty-note">${d.ic('info')}Disponible après la mise à jour de la base (migration 009).</p>`; return; }
    const open = x.revals.filter((r) => r.status === 'requires_revalidation');
    const sk = (id) => ((x.skills || []).find((s) => s.id === id) || {}).name;
    box.innerHTML = `<h2>${d.ic('arrows-clockwise', true)}Revalidations ciblées <small class="num">${open.length}</small></h2>
      <p class="hint">Quand une règle change sur le fond, seules les personnes dont la preuve reposait sur l’ancienne version doivent revalider. Leurs preuves passées restent intactes ; une réussite sur la nouvelle règle clôt la revalidation.</p>
      ${open.length ? `<ul class="org-list rv-list">${open.map((r) => `<li><span><b>${d.esc(emailOf(x.ms, r.user_id))}</b>${sk(r.skill_id) ? ` · ${d.esc(sk(r.skill_id))}` : ''}<small>${d.esc(r.reason)} · depuis le ${fmt(r.created_at)}</small></span><button type="button" class="btn ghost sm" data-cancel="${r.id}">${d.ic('x')}Annuler</button></li>`).join('')}</ul>` : '<p class="hint">Aucune revalidation en attente.</p>'}
      ${x.revals.some((r) => r.status === 'revalidee') ? `<p class="hint">${plural(x.revals.filter((r) => r.status === 'revalidee').length, 'revalidation')} déjà réussie${x.revals.filter((r) => r.status === 'revalidee').length > 1 ? 's' : ''}.</p>` : ''}`;
    box.querySelectorAll('[data-cancel]').forEach((b) => { b.onclick = async () => {
      if (!confirm('Annuler cette revalidation ? À faire seulement si tu as vérifié la compétence autrement (au poste, par exemple).')) return;
      try { await rpc('cancel_revalidation', { p_id: b.dataset.cancel }); b.closest('li').remove(); d.toast('Revalidation annulée', 'success'); } catch (e) { d.toast(e.message, 'error'); }
    }; });
  }
  // Connaissances de terrain hors référentiel (migration 009) : ni justes ni fausses tant qu'elles ne sont pas documentées
  function renderOos(box, o, oos, ms) {
    if (!box) return;
    if (oos === null) { box.innerHTML = `<h2>${d.ic('question', true)}Connaissances hors référentiel</h2><p class="empty-note">${d.ic('info')}Disponible après la mise à jour de la base (migration 009).</p>`; return; }
    const open = oos.filter((r) => r.status === 'a_examiner');
    box.innerHTML = `<h2>${d.ic('question', true)}Connaissances hors référentiel <small class="num">${open.length}</small></h2>
      <p class="hint">Affirmations entendues en simulation, plausibles mais absentes des documents validés. Elles ne comptent ni comme juste ni comme erreur. À documenter (ajoute-la à un document, puis valide-la) ou à écarter.</p>
      ${open.length ? `<ul class="org-list oos-list">${open.map((r) => `<li><span><b>« ${d.esc(r.claim)} »</b><small>${d.esc(r.rationale || '')}${r.context ? ` · ${d.esc(r.context)}` : ''} · ${fmt(r.created_at)}${ms ? ` · ${d.esc(emailOf(ms, r.user_id))}` : ''}</small></span>
        <span class="row-btns"><button type="button" class="btn sm" data-oos="${r.id}" data-s="a_documenter">${d.ic('file-plus')}À documenter</button><button type="button" class="btn ghost sm" data-oos="${r.id}" data-s="ecartee">${d.ic('x')}Écarter</button></span></li>`).join('')}</ul>` : '<p class="hint">Rien à examiner.</p>'}`;
    box.querySelectorAll('[data-oos]').forEach((b) => { b.onclick = async () => {
      try { await rpc('review_out_of_scope', { p_id: b.dataset.oos, p_status: b.dataset.s }); b.closest('li').remove(); d.toast(b.dataset.s === 'ecartee' ? 'Écartée' : 'Marquée à documenter', 'success'); } catch (e) { d.toast(e.message, 'error'); }
    }; });
  }

  /* ---------- Paramètres (administrateur) ---------- */
  function settings(app, o, head, deps) {
    d = deps;
    app.innerHTML = `${head}
      <section class="sec"><h2>Paramètres</h2>
        <ul class="org-list set-list">
          <li><span><b>Configuration détaillée</b><small>Taille, pays, langue, objectifs, équipes et établissements : l’assistant complet, étape par étape ; chaque étape est enregistrée avant de passer à la suivante.</small></span><a class="btn ghost sm" href="#/org/${o.id}/configurer/infos">${d.ic('sliders-horizontal')}Ouvrir</a></li>
          <li><span><b>Membres, rôles et invitations</b><small>Qui fait partie de l’organisation et avec quel rôle.</small></span><a class="btn ghost sm" href="#/org/${o.id}/equipe">${d.ic('user-gear')}Ouvrir</a></li>
        </ul></section>
      <div id="retBox"></div>
      <section class="sec"><h2>Données et confidentialité</h2>
        <ul class="set-facts">
          <li>${d.ic('lock-simple')}<span>L’espace personnel de chacun (cours, révisions, progression) reste sur son appareil : l’organisation n’y a jamais accès.</span></li>
          <li>${d.ic('fingerprint')}<span>Chaque document est relu par le serveur : son empreinte SHA-256 est comparée à celle de l’envoi et chaque extrait est retrouvé dans le fichier avant toute validation.</span></li>
          <li>${d.ic('shield-check')}<span>Les preuves ne se modifient pas. Chaque personne peut télécharger ou effacer ses données d’apprentissage depuis « Mon parcours ».</span></li>
          <li>${d.ic('eye')}<span>L’aperçu collaborateur fonctionne avec des données fictives : il n’écrit rien et n’envoie rien.</span></li>
        </ul></section>`;
    if (window.OrgEngines) OrgEngines.retention(app.querySelector('#retBox'), o, d);
  }

  /* ---------- Apprendre : cinq portes d'entrée (connaissances validées de l'organisation) ---------- */
  const DOORS = [
    ['dicter', 'microphone', 'Dire ce que je sais', 'Explique à voix haute ou par écrit ; Pousse compare avec la fiche validée.'],
    ['photo', 'camera', 'Photographier', 'Une étiquette, une affiche, une procédure : Arbor retrouve la connaissance correspondante.'],
    ['conversation', 'chat-circle-dots', 'Discuter avec Pousse', 'Des questions pour faire émerger ce que tu sais, sources citées.'],
    ['epreuve', 'target', 'Commencer par une épreuve', 'Un diagnostic ou une situation simulée ; la suite part de tes erreurs.'],
    ['importer', 'file-arrow-up', 'Importer un document', 'Une procédure ou une fiche produit, structurée en connaissances à valider.'],
  ];
  function doorsGrid(o) {
    return `<div class="doors">${DOORS.map(([k, icn, t, sub]) => `<a class="door" href="#/org/${o.id}/apprendre/${k}">${d.ic(icn, true)}<span><b>${t}</b><small>${sub}</small></span></a>`).join('')}</div>`;
  }
  async function learn(app, o, head, deps, door) {
    d = deps;
    const back = `<p><a href="#/org/${o.id}/apprendre">${d.ic('arrow-left')} Toutes les portes</a></p>`;
    if (!door) {
      app.innerHTML = `${head}<section class="sec"><h2>Apprendre</h2><p class="hint">Cinq portes d’entrée. Elles s’appuient toutes sur les connaissances validées de ${d.esc(o.name)} ; aucune ne lit ton espace personnel.</p>${doorsGrid(o)}
        <p class="hint">${d.ic('info')}Une explication ou une conversation montre ce que tu crois savoir : c’est une déclaration, pas une preuve. Les preuves viennent du diagnostic, des simulations et de la validation au poste.</p></section>`;
      return;
    }
    if (door === 'importer') {
      app.innerHTML = `${head}<section class="sec">${back}<h2>Importer un document</h2>${content(o)
        ? `<p>Les documents de référence sont importés dans l’onglet Documents : Arbor en extrait les connaissances, le serveur vérifie chaque extrait dans le fichier, puis l’équipe de contenu valide.</p><div class="row-btns"><a class="btn" href="#/org/${o.id}/documents">${d.ic('files')}Aller aux documents</a></div>`
        : `<p>L’import des documents de référence est fait par l’équipe de contenu (experts, managers), pour que chaque connaissance soit vérifiée avant d’être utilisée.</p><p class="hint">Tu as une procédure ou une fiche utile ? Transmets-la à ton responsable. Pour tes propres cours, ton espace personnel accepte tous les PDF.</p>`}</section>`;
      return;
    }
    if (door === 'epreuve') {
      app.innerHTML = `${head}<section class="sec org-learn">${back}<h2>Commencer par une épreuve</h2><p class="hint">Tu te lances, et la suite part de ce qui est observé : erreurs, hésitations, fausses certitudes.</p>
        <div class="doors">
          <a class="door" href="#/org/${o.id}/diagnostic">${d.ic('target', true)}<span><b>Diagnostic</b><small>Questions sur les connaissances validées, avec ta confiance.</small></span></a>
          <a class="door" href="#/org/${o.id}/mystere">${d.ic('storefront', true)}<span><b>Situation simulée</b><small>Un client ou un collègue simulé, puis un débrief.</small></span></a>
        </div><div id="epScen"></div></section>`;
      if (window.OrgEngines && window.OrgLearn) OrgEngines.publishedList(app.querySelector('#epScen'), o, head, app, d);
      return;
    }
    loading(app, head);
    let ks = [];
    try { ks = (await rest('/rest/v1/knowledge_nodes', `?org_id=eq.${q(o.id)}&status=eq.valide&select=id,kind,title,body,quote,page&order=title&limit=500`)) || []; }
    catch (e) { app.querySelector('.sec').innerHTML = `${back}<p class="hint">${d.esc(e.message)}</p>`; return; }
    if (!ks.length) { app.innerHTML = `${head}<section class="sec">${back}<p class="empty-note">${d.ic('info')}Aucune connaissance validée pour l’instant : cette porte s’ouvrira dès que l’équipe de contenu aura validé un premier document.</p></section>`; return; }
    if (door === 'photo') return photoDoor(app, o, head, back, ks);
    return talkDoor(app, o, head, back, ks, door === 'dicter' ? 'enseigne' : 'socratique');
  }
  const passagesOf = (k) => [{ page: Number.isInteger(k.page) ? k.page : undefined, text: `${k.title}. ${k.body || ''}${k.quote ? ` Extrait du document : « ${k.quote} »` : ''}` }];
  // Dialogue (socratique) ou explication (Enseigne-moi) sur UNE connaissance validée. Rien n'est écrit dans les preuves :
  // une explication est une déclaration (niveau 1) ; les preuves Business sont écrites par le serveur seulement.
  function talkDoor(app, o, head, back, ks, mode, preset) {
    const SR = window.Onboarding && Onboarding.speech && Onboarding.speech();
    const dict = mode === 'enseigne';
    app.innerHTML = `${head}<section class="sec org-learn talk">${back}<h2>${dict ? 'Dire ce que je sais' : 'Discuter avec Pousse'}</h2>
      <div class="field"><label for="tkK">Sur quoi ?</label><select id="tkK">${ks.map((k) => `<option value="${k.id}" ${preset === k.id ? 'selected' : ''}>${d.esc(k.title)}</option>`).join('')}</select></div>
      <div class="ms-feed tk-feed" id="tkFeed" aria-live="polite"></div>
      <form class="ms-form" id="tkForm"><label for="tkText" class="sr-only">Ta réponse</label><textarea id="tkText" rows="${dict ? 5 : 2}" maxlength="2000" placeholder="${dict ? 'Explique avec tes mots ce que tu sais sur ce point…' : 'Ta réponse…'}"></textarea>
        <div class="row-btns">${dict && SR ? `<button type="button" class="btn ghost sm" id="tkMic" aria-pressed="false">${d.ic('microphone')}Dicter</button>` : ''}<button class="btn" id="tkSend">${d.ic('paper-plane-tilt')}${dict ? 'Comparer avec la fiche' : 'Répondre'}</button></div>
        <p class="hint" id="tkMsg" role="status"></p></form>
      <p class="hint">${d.ic('info')}${dict ? 'Ton explication est une déclaration : elle t’aide à voir ce qui manque, elle ne compte pas comme preuve.' : 'Pousse ne s’appuie que sur la fiche validée et cite ses sources.'}</p></section>`;
    const feed = app.querySelector('#tkFeed'), msg = app.querySelector('#tkMsg'), sel = app.querySelector('#tkK'), ta = app.querySelector('#tkText');
    let history = [];
    const k = () => ks.find((x) => x.id === sel.value);
    const line = (who, html) => { const b = document.createElement('div'); b.className = `ms-line ${who === 'Toi' ? 'vendeur' : 'client'}`; b.innerHTML = `<b>${who}</b>${html}`; feed.appendChild(b); feed.scrollTop = feed.scrollHeight; };
    async function send(text) {
      const btn = app.querySelector('#tkSend'); btn.disabled = true; msg.textContent = 'Pousse réfléchit…';
      try {
        const r = await Tutor.ask({ mode, notion: { title: k().title, course: o.name }, passages: passagesOf(k()), history, message: text || '', hint: false, learner: { state: '', misconceptions: [], prerequisites: [] } });
        if (text) history.push({ role: 'student', text });
        history.push({ role: 'tutor', text: r.reply });
        line('Pousse', `<p>${d.esc(r.reply)}</p>${(r.citations || []).map((c) => `<small class="tk-cite">${d.ic('quotes', true)}« ${d.esc(c.quote)} »${c.page ? ` · p. ${c.page}` : ''}</small>`).join('')}
          ${(r.correct_points || []).length ? `<p class="tk-ok">${d.ic('check-circle', true)}<b>Juste</b></p><ul>${r.correct_points.map((x) => `<li>${d.esc(x)}</li>`).join('')}</ul>` : ''}
          ${(r.missing || []).length ? `<p class="tk-miss">${d.ic('plus-circle', true)}<b>À compléter</b></p><ul>${r.missing.map((x) => `<li>${d.esc(x)}</li>`).join('')}</ul>` : ''}`);
        msg.textContent = '';
      } catch (e) {
        if (text) history = history.filter((h) => h.text !== text);
        msg.textContent = e.kind === 'auth' ? 'Ta session a expiré : reconnecte-toi.' : e.kind === 'offline' ? 'Pas de connexion : Pousse en a besoin. Ta saisie est gardée.' : e.kind === 'quota' ? 'Tu as utilisé tes échanges du mois avec Pousse.' : `${e.message} Réessaie dans un instant.`;
        if (text) ta.value = text;
      }
      btn.disabled = false;
    }
    sel.onchange = () => { history = []; feed.innerHTML = ''; if (!dict) send(''); else line('Pousse', `<p>Explique « ${d.esc(k().title)} » avec tes mots. Je compare avec la fiche validée.</p>`); };
    app.querySelector('#tkForm').onsubmit = (e) => { e.preventDefault(); const v = ta.value.trim(); if (!v) return; ta.value = ''; line('Toi', `<p>${d.esc(v)}</p>`); send(v); };
    const mic = app.querySelector('#tkMic');
    if (mic) {
      let rec = null;
      mic.onclick = () => {
        if (rec) { try { rec.stop(); } catch (x) { /* déjà arrêtée */ } rec = null; mic.setAttribute('aria-pressed', 'false'); return; }
        const R = SR; rec = new R(); rec.lang = 'fr-FR'; rec.continuous = true; rec.interimResults = true;
        const base = ta.value ? `${ta.value.trim()} ` : ''; let fin = '';
        rec.onresult = (ev) => { let inter = ''; for (let i = ev.resultIndex; i < ev.results.length; i++) { if (ev.results[i].isFinal) fin += `${ev.results[i][0].transcript} `; else inter += ev.results[i][0].transcript; } ta.value = (base + fin + inter).trim(); };
        rec.onerror = () => { rec = null; mic.setAttribute('aria-pressed', 'false'); msg.textContent = 'La dictée s’est arrêtée. Tu peux écrire à la place.'; };
        try { rec.start(); mic.setAttribute('aria-pressed', 'true'); } catch (x) { rec = null; msg.textContent = 'Impossible de démarrer la dictée.'; }
      };
    }
    sel.onchange();
  }
  // Photo : lecture du texte sur l'appareil, puis rapprochement avec les connaissances validées (aucune image envoyée)
  const words = (t) => new Set(String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter((w) => w.length > 3));
  function matchKnowledge(text, ks) {
    const w = words(text);
    return ks.map((k) => { const kw = words(`${k.title} ${k.body} ${k.quote}`); let hit = 0; kw.forEach((x) => { if (w.has(x)) hit++; }); return { k, score: kw.size ? hit / Math.min(kw.size, 12) : 0, hit }; })
      .filter((x) => x.hit >= 2).sort((a, b) => b.score - a.score).slice(0, 3);
  }
  function photoDoor(app, o, head, back, ks) {
    app.innerHTML = `${head}<section class="sec org-learn">${back}<h2>Photographier</h2>
      <p class="hint">Une étiquette, une affiche, une procédure affichée, un écran. Le texte est lu sur ton appareil ; la photo n’est envoyée nulle part.</p>
      <label class="onb-shot"><input type="file" accept="image/*" capture="environment" id="phImg" />${d.ic('camera', true)}<span><b>Prendre ou choisir une photo</b><small>Bien éclairée, de face, texte net</small></span></label>
      <div class="field"><label for="phTxt">Texte lu (ou tape-le)</label><textarea id="phTxt" rows="4"></textarea></div>
      <div class="row-btns"><button class="btn" id="phGo">${d.ic('magnifying-glass')}Trouver la connaissance</button></div>
      <p class="hint" id="phMsg" role="status"></p><div id="phOut"></div></section>`;
    const msg = app.querySelector('#phMsg');
    app.querySelector('#phImg').onchange = async (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      msg.textContent = 'Préparation de la lecture (la première fois, environ 10 Mo)…';
      try {
        const T = await Onboarding.ocr();
        const r = await T.recognize(f, 'fra', { logger: (m) => { if (m.status === 'recognizing text') msg.textContent = `Lecture… ${Math.round((m.progress || 0) * 100)} %`; } });
        app.querySelector('#phTxt').value = String(r.data.text || '').trim(); msg.textContent = 'Texte lu : vérifie-le, puis cherche.';
      } catch (x) { msg.textContent = 'La lecture n’a pas pu se faire ici : tape le texte à la place.'; }
    };
    app.querySelector('#phGo').onclick = () => {
      const m = matchKnowledge(app.querySelector('#phTxt').value, ks);
      app.querySelector('#phOut').innerHTML = m.length ? `<h3>Ça correspond à</h3><ul class="org-list">${m.map(({ k }) => `<li><span><b>${d.esc(k.title)}</b><small>« ${d.esc(k.quote || '')} »${k.page ? ` · p. ${k.page}` : ''}</small></span><button type="button" class="btn sm" data-talk="${k.id}">${d.ic('chat-circle-dots')}En parler</button></li>`).join('')}</ul>`
        : `<p class="empty-note">${d.ic('info')}Aucune connaissance validée ne correspond à ce texte. Elle n’est peut-être pas encore documentée : signale-la à ton responsable.</p>`;
      app.querySelectorAll('[data-talk]').forEach((b) => { b.onclick = () => talkDoor(app, o, head, `<p><a href="#/org/${o.id}/apprendre">${d.ic('arrow-left')} Toutes les portes</a></p>`, ks, 'socratique', b.dataset.talk); });
    };
  }

  window.OrgShell = { overview, intelligence, settings, learn, renderMatrix, doorsGrid, matchKnowledge, DOORS };
})();
