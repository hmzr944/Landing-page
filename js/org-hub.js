/* Arbor Business v2 (docs/business-v2.md, D13) : cinq rubriques par intention.
   Cockpit · Mon équipe · Base de savoir · Développer · Mon apprentissage (+ Paramètres en icône).
   Ce module assemble les écrans existants (OrgDocs, OrgLearn, OrgEngines, OrgShell, OrgOnboarding, League) ; il ne
   contient aucun moteur. Les anciennes adresses restent valides. Les droits sont vérifiés par la base. */
(function () {
  let d = null;
  const q = (s) => encodeURIComponent(s);
  const rest = (path, query) => Tutor.rest(path, { method: 'GET', query });
  const soft = (p, dflt = null) => p.catch(() => dflt);
  // table absente (migration pas encore appliquée) : vide ; toute autre erreur (réseau, droits) reste visible
  const absent = (p, dflt) => p.catch((e) => { if (/schema cache|PGRST20[25]/.test((e && e.message) || '')) return dflt; throw e; });
  const plural = (n, one, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
  const fmt = (t) => (t ? new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '');
  const lead = (o) => ['admin', 'manager'].includes(o.role);
  const info = (text) => `<details class="hub-info"><summary aria-label="Comment c’est calculé">${d.ic('info')}</summary><p>${text}</p></details>`;

  /* ---------- Les cinq états des données (seuils existants : 3 observations, 2 personnes) ---------- */
  function dataState({ evs = [], ms = [], revals = [], radar = null }) {
    const people = new Set(evs.map((e) => e.user_id)).size;
    const open = (revals || []).filter((r) => r.status === 'requires_revalidation');
    if (open.length) return { key: 'revalidation', icon: 'arrows-clockwise', title: 'Une procédure a changé', text: `${plural(new Set(open.map((r) => r.user_id)).size, 'personne')} doit revalider une compétence. Leurs preuves passées restent dans l’historique.`, action: ['Voir qui revalider', 'developper'] };
    if (!evs.length) return { key: 'vide', icon: 'plant', title: 'Votre radar d’équipe se prépare', text: 'Invitez vos collaborateurs et lancez les premiers diagnostics pour découvrir les compétences de votre équipe.', action: ['Inviter mon équipe', 'equipe'] };
    const enough = radar ? radar.blind.length > 0 || (radar.limits.people >= 2 && evs.length >= 3 && !radar.insufficient) : people >= 2 && evs.length >= 3;
    if (people < 2 || evs.length < 3) return { key: 'insuffisant', icon: 'plant', title: 'Premières réponses reçues', text: 'Il faut quelques réponses de plus, d’au moins deux personnes, avant de tirer une conclusion.', action: ['Proposer un diagnostic', 'apprendre/epreuve'] };
    if (!enough) return { key: 'premiers', icon: 'sparkle', title: 'Les premiers signaux apparaissent', text: 'Rien n’est encore assez établi pour parler de point faible. Une simulation aidera à confirmer.', action: ['Lancer un entraînement', 'developper/entrainer'] };
    return { key: 'documente', icon: 'check-circle', title: 'Compétences documentées', text: 'Assez de preuves pour des résultats fiables.', action: null };
  }
  const stateCard = (o, st) => (st.key === 'documente' ? '' : `<div class="hub-state st-${st.key}">${d.ic(st.icon, true)}<div><b>${st.title}</b><p>${st.text}</p></div>${st.action ? `<a class="btn sm" href="#/org/${o.id}/${st.action[1]}">${st.action[0]}</a>` : ''}</div>`);

  async function load(o, keys) {
    const get = {
      evs: () => absent(rest('/rest/v1/evidence_events', `?org_id=eq.${q(o.id)}&select=user_id,knowledge_id,skill_id,activity,outcome,confidence,level,context,session_id,at&order=at&limit=5000`), []),
      ks: () => absent(rest('/rest/v1/knowledge_nodes', `?org_id=eq.${q(o.id)}&select=id,kind,title,page,status,quote,validated_at,created_at&limit=3000`), []),
      ms: () => rest('/rest/v1/memberships', `?org_id=eq.${q(o.id)}&status=eq.active&select=user_id,role,email,unit_id`),
      skills: () => soft(rest('/rest/v1/skills', `?org_id=eq.${q(o.id)}&select=*`), []),
      links: () => soft(rest('/rest/v1/skill_knowledge', `?org_id=eq.${q(o.id)}&select=skill_id,knowledge_id`), []),
      su: () => soft(rest('/rest/v1/skill_units', `?org_id=eq.${q(o.id)}&select=skill_id,unit_id`), []),
      revals: () => soft(rest('/rest/v1/skill_revalidations', `?org_id=eq.${q(o.id)}&select=*`), []),
      changes: () => soft(rest('/rest/v1/policy_changes', `?org_id=eq.${q(o.id)}&select=id,source_id,status,summary,created_at&order=created_at.desc&limit=10`), []),
      sources: () => soft(rest('/rest/v1/sources', `?org_id=eq.${q(o.id)}&select=id,title`), []),
      oos: () => soft(rest('/rest/v1/out_of_scope_knowledge', `?org_id=eq.${q(o.id)}&select=id,status&order=created_at.desc&limit=100`), []),
      board: () => (window.League ? soft(Tutor.rest('/rest/v1/rpc/league_board', { body: { p_org: o.id } }), null) : Promise.resolve(null)),
    };
    const vals = await Promise.all(keys.map((k) => get[k]()));
    return Object.fromEntries(keys.map((k, i) => [k, vals[i]]));
  }
  const loading = (app, head) => { app.innerHTML = `${head}<section class="sec"><p class="hint">Chargement…</p></section>`; };
  const learnersOf = (ms, evs) => ms.filter((m) => m.role === 'member' || evs.some((e) => e.user_id === m.user_id));

  /* ---------- 1. Cockpit : « que se passe-t-il dans mon équipe, que dois-je faire aujourd'hui ? » ---------- */
  async function cockpit(app, o, head, deps) {
    d = deps;
    loading(app, head);
    const resume = window.OrgOnboarding ? OrgOnboarding.resumeBanner(o, d) : '';
    let x;
    try { x = await load(o, ['evs', 'ks', 'ms', 'skills', 'links', 'su', 'revals', 'changes', 'sources', 'oos', 'board']); }
    catch (e) { app.innerHTML = `${head}<section class="sec"><p class="hint">${d.esc(e.message)}</p></section>`; return; }
    const { evs, ks, ms } = x;
    const learners = learnersOf(ms, evs);
    const radar = OrgInsight.radar(evs, ks, ms);
    const st = dataState({ evs, ms, revals: x.revals, radar });
    // compétences : part des personnes qui l'ont acquise, seulement quand au moins deux personnes ont été observées dessus
    const pws = learners.map((m) => ({ m, p: OrgInsight.pathway(m.user_id, evs, ks, x.skills, x.links, x.su, m.unit_id, [], { revalidations: x.revals || [] }) }));
    const bySkill = (x.skills || []).map((s) => {
      const rows = pws.map(({ p }) => p.skills.find((k) => k.skill.id === s.id)).filter(Boolean);
      const observed = rows.filter((r) => r.level > 0 || r.knowledge.some((k) => k.state)).length;
      return { s, total: rows.length, acquired: rows.filter((r) => r.status === 'acquise').length, observed };
    }).filter((r) => r.total);
    const mastered = bySkill.filter((r) => r.acquired > 0).sort((a, b) => b.acquired / b.total - a.acquired / a.total).slice(0, 3);
    const toStrengthen = radar.blind.slice(0, 3);
    const openReval = (x.revals || []).filter((r) => r.status === 'requires_revalidation');
    const pending = (x.changes || []).filter((c) => c.status === 'a_valider');
    const toValidate = ks.filter((k) => k.status === 'propose').length;
    const week = evs.filter((e) => Date.now() - new Date(e.at) < 7 * 864e5);
    const srcTitle = (id) => ((x.sources || []).find((s) => s.id === id) || {}).title || 'Document';
    const acts = [
      ...pending.map((c) => ({ icon: 'siren', t: `Décider des changements de « ${srcTitle(c.source_id)} »`, href: `#/org/${o.id}/savoir/${c.source_id}` })),
      ...(toValidate ? [{ icon: 'seal-check', t: `Valider ${plural(toValidate, 'connaissance proposée', 'connaissances proposées')}`, href: `#/org/${o.id}/savoir` }] : []),
      ...(openReval.length ? [{ icon: 'arrows-clockwise', t: `${plural(openReval.length, 'revalidation')} en attente`, href: `#/org/${o.id}/developper` }] : []),
      ...((x.oos || []).filter((r) => r.status === 'a_examiner').length ? [{ icon: 'question', t: `${plural(x.oos.filter((r) => r.status === 'a_examiner').length, 'connaissance de terrain')} hors référentiel à examiner`, href: `#/org/${o.id}/developper` }] : []),
      ...(toStrengthen[0] ? [{ icon: 'target', t: `Renforcer « ${toStrengthen[0].knowledge.title} »`, href: `#/org/${o.id}/developper/entrainer` }] : []),
      ...(!x.skills.length && ks.some((k) => k.status === 'valide') ? [{ icon: 'list-checks', t: 'Définir les compétences du poste', href: `#/org/${o.id}/competences` }] : []),
      ...(ms.length < 2 ? [{ icon: 'user-plus', t: 'Inviter mon équipe', href: `#/org/${o.id}/equipe` }] : []),
    ].slice(0, 4);
    const recentTrophies = ((x.board && x.board.members) || []).flatMap((m) => (m.trophies || []).map((t) => ({ name: m.name, trophy: t.trophy, at: t.last }))).sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 4);
    const TN = window.League ? League.TROPHY_NAMES : {};
    const evolutions = [
      ...(x.changes || []).slice(0, 3).map((c) => ({ icon: 'files', t: `Nouvelle version de « ${srcTitle(c.source_id)} »`, s: `${fmt(c.created_at)} · ${c.status === 'a_valider' ? 'à décider' : 'traitée'}` })),
      ...(() => { const n = ks.filter((k) => k.status === 'valide' && k.validated_at && Date.now() - new Date(k.validated_at) < 7 * 864e5).length; return n ? [{ icon: 'seal-check', t: `${plural(n, 'connaissance validée', 'connaissances validées')} cette semaine`, s: '' }] : []; })(),
    ];
    app.innerHTML = `${head}${resume}
      <section class="sec hub-cockpit">
        <header class="hub-h"><h2>Cockpit</h2>${info('Chaque chiffre vient des preuves et des décisions enregistrées dans votre organisation. Une fragilité n’apparaît qu’à partir de 3 observations sur 2 personnes.')}</header>
        ${stateCard(o, st)}
        <div class="hub-kpis">
          <a class="hub-kpi" href="#/org/${o.id}/equipe"><b class="num">${pws.reduce((a, r) => a + r.p.done, 0)}<small>/${pws.reduce((a, r) => a + r.p.total, 0)}</small></b><span>compétences acquises</span></a>
          <a class="hub-kpi" href="#/org/${o.id}/developper"><b class="num">${radar.blind.length}</b><span>${radar.blind.length > 1 ? 'points à renforcer' : 'point à renforcer'}</span></a>
          <a class="hub-kpi" href="#/org/${o.id}/developper"><b class="num">${openReval.length + ks.filter((k) => k.status === 'a_revalider').length}</b><span>à revalider</span></a>
          <div class="hub-kpi"><b class="num">${week.length}</b><span>${week.length > 1 ? 'réponses cette semaine' : 'réponse cette semaine'}</span></div>
        </div>
      </section>
      <div class="hub-cols">
        <section class="sec"><h3>${d.ic('seal-check', true)}Compétences maîtrisées</h3>
          ${mastered.length ? `<ul class="hub-bars">${mastered.map((r) => `<li><span>${d.esc(r.s.name)}</span><i style="--w:${Math.round((r.acquired / r.total) * 100)}%"></i><small>${r.acquired}/${r.total}</small></li>`).join('')}</ul>` : '<p class="hint">Pas encore de compétence acquise.</p>'}</section>
        <section class="sec"><h3>${d.ic('target', true)}À renforcer</h3>
          ${toStrengthen.length ? `<ul class="hub-list">${toStrengthen.map((r) => `<li><b>${d.esc(r.knowledge.title)}</b><small>${plural(r.people, 'personne observée', 'personnes observées')}</small></li>`).join('')}</ul>` : `<p class="hint">${st.key === 'documente' ? 'Rien à signaler.' : 'Pas encore assez de réponses pour le dire.'}</p>`}</section>
      </div>
      <section class="sec hub-todo"><h3>${d.ic('lightning', true)}À faire aujourd’hui</h3>
        ${acts.length ? `<ol class="ov-list">${acts.map((a) => `<li><a href="${a.href}">${d.ic(a.icon, true)}<span><b>${d.esc(a.t)}</b></span>${d.ic('caret-right')}</a></li>`).join('')}</ol>` : `<p class="empty-note">${d.ic('check-circle')}Rien d’urgent.</p>`}
      </section>
      <div class="hub-cols">
        <section class="sec"><h3>${d.ic('tree-evergreen', true)}Évolutions des connaissances</h3>
          ${evolutions.length ? `<ul class="hub-list">${evolutions.map((e) => `<li>${d.ic(e.icon)}<b>${d.esc(e.t)}</b>${e.s ? `<small>${e.s}</small>` : ''}</li>`).join('')}</ul>` : '<p class="hint">Aucune évolution récente.</p>'}</section>
        <section class="sec"><h3>${d.ic('trophy', true)}Activité de l’équipe</h3>
          ${recentTrophies.length ? `<ul class="hub-list">${recentTrophies.map((t) => `<li>${d.ic('medal', true)}<b>${d.esc(t.name)} : ${d.esc(TN[t.trophy] || t.trophy)}</b><small>${fmt(t.at)}</small></li>`).join('')}</ul>` : `<p class="hint">${week.length ? `${plural(new Set(week.map((e) => e.user_id)).size, 'personne')} active cette semaine.` : 'Pas encore d’activité.'}</p>`}</section>
      </div>`;
  }

  /* ---------- 2. Mon équipe : collaborateurs, progression, trophées, cordées, invitations ---------- */
  async function team(app, o, head, deps, teamViewLegacy) {
    d = deps;
    loading(app, head);
    let x;
    try { x = await load(o, ['evs', 'ks', 'ms', 'skills', 'links', 'su', 'revals', 'board']); }
    catch (e) { app.innerHTML = `${head}<section class="sec"><p class="hint">${d.esc(e.message)}</p></section>`; return; }
    const { evs, ks, ms } = x;
    const learners = learnersOf(ms, evs);
    const boardOf = (u) => ((x.board && x.board.members) || []).find((m) => m.user_id === u);
    const RANKS = window.League ? League.RANKS : {};
    app.innerHTML = `${head}
      <section class="sec hub-team">
        <header class="hub-h"><h2>Mon équipe <small class="num">${ms.length}</small></h2><a class="btn" href="#teamInvite" id="hubInvite">${d.ic('user-plus', true)}Inviter</a></header>
        ${learners.length ? `<ul class="hub-people">${learners.map((m) => {
          const p = OrgInsight.pathway(m.user_id, evs, ks, x.skills, x.links, x.su, m.unit_id, [], { revalidations: x.revals || [] });
          const b = boardOf(m.user_id); const r = RANKS[(b && b.rank) || 1];
          const dev = p.skills.filter((s) => ['en_cours', 'validation_humaine', 'a_revalider'].includes(s.status)).length;
          return `<li><a href="#/org/${o.id}/suivi/${m.user_id}">
            <span class="hub-av" aria-hidden="true">${d.esc((m.email || '?').slice(0, 1).toUpperCase())}</span>
            <span class="hub-pn"><b>${d.esc(m.email || 'Membre')}</b><small>${r ? `${r.label} · ` : ''}${p.total ? `${p.done}/${p.total} compétences démontrées${dev ? `, ${dev} en développement` : ''}` : 'aucune compétence de poste'}</small></span>
            <span class="loop-bar" aria-hidden="true"><i style="--w:${p.total ? Math.round((p.done / p.total) * 100) : 0}%"></i></span>
            ${b && b.trophies.length ? `<span class="hub-tro" title="Trophées publics">${d.ic('medal', true)}${b.trophies.reduce((a, t) => a + t.count, 0)}</span>` : ''}</a></li>`; }).join('')}</ul>`
          : `<div class="hub-state st-vide">${d.ic('users-three', true)}<div><b>Votre équipe vous attend</b><p>Invitez vos collaborateurs : ils rejoignent Arbor avec un simple lien.</p></div></div>`}
      </section>
      <div id="hubCordees"></div>
      <div id="hubLegacy"></div>`;
    if (window.League) League.cordeesBlock(app.querySelector('#hubCordees'), o, d, x.board, ms);
    // invitations, rôles, équipes et établissements : écran existant, conservé tel quel sous la liste
    const holder = app.querySelector('#hubLegacy');
    await teamViewLegacy(holder, o);
    const inv = app.querySelector('#hubInvite');
    inv.onclick = (e) => { e.preventDefault(); const t = app.querySelector('#teamInvite'); if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); const i = t.querySelector('#ivEmail'); if (i) setTimeout(() => i.focus(), 400); } };
  }

  /* ---------- 3. Base de savoir : Document → connaissances proposées → validation → compétences ---------- */
  const pipe = (o, cur) => `<nav class="hub-pipe" aria-label="Du document à la compétence">
      <a href="#/org/${o.id}/savoir" ${cur === 'docs' ? 'aria-current="page"' : ''}>${d.ic('file-text', cur === 'docs')}<span>Documents</span></a>${d.ic('caret-right')}
      <a href="#/org/${o.id}/savoir" ${cur === 'k' ? 'aria-current="page"' : ''}>${d.ic('seal-check', cur === 'k')}<span>Connaissances validées</span></a>${d.ic('caret-right')}
      <a href="#/org/${o.id}/competences" ${cur === 'skills' ? 'aria-current="page"' : ''}>${d.ic('target', cur === 'skills')}<span>Compétences</span></a>
    </nav>`;
  function knowledge(app, o, head, deps, sub) {
    d = deps;
    return OrgDocs.render(app, o, sub, d, `${head}${pipe(o, sub ? 'k' : 'docs')}`);
  }
  const pipeHead = (o, deps, cur) => { d = deps; return pipe(o, cur); };

  /* ---------- 4. Développer : Diagnostiquer → Entraîner ---------- */
  const devTabs = (o, cur) => `<nav class="hub-sub" aria-label="Développer">
      <a href="#/org/${o.id}/developper" ${cur === 'diag' ? 'aria-current="page"' : ''}>${d.ic('magnifying-glass', cur === 'diag')}Diagnostiquer</a>
      <a href="#/org/${o.id}/developper/entrainer" ${cur === 'train' ? 'aria-current="page"' : ''}>${d.ic('barbell', cur === 'train')}Entraîner</a>
    </nav>`;
  async function develop(app, o, head, deps, sub) {
    d = deps;
    if (sub === 'entrainer') {
      await OrgEngines.scenariosView(app, o, `${head}${devTabs(o, 'train')}`, d);
      // client mystère, missions demandées, défis de saison : à la suite des scénarios
      const more = document.createElement('div'); app.appendChild(more);
      let acts = [];
      try { acts = await rest('/rest/v1/learning_actions', `?org_id=eq.${q(o.id)}&status=eq.a_faire&select=id,user_id,kind,reason,created_at&order=created_at.desc&limit=20`); } catch (e) { acts = []; }
      more.innerHTML = `<section class="sec"><h2>${d.ic('storefront', true)}Client mystère et diagnostic</h2><p class="hint">Le client mystère improvise une situation à partir des connaissances validées ; le diagnostic pose les questions que verra votre équipe. Essayez-les vous-même avant de les proposer.</p>
          <div class="row-btns"><a class="btn ghost" href="#/org/${o.id}/mystere">${d.ic('play')}Essayer le client mystère</a><a class="btn ghost" href="#/org/${o.id}/diagnostic">${d.ic('list-checks')}Passer le diagnostic</a></div></section>
        <section class="sec"><h2>${d.ic('flag', true)}Missions en cours <small class="num">${acts.length}</small></h2>
          ${acts.length ? `<ul class="hub-list">${acts.map((a) => `<li>${d.ic('arrow-circle-right')}<b>${d.esc(a.reason)}</b><small>depuis le ${fmt(a.created_at)}</small></li>`).join('')}</ul>` : '<p class="hint">Aucune mission en cours. Elles naissent d’un angle mort, d’un changement de procédure ou de votre demande.</p>'}</section>
        <div id="hubSeason"></div>`;
      if (window.League) League.seasonBlock(more.querySelector('#hubSeason'), o, d);
      return;
    }
    await OrgShell.intelligence(app, o, `${head}${devTabs(o, 'diag')}`, d);
    // état des données en tête, à la place des longues explications
    let evs = [], ms = [], revals = [];
    try { [evs, ms, revals] = await Promise.all([rest('/rest/v1/evidence_events', `?org_id=eq.${q(o.id)}&select=user_id,at&limit=5000`), rest('/rest/v1/memberships', `?org_id=eq.${q(o.id)}&status=eq.active&select=user_id`), soft(rest('/rest/v1/skill_revalidations', `?org_id=eq.${q(o.id)}&select=user_id,status`), [])]); } catch (e) { /* écran déjà affiché */ }
    const st = dataState({ evs, ms, revals });
    const intro = app.querySelector('.intel-intro');
    if (intro && st.key !== 'documente') intro.insertAdjacentHTML('beforeend', stateCard(o, st));
  }

  /* ---------- 5. Mon apprentissage (le manager comme apprenant) ---------- */
  function myLearning(app, o, head, deps, sub) {
    d = deps;
    if (sub) return OrgShell.learn(app, o, head, d, sub);
    app.innerHTML = `${head}<section class="sec"><h2>Mon apprentissage</h2>
        <p class="hint">Votre propre progression, séparée des outils de gestion de l’équipe.</p>
        ${OrgShell.doorsGrid(o)}</section>
      <section class="org-grid">
        <a class="org-card" href="#/org/${o.id}/resultats"><span>${d.ic('chart-line-up')}</span><div><b>Mon parcours</b><p>Mes compétences, mes preuves, la suite.</p></div></a>
        ${window.League ? `<a class="org-card" href="#/org/${o.id}/canopee"><span>${d.ic('tree', true)}</span><div><b>Ma Canopée</b><p>Mon rang, mon arbre, mes trophées.</p></div></a>` : ''}
        <a class="org-card" href="#/"><span>${d.ic('user-circle')}</span><div><b>Mon espace personnel</b><p>Mes cours à moi, les cinq portes d’entrée Student, sur cet appareil.</p></div></a>
      </section>`;
  }

  window.OrgHub = { cockpit, team, knowledge, pipeHead, develop, myLearning, dataState };
})();
