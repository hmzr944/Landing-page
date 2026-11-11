/* Motion design d'Arbor : des mouvements qui parlent de croissance, pas seulement des fondus.
   - Pousse : les cartes et tuiles « poussent » en entrant à l'écran (dévoilement du bas vers le haut, petit redressement).
   - Feuille : chaque appui sur un bouton fait s'envoler une petite feuille depuis le doigt.
   - Gerbe : une réussite (notification « succès ») projette quelques feuilles.
   - Éclosion : une modale naît du point touché (ordinateur) ou monte comme un panneau souple (téléphone).
   - Goutte : la pastille des onglets s'étire pendant qu'elle glisse vers l'onglet choisi.
   - Mots : certains titres montent mot à mot.
   - Discrétion : pendant le défilement sur téléphone, Pousse se range sur le côté.
   Tout s'arrête avec « réduire les animations » (système) ou le mode calme d'Arbor. Rien ne modifie le contenu. */
(function () {
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('calm');
  const root = document.documentElement;
  let layer = null;
  const fx = () => { if (!layer) { layer = document.createElement('div'); layer.className = 'mo-layer'; layer.setAttribute('aria-hidden', 'true'); document.body.appendChild(layer); } return layer; };

  /* ---------- 1. Les cartes poussent en entrant à l'écran ---------- */
  const GROW = ['.subject-card', '.org-card', '.b-tile', '.bento > .glass', '.featured', '.tr-card', '.wb', '.onb-entry', '.wel-choice', '.obz-goal', '.kn',
    '.sk-row', '.obz-check > li', '.obz-privacy > li', '.obz-skills > li', '.onb-notions > li', '.wel-org', '.pg-list > li', '.zone-card', '.practice-card', '.insight-card'].join(',');
  let io = null;
  function watchGrow(scope) {
    if (reduced() || !('IntersectionObserver' in window)) return;
    if (!io) io = new IntersectionObserver((entries) => {
      let k = 0;
      entries.forEach((e) => { if (e.isIntersecting) { const el = e.target; el.style.setProperty('--mo-i', String(Math.min(k++, 8))); el.classList.add('mo-in'); io.unobserve(el); } });
    }, { rootMargin: '0px 0px -6% 0px' });
    scope.querySelectorAll(GROW).forEach((el) => {
      if (el.dataset.mo) return; el.dataset.mo = '1';
      if (el.closest('.onb-stage, .wel-stage, .obz')) { if (getComputedStyle(el).animationName !== 'none') return; } // écrans qui ont déjà leur propre entrée
      el.classList.add('mo-grow'); io.observe(el);
      setTimeout(() => { if (el.classList.contains('mo-grow') && !el.classList.contains('mo-in')) { el.classList.add('mo-in'); io.unobserve(el); } }, 1600); // jamais invisible
    });
  }

  /* ---------- 2. Les titres montent mot à mot ---------- */
  const WORDS = '.wel-hero h1, .wel-auth h1, .obz-body h1, .onb-q h2'; // (les titres à reflet doré gardent leur effet)
  function words(scope) {
    if (reduced()) return;
    scope.querySelectorAll(WORDS).forEach((h) => {
      if (h.dataset.moWords || h.children.length || !h.textContent.trim()) return; h.dataset.moWords = '1';
      const parts = h.textContent.split(/(\s+)/);
      h.setAttribute('aria-label', h.textContent);
      h.innerHTML = parts.map((w, i) => (/^\s+$/.test(w) ? w : `<span class="mo-w" aria-hidden="true" style="--w:${i >> 1}">${w.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</span>`)).join('');
    });
  }

  /* ---------- 3. Une feuille s'envole du doigt ---------- */
  const PRESS = '.btn, .icon-btn, .onb-entry, .wel-choice, .org-card, .subject-card, .chip-btn, .onb-choice, .obz-goal, .onb-opt, .bottom-nav > a, .topnav > a';
  addEventListener('pointerdown', (e) => {
    const t = e.target.closest && e.target.closest(PRESS);
    lastPoint = { x: e.clientX, y: e.clientY, at: Date.now() };
    if (!t || reduced() || t.disabled) return;
    const n = t.matches('.btn.big, .onb-entry, .wel-choice') ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const leaf = document.createElement('span');
      leaf.className = 'mo-leaf';
      leaf.style.left = `${e.clientX}px`; leaf.style.top = `${e.clientY}px`;
      leaf.style.setProperty('--dx', `${(i - (n - 1) / 2) * 26 + (Math.random() * 10 - 5)}px`);
      leaf.style.setProperty('--rot', `${(i - 1) * 40 + (Math.random() * 30 - 15)}deg`);
      leaf.style.setProperty('--d', `${i * 40}ms`);
      fx().appendChild(leaf);
      setTimeout(() => leaf.remove(), 900);
    }
  }, { passive: true });
  let lastPoint = null;

  /* ---------- 4. Gerbe de feuilles sur une réussite ---------- */
  function burst(x, y, count = 9) {
    if (reduced()) return;
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.5, dist = 46 + Math.random() * 34;
      const leaf = document.createElement('span');
      leaf.className = 'mo-leaf mo-burst';
      leaf.style.left = `${x}px`; leaf.style.top = `${y}px`;
      leaf.style.setProperty('--dx', `${Math.cos(a) * dist}px`);
      leaf.style.setProperty('--dy', `${Math.sin(a) * dist - 14}px`);
      leaf.style.setProperty('--rot', `${Math.random() * 360}deg`);
      leaf.style.setProperty('--hue', i % 3);
      fx().appendChild(leaf);
      setTimeout(() => leaf.remove(), 1100);
    }
  }
  function hookToasts() {
    const box = document.getElementById('toasts'); if (!box) return;
    new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => {
      if (n.nodeType === 1 && n.classList.contains('success')) requestAnimationFrame(() => { const r = n.getBoundingClientRect(); burst(r.left + 26, r.top + r.height / 2); });
    }))).observe(box, { childList: true });
  }

  /* ---------- 5. Les modales éclosent ---------- */
  function hookModal() {
    const bd = document.querySelector('.modal-backdrop'); if (!bd) return;
    new MutationObserver(() => {
      const m = bd.querySelector('.modal');
      if (!m || !bd.classList.contains('show') || bd.dataset.moOpen === '1') { if (!bd.classList.contains('show')) bd.dataset.moOpen = ''; return; }
      bd.dataset.moOpen = '1';
      if (reduced()) return;
      m.classList.remove('mo-pop', 'mo-sheet'); void m.offsetWidth;
      if (matchMedia('(max-width: 640px)').matches) { m.classList.add('mo-sheet'); return; }
      const r = m.getBoundingClientRect();
      const p = lastPoint && Date.now() - lastPoint.at < 1500 ? lastPoint : { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      m.style.setProperty('--ox', `${Math.max(0, Math.min(r.width, p.x - r.left))}px`);
      m.style.setProperty('--oy', `${Math.max(0, Math.min(r.height, p.y - r.top))}px`);
      m.classList.add('mo-pop');
    }).observe(bd, { attributes: true, attributeFilter: ['class', 'hidden'] });
  }

  /* ---------- 6. La pastille des onglets s'étire comme une goutte ---------- */
  function hookNav() {
    document.querySelectorAll('.bottom-nav, .topnav').forEach((nav) => {
      let last = nav.style.getPropertyValue('--ni');
      new MutationObserver(() => {
        const v = nav.style.getPropertyValue('--ni');
        if (v === last) return; last = v;
        if (reduced()) return;
        nav.classList.remove('mo-goo'); void nav.offsetWidth; nav.classList.add('mo-goo');
        setTimeout(() => nav.classList.remove('mo-goo'), 520);
      }).observe(nav, { attributes: true, attributeFilter: ['style'] });
    });
  }

  /* ---------- 7. Pousse se range pendant le défilement (téléphone) ---------- */
  let scrollT = null;
  addEventListener('scroll', () => {
    if (reduced() || innerWidth > 900) return;
    if (!root.classList.contains('mo-scrolling')) root.classList.add('mo-scrolling');
    clearTimeout(scrollT); scrollT = setTimeout(() => root.classList.remove('mo-scrolling'), 520);
  }, { passive: true, capture: true });

  /* ---------- Branchement : à chaque nouvel écran ---------- */
  let queued = false;
  function scan() {
    queued = false;
    watchGrow(document.body);
    words(document.body);
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(scan); } };
  function start() {
    hookToasts(); hookModal(); hookNav();
    new MutationObserver(queue).observe(document.body, { childList: true, subtree: true });
    queue();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  window.Motion = { burst };
})();
