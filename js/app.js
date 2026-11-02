/* Arbor — interface */
(function () {
  const { makeNode, makeSubject, normalize, find, pathTo, stats, walk, isDescendant, PALETTE, EMOJIS } = Store;
  const esc = MD.esc;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  const state = Store.load();
  const app = $('#app');
  let view = { name: 'home' };
  let review = null; // session de révision en cours
  let treeFilter = '';
  let notesMode = 'preview';

  const save = () => Store.save(state);
  const subjectById = (id) => state.subjects.find((s) => s.id === id);
  const STATUS = {
    todo: { label: 'À apprendre', icon: '⚪' },
    doing: { label: 'En cours', icon: '🟠' },
    done: { label: 'Maîtrisé', icon: '🟢' },
  };

  /* ---------- Thème & XP ---------- */
  function applyTheme() { document.documentElement.dataset.theme = state.settings.theme; }
  function renderXP(bump) {
    const lvl = Math.floor(state.xp / 100) + 1;
    $('#xpLevel').textContent = `Niv. ${lvl}`;
    $('#xpFill').style.width = `${state.xp % 100}%`;
    $('#xpNum').textContent = `${state.xp} XP`;
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
      FX.confetti(r ? r.left + r.width / 2 : undefined, r ? r.top : undefined, 50);
      if (Math.floor(state.xp / 100) > lvlBefore) { FX.toast(`🎉 Niveau ${lvlBefore + 2} atteint !`, 'success'); FX.confetti(undefined, undefined, 160); }
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
    if (parts[0] === 's' && subjectById(parts[1])) {
      const s = subjectById(parts[1]);
      const nodeId = parts[2] && find(s.root, parts[2]) ? parts[2] : s.root.id;
      const mode = ['fiche', 'carte', 'revision'].includes(parts[3]) ? parts[3] : 'fiche';
      if (mode !== 'revision') review = null;
      view = { name: 'subject', id: s.id, nodeId, mode };
    } else {
      view = { name: 'home' };
      review = null;
    }
    render();
    window.scrollTo({ top: 0 });
  }
  const link = (sid, nid, mode = 'fiche') => `#/s/${sid}/${nid}/${mode}`;

  /* ---------- Rendu ---------- */
  function render() {
    app.className = '';
    void app.offsetWidth;
    app.className = 'enter';
    if (view.name === 'home') renderHome();
    else renderSubject();
  }

  function ring(pct, color, size = 64) {
    return `<div class="ring" style="--p:${pct};--c:${color};--s:${size}px"><span>${pct}%</span></div>`;
  }

  function renderHome() {
    document.documentElement.style.removeProperty('--accent');
    const total = state.subjects.reduce((a, s) => a + stats(s.root).total, 0);
    const done = state.subjects.reduce((a, s) => a + stats(s.root).done, 0);
    app.innerHTML = `
      <section class="home">
        <div class="hero">
          <h1>Qu’apprends-tu <span class="grad">aujourd’hui</span> ?</h1>
          <p>Découpe chaque sujet en petites branches, note l’essentiel, et fais pousser ton arbre de connaissances.</p>
          <div class="hero-stats">
            <div><b>${state.subjects.length}</b><span>sujets</span></div>
            <div><b>${total}</b><span>parties</span></div>
            <div><b>${done}</b><span>maîtrisées</span></div>
          </div>
        </div>
        <div class="grid">
          <button class="card new-card" data-act="new-subject">
            <span class="plus">＋</span><b>Nouveau sujet</b><small>Partir de zéro ou coller un plan</small>
          </button>
          <button class="card new-card pdf" data-act="import-pdf">
            <span class="plus">📄</span><b>Depuis un PDF</b><small>Arbor extrait et classe l’essentiel</small>
          </button>
          ${state.subjects
            .slice()
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((s, i) => {
              const st = stats(s.root);
              return `
              <article class="card subject-card" style="--c:${s.color};--i:${i}" data-open="${s.id}" tabindex="0">
                <div class="sc-top">
                  <span class="sc-emoji">${s.emoji}</span>
                  <button class="icon-btn sm" data-act="edit-subject" data-id="${s.id}" title="Modifier">✎</button>
                </div>
                <h3>${esc(s.title)}</h3>
                <div class="sc-bottom">
                  <div class="sc-meta">
                    <span>🌿 ${st.total} parties</span>
                    <span>✅ ${st.done} maîtrisées</span>
                  </div>
                  ${ring(st.pct, s.color, 56)}
                </div>
              </article>`;
            })
            .join('')}
        </div>
      </section>`;
  }

  function renderSubject() {
    const s = subjectById(view.id);
    const st = stats(s.root);
    document.documentElement.style.setProperty('--accent', s.color);
    app.innerHTML = `
      <section class="subject" style="--c:${s.color}">
        <aside class="tree-pane" id="treePane">
          <div class="tp-head">
            <a class="back-link" href="#/">← Sujets</a>
            <div class="tp-title">
              <span class="sc-emoji">${s.emoji}</span>
              <div>
                <h2>${esc(s.title)}</h2>
                <div class="progress"><span style="width:${st.pct}%"></span></div>
                <small>${st.done}/${st.total} maîtrisées · ${st.pct}%</small>
              </div>
            </div>
            <input class="search" id="treeSearch" placeholder="🔍 Filtrer les parties…" value="${esc(treeFilter)}" />
          </div>
          <ul class="tree" id="tree" role="tree"></ul>
          <div class="tp-foot">
            <button class="btn ghost sm" data-act="add-child" data-id="${s.root.id}">＋ Partie</button>
            <button class="btn ghost sm" data-act="bulk-add" data-id="${s.root.id}">☰ Coller un plan</button>
          </div>
        </aside>
        <div class="main-pane">
          <div class="tabs">
            <button class="tab ${view.mode === 'fiche' ? 'on' : ''}" data-mode="fiche">📝 Fiche</button>
            <button class="tab ${view.mode === 'carte' ? 'on' : ''}" data-mode="carte">🗺️ Carte</button>
            <button class="tab ${view.mode === 'revision' ? 'on' : ''}" data-mode="revision">🃏 Révision</button>
            <span class="tabs-spacer"></span>
            <button class="icon-btn" id="toggleTree" title="Afficher l’arbre">🌳</button>
          </div>
          <div class="pane-body" id="paneBody"></div>
        </div>
      </section>`;
    renderTree();
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
    const li = (n, depth) => {
      if (!matches(n, q)) return '';
      const hasKids = n.children.length > 0;
      const open = q ? true : !n.collapsed;
      const active = n.id === view.nodeId ? 'active' : '';
      return `
        <li role="treeitem" aria-expanded="${hasKids ? open : ''}" style="--d:${depth}">
          <div class="row ${active} st-${n.status}" draggable="${depth > 0}" data-node="${n.id}">
            <button class="caret ${hasKids ? '' : 'none'} ${open ? 'open' : ''}" data-act="toggle" data-id="${n.id}" tabindex="-1">▸</button>
            <button class="dot" data-act="cycle" data-id="${n.id}" title="${STATUS[n.status].label} — cliquer pour changer"></button>
            <span class="label">${esc(n.title)}</span>
            ${hasKids ? `<span class="count">${n.children.length}</span>` : ''}
            <button class="add" data-act="add-child" data-id="${n.id}" title="Ajouter une sous-partie">＋</button>
          </div>
          ${hasKids ? `<ul class="${open ? '' : 'closed'}">${n.children.map((c) => li(c, depth + 1)).join('')}</ul>` : ''}
        </li>`;
    };
    const kids = s.root.children.map((c) => li(c, 0)).join('');
    $('#tree').innerHTML = `
      <li style="--d:0"><div class="row root ${view.nodeId === s.root.id ? 'active' : ''}" data-node="${s.root.id}">
        <span class="caret none"></span><span class="label">🏠 Vue d’ensemble</span></div></li>
      ${kids || '<li class="empty">Aucune partie pour l’instant.<br/>Clique sur ＋ Partie.</li>'}`;
  }

  /* ----- Fiche (détail d'une partie) ----- */
  function renderFiche() {
    const s = subjectById(view.id);
    const { node } = find(s.root, view.nodeId);
    const path = pathTo(s.root, node.id);
    const isRoot = node.id === s.root.id;
    const st = stats(node);
    $('#paneBody').innerHTML = `
      <div class="fiche">
        <nav class="crumbs">${path
          .map((p, i) => i === path.length - 1
            ? `<span>${esc(i === 0 ? s.title : p.title)}</span>`
            : `<a href="${link(s.id, p.id)}">${esc(i === 0 ? s.title : p.title)}</a>`)
          .join('<i>›</i>')}</nav>

        <div class="fiche-head">
          <textarea class="title-input" id="titleInput" rows="1" placeholder="Titre de la partie">${esc(isRoot ? s.title : node.title)}</textarea>
          ${node.children.length ? ring(st.pct, s.color, 54) : ''}
        </div>

        ${isRoot && node.children.length ? '' : `<div class="status-seg" role="radiogroup">
          ${Object.entries(STATUS).map(([k, v]) => `<button class="seg st-${k} ${node.status === k ? 'on' : ''}" data-act="status" data-st="${k}">${v.icon} ${v.label}</button>`).join('')}
        </div>`}

        <section class="block">
          <header><h3>⭐ Points clés</h3><button class="btn ghost sm" data-act="add-kp">＋ Ajouter</button></header>
          <ul class="kps" id="kps">
            ${node.keyPoints.map((k, i) => `
              <li style="--i:${i}"><span class="kp-n">${i + 1}</span>
                <div class="kp-text" contenteditable="true" data-kp="${i}" spellcheck="true">${esc(k)}</div>
                <button class="icon-btn sm" data-act="del-kp" data-i="${i}" title="Supprimer">✕</button></li>`).join('')}
          </ul>
          ${node.keyPoints.length ? '' : '<p class="muted">Les idées à retenir absolument. Elles apparaissent au verso des cartes de révision.</p>'}
        </section>

        <section class="block">
          <header><h3>🗒️ Notes</h3>
            <div class="mini-seg">
              <button class="${notesMode === 'preview' ? 'on' : ''}" data-act="notes-mode" data-m="preview">Aperçu</button>
              <button class="${notesMode === 'edit' ? 'on' : ''}" data-act="notes-mode" data-m="edit">Éditer</button>
            </div>
          </header>
          ${notesMode === 'edit'
            ? `<textarea class="notes-input" id="notesInput" placeholder="Écris tes notes… (# titre, - liste, **gras**, ==surligné==)">${esc(node.notes)}</textarea>
               <p class="hint">Astuce : **gras** · *italique* · ==surligné== · \`code\` · - liste · # titre</p>`
            : `<div class="notes-view md" data-act="notes-mode" data-m="edit" title="Cliquer pour éditer">${node.notes.trim() ? MD.render(node.notes) : '<p class="muted">Aucune note. Clique ici pour écrire.</p>'}</div>`}
        </section>

        <section class="block">
          <header><h3>🌿 Sous-parties <span class="muted">(${node.children.length})</span></h3>
            <div class="row-btns">
              <button class="btn ghost sm" data-act="bulk-add" data-id="${node.id}">☰ Coller un plan</button>
              <button class="btn sm" data-act="add-child" data-id="${node.id}">＋ Sous-partie</button>
            </div>
          </header>
          <div class="sub-grid">
            ${node.children.map((c, i) => {
              const cs = stats(c);
              return `<a class="sub-card st-${c.status}" href="${link(s.id, c.id)}" style="--i:${i}">
                <span class="sub-dot"></span>
                <b>${esc(c.title)}</b>
                <small>${c.children.length ? `${c.children.length} sous-parties · ${cs.pct}%` : STATUS[c.status].label}</small>
              </a>`;
            }).join('') || '<p class="muted">Découpe cette partie en morceaux plus petits pour mieux l’apprendre.</p>'}
          </div>
        </section>

        <div class="fiche-foot">
          ${isRoot
            ? `<button class="btn ghost sm" data-act="edit-subject" data-id="${s.id}">✎ Modifier le sujet</button>
               <button class="btn ghost sm" data-act="export-subject">⬇ Exporter</button>`
            : `<button class="btn ghost sm" data-act="move" data-dir="-1">↑ Monter</button>
               <button class="btn ghost sm" data-act="move" data-dir="1">↓ Descendre</button>
               <button class="btn danger sm" data-act="del-node">🗑 Supprimer la partie</button>`}
        </div>
      </div>`;
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
        <a class="mm-node st-${n.status} ${n.id === view.nodeId ? 'active' : ''}" href="${link(s.id, n.id)}" style="--d:${depth}">
          ${depth === 0 ? `<span>${s.emoji}</span>` : '<span class="sub-dot"></span>'}
          ${esc(depth === 0 ? s.title : n.title)}
        </a>
        ${n.children.length ? `<div class="mm-children">${n.children.map((c) => node(c, depth + 1)).join('')}</div>` : ''}
      </div>`;
    $('#paneBody').innerHTML = `
      <div class="map-wrap">
        <p class="muted map-hint">Clique sur une branche pour ouvrir sa fiche. Couleur = statut (gris : à apprendre, orange : en cours, vert : maîtrisé).</p>
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
    // mélange léger
    for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
    review = { cards, i: 0, flipped: false, known: 0, again: 0, scope: base.id };
  }

  function renderReview() {
    const s = subjectById(view.id);
    const pane = $('#paneBody');
    if (!review) {
      const base = find(s.root, view.nodeId).node;
      const st = stats(base);
      pane.innerHTML = `
        <div class="review-start">
          <div class="big-emoji">🃏</div>
          <h2>Révision : ${esc(base.id === s.root.id ? s.title : base.title)}</h2>
          <p class="muted">${st.total} cartes · ${st.total - st.done} pas encore maîtrisées</p>
          <div class="row-btns center">
            <button class="btn" data-act="review-go" data-only="1" ${st.total - st.done ? '' : 'disabled'}>Réviser ce qui reste (${st.total - st.done})</button>
            <button class="btn ghost" data-act="review-go" data-only="0">Tout réviser (${st.total})</button>
          </div>
          <p class="hint">Astuce : sélectionne une partie dans l’arbre pour ne réviser que cette branche. Raccourcis : <kbd>Espace</kbd> retourner, <kbd>←</kbd> à revoir, <kbd>→</kbd> je maîtrise.</p>
        </div>`;
      return;
    }
    if (review.i >= review.cards.length) {
      pane.innerHTML = `
        <div class="review-start">
          <div class="big-emoji">🏆</div>
          <h2>Session terminée !</h2>
          <p><b class="txt-ok">${review.known}</b> maîtrisées · <b class="txt-warn">${review.again}</b> à revoir</p>
          <div class="row-btns center">
            <button class="btn" data-act="review-reset">Nouvelle session</button>
            <a class="btn ghost" href="${link(s.id, view.nodeId)}">Retour à la fiche</a>
          </div>
        </div>`;
      if (review.known && !review.celebrated) { review.celebrated = true; FX.confetti(undefined, undefined, 140); }
      return;
    }
    const f = find(s.root, review.cards[review.i]);
    if (!f) { review.i++; return renderReview(); }
    const n = f.node;
    const path = pathTo(s.root, n.id).slice(1, -1).map((p) => p.title);
    const back = `${n.keyPoints.length ? `<ul class="kps-back">${n.keyPoints.map((k) => `<li>${MD.render(k).replace(/^<p>|<\/p>$/g, '')}</li>`).join('')}</ul>` : ''}
      ${n.notes.trim() ? `<div class="md">${MD.render(n.notes)}</div>` : ''}
      ${!n.keyPoints.length && !n.notes.trim() ? `<p class="muted">Pas encore de contenu. Sous-parties : ${n.children.map((c) => esc(c.title)).join(', ') || '—'}</p>` : ''}`;
    pane.innerHTML = `
      <div class="review">
        <div class="review-bar"><span style="width:${(review.i / review.cards.length) * 100}%"></span></div>
        <p class="muted center">Carte ${review.i + 1} / ${review.cards.length}</p>
        <div class="flip ${review.flipped ? 'flipped' : ''}" data-act="flip" tabindex="0">
          <div class="flip-inner">
            <div class="face front">
              <small>${esc(path.join(' › ') || s.title)}</small>
              <h2>${esc(n.title)}</h2>
              <p class="muted">Que sais-tu sur cette partie ? Réfléchis, puis retourne la carte.</p>
              <span class="tap">👆 Retourner</span>
            </div>
            <div class="face back"><h3>${esc(n.title)}</h3>${back}</div>
          </div>
        </div>
        <div class="row-btns center review-actions ${review.flipped ? '' : 'dim'}">
          <button class="btn warn" data-act="review-answer" data-ok="0">↺ À revoir</button>
          <button class="btn ok" data-act="review-answer" data-ok="1">✓ Je maîtrise</button>
        </div>
      </div>`;
  }

  /* ---------- Modales ---------- */
  function openModal(html, onMount) {
    $('#modalBody').innerHTML = html;
    $('#modal').hidden = false;
    requestAnimationFrame(() => $('#modal').classList.add('show'));
    onMount && onMount($('#modalBody'));
    const first = $('#modalBody input, #modalBody textarea');
    if (first) setTimeout(() => first.focus(), 60);
  }
  function closeModal() {
    $('#modal').classList.remove('show');
    setTimeout(() => { $('#modal').hidden = true; $('#modalBody').innerHTML = ''; }, 200);
  }
  $('#modalClose').onclick = closeModal;
  $('#modal').addEventListener('mousedown', (e) => { if (e.target.id === 'modal') closeModal(); });

  const pickers = (color, emoji) => `
    <label>Emoji</label>
    <div class="emoji-pick">${EMOJIS.map((e) => `<button type="button" class="${e === emoji ? 'on' : ''}" data-emoji="${e}">${e}</button>`).join('')}</div>
    <label>Couleur</label>
    <div class="color-pick">${PALETTE.map((c) => `<button type="button" class="${c === color ? 'on' : ''}" data-color="${c}" style="--c:${c}"></button>`).join('')}</div>`;
  function bindPickers(el, sel) {
    el.addEventListener('click', (e) => {
      const em = e.target.closest('[data-emoji]');
      const co = e.target.closest('[data-color]');
      if (em) { sel.emoji = em.dataset.emoji; $$('[data-emoji]', el).forEach((b) => b.classList.toggle('on', b === em)); }
      if (co) { sel.color = co.dataset.color; $$('[data-color]', el).forEach((b) => b.classList.toggle('on', b === co)); }
    });
  }

  /* Plan indenté → nœuds. Chaque niveau d'indentation (2 espaces, tab ou tiret) = un niveau */
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
    const sel = { color: PALETTE[state.subjects.length % PALETTE.length], emoji: EMOJIS[state.subjects.length % EMOJIS.length] };
    openModal(`
      <h2>🌱 Nouveau sujet</h2>
      <form id="nsForm" class="form">
        <label for="nsTitle">Titre</label>
        <input id="nsTitle" required placeholder="Ex. La Révolution française" />
        ${pickers(sel.color, sel.emoji)}
        <label for="nsPlan">Plan rapide <span class="muted">(optionnel — une ligne par partie, indente pour les sous-parties)</span></label>
        <textarea id="nsPlan" rows="6" placeholder="Les causes\n  Crise financière\n  Idées des Lumières\nLes grandes étapes\n  1789\n  La Terreur"></textarea>
        <div class="row-btns end"><button type="button" class="btn ghost" data-close>Annuler</button><button class="btn">Créer</button></div>
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
        FX.toast('Sujet créé 🌱', 'success');
        go(link(s.id, s.root.id));
      };
    });
  }

  function editSubjectModal(id) {
    const s = subjectById(id);
    const sel = { color: s.color, emoji: s.emoji };
    openModal(`
      <h2>✎ Modifier le sujet</h2>
      <form id="esForm" class="form">
        <label for="esTitle">Titre</label>
        <input id="esTitle" value="${esc(s.title)}" />
        ${pickers(sel.color, sel.emoji)}
        <div class="row-btns spread">
          <button type="button" class="btn danger" id="esDel">🗑 Supprimer</button>
          <span class="row-btns"><button type="button" class="btn ghost" id="esExport">⬇ Exporter</button><button class="btn">Enregistrer</button></span>
        </div>
      </form>`, (el) => {
      bindPickers(el, sel);
      $('#esExport', el).onclick = () => exportJSON(s, s.title);
      $('#esDel', el).onclick = () => {
        if (!confirm(`Supprimer « ${s.title} » et toutes ses parties ?`)) return;
        state.subjects = state.subjects.filter((x) => x.id !== id);
        save(); closeModal(); FX.toast('Sujet supprimé'); go('#/');
      };
      $('#esForm', el).onsubmit = (e) => {
        e.preventDefault();
        s.title = $('#esTitle', el).value.trim() || s.title;
        s.root.title = s.title;
        s.color = sel.color; s.emoji = sel.emoji;
        touch(); closeModal(); render();
      };
    });
  }

  function bulkAddModal(parentId) {
    const s = subjectById(view.id);
    const parent = find(s.root, parentId).node;
    openModal(`
      <h2>☰ Coller un plan</h2>
      <p class="muted">Dans « ${esc(parentId === s.root.id ? s.title : parent.title)} ». Une ligne par partie ; indente (espaces ou tabulation) pour créer des sous-parties.</p>
      <form id="baForm" class="form">
        <textarea id="baText" rows="10" placeholder="Introduction\nPartie 1\n  Notion A\n  Notion B\nPartie 2"></textarea>
        <div class="row-btns end"><button type="button" class="btn ghost" data-close>Annuler</button><button class="btn">Ajouter</button></div>
      </form>`, (el) => {
      $('[data-close]', el).onclick = closeModal;
      $('#baForm', el).onsubmit = (e) => {
        e.preventDefault();
        const nodes = parseOutline($('#baText', el).value);
        parent.children.push(...nodes);
        parent.collapsed = false;
        touch(); closeModal(); render();
        FX.toast(`${nodes.length} partie(s) ajoutée(s)`, 'success');
      };
    });
  }

  function settingsModal() {
    const st = state.settings;
    openModal(`
      <h2>⚙️ Réglages</h2>
      <form id="setForm" class="form">
        <label for="apiKey">Clé API Claude <span class="muted">(optionnelle, pour l’import PDF intelligent)</span></label>
        <input id="apiKey" type="password" autocomplete="off" placeholder="sk-ant-…" value="${esc(st.apiKey || '')}" />
        <p class="hint">La clé est stockée uniquement dans ce navigateur et envoyée seulement à l’API d’Anthropic. Ne l’utilise pas sur un ordinateur partagé. Crée-la sur console.anthropic.com.</p>
        <label for="model">Modèle</label>
        <select id="model">
          ${[['claude-opus-5-5', 'Claude Opus 5.5 — le plus fin (recommandé)'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5 — plus rapide, moins cher'], ['claude-haiku-5-5', 'Claude Haiku 5.5 — très économique']]
            .map(([v, l]) => `<option value="${v}" ${st.model === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <label>Sauvegarde</label>
        <div class="row-btns">
          <button type="button" class="btn ghost sm" id="expAll">⬇ Exporter tout (JSON)</button>
          <button type="button" class="btn ghost sm" id="impAll">⬆ Importer un JSON</button>
        </div>
        <div class="row-btns end"><button class="btn">Enregistrer</button></div>
      </form>`, (el) => {
      $('#expAll', el).onclick = () => exportJSON({ subjects: state.subjects, xp: state.xp }, 'arbor-sauvegarde');
      $('#impAll', el).onclick = () => $('#jsonInput').click();
      $('#setForm', el).onsubmit = (e) => {
        e.preventDefault();
        st.apiKey = $('#apiKey', el).value.trim();
        st.model = $('#model', el).value;
        save(); closeModal(); FX.toast('Réglages enregistrés', 'success');
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
  }

  $('#jsonInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const list = Array.isArray(data.subjects) ? data.subjects : data.root ? [data] : [];
      if (!list.length) throw new Error('format');
      list.forEach((s) => {
        const ns = makeSubject(s.title || 'Sujet importé', { color: s.color, emoji: s.emoji, root: normalize(s.root) });
        state.subjects.push(ns);
      });
      if (typeof data.xp === 'number') state.xp = Math.max(state.xp, data.xp);
      save(); closeModal(); renderXP(); go('#/');
      FX.toast(`${list.length} sujet(s) importé(s)`, 'success');
    } catch (err) {
      FX.toast('Fichier JSON non reconnu', 'error');
    }
  });

  /* ---------- Import PDF ---------- */
  let pdfFile = null;
  function pdfModal() {
    pdfFile = null;
    const hasKey = !!state.settings.apiKey;
    const inSubject = view.name === 'subject';
    openModal(`
      <h2>📄 Importer un PDF</h2>
      <p class="muted">Arbor repère les titres, les définitions et les phrases importantes, puis range tout dans une arborescence de parties et sous-parties.</p>
      <div class="drop" id="drop">
        <div class="drop-icon">📥</div>
        <b id="dropLabel">Glisse ton PDF ici</b>
        <small>ou clique pour choisir un fichier</small>
      </div>
      <div class="mode-pick">
        <label class="mode"><input type="radio" name="mode" value="local" ${hasKey ? '' : 'checked'} />
          <span><b>⚡ Analyse locale</b><small>Gratuite, instantanée, rien ne quitte ton ordinateur.</small></span></label>
        <label class="mode ${hasKey ? '' : 'locked'}"><input type="radio" name="mode" value="ai" ${hasKey ? 'checked' : ''} ${hasKey ? '' : 'disabled'} />
          <span><b>✨ Analyse par Claude</b><small>${hasKey ? 'Compréhension fine du contenu, résumés et points clés rédigés.' : 'Ajoute ta clé API dans ⚙️ Réglages pour l’activer.'}</small></span></label>
      </div>
      ${inSubject ? `<label class="check"><input type="checkbox" id="intoCurrent" /> Ajouter dans la partie ouverte plutôt que créer un nouveau sujet</label>` : ''}
      <div class="row-btns end"><button class="btn" id="pdfGo" disabled>Analyser</button></div>`, (el) => {
      const drop = $('#drop', el);
      const setFile = (f) => {
        if (!f || !/pdf$/i.test(f.type || f.name)) { FX.toast('Choisis un fichier PDF', 'error'); return; }
        pdfFile = f;
        $('#dropLabel', el).textContent = `✅ ${f.name}`;
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
        <div class="tree-loader"><span></span><span></span><span></span><span></span><span></span></div>
        <h3 id="ldTitle">Lecture du PDF…</h3>
        <div class="progress big"><span id="ldBar" style="width:5%"></span></div>
        <p class="muted" id="ldMsg">${esc(file.name)}</p>
      </div>`;
    const setMsg = (m) => { const e = $('#ldTitle'); if (e) e.textContent = m; };
    const setPct = (p) => { const e = $('#ldBar'); if (e) e.style.width = `${Math.max(5, p * 100)}%`; };
    try {
      let tree;
      if (mode === 'ai') {
        let fake = 0.05;
        const t = setInterval(() => { fake = Math.min(0.92, fake + (0.95 - fake) * 0.04); setPct(fake); }, 400);
        try { tree = await AI.structure(file, state.settings.apiKey, state.settings.model, setMsg); }
        finally { clearInterval(t); }
      } else {
        const res = await PdfImport.analyze(file, (p) => { setPct(p * 0.9); setMsg(`Lecture des pages… ${Math.round(p * 100)}%`); });
        setMsg('Classement des informations…');
        tree = res.tree;
      }
      setPct(1);
      previewImport(normalize(tree), into);
    } catch (err) {
      console.error(err);
      const msg = err && err.status === 401 ? 'Clé API invalide.' : (err && err.message) || 'Erreur inconnue';
      $('#modalBody').innerHTML = `
        <div class="loading"><div class="big-emoji">😕</div><h3>Import impossible</h3><p class="muted">${esc(msg)}</p>
        <div class="row-btns center"><button class="btn" id="retry">Réessayer</button></div></div>`;
      $('#retry').onclick = pdfModal;
    }
  }

  function previewImport(root, into) {
    let count = 0, kps = 0;
    walk(root, (n) => { count++; kps += n.keyPoints.length; });
    const sel = { color: PALETTE[state.subjects.length % PALETTE.length], emoji: '📚' };
    const outline = (n, d) => `<li style="--i:${Math.min(count, 40)}"><span>${esc(n.title)}</span>${n.keyPoints.length ? ` <em>⭐${n.keyPoints.length}</em>` : ''}
      ${n.children.length ? `<ul>${n.children.map((c) => outline(c, d + 1)).join('')}</ul>` : ''}</li>`;
    FX.confetti(undefined, undefined, 60);
    $('#modalBody').innerHTML = `
      <h2>✅ Cours structuré !</h2>
      <p class="muted">${count - 1} parties et sous-parties · ${kps} points clés extraits. Tu pourras tout modifier ensuite.</p>
      <form id="pvForm" class="form">
        ${into ? '' : `<label for="pvTitle">Titre du sujet</label><input id="pvTitle" value="${esc(root.title)}" />${pickers(sel.color, sel.emoji)}`}
        <div class="outline"><ul>${root.children.map((c) => outline(c, 0)).join('') || '<li>Aucune partie détectée</li>'}</ul></div>
        <div class="row-btns end"><button type="button" class="btn ghost" data-close>Annuler</button><button class="btn">${into ? 'Ajouter ici' : 'Créer le cours'}</button></div>
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
      FX.toast('Cours importé 🎉', 'success');
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
    setTimeout(() => { const t = $('#titleInput'); if (t) { t.focus(); t.select(); } }, 80);
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act], [data-open], [data-mode], .row[data-node]');
    if (!t) return;
    const act = t.dataset.act;

    if (t.dataset.open && !e.target.closest('[data-act]')) { go(link(t.dataset.open, subjectById(t.dataset.open).root.id)); return; }
    if (t.dataset.mode) { go(link(view.id, view.nodeId, t.dataset.mode)); return; }
    if (!act && t.matches('.row[data-node]')) {
      $('#treePane') && $('#treePane').classList.remove('open');
      go(link(view.id, t.dataset.node, view.mode === 'carte' ? 'fiche' : view.mode));
      if (view.mode === 'revision') { review = null; renderReview(); }
      return;
    }

    const s = view.id && subjectById(view.id);
    switch (act) {
      case 'new-subject': newSubjectModal(); break;
      case 'import-pdf': pdfModal(); break;
      case 'edit-subject': e.stopPropagation(); editSubjectModal(t.dataset.id); break;
      case 'toggle': {
        e.stopPropagation();
        const f = find(s.root, t.dataset.id);
        f.node.collapsed = !f.node.collapsed; save(); renderTree(); break;
      }
      case 'cycle': {
        e.stopPropagation();
        const f = find(s.root, t.dataset.id);
        const order = ['todo', 'doing', 'done'];
        setStatus(f.node, order[(order.indexOf(f.node.status) + 1) % 3], t);
        render(); break;
      }
      case 'add-child': e.stopPropagation(); addChild(t.dataset.id); break;
      case 'bulk-add': bulkAddModal(t.dataset.id); break;
      case 'status': setStatus(currentNode().node, t.dataset.st, t); renderFiche(); renderTree(); refreshProgress(); break;
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
        if (j < 0 || j >= parent.children.length) break;
        parent.children.splice(i, 1); parent.children.splice(j, 0, node);
        touch(); renderTree(); FX.toast(t.dataset.dir < 0 ? 'Partie montée' : 'Partie descendue'); break;
      }
      case 'del-node': {
        const { node, parent } = currentNode();
        let n = 0; walk(node, () => n++);
        if (!confirm(`Supprimer « ${node.title} »${n > 1 ? ` et ses ${n - 1} sous-parties` : ''} ?`)) break;
        parent.children = parent.children.filter((c) => c !== node);
        touch(); go(link(s.id, parent.id)); FX.toast('Partie supprimée'); break;
      }
      case 'export-subject': exportJSON(s, s.title); break;
      case 'review-go': startReview(t.dataset.only === '1'); renderReview(); break;
      case 'review-reset': review = null; renderReview(); break;
      case 'flip': review.flipped = !review.flipped; $('.flip').classList.toggle('flipped', review.flipped); $('.review-actions').classList.toggle('dim', !review.flipped); break;
      case 'review-answer': answer(t.dataset.ok === '1', t); break;
    }
  });

  function answer(ok, origin) {
    if (!review || review.i >= review.cards.length) return;
    const s = subjectById(view.id);
    const f = find(s.root, review.cards[review.i]);
    if (f) setStatus(f.node, ok ? 'done' : 'doing', origin);
    if (ok) review.known++; else review.again++;
    review.i++; review.flipped = false;
    renderReview(); renderTree(); refreshProgress();
  }

  function refreshProgress() {
    const s = subjectById(view.id);
    if (!s) return;
    const st = stats(s.root);
    const bar = $('.tp-title .progress span');
    if (bar) bar.style.width = `${st.pct}%`;
    const sm = $('.tp-title small');
    if (sm) sm.textContent = `${st.done}/${st.total} maîtrisées · ${st.pct}%`;
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
    // raccourcis de révision
    if (view.mode === 'revision' && review && review.i < review.cards.length && !e.target.closest('input, textarea, [contenteditable]')) {
      if (e.key === ' ') { e.preventDefault(); $('.flip') && $('.flip').click(); }
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
    if (e.target.id === 'titleInput') renderTree();
  });

  /* Glisser-déposer dans l'arbre : déposer sur une partie la range dedans */
  let dragId = null;
  document.addEventListener('dragstart', (e) => {
    const row = e.target.closest && e.target.closest('.row[data-node]');
    if (!row) return;
    dragId = row.dataset.node;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
  });
  document.addEventListener('dragend', () => { dragId = null; $$('.row.dragging, .row.drop-target').forEach((r) => r.classList.remove('dragging', 'drop-target')); });
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
    if (!src || !dst || isDescendant(src.node, dst.node.id)) { FX.toast('Impossible de ranger une partie dans elle-même', 'error'); return; }
    src.parent.children = src.parent.children.filter((c) => c !== src.node);
    dst.node.children.push(src.node);
    dst.node.collapsed = false;
    touch(); render();
    FX.toast(`Rangé dans « ${dst.node.id === s.root.id ? s.title : dst.node.title} »`, 'success');
  });

  /* Boutons globaux */
  $('#homeBtn').onclick = () => go('#/');
  $('#importPdfBtn').onclick = pdfModal;
  $('#settingsBtn').onclick = settingsModal;
  $('#themeBtn').onclick = () => { state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark'; applyTheme(); save(); };
  document.addEventListener('click', (e) => { if (e.target.closest('#toggleTree')) $('#treePane').classList.toggle('open'); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches && e.target.matches('.subject-card')) e.target.click();
  });

  window.addEventListener('hashchange', route);
  applyTheme();
  renderXP();
  route();
})();
