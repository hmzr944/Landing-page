/* Arbor Business · Entrer dans l'organisation sans lien d'invitation (migration 013, docs/arbor-3-recherche.md § 4).
   Deux portes :
   A. Adresses et domaines autorisés : la personne se connecte avec son propre compte ; dès que son adresse est vérifiée,
      elle est rattachée (Org.refresh appelle claim_memberships à chaque connexion). Aucun lien à envoyer.
   B. Pass d'équipe : code court + QR, 15 minutes par défaut (60 au plus), places limitées, rattaché à un site et à un
      libellé. Le code n'est affiché qu'à sa création ; seule son empreinte est gardée, et elle n'est lisible par personne.
   Côté collaborateur : #/rejoindre (saisir le code) et #/rejoindre/<CODE> (QR scanné).
   Les liens d'invitation déjà envoyés (48 caractères) restent acceptés par le parcours historique de js/org.js. */
(function () {
  const QR_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
  const QR_SRI = 'sha512-ZDSPMa/JM1D+7kdg2x3BsruQ6T/JpJo3jWDWkCZsP+5yVyp1KfESqLI+7RqB5k24F7p2cV7i2YHh/890y6P6Sw==';
  const ROLE_OPTS = [['member', 'Collaborateur'], ['expert', 'Expert métier'], ['manager', 'Manager']];
  const q = encodeURIComponent;
  const rpc = (name, body) => Tutor.rest(`/rest/v1/rpc/${name}`, { body });
  const missing = (e) => !!e && (e.status === 404 || /PGRST20[0-9]|does not exist|could not find|schema cache/i.test(String(e.message)));
  const passCode = (txt) => { const c = String(txt || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return /^[A-HJ-NP-Z2-9]{6}$/.test(c) ? c : ''; };
  const passUrl = (code) => `${location.origin}${location.pathname}#/rejoindre/${code}`;
  const pretty = (code) => `${code.slice(0, 3)} ${code.slice(3)}`;
  let qrLoading = null;
  const loadQr = () => qrLoading || (qrLoading = new Promise((res, rej) => {
    if (window.qrcode) return res(window.qrcode);
    const s = document.createElement('script'); s.src = QR_SRC; s.integrity = QR_SRI; s.crossOrigin = 'anonymous'; s.referrerPolicy = 'no-referrer';
    s.onload = () => res(window.qrcode); s.onerror = () => { qrLoading = null; rej(new Error('QR indisponible')); };
    document.head.appendChild(s);
  }));
  let timers = [];
  const clearTimers = () => { timers.forEach(clearInterval); timers = []; };
  const left = (iso) => Math.max(0, Math.round((new Date(iso) - Date.now()) / 1000));
  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  /* ---------- Responsable : panneau « Accès à l'équipe » ---------- */
  async function panel(box, o, d) {
    clearTimers();
    const admin = o.role === 'admin';
    let rules = [], passes = [], units = [], has013 = true;
    try { rules = await Tutor.rest('/rest/v1/org_access_rules', { method: 'GET', query: `?org_id=eq.${q(o.id)}&select=id,kind,value,role,unit_id&order=created_at` }); } catch (e) { if (missing(e)) has013 = false; }
    if (!has013) {
      box.innerHTML = `<p class="note-line">${d.ic('info')} L’entrée par adresse autorisée et par pass d’équipe arrive avec la migration 013 de la base. En attendant, les liens d’invitation restent disponibles.</p><div id="accLegacy"></div>`;
      if (window.OrgOnboarding && OrgOnboarding.legacyInviteBox) OrgOnboarding.legacyInviteBox(box.querySelector('#accLegacy'), o);
      return;
    }
    try { passes = await Tutor.rest('/rest/v1/team_passes', { method: 'GET', query: `?org_id=eq.${q(o.id)}&revoked_at=is.null&select=id,label,unit_id,max_uses,uses,expires_at&order=created_at.desc` }); } catch (e) { passes = []; }
    try { units = await Tutor.rest('/rest/v1/org_units', { method: 'GET', query: `?org_id=eq.${q(o.id)}&select=id,name,kind&order=name` }); } catch (e) { units = []; }
    rules = Array.isArray(rules) ? rules : []; passes = (Array.isArray(passes) ? passes : []).filter((p) => left(p.expires_at) > 0 && p.uses < p.max_uses);
    const uname = (id) => (units.find((u) => u.id === id) || {}).name || '';
    const unitSel = (id) => units.length ? `<label class="fld"><span>Site ou pôle <i class="opt">facultatif</i></span><select id="${id}"><option value="">Tous</option>${units.map((u) => `<option value="${u.id}">${d.esc(u.name)}</option>`).join('')}</select></label>` : '';
    const roles = ROLE_OPTS.filter(([k]) => k !== 'manager' || admin);
    box.innerHTML = `
      <div class="acc">
        <section class="acc-block" aria-labelledby="accAh">
          <header><h3 id="accAh">${d.ic('envelope-simple')}Adresses autorisées</h3><p>Pour l’équipe stable. La personne se connecte avec son propre compte : dès que son adresse est vérifiée, elle rejoint ${d.esc(o.name)}. Aucun lien à envoyer, aucun mot de passe à gérer.</p></header>
          <form class="acc-form" id="ivForm" novalidate>
            ${admin ? `<label class="fld fld-s"><span>Type</span><select id="ivKind"><option value="email">Une adresse</option><option value="domain">Tout un domaine</option></select></label>` : ''}
            <label class="fld fld-l"><span id="ivLabel">Adresse e-mail</span><input id="ivEmail" type="text" inputmode="email" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="prenom.nom@entreprise.fr…" /></label>
            <label class="fld fld-s"><span>Rôle</span><select id="ivRole">${roles.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
            ${unitSel('ivUnit')}
            <button class="btn">Autoriser</button>
          </form>
          <p class="form-err" id="ivErr" role="alert" hidden></p>
          <div id="ivOut" aria-live="polite"></div>
          ${rules.length ? `<ul class="rows">${rules.map((r) => `<li><span class="row-main">${d.ic(r.kind === 'domain' ? 'buildings' : 'user')}<span><b>${r.kind === 'domain' ? `Tout @${d.esc(r.value)}` : d.esc(r.value)}</b><small>${d.esc((ROLE_OPTS.find(([k]) => k === r.role) || [0, r.role])[1])}${r.unit_id ? `, ${d.esc(uname(r.unit_id))}` : ''}</small></span></span><button type="button" class="btn ghost sm" data-rule-del="${r.id}">Retirer</button></li>`).join('')}</ul>`
            : `<p class="empty-line">Aucune adresse autorisée pour l’instant.</p>`}
        </section>
        <section class="acc-block" aria-labelledby="accBh">
          <header><h3 id="accBh">${d.ic('qr-code')}Pass d’équipe</h3><p>Pour le terrain : un briefing, un renfort, une nouvelle consigne. Un code court et un QR, valables quelques minutes, pour un nombre limité de personnes.</p></header>
          <form class="acc-form" id="passForm" novalidate>
            <label class="fld fld-l"><span>Libellé <i class="opt">facultatif</i></span><input id="passLabel" maxlength="80" autocomplete="off" placeholder="Briefing du matin…" /></label>
            <label class="fld fld-s"><span>Durée</span><select id="passMin"><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">1 heure</option></select></label>
            <label class="fld fld-s"><span>Places</span><input id="passMax" type="number" inputmode="numeric" min="1" max="500" value="20" /></label>
            ${unitSel('passUnit')}
            <button class="btn">Créer un pass</button>
          </form>
          <p class="form-err" id="passErr" role="alert" hidden></p>
          <div id="passOut" aria-live="polite"></div>
          ${passes.length ? `<ul class="rows">${passes.map((p) => `<li><span class="row-main">${d.ic('ticket')}<span><b>${d.esc(p.label || 'Pass sans libellé')}</b><small><span class="num">${p.uses}/${p.max_uses}</span> places utilisées${p.unit_id ? `, ${d.esc(uname(p.unit_id))}` : ''}, encore <span class="num" data-left="${d.esc(p.expires_at)}">${mmss(left(p.expires_at))}</span></small></span></span><button type="button" class="btn ghost sm" data-pass-del="${p.id}">Arrêter</button></li>`).join('')}</ul>` : ''}
        </section>
      </div>`;
    const kind = box.querySelector('#ivKind'), inp = box.querySelector('#ivEmail');
    if (kind) kind.onchange = () => { const dom = kind.value === 'domain'; box.querySelector('#ivLabel').textContent = dom ? 'Domaine de l’entreprise' : 'Adresse e-mail'; inp.placeholder = dom ? 'entreprise.fr…' : 'prenom.nom@entreprise.fr…'; inp.focus(); };
    box.querySelector('#ivForm').onsubmit = async (e) => {
      e.preventDefault();
      const err = box.querySelector('#ivErr'); err.hidden = true;
      const k = kind ? kind.value : 'email', v = inp.value.trim().toLowerCase();
      if (k === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { err.hidden = false; err.textContent = 'Indique une adresse e-mail valide.'; inp.focus(); return; }
      if (k === 'domain' && !/^@?[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(v)) { err.hidden = false; err.textContent = 'Indique un domaine comme entreprise.fr.'; inp.focus(); return; }
      const unit = box.querySelector('#ivUnit') ? box.querySelector('#ivUnit').value : '';
      try {
        await rpc('add_access_rule', { p_org: o.id, p_kind: k, p_value: v, p_role: box.querySelector('#ivRole').value, ...(unit ? { p_unit: unit } : {}) });
        d.toast(k === 'domain' ? `Toute adresse @${v.replace(/^@/, '')} vérifiée rejoindra ${o.name}` : `${v} rejoindra ${o.name} à sa connexion`, 'success');
        panel(box, o, d);
      } catch (x) { err.hidden = false; err.textContent = x.message.charAt(0).toUpperCase() + x.message.slice(1) + '.'; }
    };
    box.querySelectorAll('[data-rule-del]').forEach((b) => { b.onclick = async () => { try { await rpc('remove_access_rule', { p_id: b.dataset.ruleDel }); d.toast('Autorisation retirée', 'success'); panel(box, o, d); } catch (x) { d.toast(x.message, 'error'); } }; });
    box.querySelectorAll('[data-pass-del]').forEach((b) => { b.onclick = async () => { try { await rpc('revoke_team_pass', { p_id: b.dataset.passDel }); d.toast('Pass arrêté', 'success'); panel(box, o, d); } catch (x) { d.toast(x.message, 'error'); } }; });
    box.querySelector('#passForm').onsubmit = async (e) => {
      e.preventDefault();
      const err = box.querySelector('#passErr'); err.hidden = true;
      const max = Number(box.querySelector('#passMax').value);
      if (!(max >= 1 && max <= 500)) { err.hidden = false; err.textContent = 'Entre 1 et 500 places.'; return; }
      const unit = box.querySelector('#passUnit') ? box.querySelector('#passUnit').value : '';
      try {
        const rows = await rpc('create_team_pass', { p_org: o.id, p_minutes: Number(box.querySelector('#passMin').value), p_max_uses: max, p_label: box.querySelector('#passLabel').value.trim() || null, ...(unit ? { p_unit: unit } : {}) });
        const p = Array.isArray(rows) ? rows[0] : rows;
        showPass(box.querySelector('#passOut'), p, max, box.querySelector('#passLabel').value.trim(), d, () => panel(box, o, d));
      } catch (x) { err.hidden = false; err.textContent = x.message.charAt(0).toUpperCase() + x.message.slice(1) + '.'; }
    };
    box.querySelectorAll('[data-left]').forEach((el) => { timers.push(setInterval(() => { el.textContent = mmss(left(el.dataset.left)); }, 1000)); });
  }

  function showPass(out, p, max, label, d, done) {
    const url = passUrl(p.code);
    out.innerHTML = `<div class="pass-card">
      <div class="pass-qr" id="passQr" aria-hidden="true"></div>
      <div class="pass-info">
        <p class="pass-k">${d.esc(label || 'Pass d’équipe')}</p>
        <p class="pass-code" aria-label="Code ${p.code.split('').join(' ')}">${pretty(p.code)}</p>
        <p class="pass-meta">À saisir sur <b>Rejoindre une équipe</b>, ou à scanner. Valable encore <b class="num" id="passLeft">${mmss(left(p.expires_at))}</b>, ${max} place${max > 1 ? 's' : ''}.</p>
        <div class="row-btns"><button type="button" class="btn ghost sm" id="passCopy">${d.ic('copy')}Copier le lien</button><button type="button" class="btn ghost sm" id="passDone">Terminé</button></div>
        <p class="pass-note">Le code ne sera plus affiché après : note-le ou laisse cet écran ouvert pendant le briefing.</p>
      </div></div>`;
    const tick = setInterval(() => { const s = left(p.expires_at), el = out.querySelector('#passLeft'); if (el) el.textContent = mmss(s); if (!s) { clearInterval(tick); out.querySelector('.pass-card').classList.add('expired'); } }, 1000);
    timers.push(tick);
    out.querySelector('#passCopy').onclick = () => (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => d.toast('Lien copié', 'success'), () => d.toast(url));
    out.querySelector('#passDone').onclick = () => { clearInterval(tick); done(); };
    loadQr().then((qr) => {
      const g = qr(0, 'M'); g.addData(url); g.make();
      const el = out.querySelector('#passQr'); if (el) el.innerHTML = g.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    }).catch(() => { const el = out.querySelector('#passQr'); if (el) el.remove(); });
  }

  /* ---------- Collaborateur : rejoindre avec un code ---------- */
  const MSG = {
    invalide: 'Ce code n’est plus valable : il a expiré, il est complet ou il a été arrêté. Demande un nouveau code à ton responsable.',
    trop_de_tentatives: 'Trop d’essais en peu de temps. Réessaie dans une heure, ou demande à ton responsable de t’autoriser par ton adresse.',
    suspendu: 'Ton accès à cette organisation est suspendu. Parles-en à ton responsable.',
  };
  async function join(app, code, d, onDone) {
    const card = (inner) => `<section class="join"><span class="join-ic" aria-hidden="true">${d.ic('door-open')}</span>${inner}</section>`;
    const c = passCode(code);
    if (!c) {
      app.innerHTML = card(`<h1>Rejoindre une équipe</h1><p>Saisis le code que ton responsable affiche, ou scanne son QR code avec l’appareil photo.</p>
        <form id="joinCode" class="join-form" novalidate><label class="fld"><span>Code d’équipe</span><input id="passCode" class="code-in" maxlength="7" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" placeholder="ABC 234…" /></label><button class="btn">Continuer</button></form>
        <p class="form-err" id="jcErr" role="alert" hidden></p>
        <p class="join-alt">Ton entreprise t’a autorisé par ton adresse e-mail ? Connecte-toi simplement : ton espace apparaîtra tout seul.</p>`);
      const f = app.querySelector('#joinCode');
      f.onsubmit = (e) => { e.preventDefault(); const v = passCode(f.querySelector('#passCode').value); if (!v) { const er = app.querySelector('#jcErr'); er.hidden = false; er.textContent = 'Le code fait 6 caractères, lettres et chiffres.'; return; } d.go(`#/rejoindre/${v}`); };
      f.querySelector('#passCode').focus();
      return;
    }
    if (!window.Tutor || !Tutor.signedIn()) {
      app.innerHTML = card(`<h1>Rejoindre l’équipe</h1><p>Code <b class="pass-inline">${pretty(c)}</b>. Identifie-toi : un code de connexion t’est envoyé par e-mail, aucun mot de passe à créer.</p>
        <div class="row-btns"><button class="btn" id="jnLogin">Me connecter</button><button class="btn ghost" id="jnSignup">Créer mon compte</button></div>`);
      const again = { after: () => join(app, c, d, onDone) };
      app.querySelector('#jnLogin').onclick = () => Welcome.auth(again, 'login');
      app.querySelector('#jnSignup').onclick = () => Welcome.auth(again, 'signup');
      return;
    }
    app.innerHTML = card(`<h1>Rejoindre l’équipe</h1><p class="hint">Vérification du code…</p>`);
    try {
      const rows = await rpc('redeem_team_pass', { p_code: c });
      const r = Array.isArray(rows) ? rows[0] : rows;
      if (r && (r.status === 'ok' || r.status === 'deja_membre')) return onDone(r);
      app.innerHTML = card(`<h1>Code non valable</h1><p>${MSG[(r && r.status) || 'invalide'] || MSG.invalide}</p><div class="row-btns"><a class="btn" href="#/rejoindre">Saisir un autre code</a><a class="btn ghost" href="#/">Mon espace personnel</a></div>`);
    } catch (x) {
      app.innerHTML = card(`<h1>Impossible de rejoindre</h1><p>${d.esc(missing(x) ? 'Les pass d’équipe ne sont pas encore activés sur ce serveur.' : x.message)}</p><div class="row-btns"><a class="btn ghost" href="#/">Mon espace personnel</a></div>`);
    }
  }

  /* À chaque connexion : rattachements par adresse autorisée (silencieux si la base n'a pas 013) */
  async function claim() {
    try { const rows = await rpc('claim_memberships', {}); return Array.isArray(rows) ? rows : []; } catch (e) { return []; }
  }

  window.OrgAccess = { panel, join, claim, passCode, clearTimers };
})();
