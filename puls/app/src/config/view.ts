// Vue Configuration de PULS App. Montée par puls.js (JavaScript) via window.PULS.configView.
import { humanError } from "./errors.js";
import { DemoConfigStore, SupabaseConfigStore, type ConfigSnapshot, type ConfigStore } from "./store.js";
import {
  LEVEL_LABEL, POLICY_LABEL, ROLE_LABEL, SITE_LABEL,
  type CompanyRef, type Level5, type MountContext, type PolicyKind, type PolicySet, type PolicyVersion, type Product, type Role, type Site, type Table,
} from "./types.js";
import { policyTemplate, validatePolicy } from "./validate.js";

type Tab = "org" | "sites" | "catalog" | "carriers" | "stock" | "policies" | "team" | "audit";
const TABS: [Tab, string, string][] = [
  ["org", "Organisation", "ph-buildings"], ["sites", "Établissements", "ph-storefront"], ["catalog", "Catalogue", "ph-package"],
  ["carriers", "Transporteurs", "ph-truck"], ["stock", "Stocks", "ph-warehouse"], ["policies", "Politiques", "ph-scroll"],
  ["team", "Équipe", "ph-users-three"], ["audit", "Journal", "ph-list-checks"],
];

// ---------------------------------------------------------------- utilitaires
const esc = (v: unknown): string => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
const unknown = `<span class="tag tag-line">Inconnu</span>`;
const show = (v: unknown, suffix = ""): string => (v === null || v === undefined || v === "" ? unknown : `${esc(v)}${suffix}`);
const tri = (v: boolean | null): string => (v === null ? unknown : v ? "Oui" : "Non");
const euro = (n: number | null): string => (n === null ? unknown : n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" }));
const opt = (v: string, label: string, sel: unknown) => `<option value="${esc(v)}" ${String(sel) === v ? "selected" : ""}>${esc(label)}</option>`;
const numOrNull = (v: FormDataEntryValue | null): number | null => { const s = String(v ?? "").trim().replace(",", "."); return s === "" ? null : Number(s); };
const triOf = (v: FormDataEntryValue | null): boolean | null => (v === "yes" ? true : v === "no" ? false : null);
const triSel = (name: string, v: boolean | null) => `<select name="${name}">${opt("", "Inconnu", v === null ? "" : "x")}${opt("yes", "Oui", v === true ? "yes" : "")}${opt("no", "Non", v === false ? "no" : "")}</select>`;

function notify(title: string, sub = "", icon = "ph-check-circle"): void {
  const box = document.getElementById("toasts");
  if (!box) return;
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = `<i class="ph ${icon}"></i><div><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</div>`;
  box.appendChild(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 400); }, 4200);
}

/** Boîte de dialogue modale ; résout avec les données du formulaire, ou null si annulée. */
function dialog(title: string, body: string, submit: string, opts: { danger?: boolean; wide?: boolean } = {}): Promise<FormData | null> {
  return new Promise((resolve) => {
    const d = document.createElement("dialog");
    d.className = `cfg-dialog${opts.wide ? " wide" : ""}`;
    d.innerHTML = `<form method="dialog" novalidate>
      <h2>${esc(title)}</h2><div class="cfg-dialog-body">${body}</div>
      <p class="cfg-err" role="alert" hidden></p>
      <div class="cfg-dialog-actions"><button type="button" class="btn btn-line" data-cancel>Annuler</button>
      <button type="submit" class="btn ${opts.danger ? "btn-bx" : "btn-ink"}">${esc(submit)}</button></div></form>`;
    document.body.appendChild(d);
    const form = d.querySelector("form") as HTMLFormElement;
    const done = (v: FormData | null) => { d.close(); d.remove(); resolve(v); };
    d.querySelector("[data-cancel]")?.addEventListener("click", () => done(null));
    d.addEventListener("cancel", (e) => { e.preventDefault(); done(null); });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const bad = [...form.querySelectorAll<HTMLInputElement>("[required]")].find((i) => !i.value.trim());
      if (bad) { showDialogError(d, "Complétez les champs obligatoires."); bad.focus(); return; }
      const check = (d as HTMLDialogElement & { validateWith?: (f: FormData) => string | null }).validateWith;
      const fd = new FormData(form);
      const err = check?.(fd);
      if (err) { showDialogError(d, err); return; }
      done(fd);
    });
    d.showModal();
    (form.querySelector("input, select, textarea") as HTMLElement | null)?.focus();
    dialogs.set(d, true);
  });
}
const dialogs = new WeakMap<HTMLDialogElement, boolean>();
function showDialogError(d: HTMLDialogElement, msg: string) { const p = d.querySelector(".cfg-err") as HTMLElement; p.textContent = msg; p.hidden = false; }
const confirmBox = (title: string, text: string, label: string, danger = false) => dialog(title, `<p>${esc(text)}</p>`, label, { danger }).then((r) => r !== null);

// ---------------------------------------------------------------- état du module
interface ViewState { tab: Tab; workspaceId: string | null; snap: ConfigSnapshot | null; companies: CompanyRef[] }
const vs: ViewState = { tab: "org", workspaceId: null, snap: null, companies: [] };
let root: HTMLElement;
let store: ConfigStore;
let ctx: MountContext;

export function mount(el: HTMLElement, c: MountContext): void {
  root = el; ctx = c;
  if (c.session.mode === "demo") store = new DemoConfigStore(c);
  else if (c.client) store = new SupabaseConfigStore(c.client, c.session.companyId ?? null, c.session.roleKey);
  else { el.innerHTML = panel("Configuration indisponible", "Le serveur PULS n'est pas configuré sur ce site.", "ph-plug"); return; }
  if (store.mode === "account" && !store.companyId) { renderOnboarding(); return; }
  void refresh();
}

