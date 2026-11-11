// Fonction serveur Supabase « tutor » : branche la logique (handler.ts) sur les vrais services.
// Secrets attendus (Supabase > Edge Functions > Secrets) :
//   AI_API_KEY             clé de l'API du modèle (par défaut Groq, gratuite), jamais envoyée au navigateur
//   AI_BASE_URL            facultatif, API compatible OpenAI (par défaut https://api.groq.com/openai/v1)
//   AI_MODEL               facultatif, modèle principal (par défaut openai/gpt-oss-120b)
//   AI_FALLBACK_MODEL      facultatif, modèle de secours (par défaut llama-3.3-70b-versatile)
//   TUTOR_MONTHLY_LIMIT    nombre d'échanges par utilisateur et par mois (par défaut 60)
//   GEN_MONTHLY_LIMIT      générations de contenu par utilisateur et par mois (par défaut 150)
//   ORG_MONTHLY_LIMIT      appels de l'espace professionnel par utilisateur et par mois (par défaut 400)
//   TUTOR_ORIGINS          origines autorisées, séparées par des virgules (par défaut le site GitHub Pages)
//   SITE_URL               adresse de l'app, pour les liens envoyés par e-mail (par défaut le site GitHub Pages)
//   BREVO_API_KEY          facultatif : envoi des invitations par e-mail (Brevo, offre gratuite) ; sans elle, on partage le lien
//   MAIL_FROM              adresse d'expédition validée chez Brevo (avec BREVO_API_KEY)
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement par Supabase.
import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import { handle, type Deps } from "./handler.ts";
import { makeCallModel } from "./model.ts";
import { pdfPages } from "./pdftext.ts";

const env = (k: string, d = "") => (Deno.env.get(k) || d).trim();
const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const must = <T>(r: { data: T | null; error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); return r.data as T; };
// Texte des pages d'un PDF stocké (dossier privé de l'organisation), relu ici pour vérifier ce qu'envoie le navigateur
async function storedPages(path: string) {
  const { data, error } = await admin.storage.from("org-sources").download(path);
  if (error || !data) throw new Error("fichier introuvable");
  return pdfPages(new Uint8Array(await data.arrayBuffer()));
}
const BREVO = env("BREVO_API_KEY"), MAIL_FROM = env("MAIL_FROM");

