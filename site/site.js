/* Arbor · site public : menu sur téléphone, apparitions au défilement, page Télécharger.
   La page Télécharger lit la DERNIÈRE VERSION PUBLIÉE sur GitHub (releases du dépôt). Tant qu'aucune n'est publiée,
   elle le dit et propose Arbor Web : aucun bouton ne mène à un fichier qui n'existe pas. */
(function () {
  document.documentElement.classList.add('js');
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // Menu (téléphone)
  const top = $('.s-top'), menu = $('.s-menu');
  if (menu) menu.addEventListener('click', () => { const o = top.classList.toggle('open'); menu.setAttribute('aria-expanded', String(o)); });

  // Documentation : sélecteur de page sur téléphone
  const sel = $('.docs-sel');
  if (sel) sel.addEventListener('change', () => { location.href = sel.value; });

  // Apparitions
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = $$('.reveal');
  if (reduce || !('IntersectionObserver' in window)) items.forEach((x) => x.classList.add('in'));
  else {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    items.forEach((x) => io.observe(x));
  }

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
    meta.textContent = `${a.name} · ${rel.tag_name}`;
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
      state.innerHTML = `<div class="callout"><i class="ph ph-seal-check" aria-hidden="true"></i><p>Version <b class="mono">${esc(rel.tag_name)}</b>${date ? `, publiée le ${esc(date)}` : ''}.${sums ? ` Empreintes SHA-256 : <a href="${esc(sums.browser_download_url)}">SHA256SUMS.txt</a>.` : ''} <a href="${esc(rel.html_url)}">Notes de version</a>.</p></div>`;
      dl.dataset.state = 'publiee';
    })
    .catch(() => {
      $$('[data-os="win"] .meta, [data-os="mac"] .meta', dl).forEach((m) => { m.textContent = 'Première version publique en préparation.'; });
      state.innerHTML = `<div class="callout wip"><i class="ph ph-hourglass-medium" aria-hidden="true"></i><p><b>Aucune version publique pour l’instant.</b> Les installateurs sont construits et essayés automatiquement, mais ils ne sont pas encore publiés. En attendant, Arbor Web offre l’apprentissage complet, sans rien installer.</p></div>`;
      dl.dataset.state = 'aucune';
    });
})();
