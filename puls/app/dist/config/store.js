const must = (r) => {
    if (r.error)
        throw r.error;
    return r.data;
};
export class SupabaseConfigStore {
    constructor(db, companyId, role) {
        this.db = db;
        this.companyId = companyId;
        this.role = role;
        this.mode = "account";
    }
    get canAdmin() { return this.role === "admin"; }
    get canStock() { return this.role === "admin" || this.role === "logistics_manager"; }
    get canAudit() { return this.role === "admin" || this.role === "sav_manager"; }
    cid() {
        if (!this.companyId)
            throw new Error("Aucune entreprise sélectionnée.");
        return this.companyId;
    }
    async companies() {
        const rows = must(await this.db.from("memberships").select("role, company_id, companies(name, environment)").eq("status", "active"));
        return rows
            .filter((r) => r.companies)
            .map((r) => ({ id: r.company_id, role: r.role, name: r.companies.name, environment: r.companies.environment }));
    }
    async createCompany(name) {
        return must(await this.db.rpc("create_company", { p_name: name }));
    }
    async seedDemo() {
        must(await this.db.rpc("seed_demo_configuration", { p_company: this.cid() }));
    }
    async load() {
        const cid = this.cid();
        const q = (t, order = "name") => this.db.from(t).select("*").eq("company_id", cid).order(order).then((r) => must(r));
        const [workspaces, legalEntities, brands, sites, products, carriers, deliveryMethods, stock, policySets, policyVersions] = await Promise.all([
            q("workspaces"), q("legal_entities"), q("brands"), q("sites"), q("products", "sku"),
            q("carriers"), q("delivery_methods"), q("stock_levels", "as_of"),
            q("policy_sets"), q("policy_versions", "version"),
        ]);
        return { workspaces, legalEntities, brands, sites, products, carriers, deliveryMethods, stock, policySets, policyVersions };
    }
    async insert(table, row) {
        must(await this.db.from(table).insert({ ...row, company_id: this.cid() }));
    }
    async update(table, id, patch) {
        const { company_id: _ignored, id: _id, ...clean } = patch;
        must(await this.db.from(table).update(clean).eq("id", id).eq("company_id", this.cid()));
    }
    async remove(table, id) {
        must(await this.db.from(table).delete().eq("id", id).eq("company_id", this.cid()));
    }
    async setStock(siteId, productId, quantity) {
        must(await this.db.from("stock_levels").upsert({
            company_id: this.cid(), site_id: siteId, product_id: productId, quantity, as_of: new Date().toISOString(), source: "manual",
        }, { onConflict: "site_id,product_id" }));
    }
    async members() { return must(await this.db.rpc("list_members", { p_company: this.cid() })); }
    async addMember(email, role) { must(await this.db.rpc("add_member", { p_company: this.cid(), p_email: email, p_role: role })); }
    async setRole(userId, role) { must(await this.db.rpc("set_member_role", { p_company: this.cid(), p_user: userId, p_role: role })); }
    async suspend(userId) { must(await this.db.rpc("suspend_member", { p_company: this.cid(), p_user: userId })); }
    async createPolicySet(workspaceId, kind, name, body) {
        const set = must(await this.db.from("policy_sets").insert({ company_id: this.cid(), workspace_id: workspaceId, kind, name }).select("id").single());
        must(await this.db.from("policy_versions").insert({ company_id: this.cid(), policy_set_id: set.id, version: 1, body, status: "draft" }));
    }
    async createDraft(setId, body) {
        const last = must(await this.db.from("policy_versions").select("version").eq("policy_set_id", setId).order("version", { ascending: false }).limit(1));
        must(await this.db.from("policy_versions").insert({ company_id: this.cid(), policy_set_id: setId, version: (last[0]?.version ?? 0) + 1, body, status: "draft" }));
    }
    async updateDraft(versionId, body) {
        must(await this.db.from("policy_versions").update({ body }).eq("id", versionId).eq("status", "draft"));
    }
    async activate(versionId) { must(await this.db.rpc("activate_policy_version", { p_version: versionId })); }
    async audit(limit) {
        return must(await this.db.from("audit_log").select("*").eq("company_id", this.cid()).order("at", { ascending: false }).limit(limit));
    }
}
const READ_ONLY = "Espace de démonstration en lecture seule : créez un compte pour configurer votre entreprise.";
/** Démonstration : la configuration affichée est exactement celle qui fait tourner l'espace de démo. */
export class DemoConfigStore {
    constructor(ctx) {
        this.ctx = ctx;
        this.mode = "demo";
        this.companyId = "demo";
        this.canAdmin = false;
        this.canStock = false;
        this.canAudit = false;
        this.role = ctx.session.roleKey;
    }
    async companies() {
        return [{ id: "demo", name: this.ctx.session.workspace ?? "Démonstration", environment: "demo", role: this.role ?? "viewer" }];
    }
    async load() {
        const ws = { id: "demo-ws", company_id: "demo", name: "Principal" };
        const brand = { id: "demo-brand", company_id: "demo", workspace_id: ws.id, legal_entity_id: "demo-le", name: ws.name === "Principal" ? (this.ctx.session.workspace ?? "Marque") : ws.name };
        const site = (id, name, city, kind, ships) => ({
            id, company_id: "demo", workspace_id: ws.id, brand_id: brand.id, name, kind, ships_orders: ships, city, timezone: "Europe/Paris",
            opening_hours: null, prep_capacity_per_day: null, can_transfer: null, courier_available: null,
        });
        const sites = [site("Paris", "Entrepôt Paris", "Paris", "warehouse", true), site("Lyon", "Entrepôt Lyon", "Lyon", "warehouse", true)];
        const products = Object.entries(this.ctx.data.PRODUCTS).map(([key, p]) => ({
            id: key, company_id: "demo", workspace_id: ws.id, brand_id: brand.id, sku: key.toUpperCase(), name: p.name, category: p.cat,
            thermal_sensitivity: (p.level ?? "unknown"), fragility: "unknown", storage_conditions: null, storage_temp_min_c: null,
            storage_temp_max_c: null, shelf_life_hours: null, transport_restrictions: [], unit_cost: null, list_price: p.price,
        }));
        const stock = [];
        for (const [key, levels] of Object.entries(this.ctx.data.STOCK)) {
            for (const s of sites) {
                const q = levels[s.id];
                if (typeof q === "number")
                    stock.push({ company_id: "demo", site_id: s.id, product_id: key, quantity: q, as_of: "", source: "manual" });
            }
        }
        const carriers = this.ctx.data.CARRIERS.map((c, i) => ({ id: `c${i}`, company_id: "demo", name: c.name }));
        const policySets = [];
        const policyVersions = [];
        for (const [kind, body] of Object.entries(this.ctx.rules)) {
            const id = `p-${kind}`;
            policySets.push({ id, company_id: "demo", workspace_id: ws.id, kind: kind, name: kind });
            policyVersions.push({ id: `${id}-v1`, company_id: "demo", policy_set_id: id, version: 1, body: body, status: "active", created_at: "", activated_at: null });
        }
        return { workspaces: [ws], legalEntities: [], brands: [brand], sites, products, carriers, deliveryMethods: [], stock, policySets, policyVersions };
    }
    ro() { throw new Error(READ_ONLY); }
    async createCompany() { return this.ro(); }
    async seedDemo() { this.ro(); }
    async insert() { this.ro(); }
    async update() { this.ro(); }
    async remove() { this.ro(); }
    async setStock() { this.ro(); }
    async members() { return []; }
    async addMember() { this.ro(); }
    async setRole() { this.ro(); }
    async suspend() { this.ro(); }
    async createPolicySet() { this.ro(); }
    async createDraft() { this.ro(); }
    async updateDraft() { this.ro(); }
    async activate() { this.ro(); }
    async audit() { return []; }
}
