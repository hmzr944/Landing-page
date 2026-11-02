/* Arbor - interface */
(function () {
  const { makeNode, makeSubject, normalize, find, pathTo, stats, walk, isDescendant, PALETTE, ICONS } = Store;
  const esc = MD.esc;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const ic = (name, fill) => `<i class="${fill ? 'ph-fill' : 'ph'} ph-${name}" aria-hidden="true"></i>`;
  const fmt = new Intl.NumberFormat('fr-FR');
  const plural = (n, one, many) => `${fmt.format(n)} ${n > 1 ? many : one}`;

  const state = Store.load();
  const app = $('#app');
  let view = { name: 'home' };
  let review = null; // session de révision en cours
  let treeFilter = '';
  let notesMode = 'preview';

  const save = () => Store.save(state);
  const subjectById = (id) => state.subjects.find((s) => s.id === id);
  const STATUS = {
    todo: { label: 'À apprendre' },
    doing: { label: 'En cours' },
    done: { label: 'Maîtrisé' },
  };
  const COLOR_NAMES = ['Cobalt', 'Corail', 'Orange brûlé', 'Sarcelle', 'Océan', 'Orchidée', 'Framboise', 'Olive'];
  const ICON_NAMES = {
    'book-open': 'Livre', brain: 'Cerveau', flask: 'Chimie', atom: 'Physique', 'globe-hemisphere-west': 'Géographie',
    bank: 'Histoire', scales: 'Droit', heartbeat: 'Médecine', calculator: 'Maths', 'chart-line-up': 'Économie',
    code: 'Informatique', translate: 'Langues', 'music-notes': 'Musique', palette: 'Arts', planet: 'Astronomie', leaf: 'Nature',
  };

  /* ---------- Thème & XP ---------- */
  const prefersDark = matchMedia('(prefers-color-scheme: dark)');
  const effectiveTheme = () => (state.settings.theme === 'auto' ? (prefersDark.matches ? 'dark' : 'light') : state.settings.theme);
  function applyTheme() {
    if (state.settings.theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = state.settings.theme;
    const dark = effectiveTheme() === 'dark';
    $('#themeBtn').innerHTML = ic(dark ? 'sun' : 'moon');
    $('#themeBtn').setAttribute('aria-label', dark ? 'Passer en thème clair' : 'Passer en thème sombre');
  }
  prefersDark.addEventListener('change', applyTheme);

  function renderXP(bump) {
    const lvl = Math.floor(state.xp / 100) + 1;
    $('#xpLevel').textContent = `Niv. ${lvl}`;
    $('#xpFill').style.transform = `scaleX(${(state.xp % 100) / 100})`;
    $('#xpNum').textContent = `${fmt.format(state.xp)} XP`;
    if (bump) { const x = $('#xp'); x.classList.remove('bump'); void x.offsetWidth; x.classList.add('bump'); }
  }
  function setStatus(node, status, origin) {
    const prev = node.status;
    node.status = status;
    if (status === 'done' && prev !== 'done') {
      const lvlBefore = Math.floor(state.xp / 100);
      state.xp += 10;
      renderXP(true);
      const r = origin && origin.getBoundingClientRect ? origin.getBoundingClientRect() : null;
      FX.confetti(r ? r.left + r.width / 2 : undefined, r ? r.top : undefined, 40);
      if (Math.floor(state.xp / 100) > lvlBefore) { FX.toast(`Niveau ${lvlBefore + 2} atteint`, 'success'); FX.confetti(undefined, undefined, 120); }
    }
    touch();
  }
  function touch() {
    const s = view.id && subjectById(view.id);
    if (s) s.updatedAt = Date.now();
    save();
  }

  /* ---------- Navigation (hash) ---------- */
  function go(hash) { if (location.hash !== hash) location.hash = hash; else route(); }
  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    const prev = view;
    if (parts[0] === 's' && subjectById(parts[1])) {
      const s = subjectById(parts[1]);
      const nodeId = parts[2] && find(s.root, parts[2]) ? parts[2] : s.root.id;
      const mode = ['fiche', 'carte', 'revision'].includes(parts[3]) ? parts[3] : 'fiche';
      if (mode !== 'revision' || prev.nodeId !== nodeId) review = null;
      view = { name: 'subject', id: s.id, nodeId, mode };
    } else {
      view = { name: 'home' };
      review = null;
    }
    render(prev);
  }
  const link = (sid, nid, mode = 'fiche') => `#/s/${sid}/${nid}/${mode}`;

  /* ---------- Rendu ---------- */
  function render(prev = {}) {
    // Une seule transition d'entrée, et seulement quand on change d'écran (pas à chaque clic dans l'arbre)
    const bigChange = prev.name !== view.name || prev.id !== view.id;
    if (view.name === 'home') renderHome();
    else renderSubject(bigChange);
    if (bigChange) {
      app.classList.remove('enter'); void app.offsetWidth; app.classList.add('enter');
      window.scrollTo({ top: 0 });
    }
  }

  function ring(pct, size = 56) {
    return `<div class="ring" style="--p:${pct};--s:${size}px" role="img" aria-label="${pct} % maîtrisé"><span>${pct}<small>%</small></span></div>`;
  }
  const bar = (pct) => `<div class="bar" aria-hidden="true"><span style="transform:scaleX(${pct / 100})"></span></div>`;

  function nextStep(root) {
    let next = null;
    walk(root, (n, d) => {
      if (next || (d === 0 && root.children.length)) return;
      if (!n.children.length && n.status !== 'done') next = n;
    });
    return next;
  }

  function renderHome() {
    document.documentElement.style.removeProperty('--accent');
    const subjects = state.subjects.slice().sort((a, b) => b.updatedAt - a.updatedAt);
    if (!subjects.length) {
      app.innerHTML = `
        <section class="home">
          <div class="empty-state">
            <span class="tile big">${ic('tree', true)}</span>
            <h1>Fais pousser ton premier arbre</h1>
            <p>Crée un sujet et découpe-le en parties, ou importe un PDF de cours pour qu’Arbor le structure à ta place.</p>
            <div class="row-btns center">
              <button class="btn" data-act="new-subject">${ic('plus')}Nouveau sujet</button>
              <button class="btn ghost" data-act="import-pdf">${ic('file-arrow-up')}Importer un PDF</button>
            </div>
          </div>
        </section>`;
      return;
    }
    const total = subjects.reduce((a, s) => a + stats(s.root).total, 0);
    const done = subjects.reduce((a, s) => a + stats(s.root).done, 0);
    const [first, ...rest] = subjects;
    const fs = stats(first.root);
    const next = nextStep(first.root);
    const branches = first.root.children.slice(0, 5);

    app.innerHTML = `
      <section class="home">
        <header class="home-head">
          <div>
            <h1>Tes sujets</h1>
            <p class="lede">${plural(total, 'partie', 'parties')} réparties dans ${plural(subjects.length, 'sujet', 'sujets')}, dont ${fmt.format(done)} déjà ${done > 1 ? 'maîtrisées' : 'maîtrisée'}.</p>
          </div>
          <button class="btn" data-act="new-subject">${ic('plus')}Nouveau sujet</button>
        </header>

        <div class="subject-grid">
          <article class="featured" style="--c:${first.color}" data-open="${first.id}">
            <div class="featured-main">
              <div class="featured-top">
                <span class="tile" style="--c:${first.color}">${ic(first.icon, true)}</span>
                <button class="icon-btn sm" data-act="edit-subject" data-id="${first.id}" aria-label="Modifier « ${esc(first.title)} »">${ic('pencil-simple')}</button>
              </div>
              <p class="kicker">Reprendre là où tu t’es arrêté</p>
              <h2><a href="${link(first.id, first.root.id)}" class="stretched">${esc(first.title)}</a></h2>
              <div class="featured-progress">
                ${bar(fs.pct)}
                <span class="num">${fs.done}/${fs.total}</span>
              </div>
              ${next ? `<a class="btn next-btn" href="${link(first.id, next.id)}">${ic('arrow-right')}<span>Étudier « ${esc(next.title)} »</span></a>`
                : fs.total ? `<p class="all-done">${ic('trophy', true)}Tout est maîtrisé dans ce sujet.</p>` : ''}
            </div>
            ${branches.length ? `<ul class="branches" aria-label="Grandes parties">
              ${branches.map((b) => {
                const bs = stats(b);
                return `<li><span class="sdot st-${b.children.length ? (bs.pct === 100 ? 'done' : bs.done || bs.doing ? 'doing' : 'todo') : b.status}" aria-hidden="true"></span>
                  <span class="b-title">${esc(b.title)}</span>
                  <span class="num">${b.children.length ? `${bs.pct} %` : STATUS[b.status].label}</span></li>`;
              }).join('')}
              ${first.root.children.length > 5 ? `<li class="more">et ${plural(first.root.children.length - 5, 'autre partie', 'autres parties')}</li>` : ''}
            </ul>` : ''}
          </article>

          ${rest.map((s, i) => {
            const st = stats(s.root);
            return `
            <article class="subject-card" style="--c:${s.color};--i:${i + 1}" data-open="${s.id}">
              <div class="featured-top">
                <span class="tile" style="--c:${s.color}">${ic(s.icon, true)}</span>
                <button class="icon-btn sm" data-act="edit-subject" data-id="${s.id}" aria-label="Modifier « ${esc(s.title)} »">${ic('pencil-simple')}</button>
              </div>
              <h3><a href="${link(s.id, s.root.id)}" class="stretched">${esc(s.title)}</a></h3>
              <div class="card-foot">
                ${bar(st.pct)}
                <span class="meta">${plural(st.total, 'partie', 'parties')}, ${st.pct} % maîtrisé</span>
              </div>
            </article>`;
          }).join('')}
        </div>
      </section>`;
  }

  function renderSubject(bigChange) {
    const s = subjectById(view.id);
    const st = stats(s.root);
    document.documentElement.style.setProperty('--accent', s.color);
    const scroll = bigChange ? 0 : ($('#tree') ? $('#tree').scrollTop : 0);
    const tab = (mode, icon, label) =>
      `<a class="tab" href="${link(s.id, view.nodeId, mode)}" ${view.mode === mode ? 'aria-current="page"' : ''}>${ic(icon)}<span>${label}</span></a>`;
    app.innerHTML = `
      <section class="subject">
        <aside class="tree-pane" id="treePane" aria-label="Arborescence du sujet">
          <div class="tp-head">
            <a class="back-link" href="#/">${ic('arrow-left')}Sujets</a>
            <div class="tp-title">
              <span class="tile" style="--c:${s.color}">${ic(s.icon, true)}</span>
              <div>
                <h1>${esc(s.title)}</h1>
                <div class="tp-progress">${bar(st.pct)}<span class="num">${st.done}/${st.total}</span></div>
              </div>
            </div>
            <label class="search">
              ${ic('magnifying-glass')}
              <input id="treeSearch" type="search" placeholder="Filtrer les parties…" aria-label="Filtrer les parties" autocomplete="off" value="${esc(treeFilter)}" />
            </label>
          </div>
          <ul class="tree" id="tree" role="tree"></ul>
          <div class="tp-foot">
            <button class="btn ghost sm" data-act="add-child" data-id="${s.root.id}">${ic('plus')}Partie</button>
            <button class="btn ghost sm" data-act="bulk-add" data-id="${s.root.id}">${ic('list-bullets')}Coller un plan</button>
          </div>
        </aside>
        <div class="main-pane">
          <nav class="tabs" aria-label="Vues">
            <button class="icon-btn" id="toggleTree" aria-label="Afficher l’arborescence" aria-controls="treePane">${ic('sidebar')}</button>
            ${tab('fiche', 'note-pencil', 'Fiche')}
            ${tab('carte', 'graph', 'Carte')}
            ${tab('revision', 'cards', 'Révision')}
          </nav>
          <div class="pane-body" id="paneBody"></div>
        </div>
      </section>`;
    renderTree();
    $('#tree').scrollTop = scroll;
    if (view.mode === 'fiche') renderFiche();
    else if (view.mode === 'carte') renderMap();
    else renderReview();
  }

  /* ----- Arbre latéral ----- */
  function matches(node, q) {
    if (!q) return true;
    const t = (node.title + ' ' + node.notes + ' ' + node.keyPoints.join(' ')).toLowerCase();
    return t.includes(q) || node.children.some((c) => matches(c, q));
  }
  function renderTree() {
    const s = subjectById(view.id);
    const q = treeFilter.trim().toLowerCase();
    const mode = view.mode === 'carte' ? 'fiche' : view.mode;
    const li = (n, depth) => {
      if (!matches(n, q)) return '';
      const hasKids = n.children.length > 0;
      const open = q ? true : !n.collapsed;
      const active = n.id === view.nodeId;
      return `
        <li role="treeitem" ${hasKids ? `aria-expanded="${open}"` : ''} style="--d:${depth}">
          <div class="row ${active ? 'active' : ''} st-${n.status}" draggable="true" data-node="${n.id}">
            <button class="caret ${hasKids ? '' : 'none'} ${open ? 'open' : ''}" data-act="toggle" data-id="${n.id}" tabindex="${hasKids ? 0 : -1}" aria-label="${open ? 'Replier' : 'Déplier'}">${ic('caret-right')}</button>
            <button class="dot" data-act="cycle" data-id="${n.id}" aria-label="Statut : ${STATUS[n.status].label}. Changer"></button>
            <a class="label" href="${link(s.id, n.id, mode)}" ${active ? 'aria-current="page"' : ''}>${esc(n.title)}</a>
            ${hasKids ? `<span class="count num">${n.children.length}</span>` : ''}
            <button class="add" data-act="add-child" data-id="${n.id}" aria-label="Ajouter une sous-partie à « ${esc(n.title)} »">${ic('plus')}</button>
          </div>
          ${hasKids ? `<ul role="group" class="${open ? '' : 'closed'}">${n.children.map((c) => li(c, depth + 1)).join('')}</ul>` : ''}
        </li>`;
    };
    const kids = s.root.children.map((c) => li(c, 0)).join('');
    $('#tree').innerHTML = `
      <li role="treeitem" style="--d:0"><div class="row root ${view.nodeId === s.root.id ? 'active' : ''}" data-node="${s.root.id}">
        <span class="caret none"></span>${ic('house')}<a class="label" href="${link(s.id, s.root.id, mode)}">Vue d’ensemble</a></div></li>
      ${kids || `<li class="tree-empty">${q ? 'Aucune partie ne correspond.' : 'Aucune partie pour l’instant. Ajoute la première avec le bouton Partie.'}</li>`}`;
  }

  /* ----- Fiche (détail d'une partie) ----- */
  function renderFiche() {
    const s = subjectById(view.id);
    const { node } = find(s.root, view.nodeId);
    const path = pathTo(s.root, node.id);
    const isRoot = node.id === s.root.id;
    const st = stats(node);
    $('#paneBody').innerHTML = `
      <article class="fiche">
        <nav class="crumbs" aria-label="Fil d’Ariane">${path
          .map((p, i) => i === path.length - 1
            ? `<span aria-current="page">${esc(i === 0 ? s.title : p.title)}</span>`
            : `<a href="${link(s.id, p.id)}">${esc(i === 0 ? s.title : p.title)}</a>`)
          .join(ic('caret-right'))}</nav>

        <div class="fiche-head">
          <textarea class="title-input" id="titleInput" rows="1" aria-label="Titre de la partie" placeholder="Titre de la partie…">${esc(isRoot ? s.title : node.title)}</textarea>
          ${node.children.length ? ring(st.pct) : ''}
        </div>

        ${isRoot && node.children.length ? '' : `<div class="status-seg" role="group" aria-label="Statut">
          ${Object.entries(STATUS).map(([k, v]) => `<button class="seg st-${k}" data-act="status" data-st="${k}" aria-pressed="${node.status === k}"><span class="sdot st-${k}" aria-hidden="true"></span>${v.label}</button>`).join('')}
        </div>`}

        <section class="sec">
          <div class="sec-head"><h2>${ic('star', true)}Points clés</h2><button class="btn ghost sm" data-act="add-kp">${ic('plus')}Ajouter</button></div>
          ${node.keyPoints.length ? `<ol class="kps" id="kps">
            ${node.keyPoints.map((k, i) => `
              <li><span class="kp-n num" aria-hidden="true">${i + 1}</span>
                <div class="kp-text" contenteditable="true" role="textbox" aria-label="Point clé ${i + 1}" data-kp="${i}">${esc(k)}</div>
                <button class="icon-btn sm" data-act="del-kp" data-i="${i}" aria-label="Supprimer le point clé ${i + 1}">${ic('x')}</button></li>`).join('')}
          </ol>` : '<p class="hint-empty">Les idées à retenir absolument. Elles s’affichent au dos des cartes de révision.</p>'}
        </section>

        <section class="sec">
          <div class="sec-head"><h2>${ic('note-pencil')}Notes</h2>
            <div class="mini-seg" role="group" aria-label="Mode des notes">
              <button data-act="notes-mode" data-m="preview" aria-pressed="${notesMode === 'preview'}">Aperçu</button>
              <button data-act="notes-mode" data-m="edit" aria-pressed="${notesMode === 'edit'}">Éditer</button>
            </div>
          </div>
          ${notesMode === 'edit'
            ? `<textarea class="notes-input" id="notesInput" aria-label="Notes" placeholder="Écris tes notes…">${esc(node.notes)}</textarea>
               <p class="hint">**gras**, *italique*, ==surligné==, \`code\`, - liste, # titre</p>`
            : node.notes.trim()
              ? `<div class="md notes-view">${MD.render(node.notes)}</div>`
              : `<button class="notes-empty" data-act="notes-mode" data-m="edit">${ic('pencil-simple')}Écrire des notes pour cette partie</button>`}
        </section>

        <section class="sec">
          <div class="sec-head"><h2>${ic('tree-structure')}Sous-parties <span class="muted num">${node.children.length}</span></h2>
            <div class="row-btns">
              <button class="btn ghost sm" data-act="bulk-add" data-id="${node.id}">${ic('list-bullets')}Coller un plan</button>
              <button class="btn sm" data-act="add-child" data-id="${node.id}">${ic('plus')}Sous-partie</button>
            </div>
          </div>
          ${node.children.length ? `<div class="sub-grid">
            ${node.children.map((c, i) => {
              const cs = stats(c);
              return `<a class="sub-card" href="${link(s.id, c.id)}" style="--i:${i}">
                <span class="sdot st-${c.status}" aria-hidden="true"></span>
                <b>${esc(c.title)}</b>
                <small>${c.children.length ? `${plural(c.children.length, 'sous-partie', 'sous-parties')}, ${cs.pct} %` : STATUS[c.status].label}</small>
              </a>`;
            }).join('')}
          </div>` : '<p class="hint-empty">Découpe cette partie en morceaux plus petits pour mieux l’apprendre.</p>'}
        </section>

        <footer class="fiche-foot">
          ${isRoot
            ? `<button class="btn ghost sm" data-act="edit-subject" data-id="${s.id}">${ic('pencil-simple')}Modifier le sujet</button>
               <button class="btn ghost sm" data-act="export-subject">${ic('download-simple')}Exporter</button>`
            : `<button class="btn ghost sm" data-act="move" data-dir="-1">${ic('arrow-up')}Monter</button>
               <button class="btn ghost sm" data-act="move" data-dir="1">${ic('arrow-down')}Descendre</button>
               <button class="btn danger sm" data-act="del-node">${ic('trash')}Supprimer</button>`}
        </footer>
      </article>`;
    autoGrow($('#titleInput'));
    const ni = $('#notesInput');
    if (ni) { autoGrow(ni); ni.focus(); ni.setSelectionRange(ni.value.length, ni.value.length); }
  }

  function autoGrow(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  /* ----- Carte mentale ----- */
  function renderMap() {
    const s = subjectById(view.id);
    const node = (n, depth) => `
      <div class="mm-branch">
        <a class="mm-node st-${n.status} ${n.id === view.nodeId ? 'active' : ''}" href="${link(s.id, n.id)}" style="--d:${Math.min(depth, 6)}">
          ${depth === 0 ? ic(s.icon, true) : '<span class="sdot" aria-hidden="true"></span>'}
          <span>${esc(depth === 0 ? s.title : n.title)}</span>
        </a>
        ${n.children.length ? `<div class="mm-children">${n.children.map((c) => node(c, depth + 1)).join('')}</div>` : ''}
      </div>`;
    $('#paneBody').innerHTML = `
      <div class="map-wrap">
        <div class="legend" aria-label="Légende">
          ${Object.entries(STATUS).map(([k, v]) => `<span><span class="sdot st-${k}" aria-hidden="true"></span>${v.label}</span>`).join('')}
        </div>
        <div class="mindmap">${node(s.root, 0)}</div>
      </div>`;
  }

  /* ----- Révision ----- */
  function startReview(onlyTodo) {
    const s = subjectById(view.id);
    const base = find(s.root, view.nodeId).node;
    const cards = [];
    walk(base, (n, d) => {
      if (d === 0 && base.children.length) return;
      if (onlyTodo && n.status === 'done') return;
      cards.push(n.id);
    });
    for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
    review = { cards, i: 0, flipped: false, known: 0, again: 0 };
  }

  function renderReview() {
    const s = subjectById(view.id);
    const pane = $('#paneBody');
    if (!review) {
      const base = find(s.root, view.nodeId).node;
      const st = stats(base);
      const left = st.total - st.done;
      pane.innerHTML = `
        <div class="review-start">
          <span class="tile big" style="--c:${s.color}">${ic('cards', true)}</span>
          <h2>Réviser « ${esc(base.id === s.root.id ? s.title : base.title)} »</h2>
          <p class="muted">${plural(st.total, 'carte', 'cartes')}, dont ${fmt.format(left)} à travailler.</p>
          <div class="row-btns center">
            ${left ? `<button class="btn" data-act="review-go" data-only="1">${ic('play')}Réviser les ${plural(left, 'carte restante', 'cartes restantes')}</button>` : ''}
            <button class="btn ${left ? 'ghost' : ''}" data-act="review-go" data-only="0">${ic('cards')}Tout réviser</button>
          </div>
          <p class="hint">Sélectionne une partie dans l’arbre pour ne réviser que cette branche. Raccourcis : <kbd>Espace</kbd> retourner, <kbd>←</kbd> à revoir, <kbd>→</kbd> je maîtrise.</p>
        </div>`;
      return;
    }
    if (review.i >= review.cards.length) {
      pane.innerHTML = `
        <div class="review-start">
          <span class="tile big" style="--c:${s.color}">${ic('trophy', true)}</span>
          <h2>Session terminée</h2>
          <div class="score">
            <div><b class="num txt-ok">${review.known}</b><span>maîtrisées</span></div>
            <div><b class="num txt-warn">${review.again}</b><span>à revoir</span></div>
          </div>
          <div class="row-btns center">
            <button class="btn" data-act="review-reset">${ic('arrow-counter-clockwise')}Nouvelle session</button>
            <a class="btn ghost" href="${link(s.id, view.nodeId)}">${ic('note-pencil')}Retour à la fiche</a>
          </div>
        </div>`;
      if (review.known && !review.celebrated) { review.celebrated = true; FX.confetti(undefined, undefined, 110); }
      return;
    }
    const f = find(s.root, review.cards[review.i]);
    if (!f) { review.i++; return renderReview(); }
    const n = f.node;
    const path = pathTo(s.root, n.id).slice(1, -1).map((p) => p.title);
    const back = `${n.keyPoints.length ? `<ul class="kps-back">${n.keyPoints.map((k) => `<li>${MD.render(k).replace(/^<p>|<\/p>$/g, '')}</li>`).join('')}</ul>` : ''}
      ${n.notes.trim() ? `<div class="md">${MD.render(n.notes)}</div>` : ''}
      ${!n.keyPoints.length && !n.notes.trim() ? `<p class="muted">Pas encore de contenu. Sous-parties : ${n.children.map((c) => esc(c.title)).join(', ') || 'aucune'}.</p>` : ''}`;
    pane.innerHTML = `
      <div class="review">
        <div class="review-progress">
          ${bar((review.i / review.cards.length) * 100)}
          <span class="num">${review.i + 1} / ${review.cards.length}</span>
        </div>
        <div class="flip ${review.flipped ? 'flipped' : ''}" data-act="flip" role="button" tabindex="0" aria-label="${review.flipped ? 'Voir la question' : 'Retourner la carte'}">
          <div class="flip-inner">
            <div class="face front">
              <small>${esc(path.join(' › ') || s.title)}</small>
              <strong class="q">${esc(n.title)}</strong>
              <span class="muted">Que sais-tu sur cette partie ? Réfléchis, puis retourne la carte.</span>
              <span class="flip-hint">${ic('arrows-clockwise')}Retourner <kbd>Espace</kbd></span>
            </div>
            <div class="face back"><strong class="back-title">${esc(n.title)}</strong>${back}</div>
          </div>
        </div>
        <div class="row-btns center review-actions" ${review.flipped ? '' : 'inert'}>
          <button class="btn warn" data-act="review-answer" data-ok="0">${ic('arrow-counter-clockwise')}À revoir</button>
          <button class="btn ok" data-act="review-answer" data-ok="1">${ic('check')}Je maîtrise</button>
        </div>
      </div>`;
  }

  /* ---------- Modales ---------- */
  let lastFocus = null;
  function openModal(html, onMount) {
    lastFocus = document.activeElement;
    $('#modalBody').innerHTML = html;
    $('#modal').hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => $('#modal').classList.add('show')));
    onMount && onMount($('#modalBody'));
    const first = $('#modalBody input:not([type=radio]):not([type=checkbox]), #modalBody textarea, #modalBody .drop');
    setTimeout(() => (first || $('#modalClose')).focus(), 30);
  }
  function closeModal() {
    $('#modal').classList.remove('show');
    setTimeout(() => {
      $('#modal').hidden = true; $('#modalBody').innerHTML = '';
      $('.modal').style.removeProperty('--accent');
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    }, 160);
  }
  $('#modalClose').onclick = closeModal;
  $('#modal').addEventListener('mousedown', (e) => { if (e.target.id === 'modal') closeModal(); });

  const pickers = (color, icon) => `
    <fieldset class="field">
      <legend>Icône</legend>
      <div class="icon-pick">${ICONS.map((n) => `<button type="button" data-icon="${n}" aria-pressed="${n === icon}" aria-label="${ICON_NAMES[n]}" title="${ICON_NAMES[n]}">${ic(n)}</button>`).join('')}</div>
    </fieldset>
    <fieldset class="field">
      <legend>Couleur</legend>
      <div class="color-pick">${PALETTE.map((c, i) => `<button type="button" data-color="${c}" aria-pressed="${c === color}" aria-label="${COLOR_NAMES[i]}" title="${COLOR_NAMES[i]}" style="--c:${c}"></button>`).join('')}</div>
    </fieldset>`;
  function bindPickers(el, sel) {
    el.addEventListener('click', (e) => {
      const ib = e.target.closest('[data-icon]');
      const cb = e.target.closest('[data-color]');
      if (ib) { sel.icon = ib.dataset.icon; $$('[data-icon]', el).forEach((b) => b.setAttribute('aria-pressed', b === ib)); }
      if (cb) {
        sel.color = cb.dataset.color;
        $$('[data-color]', el).forEach((b) => b.setAttribute('aria-pressed', b === cb));
        $$('.icon-pick', el).forEach((p) => p.style.setProperty('--c', sel.color));
        $('.modal').style.setProperty('--accent', sel.color);
      }
    });
    $$('.icon-pick', el).forEach((p) => p.style.setProperty('--c', sel.color));
    $('.modal').style.setProperty('--accent', sel.color);
  }

  /* Plan indenté → nœuds. Chaque niveau d'indentation (espaces ou tabulation) = un niveau */
  function parseOutline(text) {
    const root = { children: [] };
    const stack = [{ node: root, indent: -1 }];
    text.split(/\r?\n/).forEach((raw) => {
      if (!raw.trim()) return;
      const indent = raw.match(/^[\t ]*/)[0].replace(/\t/g, '  ').length;
      const title = raw.trim().replace(/^([-*•+]|\d+[.)])\s+/, '');
      if (!title) return;
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
      const n = makeNode(title);
      stack[stack.length - 1].node.children.push(n);
      stack.push({ node: n, indent });
    });
    return root.children;
  }

  function newSubjectModal() {
    const sel = { color: PALETTE[state.subjects.length % PALETTE.length], icon: ICONS[state.subjects.length % ICONS.length] };
    openModal(`
      <h2 id="modalTitle">Nouveau sujet</h2>
      <form id="nsForm" class="form">
        <div class="field">
          <label for="nsTitle">Titre</label>
          <input id="nsTitle" name="title" required autocomplete="off" placeholder="La Révolution française…" />
        </div>
        ${pickers(sel.color, sel.icon)}
        <div class="field">
          <label for="nsPlan">Plan rapide <span class="optional">facultatif</span></label>
          <textarea id="nsPlan" name="plan" rows="6" placeholder="Les causes&#10;  Crise financière&#10;  Idées des Lumières&#10;Les grandes étapes…"></textarea>
          <p class="hint">Une ligne par partie. Indente une ligne pour en faire une sous-partie.</p>
        </div>
        <div class="row-btns end"><button type="button" class="btn ghost" data-close>Annuler</button><button class="btn">${ic('plus')}Créer le sujet</button></div>
      </form>`, (el) => {
      bindPickers(el, sel);
      $('[data-close]', el).onclick = closeModal;
      $('#nsForm', el).onsubmit = (e) => {
        e.preventDefault();
        const title = $('#nsTitle', el).value.trim() || 'Nouveau sujet';
        const s = makeSubject(title, sel);
        s.root.children = parseOutline($('#nsPlan', el).value);
        state.subjects.push(s);
        save();
        closeModal();
        FX.toast('Sujet créé', 'success');
        go(link(s.id, s.root.id));
      };
    });
  }

  function editSubjectModal(id) {
    const s = subjectById(id);
    const sel = { color: s.color, icon: s.icon };
    openModal(`
      <h2 id="modalTitle">Modifier le sujet</h2>
      <form id="esForm" class="form">
        <div class="field">
          <label for="esTitle">Titre</label>
          <input id="esTitle" name="title" autocomplete="off" value="${esc(s.title)}" />
        </div>
        ${pickers(sel.color, sel.icon)}
        <div class="row-btns spread">
          <button type="button" class="btn danger" id="esDel">${ic('trash')}Supprimer</button>
          <span class="row-btns"><button type="button" class="btn ghost" id="esExport">${ic('download-simple')}Exporter</button><button class="btn">Enregistrer</button></span>
        </div>
      </form>`, (el) => {
      bindPickers(el, sel);
      $('#esExport', el).onclick = () => exportJSON(s, s.title);
      $('#esDel', el).onclick = () => {
        if (!confirm(`Supprimer « ${s.title} » et toutes ses parties ? Cette action est définitive.`)) return;
        state.subjects = state.subjects.filter((x) => x.id !== id);
        save(); closeModal(); FX.toast('Sujet supprimé'); go('#/');
      };
      $('#esForm', el).onsubmit = (e) => {
        e.preventDefault();
        s.title = $('#esTitle', el).value.trim() || s.title;
        s.root.title = s.title;
        s.color = sel.color; s.icon = sel.icon;
        s.updatedAt = Date.now();
        save(); closeModal(); render(view); FX.toast('Sujet enregistré', 'success');
      };
    });
  }

  function bulkAddModal(parentId) {
    const s = subjectById(view.id);
    const parent = find(s.root, parentId).node;
    openModal(`
      <h2 id="modalTitle">Coller un plan</h2>
      <p class="modal-lede">Les parties seront ajoutées dans « ${esc(parentId === s.root.id ? s.title : parent.title)} ».</p>
      <form id="baForm" class="form">
        <div class="field">
          <label for="baText">Plan</label>
          <textarea id="baText" name="plan" rows="10" placeholder="Introduction&#10;Partie 1&#10;  Notion A&#10;  Notion B&#10;Partie 2…"></textarea>
          <p class="hint">Une ligne par partie. Indente avec des espaces ou une tabulation pour créer des sous-parties.</p>
        </div>
        <div class="row-btns end"><button type="button" class="btn ghost" data-close>Annuler</button><button class="btn">${ic('plus')}Ajouter les parties</button></div>
      </form>`, (el) => {
      $('[data-close]', el).onclick = closeModal;
      $('#baForm', el).onsubmit = (e) => {
        e.preventDefault();
        const nodes = parseOutline($('#baText', el).value);
        if (!nodes.length) { FX.toast('Le plan est vide : écris au moins une ligne.', 'error'); return; }
        parent.children.push(...nodes);
        parent.collapsed = false;
        touch(); closeModal(); render(view);
        FX.toast(`${plural(nodes.length, 'partie ajoutée', 'parties ajoutées')}`, 'success');
      };
    });
  }

  function settingsModal() {
    const st = state.settings;
    openModal(`
      <h2 id="modalTitle">Réglages</h2>
      <form id="setForm" class="form">
        <div class="field">
          <label for="theme">Thème</label>
          <select id="theme" name="theme">
            ${[['auto', 'Automatique (comme le système)'], ['light', 'Clair'], ['dark', 'Sombre']].map(([v, l]) => `<option value="${v}" ${st.theme === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="apiKey">Clé API Claude <span class="optional">facultatif</span></label>
          <input id="apiKey" name="api-key" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" value="${esc(st.apiKey || '')}" />
          <p class="hint">Active l’import PDF par Claude. La clé reste dans ce navigateur et n’est envoyée qu’à l’API d’Anthropic. Évite de l’enregistrer sur un ordinateur partagé.</p>
        </div>
        <div class="field">
          <label for="model">Modèle</label>
          <select id="model" name="model">
            ${[['claude-opus-5-5', 'Claude Opus 5.5, le plus précis (recommandé)'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5, plus rapide'], ['claude-haiku-5-5', 'Claude Haiku 5.5, très économique']]
              .map(([v, l]) => `<option value="${v}" ${st.model === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
        <fieldset class="field">
          <legend>Sauvegarde</legend>
          <div class="row-btns">
            <button type="button" class="btn ghost sm" id="expAll">${ic('download-simple')}Exporter tout</button>
            <button type="button" class="btn ghost sm" id="impAll">${ic('upload-simple')}Importer un fichier</button>
          </div>
        </fieldset>
        <div class="row-btns end"><button class="btn">Enregistrer</button></div>
      </form>`, (el) => {
      $('#expAll', el).onclick = () => exportJSON({ subjects: state.subjects, xp: state.xp }, 'arbor-sauvegarde');
      $('#impAll', el).onclick = () => $('#jsonInput').click();
      $('#setForm', el).onsubmit = (e) => {
        e.preventDefault();
        st.theme = $('#theme', el).value;
        st.apiKey = $('#apiKey', el).value.trim();
        st.model = $('#model', el).value;
        applyTheme(); save(); closeModal(); FX.toast('Réglages enregistrés', 'success');
      };
    });
  }

  function exportJSON(data, name) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name.replace(/[^\w\-À-ÿ ]+/g, '').trim() || 'arbor'}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    FX.toast('Fichier exporté', 'success');
  }

  $('#jsonInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const list = Array.isArray(data.subjects) ? data.subjects : data.root ? [data] : [];
      if (!list.length) throw new Error('format');
      list.forEach((s) => state.subjects.push(makeSubject(s.title || 'Sujet importé', { color: s.color, icon: s.icon, emoji: s.emoji, root: normalize(s.root) })));
      if (typeof data.xp === 'number') state.xp = Math.max(state.xp, data.xp);
      save(); closeModal(); renderXP(); go('#/');
      FX.toast(`${plural(list.length, 'sujet importé', 'sujets importés')}`, 'success');
    } catch (err) {
      FX.toast('Ce fichier n’est pas une sauvegarde Arbor. Choisis un fichier .json exporté depuis Arbor.', 'error', 4200);
    }
  });

  /* ---------- Import PDF ---------- */
  let pdfFile = null;
  function pdfModal() {
    pdfFile = null;
    const hasKey = !!state.settings.apiKey;
    const inSubject = view.name === 'subject';
    openModal(`
      <h2 id="modalTitle">Importer un PDF</h2>
      <p class="modal-lede">Arbor repère les titres, les définitions et les phrases importantes, puis range tout en parties et sous-parties.</p>
      <button type="button" class="drop" id="drop">
        <span class="tile" aria-hidden="true">${ic('file-pdf')}</span>
        <b id="dropLabel">Glisse ton PDF ici</b>
        <small id="dropSub">ou clique pour choisir un fichier</small>
      </button>
      <fieldset class="field">
        <legend>Méthode d’analyse</legend>
        <div class="mode-pick">
          <label class="mode"><input type="radio" name="mode" value="local" ${hasKey ? '' : 'checked'} />
            <span class="mode-ic" aria-hidden="true">${ic('lightning', true)}</span>
            <span><b>Analyse locale</b><small>Gratuite et instantanée. Le fichier ne quitte pas ton ordinateur.</small></span></label>
          <label class="mode ${hasKey ? '' : 'locked'}"><input type="radio" name="mode" value="ai" ${hasKey ? 'checked' : 'disabled'} />
            <span class="mode-ic" aria-hidden="true">${ic('sparkle', true)}</span>
            <span><b>Analyse par Claude</b><small>${hasKey ? 'Résumés et points clés rédigés, découpage plus fin.' : 'Ajoute ta clé API dans les réglages pour l’activer.'}</small></span></label>
        </div>
      </fieldset>
      ${inSubject ? `<label class="check"><input type="checkbox" id="intoCurrent" /> Ajouter dans la partie ouverte au lieu de créer un nouveau sujet</label>` : ''}
      <div class="row-btns end"><button class="btn" id="pdfGo" disabled>${ic('magic-wand')}Analyser le PDF</button></div>`, (el) => {
      const drop = $('#drop', el);
      const setFile = (f) => {
        if (!f || !/pdf$/i.test(f.type || f.name)) { FX.toast('Ce fichier n’est pas un PDF. Choisis un fichier .pdf.', 'error'); return; }
        pdfFile = f;
        $('#dropLabel', el).textContent = f.name;
        $('#dropSub', el).textContent = `${fmt.format(Math.max(1, Math.round(f.size / 1024)))} Ko, prêt à être analysé`;
        drop.classList.add('has');
        $('#pdfGo', el).disabled = false;
      };
      drop.onclick = () => { $('#pdfInput').onchange = (e) => { setFile(e.target.files[0]); e.target.value = ''; }; $('#pdfInput').click(); };
      drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
      drop.ondragleave = () => drop.classList.remove('over');
      drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); setFile(e.dataTransfer.files[0]); };
      $('#pdfGo', el).onclick = () => {
        const mode = $('input[name=mode]:checked', el).value;
        const into = inSubject && $('#intoCurrent', el) && $('#intoCurrent', el).checked;
        runPdf(pdfFile, mode, into);
      };
    });
  }

  async function runPdf(file, mode, into) {
    $('#modalBody').innerHTML = `
      <div class="loading">
        <h2 id="modalTitle">Analyse en cours…</h2>
        <p class="modal-lede" id="ldMsg">${esc(file.name)}</p>
        <div class="skeleton" aria-hidden="true">
          <span style="--w:60%"></span><span style="--w:45%;--d:1"></span><span style="--w:52%;--d:1"></span>
          <span style="--w:38%;--d:2"></span><span style="--w:66%"></span><span style="--w:40%;--d:1"></span>
        </div>
        <div class="bar big" role="progressbar" aria-label="Progression" aria-valuemin="0" aria-valuemax="100"><span id="ldBar" style="transform:scaleX(.05)"></span></div>
      </div>`;
    const setMsg = (m) => { const e = $('#ldMsg'); if (e) e.textContent = m; };
    const setPct = (p) => {
      const e = $('#ldBar'); if (!e) return;
      e.style.transform = `scaleX(${Math.max(0.05, p)})`;
      e.parentElement.setAttribute('aria-valuenow', Math.round(p * 100));
    };
    try {
      let tree;
      if (mode === 'ai') {
        let fake = 0.05;
        const t = setInterval(() => { fake = Math.min(0.92, fake + (0.95 - fake) * 0.04); setPct(fake); }, 400);
        try { tree = await AI.structure(file, state.settings.apiKey, state.settings.model, setMsg); }
        finally { clearInterval(t); }
      } else {
        const res = await PdfImport.analyze(file, (p) => { setPct(p * 0.9); setMsg(`Lecture des pages… ${Math.round(p * 100)} %`); });
        setMsg('Classement des informations…');
        tree = res.tree;
      }
      setPct(1);
      previewImport(normalize(tree), into);
    } catch (err) {
      console.error(err);
      const msg = err && err.status === 401 ? 'La clé API est refusée. Vérifie-la dans les réglages.' : (err && err.message) || 'Erreur inconnue.';
      $('#modalBody').innerHTML = `
        <div class="loading">
          <span class="tile big danger-tile">${ic('warning-circle', true)}</span>
          <h2 id="modalTitle">Import impossible</h2>
          <p class="modal-lede">${esc(msg)}</p>
          <div class="row-btns center"><button class="btn" id="retry">${ic('arrow-counter-clockwise')}Choisir un autre fichier</button></div>
        </div>`;
      $('#retry').onclick = pdfModal;
    }
  }

  function previewImport(root, into) {
    let count = 0, kps = 0;
    walk(root, (n) => { count++; kps += n.keyPoints.length; });
    const sel = { color: PALETTE[state.subjects.length % PALETTE.length], icon: 'book-open' };
    const outline = (n) => `<li><span>${esc(n.title)}</span>${n.keyPoints.length ? ` <em class="num">${ic('star', true)}${n.keyPoints.length}</em>` : ''}
      ${n.children.length ? `<ul>${n.children.map(outline).join('')}</ul>` : ''}</li>`;
    $('#modalBody').innerHTML = `
      <h2 id="modalTitle">Cours structuré</h2>
      <p class="modal-lede">${plural(count - 1, 'partie', 'parties')} et ${plural(kps, 'point clé extrait', 'points clés extraits')}. Tu pourras tout modifier ensuite.</p>
      <form id="pvForm" class="form">
        ${into ? '' : `<div class="field"><label for="pvTitle">Titre du sujet</label><input id="pvTitle" name="title" autocomplete="off" value="${esc(root.title)}" /></div>${pickers(sel.color, sel.icon)}`}
        <div class="field">
          <span class="label-like">Aperçu du plan</span>
          <div class="outline"><ul>${root.children.map(outline).join('') || '<li>Aucune partie détectée : le texte sera rangé dans la vue d’ensemble.</li>'}</ul></div>
        </div>
        <div class="row-btns end"><button type="button" class="btn ghost" data-close>Annuler</button><button class="btn">${ic('check')}${into ? 'Ajouter ici' : 'Créer le cours'}</button></div>
      </form>`;
    const el = $('#modalBody');
    if (!into) bindPickers(el, sel);
    $('[data-close]', el).onclick = closeModal;
    $('#pvForm', el).onsubmit = (e) => {
      e.preventDefault();
      if (into) {
        const s = subjectById(view.id);
        const parent = find(s.root, view.nodeId).node;
        parent.children.push(root);
        parent.collapsed = false;
        touch(); closeModal(); go(link(s.id, root.id));
      } else {
        const title = $('#pvTitle', el).value.trim() || root.title;
        const s = makeSubject(title, { ...sel, root });
        state.subjects.push(s);
        save(); closeModal(); go(link(s.id, s.root.id));
      }
      FX.toast('Cours importé', 'success');
    };
  }

  /* ---------- Actions ---------- */
  function currentNode() {
    const s = subjectById(view.id);
    return s && find(s.root, view.nodeId);
  }

  function addChild(parentId) {
    const s = subjectById(view.id);
    const parent = find(s.root, parentId).node;
    const n = makeNode('Nouvelle partie');
    parent.children.push(n);
    parent.collapsed = false;
    touch();
    notesMode = 'preview';
    go(link(s.id, n.id, 'fiche'));
    setTimeout(() => { const t = $('#titleInput'); if (t) { t.focus(); t.select(); } }, 30);
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act], [data-open], .row[data-node]');
    if (!t) return;
    const act = t.dataset.act;

    // Cartes et lignes : le lien interne gère la navigation, la zone autour aussi
    if (t.dataset.open && !e.target.closest('[data-act], a')) { go(link(t.dataset.open, subjectById(t.dataset.open).root.id)); return; }
    if (!act && t.matches('.row[data-node]')) {
      $('#treePane') && $('#treePane').classList.remove('open');
      if (!e.target.closest('a')) go(link(view.id, t.dataset.node, view.mode === 'carte' ? 'fiche' : view.mode));
      return;
    }
    if (!act) return;

    const s = view.id && subjectById(view.id);
    switch (act) {
      case 'new-subject': newSubjectModal(); break;
      case 'import-pdf': pdfModal(); break;
      case 'edit-subject': e.stopPropagation(); editSubjectModal(t.dataset.id); break;
      case 'toggle': {
        e.stopPropagation();
        const f = find(s.root, t.dataset.id);
        f.node.collapsed = !f.node.collapsed; save();
        const sc = $('#tree').scrollTop; renderTree(); $('#tree').scrollTop = sc;
        const again = $(`.row[data-node="${t.dataset.id}"] .caret`); again && again.focus();
        break;
      }
      case 'cycle': {
        e.stopPropagation();
        const f = find(s.root, t.dataset.id);
        const order = ['todo', 'doing', 'done'];
        setStatus(f.node, order[(order.indexOf(f.node.status) + 1) % 3], t);
        render(view);
        const again = $(`.row[data-node="${t.dataset.id}"] .dot`); again && again.focus();
        break;
      }
      case 'add-child': e.stopPropagation(); addChild(t.dataset.id); break;
      case 'bulk-add': bulkAddModal(t.dataset.id); break;
      case 'status': {
        const st = t.dataset.st;
        setStatus(currentNode().node, st, t); render(view);
        const again = $(`.seg[data-st="${st}"]`); again && again.focus();
        break;
      }
      case 'add-kp': {
        const n = currentNode().node;
        n.keyPoints.push('');
        save(); renderFiche();
        const items = $$('.kp-text'); items[items.length - 1].focus();
        break;
      }
      case 'del-kp': currentNode().node.keyPoints.splice(+t.dataset.i, 1); save(); renderFiche(); break;
      case 'notes-mode': notesMode = t.dataset.m; renderFiche(); break;
      case 'move': {
        const { node, parent } = currentNode();
        const i = parent.children.indexOf(node);
        const j = i + +t.dataset.dir;
        if (j < 0 || j >= parent.children.length) { FX.toast(j < 0 ? 'C’est déjà la première partie.' : 'C’est déjà la dernière partie.'); break; }
        parent.children.splice(i, 1); parent.children.splice(j, 0, node);
        touch(); renderTree(); FX.toast(t.dataset.dir < 0 ? 'Partie montée' : 'Partie descendue'); break;
      }
      case 'del-node': {
        const { node, parent } = currentNode();
        let n = 0; walk(node, () => n++);
        if (!confirm(`Supprimer « ${node.title} »${n > 1 ? ` et ses ${n - 1} sous-parties` : ''} ? Cette action est définitive.`)) break;
        parent.children = parent.children.filter((c) => c !== node);
        touch(); go(link(s.id, parent.id)); FX.toast('Partie supprimée'); break;
      }
      case 'export-subject': exportJSON(s, s.title); break;
      case 'review-go': startReview(t.dataset.only === '1'); renderReview(); $('.flip') && $('.flip').focus(); break;
      case 'review-reset': review = null; renderReview(); break;
      case 'flip': flip(); break;
      case 'review-answer': answer(t.dataset.ok === '1', t); break;
    }
  });

  function flip() {
    if (!review) return;
    review.flipped = !review.flipped;
    const f = $('.flip');
    f.classList.toggle('flipped', review.flipped);
    f.setAttribute('aria-label', review.flipped ? 'Voir la question' : 'Retourner la carte');
    const actions = $('.review-actions');
    if (review.flipped) actions.removeAttribute('inert'); else actions.setAttribute('inert', '');
  }

  function answer(ok, origin) {
    if (!review || review.i >= review.cards.length) return;
    const s = subjectById(view.id);
    const f = find(s.root, review.cards[review.i]);
    if (f) setStatus(f.node, ok ? 'done' : 'doing', origin);
    if (ok) review.known++; else review.again++;
    review.i++; review.flipped = false;
    renderReview(); renderTree(); refreshProgress();
    const fl = $('.flip'); fl && fl.focus();
  }

  function refreshProgress() {
    const s = subjectById(view.id);
    if (!s) return;
    const st = stats(s.root);
    const b = $('.tp-progress .bar span');
    if (b) b.style.transform = `scaleX(${st.pct / 100})`;
    const n = $('.tp-progress .num');
    if (n) n.textContent = `${st.done}/${st.total}`;
  }

  /* Saisie : titre, notes, points clés, filtre */
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'treeSearch') { treeFilter = t.value; renderTree(); return; }
    const cur = view.name === 'subject' && currentNode();
    if (!cur) return;
    const s = subjectById(view.id);
    if (t.id === 'titleInput') {
      autoGrow(t);
      const v = t.value.replace(/\n/g, ' ');
      if (cur.node.id === s.root.id) { s.title = v || s.title; }
      cur.node.title = v;
      const lbl = $(`.row[data-node="${cur.node.id}"] .label`);
      if (lbl && cur.node.id !== s.root.id) lbl.textContent = v;
      touch();
    } else if (t.id === 'notesInput') {
      autoGrow(t);
      cur.node.notes = t.value;
      touch();
    } else if (t.dataset.kp !== undefined) {
      cur.node.keyPoints[+t.dataset.kp] = t.innerText.trim();
      touch();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.target.id === 'titleInput' && e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
    if (e.target.dataset && e.target.dataset.kp !== undefined && e.key === 'Enter') {
      e.preventDefault();
      $('[data-act="add-kp"]').click();
    }
    if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
    if (e.key === 'Escape' && $('#treePane') && $('#treePane').classList.contains('open')) $('#treePane').classList.remove('open');
    if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('flip')) { e.preventDefault(); flip(); }
    // raccourcis de révision
    if (view.mode === 'revision' && review && review.i < review.cards.length && $('#modal').hidden && !e.target.closest('input, textarea, [contenteditable]')) {
      if (e.key === ' ' && !e.target.closest('button, a')) { e.preventDefault(); flip(); }
      if (review.flipped && e.key === 'ArrowRight') answer(true, $('.btn.ok'));
      if (review.flipped && e.key === 'ArrowLeft') answer(false, $('.btn.warn'));
    }
  });
  document.addEventListener('focusout', (e) => {
    // retire les points clés vides
    if (e.target.dataset && e.target.dataset.kp !== undefined) {
      const cur = currentNode();
      if (cur && !e.target.innerText.trim()) {
        setTimeout(() => {
          if (document.activeElement && document.activeElement.dataset && document.activeElement.dataset.kp !== undefined) return;
          cur.node.keyPoints = cur.node.keyPoints.filter((k) => k.trim()); save(); if (view.mode === 'fiche') renderFiche();
        }, 0);
      }
    }
    if (e.target.id === 'titleInput' && $('#tree')) { const sc = $('#tree').scrollTop; renderTree(); $('#tree').scrollTop = sc; }
  });

  /* Glisser-déposer dans l'arbre : déposer sur une partie la range dedans */
  let dragId = null;
  document.addEventListener('dragstart', (e) => {
    const row = e.target.closest && e.target.closest('.row[data-node]:not(.root)');
    if (!row) return;
    dragId = row.dataset.node;
    row.classList.add('dragging');
    document.body.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
  });
  document.addEventListener('dragend', () => {
    dragId = null;
    document.body.classList.remove('is-dragging');
    $$('.row.dragging, .row.drop-target').forEach((r) => r.classList.remove('dragging', 'drop-target'));
  });
  document.addEventListener('dragover', (e) => {
    const row = e.target.closest && e.target.closest('.row[data-node]');
    if (!row || !dragId || row.dataset.node === dragId) return;
    e.preventDefault();
    $$('.row.drop-target').forEach((r) => r !== row && r.classList.remove('drop-target'));
    row.classList.add('drop-target');
  });
  document.addEventListener('drop', (e) => {
    const row = e.target.closest && e.target.closest('.row[data-node]');
    if (!row || !dragId) return;
    e.preventDefault();
    const s = subjectById(view.id);
    const src = find(s.root, dragId);
    const dst = find(s.root, row.dataset.node);
    if (!src || !dst || isDescendant(src.node, dst.node.id)) { FX.toast('Une partie ne peut pas être rangée dans ses propres sous-parties.', 'error'); return; }
    src.parent.children = src.parent.children.filter((c) => c !== src.node);
    dst.node.children.push(src.node);
    dst.node.collapsed = false;
    touch(); render(view);
    FX.toast(`Rangé dans « ${dst.node.id === s.root.id ? s.title : dst.node.title} »`, 'success');
  });

  /* Boutons globaux */
  $('#importPdfBtn').onclick = pdfModal;
  $('#settingsBtn').onclick = settingsModal;
  $('#themeBtn').onclick = () => {
    state.settings.theme = effectiveTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(); save();
  };
  // Tiroir de l'arbre (mobile) : bouton pour ouvrir, tap à côté pour fermer
  document.addEventListener('click', (e) => {
    const pane = $('#treePane');
    if (!pane) return;
    if (e.target.closest('#toggleTree')) { pane.classList.toggle('open'); return; }
    if (pane.classList.contains('open') && !e.target.closest('#treePane')) pane.classList.remove('open');
  }, true);

  window.addEventListener('hashchange', route);
  applyTheme();
  renderXP();
  route();
})();
