/* Entrée dans Arbor Business (docs/onboarding.md, phases 4 et 5).
   - Assistant de l'administrateur, 6 étapes reprenables : organisation, objectifs, structure, connaissances,
     compétences, invitations. Chaque étape est enregistrée dans la base (organizations.setup) : on peut quitter et revenir.
   - Arrivée du collaborateur : rôle, équipe, compétences attendues, ce qui est observé, qui voit les résultats,
     puis diagnostic. Le parcours est court : il ne configure rien.
   Les droits sont toujours vérifiés par la base (fonctions et RLS de la migration 007) ; ce module ne fait qu'afficher.
   Sans la migration 007 sur le projet, les étapes qui en dépendent le disent clairement et peuvent être passées. */
(function () {
  let d = null;
  const q = (s) => encodeURIComponent(s);
  const STEPS = [
    ['infos', 'buildings', 'Organisation'],
    ['objectifs', 'flag-banner', 'Objectifs'],
    ['structure', 'tree-structure', 'Équipes'],
    ['connaissances', 'files', 'Connaissances'],
    ['competences', 'target', 'Compétences'],
    ['invitations', 'paper-plane-tilt', 'Invitations'],
  ];
  const SIZES = ['1-10', '11-50', '51-250', '251-1000', '1000+'];
  const LANGS = [['fr', 'Français'], ['en', 'English'], ['es', 'Español'], ['de', 'Deutsch'], ['it', 'Italiano'], ['pt', 'Português']];
  const SECTORS = ['Commerce et distribution', 'Hôtellerie et restauration', 'Santé', 'Industrie', 'Services', 'Éducation et formation', 'Informatique', 'Autre'];
  const GOALS = [
    ['onboarding', 'user-plus', 'Onboarding des nouveaux collaborateurs'], ['procedures', 'list-checks', 'Maîtrise des procédures'],
    ['vente', 'storefront', 'Formation commerciale'], ['conformite', 'shield-check', 'Conformité et sécurité'],
    ['competences', 'chart-line-up', 'Développement des compétences'], ['evaluation', 'clipboard-text', 'Évaluation des équipes'],
  ];
  const IMPORTANCE = [[1, 'Utile'], [2, 'Importante'], [3, 'Essentielle']];
  const ROLE_HELP = { member: 'apprend et s’entraîne', manager: 'suit son équipe et invite', expert: 'valide les connaissances non sensibles', admin: 'configure tout' };

  // Migration 007 absente du projet : on le dit au lieu d'échouer en silence
  const missing = (e) => /could not find|PGRST20[25]|schema cache|does not exist/i.test(String(e && e.message));
  const needsMigration = (what) => `<p class="empty-note">${d.ic('info')}${what} demande la mise à jour de la base d’Arbor (migration 007). Tu peux passer cette étape et y revenir plus tard.</p>`;

  /* ---------- Accès à la base ---------- */
  const rpc = (name, body) => Tutor.rest(`/rest/v1/rpc/${name}`, { body });
  const units = (org) => Tutor.rest('/rest/v1/org_units', { method: 'GET', query: `?org_id=eq.${q(org)}&select=id,kind,name,parent_id&order=kind,name` });
  async function setup(o, patch) {
    try { await rpc('update_organization', { p_org: o.id, p_setup: patch }); o.setup = { ...(o.setup || {}), ...patch }; return true; }
    catch (e) { if (missing(e)) return false; throw e; }
  }
  async function reloadOrg(id) { await Org.refresh(); return Org.list().find((x) => x.id === id) || null; }

  /* ---------- Cadre commun de l'assistant ---------- */
  function frame(o, key, body, foot) {
    const i = STEPS.findIndex(([k]) => k === key);
    return `<section class="obz">
      <header class="obz-head">
        <a class="obz-quit" href="${o ? `#/org/${o.id}` : '#/'}">${d.ic('x')}<span>${o ? 'Reprendre plus tard' : 'Annuler'}</span></a>
        <div class="obz-steps" aria-label="Étape ${i + 1} sur ${STEPS.length}">${STEPS.map(([k, icn, l], j) => `<span class="${j < i ? 'done' : j === i ? 'cur' : ''}" title="${l}">${d.ic(j < i ? 'check' : icn, j <= i)}</span>`).join('')}</div>
        <p class="obz-count">Étape ${i + 1} sur ${STEPS.length} · ${STEPS[i][2]}</p>
      </header>
      <div class="obz-body">${body}</div>
      <footer class="obz-foot">${foot || ''}</footer>
    </section>`;
  }
  const nextStep = (key) => { const i = STEPS.findIndex(([k]) => k === key); return STEPS[i + 1] ? STEPS[i + 1][0] : 'fin'; };
  const prevStep = (key) => { const i = STEPS.findIndex(([k]) => k === key); return i > 0 ? STEPS[i - 1][0] : null; };
  const navFoot = (o, key, { primary = 'Continuer', skip = true } = {}) => `
    ${prevStep(key) && o ? `<a class="btn ghost" href="#/org/${o.id}/configurer/${prevStep(key)}">${d.ic('arrow-left')}Retour</a>` : ''}
    ${skip && o ? `<a class="link-btn obz-skip" href="#/org/${o.id}/configurer/${nextStep(key)}" data-skip>Passer cette étape</a>` : ''}
    <button class="btn big" id="obzNext">${primary}${d.ic('arrow-right')}</button>`;
  // Enregistrer l'étape franchie puis passer à la suivante
  /* On ne passe à l'étape suivante QUE si l'enregistrement est confirmé par la base.
     Échec réseau, refus serveur ou délai dépassé : on reste sur l'étape, la saisie est conservée (rien n'est
     redessiné), un message dit quoi faire, et le bouton permet de réessayer. Un double clic n'envoie qu'une fois. */
  const SAVE_TIMEOUT = () => window.ARBOR_SAVE_TIMEOUT || 15000; // réglable pour les tests
  const withTimeout = (p, ms = SAVE_TIMEOUT()) => Promise.race([p, new Promise((_, rej) => setTimeout(() => { const e = new Error('délai dépassé'); e.kind = 'timeout'; rej(e); }, ms))]);
  const saveMsg = (e) => (e.kind === 'offline' || /connexion impossible|failed to fetch/i.test(e.message) ? 'Pas de connexion : l’étape n’est pas enregistrée.'
    : e.kind === 'timeout' ? 'Le serveur met trop de temps à répondre : l’étape n’est pas enregistrée.'
    : e.kind === 'auth' ? 'Ta session a expiré : reconnecte-toi, ta saisie reste à l’écran.'
    : `L’étape n’est pas enregistrée (${e.message}).`);
  function saveError(e) {
    const foot = document.querySelector('.obz-foot');
    let box = document.getElementById('obzSaveErr');
    if (!box && foot) { box = document.createElement('p'); box.id = 'obzSaveErr'; box.className = 'wel-form-err obz-save-err'; box.setAttribute('role', 'alert'); foot.prepend(box); }
    if (box) { box.hidden = false; box.textContent = `${saveMsg(e)} Vérifie ta connexion puis réessaie.`; }
    const b = document.getElementById('obzNext'); if (b) { b.disabled = false; b.removeAttribute('aria-busy'); b.dataset.retry = '1'; }
  }
  const clearSaveError = () => { const box = document.getElementById('obzSaveErr'); if (box) box.hidden = true; };
  let advancing = false;
  async function advance(o, key) {
    if (advancing) return false; // double clic : une seule sauvegarde
    advancing = true;
    const b = document.getElementById('obzNext'); if (b) { b.disabled = true; b.setAttribute('aria-busy', 'true'); }
    clearSaveError();
    const nx = nextStep(key);
    try {
      await withTimeout(setup(o, { step: nx, [`${key}At`]: Date.now() }));
      advancing = false;
      d.go(`#/org/${o.id}/configurer/${nx}`);
      return true;
    } catch (e) { advancing = false; saveError(e); return false; }
  }

  /* ---------- 1. Organisation ---------- */
  function stepInfos(app, o) {
    const v = o || { name: '', sector: '', size: '', country: 'France', language: 'fr' };
    app.innerHTML = frame(o, 'infos', `
      <h1>Ton organisation</h1>
      <p class="obz-lede">Le strict nécessaire. Tout se modifie plus tard.</p>
      <form class="obz-form" id="obzForm" novalidate>
        <div class="field"><label for="obName">Nom</label><input id="obName" required minlength="2" maxlength="120" autocomplete="organization" value="${d.esc(v.name || '')}" placeholder="Boulangerie Martin" /><p class="wel-err" id="obNameErr" role="alert"></p></div>
        <div class="field"><label for="obSector">Secteur</label><select id="obSector">${SECTORS.map((x) => `<option ${v.sector === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        <fieldset class="field"><legend>Taille <span class="optional">facultatif</span></legend><div class="obz-chips" role="radiogroup">${SIZES.map((x) => `<label><input type="radio" name="obSize" value="${x}" ${v.size === x ? 'checked' : ''} /><span>${x.replace('-', ' à ').replace('+', ' et plus')}</span></label>`).join('')}</div></fieldset>
        <div class="obz-two">
          <div class="field"><label for="obCountry">Pays <span class="optional">facultatif</span></label><input id="obCountry" maxlength="60" autocomplete="country-name" value="${d.esc(v.country || '')}" /></div>
          <div class="field"><label for="obLang">Langue principale</label><select id="obLang">${LANGS.map(([k, l]) => `<option value="${k}" ${(v.language || 'fr') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        </div>
        <p class="wel-form-err" id="obErr" role="alert" hidden></p>
      </form>`, `<button class="btn big" id="obzNext">${o ? 'Enregistrer et continuer' : 'Créer l’organisation'}${d.ic('arrow-right')}</button>`);
    let created = null; // organisation créée lors d'un essai précédent (sauvegarde de l'étape échouée) : on ne la recrée pas
    app.querySelector('#obzNext').onclick = async () => {
      if (advancing) return;
      const name = app.querySelector('#obName').value.trim();
      const err = app.querySelector('#obErr');
      if (name.length < 2) { app.querySelector('#obNameErr').textContent = 'Indique le nom de l’organisation (2 caractères au moins).'; app.querySelector('#obName').focus(); return; }
      const fields = { p_name: name, p_sector: app.querySelector('#obSector').value, p_size: (app.querySelector('input[name="obSize"]:checked') || {}).value || '', p_country: app.querySelector('#obCountry').value.trim(), p_language: app.querySelector('#obLang').value };
      const b = app.querySelector('#obzNext'); b.disabled = true;
      try {
        let id = (o && o.id) || created;
        if (!id) {
          try { id = await withTimeout(rpc('create_organization', fields)); }
          catch (e) { if (!missing(e)) throw e; id = await withTimeout(rpc('create_organization', { p_name: name, p_sector: fields.p_sector })); } // base sans 007
          created = id;
          Org.setSpace(id);
        } else {
          await rpc('update_organization', { p_org: id, p_name: name, p_sector: fields.p_sector, p_size: fields.p_size, p_country: fields.p_country, p_language: fields.p_language }).catch((e) => { if (!missing(e)) throw e; });
        }
        const org = await reloadOrg(id);
        if (window.Journey) Journey.set({ workspace: 'business', businessIntent: 'create' });
        await advance(org || { id }, 'infos');
      } catch (e) { err.hidden = false; err.textContent = saveMsg(e); b.disabled = false; }
    };
  }

  /* ---------- 2. Objectifs ---------- */
  function stepGoals(app, o) {
    const cur = new Set(o.goals || []);
    const other = [...cur].find((g) => !GOALS.some(([k]) => k === g)) || '';
    app.innerHTML = frame(o, 'objectifs', `
      <h1>Que souhaitez-vous améliorer ?</h1>
      <p class="obz-lede">Plusieurs choix possibles. Arbor s’en sert pour proposer les premières compétences et activités.</p>
      <div class="obz-goals">${GOALS.map(([k, icn, l]) => `<button type="button" class="obz-goal" data-g="${k}" aria-pressed="${cur.has(k)}">${d.ic(icn, true)}<span>${l}</span></button>`).join('')}</div>
      <div class="field"><label for="obOther">Autre <span class="optional">facultatif</span></label><input id="obOther" maxlength="80" value="${d.esc(other)}" placeholder="Par exemple : hygiène en cuisine" /></div>
      <p class="wel-form-err" id="obErr" role="alert" hidden></p>`, navFoot(o, 'objectifs'));
    app.querySelectorAll('.obz-goal').forEach((b) => { b.onclick = () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); });
    app.querySelector('#obzNext').onclick = async () => {
      const goals = [...app.querySelectorAll('.obz-goal[aria-pressed="true"]')].map((b) => b.dataset.g);
      const oth = app.querySelector('#obOther').value.trim().slice(0, 80); if (oth) goals.push(oth);
      if (advancing) return;
      try { await withTimeout(rpc('update_organization', { p_org: o.id, p_goals: goals })); }
      catch (e) { if (!missing(e)) { saveError(e); return; } }
      await advance(o, 'objectifs');
    };
  }

  /* ---------- 3. Structure : établissements et équipes ---------- */
  async function stepStructure(app, o) {
    app.innerHTML = frame(o, 'structure', '<p class="hint">Chargement…</p>', '');
    let us = [];
    try { us = await units(o.id); }
    catch (e) { app.querySelector('.obz-body').innerHTML = `<h1>Équipes et établissements</h1>${missing(e) ? needsMigration('Créer des équipes') : `<p class="hint">${d.esc(e.message)}</p>`}`; app.querySelector('.obz-foot').innerHTML = navFoot(o, 'structure', { skip: false }); app.querySelector('#obzNext').onclick = () => advance(o, 'structure'); return; }
    const shops = us.filter((u) => u.kind === 'etablissement'), teams = us.filter((u) => u.kind === 'equipe');
    const row = (u) => `<li><span>${d.ic(u.kind === 'etablissement' ? 'storefront' : 'users-three')}${d.esc(u.name)}${u.parent_id ? `<small> · ${d.esc((shops.find((s) => s.id === u.parent_id) || {}).name || '')}</small>` : ''}</span><button type="button" class="icon-btn sm" data-del="${u.id}" aria-label="Supprimer ${d.esc(u.name)}">${d.ic('trash')}</button></li>`;
    app.querySelector('.obz-body').innerHTML = `
      <h1>Équipes et établissements</h1>
      <p class="obz-lede">Facultatif. Utile pour inviter chacun dans son équipe et suivre les progrès par équipe. Les managers se désignent à l’étape Invitations.</p>
      <div class="obz-units">
        <section><h2>${d.ic('storefront')}Établissements <small class="num">${shops.length}</small></h2>
          <ul class="org-list">${shops.map(row).join('') || '<li class="hint">Aucun pour l’instant (un seul lieu ? passe).</li>'}</ul>
          <form class="row-btns obz-add" data-kind="etablissement"><input aria-label="Nom de l’établissement" maxlength="80" placeholder="Lyon Bellecour" /><button class="btn sm">${d.ic('plus')}Ajouter</button></form></section>
        <section><h2>${d.ic('users-three')}Équipes <small class="num">${teams.length}</small></h2>
          <ul class="org-list">${teams.map(row).join('') || '<li class="hint">Aucune pour l’instant.</li>'}</ul>
          <form class="row-btns obz-add" data-kind="equipe"><input aria-label="Nom de l’équipe" maxlength="80" placeholder="Vente, Cuisine, Accueil…" />${shops.length ? `<select aria-label="Établissement"><option value="">Tous lieux</option>${shops.map((s) => `<option value="${s.id}">${d.esc(s.name)}</option>`).join('')}</select>` : ''}<button class="btn sm">${d.ic('plus')}Ajouter</button></form></section>
      </div>
      <p class="hint" id="obMsg" role="status"></p>`;
    app.querySelector('.obz-foot').innerHTML = navFoot(o, 'structure');
    app.querySelectorAll('.obz-add').forEach((f) => { f.onsubmit = async (e) => {
      e.preventDefault();
      const name = f.querySelector('input').value.trim(); if (!name) return;
      const sel = f.querySelector('select');
      try { await rpc('save_unit', { p_org: o.id, p_kind: f.dataset.kind, p_name: name, p_parent: sel && sel.value ? sel.value : null }); stepStructure(app, o); }
      catch (x) { app.querySelector('#obMsg').textContent = x.message; }
    }; });
    app.querySelectorAll('[data-del]').forEach((b) => { b.onclick = async () => { try { await rpc('delete_unit', { p_id: b.dataset.del }); stepStructure(app, o); } catch (x) { app.querySelector('#obMsg').textContent = x.message; } }; });
    app.querySelector('#obzNext').onclick = () => advance(o, 'structure');
  }

  /* ---------- 4. Connaissances : le module Documents existant ---------- */
  function stepKnowledge(app, o) {
    const flow = [['file-arrow-up', 'Document'], ['scan', 'Extraction'], ['tag', 'Classification'], ['lightbulb', 'Connaissances'], ['bookmark-simple', 'Page et source'], ['user-check', 'Validation humaine']];
    app.innerHTML = frame(o, 'connaissances', `
      <h1>Importer vos connaissances</h1>
      <p class="obz-lede">Procédures, fiches produits, guides de vente, règles internes. Arbor n’invente rien : chaque connaissance garde son document, sa version, sa page et l’extrait exact. Rien n’est utilisé avant ta validation ; les règles sensibles exigent un manager ou un administrateur.</p>
      <ol class="obz-flow" aria-label="Ce que devient un document">${flow.map(([icn, l]) => `<li>${d.ic(icn)}<span>${l}</span></li>`).join('')}</ol>
      <div id="obDocs" class="obz-embed"></div>`, navFoot(o, 'connaissances'));
    if (window.OrgDocs) OrgDocs.render(app.querySelector('#obDocs'), o, '', d, '');
    app.querySelector('#obzNext').onclick = () => advance(o, 'connaissances');
  }

  /* ---------- 5. Compétences : éditeur complet (aussi utilisé par l'onglet Compétences) ---------- */
  async function skillsEditor(box, o, { onChange } = {}) {
    box.innerHTML = '<p class="hint">Chargement…</p>';
    let skills = [], links = [], ks = [], us = [], su = [], has007 = true;
    try {
      [skills, links, ks] = await Promise.all([
        Tutor.rest('/rest/v1/skills', { method: 'GET', query: `?org_id=eq.${q(o.id)}&select=id,name,description,importance&order=created_at` }).catch((e) => { if (!missing(e)) throw e; has007 = false; return Tutor.rest('/rest/v1/skills', { method: 'GET', query: `?org_id=eq.${q(o.id)}&select=id,name,description&order=created_at` }); }),
        Tutor.rest('/rest/v1/skill_knowledge', { method: 'GET', query: `?org_id=eq.${q(o.id)}&select=skill_id,knowledge_id` }),
        Tutor.rest('/rest/v1/knowledge_nodes', { method: 'GET', query: `?org_id=eq.${q(o.id)}&status=eq.valide&select=id,title,kind&order=created_at` }),
      ]);
      if (has007) [us, su] = await Promise.all([units(o.id).catch(() => []), Tutor.rest('/rest/v1/skill_units', { method: 'GET', query: `?org_id=eq.${q(o.id)}&select=skill_id,unit_id` }).catch(() => [])]);
    } catch (e) { box.innerHTML = `<p class="hint">${d.esc(e.message)}</p>`; return; }
    const kt = new Map(ks.map((k) => [k.id, k.title]));
    const teams = us.filter((u) => u.kind === 'equipe');
    const imp = (s) => (IMPORTANCE.find(([v]) => v === (s.importance || 2)) || IMPORTANCE[1])[1];
    const skillRow = (s) => `<li class="sk-row" data-sk="${s.id}">
        <div class="sk-main"><b>${d.esc(s.name)}</b>${s.description ? `<small>${d.esc(s.description)}</small>` : ''}
          <small class="sk-k">${links.filter((l) => l.skill_id === s.id).map((l) => d.esc(kt.get(l.knowledge_id) || '')).filter(Boolean).join(' · ') || 'Aucune connaissance liée'}</small></div>
        <div class="sk-meta">
          ${has007 ? `<select aria-label="Importance de ${d.esc(s.name)}" data-imp>${IMPORTANCE.map(([v, l]) => `<option value="${v}" ${(s.importance || 2) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>` : `<span class="hint">${imp(s)}</span>`}
          ${teams.length ? `<details class="sk-teams"><summary>${su.filter((x) => x.skill_id === s.id).length || 'Toutes'} équipe${su.filter((x) => x.skill_id === s.id).length > 1 ? 's' : ''}</summary>${teams.map((t) => `<label><input type="checkbox" data-team="${t.id}" ${su.some((x) => x.skill_id === s.id && x.unit_id === t.id) ? 'checked' : ''} />${d.esc(t.name)}</label>`).join('')}</details>` : ''}
          <button type="button" class="icon-btn sm" data-rm aria-label="Supprimer ${d.esc(s.name)}">${d.ic('trash')}</button>
        </div></li>`;
    box.innerHTML = `
      ${skills.length ? `<ul class="org-list sk-list">${skills.map(skillRow).join('')}</ul>` : '<p class="hint">Aucune compétence pour l’instant.</p>'}
      <div class="row-btns"><button type="button" class="btn" id="skPropose" ${ks.length ? '' : 'disabled'}>${d.ic('sparkle')}Proposer 3 à 7 compétences</button><button type="button" class="btn ghost" id="skManual">${d.ic('plus')}En ajouter une</button></div>
      ${ks.length ? '' : '<p class="hint">Les propositions partent des connaissances validées : valide-en quelques-unes à l’étape précédente. Tu peux déjà en ajouter à la main.</p>'}
      <p class="hint" id="skMsg" role="status"></p><div id="skProps"></div>
      <form class="obz-form sk-new" id="skNew" hidden>
        <div class="field"><label for="skName">Compétence</label><input id="skName" maxlength="160" placeholder="Accueillir un client" /></div>
        <div class="field"><label for="skDesc">Ce qu’on observe <span class="optional">facultatif</span></label><input id="skDesc" maxlength="300" placeholder="Salue dans les 30 secondes, propose son aide" /></div>
        ${ks.length ? `<fieldset class="field"><legend>Connaissances nécessaires</legend><div class="sk-kpick">${ks.map((k) => `<label><input type="checkbox" value="${k.id}" />${d.esc(k.title)}</label>`).join('')}</div></fieldset>` : ''}
        <div class="row-btns"><button class="btn sm">${d.ic('check')}Ajouter</button></div>
      </form>`;
    const msg = box.querySelector('#skMsg');
    const reload = () => { skillsEditor(box, o, { onChange }); onChange && onChange(); };
    async function addSkill(s, kids) {
      const body = { org_id: o.id, name: s.name, description: s.description || '', created_by: Tutor.userId(), ...(has007 && s.importance ? { importance: s.importance } : {}) };
      const [row] = await Tutor.rest('/rest/v1/skills', { body, headers: { Prefer: 'return=representation' } });
      if (kids.length) await Tutor.rest('/rest/v1/skill_knowledge', { body: kids.map((k) => ({ org_id: o.id, skill_id: row.id, knowledge_id: k })) });
    }
    box.querySelectorAll('.sk-row').forEach((li) => {
      const id = li.dataset.sk;
      const sel = li.querySelector('[data-imp]');
      if (sel) sel.onchange = async () => { try { await Tutor.rest('/rest/v1/skills', { method: 'PATCH', query: `?id=eq.${q(id)}`, body: { importance: Number(sel.value) } }); d.toast('Importance enregistrée', 'success'); } catch (x) { d.toast(x.message, 'error'); } };
      li.querySelectorAll('[data-team]').forEach((c) => { c.onchange = async () => {
        try {
          if (c.checked) await Tutor.rest('/rest/v1/skill_units', { body: { org_id: o.id, skill_id: id, unit_id: c.dataset.team } });
          else await Tutor.rest('/rest/v1/skill_units', { method: 'DELETE', query: `?skill_id=eq.${q(id)}&unit_id=eq.${q(c.dataset.team)}` });
        } catch (x) { c.checked = !c.checked; d.toast(x.message, 'error'); }
      }; });
      li.querySelector('[data-rm]').onclick = async () => {
        if (!confirm('Supprimer cette compétence ? Les preuves déjà obtenues restent enregistrées.')) return;
        try { await Tutor.rest('/rest/v1/skills', { method: 'DELETE', query: `?id=eq.${q(id)}` }); reload(); } catch (x) { d.toast(missing(x) ? 'La suppression demande la migration 007.' : x.message, 'error'); }
      };
    });
    box.querySelector('#skManual').onclick = () => { const f = box.querySelector('#skNew'); f.hidden = !f.hidden; if (!f.hidden) f.querySelector('#skName').focus(); };
    box.querySelector('#skNew').onsubmit = async (e) => {
      e.preventDefault();
      const name = box.querySelector('#skName').value.trim(); if (name.length < 2) { box.querySelector('#skName').focus(); return; }
      try { await addSkill({ name, description: box.querySelector('#skDesc').value.trim(), importance: 2 }, [...box.querySelectorAll('.sk-kpick input:checked')].map((c) => c.value)); d.toast('Compétence ajoutée', 'success'); reload(); }
      catch (x) { msg.textContent = x.message; }
    };
    box.querySelector('#skPropose').onclick = async () => {
      msg.textContent = 'Analyse des connaissances validées…';
      let r;
      try { r = await OrgLearn.srv({ task: 'competences', org: o.id }, (m) => { msg.textContent = m; }); } catch (x) { msg.textContent = x.message; return; }
      const props = (r.skills || []).filter((s) => !skills.some((x) => x.name.toLowerCase() === s.name.toLowerCase())).slice(0, 7);
      msg.textContent = props.length ? 'Propositions : garde, ajuste l’importance ou écarte. Rien n’est ajouté sans ton accord.' : 'Aucune nouvelle proposition à partir des connaissances validées.';
      const pb = box.querySelector('#skProps');
      pb.innerHTML = `<ul class="org-list sk-props">${props.map((s, i) => `<li data-p="${i}"><span><b>${d.esc(s.name)}</b><small>${d.esc(s.description || '')}</small><small class="sk-k">${s.knowledge.map((k) => d.esc(kt.get(k) || '')).join(' · ')}</small></span>
        <span class="sk-meta">${has007 ? `<select aria-label="Importance" data-pimp>${IMPORTANCE.map(([v, l]) => `<option value="${v}" ${v === 2 ? 'selected' : ''}>${l}</option>`).join('')}</select>` : ''}<button type="button" class="btn sm" data-keep>${d.ic('plus')}Garder</button><button type="button" class="icon-btn sm" data-drop aria-label="Écarter">${d.ic('x')}</button></span></li>`).join('')}</ul>`;
      pb.querySelectorAll('[data-p]').forEach((li) => {
        const s = props[Number(li.dataset.p)];
        li.querySelector('[data-drop]').onclick = () => li.remove();
        li.querySelector('[data-keep]').onclick = async (ev) => {
          ev.target.disabled = true;
          const im = li.querySelector('[data-pimp]');
          try { await addSkill({ ...s, importance: im ? Number(im.value) : 2 }, s.knowledge); li.remove(); d.toast('Compétence ajoutée', 'success'); if (!pb.querySelector('[data-p]')) reload(); }
          catch (x) { ev.target.disabled = false; d.toast(x.message, 'error'); }
        };
      });
    };
  }
  function stepSkills(app, o) {
    app.innerHTML = frame(o, 'competences', `
      <h1>Les compétences attendues</h1>
      <p class="obz-lede">Une compétence est une capacité observable au travail, reliée aux connaissances qu’elle demande. Arbor en propose à partir de ce que tu as validé ; tu modifies, écartes, ajoutes, et tu dis ce qui est essentiel.</p>
      <div id="obSkills"></div>`, navFoot(o, 'competences'));
    skillsEditor(app.querySelector('#obSkills'), o);
    app.querySelector('#obzNext').onclick = () => advance(o, 'competences');
  }

  /* ---------- 6. Invitations ---------- */
  async function inviteBox(box, o) {
    let us = [], invs = [], has007 = true;
    try { us = await units(o.id); } catch (e) { has007 = !missing(e); }
    try { invs = await Tutor.rest('/rest/v1/invitations', { method: 'GET', query: `?org_id=eq.${q(o.id)}&accepted_at=is.null${has007 ? '&revoked_at=is.null' : ''}&select=id,email,role,expires_at${has007 ? ',unit_id' : ''}&order=created_at` }); } catch (e) { invs = []; }
    const teams = us.filter((u) => u.kind === 'equipe' || u.kind === 'etablissement');
    const roles = Object.entries(Org.ROLES).filter(([k]) => k !== 'admin' || o.role === 'admin');
    const uname = (id) => (us.find((u) => u.id === id) || {}).name || '';
    const expired = (i) => new Date(i.expires_at) < new Date();
    box.innerHTML = `
      <form class="obz-form obz-invite" id="ivForm" novalidate>
        <div class="field"><label for="ivEmail">Adresse e-mail</label><input id="ivEmail" type="email" inputmode="email" autocapitalize="off" placeholder="prenom.nom@entreprise.fr" /></div>
        <div class="obz-two">
          <div class="field"><label for="ivRole">Rôle</label><select id="ivRole">${roles.map(([k, l]) => `<option value="${k}" ${k === 'member' ? 'selected' : ''}>${l} : ${ROLE_HELP[k]}</option>`).join('')}</select></div>
          ${teams.length ? `<div class="field"><label for="ivUnit">Équipe <span class="optional">facultatif</span></label><select id="ivUnit"><option value="">Aucune</option>${teams.map((t) => `<option value="${t.id}">${d.esc(t.name)}</option>`).join('')}</select></div>` : ''}
        </div>
        <div class="row-btns"><button class="btn">${d.ic('link')}Créer le lien d’invitation</button></div>
        <p class="wel-form-err" id="ivErr" role="alert" hidden></p>
        <div id="ivOut" hidden></div>
      </form>
      <p class="hint">Le lien vaut pour cette adresse seulement, une fois, pendant 7 jours. Arbor ne l’envoie pas lui-même : partage-le par ta messagerie (bouton ci-dessous).</p>
      ${invs.length ? `<h2 class="obz-h2">En attente <small class="num">${invs.length}</small></h2><ul class="org-list">${invs.map((i) => `<li><span>${d.esc(i.email)}<small> · ${Org.ROLES[i.role] || i.role}${i.unit_id ? ` · ${d.esc(uname(i.unit_id))}` : ''}${expired(i) ? ' · <b>expirée</b>' : ` · jusqu’au ${new Date(i.expires_at).toLocaleDateString('fr-FR')}`}</small></span><button type="button" class="btn ghost sm" data-revoke="${i.id}">Annuler</button></li>`).join('')}</ul>` : ''}`;
    box.querySelector('#ivForm').onsubmit = async (e) => {
      e.preventDefault();
      const email = box.querySelector('#ivEmail').value.trim().toLowerCase(), err = box.querySelector('#ivErr'), out = box.querySelector('#ivOut');
      err.hidden = true;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { err.hidden = false; err.textContent = 'Indique une adresse e-mail valide.'; return; }
      const role = box.querySelector('#ivRole').value, unit = box.querySelector('#ivUnit') ? box.querySelector('#ivUnit').value : '';
      try {
        const token = await rpc('create_invitation', { p_org: o.id, p_email: email, p_role: role, ...(unit ? { p_unit: unit } : {}) });
        const link = `${location.origin}${location.pathname}#/rejoindre/${token}`;
        const text = `Bonjour, je t’invite à rejoindre ${o.name} sur Arbor pour te former. Ouvre ce lien sur ton téléphone et connecte-toi avec ${email} : ${link}`;
        out.hidden = false;
        out.innerHTML = `<p><b>Invitation prête pour ${d.esc(email)}.</b> Ce lien ne sera plus affiché ensuite.</p><div class="row-btns"><input id="oiLink" readonly value="${d.esc(link)}" aria-label="Lien d’invitation" /></div>
          <div class="row-btns"><button type="button" class="btn sm" id="ivCopy">${d.ic('copy')}Copier</button>${navigator.share ? `<button type="button" class="btn ghost sm" id="ivShare">${d.ic('share-network')}Partager</button>` : ''}<a class="btn ghost sm" href="mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Invitation : ${o.name} sur Arbor`)}&body=${encodeURIComponent(text)}">${d.ic('envelope-simple')}Ouvrir ma messagerie</a></div>`;
        out.querySelector('#ivCopy').onclick = () => { (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(() => d.toast('Lien copié', 'success'), () => { const i = out.querySelector('#oiLink'); i.select(); }); };
        const sh = out.querySelector('#ivShare'); if (sh) sh.onclick = () => navigator.share({ title: `Invitation : ${o.name}`, text, url: link }).catch(() => {});
        if (window.OrgEngines) OrgEngines.emailInvite(out, o, email, token, d);
        box.querySelector('#ivEmail').value = '';
      } catch (x) {
        err.hidden = false;
        err.textContent = /déjà partie/.test(x.message) ? 'Cette personne fait déjà partie de l’organisation.' : /administrateur/.test(x.message) ? 'Seul un administrateur peut inviter un administrateur.' : x.message;
      }
    };
    box.querySelectorAll('[data-revoke]').forEach((b) => { b.onclick = async () => { try { await rpc('revoke_invitation', { p_id: b.dataset.revoke }); d.toast('Invitation annulée', 'success'); inviteBox(box, o); } catch (x) { d.toast(x.message, 'error'); } }; });
  }
  function stepInvites(app, o) {
    app.innerHTML = frame(o, 'invitations', `
      <h1>Inviter les collaborateurs</h1>
      <p class="obz-lede">Choisis le rôle et l’équipe de chaque personne. Un manager suit son équipe ; un collaborateur apprend, sans rien configurer.</p>
      <div id="obInv"></div>`, navFoot(o, 'invitations', { primary: 'Terminer' }));
    inviteBox(app.querySelector('#obInv'), o);
    app.querySelector('#obzNext').onclick = async () => {
      if (advancing) return;
      advancing = true; const b = app.querySelector('#obzNext'); b.disabled = true; clearSaveError();
      try {
        await withTimeout(setup(o, { step: 'fin', done: true, doneAt: Date.now() }));
        await withTimeout(rpc('mark_onboarded', { p_org: o.id })).catch((e) => { if (!missing(e)) throw e; });
        advancing = false;
        d.go(`#/org/${o.id}/configurer/fin`);
      } catch (e) { advancing = false; saveError(e); }
    };
  }

  /* ---------- Fin : ce qui est prêt, et la première activité ---------- */
  async function stepDone(app, o) {
    let n = { k: 0, kv: 0, s: 0, m: 0 };
    try {
      const [ks, ss, ms] = await Promise.all([
        Tutor.rest('/rest/v1/knowledge_nodes', { method: 'GET', query: `?org_id=eq.${q(o.id)}&select=status` }),
        Tutor.rest('/rest/v1/skills', { method: 'GET', query: `?org_id=eq.${q(o.id)}&select=id` }),
        Org.members(o.id),
      ]);
      n = { k: ks.length, kv: ks.filter((k) => k.status === 'valide').length, s: ss.length, m: ms.length };
    } catch (e) { /* hors ligne : la liste reste générique */ }
    const item = (ok, icn, t, href, todo) => `<li class="${ok ? 'ok' : ''}">${d.ic(ok ? 'check-circle' : icn, true)}<span><b>${t}</b>${!ok ? `<a href="${href}">${todo}</a>` : ''}</span></li>`;
    app.innerHTML = `<section class="obz obz-end">
      <div class="obz-body">
        <span class="obz-badge">${d.ic('confetti', true)}</span>
        <h1>${d.esc(o.name)} est prête</h1>
        <p class="obz-lede">Voici où tu en es. Ce qui manque se reprend à tout moment depuis l’accueil de l’organisation.</p>
        <ul class="obz-check">
          ${item(n.kv > 0, 'files', `${n.kv} connaissance${n.kv > 1 ? 's' : ''} validée${n.kv > 1 ? 's' : ''}${n.k > n.kv ? ` sur ${n.k}` : ''}`, `#/org/${o.id}/documents`, n.k ? 'Valider les propositions' : 'Importer un document')}
          ${item(n.s > 0, 'target', `${n.s} compétence${n.s > 1 ? 's' : ''}`, `#/org/${o.id}/competences`, 'Définir une compétence')}
          ${item(n.m > 1, 'users-three', `${n.m} membre${n.m > 1 ? 's' : ''}`, `#/org/${o.id}/configurer/invitations`, 'Inviter quelqu’un')}
        </ul>
        <div class="obz-next">
          ${n.kv > 0 ? `<a class="btn big" href="#/org/${o.id}/mystere">${d.ic('storefront', true)}Essayer une simulation client</a><a class="btn big ghost" href="#/org/${o.id}/diagnostic">${d.ic('target')}Voir le diagnostic d’un collaborateur</a>`
            : `<a class="btn big" href="#/org/${o.id}/documents">${d.ic('file-arrow-up', true)}Importer un premier document</a>`}
          <a class="link-btn" href="#/org/${o.id}">Aller à l’accueil de l’organisation</a>
        </div>
        <p class="hint">La simulation et le diagnostic s’appuient seulement sur les connaissances validées. Les essayer toi-même te montre ce que vivront tes collaborateurs.</p>
      </div></section>`;
  }

  /* ---------- Arrivée d'un collaborateur (phase 5) ---------- */
  async function arrival(app, o, step = 0) {
    let skills = [], unitName = o.unit || '';
    try { skills = await Tutor.rest('/rest/v1/skills', { method: 'GET', query: `?org_id=eq.${q(o.id)}&select=name,description&order=created_at&limit=7` }); } catch (e) { skills = []; }
    const role = Org.ROLES[o.role] || o.role;
    // Une seule page : on commence tout de suite ; la confidentialité reste consultable en un geste
    app.innerHTML = `<section class="obz obz-arrival">
      <div class="obz-body">
        <span class="obz-badge">${(window.Mascot && Mascot.mini({ size: 60, mood: 'happy' })) || d.ic('hand-waving', true)}</span>
        <h1>Bienvenue dans ${d.esc(o.name)}</h1>
        <p class="obz-lede">Tu rejoins l’espace de formation en tant que <b>${d.esc(role)}</b>${unitName ? `, équipe <b>${d.esc(unitName)}</b>` : ''}.</p>
        <p class="obz-promise"><b>Tes résultats t’aident à progresser. Ton espace personnel reste privé.</b></p>
        ${skills.length ? `<p class="hint">Au programme : ${skills.slice(0, 4).map((s) => d.esc(s.name)).join(', ')}${skills.length > 4 ? '…' : ''}.</p>` : ''}
        <details class="obz-privacy-box"><summary>${d.ic('shield-check')}Ce qui est observé, et qui le voit</summary>
          <ul class="obz-privacy">
            <li>${d.ic('check-circle', true)}<span><b>Observé</b>Tes réponses au diagnostic, ta confiance déclarée, tes simulations et leur débrief, dans cet espace seulement.</span></li>
            <li>${d.ic('users-three', true)}<span><b>Qui voit tes résultats</b>Toi, et les managers et administrateurs de ${d.esc(o.name)}. Tes collègues voient seulement ton rang et tes trophées, jamais tes erreurs.</span></li>
            <li>${d.ic('lock-simple', true)}<span><b>Jamais visible</b>Ton espace personnel Student (tes cours, tes révisions) reste sur ton appareil. ${d.esc(o.name)} n’y a pas accès.</span></li>
          </ul></details>
      </div>
      <footer class="obz-foot"><span></span><button class="btn big" id="arGo">${d.ic('play', true)}C’est parti</button></footer></section>`;
    void step;
    const done = async (to) => { await rpc('mark_onboarded', { p_org: o.id }).catch(() => {}); o.onboarded = true; await Org.refresh().catch(() => {}); if (window.Journey) Journey.set({ workspace: Journey.get().workspace || 'business' }); d.go(to); };
    app.querySelector('#arGo').onclick = () => done(`#/org/${o.id}`);
  }

  /* ---------- Point d'entrée ---------- */
  async function wizard(app, o, step, deps) {
    d = deps;
    if (!window.Tutor || !Tutor.signedIn()) { app.innerHTML = `<section class="sec org-join"><h1>Créer une organisation</h1><p>Une organisation a besoin d’un compte (gratuit). Tes cours personnels restent sur cet appareil.</p><div class="row-btns"><button class="btn" id="obLogin">${d.ic('sign-in')}Se connecter ou créer un compte</button></div></section>`; app.querySelector('#obLogin').onclick = () => Welcome.auth({ after: () => wizard(app, o, step, deps) }, 'signup'); return; }
    if (!o) return stepInfos(app, null);
    if (o.role !== 'admin') { app.innerHTML = `<section class="sec"><p class="hint">La configuration de l’organisation est réservée aux administrateurs.</p><div class="row-btns"><a class="btn ghost" href="#/org/${o.id}">Retour</a></div></section>`; return; }
    const s = step || (o.setup && o.setup.step) || 'infos';
    // informations déjà enregistrées (taille, pays, langue, objectifs) pour préremplir l'étape
    if (s === 'infos' || s === 'objectifs') {
      try { const [row] = await Tutor.rest('/rest/v1/organizations', { method: 'GET', query: `?id=eq.${q(o.id)}&select=*` }); if (row) o = { ...o, ...row, role: o.role, owner: o.owner }; } catch (e) { /* on garde ce qu'on sait */ }
    }
    if (s === 'fin') return stepDone(app, o);
    return ({ infos: stepInfos, objectifs: stepGoals, structure: stepStructure, connaissances: stepKnowledge, competences: stepSkills, invitations: stepInvites }[s] || stepInfos)(app, o);
  }
  // Bannière de reprise sur l'accueil de l'organisation (administrateur, configuration commencée et non terminée)
  function resumeBanner(o, deps) {
    d = deps || d;
    const st = o.setup || {};
    if (o.role !== 'admin' || !st.step || st.done) return '';
    // mise en route express (3 étapes)
    if (st.express) return `<a class="obz-resume" href="#/org/${o.id}/demarrer/${st.step === 'experience' ? 'experience' : 'savoir'}">${d.ic('arrow-clockwise')}<span><b>Reprendre la mise en route</b><small>${st.step === 'experience' ? 'Étape 3 sur 3 : première expérience' : 'Étape 2 sur 3 : premier savoir'}</small></span>${d.ic('caret-right')}</a>`;
    const i = Math.max(0, STEPS.findIndex(([k]) => k === st.step));
    return `<a class="obz-resume" href="#/org/${o.id}/configurer/${st.step}">${d.ic('arrow-clockwise')}<span><b>Reprendre la configuration</b><small>Étape ${i + 1} sur ${STEPS.length} : ${STEPS[i][2]}</small></span>${d.ic('caret-right')}</a>`;
  }

  // Outils de l'app (échappement, icônes, navigation), donnés par le routeur de l'espace avant tout appel
  const use = (deps) => { d = deps; };
  window.OrgOnboarding = { use, wizard, arrival, skillsEditor, inviteBox, resumeBanner, STEPS };
})();
