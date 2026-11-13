/* Espace professionnel (Arbor Business) : choisir son espace, créer ou rejoindre une organisation, gérer l'équipe.
   Séparation des données (docs/architecture.md, D1) :
   - l'espace personnel reste sur l'appareil ; ce module ne lit JAMAIS l'état personnel (cours, révisions, preuves) ;
   - tout ce qui concerne une organisation passe par la base, avec le jeton de la personne connectée ;
     ce qu'elle voit est décidé par les règles d'accès de la base (RLS), pas par ce code.
   Ici, on ne garde en local que la liste de ses espaces (nom, rôle) et l'espace choisi, pour l'affichage. */
(function () {
  const K_ORGS = 'arbor:orgs', K_SPACE = 'arbor:space', K_PENDING = 'arbor:pending-invite';
  const ROLES = { admin: 'Administrateur', manager: 'Manager', expert: 'Expert métier', member: 'Collaborateur' };
  const SECTORS = ['Commerce et distribution', 'Santé', 'Industrie', 'Services', 'Hôtellerie et restauration', 'Éducation et formation', 'Informatique', 'Autre'];
  const get = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const put = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } };

  const list = () => get(K_ORGS, []);
  const space = () => get(K_SPACE, 'personal');
  const setSpace = (id) => put(K_SPACE, id || 'personal');
  const orgOf = (id) => list().find((o) => o.id === id) || null;
  const can = (o, ...roles) => !!o && roles.includes(o.role);

  async function refresh() {
    if (!window.Tutor || !Tutor.signedIn()) return list();
    const rows = await Tutor.rest('/rest/v1/rpc/my_organizations', { body: {} });
    const orgs = (Array.isArray(rows) ? rows : []).map((r) => ({ id: r.id, name: r.name, sector: r.sector || '', role: r.role, owner: !!r.owner, unit: r.unit || '', onboarded: r.onboarded !== false, setup: r.setup || {} }));
    put(K_ORGS, orgs);
    if (space() !== 'personal' && !orgs.some((o) => o.id === space())) setSpace('personal');
    return orgs;
  }
  async function create(name, sector) {
    const id = await Tutor.rest('/rest/v1/rpc/create_organization', { body: { p_name: name, p_sector: sector || null } });
    await refresh();
    return id;
  }
  async function invite(orgId, email, role) {
    return Tutor.rest('/rest/v1/rpc/create_invitation', { body: { p_org: orgId, p_email: email, p_role: role } });
  }
  async function accept(token) {
    const id = await Tutor.rest('/rest/v1/rpc/accept_invitation', { body: { p_token: token } });
    put(K_PENDING, null);
    await refresh();
    return id;
  }
  const members = (orgId) => Tutor.rest('/rest/v1/memberships', { method: 'GET', query: `?org_id=eq.${encodeURIComponent(orgId)}&select=*&order=created_at` });
  const invitations = (orgId) => Tutor.rest('/rest/v1/invitations', { method: 'GET', query: `?org_id=eq.${encodeURIComponent(orgId)}&accepted_at=is.null&select=id,email,role,expires_at&order=created_at` });
  const revoke = (id) => Tutor.rest('/rest/v1/rpc/revoke_invitation', { body: { p_id: id } });
  const inviteLink = (token) => `${location.origin}${location.pathname}#/rejoindre/${token}`;
  // Un lien d'invitation collé, ou le code seul (48 caractères hexadécimaux)
  const tokenFrom = (txt) => { const m = String(txt || '').match(/([0-9a-f]{48})/i); return m ? m[1].toLowerCase() : ''; };

  /* ---------- Écrans ---------- */
  let d = null; // outils de l'app : esc, ic, openModal, closeModal, toast, go
  let current = null; // organisation affichée (pour le formulaire de retour)
  // En-tête commun d'un espace professionnel : nom, rôle, onglets selon le rôle
  // Navigation de l'espace selon le rôle (docs/experience-architecture.md, D12). Masquer un lien n'est pas une protection :
  // chaque écran et chaque action restent vérifiés par la base (RLS) et par le serveur.
  // Sur ordinateur, ce même en-tête devient une barre latérale (CSS) ; sur téléphone, des onglets défilants.
  function navOf(o) {
    const lead = can(o, 'admin', 'manager'), content = can(o, 'admin', 'manager', 'expert');
    const shell = !!window.OrgShell;
    const g = [];
    g.push(['Pilotage', [['accueil', 'squares-four', 'Vue d’ensemble'],
      ...(lead && window.OrgLearn ? [['suivi', 'users-three', 'Équipe']] : []),
      ...(lead && shell ? [['intelligence', 'brain', 'Intelligence']] : [])]]);
    if (content) g.push(['Contenu', [...(window.OrgDocs ? [['documents', 'files', 'Documents']] : []),
      ...(lead && window.OrgLearn ? [['competences', 'target', 'Compétences']] : []),
      ...(lead && window.OrgEngines ? [['scenarios', 'film-script', 'Scénarios']] : [])]]);
    g.push(['Apprendre', [...(shell ? [['apprendre', 'plant', 'Apprendre']] : []), ...(window.OrgLearn ? [['resultats', 'chart-line-up', 'Mon parcours']] : [])]]);
    if (lead) g.push(['Administration', [['equipe', 'user-gear', 'Membres et accès'],
      ...(window.OrgSandbox ? [['apercu', 'eye', 'Aperçu collaborateur']] : []),
      ...(o.role === 'admin' && shell ? [['parametres', 'gear-six', 'Paramètres']] : [])]]);
    return g.filter(([, items]) => items.length);
  }
  function head(o, tab) {
    const groups = navOf(o);
    return `<header class="org-head glass">
        <div class="org-id"><span class="org-badge" aria-hidden="true">${d.ic('buildings', true)}</span><div><h1>${d.esc(o.name)}</h1><p>${d.esc(o.sector || 'Espace professionnel')} · <b>${ROLES[o.role] || o.role}</b></p></div></div>
        <nav class="org-tabs" aria-label="Espace ${d.esc(o.name)}">${groups.map(([gl, items]) => `<span class="org-nav-g" aria-hidden="true">${gl}</span>${items.map(([k, icn, l]) => `<a href="#/org/${o.id}${k === 'accueil' ? '' : '/' + k}" ${tab === k ? 'aria-current="page"' : ''}>${d.ic(icn, tab === k)}<span>${l}</span></a>`).join('')}`).join('')}</nav>
        <div class="org-side-foot">${window.Feedback ? `<button type="button" class="link-btn fb-link" data-org-feedback>${d.ic('chat-teardrop-text')}Donner mon avis</button>` : ''}<button type="button" class="link-btn" data-org-space>${d.ic('swap')}Changer d’espace</button><small>${d.ic('lock-simple')}Ton espace personnel reste sur ton appareil.</small></div>
      </header>`;
  }

  // Ce qui existe déjà et ce qui arrive : on ne montre pas de faux tableau de bord
  function homeView(o) {
    const lead = can(o, 'admin', 'manager');
    const card = (tab, icn, t, txt) => (window.OrgLearn ? `<a class="org-card" href="#/org/${o.id}/${tab}"><span>${d.ic(icn)}</span><div><b>${t}</b><p>${txt}</p></div></a>` : '');
    const soon = (icn, t, txt) => `<div class="org-card soon"><span>${d.ic(icn)}</span><div><b>${t}</b><p>${txt}</p><small>Bientôt</small></div></div>`;
    return `${head(o, 'accueil')}
      ${window.OrgOnboarding ? OrgOnboarding.resumeBanner(o, d) : ''}
      <section class="org-grid">
        ${lead ? `<a class="org-card" href="#/org/${o.id}/equipe"><span>${d.ic('users-three')}</span><div><b>Équipe et invitations</b><p>Invite tes collaborateurs, attribue leur rôle et leur équipe.</p></div></a>` : ''}
        ${o.role === 'admin' && window.OrgOnboarding ? `<a class="org-card" href="#/org/${o.id}/configurer/${(o.setup && o.setup.step && !o.setup.done) ? o.setup.step : 'infos'}"><span>${d.ic('sliders-horizontal')}</span><div><b>Configuration</b><p>Informations, objectifs, équipes et établissements, en quelques étapes reprenables.</p></div></a>` : ''}
        ${can(o, 'admin', 'manager', 'expert') ? `<a class="org-card" href="#/org/${o.id}/documents"><span>${d.ic('files')}</span><div><b>Documents de référence</b><p>Fiches produits, procédures : Arbor en extrait les connaissances, avec la page et l’extrait exact. Tu les valides avant tout usage.</p></div></a>` : ''}
        ${lead ? card('suivi', 'chart-bar', 'Suivi de l’équipe', 'Les 3 fragilités prioritaires, calculées à partir de preuves réelles, avec la taille de l’échantillon ; chaque personne et sa prochaine activité.') : ''}
        ${card('diagnostic', 'target', 'Mon diagnostic', 'Quelques questions sur les connaissances validées. Pas de note : tu sais quoi travailler.')}
        ${card('mystere', 'storefront', 'Client mystère', 'Un client simulé, une conversation libre, un débrief sur des comportements observables et l’exactitude de tes informations.')}
        ${card('resultats', 'chart-line-up', 'Mes résultats', 'L’état de chaque connaissance d’après tes preuves, et ta prochaine activité.')}
        ${lead ? card('competences', 'list-checks', 'Compétences', 'Le référentiel de l’équipe, proposé à partir des connaissances validées.') : ''}
      </section>
      <p class="org-note">${d.ic('lock-simple')}Ton espace personnel (cours, révisions, progression) reste sur ton appareil. ${lead ? 'Tu ne vois que ce qui concerne cette organisation.' : 'Ton organisation n’y a pas accès.'}</p>`;
  }

  async function teamView(app, o) {
    app.innerHTML = `${head(o, 'equipe')}<section class="sec"><p class="hint">Chargement de l’équipe…</p></section>`;
    let ms = [], us = [];
    try { ms = await members(o.id); } catch (e) { app.querySelector('.sec').innerHTML = `<p class="hint">${d.esc(e.message)}</p>`; return; }
    try { us = await Tutor.rest('/rest/v1/org_units', { method: 'GET', query: `?org_id=eq.${encodeURIComponent(o.id)}&select=id,kind,name&order=kind,name` }); } catch (e) { us = []; }
    const canMove = (m) => us.length && (o.role === 'admin' || m.role !== 'admin');
    app.innerHTML = `${head(o, 'equipe')}
      <section class="sec"><h2>Inviter une personne</h2><div id="teamInvite"></div></section>
      <section class="sec">
        <h2>Membres <small class="num">${ms.length}</small></h2>
        <ul class="org-list">${ms.map((m) => `<li><span>${d.esc(m.email || 'Membre')}<small> · ${ROLES[m.role] || m.role}${m.status === 'suspended' ? ' · suspendu' : ''}</small></span>${canMove(m) ? `<select aria-label="Équipe de ${d.esc(m.email || 'ce membre')}" data-unit="${m.user_id}"><option value="">Sans équipe</option>${us.map((u) => `<option value="${u.id}" ${m.unit_id === u.id ? 'selected' : ''}>${d.esc(u.name)}</option>`).join('')}</select>` : ''}</li>`).join('')}</ul>
        ${o.role === 'admin' && !us.length && window.OrgOnboarding ? `<p class="hint">Pour ranger les membres par équipe ou établissement : <a href="#/org/${o.id}/configurer/structure">créer des équipes</a>.</p>` : ''}
      </section>`;
    if (window.OrgOnboarding) OrgOnboarding.inviteBox(app.querySelector('#teamInvite'), o);
    if (window.OrgEngines) { const rb = document.createElement('div'); app.appendChild(rb); OrgEngines.retention(rb, o, d); }
    app.querySelectorAll('[data-unit]').forEach((sel) => { sel.onchange = async () => {
      try { await Tutor.rest('/rest/v1/rpc/set_member_unit', { body: { p_org: o.id, p_user: sel.dataset.unit, p_unit: sel.value || null } }); d.toast('Équipe mise à jour', 'success'); }
      catch (x) { d.toast(x.message, 'error'); teamView(app, o); }
    }; });
  }

  const STATUS_MSG = {
    expiree: ['Invitation expirée', 'Ce lien n’est plus valable (7 jours). Demande une nouvelle invitation à ton responsable.'],
    utilisee: ['Invitation déjà utilisée', 'Ce lien a déjà servi. Si c’est toi qui l’as utilisé, connecte-toi : ton organisation t’attend dans tes espaces.'],
    annulee: ['Invitation annulée', 'Ton responsable a annulé cette invitation. Demande-lui un nouveau lien si besoin.'],
  };
  async function joinView(app, token) {
    const t = tokenFrom(token);
    if (t) put(K_PENDING, t);
    const pending = get(K_PENDING, '');
    const card = (inner) => `<section class="sec org-join"><span class="org-badge big" aria-hidden="true">${d.ic('door-open', true)}</span>${inner}</section>`;
    if (!pending) {
      app.innerHTML = card(`<h1>Rejoindre une organisation</h1><p>Colle le lien d’invitation reçu par e-mail ou message.</p>
        <form id="joinPaste" class="row-btns"><input id="jpLink" placeholder="https://…#/rejoindre/…" aria-label="Lien d’invitation" /><button class="btn">Continuer</button></form><p class="hint" id="jpErr"></p>`);
      app.querySelector('#joinPaste').onsubmit = (e) => { e.preventDefault(); const k = tokenFrom(app.querySelector('#jpLink').value); if (!k) { app.querySelector('#jpErr').textContent = 'Ce lien n’est pas une invitation Arbor.'; return; } d.go(`#/rejoindre/${k}`); };
      return;
    }
    // Aperçu (migration 007) : on sait à quoi on est invité avant même d'avoir un compte
    let pv = null;
    try { const rows = await Tutor.publicRpc('invitation_preview', { p_token: pending }); pv = Array.isArray(rows) ? (rows[0] || { status: 'invalide' }) : null; }
    catch (e) { pv = null; } // base sans 007 ou hors ligne : on continue comme avant
    if (pv && pv.status !== 'valide' && !(pv.status === 'utilisee' && window.Tutor && Tutor.signedIn())) {
      put(K_PENDING, null);
      const [h, m] = STATUS_MSG[pv.status] || ['Invitation non valable', 'Ce lien ne correspond à aucune invitation. Vérifie qu’il est complet, ou demande-en un nouveau.'];
      app.innerHTML = card(`<h1>${h}</h1><p>${m}</p><div class="row-btns"><a class="btn ghost" href="#/">Revenir à mon espace personnel</a></div>`);
      return;
    }
    const intro = pv ? `<p class="org-invite-sum"><b>${d.esc(pv.org_name)}</b> t’invite comme <b>${d.esc(ROLES[pv.role] || pv.role)}</b>${pv.unit ? `, équipe <b>${d.esc(pv.unit)}</b>` : ''}.</p>` : '';
    if (!window.Tutor || !Tutor.signedIn()) {
      app.innerHTML = card(`<h1>Rejoindre ton organisation</h1>${intro}
        <p>Connecte-toi, ou crée ton compte, avec l’adresse qui a reçu l’invitation${pv ? ` (<b>${d.esc(pv.email_hint)}</b>)` : ''}. Tes cours personnels restent sur cet appareil.</p>
        <div class="row-btns"><button class="btn" id="jnSignup">${d.ic('user-plus')}Créer mon compte</button><button class="btn ghost" id="jnLogin">${d.ic('sign-in')}J’ai déjà un compte</button></div>`);
      const again = { after: () => joinView(app, pending) };
      app.querySelector('#jnSignup').onclick = () => Welcome.auth(again, 'signup');
      app.querySelector('#jnLogin').onclick = () => Welcome.auth(again, 'login');
      return;
    }
    app.innerHTML = card(`<h1>Rejoindre ton organisation</h1>${intro}<p class="hint">Vérification de l’invitation…</p>`);
    try {
      const id = await accept(pending);
      setSpace(id);
      if (window.Journey) Journey.set({ workspace: 'business', businessIntent: 'join' });
      const o = orgOf(id);
      d.toast(`Bienvenue dans ${o ? o.name : 'ton organisation'}`, 'success');
      d.go(o && o.onboarded === false ? `#/org/${id}/bienvenue` : `#/org/${id}`);
    } catch (x) {
      put(K_PENDING, null);
      const other = /autre adresse/.test(x.message);
      app.innerHTML = card(`<h1>Invitation non valable</h1><p>${d.esc(x.message.charAt(0).toUpperCase() + x.message.slice(1))}.</p>
        <p class="hint">${other ? `Tu es connecté avec ${d.esc(Tutor.lastEmail() || 'une autre adresse')}. Déconnecte-toi (Réglages, Compte) puis rouvre le lien avec l’adresse invitée${pv ? ` (${d.esc(pv.email_hint)})` : ''}.` : 'Demande une nouvelle invitation à ton responsable, pour l’adresse avec laquelle tu es connecté.'}</p>
        <div class="row-btns"><a class="btn ghost" href="#/">Revenir à mon espace personnel</a></div>`);
    }
  }

  /* Point d'entrée du routeur : #/org/<id>[/equipe] et #/rejoindre/<jeton> */
  async function render(app, view, deps) {
    d = deps;
    if (!app.dataset.orgSpaceBound) {
      app.dataset.orgSpaceBound = '1';
      app.addEventListener('click', (e) => {
        if (e.target.closest('[data-org-space]')) openSwitcher(d);
        // retour du pilote : rattaché à l'organisation ouverte (lisible par ses responsables)
        if (e.target.closest('[data-org-feedback]') && window.Feedback && current) Feedback.open({ space: 'business', org: { id: current.id, name: current.name }, deps: d });
      });
    }
    if (window.OrgOnboarding) OrgOnboarding.use(d);
    if (view.name === 'join') return joinView(app, view.token);
    if (view.id === 'nouvelle' && window.OrgOnboarding) return OrgOnboarding.wizard(app, null, 'infos', d);
    let o = orgOf(view.id);
    if (!o && window.Tutor && Tutor.signedIn()) { try { await refresh(); } catch (e) { /* hors ligne : liste connue */ } o = orgOf(view.id); }
    if (!o) { app.innerHTML = `<section class="sec org-join"><h1>Espace introuvable</h1><p>Tu ne fais pas (ou plus) partie de cette organisation.</p><div class="row-btns"><a class="btn ghost" href="#/">Revenir à mon espace personnel</a></div></section>`; return; }
    setSpace(o.id);
    current = o;
    if (window.OrgOnboarding) {
      if (view.tab === 'configurer') return OrgOnboarding.wizard(app, o, view.sub, d);
      // Invité qui n'a pas encore vu la présentation : elle passe avant tout (une seule fois)
      if (view.tab === 'bienvenue' || (o.onboarded === false && !o.owner && view.tab === 'accueil')) return OrgOnboarding.arrival(app, o);
      if (view.tab === 'competences' && can(o, 'admin', 'manager')) {
        app.innerHTML = `${head(o, 'competences')}<section class="sec org-learn"><h2>Compétences</h2><p class="hint">Une compétence est une capacité observable au travail, reliée aux connaissances validées qu’elle demande.</p><div id="skEd"></div></section>`;
        return OrgOnboarding.skillsEditor(app.querySelector('#skEd'), o);
      }
    }
    if (window.OrgShell) {
      const lead = can(o, 'admin', 'manager');
      if (view.tab === 'accueil') return OrgShell.overview(app, o, head(o, 'accueil'), d);
      if (view.tab === 'apprendre') return OrgShell.learn(app, o, head(o, 'apprendre'), d, view.sub);
      if (view.tab === 'intelligence' && lead) return OrgShell.intelligence(app, o, head(o, 'intelligence'), d);
      if (view.tab === 'parametres' && o.role === 'admin') return OrgShell.settings(app, o, head(o, 'parametres'), d);
      if (['intelligence', 'parametres'].includes(view.tab)) { app.innerHTML = `${head(o, view.tab)}<section class="sec"><p class="hint">Cet écran est réservé ${view.tab === 'parametres' ? 'aux administrateurs' : 'aux managers et administrateurs'}.</p></section>`; return; }
    }
    if (view.tab === 'apercu' && window.OrgSandbox) {
      if (!can(o, 'admin', 'manager')) { app.innerHTML = `${head(o, 'apercu')}<section class="sec"><p class="hint">L’aperçu collaborateur est réservé aux managers et administrateurs.</p></section>`; return; }
      return OrgSandbox.render(app, o, head(o, 'apercu'), d, view.sub);
    }
    if (view.tab === 'equipe' && can(o, 'admin', 'manager')) return teamView(app, o);
    if (view.tab === 'scenarios' && can(o, 'admin', 'manager') && window.OrgEngines) return OrgEngines.scenariosView(app, o, head(o, 'scenarios'), d);
    if (view.tab === 'documents' && window.OrgDocs) return OrgDocs.render(app, o, view.sub, d, head(o, 'documents'));
    if (window.OrgLearn && OrgLearn.TABS.includes(view.tab)) return OrgLearn.render(app, o, view, d, head(o, view.tab));
    app.innerHTML = homeView(o);
  }

  /* Choisir son espace : personnel, chacune de ses organisations, en créer ou en rejoindre une */
  function openSwitcher(deps) {
    d = deps;
    const cur = space();
    const orgs = list();
    d.openModal(`
      <h2 id="modalTitle">Mes espaces</h2>
      <p class="modal-lede">Tes données ne se mélangent pas : l’espace personnel reste sur ton appareil, chaque organisation a le sien.</p>
      <div class="space-list">
        <a class="space-item" href="#/" data-space="personal" ${cur === 'personal' ? 'aria-current="true"' : ''}><span>${d.ic('user-circle', true)}</span><div><b>Espace personnel</b><small>Tes cours et tes révisions, sur cet appareil</small></div></a>
        ${orgs.map((o) => `<a class="space-item" href="#/org/${o.id}" data-space="${o.id}" ${cur === o.id ? 'aria-current="true"' : ''}><span>${d.ic('buildings', true)}</span><div><b>${d.esc(o.name)}</b><small>${ROLES[o.role] || o.role}</small></div></a>`).join('')}
      </div>
      <div class="row-btns"><button class="btn ghost" id="spCreate">${d.ic('plus')}Créer une organisation</button><a class="btn ghost" href="#/rejoindre" id="spJoin">${d.ic('door-open')}Rejoindre avec une invitation</a></div>`, (el) => {
      el.querySelectorAll('[data-space]').forEach((a) => { a.onclick = () => { setSpace(a.dataset.space); d.closeModal(); }; });
      el.querySelector('#spJoin').onclick = () => d.closeModal();
      el.querySelector('#spCreate').onclick = () => createModal(d);
    });
  }

  // Créer une organisation : l'assistant en 6 étapes (org-onboarding.js)
  function createModal(deps) {
    d = deps;
    d.closeModal();
    d.go('#/org/nouvelle');
  }

  // Après le retour d'un lien de connexion, reprendre l'invitation en attente
  const pendingInvite = () => get(K_PENDING, '');

  window.Org = { list, space, setSpace, refresh, create, invite, accept, members, invitations, revoke, render, openSwitcher, createModal, pendingInvite, tokenFrom, ROLES, can, homeView: (o, deps) => { d = deps; return homeView(o); } };
})();
