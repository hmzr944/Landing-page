/* Arbor · site public : menu, récit (écran du téléphone selon l'étape lue), arbre dessiné au défilement,
   sélecteur segmenté, extrait vérifié, notifications, page Télécharger.
   La page Télécharger lit la DERNIÈRE VERSION PUBLIÉE sur GitHub (releases du dépôt). Tant qu'aucune n'est publiée,
   elle le dit et propose Arbor Web : aucun bouton ne mène à un fichier qui n'existe pas. */
(function () {
  document.documentElement.classList.add('js');
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const io = (els, fn, opt) => { if (!('IntersectionObserver' in window)) { els.forEach((e) => fn(e, true)); return; } const o = new IntersectionObserver((es) => es.forEach((e) => fn(e.target, e.isIntersecting, o)), opt); els.forEach((e) => o.observe(e)); };

  // Menu (téléphone)
  const top = $('.s-top'), menu = $('.s-menu');
  if (menu) menu.addEventListener('click', () => { const o = top.classList.toggle('open'); menu.setAttribute('aria-expanded', String(o)); });
  const sel = $('.docs-sel');
  if (sel) sel.addEventListener('change', () => { location.href = sel.value; });

  // Récit : l'étape au centre de l'écran choisit l'image du téléphone (fondu flou)
  const steps = $$('.story-steps li');
  if (steps.length) {
    const shots = $$('.story-phone .scr img');
    const show = (i) => { steps.forEach((s, k) => s.classList.toggle('on', k === i)); shots.forEach((im, k) => im.classList.toggle('on', k === i)); };
    show(0);
    io(steps, (el, on) => { if (on) show(steps.indexOf(el)); }, { rootMargin: '-45% 0px -45% 0px' });
  }

  // Arbre : les branches se dessinent avec le défilement, puis les notions s'allument
  const tree = $('.tree-art');
  if (tree) {
    const nodes = $$('.nd', tree);
    let best = 0; // une fois dessiné, l'arbre le reste (pas d'effacement en remontant)
    const paint = () => {
      const r = tree.getBoundingClientRect(), vh = innerHeight;
      const p = reduce ? 1 : (best = Math.max(best, Math.min(1, Math.max(0, (vh - r.top) / (vh * .55 + r.height * .5)))));
      tree.style.setProperty('--p', p.toFixed(3));
      nodes.forEach((n) => n.classList.toggle('lit', p >= +(n.dataset.at || 1)));
    };
    paint(); addEventListener('scroll', () => requestAnimationFrame(paint), { passive: true }); addEventListener('resize', paint);
  }

  // Sélecteur segmenté : pastille glissante (courbe tiroir iOS), image et texte en fondu flou
  $$('.seg').forEach((seg) => {
    const btns = $$('button', seg), pill = $('.pill', seg), root = seg.closest('[data-seg-root]');
    const go = (i, focus) => {
      const b = btns[i];
      pill.style.width = `${b.offsetWidth}px`; pill.style.transform = `translateX(${b.offsetLeft - 3}px)`;
      btns.forEach((x, k) => { x.setAttribute('aria-selected', String(k === i)); x.tabIndex = k === i ? 0 : -1; });
      $$('[data-pane]', root).forEach((p) => p.setAttribute('aria-hidden', String(p.dataset.pane !== b.dataset.key)));
      if (focus) b.focus();
    };
    btns.forEach((b, i) => {
      b.addEventListener('click', () => go(i));
      b.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); go((i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length, true); } });
    });
    go(0); addEventListener('resize', () => go(btns.findIndex((b) => b.getAttribute('aria-selected') === 'true')));
  });

  // Extrait vérifié (surlignage) et notifications : une fois, à l'entrée dans l'écran
  io($$('.passage'), (el, on, o) => { if (on) { el.classList.add('seen'); o && o.unobserve(el); } }, { threshold: .6 });
  const notifs = $$('.notifs');
  notifs.forEach((n) => n.classList.add('wait'));
  io(notifs, (el, on, o) => { if (on) { el.classList.remove('wait'); o && o.unobserve(el); } }, { threshold: .4 });

  // ---------- Télécharger ----------
  const dl = $('#dl');
  if (!dl) return;
  const ua = navigator.userAgent || '';
  const os = /iPhone|iPad|iPod/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : /Mac/.test(ua) ? 'mac' : /Win/.test(ua) ? 'win' : '';
  const mine = $(`[data-os="${os}"]`, dl);
  if (mine) mine.classList.add('mine');
  if (os === 'ios' || os === 'android') { const m = $('#dlMobile'); if (m) m.hidden = false; }

  const repo = dl.dataset.repo;
  const state = $('#dlState');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mo = (n) => `${(n / 1048576).toFixed(1).replace('.', ',')} Mo`;
  const pick = (assets, re) => assets.find((a) => re.test(a.name));
  const set = (key, a, rel) => {
    const card = $(`[data-os="${key}"]`, dl);
    const btn = $('[data-get]', card), meta = $('.meta', card);
    if (!a) { meta.textContent = 'Pas encore disponible dans cette version.'; return; }
    btn.href = a.browser_download_url; btn.removeAttribute('aria-disabled'); btn.querySelector('span').textContent = `Télécharger (${mo(a.size)})`;
    meta.textContent = `${a.name}, version ${rel.tag_name}`;
    const alt = $('[data-alt]', card);
    if (alt && key === 'win') { const msi = pick(rel.assets, /\.msi$/i); if (msi) { alt.href = msi.browser_download_url; alt.hidden = false; } }
  };
  fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((rel) => {
      const as = rel.assets || [];
      set('win', pick(as, /setup\.exe$/i) || pick(as, /\.exe$/i), rel);
      set('mac', pick(as, /\.dmg$/i), rel);
      const sums = pick(as, /SHA256SUMS/i);
      const date = rel.published_at ? new Date(rel.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      state.innerHTML = `<div class="callout"><i class="ph ph-seal-check" aria-hidden="true"></i><p>Version <b>${esc(rel.tag_name)}</b>${date ? `, publiée le ${esc(date)}` : ''}.${sums ? ` Empreintes SHA-256 : <a href="${esc(sums.browser_download_url)}">SHA256SUMS.txt</a>.` : ''} <a href="${esc(rel.html_url)}">Notes de version</a>.</p></div>`;
      dl.dataset.state = 'publiee';
    })
    .catch(() => {
      $$('[data-os="win"] .meta, [data-os="mac"] .meta', dl).forEach((m) => { m.textContent = 'Première version publique en préparation.'; });
      state.innerHTML = `<div class="callout wip"><i class="ph ph-hourglass-medium" aria-hidden="true"></i><p><b>Aucune version publique pour l’instant.</b> Les installateurs sont construits et essayés automatiquement, mais pas encore publiés. En attendant, Arbor Web offre tout l’apprentissage, sans rien installer.</p></div>`;
      dl.dataset.state = 'aucune';
    });
})();