function panel(title: string, text: string, icon: string, extra = ""): string {
  return `<div class="tile tile-cream"><div class="empty" style="border:0"><i class="ph ${icon}"></i><strong>${esc(title)}</strong>${esc(text)}${extra}</div></div>`;
}

async function refresh(): Promise<void> {
  if (!vs.snap) root.innerHTML = `<div class="tile"><div class="skel"><span></span><span></span><span></span><span></span></div></div>`;
  try {
    const [snap, companies] = await Promise.all([store.load(), store.companies()]);
    vs.snap = snap; vs.companies = companies;
    if (!vs.workspaceId || !snap.workspaces.some((w) => w.id === vs.workspaceId)) vs.workspaceId = snap.workspaces[0]?.id ?? null;
    render();
  } catch (e) {
    root.innerHTML = panel("Chargement impossible", humanError(e), "ph-warning", `<div style="margin-top:16px"><button class="btn btn-ink" data-cfg="retry">Réessayer</button></div>`);
    root.querySelector('[data-cfg="retry"]')?.addEventListener("click", () => void refresh());
  }
}

async function run(label: string, fn: () => Promise<void>): Promise<void> {
  try { await fn(); notify(label); vs.snap = null; await refresh(); }
  catch (e) { notify("Action impossible", humanError(e), "ph-prohibit"); }
}

// ---------------------------------------------------------------- onboarding
function renderOnboarding(): void {
  root.innerHTML = `<div class="cfg-onboard tile">
    <h2>Créer votre entreprise</h2>
    <p class="muted">Vous serez administrateur. L'entreprise démarre en environnement de démonstration : aucune opération réelle (remboursement, réexpédition, coursier) ne peut être exécutée.</p>
    <form class="cfg-inline" data-form="company" novalidate>
      <label class="cfg-field"><span>Nom de l'entreprise</span><input name="name" required minlength="2" maxlength="120" autocomplete="organization"></label>
      <button class="btn btn-ink" type="submit">Créer l'entreprise</button>
    </form>
    <p class="cfg-err" role="alert" hidden></p>
  </div>`;
  const form = root.querySelector('[data-form="company"]') as HTMLFormElement;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = String(new FormData(form).get("name") ?? "").trim();
    const err = root.querySelector(".cfg-err") as HTMLElement;
    if (name.length < 2) { err.textContent = "Indiquez le nom de l'entreprise."; err.hidden = false; return; }
    (form.querySelector("button") as HTMLButtonElement).disabled = true;
    try {
      const id = await store.createCompany(name);
      try { sessionStorage.setItem("puls-company", id); } catch { /* stockage indisponible : l'entreprise sera reprise au prochain chargement */ }
      notify("Entreprise créée", name);
      window.PULS.reload?.();
    } catch (ex) {
      err.textContent = humanError(ex); err.hidden = false;
      (form.querySelector("button") as HTMLButtonElement).disabled = false;
    }
  });
}

