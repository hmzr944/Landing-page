/* Arbor Desktop : ce qui change quand Arbor tourne comme application installée (Tauri, Windows et macOS).
   Le même code sert au site : sans Tauri, seuls les raccourcis clavier s'appliquent.
   - Raccourcis : Ctrl (⌘ sur Mac) + 1 à 8 ouvre les huit espaces Learning ; Ctrl/⌘ + K, le compagnon.
   - Notifications natives : un rappel par jour au lancement s'il y a des révisions dues (jamais plus).
   - Liens externes : ouverts dans le navigateur, pas dans la fenêtre d'Arbor. */
(function () {
  const T = window.__TAURI__ || null;
  const isDesktop = !!(T || window.__TAURI_INTERNALS__);
  if (isDesktop) document.documentElement.classList.add('is-desktop-app');
  // Arbor 3 : chaque surface a sa propre identité (styles.css, « Trois identités ») : application, Web, téléphone
  else document.documentElement.classList.add('is-web');

  // Raccourcis (application et site, ordinateur)
  window.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod || e.altKey || e.shiftKey || document.documentElement.classList.contains('in-org')) return;
    const tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) && e.key !== 'k') return;
    const nav = window.Spaces ? Spaces.NAV : [];
    if (/^[1-8]$/.test(e.key) && nav[Number(e.key) - 1]) { e.preventDefault(); location.hash = nav[Number(e.key) - 1][1]; }
    else if (e.key === 'k' && window.Spaces) { e.preventDefault(); location.hash = '#/compagnon'; }
  });

  if (!T) return;

  // Liens externes : navigateur du système
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="http"]');
    if (!a || a.host === location.host) return;
    e.preventDefault();
    try { T.opener.openUrl(a.href); } catch (x) { /* plugin absent : lien ignoré */ }
  });

  // Rappel de révision : une fois par jour, seulement s'il y a des cartes dues
  async function rappel() {
    try {
      const day = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem('arbor:desk-notif') === day) return;
      const st = JSON.parse(localStorage.getItem('arbor:v1') || '{}');
      let due = 0;
      const walk = (n) => { if (n.srs && n.srs.last != null && window.SRS && SRS.isDue(n.srs)) due++; (n.children || []).forEach(walk); };
      (st.subjects || []).forEach((s) => walk(s.root));
      if (!due) return;
      const N = T.notification;
      let ok = await N.isPermissionGranted();
      if (!ok) ok = (await N.requestPermission()) === 'granted';
      if (!ok) return;
      N.sendNotification({ title: 'Arbor', body: `${due} notion${due > 1 ? 's' : ''} à revoir aujourd’hui : c’est le bon moment pour qu’elles tiennent.` });
      localStorage.setItem('arbor:desk-notif', day);
    } catch (x) { /* notifications indisponibles : rien */ }
  }
  setTimeout(rappel, 4000);
})();