export const deps: Deps = {
  limit: Number(env("TUTOR_MONTHLY_LIMIT", "60")),
  genLimit: Number(env("GEN_MONTHLY_LIMIT", "150")),
  orgLimit: Number(env("ORG_MONTHLY_LIMIT", "400")),
  // Espace professionnel : accès à la base avec la clé serveur. Chaque fonction ne touche que l'organisation demandée,
  // après vérification du rôle de la personne (org.ts).
  db: {
    async role(userId, orgId) {
      const { data } = await admin.from("memberships").select("role").eq("org_id", orgId).eq("user_id", userId).eq("status", "active").maybeSingle();
      return data?.role ?? null;
    },
    async validatedKnowledge(orgId, limit) {
      const { data } = await admin.from("knowledge_nodes").select("id,kind,title,body,quote,page,source_version_id").eq("org_id", orgId).eq("status", "valide").limit(limit);
      return data ?? [];
    },
    async knowledgeById(orgId, ids) {
      if (!ids.length) return [];
      const { data } = await admin.from("knowledge_nodes").select("id,kind,title,body,quote,page,source_version_id").eq("org_id", orgId).in("id", ids);
      return data ?? [];
    },
    async skillLinks(orgId) {
      const { data } = await admin.from("skill_knowledge").select("skill_id,knowledge_id").eq("org_id", orgId);
      return data ?? [];
    },
    async insertDiagItems(rows) {
      const { data, error } = await admin.from("diagnostic_items").insert(rows).select("id");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    async getDiagItem(id) {
      const { data } = await admin.from("diagnostic_items").select("*").eq("id", id).maybeSingle();
      return data;
    },
    async markAnswered(id) {
      const { data } = await admin.from("diagnostic_items").update({ answered_at: new Date().toISOString() }).eq("id", id).is("answered_at", null).select("id");
      return !!(data && data.length);
    },
    async insertEvidence(rows) {
      const { error } = await admin.from("evidence_events").insert(rows);
      if (error) throw new Error(error.message);
    },
    async createScenario(row) {
      const { data, error } = await admin.from("scenario_sessions").insert(row).select("id").single();
      if (error) throw new Error(error.message);
      return data.id;
    },
    async getScenario(id) {
      const { data } = await admin.from("scenario_sessions").select("*").eq("id", id).maybeSingle();
      return data;
    },
    async updateScenario(id, patch) {
      const { error } = await admin.from("scenario_sessions").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    // ---- moteurs (migration 008)
    async insertEdges(rows) { const d = must(await admin.from("knowledge_edges").upsert(rows, { onConflict: "org_id,from_id,to_id,relation", ignoreDuplicates: true }).select("id")); return (d as unknown[] || []).length; },
    async edgesOf(orgId) { return must(await admin.from("knowledge_edges").select("from_id,to_id,relation").eq("org_id", orgId)) || []; },
    async createScenarioDef(row) { return (must(await admin.from("scenarios").insert(row).select("id").single()) as { id: string }).id; },
    async createScenarioVersion(row) {
      const v = must(await admin.from("scenario_versions").insert(row).select("id").single()) as { id: string };
      await admin.from("scenarios").update({ current_version: row.version }).eq("id", row.scenario_id);
      return v.id;
    },
    async getScenarioVersion(id) { return (await admin.from("scenario_versions").select("*").eq("id", id).maybeSingle()).data; },
    async versionInfo(id) { return (await admin.from("source_versions").select("id,org_id,source_id,version,storage_path").eq("id", id).maybeSingle()).data; },
    async versionByNumber(sourceId, n) { return (await admin.from("source_versions").select("id,org_id,source_id,version,storage_path").eq("source_id", sourceId).eq("version", n).maybeSingle()).data; },
    async knowledgeOfVersion(versionId) { return must(await admin.from("knowledge_nodes").select("id,kind,title,body,quote,page,source_version_id,status").eq("source_version_id", versionId)) || []; },
    docPages: storedPages,
    async insertPolicyChange(row) { return (must(await admin.from("policy_changes").insert(row).select("id").single()) as { id: string }).id; },
    async insertChangeItems(rows) { must(await admin.from("policy_change_items").insert(rows)); },
    async invitationById(id) {
      const { data } = await admin.from("invitations").select("id,org_id,email,role,token_hash,expires_at,accepted_at,revoked_at,sent_at,send_count,organizations(name)").eq("id", id).maybeSingle();
      return data ? { ...data, org_name: (data as { organizations?: { name?: string } }).organizations?.name } : null;
    },
    async markInvitationSent(id, count) { must(await admin.from("invitations").update({ sent_at: new Date().toISOString(), send_count: count }).eq("id", id)); },
    siteUrl: env("SITE_URL", "https://hmzr944.github.io/Landing-page/"),
    ...(BREVO && MAIL_FROM ? {
      async sendEmail(to: string, subject: string, html: string, text: string) {
        const r = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": BREVO, "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ sender: { email: MAIL_FROM, name: "Arbor" }, to: [{ email: to }], subject, htmlContent: html, textContent: text }) });
        if (!r.ok) throw new Error(`brevo ${r.status}`);
      },
    } : {}),
  },
  async docVersion(id) { return (await admin.from("source_versions").select("id,org_id,storage_path").eq("id", id).maybeSingle()).data; },
  docPages: storedPages,
  origins: env("TUTOR_ORIGINS", "https://hmzr944.github.io").split(",").map((s) => s.trim()).filter(Boolean),
  price: { input: Number(env("AI_PRICE_INPUT", "0")), output: Number(env("AI_PRICE_OUTPUT", "0")) },
  async getUser(jwt) {
    const { data, error } = await admin.auth.getUser(jwt);
    return error || !data?.user ? null : { id: data.user.id };
  },
  // quota séparé pour le dialogue et pour la génération : on compte les appels du mois dans le journal
  async usedThisMonth(userId, month, kind) {
    // toutes les tâches qui appellent le modèle comptent dans un quota (un oubli ici rendrait une tâche gratuite et illimitée)
    const modes = kind === "dialogue" ? ["socratique", "enseigne", "situation"] : kind === "org" ? ["competences", "diagnostic", "mystere", "relations", "scenario", "comparer"] : ["enrichir", "rediger_cours", "rediger_notion", "extraire", "structurer"];
    const { count } = await admin.from("ai_calls").select("id", { count: "exact", head: true })
      .eq("user_id", userId).in("mode", modes).gte("at", `${month}-01T00:00:00Z`);
    return count ?? 0;
  },
  async record(e) {
    await admin.rpc("ai_record_call", { p_user: e.userId, p_month: e.month, p_mode: e.mode, p_model: e.model, p_in: e.inputTokens, p_out: e.outputTokens, p_cost: e.costUsd, p_refused: e.refused });
  },
  callModel: makeCallModel({
    baseUrl: env("AI_BASE_URL", "https://api.groq.com/openai/v1"),
    apiKey: env("AI_API_KEY") || env("GROQ_API_KEY"),
    models: [env("AI_MODEL", "openai/gpt-oss-120b"), env("AI_FALLBACK_MODEL", "llama-3.3-70b-versatile")].filter(Boolean),
  }),
};

Deno.serve((req) => handle(req, deps));
