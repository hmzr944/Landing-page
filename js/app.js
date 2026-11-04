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
  let treeFilter = '';
  let notesMode = 'preview';
  const pretestSeen = new Set(); // parties dont on a déjà révélé les points clés pendant cette visite

  const save = () => Store.save(state);
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let popId = null; // partie qui vient d'être maîtrisée : sa pastille fait un petit « pop »
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
  function applyCalm() {
    document.documentElement.classList.toggle('calm', !!state.settings.calm);
    window.Mascot && Mascot.setCalm && Mascot.setCalm(!!state.settings.calm);
  }

  let shownXP = state.xp;
  function renderXP(bump) {
    const lvl = Math.floor(state.xp / 100) + 1;
    $('#xpLevel').textContent = `Niv. ${lvl}`;
    $('#xpFill').style.transform = `scaleX(${(state.xp % 100) / 100})`;
    // Compteur qui défile jusqu'à la nouvelle valeur (moment rare : gain d'XP)
    const from = shownXP, to = state.xp;
    shownXP = to;
    if (!bump || reducedMotion() || from === to) { $('#xpNum').textContent = `${fmt.format(to)} XP`; }
    else {
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 600);
        const e = 1 - Math.pow(1 - k, 3);
        $('#xpNum').textContent = `${fmt.format(Math.round(from + (to - from) * e))} XP`;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    if (bump) { const x = $('#xp'); x.classList.remove('bump'); void x.offsetWidth; x.classList.add('bump'); }
    window.Mascot && Mascot.setLevel(lvl);
  }
  const derivedStatus = (n) => (!n.srs ? 'todo' : n.srs.s >= 21 ? 'done' : 'doing');
  function setStatus(node, status, origin) {
    const prev = node.status;
    node.status = status;
    if (status === 'done' && prev !== 'done') {
      popId = node.id;
      const lvlBefore = Math.floor(state.xp / 100);
      const r = origin && origin.getBoundingClientRect ? origin.getBoundingClientRect() : null;
      FX.confetti(r ? r.left + r.width / 2 : undefined, r ? r.top : undefined, 40);
      gainXP(10);
      if (Math.floor(state.xp / 100) === lvlBefore) Mascot.react('done');
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
      view = { name: 'subject', id: s.id, nodeId, mode };
    } else if (parts[0] === 'reviser') {
      view = { name: 'study' };
    } else if (parts[0] === 'methode') {
      view = { name: 'method' };
    } else {
      view = { name: 'home' };
    }
    $$('[data-nav]').forEach((a) => { if (a.dataset.nav === view.name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    render(prev);
  }
  const link = (sid, nid, mode = 'fiche') => `#/s/${sid}/${nid}/${mode}`;

  /* ---------- Rendu ---------- */
  function render(prev = {}) {
    // Transition seulement quand on change d'écran ou d'onglet (pas à chaque clic dans l'arbre)
    const bigChange = prev.name !== view.name || prev.id !== view.id;
    const modeChange = !bigChange && prev.mode !== view.mode;
    const paint = () => { try { paintNow(); } catch (err) { console.error(err); throw err; } };
    const paintNow = () => {
      if (view.name === 'home') renderHome();
      else if (view.name === 'study') renderGlobalStudy();
      else if (view.name === 'method') renderMethod();
      else renderSubject(bigChange);
      updateBadges();
      if (bigChange) { app.classList.remove('enter'); void app.offsetWidth; app.classList.add('enter'); window.scrollTo({ top: 0 }); }
      afterPaint();
    };
    if ((bigChange || modeChange) && document.startViewTransition && !reducedMotion() && prev.name) {
      document.documentElement.dataset.vt = bigChange ? 'page' : (['fiche', 'carte', 'revision'].indexOf(view.mode) > ['fiche', 'carte', 'revision'].indexOf(prev.mode) ? 'forward' : 'back');
      const vt = document.startViewTransition(paint);
      // Une transition interrompue par une autre navigation est normale : on ignore son rejet
      vt.ready.catch(() => {});
      vt.updateCallbackDone.catch(() => {});
      vt.finished.catch(() => {}).then(() => { delete document.documentElement.dataset.vt; });
    } else paint();
  }

  // Petits effets après chaque rendu
  function afterPaint() {
    if (popId) {
      $$(`.row[data-node="${popId}"] .dot, .seg[aria-pressed="true"].st-done, .sub-card[data-id="${popId}"] .sdot`).forEach((el) => {
        el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      });
      popId = null;
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
        ${todayPanel()}
        ${weakPanel()}
        <header class="home-head">
          <div>
            <h2>Tes sujets</h2>
            <p class="lede">${plural(total, 'partie', 'parties')} réparties dans ${plural(subjects.length, 'sujet', 'sujets')}, dont ${fmt.format(done)} déjà ${done > 1 ? 'maîtrisées' : 'maîtrisée'}.</p>
          </div>
          <div class="row-btns">
            <button class="btn ghost show-mobile" data-act="import-pdf">${ic('file-arrow-up')}Importer un PDF</button>
            <button class="btn" data-act="new-subject">${ic('plus')}Nouveau sujet</button>
          </div>
        </header>

        <div class="subject-grid">
          <article class="featured" style="--c:${first.color}" data-open="${first.id}">
            <div class="featured-main">
              <div class="featured-top">
                <span class="tile" style="--c:${first.color}">${ic(first.icon, true)}</span>
                <button class="icon-btn sm" data-act="edit-subject" data-id="${first.id}" aria-label="Modifier « ${esc(first.title)} »">${ic('pencil-simple')}</button>
              </div>
              <p class="kicker">Ton dernier sujet</p>
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
                ${s.examDate ? `<span class="chip exam-chip">${ic('flag-checkered')}Examen le ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(s.examDate + 'T00:00'))}</span>` : ''}
                <span class="meta">${plural(st.total, 'partie', 'parties')}, ${st.pct} % maîtrisé${memAvg(s) !== null ? `, mémoire ${memAvg(s)} %` : ''}</span>
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
            <span class="dot" role="img" aria-label="${STATUS[n.status].label}"></span>
            <a class="label" href="${link(s.id, n.id, mode)}" ${active ? 'aria-current="page"' : ''}>${esc(n.title)}</a>
            ${SRS.isDue(n.srs) ? '<span class="due-dot" title="À revoir"></span>' : ''}
            ${hasKids ? `<span class="count num">${n.children.length}</span>` : ''}
            <button class="add" data-act="add-child" data-id="${n.id}" aria-label="Ajouter une sous-partie à « ${esc(n.title)} »">${ic('plus')}</button>
          </div>
          ${hasKids ? `<div class="kids ${open ? '' : 'closed'}" ${open ? '' : 'inert'}><ul role="group">${n.children.map((c) => li(c, depth + 1)).join('')}</ul></div>` : ''}
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

        ${isModule(s, node) ? modulePanel(s, node) : ''}
        ${memoryLine(s, node, isRoot)}
        ${isRoot && s.program ? programPanel(s) : ''}



        <section class="sec">
          <div class="sec-head"><h2>Points clés</h2><button class="btn ghost sm" data-act="add-kp">${ic('plus')}Ajouter</button></div>
          ${node.keyPoints.length && !node.srs && !pretestSeen.has(node.id) ? `<div class="pretest-cover">
              <p>${ic('lightbulb', true)}<span><b>Essaie d’abord de deviner.</b> Avant de lire, demande-toi ce que seraient les ${plural(node.keyPoints.length, 'point clé', 'points clés')}. Même faux, cet essai aide à retenir la réponse.</span></p>
              <button class="btn sm" data-act="pretest-reveal" data-id="${node.id}">${ic('eye')}Révéler les points clés</button>
            </div>` : ''}
          ${node.keyPoints.length ? `<ol class="kps ${!node.srs && !pretestSeen.has(node.id) ? 'pretest' : ''}" id="kps">
            ${node.keyPoints.map((k, i) => `
              <li><span class="kp-dot" aria-hidden="true"></span>
                <div class="kp-text" contenteditable="true" role="textbox" aria-label="Point clé ${i + 1}" data-kp="${i}">${esc(k)}</div>
                <button class="icon-btn sm" data-act="del-kp" data-i="${i}" aria-label="Supprimer le point clé ${i + 1}">${ic('x')}</button></li>`).join('')}
          </ol>` : '<p class="hint-empty">Les idées à retenir absolument. Elles s’affichent au dos des cartes de révision.</p>'}
        </section>

        <section class="sec">
          <div class="sec-head"><h2>Notes</h2>
            <div class="mini-seg" role="group" aria-label="Mode des notes">
              <button data-act="notes-mode" data-m="preview" aria-pressed="${notesMode === 'preview'}">Aperçu</button>
              <button data-act="notes-mode" data-m="edit" aria-pressed="${notesMode === 'edit'}">Éditer</button>
            </div>
          </div>
          ${notesMode === 'edit'
            ? `<textarea class="notes-input" id="notesInput" aria-label="Notes" placeholder="Écris tes notes…">${esc(node.notes)}</textarea>
               <p class="hint">**gras**, *italique*, ==surligné==, \`code\`, - liste, # titre. Chaque passage ==surligné== devient une question de révision.</p>`
            : node.notes.trim()
              ? `<div class="md notes-view">${MD.render(node.notes)}</div>${highlights(node.notes).length ? `<p class="hint hl-hint">${ic('highlighter-circle')}${plural(highlights(node.notes).length, 'passage surligné deviendra', 'passages surlignés deviendront')} des questions de révision.</p>` : ''}`
              : `<button class="notes-empty" data-act="notes-mode" data-m="edit">${ic('pencil-simple')}Écrire des notes pour cette partie</button>`}
        </section>

        ${courseSection(s, node, isRoot)}

        <section class="sec">
          <div class="sec-head"><h2>Ancre-la dans ta mémoire</h2></div>
          <p class="explain-prompt">Une notion s’oublie moins quand on lui donne du sens. Choisis une façon de l’ancrer :</p>
          <div class="anchor-chips" role="group" aria-label="Façons d’ancrer cette notion">
            ${ANCHORS.map(([k, label]) => `<button class="chip-btn" data-act="anchor" data-k="${k}">${label}</button>`).join('')}
          </div>
          <textarea class="notes-input explain-input" id="explainInput" rows="3" aria-label="Ton ancrage" placeholder="${esc(explainPrompt(node))}">${esc(node.explain)}</textarea>
          <p class="hint">Ce que tu écris ici apparaît au dos de la carte de révision.</p>
        </section>

        <section class="sec">
          <div class="sec-head"><h2>Exercices <span class="muted num">${(node.exercises || []).length}</span></h2>
            <button class="btn ghost sm" data-act="add-ex">${ic('plus')}Ajouter un exercice</button>
          </div>
          ${(node.exercises || []).length ? `<ol class="ex-list">
            ${node.exercises.map((e) => `
              <li class="ex-item" data-ex="${e.id}">
                <label class="sr-only" for="exq-${e.id}">Énoncé</label>
                <textarea class="ex-q" id="exq-${e.id}" data-exf="q" rows="2" placeholder="Énoncé de l’exercice…">${esc(e.q)}</textarea>
                <label class="ex-label" for="exa-${e.id}">Méthode et solution</label>
                <textarea class="ex-a" id="exa-${e.id}" data-exf="a" rows="2" placeholder="Les étapes, puis le résultat…">${esc(e.a)}</textarea>
                <button class="icon-btn sm ex-del" data-act="del-ex" aria-label="Supprimer cet exercice">${ic('trash')}</button>
              </li>`).join('')}
          </ol>` : '<p class="hint-empty">Pour les maths, la physique ou la compta : ajoute des exercices avec leur méthode. En révision, ils reviennent mélangés avec ceux des autres parties, ce qui t’entraîne à reconnaître quelle méthode utiliser.</p>'}
        </section>

        <section class="sec">
          <div class="sec-head"><h2>Sous-parties <span class="muted num">${node.children.length}</span></h2>
            <div class="row-btns">
              <button class="btn ghost sm" data-act="bulk-add" data-id="${node.id}">${ic('list-bullets')}Coller un plan</button>
              <button class="btn sm" data-act="add-child" data-id="${node.id}">${ic('plus')}Sous-partie</button>
            </div>
          </div>
          ${node.children.length ? `<div class="sub-grid">
            ${node.children.map((c, i) => {
              const cs = stats(c);
              return `<a class="sub-card" data-id="${c.id}" href="${link(s.id, c.id)}" style="--i:${i}">
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
    autoGrow($('#explainInput'));
    $$('.ex-q, .ex-a').forEach(autoGrow);
    const ni = $('#notesInput');
    if (ni) { autoGrow(ni); ni.focus(); ni.setSelectionRange(ni.value.length, ni.value.length); }
  }

  const EXPLAIN_PROMPTS = [
    'Comment l’expliquerais-tu à un ami de 12 ans ?',
    'Pourquoi est-ce vrai ? D’où ça vient ?',
    'À quoi ça se relie dans ce que tu sais déjà ?',
    'Quel exemple concret pourrais-tu donner ?',
  ];
  // Stratégies d'encodage profond (image, sens, phrase personnelle) : celles qui manquaient
  // aux étudiants avec un TDAH non traité dans l'étude de 2023, et que le test seul ne compense pas.
  const ANCHORS = [
    ['image', 'Une image mentale', 'Je l’imagine comme… '],
    ['example', 'Un exemple concret', 'Par exemple, … '],
    ['link', 'Un lien avec ce que je sais', 'Ça ressemble à… parce que… '],
    ['why', 'Pourquoi c’est vrai', 'C’est vrai parce que… '],
    ['own', 'Une phrase à moi', 'En une phrase : '],
  ];
  const explainPrompt = (node) => EXPLAIN_PROMPTS[[...node.id].reduce((a, c) => a + c.charCodeAt(0), 0) % EXPLAIN_PROMPTS.length];

  /* =========================================================
     Parcours de modules : un programme (liste de sujets) devient une suite de modules,
     chacun suivi avec la même méthode en 5 étapes, étalés jusqu'à l'examen.
     1. Ce que je sais déjà (prétest)   2. Découvrir (sources, recherche)   3. Découper en notions
     4. Ancrer (image, exemple, pourquoi)   5. Me tester (révision espacée)
     ========================================================= */
  const MOD_STEPS = [
    ['pretest', 'Ce que tu sais déjà'],
    ['learn', 'Découvrir'],
    ['split', 'Découper'],
    ['anchor', 'Ancrer'],
    ['test', 'Te tester'],
  ];
  const isModule = (s, node) => !!(s && s.program && node.module);
  function moduleSteps(node) {
    const m = node.module || {};
    let anchored = !!node.explain.trim(), tested = false;
    walk(node, (n) => { if (n !== node && n.explain.trim()) anchored = true; if (n.srs) tested = true; });
    return {
      pretest: (m.pretest || '').trim().length >= 10 || !!m.skipPretest,
      learn: !!m.learned || (!m.generated && (node.notes.trim().length > 80 || node.keyPoints.length >= 2)),
      split: node.children.length >= 2,
      anchor: anchored,
      test: tested,
    };
  }
  const moduleProgress = (node) => Object.values(moduleSteps(node)).filter(Boolean).length;
  function dayLabel(date) {
    if (!date) return '';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = Math.round((new Date(date + 'T00:00') - today) / SRS.DAY);
    return d === 0 ? 'Aujourd’hui' : d === 1 ? 'Demain' : d === -1 ? 'Hier' : d < 0 ? `En retard de ${-d} jours` : `Dans ${d} jours`;
  }
  const isoDay = (t) => SRS.dayKey(t);

  // Répartit les modules jusqu'à l'examen, en gardant la fin pour les révisions globales
  function scheduleModules(s) {
    const mods = s.root.children.filter((c) => c.module);
    if (!mods.length) return;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    let span;
    if (s.examDate) {
      const days = Math.max(1, Math.round((new Date(s.examDate + 'T00:00') - start) / SRS.DAY));
      span = Math.max(1, Math.floor(days * 0.8)); // 20 % du temps gardé pour réviser l'ensemble
    } else span = mods.length * (s.program.rhythm || 2);
    const todo = mods.filter((m) => moduleProgress(m) < 5);
    todo.forEach((m, i) => { m.module.date = isoDay(start.getTime() + Math.floor((i * span) / todo.length) * SRS.DAY); });
  }

  function makeProgram(title, topics, opts) {
    const s = makeSubject(title, { color: opts.color, icon: opts.icon });
    s.program = { rhythm: opts.rhythm || 2, createdAt: Date.now() };
    s.examDate = opts.examDate || null;
    let last = null;
    topics.forEach((t) => {
      if (t.depth > 0 && last) { last.children.push(makeNode(t.title)); return; }
      last = makeNode(t.title, { notes: t.goal ? `**Objectif.** ${t.goal}` : '', module: { pretest: '', learned: false, sources: [], date: null } });
      s.root.children.push(last);
    });
    s.root.notes = 'Ce sujet est un parcours : chaque grande partie est un module à suivre en 5 étapes. Arbor les a répartis jusqu’à ton examen.';
    scheduleModules(s);
    return s;
  }

  function programModal(topics, title) {
    const sel = { color: PALETTE[state.subjects.length % PALETTE.length], icon: 'book-open' };
    const text = topics.map((t) => `${t.depth ? '  ' : ''}${t.title}`).join('\n');
    openModal(`
      <h2 id="modalTitle">Créer un parcours de modules</h2>
      <p class="modal-lede">Chaque sujet de la liste devient un module. Arbor les répartit jusqu’à ton examen et te guide en 5 étapes pour chacun, même s’il n’y a pas de contenu dans le document.</p>
      <form id="pgForm" class="form">
        <div class="field">
          <label for="pgTitle">Nom du parcours</label>
          <input id="pgTitle" autocomplete="off" value="${esc(title || 'Mon programme')}" />
        </div>
        <div class="field">
          <label for="pgTopics">Sujets du programme</label>
          <textarea id="pgTopics" rows="8">${esc(text)}</textarea>
          <p class="hint">Un sujet par ligne. Indente une ligne pour en faire une notion du sujet au-dessus. Retire ce qui n’est pas un sujet à réviser.</p>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="pgExam">Date d’examen <span class="optional">facultatif</span></label>
            <input id="pgExam" type="date" />
          </div>
          <div class="field">
            <label for="pgRhythm">Sans date : un module</label>
            <select id="pgRhythm"><option value="1">par jour</option><option value="2" selected>tous les 2 jours</option><option value="3">tous les 3 jours</option><option value="7">par semaine</option></select>
          </div>
        </div>
        <label class="check"><input type="checkbox" id="pgWrite" checked /> Rédiger le cours de chaque sujet (${state.settings.apiKey ? 'Claude cherche et rédige' : useLocal() ? 'l’IA locale rédige, gratuitement' : 'passages choisis dans Wikilivres, Wikiversité et Wikipédia pour chaque notion ; l’IA locale les reformule si tu l’actives'})</label>
        ${pickers(sel.color, sel.icon)}
        <div class="row-btns end"><button type="button" class="btn ghost" data-close>Annuler</button><button class="btn">${ic('path')}Créer le parcours</button></div>
      </form>`, (el) => {
      bindPickers(el, sel);
      $('[data-close]', el).onclick = closeModal;
      $('#pgForm', el).onsubmit = (e) => {
        e.preventDefault();
        const lines = $('#pgTopics', el).value.split(/\r?\n/).filter((l) => l.trim());
        const list = lines.map((l) => ({ title: Store.cleanTitle(l.trim().replace(/^([-*•+]|\d+[.)])\s+/, '')), depth: /^\s+/.test(l) ? 1 : 0 })).filter((t) => t.title);
        list.forEach((t) => { const o = topics.find((x) => x.title === t.title && x.goal); if (o) t.goal = o.goal; }); // objectif tiré du document
        if (!list.some((t) => !t.depth)) { FX.toast('Ajoute au moins un sujet, sans indentation.', 'error'); return; }
        const s = makeProgram($('#pgTitle', el).value.trim() || 'Mon programme', list, { ...sel, examDate: $('#pgExam', el).value || null, rhythm: +$('#pgRhythm', el).value });
        state.subjects.push(s);
        save();
        const write = $('#pgWrite', el).checked;
        closeModal();
        Mascot.react('created');
        go(link(s.id, s.root.id));
        if (write) setTimeout(async () => { await writeCourses(s, s.root.children.filter((c) => c.module)); render(view); }, 250);
        else FX.toast(`${plural(s.root.children.length, 'module créé', 'modules créés')}`, 'success');
      };
    });
  }

  // Liens de recherche quand on n'a pas de clé API (ou en complément)
  function researchLinks(topic, s) {
    const q = encodeURIComponent(topic);
    const qc = encodeURIComponent(`${topic} ${s.title}`);
    return [
      ['Wikipédia', `https://fr.wikipedia.org/w/index.php?search=${q}`, 'book-open-text'],
      ['Khan Academy', `https://fr.khanacademy.org/search?page_search_query=${q}`, 'graduation-cap'],
      ['Vidéos de cours', `https://www.youtube.com/results?search_query=${encodeURIComponent(topic + ' cours')}`, 'play-circle'],
      ['Cours en PDF', `https://www.google.com/search?q=${encodeURIComponent(topic + ' cours pdf')}`, 'file-pdf'],
      ['Articles scientifiques', `https://scholar.google.com/scholar?q=${qc}`, 'books'],
    ];
  }

  function modulePanel(s, node) {
    const st = moduleSteps(node);
    const m = node.module;
    const current = MOD_STEPS.find(([k]) => !st[k]);
    const step = current ? current[0] : null;
    const hasKey = !!state.settings.apiKey;
    const body = {
      pretest: () => `
        <p>Avant de lire quoi que ce soit : qu’est-ce que tu sais déjà sur « ${esc(node.title)} » ? Écris tout ce qui te vient, même flou ou faux. Cet essai prépare ta mémoire à retenir la suite.</p>
        <textarea class="notes-input" id="modulePretest" rows="3" placeholder="Ce que j’en sais, ce que j’imagine…">${esc(m.pretest || '')}</textarea>
        <div class="row-btns"><button class="btn sm" data-act="mod-pretest-done">${ic('check')}C’est noté</button><button class="btn ghost sm" data-act="mod-skip-pretest">Je n’en sais rien, passer</button></div>`,
      learn: () => m.generated ? `
        <p>Ton cours est prêt juste en dessous : ${plural(node.children.length, 'notion', 'notions')}. Lis-le en entier, à ton rythme. Compare avec ce que tu pensais savoir.</p>
        <div class="row-btns"><a class="btn" href="#course" data-act="goto-course">${ic('book-open-text')}Lire le cours</a><button class="btn ghost" data-act="mod-learned">${ic('check')}J’ai lu le cours</button></div>` : `
        <p>Arbor peut rédiger le cours de « ${esc(node.title)} » ${engineLabel()}. Tu peux aussi chercher toi-même.</p>
        <button class="btn" data-act="write-course">${ic('book-open-text')}Rédiger le cours</button>
        <div class="research-links">${researchLinks(node.title, s).map(([l, u, i]) => `<a class="chip-link" href="${u}" target="_blank" rel="noopener">${ic(i)}${l}</a>`).join('')}</div>
        <button class="btn ghost sm" data-act="mod-learned">${ic('check')}J’ai lu et pris mes notes</button>`,
      split: () => `
        <p>Découpe « ${esc(node.title)} » en 3 à 5 notions, une idée chacune. Faire ce découpage toi-même t’aide à organiser ce que tu sais.</p>
        <button class="btn" data-act="bulk-add" data-id="${node.id}">${ic('tree-structure')}Découper en notions</button>`,
      anchor: () => `
        <p>Ancre au moins une notion : une image, un exemple concret, ou pourquoi c’est vrai. C’est l’étape qui fait le plus de différence pour retenir.</p>
        <button class="btn" data-act="focus-explain">${ic('anchor-simple')}Ancrer ce module</button>`,
      test: () => `
        <p>Teste-toi sur ce module. Ensuite, Arbor te le reproposera au bon moment, mélangé avec les autres.</p>
        <a class="btn" href="${link(s.id, node.id, 'revision')}">${ic('play', true)}Me tester sur ce module</a>`,
    };
    return `
      <section class="module-panel" aria-label="Parcours du module">
        <div class="mp-head">
          <span class="mp-title">${step ? `Étape ${MOD_STEPS.findIndex(([k]) => k === step) + 1} sur 5 : ${current[1]}` : 'Module terminé'}</span>
          ${m.date ? `<span class="chip">${ic('calendar-blank')}${dayLabel(m.date)}</span>` : ''}
        </div>
        <ol class="mp-steps">${MOD_STEPS.map(([k, l]) => `<li class="${st[k] ? 'done' : k === step ? 'current' : ''}"><span class="mp-dot" aria-hidden="true">${st[k] ? ic('check', true) : ''}</span><span>${l}</span></li>`).join('')}</ol>
        ${step ? `<div class="mp-body">${body[step]()}</div>` : `<div class="mp-body"><p>Les 5 étapes sont faites. Ce module revient maintenant dans ta révision du jour, au moment où tu risques de l’oublier.</p></div>`}
        ${m.sources && m.sources.length ? `<details class="mp-sources"><summary>Sources (${m.sources.length})</summary><ul>${m.sources.map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title || x.url)}</a></li>`).join('')}</ul></details>` : ''}
        ${m.pretest && st.pretest && step !== 'pretest' ? `<details class="mp-sources"><summary>Ce que tu pensais savoir avant</summary><p class="mp-pretest">${esc(m.pretest)}</p></details>` : ''}
      </section>`;
  }

  // Vue d'ensemble d'un parcours : la frise des modules
  function programPanel(s) {
    const mods = s.root.children.filter((c) => c.module);
    const done = mods.filter((mm) => moduleProgress(mm) === 5).length;
    return `
      <section class="sec program">
        <div class="sec-head"><h2>Ton parcours <span class="muted num">${done}/${mods.length}</span></h2>
          <button class="btn ghost sm" data-act="reschedule">${ic('calendar-blank')}Recalculer les dates</button>
        </div>
        <ol class="timeline">
          ${mods.map((mm) => {
            const p = moduleProgress(mm);
            const today = mm.module.date && mm.module.date <= SRS.dayKey() && p < 5;
            return `<li class="${p === 5 ? 'done' : today ? 'now' : ''}">
              <a href="${link(s.id, mm.id)}">
                <span class="tl-date">${p === 5 ? 'Terminé' : dayLabel(mm.module.date)}</span>
                <span class="tl-title">${esc(mm.title)}</span>
                <span class="tl-steps" aria-label="${p} étapes sur 5">${MOD_STEPS.map((_, i) => `<i class="${i < p ? 'on' : ''}"></i>`).join('')}</span>
              </a>
            </li>`;
          }).join('')}
        </ol>
      </section>`;
  }

  // Module du jour (accueil)
  function moduleLine() {
    const today = SRS.dayKey();
    for (const s of state.subjects) {
      if (!s.program) continue;
      const mm = s.root.children.find((c) => c.module && c.module.date && c.module.date <= today && moduleProgress(c) < 5);
      if (mm) {
        const step = MOD_STEPS.find(([k]) => !moduleSteps(mm)[k]);
        return `<a class="exam-line" href="${link(s.id, mm.id)}" style="--c:${s.color}">
          <span class="tile sm" style="--c:${s.color}">${ic('path', true)}</span>
          <span><b>Module du jour : ${esc(mm.title)}</b>. Prochaine étape : ${step[1].toLowerCase()}.</span>
        </a>`;
      }
    }
    return '';
  }

  /* Rédiger le cours d'une partie à partir de son titre.
     Si la partie a déjà des sous-parties (ex. notions listées dans le programme), chacune reçoit son cours. */
  // Qui rédige les cours : Claude (clé API), l'IA locale (modèle open source dans le navigateur) ou Wikipédia
  const useLocal = () => !state.settings.apiKey && state.settings.localAI && window.LocalAI && LocalAI.supported();
  const engineLabel = () => state.settings.apiKey ? 'avec Claude et des sources fiables'
    : useLocal() ? 'avec l’IA locale, gratuite, qui reformule en cours les meilleurs passages de Wikilivres, Wikiversité et Wikipédia'
    : 'à partir de Wikilivres, Wikiversité et Wikipédia (passages choisis pour chaque notion ; active l’IA locale gratuite dans les Réglages pour qu’ils soient reformulés en cours)';
  async function fetchCourse(topic, context, onStatus) {
    if (state.settings.apiKey) {
      const r = await AI.researchTopic(topic, context, state.settings.apiKey, state.settings.model, onStatus);
      return { ...r, from: 'claude' };
    }
    if (useLocal()) {
      onStatus && onStatus('Recherche d’un texte de référence…');
      const src = await Course.wikiSource(topic, context).catch(() => null);
      const r = await LocalAI.writeCourse(topic, context, src, {
        id: state.settings.localModel,
        onStatus,
        onProgress: (p, t) => onStatus && onStatus(p < 1 ? `${t} (${Math.round(p * 100)} %)` : 'Le modèle local rédige le cours…'),
      });
      if (!r.notions.length) throw new Error('Le modèle local n’a rien rédigé.');
      r.overview = `${r.overview}\n\n_Cours rédigé par l’IA locale${src ? ` à partir de l’article Wikipédia « ${src.title} »` : ', sans texte de référence'}. Vérifie les points importants dans ton cours._`;
      return { ...r, sources: src ? [{ title: `Wikipédia : ${src.title}`, url: src.url }] : [], from: 'local' };
    }
    return Course.fromWikipedia(topic, context);
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  /* Rédiger le cours d'une partie à partir de son titre.
     - Avec une clé Claude : Claude cherche sur le web et rédige.
     - Sinon, méthode inspirée de STORM (voir storm.js) : chaque notion est rédigée à partir de ses meilleurs
       passages (Wikilivres, Wikiversité, Wikipédia), reformulés par l'IA locale si elle est activée.
     Une partie sans sous-parties reçoit d'abord un plan, tiré des sections de la meilleure source. */
  async function writeNotionInto(ch, ctx, onStatus) {
    const r = await Storm.buildNotion(ch.title, ctx, { local: useLocal() ? { id: state.settings.localModel } : null, onStatus });
    ch.notes = r.notes;
    ch.keyPoints = [...(ch.keyPoints || []), ...r.keyPoints].slice(0, 5);
    ch.exercises = (ch.exercises || []).concat(r.exercises.map((e) => ({ id: Store.uid(), q: String(e.q || ''), a: String(e.a || '') })));
    ch.course = { from: r.from, sources: r.sources };
    return r;
  }
  async function writeCourse(s, node, onStatus) {
    const ctx = node === s.root ? '' : s.title;
    if (state.settings.apiKey) {
      if (node.children.length) {
        let n = 0;
        for (const ch of node.children) {
          if (ch.notes.trim()) continue;
          onStatus && onStatus(`« ${ch.title} »`);
          const r = await fetchCourse(ch.title, node.title, onStatus);
          ch.notes = [r.overview, ...r.notions.slice(0, 4).map((x) => `### ${x.title}\n${x.notes}`)].filter(Boolean).join('\n\n');
          ch.keyPoints = r.notions.flatMap((x) => x.keyPoints || []).slice(0, 4);
          ch.exercises = (ch.exercises || []).concat(r.notions.flatMap((x) => (x.exercises || []).map((e) => ({ id: Store.uid(), q: String(e.q || ''), a: String(e.a || '') }))).slice(0, 3));
          ch.course = { from: r.from, sources: r.sources };
          n++;
        }
        if (node.module) node.module.generated = true;
        return n;
      }
      onStatus && onStatus(`« ${node.title} »`);
      const r = await fetchCourse(node.title, ctx, onStatus);
      if (r.overview && !node.notes.trim()) node.notes = r.overview;
      r.notions.forEach((x) => node.children.push(normalize(x)));
      node.course = { from: r.from, sources: r.sources };
      node.collapsed = false;
      if (node.module) { node.module.sources = r.sources; node.module.generated = true; }
      return r.notions.length;
    }

    // Sans clé : un plan si la partie n'a pas de notions, puis une rédaction notion par notion
    let planResearch = null;
    if (!node.children.length) {
      onStatus && onStatus(`plan de « ${node.title} »`);
      const dom = []; walk(s.root, (x) => dom.push(x.title));
      const plan = await Storm.outline(node.title, { module: ctx, domain: dom.join(' ') }).catch(() => []);
      planResearch = Storm.outline.last || null;
      if (plan.length < 2) {
        const r = await Course.fromWikipedia(node.title, ctx); // repli : la fiche Wikipédia
        if (r.overview && !node.notes.trim()) node.notes = r.overview;
        r.notions.forEach((x) => node.children.push(normalize(x)));
        node.course = { from: r.from, sources: r.sources };
        node.collapsed = false;
        if (node.module) { node.module.sources = r.sources; node.module.generated = true; }
        return r.notions.length;
      }
      plan.forEach((t) => node.children.push(makeNode(t)));
      node.collapsed = false;
    }
    // Introduction du module
    if (node.notes.replace(/\*\*Objectif\.\*\*[^\n]*/, '').trim().length < 40) {
      const dom = []; walk(s.root, (x) => dom.push(x.title));
      const lead = await Storm.moduleLead(node.title, { subject: s.title, research: planResearch }, { onStatus }).catch(() => null);
      if (lead) {
        node.notes = [node.notes.trim(), lead.text, `Dans ce module : ${node.children.map((c) => c.title.charAt(0).toLowerCase() + c.title.slice(1)).join(', ')}.`].filter(Boolean).join('\n\n');
        if (node.module) node.module.sources = lead.sources;
      }
    }
    let n = 0;
    const missed = [];
    // vocabulaire du domaine : tous les titres du sujet (sert à écarter les pages hors sujet)
    const domain = [];
    walk(s.root, (x) => domain.push(x.title));
    for (const ch of node.children) {
      if (ch.notes.trim()) continue;
      // mots propres aux autres modules du parcours (pour écarter une page Linux dans un module Windows)
      const others = s.root.children.filter((m) => m !== node && m.module).map((m) => m.title).join(' ');
      try { await writeNotionInto(ch, { module: node.title, subject: s.title, domain: domain.join(' '), others }, (m) => onStatus && onStatus(`« ${ch.title} » : ${m}`)); n++; }
      catch (err) { if (/ralentir/.test(err.message)) throw err; missed.push(ch.title); }
    }
    if (node.module) node.module.generated = true;
    if (!n && missed.length) throw new Error(`Rien trouvé pour ${missed.slice(0, 3).join(', ')}.`);
    return n;
  }

  // Plusieurs cours à la suite, avec une progression visible
  async function writeCourses(s, nodes) {
    openModal(`
      <div class="loading">
        <h2 id="modalTitle">Arbor rédige ton cours…</h2>
        <p class="modal-lede" id="ldMsg">${state.settings.apiKey ? 'Claude cherche des sources fiables et rédige chaque module.' : useLocal() ? 'Pour chaque notion, Arbor choisit les meilleurs passages de Wikilivres, Wikiversité et Wikipédia, puis l’IA locale les reformule en cours. La première fois, le modèle se télécharge.' : 'Pour chaque notion, Arbor cherche dans Wikilivres, Wikiversité et Wikipédia, choisit les passages les plus pertinents et les assemble en cours.'}</p>
        <div class="bar big" role="progressbar" aria-label="Progression" aria-valuemin="0" aria-valuemax="100"><span id="ldBar" style="transform:scaleX(.03)"></span></div>
        <p class="hint" id="ldCount">0 / ${nodes.length}</p>
      </div>`);
    Mascot.react('reading');
    const failed = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const msg = (m) => { const e = $('#ldMsg'); if (e) e.textContent = `${node.title} : ${m}`; };
      try { await writeCourse(s, node, msg); } catch (err) { console.warn(err.message); failed.push(node.title); }
      const b = $('#ldBar'); if (b) b.style.transform = `scaleX(${(i + 1) / nodes.length})`;
      const c = $('#ldCount'); if (c) c.textContent = `${i + 1} / ${nodes.length}`;
      save();
    }
    Mascot.react('imported');
    closeModal();
    const ok = nodes.length - failed.length;
    FX.toast(failed.length ? `${plural(ok, 'cours rédigé', 'cours rédigés')}. Pas trouvé : ${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '…' : ''}. Complète-les à la main.` : `${plural(ok, 'cours rédigé', 'cours rédigés')}. Bonne lecture !`, failed.length ? 'info' : 'success', 6000);
    return failed;
  }

  async function researchModule(s, node) {
    openModal(`
      <div class="loading">
        <h2 id="modalTitle">Arbor cherche pour toi…</h2>
        <p class="modal-lede" id="ldMsg">« ${esc(node.title)} »</p>
        <div class="skeleton" aria-hidden="true"><span style="--w:60%"></span><span style="--w:45%;--d:1"></span><span style="--w:52%;--d:1"></span><span style="--w:38%;--d:2"></span></div>
      </div>`);
    Mascot.react('reading');
    try {
      const r = await AI.researchTopic(node.title, s.title, state.settings.apiKey, state.settings.model, (m) => { const e = $('#ldMsg'); if (e) e.textContent = m; });
      if (r.overview && !node.notes.trim()) node.notes = r.overview;
      r.notions.forEach((n) => node.children.push(normalize(n)));
      node.module.sources = r.sources;
      node.module.researched = true;
      node.collapsed = false;
      touch(); Mascot.react('imported'); closeModal(); render(view);
      FX.toast(`${plural(r.notions.length, 'notion préparée', 'notions préparées')}, avec ${plural(r.sources.length, 'source', 'sources')}. Lis-les, puis ancre-les avec tes mots.`, 'success', 5200);
    } catch (err) {
      console.error(err);
      Mascot.react('stop-reading');
      const msg = err && err.status === 401 ? 'La clé API est refusée. Vérifie-la dans les réglages.' : (err && err.message) || 'Erreur inconnue.';
      $('#modalBody').innerHTML = `<div class="loading"><span class="tile big danger-tile">${ic('warning-circle', true)}</span><h2 id="modalTitle">Recherche impossible</h2><p class="modal-lede">${esc(msg)} Tu peux utiliser les liens de recherche à la place.</p></div>`;
    }
  }

  // Le cours, lisible d'une traite : introduction, puis chaque notion avec ses points clés
  function courseSection(s, node, isRoot) {
    const withNotes = node.children.filter((c) => c.notes.trim());
    if (!withNotes.length) {
      if (isRoot && s.program) {
        const missing = s.root.children.filter((c) => c.module && !c.module.generated && !c.children.some((x) => x.notes.trim())).length;
        return missing ? `<section class="sec write-course"><p>${plural(missing, 'module n’a', 'modules n’ont')} pas encore de cours.</p><button class="btn" data-act="write-all">${ic('book-open-text')}Rédiger les cours manquants</button></section>` : '';
      }
      if (isRoot || node.notes.trim().length > 80) return '';
      return `<section class="sec write-course"><p>Cette partie est vide. Arbor peut en rédiger le cours à partir de son titre, ${engineLabel()}.</p><button class="btn" data-act="write-course">${ic('book-open-text')}Rédiger le cours</button></section>`;
    }
    const pre = node.module && !moduleSteps(node).pretest && !pretestSeen.has(node.id + ':course');
    const sources = [...((node.course && node.course.sources) || []), ...((node.module && node.module.sources) || []), ...withNotes.flatMap((c) => (c.course && c.course.sources) || [])]
      .filter((x, i, a) => x && x.url && a.findIndex((y) => y.url === x.url) === i);
    return `
      <section class="sec course" id="course">
        <div class="sec-head"><h2>Le cours</h2><span class="muted">${plural(withNotes.length, 'notion', 'notions')}</span></div>
        ${pre ? `<div class="pretest-cover"><p>${ic('lightbulb', true)}<span><b>Avant de lire :</b> écris en haut ce que tu sais déjà sur ce sujet. Même faux, cet essai t’aidera à retenir le cours.</span></p><button class="btn ghost sm" data-act="course-reveal" data-id="${node.id}">Lire quand même</button></div>` : ''}
        <div class="course-body ${pre ? 'pretest' : ''}">
          ${withNotes.map((c) => `
            <article class="course-part">
              <h3><a href="${link(s.id, c.id)}">${esc(c.title)}</a></h3>
              <div class="md">${MD.render(c.notes)}</div>
              ${c.keyPoints.length ? `<div class="course-keys"><small>À retenir</small><ul>${c.keyPoints.map((k) => `<li>${MD.render(k).replace(/^<p>|<\/p>$/g, '')}</li>`).join('')}</ul></div>` : ''}
            </article>`).join('')}
        </div>
        ${sources.length ? `<p class="course-src">Sources : ${sources.map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title || x.url)}</a>`).join(', ')}</p>` : ''}
      </section>`;
  }

  function memoryLine(s, node, isRoot) {
    if (isRoot && node.children.length) {
      const ov = overview({ type: 'node', sid: s.id, nid: node.id });
      return `<div class="memory"><span class="mem-text">${ic('cards')}${ov.due ? `${plural(ov.due, 'carte à revoir', 'cartes à revoir')}` : 'Rien à revoir'}${ov.fresh ? `, ${plural(ov.fresh, 'nouvelle', 'nouvelles')}` : ''}</span>
        <a class="btn sm" href="${link(s.id, node.id, 'revision')}">${ic('play', true)}Réviser ce sujet</a></div>`;
    }
    const r = SRS.retrievability(node.srs);
    if (r === null) return `<div class="memory"><span class="mem-text">${ic('sparkle')}Jamais révisée</span><a class="btn ghost sm" href="${link(s.id, node.id, 'revision')}">${ic('play', true)}Réviser cette partie</a></div>`;
    const pct = Math.round(r * 100);
    const days = Math.round((node.srs.due - Date.now()) / SRS.DAY);
    const leech = isLeech(node) ? `<div class="leech">
        ${ic('warning-circle', true)}
        <div><b>Partie difficile pour toi</b><p>Oubliée ${node.srs.lapses} fois${node.srs.illusions ? `, dont ${node.srs.illusions} fois alors que tu te disais certain` : ''}. Une partie trop grosse s’oublie plus vite : découpe-la en idées plus petites, ou explique-la avec tes mots.</p>
        <div class="row-btns"><button class="btn sm" data-act="bulk-add" data-id="${node.id}">${ic('tree-structure')}Découper en sous-parties</button><button class="btn ghost sm" data-act="focus-explain">${ic('chat-circle-text')}L’expliquer</button></div></div>
      </div>` : '';
    const when = node.srs.due <= Date.now() ? 'à revoir maintenant' : days <= 0 ? 'prochaine révision aujourd’hui' : `prochaine révision dans ${plural(days, 'jour', 'jours')}`;
    return `<div class="memory">
      <span class="mem-text">${ic('brain')}Mémoire <b class="num">${pct} %</b><span class="mem-bar" aria-hidden="true"><span style="transform:scaleX(${r})" class="${pct < 85 ? 'low' : ''}"></span></span><span class="muted">${when}</span></span>
      <a class="btn ghost sm" href="${link(s.id, node.id, 'revision')}">${ic('play', true)}Réviser cette partie</a>
    </div>${leech}`;
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

  /* ----- Révision active avec répétition espacée -----
     Recherche : se tester bat la relecture (Dunlosky 2013, Karpicke 2009), espacer bat le bachotage,
     tenter une réponse avant de la voir aide à retenir (effet de prétest, à condition de voir la correction),
     mélanger les sujets aide sur la durée (entrelacement). */
  let study = null;
  const STOP = new Set(('les des une un le la de du et en est sont pour par dans sur avec que qui pas plus ce cette ces son sa ses leur leurs aux au ou il elle ils elles on nous vous mais donc car comme tout tous toute toutes être avoir fait faire peut entre lors très aussi ainsi alors elle elles celui celle dont même autre autres the and for with that this from are was have').split(' '));
  const normTxt = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

  const highlights = (notes) => [...String(notes || '').matchAll(/==([^=\n]{12,220})==/g)].map((m) => m[1].trim());
  const isLeech = (n) => n.srs && n.srs.lapses >= 3;

  function makeCloze(kp) {
    const plain = kp.replace(/\*\*/g, '').replace(/==/g, '');
    const bold = kp.match(/\*\*([^*]{2,40})\*\*/);
    let word = bold ? bold[1] : null;
    if (!word) {
      const words = plain.match(/[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9’'-]{3,}/g) || [];
      const cands = words.filter((w) => !STOP.has(w.toLowerCase()) && !/^\d+$/.test(w));
      if (!cands.length) return null;
      // Le mot le plus long est souvent le terme technique ; on évite le tout premier mot de la phrase
      cands.sort((a, b) => b.length - a.length);
      word = cands.find((w) => plain.indexOf(w) > 0) || cands[0];
    }
    const i = plain.indexOf(word);
    if (i < 0 || plain.length < 12) return null;
    return { before: plain.slice(0, i), answer: word, after: plain.slice(i + word.length) };
  }

  // Cartes d'un sujet (ou d'une branche) : dues, nouvelles, et le reste
  function collect(s, base, now) {
    const due = [], fresh = [], other = [];
    // Parcours : un module n'entre en révision qu'après l'étape « Découvrir » (on ne teste pas du vide)
    const locked = new Set();
    if (s.program) s.root.children.forEach((m) => { if (m.module && !moduleSteps(m).learn) walk(m, (x) => { if (!x.srs) locked.add(x.id); }); });
    walk(base, (n, d) => {
      if (d === 0 && base.children.length) return;
      if (locked.has(n.id)) return;
      if (!n.srs) fresh.push(n);
      else if (SRS.isDue(n.srs, now)) due.push(n);
      else other.push(n);
    });
    due.sort((a, b) => SRS.retrievability(a.srs, now) - SRS.retrievability(b.srs, now));
    return { s, due, fresh, other };
  }
  function overview(scope) {
    const now = Date.now();
    const lists = scope.type === 'all'
      ? state.subjects.map((s) => collect(s, s.root, now))
      : [collect(subjectById(scope.sid), find(subjectById(scope.sid).root, scope.nid).node, now)];
    const td = SRS.today(state.stats);
    const newLeft = Math.max(0, state.settings.newPerDay - td.newCards);
    const due = lists.reduce((a, l) => a + l.due.length, 0);
    const fresh = lists.reduce((a, l) => a + l.fresh.length, 0);
    const other = lists.reduce((a, l) => a + l.other.length, 0);
    return { lists, due, fresh, newToday: Math.min(fresh, newLeft), total: due + fresh + other };
  }
  function buildSession(scope) {
    const ov = overview(scope);
    // Entrelacement : on alterne les sujets (une carte de chaque à tour de rôle)
    const pick = (key, limit) => {
      const out = [];
      const pools = ov.lists.map((l) => ({ sid: l.s.id, items: l[key].slice() }));
      let added = true;
      while (added && out.length < limit) {
        added = false;
        for (const p of pools) {
          if (out.length >= limit) break;
          const n = p.items.shift();
          if (n) { out.push({ sid: p.sid, nid: n.id }); added = true; }
        }
      }
      return out;
    };
    // Recherche : l'entrelacement aide sur la durée mais gêne la première découverte.
    // Donc : révisions mélangées entre sujets, nouvelles parties dans l'ordre du cours, sujet par sujet.
    const inOrder = (key, limit) => {
      const out = [];
      for (const l of ov.lists) for (const n of l[key]) { if (out.length >= limit) return out; out.push({ sid: l.s.id, nid: n.id }); }
      return out;
    };
    let queue = pick('due', 300);
    queue = scope.cram ? queue.concat(inOrder('fresh', 300), pick('other', 300)) : queue.concat(inOrder('fresh', ov.newToday));
    study = { scope, queue: queue.slice(0, 60), i: 0, phase: 'ask', prompt: null, typed: '', conf: null, res: [0, 0, 0, 0], requeued: {}, total: 0 };
    preparePrompt();
  }
  const studyKey = (scope) => (scope.type === 'all' ? 'all' : `${scope.sid}/${scope.nid}`);

  function currentCard() {
    if (!study || study.i >= study.queue.length) return null;
    const q = study.queue[study.i];
    const s = subjectById(q.sid);
    const f = s && find(s.root, q.nid);
    return f ? { s, node: f.node } : null;
  }
  /* Choix de la question. Recherche (2023) : chez les étudiants avec un TDAH, réciter un ensemble
     de mémoire aide plus, à 2 jours, que réciter section par section, et leur rappel est moins bien
     organisé. D'où la carte « branche » : retrouver les sous-parties dans l'ordre, l'arbre servant de structure. */
  function preparePrompt() {
    const c = currentCard();
    Object.assign(study, { phase: 'ask', typed: '', conf: null, hints: 0, checks: [], anchor: '', prompt: { type: 'recall' } });
    if (!c) return;
    const n = c.node;
    const ex = (n.exercises || []).filter((e) => e.q.trim());
    if (ex.length && Math.random() < 0.6) { study.prompt = { type: 'exercise', ex: ex[Math.floor(Math.random() * ex.length)] }; return; }
    if (n.children.length >= 2 && Math.random() < 0.55) { study.prompt = { type: 'branch' }; return; }
    const kps = n.keyPoints.filter((k) => k.trim().length > 12);
    const hl = highlights(n.notes);
    const pool = hl.length && (Math.random() < 0.5 || !kps.length) ? hl : kps;
    if (pool.length && Math.random() < 0.6) {
      const cl = makeCloze(pool[Math.floor(Math.random() * pool.length)]);
      if (cl) study.prompt = { type: 'cloze', fromHighlight: pool === hl, ...cl };
    }
  }

  // Éléments à cocher au verso : ce que l'étudiant devait retrouver
  function checklistItems(p, node) {
    if (p.type === 'branch') return node.children.map((c) => c.title);
    if (p.type === 'recall') return node.keyPoints.filter((k) => k.trim()).map((k) => k.replace(/\*\*|==/g, ''));
    return [];
  }

  /* Indices progressifs : ils aident à retrouver sans donner la réponse.
     Recherche (PNAS 2025) : une IA qui donne les réponses fait baisser les résultats de 17 % une fois retirée ;
     avec des garde-fous, non. Même principe ici : un indice met sur la piste, et plafonne la note proposée. */
  function hintText(p, node, level) {
    const words = (t, k) => t.replace(/\*\*|==/g, '').split(/\s+/).slice(0, k).join(' ') + '…';
    if (p.type === 'cloze') {
      const a = p.answer;
      return level === 1 ? `Commence par « ${a[0]} », ${a.length} lettres.` : `« ${a.slice(0, Math.ceil(a.length / 2))}… »`;
    }
    if (p.type === 'branch') {
      const ch = node.children;
      return level === 1 ? `${plural(ch.length, 'sous-partie', 'sous-parties')}, qui commencent par : ${ch.map((c) => `« ${c.title[0]} »`).join(', ')}.`
        : ch.map((c) => words(c.title, 1)).join(' · ');
    }
    if (p.type === 'exercise') {
      const first = (p.ex.a || '').split(/\n|\. /)[0];
      return first ? `Piste : ${words(first, level === 1 ? 4 : 9)}` : 'Relis l’énoncé et note ce qu’on te demande vraiment.';
    }
    const kps = node.keyPoints.filter((k) => k.trim());
    if (!kps.length) return level === 1 ? 'Pense à la définition, puis à un exemple.' : 'À quoi ça sert, et pourquoi c’est vrai ?';
    return level === 1 ? `${plural(kps.length, 'idée', 'idées')} à retrouver, qui commencent par : ${kps.map((k) => `« ${words(k, 1).replace('…', '')} »`).join(', ')}.`
      : kps.map((k) => words(k, 3)).join(' · ');
  }

  // Note proposée à partir de ce qui a été vraiment retrouvé (au lieu d'une impression)
  function suggestedGrade(p, node) {
    let g = null;
    if (p.type === 'cloze') { if (study.typed) g = normTxt(study.typed) === normTxt(p.answer) ? 3 : 1; }
    else {
      const items = checklistItems(p, node);
      if (items.length) {
        const r = study.checks.filter(Boolean).length / items.length;
        g = r < 0.34 ? 1 : r < 0.75 ? 2 : 3;
      }
    }
    if (g && study.hints && g > 2) g = 2; // un indice utilisé : au mieux « Difficile »
    return g;
  }

  function studyPane() { return $('#paneBody'); }

  function renderStudy() {
    const pane = studyPane();
    if (!pane || !study) return;
    if (!study.queue.length) {
      const ov = overview({ ...study.scope, cram: true });
      pane.innerHTML = `
        <div class="review-start">
          <span class="tile big">${ic('check-circle', true)}</span>
          <h2>Rien à réviser pour l’instant</h2>
          <p class="muted">Ta mémoire est à jour. Arbor te reproposera chaque partie juste avant que tu l’oublies.</p>
          <div class="row-btns center">
            ${ov.total ? `<button class="btn ghost" data-act="study-start" data-cram="1">${ic('cards')}Réviser quand même (${ov.total})</button>` : ''}
            <a class="btn" href="#/">${ic('house')}Retour à l’accueil</a>
          </div>
        </div>`;
      return;
    }
    if (study.i >= study.queue.length) return renderSummary();
    const { s, node } = currentCard();
    const path = pathTo(s.root, node.id).slice(1, -1).map((p) => p.title);
    const p = study.prompt;
    const show = study.phase === 'show';
    const typedOk = p.type === 'cloze' && study.typed && normTxt(study.typed) === normTxt(p.answer);
    const intervals = SRS.preview(node.srs);
    const isNew = !node.srs;
    const items = checklistItems(p, node);
    const sug = show ? suggestedGrade(p, node) : null;
    const KIND = {
      cloze: [p.fromHighlight ? 'highlighter-circle' : 'text-aa', p.fromHighlight ? 'Tiré de ton surlignage' : 'Complète la phrase'],
      recall: ['brain', 'Rappel libre'],
      branch: ['tree-structure', 'Rappel de la branche'],
      exercise: ['pencil-simple-line', 'Exercice'],
    }[p.type];
    const front = {
      cloze: () => `<p class="cloze">${esc(p.before)}<span class="blank ${show ? 'filled' : ''}">${show ? esc(p.answer) : '…'}</span>${esc(p.after)}</p>`,
      recall: () => `<h2 class="q-title">${esc(node.title)}</h2>${show ? '' : '<p class="muted">Récite ce que tu sais sur cette partie, sans regarder. Écrire, même approximativement, aide à retenir.</p>'}`,
      branch: () => `<h2 class="q-title">${esc(node.title)}</h2>${show ? '' : `<p class="muted">Retrouve ses ${plural(node.children.length, 'sous-partie', 'sous-parties')}, dans l’ordre. Reconstruire la structure aide à organiser ce que tu sais.</p>`}`,
      exercise: () => `${p.ex.q.startsWith(node.title.replace(/…$/, '')) ? '' : `<h2 class="q-title small">${esc(node.title)}</h2>`}<div class="exercise-q md">${MD.render(p.type === 'exercise' ? p.ex.q : '')}</div>${show ? '' : '<p class="muted">Résous-le avant de regarder la méthode, sur papier ou ici.</p>'}`,
    }[p.type]();
    pane.innerHTML = `
      <div class="study">
        <div class="review-progress">
          ${bar((study.i / study.queue.length) * 100)}
          <span class="num">${study.i + 1} / ${study.queue.length}</span>
        </div>
        <article class="study-card ${show ? 'is-shown' : ''}" id="studyCard" style="--c:${s.color}">
          <header class="sc-meta">
            <span class="tile sm" style="--c:${s.color}">${ic(s.icon, true)}</span>
            <span class="sc-path">${esc([s.title, ...path].join(' › '))}</span>
            ${isNew ? '<span class="chip new-chip">Nouvelle</span>' : `<span class="chip" title="Probabilité de t’en souvenir maintenant">Mémoire ${Math.round(SRS.retrievability(node.srs) * 100)} %</span>`}
          </header>
          <p class="q-kind">${ic(KIND[0])}${KIND[1]}</p>
          ${front}
          ${study.hints ? `<div class="hints">${[1, 2].slice(0, study.hints).map((l) => `<p>${ic('lightbulb', true)}${esc(hintText(p, node, l))}</p>`).join('')}</div>` : ''}
          ${show ? `
            ${study.typed ? `<div class="your-answer ${p.type === 'cloze' ? (typedOk ? 'ok' : 'ko') : ''}">
              <small>${p.type === 'cloze' ? (typedOk ? `${ic('check-circle', true)}Bonne réponse` : `${ic('x-circle', true)}Ta réponse`) : 'Ta réponse'}</small>
              <p>${esc(study.typed)}</p></div>` : ''}
            <div class="answer">
              ${p.type === 'exercise' ? `<div class="exercise-a"><small>Méthode et solution</small><div class="md">${MD.render(p.ex.a || '_Pas encore de solution : ajoute-la dans la fiche._')}</div></div>` : ''}
              ${items.length ? `
                <fieldset class="checklist">
                  <legend>Coche ce que tu avais retrouvé</legend>
                  ${items.map((t, i) => `<label class="check-item"><input type="checkbox" data-check="${i}" ${study.checks[i] ? 'checked' : ''} /><span>${p.type === 'branch' ? esc(t) : MD.render(t).replace(/^<p>|<\/p>$/g, '')}</span></label>`).join('')}
                </fieldset>`
                : p.type === 'cloze' && node.keyPoints.length ? `<p class="answer-title">${esc(node.title)}</p><ul class="kps-back">${node.keyPoints.map((k) => `<li>${MD.render(k).replace(/^<p>|<\/p>$/g, '')}</li>`).join('')}</ul>` : ''}
              ${node.explain.trim() ? `<div class="explain-back"><small>${ic('anchor-simple')}Ton ancrage</small>${MD.render(node.explain)}</div>` : ''}
              ${isLeech(node) ? `<div class="leech-tip">${ic('warning-circle', true)}<p>Tu as oublié cette partie ${node.srs.lapses} fois. Elle est peut-être trop grosse : <a href="${link(s.id, node.id)}">découpe-la en sous-parties</a> ou ancre-la avec une image ou un exemple.</p></div>` : ''}
              ${isNew && !node.explain.trim() ? `<div class="anchor-now">
                  <label for="anchorNow">${ic('anchor-simple')}Ancre-la avant de passer : une image, un exemple, ou une phrase à toi</label>
                  <input id="anchorNow" class="answer-input" autocomplete="off" placeholder="Ex. : comme une usine qui fabrique du sucre avec la lumière…" value="${esc(study.anchor)}" />
                </div>` : ''}
              ${node.notes.trim() ? `<details class="notes-more"><summary>Voir les notes</summary><div class="md">${MD.render(node.notes)}</div></details>` : ''}
              ${!items.length && p.type === 'recall' && !node.notes.trim() && !node.explain.trim() ? `<p class="muted">Cette partie n’a pas encore de points clés. Ajoute-en dans sa fiche : tu pourras cocher ce que tu as retrouvé.</p>` : ''}
            </div>
            <div class="grade-wrap">
              <p class="grade-q" id="gradeQ">${sug ? `Arbor propose <b>${['', 'Oublié', 'Difficile', 'Bien', 'Facile'][sug]}</b>${study.hints ? ' (tu as pris un indice)' : ''}. Tu peux choisir autre chose.` : 'Comment ça s’est passé ?'}</p>
              <div class="grades" role="group" aria-label="Évaluer ta réponse">
                ${[['1', 'Oublié', 'again'], ['2', 'Difficile', 'hard'], ['3', 'Bien', 'good'], ['4', 'Facile', 'easy']].map(([g, l, cls], i) =>
                  `<button class="grade ${cls} ${sug === +g ? 'suggested' : ''}" data-act="grade" data-g="${g}"><b>${l}</b><small>${intervals[i]}</small><kbd>${g}</kbd></button>`).join('')}
              </div>
              <p class="hint swipe-hint">Glisse la carte : à droite pour Bien, à gauche pour Oublié.</p>
            </div>`
          : `
            <label class="sr-only" for="typed">Ta réponse</label>
            ${p.type === 'cloze'
              ? `<input id="typed" class="answer-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Le mot manquant…" value="${esc(study.typed)}" />`
              : `<textarea id="typed" class="answer-input" rows="3" placeholder="${p.type === 'branch' ? 'Une sous-partie par ligne…' : p.type === 'exercise' ? 'Ta démarche et ton résultat…' : 'Ce dont tu te souviens…'}">${esc(study.typed)}</textarea>`}
            <div class="conf" role="group" aria-label="Ta confiance avant de voir la réponse">
              <span class="conf-label">Ta confiance</span>
              ${[['unsure', 'Pas sûr'], ['mid', 'Plutôt sûr'], ['sure', 'Certain']].map(([k, l]) => `<button class="chip-btn" data-act="conf" data-c="${k}" aria-pressed="${study.conf === k}">${l}</button>`).join('')}
            </div>
            <div class="row-btns ask-actions">
              ${study.hints < 2 ? `<button class="btn ghost" data-act="hint">${ic('lightbulb')}${study.hints ? 'Un autre indice' : 'Un indice'}</button>` : ''}
              <button class="btn big reveal" data-act="reveal">${ic('eye')}Voir la réponse<kbd>Entrée</kbd></button>
            </div>`}
        </article>
      </div>`;
    const t = $('#typed');
    if (t && matchMedia('(pointer: fine)').matches) t.focus();
    if (show) bindSwipe($('#studyCard'));
  }

  // Mise à jour de la note proposée quand on coche, sans tout redessiner
  function refreshSuggestion() {
    const c = currentCard(); if (!c) return;
    const sug = suggestedGrade(study.prompt, c.node);
    $$('.grade').forEach((b) => b.classList.toggle('suggested', +b.dataset.g === sug));
    const q = $('#gradeQ');
    if (q) q.innerHTML = sug ? `Arbor propose <b>${['', 'Oublié', 'Difficile', 'Bien', 'Facile'][sug]}</b>${study.hints ? ' (tu as pris un indice)' : ''}. Tu peux choisir autre chose.` : 'Comment ça s’est passé ?';
  }

  function renderSummary() {
    const pane = studyPane();
    const [again, hard, good, easy] = study.res;
    const n = again + hard + good + easy;
    const ok = hard + good + easy;
    const cal = (state.stats.calib && state.stats.calib.sure) || [0, 0];
    const calPct = cal[1] ? Math.round((cal[0] / cal[1]) * 100) : null;
    const td = SRS.today(state.stats);
    const tomorrow = (() => {
      const lim = Date.now() + SRS.DAY;
      let c = 0;
      state.subjects.forEach((s) => walk(s.root, (x) => { if (x.srs && x.srs.due <= lim) c++; }));
      return c;
    })();
    pane.innerHTML = `
      <div class="review-start summary">
        <span class="tile big">${ic('trophy', true)}</span>
        <h2>${study.quick ? 'C’était facile, non ?' : 'Session terminée'}</h2>
        ${study.quick ? '<p class="muted">Le plus dur, c’est de commencer. Tu peux t’arrêter là, ou continuer sur ta lancée.</p>' : ''}
        <div class="score">
          <div><b class="num txt-ok">${ok}</b><span>retrouvées</span></div>
          <div><b class="num txt-warn">${again}</b><span>oubliées</span></div>
          <div><b class="num">${n ? Math.round((ok / n) * 100) : 0} %</b><span>réussite</span></div>
        </div>
        <div class="insights">
          <p>${ic('target')}Objectif du jour : <b>${Math.min(td.reviews, state.settings.dailyGoal)}/${state.settings.dailyGoal}</b> cartes${td.reviews >= state.settings.dailyGoal ? ', atteint !' : '.'}</p>
          ${calPct !== null && cal[1] >= 5 ? `<p>${ic('scales')}Quand tu te dis <b>certain</b>, tu as raison <b>${calPct} %</b> du temps.${calPct < 80 ? ' Méfie-toi de l’impression de déjà-vu : vérifie-toi davantage.' : ' Tu te connais bien !'}</p>` : `<p>${ic('scales')}Indique ta confiance avant de retourner les cartes : Arbor te dira si tu te surestimes.</p>`}
          <p>${ic('calendar-check')}${tomorrow ? `${plural(tomorrow, 'carte reviendra', 'cartes reviendront')} d’ici demain.` : 'Rien de prévu demain : profite !'}</p>
        </div>
        <div class="row-btns center">
          <button class="btn" data-act="study-start">${ic('arrow-counter-clockwise')}${study.quick ? 'Continuer' : 'Nouvelle session'}</button>
          <a class="btn ghost" href="#/">${ic('house')}Accueil</a>
        </div>
      </div>`;
    if (n && !study.celebrated) { study.celebrated = true; FX.confetti(undefined, undefined, 110); Mascot.react('finished'); }
  }

  function reveal() {
    if (!study || study.phase !== 'ask') return;
    const t = $('#typed');
    study.typed = t ? t.value.trim() : '';
    study.phase = 'show';
    renderStudy();
    const card = $('#studyCard');
    if (card && !reducedMotion()) card.querySelector('.answer') && card.querySelector('.answer').animate(
      [{ opacity: 0, transform: 'translateY(8px)', filter: 'blur(2px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }],
      { duration: 260, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    const first = $('.grade.good'); first && matchMedia('(pointer: fine)').matches && first.focus({ preventScroll: true });
  }

  function gainXP(n) {
    const before = Math.floor(state.xp / 100);
    state.xp += n;
    renderXP(true);
    if (Math.floor(state.xp / 100) > before) { FX.toast(`Niveau ${before + 2} atteint`, 'success'); FX.confetti(undefined, undefined, 120); }
  }

  function grade(g, origin) {
    const c = currentCard();
    if (!c || study.phase !== 'show' || study.busy) return;
    const { s, node } = c;
    const wasNew = !node.srs;
    const prevSrs = node.srs || {};
    node.srs = SRS.schedule(node.srs, g);
    // Illusion de maîtrise : « certain » puis oublié. On le compte pour te le montrer.
    node.srs.illusions = (prevSrs.illusions || 0) + (study.conf === 'sure' && g === 1 ? 1 : 0);
    if (study.conf === 'sure' && g === 1) {
      state.stats.illusions = (state.stats.illusions || 0) + 1;
      Mascot.say('Tu étais certain… c’est l’illusion de maîtrise. Elle revient très vite, tu verras.', 3600);
    }
    if (g === 1 && node.srs.lapses === 3) FX.toast(`« ${node.title} » est une partie difficile pour toi. Découpe-la en sous-parties dans sa fiche.`, 'info', 5200);
    s.updatedAt = Date.now();
    const td = SRS.today(state.stats);
    td.reviews++;
    if (wasNew) td.newCards++;
    if (g >= 2) td.correct++;
    if (study.conf) {
      state.stats.calib = state.stats.calib || {};
      const k = state.stats.calib[study.conf] || [0, 0];
      state.stats.calib[study.conf] = [k[0] + (g >= 3 ? 1 : 0), k[1] + 1];
    }
    study.res[g - 1]++;
    // Le statut n'est plus déclaré à la main : « Maîtrisé » quand la mémoire mesurée tient au moins 3 semaines.
    // (S'auto-déclarer « maîtrisé » est précisément l'illusion de maîtrise que la recherche décrit.)
    const st = derivedStatus(node);
    if (st === 'done' && node.status !== 'done') setStatus(node, 'done', origin);
    else node.status = st;
    // Ancrage écrit sur une nouvelle carte : gardé comme explication
    const anchor = ($('#anchorNow') && $('#anchorNow').value.trim()) || study.anchor;
    if (anchor && !node.explain.trim()) { node.explain = anchor; gainXP(3); }
    if (study.hints) state.stats.hints = (state.stats.hints || 0) + study.hints;
    gainXP(2);
    if (td.reviews === state.settings.dailyGoal) {
      FX.toast('Objectif du jour atteint !', 'success');
      FX.confetti(undefined, undefined, 140);
      Mascot.react('goal');
    } else if (g === 1 && study.conf !== 'sure' && Math.random() < 0.5) Mascot.react('again');
    // Réapprentissage successif (Rawson et Dunlosky) : une carte oubliée revient plus loin dans la session
    // jusqu'à être retrouvée, 3 fois au plus pour ne pas décourager.
    if (g === 1) {
      const key = node.id;
      study.requeued[key] = (study.requeued[key] || 0) + 1;
      if (study.requeued[key] <= 3) study.queue.splice(Math.min(study.queue.length, study.i + 4), 0, study.queue[study.i]);
    }
    save();
    updateBadges();
    const card = $('#studyCard');
    const next = () => {
      study.busy = false;
      study.i++;
      preparePrompt();
      renderStudy();
      if (view.name === 'subject') { renderTree(); refreshProgress(); }
      const nc = $('#studyCard'); nc && nc.classList.add('card-in');
    };
    if (card && !reducedMotion()) {
      study.busy = true;
      const dir = g >= 3 ? 1 : -1;
      const from = card.style.transform || 'translateX(0) rotate(0deg)';
      card.animate([
        { transform: from, opacity: 1 },
        { transform: `translateX(${dir * 70}%) rotate(${dir * 9}deg)`, opacity: 0 },
      ], { duration: 240, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }).finished.then(next);
    } else next();
  }

  /* Glisser la carte (mobile et souris) : à droite = Bien, à gauche = Oublié.
     Validation à la distance OU à la vitesse (un petit geste rapide suffit). */
  function bindSwipe(card) {
    if (!card) return;
    let x0 = null, t0 = 0, dx = 0, id = null;
    card.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, a, summary, input, textarea') || id !== null) return;
      id = e.pointerId; x0 = e.clientX; t0 = performance.now(); dx = 0;
      card.setPointerCapture(id);
      card.style.transition = 'none';
    });
    card.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      dx = e.clientX - x0;
      card.style.transform = `translateX(${dx}px) rotate(${dx / 22}deg)`;
      card.dataset.swipe = dx > 40 ? 'good' : dx < -40 ? 'again' : '';
    });
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      const v = Math.abs(dx) / Math.max(1, performance.now() - t0);
      card.style.transition = '';
      if (Math.abs(dx) > 110 || (v > 0.5 && Math.abs(dx) > 30)) grade(dx > 0 ? 3 : 1, card);
      else { card.style.transform = ''; card.dataset.swipe = ''; }
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
  }

  function renderReview() {
    const s = subjectById(view.id);
    const scope = { type: 'node', sid: s.id, nid: view.nodeId };
    if (study && studyKey(study.scope) === studyKey(scope)) return renderStudy();
    const base = find(s.root, view.nodeId).node;
    const ov = overview(scope);
    const start = ov.due + ov.newToday;
    $('#paneBody').innerHTML = `
      <div class="review-start">
        <span class="tile big" style="--c:${s.color}">${ic('cards', true)}</span>
        <h2>Réviser « ${esc(base.id === s.root.id ? s.title : base.title)} »</h2>
        <div class="score small">
          <div><b class="num">${ov.due}</b><span>à revoir</span></div>
          <div><b class="num">${ov.fresh}</b><span>nouvelles</span></div>
          <div><b class="num">${ov.total}</b><span>au total</span></div>
        </div>
        <div class="row-btns center">
          ${start ? `<button class="btn" data-act="study-start">${ic('play')}Commencer (${start})</button>` : ''}
          <button class="btn ${start ? 'ghost' : ''}" data-act="study-start" data-cram="1">${ic('cards')}Tout réviser (${ov.total})</button>
        </div>
        <p class="hint">Les cartes dues sont celles que tu risques d’oublier. Sélectionne une partie dans l’arbre pour ne réviser que cette branche.</p>
      </div>`;
  }

  function startStudy(cram) {
    const scope = view.name === 'subject'
      ? { type: 'node', sid: view.id, nid: view.nodeId, cram: !!cram }
      : { type: 'all', cram: !!cram };
    buildSession(scope);
    renderStudy();
  }

  function renderGlobalStudy() {
    document.documentElement.style.removeProperty('--accent');
    app.innerHTML = `
      <section class="study-page">
        <header class="study-head">
          <a class="back-link" href="#/">${ic('arrow-left')}Accueil</a>
          <h1>Révision du jour</h1>
          <p class="muted">Tes sujets sont mélangés : c’est plus exigeant, et c’est ce qui fait tenir les souvenirs.</p>
        </header>
        <div id="paneBody"></div>
      </section>`;
    if (!study || study.scope.type !== 'all' || (study.i >= study.queue.length && study.celebrated)) buildSession({ type: 'all' });
    renderStudy();
  }

  /* Nombre de cartes dues (pastilles de navigation) */
  function dueCount() {
    const now = Date.now();
    let n = 0;
    state.subjects.forEach((s) => walk(s.root, (x, d) => { if (!(d === 0 && s.root.children.length) && SRS.isDue(x.srs, now)) n++; }));
    return n;
  }
  function updateBadges() {
    const ov = overview({ type: 'all' });
    const n = ov.due + ov.newToday;
    $$('.due-count').forEach((b) => { b.textContent = n > 99 ? '99+' : n; b.hidden = !n; });
    Mascot.setThirst && Mascot.setThirst(ov.due);
  }

  // Mémoire moyenne d'un sujet : moyenne des probabilités de rappel des parties déjà révisées
  function memAvg(s) {
    const rs = [];
    walk(s.root, (n) => { const r = SRS.retrievability(n.srs); if (r !== null) rs.push(r); });
    return rs.length ? Math.round((rs.reduce((a, b) => a + b, 0) / rs.length) * 100) : null;
  }
  // Points faibles : parties souvent oubliées ou crues sues à tort
  function weakSpots() {
    const out = [];
    state.subjects.forEach((s) => walk(s.root, (n) => {
      if (!n.srs) return;
      const score = (n.srs.lapses || 0) * 2 + (n.srs.illusions || 0) * 3 + (1 - SRS.retrievability(n.srs)) * 2;
      if ((n.srs.lapses || 0) >= 2 || (n.srs.illusions || 0) >= 1) out.push({ s, n, score });
    }));
    return out.sort((a, b) => b.score - a.score).slice(0, 3);
  }
  function weakPanel() {
    const w = weakSpots();
    const cal = (state.stats.calib && state.stats.calib.sure) || [0, 0];
    const calPct = cal[1] >= 5 ? Math.round((cal[0] / cal[1]) * 100) : null;
    if (!w.length && calPct === null) return '';
    return `
      <section class="insight-row" aria-label="Ce que tes révisions révèlent">
        ${calPct !== null ? `<div class="insight-card ${calPct < 80 ? 'warn' : 'good'}">
          <span class="tile sm">${ic('scales', true)}</span>
          <div><b>${calPct} %</b><p>de bonnes réponses quand tu te dis « certain ». ${calPct < 80 ? 'Attention à l’impression de déjà-vu : vérifie-toi plus souvent.' : 'Ta confiance est fiable, bravo.'}</p></div>
        </div>` : ''}
        ${w.length ? `<div class="insight-card weak">
          <span class="tile sm">${ic('warning-circle', true)}</span>
          <div><b>Tes points faibles</b>
            <ul>${w.map(({ s, n }) => `<li><a href="${link(s.id, n.id)}"><span class="sdot" style="background:${s.color};box-shadow:none" aria-hidden="true"></span>${esc(n.title)}</a><small>${n.srs.lapses ? `oubliée ${n.srs.lapses}×` : ''}${n.srs.illusions ? `${n.srs.lapses ? ', ' : ''}crue sue ${n.srs.illusions}×` : ''}</small></li>`).join('')}</ul>
          </div>
        </div>` : ''}
      </section>`;
  }

  /* ----- Démarrer, planifier, viser une date -----
     Recherche : la difficulté à démarrer est le facteur le plus lié à la procrastination (2026) ;
     les plans « quand… alors… » augmentent l'atteinte des objectifs (méta-analyse de 642 tests, 2024). */
  const PLAN_CUES = ['je rentre de cours', 'je finis de manger le midi', 'je m’assois dans le bus ou le train', 'je me suis brossé les dents le soir', 'je pose mon sac après le travail'];
  function planLine() {
    const p = state.settings.plan;
    if (!p) return `<button class="plan-line empty" data-act="plan-edit">${ic('calendar-plus')}<span>Décide quand tu révises : un plan « quand… alors… » aide à s’y tenir.</span></button>`;
    return `<button class="plan-line" data-act="plan-edit">${ic('calendar-check')}<span>Quand ${esc(p.cue)}, je révise ${p.n} cartes${p.time ? ` (vers ${esc(p.time)})` : ''}.</span><small>Modifier</small></button>`;
  }
  function examLine() {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const exams = state.subjects.filter((s) => s.examDate).map((s) => ({ s, days: Math.round((new Date(s.examDate + 'T00:00') - now) / SRS.DAY) })).filter((e) => e.days >= 0).sort((a, b) => a.days - b.days);
    if (!exams.length) return '';
    const { s, days } = exams[0];
    let fresh = 0; walk(s.root, (n, d) => { if (!(d === 0 && s.root.children.length) && !n.srs) fresh++; });
    const perDay = days ? Math.ceil(fresh / days) : fresh;
    return `<a class="exam-line" href="${link(s.id, s.root.id, 'revision')}" style="--c:${s.color}">
      <span class="tile sm" style="--c:${s.color}">${ic('flag-checkered', true)}</span>
      <span><b>${esc(s.title)}</b> : examen ${days === 0 ? 'aujourd’hui' : days === 1 ? 'demain' : `dans ${days} jours`}.
      ${fresh ? `${plural(fresh, 'partie jamais vue', 'parties jamais vues')} : vise ${plural(perDay, 'nouvelle par jour', 'nouvelles par jour')}.` : 'Tout a été vu au moins une fois : continue les révisions.'}</span>
    </a>`;
  }
  function planModal() {
    const p = state.settings.plan || { cue: PLAN_CUES[0], n: 10, time: '18:30' };
    const custom = !PLAN_CUES.includes(p.cue);
    openModal(`
      <h2 id="modalTitle">Ton plan de révision</h2>
      <p class="modal-lede">Relier la révision à un moment précis de ta journée la rend presque automatique. Choisis un moment que tu vis vraiment tous les jours.</p>
      <form id="planForm" class="form">
        <div class="field">
          <label for="planCue">Quand…</label>
          <select id="planCue">${PLAN_CUES.map((c) => `<option ${c === p.cue ? 'selected' : ''}>${c}</option>`).join('')}<option value="__custom" ${custom ? 'selected' : ''}>Autre moment…</option></select>
          <input id="planCustom" ${custom ? '' : 'hidden'} autocomplete="off" placeholder="je sors de la salle de sport…" value="${custom ? esc(p.cue) : ''}" />
        </div>
        <div class="field-row">
          <div class="field">
            <label for="planN">…je révise</label>
            <select id="planN">${[5, 10, 15, 20, 30].map((v) => `<option value="${v}" ${p.n === v ? 'selected' : ''}>${v} cartes</option>`).join('')}</select>
          </div>
          <div class="field">
            <label for="planTime">Vers quelle heure</label>
            <input id="planTime" type="time" value="${esc(p.time || '')}" />
          </div>
        </div>
        <p class="hint">Astuce : commence petit. 5 cartes tenues chaque jour valent mieux que 30 abandonnées au bout de trois jours.</p>
        <div class="row-btns spread">
          ${state.settings.plan ? `<button type="button" class="btn ghost" id="planIcs">${ic('calendar-plus')}Ajouter à mon agenda</button>` : '<span></span>'}
          <span class="row-btns">${state.settings.plan ? '<button type="button" class="btn danger" id="planDel">Supprimer</button>' : ''}<button class="btn">Enregistrer le plan</button></span>
        </div>
      </form>`, (el) => {
      $('#planCue', el).onchange = (e) => { $('#planCustom', el).hidden = e.target.value !== '__custom'; if (!$('#planCustom', el).hidden) $('#planCustom', el).focus(); };
      const ics = $('#planIcs', el); if (ics) ics.onclick = () => downloadIcs(state.settings.plan);
      const del = $('#planDel', el); if (del) del.onclick = () => { state.settings.plan = null; save(); closeModal(); render(view); };
      $('#planForm', el).onsubmit = (e) => {
        e.preventDefault();
        const cueSel = $('#planCue', el).value;
        const cue = cueSel === '__custom' ? ($('#planCustom', el).value.trim() || PLAN_CUES[0]) : cueSel;
        state.settings.plan = { cue, n: +$('#planN', el).value, time: $('#planTime', el).value };
        save(); closeModal(); render(view);
        FX.toast('Plan enregistré. Ajoute-le à ton agenda pour recevoir un rappel.', 'success', 4200);
      };
    });
  }
  // Rappel quotidien dans l'agenda du téléphone (fichier .ics) : fonctionne même app fermée
  function downloadIcs(p) {
    if (!p) return;
    const [h, m] = (p.time || '18:30').split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0);
    const pad = (x) => String(x).padStart(2, '0');
    const stamp = (t) => `${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}T${pad(t.getHours())}${pad(t.getMinutes())}00`;
    const end = new Date(d.getTime() + 15 * 60000);
    const url = location.href.split('#')[0] + '#/reviser';
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Arbor//FR', 'BEGIN:VEVENT', `UID:arbor-plan-${Date.now()}@arbor`, `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(d)}`, `DTEND:${stamp(end)}`, 'RRULE:FREQ=DAILY', `SUMMARY:Arbor : ${p.n} cartes`, `DESCRIPTION:Quand ${p.cue}\, je révise ${p.n} cartes. ${url}`, `URL:${url}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${p.n} cartes avec Arbor`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'arbor-rappel.ics'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  // Si l'app est ouverte à l'heure du plan : petit rappel
  setInterval(() => {
    const p = state.settings.plan; if (!p || !p.time) return;
    const now = new Date(); const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const key = SRS.dayKey();
    if (hm === p.time && state.settings.planToast !== key) {
      state.settings.planToast = key; save();
      Mascot.say(`C’est l’heure de ton plan : ${p.n} cartes !`, 5000);
      FX.toast(`C’est l’heure : ${p.n} cartes, et c’est fini.`, 'info', 5000);
    }
  }, 30000);

  function greeting() {
    const h = new Date().getHours();
    return h < 5 ? 'Bonsoir' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
  }

  function todayPanel() {
    const ov = overview({ type: 'all' });
    const td = SRS.today(state.stats);
    const goal = state.settings.dailyGoal;
    const goalPct = Math.min(100, Math.round((td.reviews / goal) * 100));
    const streak = SRS.streak(state.stats);
    const week = SRS.last7(state.stats);
    const max = Math.max(goal, ...week.map((d) => d.reviews));
    const n = ov.due + ov.newToday;
    const nextDue = (() => {
      let t = Infinity;
      state.subjects.forEach((s) => walk(s.root, (x) => { if (x.srs && x.srs.due > Date.now()) t = Math.min(t, x.srs.due); }));
      return t === Infinity ? null : t;
    })();
    return `
      <section class="today" aria-labelledby="todayTitle">
        <div class="today-main">
          <h1 id="todayTitle">${n ? `${plural(n, 'carte t’attend', 'cartes t’attendent')}` : ov.total ? 'Ta mémoire est à jour' : 'Prêt à commencer ?'}</h1>
          <p class="lede">${greeting()}. ${n
            ? `${ov.due ? `${plural(ov.due, 'partie à revoir', 'parties à revoir')} avant de l’oublier` : 'Aucune partie en danger'}${ov.newToday ? `, ${plural(ov.newToday, 'nouvelle à découvrir', 'nouvelles à découvrir')}` : ''}. Compte environ ${Math.max(2, Math.round(n * 0.4))} minutes.`
            : ov.total ? `Prochaine révision ${nextDue ? new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' }).format(Math.max(1, Math.round((nextDue - Date.now()) / SRS.DAY)), 'day') : 'bientôt'}. Profites-en pour approfondir une fiche ou ajouter des parties.`
            : 'Crée un sujet ou importe un PDF : chaque partie deviendra une carte de révision.'}</p>
          <div class="row-btns">
            ${n ? `<a class="btn big" href="#/reviser">${ic('play', true)}Commencer la révision</a>` : `<button class="btn big" data-act="new-subject">${ic('plus')}Nouveau sujet</button>`}
            ${n > 5 ? `<button class="btn ghost big" data-act="quick-start">${ic('lightning')}Juste 2 minutes</button>` : `<button class="btn ghost big" data-act="focus-open">${ic('timer')}Focus ${state.settings.focusMin} min</button>`}
          </div>
          ${planLine()}
          ${moduleLine()}
          ${examLine()}
          <a class="method-link" href="#/methode">${ic('lightbulb')}Pourquoi cette méthode marche</a>
        </div>
        <div class="today-stats">
          <div class="stat goal-stat">
            ${ring(goalPct, 64)}
            <div><b class="num">${td.reviews}/${goal}</b><span>cartes aujourd’hui</span></div>
          </div>
          <div class="stat streak-stat ${streak ? 'on' : ''}">
            <span class="flame">${ic('fire', true)}</span>
            <div><b class="num">${plural(streak, 'jour', 'jours')}</b><span>${streak ? 'de série, continue !' : 'Révise aujourd’hui pour lancer ta série'}</span></div>
          </div>
          <div class="stat week-stat">
            <div class="week" aria-label="Cartes révisées ces 7 derniers jours">
              ${week.map((d, i) => `<div class="day ${i === 6 ? 'is-today' : ''}" title="${d.reviews} cartes"><span style="--h:${d.reviews ? Math.max(8, (d.reviews / max) * 100) : 4}%"></span><small>${d.label}</small></div>`).join('')}
            </div>
            <div><b class="num">${week.reduce((a, d) => a + d.reviews, 0)}</b><span>cette semaine${td.focusMin ? `, ${td.focusMin} min de focus aujourd’hui` : ''}</span></div>
          </div>
        </div>
      </section>`;
  }

  // Études récentes (2023 à 2026) sur l'attention, la mise en route et l'IA
  function adhdItems() {
    return [
      { icon: 'check-circle', title: 'Se tester marche aussi avec un TDAH',
        text: 'Dans une étude de 2023, se tester a aidé les étudiants avec un TDAH autant que les autres. Mais une autre étude montre qu’ils l’utilisent moins quand ils organisent seuls leurs révisions.',
        arbor: 'Arbor prend le pilotage : un seul bouton pour démarrer, les cartes arrivent toutes seules, dans le bon ordre et au bon moment.',
        src: [['Minear et al. (2023)', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10397724/'], ['Étude sur les définitions de cours (2020)', 'https://www.sciencedirect.com/science/article/abs/pii/S0959475219305092']], level: 'Solide, petits échantillons' },
      { icon: 'anchor-simple', title: 'Le point faible, c’est la première mémorisation',
        text: 'Dans la même étude, les étudiants avec un TDAH sans traitement utilisaient beaucoup moins de stratégies « profondes » (image mentale, sens, phrase personnelle). Se tester ne compensait pas ce manque.',
        arbor: 'Chaque fiche propose de l’ancrer : une image, un exemple, un lien, un « pourquoi ». À la première révision d’une partie, Arbor te demande une phrase d’ancrage.',
        src: [['Minear et al. (2023)', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10397724/']], level: 'Solide, à confirmer' },
      { icon: 'tree-structure', title: 'Réciter un ensemble, dans l’ordre',
        text: 'Chez 72 étudiants, réciter un texte entier de mémoire a mieux tenu deux jours plus tard que le réciter section par section. Le rappel des étudiants avec un TDAH était moins bien organisé.',
        arbor: 'La carte « Rappel de la branche » te demande de retrouver toutes les sous-parties d’une partie, dans l’ordre. L’arbre sert de structure à ta mémoire.',
        src: [['Étude sur le rappel libre (2023)', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10715433/']], level: 'Une étude' },
      { icon: 'play', title: 'Le plus dur, c’est de commencer',
        text: 'Une étude de 2026 montre que la difficulté à démarrer est le facteur le plus lié à la procrastination. Les plans « quand… alors… » augmentent nettement l’atteinte des objectifs, surtout s’ils sont précis.',
        arbor: 'Le bouton « Juste 2 minutes » lance 5 cartes. Ton plan relie la révision à un moment de ta journée, avec un rappel dans ton agenda.',
        src: [['Procrastination et fonctions exécutives (2026)', 'https://link.springer.com/article/10.1186/s40359-026-04221-1'], ['Méta-analyse de 642 tests (2024)', 'https://kops.uni-konstanz.de/handle/123456789/69905']], level: 'Solide' },
      { icon: 'calendar-check', title: 'Réapprendre jusqu’à réussir',
        text: 'Retrouver une notion jusqu’à la réussir, puis la retrouver à nouveau lors de séances espacées, donne des souvenirs durables en conditions réelles de cours.',
        arbor: 'Une carte oubliée revient plus loin dans la même session jusqu’à ce que tu la retrouves, puis l’algorithme l’espace.',
        src: [['Rawson et Dunlosky (2022)', 'https://journals.sagepub.com/doi/full/10.1177/09637214221100484']], level: 'Solide' },
      { icon: 'shuffle', title: 'Pour les exercices : mélanger les types',
        text: 'Dans un essai sur 787 élèves, mélanger les types d’exercices de maths a donné 61 % de réussite un mois plus tard, contre 38 % en les faisant par blocs.',
        arbor: 'Ajoute des exercices avec leur méthode dans tes fiches : en révision, ils reviennent mélangés avec ceux des autres parties.',
        src: [['Rohrer et al. (2020)', 'https://Www.Gwern.net/doc/psychology/spaced-repetition/2019-rohrer.pdf']], level: 'Très solide' },
      { icon: 'robot', title: 'Une IA qui donne les réponses fait moins bien apprendre',
        text: 'Des lycéens ayant eu ChatGPT en libre accès ont fait 17 % de moins à l’examen, une fois l’outil retiré. Avec un tuteur à garde-fous, la perte a disparu. Un tuteur IA bien structuré peut même doubler les progrès.',
        arbor: 'Les indices mettent sur la piste sans donner la réponse, et baissent la note proposée. L’IA d’import structure ton cours mais ne rédige pas tes ancrages à ta place.',
        src: [['Bastani et al., PNAS (2025)', 'https://papers.ssrn.com/abstract=4895486'], ['Kestin et al. (2025)', 'https://michellemillerphd.substack.com/p/r3-37-july-15-2025-how-do-tutoring']], level: 'Solide' },
      { icon: 'scales', title: 'Tu te notes moins bien que tu ne le crois',
        text: 'S’auto-évaluer est peu fiable : on prend la familiarité pour du savoir. Une note trop généreuse espace trop la carte, et on l’oublie.',
        arbor: 'Plus de bouton « Maîtrisé » à cliquer. Tu coches ce que tu avais vraiment retrouvé, Arbor propose la note, et le statut vient de ta mémoire mesurée.',
        src: [['Recherche sur les jugements d’apprentissage', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2836879']], level: 'Solide' },
      { icon: 'game-controller', title: 'Les points et les badges motivent un peu, pas plus',
        text: 'Une méta-analyse de 2024 trouve un effet faible de la ludification sur la motivation (g = 0,26), moins stable que sur les résultats.',
        arbor: 'L’XP récompense l’effort (réviser, ancrer, se concentrer), pas le fait de cliquer « Bien ». Le mode calme coupe les confettis et fige le décor si le mouvement te distrait.',
        src: [['Méta-analyse 2024', 'https://repository.hku.hk/handle/10722/348034']], level: 'Modéré' },
      { icon: 'users-three', title: 'Travailler « avec quelqu’un »',
        text: 'Le body doubling, travailler en présence de quelqu’un, est très utilisé par les personnes avec un TDAH. Les premières données (12 participants, 2025) vont dans le bon sens, sans preuve solide pour l’instant.',
        arbor: 'Pendant le Focus, Pousse lit en silence à côté de toi. Une petite présence, sans notification.',
        src: [['Étude préliminaire (2025)', 'https://arxiv.org/abs/2509.12153']], level: 'Préliminaire' },
    ];
  }

  /* ----- Page « La méthode » : ce que dit la recherche, et ce qu'Arbor en fait ----- */
  function renderMethod() {
    document.documentElement.style.removeProperty('--accent');
    const items = [
      { icon: 'eye-slash', title: 'Relire donne l’illusion de savoir',
        text: 'Dans une enquête auprès d’étudiants, 83 % disaient relire leurs cours, et 54 % en faisaient leur méthode n°1. Relire rend le texte familier, et cette familiarité se fait passer pour de la maîtrise.',
        arbor: 'Arbor ne te montre la réponse qu’après que tu as essayé de t’en souvenir.',
        src: [['Karpicke, Butler et Roediger (2009)', 'https://bpb-us-e2.wpmucdn.com/sites.wustl.edu/dist/8/805/files/2026/06/Karpicke-et-al.-2009-Metacognitive-strategies-in-student-learning-Do-students-practise-retrieval-when-they-study-on-thei.pdf']], level: 'Solide' },
      { icon: 'brain', title: 'Se tester est la technique la plus efficace',
        text: 'Une grande revue de dix techniques d’étude classe deux méthodes « très utiles » : se tester et espacer ses révisions. Relire, surligner et résumer arrivent en bas du classement.',
        arbor: 'Chaque partie devient une carte : rappel libre ou phrase à compléter tirée de tes points clés. Et tes passages surlignés deviennent des questions : le surlignage, peu efficace seul, se transforme en test.',
        src: [['Dunlosky et al. (2013)', 'https://www.psychologicalscience.org/journals/pspi/1529100612453266/']], level: 'Très solide' },
      { icon: 'calendar-check', title: 'Espacer bat le bachotage',
        text: 'On oublie vite, puis de moins en moins vite à chaque rappel réussi. Réviser juste avant d’oublier renforce le souvenir avec le moins d’effort possible.',
        arbor: 'L’algorithme FSRS calcule pour chaque partie le moment où ta mémoire passe sous 90 %, et la remet dans ta révision du jour.',
        src: [['FSRS, algorithme open source', 'https://github.com/open-spaced-repetition'], ['Dunlosky et al. (2013)', 'https://www.psychologicalscience.org/journals/pspi/1529100612453266/']], level: 'Très solide' },
      { icon: 'path', title: 'Un programme devient un parcours',
        text: 'Quand on n’a qu’une liste de sujets, le risque est de tout repousser puis de bachoter. Étaler l’apprentissage sur la durée, et tester ce qu’on sait avant de lire, sont deux des effets les mieux établis.',
        arbor: 'Importe un programme : chaque sujet devient un module, réparti jusqu’à ton examen, et Arbor en rédige le cours (à partir de Wikipédia, ou avec Claude qui cherche des sources). Avant de le lire, tu écris ce que tu sais déjà ; ensuite tu ancres et tu te testes.',
        src: [['Dunlosky et al. (2013)', 'https://www.psychologicalscience.org/journals/pspi/1529100612453266/'], ['Revue sur l’effet de prétest (2022)', 'https://link.springer.com/article/10.3758/s13421-022-01392-1']], level: 'Solide' },
      { icon: 'pencil-simple-line', title: 'Essayer de répondre, même faux, aide',
        text: 'Tenter une réponse avant de voir la correction améliore la mémorisation, même quand la tentative est fausse. Condition : voir la bonne réponse juste après.',
        arbor: 'Tu écris ta réponse avant de retourner la carte. Et sur une partie jamais révisée, Arbor te propose de deviner les points clés avant de les lire.',
        src: [['Revue sur l’effet de prétest (2022)', 'https://link.springer.com/article/10.3758/s13421-022-01392-1']], level: 'Solide' },
      { icon: 'chat-circle-text', title: 'S’expliquer avec ses mots',
        text: 'Se demander « pourquoi est-ce vrai ? » et s’expliquer une notion améliore la compréhension, avec un effet modéré.',
        arbor: 'Chaque fiche a une zone « Explique-le simplement », reprise au dos de la carte.',
        src: [['Dunlosky et al. (2013)', 'https://www.psychologicalscience.org/journals/pspi/1529100612453266/'], ['Synthèse sur l’auto-explication', 'https://www.structural-learning.com/research-briefings/ask-why-and-how']], level: 'Modéré' },
      { icon: 'shuffle', title: 'Mélanger les sujets',
        text: 'Alterner les sujets rend la révision plus difficile sur le moment, mais aide à retenir plus tard. L’effet varie selon la matière.',
        arbor: 'Les nouvelles parties arrivent dans l’ordre du cours, sujet par sujet ; les révisions, elles, sont mélangées entre tes sujets.',
        src: [['Dunlosky et al. (2013)', 'https://www.psychologicalscience.org/journals/pspi/1529100612453266/']], level: 'Modéré' },
      { icon: 'scales', title: 'Savoir ce qu’on sait vraiment',
        text: 'Nos jugements de « je le sais » sont souvent mal calibrés. Se tester donne des indices bien plus fiables que l’impression de familiarité.',
        arbor: 'Tu indiques ta confiance avant de répondre. Arbor calcule la fiabilité de tes « certain », repère les parties que tu croyais savoir, et te les montre dans tes points faibles.',
        src: [['Recherche sur les jugements d’apprentissage', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2836879']], level: 'Solide' },
      { icon: 'device-mobile-slash', title: 'Le téléphone et la procrastination',
        text: 'Plusieurs études récentes relient la distraction par le smartphone à la procrastination et à l’anxiété scolaire. Ce sont surtout des corrélations, mais le lien revient souvent.',
        arbor: 'Le mode Focus, des objectifs courts (15 cartes) et une série quotidienne pour démarrer sans négocier avec soi-même.',
        src: [['Étude sur 474 étudiants (2024)', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11428987/'], ['Pauses et fatigue (2025)', 'https://doaj.org/article/ba3ad862547f4f16a55b776eb52ab784']], level: 'Indicatif' },
    ];
    app.innerHTML = `
      <section class="method">
        <header class="method-head">
          <a class="back-link" href="#/">${ic('arrow-left')}Accueil</a>
          <h1>Pourquoi tu oublies, et comment Arbor t’aide</h1>
          <p class="lede">La plupart des étudiants révisent de la façon qui donne l’impression d’apprendre, pas de celle qui fait retenir. Voici ce que montre la recherche en sciences cognitives, et comment chaque fonction d’Arbor en découle.</p>
        </header>
        <ol class="method-list">
          ${items.map((it, i) => `
            <li class="method-item" style="--i:${i}">
              <span class="tile">${ic(it.icon, true)}</span>
              <div>
                <div class="mi-head"><h2>${it.title}</h2><span class="chip level">${it.level}</span></div>
                <p>${it.text}</p>
                <p class="mi-arbor">${ic('tree', true)}<span>${it.arbor}</span></p>
                <p class="mi-src">Sources : ${it.src.map(([l, u]) => `<a href="${u}" target="_blank" rel="noopener">${l}</a>`).join(', ')}</p>
              </div>
            </li>`).join('')}
        </ol>
        <h2 class="method-sub">Si l’attention est ton point faible</h2>
        <p class="lede method-sub-lede">TDAH diagnostiqué ou simple difficulté à rester concentré : voici ce que les études récentes montrent, et ce qu’Arbor en fait. Les preuves sont encore minces pour les étudiants avec un TDAH ; on le dit quand c’est le cas.</p>
        <ol class="method-list">
          ${adhdItems().map((it, i) => `
            <li class="method-item" style="--i:${i}">
              <span class="tile">${ic(it.icon, true)}</span>
              <div>
                <div class="mi-head"><h2>${it.title}</h2><span class="chip level">${it.level}</span></div>
                <p>${it.text}</p>
                <p class="mi-arbor">${ic('tree', true)}<span>${it.arbor}</span></p>
                <p class="mi-src">Sources : ${it.src.map(([l, u]) => `<a href="${u}" target="_blank" rel="noopener">${l}</a>`).join(', ')}</p>
              </div>
            </li>`).join('')}
        </ol>
        <p class="hint method-foot">Niveaux de preuve résumés honnêtement : « très solide » pour des effets répliqués des centaines de fois, « indicatif » pour des études surtout corrélationnelles.</p>
      </section>`;
  }

  /* ----- Mode Focus : minuteur de concentration avec pauses fixes ----- */
  const focus = { mode: 'work', endAt: 0, left: 0, running: false, tick: null };
  try { Object.assign(focus, JSON.parse(localStorage.getItem('arbor:focus') || '{}'), { tick: null }); } catch (e) { /* rien */ }
  const focusLen = () => (focus.mode === 'work' ? state.settings.focusMin : state.settings.breakMin) * 60000;
  const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  function focusLeft() { return focus.running ? focus.endAt - Date.now() : (focus.left || focusLen()); }
  function saveFocus() { try { localStorage.setItem('arbor:focus', JSON.stringify({ mode: focus.mode, endAt: focus.endAt, left: focus.left, running: focus.running })); } catch (e) { /* rien */ } }

  function focusStart() {
    if (focus.running) return;
    focus.endAt = Date.now() + focusLeft();
    focus.running = true;
    saveFocus(); focusLoop();
    if (focus.mode === 'work') Mascot.setFocus(true);
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
    renderFocusUI();
  }
  function focusPause() { if (!focus.running) return; focus.left = focus.endAt - Date.now(); focus.running = false; saveFocus(); Mascot.setFocus(false); renderFocusUI(); }
  function focusReset() { focus.running = false; focus.left = 0; focus.mode = 'work'; saveFocus(); Mascot.setFocus(false); renderFocusUI(); }
  function focusLoop() {
    clearInterval(focus.tick);
    focus.tick = setInterval(() => {
      if (!focus.running) { clearInterval(focus.tick); return; }
      if (focusLeft() <= 0) focusDone();
      renderFocusUI();
    }, 1000);
  }
  function chime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [660, 880, 1320].forEach((f, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.frequency.value = f; o.type = 'sine';
        g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.16);
        g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + i * 0.16 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.16 + 0.5);
        o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + i * 0.16); o.stop(ctx.currentTime + i * 0.16 + 0.55);
      });
    } catch (e) { /* audio indisponible */ }
  }
  function focusDone() {
    const wasWork = focus.mode === 'work';
    focus.running = false; focus.left = 0;
    chime();
    if (wasWork) {
      SRS.today(state.stats).focusMin += state.settings.focusMin;
      gainXP(5);
      save();
      FX.confetti(undefined, undefined, 80);
      Mascot.setFocus(false);
      Mascot.react('focusdone');
      notify('Session de focus terminée', `Bravo ! Fais une pause de ${state.settings.breakMin} minutes.`);
      focus.mode = 'break';
      focusStart();
    } else {
      notify('Pause terminée', 'On s’y remet ?');
      Mascot.say('Pause finie ! Prêt pour une nouvelle session ?');
      focus.mode = 'work';
    }
    saveFocus(); renderFocusUI();
    if (view.name === 'home') render(view);
  }
  function notify(title, body) {
    try { if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification(title, { body, icon: 'icons/icon-192.png' }); } catch (e) { /* rien */ }
  }

  function renderFocusUI() {
    const left = focusLeft();
    const total = focusLen();
    const pct = 1 - left / total;
    // Pastille flottante (visible pendant un focus, sur tous les écrans)
    const pill = $('#focusPill');
    const active = focus.running || (focus.left && focus.left < total);
    pill.hidden = !active;
    pill.classList.toggle('break', focus.mode === 'break');
    pill.querySelector('.fp-time').textContent = mmss(left);
    pill.querySelector('.fp-label').textContent = focus.mode === 'work' ? 'Focus' : 'Pause';
    $$('.focus-nav-label').forEach((el) => { el.textContent = active ? mmss(left) : 'Focus'; });
    // Modale ouverte
    const box = $('#focusBox');
    if (box) {
      box.querySelector('.fr-time').textContent = mmss(left);
      box.querySelector('.fr-mode').textContent = focus.mode === 'work' ? 'Concentration' : 'Pause';
      box.querySelector('.fr-progress').style.strokeDashoffset = String(1 - pct);
      box.classList.toggle('break', focus.mode === 'break');
      $('[data-act="focus-toggle"]').innerHTML = focus.running ? `${ic('pause', true)}Pause` : `${ic('play', true)}${focus.left ? 'Reprendre' : 'Démarrer'}`;
    }
  }

  function focusModal() {
    const tips = [
      'Pose ton téléphone dans une autre pièce, ou au moins hors de vue.',
      'Une seule tâche : une fiche, ou une révision. Pas les deux.',
      'Pendant la pause, lève-toi et bouge : pas d’écran.',
      'Prépare de l’eau avant de commencer.',
    ];
    openModal(`
      <h2 id="modalTitle">Focus</h2>
      <p class="modal-lede">${state.settings.focusMin} minutes de concentration, puis ${state.settings.breakMin} minutes de pause. Des pauses fixes aident à garder l’attention.</p>
      <div class="focus-box" id="focusBox">
        <svg viewBox="0 0 120 120" class="focus-ring" aria-hidden="true">
          <circle cx="60" cy="60" r="52" class="fr-track"/>
          <circle cx="60" cy="60" r="52" class="fr-progress" pathLength="1"/>
        </svg>
        <div class="fr-center"><span class="fr-mode"></span><b class="fr-time num" role="timer" aria-live="off"></b></div>
      </div>
      <div class="row-btns center">
        <button class="btn big" data-act="focus-toggle"></button>
        <button class="btn ghost big" data-act="focus-reset">${ic('arrow-counter-clockwise')}Réinitialiser</button>
      </div>
      <div class="field focus-len">
        <label for="focusLen">Durée de concentration</label>
        <select id="focusLen">${[15, 25, 45, 50].map((m) => `<option value="${m}" ${state.settings.focusMin === m ? 'selected' : ''}>${m} minutes</option>`).join('')}</select>
      </div>
      <ul class="tips">${tips.map((t) => `<li>${ic('check-circle', true)}${t}</li>`).join('')}</ul>`, (el) => {
      $('#focusLen', el).onchange = (e) => {
        state.settings.focusMin = +e.target.value;
        state.settings.breakMin = state.settings.focusMin >= 45 ? 10 : 5;
        save();
        if (!focus.running) { focus.left = 0; }
        renderFocusUI();
      };
    });
    renderFocusUI();
  }
  if (focus.running) {
    if (focusLeft() <= 0) { focus.running = false; focus.left = 0; focus.mode = 'work'; saveFocus(); }
    else focusLoop();
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
          <label class="check"><input type="checkbox" id="nsProgram" /> C’est un programme d’examen : faire de chaque partie un module à suivre en 5 étapes</label>
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
        if ($('#nsProgram', el).checked && s.root.children.length) {
          s.program = { rhythm: 2, createdAt: Date.now() };
          s.root.children.forEach((c) => { c.module = { pretest: '', learned: false, sources: [], date: null }; });
          scheduleModules(s);
        }
        state.subjects.push(s);
        save();
        closeModal();
        FX.toast('Sujet créé', 'success');
        Mascot.react('created');
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
        <div class="field">
          <label for="esExam">Date d’examen <span class="optional">facultatif</span></label>
          <input id="esExam" type="date" value="${esc(s.examDate || '')}" />
          <p class="hint">Arbor te dira combien de nouvelles parties voir chaque jour pour être prêt.</p>
        </div>
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
        s.examDate = $('#esExam', el).value || null;
        if (s.program) scheduleModules(s);
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
        <div class="field-row">
          <div class="field">
            <label for="dailyGoal">Objectif quotidien</label>
            <select id="dailyGoal">${[10, 15, 20, 30, 50].map((v) => `<option value="${v}" ${st.dailyGoal === v ? 'selected' : ''}>${v} cartes</option>`).join('')}</select>
          </div>
          <div class="field">
            <label for="newPerDay">Nouvelles cartes par jour</label>
            <select id="newPerDay">${[5, 10, 20, 30].map((v) => `<option value="${v}" ${st.newPerDay === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
          </div>
        </div>
        <label class="check switch-row"><input type="checkbox" id="calmOn" ${st.calm ? 'checked' : ''} /> Mode calme : moins de mouvement, pas de confettis, mascotte silencieuse</label>
        <label class="check switch-row"><input type="checkbox" id="mascotOn" ${st.mascot !== false ? 'checked' : ''} /> Afficher Pousse, la mascotte</label>
        <fieldset class="field local-ai">
          <legend>IA locale <span class="optional">gratuite, open source</span></legend>
          ${window.LocalAI && LocalAI.supported() ? `
          <label class="check switch-row"><input type="checkbox" id="localOn" ${st.localAI ? 'checked' : ''} /> Utiliser un modèle open source (Qwen, via WebLLM) qui tourne dans ce navigateur pour rédiger les cours et analyser les PDF</label>
          <select id="localModel" aria-label="Modèle local">${LocalAI.MODELS.map((m) => `<option value="${m.id}" ${st.localModel === m.id ? 'selected' : ''}>${m.label} (${m.size})</option>`).join('')}</select>
          <div class="row-btns"><button type="button" class="btn ghost sm" id="localDl">${ic('download-simple')}Télécharger le modèle maintenant</button><span class="hint" id="localState"></span></div>
          <div class="bar" id="localBarWrap" hidden><span id="localBar" style="transform:scaleX(0)"></span></div>
          <p class="hint">Téléchargé une seule fois, puis gardé sur l’appareil. Rien n’est envoyé à un serveur. Moins précis que Claude : il reformule un article de référence plutôt que d’inventer.</p>`
          : `<p class="hint">Ce navigateur ne gère pas WebGPU, nécessaire pour faire tourner une IA sur l’appareil. Essaie Chrome ou Edge à jour, sur ordinateur ou sur un téléphone récent.</p>`}
        </fieldset>
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
        ${installBlock()}
        <fieldset class="field">
          <legend>Sauvegarde</legend>
          <div class="row-btns">
            <button type="button" class="btn ghost sm" id="expAll">${ic('download-simple')}Exporter tout</button>
            <button type="button" class="btn ghost sm" id="impAll">${ic('upload-simple')}Importer un fichier</button>
          </div>
        </fieldset>
        <div class="row-btns end"><button class="btn">Enregistrer</button></div>
      </form>`, (el) => {
      const ib = $('#installBtn', el); if (ib) ib.onclick = () => window.PWA && PWA.install();
      const dl = $('#localDl', el);
      if (dl) {
        const stateEl = $('#localState', el);
        const refresh = async () => { stateEl.textContent = (await LocalAI.isCached($('#localModel', el).value)) ? 'Déjà téléchargé' : ''; };
        refresh();
        $('#localModel', el).onchange = refresh;
        dl.onclick = async () => {
          dl.disabled = true;
          $('#localBarWrap', el).hidden = false;
          try {
            await LocalAI.load($('#localModel', el).value, (p, t) => { stateEl.textContent = t; $('#localBar', el).style.transform = `scaleX(${p})`; });
            stateEl.textContent = 'Modèle prêt';
            $('#localOn', el).checked = true;
          } catch (err) { stateEl.textContent = err.message; }
          dl.disabled = false;
        };
      }
      $('#expAll', el).onclick = () => exportJSON({ subjects: state.subjects, xp: state.xp }, 'arbor-sauvegarde');
      $('#impAll', el).onclick = () => $('#jsonInput').click();
      $('#setForm', el).onsubmit = (e) => {
        e.preventDefault();
        st.theme = $('#theme', el).value;
        st.mascot = $('#mascotOn', el).checked;
        st.calm = $('#calmOn', el).checked;
        applyCalm();
        st.dailyGoal = +$('#dailyGoal', el).value;
        st.newPerDay = +$('#newPerDay', el).value;
        Mascot.setEnabled(st.mascot);
        st.apiKey = $('#apiKey', el).value.trim();
        st.model = $('#model', el).value;
        if ($('#localOn', el)) { st.localAI = $('#localOn', el).checked; st.localModel = $('#localModel', el).value; }
        applyTheme(); save(); closeModal(); FX.toast('Réglages enregistrés', 'success');
      };
    });
  }

  function installBlock() {
    if (!window.PWA || PWA.installed()) return '';
    if (PWA.canInstall()) return `<fieldset class="field"><legend>Application</legend><button type="button" class="btn ghost sm" id="installBtn">${ic('download-simple')}Installer Arbor sur cet appareil</button></fieldset>`;
    if (PWA.isIOS()) return `<fieldset class="field"><legend>Application</legend><p class="hint">Sur iPhone : touche ${ic('export')} Partager, puis « Sur l’écran d’accueil ».</p></fieldset>`;
    return '';
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
      list.forEach((s) => {
        const ns = makeSubject(s.title || 'Sujet importé', { color: s.color, icon: s.icon, emoji: s.emoji, root: normalize(s.root) });
        if (s.program) ns.program = s.program;
        if (s.examDate) ns.examDate = s.examDate;
        state.subjects.push(ns);
      });
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
    const llmOk = !!(state.settings.localAI && window.LocalAI && LocalAI.supported());
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
          <label class="mode"><input type="radio" name="mode" value="local" ${hasKey || llmOk ? "" : "checked"} />
            <span class="mode-ic" aria-hidden="true">${ic('lightning', true)}</span>
            <span><b>Analyse rapide</b><small>Instantanée : titres, définitions, exercices. Le fichier reste sur ton appareil.</small></span></label>
          <label class="mode ${llmOk ? '' : 'locked'}"><input type="radio" name="mode" value="llm" ${llmOk ? (hasKey ? '' : 'checked') : 'disabled'} />
            <span class="mode-ic" aria-hidden="true">${ic('cpu', true)}</span>
            <span><b>IA locale</b><small>${llmOk ? 'Gratuite et privée : ajoute des points clés et des questions à chaque partie. Prend quelques minutes.' : window.LocalAI && LocalAI.supported() ? 'Active-la dans les réglages (gratuit).' : 'Navigateur non compatible (WebGPU).'}</small></span></label>
          <label class="mode ${hasKey ? '' : 'locked'}"><input type="radio" name="mode" value="ai" ${hasKey ? 'checked' : 'disabled'} />
            <span class="mode-ic" aria-hidden="true">${ic('sparkle', true)}</span>
            <span><b>Analyse par Claude</b><small>${hasKey ? 'Résumés et points clés rédigés, découpage plus fin.' : 'Ajoute ta clé API dans les réglages pour l’activer.'}</small></span></label>
        </div>
      </fieldset>
      <label class="check"><input type="checkbox" id="asProgram" /> C’est un programme ou une liste de sujets : en faire un parcours de modules</label>
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
        runPdf(pdfFile, $('#asProgram', el).checked ? 'program' : mode, into);
      };
    });
  }

  /* IA locale sur un PDF : le texte du cours reste celui du document ;
     le modèle ajoute des points clés reformulés et des questions à chaque partie qui a du contenu. */
  async function enrichTree(tree, setMsg, setPct) {
    const parts = [];
    (function w(n) { if ((n.notes || '').length >= 250) parts.push(n); (n.children || []).forEach(w); })(tree);
    const todo = parts.slice(0, 14);
    for (let i = 0; i < todo.length; i++) {
      const n = todo[i];
      setMsg(`IA locale : « ${n.title} » (${i + 1}/${todo.length})`);
      try {
        const r = await LocalAI.enrich(n.title, n.notes, {
          id: state.settings.localModel,
          onProgress: (p, t) => { setMsg(`${t} (${Math.round(p * 100)} %)`); setPct(0.1 + p * 0.3); },
        });
        const have = new Set((n.keyPoints || []).map((k) => k.toLowerCase()));
        n.keyPoints = [...(n.keyPoints || []), ...r.keyPoints.filter((k) => !have.has(k.toLowerCase()))].slice(0, 6);
        n.exercises = [...(n.exercises || []), ...r.exercises.map((e) => ({ q: String(e.q), a: String(e.a) }))];
      } catch (err) {
        if (i === 0) throw err; // le modèle ne se charge pas : on prévient
        console.warn(err);
      }
      setPct(0.4 + ((i + 1) / todo.length) * 0.6);
    }
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
    Mascot.react('reading');
    try {
      let tree;
      if (mode === 'program') {
        const res = await PdfImport.analyze(file, (p) => { setPct(p); setMsg(`Lecture des pages… ${Math.round(p * 100)} %`); });
        Mascot.react('imported');
        programModal(res.topics, res.title);
        return;
      }
      if (mode === 'ai') {
        let fake = 0.05;
        const t = setInterval(() => { fake = Math.min(0.92, fake + (0.95 - fake) * 0.04); setPct(fake); }, 400);
        try { tree = await AI.structure(file, state.settings.apiKey, state.settings.model, setMsg); }
        finally { clearInterval(t); }
      } else {
        const res = await PdfImport.analyze(file, (p) => { setPct(p * 0.9); setMsg(`Lecture des pages… ${Math.round(p * 100)} %`); });
        setMsg('Classement des informations…');
        tree = res.tree;
        if ((res.isProgramme || res.hasPlan) && !into) { Mascot.react('stop-reading'); return programChoice(res); }
        if (mode === 'llm') await enrichTree(tree, setMsg, setPct);
      }
      setPct(1);
      Mascot.react('imported');
      previewImport(normalize(tree), into);
    } catch (err) {
      console.error(err);
      Mascot.react('stop-reading');
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

  // Le PDF ressemble à une liste de sujets : on propose le parcours
  function programChoice(res) {
    const mods = res.topics.filter((t) => !t.depth);
    const notions = (i) => { const out = []; for (let k = res.topics.indexOf(mods[i]) + 1; k < res.topics.length && res.topics[k].depth; k++) out.push(res.topics[k]); return out; };
    $('#modalBody').innerHTML = `
      <h2 id="modalTitle">${res.hasPlan ? `Ce document contient un parcours en ${mods.length} étapes` : 'Ce PDF ressemble à un programme'}</h2>
      <p class="modal-lede">${res.hasPlan
        ? 'Tu peux en faire un parcours : chaque étape devient un module, ses points deviennent ses notions, répartis jusqu’à ta date d’objectif. Ou importer tout le document comme un cours.'
        : `Arbor y voit ${plural(mods.length, 'sujet', 'sujets')}, mais peu de contenu rédigé. Tu peux en faire un parcours : un module par sujet, avec une méthode en 5 étapes et des recherches toutes prêtes.`}</p>
      <ol class="topic-preview">${mods.slice(0, 8).map((t, i) => { const n = notions(i); return `<li>${esc(t.title)}${n.length ? ` <span class="muted">· ${plural(n.length, 'notion', 'notions')}</span>` : ''}</li>`; }).join('')}${mods.length > 8 ? `<li class="more">et ${mods.length - 8} de plus</li>` : ''}</ol>
      <div class="row-btns end">
        <button class="btn ghost" id="asCourse">${res.hasPlan ? 'Importer tout le document' : 'L’importer comme un cours'}</button>
        <button class="btn" id="asProg">${ic('path')}Créer un parcours de modules</button>
      </div>`;
    $('#asProg').onclick = () => programModal(res.topics, res.title);
    $('#asCourse').onclick = () => previewImport(normalize(res.tree), false);
  }

  function previewImport(root, into) {
    let count = 0, kps = 0, exs = 0;
    walk(root, (n) => { count++; kps += n.keyPoints.length; exs += (n.exercises || []).length; });
    const sel = { color: PALETTE[state.subjects.length % PALETTE.length], icon: 'book-open' };
    const outline = (n) => `<li><span>${esc(n.title)}</span>${n.keyPoints.length ? ` <em class="num">${ic('star', true)}${n.keyPoints.length}</em>` : ''}
      ${n.children.length ? `<ul>${n.children.map(outline).join('')}</ul>` : ''}</li>`;
    $('#modalBody').innerHTML = `
      <h2 id="modalTitle">Cours structuré</h2>
      <p class="modal-lede">${plural(count - 1, 'partie', 'parties')} et ${plural(kps, 'point clé extrait', 'points clés extraits')}${exs ? `, ${plural(exs, 'exercice', 'exercices')}` : ''}. Tu pourras tout modifier ensuite.</p>
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
        // On bascule les classes au lieu de tout redessiner : l'ouverture et la fermeture restent animées
        const li = t.closest('li'); const kids = li && li.querySelector(':scope > .kids');
        if (kids && !treeFilter.trim()) {
          const open = !f.node.collapsed;
          kids.classList.toggle('closed', !open);
          if (open) kids.removeAttribute('inert'); else kids.setAttribute('inert', '');
          t.classList.toggle('open', open);
          t.setAttribute('aria-label', open ? 'Replier' : 'Déplier');
          li.setAttribute('aria-expanded', open);
        } else { const sc = $('#tree').scrollTop; renderTree(); $('#tree').scrollTop = sc; }
        break;
      }
      case 'add-child': e.stopPropagation(); addChild(t.dataset.id); break;
      case 'bulk-add': bulkAddModal(t.dataset.id); break;
      case 'add-kp': {
        const n = currentNode().node;
        n.keyPoints.push('');
        save(); renderFiche();
        const items = $$('.kp-text'); items[items.length - 1].closest('li').classList.add('new'); items[items.length - 1].focus();
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
      case 'study-start': startStudy(t.dataset.cram === '1'); break;
      case 'quick-start': buildSession({ type: 'all' }); study.queue = study.queue.slice(0, 5); study.quick = true; preparePrompt(); go('#/reviser'); break;
      case 'plan-edit': planModal(); break;
      case 'reveal': reveal(); break;
      case 'mod-pretest-done': { const n = currentNode().node; const v = ($('#modulePretest') || {}).value || ''; if (v.trim().length < 10) { FX.toast('Écris au moins une phrase, même approximative.', 'error'); break; } n.module.pretest = v; gainXP(3); touch(); renderFiche(); break; }
      case 'mod-skip-pretest': { const n = currentNode().node; n.module.skipPretest = true; touch(); renderFiche(); break; }
      case 'mod-learned': { const n = currentNode().node; n.module.learned = true; gainXP(3); touch(); renderFiche(); break; }
      case 'mod-research': { const c = currentNode(); researchModule(subjectById(view.id), c.node); break; }
      case 'write-course': { const c = currentNode(); const sj = subjectById(view.id); writeCourses(sj, [c.node]).then(() => render(view)); break; }
      case 'write-all': { const sj = subjectById(view.id); writeCourses(sj, sj.root.children.filter((c) => c.module && !c.module.generated && !c.children.some((x) => x.notes.trim()))).then(() => render(view)); break; }
      case 'course-reveal': { pretestSeen.add(t.dataset.id + ':course'); renderFiche(); const el = $('#course'); el && el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' }); break; }
      case 'goto-course': { e.preventDefault(); pretestSeen.add(currentNode().node.id + ':course'); renderFiche(); const el = $('#course'); el && el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' }); break; }
      case 'reschedule': { const sj = subjectById(view.id); scheduleModules(sj); touch(); renderFiche(); FX.toast('Dates recalculées jusqu’à ton examen.', 'success'); break; }
      case 'anchor': {
        const a = ANCHORS.find((x) => x[0] === t.dataset.k); const ta = $('#explainInput');
        if (a && ta) { ta.value = (ta.value.trim() ? ta.value.trimEnd() + '\n' : '') + a[2]; ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); currentNode().node.explain = ta.value; autoGrow(ta); save(); }
        break;
      }
      case 'add-ex': { const n = currentNode().node; n.exercises = n.exercises || []; n.exercises.push({ id: Store.uid(), q: '', a: '' }); save(); renderFiche(); const qs = $$('.ex-q'); qs[qs.length - 1].focus(); break; }
      case 'del-ex': { const n = currentNode().node; const id = t.closest('[data-ex]').dataset.ex; n.exercises = n.exercises.filter((e) => e.id !== id); save(); renderFiche(); break; }
      case 'hint': { const t2 = $('#typed'); if (t2) study.typed = t2.value; study.hints = Math.min(2, study.hints + 1); renderStudy(); break; }
      case 'conf': study.conf = study.conf === t.dataset.c ? null : t.dataset.c; $$('[data-act="conf"]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.c === study.conf)); break;
      case 'grade': grade(+t.dataset.g, t); break;
      case 'focus-open': focusModal(); break;
      case 'focus-explain': { const ex = $('#explainInput'); if (ex) { ex.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' }); ex.focus({ preventScroll: true }); } break; }
      case 'pretest-reveal': pretestSeen.add(t.dataset.id); $('#kps') && $('#kps').classList.remove('pretest'); t.closest('.pretest-cover').remove(); break;
      case 'focus-toggle': if (focus.running) focusPause(); else focusStart(); break;
      case 'focus-reset': focusReset(); break;
    }
  });

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
    if (t.id === 'typed' && study) { study.typed = t.value; return; }
    if (t.id === 'anchorNow' && study) { study.anchor = t.value; return; }
    if (t.id === 'modulePretest') { const c = currentNode(); if (c && c.node.module) { c.node.module.pretest = t.value; save(); } return; }
    if (t.dataset && t.dataset.check !== undefined && study) { study.checks[+t.dataset.check] = t.checked; refreshSuggestion(); return; }
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
    } else if (t.dataset && t.dataset.exf) {
      const ex = (cur.node.exercises || []).find((e) => e.id === t.closest('[data-ex]').dataset.ex);
      if (ex) { ex[t.dataset.exf] = t.value; autoGrow(t); touch(); }
    } else if (t.id === 'explainInput') {
      autoGrow(t);
      cur.node.explain = t.value;
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
    // Révision : Entrée pour voir la réponse (Maj+Entrée = retour à la ligne), 1 à 4 pour évaluer
    if (study && $('#studyCard') && $('#modal').hidden) {
      if (study.phase === 'ask' && e.key === 'Enter' && !e.shiftKey && !e.target.closest('a, [contenteditable], input:not(#typed), textarea:not(#typed), select, [data-act="reveal"], .modal')) { e.preventDefault(); reveal(); }
      else if (study.phase === 'ask' && e.key === ' ' && !e.target.closest('input, textarea, [contenteditable], button, a')) { e.preventDefault(); reveal(); }
      else if (study.phase === 'show' && /^[1-4]$/.test(e.key) && !e.target.closest('input, textarea, [contenteditable]')) { e.preventDefault(); grade(+e.key, $(`.grade[data-g="${e.key}"]`)); }
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

  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    app.addEventListener('pointermove', (e) => {
      const card = e.target.closest && e.target.closest('.featured, .subject-card');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });
  }

  /* Fond : léger effet de profondeur qui suit la souris, uniquement pendant le mouvement */
  (function parallax() {
    const layer = $('.bg-par');
    if (!layer || !matchMedia('(pointer: fine)').matches) return;
    let tx = 0, ty = 0, x = 0, y = 0, running = false;
    const tick = () => {
      x += (tx - x) * 0.06; y += (ty - y) * 0.06;
      layer.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      if (Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1) requestAnimationFrame(tick); else running = false;
    };
    window.addEventListener('pointermove', (e) => {
      if (reducedMotion()) return;
      tx = (e.clientX / innerWidth - 0.5) * -36; ty = (e.clientY / innerHeight - 0.5) * -28;
      if (!running) { running = true; requestAnimationFrame(tick); }
    }, { passive: true });
  })();
  document.addEventListener('visibilitychange', () => document.documentElement.classList.toggle('tab-hidden', document.hidden));

  Mascot.init({
    enabled: state.settings.mascot !== false,
    level: Math.floor(state.xp / 100) + 1,
    onHide: () => {
      state.settings.mascot = false; save(); Mascot.setEnabled(false);
      FX.toast('Pousse est partie se reposer. Tu peux la faire revenir dans les réglages.');
    },
  });

  $('#focusPill').onclick = focusModal;
  window.addEventListener('hashchange', route);
  applyTheme();
  applyCalm();
  renderXP();
  route();
  renderFocusUI();
  if (focus.running && focus.mode === 'work') Mascot.setFocus(true);
  // À minuit (ou au retour sur l'onglet), les cartes dues changent
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateBadges(); });
})();
