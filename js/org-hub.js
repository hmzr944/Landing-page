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
    // compétences à surveiller : observées, pas encore acquises par tous (part la plus basse d'abord)
    const watch = bySkill.filter((r) => r.observed && r.acquired < r.total).sort((a, b) => a.acquired / a.total - b.acquired / b.total).slice(0, 4);
    const progress = [...bySkill].sort((a, b) => b.acquired / b.total - a.acquired / a.total).slice(0, 5);
    const done = pws.reduce((a, r) => a + r.p.done, 0), total = pws.reduce((a, r) => a + r.p.total, 0);
    const reval = openReval.length + ks.filter((k) => k.status === 'a_revalider').length;
    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    const kpi = (href, icon, label, value, sub, tone = '') => `<${href ? `a href="${href}"` : 'div'} class="hub-kpi ${tone}"><span class="kpi-l">${d.ic(icon)}${label}</span><b class="num">${value}</b><small>${sub}</small></${href ? 'a' : 'div'}>`;
    app.innerHTML = `${head}${resume}
      <div class="pg ck">
        <header class="pg-h"><div><h1>Cockpit</h1><p>Où en est ${d.esc(o.name)}, ce qu’il faut faire aujourd’hui, comment l’équipe progresse.</p></div>
          <div class="pg-meta"><span class="pg-pill">${d.ic('calendar-blank')}Au ${today} · activité sur 7 jours</span>${info('Chaque chiffre vient des preuves et des décisions enregistrées dans votre organisation. Une fragilité n’apparaît qu’à partir de 3 observations sur 2 personnes.')}</div></header>
        <section class="sec hub-cockpit">${stateCard(o, st)}
          <div class="hub-kpis">
            ${kpi(`#/org/${o.id}/equipe`, 'seal-check', 'Compétences démontrées', `${done}<small>/${total}</small>`, total ? 'compétences acquises, toutes personnes confondues' : 'aucune compétence de poste encore', 'pos')}
            ${kpi(`#/org/${o.id}/developper`, 'target', 'À renforcer', radar.blind.length, radar.blind.length ? (radar.blind.length > 1 ? 'points à renforcer, vus chez 2 personnes ou plus' : 'point à renforcer, vu chez 2 personnes ou plus') : 'aucun point établi')}
            ${kpi(`#/org/${o.id}/developper`, 'arrows-clockwise', 'Revalidations', reval, reval ? 'à revalider après un changement' : 'rien à revalider', reval ? 'warn' : '')}
            ${kpi('', 'pulse', 'Activité', week.length, week.length > 1 ? 'réponses cette semaine' : 'réponse cette semaine')}
          </div>
        </section>
        <div class="ck-grid">
          <div class="ck-main">
            <section class="sec hub-todo"><h3>${d.ic('lightning', true)}À faire aujourd’hui</h3>
              ${acts.length ? `<ol class="ov-list">${acts.map((a) => `<li><a href="${a.href}">${d.ic(a.icon, true)}<span><b>${d.esc(a.t)}</b></span>${d.ic('caret-right')}</a></li>`).join('')}</ol>` : `<p class="empty-note">${d.ic('check-circle')}Rien d’urgent.</p>`}
            </section>
            <section class="sec"><h3>${d.ic('target', true)}Besoins de formation</h3>
              ${toStrengthen.length ? `<ul class="hub-list">${toStrengthen.map((r) => `<li>${d.ic('target')}<b>${d.esc(r.knowledge.title)}</b><small>${plural(r.people, 'personne observée', 'personnes observées')}</small></li>`).join('')}</ul>` : `<p class="hint">${st.key === 'documente' ? 'Aucun besoin collectif établi.' : 'Pas encore assez d’observations pour en parler.'}</p>`}</section>
            <section class="sec"><h3>${d.ic('tree-evergreen', true)}Évolutions des connaissances</h3>
              ${evolutions.length ? `<ul class="hub-list">${evolutions.map((e) => `<li>${d.ic(e.icon)}<b>${d.esc(e.t)}</b>${e.s ? `<small>${e.s}</small>` : ''}</li>`).join('')}</ul>` : '<p class="hint">Aucune évolution récente.</p>'}</section>
          </div>
          <aside class="ck-side" aria-label="Équipe">
            <section class="sec"><h3>${d.ic('pulse', true)}Activité récente</h3>
              ${recentTrophies.length ? `<ul class="hub-list">${recentTrophies.map((t) => `<li>${d.ic('medal', true)}<b>${d.esc(t.name)} : ${d.esc(TN[t.trophy] || t.trophy)}</b><small>${fmt(t.at)}</small></li>`).join('')}</ul>` : `<p class="hint">${week.length ? `${plural(week.length, 'réponse')} cette semaine, pas encore de trophée.` : 'Pas encore d’activité cette semaine.'}</p>`}</section>
            <section class="sec"><h3>${d.ic('eye', true)}Compétences à surveiller</h3>
              ${watch.length ? `<ul class="hub-bars">${watch.map((r) => `<li><span>${d.esc(r.s.name)}</span><i style="--w:${Math.round((r.acquired / r.total) * 100)}%"></i><small>${r.acquired}/${r.total}</small></li>`).join('')}</ul>` : `<p class="hint">${bySkill.length ? 'Rien à surveiller pour l’instant.' : 'Les compétences apparaîtront dès les premières observations.'}</p>`}</section>
            <section class="sec"><h3>${d.ic('chart-line-up', true)}Progression collective</h3>
              ${progress.length && mastered.length ? `<ul class="hub-bars">${progress.map((r) => `<li><span>${d.esc(r.s.name)}</span><i style="--w:${Math.round((r.acquired / r.total) * 100)}%"></i><small>${r.acquired}/${r.total}</small></li>`).join('')}</ul>` : '<p class="hint">Pas encore de compétence acquise.</p>'}</section>
          </aside>
        </div>
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
    // une ligne par personne : progression calculée par les moteurs existants (aucun score inventé)
    const rows = learners.map((m) => {
      const p = OrgInsight.pathway(m.user_id, evs, ks, x.skills, x.links, x.su, m.unit_id, [], { revalidations: x.revals || [] });
      const b = boardOf(m.user_id); const r = RANKS[(b && b.rank) || 1];
      const dev = p.skills.filter((sk) => ['en_cours', 'validation_humaine', 'a_revalider'].includes(sk.status)).length;
      const reval = p.skills.some((sk) => sk.status === 'a_revalider') || (x.revals || []).some((rv) => rv.user_id === m.user_id && rv.status === 'requires_revalidation');
      const active = evs.some((e) => e.user_id === m.user_id);
      const tro = b ? b.trophies.reduce((a, t) => a + t.count, 0) : 0;
      const flags = [dev ? 'dev' : '', reval ? 'reval' : '', active ? '' : 'idle'].filter(Boolean).join(' ');
      const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
      return { m, flags, html: `<tr data-q="${d.esc((m.email || '').toLowerCase())}" data-f="${flags}">
          <td><a class="tb-person" href="#/org/${o.id}/suivi/${m.user_id}"><span class="hub-av" aria-hidden="true">${d.esc((m.email || '?').slice(0, 1).toUpperCase())}</span><span class="hub-pn"><b>${d.esc(m.email || 'Membre')}</b><small>${d.esc(Org.ROLES[m.role] || m.role)}</small></span></a></td>
          <td class="tb-hide-s">${r ? `<span class="tb-rank">${d.ic('plant')}${r.label}</span>` : '<span class="tb-dim">-</span>'}</td>
          <td>${p.total ? `<b class="num">${p.done}</b><span class="tb-dim">/${p.total}</span>${dev ? `<small class="tb-sub">${dev} en développement</small>` : ''}` : '<span class="tb-dim">aucune de poste</span>'}</td>
          <td class="tb-hide-s"><span class="loop-bar" role="img" aria-label="${pct} % des compétences démontrées"><i style="--w:${pct}%"></i></span></td>
          <td>${reval ? `<span class="tb-tag warn">${d.ic('arrows-clockwise')}À revalider</span>` : !active ? '<span class="tb-tag">Pas encore actif</span>' : dev ? '<span class="tb-tag pos">En progression</span>' : '<span class="tb-tag">À jour</span>'}</td>
          <td class="tb-num">${tro ? `<span class="hub-tro" title="Trophées publics">${d.ic('medal', true)}${tro}</span>` : '<span class="tb-dim">-</span>'}</td>
          <td class="tb-go"><a href="#/org/${o.id}/suivi/${m.user_id}" aria-label="Voir le détail de ${d.esc(m.email || 'ce membre')}">${d.ic('caret-right')}</a></td></tr>` };
    });
    const count = (f) => rows.filter((r) => r.flags.split(' ').includes(f)).length;
    app.innerHTML = `${head}
      <div class="pg">
        <header class="pg-h"><div><h1>Mon équipe <small class="num">${ms.length}</small></h1><p>Les personnes, leur progression et leurs accès. Une erreur individuelle n’est jamais affichée ici.</p></div>
          <a class="btn" href="#teamInvite" id="hubInvite">${d.ic('user-plus', true)}Inviter</a></header>
        <section class="sec hub-team" aria-label="Collaborateurs">
          ${rows.length ? `<div class="tb-tools">
              <label class="tb-search">${d.ic('magnifying-glass')}<input id="tmQ" type="search" placeholder="Rechercher une personne" aria-label="Rechercher une personne" autocomplete="off" /></label>
              <div class="seg" role="group" aria-label="Filtrer l’équipe">
                <button type="button" data-f="" aria-pressed="true">Tous <span class="num">${rows.length}</span></button>
                <button type="button" data-f="dev" aria-pressed="false">En progression <span class="num">${count('dev')}</span></button>
                <button type="button" data-f="reval" aria-pressed="false">À revalider <span class="num">${count('reval')}</span></button>
                <button type="button" data-f="idle" aria-pressed="false">Pas encore actifs <span class="num">${count('idle')}</span></button>
              </div></div>
            <div class="tb-wrap"><table class="tb hub-people-tb">
              <thead><tr><th scope="col">Personne</th><th scope="col" class="tb-hide-s">Rang</th><th scope="col">Compétences démontrées</th><th scope="col" class="tb-hide-s">Progression</th><th scope="col">État</th><th scope="col" class="tb-num">Trophées</th><th scope="col"><span class="sr-only">Détail</span></th></tr></thead>
              <tbody>${rows.map((r) => r.html).join('')}</tbody></table></div>
            <p class="tb-empty hint" id="tmEmpty" hidden>Aucune personne ne correspond.</p>`
          : `<div class="hub-state st-vide">${d.ic('users-three', true)}<div><b>Votre équipe vous attend</b><p>Invitez vos collaborateurs : ils rejoignent Arbor avec un simple lien.</p></div></div>`}
        </section>
        <div id="hubCordees"></div>
        <div id="hubLegacy"></div>
      </div>`;
    // recherche et filtres : sur les lignes déjà affichées, sans nouvel appel
    const tq = app.querySelector('#tmQ');
    if (tq) {
      let f = '';
      const apply = () => {
        const w = tq.value.trim().toLowerCase(); let n = 0;
        app.querySelectorAll('.hub-people-tb tbody tr').forEach((tr) => { const ok = (!w || tr.dataset.q.includes(w)) && (!f || tr.dataset.f.split(' ').includes(f)); tr.hidden = !ok; if (ok) n++; });
        app.querySelector('#tmEmpty').hidden = n > 0;
      };
      tq.addEventListener('input', apply);
      app.querySelectorAll('.seg [data-f]').forEach((b) => { b.onclick = () => { f = b.dataset.f; app.querySelectorAll('.seg [data-f]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); apply(); }; });
    }
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
    const intro = sub ? '' : `<header class="pg-h"><div><h1>Base de savoir</h1><p>Les documents de référence de ${d.esc(o.name)} et les connaissances validées qui nourrissent le diagnostic, les simulations et les compétences.</p></div></header>`;
    return OrgDocs.render(app, o, sub, d, `${head}${intro}${pipe(o, sub ? 'k' : 'docs')}`);
  }
  const pipeHead = (o, deps, cur) => { d = deps; return pipe(o, cur); };

  /* ---------- 4. Développer : Diagnostiquer → Entraîner ---------- */
  // Parcours métier : Diagnostiquer → Comprendre → Entraîner → Mesurer. Chaque étape ouvre un écran existant :
  // Comprendre = le suivi par personne (qui a besoin de quoi), Mesurer = la progression de l'équipe.
  const devTabs = (o, cur) => `<header class="pg-h dev-h"><div><h1>Développer</h1><p>Repérer les besoins, comprendre leur origine, entraîner, puis mesurer les progrès.</p></div></header>
    <nav class="hub-sub journey" aria-label="Développer : parcours">
      <a href="#/org/${o.id}/developper" ${cur === 'diag' ? 'aria-current="page"' : ''}><span class="j-n">1</span>${d.ic('magnifying-glass', cur === 'diag')}<span><b>Diagnostiquer</b><small>Signaux de l’équipe</small></span></a>
      <a href="#/org/${o.id}/suivi"><span class="j-n">2</span>${d.ic('lightbulb')}<span><b>Comprendre</b><small>Qui a besoin de quoi</small></span></a>
      <a href="#/org/${o.id}/developper/entrainer" ${cur === 'train' ? 'aria-current="page"' : ''}><span class="j-n">3</span>${d.ic('barbell', cur === 'train')}<span><b>Entraîner</b><small>Scénarios, simulations</small></span></a>
      <a href="#/org/${o.id}/equipe"><span class="j-n">4</span>${d.ic('chart-line-up')}<span><b>Mesurer</b><small>Progression de l’équipe</small></span></a>
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
    app.innerHTML = `${head}<header class="pg-h"><div><h1>Mon apprentissage</h1><p>Votre propre progression, séparée des outils de gestion de l’équipe. Cinq façons d’entrer, toutes fondées sur les connaissances validées.</p></div></header>
      <section class="sec">${OrgShell.doorsGrid(o, d)}</section>
      <section class="org-grid">
        <a class="org-card" href="#/org/${o.id}/resultats"><span>${d.ic('chart-line-up')}</span><div><b>Mon parcours</b><p>Mes compétences, mes preuves, la suite.</p></div></a>
        ${window.League ? `<a class="org-card" href="#/org/${o.id}/canopee"><span>${d.ic('tree', true)}</span><div><b>Ma Canopée</b><p>Mon rang, mon arbre, mes trophées.</p></div></a>` : ''}
        <a class="org-card" href="#/"><span>${d.ic('user-circle')}</span><div><b>Mon espace personnel</b><p>Mes cours à moi, les cinq portes d’entrée Student, sur cet appareil.</p></div></a>
      </section>`;
  }

  window.OrgHub = { cockpit, team, knowledge, pipeHead, develop, myLearning, dataState };
})();
