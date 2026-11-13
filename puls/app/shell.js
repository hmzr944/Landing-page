/* PULS App : coquille applicative (session, espace de travail, installation PWA).
   La session de démonstration est rangée dans sessionStorage : elle disparaît à la fermeture
   de l'onglet et n'est jamais partagée avec d'autres onglets ou d'autres sites. */
(() => {
  "use strict";
  const s = window.PULS_SESSION || {};
  const ws = document.getElementById("workspace");
  if (ws) {
    const initials = (s.workspace || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    ws.innerHTML = `<span class="ws-mark">${initials}</span>
      <span><b>${escapeHtml(s.workspace)}</b><span>${escapeHtml(s.user)}, ${escapeHtml(s.role)}</span></span>`;
    ws.title = s.mode === "demo" ? "Espace de démonstration : données fictives" : "";
  }

  document.getElementById("logout-btn")?.addEventListener("click", () => {
    try { sessionStorage.removeItem("puls-session"); } catch (e) {}
    location.replace("../connexion.html?out=1");
  });

  // installation, lorsque le navigateur la propose
  let deferred = null;
  const btn = document.getElementById("install-btn");
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    if (btn) btn.hidden = false;
  });
  btn?.addEventListener("click", async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => null);
    deferred = null;
    btn.hidden = true;
  });
  window.addEventListener("appinstalled", () => { if (btn) btn.hidden = true; });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(() => {});
  }

  function escapeHtml(v) {
    return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
})();
