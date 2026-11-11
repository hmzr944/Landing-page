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
  // Lien externe autorisé seulement en http(s) : un fichier importé ne doit pas pouvoir glisser du « javascript: »
  const safeUrl = (u) => { try { return ['https:', 'http:'].includes(new URL(String(u)).protocol); } catch (e) { return false; } };
  const app = $('#app');
  let view = { name: 'home' };
  let treeFilter = '';
  let notesMode = 'preview';
  const pretestSeen = new Set(); // parties dont on a déjà révélé les points clés pendant cette visite

  let trophyTimer = null;
  const save = () => { Store.save(state); clearTimeout(trophyTimer); trophyTimer = setTimeout(checkTrophies, 700); };
  const count = (k, n = 1) => { state.stats.counters = state.stats.counters || {}; state.stats.counters[k] = (state.stats.counters[k] || 0) + n; };
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let popId = null; // partie qui vient d'être maîtrisée : sa pastille fait un petit « pop »
  const subjectById = (id) => state.subjects.find((s) => s.id === id);
  const STATUS = {
    todo: { label: 'À apprendre' },
    doing: { label: 'En cours' },
    done: { label: 'Maîtrisé' },
  };
  const COLOR_NAMES = ['Jade', 'Bois de rose', 'Cuivre', 'Sarcelle', 'Ardoise', 'Prune', 'Forêt', 'Olive'];
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
  }
  prefersDark.addEventListener('change', applyTheme);
  function applyCalm() {
    document.documentElement.classList.toggle('calm', !!state.settings.calm);
    window.Mascot && Mascot.setCalm && Mascot.setCalm(!!state.settings.calm);
  }

  let shownXP = state.xp;
  function renderXP(bump) {
    const L = Trophies.levelOf(state.xp);
    const lvl = L.lvl;
    const rank = Trophies.RANKS[Trophies.rankOf(lvl)];
    $('#xpLevel').textContent = `Niv. ${lvl}`;
    // le niveau est représenté par la médaille de son rang : bronze (rangs 1-2), argent, or, platine
    const ri = Trophies.rankOf(lvl);
    $('#xpMedal').innerHTML = Trophies.medal(rank.icon, Math.min(3, Math.floor(ri / 2)), 26);
    $('#xp').title = `${rank.name} · ${L.into}/${L.need} XP avant le niveau ${lvl + 1}`;
    $('#xp').style.setProperty('--rank', rank.c);
    $('#xpFill').style.transform = `scaleX(${L.into / L.need})`;
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
    if (window.Mascot) { Mascot.setLevel(lvl); Mascot.setVigor && Mascot.setVigor(SRS.streak(state.stats)); }
  }
  const derivedStatus = (n) => (!n.srs ? 'todo' : n.srs.s >= 21 ? 'done' : 'doing');
  function setStatus(node, status, origin) {
    const prev = node.status;
    node.status = status;
    if (status === 'done' && prev !== 'done') {
      popId = node.id;
      const lvlBefore = Trophies.levelOf(state.xp).lvl;
      const r = origin && origin.getBoundingClientRect ? origin.getBoundingClientRect() : null;
      FX.confetti(r ? r.left + r.width / 2 : undefined, r ? r.top : undefined, 40);
      gainXP(10);
      if (Trophies.levelOf(state.xp).lvl === lvlBefore) Mascot.react('done');
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
      if (nodeId !== s.root.id) state.lastVisit = { sid: s.id, nid: nodeId, at: Date.now(), kind: 'fiche' };
    } else if (parts[0] === 'reviser') {
      view = { name: 'study' };
    } else if (parts[0] === 'methode') {
      view = { name: 'method' };
    } else if (parts[0] === 'trophees') {
      view = { name: 'trophies' };
    } else if (parts[0] === 'cours') {
      view = { name: 'courses' };
    } else if (parts[0] === 'progression') {
      view = { name: 'progress' };
    } else if (parts[0] === 'org' && parts[1]) {
      view = { name: 'org', id: parts[1], tab: parts[2] || 'accueil', sub: parts[3] || '' };
    } else if (parts[0] === 'rejoindre') {
      view = { name: 'join', token: parts[1] || '' };
    } else {
      view = { name: 'home' };
    }
    const navOf = { home: 'home', study: 'home', courses: 'courses', subject: 'courses', progress: 'progress', trophies: 'progress' }[view.name];
    // Espace professionnel : les menus de l'espace personnel (cours, niveau, import) disparaissent, rien ne s'y mélange
    const inOrg = view.name === 'org' || view.name === 'join';
    document.documentElement.classList.toggle('in-org', inOrg);
    if (!inOrg && window.Org && Org.space() !== 'personal') Org.setSpace('personal');
    paintSpace();
    $$('[data-nav]').forEach((a) => { if (a.dataset.nav === navOf) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    // la pastille de l'onglet actif glisse vers sa nouvelle place
    $$('.topnav, .bottom-nav').forEach((n) => n.style.setProperty('--ni', ['home', 'courses', 'progress'].indexOf(navOf)));
    render(prev);
  }
  const link = (sid, nid, mode = 'fiche') => `#/s/${sid}/${nid}/${mode}`;

  /* Espaces : personnel (sur l'appareil) et professionnels (dans la base). Le module Org ne reçoit que des outils
     d'affichage, jamais l'état personnel : il ne peut pas envoyer de cours ou de révisions au serveur. */
  const orgDeps = () => ({ esc, ic, openModal, closeModal, toast: (m, k) => FX.toast(m, k), go });
  function paintSpace() {
    const b = $('#spaceBtn'); if (!b || !window.Org) return;
    const orgs = Org.list();
    const cur = view && (view.name === 'org') ? orgs.find((o) => o.id === view.id) : null;
    b.hidden = !orgs.length && !cur;
    $('#spaceName').textContent = cur ? cur.name : 'Perso';
    b.querySelector('i').className = `ph-fill ph-${cur ? 'buildings' : 'user-circle'}`;
  }

  /* ---------- Rendu ---------- */
  function render(prev = {}) {
    document.documentElement.classList.remove('xp-open');
    // Transition seulement quand on change d'écran ou d'onglet (pas à chaque clic dans l'arbre)
    const bigChange = prev.name !== view.name || prev.id !== view.id;
    const modeChange = !bigChange && prev.mode !== view.mode;
    // sens du glissement : ordre des onglets, puis profondeur (liste → détail)
    const TAB = { home: 0, study: 0, method: 0, courses: 1, subject: 1, progress: 2, trophies: 2 };
    const DEPTH = { home: 0, courses: 0, progress: 0, study: 1, method: 1, subject: 1, trophies: 1 };
    const slide = !prev.name ? 'page'
      : TAB[view.name] !== TAB[prev.name] ? (TAB[view.name] > TAB[prev.name] ? 'slide-next' : 'slide-prev')
      : DEPTH[view.name] !== DEPTH[prev.name] ? (DEPTH[view.name] > DEPTH[prev.name] ? 'slide-next' : 'slide-prev') : 'page';
    const paint = () => { try { paintNow(); } catch (err) { console.error(err); throw err; } };
    const paintNow = () => {
      if (view.name === 'org' || view.name === 'join') { Org.render(app, view, orgDeps()); updateBadges(); return; }
      if (view.name === 'home') renderHome();
      else if (view.name === 'study') renderGlobalStudy();
      else if (view.name === 'method') renderMethod();
      else if (view.name === 'trophies') renderTrophies();
      else if (view.name === 'courses') renderCourses();
      else if (view.name === 'progress') renderProgress();
      else renderSubject(bigChange);
      updateBadges();
      if (bigChange) {
        app.classList.remove('enter', 'from-next', 'from-prev'); void app.offsetWidth;
        app.classList.add('enter'); if (slide !== 'page') app.classList.add(slide === 'slide-next' ? 'from-next' : 'from-prev');
        window.scrollTo({ top: 0 });
      }
      afterPaint();
    };
    if ((bigChange || modeChange) && document.startViewTransition && !reducedMotion() && prev.name) {
      document.documentElement.dataset.vt = bigChange ? slide : (['fiche', 'carte', 'revision'].indexOf(view.mode) > ['fiche', 'carte', 'revision'].indexOf(prev.mode) ? 'forward' : 'back');
      const vt = document.startViewTransition(paint);
      // Une transition interrompue par une autre navigation est normale : on ignore son rejet
      vt.ready.catch(() => {});
      vt.updateCallbackDone.catch(() => {});
      // la transition a déjà animé l'entrée : on retire « enter » avant, sinon le fondu CSS repartirait de zéro
      vt.finished.catch(() => {}).then(() => { app.classList.remove('enter', 'from-next', 'from-prev'); delete document.documentElement.dataset.vt; });
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
    countUp();
  }

  /* Chiffres qui défilent jusqu'à leur valeur (amorti), comme une petite animation Lottie */
  function countUp() {
    if (reducedMotion() || state.settings.calm) return;
    $$('[data-count]').forEach((el) => {
      const to = +el.dataset.count; if (!to) return;
      const t0 = performance.now(), dur = 900;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
        el.textContent = fmt.format(Math.round(to * e));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* Verre : le reflet suit le pointeur, et les tuiles de sujet s'inclinent un peu (ressort au retour) */
  (function glassPointer() {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let raf = 0, last = null;
    document.addEventListener('pointermove', (e) => {
      last = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = last.target.closest && last.target.closest('.btn, .icon-btn, .chip-btn, .glass');
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = (last.clientX - r.left) / r.width, y = (last.clientY - r.top) / r.height;
        el.style.setProperty('--mx', `${Math.round(x * 100)}%`);
        el.style.setProperty('--my', `${Math.round(y * 100)}%`);
        if (el.classList.contains('tilt') && !reducedMotion() && !state.settings.calm) {
          el.style.setProperty('--rx', `${((x - 0.5) * 6).toFixed(2)}deg`);
          el.style.setProperty('--ry', `${((0.5 - y) * 6).toFixed(2)}deg`);
        }
      });
    }, { passive: true });
    document.addEventListener('pointerout', (e) => {
      const el = e.target.closest && e.target.closest('.tilt');
      if (el && !el.contains(e.relatedTarget)) { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); }
    });
  })();

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

  function emptyHome() {
    return `
        <section class="home">
          <div class="empty-state">
            <span class="tile big">${ic('tree', true)}</span>
            <h1>Fais pousser ton premier arbre</h1>
            <p>Importe un PDF de cours : Arbor le découpe en leçons courtes, puis te fait réviser au bon moment.</p>
            <div class="row-btns center">
              <button class="btn" data-act="import-pdf">${ic('file-arrow-up')}Importer un PDF</button>
              <button class="btn ghost" data-act="new-subject">${ic('plus')}Nouveau sujet</button>
            </div>
          </div>
        </section>`;
  }

  /* AUJOURD'HUI : ce qu'il faut faire maintenant, en un bouton */
  function renderHome() {
    document.documentElement.style.removeProperty('--accent');
    if (!state.subjects.length) { app.innerHTML = emptyHome(); return; }
    app.innerHTML = `<section class="home">${todayPanel()}${missionsPanel()}</section>`;
  }

  // Missions : jamais plus de trois, chacune liée à un objectif précis
  function missionsPanel() {
    const ov = overview({ type: 'all' });
    const p = Mastery.plan(state, ov, canLesson);
    const items = [];
    const lv = state.lastVisit && subjectById(state.lastVisit.sid);
    const lvn = lv && find(lv.root, state.lastVisit.nid);
    if (lvn && Date.now() - state.lastVisit.at < 14 * SRS.DAY) items.push(`<a class="mission glass" href="${link(lv.id, lvn.node.id)}" style="--c:${lv.color}">${ic('arrow-u-up-left', true)}<span><small>Reprendre</small><b>${esc(lvn.node.title)}</b></span></a>`);
    if (p.lesson) items.push(`<button class="mission glass" data-act="lesson-next" style="--c:${p.lesson.s.color}">${ic('play-circle', true)}<span><small>${p.lesson.late ? 'Leçon en retard' : 'Prochaine leçon'}</small><b>${esc(p.lesson.n.title)}</b></span></button>`);
    if (p.fragile[0]) { const f = p.fragile[0]; items.push(`<a class="mission glass" href="${link(f.s.id, f.n.id)}" style="--c:var(--st-fragile)">${ic('warning-circle', true)}<span><small>À consolider</small><b>${esc(f.n.title)}</b></span></a>`); }
    const exam = state.subjects.filter((x) => x.examDate && x.examDate >= SRS.dayKey()).sort((a, b) => a.examDate.localeCompare(b.examDate))[0];
    if (exam && items.length < 3) {
      const d = Math.round((new Date(exam.examDate + 'T00:00') - new Date(SRS.dayKey() + 'T00:00')) / SRS.DAY);
      const c = Mastery.counts(Mastery.notions(exam));
      items.push(`<a class="mission glass" href="#/progression" style="--c:${exam.color}">${ic('flag-checkered', true)}<span><small>Examen dans ${plural(d, 'jour', 'jours')}</small><b>${esc(exam.title)} · ${c.pct} % maîtrisé</b></span></a>`);
    }
    if (!items.length) return '';
    return `<section class="missions" aria-label="Pour toi aujourd’hui">${items.slice(0, 3).join('')}</section>`;
  }

  // Une barre empilée : la part de chaque état
  function stateBar(c, big) {
    if (!c.total) return '';
    return `<div class="state-bar ${big ? 'big' : ''}" role="img" aria-label="${Mastery.ORDER.filter((k) => c[k]).map((k) => `${c[k]} ${Mastery.STATES[k].label.toLowerCase()}`).join(', ')}">
      ${Mastery.ORDER.filter((k) => c[k]).map((k) => `<span style="--w:${(c[k] / c.total) * 100}%;--sc:${Mastery.STATES[k].c}"></span>`).join('')}</div>`;
  }

  /* MES COURS : les sujets, l'import, puis chaque cours */
  function renderCourses() {
    document.documentElement.style.removeProperty('--accent');
    const subjects = state.subjects.slice().sort((a, b) => b.updatedAt - a.updatedAt);
    if (!subjects.length) { app.innerHTML = emptyHome(); return; }
    const [first, ...rest] = subjects;
    const fs = stats(first.root);
    const next = nextStep(first.root);
    const branches = first.root.children.slice(0, 5);
    const mc = (x) => Mastery.counts(Mastery.notions(x));
    app.innerHTML = `
      <section class="home courses-page">
        <header class="page-head">
          <h1>Mes cours <span class="muted num">${subjects.length}</span></h1>
          <div class="row-btns">
            <button class="btn ghost" data-act="import-pdf">${ic('file-arrow-up')}<span>Importer un PDF</span></button>
            <button class="btn" data-act="new-subject">${ic('plus')}<span class="hide-sm">Sujet</span></button>
          </div>
        </header>
        <div class="subject-grid bento">
          <article class="featured glass tilt" style="--c:${first.color};--i:4" data-open="${first.id}">
            <span class="t-blob" aria-hidden="true"></span>
            <div class="featured-top">
              <span class="tile" style="--c:${first.color}">${ic(first.icon, true)}</span>
              <button class="icon-btn sm" data-act="edit-subject" data-id="${first.id}" aria-label="Modifier « ${esc(first.title)} »">${ic('pencil-simple')}</button>
            </div>
            <div class="featured-body">
              ${ring(fs.pct, 120)}
              <div>
                <h2><a href="${link(first.id, first.root.id)}" class="stretched">${esc(first.title)}</a></h2>
                <p class="tile-cap num">${mc(first).mastered}/${mc(first).total} maîtrisées</p>
                ${stateBar(mc(first))}
              </div>
            </div>
            ${branches.length ? `<ul class="branches" aria-label="Grandes parties">
              ${branches.map((b) => {
                const bs = stats(b);
                const pc = b.children.length ? bs.pct : b.status === 'done' ? 100 : b.status === 'doing' ? 50 : 0;
                return `<li title="${esc(b.title)}"><span class="mini-ring" style="--p:${pc}" aria-hidden="true"></span><span class="b-title">${esc(b.title)}</span></li>`;
              }).join('')}
            </ul>` : ''}
            ${first.root.children.filter((c) => c.children.length).length >= 2 ? `<a class="btn ghost sm map-btn" href="${link(first.id, first.root.id, 'carte')}">${ic('map-trifold')}Explorer la carte</a>` : ''}
            ${next ? `<a class="btn next-btn" href="${link(first.id, next.id)}">${ic('arrow-right')}<span>${esc(next.title)}</span></a>`
              : fs.total ? `<p class="all-done">${ic('trophy', true)}Tout est maîtrisé</p>` : ''}
          </article>

          ${rest.map((s, i) => {
            const st = stats(s.root);
            return `
            <article class="subject-card glass tilt" style="--c:${s.color};--i:${i + 5}" data-fill="${rest.length === 1 ? '2x1' : ''}" data-open="${s.id}">
              <span class="t-blob" aria-hidden="true"></span>
              <div class="featured-top">
                <span class="tile" style="--c:${s.color}">${ic(s.icon, true)}</span>
                <button class="icon-btn sm" data-act="edit-subject" data-id="${s.id}" aria-label="Modifier « ${esc(s.title)} »">${ic('pencil-simple')}</button>
              </div>
              <h3><a href="${link(s.id, s.root.id)}" class="stretched">${esc(s.title)}</a></h3>
              ${stateBar(mc(s))}
              <div class="card-foot">
                ${ring(st.pct, 52)}
                <span class="tile-cap num">${st.total} parties${memAvg(s) !== null ? ` · ${memAvg(s)} % mémoire` : ''}</span>
                ${s.examDate ? `<span class="pill">${ic('flag-checkered', true)}${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(s.examDate + 'T00:00'))}</span>` : ''}
              </div>
            </article>`;
          }).join('')}
          <button class="subject-card add-tile glass" data-act="new-subject" style="--i:${rest.length + 5}" data-fill="${rest.length === 0 ? '2x2' : rest.length < 3 ? '2x1' : ''}">
            <span class="plus-orb" aria-hidden="true">${ic('plus', true)}</span><span>Nouveau sujet</span>
          </button>
        </div>
      </section>`;
  }

  /* MA PROGRESSION : ce que tu sais vraiment, et ce qui reste à travailler */
  function renderProgress() {
    document.documentElement.style.removeProperty('--accent');
    if (!state.subjects.length) { app.innerHTML = emptyHome(); return; }
    const sum = Mastery.summary(state);
    const c = sum.c;
    const lvl = Trophies.levelOf(state.xp), rank = Trophies.RANKS[Trophies.rankOf(lvl.lvl)];
    const work = sum.all.filter((x) => x.state === 'fragile' || x.state === 'due')
      .sort((a, b) => (a.state === 'fragile' ? 0 : 1) - (b.state === 'fragile' ? 0 : 1) || SRS.retrievability(a.n.srs) - SRS.retrievability(b.n.srs)).slice(0, 8);
    const mastered = sum.all.filter((x) => x.state === 'mastered').sort((a, b) => b.n.srs.s - a.n.srs.s).slice(0, 6);
    const rs = sum.all.filter((x) => x.n.srs).map((x) => SRS.retrievability(x.n.srs));
    const avgR = rs.length ? Math.round((rs.reduce((a, b) => a + b, 0) / rs.length) * 100) : null;
    const cal = (state.stats.calib && state.stats.calib.sure) || [0, 0];
    const calPct = cal[1] >= 5 ? Math.round((cal[0] / cal[1]) * 100) : null;
    const fc = Mastery.forecast(state, 7);
    const fmax = Math.max(1, ...fc.map((d) => d.n));
    const wd = new Intl.DateTimeFormat('fr-FR', { weekday: 'narrow' });
    const sessions = (state.stats.sessions || []).slice(0, 6);
    const exams = state.subjects.filter((x) => x.examDate && x.examDate >= SRS.dayKey()).sort((a, b) => a.examDate.localeCompare(b.examDate));
    const rel = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });
    const ago = (t) => { const d = Math.round((Date.now() - t) / SRS.DAY); return d < 1 ? 'aujourd’hui' : rel.format(-d, 'day'); };
    const row = (x) => `<li><a href="${link(x.s.id, x.n.id)}"><span class="st-dot" style="--sc:${Mastery.STATES[x.state].c}" aria-hidden="true"></span><span class="pg-t">${esc(x.n.title)}</span><small>${esc(x.s.title)} · ${Mastery.STATES[x.state].short}</small></a></li>`;
    app.innerHTML = `
      <section class="home progress-page">
        <header class="page-head"><h1>Ma progression</h1></header>
        <div class="pg-hero glass">
          <div class="pg-big"><b class="num">${c.mastered}</b><span>notion${c.mastered > 1 ? 's' : ''} maîtrisée${c.mastered > 1 ? 's' : ''}<br><small class="muted">sur ${c.total}</small></span></div>
          ${stateBar(c, true)}
          <ul class="st-legend">${Mastery.ORDER.map((k) => `<li><span class="st-dot" style="--sc:${Mastery.STATES[k].c}" aria-hidden="true"></span>${Mastery.STATES[k].label}<b class="num">${c[k]}</b></li>`).join('')}</ul>
          <p class="hint">« Maîtrisée » veut dire retrouvée en révision pendant au moins 3 semaines, et juste la dernière fois. Finir une leçon ne suffit pas.</p>
        </div>

        <div class="pg-grid">
          <section class="pg-card glass">
            <h2>${ic('warning-circle', true)}À retravailler</h2>
            ${work.length ? `<ul class="pg-list">${work.map(row).join('')}</ul><button class="btn sm" data-act="session-start">${ic('play', true)}Travailler maintenant</button>` : '<p class="muted">Rien de fragile pour l’instant.</p>'}
          </section>
          <section class="pg-card glass">
            <h2>${ic('seal-check', true)}Les plus solides</h2>
            ${mastered.length ? `<ul class="pg-list">${mastered.map(row).join('')}</ul>` : '<p class="muted">Tes premières notions maîtrisées apparaîtront ici, après quelques semaines de révisions réussies.</p>'}
          </section>
        </div>

        <section class="pg-card glass">
          <h2>${ic('books', true)}Par matière</h2>
          <ul class="pg-subjects">${sum.per.map(({ s: sj, c: sc }) => `<li><a href="${link(sj.id, sj.root.id)}"><span class="tile sm" style="--c:${sj.color}">${ic(sj.icon, true)}</span><span class="pg-t">${esc(sj.title)}</span><span class="num muted">${sc.pct} %</span></a>${stateBar(sc)}</li>`).join('')}</ul>
        </section>

        <div class="pg-grid">
          <section class="pg-card glass">
            <h2>${ic('brain', true)}Mémoire</h2>
            <div class="pg-stats">
              <div><b class="num">${avgR === null ? '–' : avgR + ' %'}</b><small>chance de t’en souvenir maintenant (moyenne)</small></div>
              <div><b class="num">${calPct === null ? '–' : calPct + ' %'}</b><small>de bonnes réponses quand tu te dis « certain »</small></div>
            </div>
            <div class="forecast" aria-label="Révisions prévues ces 7 prochains jours">
              ${fc.map((d, i) => `<div title="${d.n} cartes"><span style="--h:${d.n ? Math.max(8, (d.n / fmax) * 100) : 4}%"></span><small>${i ? wd.format(new Date(d.k + 'T12:00')) : 'auj.'}</small><b class="num">${d.n || ''}</b></div>`).join('')}
            </div>
            <p class="tile-cap">Révisions prévues cette semaine</p>
          </section>
          <section class="pg-card glass">
            <h2>${ic('calendar-dots', true)}Régularité</h2>
            ${heatmap()}
            <p class="tile-cap">16 dernières semaines · série record : <b class="num">${Math.max(SRS.streak(state.stats), state.stats.bestStreak || 0)}</b> jours</p>
          </section>
        </div>

        <div class="pg-grid">
          <section class="pg-card glass">
            <h2>${ic('clock-counter-clockwise', true)}Dernières sessions</h2>
            ${sessions.length ? `<ul class="pg-list">${sessions.map((x) => `<li><span class="pg-ses">${ic(x.kind === 'lesson' ? 'play-circle' : 'cards', true)}<span class="pg-t">${x.kind === 'lesson' ? `Leçon : ${esc(x.title || '')}` : `Révision · ${plural(x.n, 'carte', 'cartes')}`}</span><small>${x.n ? `${Math.round((x.ok / x.n) * 100)} % juste · ` : ''}${ago(x.at)}</small></span></li>`).join('')}</ul>` : '<p class="muted">Tes sessions apparaîtront ici.</p>'}
          </section>
          <section class="pg-card glass">
            <h2>${ic('flag-checkered', true)}Examens</h2>
            ${exams.length ? `<ul class="pg-list">${exams.map((x) => { const d = Math.round((new Date(x.examDate + 'T00:00') - new Date(SRS.dayKey() + 'T00:00')) / SRS.DAY); const xc = Mastery.counts(Mastery.notions(x)); return `<li><a href="${link(x.id, x.root.id)}"><span class="pg-t">${esc(x.title)}</span><small>dans ${plural(d, 'jour', 'jours')} · ${xc.pct} % maîtrisé · ${xc.new + xc.seen} à voir</small></a></li>`; }).join('')}</ul>` : '<p class="muted">Ajoute une date d’examen dans un sujet pour voir ici ce qu’il reste à préparer.</p>'}
          </section>
        </div>

        <a class="pg-card glass pg-pousse" href="#/trophees">
          <span class="tile" style="--c:${rank.c}">${ic(rank.icon, true)}</span>
          <span><small>Pousse · niveau ${lvl.lvl}</small><b>${rank.name}</b></span>
          <span class="muted num">${Trophies.owned(state)}/${Trophies.total()} trophées ${ic('caret-right')}</span>
        </a>
      </section>`;
  }

  // Calendrier d'activité façon « contributions » de GitHub : une case par jour, 16 semaines
  function heatmap() {
    const days = state.stats.days || {};
    const end = new Date(); end.setHours(12, 0, 0, 0);
    const start = new Date(end); start.setDate(start.getDate() - ((end.getDay() + 6) % 7) - 15 * 7); // lundi, 15 semaines avant celle-ci
    const cells = [];
    for (let t = new Date(start); t <= end; t.setDate(t.getDate() + 1)) {
      const k = SRS.dayKey(t.getTime()), d = days[k] || {};
      const v = (d.reviews || 0) + Math.round((d.focusMin || 0) / 5);
      const lv = !v ? 0 : v < 5 ? 1 : v < 15 ? 2 : v < 30 ? 3 : 4;
      cells.push(`<i class="l${lv}" title="${k} : ${d.reviews || 0} cartes"></i>`);
    }
    return `<div class="heatmap" role="img" aria-label="Activité des 16 dernières semaines">${cells.join('')}</div>`;
  }

  function renderSubject(bigChange) {
    const s = subjectById(view.id);
    const st = stats(s.root);
    // un seul accent (le jade) dans toute l'appli : la couleur du sujet ne marque que son icône
    document.documentElement.style.removeProperty('--accent');
    const scroll = bigChange ? 0 : ($('#tree') ? $('#tree').scrollTop : 0);
    const tab = (mode, icon, label) =>
      `<a class="tab" href="${link(s.id, view.nodeId, mode)}" ${view.mode === mode ? 'aria-current="page"' : ''}>${ic(icon)}<span>${label}</span></a>`;
    app.innerHTML = `
      <section class="subject">
        <aside class="tree-pane" id="treePane" aria-label="Arborescence du sujet">
          <div class="tp-head">
            <a class="back-link" href="#/cours">${ic('arrow-left')}Mes cours</a>
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

        ${isModule(s, node) ? modulePanel(s, node) : node.children.length >= 2 ? lessonCard(s, node, false) : ''}
        ${practiceCard(s, node)}
        ${memoryLine(s, node, isRoot)}
        ${isRoot && s.program ? programPanel(s) : ''}



        <section class="sec">
          <div class="sec-head"><h2>Points clés</h2><button class="btn ghost sm" data-act="add-kp">${ic('plus')}Ajouter</button></div>
          ${node.keyPoints.length && !node.srs && !pretestSeen.has(node.id) ? `<div class="pretest-cover">
              <p>${ic('lightbulb', true)}<span><b>Devine d’abord</b> ${plural(node.keyPoints.length, 'point clé', 'points clés')}</span></p>
              <button class="btn sm" data-act="pretest-reveal" data-id="${node.id}">${ic('eye')}Révéler</button>
            </div>` : ''}
          ${node.keyPoints.length ? `<ol class="kps ${!node.srs && !pretestSeen.has(node.id) ? 'pretest' : ''}" id="kps">
            ${node.keyPoints.map((k, i) => `
              <li><span class="kp-dot" aria-hidden="true"></span>
                <div class="kp-text" contenteditable="true" role="textbox" aria-label="Point clé ${i + 1}" data-kp="${i}">${esc(k)}</div>
                <button class="icon-btn sm" data-act="del-kp" data-i="${i}" aria-label="Supprimer le point clé ${i + 1}">${ic('x')}</button></li>`).join('')}
          </ol>` : `<p class="hint-empty">${ic('star')}Les idées à retenir</p>`}
        </section>

        <section class="sec">
          <div class="sec-head"><h2>Notes</h2>
            ${node.src && node.src.pages.length ? `<span class="src-tag" title="${esc(node.src.quote || '')}">${ic('file-text')}${esc(node.src.doc ? node.src.doc.replace(/\.pdf$/i, '') : 'Document')} · p. ${node.src.pages.length > 2 ? `${node.src.pages[0]}–${node.src.pages[node.src.pages.length - 1]}` : node.src.pages.join(', ')}</span>` : ''}
            <div class="mini-seg" role="group" aria-label="Mode des notes">
              <button data-act="notes-mode" data-m="preview" aria-pressed="${notesMode === 'preview'}">Aperçu</button>
              <button data-act="notes-mode" data-m="edit" aria-pressed="${notesMode === 'edit'}">Éditer</button>
            </div>
          </div>
          ${notesMode === 'edit'
            ? `<textarea class="notes-input" id="notesInput" aria-label="Notes" placeholder="Écris tes notes…">${esc(node.notes)}</textarea>
               <p class="hint">==surligné== devient une question · **gras** · - liste · # titre</p>`
            : node.notes.trim()
              ? `<div class="md notes-view ${node.notes.length > 700 ? 'clamp' : ''}">${MD.render(node.notes)}</div>${node.notes.length > 700 ? `<button class="btn ghost sm more-btn" data-act="unclamp">${ic('caret-down')}Lire la suite</button>` : ''}${highlights(node.notes).length ? `<p class="hint hl-hint">${ic('highlighter-circle')}${plural(highlights(node.notes).length, 'question', 'questions')} en révision</p>` : ''}`
              : `<button class="notes-empty" data-act="notes-mode" data-m="edit">${ic('pencil-simple')}Écrire des notes</button>`}
        </section>

        ${contextBox(node)}
        ${courseSection(s, node, isRoot)}

        <section class="sec">
          <div class="sec-head"><h2>Exercices <span class="muted num">${(node.exercises || []).length}</span></h2>
            <button class="btn ghost sm" data-act="add-ex">${ic('plus')}Exercice</button>
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
          </ol>` : `<p class="hint-empty">${ic('pencil-simple-line')}Énoncé + méthode, mélangés en révision</p>`}
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
          </div>` : `<p class="hint-empty">${ic('tree-structure')}Découpe en petits morceaux</p>`}
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
    ['lesson', 'Leçon'],
    ['review', 'Révision'],
  ];
  const isModule = (s, node) => !!(s && s.program && node.module);
  function moduleSteps(node) {
    const m = node.module || {};
    let tested = false;
    walk(node, (n) => { if (n.srs) tested = true; });
    return { lesson: !!m.lessonDone || !!m.learned, review: tested };
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
    const todo = mods.filter((m) => moduleProgress(m) < MOD_STEPS.length);
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
        <label class="check"><input type="checkbox" id="pgWrite" checked /> Rédiger le cours de chaque sujet (Arbor cherche des sources fiables pour chaque sujet)</label>
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
        count('program');
        state.subjects.push(s);
        save();
        const write = $('#pgWrite', el).checked;
        closeModal();
        Mascot.react('created');
        if (onbAfterCourse(s)) { if (write) setTimeout(async () => { await writeCourses(s, s.root.children.filter((c) => c.module)); }, 250); return; }
        mapMode = 'zones'; Explore.reset();
        go(link(s.id, s.root.id, s.root.children.filter((c) => c.children.length).length >= 2 ? 'carte' : 'fiche'));
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

  /* Carte « Leçon » : le module se suit comme une petite partie, une idée par écran */
  function lessonCard(s, node, isMod) {
    const m = node.module || node;
    const done = isMod ? moduleSteps(node).lesson : !!node.lessonDone;
    const can = window.Lesson && Lesson.canStart(node);
    const n = node.children.filter((c) => (c.notes || '').trim() || c.keyPoints.length).length;
    if (!can) {
      return isMod ? `<section class="lesson-card glass">
        <span class="lc-ic" aria-hidden="true">${ic('book-open-text', true)}</span>
        <div class="lc-txt"><b>Pas encore de cours</b><small>Arbor le prépare en quelques instants</small></div>
        <button class="btn" data-act="write-course">${ic('sparkle', true)}Préparer</button></section>` : '';
    }
    const res = (node.module && node.module.lessonDone) || node.lessonDone;
    return `<section class="lesson-card glass ${done ? 'done' : ''}">
      <span class="lc-ic" aria-hidden="true">${ic(done ? 'check-circle' : 'play-circle', true)}</span>
      <div class="lc-txt"><b>${done ? 'Leçon faite' : 'Leçon'}${isMod && node.module.date && !done ? ` · ${dayLabel(node.module.date)}` : ''}</b>
        <small>${done && res && res.asked ? `${Math.round((res.good / res.asked) * 100)} % de bonnes réponses` : `${plural(n, 'notion', 'notions')} · ${Lesson.minutes(node)} min`}</small></div>
      ${done ? `<div class="row-btns"><a class="btn" href="${link(s.id, node.id, 'revision')}">${ic('play', true)}Réviser</a><button class="btn ghost" data-act="start-lesson" data-id="${node.id}" aria-label="Refaire la leçon">${ic('arrow-counter-clockwise')}</button></div>`
        : `<button class="btn big" data-act="start-lesson" data-id="${node.id}">${ic('play', true)}Commencer</button>`}
    </section>`;
  }
  function modulePanel(s, node) { return lessonCard(s, node, true); }

  // Vue d'ensemble d'un parcours : la frise des modules
  function programPanel(s) {
    const mods = s.root.children.filter((c) => c.module);
    const done = mods.filter((mm) => moduleProgress(mm) === MOD_STEPS.length).length;
    return `
      <section class="sec program">
        <div class="sec-head"><h2>Ton parcours <span class="muted num">${done}/${mods.length}</span></h2>
          <button class="btn ghost sm" data-act="reschedule">${ic('calendar-blank')}Recalculer les dates</button>
        </div>
        <ol class="timeline">
          ${mods.map((mm) => {
            const p = moduleProgress(mm);
            const today = mm.module.date && mm.module.date <= SRS.dayKey() && p < MOD_STEPS.length;
            return `<li class="${p === MOD_STEPS.length ? 'done' : today ? 'now' : ''}">
              <a href="${link(s.id, mm.id)}">
                <span class="tl-date">${p === MOD_STEPS.length ? 'Terminé' : dayLabel(mm.module.date)}</span>
                <span class="tl-title">${esc(mm.title)}</span>
                <span class="tl-steps" aria-label="${p} étapes sur ${MOD_STEPS.length}">${MOD_STEPS.map((_, i) => `<i class="${i < p ? 'on' : ''}"></i>`).join('')}</span>
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
      const mm = s.root.children.find((c) => c.module && c.module.date && c.module.date <= today && moduleProgress(c) < MOD_STEPS.length);
      if (mm) {
        const step = MOD_STEPS.find(([k]) => !moduleSteps(mm)[k]);
        return `<a class="pill-btn" href="${link(s.id, mm.id)}" style="--c:${s.color}" title="Module du jour, prochaine étape : ${step[1].toLowerCase()}">${ic('path', true)}<span>${esc(mm.title)}</span></a>`;
      }
    }
    return '';
  }

  /* Rédiger le cours d'une partie à partir de son titre.
     Si la partie a déjà des sous-parties (ex. notions listées dans le programme), chacune reçoit son cours. */
  /* Qui rédige les cours : le serveur Arbor si l'étudiant est connecté (modèles open source, aucune clé dans le navigateur),
     sinon l'IA locale (ordinateur avec WebGPU), sinon les sources seules (Wikipédia, Wikilivres) sans reformulation. */
  const useLocal = () => !!(state.settings.localAI && window.LocalAI && LocalAI.supported());
  function writer() {
    if (window.AI && AI.available()) return { kind: 'serveur', writeCourse: AI.writeCourse, writeNotion: AI.writeNotion, enrich: AI.enrich };
    if (useLocal()) {
      const id = state.settings.localModel;
      return {
        kind: 'local',
        writeCourse: (t, c, src, o = {}) => LocalAI.writeCourse(t, c, src, { id, ...o }),
        writeNotion: (n, m, src, o = {}) => LocalAI.writeNotion(n, m, src, { id, ...o }),
        enrich: (t, x, o = {}) => LocalAI.enrich(t, x, { id, ...o }),
      };
    }
    return null;
  }
  const engineLabel = () => 'à partir de sources fiables, choisies pour chaque notion';
  async function fetchCourse(topic, context, onStatus) {
    const w = writer();
    if (w) {
      onStatus && onStatus('Recherche d’un texte de référence…');
      const src = await Course.wikiSource(topic, context).catch(() => null);
      let r = null;
      try {
        r = await w.writeCourse(topic, context, src, {
          onStatus,
          onProgress: (p) => onStatus && onStatus(p < 1 ? `Arbor se prépare… ${Math.round(p * 100)} %` : 'Arbor rédige le cours…'),
        });
      } catch (err) {
        // compte requis, quota atteint ou service saturé : on prévient ; sinon on se replie sur la source seule
        if (['auth', 'quota'].includes(err.kind)) throw err;
        console.warn('Rédaction indisponible, repli sur Wikipédia :', err.message);
      }
      if (r && r.notions.length) {
        r.overview = `${r.overview}\n\n_Vérifie les points importants dans ton cours._`;
        return { ...r, sources: src ? [{ title: `Wikipédia : ${src.title}`, url: src.url }] : [], from: w.kind };
      }
    }
    return Course.fromWikipedia(topic, context);
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  /* Rédiger le cours d'une partie à partir de son titre.
     Méthode inspirée de STORM (voir storm.js) : chaque notion est rédigée à partir de ses meilleurs passages
     (Wikilivres, Wikiversité, Wikipédia), reformulés par le serveur Arbor ou l'IA locale quand ils sont disponibles.
     Une partie sans sous-parties reçoit d'abord un plan, tiré des sections de la meilleure source. */
  async function writeNotionInto(ch, ctx, onStatus) {
    const r = await Storm.buildNotion(ch.title, ctx, { ai: writer(), onStatus });
    ch.notes = r.notes;
    ch.keyPoints = [...(ch.keyPoints || []), ...r.keyPoints].slice(0, 5);
    ch.exercises = (ch.exercises || []).concat(r.exercises.map((e) => ({ id: Store.uid(), q: String(e.q || ''), a: String(e.a || '') })));
    ch.course = { from: r.from, sources: r.sources };
    return r;
  }
  async function writeCourse(s, node, onStatus) {
    const ctx = node === s.root ? '' : s.title;

    // Un plan si la partie n'a pas de notions, puis une rédaction notion par notion
    let planResearch = null;
    if (!node.children.length) {
      onStatus && onStatus(`plan de « ${node.title} »`);
      const dom = []; walk(s.root, (x) => dom.push(x.title));
      const plan = await Storm.outline(node.title, { module: ctx, domain: dom.join(' ') }).catch(() => []);
      planResearch = Storm.outline.last || null;
      if (plan.length < 2) {
        const r = await fetchCourse(node.title, ctx, onStatus); // repli : la fiche Wikipédia, reformulée si un moteur est disponible
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
    // mots propres aux autres modules du parcours (pour écarter une page Linux dans un module Windows)
    const others = s.root.children.filter((m) => m !== node && m.module).map((m) => m.title).join(' ');
    const todo = node.children.filter((ch) => !ch.notes.trim());
    // 3 notions à la fois : les recherches se recouvrent au lieu de s'attendre
    for (let i = 0; i < todo.length; i += 3) {
      await Promise.all(todo.slice(i, i + 3).map(async (ch) => {
        try { await writeNotionInto(ch, { module: node.title, subject: s.title, domain: domain.join(' '), others }, (m) => onStatus && onStatus(`« ${ch.title} »`)); n++; }
        catch (err) { if (/ralentir/.test(err.message)) throw err; missed.push(ch.title); }
        writeTick();
      }));
    }
    if (node.module) node.module.generated = true;
    if (!n && missed.length) throw new Error(`Rien trouvé pour ${missed.slice(0, 3).join(', ')}.`);
    return n;
  }

  // Plusieurs cours à la suite, avec une progression visible
  /* Rédaction en arrière-plan : une petite carte en bas de l'écran montre l'avancée, notion par notion.
     On peut continuer à utiliser Arbor ; chaque cours terminé s'affiche aussitôt. */
  let writeTick = () => {};
  async function writeCourses(s, nodes) {
    closeModal();
    const total = nodes.reduce((a, n) => a + (n.children.filter((c) => !c.notes.trim()).length || 4), 0);
    let done = 0;
    let card = $('#writeCard');
    if (!card) { card = document.createElement('div'); card.id = 'writeCard'; card.className = 'write-card glass'; card.setAttribute('role', 'status'); document.body.appendChild(card); }
    card.innerHTML = `<span class="wc-leaf" aria-hidden="true">${ic('leaf', true)}</span><span class="wc-txt"><b>Arbor rédige ton cours</b><small id="wcMsg">Recherche des sources…</small></span><span class="wc-num num" id="wcNum">0/${total}</span><span class="wc-bar" aria-hidden="true"><span id="wcBar"></span></span>`;
    requestAnimationFrame(() => card.classList.add('show'));
    const paintProgress = () => {
      const k = Math.min(1, done / total);
      const b = $('#wcBar'); if (b) b.style.transform = `scaleX(${Math.max(0.04, k)})`;
      const c = $('#wcNum'); if (c) c.textContent = `${Math.min(done, total)}/${total}`;
    };
    writeTick = () => { done++; paintProgress(); };
    Mascot.react('reading');
    const failed = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const before = done;
      const msg = (m) => { const e = $('#wcMsg'); if (e) e.textContent = m; };
      try { await writeCourse(s, node, msg); } catch (err) { console.warn(err.message); failed.push(node.title); }
      if (done === before) { done += node.children.filter((c) => !c.notes.trim()).length || 4; paintProgress(); }
      save();
      // le cours apparaît tout de suite si on le regarde (sans interrompre une saisie)
      const typing = document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName);
      if (view.name === 'subject' && view.id === s.id && !typing && !$('#modal:not([hidden])')) render(view);
    }
    writeTick = () => {};
    done = total; paintProgress();
    setTimeout(() => { card.classList.remove('show'); setTimeout(() => card.remove(), 400); }, 900);
    Mascot.react('imported');
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
      const r = await fetchCourse(node.title, s.title, (m) => { const e = $('#ldMsg'); if (e) e.textContent = m; });
      if (r.overview && !node.notes.trim()) node.notes = r.overview;
      r.notions.forEach((n) => node.children.push(normalize(n)));
      node.module.sources = r.sources;
      node.module.researched = true;
      node.collapsed = false;
      touch(); Mascot.react('imported'); closeModal(); render(view);
      FX.toast(`${plural(r.notions.length, 'notion préparée', 'notions préparées')}, avec ${plural(r.sources.length, 'source', 'sources')}. Lance la leçon quand tu veux.`, 'success', 5200);
    } catch (err) {
      console.error(err);
      Mascot.react('stop-reading');
      const msg = (err && err.message) || 'Erreur inconnue.';
      $('#modalBody').innerHTML = `<div class="loading"><span class="tile big danger-tile">${ic('warning-circle', true)}</span><h2 id="modalTitle">Recherche impossible</h2><p class="modal-lede">${esc(msg)} Tu peux utiliser les liens de recherche à la place.</p></div>`;
    }
  }

  /* Ce que le document dit en dehors du cours : évaluation, conseils, commentaires, annexes.
     Affiché pour être lu (et corrigé si le tri s'est trompé), jamais utilisé pour les leçons, les questions ou Pousse. */
  const CTX = { evaluation: ['Évaluation', 'chart-bar'], recommandation: ['Conseils', 'signpost'], commentaire: ['Commentaires', 'chat-circle-text'], annexe: ['Annexes', 'paperclip'] };
  function contextBox(node) {
    const c = node.context || [];
    if (!c.length) return '';
    const kinds = [...new Set(c.map((x) => x.kind))];
    const pagesOf = (x) => (x.pages && x.pages.length ? ` <small class="num">p. ${x.pages.join(', ')}</small>` : '');
    return `<details class="sec ctx-box">
      <summary><span>${ic('folder-simple-dashed')}<b>Ce que dit ce document</b> <small>hors cours : ${kinds.map((k) => CTX[k][0].toLowerCase()).join(', ')}</small></span></summary>
      <p class="hint">Arbor a mis ces passages de côté : ils parlent de l’apprenant ou du document, pas du sujet. Ils ne servent ni aux leçons, ni aux questions, ni à Pousse.</p>
      ${kinds.map((k) => `<div class="ctx-kind"><h3>${ic(CTX[k][1])}${CTX[k][0]}</h3><ul>${c.filter((x) => x.kind === k).map((x, i) => `<li>${x.title ? `<b>${esc(x.title)}</b>${pagesOf(x)}<div class="md">${MD.render(x.text)}</div>` : `${esc(x.text)}${pagesOf(x)}`}</li>`).join('')}</ul></div>`).join('')}
      <div class="row-btns"><button class="btn ghost sm" data-act="ctx-restore">${ic('arrow-u-up-left')}C’est du cours : le remettre dans les notes</button></div>
    </details>`;
  }

  // Le cours, lisible d'une traite : introduction, puis chaque notion avec ses points clés
  function courseSection(s, node, isRoot) {
    const withNotes = node.children.filter((c) => c.notes.trim());
    if (!withNotes.length) {
      if (isRoot && s.program) {
        const missing = s.root.children.filter((c) => c.module && !c.module.generated && !c.children.some((x) => x.notes.trim())).length;
        return missing ? `<section class="sec write-course"><p>${ic('sparkle', true)} <b>${plural(missing, 'module', 'modules')}</b> sans cours</p><button class="btn" data-act="write-all">${ic('book-open-text')}Rédiger</button></section>` : '';
      }
      if (isRoot || node.notes.trim().length > 80) return '';
      return `<section class="sec write-course"><p title="${esc(engineLabel())}">${ic('sparkle', true)} <b>Partie vide.</b> Arbor peut en rédiger le cours.</p><button class="btn" data-act="write-course">${ic('book-open-text')}Rédiger le cours</button></section>`;
    }
    const pre = node.module && !moduleSteps(node).pretest && !pretestSeen.has(node.id + ':course');
    const sources = [...((node.course && node.course.sources) || []), ...((node.module && node.module.sources) || []), ...withNotes.flatMap((c) => (c.course && c.course.sources) || [])]
      .filter((x, i, a) => x && x.url && a.findIndex((y) => y.url === x.url) === i);
    return `
      <section class="sec course" id="course">
        <div class="sec-head"><h2>Le cours</h2><span class="muted">${plural(withNotes.length, 'notion', 'notions')}</span></div>
        ${pre ? `<div class="pretest-cover"><p>${ic('lightbulb', true)}<span><b>Avant de lire :</b> écris ce que tu en sais.</span></p><button class="btn ghost sm" data-act="course-reveal" data-id="${node.id}">Lire quand même</button></div>` : ''}
        <div class="course-body ${pre ? 'pretest' : ''}">
          ${withNotes.map((c) => `
            <article class="course-part">
              <h3><a href="${link(s.id, c.id)}">${esc(c.title)}</a></h3>
              ${c.keyPoints.length ? `<div class="course-keys"><small>${ic('star', true)}À retenir</small><ul>${c.keyPoints.slice(0, 3).map((k) => `<li>${MD.render(k).replace(/^<p>|<\/p>$/g, '')}</li>`).join('')}</ul></div>` : ''}
              <div class="md ${c.notes.length > 500 ? 'clamp' : ''}">${MD.render(c.notes)}</div>${c.notes.length > 500 ? `<button class="btn ghost sm more-btn" data-act="unclamp">${ic('caret-down')}Lire la suite</button>` : ''}
            </article>`).join('')}
        </div>
        ${sources.length ? `<p class="course-src">Sources : ${sources.map((x) => (safeUrl(x.url) ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title || x.url)}</a>` : esc(x.title || x.url))).join(', ')}</p>` : ''}
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
        <div class="row-btns"><button class="btn sm" data-act="bulk-add" data-id="${node.id}">${ic('tree-structure')}Découper en sous-parties</button></div></div>
      </div>` : '';
    const when = node.srs.due <= Date.now() ? 'à revoir maintenant' : days <= 0 ? 'prochaine révision aujourd’hui' : `prochaine révision dans ${plural(days, 'jour', 'jours')}`;
    const ms = !node.children.length && Mastery.notions(s).find((x) => x.n.id === node.id);
    const why = ms ? `<p class="mem-reason"><span class="st-dot" style="--sc:${Mastery.STATES[ms.state].c}" aria-hidden="true"></span><b>${Mastery.STATES[ms.state].label}</b><span>${esc(Mastery.reasonOf(node, ms.state))}</span></p>` : '';
    return why + `<div class="memory">
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
  let mapMode = 'zones';
  function renderMap() {
    const s = subjectById(view.id);
    // Plusieurs chapitres : la carte d'exploration par zones ; sinon (ou au choix) l'arbre complet
    const zonesOk = s.root.children.filter((c) => c.children.length).length >= 2;
    if (zonesOk && mapMode === 'zones') {
      $('#paneBody').innerHTML = `<div class="map-wrap"><div class="map-switch" role="group" aria-label="Affichage"><button class="seg" aria-pressed="true">${ic('map-trifold')}Zones</button><button class="seg" data-act="map-tree" aria-pressed="false">${ic('tree-structure')}Arbre</button></div><div id="xmapHost"></div></div>`;
      Explore.render($('#xmapHost'), s, { ic, esc, link, canLesson, stateBar, onTalk: (nid) => { const f = find(s.root, nid); if (f) openTalk(s, f.node, 'socratique'); }, onDecide: (rid, status) => {
        // décision de l'étudiant sur un lien : gardée avec sa date, et jamais écrasée par un nouveau calcul
        s.graph = s.graph || { v: 1, decisions: {} };
        s.graph.decisions[rid] = { status, at: Date.now(), by: 'utilisateur' };
        touch(); renderMap();
        FX.toast(status === 'valide' ? 'Lien validé' : 'Lien retiré de la carte', 'success');
      } });
      return;
    }
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
        ${zonesOk ? `<div class="map-switch" role="group" aria-label="Affichage"><button class="seg" data-act="map-zones" aria-pressed="false">${ic('map-trifold')}Zones</button><button class="seg" aria-pressed="true">${ic('tree-structure')}Arbre</button></div>` : ''}
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
    if (s.program) s.root.children.forEach((m) => { if (m.module && !moduleSteps(m).lesson) walk(m, (x) => { if (!x.srs) locked.add(x.id); }); });
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
      recall: () => `<h2 class="q-title">${esc(node.title)}</h2>${show ? '' : '<p class="muted">Récite sans regarder.</p>'}`,
      branch: () => `<h2 class="q-title">${esc(node.title)}</h2>${show ? '' : `<p class="muted">Ses ${plural(node.children.length, 'sous-partie', 'sous-parties')}, dans l’ordre.</p>`}`,
      exercise: () => `${p.ex.q.startsWith(node.title.replace(/…$/, '')) ? '' : `<h2 class="q-title small">${esc(node.title)}</h2>`}<div class="exercise-q md">${MD.render(p.type === 'exercise' ? p.ex.q : '')}</div>${show ? '' : '<p class="muted">Résous-le d’abord.</p>'}`,
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
              ${isLeech(node) ? `<div class="leech-tip">${ic('warning-circle', true)}<p>Tu as oublié cette partie ${node.srs.lapses} fois. Elle est peut-être trop grosse : <a href="${link(s.id, node.id)}">découpe-la en sous-parties</a>.</p></div>` : ''}
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
        ${(() => { const l = Mastery.nextLesson(state, canLesson); return l ? `<div class="next-lesson glass"><span class="tile sm" style="--c:${l.s.color}">${ic('play-circle', true)}</span><div><small>Ensuite</small><b>Leçon : ${esc(l.n.title)}</b></div><button class="btn" data-act="lesson-next">${ic('play', true)}Continuer</button></div>` : ''; })()}
        <div class="row-btns center">
          <button class="btn ${study.session ? 'ghost' : ''}" data-act="study-start">${ic('arrow-counter-clockwise')}${study.quick ? 'Continuer' : 'Nouvelle session'}</button>
          <a class="btn ghost" href="#/">${ic('house')}Aujourd’hui</a>
        </div>
      </div>`;
    if (n && !study.celebrated) {
      study.celebrated = true; FX.confetti(undefined, undefined, 110); Mascot.react('finished');
      logSession({ kind: 'review', n, ok }); save();
    }
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
    const before = Trophies.levelOf(state.xp).lvl;
    state.xp += n;
    renderXP(true);
    const after = Trophies.levelOf(state.xp).lvl;
    if (after > before) celebrate({ kind: 'level', lvl: after, rankUp: Trophies.rankOf(after) > Trophies.rankOf(before) });
  }

  /* ---------- Trophées et niveaux : célébrations ---------- */
  const trophyCtx = () => ({ walk, streak: SRS.streak(state.stats), moduleDone: (n) => moduleProgress(n) === MOD_STEPS.length, lessonDone: (n) => !!(n.module && n.module.lessonDone) || !!n.lessonDone });
  function checkTrophies() {
    const st = SRS.streak(state.stats);
    if (st > (state.stats.bestStreak || 0)) state.stats.bestStreak = st;
    const { fresh } = Trophies.evaluate(state, trophyCtx());
    if (!fresh.length) return;
    Store.save(state);
    // Plusieurs d'un coup (premier lancement après une mise à jour) : une seule carte récapitulative
    if (fresh.length > 2) celebrate({ kind: 'batch', list: fresh });
    else fresh.forEach((t) => celebrate({ kind: 'trophy', t }));
    fresh.forEach((t) => { state.xp += t.xp; });
    renderXP(true);
    if (view.name === 'trophies') render(view);
  }
  // File d'attente : une célébration à la fois, sans bloquer la révision
  const pops = [];
  let popping = false;
  function celebrate(item) { pops.push(item); if (!popping) nextPop(); }
  function nextPop() {
    if (document.documentElement.classList.contains('in-onboarding')) { popping = true; setTimeout(nextPop, 1500); return; }
    const item = pops.shift();
    if (!item) { popping = false; return; }
    popping = true;
    let el = $('#trophyPop');
    if (!el) { el = document.createElement('div'); el.id = 'trophyPop'; el.className = 'trophy-pop'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
    if (item.kind === 'level') {
      const rank = Trophies.RANKS[Trophies.rankOf(item.lvl)];
      el.style.setProperty('--rank', rank.c);
      el.innerHTML = `<a class="tp-card glass level" href="#/trophees">
        <span class="lvl-badge" style="--rank:${rank.c}"><b class="num">${item.lvl}</b></span>
        <span class="tp-txt"><small>${item.rankUp ? 'Nouveau rang' : 'Niveau atteint'}</small><b>${item.rankUp ? rank.name : `Niveau ${item.lvl}`}</b><span>${item.rankUp ? 'Pousse grandit avec toi' : rank.name}</span></span></a>`;
      Mascot.react('levelup');
    } else if (item.kind === 'batch') {
      const xp = item.list.reduce((a, t) => a + t.xp, 0);
      el.innerHTML = `<a class="tp-card glass" href="#/trophees">
        <span class="tr-batch pop-in">${item.list.slice(0, 3).map((t) => Trophies.medal(t.f.icon, t.tier < 0 ? 'single' : t.tier, 46)).join('')}</span>
        <span class="tp-txt"><small>${item.list.length} trophées débloqués</small><b>Bravo !</b><span>+${xp} XP · voir la collection</span></span></a>`;
    } else {
      const { f, tier, xp } = item.t;
      el.innerHTML = `<a class="tp-card glass" href="#/trophees">
        ${Trophies.medal(f.icon, tier < 0 ? 'single' : tier, 58, 'pop-in')}
        <span class="tp-txt"><small>Trophée débloqué</small><b>${esc(f.name)}</b><span>${tier < 0 ? esc(f.desc) : Trophies.TIERS[tier].name} · +${xp} XP</span></span></a>`;
    }
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    if (!state.settings.calm) FX.confetti(innerWidth / 2, 90, item.kind === 'level' || item.kind === 'batch' ? 140 : item.t.tier >= 2 ? 120 : 60);
    setTimeout(() => { el.classList.remove('show'); setTimeout(nextPop, 450); }, 3800);
  }

  function grade(g, origin) {
    const c = currentCard();
    if (!c || study.phase !== 'show' || study.busy) return;
    const { s, node } = c;
    const wasNew = !node.srs;
    const prevSrs = node.srs || {};
    // Persévérance : une carte oubliée la dernière fois, retrouvée cette fois
    if (prevSrs.missed && g >= 2) count('recovered');
    // Le retour : première révision après au moins 3 jours sans réviser (on accueille, on ne punit pas)
    const lastDay = Object.keys(state.stats.days || {}).filter((k) => state.stats.days[k].reviews > 0 && k !== SRS.dayKey()).sort().pop();
    if (lastDay && !SRS.today(state.stats).reviews && (Date.now() - new Date(lastDay + 'T12:00').getTime()) / SRS.DAY >= 3) count('comeback');
    node.srs = SRS.schedule(node.srs, g);
    node.srs.missed = g === 1;
    // Illusion de maîtrise : « certain » puis oublié. On le compte pour te le montrer.
    node.srs.illusions = (prevSrs.illusions || 0) + (study.conf === 'sure' && g === 1 ? 1 : 0);
    node.srs.lastG = g;
    // Observation : un fait daté (réponse, note, confiance), versé au journal ; la notion garde un résumé
    const obs = { sid: s.id, nid: node.id, activity: 'rappel', outcome: g >= 3 ? 'juste' : g === 2 ? 'partiel' : 'faux', grade: g, confidence: study.conf || null, answer: study.typed || '', prompt: (study.prompt && study.prompt.type) || 'recall' };
    Obs.summarize(node, { ...obs, at: Date.now() }); Obs.add(obs);
    if (study.conf === 'sure' && g === 1) node.srs.illusionAt = Date.now(); else if (prevSrs.illusionAt) node.srs.illusionAt = prevSrs.illusionAt;
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
          <a class="back-link" href="#/">${ic('arrow-left')}Aujourd’hui</a>
          <h1>Révision du jour</h1>
          <p class="muted">Sujets mélangés, pour mieux retenir.</p>
        </header>
        <div id="paneBody"></div>
      </section>`;
    if (!study || study.scope.type !== 'all' || (study.i >= study.queue.length && study.celebrated)) buildSession({ type: 'all' });
    renderStudy();
  }

  /* ---------- Onboarding ---------- */
  // Le sujet « Découvrir Arbor » créé au premier lancement, jamais utilisé : il laisse la place au vrai premier cours
  const untouchedDemo = (x) => x.title === 'Découvrir Arbor' && !(() => { let used = false; walk(x.root, (n) => { if (n.srs) used = true; }); return used; })();
  const dropUntouchedDemo = () => { state.subjects = state.subjects.filter((x) => !untouchedDemo(x)); };
  function onbAfterCourse(s) {
    if (!window.Onboarding || !Onboarding.pending()) return false;
    dropUntouchedDemo(); save();
    return Onboarding.afterImport(s);
  }
  function openOnboarding() {
    const addCourse = (tree, examDate) => {
      const s = makeSubject(tree.title, { root: normalize(tree), color: PALETTE[state.subjects.filter((x) => !untouchedDemo(x)).length % PALETTE.length], icon: 'globe-hemisphere-west' });
      if (examDate) s.examDate = examDate;
      dropUntouchedDemo();
      state.subjects.push(s); save();
      return s;
    };
    Onboarding.open({
      profile: state.profile,
      addCourse,
      // Un sujet libre : cours construit à partir de sources fiables (serveur Arbor si connecté, sinon Wikipédia seule)
      async courseFromTopic(topic, onStatus) {
        const r = await fetchCourse(topic, '', onStatus);
        if (!r || !r.notions || !r.notions.length) return null;
        const t = topic.charAt(0).toUpperCase() + topic.slice(1);
        const s = addCourse({ title: t, notes: r.overview || '', children: r.notions });
        s.root.course = { from: r.from, sources: r.sources || [] }; save();
        return s;
      },
      removeCourse(s) { state.subjects = state.subjects.filter((x) => x.id !== s.id); save(); },
      // Notion « à vérifier » : on garde ce que la personne a dit, et on ajoute ce que dit une source fiable
      async completeNotion(s, node, onStatus) {
        const mine = node.notes;
        try {
          await writeNotionInto(node, s.title, onStatus);
          if (!String(node.notes || '').trim() || node.notes === mine) throw new Error('Aucune source fiable trouvée pour cette notion.');
          node.notes = `${mine}\n\n**Ce que dit une source fiable**\n\n${node.notes}`;
        } catch (e) { node.notes = mine; throw e; }
        finally { s.updatedAt = Date.now(); save(); }
      },
      talk(s, node) { go(link(s.id, node.id, 'fiche')); setTimeout(() => openTalk(s, node, 'socratique'), 450); },
      importPdf: () => pdfModal(),
      newCourse: () => { dropUntouchedDemo(); save(); render(view); newSubjectModal(); },
      // Première réponse : une vraie observation, la notion devient « découverte »
      firstAnswer(s, node, ok) {
        node.lessonDone = { at: Date.now(), good: ok ? 1 : 0, asked: 1 };
        const obs = { sid: s.id, nid: node.id, activity: 'lecon', outcome: ok ? 'juste' : 'faux' };
        Obs.summarize(node, { ...obs, at: Date.now() }); Obs.add(obs);
        s.updatedAt = Date.now(); save();
      },
      go(s) {
        mapMode = 'zones'; Explore.reset();
        go(link(s.id, s.root.id, s.root.children.filter((c) => c.children.length).length >= 2 ? 'carte' : 'fiche'));
        setTimeout(checkTrophies, 900);
      },
      saveProfile(p) { state.profile = p; delete state.firstRun; save(); Store.flush(); if (window.Journey) Journey.set({ workspace: Journey.get().workspace || 'student', studentDone: true }); },
    });
  }

  /* ---------- Pratiquer avec Pousse : dialogue socratique et Enseigne-moi ---------- */
  function prereqsOf(s, node) {
    if (!window.Insight) return [];
    const A = Insight.analyze(s), r = A.rel.get(node.id);
    return r ? r.pre.map((x) => ({ id: x.id, title: A.byId.get(x.id).title })) : [];
  }
  function practiceCard(s, node) {
    if (node.children.length || !window.Dialogue || !Dialogue.canTalk(node)) return '';
    return `<section class="practice-card glass">
      <span class="pc-pousse">${(window.Mascot && Mascot.mini({ size: 64, mood: 'happy' })) || ic('plant', true)}</span>
      <div class="lc-txt"><b>Pratiquer avec Pousse</b><small>Questions sur ton cours, sources citées</small></div>
      <div class="row-btns"><button class="btn sm" data-act="talk" data-mode="socratique" data-id="${node.id}">${ic('chat-circle-text', true)}Dialogue</button>
      <button class="btn ghost sm" data-act="talk" data-mode="enseigne" data-id="${node.id}">${ic('chalkboard-teacher')}Enseigne-moi</button></div>
    </section>`;
  }
  function openTalk(sj, nd, mode) {
    state.lastVisit = { sid: sj.id, nid: nd.id, at: Date.now(), kind: mode };
    Dialogue.open({ mode, s: sj, node: nd, d: { ic, esc, link, prereqs: prereqsOf(sj, nd), save: () => { sj.updatedAt = Date.now(); save(); } } });
  }

  /* ---------- Session du jour : un bouton, la bonne activité ---------- */
  const canLesson = (n) => !!(window.Lesson && Lesson.canStart(n));
  function logSession(e) {
    state.stats.sessions = state.stats.sessions || [];
    state.stats.sessions.unshift({ at: Date.now(), ...e });
    state.stats.sessions.length = Math.min(state.stats.sessions.length, 120);
  }
  function runLesson(sj, nd) {
    state.lastVisit = { sid: sj.id, nid: nd.id, at: Date.now(), kind: 'lesson' };
    Lesson.start({ module: nd, subject: sj, color: sj.color, onAnswer: ({ nid, ok }) => {
      const f = find(sj.root, nid); if (!f) return;
      const obs = { sid: sj.id, nid, activity: 'lecon', outcome: ok ? 'juste' : 'faux' };
      Obs.summarize(f.node, { ...obs, at: Date.now() }); Obs.add(obs);
    }, onFinish: (r) => {
      const res = { at: Date.now(), good: r.good, asked: r.asked };
      if (nd.module) { nd.module.lessonDone = res; nd.module.learned = true; } else nd.lessonDone = res;
      state.stats.counters = state.stats.counters || {}; state.stats.counters.lessons = (state.stats.counters.lessons || 0) + 1;
      logSession({ kind: 'lesson', sid: sj.id, nid: nd.id, title: nd.title, n: r.asked, ok: r.good });
      sj.updatedAt = Date.now();
      gainXP(r.xp); save(); render(view);
    } });
  }
  // Révisions dues, puis notions fragiles, puis nouvelles cartes ; sans carte, la prochaine leçon
  function startDaySession() {
    const ov = overview({ type: 'all' });
    const p = Mastery.plan(state, ov, canLesson);
    if (!ov.due && !p.fragile.length && !ov.newToday) {
      if (p.lesson) { runLesson(p.lesson.s, p.lesson.n); return; }
      FX.toast('Tout est à jour. Importe un cours ou ajoute des parties pour continuer.', 'info', 3600);
      return;
    }
    buildSession({ type: 'all' });
    const inQ = new Set(study.queue.map((q) => q.nid));
    const frag = p.fragile.filter((x) => !inQ.has(x.n.id)).slice(0, 8).map((x) => ({ sid: x.s.id, nid: x.n.id }));
    study.queue.splice(ov.due, 0, ...frag);
    study.session = true;
    preparePrompt();
    go('#/reviser');
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
    if (!p) return `<button class="pill-btn" data-act="plan-edit" title="Un plan « quand… alors… » aide à s’y tenir">${ic('calendar-plus', true)}<span>Mon plan</span></button>`;
    return `<button class="pill-btn" data-act="plan-edit" title="Quand ${esc(p.cue)}, je révise ${p.n} cartes">${ic('calendar-check', true)}<span>${p.time ? esc(p.time) : esc(p.cue)} · ${p.n} cartes</span></button>`;
  }
  function examLine() {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const exams = state.subjects.filter((s) => s.examDate).map((s) => ({ s, days: Math.round((new Date(s.examDate + 'T00:00') - now) / SRS.DAY) })).filter((e) => e.days >= 0).sort((a, b) => a.days - b.days);
    if (!exams.length) return '';
    const { s, days } = exams[0];
    let fresh = 0; walk(s.root, (n, d) => { if (!(d === 0 && s.root.children.length) && !n.srs) fresh++; });
    const perDay = days ? Math.ceil(fresh / days) : fresh;
    return `<a class="pill-btn" href="${link(s.id, s.root.id, 'revision')}" style="--c:${s.color}" title="${esc(s.title)} : ${fresh ? `${plural(fresh, 'partie jamais vue', 'parties jamais vues')}, vise ${perDay} par jour` : 'tout a été vu'}">${ic('flag-checkered', true)}<span>${days === 0 ? 'Examen aujourd’hui' : `J-${days}`}${fresh ? ` · ${perDay}/jour` : ''}</span></a>`;
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
    const plan = Mastery.plan(state, ov, canLesson);
    const steps = plan.steps;
    const mins = Math.max(2, Math.round((ov.due + Math.min(8, plan.fragile.length) + ov.newToday) * 0.4 + (plan.lesson ? Lesson.minutes(plan.lesson.n) : 0)));
    const wk = week.reduce((a, d) => a + d.reviews, 0);
    return `
      <section class="today bento" aria-labelledby="todayTitle">
        <div class="b-hero glass" style="--i:0">
          <div class="orb" aria-hidden="true"><i></i><i></i><i></i><b></b></div>
          <div class="hero-copy">
            <p class="hello">${greeting()}</p>
            <h1 id="todayTitle">${steps.length ? `<span class="big-label solo">Ta session</span>` : `<span class="big-label solo">${ov.total ? 'Tout est à jour' : 'Prêt ?'}</span>`}</h1>
            ${steps.length ? `<ol class="plan-steps">${steps.map((x) => `<li class="ps-${x.kind}">${ic({ review: 'clock-counter-clockwise', fragile: 'warning-circle', lesson: 'play-circle', new: 'sparkle' }[x.kind], true)}<span>${esc(x.label)}</span></li>`).join('')}</ol>`
              : `<p class="muted">${ov.total && nextDue ? `Prochaine révision ${new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' }).format(Math.max(1, Math.round((nextDue - Date.now()) / SRS.DAY)), 'day')}.` : 'Importe un cours pour commencer.'}</p>`}
            <div class="row-btns">
              ${steps.length ? `<button class="btn big" data-act="session-start">${ic('play', true)}Commencer<span class="btn-sub num">${mins} min</span></button>` : `<button class="btn big" data-act="import-pdf">${ic('file-arrow-up')}Importer un cours</button>`}
              ${n > 5 ? `<button class="btn ghost big" data-act="quick-start">${ic('lightning', true)}2 min</button>` : `<button class="btn ghost big" data-act="focus-open">${ic('timer', true)}Focus</button>`}
            </div>
            <div class="hero-links">${planLine()}${n > 5 ? `<button type="button" class="pill-btn show-mobile" data-act="focus-open" style="--c:var(--accent)">${ic('timer', true)}<span class="focus-nav-label">Focus</span></button>` : ''}</div>
          </div>
          <a class="corner-link" href="#/methode" aria-label="Pourquoi cette méthode marche">${ic('lightbulb', true)}</a>
        </div>
        <div class="b-goal glass" style="--i:1">
          ${ring(goalPct, 112)}
          <p class="tile-cap"><b class="num">${td.reviews}/${goal}</b> aujourd’hui</p>
        </div>
        <div class="b-streak glass ${streak ? 'on' : ''}" style="--i:2">
          <span class="flame" aria-hidden="true">${ic('fire', true)}</span>
          <b class="num big-stat" data-count="${streak}">${streak}</b>
          <p class="tile-cap">${streak > 1 ? 'jours de suite' : streak ? 'jour de suite' : 'série à lancer'}</p>
        </div>
        <div class="b-week glass" style="--i:3">
          <div class="week" aria-label="Cartes révisées ces 7 derniers jours">
            ${week.map((d, i) => `<div class="day ${i === 6 ? 'is-today' : ''}" title="${d.reviews} cartes" style="--j:${i}"><span style="--h:${d.reviews ? Math.max(10, (d.reviews / max) * 100) : 5}%"></span><small>${d.label}</small></div>`).join('')}
          </div>
          <p class="tile-cap"><b class="num">${wk}</b> cette semaine${td.focusMin ? ` · ${td.focusMin} min focus` : ''}</p>
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
      { icon: 'graduation-cap', title: 'Le point faible, c’est la première mémorisation',
        text: 'Dans la même étude, les étudiants avec un TDAH sans traitement utilisaient beaucoup moins de stratégies « profondes » (image mentale, sens, phrase personnelle). Se tester ne compensait pas ce manque.',
        arbor: 'Chaque module se découvre en leçon guidée : une idée par écran, deux ou trois points à retenir, puis une question tout de suite. Une réponse ratée revient à la fin.',
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
        arbor: 'Les indices mettent sur la piste sans donner la réponse, et baissent la note proposée. L’IA d’import structure ton cours mais ne répond pas à ta place.',
        src: [['Bastani et al., PNAS (2025)', 'https://papers.ssrn.com/abstract=4895486'], ['Kestin et al. (2025)', 'https://michellemillerphd.substack.com/p/r3-37-july-15-2025-how-do-tutoring']], level: 'Solide' },
      { icon: 'scales', title: 'Tu te notes moins bien que tu ne le crois',
        text: 'S’auto-évaluer est peu fiable : on prend la familiarité pour du savoir. Une note trop généreuse espace trop la carte, et on l’oublie.',
        arbor: 'Plus de bouton « Maîtrisé » à cliquer. Tu coches ce que tu avais vraiment retrouvé, Arbor propose la note, et le statut vient de ta mémoire mesurée.',
        src: [['Recherche sur les jugements d’apprentissage', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2836879']], level: 'Solide' },
      { icon: 'game-controller', title: 'Les points et les badges motivent un peu, pas plus',
        text: 'Une méta-analyse de 2024 trouve un effet faible de la ludification sur la motivation (g = 0,26), moins stable que sur les résultats.',
        arbor: 'L’XP récompense l’effort (réviser, finir une leçon, se concentrer), pas le fait de cliquer « Bien ». Le mode calme coupe les confettis et fige le décor si le mouvement te distrait.',
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
        arbor: 'Importe un programme : chaque sujet devient un module, réparti jusqu’à ton examen, et Arbor en rédige le cours à partir de sources fiables. Tu le découvres en leçon courte, puis tu le révises au bon moment.',
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
    // Version visuelle : un chiffre ou une icône, un titre court, une phrase. Le détail s'ouvre à la demande.
    const VIS = [
      ['83 %', 'relisent leurs cours', 'Relire trompe', 'Réponse cachée tant que tu n’as pas essayé.'],
      ['#1', 'technique d’étude', 'Se tester', 'Chaque partie devient une carte.'],
      ['90 %', 'de mémoire visée', 'Espacer', 'FSRS te redonne la carte avant l’oubli.'],
      ['5', 'étapes par module', 'Un parcours', 'Ton programme devient des modules datés.'],
      ['', '', 'Essayer avant de lire', 'Devine les points clés d’abord.'],
      ['', '', 'Le dire avec tes mots', 'Une zone « explique-le » par fiche.'],
      ['', '', 'Mélanger', 'Révisions mélangées entre sujets.'],
      ['', '', 'Savoir ce qu’on sait', 'Ta confiance est mesurée.'],
      ['', '', 'Moins de distractions', 'Focus, petits objectifs, série.'],
    ];
    const VIS_ADHD = [
      ['', '', 'Se tester marche aussi', 'Un bouton, les cartes arrivent seules.'],
      ['', '', 'Apprendre en leçon', 'Une idée, puis une question.'],
      ['72', 'étudiants testés', 'Réciter dans l’ordre', 'La carte « branche ».'],
      ['2 min', 'pour démarrer', 'Le plus dur : commencer', '5 cartes, et c’est parti.'],
      ['', '', 'Jusqu’à réussir', 'Une carte ratée revient.'],
      ['61 %', 'contre 38 % en blocs', 'Mélanger les exercices', 'Exercices mélangés en révision.'],
      ['-17 %', 'à l’examen sans garde-fous', 'L’IA donne des pistes', 'Des indices, pas les réponses.'],
      ['', '', 'Se noter honnêtement', 'Tu coches, Arbor propose la note.'],
      ['0,26', 'effet des badges', 'Les points motivent un peu', 'L’XP récompense l’effort.'],
      ['12', 'participants, à confirmer', 'Travailler à deux', 'Pousse lit à côté de toi.'],
    ];
    const tile = (it, v, i, wide) => `
      <article class="m-tile glass ${wide ? 'wide' : ''} ${v[0] ? 'has-num' : ''}" style="--i:${i}">
        <span class="m-shape s${i % 4}" aria-hidden="true"></span>
        <div class="m-top">
          ${v[0] ? `<b class="m-num num">${v[0]}</b><small class="m-cap">${v[1]}</small>` : `<span class="tile big-ic">${ic(it.icon, true)}</span>`}
        </div>
        <h2>${v[2]}</h2>
        <p class="m-arbor">${ic('tree', true)}${v[3]}</p>
        <details class="m-more">
          <summary aria-label="En savoir plus : ${esc(v[2])}">${ic('plus')}</summary>
          <div class="m-detail">
            <p>${it.text}</p>
            <p class="mi-arbor">${it.arbor}</p>
            <p class="mi-src"><span class="chip level">${it.level}</span> ${it.src.map(([l, u]) => `<a href="${u}" target="_blank" rel="noopener">${l}</a>`).join(', ')}</p>
          </div>
        </details>
      </article>`;
    // 4 colonnes : 9 tuiles dont 3 larges, puis 10 dont 2 larges = 12 cases pleines à chaque fois
    const wide1 = new Set([0, 3, 6]), wide2 = new Set([3, 5]);
    app.innerHTML = `
      <section class="method">
        <header class="method-head">
          <a class="back-link" href="#/">${ic('arrow-left')}Aujourd’hui</a>
          <h1>Pourquoi tu oublies</h1>
          <p class="lede">Ce que dit la recherche, et ce qu’Arbor en fait.</p>
        </header>
        <div class="bento m-grid">${items.map((it, i) => tile(it, VIS[i], i, wide1.has(i))).join('')}</div>
        <h2 class="method-sub">Si l’attention est ton point faible</h2>
        <div class="bento m-grid">${adhdItems().map((it, i) => tile(it, VIS_ADHD[i], i, wide2.has(i))).join('')}</div>
        <p class="hint method-foot">Touche ${ic('plus')} pour le détail et les sources.</p>
      </section>`;
  }

  /* ----- Page Trophées : niveau, rangs, trophées les plus proches, collection ----- */
  function renderTrophies() {
    document.documentElement.style.removeProperty('--accent');
    const values = Trophies.measure(state, trophyCtx()); // mesure seulement : l'attribution passe par checkTrophies (avec célébration)
    const L = Trophies.levelOf(state.xp);
    const ri = Trophies.rankOf(L.lvl), rank = Trophies.RANKS[ri], nextRank = Trophies.RANKS[ri + 1];
    const T = state.trophies || {};
    const near = Trophies.nextUp(state, values, 3);
    const unitOf = (f, n) => (n > 1 ? f.unit[1] : f.unit[0]);
    app.innerHTML = `
      <section class="trophies">
        <header class="method-head">
          <a class="back-link" href="#/progression">${ic('arrow-left')}Ma progression</a>
          <h1>Trophées</h1>
        </header>
        <div class="bento tr-top">
          <div class="tr-level glass" style="--rank:${rank.c};--i:0">
            <div class="lvl-orb" aria-hidden="true"><i></i><i></i></div>
            <div class="lvl-ring" style="--p:${L.pct}" role="img" aria-label="Niveau ${L.lvl}, ${L.pct} % vers le suivant">
              <span><small>Niveau</small><b class="num" data-count="${L.lvl}">${L.lvl}</b></span>
            </div>
            <div class="lvl-txt">
              <p class="rank-name">${ic(rank.icon, true)}${rank.name}</p>
              <p class="tile-cap"><b class="num">${L.into}/${L.need} XP</b> avant le niveau ${L.lvl + 1}</p>
              ${nextRank ? `<p class="tile-cap">${ic(nextRank.icon, true)} ${nextRank.name} au niveau ${nextRank.from}</p>` : ''}
            </div>
          </div>
          <div class="tr-count glass" style="--i:1">
            ${Trophies.medal('trophy', 2, 72)}
            <b class="big-stat num" data-count="${Trophies.owned(state)}">${Trophies.owned(state)}</b>
            <p class="tile-cap">sur ${Trophies.total()} trophées</p>
          </div>
          <div class="tr-next glass" style="--i:2">
            <p class="tile-cap"><b>Presque</b></p>
            <ul>${near.map((n) => `<li>
              <span class="near-ring" style="--p:${n.pct}">${Trophies.medal(n.f.icon, n.tier, 40)}</span>
              <span><b>${n.f.name}</b><small>Plus que ${fmt.format(n.left)} ${unitOf(n.f, n.left)}</small></span></li>`).join('')}</ul>
          </div>
        </div>

        <ol class="ranks" aria-label="Rangs">
          ${Trophies.RANKS.map((r, i) => `<li class="${i < ri ? 'past' : i === ri ? 'now' : ''}" style="--rank:${r.c};--i:${i}">
            <span class="rk-dot">${ic(r.icon, true)}</span><span class="rk-name">${r.name}</span><small class="num">niv. ${r.from}</small></li>`).join('')}
        </ol>

        <h2 class="method-sub">Collection</h2>
        <div class="bento tr-grid">
          ${Trophies.FAMILIES.map((f, i) => {
            const have = T[f.id] ? T[f.id].tier : -1;
            const goal = f.goals[Math.min(3, have + 1)];
            const prev = have >= 0 ? f.goals[have] : 0;
            const pct = have >= 3 ? 100 : Math.max(0, Math.min(100, Math.round(((values[f.id] - prev) / (goal - prev)) * 100)));
            return `<article class="tr-card glass ${have < 0 ? 'locked' : ''}" style="--i:${i + 3}">
              <div class="tr-medal" style="--p:${pct}">${Trophies.medal(f.icon, have, 76)}</div>
              <h3>${f.name}</h3>
              <p class="tile-cap num">${fmt.format(values[f.id])}${have < 3 ? ` / ${fmt.format(goal)}` : ''}</p>
              <div class="tiers" aria-label="${have + 1} paliers sur 4">${Trophies.TIERS.map((t, k) => `<span class="tier t-${t.key} ${k <= have ? 'on' : ''}" title="${t.name} : ${fmt.format(f.goals[k])} ${unitOf(f, f.goals[k])}"></span>`).join('')}</div>
            </article>`;
          }).join('')}
          ${Trophies.SINGLES.map((x, i) => `<article class="tr-card glass single ${T[x.id] ? '' : 'locked'}" style="--i:${i + 13}">
              <div class="tr-medal">${Trophies.medal(x.icon, T[x.id] ? 'single' : -1, 64)}</div>
              <h3>${x.name}</h3><p class="tile-cap">${x.desc}</p></article>`).join('')}
        </div>

        <h2 class="method-sub">Gagner de l’XP</h2>
        <div class="xp-ways">
          ${[['cards', '+2', 'une carte'], ['graduation-cap', '+10', 'une leçon'], ['timer', '+5', '25 min de focus'], ['brain', '+10', 'une partie maîtrisée'], ['trophy', '+10 à 150', 'un trophée']]
            .map(([i, x, l]) => `<span class="pill">${ic(i, true)}<b>${x}</b> ${l}</span>`).join('')}
        </div>
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
        mapMode = 'zones'; Explore.reset();
        go(link(s.id, s.root.id, s.root.children.filter((c) => c.children.length).length >= 2 ? 'carte' : 'fiche'));
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
        save(); closeModal(); FX.toast('Sujet supprimé'); go('#/cours');
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
          <label for="theme">Apparence</label>
          <select id="theme" name="theme">
            ${[['auto', 'Automatique (comme le téléphone)'], ['light', 'Jour'], ['dark', 'Nuit']].map(([v, l]) => `<option value="${v}" ${st.theme === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
          <p class="hint">Version ${esc(window.ARBOR_VERSION || '')} <span class="hide-desktop">· <button type="button" class="link-btn" id="onbAgain">Revoir l’introduction</button></span></p>
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
        ${window.LocalAI && LocalAI.supported() ? `<details class="field advanced">
          <summary>Réglages avancés</summary><fieldset class="field local-ai">
          <legend>Rédaction améliorée <span class="optional">sur cet ordinateur</span></legend>
          <label class="check switch-row"><input type="checkbox" id="localOn" ${st.localAI ? 'checked' : ''} /> Des cours mieux rédigés, préparés sur cet ordinateur, sans rien envoyer</label>
          <select id="localModel" aria-label="Modèle local">${LocalAI.MODELS.map((m) => `<option value="${m.id}" ${st.localModel === m.id ? 'selected' : ''}>${m.label} (${m.size})</option>`).join('')}</select>
          <div class="row-btns"><button type="button" class="btn ghost sm" id="localDl">${ic('download-simple')}Préparer maintenant</button><span class="hint" id="localState"></span></div>
          <div class="bar" id="localBarWrap" hidden><span id="localBar" style="transform:scaleX(0)"></span></div>
          <p class="hint">Préparé une seule fois (quelques minutes), puis gardé sur l’ordinateur. Ta vie privée est respectée : rien n’est envoyé.</p>
        </fieldset></details>` : ''}
        ${installBlock()}
        <fieldset class="field">
          <legend>Compte</legend>
          <p class="hint" id="acctState">${window.Tutor && Tutor.signedIn() ? 'Connecté. Pousse et l’analyse avancée des PDF sont disponibles.' : 'Gratuit. Le compte sert au tuteur Pousse et à l’analyse avancée des PDF ; tes cours restent sur cet appareil.'}</p>
          ${window.Tutor && Tutor.signedIn() ? `<div class="row-btns"><button type="button" class="btn ghost sm" id="acctOut">${ic('sign-out')}Se déconnecter</button></div>` : window.Tutor ? `
          ${window.Welcome ? `<div class="row-btns"><button type="button" class="btn sm" id="acctPwd">${ic('sign-in')}Se connecter</button><button type="button" class="btn ghost sm" id="acctNew">${ic('user-plus')}Créer un compte</button></div>
          <p class="hint">Ou reçois un lien de connexion par e-mail, sans mot de passe :</p>` : ''}
          <label for="acctEmail">Adresse e-mail</label>
          <div class="row-btns"><input id="acctEmail" type="email" autocomplete="email" value="${esc(Tutor.lastEmail())}" placeholder="toi@exemple.fr" /><button type="button" class="btn sm" id="acctSend">${ic('envelope-simple')}Recevoir le lien</button></div>
          <div id="acctCodeRow" hidden><label for="acctCode">Ou colle le code reçu par e-mail</label>
          <div class="row-btns"><input id="acctCode" inputmode="numeric" autocomplete="one-time-code" placeholder="123456" /><button type="button" class="btn ghost sm" id="acctVerify">Valider le code</button></div></div>
          <p class="hint" id="acctErr" role="alert"></p>` : ''}
        </fieldset>
        ${window.Org ? `<fieldset class="field">
          <legend>Espace professionnel</legend>
          <p class="hint">Pour se former avec son équipe, à partir des documents de l’entreprise. Ton espace personnel reste séparé, sur cet appareil.</p>
          ${Org.list().length ? `<ul class="org-list">${Org.list().map((o) => `<li><a href="#/org/${o.id}" data-close-modal>${esc(o.name)}</a><small>${Org.ROLES[o.role] || o.role}</small></li>`).join('')}</ul>` : ''}
          <div class="row-btns"><button type="button" class="btn ghost sm" id="orgCreate">${ic('plus')}Créer une organisation</button><a class="btn ghost sm" href="#/rejoindre" data-close-modal>${ic('door-open')}Rejoindre avec une invitation</a></div>
        </fieldset>` : ''}
        <fieldset class="field">
          <legend>Sauvegarde</legend>
          <p class="hint">${state.stats.lastExport ? `Dernier fichier de sauvegarde : ${esc(dayLabelLong(state.stats.lastExport))}.` : 'Tes cours ne sont enregistrés que dans ce navigateur. Télécharge une sauvegarde de temps en temps.'}
            ${Store.status.persisted === true ? ' Stockage protégé contre l’effacement automatique.' : ''}</p>
          <div class="row-btns">
            <button type="button" class="btn ghost sm" id="expAll">${ic('download-simple')}Télécharger une sauvegarde</button>
            <button type="button" class="btn ghost sm" id="impAll">${ic('upload-simple')}Restaurer un fichier</button>
            ${Store.rescued() ? `<button type="button" class="btn ghost sm" id="rescueDl">${ic('lifebuoy')}Données illisibles mises de côté</button>` : ''}
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
      $('#expAll', el).onclick = () => exportBackup();
      $('#onbAgain', el).onclick = () => { closeModal(); openOnboarding(); };
      const out = $('#acctOut', el); if (out) out.onclick = () => { Tutor.signOut(); try { localStorage.removeItem('arbor:orgs'); } catch (e) { /* rien */ } paintSpace(); closeModal(); FX.toast('Déconnecté', 'success'); };
      const oc = $('#orgCreate', el); if (oc) oc.onclick = () => Org.createModal(orgDeps());
      $$('[data-close-modal]', el).forEach((a) => { a.addEventListener('click', () => closeModal()); });
      const authDeps = { after() { if (window.Org && Tutor.signedIn()) Org.refresh().then(paintSpace).catch(() => {}); render(view); FX.toast('Connecté : tu peux parler à Pousse', 'success'); } };
      const ap = $('#acctPwd', el); if (ap) ap.onclick = () => { closeModal(); Welcome.auth(authDeps, 'login'); };
      const an = $('#acctNew', el); if (an) an.onclick = () => { closeModal(); Welcome.auth(authDeps, 'signup'); };
      const send = $('#acctSend', el);
      if (send) {
        const err = $('#acctErr', el);
        send.onclick = async () => {
          const email = $('#acctEmail', el).value.trim();
          if (!/^\S+@\S+\.\S+$/.test(email)) { err.textContent = 'Saisis une adresse e-mail valide.'; return; }
          try { await Tutor.signIn(email); err.textContent = 'Lien envoyé. Ouvre-le sur cet appareil, ou colle le code ci-dessous.'; $('#acctCodeRow', el).hidden = false; send.textContent = 'Lien envoyé'; }
          catch (e) { err.textContent = e.message; }
        };
        $('#acctVerify', el).onclick = async () => {
          try { await Tutor.verifyCode($('#acctEmail', el).value.trim(), $('#acctCode', el).value); closeModal(); FX.toast('Connecté', 'success'); }
          catch (e) { err.textContent = e.message; }
        };
      }
      if (window.Tutor && Tutor.signedIn()) Promise.all([Tutor.email(), Tutor.usage()]).then(([mail, used]) => { const e = $('#acctState', el); if (e) e.textContent = `Connecté${mail ? ` : ${mail}` : ''}.${used != null ? ` ${used} échange${used > 1 ? 's' : ''} avec Pousse ce mois-ci.` : ''}`; }).catch(() => {});
      const rb = $('#rescueDl', el); if (rb) rb.onclick = () => downloadText(Store.rescued(), 'arbor-donnees-illisibles.json');
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

  const dayLabelLong = (t) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(t));
  function downloadText(text, file) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = file;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  // Sauvegarde complète : cours, progression, statistiques, trophées, réglages (sans la clé)
  async function exportBackup() {
    state.stats.lastExport = Date.now();
    save(); Store.flush();
    const b = Store.backup(state);
    b.obs = await Obs.all(); // journal des observations (preuves de maîtrise)
    downloadText(JSON.stringify(b), `arbor-sauvegarde-${SRS.dayKey()}.json`);
    FX.toast('Sauvegarde complète téléchargée', 'success');
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
    let res = null, rawObs = [];
    try { const raw = JSON.parse(await file.text()); res = Store.readFile(raw); rawObs = Array.isArray(raw.obs) ? raw.obs : []; } catch (err) { res = null; }
    if (!res) { FX.toast('Ce fichier n’est pas une sauvegarde Arbor. Choisis un fichier .json exporté depuis Arbor.', 'error', 4200); return; }
    const doMerge = async () => {
      if (rawObs.length) await Obs.putMany(rawObs); // même identifiant = même observation : pas de doublon
      const r = Store.merge(state, res.subjects);
      if (res.xp != null) state.xp = Math.max(state.xp, res.xp);
      save(); Store.flush(); closeModal(); renderXP(); go('#/cours');
      const parts = [r.added && plural(r.added, 'sujet ajouté', 'sujets ajoutés'), r.updated && plural(r.updated, 'sujet mis à jour', 'sujets mis à jour'), r.kept && plural(r.kept, 'déjà à jour', 'déjà à jour')].filter(Boolean);
      FX.toast(parts.join(', ') || 'Rien de nouveau', 'success', 3600);
    };
    if (res.kind !== 'full') { doMerge(); return; }
    const when = res.exportedAt ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(res.exportedAt)) : '';
    openModal(`<h2 id="modalTitle">Restaurer la sauvegarde</h2>
      <p class="modal-lede">${plural(res.subjects.length, 'sujet', 'sujets')}${when ? `, sauvegardés le ${esc(when)}` : ''}.</p>
      <div class="restore-opts">
        <button type="button" class="btn" id="rsReplace">${ic('arrow-counter-clockwise', true)}Tout remplacer</button>
        <small class="hint">Retrouve exactement l’état sauvegardé : cours, progression, série, trophées. Ce qui est sur cet appareil est remplacé.</small>
        <button type="button" class="btn ghost" id="rsMerge">${ic('plus', true)}Ajouter les cours</button>
        <small class="hint">Garde ce qui est ici et ajoute les cours absents. Un cours déjà présent n’est remplacé que s’il est plus récent dans le fichier.</small>
      </div>`, (el) => {
      $('#rsMerge', el).onclick = doMerge;
      $('#rsReplace', el).onclick = async () => {
        await Obs.clear(); await Obs.putMany(rawObs);
        Store.replaceAll(state, res.data);
        Store.save(state);
        if (!Store.flush() && Store.status.lastError) return; // l'alerte de sauvegarde s'affiche déjà
        location.hash = '#/'; location.reload();
      };
    });
  });

  /* ---------- Import PDF ---------- */
  let pdfFile = null;
  function pdfModal() {
    pdfFile = null;
    const hasKey = !!(window.AI && AI.available()); // connecté : analyse avancée par le serveur Arbor
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
            <span><b>Analyse intelligente</b><small>${llmOk ? 'Gratuite et privée : ajoute des points clés et des questions à chaque partie. Prend quelques minutes.' : window.LocalAI && LocalAI.supported() ? 'À activer dans les réglages.' : 'Disponible sur ordinateur.'}</small></span></label>
          <label class="mode ${hasKey ? '' : 'locked'}"><input type="radio" name="mode" value="ai" ${hasKey ? 'checked' : 'disabled'} />
            <span class="mode-ic" aria-hidden="true">${ic('sparkle', true)}</span>
            <span><b>Analyse avancée</b><small>${hasKey ? 'Ajoute à chaque partie des points clés et des questions, vérifiés sur ton document. Seul le texte extrait est envoyé, pas le fichier.' : 'Connecte-toi gratuitement (Réglages, puis Compte) pour l’activer.'}</small></span></label>
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
  async function enrichTree(tree, setMsg, setPct, w) {
    const parts = [];
    (function w(n) { if ((n.notes || '').length >= 250) parts.push(n); (n.children || []).forEach(w); })(tree);
    const todo = parts.slice(0, 14);
    for (let i = 0; i < todo.length; i++) {
      const n = todo[i];
      setMsg(`« ${n.title} » (${i + 1}/${todo.length})`);
      try {
        const r = await w.enrich(n.title, n.notes, {
          onStatus: setMsg,
          onProgress: (p) => { setMsg(`Arbor se prépare… ${Math.round(p * 100)} %`); setPct(0.1 + p * 0.3); },
        });
        const have = new Set((n.keyPoints || []).map((k) => k.toLowerCase()));
        n.keyPoints = [...(n.keyPoints || []), ...r.keyPoints.filter((k) => !have.has(k.toLowerCase()))].slice(0, 6);
        n.exercises = [...(n.exercises || []), ...r.exercises.map((e) => ({ q: String(e.q), a: String(e.a) }))];
      } catch (err) {
        if (i === 0 || ['auth', 'quota'].includes(err.kind)) throw err; // le moteur ne répond pas du tout : on prévient
        console.warn(err);
      }
      setPct(0.4 + ((i + 1) / todo.length) * 0.6);
    }
  }

  let importMeta = {};
  async function runPdf(file, mode, into) {
    importMeta = {};
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
      {
        const res = await PdfImport.analyze(file, (p) => { setPct(p * (mode === 'local' ? 0.9 : 0.4)); setMsg(`Lecture des pages… ${Math.round(p * 100)} %`); });
        setMsg('Classement des informations…');
        tree = res.tree;
        importMeta = { setAside: res.setAside, topicsOnly: res.topicsOnly, form: res.form, unreadable: res.unreadable };
        if ((res.isProgramme || res.hasPlan) && !into) { Mascot.react('stop-reading'); return programChoice(res); }
        // analyse intelligente (IA locale) ou avancée (serveur) : le texte du cours reste celui du document
        if (mode === 'llm' || mode === 'ai') {
          const w = mode === 'ai' ? (window.AI && AI.available() ? { kind: 'serveur', enrich: AI.enrich } : null) : (useLocal() ? writer() : null);
          if (w) await enrichTree(tree, setMsg, setPct, w);
        }
      }
      setPct(1);
      Mascot.react('imported');
      count('pdf');
      previewImport(normalize(tree), into, importMeta);
    } catch (err) {
      console.error(err);
      Mascot.react('stop-reading');
      const msg = (err && err.message) || 'Erreur inconnue.';
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
    $('#asCourse').onclick = () => previewImport(normalize(res.tree), false, { setAside: res.setAside, topicsOnly: res.topicsOnly, form: res.form, unreadable: res.unreadable });
  }

  /* Bilan de l'analyse, affiché avant de créer le cours : ce qui a été écarté et pourquoi, avec les pages */
  function importReport(meta) {
    const out = [];
    const pp = (ps) => (ps && ps.length ? ` (p. ${ps.join(', ')})` : '');
    if (meta.unreadable && meta.unreadable.length) out.push(`<p class="ir-warn">${ic('warning')}Pages illisibles, écartées${pp(meta.unreadable)} : le texte du PDF y est mal encodé ou scanné.</p>`);
    if (meta.form) out.push(`<p class="ir-warn">${ic('clipboard-text')}Ce document ressemble à un formulaire ou à une grille à remplir : il y a peu de contenu à apprendre.</p>`);
    if (meta.topicsOnly) out.push(`<p class="ir-info">${ic('list-checks')}Ce document liste des sujets sans les expliquer. Arbor les garde comme notions à apprendre, avec leur page, et peut en rédiger le cours.</p>`);
    const sa = meta.setAside || {};
    const kinds = Object.keys(sa);
    if (kinds.length) out.push(`<div class="ir-aside"><b>${ic('folder-simple-dashed')}Mis de côté (pas du cours)</b><ul>${kinds.map((k) => `<li><span>${CTX[k][0]}</span> <small>${sa[k].count} passage${sa[k].count > 1 ? 's' : ''}${pp(sa[k].pages)}${sa[k].titles.length ? ` · ${sa[k].titles.map(esc).join(' · ')}` : ''}</small></li>`).join('')}</ul><small>Tu les retrouveras dans « Ce que dit ce document », sur la page du cours.</small></div>`);
    return out.length ? `<div class="field import-report">${out.join('')}</div>` : '';
  }

  function previewImport(root, into, meta = {}) {
    let count = 0, kps = 0, exs = 0;
    walk(root, (n) => { count++; kps += n.keyPoints.length; exs += (n.exercises || []).length; });
    const sel = { color: PALETTE[state.subjects.length % PALETTE.length], icon: 'book-open' };
    // Chapitres dont les notions n'ont que leur titre (bilan, programme détaillé) : Arbor peut en rédiger le cours
    const toWrite = root.children.filter((c) => c.children.length >= 2 && c.children.filter((x) => !x.notes.trim() && !x.children.length).length >= 2);
    const emptyN = toWrite.reduce((a, c) => a + c.children.filter((x) => !x.notes.trim()).length, 0);
    const outline = (n) => `<li><span>${esc(n.title)}</span>${n.keyPoints.length ? ` <em class="num">${ic('star', true)}${n.keyPoints.length}</em>` : ''}
      ${n.children.length ? `<ul>${n.children.map(outline).join('')}</ul>` : ''}</li>`;
    $('#modalBody').innerHTML = `
      <h2 id="modalTitle">Cours structuré</h2>
      <p class="modal-lede">${plural(count - 1, 'partie', 'parties')} et ${plural(kps, 'point clé extrait', 'points clés extraits')}${exs ? `, ${plural(exs, 'exercice', 'exercices')}` : ''}. Tu pourras tout modifier ensuite.</p>
      <form id="pvForm" class="form">
        ${importReport(meta)}
        ${into ? '' : `<div class="field"><label for="pvTitle">Titre du sujet</label><input id="pvTitle" name="title" autocomplete="off" value="${esc(root.title)}" /></div>${pickers(sel.color, sel.icon)}`}
        <div class="field">
          <span class="label-like">Aperçu du plan</span>
          <div class="outline"><ul>${root.children.map(outline).join('') || '<li>Aucune partie détectée : le texte sera rangé dans la vue d’ensemble.</li>'}</ul></div>
        </div>
        ${!into && emptyN >= 3 ? `<label class="check"><input type="checkbox" id="pvWrite" checked /> Rédiger le cours des ${emptyN} notions : le document ne donne que leur nom, Arbor écrit chaque cours à partir de sources fiables, en arrière-plan</label>` : ''}
        ${Object.keys(meta.setAside || {}).length ? `<label class="check"><input type="checkbox" id="pvKeepAside" /> Arbor s’est trompé : remettre ces passages dans le cours</label>` : ''}
        <div class="row-btns end"><button type="button" class="btn ghost" data-close>Annuler</button><button class="btn">${ic('check')}${into ? 'Ajouter ici' : 'Créer le cours'}</button></div>
      </form>`;
    const el = $('#modalBody');
    if (!into) bindPickers(el, sel);
    $('[data-close]', el).onclick = closeModal;
    $('#pvForm', el).onsubmit = (e) => {
      e.preventDefault();
      if ($('#pvKeepAside', el) && $('#pvKeepAside', el).checked) {
        walk(root, (n) => { if (n.context && n.context.length) { n.notes = [n.notes.trim(), ...n.context.map((x) => (x.title ? `### ${x.title}\n${x.text}` : x.text))].filter(Boolean).join('\n\n'); delete n.context; } });
      }
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
        const write = $('#pvWrite', el) && $('#pvWrite', el).checked;
        save(); closeModal();
        if (write) { const ids = new Set(toWrite.map((c) => c.id)); setTimeout(async () => { await writeCourses(s, s.root.children.filter((c) => ids.has(c.id))); render(view); }, 300); }
        if (onbAfterCourse(s)) return;
        // Plusieurs chapitres : on ouvre directement la carte, pour voir la structure du cours d'un coup d'œil
        const zones = s.root.children.filter((c) => c.children.length).length >= 2;
        mapMode = 'zones'; Explore.reset();
        go(link(s.id, s.root.id, zones ? 'carte' : 'fiche'));
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
      case 'unclamp': { const v = t.previousElementSibling; if (v) v.classList.remove('clamp'); t.remove(); break; }
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
      case 'quick-start': count('quick'); buildSession({ type: 'all' }); study.queue = study.queue.slice(0, 5); study.quick = true; preparePrompt(); go('#/reviser'); break;
      case 'plan-edit': planModal(); break;
      case 'reveal': reveal(); break;
      case 'mod-pretest-done': { const n = currentNode().node; const v = ($('#modulePretest') || {}).value || ''; if (v.trim().length < 10) { FX.toast('Écris au moins une phrase, même approximative.', 'error'); break; } n.module.pretest = v; gainXP(3); touch(); renderFiche(); break; }
      case 'mod-skip-pretest': { const n = currentNode().node; n.module.skipPretest = true; touch(); renderFiche(); break; }
      case 'start-lesson': {
        const sj = subjectById(view.id); const f = find(sj.root, t.dataset.id); if (!f) break;
        runLesson(sj, f.node);
        break;
      }
      case 'session-start': startDaySession(); break;
      case 'map-tree': mapMode = 'tree'; renderMap(); break;
      case 'map-zones': mapMode = 'zones'; renderMap(); break;
      case 'talk': { const sj = subjectById(view.id); const f = sj && find(sj.root, t.dataset.id); if (f) openTalk(sj, f.node, t.dataset.mode); break; }
      case 'lesson-next': { const l = Mastery.nextLesson(state, canLesson); if (l) runLesson(l.s, l.n); break; }
      case 'mod-learned': { const n = currentNode().node; n.module.learned = true; gainXP(3); touch(); renderFiche(); break; }
      case 'mod-research': { const c = currentNode(); researchModule(subjectById(view.id), c.node); break; }
      case 'ctx-restore': {
        const c = currentNode(); const n = c.node;
        if (!n.context || !n.context.length) break;
        n.notes = [n.notes.trim(), ...n.context.map((x) => (x.title ? `### ${x.title}\n${x.text}` : x.text))].filter(Boolean).join('\n\n');
        delete n.context;
        touch(); render(view); FX.toast('Remis dans les notes', 'success');
        break;
      }
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
  // Trophées déjà mérités (anciens utilisateurs, ou activité hors session) : célébrés au démarrage
  setTimeout(checkTrophies, 1500);
  // À minuit (ou au retour sur l'onglet), les cartes dues changent
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateBadges(); else Store.flush(); });
  addEventListener('pagehide', () => Store.flush());
  Store.persist();
  /* Bandeau qui reste tant que la sauvegarde échoue : l'étudiant doit le savoir avant de perdre son travail */
  function saveAlert(kind) {
    let b = $('#saveAlert');
    if (!kind) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'saveAlert'; b.className = 'save-alert'; b.setAttribute('role', 'alert'); app.before(b); }
    const msg = kind === 'quota' ? 'Le stockage de ce navigateur est plein : tes dernières modifications ne sont pas enregistrées.'
      : kind === 'blocked' ? 'Tes données enregistrées étaient illisibles. Arbor ne les écrase pas : télécharge-les avant de continuer.'
      : 'Arbor n’arrive pas à enregistrer tes modifications dans ce navigateur.';
    b.innerHTML = `<i class="ph-fill ph-warning" aria-hidden="true"></i><span>${msg}</span><button type="button" class="btn sm">${kind === 'blocked' ? 'Télécharger' : 'Télécharger une sauvegarde'}</button>`;
    b.querySelector('button').onclick = () => kind === 'blocked' ? downloadText(localStorage.getItem('arbor:v1') || '', 'arbor-donnees-illisibles.json') : exportBackup();
  }
  Store.onError(saveAlert);
  const isDesktop = () => matchMedia('(min-width: 901px) and (hover: hover) and (pointer: fine)').matches;
  // Premier lancement : rien d'utilisé sur cet appareil (seul le sujet de découverte, intact)
  const freshStart = () => !!window.Onboarding && !state.profile && !(window.Journey && Journey.get().studentDone) && Store.status.load === 'ok' && state.subjects.every(untouchedDemo);
  // Après l'accueil (compte créé, connexion, essai sans compte, invitation) : l'introduction de l'app si rien n'est encore fait
  const welcomeDeps = {
    after(how) {
      if (window.Org && window.Tutor && Tutor.signedIn()) Org.refresh().then(paintSpace).catch(() => {});
      if (how === 'join') { go(Org && Org.pendingInvite() ? `#/rejoindre/${Org.pendingInvite()}` : '#/rejoindre'); return; }
      if (how === 'create') { go('#/org/nouvelle'); return; }
      if (String(how).startsWith('org:')) { if (window.Org) Org.setSpace(how.slice(4)); go(`#/org/${how.slice(4)}`); return; }
      if (window.Org) Org.setSpace('personal');
      if (!/^#\/?$/.test(location.hash) && location.hash) go('#/'); else render(view);
      paintSpace();
      if (freshStart()) setTimeout(openOnboarding, 200);
      else if (how === 'login') FX.toast('Connecté : tu peux parler à Pousse', 'success');
    },
  };
  if (window.Welcome) Welcome.deps(welcomeDeps);
  if (window.Tutor) {
    const n = Tutor.notice();
    // Retour d'un lien e-mail : nouveau mot de passe (récupération) ou adresse confirmée (inscription)
    if (n && n.ok && n.type === 'recovery' && window.Welcome) setTimeout(() => Welcome.handle(n), 300);
    else if (n) {
      if (window.Welcome) Welcome.handle(n);
      setTimeout(() => FX.toast(n.ok ? (n.type === 'signup' ? 'Adresse confirmée : ton compte est actif' : 'Connecté : tu peux parler à Pousse') : n.msg, n.ok ? 'success' : 'error', 4200), 500);
    }
  }
  $('#spaceBtn').onclick = () => Org.openSwitcher(orgDeps());
  if (window.Org && window.Tutor && Tutor.signedIn()) {
    Org.refresh().then(paintSpace).catch(() => {});
    if (Org.pendingInvite() && !/^#\/rejoindre/.test(location.hash)) go(`#/rejoindre/${Org.pendingInvite()}`);
  }
  // Mobile : accueil et compte d'abord (une seule fois), puis l'introduction. Ordinateur : rien ne s'ouvre tout seul.
  if (!isDesktop() && !/^#\/(rejoindre|org)/.test(location.hash) && freshStart() && !(window.Welcome && Welcome.active())) {
    if (window.Welcome && Welcome.shouldOpen()) setTimeout(() => Welcome.open(welcomeDeps), 120);
    // connecté mais parti avant d'avoir choisi son espace : on reprend à ce choix
    else if (window.Welcome && Welcome.needsSpace() && !Welcome.active()) setTimeout(() => Welcome.space(welcomeDeps), 120);
    else setTimeout(openOnboarding, 250);
  }
  if (Store.status.readOnly) saveAlert('blocked');
  else if (Store.status.load !== 'ok') {
    const day = Store.status.bakAt ? dayLabelLong(Store.status.bakAt + 'T12:00') : '';
    setTimeout(() => openModal(`<h2 id="modalTitle">Tes données étaient abîmées</h2>
      <p class="modal-lede">${Store.status.load === 'backup' ? `Arbor a rouvert la copie de secours du ${esc(day)}. Ce que tu as fait depuis n’y est peut-être pas.` : 'Arbor n’a trouvé aucune copie de secours lisible. Si tu as un fichier de sauvegarde, restaure-le.'}</p>
      <p class="hint">Les données abîmées sont gardées à part : tu peux les télécharger depuis les Réglages, rubrique Sauvegarde.</p>
      <div class="row-btns end">${Store.status.load === 'lost' ? `<button type="button" class="btn ghost" id="rcRestore">${ic('upload-simple')}Restaurer un fichier</button>` : ''}<button type="button" class="btn" id="rcOk">Compris</button></div>`, (el) => {
      $('#rcOk', el).onclick = closeModal;
      const r = $('#rcRestore', el); if (r) r.onclick = () => $('#jsonInput').click();
    }), 400);
  }
})();
