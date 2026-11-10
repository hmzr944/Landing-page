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
    const orgs = (Array.isArray(rows) ? rows : []).map((r) => ({ id: r.id, name: r.name, sector: r.sector || '', role: r.role }));
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
  const members = (orgId) => Tutor.rest('/rest/v1/memberships', { method: 'GET', query: `?org_id=eq.${encodeURIComponent(orgId)}&select=user_id,role,status,email,created_at&order=created_at` });
  const invitations = (orgId) => Tutor.rest('/rest/v1/invitations', { method: 'GET', query: `?org_id=eq.${encodeURIComponent(orgId)}&accepted_at=is.null&select=id,email,role,expires_at&order=created_at` });
  const revoke = (id) => Tutor.rest('/rest/v1/rpc/revoke_invitation', { body: { p_id: id } });
  const inviteLink = (token) => `${location.origin}${location.pathname}#/rejoindre/${token}`;
  // Un lien d'invitation collé, ou le code seul (48 caractères hexadécimaux)
  const tokenFrom = (txt) => { const m = String(txt || '').match(/([0-9a-f]{48})/i); return m ? m[1].toLowerCase() : ''; };

  /* ---------- Écrans ---------- */
  let d = null; // outils de l'app : esc, ic, openModal, closeModal, toast, go
  const loginForm = (why) => `
    <form class="org-login" id="orgLogin">
      <p>${why}</p>
      <label for="olEmail">Adresse e-mail</label>
      <div class="row-btns"><input id="olEmail" type="email" autocomplete="email" required value="${d.esc(window.Tutor ? Tutor.lastEmail() : '')}" placeholder="toi@exemple.fr" /><button class="btn sm" id="olSend">${d.ic('envelope-simple')}Recevoir le lien</button></div>
      <div id="olCodeRow" hidden><label for="olCode">Ou colle le code reçu par e-mail</label>
      <div class="row-btns"><input id="olCode" inputmode="numeric" autocomplete="one-time-code" placeholder="123456" /><button type="button" class="btn ghost sm" id="olVerify">Valider le code</button></div></div>
      <p class="hint" id="olErr" role="alert"></p>
    </form>`;
  function bindLogin(el, after) {
    const f = el.querySelector('#orgLogin'); if (!f) return;
    const err = f.querySelector('#olErr');
    f.onsubmit = async (e) => {
      e.preventDefault();
      const email = f.querySelector('#olEmail').value.trim();
      try { await Tutor.signIn(email); err.textContent = 'Lien envoyé. Ouvre-le sur cet appareil, ou colle le code ci-dessous.'; f.querySelector('#olCodeRow').hidden = false; }
      catch (x) { err.textContent = x.message; }
    };
    f.querySelector('#olVerify').onclick = async () => {
      try { await Tutor.verifyCode(f.querySelector('#olEmail').value.trim(), f.querySelector('#olCode').value); await after(); }
      catch (x) { err.textContent = x.message; }
    };
  }

  // En-tête commun d'un espace professionnel : nom, rôle, onglets selon le rôle
  function head(o, tab) {
    const tabs = [['accueil', 'house', 'Accueil']];
    if (can(o, 'admin', 'manager')) tabs.push(['equipe', 'users-three', 'Équipe']);
    return `<header class="org-head glass">
        <div class="org-id"><span class="org-badge" aria-hidden="true">${d.ic('buildings', true)}</span><div><h1>${d.esc(o.name)}</h1><p>${d.esc(o.sector || 'Espace professionnel')} · <b>${ROLES[o.role] || o.role}</b></p></div></div>
        <nav class="org-tabs" aria-label="Espace ${d.esc(o.name)}">${tabs.map(([k, icn, l]) => `<a href="#/org/${o.id}${k === 'accueil' ? '' : '/' + k}" ${tab === k ? 'aria-current="page"' : ''}>${d.ic(icn)}${l}</a>`).join('')}</nav>
      </header>`;
  }

  // Ce qui existe déjà et ce qui arrive : on ne montre pas de faux tableau de bord
  function homeView(o) {
    const lead = can(o, 'admin', 'manager');
    const soon = (icn, t, txt) => `<div class="org-card soon"><span>${d.ic(icn)}</span><div><b>${t}</b><p>${txt}</p><small>Bientôt</small></div></div>`;
    return `${head(o, 'accueil')}
      <section class="org-grid">
        ${lead ? `<a class="org-card" href="#/org/${o.id}/equipe"><span>${d.ic('users-three')}</span><div><b>Équipe et invitations</b><p>Invite tes collaborateurs par e-mail et attribue leur rôle.</p></div></a>` : ''}
        ${can(o, 'admin', 'manager', 'expert') ? soon('files', 'Documents de référence', 'Fiches produits, procédures : Arbor en extrait les connaissances, que tu valides avant usage.') : ''}
        ${soon('target', lead ? 'Diagnostic de l’équipe' : 'Mon diagnostic', lead ? 'Les fragilités réelles de l’équipe, calculées à partir de preuves, avec la taille de l’échantillon.' : 'Quelques questions pour savoir où tu en es, sans note.')}
        ${soon('storefront', 'Client mystère', 'Des mises en situation avec un client simulé, évaluées sur des comportements observables.')}
      </section>
      <p class="org-note">${d.ic('lock-simple')}Ton espace personnel (cours, révisions, progression) reste sur ton appareil. ${lead ? 'Tu ne vois que ce qui concerne cette organisation.' : 'Ton organisation n’y a pas accès.'}</p>`;
  }

  async function teamView(app, o) {
    app.innerHTML = `${head(o, 'equipe')}<section class="sec"><p class="hint">Chargement de l’équipe…</p></section>`;
    let ms = [], invs = [];
    try { [ms, invs] = await Promise.all([members(o.id), invitations(o.id)]); }
    catch (e) { app.querySelector('.sec').innerHTML = `<p class="hint">${d.esc(e.message)}</p>`; return; }
    const roleOpts = Object.entries(ROLES).filter(([k]) => k !== 'admin' || o.role === 'admin');
    app.innerHTML = `${head(o, 'equipe')}
      <section class="sec">
        <h2>Inviter une personne</h2>
        <form class="org-invite" id="orgInvite">
          <label for="oiEmail">Adresse e-mail</label><input id="oiEmail" type="email" required placeholder="prenom.nom@entreprise.fr" />
          <label for="oiRole">Rôle</label><select id="oiRole">${roleOpts.map(([k, l]) => `<option value="${k}" ${k === 'member' ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <div class="row-btns"><button class="btn">${d.ic('paper-plane-tilt')}Créer l’invitation</button></div>
          <div id="oiOut" hidden></div>
        </form>
        <p class="hint">L’invitation vaut pour cette adresse seulement, une seule fois, pendant 7 jours.</p>
      </section>
      <section class="sec">
        <h2>Membres <small class="num">${ms.length}</small></h2>
        <ul class="org-list">${ms.map((m) => `<li><span>${d.esc(m.email || 'Membre')}</span><small>${ROLES[m.role] || m.role}${m.status === 'suspended' ? ' · suspendu' : ''}</small></li>`).join('')}</ul>
      </section>
      ${invs.length ? `<section class="sec"><h2>Invitations en attente <small class="num">${invs.length}</small></h2>
        <ul class="org-list">${invs.map((i) => `<li><span>${d.esc(i.email)}</span><small>${ROLES[i.role] || i.role} · jusqu’au ${new Date(i.expires_at).toLocaleDateString('fr-FR')}</small><button class="btn ghost sm" data-revoke="${i.id}">Annuler</button></li>`).join('')}</ul></section>` : ''}`;
    app.querySelector('#orgInvite').onsubmit = async (e) => {
      e.preventDefault();
      const out = app.querySelector('#oiOut');
      try {
        const t = await invite(o.id, app.querySelector('#oiEmail').value.trim().toLowerCase(), app.querySelector('#oiRole').value);
        const link = inviteLink(t);
        out.hidden = false;
        out.innerHTML = `<p><b>Invitation prête.</b> Envoie ce lien à la personne : il ne sera plus affiché ensuite.</p><div class="row-btns"><input id="oiLink" readonly value="${d.esc(link)}" /><button type="button" class="btn sm" id="oiCopy">${d.ic('copy')}Copier</button></div>`;
        out.querySelector('#oiCopy').onclick = () => { const i = out.querySelector('#oiLink'); i.select(); (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(() => d.toast('Lien copié', 'success'), () => document.execCommand && document.execCommand('copy')); };
      } catch (x) { out.hidden = false; out.innerHTML = `<p class="hint">${d.esc(x.message)}</p>`; }
    };
    app.querySelectorAll('[data-revoke]').forEach((b) => { b.onclick = async () => { try { await revoke(b.dataset.revoke); d.toast('Invitation annulée', 'success'); teamView(app, o); } catch (x) { d.toast(x.message, 'error'); } }; });
  }

  async function joinView(app, token) {
    const t = tokenFrom(token);
    if (t) put(K_PENDING, t);
    const pending = get(K_PENDING, '');
    const card = (inner) => `<section class="sec org-join"><span class="org-badge big" aria-hidden="true">${d.ic('door-open', true)}</span>${inner}</section>`;
    if (!pending) {
      app.innerHTML = card(`<h1>Rejoindre une organisation</h1><p>Colle le lien d’invitation reçu par e-mail.</p>
        <form id="joinPaste" class="row-btns"><input id="jpLink" placeholder="https://…#/rejoindre/…" aria-label="Lien d’invitation" /><button class="btn">Continuer</button></form><p class="hint" id="jpErr"></p>`);
      app.querySelector('#joinPaste').onsubmit = (e) => { e.preventDefault(); const k = tokenFrom(app.querySelector('#jpLink').value); if (!k) { app.querySelector('#jpErr').textContent = 'Ce lien n’est pas une invitation Arbor.'; return; } d.go(`#/rejoindre/${k}`); };
      return;
    }
    if (!window.Tutor || !Tutor.signedIn()) {
      app.innerHTML = card(`<h1>Rejoindre ton organisation</h1>${loginForm('Connecte-toi avec l’adresse e-mail à laquelle tu as reçu l’invitation. Tes cours personnels restent sur cet appareil.')}`);
      bindLogin(app, () => joinView(app, pending));
      return;
    }
    app.innerHTML = card('<h1>Rejoindre ton organisation</h1><p class="hint">Vérification de l’invitation…</p>');
    try {
      const id = await accept(pending);
      setSpace(id);
      d.toast(`Bienvenue dans ${orgOf(id) ? orgOf(id).name : 'ton organisation'}`, 'success');
      d.go(`#/org/${id}`);
    } catch (x) {
      put(K_PENDING, null);
      app.innerHTML = card(`<h1>Invitation non valable</h1><p>${d.esc(x.message)}</p><p class="hint">Demande une nouvelle invitation à ton responsable, pour l’adresse avec laquelle tu es connecté.</p><div class="row-btns"><a class="btn ghost" href="#/">Revenir à mon espace personnel</a></div>`);
    }
  }

  /* Point d'entrée du routeur : #/org/<id>[/equipe] et #/rejoindre/<jeton> */
  async function render(app, view, deps) {
    d = deps;
    if (view.name === 'join') return joinView(app, view.token);
    let o = orgOf(view.id);
    if (!o && window.Tutor && Tutor.signedIn()) { try { await refresh(); } catch (e) { /* hors ligne : liste connue */ } o = orgOf(view.id); }
    if (!o) { app.innerHTML = `<section class="sec org-join"><h1>Espace introuvable</h1><p>Tu ne fais pas (ou plus) partie de cette organisation.</p><div class="row-btns"><a class="btn ghost" href="#/">Revenir à mon espace personnel</a></div></section>`; return; }
    setSpace(o.id);
    if (view.tab === 'equipe' && can(o, 'admin', 'manager')) return teamView(app, o);
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

  function createModal(deps) {
    d = deps;
    const signed = window.Tutor && Tutor.signedIn();
    d.openModal(`
      <h2 id="modalTitle">Créer une organisation</h2>
      <p class="modal-lede">Pour former ton équipe à partir de tes propres documents. Tu en seras l’administrateur.</p>
      ${signed ? `<form class="form" id="ocForm">
        <div class="field"><label for="ocName">Nom</label><input id="ocName" required minlength="2" maxlength="120" placeholder="Magasin de Lyon" /></div>
        <div class="field"><label for="ocSector">Secteur</label><select id="ocSector">${SECTORS.map((x) => `<option>${x}</option>`).join('')}</select></div>
        <p class="hint" id="ocErr" role="alert"></p>
        <div class="row-btns end"><button type="button" class="btn ghost" data-close>Annuler</button><button class="btn">${d.ic('check')}Créer</button></div>
      </form>` : loginForm('Une organisation a besoin d’un compte (gratuit). Tes cours personnels restent sur cet appareil.')}`, (el) => {
      if (!signed) { bindLogin(el, () => createModal(d)); return; }
      el.querySelector('[data-close]').onclick = d.closeModal;
      el.querySelector('#ocForm').onsubmit = async (e) => {
        e.preventDefault();
        try { const id = await create(el.querySelector('#ocName').value.trim(), el.querySelector('#ocSector').value); setSpace(id); d.closeModal(); d.toast('Organisation créée', 'success'); d.go(`#/org/${id}`); }
        catch (x) { el.querySelector('#ocErr').textContent = x.message; }
      };
    });
  }

  // Après le retour d'un lien de connexion, reprendre l'invitation en attente
  const pendingInvite = () => get(K_PENDING, '');

  window.Org = { list, space, setSpace, refresh, create, invite, accept, members, invitations, revoke, render, openSwitcher, createModal, pendingInvite, tokenFrom, ROLES };
})();