// ---------------------------------------------------------------- rendu principal
function render(): void {
  const s = vs.snap!;
  const company = vs.companies.find((c) => c.id === store.companyId) ?? vs.companies[0];
  const demo = store.mode === "demo";
  const ws = s.workspaces.find((w) => w.id === vs.workspaceId);
  root.innerHTML = `
  <div class="cfg">
    <header class="cfg-head tile">
      <div>
        <h2>${esc(company?.name ?? "Entreprise")}</h2>
        <p class="muted">${company ? `${esc(ROLE_LABEL[company.role])}` : ""}
          ${company?.environment === "demo" ? `<span class="tag tag-bx"><i class="ph ph-flask"></i>Environnement de démonstration</span>` : `<span class="tag tag-ink">Production</span>`}
          ${demo ? `<span class="tag tag-line">Lecture seule</span>` : ""}</p>
      </div>
      <div class="cfg-head-actions">
        ${s.workspaces.length > 1 ? `<label class="cfg-field compact"><span>Espace</span><select data-cfg="workspace">${s.workspaces.map((w) => opt(w.id, w.name, vs.workspaceId)).join("")}</select></label>` : ws ? `<span class="muted small">Espace : <b>${esc(ws.name)}</b></span>` : ""}
        ${!demo && vs.companies.length > 1 ? `<label class="cfg-field compact"><span>Entreprise</span><select data-cfg="company">${vs.companies.map((c) => opt(c.id, c.name, store.companyId)).join("")}</select></label>` : ""}
      </div>
    </header>
    ${demo ? `<div class="caveat cfg-caveat"><i class="ph ph-info"></i>Configuration fictive de l'espace de démonstration, en lecture seule. Ce sont exactement ces politiques qui pilotent les moteurs de la démo. Créez un compte depuis la page de connexion pour configurer votre propre entreprise.</div>` : ""}
    ${!demo && s.products.length === 0 && store.canAdmin ? `<div class="cfg-seed tile tile-bx"><div><b>Espace vide.</b> Configurez votre catalogue, ou chargez une configuration de démonstration fictive (chocolaterie) pour explorer PULS.</div><button class="btn btn-line" data-cfg="seed"><i class="ph ph-magic-wand"></i>Charger la démonstration</button></div>` : ""}
    <nav class="cfg-tabs" role="tablist">${TABS.map(([k, label, icon]) => `<button role="tab" aria-selected="${vs.tab === k}" data-tab="${k}"><i class="ph ${icon}"></i>${label}</button>`).join("")}</nav>
    <section class="cfg-panel" role="tabpanel">${renderTab()}</section>
  </div>`;
  bind();
}

function renderTab(): string {
  switch (vs.tab) {
    case "org": return tabOrg();
    case "sites": return tabSites();
    case "catalog": return tabCatalog();
    case "carriers": return tabCarriers();
    case "stock": return tabStock();
    case "policies": return tabPolicies();
    case "team": return `<div data-async="team">${skel()}</div>`;
    case "audit": return `<div data-async="audit">${skel()}</div>`;
  }
}
const skel = () => `<div class="skel"><span></span><span></span><span></span></div>`;
const addBtn = (what: string, label: string, enabled = store.canAdmin) =>
  enabled ? `<button class="btn btn-ink btn-sm" data-add="${what}"><i class="ph ph-plus"></i>${esc(label)}</button>` : "";
const rowActions = (table: Table, id: string, enabled = store.canAdmin) =>
  enabled ? `<span class="cfg-row-actions"><button class="icon-btn" data-edit="${table}" data-id="${esc(id)}" aria-label="Modifier"><i class="ph ph-pencil-simple"></i></button><button class="icon-btn" data-del="${table}" data-id="${esc(id)}" aria-label="Supprimer"><i class="ph ph-trash"></i></button></span>` : "";
const empty = (text: string) => `<p class="cfg-empty muted">${esc(text)}</p>`;

function section(title: string, hint: string, actions: string, body: string): string {
  return `<div class="cfg-section"><div class="cfg-section-head"><div><h3>${esc(title)}</h3>${hint ? `<p class="muted small">${esc(hint)}</p>` : ""}</div>${actions}</div>${body}</div>`;
}

function tabOrg(): string {
  const s = vs.snap!;
  const wsRows = s.workspaces.map((w) => `<tr><td>${esc(w.name)}</td><td class="r">${rowActions("workspaces", w.id)}</td></tr>`).join("");
  const leRows = s.legalEntities.map((l) => `<tr><td>${esc(l.name)}</td><td>${show(l.registration_number)}</td><td>${show(l.country)}</td><td class="r">${rowActions("legal_entities", l.id)}</td></tr>`).join("");
  const brRows = s.brands.filter((b) => b.workspace_id === vs.workspaceId).map((b) => `<tr><td>${esc(b.name)}</td><td>${esc(s.legalEntities.find((l) => l.id === b.legal_entity_id)?.name ?? "")}</td><td class="r">${rowActions("brands", b.id)}</td></tr>`).join("");
  return section("Espaces de travail", "Un espace regroupe marques, catalogue et politiques.", addBtn("workspaces", "Ajouter un espace"),
      wsRows ? `<table class="cfg-table"><tbody>${wsRows}</tbody></table>` : empty("Aucun espace."))
    + section("Entités juridiques", "Jamais préremplies : les informations légales restent à saisir par l'entreprise.", addBtn("legal_entities", "Ajouter une entité"),
      leRows ? `<table class="cfg-table"><thead><tr><th>Raison sociale</th><th>Immatriculation</th><th>Pays</th><th></th></tr></thead><tbody>${leRows}</tbody></table>` : empty("Aucune entité juridique."))
    + section("Marques", "", addBtn("brands", "Ajouter une marque"),
      brRows ? `<table class="cfg-table"><thead><tr><th>Marque</th><th>Entité juridique</th><th></th></tr></thead><tbody>${brRows}</tbody></table>` : empty("Aucune marque dans cet espace."));
}

function tabSites(): string {
  const rows = vs.snap!.sites.filter((x) => x.workspace_id === vs.workspaceId).map((x) => `<tr>
    <td><b>${esc(x.name)}</b><span class="sub">${esc(SITE_LABEL[x.kind])}${x.city ? `, ${esc(x.city)}` : ""}</span></td>
    <td>${x.ships_orders ? "Oui" : "Non"}</td><td>${show(x.prep_capacity_per_day, " / jour")}</td><td>${tri(x.can_transfer)}</td><td>${tri(x.courier_available)}</td>
    <td>${show(x.opening_hours?.description)}</td><td class="r">${rowActions("sites", x.id)}</td></tr>`).join("");
  return section("Établissements", "Une boutique n'expédie jamais de commandes tant que ce n'est pas déclaré. Inconnu reste inconnu.", addBtn("sites", "Ajouter un établissement"),
    rows ? `<table class="cfg-table"><thead><tr><th>Établissement</th><th>Expédie</th><th>Préparation</th><th>Transfert</th><th>Coursier</th><th>Horaires</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : empty("Aucun établissement."));
}

