// Accès aux données de configuration. Deux implémentations derrière une seule interface :
// - SupabaseConfigStore : compte réel ; l'isolation est garantie par la base (RLS), pas par ce code.
// - DemoConfigStore : espace de démonstration, lecture seule, construit depuis les données fictives.
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AuditEntry, Brand, Carrier, CompanyRef, DeliveryMethod, LegalEntity, Level5, Member, MountContext, PolicySet,
  PolicyVersion, Product, Role, Site, StockLevel, Table, Workspace,
} from "./types.js";

export interface ConfigSnapshot {
  workspaces: Workspace[]; legalEntities: LegalEntity[]; brands: Brand[]; sites: Site[]; products: Product[];
  carriers: Carrier[]; deliveryMethods: DeliveryMethod[]; stock: StockLevel[]; policySets: PolicySet[]; policyVersions: PolicyVersion[];
}

export interface ConfigStore {
  readonly mode: "demo" | "account";
  readonly companyId: string | null;
  readonly role: Role | null;
  /** Peut écrire la configuration générale (administrateur). */
  readonly canAdmin: boolean;
  /** Peut écrire les stocks (administrateur, responsable logistique). */
  readonly canStock: boolean;
  /** Peut lire le journal d'audit. */
  readonly canAudit: boolean;
  companies(): Promise<CompanyRef[]>;
  createCompany(name: string): Promise<string>;
  seedDemo(): Promise<void>;
  load(): Promise<ConfigSnapshot>;
  insert(table: Table, row: Record<string, unknown>): Promise<void>;
  update(table: Table, id: string, patch: Record<string, unknown>): Promise<void>;
  remove(table: Table, id: string): Promise<void>;
  setStock(siteId: string, productId: string, quantity: number): Promise<void>;
  members(): Promise<Member[]>;
  addMember(email: string, role: Role): Promise<void>;
  setRole(userId: string, role: Role): Promise<void>;
  suspend(userId: string): Promise<void>;
  createPolicySet(workspaceId: string, kind: string, name: string, body: Record<string, unknown>): Promise<void>;
  createDraft(setId: string, body: Record<string, unknown>): Promise<void>;
  updateDraft(versionId: string, body: Record<string, unknown>): Promise<void>;
  activate(versionId: string): Promise<void>;
  audit(limit: number): Promise<AuditEntry[]>;
}

const must = <T>(r: { data: T | null; error: unknown }): T => {
  if (r.error) throw r.error;
  return r.data as T;
};

export class SupabaseConfigStore implements ConfigStore {
  readonly mode = "account" as const;
  constructor(private readonly db: SupabaseClient, readonly companyId: string | null, readonly role: Role | null) {}
  get canAdmin() { return this.role === "admin"; }
  get canStock() { return this.role === "admin" || this.role === "logistics_manager"; }
  get canAudit() { return this.role === "admin" || this.role === "sav_manager"; }

  private cid(): string {
    if (!this.companyId) throw new Error("Aucune entreprise sélectionnée.");
    return this.companyId;
  }

  async companies(): Promise<CompanyRef[]> {
    const rows = must(await this.db.from("memberships").select("role, company_id, companies(name, environment)").eq("status", "active"));
    return (rows as unknown as { role: Role; company_id: string; companies: { name: string; environment: "demo" | "production" } | null }[])
      .filter((r) => r.companies)
      .map((r) => ({ id: r.company_id, role: r.role, name: r.companies!.name, environment: r.companies!.environment }));
  }
  async createCompany(name: string): Promise<string> {
    return must(await this.db.rpc("create_company", { p_name: name })) as string;
  }
  async seedDemo(): Promise<void> {
    must(await this.db.rpc("seed_demo_configuration", { p_company: this.cid() }));
  }
  async load(): Promise<ConfigSnapshot> {
    const cid = this.cid();
    const q = <T>(t: string, order = "name") => this.db.from(t).select("*").eq("company_id", cid).order(order).then((r) => must(r) as T[]);
    const [workspaces, legalEntities, brands, sites, products, carriers, deliveryMethods, stock, policySets, policyVersions] = await Promise.all([
      q<Workspace>("workspaces"), q<LegalEntity>("legal_entities"), q<Brand>("brands"), q<Site>("sites"), q<Product>("products", "sku"),
      q<Carrier>("carriers"), q<DeliveryMethod>("delivery_methods"), q<StockLevel>("stock_levels", "as_of"),
      q<PolicySet>("policy_sets"), q<PolicyVersion>("policy_versions", "version"),
    ]);
    return { workspaces, legalEntities, brands, sites, products, carriers, deliveryMethods, stock, policySets, policyVersions };
  }
  async insert(table: Table, row: Record<string, unknown>) {
    must(await this.db.from(table).insert({ ...row, company_id: this.cid() }));
  }
  async update(table: Table, id: string, patch: Record<string, unknown>) {
    const { company_id: _ignored, id: _id, ...clean } = patch;
    must(await this.db.from(table).update(clean).eq("id", id).eq("company_id", this.cid()));
  }
  async remove(table: Table, id: string) {
    must(await this.db.from(table).delete().eq("id", id).eq("company_id", this.cid()));
  }
  async setStock(siteId: string, productId: string, quantity: number) {
    must(await this.db.from("stock_levels").upsert({
      company_id: this.cid(), site_id: siteId, product_id: productId, quantity, as_of: new Date().toISOString(), source: "manual",
    }, { onConflict: "site_id,product_id" }));
  }
  async members(): Promise<Member[]> { return must(await this.db.rpc("list_members", { p_company: this.cid() })) as Member[]; }
  async addMember(email: string, role: Role) { must(await this.db.rpc("add_member", { p_company: this.cid(), p_email: email, p_role: role })); }
  async setRole(userId: string, role: Role) { must(await this.db.rpc("set_member_role", { p_company: this.cid(), p_user: userId, p_role: role })); }
  async suspend(userId: string) { must(await this.db.rpc("suspend_member", { p_company: this.cid(), p_user: userId })); }
  async createPolicySet(workspaceId: string, kind: string, name: string, body: Record<string, unknown>) {
    const set = must(await this.db.from("policy_sets").insert({ company_id: this.cid(), workspace_id: workspaceId, kind, name }).select("id").single()) as { id: string };
    must(await this.db.from("policy_versions").insert({ company_id: this.cid(), policy_set_id: set.id, version: 1, body, status: "draft" }));
  }
  async createDraft(setId: string, body: Record<string, unknown>) {
    const last = must(await this.db.from("policy_versions").select("version").eq("policy_set_id", setId).order("version", { ascending: false }).limit(1)) as { version: number }[];
    must(await this.db.from("policy_versions").insert({ company_id: this.cid(), policy_set_id: setId, version: (last[0]?.version ?? 0) + 1, body, status: "draft" }));
  }
  async updateDraft(versionId: string, body: Record<string, unknown>) {
    must(await this.db.from("policy_versions").update({ body }).eq("id", versionId).eq("status", "draft"));
  }
  async activate(versionId: string) { must(await this.db.rpc("activate_policy_version", { p_version: versionId })); }
  async audit(limit: number): Promise<AuditEntry[]> {
    return must(await this.db.from("audit_log").select("*").eq("company_id", this.cid()).order("at", { ascending: false }).limit(limit)) as AuditEntry[];
  }
}

