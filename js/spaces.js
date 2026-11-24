/* Arbor Learning 2.0 · espaces de l'application (ordinateur d'abord, téléphone aussi).
   Huit espaces : Mon espace · Explorer · Mon apprentissage · Studio pédagogique · Pratiquer · Ma connaissance ·
   Compagnon Arbor · Progression et mémoire. Ce module compose les moteurs existants (Mastery, SRS, Insight, Obs,
   Parcours) ; il n'invente aucune donnée : tout vient des cours de l'apprenant, sur son appareil.
   - Ma connaissance : l'arbre de savoir vivant (chaque branche = un chapitre, chaque feuille = une notion, sa couleur =
     son état réel), les prérequis détectés par Insight, et ce qu'il faut consolider.
   - Compagnon : répond en cherchant dans les cours de l'apprenant et cite ses sources ; sans passage trouvé, il le dit.
   - Progression et mémoire : la courbe d'oubli estimée par FSRS (une estimation, pas une certitude). */
(function () {
  let d = null;
  const NAV = [
    ['home', '#/', 'house-simple', 'Mon espace'],
    ['explorer', '#/explorer', 'compass', 'Explorer'],
    ['courses', '#/cours', 'books', 'Mon apprentissage'],
    ['studio', '#/studio', 'pencil-ruler', 'Studio pédagogique'],
    ['pratiquer', '#/pratiquer', 'barbell', 'Pratiquer'],
    ['connaissance', '#/connaissance', 'tree-structure', 'Ma connaissance'],
    ['compagnon', '#/compagnon', 'chats-circle', 'Compagnon Arbor'],
    ['progress', '#/progression', 'chart-line-up', 'Progression et mémoire'],
  ];
  const ROUTES = { explorer: 'explorer', studio: 'studio', pratiquer: 'pratiquer', connaissance: 'connaissance', compagnon: 'compagnon', memoire: 'progress' };
  const plural = (n, one, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
  const head = (eyebrow, title, sub, right = '') => `<header class="d2-head"><div><p class="d2-eyebrow">${eyebrow}</p><h1>${title}</h1>${sub ? `<p class="d2-sub">${sub}</p>` : ''}</div>${right ? `<div class="d2-head-r">${right}</div>` : ''}</header>`;
  const card = (cls, i, title, body, link = '') => `<section class="b-card ${cls}" style="--i:${i}"><header class="b-h"><h2>${title}</h2>${link}</header>${body}</section>`;
  const empty = (icon, t) => `<p class="b-empty">${d.ic(icon)}<span>${t}</span></p>`;
  const tile = (attrs, icon, t, s) => `<${attrs.startsWith('href') ? 'a' : 'button type="button"'} class="sp-tile" ${attrs}><span class="sp-ico">${d.ic(icon)}</span><span><b>${t}</b><small>${s}</small></span></${attrs.startsWith('href') ? 'a' : 'button'}>`;

  /* Barre latérale Learning (ordinateur) : huit espaces, puis les espaces professionnels si le compte en a */
  function sideNav(active) {
    return `<nav class="sp-nav" aria-label="Espaces Arbor">${NAV.map(([k, h, i, l]) => `<a href="${h}" data-sp="${k}" ${k === active ? 'aria-current="page"' : ''}>${d.ic(i, k === active)}<span>${l}</span></a>`).join('')}</nav>`;
  }
  function paintNav(active) {
    const box = document.getElementById('spNav');
    if (!box) return;
    box.querySelectorAll('[data-sp]').forEach((a) => { if (a.dataset.sp === active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  }

  const allNotions = (state) => state.subjects.flatMap((s) => Mastery.notions(s).map((x) => ({ ...x, s })));

  /* ---------- Explorer : commencer un nouveau domaine ---------- */
  function explorer(app, state) {
    const subs = state.subjects;
    app.innerHTML = `<div class="d2 sp">${head('Explorer', 'Que veux-tu apprendre ?', 'Les mathématiques, la programmation, une langue, une procédure, une collection : choisis un point de départ. Arbor découpe, explique à partir de situations, puis te fait pratiquer.')}
      <form class="ex-start" id="exStart">
        <label class="ex-q"><span>Un sujet, une question ou un objectif</span><input class="input" name="q" required maxlength="200" placeholder="Les fractions · Pourquoi le ciel est bleu ? · Apprendre les boucles en Python" autocomplete="off" /></label>
        <label><span>Ton niveau</span><select class="input" name="niveau"><option value="debutant">Je découvre</option><option value="intermediaire">J’ai des bases</option><option value="avance">Je veux approfondir</option></select></label>
        <label><span>Ton intention</span><select class="input" name="intention"><option value="comprendre">Comprendre vraiment</option><option value="examen">Réussir un examen</option><option value="pratique">M’en servir au travail</option><option value="curiosite">Par curiosité</option></select></label>
        <button class="btn">${d.ic('sparkle')}Commencer</button>
      </form>
      <p class="b-note">${d.ic('shield-check')} Arbor part d’une source ouverte réelle (Wikipédia, citée) ou de tes documents, jamais d’une source inventée.</p>
      <div class="sp-tiles">
        ${tile('data-act="new-subject"', 'plus-circle', 'Un nouveau sujet', 'Donne un thème : Arbor prépare un cours sourcé, notion par notion')}
        ${tile('data-act="import-pdf"', 'file-arrow-up', 'Mon document', 'Un cours, un manuel, une fiche produit : étudié tel quel, avec ses pages')}
        ${tile('href="#/apprendre/demo"', 'path', 'Découvrir un parcours', 'Situation, explication, pratique, transfert : l’apprentissage Arbor en 5 minutes')}
        ${tile('data-act="door" data-entry="conversation"', 'chats-circle', 'En discutant', 'Dis ce que tu veux comprendre ; Pousse t’aide à le structurer')}
      </div>
      ${subs.length ? `<section class="b-card" style="--i:4"><header class="b-h"><h2>Tes domaines</h2></header><ul class="sp-subs">${subs.map((s) => { const c = Mastery.counts(Mastery.notions(s)); return `<li><a href="#/s/${s.id}/${s.root.id}"><span class="sp-dot" style="--c:${s.color}"></span><b>${d.esc(s.title)}</b><small class="num">${c.total} notion${c.total > 1 ? 's' : ''} · ${c.mastered + (c.exercised || 0)} maîtrisée${c.mastered + (c.exercised || 0) > 1 ? 's' : ''}</small></a></li>`; }).join('')}</ul></section>` : ''}
    </div>`;
    bindExplorer(app);
  }

  function bindExplorer(app) {
    const f = app.querySelector('#exStart');
    if (!f) return;
    f.onsubmit = (e) => {
      e.preventDefault();
      const q = f.elements.q.value.trim();
      if (!q) return;
      const question = /\?$|^(pourquoi|comment|qu['’]est|quel|quelle|est-ce)/i.test(q);
      const objectif = /^(apprendre|savoir|maîtriser|réussir|comprendre|être capable)/i.test(q);
      const titre = q.replace(/^(apprendre|savoir|maîtriser|comprendre)\s+(à\s+|les?\s+|la\s+|l['’]\s*)?/i, '').replace(/\?$/, '').trim() || q;
      const r = d.creerSujet(titre.charAt(0).toUpperCase() + titre.slice(1), { niveau: f.elements.niveau.value, intention: f.elements.intention.value, ...(question ? { question: q } : {}), ...(objectif ? { objectif: q } : {}) });
      d.go(`#/apprendre/${r.sid}/${r.nid}`);
    };
  }

  /* ---------- Studio pédagogique : construire ses propres parcours ---------- */
  function studio(app, state) {
    const withFiche = allNotions(state).filter((x) => x.n.fiche).length;
    app.innerHTML = `<div class="d2 sp">${head('Studio pédagogique', 'Construis tes parcours', 'Pars d’un plan, d’un document ou d’un programme. Arbor ne sert un parcours guidé que depuis une fiche vérifiée ; le reste reste en lecture et en révision.')}
      <ol class="d2-flow">${['Situation', 'Compréhension', 'Explication', 'Pratique', 'Vérification', 'Maîtrise'].map((s, i) => `<li style="--i:${i}"><span>${i + 1}</span>${s}</li>`).join('')}</ol>
      <div class="sp-tiles">
        ${tile('data-act="new-subject"', 'tree-structure', 'Depuis un plan ou un programme', 'Des thèmes, un plan indenté : chaque ligne devient une partie')}
        ${tile('data-act="import-pdf"', 'file-text', 'Depuis un document', 'PDF analysé localement ; les passages hors cours restent à part')}
        ${tile('data-act="door" data-entry="dicter"', 'microphone', 'Depuis ce que je sais', 'Dicte ou écris : Arbor structure, tu valides')}
      </div>
      <section class="b-card" style="--i:3"><header class="b-h"><h2>Parcours guidés disponibles</h2></header>
        ${withFiche ? `<p class="b-note">${plural(withFiche, 'notion')} avec une fiche vérifiée : situation, confusions, exercices et transfert.</p>` : empty('seal-check', 'Aucune notion n’a encore de fiche vérifiée. Les fiches de référence et la génération contrôlée les ajoutent notion par notion.')}</section>
    </div>`;
  }

  /* ---------- Pratiquer ---------- */
  function pratiquer(app, state) {
    const ns = allNotions(state);
    const ov = { due: ns.filter((x) => x.n.srs && x.n.srs.last != null && SRS.isDue(x.n.srs)).length };
    const fragile = ns.filter((x) => x.state === 'fragile').slice(0, 6);
    const parcours = ns.filter((x) => x.n.fiche).slice(0, 6);
    const due = (ov && ov.due) || 0;
    app.innerHTML = `<div class="d2 sp">${head('Pratiquer', 'S’entraîner, pour de vrai', 'Retrouver de mémoire, appliquer dans une situation, transférer ailleurs : c’est ce qui fait tenir une connaissance.')}
      <div class="dbento">
        ${card('b-w5', 0, 'Révisions du jour', `<div class="b-big"><b class="num">${due}</b><span>${due ? `carte${due > 1 ? 's' : ''} à retrouver de mémoire, au bon moment` : 'rien à réviser maintenant'}</span></div>
          ${due ? '<button type="button" class="btn" data-act="session-start">Commencer</button>' : '<button type="button" class="btn ghost" data-act="quick-start">5 minutes d’entraînement libre</button>'}`)}
        ${card('b-w7', 1, 'Notions fragiles', fragile.length ? `<ul class="sp-list">${fragile.map((x) => `<li><a href="#/s/${x.s.id}/${x.n.id}"><span class="st-dot" style="--sc:${Mastery.STATES[x.state].c}"></span><b>${d.esc(x.n.title)}</b><small>${d.esc(Mastery.reasonOf(x.n, x.state))}</small></a></li>`).join('')}</ul>` : empty('check-circle', 'Aucune notion fragile.'))}
        ${card('b-w6', 2, 'Parcours guidés', parcours.length ? `<ul class="sp-list">${parcours.map((x) => `<li><a href="#/apprendre/${x.s.id}/${x.n.id}">${d.ic('path')}<b>${d.esc(x.n.title)}</b><small>${d.esc(x.s.title)}</small></a></li>`).join('')}</ul>` : `${empty('path', 'Pas encore de parcours sur tes notions.')}<a class="b-more" href="#/apprendre/demo">Essayer la démonstration ${d.ic('arrow-right')}</a>`)}
        ${card('b-w6', 3, 'Mises en situation avec Pousse', `<p class="b-note">${window.Tutor && Tutor.signedIn() ? 'Depuis une notion : dialogue socratique, « Enseigne-moi » ou mise en situation, toujours fondés sur tes passages.' : 'Avec un compte gratuit : Pousse te met en situation et diagnostique tes confusions, à partir de tes propres cours.'}</p>`)}
      </div></div>`;
  }

  /* ---------- Ma connaissance : l'arbre de savoir vivant ---------- */
  const DONE = ['mastered', 'exercised'];
  function tree(s, opts = {}) {
    const chapters = s.root.children.filter((c) => c.children.length);
    const loose = s.root.children.filter((c) => !c.children.length);
    const groups = [...chapters.map((c) => ({ c, ns: Insight.leaves(c) })), ...(loose.length ? [{ c: { id: 'loose', title: 'Autres notions' }, ns: loose }] : [])].slice(0, 8);
    const stateOf = new Map(Mastery.notions(s).map((x) => [x.n.id, x.state]));
    const leaves = groups.reduce((a, g) => a + Math.min(g.ns.length, 7), 0) || 1;
    const W = 980, rowH = 30, H = Math.max(320, leaves * rowH + 40), X0 = 70, X1 = 380, X2 = 680;
    let y = 30, paths = [], nodes = [], k = 0;
    const cy = H / 2;
    groups.forEach((g) => {
      const shown = g.ns.slice(0, 7), gy0 = y, gy1 = y + (shown.length - 1) * rowH, gy = (gy0 + gy1) / 2;
      const done = g.ns.filter((n) => DONE.includes(stateOf.get(n.id))).length, pct = g.ns.length ? Math.round((done / g.ns.length) * 100) : 0;
      paths.push(`<path class="kt-p" style="--k:${k++}" d="M${X0},${cy} C${X0 + 160},${cy} ${X1 - 160},${gy} ${X1},${gy}" pathLength="1"/>`);
      nodes.push(`<g class="kt-n kt-ch" style="--k:${k}" transform="translate(${X1},${gy})"><circle r="15"/><text text-anchor="middle" y="36">${d.esc(g.c.title).slice(0, 30)}</text><text class="kt-sub" text-anchor="middle" y="51">${pct} % maîtrisé · ${g.ns.length} notion${g.ns.length > 1 ? 's' : ''}</text></g>`);
      shown.forEach((n, i) => {
        const ny = gy0 + i * rowH, st = stateOf.get(n.id) || 'new';
        paths.push(`<path class="kt-p kt-leafp" style="--k:${k + i * 0.3}" d="M${X1 + 15},${gy} C${X1 + 130},${gy} ${X2 - 130},${ny} ${X2},${ny}" pathLength="1"/>`);
        nodes.push(`<a href="#/s/${s.id}/${n.id}" class="kt-link"><g class="kt-n kt-leaf st-${st}" style="--k:${k + 1 + i * 0.3};--sc:${Mastery.STATES[st].c}" transform="translate(${X2},${ny})"><circle r="${DONE.includes(st) ? 8 : 6}"/>${DONE.includes(st) ? '<path class="kt-bud" d="M0,-14 C6,-14 8,-8 0,-6 C-8,-8 -6,-14 0,-14Z"/>' : ''}<text x="16" y="4">${d.esc(n.title).slice(0, 40)}</text><title>${d.esc(n.title)} : ${Mastery.STATES[st].label}</title></g></a>`);
      });
      if (g.ns.length > 7) nodes.push(`<text class="kt-more" x="${X2 + 16}" y="${gy1 + rowH - 6}">+ ${g.ns.length - 7} autres</text>`);
      y = gy1 + rowH + 14;
      k += 1;
    });
    // prérequis détectés (Insight) entre notions affichées : liens en pointillé
    const pos = new Map();
    groups.forEach((g) => g.ns.slice(0, 7).forEach((n) => pos.set(n.id, true)));
    const root = `<g class="kt-n kt-root" style="--k:0" transform="translate(${X0},${cy})"><circle r="26"/><text text-anchor="middle" y="48">${d.esc(s.title).slice(0, 28)}</text></g>`;
    return `<svg class="ktree${opts.anim === false ? ' still' : ''}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Arbre de savoir de ${d.esc(s.title)}">${paths.join('')}${root}${nodes.join('')}</svg>`;
  }
  function connaissance(app, state, sel) {
    const subs = state.subjects;
    if (!subs.length) { app.innerHTML = `<div class="d2 sp">${head('Ma connaissance', 'Ton arbre de savoir', 'Il pousse à mesure que tu apprends.')}${empty('tree', 'Commence un domaine dans Explorer : ton arbre apparaîtra ici.')}</div>`; return; }
    const s = subs.find((x) => x.id === sel) || subs[0];
    const ns = Mastery.notions(s), c = Mastery.counts(ns);
    const A = Insight.analyze(s);
    const prereqs = [];
    (A.rel || []).forEach((r) => { if (r.kind === 'prerequis' || r.type === 'prerequis') prereqs.push(r); });
    const stOf = new Map(ns.map((x) => [x.n.id, x.state]));
    const toDeepen = ns.filter((x) => ['fragile', 'due', 'memorized', 'applied', 'learning'].includes(x.state)).slice(0, 6);
    app.innerHTML = `<div class="d2 sp">${head('Ma connaissance', 'Ton arbre de savoir', 'Chaque branche est un chapitre, chaque bourgeon une notion. Sa couleur dit ce que tes preuves montrent, pas ce que tu as lu.',
      subs.length > 1 ? `<div class="d2-seg">${subs.slice(0, 5).map((x) => `<a href="#/connaissance/${x.id}" ${x.id === s.id ? 'aria-current="page"' : ''}>${d.esc(x.title).slice(0, 22)}</a>`).join('')}</div>` : '')}
      <section class="kt-card" aria-label="Arbre de savoir">
        <header class="kt-head"><h2>${d.esc(s.title)}</h2><ul class="kt-legend">${['mastered', 'exercised', 'memorized', 'learning', 'fragile', 'new'].map((k) => `<li><i style="--sc:${Mastery.STATES[k].c}"></i>${Mastery.STATES[k].short}<b class="num">${c[k] || 0}</b></li>`).join('')}</ul></header>
        <div class="kt-scroll">${tree(s)}</div>
      </section>
      <div class="dbento">
        ${card('b-w6', 1, 'À approfondir', toDeepen.length ? `<ul class="sp-list">${toDeepen.map((x) => `<li><a href="#/s/${s.id}/${x.n.id}"><span class="st-dot" style="--sc:${Mastery.STATES[x.state].c}"></span><b>${d.esc(x.n.title)}</b><small>${Mastery.STATES[x.state].label}</small></a></li>`).join('')}</ul>` : empty('check-circle', 'Rien à approfondir pour l’instant.'))}
        ${card('b-w6', 2, 'Relations entre notions', (A.rel || []).length ? `<p class="b-note">${plural((A.rel || []).length, 'lien détecté', 'liens détectés')} à partir des termes employés (« Pourquoi ce lien ? » dans la carte du cours). Un prérequis fragile explique souvent l’erreur suivante.</p><a class="b-more" href="#/s/${s.id}/${s.root.id}/carte">Voir la carte du cours ${d.ic('arrow-right')}</a>` : empty('graph', 'Pas encore assez de texte pour relier les notions.'))}
      </div></div>`;
  }

  /* ---------- Compagnon : réponses sourcées dans tes cours ---------- */
  const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const STOP = new Set('le la les un une des de du et ou a au aux en est que qui quoi comment pourquoi quel quelle quels quelles dans pour par sur avec sans ce cette ces se sa son ses mon ma mes ton ta tes il elle on nous vous ils elles ne pas plus est sont etre avoir fait faire'.split(' '));
  const words = (t) => norm(t).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));
  function chercher(state, q) {
    const qs = [...new Set(words(q))];
    if (!qs.length) return [];
    const out = [];
    state.subjects.forEach((s) => Store.walk(s.root, (n) => {
      const parts = [n.title, n.notes, (n.keyPoints || []).join('. '), n.explain].filter(Boolean).join('\n');
      if (!parts.trim()) return;
      const w = words(parts), set = new Set(w);
      const hit = qs.filter((x) => set.has(x) || w.some((y) => y.startsWith(x.slice(0, 5)))).length;
      if (!hit) return;
      const title = words(n.title).filter((x) => qs.includes(x)).length;
      // passage : la phrase qui contient le plus de mots de la question
      const phrases = parts.split(/(?<=[.!?])\s+|\n+/).filter((p) => p.trim().length > 20);
      const best = phrases.map((p) => ({ p, sc: words(p).filter((x) => qs.includes(x)).length })).sort((a, b) => b.sc - a.sc)[0];
      out.push({ s, n, score: hit / qs.length + title * 0.5, extrait: best ? best.p.trim().slice(0, 320) : '' });
    }));
    return out.sort((a, b) => b.score - a.score).slice(0, 5);
  }
  function compagnon(app, state, q = '') {
    const res = q ? chercher(state, q) : [];
    const signed = window.Tutor && Tutor.signedIn();
    app.innerHTML = `<div class="d2 sp">${head('Compagnon Arbor', 'Pose ta question', 'Le compagnon cherche dans tes cours et tes documents, et cite ses sources. S’il ne trouve rien, il le dit : il n’invente pas.')}
      <form class="cp-ask" id="cpAsk"><input class="input" name="q" value="${d.esc(q)}" placeholder="Par exemple : pourquoi un levier démultiplie la force ?" aria-label="Ta question" autocomplete="off" /><button class="btn">${d.ic('magnifying-glass')}Chercher</button></form>
      ${q ? (res.length ? `<section class="cp-res" aria-live="polite"><p class="b-note">${plural(res.length, 'passage')} de tes cours</p>${res.map((r, i) => `<article class="cp-item" style="--i:${i}">
          <p class="cp-src">${d.ic('book-open')} ${d.esc(r.s.title)} › <b>${d.esc(r.n.title)}</b>${r.n.src && r.n.src.pages && r.n.src.pages.length ? ` <span class="mono">p. ${r.n.src.pages.join(', ')}</span>` : ''}</p>
          ${r.extrait ? `<blockquote>${d.esc(r.extrait)}</blockquote>` : ''}
          <div class="row-btns"><a class="btn sm ghost" href="#/s/${r.s.id}/${r.n.id}">${d.ic('arrow-square-out')}Ouvrir la notion</a>${r.n.fiche ? `<a class="btn sm" href="#/apprendre/${r.s.id}/${r.n.id}">${d.ic('path')}Pratiquer</a>` : ''}${signed ? `<button type="button" class="btn sm ghost" data-cp-talk="${r.s.id}|${r.n.id}">${d.ic('chats-circle')}En parler avec Pousse</button>` : ''}</div>
        </article>`).join('')}</section>` : `<section class="cp-res">${empty('magnifying-glass', 'Rien dans tes cours ne répond à cette question. Ajoute un document ou un sujet dans Explorer : le compagnon ne répond qu’à partir de sources.')}</section>`) : ''}
      ${q && signed && res.length ? `<div class="row-btns"><button type="button" class="btn" id="cpIA">${d.ic('sparkle')}Demander une explication au compagnon</button></div><div id="cpAnswer" aria-live="polite"></div>` : ''}
      ${!signed ? `<p class="b-note">${d.ic('info')} Avec un compte gratuit, Pousse peut aussi expliquer, te mettre en situation et diagnostiquer tes confusions, toujours à partir de tes passages.</p>` : ''}
    </div>`;
    app.querySelector('#cpAsk').onsubmit = (e) => { e.preventDefault(); const v = e.target.elements.q.value.trim(); d.go(`#/compagnon/${encodeURIComponent(v)}`); };
    const ia = app.querySelector('#cpIA');
    if (ia) ia.onclick = async () => {
      const box = app.querySelector('#cpAnswer'); ia.disabled = true;
      box.innerHTML = `<p class="b-note">${d.ic('hourglass')} Le compagnon lit tes passages…</p>`;
      try {
        const st = state.subjects.flatMap((s) => Mastery.notions(s).map((x) => x.state));
        const contexte = `${st.filter((x) => x === 'fragile').length} notion(s) fragile(s), ${st.filter((x) => ['mastered', 'exercised'].includes(x)).length} maîtrisée(s)`;
        const r = await Universel.compagnon(q, res, contexte);
        box.innerHTML = r.repond ? `<article class="cp-item cp-ai"><p class="cp-src">${d.ic('sparkle')} <b>Compagnon Arbor</b> · réponse fondée sur tes cours</p><p>${d.esc(r.reponse)}</p>
            ${r.citations.map((c) => `<blockquote>${d.esc(c.extrait)}<cite>${c.ref ? `<a href="#/s/${c.ref.sid}/${c.ref.nid}">${d.esc(c.ref.titre)}</a>` : ''}</cite></blockquote>`).join('')}
            ${r.exercice ? `<div class="cp-ex"><b>${d.ic('barbell')} À toi</b><p>${d.esc(r.exercice)}</p>${r.attendu ? `<details><summary>Voir la réponse attendue</summary><p>${d.esc(r.attendu)}</p></details>` : ''}</div>` : ''}
            ${r.approfondir.length ? `<p class="cp-more">Pour approfondir : ${r.approfondir.map((x) => `<a href="#/compagnon/${encodeURIComponent(x)}">${d.esc(x)}</a>`).join(' · ')}</p>` : ''}</article>`
          : `<article class="cp-item"><p class="cp-src">${d.ic('info')} <b>Information absente de tes sources</b></p><p>${d.esc(r.absent)}</p><a class="btn sm ghost" href="#/explorer">${d.ic('compass')}Ajouter une source dans Explorer</a></article>`;
      } catch (x) { box.innerHTML = `<p class="b-note">${d.esc(x.message)}</p>`; ia.disabled = false; }
    };
    app.querySelectorAll('[data-cp-talk]').forEach((b) => { b.onclick = () => { const [sid, nid] = b.dataset.cpTalk.split('|'); d.talk(sid, nid); }; });
  }

  /* ---------- Progression et mémoire : la courbe d'oubli estimée ---------- */
  function memoryCurve(state) {
    const cards = allNotions(state).map((x) => x.n.srs).filter((c) => c && c.last != null);
    if (!cards.length) return null;
    const days = 30, now = Date.now(), pts = [];
    for (let t = 0; t <= days; t++) pts.push(cards.reduce((a, c) => a + SRS.retrievability(c, now + t * SRS.DAY), 0) / cards.length);
    const W = 560, H = 160, path = pts.map((v, i) => `${i ? 'L' : 'M'}${((i / days) * W).toFixed(1)},${(H - 10 - v * (H - 30)).toFixed(1)}`).join(' ');
    return { n: cards.length, now: Math.round(pts[0] * 100), in7: Math.round(pts[7] * 100), in30: Math.round(pts[30] * 100),
      svg: `<svg class="mem-curve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Mémoire estimée sur 30 jours sans révision : ${Math.round(pts[0] * 100)} % aujourd’hui, ${Math.round(pts[30] * 100)} % dans 30 jours"><path class="sap-fill" d="${path} L${W},${H} L0,${H} Z"/><path class="sap-line" d="${path}" pathLength="1"/></svg>` };
  }
  function memoryBlock(state) {
    const m = memoryCurve(state);
    return `<section class="b-card b-w12 mem-card" style="--i:0"><header class="b-h"><h2>Ta mémoire dans les 30 prochains jours</h2><span class="d2-pill amber">${d.ic('info')} Estimation FSRS, pas une certitude</span></header>
      ${m ? `<div class="mem-row"><dl class="hero-kv mem-kv"><div><dt>Aujourd’hui</dt><dd class="num">${m.now} %</dd></div><div><dt>Dans 7 jours</dt><dd class="num">${m.in7} %</dd></div><div><dt>Dans 30 jours</dt><dd class="num">${m.in30} %</dd></div><div><dt>Notions suivies</dt><dd class="num">${m.n}</dd></div></dl>${m.svg}</div>
        <p class="b-note">Si tu ne révises plus rien. Chaque révision au bon moment remonte la courbe et l’aplatit : c’est ce que planifient tes séances.</p>` : empty('brain', 'La courbe apparaîtra après tes premières révisions.')}</section>`;
  }

  window.Spaces = { NAV, ROUTES, sideNav, paintNav, explorer, studio, pratiquer, connaissance, compagnon, memoryBlock, tree, chercher, use: (deps) => { d = deps; } };
})();
