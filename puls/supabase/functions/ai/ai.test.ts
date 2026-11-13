// Tests de la fonction « ai » : fournisseur OpenAI simulé, dépendances injectées, aucun appel réseau.
// Lancement : npm run test:ai (Node 22, types TypeScript retirés à la volée).
import { test } from "node:test";
import assert from "node:assert/strict";
import { OpenAIProvider } from "../_shared/ai/openai.ts";
import { createProvider } from "../_shared/ai/registry.ts";
import { AIError, type AIProvider, type FetchLike, type StructuredRequest } from "../_shared/ai/provider.ts";
import { handle, type Deps, type Role } from "./handler.ts";

const CO = "0e7c2f1a-5b1d-4a77-9a7e-2d3c4b5a6f70";
const okFetch = (content: unknown, extra: Record<string, unknown> = {}): { fn: FetchLike; calls: { url: string; init: { headers: Record<string, string>; body: string } }[] } => {
  const calls: { url: string; init: { headers: Record<string, string>; body: string } }[] = [];
  const fn: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => ({ model: "modele-test", choices: [{ message: { content: JSON.stringify(content) }, finish_reason: "stop" }], usage: { prompt_tokens: 120, completion_tokens: 80 }, ...extra }), text: async () => "" };
  };
  return { fn, calls };
};
const statusFetch = (status: number): FetchLike => async () => ({ ok: false, status, json: async () => ({}), text: async () => "secret-provider-detail" });

function deps(over: Partial<Deps> & { prov?: AIProvider; role?: Role | null; calls?: number } = {}) {
  const recorded: Parameters<Deps["record"]>[0][] = [];
  const d: Deps = {
    getUser: async (jwt) => (jwt === "jeton-valide" ? { id: "user-1" } : null),
    roleIn: async () => (over.role === undefined ? "agent" : over.role),
    monthlyCalls: async () => over.calls ?? 0,
    record: async (e) => { recorded.push(e); },
    provider: () => { if (!over.prov) throw new AIError("not_configured", "x"); return over.prov; },
    monthlyLimit: 100,
    now: () => 1000,
    ...over,
  };
  return { d, recorded };
}

const TRIAGE_OUT = {
  order_refs: ["CMD-48213", "CMD-99999"], customer_email: "client@exemple.fr", incident_type: "thermal",
  occasion: { detected: true, description: "anniversaire de mariage", date_text: "hier soir" },
  urgency_signals: ["occasion passée"], emotion: "disappointment", missing_information: ["photo du produit"],
  summary: "La cliente signale un coffret arrivé en retard et blanchi.", language: "fr", confidence: 0.82,
};
const MESSAGE = "Bonjour, ma commande CMD-48213 est arrivée le lendemain de notre anniversaire de mariage, les chocolats ont blanchi.";

// ---------------------------------------------------------------- fournisseur
test("OpenAI : requête en JSON Schema strict, clé dans l'en-tête, modèle configuré", async () => {
  const { fn, calls } = okFetch({ a: 1 });
  const p = new OpenAIProvider("sk-test", "modele-choisi", fn);
  const req: StructuredRequest = { system: "s", user: "u", schemaName: "x", schema: { type: "object" }, maxOutputTokens: 50 };
  const r = await p.generate<{ a: number }>(req);
  assert.equal(r.data.a, 1);
  assert.equal(r.usage.input, 120);
  const sent = JSON.parse(calls[0]!.init.body);
  assert.equal(calls[0]!.url, "https://api.openai.com/v1/chat/completions");
  assert.equal(calls[0]!.init.headers.Authorization, "Bearer sk-test");
  assert.equal(sent.model, "modele-choisi");
  assert.equal(sent.response_format.type, "json_schema");
  assert.equal(sent.response_format.json_schema.strict, true);
});

test("OpenAI : refus, quota, clé refusée et sortie invalide deviennent des erreurs typées", async () => {
  const req: StructuredRequest = { system: "s", user: "u", schemaName: "x", schema: { type: "object" }, maxOutputTokens: 50 };
  await assert.rejects(new OpenAIProvider("k", "m", okFetch(null, { choices: [{ message: { refusal: "non" } }] }).fn).generate(req), (e: AIError) => e.code === "refused");
  await assert.rejects(new OpenAIProvider("k", "m", statusFetch(429)).generate(req), (e: AIError) => e.code === "rate_limited");
  await assert.rejects(new OpenAIProvider("k", "m", statusFetch(401)).generate(req), (e: AIError) => e.code === "provider_auth");
  const bad: FetchLike = async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "pas du json" } }] }), text: async () => "" });
  await assert.rejects(new OpenAIProvider("k", "m", bad).generate(req), (e: AIError) => e.code === "invalid_output");
});

test("Registre : aucun modèle deviné, fournisseur inconnu refusé", () => {
  const env = (v: Record<string, string>) => (k: string) => v[k] ?? "";
  assert.throws(() => createProvider(env({ OPENAI_API_KEY: "k" }), okFetch({}).fn), (e: AIError) => e.code === "not_configured");
  assert.throws(() => createProvider(env({ AI_PROVIDER: "autre", AI_MODEL: "m" }), okFetch({}).fn), (e: AIError) => e.code === "not_configured");
  assert.equal(createProvider(env({ OPENAI_API_KEY: "k", AI_MODEL: "m" }), okFetch({}).fn).name, "openai");
});

