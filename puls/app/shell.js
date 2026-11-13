/* PULS App : démarrage (session, entreprise, politiques, données), espace de travail, installation PWA.
   Deux modes :
   - démonstration : session fictive d'onglet, données et politiques fictives (demo-data.js, demo-policies.js) ;
   - compte : session Supabase vérifiée par le serveur, entreprise et politiques lues en base (RLS).
   Les sessions vivent dans sessionStorage : propres à l'onglet, jamais dans le stockage partagé. */
(() => {
  "use strict";
  window.PULS = window.PULS || {};
  const ROLE_LABEL = { admin: "Administrateur", sav_manager: "Responsable SAV", agent: "Collaborateur", logistics_manager: "Responsable logistique", viewer: "Observateur" };
  const view = document.getElementById("view");
  const toLogin = (q = "") => location.replace(`../connexion.html${q}`);
  const read = (k) => { try { return JSON.parse(sessionStorage.getItem(k) || "null"); } catch (e) { return null; } };
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  async function loadAccount() {
    const db = window.PULS.client;
    if (!db) throw new Error("Serveur PULS non configuré.");
    const { data: u, error: ue } = await db.auth.getUser();       // vérifié par le serveur, pas seulement en local
    if (ue || !u?.user) { await db.auth.signOut().catch(() => {}); toLogin("?expired=1"); return null; }
    const user = u.user;
    const { data: ms, error: me } = await db.from("memberships").select("company_id, role, companies(name, environment)").eq("user_id", user.id).eq("status", "active");
    if (me) throw me;
    const list = (ms || []).filter((m) => m.companies);
    let pick = null;
    try { pick = sessionStorage.getItem("puls-company"); } catch (e) {}
    const m = list.find((x) => x.company_id === pick) || list[0] || null;
    const SESSION = {
      mode: "account", user: user.email, userId: user.id,
      role: m ? ROLE_LABEL[m.role] : "Sans entreprise", roleKey: m ? m.role : null,
      companyId: m ? m.company_id : null, companyName: m ? m.companies.name : null, environment: m ? m.companies.environment : null,
      workspace: m ? m.companies.name : "Aucune entreprise", startView: "config",
    };
    const RULES = {};
    if (m) {
      const { data: pv, error: pe } = await db.from("policy_versions").select("body, policy_sets!inner(kind, workspace_id, name)")
        .eq("company_id", m.company_id).eq("status", "active");
      if (pe) throw pe;
      // Une seule valeur par type : la première trouvée (un espace par entreprise dans cette version).
      for (const row of pv || []) if (!RULES[row.policy_sets.kind]) RULES[row.policy_sets.kind] = row.body;
    }
    // Aucune donnée opérationnelle réelle n'existe encore : on ne fabrique rien.
    const DATA = { PRODUCTS: {}, STOCK: {}, CASES: [], SHIPMENTS: [], CARRIERS: [], empty: true };
    return { SESSION, RULES, DATA };
  }

  function loadDemo(s) {
    const SESSION = { ...s, roleKey: s.roleKey || "agent", environment: "demo" };
    return { SESSION, RULES: window.PULS_DEMO_POLICIES, DATA: { ...window.PULS_DEMO_DATA, empty: false } };
  }

  function renderWorkspace(S) {
    const ws = document.getElementById("workspace");
    if (!ws) return;
    const name = S.companyName || S.workspace || "PULS";
    const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    ws.innerHTML = `<span class="ws-mark">${esc(initials)}</span><span><b>${esc(name)}</b><span>${esc(S.user)}, ${esc(S.role)}</span></span>`;
    const badge = document.querySelector(".sim-badge");
    if (badge) {
      if (S.mode === "demo") badge.innerHTML = '<i class="ph ph-flask"></i>Démonstration, données fictives';
      else if (S.environment === "demo") badge.innerHTML = '<i class="ph ph-flask"></i>Environnement de démonstration';
      else badge.hidden = true;
      badge.title = "Aucune commande, aucun remboursement, aucun message réel n'est déclenché.";
    }
  }

  // Le module Configuration (TypeScript, chargé en module) peut arriver après ce script.
  const configReady = () => new Promise((resolve) => {
    if (window.PULS.configView) return resolve();
    document.addEventListener("puls:config-ready", () => resolve(), { once: true });
    setTimeout(resolve, 4000);
  });

  async function boot() {
    const demo = read("puls-session");
    try {
      const ctx = demo && demo.mode === "demo" ? loadDemo(demo) : await loadAccount();
      if (!ctx) return;
      window.PULS.session = ctx.SESSION;
      renderWorkspace(ctx.SESSION);
      await configReady();
      window.PULS_APP(ctx.DATA, ctx.RULES, ctx.SESSION);
    } catch (e) {
      const msg = /schema cache|does not exist/.test(String(e?.message)) ? "La base PULS n'est pas encore installée sur ce projet : appliquez les migrations (puls/db/README.md)." : (e?.message || "Erreur inconnue");
      view.innerHTML = `<div class="tile tile-cream"><div class="empty" style="border:0"><i class="ph ph-warning"></i><strong>Impossible de charger votre espace</strong>${esc(msg)}
        <div style="margin-top:16px;display:flex;gap:10px;justify-content:center"><button class="btn btn-ink" id="retry">Réessayer</button><button class="btn btn-line" id="relog">Se reconnecter</button></div></div></div>`;
      document.getElementById("retry")?.addEventListener("click", () => location.reload());
      document.getElementById("relog")?.addEventListener("click", logout);
    }
  }
  window.PULS.reload = () => location.reload();

  async function logout() {
    try { sessionStorage.removeItem("puls-session"); sessionStorage.removeItem("puls-company"); } catch (e) {}
    try { await window.PULS.client?.auth.signOut(); } catch (e) {}
    try { sessionStorage.removeItem("puls-auth"); } catch (e) {}
    location.replace("../connexion.html?out=1");
  }
  document.getElementById("logout-btn")?.addEventListener("click", logout);

  // installation, lorsque le navigateur la propose
  let deferred = null;
  const btn = document.getElementById("install-btn");
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; if (btn) btn.hidden = false; });
  btn?.addEventListener("click", async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => null);
    deferred = null; btn.hidden = true;
  });
  window.addEventListener("appinstalled", () => { if (btn) btn.hidden = true; });
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(() => {});

  boot();
})();
