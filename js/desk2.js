/* Arbor Desktop 2 · Intelligence & Governance (espaces des responsables).
   Cinq espaces : Cockpit · Knowledge & Impact · Scenario Studio · Blind Spots · Evidence & Governance.
   Règles :
   - toutes les données viennent de la base (mêmes requêtes et mêmes droits que les écrans existants) ; une donnée
     absente donne un état vide qui le dit, jamais un chiffre fabriqué ;
   - une conclusion n'apparaît qu'avec sa base (nombre d'observations, de personnes) et son niveau de fiabilité ;
   - les moteurs existants (OrgInsight, Evidence, OrgEngines, OrgChanges) font les calculs ; ce module compose. */
(function () {
  let d = null;
  const q = (s) => encodeURIComponent(s);
  const rest = (path, query) => Tutor.rest(path, { method: 'GET', query });
  const rpc = (name, body) => Tutor.rest(`/rest/v1/rpc/${name}`, { body });
  const soft = (p, dflt) => p.catch(() => dflt);
  const plural = (n, one, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
  const fmt = (t) => (t ? new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '');
  const stamp = (t) => (t ? new Date(t).toISOString().slice(0, 16).replace('T', ' ') : '—');
  const nom = (m) => (m && m.email ? m.email.split('@')[0] : 'Personne');
  const lead = (o) => ['admin', 'manager'].includes(o.role);

  /* ---------- Navigation : cinq espaces, plus le contexte d'équipe ---------- */
  const SPACES = [
    ['accueil', 'gauge', 'Mon environnement', 'Mon environnement professionnel : état, risques, actions'],
    ['savoir', 'books', 'Knowledge & Impact', 'Knowledge & Impact Studio : documents, versions, comparaison et impact'],
    ['studio', 'film-script', 'Scenario Studio', 'concevoir et valider des situations'],
    ['angles', 'eye-slash', 'Blind Spots', 'erreurs, confusions, fausses certitudes'],
    ['preuves', 'seal-check', 'Evidence & Mastery', 'preuves de maîtrise, revalidations, audit'],
    ['transmission', 'hand-heart', 'Transmission', 'Transmission & Knowledge Sharing : transmettre une méthode ou un savoir-faire'],
  ];
  function nav() {
    return [[null, SPACES.map(([k, i, l]) => [k, i, l])], ['Organisation', [['equipe', 'users-three', 'Mon équipe'], ['apprendre', 'student', 'Mon apprentissage']]]];
  }
  const HELP = Object.fromEntries(SPACES.map(([k, , , h]) => [k, h]));
  // anciennes adresses → espace qui les contient
  const SECTION = { changements: 'savoir', documents: 'savoir', competences: 'savoir', scenarios: 'studio', developper: 'angles', intelligence: 'angles', suivi: 'equipe', apercu: 'equipe' };

  /* Pastilles d'attention sur la navigation (décisions à prendre, revalidations, fausses certitudes) */
  let badgeCache = null;
  async function badges(o) {
    if (!lead(o)) return;
    const now = Date.now();
    if (!badgeCache || badgeCache.org !== o.id || now - badgeCache.at > 60000) {
      const [items, revals] = await Promise.all([
        soft(rest('/rest/v1/policy_change_items', `?org_id=eq.${q(o.id)}&decision=eq.a_valider&select=id,change`), []),
        soft(rest('/rest/v1/skill_revalidations', `?org_id=eq.${q(o.id)}&status=eq.requires_revalidation&select=id`), []),
      ]);
      badgeCache = { org: o.id, at: now, savoir: (items || []).filter((i) => i.change !== 'inchange').length, preuves: (revals || []).length };
    }
    document.querySelectorAll('.org-tabs a').forEach((a) => {
      const k = (a.getAttribute('href') || '').split('/')[3] || 'accueil';
      const n = badgeCache[k];
      a.querySelector('.nav-attn') && a.querySelector('.nav-attn').remove();
      if (n) a.insertAdjacentHTML('beforeend', `<b class="nav-attn" aria-label="${n} à traiter">${n}</b>`);
    });
  }

  /* ---------- En-tête d'espace ---------- */
  const pageHead = (eyebrow, title, sub, right = '') => `<header class="d2-head"><div><p class="d2-eyebrow">${eyebrow}</p><h1>${title}</h1>${sub ? `<p class="d2-sub">${sub}</p>` : ''}</div>${right ? `<div class="d2-head-r">${right}</div>` : ''}</header>`;
  const skeleton = (n = 6) => `<div class="dbento">${Array.from({ length: n }, (_, i) => `<div class="b-card sk ${i === 0 ? 'b-w7' : i === 1 ? 'b-w5' : 'b-w4'}"><i></i><i></i><i></i></div>`).join('')}</div>`;
  const card = (cls, i, title, body, link) => `<section class="b-card ${cls}" style="--i:${i}"><header class="b-h"><h2>${title}</h2>${link || ''}</header>${body}</section>`;
  const more = (href, l = 'Ouvrir') => `<a class="b-more" href="${href}">${l}${d.ic('arrow-right')}</a>`;
  const empty = (icon, t) => `<p class="b-empty">${d.ic(icon)}<span>${t}</span></p>`;
  const ring = (pct, label) => { const r = 44, c = 2 * Math.PI * r; return `<svg class="b-ring" viewBox="0 0 100 100" role="img" aria-label="${label}"><circle cx="50" cy="50" r="${r}" class="r-bg"/><circle cx="50" cy="50" r="${r}" class="r-fg" style="--c:${c.toFixed(1)};--o:${(c * (1 - pct / 100)).toFixed(1)}"/></svg>`; };

  async function loadAll(o) {
    const [evs, ks, ms, skills, links, su, revals, changes, sources, oos, units] = await Promise.all([
      soft(rest('/rest/v1/evidence_events', `?org_id=eq.${q(o.id)}&select=user_id,knowledge_id,skill_id,activity,outcome,confidence,level,context,session_id,evaluator,source_version_id,at&order=at&limit=5000`), []),
      soft(rest('/rest/v1/knowledge_nodes', `?org_id=eq.${q(o.id)}&select=id,kind,title,page,status,quote,validated_at,created_at,provenance&limit=3000`), []),
      soft(rest('/rest/v1/memberships', `?org_id=eq.${q(o.id)}&status=eq.active&select=user_id,role,email,unit_id`), []),
      soft(rest('/rest/v1/skills', `?org_id=eq.${q(o.id)}&select=*`), []),
      soft(rest('/rest/v1/skill_knowledge', `?org_id=eq.${q(o.id)}&select=skill_id,knowledge_id`), []),
      soft(rest('/rest/v1/skill_units', `?org_id=eq.${q(o.id)}&select=skill_id,unit_id`), []),
      soft(rest('/rest/v1/skill_revalidations', `?org_id=eq.${q(o.id)}&select=*`), []),
      soft(rest('/rest/v1/policy_changes', `?org_id=eq.${q(o.id)}&select=id,source_id,status,summary,created_at&order=created_at.desc&limit=10`), []),
      soft(rest('/rest/v1/sources', `?org_id=eq.${q(o.id)}&select=id,title,current_version`), []),
      soft(rest('/rest/v1/out_of_scope_knowledge', `?org_id=eq.${q(o.id)}&select=id,status,claim,created_at&order=created_at.desc&limit=100`), []),
      soft(rest('/rest/v1/org_units', `?org_id=eq.${q(o.id)}&select=id,kind,name`), []),
    ]);
    return { evs: evs || [], ks: ks || [], ms: ms || [], skills: skills || [], links: links || [], su: su || [], revals: revals || [], changes: changes || [], sources: sources || [], oos: oos || [], units: units || [] };
  }
  const learnersOf = (ms, evs) => ms.filter((m) => m.role === 'member' || evs.some((e) => e.user_id === m.user_id));

  /* Courbe d'activité (réponses par jour, 14 jours) : une ligne de sève qui se dessine */
  function sapline(evs) {
    const days = 14, now = new Date(); now.setHours(0, 0, 0, 0);
    const counts = Array.from({ length: days }, (_, i) => { const t0 = now.getTime() - (days - 1 - i) * 864e5; return evs.filter((e) => { const t = new Date(e.at).getTime(); return t >= t0 && t < t0 + 864e5; }).length; });
    const max = Math.max(1, ...counts), W = 280, H = 64;
    const pts = counts.map((c, i) => [i * (W / (days - 1)), H - 6 - (c / max) * (H - 14)]);
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    return { total: counts.reduce((a, b) => a + b, 0), svg: `<svg class="sap" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Réponses par jour sur 14 jours : ${counts.join(', ')}"><path d="${path} L${W},${H} L0,${H} Z" class="sap-fill"/><path d="${path}" class="sap-line" pathLength="1"/></svg>` };
  }

  /* ---------- A. Cockpit : le radar opérationnel ---------- */
  async function cockpit(app, o, head, deps) {
    d = deps;
    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    app.innerHTML = `${head}<div class="d2">${pageHead(`Cockpit · ${today}`, 'Mon environnement professionnel', `Où en sont les connaissances de ${d.esc(o.name)}, et ce qui demande votre attention.`)}${skeleton()}</div>`;
    const x = await loadAll(o);
    const { evs, ks, ms } = x;
    const learners = learnersOf(ms, evs);
    const pws = learners.map((m) => ({ m, p: OrgInsight.pathway(m.user_id, evs, ks, x.skills, x.links, x.su, m.unit_id, [], { revalidations: x.revals }) }));
    const done = pws.reduce((a, r) => a + r.p.done, 0), total = pws.reduce((a, r) => a + r.p.total, 0);
    const pct = total ? Math.round((done / total) * 100) : 0;
    const kv = ks.filter((k) => k.status === 'valide').length, kp = ks.filter((k) => k.status === 'propose').length, kr = ks.filter((k) => k.status === 'a_revalider').length;
    const radar = OrgInsight.radar(evs, ks, ms);
    const mx = OrgInsight.matrix(evs, ks, {});
    const fc = mx.cells.fausse_certitude;
    const openReval = x.revals.filter((r) => r.status === 'requires_revalidation');
    const srcTitle = (id) => (x.sources.find((s) => s.id === id) || {}).title || 'Document';
    const bySkill = x.skills.map((s) => { const rows = pws.map(({ p }) => p.skills.find((k) => k.skill.id === s.id)).filter(Boolean);
      return { s, total: rows.length, acquired: rows.filter((r) => r.status === 'acquise').length, reval: rows.filter((r) => r.status === 'a_revalider').length, observed: rows.filter((r) => r.level > 0 || r.knowledge.some((k) => k.state)).length }; }).filter((r) => r.total);
    const fragile = bySkill.filter((r) => r.observed && r.acquired < r.total).sort((a, b) => a.acquired / a.total - b.acquired / b.total).slice(0, 5);
    // équipes : personnes à revalider ou sur un angle mort, par équipe (seulement si des équipes existent)
    const teams = x.units.map((u) => { const people = learners.filter((m) => m.unit_id === u.id); const flagged = people.filter((m) => openReval.some((r) => r.user_id === m.user_id)).length; return { u, n: people.length, flagged }; }).filter((t) => t.n).sort((a, b) => b.flagged - a.flagged);
    const act = sapline(evs);
    const acts = [
      ...x.changes.filter((c) => c.status === 'a_valider' || c.status === 'ouvert').map((c) => ({ icon: 'git-diff', t: `Décider des changements de « ${srcTitle(c.source_id)} »`, href: `#/org/${o.id}/savoir/impact/${c.id}`, tone: 'amber' })),
      ...(openReval.length ? [{ icon: 'arrows-clockwise', t: `Suivre ${plural(openReval.length, 'revalidation')} en attente`, href: `#/org/${o.id}/preuves`, tone: 'amber' }] : []),
      ...(fc.n && mx.enough ? [{ icon: 'warning-diamond', t: `Traiter ${plural(fc.n, 'fausse certitude', 'fausses certitudes')}`, href: `#/org/${o.id}/angles`, tone: 'red' }] : []),
      ...(kp ? [{ icon: 'seal-check', t: `Valider ${plural(kp, 'règle proposée', 'règles proposées')}`, href: `#/org/${o.id}/savoir`, tone: '' }] : []),
      ...(x.oos.filter((r) => r.status === 'a_examiner').length ? [{ icon: 'question', t: `Examiner ${plural(x.oos.filter((r) => r.status === 'a_examiner').length, 'affirmation hors référentiel', 'affirmations hors référentiel')}`, href: `#/org/${o.id}/savoir`, tone: '' }] : []),
      ...(ms.length < 2 ? [{ icon: 'user-plus', t: 'Inviter mon équipe', href: `#/org/${o.id}/equipe`, tone: '' }] : []),
    ].slice(0, 5);

    const cards = [
      card('b-w7 b-main', 0, 'État des connaissances', `<div class="hero-row">
          <div class="hero-ring">${ring(pct, `${pct} % des compétences de poste acquises`)}<b class="num">${total ? pct : '—'}<small>${total ? '%' : ''}</small></b></div>
          <div class="hero-txt"><p class="hero-lead">${total ? `<b class="num">${done}</b> compétence${done > 1 ? 's' : ''} de poste acquise${done > 1 ? 's' : ''} sur <b class="num">${total}</b>, toutes personnes confondues.` : 'Aucune compétence de poste encore attribuée.'}</p>
          <dl class="hero-kv"><div><dt>Règles validées</dt><dd class="num">${kv}</dd></div><div><dt>À valider</dt><dd class="num">${kp}</dd></div><div class="${kr ? 'amber' : ''}"><dt>À revalider</dt><dd class="num">${kr}</dd></div><div><dt>Personnes suivies</dt><dd class="num">${learners.length}</dd></div></dl></div></div>`,
        info('Acquise = démontrée selon les règles de preuve d’Arbor (niveau requis, validation au poste pour le sensible). Aucune moyenne : un décompte.')),
      card('b-w5', 1, 'Actions prioritaires', acts.length ? `<ol class="b-acts">${acts.map((a) => `<li><a href="${a.href}" class="t-${a.tone}">${d.ic(a.icon)}<span>${d.esc(a.t)}</span>${d.ic('caret-right')}</a></li>`).join('')}</ol>` : empty('check-circle', 'Rien d’urgent.')),
      card('b-w4', 2, 'Procédures qui ont évolué', x.changes.length ? `<ul class="b-proc">${x.changes.slice(0, 4).map((c) => { const s = c.summary || {}; return `<li><a href="#/org/${o.id}/savoir/impact/${c.id}"><span class="bp-t"><b>${d.esc(srcTitle(c.source_id))}</b><small class="mono">${fmt(c.created_at)}</small></span>
          <span class="bp-c">${s.modifie ? `<i class="amber">${s.modifie} mod.</i>` : ''}${s.nouveau ? `<i class="green">${s.nouveau} nouv.</i>` : ''}${s.supprime ? `<i class="red">${s.supprime} suppr.</i>` : ''}</span></a></li>`; }).join('')}</ul>` : empty('files', 'Aucune nouvelle version de document.'), more(`#/org/${o.id}/savoir/impact`, 'Diff & Impact')),
      card('b-w4 b-alert', 3, 'Fausses certitudes', mx.measured ? `<div class="b-big"><b class="num ${fc.n ? 'red' : ''}">${fc.n}</b><span>${fc.n ? `réponse${fc.n > 1 ? 's' : ''} fausse${fc.n > 1 ? 's' : ''} donnée${fc.n > 1 ? 's' : ''} avec assurance, ${plural(fc.people, 'personne')}` : 'aucune erreur donnée avec assurance'}</span></div>
          ${fc.knowledge.length ? `<p class="b-tags">${fc.knowledge.slice(0, 3).map((k) => `<span>${d.esc(k.title)}</span>`).join('')}</p>` : ''}
          <p class="b-note">${mx.enough ? 'Base suffisante' : `Indicatif : ${plural(mx.measured, 'mesure')}, conclusion à partir de ${mx.minMeasured}`}</p>` : empty('crosshair', 'Pas encore de réponse avec confiance déclarée.'), more(`#/org/${o.id}/angles`, 'Blind Spots')),
      card('b-w4', 4, 'Compétences fragiles', fragile.length ? `<ul class="b-bars">${fragile.map((r) => `<li><span>${d.esc(r.s.name)}</span><i style="--w:${Math.round((r.acquired / r.total) * 100)}%"></i><small class="num">${r.acquired}/${r.total}</small></li>`).join('')}</ul>` : empty('plant', bySkill.length ? 'Aucune compétence fragile observée.' : 'Les compétences apparaîtront dès les premières observations.')),
      card('b-w6', 5, 'Équipes à surveiller', teams.length ? `<ul class="b-teams">${teams.slice(0, 5).map((t) => `<li><b>${d.esc(t.u.name)}</b><span class="num">${plural(t.n, 'personne')}</span>${t.flagged ? `<em class="amber">${plural(t.flagged, 'à revalider', 'à revalider')}</em>` : '<em class="green">à jour</em>'}</li>`).join('')}</ul>` : empty('users-three', 'Aucune équipe définie : les personnes ne sont pas encore rangées par équipe ou établissement.'), more(`#/org/${o.id}/equipe`, 'Mon équipe')),
      card('b-w6', 6, 'Activité', `<div class="b-act"><b class="num">${act.total}</b><span>réponse${act.total > 1 ? 's' : ''} sur 14 jours</span></div>${act.svg}`),
    ];
    app.innerHTML = `${head}<div class="d2">${pageHead(`Cockpit · ${today}`, 'Mon environnement professionnel', `Où en sont les connaissances de ${d.esc(o.name)}, et ce qui demande votre attention.`,
      `<span class="d2-pill">${d.ic('database')} Données réelles · ${plural(evs.length, 'preuve')}</span>`)}
      ${window.OrgOnboarding ? OrgOnboarding.resumeBanner(o, d) : ''}
      <div class="dbento">${cards.join('')}</div></div>`;
    badges(o);
  }
  const info = (t) => `<details class="b-info"><summary aria-label="Comment c’est calculé">${d.ic('info')}</summary><p>${t}</p></details>`;

  /* ---------- B. Knowledge & Impact : en-tête commun, pare-feu sémantique ---------- */
  function kiHead(o, cur, counts = {}, deps) {
    if (deps) d = deps;
    return `${pageHead('Knowledge & Impact', cur === 'impact' ? 'Diff & Impact Studio' : 'Bibliothèque de procédures', cur === 'impact' ? 'Ce qui a changé entre deux versions, et jusqu’où cela se propage : règles, compétences, équipes, personnes.' : 'Les documents de référence et les règles qui en sont extraites, chacune avec sa page et son extrait exact.')}
      <nav class="d2-seg" aria-label="Knowledge & Impact">
        <a href="#/org/${o.id}/savoir" ${cur === 'lib' ? 'aria-current="page"' : ''}>${d.ic('books')}Bibliothèque</a>
        <a href="#/org/${o.id}/savoir/impact" ${cur === 'impact' ? 'aria-current="page"' : ''}>${d.ic('git-diff')}Diff & Impact${counts.pending ? ` <b class="nav-attn">${counts.pending}</b>` : ''}</a>
        <a href="#/org/${o.id}/competences" ${cur === 'skills' ? 'aria-current="page"' : ''}>${d.ic('target')}Compétences</a>
      </nav>
      <div class="firewall" role="note"><span class="fw-a">${d.ic('shield-check', true)}<b>Socle souverain</b> documents internes approuvés : seules références des évaluations et des preuves</span><span class="fw-b">${d.ic('lightbulb')}<b>Éclairage pédagogique</b> explications, analogies, sources externes : jamais une règle interne sans validation</span></div>`;
  }

  /* ---------- C. Scenario Studio ---------- */
  const TENSION = [
    ['1', 'Standard', 'Une situation courante, une difficulté à la fois.'],
    ['2', 'Sous pression', 'Client exigeant, temps compté, objections qui s’enchaînent.'],
    ['3', 'Cas limite', 'Deux règles validées entrent en tension : il faut prioriser ou escalader. Aucune règle inventée.'],
  ];
  async function studio(app, o, head, deps) {
    d = deps;
    const hd = `${head}<div class="d2">${pageHead('Scenario Studio', 'Laboratoire de situations', 'Partir d’une procédure ou d’une compétence et obtenir une mise en situation fondée sur les règles validées. Vous la relisez, la testez, puis la publiez.')}
      <ol class="d2-flow" aria-label="Structure d’une situation">${['Situation', 'Compréhension', 'Explication', 'Pratique', 'Vérification', 'Maîtrise'].map((s, i) => `<li style="--i:${i}"><span>${i + 1}</span>${s}</li>`).join('')}</ol></div>`;
    await OrgEngines.scenariosView(app, o, hd, d);
    const form = app.querySelector('#scForm');
    if (!form) return;
    const skills = await soft(rest('/rest/v1/skills', `?org_id=eq.${q(o.id)}&select=id,name`), []);
    form.querySelector('.obz-two').insertAdjacentHTML('afterend', `
      ${skills.length ? `<div class="field"><label for="scSkill">Compétence visée <span class="optional">facultatif</span></label><select id="scSkill"><option value="">Toutes les règles validées</option>${skills.map((s) => `<option value="${d.esc(s.name)}">${d.esc(s.name)}</option>`).join('')}</select></div>` : ''}
      <fieldset class="tension"><legend>Tension de la situation</legend>${TENSION.map(([v, l, h], i) => `<label class="tn${i === 0 ? ' on' : ''}"><input type="radio" name="tension" value="${v}" ${i === 0 ? 'checked' : ''}/><b>${l}</b><small>${h}</small></label>`).join('')}</fieldset>
      <p class="hint">${d.ic('shield-check')} Tout fait (produit, règle, chiffre) vient des connaissances validées ; la tension change la situation, jamais les règles.</p>`);
    form.querySelectorAll('.tension input').forEach((r) => r.addEventListener('change', () => form.querySelectorAll('.tn').forEach((l) => l.classList.toggle('on', l.querySelector('input').checked))));
    // OrgEngines lit la tension et la compétence dans ce formulaire et les envoie au serveur (scenario_concevoir)
  }

  /* ---------- D. Blind Spots : certitude × réalité ---------- */
  async function blindspots(app, o, head, deps) {
    d = deps;
    app.innerHTML = `${head}<div class="d2">${pageHead('Blind Spots', 'Certitude et réalité', 'L’écart entre ce que chacun croit maîtriser et ce qu’il démontre. La confiance est celle déclarée en répondant, jamais déduite.')}${skeleton(3)}</div>`;
    const x = await loadAll(o);
    const mx = OrgInsight.matrix(x.evs, x.ks, {});
    const kById = new Map(x.ks.map((k) => [k.id, k]));
    // fausses certitudes par connaissance : combien de personnes, combien d'occurrences, fiabilité
    const fcEv = x.evs.filter((e) => e.knowledge_id && e.outcome === 'faux' && ['sait', 'reflexe'].includes(e.confidence));
    const byK = new Map();
    fcEv.forEach((e) => { const r = byK.get(e.knowledge_id) || { k: kById.get(e.knowledge_id) || { id: e.knowledge_id, title: 'Connaissance' }, n: 0, people: new Set(), last: null }; r.n++; r.people.add(e.user_id); r.last = !r.last || e.at > r.last ? e.at : r.last; byK.set(e.knowledge_id, r); });
    const rows = [...byK.values()].map((r) => ({ ...r, people: r.people.size, fiable: r.people.size >= 2 || r.n >= 3 })).sort((a, b) => b.people - a.people || b.n - a.n);
    const Qc = (key, cls, i) => { const c = mx.cells[key]; return `<div class="q ${cls}" style="--i:${i}"><b class="num">${c.n}</b><span>${c.label}</span><small>${c.why}</small>${c.knowledge.length ? `<p class="q-k">${c.knowledge.slice(0, 3).map((k) => d.esc(k.title)).join(' · ')}</p>` : ''}</div>`; };
    app.innerHTML = `${head}<div class="d2">${pageHead('Blind Spots', 'Certitude et réalité', 'L’écart entre ce que chacun croit maîtriser et ce qu’il démontre. La confiance est celle déclarée en répondant, jamais déduite.',
      `<span class="d2-pill ${mx.enough ? '' : 'amber'}">${d.ic(mx.enough ? 'check' : 'info')} ${mx.enough ? `Base suffisante · ${plural(mx.measured, 'mesure')}` : `Indicatif · ${plural(mx.measured, 'mesure')} sur ${mx.minMeasured} requises`}</span>`)}
      <div class="dbento">
        <section class="b-card b-w7" style="--i:0"><header class="b-h"><h2>Matrice certitude × réalité</h2></header>
          ${mx.measured ? `<div class="quad" role="table" aria-label="Matrice certitude et réalité"><span class="qax qax-y">Maîtrise démontrée</span><span class="qax qax-x">Confiance déclarée →</span>
            ${Qc('sous_estimee', 'q-under', 0)}${Qc('solide', 'q-solid', 1)}${Qc('lacune_reconnue', 'q-gap', 2)}${Qc('fausse_certitude', 'q-false', 3)}</div>
            <p class="b-note">Dernière réponse de chaque personne sur chaque règle. ${mx.unmeasured ? `${plural(mx.unmeasured, 'réponse')} sans confiance déclarée : aucune conclusion.` : ''}</p>` : empty('crosshair', 'Aucune réponse avec confiance déclarée pour l’instant. Le diagnostic demande la confiance à chaque question.')}</section>
        <section class="b-card b-w5 b-alert" style="--i:1"><header class="b-h"><h2>Fausses certitudes à traiter</h2></header>
          ${rows.length ? `<ul class="bs-list">${rows.map((r) => `<li><div><b>${d.esc(r.k.title)}</b><small>${plural(r.n, 'erreur sûre d’elle', 'erreurs sûres d’elles')} · ${plural(r.people, 'personne')} · dernière le <span class="mono">${fmt(r.last)}</span></small></div>
              <span class="rel ${r.fiable ? 'ok' : 'low'}">${r.fiable ? 'Récurrente' : 'Isolée, à confirmer'}</span>
              ${lead(o) ? `<button type="button" class="btn sm" data-remed="${r.k.id}" data-n="${d.esc(r.k.title)}">${d.ic('first-aid')}Remédier</button>` : ''}</li>`).join('')}</ul>
            <p class="b-note">Une seule erreur ne fait pas une fausse certitude établie : « isolée » tant qu’elle n’est vue ni chez 2 personnes ni 3 fois.</p>` : empty('check-circle', 'Aucune erreur donnée avec assurance.')}</section>
        <section class="b-card b-w12" style="--i:2"><header class="b-h"><h2>Confusions et erreurs récurrentes</h2></header>
          ${(OrgInsight.radar(x.evs, x.ks, x.ms).blind || []).length ? `<ul class="b-bars wide">${OrgInsight.radar(x.evs, x.ks, x.ms).blind.slice(0, 6).map((r) => `<li><span>${d.esc(r.knowledge.title)}</span><i style="--w:${Math.min(100, Math.round((r.people / Math.max(1, x.ms.length)) * 100))}%"></i><small>${plural(r.people, 'personne')}</small></li>`).join('')}</ul>` : empty('plant', 'Aucun angle mort établi (au moins 3 observations sur 2 personnes).')}</section>
      </div></div>`;
    app.querySelectorAll('[data-remed]').forEach((b) => { b.onclick = async () => {
      const users = [...new Set(fcEv.filter((e) => e.knowledge_id === b.dataset.remed).map((e) => e.user_id))];
      b.disabled = true;
      try { const n = await rpc('assign_learning_actions', { p_org: o.id, p_users: users, p_kind: 'simulation', p_reason: `Fausse certitude sur « ${b.dataset.n} » : mise en situation ciblée.`, p_knowledge: [b.dataset.remed] });
        d.toast(`Remédiation demandée à ${plural(Number(n) || users.length, 'personne')}`, 'success'); }
      catch (e) { d.toast(e.message, 'error'); b.disabled = false; }
    }; });
    badges(o);
  }

  /* ---------- E. Evidence & Governance : le dossier de preuves ---------- */
  const ACT = { diagnostic: 'Diagnostic', simulation: 'Simulation', rappel: 'Rappel', lecon: 'Leçon', dialogue: 'Dialogue', validation_humaine: 'Validation au poste', revalidation: 'Revalidation' };
  const OUT = { juste: ['Juste', 'green'], partiel: ['Partiel', 'amber'], faux: ['Incorrect', 'red'], insuffisant: ['Insuffisant', 'amber'], non_documente: ['Non documenté', 'grey'] };
  const EVAL = { regle: 'Règle', ia: 'IA', humain: 'Humain' };
  async function evidence(app, o, head, deps, sub) {
    d = deps;
    app.innerHTML = `${head}<div class="d2">${pageHead('Evidence & Mastery', 'Dossier de preuves', 'Chaque preuve avec sa règle, la version applicable, son contexte, son résultat et qui l’a évaluée. Les preuves ne se modifient jamais.')}${skeleton(2)}</div>`;
    const x = await loadAll(o);
    const kById = new Map(x.ks.map((k) => [k.id, k])), sk = new Map(x.skills.map((s) => [s.id, s])), mOf = (u) => x.ms.find((m) => m.user_id === u);
    const f = { who: '', out: '', days: '30' };
    const rows = () => [...x.evs].reverse().filter((e) => (!f.who || e.user_id === f.who) && (!f.out || e.outcome === f.out) && (!f.days || Date.now() - new Date(e.at) < Number(f.days) * 864e5));
    const lvl = (e) => (window.Evidence ? Evidence.levelOfEvent(e) : 0);
    const row = (e) => { const k = kById.get(e.knowledge_id) || {}, [ol, ot] = OUT[e.outcome] || [e.outcome, '']; const L = lvl(e);
      return `<tr><td class="mono">${stamp(e.at)}</td><td>${d.esc(nom(mOf(e.user_id)))}</td><td><b>${d.esc(k.title || (sk.get(e.skill_id) || {}).name || '—')}</b>${k.kind === 'sensible' ? ' <span class="tag red">sensible</span>' : ''}</td>
        <td>${ACT[e.activity] || d.esc(e.activity)}${e.context && /:/.test(e.context) ? ` <small>${d.esc(e.context.split(':')[1])}</small>` : ''}</td><td><span class="tag ${ot}">${ol}</span></td>
        <td>${L ? `<span class="lv">${L}</span> ${window.Evidence ? Evidence.label(L) : ''}` : '<small>—</small>'}</td><td class="mono">${e.source_version_id ? String(e.source_version_id).slice(0, 8) : '—'}</td><td>${EVAL[e.evaluator] || '—'}</td></tr>`; };
    const csv = () => {
      const H = ['date', 'personne', 'regle', 'competence', 'activite', 'contexte', 'resultat', 'niveau', 'confiance_declaree', 'version_source', 'evaluateur'];
      const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
      const lines = rows().map((e) => [e.at, nom(mOf(e.user_id)), (kById.get(e.knowledge_id) || {}).title, (sk.get(e.skill_id) || {}).name, e.activity, e.context, e.outcome, lvl(e) || '', e.confidence, e.source_version_id, e.evaluator].map(esc).join(','));
      const blob = new Blob([`﻿${H.join(',')}\n${lines.join('\n')}\n`], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `arbor-preuves-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
    const revRows = x.revals.slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const paint = () => {
      const list = rows();
      app.innerHTML = `${head}<div class="d2">${pageHead('Evidence & Mastery', 'Dossier de preuves', 'Chaque preuve avec sa règle, la version applicable, son contexte, son résultat et qui l’a évaluée. Les preuves ne se modifient jamais.',
        `<button type="button" class="btn ghost" id="evCsv">${d.ic('download-simple')}Exporter (CSV)</button>`)}
        <div class="privacy" role="note">${d.ic('lock-simple', true)}<span>Réservé aux managers et administrateurs de ${d.esc(o.name)}. Chaque collaborateur voit ses propres preuves. Une preuve sert à savoir quoi revoir, pas à surveiller.</span></div>
        <div class="dbento">
          <section class="b-card b-w12" style="--i:0"><header class="b-h"><h2>Preuves <small class="num">${list.length}</small></h2>
            <div class="ev-filters"><select id="evWho" aria-label="Personne"><option value="">Toutes les personnes</option>${x.ms.map((m) => `<option value="${m.user_id}" ${f.who === m.user_id ? 'selected' : ''}>${d.esc(nom(m))}</option>`).join('')}</select>
              <select id="evOut" aria-label="Résultat"><option value="">Tous les résultats</option>${Object.entries(OUT).map(([k, [l]]) => `<option value="${k}" ${f.out === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
              <select id="evDays" aria-label="Période"><option value="7" ${f.days === '7' ? 'selected' : ''}>7 jours</option><option value="30" ${f.days === '30' ? 'selected' : ''}>30 jours</option><option value="365" ${f.days === '365' ? 'selected' : ''}>12 mois</option><option value="" ${!f.days ? 'selected' : ''}>Tout</option></select></div></header>
            ${list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Personne</th><th>Règle ou compétence</th><th>Activité</th><th>Résultat</th><th>Niveau de preuve</th><th>Version</th><th>Évaluateur</th></tr></thead><tbody>${list.slice(0, 200).map(row).join('')}</tbody></table></div>${list.length > 200 ? `<p class="b-note">200 premières lignes affichées ; l’export contient les ${list.length}.</p>` : ''}` : empty('seal-check', 'Aucune preuve sur cette période.')}</section>
          <section class="b-card b-w12" style="--i:1"><header class="b-h"><h2>Revalidations <small class="num">${revRows.length}</small></h2></header>
            ${revRows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Demandée</th><th>Personne</th><th>Compétence</th><th>Motif</th><th>État</th><th>Clôturée</th></tr></thead><tbody>${revRows.map((r) => `<tr><td class="mono">${stamp(r.created_at)}</td><td>${d.esc(nom(mOf(r.user_id)))}</td><td>${d.esc((sk.get(r.skill_id) || {}).name || '—')}</td><td>${d.esc(r.reason)}</td>
              <td><span class="tag ${r.status === 'revalidee' ? 'green' : r.status === 'annulee' ? 'grey' : 'amber'}">${r.status === 'revalidee' ? 'Revalidée' : r.status === 'annulee' ? 'Annulée' : 'À revalider'}</span></td><td class="mono">${r.resolved_at ? stamp(r.resolved_at) : '—'}</td></tr>`).join('')}</tbody></table></div>` : empty('arrows-clockwise', 'Aucune revalidation demandée.')}</section>
        </div></div>`;
      app.querySelector('#evCsv').onclick = csv;
      [['#evWho', 'who'], ['#evOut', 'out'], ['#evDays', 'days']].forEach(([s, k]) => { app.querySelector(s).onchange = (e) => { f[k] = e.target.value; paint(); }; });
      badges(o);
    };
    paint();
  }

  /* ---------- F. Transmission & Knowledge Sharing (migration 012) ----------
     Tout membre transmet une méthode (situation, étapes, pièges, astuces) : elle est « soumise ». Un responsable
     (admin, manager, experte ou expert) la relit et la valide ou la rejette avec une note ; l'auteur ne valide jamais
     la sienne. Une transmission validée devient un savoir-faire partagé, distinct des règles des documents : rien
     n'entre seul dans le référentiel officiel. Sans la migration 012, l'écran le dit et ne garde rien. */
  const ST_TR = { soumise: ['À relire', 'amber'], validee: ['Validée', 'green'], rejetee: ['Rejetée', 'grey'] };
  const lines = (v) => String(v || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 20);
  async function transmission(app, o, head, deps) {
    d = deps;
    const reviewer = ['admin', 'manager', 'expert'].includes(o.role), me = window.Tutor && Tutor.userId();
    app.innerHTML = `${head}<div class="d2">${pageHead('Transmission & Knowledge Sharing', 'Transmettre un savoir-faire', 'Une méthode, un geste, une expérience de terrain : décrivez-la comme à un nouveau collègue. Elle est relue par un responsable avant d’être partagée.')}${skeleton(2)}</div>`;
    let list = null, ms = [];
    try { [list, ms] = await Promise.all([rest('/rest/v1/transmissions', `?org_id=eq.${q(o.id)}&select=*&order=created_at.desc&limit=100`), soft(rest('/rest/v1/memberships', `?org_id=eq.${q(o.id)}&select=user_id,email`), [])]); }
    catch (e) { list = /schema cache|PGRST20[25]|404/.test(String(e && e.message)) ? null : []; }
    const who = (u) => nom(ms.find((m) => m.user_id === u)) || 'Membre';
    const card = (t, i) => { const [l, c] = ST_TR[t.status] || ['', '']; return `<article class="tr-card" style="--i:${i}" data-tr="${t.id}">
        <header><b>${d.esc(t.title)}</b><span class="tag ${c}">${l}</span></header>
        <p class="tr-meta">${d.esc(who(t.author))} · <span class="mono">${fmt(t.created_at)}</span>${t.reviewed_at ? ` · relue par ${d.esc(who(t.reviewed_by))} le <span class="mono">${fmt(t.reviewed_at)}</span>` : ''}</p>
        <div class="tm-prev"><div><h3>Situation</h3><p>${d.esc(t.situation)}</p></div><div><h3>Étapes</h3><ol>${(t.steps || []).map((x) => `<li>${d.esc(x)}</li>`).join('')}</ol></div>
          ${(t.pitfalls || []).length ? `<div><h3>Pièges</h3><ul>${t.pitfalls.map((x) => `<li>${d.esc(x)}</li>`).join('')}</ul></div>` : ''}${(t.tips || []).length ? `<div><h3>Astuces</h3><ul>${t.tips.map((x) => `<li>${d.esc(x)}</li>`).join('')}</ul></div>` : ''}</div>
        ${t.review_note ? `<p class="b-note">Note de relecture : ${d.esc(t.review_note)}</p>` : ''}
        ${reviewer && t.status === 'soumise' && t.author !== me ? `<div class="tr-review"><input class="input" placeholder="Note (obligatoire pour un rejet)" data-note="${t.id}" /><button type="button" class="btn sm" data-dec="validee" data-id="${t.id}">${d.ic('check')}Valider</button><button type="button" class="btn ghost sm" data-dec="rejetee" data-id="${t.id}">${d.ic('x')}Rejeter</button></div>` : ''}
        ${reviewer && t.status === 'soumise' && t.author === me ? '<p class="b-note">Votre transmission sera relue par une autre personne.</p>' : ''}
      </article>`; };
    const aRelire = (list || []).filter((t) => t.status === 'soumise' && reviewer && t.author !== me);
    const partages = (list || []).filter((t) => t.status === 'validee');
    const miennes = (list || []).filter((t) => t.author === me && t.status !== 'validee');
    app.innerHTML = `${head}<div class="d2">${pageHead('Transmission & Knowledge Sharing', 'Transmettre un savoir-faire', 'Une méthode, un geste, une expérience de terrain : décrivez-la comme à un nouveau collègue. Elle est relue par un responsable avant d’être partagée.',
      reviewer && aRelire.length ? `<span class="d2-pill amber">${d.ic('hourglass')} ${plural(aRelire.length, 'transmission')} à relire</span>` : '')}
      ${list === null ? `<div class="privacy" role="note">${d.ic('info', true)}<span>La transmission demande la migration 012 sur la base de l’organisation. Rien n’est enregistré tant qu’elle n’est pas appliquée.</span></div>` : ''}
      <div class="dbento">
        <section class="b-card b-w6" style="--i:0"><header class="b-h"><h2>Nouvelle transmission</h2></header>
          <form id="tmForm" class="tm-form">
            <label>Titre<input class="input" name="titre" required minlength="3" maxlength="160" placeholder="Conseiller un client sur la taille d’un vélo" /></label>
            <label>Dans quelle situation cela sert-il ?<textarea class="input" name="situation" rows="2" required minlength="10" placeholder="Un client hésite entre deux tailles…"></textarea></label>
            <label>Les étapes, une par ligne<textarea class="input" name="etapes" rows="4" required></textarea></label>
            <label>Les pièges à éviter, un par ligne<textarea class="input" name="pieges" rows="2"></textarea></label>
            <label>Astuces d’expert, une par ligne<textarea class="input" name="astuces" rows="2"></textarea></label>
            <div class="row-btns"><button class="btn" ${list === null ? 'disabled' : ''}>${d.ic('paper-plane-tilt')}Soumettre pour relecture</button></div>
            <p class="b-note">${d.ic('shield-check')} Une transmission validée devient un savoir-faire partagé, distinct des règles officielles des documents.</p>
          </form></section>
        <section class="b-card b-w6" style="--i:1"><header class="b-h"><h2>${reviewer ? 'À relire' : 'Mes transmissions'} <small class="num">${reviewer ? aRelire.length : miennes.length}</small></h2></header>
          ${(reviewer ? aRelire : miennes).length ? (reviewer ? aRelire : miennes).map(card).join('') : empty('hand-heart', reviewer ? 'Rien à relire.' : 'Aucune transmission en cours.')}</section>
        <section class="b-card b-w12" style="--i:2"><header class="b-h"><h2>Savoir-faire partagés <small class="num">${partages.length}</small></h2></header>
          ${partages.length ? partages.map(card).join('') : empty('tree-evergreen', 'Aucun savoir-faire validé pour l’instant.')}</section>
      </div></div>`;
    app.querySelector('#tmForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target.elements, et = lines(f.etapes.value);
      if (et.length < 2) { d.toast('Décrivez au moins deux étapes.', 'error'); return; }
      try { await rpc('submit_transmission', { p_org: o.id, p_title: f.titre.value.trim(), p_situation: f.situation.value.trim(), p_steps: et, p_pitfalls: lines(f.pieges.value), p_tips: lines(f.astuces.value) });
        d.toast('Transmission soumise : elle sera relue avant d’être partagée.', 'success'); transmission(app, o, head, d); }
      catch (x) { d.toast(x.message, 'error'); }
    };
    app.querySelectorAll('[data-dec]').forEach((b) => { b.onclick = async () => {
      const note = (app.querySelector(`[data-note="${b.dataset.id}"]`) || {}).value || '';
      if (b.dataset.dec === 'rejetee' && !note.trim()) { d.toast('Expliquez le rejet dans la note.', 'error'); return; }
      b.disabled = true;
      try { await rpc('review_transmission', { p_id: b.dataset.id, p_decision: b.dataset.dec, p_note: note.trim() || null }); d.toast(b.dataset.dec === 'validee' ? 'Transmission validée et partagée' : 'Transmission rejetée', 'success'); transmission(app, o, head, d); }
      catch (x) { d.toast(x.message, 'error'); b.disabled = false; }
    }; });
  }

  window.Desk2 = { transmission, nav, HELP, SECTION, SPACES, badges, cockpit, kiHead, studio, blindspots, evidence, _reset: () => { badgeCache = null; } };
})();
