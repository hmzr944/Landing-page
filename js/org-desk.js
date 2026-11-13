/* Arbor Business sur ordinateur (docs/desktop-experience.md, D14) : barre latérale ancrée (repliable), barre supérieure
   contextuelle (fil d'Ariane, recherche, action principale), recherche globale Ctrl/Cmd + K sur les données réellement
   lisibles par la personne (la base filtre par RLS), menus d'espace et de profil, centre d'aide.
   Sur téléphone et tablette, rien de tout cela ne s'impose : l'en-tête existant reste (CSS, sous 1024 px).
   Aucune donnée inventée : la recherche ne montre que ce que la base renvoie. Pas de notifications (aucun système réel). */
(function () {
  let d = null, org = null, nav = [];
  const q = (s) => encodeURIComponent(s);
  const K_SIDE = 'arbor:side';
  const lead = (o) => ['admin', 'manager'].includes(o.role);
  const content = (o) => ['admin', 'manager', 'expert'].includes(o.role);
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const ROLE = { admin: 'Administrateur', manager: 'Manager', expert: 'Expert métier', member: 'Collaborateur' };

  // ---------- Barre latérale repliable (préférence mémorisée sur l'appareil) ----------
  const compact = () => { try { return localStorage.getItem(K_SIDE) === 'compact'; } catch (e) { return false; } };
  function setCompact(on) {
    try { localStorage.setItem(K_SIDE, on ? 'compact' : 'full'); } catch (e) { /* stockage indisponible : le choix vaut pour la session */ }
    document.documentElement.classList.toggle('side-compact', on);
    document.querySelectorAll('[data-side-toggle]').forEach((b) => { b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Déplier la barre latérale' : 'Replier la barre latérale'); });
  }
  document.documentElement.classList.toggle('side-compact', compact());

  /* ---------- Morceaux de la barre latérale ---------- */
  function brand() {
    return `<div class="desk-brand"><a class="desk-logo" href="#/" aria-label="Arbor, espace personnel"><svg viewBox="0 0 48 48" aria-hidden="true"><path fill="currentColor" d="M19 20C11 20 5.5 26 5.5 33c0 7.2 5.3 12 12.1 12 4.2 0 7.4-2 9.4-5 .6 3 2.8 5 6 5h2v-5.2h-.9c-1 0-1.4-.6-1.4-2V28c0-5.4-4.7-8-13.7-8Zm-.6 19.6c-3.6 0-6.2-2.8-6.2-6.6s2.6-6.6 6.2-6.6 6.2 2.8 6.2 6.6-2.6 6.6-6.2 6.6Z"/><path fill="currentColor" opacity=".75" d="M32.7 34V22c0-5.6 1.5-9.8 4.9-13.4l2 1.8c-2.8 3.2-4.2 7-4.2 12V34Z"/><path fill="#2DD4BF" d="M38.2 9.4C39.4 3 44.6.6 47.6 1.4c.2 6.8-3.6 11.2-8.8 10.8Z"/></svg><span>Arbor</span></a>
      <button type="button" class="desk-ico" data-side-toggle aria-pressed="${compact()}" aria-label="${compact() ? 'Déplier' : 'Replier'} la barre latérale" title="Replier ou déplier">${d.ic('sidebar-simple')}</button></div>`;
  }
  function spaceBtn(o) {
    return `<button type="button" class="desk-space" data-space-menu aria-haspopup="menu" aria-expanded="false" title="Changer d’espace">
        <span class="desk-av org" aria-hidden="true">${d.esc((o.name || '?').slice(0, 1).toUpperCase())}</span>
        <span class="desk-sp-t"><b>${d.esc(o.name)}</b><small>${ROLE[o.role] || o.role}</small></span>${d.ic('caret-up-down')}</button>`;
  }
  function foot(o) {
    const email = (window.Tutor && Tutor.lastEmail && Tutor.lastEmail()) || '';
    return `<div class="desk-foot-links">
        <button type="button" class="desk-link" data-desk-help title="Centre d’aide">${d.ic('lifebuoy')}<span>Centre d’aide</span></button>
        ${window.Feedback ? `<button type="button" class="desk-link fb-link" data-org-feedback title="Donner mon avis">${d.ic('chat-teardrop-text')}<span>Donner mon avis</span></button>` : ''}
        ${o.role === 'admin' && window.OrgShell ? `<a class="desk-link" href="#/org/${o.id}/parametres" title="Paramètres" data-desk-set ${/\/parametres/.test(location.hash) ? 'aria-current="page"' : ''}>${d.ic('gear-six')}<span>Paramètres</span></a>` : ''}
      </div>
      <button type="button" class="desk-me" data-me-menu aria-haspopup="menu" aria-expanded="false" title="${d.esc(email || 'Mon compte')}">
        <span class="desk-av" aria-hidden="true">${d.esc((email || '?').slice(0, 1).toUpperCase())}</span>
        <span class="desk-sp-t"><b>${d.esc(email ? email.split('@')[0] : 'Mon compte')}</b><small>${d.esc(email || ROLE[o.role] || '')}</small></span>${d.ic('dots-three')}</button>`;
  }

  /* ---------- Barre supérieure : fil d'Ariane, recherche, action principale ---------- */
  const SUBS = { entrainer: 'Entraîner', parametres: 'Paramètres', competences: 'Compétences', suivi: 'Suivi', intelligence: 'Diagnostiquer', documents: 'Documents', scenarios: 'Scénarios', apercu: 'Aperçu collaborateur', diagnostic: 'Diagnostic', mystere: 'Client mystère', resultats: 'Mon parcours', canopee: 'Canopée', configurer: 'Configuration détaillée' };
  const DOORS = { dicter: 'Dire ce que je sais', photo: 'Photographier', conversation: 'Discuter avec Pousse', epreuve: 'Commencer par une épreuve', importer: 'Importer un document' };
  function action(o, section) {
    if (section === 'accueil' && lead(o)) return ['invite', 'user-plus', 'Inviter'];
    if (section === 'equipe' && lead(o)) return ['invite', 'user-plus', 'Ajouter un collaborateur'];
    if (section === 'savoir' && content(o) && window.OrgDocs) return ['doc', 'file-plus', 'Nouveau document'];
    if (section === 'developper' && lead(o) && window.OrgEngines) return ['scenario', 'plus', 'Nouveau scénario'];
    return null;
  }
  function top(o, section, tab, sub, groups) {
    nav = groups.flatMap(([, items]) => items);
    const sec = nav.find(([k]) => k === section);
    const crumbs = [['Arbor Business', null], [o.name, `#/org/${o.id}`]];
    if (sec && section !== 'accueil') crumbs.push([sec[2], `#/org/${o.id}/${section}`]);
    else if (sec) crumbs.push([sec[2], null]);
    if (!sec && SUBS[section]) crumbs.push([SUBS[section], null]);
    const subLabel = !sec ? '' : tab !== section && SUBS[tab] ? SUBS[tab] : (sub && (SUBS[sub] || DOORS[sub])) || (tab === 'suivi' && sub ? 'Fiche collaborateur' : '') || (tab === 'savoir' && sub ? 'Document' : '');
    if (subLabel) crumbs.push([subLabel, null]);
    const last = crumbs.length - 1;
    const act = action(o, section);
    const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    return `<div class="org-top" role="region" aria-label="Barre d’outils">
        <nav class="desk-crumbs" aria-label="Fil d’Ariane"><ol>${crumbs.map(([t, h], i) => `<li>${h && i !== last ? `<a href="${h}">${d.esc(t)}</a>` : `<span ${i === last ? 'aria-current="page"' : ''}>${d.esc(t)}</span>`}</li>`).join('')}</ol></nav>
        <div class="desk-tools">
          <button type="button" class="desk-search" data-cmdk aria-haspopup="dialog" aria-keyshortcuts="${mac ? 'Meta+K' : 'Control+K'}">${d.ic('magnifying-glass')}<span>Rechercher</span><kbd>${mac ? '⌘' : 'Ctrl'} K</kbd></button>
          ${act ? `<button type="button" class="btn desk-act" data-desk-act="${act[0]}">${d.ic(act[1], true)}${act[2]}</button>` : ''}
        </div></div>`;
  }

  /* ---------- Actions principales : aller à l'écran et donner le focus au bon champ ---------- */
  function reach(hash, sel) {
    if (location.hash !== hash) location.hash = hash;
    let n = 0;
    const tick = () => {
      const el = document.querySelector(sel);
      if (el) { const box = el.closest('form, section') || el; box.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); setTimeout(() => el.focus({ preventScroll: true }), 250); return; }
      if (++n < 60) setTimeout(tick, 100);
    };
    setTimeout(tick, 60);
  }
  function runAction(kind) {
    if (!org) return;
    if (kind === 'invite') return reach(`#/org/${org.id}/equipe`, '#ivEmail');
    if (kind === 'doc') return reach(`#/org/${org.id}/savoir`, '#dfTitle, #dfFile');
    if (kind === 'scenario') return reach(`#/org/${org.id}/developper/entrainer`, '#scKind');
  }

  /* ---------- Menus (espace, profil) ---------- */
  let menu = null;
  function closeMenu(focusBack = false) {
    if (!menu) return;
    const { el, btn } = menu; el.remove(); btn.setAttribute('aria-expanded', 'false'); menu = null;
    if (focusBack) btn.focus();
  }
  function openMenu(btn, items, label) {
    closeMenu();
    const el = document.createElement('div');
    el.className = 'desk-menu'; el.setAttribute('role', 'menu'); el.setAttribute('aria-label', label);
    el.innerHTML = items.map((it) => (it === '-' ? '<hr />' : it.head ? `<p class="desk-menu-h">${d.esc(it.head)}</p>` : `<button type="button" role="menuitem" ${it.current ? 'aria-current="true"' : ''} data-i="${items.indexOf(it)}">${d.ic(it.icon, !!it.current)}<span>${d.esc(it.t)}${it.s ? `<small>${d.esc(it.s)}</small>` : ''}</span>${it.current ? d.ic('check') : ''}</button>`)).join('');
    document.body.appendChild(el);
    const r = btn.getBoundingClientRect();
    const up = r.top > innerHeight / 2;
    el.style.left = `${Math.max(8, r.left)}px`; el.style.width = `${Math.max(232, r.width)}px`;
    if (up) el.style.bottom = `${innerHeight - r.top + 6}px`; else el.style.top = `${r.bottom + 6}px`;
    btn.setAttribute('aria-expanded', 'true');
    menu = { el, btn };
    const btns = [...el.querySelectorAll('button')];
    el.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (!b) return; const it = items[Number(b.dataset.i)]; closeMenu(); it.run(); });
    el.addEventListener('keydown', (e) => {
      const i = btns.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); btns[(i + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length].focus(); }
      else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); closeMenu(true); }
    });
    (btns.find((b) => b.getAttribute('aria-current')) || btns[0]).focus();
  }
  function spaceMenu(btn) {
    const cur = window.Org ? Org.space() : '';
    const orgs = window.Org ? Org.list() : [];
    openMenu(btn, [
      { head: 'Espaces' },
      { icon: 'user-circle', t: 'Espace personnel', s: 'Tes cours, sur cet appareil', current: cur === 'personal', run: () => { Org.setSpace('personal'); location.hash = '#/'; } },
      ...orgs.map((o) => ({ icon: 'buildings', t: o.name, s: ROLE[o.role] || o.role, current: cur === o.id, run: () => { Org.setSpace(o.id); location.hash = `#/org/${o.id}`; } })),
      '-',
      { icon: 'plus', t: 'Créer une organisation', run: () => { location.hash = '#/org/nouvelle'; } },
      { icon: 'door-open', t: 'Rejoindre avec une invitation', run: () => { location.hash = '#/rejoindre'; } },
    ], 'Changer d’espace');
  }
  function meMenu(btn) {
    const email = (window.Tutor && Tutor.lastEmail && Tutor.lastEmail()) || '';
    openMenu(btn, [
      ...(email ? [{ head: email }] : []),
      { icon: 'sliders-horizontal', t: 'Réglages de l’application', s: 'Thème, compte, sauvegarde', run: () => { const s = document.getElementById('settingsBtn'); if (s) s.click(); } },
      { icon: 'user-circle', t: 'Mon espace personnel', run: () => { if (window.Org) Org.setSpace('personal'); location.hash = '#/'; } },
      '-',
      { icon: 'sign-out', t: 'Se déconnecter', run: () => { if (window.Tutor) Tutor.signOut(); try { localStorage.removeItem('arbor:orgs'); } catch (e) { /* rien */ } location.hash = '#/'; location.reload(); } },
    ], 'Mon compte');
  }

  /* ---------- Centre d'aide : ce que fait chaque rubrique, raccourcis, confidentialité ---------- */
  function help() {
    const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    const R = [['gauge', 'Cockpit', 'Où en est l’organisation, ce qu’il faut faire aujourd’hui, comment l’équipe progresse.'], ['users-three', 'Mon équipe', 'Les personnes, leur progression, les invitations, les cordées et le mentorat.'], ['books', 'Base de savoir', 'Les documents de référence et les connaissances validées qui nourrissent tout le reste.'], ['plant', 'Développer', 'Diagnostiquer les besoins, comprendre, entraîner avec des scénarios, mesurer.'], ['student', 'Mon apprentissage', 'Votre propre progression, séparée des outils de gestion.']];
    d.openModal(`<h2 id="modalTitle">Centre d’aide</h2>
      <ul class="desk-help">${R.map(([i, t, s]) => `<li>${d.ic(i, true)}<span><b>${t}</b><small>${s}</small></span></li>`).join('')}</ul>
      <h3>Raccourcis clavier</h3>
      <ul class="desk-keys"><li><kbd>${mac ? '⌘' : 'Ctrl'}</kbd><kbd>K</kbd><span>Rechercher une personne, un document, une connaissance, une page</span></li><li><kbd>↑</kbd><kbd>↓</kbd><kbd>Entrée</kbd><span>Choisir un résultat</span></li><li><kbd>Échap</kbd><span>Fermer une fenêtre ou un menu</span></li></ul>
      <p class="hint">${d.ic('lock-simple')}Les chiffres viennent des preuves enregistrées dans votre organisation. L’espace personnel de chacun reste privé.</p>
      ${window.Feedback ? '<div class="row-btns"><button type="button" class="btn ghost" data-org-feedback-help>Donner mon avis</button></div>' : ''}`, (el) => {
      const f = el.querySelector('[data-org-feedback-help]');
      if (f) f.onclick = () => { d.closeModal(); Feedback.open({ space: 'business', org: { id: org.id, name: org.name }, deps: d }); };
    });
  }

  /* ---------- Recherche globale (Ctrl/Cmd + K) ---------- */
  const cache = new Map(); // org.id → { at, data }
  async function sources(o) {
    const c = cache.get(o.id);
    if (c && Date.now() - c.at < 120e3) return c.data;
    const get = (path, query) => Tutor.rest(path, { method: 'GET', query }).catch(() => null);
    const [ms, docs, ks, vs, skills] = await Promise.all([
      lead(o) ? get('/rest/v1/memberships', `?org_id=eq.${q(o.id)}&status=eq.active&select=user_id,role,email`) : null,
      content(o) ? get('/rest/v1/sources', `?org_id=eq.${q(o.id)}&select=id,title&order=title`) : null,
      content(o) ? get('/rest/v1/knowledge_nodes', `?org_id=eq.${q(o.id)}&status=in.(valide,propose)&select=id,title,status,source_version_id&limit=1000`) : null,
      content(o) ? get('/rest/v1/source_versions', `?select=id,source_id&limit=2000`) : null,
      lead(o) ? get('/rest/v1/skills', `?org_id=eq.${q(o.id)}&select=id,name&order=name`) : null,
    ]);
    const srcOf = new Map((vs || []).map((v) => [v.id, v.source_id]));
    const data = { ms: ms || [], docs: docs || [], ks: ks || [], skills: skills || [], srcOf, partial: [ms, docs, ks, skills].some((x, i) => x === null && [lead(o), content(o), content(o), lead(o)][i]) };
    cache.set(o.id, { at: Date.now(), data });
    return data;
  }
  function pages(o) {
    const base = `#/org/${o.id}`;
    const extra = [
      ...(lead(o) ? [['intelligence', 'brain', 'Diagnostiquer (Intelligence)'], ['developper/entrainer', 'barbell', 'Entraîner'], ['competences', 'list-checks', 'Compétences']] : []),
      ['diagnostic', 'target', 'Mon diagnostic'], ['mystere', 'storefront', 'Client mystère'], ['resultats', 'chart-line-up', 'Mon parcours'],
      ...(window.League ? [['canopee', 'tree', 'Canopée']] : []),
      ...(o.role === 'admin' && window.OrgShell ? [['parametres', 'gear-six', 'Paramètres']] : []),
    ];
    const seen = new Set();
    return [...nav.map(([k, i, l]) => [k, i, l]), ...extra].filter(([k]) => !seen.has(k) && seen.add(k)).map(([k, i, l]) => ({ g: 'Pages', icon: i, t: l, href: k === 'accueil' ? base : `${base}/${k}` }));
  }
  function actions(o) {
    return [
      ...(lead(o) ? [{ g: 'Actions', icon: 'user-plus', t: 'Inviter un collaborateur', run: () => runAction('invite') }] : []),
      ...(content(o) && window.OrgDocs ? [{ g: 'Actions', icon: 'file-plus', t: 'Ajouter un document', run: () => runAction('doc') }] : []),
      ...(lead(o) && window.OrgEngines ? [{ g: 'Actions', icon: 'plus', t: 'Concevoir un scénario', run: () => runAction('scenario') }] : []),
      ...(window.Feedback ? [{ g: 'Actions', icon: 'chat-teardrop-text', t: 'Donner mon avis', run: () => Feedback.open({ space: 'business', org: { id: o.id, name: o.name }, deps: d }) }] : []),
      { g: 'Actions', icon: 'swap', t: 'Changer d’espace', run: () => { const b = document.querySelector('[data-space-menu]'); if (b && b.offsetParent) spaceMenu(b); else if (window.Org) Org.openSwitcher(d); } },
      { g: 'Actions', icon: 'lifebuoy', t: 'Centre d’aide', run: help },
    ];
  }
  function score(text, words) {
    const t = norm(text);
    let s = 0;
    for (const w of words) { const i = t.indexOf(w); if (i < 0) return -1; s += i === 0 || /\W/.test(t[i - 1]) ? 2 : 1; }
    return s;
  }
  let box = null;
  async function palette() {
    if (!org || box) return;
    const o = org, opener = document.activeElement;
    box = document.createElement('div');
    box.className = 'cmdk-back';
    box.innerHTML = `<div class="cmdk" role="dialog" aria-modal="true" aria-label="Recherche globale">
        <div class="cmdk-in">${d.ic('magnifying-glass')}<input id="cmdkQ" type="text" role="combobox" aria-expanded="true" aria-controls="cmdkList" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="Rechercher une personne, un document, une connaissance, une page…" /><kbd>Échap</kbd></div>
        <div id="cmdkList" class="cmdk-list" role="listbox" aria-label="Résultats"></div>
        <p class="cmdk-foot" id="cmdkFoot"><span><kbd>↑</kbd><kbd>↓</kbd> naviguer</span><span><kbd>Entrée</kbd> ouvrir</span></p></div>`;
    document.body.appendChild(box);
    document.documentElement.classList.add('cmdk-open');
    const input = box.querySelector('#cmdkQ'), list = box.querySelector('#cmdkList'), footEl = box.querySelector('#cmdkFoot');
    let data = null, rows = [], active = 0;
    const close = () => { if (!box) return; box.remove(); box = null; document.documentElement.classList.remove('cmdk-open'); if (opener && opener.focus) opener.focus(); };
    const open = (r) => { close(); if (r.run) r.run(); else location.hash = r.href; };
    const paint = () => {
      const words = norm(input.value).split(/\s+/).filter(Boolean);
      const all = [...pages(o), ...actions(o)];
      if (data) {
        all.push(...data.ms.map((m) => ({ g: 'Collaborateurs', icon: 'user', t: m.email || 'Membre', s: ROLE[m.role] || m.role, href: `#/org/${o.id}/suivi/${m.user_id}` })));
        all.push(...data.docs.map((x) => ({ g: 'Documents', icon: 'file-text', t: x.title, href: `#/org/${o.id}/savoir/${x.id}` })));
        all.push(...data.ks.map((k) => { const sid = data.srcOf.get(k.source_version_id); return { g: 'Connaissances', icon: k.status === 'valide' ? 'seal-check' : 'hourglass-medium', t: k.title, s: k.status === 'valide' ? 'validée' : 'à valider', href: sid ? `#/org/${o.id}/savoir/${sid}` : `#/org/${o.id}/savoir` }; }));
        all.push(...data.skills.map((s) => ({ g: 'Compétences', icon: 'target', t: s.name, href: `#/org/${o.id}/competences` })));
      }
      const ORDER = ['Pages', 'Actions', 'Collaborateurs', 'Documents', 'Connaissances', 'Compétences'];
      const scored = words.length ? all.map((r) => ({ r, s: score(`${r.t} ${r.s || ''}`, words) })).filter((x) => x.s >= 0).sort((a, b) => b.s - a.s).map((x) => x.r) : all.filter((r) => r.g === 'Pages' || r.g === 'Actions');
      rows = ORDER.flatMap((g) => scored.filter((r) => r.g === g).slice(0, words.length ? 6 : 8));
      active = Math.min(active, Math.max(0, rows.length - 1));
      let html = '', last = '';
      rows.forEach((r, i) => {
        if (r.g !== last) { html += `<p class="cmdk-g" role="presentation">${r.g}</p>`; last = r.g; }
        html += `<div class="cmdk-row" role="option" id="cmdk-${i}" data-i="${i}" aria-selected="${i === active}">${d.ic(r.icon)}<span>${d.esc(r.t)}${r.s ? `<small>${d.esc(r.s)}</small>` : ''}</span>${r.run ? '<em>action</em>' : ''}</div>`;
      });
      list.innerHTML = html || `<p class="cmdk-empty">${data ? 'Aucun résultat.' : 'Aucun résultat dans les pages ; les données arrivent…'}</p>`;
      input.setAttribute('aria-activedescendant', rows.length ? `cmdk-${active}` : '');
      const cur = list.querySelector(`#cmdk-${active}`); if (cur) cur.scrollIntoView({ block: 'nearest' });
    };
    input.addEventListener('input', () => { active = 0; paint(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (rows.length) { active = (active + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length; paint(); } }
      else if (e.key === 'Enter') { e.preventDefault(); if (rows[active]) open(rows[active]); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Tab') e.preventDefault(); // le focus reste dans la recherche
    });
    list.addEventListener('mousemove', (e) => { const r = e.target.closest('.cmdk-row'); if (r && Number(r.dataset.i) !== active) { active = Number(r.dataset.i); list.querySelectorAll('.cmdk-row').forEach((x) => x.setAttribute('aria-selected', String(Number(x.dataset.i) === active))); } });
    list.addEventListener('click', (e) => { const r = e.target.closest('.cmdk-row'); if (r) open(rows[Number(r.dataset.i)]); });
    box.addEventListener('mousedown', (e) => { if (e.target === box) close(); });
    paint(); input.focus();
    try {
      data = await sources(o);
      if (box) { paint(); if (data.partial) footEl.insertAdjacentHTML('beforeend', '<span class="cmdk-warn">Certaines données n’ont pas pu être chargées.</span>'); }
    } catch (e) { if (box) footEl.insertAdjacentHTML('beforeend', '<span class="cmdk-warn">Recherche limitée aux pages : données indisponibles.</span>'); }
  }

  /* ---------- Écouteurs (une seule fois) ---------- */
  let bound = false;
  function bind() {
    if (bound) return; bound = true;
    document.addEventListener('click', (e) => {
      if (menu && !menu.el.contains(e.target) && !menu.btn.contains(e.target)) closeMenu();
      if (!document.documentElement.classList.contains('in-org')) return;
      const t = e.target;
      if (t.closest('[data-side-toggle]')) setCompact(!compact());
      else if (t.closest('[data-space-menu]')) { const b = t.closest('[data-space-menu]'); if (menu && menu.btn === b) closeMenu(); else spaceMenu(b); }
      else if (t.closest('[data-me-menu]')) { const b = t.closest('[data-me-menu]'); if (menu && menu.btn === b) closeMenu(); else meMenu(b); }
      else if (t.closest('[data-desk-help]')) help();
      else if (t.closest('[data-cmdk]')) palette();
      else if (t.closest('[data-desk-act]')) runAction(t.closest('[data-desk-act]').dataset.deskAct);
    });
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'k' || e.key === 'K') && document.documentElement.classList.contains('in-org') && org) { e.preventDefault(); if (box) box.querySelector('#cmdkQ').focus(); else palette(); }
    });
    window.addEventListener('hashchange', () => { closeMenu(); });
    window.addEventListener('resize', () => closeMenu());
  }

  // Appelé par l'en-tête de l'espace (org.js) à chaque écran
  function use(o, deps) { org = o; d = deps; bind(); }
  window.OrgDesk = { use, brand, spaceBtn, foot, top, palette, help, runAction, setCompact, _sources: sources };
})();