// ---------------------------------------------------------------- accès
test("Accès : sans jeton 401, jeton invalide 401, non-membre 403, observateur 403", async () => {
  const body = { task: "triage", company_id: CO, input: { message: MESSAGE } };
  assert.equal((await handle(null, body, deps().d)).status, 401);
  assert.equal((await handle("Bearer faux", body, deps().d)).status, 401);
  assert.equal((await handle("Bearer jeton-valide", body, deps({ role: null }).d)).status, 403);
  assert.equal((await handle("Bearer jeton-valide", body, deps({ role: "viewer" }).d)).status, 403);
  assert.equal((await handle("Bearer jeton-valide", { ...body, task: "draft_reply" }, deps({ role: "logistics_manager" }).d)).status, 403);
});

test("Entrées : tâche inconnue, entreprise invalide, message trop long, quota, IA non configurée", async () => {
  const base = { task: "triage", company_id: CO, input: { message: MESSAGE } };
  assert.equal((await handle("Bearer jeton-valide", { ...base, task: "autre" }, deps().d)).status, 400);
  assert.equal((await handle("Bearer jeton-valide", { ...base, company_id: "x" }, deps().d)).status, 400);
  assert.equal((await handle("Bearer jeton-valide", { ...base, input: { message: "a".repeat(8001) } }, deps().d)).status, 413);
  assert.equal((await handle("Bearer jeton-valide", base, deps({ calls: 100, prov: new OpenAIProvider("k", "m", okFetch(TRIAGE_OUT).fn) }).d)).status, 429);
  const r = await handle("Bearer jeton-valide", base, deps().d);
  assert.equal(r.status, 503);
  assert.equal(r.body.error, "not_configured");
});

// ---------------------------------------------------------------- tri automatique
test("Tri : références et e-mail inventés par le modèle écartés, résultat présenté comme suggestion", async () => {
  const { fn, calls } = okFetch(TRIAGE_OUT);
  const { d, recorded } = deps({ prov: new OpenAIProvider("sk-test", "m", fn) });
  const r = await handle("Bearer jeton-valide", { task: "triage", company_id: CO, input: { message: MESSAGE, channel: "email", extra: "ignoré" } }, d);
  assert.equal(r.status, 200);
  const res = r.body.result as typeof TRIAGE_OUT;
  assert.deepEqual(res.order_refs, ["CMD-48213"]);
  assert.equal(res.customer_email, null);
  assert.equal(r.body.kind, "suggestion");
  assert.equal(r.body.level, 1);
  assert.equal((r.body.warnings as string[]).length, 2);
  assert.ok(!calls[0]!.init.body.includes("ignoré"), "les champs non attendus ne sont pas transmis au modèle");
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0]!.status, "ok");
  assert.ok(!JSON.stringify(recorded[0]).includes("chocolats"), "le journal ne contient aucun contenu de message");
  assert.ok(!JSON.stringify(r.body).includes("sk-test"), "la clé ne figure jamais dans la réponse");
});

// ---------------------------------------------------------------- rédaction
const DRAFT_IN = {
  customer_name: "Mme Marchetti", product: "Coffret Grand Cru", incident: "Livré avec 15 h de retard",
  verified_facts: ["Livré, déposé en loge le 13 nov. à 08:31"], estimated_risks: ["Blanchiment plausible"],
  approved_actions: [{ kind: "goodwill", description: "Avoir", amount: 18 }],
  tone: { signature: "La Conciergerie", default_tone: "warm", caution_sensitive: "Nous ne pouvons pas garantir à distance l'état des produits." },
  sensitive_product: true,
};

test("Rédaction : montant non autorisé et affirmation sanitaire signalés ; jamais envoyé", async () => {
  const out = { subject: "Votre commande", body: "Nous vous offrons un avoir de 18 € et un remboursement de 89 €. Les chocolats restent consommables.", commitments: [{ type: "refund", description: "Remboursement", due_text: null }], missing_information: [] };
  const { d } = deps({ prov: new OpenAIProvider("k", "m", okFetch(out).fn) });
  const r = await handle("Bearer jeton-valide", { task: "draft_reply", company_id: CO, input: DRAFT_IN }, d);
  assert.equal(r.status, 200);
  assert.equal(r.body.sent, false);
  assert.equal(r.body.requires_review, true);
  const w = (r.body.warnings as string[]).join(" | ");
  assert.match(w, /89 €/);
  assert.doesNotMatch(w, /« 18 €/);
  assert.match(w, /consommabilité/);
  assert.match(w, /prudence/);
});

test("Rédaction : brouillon conforme, aucun avertissement", async () => {
  const out = { subject: "Votre commande", body: "Madame, nous sommes désolés. Nous ne pouvons pas garantir à distance l'état des produits. Nous vous proposons un avoir de 18 €. La Conciergerie", commitments: [{ type: "other", description: "Avoir de 18 €", due_text: null }], missing_information: [] };
  const { d } = deps({ prov: new OpenAIProvider("k", "m", okFetch(out).fn) });
  const r = await handle("Bearer jeton-valide", { task: "draft_reply", company_id: CO, input: DRAFT_IN }, d);
  assert.deepEqual(r.body.warnings, []);
});

test("Rédaction : dossier incomplet refusé ; erreur du fournisseur journalisée sans détail interne", async () => {
  assert.equal((await handle("Bearer jeton-valide", { task: "draft_reply", company_id: CO, input: { product: "x" } }, deps().d)).status, 400);
  const { d, recorded } = deps({ prov: new OpenAIProvider("k", "m", statusFetch(500)) });
  const r = await handle("Bearer jeton-valide", { task: "draft_reply", company_id: CO, input: DRAFT_IN }, d);
  assert.equal(r.status, 502);
  assert.ok(!JSON.stringify(r.body).includes("secret-provider-detail"));
  assert.equal(recorded[0]!.status, "error");
});
