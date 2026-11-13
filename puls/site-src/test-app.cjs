// Tests de PULS App : mode démonstration et mode compte.
// Le mode compte s'exécute contre une API Supabase SIMULÉE dans le navigateur de test (interception réseau) :
// il vérifie le branchement de l'interface, pas la base. La base est testée par db/test (PostgreSQL réel).
// Usage : servir puls/ sur le port 8765 puis `node site-src/test-app.cjs [dossier-captures]`.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const BASE = process.env.PULS_BASE || "http://localhost:8765";
const OUT = process.argv[2];
const SB = "https://wqqxthpcqczmwigokhus.supabase.co";
let failures = 0;
const ok = (c, m) => { console.log(`${c ? "OK  " : "FAIL"} ${m}`); if (!c) failures++; };

// ---------------------------------------------------------------- cohérence démo / migration
function demoPoliciesMatchSeed() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../app/demo-policies.js"), "utf8"), sandbox);
  const js = sandbox.window.PULS_DEMO_POLICIES;
  const sql = fs.readFileSync(path.join(__dirname, "../db/migrations/002_onboarding.sql"), "utf8");
  const bodies = {};
  for (const m of sql.matchAll(/\('(\w+)', '[^']*',\s*'((?:[^']|'')*)'::jsonb\)/g)) bodies[m[1]] = JSON.parse(m[2].replace(/''/g, "'"));
  const kinds = ["authorization", "resolution", "criticality", "tone", "sla"];
  return kinds.every((k) => JSON.stringify(bodies[k]) === JSON.stringify(js[k])) && kinds.length === Object.keys(bodies).length;
}

// ---------------------------------------------------------------- API Supabase simulée
function mockSupabase(page, log) {
  const uid = "11111111-1111-1111-1111-111111111111";
  const st = { company: null, ws: "ws-1", tables: { workspaces: [], legal_entities: [], brands: [], sites: [], products: [], carriers: [], delivery_methods: [], stock_levels: [], policy_sets: [], policy_versions: [], audit_log: [] }, members: [] };
  let n = 0; const id = (p) => `${p}-${++n}`;
  const json = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  return page.route(`${SB}/**`, async (route) => {
    const req = route.request(); const url = new URL(req.url()); const p = url.pathname; const m = req.method();
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    log.push({ m, p, q: url.search, body });
    if (p === "/auth/v1/user") return json(route, { id: uid, email: "fondatrice@exemple.test", aud: "authenticated", role: "authenticated" });
    if (p === "/auth/v1/logout") return route.fulfill({ status: 204 });
    if (p.startsWith("/rest/v1/rpc/")) {
      const fn = p.split("/").pop();
      if (fn === "create_company") {
        st.company = { id: "co-1", name: body.p_name, environment: "demo" };
        st.members = [{ user_id: uid, email: "fondatrice@exemple.test", role: "admin", status: "active", created_at: new Date().toISOString() }];
        st.tables.workspaces.push({ id: st.ws, company_id: "co-1", name: "Principal" });
        return json(route, "co-1");
      }
      if (fn === "seed_demo_configuration") {
        const T = st.tables;
        T.sites.push({ id: "s1", company_id: "co-1", workspace_id: st.ws, brand_id: null, name: "Entrepôt Paris", kind: "warehouse", ships_orders: true, city: "Paris", timezone: "Europe/Paris", opening_hours: null, prep_capacity_per_day: 400, can_transfer: true, courier_available: true },
                     { id: "s2", company_id: "co-1", workspace_id: st.ws, brand_id: null, name: "Boutique Paris 7e", kind: "store", ships_orders: false, city: "Paris", timezone: "Europe/Paris", opening_hours: { description: "10:00-19:00" }, prep_capacity_per_day: 12, can_transfer: false, courier_available: true });
        T.products.push({ id: "p1", company_id: "co-1", workspace_id: st.ws, brand_id: null, sku: "VAL-GC32", name: "Coffret Grand Cru", category: "Chocolat", thermal_sensitivity: "high", fragility: "low", storage_conditions: null, storage_temp_min_c: null, storage_temp_max_c: null, shelf_life_hours: null, transport_restrictions: [], unit_cost: null, list_price: 89 });
        T.policy_sets.push({ id: "ps1", company_id: "co-1", workspace_id: st.ws, kind: "authorization", name: "Délégation financière" });
        T.policy_versions.push({ id: "pv1", company_id: "co-1", policy_set_id: "ps1", version: 1, status: "active", created_at: "", activated_at: new Date().toISOString(), body: { currency: "EUR", limits: { agent: 60, logistics_manager: 150, sav_manager: 250, admin: 1000, viewer: 0 } } });
        return json(route, null);
      }
      if (fn === "list_members") return json(route, st.members);
      if (fn === "add_member") return json(route, { message: "no PULS account for this e-mail yet", code: "P0002" }, 400);
      if (fn === "activate_policy_version") {
        const v = st.tables.policy_versions.find((x) => x.id === body.p_version);
        st.tables.policy_versions.filter((x) => x.policy_set_id === v.policy_set_id && x.status === "active").forEach((x) => { x.status = "retired"; });
        v.status = "active"; v.activated_at = new Date().toISOString();
        return json(route, null);
      }
      return json(route, { message: `rpc ${fn} non simulée` }, 404);
    }
    const table = p.replace("/rest/v1/", "");
    const rows = st.tables[table];
    if (table === "memberships") return json(route, st.company ? [{ company_id: "co-1", role: "admin", status: "active", companies: { name: st.company.name, environment: "demo" } }] : []);
    if (m === "GET") {
      if (table === "policy_versions" && url.searchParams.get("select")?.includes("policy_sets!inner")) {
        return json(route, rows.filter((v) => v.status === "active").map((v) => ({ body: v.body, policy_sets: st.tables.policy_sets.find((s) => s.id === v.policy_set_id) })));
      }
      if (table === "policy_versions" && url.searchParams.get("select") === "version") {
        const set = (url.searchParams.get("policy_set_id") || "").replace("eq.", "");
        return json(route, rows.filter((v) => v.policy_set_id === set).sort((a, b) => b.version - a.version).slice(0, 1).map((v) => ({ version: v.version })));
      }
      return json(route, rows || []);
    }
    if (m === "POST") {
      const list = Array.isArray(body) ? body : [body];
      for (const r of list) {
        if (table === "stock_levels") { const i = rows.findIndex((x) => x.site_id === r.site_id && x.product_id === r.product_id); if (i >= 0) rows.splice(i, 1); rows.push(r); }
        else rows.push({ id: id(table), ...r });
      }
      const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
      return json(route, single ? rows[rows.length - 1] : null, single ? 200 : 201);
    }
    if (m === "PATCH") { const key = (url.searchParams.get("id") || "").replace("eq.", ""); const r = rows.find((x) => x.id === key); if (r) Object.assign(r, body); return json(route, null, 204); }
    if (m === "DELETE") { const key = (url.searchParams.get("id") || "").replace("eq.", ""); const i = rows.findIndex((x) => x.id === key); if (i >= 0) rows.splice(i, 1); return json(route, null, 204); }
    return json(route, { message: "non simulé" }, 500);
  });
}

(async () => {
  ok(demoPoliciesMatchSeed(), "politiques de démo identiques à seed_demo_configuration (migration 002)");
  const b = await chromium.launch();
  const errs = [];
  const watch = (p, tag) => {
    p.on("pageerror", (e) => errs.push(`${tag} ${e.message}`));
    p.on("console", (m) => { if (m.type() === "error" && !/GT-Walsheim|404|400/.test(m.text())) errs.push(`${tag} ${m.text()}`); });
  };

  // ============================================================ DÉMONSTRATION
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(() => sessionStorage.setItem("puls-session", JSON.stringify({ mode: "demo", workspace: "Maison Valcour", user: "Inès Valadier", role: "Collaboratrice", roleKey: "agent" })));
  const d = await ctx.newPage(); watch(d, "demo");
  await d.goto(`${BASE}/app/`);
  await d.waitForSelector(".q-item");
  ok(await d.locator(".q-item").count() === 7, "démo : 7 dossiers fictifs chargés depuis demo-data.js");
  await d.keyboard.press("2");
  await d.click('[data-opt="full"]');
  ok((await d.textContent("[data-send]")).includes("Envoyer en validation"), "démo : remboursement de 89 € au-delà de la délégation collaborateur (60 €) part en validation");
  ok((await d.textContent("#gestures")).includes("60"), "démo : le plafond affiché vient de la politique (60 €)");
  await d.click('[data-opt="avoir"]');
  ok((await d.textContent("[data-send]")).includes("Résoudre"), "démo : avoir de 18 € dans la délégation");
  ok((await d.textContent("#reply")).includes("sans IA"), "démo : le brouillon est présenté comme un modèle de texte, pas comme de l'IA");
  ok((await d.inputValue("textarea.reply")).includes("La Conciergerie Maison Valcour"), "démo : signature lue dans la politique de ton");
  await d.keyboard.press("Escape");
  await d.keyboard.press("g"); await d.keyboard.press("p");
  await d.waitForSelector("[data-sim-photos]");
  await d.click("[data-sim-photos]"); await d.click("[data-analyze]");
  await d.waitForTimeout(1500);
  ok((await d.textContent("#view")).includes("Exemple simulé"), "démo : observations Proof Studio marquées « exemple simulé »");
  await d.keyboard.press("g"); await d.keyboard.press("f");
  await d.waitForSelector(".cfg-tabs");
  ok((await d.textContent(".cfg")).includes("Lecture seule"), "démo : configuration en lecture seule");
  ok(await d.locator("[data-add]").count() === 0, "démo : aucun bouton d'écriture");
  await d.click('[data-tab="policies"]');
  ok(/60,00[\s\u202f]€/.test(await d.textContent(".cfg-panel")), "démo : la délégation affichée est celle qui pilote la démo");
  await d.click('[data-tab="catalog"]');
  ok((await d.textContent(".cfg-panel")).includes("Non calculée"), "démo : aucune marge sans coût de revient");
  if (OUT) await d.screenshot({ path: path.join(OUT, "app-config-demo.png") });
  await ctx.close();

  // ============================================================ COMPTE (API simulée)
  const log = [];
  const actx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  await actx.addInitScript(() => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    sessionStorage.setItem("puls-auth", JSON.stringify({ access_token: "jeton-de-test", token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: "r",
      user: { id: "11111111-1111-1111-1111-111111111111", email: "fondatrice@exemple.test", aud: "authenticated", role: "authenticated" } }));
  });
  const a = await actx.newPage(); watch(a, "compte");
  await mockSupabase(a, log);
  await a.goto(`${BASE}/app/`);
  await a.waitForSelector(".cfg-onboard");
  ok(true, "compte sans entreprise : écran de création");
  ok(log.some((r) => r.p === "/auth/v1/user"), "compte : session vérifiée auprès du serveur (getUser)");
  await a.fill('.cfg-onboard input[name="name"]', "Atelier Brume");
  await a.click('.cfg-onboard button[type="submit"]');
  await a.waitForSelector(".cfg-head");
  ok((await a.textContent(".cfg-head")).includes("Atelier Brume"), "création d'entreprise : appel create_company puis rechargement");
  ok((await a.textContent(".cfg-head")).includes("Environnement de démonstration"), "nouvelle entreprise affichée en environnement de démonstration");
  await a.click('[data-cfg="seed"]');
  await a.click(".cfg-dialog button[type=submit]");
  await a.waitForFunction(() => document.querySelectorAll(".cfg-head").length === 1 && !document.querySelector('[data-cfg="seed"]'));
  await a.click('[data-tab="catalog"]');
  ok((await a.textContent(".cfg-panel")).includes("VAL-GC32"), "démonstration chargée : catalogue affiché");
  ok((await a.locator(".cfg-panel .tag-line", { hasText: "Inconnu" }).count()) >= 2, "catalogue : valeurs inconnues affichées comme inconnues");

  await a.click('[data-add="products"]');
  await a.fill('.cfg-dialog input[name="sku"]', "TEST-1");
  await a.fill('.cfg-dialog input[name="name"]', "Produit de test");
  await a.click(".cfg-dialog button[type=submit]");
  await a.waitForFunction(() => document.querySelector(".cfg-panel")?.textContent.includes("TEST-1"));
  const ins = log.find((r) => r.m === "POST" && r.p === "/rest/v1/products");
  ok(ins && ins.body.storage_temp_min_c === null && ins.body.unit_cost === null && ins.body.thermal_sensitivity === "unknown", "ajout produit : champs vides envoyés comme inconnus (null, unknown)");
  ok(ins && ins.body.company_id === "co-1", "ajout produit : rattaché à l'entreprise courante (contrôlé ensuite par la RLS)");

  await a.click('[data-tab="sites"]');
  ok((await a.textContent(".cfg-panel")).includes("Boutique Paris 7e"), "établissements affichés");
  await a.click('[data-tab="stock"]');
  const qty = a.locator(".cfg-qty").first();
  await qty.fill("12"); await qty.press("Enter");
  await a.waitForTimeout(400);
  const up = log.find((r) => r.m === "POST" && r.p === "/rest/v1/stock_levels");
  ok(up && up.body.quantity === 12 && up.body.source === "manual", "stock : enregistré avec quantité, date et source « manuelle »");

  await a.click('[data-tab="policies"]');
  await a.click("[data-pol-new]");
  await a.fill(".cfg-json", "{ pas du json");
  await a.click(".cfg-dialog button[type=submit]");
  ok((await a.textContent(".cfg-dialog .cfg-err")).includes("JSON invalide"), "politique : JSON invalide refusé");
  await a.fill(".cfg-json", JSON.stringify({ limits: { agent: 80, logistics_manager: 150, sav_manager: 300, admin: 1000, viewer: 20 } }));
  await a.click(".cfg-dialog button[type=submit]");
  ok((await a.textContent(".cfg-dialog .cfg-err")).includes("observateur"), "politique : délégation d'un observateur refusée");
  await a.fill(".cfg-json", JSON.stringify({ currency: "EUR", limits: { agent: 80, logistics_manager: 150, sav_manager: 300, admin: 1000, viewer: 0 } }));
  await a.click(".cfg-dialog button[type=submit]");
  await a.waitForSelector("[data-pol-activate]");
  ok(true, "politique : brouillon v2 enregistré");
  await a.click("[data-pol-activate]");
  ok((await a.textContent(".cfg-dialog")).includes("décisions passées gardent leur version"), "activation : confirmation explicite");
  await a.click(".cfg-dialog button[type=submit]");
  await a.waitForFunction(() => document.querySelector(".cfg-panel")?.textContent.includes("version 2 active"));
  ok(log.some((r) => r.p === "/rest/v1/rpc/activate_policy_version"), "activation : passe par la fonction serveur");
  if (OUT) await a.screenshot({ path: path.join(OUT, "app-config-policies.png") });

  await a.click('[data-tab="team"]');
  await a.waitForSelector('[data-add="member"]');
  await a.click('[data-add="member"]');
  await a.fill('.cfg-dialog input[name="email"]', "inconnu@exemple.test");
  await a.click(".cfg-dialog button[type=submit]");
  await a.waitForFunction(() => document.querySelector("#toasts")?.textContent.includes("s'inscrire"), null, { timeout: 8000 }).catch(() => {});
  ok((await a.textContent("#toasts")).includes("doit d'abord s'inscrire"), "équipe : e-mail sans compte, message clair");

  await a.keyboard.press("g"); await a.keyboard.press("d");
  await a.waitForTimeout(400);
  ok((await a.textContent("#view")).includes("Aucun dossier dans cet espace"), "compte : aucun dossier inventé dans le Concierge Desk");
  ok(!log.some((r) => /service_role|sk-/.test(JSON.stringify(r))), "aucune clé secrète dans les requêtes du navigateur");

  console.log(errs.length ? "ERREURS:\n" + [...new Set(errs)].join("\n") : "Aucune erreur de page");
  console.log(failures ? `${failures} échec(s)` : "Tous les contrôles passent");
  await b.close();
  process.exit(failures || errs.length ? 1 : 0);
})();