function tabCatalog(): string {
  const s = vs.snap!;
  const rows = s.products.filter((p) => p.workspace_id === vs.workspaceId).map((p) => `<tr>
    <td><b>${esc(p.sku)}</b><span class="sub">${esc(p.name)}</span></td><td>${show(p.category)}</td>
    <td>${lvl(p.thermal_sensitivity)}</td><td>${lvl(p.fragility)}</td>
    <td>${p.storage_temp_min_c === null && p.storage_temp_max_c === null ? unknown : `${p.storage_temp_min_c ?? "?"} à ${p.storage_temp_max_c ?? "?"} °C`}</td>
    <td>${show(p.shelf_life_hours, " h")}</td><td>${euro(p.list_price)}</td><td>${euro(p.unit_cost)}</td>
    <td>${p.unit_cost === null || p.list_price === null ? `<span class="muted small">Non calculée</span>` : euro(p.list_price - p.unit_cost)}</td>
    <td class="r">${rowActions("products", p.id)}</td></tr>`).join("");
  return section("Catalogue", "Températures, durées et coûts inconnus restent inconnus : PULS ne les invente jamais et ne calcule aucune marge sans coût de revient.",
    addBtn("products", "Ajouter un produit"),
    rows ? `<div class="cfg-scroll"><table class="cfg-table"><thead><tr><th>SKU</th><th>Catégorie</th><th>Thermique</th><th>Fragilité</th><th>Conservation</th><th>Durée</th><th>Prix</th><th>Coût</th><th>Marge connue</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : empty("Aucun produit dans cet espace."));
}
const lvl = (l: Level5) => (l === "unknown" ? unknown : `<span class="tag ${l === "high" || l === "critical" ? "tag-bx" : ""}">${esc(LEVEL_LABEL[l])}</span>`);

function tabCarriers(): string {
  const s = vs.snap!;
  const blocks = s.carriers.map((c) => {
    const methods = s.deliveryMethods.filter((m) => m.carrier_id === c.id);
    return `<div class="cfg-carrier"><div class="cfg-section-head"><div><b>${esc(c.name)}</b></div>${rowActions("carriers", c.id)}</div>
      ${methods.length ? `<table class="cfg-table"><thead><tr><th>Mode</th><th>Température dirigée</th><th>Transit maximal</th><th></th></tr></thead><tbody>${methods.map((m) => `<tr><td>${esc(m.name)}</td><td>${tri(m.temperature_controlled)}</td><td>${show(m.max_transit_hours, " h")}</td><td class="r">${rowActions("delivery_methods", m.id)}</td></tr>`).join("")}</tbody></table>` : empty("Aucun mode de livraison.")}
      ${store.canAdmin ? `<button class="btn btn-line btn-sm" data-add="delivery_methods" data-carrier="${esc(c.id)}"><i class="ph ph-plus"></i>Ajouter un mode</button>` : ""}</div>`;
  }).join("");
  return section("Transporteurs et modes de livraison", "", addBtn("carriers", "Ajouter un transporteur"), blocks || empty("Aucun transporteur."));
}

function tabStock(): string {
  const s = vs.snap!;
  const sites = s.sites.filter((x) => x.workspace_id === vs.workspaceId);
  const products = s.products.filter((p) => p.workspace_id === vs.workspaceId);
  if (!sites.length || !products.length) return section("Stocks", "", "", empty("Ajoutez d'abord des établissements et des produits."));
  const cell = (site: Site, p: Product) => {
    const st = s.stock.find((x) => x.site_id === site.id && x.product_id === p.id);
    const val = st ? String(st.quantity) : "";
    return store.canStock
      ? `<td><input class="cfg-qty" type="number" min="0" step="1" inputmode="numeric" value="${esc(val)}" placeholder="?" data-stock-site="${esc(site.id)}" data-stock-product="${esc(p.id)}" aria-label="Stock ${esc(p.sku)} à ${esc(site.name)}"></td>`
      : `<td>${st ? esc(st.quantity) : unknown}</td>`;
  };
  return section("Stocks par établissement", `Saisie manuelle, datée, source « manuelle ». Une case vide signifie stock inconnu, pas zéro.${store.canStock ? " Validez avec Entrée." : ""}`, "",
    `<div class="cfg-scroll"><table class="cfg-table cfg-matrix"><thead><tr><th>Produit</th>${sites.map((x) => `<th>${esc(x.name)}${x.kind === "store" && !x.ships_orders ? `<span class="sub">n'expédie pas</span>` : ""}</th>`).join("")}</tr></thead>
    <tbody>${products.map((p) => `<tr><td><b>${esc(p.sku)}</b><span class="sub">${esc(p.name)}</span></td>${sites.map((x) => cell(x, p)).join("")}</tr>`).join("")}</tbody></table></div>`);
}

function tabPolicies(): string {
  const s = vs.snap!;
  const sets = s.policySets.filter((p) => p.workspace_id === vs.workspaceId);
  const blocks = sets.map((set) => {
    const versions = s.policyVersions.filter((v) => v.policy_set_id === set.id).sort((a, b) => b.version - a.version);
    const active = versions.find((v) => v.status === "active");
    const draft = versions.find((v) => v.status === "draft");
    return `<article class="cfg-policy">
      <div class="cfg-section-head"><div><h3>${esc(POLICY_LABEL[set.kind] ?? set.kind)}</h3><p class="muted small">${esc(set.name)}${active ? `, version ${active.version} active` : ", aucune version active"}</p></div>
        <div class="cfg-row-actions">${store.canAdmin ? (draft
          ? `<button class="btn btn-line btn-sm" data-pol-edit="${esc(draft.id)}"><i class="ph ph-pencil-simple"></i>Modifier le brouillon v${draft.version}</button><button class="btn btn-bx btn-sm" data-pol-activate="${esc(draft.id)}"><i class="ph ph-seal-check"></i>Activer v${draft.version}</button>`
          : `<button class="btn btn-line btn-sm" data-pol-new="${esc(set.id)}"><i class="ph ph-git-branch"></i>Nouvelle version</button>`) : ""}</div></div>
      ${active ? policySummary(set, active) : empty("Aucune version active : la fonction correspondante est indisponible dans les moteurs.")}
      <details class="cfg-history"><summary>Historique (${versions.length} version${versions.length > 1 ? "s" : ""})</summary>
        <ol>${versions.map((v) => `<li><b>v${v.version}</b> <span class="tag ${v.status === "active" ? "tag-ink" : v.status === "draft" ? "tag-bx" : "tag-line"}">${{ active: "Active", draft: "Brouillon", retired: "Retirée" }[v.status]}</span> ${v.activated_at ? `<span class="muted small">activée le ${new Date(v.activated_at).toLocaleString("fr-FR")}</span>` : ""}<pre>${esc(JSON.stringify(v.body, null, 2))}</pre></li>`).join("")}</ol></details>
    </article>`;
  }).join("");
  const missing = (Object.keys(POLICY_LABEL) as PolicyKind[]).filter((k) => !sets.some((x) => x.kind === k));
  return section("Politiques métier", "Versionnées : une version active est figée, les décisions passées gardent la version sous laquelle elles ont été prises.",
    store.canAdmin && missing.length ? `<button class="btn btn-ink btn-sm" data-add="policy_sets"><i class="ph ph-plus"></i>Nouvelle politique</button>` : "",
    blocks || empty("Aucune politique dans cet espace."));
}

function policySummary(set: PolicySet, v: PolicyVersion): string {
  const b = v.body as Record<string, any>;
  if (set.kind === "authorization" && b.limits) {
    return `<table class="cfg-table"><thead><tr><th>Rôle</th><th>Plafond engagé sans validation</th></tr></thead><tbody>${(Object.keys(ROLE_LABEL) as Role[]).map((r) =>
      `<tr><td>${ROLE_LABEL[r]}</td><td>${typeof b.limits[r] === "number" ? euro(b.limits[r]) : unknown}</td></tr>`).join("")}</tbody></table>`;
  }
  if (set.kind === "resolution" && b.courier) {
    return `<dl class="kv cfg-kv"><dt>Zones coursier</dt><dd>${esc((b.courier.zones || []).join(", ")) || unknown}</dd><dt>Commande avant</dt><dd>${show(b.courier.order_before_hour, " h")}</dd><dt>Remise avant</dt><dd>${show(b.courier.delivered_before)}</dd>
      ${b.goodwill ? Object.entries(b.goodwill).map(([k, r]) => `<dt>Geste « ${esc(k)} »</dt><dd>${Math.round(Number(r) * 100)} %</dd>`).join("") : ""}</dl>`;
  }
  return `<pre class="cfg-pre">${esc(JSON.stringify(v.body, null, 2))}</pre>`;
}

// ---------------------------------------------------------------- onglets asynchrones
async function fillAsync(): Promise<void> {
  const box = root.querySelector<HTMLElement>("[data-async]");
  if (!box) return;
  try {
    if (box.dataset.async === "team") {
      if (store.mode === "demo") { box.innerHTML = section("Équipe", "", "", empty("L'espace de démonstration n'a pas d'équipe : il utilise une session fictive.")); return; }
      const members = await store.members();
      box.innerHTML = section("Équipe et rôles", "Pour ajouter quelqu'un, la personne crée d'abord son compte PULS ; vous l'ajoutez ensuite avec son e-mail.",
        addBtn("member", "Ajouter un membre"),
        `<table class="cfg-table"><thead><tr><th>Membre</th><th>Rôle</th><th>Statut</th><th></th></tr></thead><tbody>${members.map((m) => `<tr>
          <td>${esc(m.email)}</td>
          <td>${store.canAdmin && m.status === "active" ? `<select data-role-user="${esc(m.user_id)}" aria-label="Rôle de ${esc(m.email)}">${(Object.keys(ROLE_LABEL) as Role[]).map((r) => opt(r, ROLE_LABEL[r], m.role)).join("")}</select>` : esc(ROLE_LABEL[m.role])}</td>
          <td>${m.status === "active" ? "Actif" : `<span class="tag tag-line">Suspendu</span>`}</td>
          <td class="r">${store.canAdmin && m.status === "active" && m.user_id !== ctx.session.userId ? `<button class="btn btn-line btn-sm" data-suspend="${esc(m.user_id)}" data-email="${esc(m.email)}">Suspendre</button>` : ""}</td></tr>`).join("")}</tbody></table>`);
    } else {
      if (!store.canAudit) { box.innerHTML = section("Journal des actions", "", "", empty("Le journal est réservé aux administrateurs et aux responsables SAV.")); return; }
      const rows = await store.audit(200);
      box.innerHTML = section("Journal des actions", "Ajout seul : aucune entrée ne peut être modifiée ni supprimée.", "",
        rows.length ? `<div class="cfg-scroll"><table class="cfg-table"><thead><tr><th>Date</th><th>Action</th><th>Objet</th><th>Détail</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${new Date(r.at).toLocaleString("fr-FR")}</td><td><code>${esc(r.action)}</code></td><td>${esc(r.entity)}</td><td><code class="small">${esc(JSON.stringify(r.detail))}</code></td></tr>`).join("")}</tbody></table></div>` : empty("Aucune entrée."));
    }
    bind(box);
  } catch (e) {
    box.innerHTML = panel("Chargement impossible", humanError(e), "ph-warning");
  }
}

