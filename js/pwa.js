/* Application installable (PWA) : service worker hors connexion et bouton d'installation */
(function () {
  let deferred = null;
  const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', () => { deferred = null; window.FX && FX.toast('Arbor est installée sur ton appareil', 'success'); });

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => {});
    deferred = null;
  }

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => reg.update()).catch(() => {}));
    // nouvelle version installée : on recharge une fois pour l'utiliser tout de suite
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloaded || !navigator.serviceWorker.controller) return; reloaded = true; location.reload(); });
  }
  if (installed()) document.documentElement.classList.add('standalone');

  window.PWA = { install, canInstall: () => !!deferred, installed, isIOS };
})();