const READ_ONLY = "Espace de démonstration en lecture seule : créez un compte pour configurer votre entreprise.";

/** Démonstration : la configuration affichée est exactement celle qui fait tourner l'espace de démo. */
export class DemoConfigStore implements ConfigStore {
  readonly mode = "demo" as const;
  readonly companyId = "demo";
  readonly role: Role | null;
  readonly canAdmin = false;
  readonly canStock = false;
  readonly canAudit = false;
  constructor(private readonly ctx: MountContext) { this.role = ctx.session.roleKey; }
  async companies(): Promise<CompanyRef[]> {
    return [{ id: "demo", name: this.ctx.session.workspace ?? "Démonstration", environment: "demo", role: this.role ?? "viewer" }];
  }
  async load(): Promise<ConfigSnapshot> {
    const ws: Workspace = { id: "demo-ws", company_id: "demo", name: "Principal" };
    const brand: Brand = { id: "demo-brand", company_id: "demo", workspace_id: ws.id, legal_entity_id: "demo-le", name: ws.name === "Principal" ? (this.ctx.session.workspace ?? "Marque") : ws.name };
    const site = (id: string, name: string, city: string, kind: Site["kind"], ships: boolean): Site => ({
      id, company_id: "demo", workspace_id: ws.id, brand_id: brand.id, name, kind, ships_orders: ships, city, timezone: "Europe/Paris",
      opening_hours: null, prep_capacity_per_day: null, can_transfer: null, courier_available: null,
    });
    const sites = [site("Paris", "Entrepôt Paris", "Paris", "warehouse", true), site("Lyon", "Entrepôt Lyon", "Lyon", "warehouse", true)];
    const products: Product[] = Object.entries(this.ctx.data.PRODUCTS).map(([key, p]) => ({
      id: key, company_id: "demo", workspace_id: ws.id, brand_id: brand.id, sku: key.toUpperCase(), name: p.name, category: p.cat,
      thermal_sensitivity: (p.level ?? "unknown") as Level5, fragility: "unknown", storage_conditions: null, storage_temp_min_c: null,
      storage_temp_max_c: null, shelf_life_hours: null, transport_restrictions: [], unit_cost: null, list_price: p.price,
    }));
    const stock: StockLevel[] = [];
    for (const [key, levels] of Object.entries(this.ctx.data.STOCK)) {
      for (const s of sites) {
        const q = levels[s.id];
        if (typeof q === "number") stock.push({ company_id: "demo", site_id: s.id, product_id: key, quantity: q, as_of: "", source: "manual" });
      }
    }
    const carriers: Carrier[] = this.ctx.data.CARRIERS.map((c, i) => ({ id: `c${i}`, company_id: "demo", name: c.name }));
    const policySets: PolicySet[] = []; const policyVersions: PolicyVersion[] = [];
    for (const [kind, body] of Object.entries(this.ctx.rules)) {
      const id = `p-${kind}`;
      policySets.push({ id, company_id: "demo", workspace_id: ws.id, kind: kind as PolicySet["kind"], name: kind });
      policyVersions.push({ id: `${id}-v1`, company_id: "demo", policy_set_id: id, version: 1, body: body as Record<string, unknown>, status: "active", created_at: "", activated_at: null });
    }
    return { workspaces: [ws], legalEntities: [], brands: [brand], sites, products, carriers, deliveryMethods: [], stock, policySets, policyVersions };
  }
  private ro(): never { throw new Error(READ_ONLY); }
  async createCompany(): Promise<string> { return this.ro(); }
  async seedDemo() { this.ro(); }
  async insert() { this.ro(); }
  async update() { this.ro(); }
  async remove() { this.ro(); }
  async setStock() { this.ro(); }
  async members(): Promise<Member[]> { return []; }
  async addMember() { this.ro(); }
  async setRole() { this.ro(); }
  async suspend() { this.ro(); }
  async createPolicySet() { this.ro(); }
  async createDraft() { this.ro(); }
  async updateDraft() { this.ro(); }
  async activate() { this.ro(); }
  async audit(): Promise<AuditEntry[]> { return []; }
}