// ---------------------------------------------------------------- formulaires
function field(label: string, input: string, hint = ""): string {
  return `<label class="cfg-field"><span>${esc(label)}</span>${input}${hint ? `<small>${esc(hint)}</small>` : ""}</label>`;
}
const text = (name: string, v: unknown = "", attrs = "") => `<input name="${name}" value="${esc(v ?? "")}" ${attrs}>`;
const num = (name: string, v: unknown = "", attrs = "") => `<input name="${name}" type="number" step="any" value="${v === null || v === undefined ? "" : esc(v)}" placeholder="Inconnu" ${attrs}>`;
const levelSel = (name: string, v: Level5) => `<select name="${name}">${(Object.keys(LEVEL_LABEL) as Level5[]).map((l) => opt(l, LEVEL_LABEL[l], v)).join("")}</select>`;

async function editForm(table: Table | "member" | "policy_sets", id?: string, extra: Record<string, string> = {}): Promise<void> {
  const s = vs.snap!;
  const ws = vs.workspaceId;
  const cur = <T extends { id: string }>(list: T[]) => list.find((x) => x.id === id);
  let title = "", body = "", build: (f: FormData) => Record<string, unknown> = () => ({});
  switch (table) {
    case "workspaces": {
      const w = cur(s.workspaces);
      title = w ? "Modifier l'espace" : "Nouvel espace"; body = field("Nom", text("name", w?.name, "required"));
      build = (f) => ({ name: String(f.get("name")).trim() });
      break;
    }
    case "legal_entities": {
      const l = cur(s.legalEntities);
      title = l ? "Modifier l'entité juridique" : "Nouvelle entité juridique";
      body = field("Raison sociale", text("name", l?.name, "required")) + field("Numéro d'immatriculation", text("registration_number", l?.registration_number), "Laissez vide si inconnu.") + field("Pays (code ISO)", text("country", l?.country, 'maxlength="2"'));
      build = (f) => ({ name: String(f.get("name")).trim(), registration_number: String(f.get("registration_number")).trim() || null, country: String(f.get("country")).trim().toUpperCase() || null });
      break;
    }
    case "brands": {
      const b = cur(s.brands);
      title = b ? "Modifier la marque" : "Nouvelle marque";
      body = field("Nom", text("name", b?.name, "required")) + field("Entité juridique", `<select name="legal_entity_id">${opt("", "Non renseignée", b?.legal_entity_id ?? "")}${s.legalEntities.map((l) => opt(l.id, l.name, b?.legal_entity_id)).join("")}</select>`);
      build = (f) => ({ name: String(f.get("name")).trim(), legal_entity_id: String(f.get("legal_entity_id")) || null, workspace_id: b?.workspace_id ?? ws });
      break;
    }
    case "sites": {
      const x = cur(s.sites);
      title = x ? "Modifier l'établissement" : "Nouvel établissement";
      body = `<div class="cfg-grid">${field("Nom", text("name", x?.name, "required"))}
        ${field("Type", `<select name="kind">${(Object.keys(SITE_LABEL) as Site["kind"][]).map((k) => opt(k, SITE_LABEL[k], x?.kind ?? "warehouse")).join("")}</select>`)}
        ${field("Ville", text("city", x?.city))}
        ${field("Marque", `<select name="brand_id">${opt("", "Toutes", x?.brand_id ?? "")}${s.brands.filter((b) => b.workspace_id === ws).map((b) => opt(b.id, b.name, x?.brand_id)).join("")}</select>`)}
        ${field("Capacité de préparation par jour", num("prep_capacity_per_day", x?.prep_capacity_per_day, 'min="0" step="1"'))}
        ${field("Horaires", text("opening_hours", x?.opening_hours?.description), "Texte libre, vide si inconnus.")}
        ${field("Transfert vers un autre site", triSel("can_transfer", x?.can_transfer ?? null))}
        ${field("Coursier disponible", triSel("courier_available", x?.courier_available ?? null))}</div>
        <label class="check"><input type="checkbox" name="ships_orders" ${x?.ships_orders ? "checked" : ""}><span>Cet établissement expédie des commandes. Une boutique n'est jamais considérée comme un entrepôt sans cette déclaration.</span></label>`;
      build = (f) => ({
        name: String(f.get("name")).trim(), kind: f.get("kind"), city: String(f.get("city")).trim() || null, brand_id: String(f.get("brand_id")) || null,
        prep_capacity_per_day: numOrNull(f.get("prep_capacity_per_day")), opening_hours: String(f.get("opening_hours")).trim() ? { description: String(f.get("opening_hours")).trim() } : null,
        can_transfer: triOf(f.get("can_transfer")), courier_available: triOf(f.get("courier_available")), ships_orders: f.get("ships_orders") === "on", workspace_id: x?.workspace_id ?? ws,
      });
      break;
    }
    case "products": {
      const p = cur(s.products);
      title = p ? `Modifier ${p.sku}` : "Nouveau produit";
      body = `<div class="cfg-grid">${field("SKU", text("sku", p?.sku, "required"))}${field("Nom", text("name", p?.name, "required"))}
        ${field("Marque", `<select name="brand_id">${opt("", "Non renseignée", p?.brand_id ?? "")}${s.brands.filter((b) => b.workspace_id === ws).map((b) => opt(b.id, b.name, p?.brand_id)).join("")}</select>`)}
        ${field("Catégorie", text("category", p?.category))}
        ${field("Sensibilité thermique", levelSel("thermal_sensitivity", p?.thermal_sensitivity ?? "unknown"))}${field("Fragilité", levelSel("fragility", p?.fragility ?? "unknown"))}
        ${field("Température minimale (°C)", num("storage_temp_min_c", p?.storage_temp_min_c))}${field("Température maximale (°C)", num("storage_temp_max_c", p?.storage_temp_max_c))}
        ${field("Durée de conservation (heures)", num("shelf_life_hours", p?.shelf_life_hours, 'min="1" step="1"'))}${field("Conditions de conservation", text("storage_conditions", p?.storage_conditions))}
        ${field("Prix de vente (€)", num("list_price", p?.list_price, 'min="0"'))}${field("Coût de revient (€)", num("unit_cost", p?.unit_cost, 'min="0"'), "Vide : aucune marge ne sera calculée.")}</div>
        ${field("Restrictions de transport", text("transport_restrictions", (p?.transport_restrictions ?? []).join(", ")), "Séparées par des virgules.")}
        <p class="muted small">Un champ laissé vide reste « inconnu ». PULS n'invente jamais de température, de durée ni de coût.</p>`;
      build = (f) => ({
        sku: String(f.get("sku")).trim(), name: String(f.get("name")).trim(), brand_id: String(f.get("brand_id")) || null, category: String(f.get("category")).trim() || null,
        thermal_sensitivity: f.get("thermal_sensitivity"), fragility: f.get("fragility"),
        storage_temp_min_c: numOrNull(f.get("storage_temp_min_c")), storage_temp_max_c: numOrNull(f.get("storage_temp_max_c")),
        shelf_life_hours: numOrNull(f.get("shelf_life_hours")), storage_conditions: String(f.get("storage_conditions")).trim() || null,
        list_price: numOrNull(f.get("list_price")), unit_cost: numOrNull(f.get("unit_cost")),
        transport_restrictions: String(f.get("transport_restrictions")).split(",").map((t) => t.trim()).filter(Boolean), workspace_id: p?.workspace_id ?? ws,
      });
      break;
    }
    case "carriers": {
      const c = cur(s.carriers);
      title = c ? "Modifier le transporteur" : "Nouveau transporteur"; body = field("Nom", text("name", c?.name, "required"));
      build = (f) => ({ name: String(f.get("name")).trim() });
      break;
    }
    case "delivery_methods": {
      const m = cur(s.deliveryMethods);
      title = m ? "Modifier le mode de livraison" : "Nouveau mode de livraison";
      body = field("Nom", text("name", m?.name, "required")) + field("Température dirigée", triSel("temperature_controlled", m?.temperature_controlled ?? null)) + field("Transit maximal (heures)", num("max_transit_hours", m?.max_transit_hours, 'min="1" step="1"'));
      build = (f) => ({ name: String(f.get("name")).trim(), temperature_controlled: triOf(f.get("temperature_controlled")), max_transit_hours: numOrNull(f.get("max_transit_hours")), carrier_id: m?.carrier_id ?? extra.carrier });
      break;
    }
    case "member": {
      const f = await dialog("Ajouter un membre", field("E-mail du compte PULS", `<input name="email" type="email" required autocomplete="off">`) + field("Rôle", `<select name="role">${(Object.keys(ROLE_LABEL) as Role[]).map((r) => opt(r, ROLE_LABEL[r], "agent")).join("")}</select>`), "Ajouter");
      if (f) await run("Membre ajouté", () => store.addMember(String(f.get("email")).trim(), f.get("role") as Role));
      return;
    }
    case "policy_sets": {
      const kinds = (Object.keys(POLICY_LABEL) as PolicyKind[]).filter((k) => !s.policySets.some((x) => x.workspace_id === ws && x.kind === k));
      const f = await dialog("Nouvelle politique", field("Type", `<select name="kind">${kinds.map((k) => opt(k, POLICY_LABEL[k], kinds[0])).join("")}</select>`) + field("Nom", text("name", "", "required")), "Créer le brouillon");
      if (f && ws) {
        const kind = String(f.get("kind"));
        await run("Brouillon créé", () => store.createPolicySet(ws, kind, String(f.get("name")).trim(), policyTemplate(kind)));
      }
      return;
    }
    default: return;
  }
  const f = await dialog(title, body, id ? "Enregistrer" : "Ajouter", { wide: table === "products" || table === "sites" });
  if (!f) return;
  const row = build(f);
  await run(id ? "Modifications enregistrées" : "Élément ajouté", () => (id ? store.update(table as Table, id, row) : store.insert(table as Table, row)));
}

