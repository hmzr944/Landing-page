// Logique de la fonction serveur « ai », indépendante de Deno et de Supabase (dépendances injectées).
// Contrat HTTP : POST { task: "triage" | "draft_reply", company_id, input } avec l'en-tête Authorization du conseiller.
import { AIError, type AIProvider } from "../_shared/ai/provider.ts";
import { checkDraft, checkTriage, draftRequest, triageRequest, type DraftInput, type DraftOutput, type TriageInput, type TriageOutput } from "../_shared/ai/tasks.ts";

export type Role = "admin" | "sav_manager" | "agent" | "logistics_manager" | "viewer";
export interface Deps {
  /** Vérifie le jeton auprès de Supabase Auth ; null si invalide. */
  getUser(jwt: string): Promise<{ id: string } | null>;
  /** Rôle de l'utilisateur dans l'entreprise, lu avec SES droits (RLS) ; null s'il n'en est pas membre. */
  roleIn(jwt: string, companyId: string): Promise<Role | null>;
  /** Nombre d'appels de l'entreprise depuis le début du mois (rôle service). */
  monthlyCalls(companyId: string): Promise<number>;
  /** Journal des appels, sans contenu (rôle service). */
  record(entry: { company_id: string; user_id: string; task: string; provider: string; model: string; input_tokens: number; output_tokens: number; latency_ms: number; status: "ok" | "error" | "refused" }): Promise<void>;
  /** Fournisseur d'IA ; lève AIError("not_configured") si les secrets manquent. */
  provider(): AIProvider;
  monthlyLimit: number;
  now(): number;
}

export interface Reply { status: number; body: Record<string, unknown> }
const fail = (status: number, code: string, message: string): Reply => ({ status, body: { error: code, message } });
const MAX_MESSAGE = 8000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED: Record<string, Role[]> = { triage: ["admin", "sav_manager", "agent", "logistics_manager"], draft_reply: ["admin", "sav_manager", "agent"] };
const isStrList = (v: unknown, max = 30): v is string[] => Array.isArray(v) && v.length <= max && v.every((x) => typeof x === "string" && x.length <= 1000);

export async function handle(authHeader: string | null, raw: unknown, deps: Deps): Promise<Reply> {
  const jwt = (authHeader ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return fail(401, "unauthenticated", "Connexion requise.");
  const user = await deps.getUser(jwt);
  if (!user) return fail(401, "unauthenticated", "Session invalide ou expirée.");

  const req = (raw ?? {}) as { task?: unknown; company_id?: unknown; input?: unknown };
  const task = String(req.task ?? "");
  if (!(task in ALLOWED)) return fail(400, "bad_task", "Tâche inconnue.");
  if (typeof req.company_id !== "string" || !UUID.test(req.company_id)) return fail(400, "bad_company", "Entreprise invalide.");
  const role = await deps.roleIn(jwt, req.company_id);
  if (!role) return fail(403, "forbidden", "Vous n'êtes pas membre de cette entreprise.");
  if (!ALLOWED[task]!.includes(role)) return fail(403, "forbidden", "Votre rôle ne permet pas cette action.");

  // Validation et minimisation des entrées : seuls les champs attendus sont transmis au modèle.
  const input = (req.input ?? {}) as Record<string, unknown>;
  let triage: TriageInput | null = null, draft: DraftInput | null = null;
  if (task === "triage") {
    if (typeof input.message !== "string" || !input.message.trim()) return fail(400, "bad_input", "Message manquant.");
    if (input.message.length > MAX_MESSAGE) return fail(413, "too_large", `Message trop long (${MAX_MESSAGE} caractères maximum).`);
    triage = { message: input.message, channel: typeof input.channel === "string" ? input.channel.slice(0, 40) : undefined, subject: typeof input.subject === "string" ? input.subject.slice(0, 300) : undefined };
  } else {
    const a = input.approved_actions;
    const actionsOk = Array.isArray(a) && a.length <= 10 && a.every((x) => x && typeof x === "object" && typeof (x as { kind?: unknown }).kind === "string" && typeof (x as { description?: unknown }).description === "string"
      && ((x as { amount?: unknown }).amount === undefined || (x as { amount?: unknown }).amount === null || typeof (x as { amount?: unknown }).amount === "number"));
    if (typeof input.customer_name !== "string" || typeof input.product !== "string" || typeof input.incident !== "string" || !isStrList(input.verified_facts) || !actionsOk) {
      return fail(400, "bad_input", "Dossier incomplet : client, produit, incident, faits vérifiés et actions autorisées sont requis.");
    }
    const tone = (input.tone ?? {}) as DraftInput["tone"];
    draft = {
      customer_name: input.customer_name.slice(0, 120), product: input.product.slice(0, 200), incident: input.incident.slice(0, 500),
      verified_facts: input.verified_facts, estimated_risks: isStrList(input.estimated_risks) ? input.estimated_risks : [],
      approved_actions: a as DraftInput["approved_actions"], history: isStrList(input.history, 20) ? input.history : [],
      tone: { signature: String(tone.signature ?? "").slice(0, 120), default_tone: tone.default_tone === "sober" ? "sober" : "warm", caution_sensitive: tone.caution_sensitive ? String(tone.caution_sensitive).slice(0, 300) : undefined },
      sensitive_product: input.sensitive_product === true,
    };
  }

  if ((await deps.monthlyCalls(req.company_id)) >= deps.monthlyLimit) return fail(429, "quota", "Quota mensuel d'appels d'IA atteint pour cette entreprise.");

  let provider: AIProvider;
  try { provider = deps.provider(); }
  catch (e) { return fail(503, "not_configured", e instanceof AIError ? "Le service d'IA n'est pas configuré sur ce projet." : "Service d'IA indisponible."); }

  const t0 = deps.now();
  const log = (status: "ok" | "error" | "refused", usage = { input: 0, output: 0 }, model = provider.model) =>
    deps.record({ company_id: req.company_id as string, user_id: user.id, task, provider: provider.name, model, input_tokens: usage.input, output_tokens: usage.output, latency_ms: Math.max(0, deps.now() - t0), status }).catch(() => {});

  try {
    if (triage) {
      const r = await provider.generate<TriageOutput>(triageRequest(triage));
      const checked = checkTriage(r.data, triage);
      await log("ok", r.usage, r.model);
      return { status: 200, body: { task, level: 1, kind: "suggestion", result: checked.result, warnings: checked.warnings, provider: r.provider, model: r.model } };
    }
    const r = await provider.generate<DraftOutput>(draftRequest(draft!));
    const checked = checkDraft(r.data, draft!);
    await log("ok", r.usage, r.model);
    return { status: 200, body: { task, level: 2, kind: "draft", requires_review: true, sent: false, result: checked.result, warnings: checked.warnings, provider: r.provider, model: r.model } };
  } catch (e) {
    const code = e instanceof AIError ? e.code : "provider_error";
    await log(code === "refused" ? "refused" : "error");
    const map: Record<string, [number, string]> = {
      timeout: [504, "Le service d'IA n'a pas répondu à temps. Réessayez."],
      rate_limited: [503, "Le service d'IA est momentanément saturé. Réessayez dans un instant."],
      refused: [422, "Le modèle a refusé de traiter cette demande."],
      invalid_output: [502, "Réponse du modèle inexploitable. Réessayez."],
      provider_auth: [503, "Le service d'IA n'est pas correctement configuré (clé refusée)."],
    };
    const [status, message] = map[code] ?? [502, "Service d'IA indisponible."];
    return fail(status, code, message);
  }
}
