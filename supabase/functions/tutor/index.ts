// Fonction serveur Supabase « tutor » : branche la logique (handler.ts) sur les vrais services.
// Secrets attendus (Supabase > Edge Functions > Secrets) :
//   ANTHROPIC_API_KEY      clé Claude, jamais envoyée au navigateur
//   TUTOR_MONTHLY_LIMIT    nombre d'échanges par utilisateur et par mois (par défaut 60)
//   TUTOR_ORIGINS          origines autorisées, séparées par des virgules (par défaut le site GitHub Pages)
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement par Supabase.
import Anthropic from "npm:@anthropic-ai/sdk@1.4.0";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import { handle, type Deps } from "./handler.ts";
import { makeCallModel } from "./model.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const claude = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

export const deps: Deps = {
  limit: Number(Deno.env.get("TUTOR_MONTHLY_LIMIT") || 60),
  origins: (Deno.env.get("TUTOR_ORIGINS") || "https://hmzr944.github.io").split(",").map((s) => s.trim()).filter(Boolean),
  async getUser(jwt) {
    const { data, error } = await admin.auth.getUser(jwt);
    return error || !data?.user ? null : { id: data.user.id };
  },
  async usedThisMonth(userId, month) {
    const { data } = await admin.from("ai_usage").select("calls").eq("user_id", userId).eq("month", month).maybeSingle();
    return data?.calls ?? 0;
  },
  async record(e) {
    await admin.rpc("ai_record_call", { p_user: e.userId, p_month: e.month, p_mode: e.mode, p_model: e.model, p_in: e.inputTokens, p_out: e.outputTokens, p_cost: e.costUsd, p_refused: e.refused });
  },
  callModel: makeCallModel(claude),
};

Deno.serve((req) => handle(req, deps));