async function policyEditor(mode: "new" | "edit", ref: string): Promise<void> {
  const s = vs.snap!;
  const draft = mode === "edit" ? s.policyVersions.find((v) => v.id === ref) : undefined;
  const set = s.policySets.find((x) => x.id === (draft?.policy_set_id ?? ref));
  if (!set) return;
  const active = s.policyVersions.find((v) => v.policy_set_id === set.id && v.status === "active");
  const start = draft?.body ?? active?.body ?? policyTemplate(set.kind);
  const d = dialog(`${POLICY_LABEL[set.kind]} : ${draft ? `brouillon v${draft.version}` : "nouvelle version"}`,
    `<p class="muted small">Le brouillon n'a aucun effet tant qu'il n'est pas activé. Format JSON, vérifié avant enregistrement.</p>
     <textarea name="body" class="cfg-json" spellcheck="false" rows="18">${esc(JSON.stringify(start, null, 2))}</textarea>`, "Enregistrer le brouillon", { wide: true });
  const dlg = document.querySelector<HTMLDialogElement>("dialog.cfg-dialog:last-of-type");
  if (dlg) (dlg as HTMLDialogElement & { validateWith?: (f: FormData) => string | null }).validateWith = (f) => {
    let parsed: unknown;
    try { parsed = JSON.parse(String(f.get("body"))); } catch { return "JSON invalide : vérifiez les virgules et les guillemets."; }
    const errs = validatePolicy(set.kind, parsed);
    return errs.length ? errs.join(" ") : null;
  };
  const f = await d;
  if (!f) return;
  const body = JSON.parse(String(f.get("body"))) as Record<string, unknown>;
  await run("Brouillon enregistré", () => (draft ? store.updateDraft(draft.id, body) : store.createDraft(set.id, body)));
}

