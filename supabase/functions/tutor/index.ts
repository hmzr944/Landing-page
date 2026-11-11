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
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement par Supabase.
import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import { handle, type Deps } from "./handler.ts";
import { makeCallModel } from "./model.ts";

const env = (k: string, d = "") => (Deno.env.get(k) || d).trim();
const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

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
  },
  origins: env("TUTOR_ORIGINS", "https://hmzr944.github.io").split(",").map((s) => s.trim()).filter(Boolean),
  price: { input: Number(env("AI_PRICE_INPUT", "0")), output: Number(env("AI_PRICE_OUTPUT", "0")) },
  async getUser(jwt) {
    const { data, error } = await admin.auth.getUser(jwt);
    return error || !data?.user ? null : { id: data.user.id };
  },
  // quota séparé pour le dialogue et pour la génération : on compte les appels du mois dans le journal
  async usedThisMonth(userId, month, kind) {
    const modes = kind === "dialogue" ? ["socratique", "enseigne"] : kind === "org" ? ["competences", "diagnostic", "mystere"] : ["enrichir", "rediger_cours", "rediger_notion", "extraire"];
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