// ---------------------------------------------------------------- événements
function bind(scope: ParentNode = root): void {
  scope.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((b) => b.addEventListener("click", () => {
    vs.tab = b.dataset.tab as Tab; render(); void fillAsync();
  }));
  scope.querySelector<HTMLSelectElement>('[data-cfg="workspace"]')?.addEventListener("change", (e) => { vs.workspaceId = (e.target as HTMLSelectElement).value; render(); });
  scope.querySelector<HTMLSelectElement>('[data-cfg="company"]')?.addEventListener("change", (e) => {
    try { sessionStorage.setItem("puls-company", (e.target as HTMLSelectElement).value); } catch { /* sans stockage, la première entreprise reste sélectionnée */ }
    window.PULS.reload?.();
  });
  scope.querySelector('[data-cfg="seed"]')?.addEventListener("click", async () => {
    if (await confirmBox("Charger la démonstration", "Un catalogue, des établissements, des transporteurs, des stocks et des politiques fictifs (chocolaterie) seront créés dans cet espace. Vous pourrez tout modifier ou supprimer.", "Charger")) {
      await run("Configuration de démonstration chargée", () => store.seedDemo());
      window.PULS.reload?.();
    }
  });
  scope.querySelectorAll<HTMLButtonElement>("[data-add]").forEach((b) => b.addEventListener("click", () => void editForm(b.dataset.add as Table, undefined, { carrier: b.dataset.carrier ?? "" })));
  scope.querySelectorAll<HTMLButtonElement>("[data-edit]").forEach((b) => b.addEventListener("click", () => void editForm(b.dataset.edit as Table, b.dataset.id)));
  scope.querySelectorAll<HTMLButtonElement>("[data-del]").forEach((b) => b.addEventListener("click", async () => {
    if (await confirmBox("Supprimer", "Cette suppression est définitive et sera tracée dans le journal si elle touche une donnée sensible. Les éléments rattachés peuvent être supprimés avec elle.", "Supprimer", true)) {
      await run("Élément supprimé", () => store.remove(b.dataset.del as Table, b.dataset.id!));
    }
  }));
  scope.querySelectorAll<HTMLInputElement>("[data-stock-site]").forEach((i) => {
    const save = async () => {
      if (i.value.trim() === "" || i.value === i.defaultValue) return;
      const q = Number(i.value);
      if (!Number.isInteger(q) || q < 0) { notify("Quantité invalide", "Entier positif ou nul attendu.", "ph-prohibit"); i.value = i.defaultValue; return; }
      try { await store.setStock(i.dataset.stockSite!, i.dataset.stockProduct!, q); i.defaultValue = i.value; i.classList.add("saved"); notify("Stock enregistré", `${q} unité${q > 1 ? "s" : ""}, source manuelle`); }
      catch (e) { notify("Action impossible", humanError(e), "ph-prohibit"); i.value = i.defaultValue; }
    };
    i.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); void save(); } });
    i.addEventListener("change", () => void save());
  });
  scope.querySelectorAll<HTMLButtonElement>("[data-pol-new]").forEach((b) => b.addEventListener("click", () => void policyEditor("new", b.dataset.polNew!)));
  scope.querySelectorAll<HTMLButtonElement>("[data-pol-edit]").forEach((b) => b.addEventListener("click", () => void policyEditor("edit", b.dataset.polEdit!)));
  scope.querySelectorAll<HTMLButtonElement>("[data-pol-activate]").forEach((b) => b.addEventListener("click", async () => {
    const v = vs.snap!.policyVersions.find((x) => x.id === b.dataset.polActivate);
    const set = vs.snap!.policySets.find((x) => x.id === v?.policy_set_id);
    if (!v || !set) return;
    const errs = validatePolicy(set.kind, v.body);
    if (errs.length) { notify("Brouillon invalide", errs[0] ?? "", "ph-prohibit"); return; }
    if (await confirmBox(`Activer la version ${v.version}`, "Elle s'appliquera immédiatement aux nouvelles décisions. La version active actuelle sera retirée ; les décisions passées gardent leur version.", "Activer")) {
      await run(`Version ${v.version} active`, () => store.activate(v.id));
    }
  }));
  scope.querySelectorAll<HTMLSelectElement>("[data-role-user]").forEach((sel) => {
    const before = sel.value;
    sel.addEventListener("change", async () => {
      const role = sel.value as Role;
      if (await confirmBox("Changer le rôle", `Nouveau rôle : ${ROLE_LABEL[role]}. Ses droits et sa délégation financière changent immédiatement.`, "Confirmer")) {
        await run("Rôle modifié", () => store.setRole(sel.dataset.roleUser!, role));
      } else sel.value = before;
    });
  });
  scope.querySelectorAll<HTMLButtonElement>("[data-suspend]").forEach((b) => b.addEventListener("click", async () => {
    if (await confirmBox("Suspendre le membre", `${b.dataset.email} n'aura plus accès à cette entreprise.`, "Suspendre", true)) {
      await run("Membre suspendu", () => store.suspend(b.dataset.suspend!));
    }
  }));
  if (scope === root) void fillAsync();
}
