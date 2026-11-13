// Fonction serveur Supabase « ai » (Deno). Branche handler.ts sur les vrais services.
// Secrets attendus (Supabase > Edge Functions > Secrets), jamais dans le navigateur :
//   OPENAI_API_KEY        clé OpenAI
//   AI_MODEL              modèle OpenAI à utiliser (obligatoire, aucun modèle n'est deviné)
//   AI_PROVIDER           facultatif, « openai » par défaut (voir _shared/ai/registry.ts)
//   AI_MONTHLY_LIMIT      facultatif, appels par entreprise et par mois (défaut 2000)
//   PULS_ORIGINS          origines autorisées, séparées par des virgules
// SUPABASE_URL, SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY sont fournis par Supabase.
// Déploiement : supabase functions deploy ai --project-ref wqqxthpcqczmwigokhus (depuis puls/).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { createProvider } from "../_shared/ai/registry.ts";
import { handle, type Deps, type Role } from "./handler.ts";

const env = (k: string) => (Deno.env.get(k) ?? "").trim();
const URL_ = env("SUPABASE_URL");
const admin = createClient(URL_, env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const origins = env("PULS_ORIGINS").split(",").map((s) => s.trim()).filter(Boolean);

const deps: Deps = {
  async getUser(jwt) {
    const { data, error } = await admin.auth.getUser(jwt);
    return error || !data.user ? null : { id: data.user.id };
  },
  async roleIn(jwt, companyId) {
    // Client aux droits de l'utilisateur : la RLS décide, pas cette fonction.
    const asUser = createClient(URL_, env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } });
    const { data } = await asUser.from("memberships").select("role").eq("company_id", companyId).eq("status", "active").maybeSingle();
    return (data?.role as Role | undefined) ?? null;
  },
  async monthlyCalls(companyId) {
    const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
    const { count } = await admin.from("ai_calls").select("id", { count: "exact", head: true }).eq("company_id", companyId).gte("at", start.toISOString());
    return count ?? 0;
  },
  async record(entry) { await admin.from("ai_calls").insert(entry); },
  provider: () => createProvider(env, (url, init) => fetch(url, init)),
  monthlyLimit: Number(env("AI_MONTHLY_LIMIT") || 2000),
  now: () => Date.now(),
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const allow = origins.includes(origin) ? origin : origins[0] ?? "";
  const cors = { "Access-Control-Allow-Origin": allow, "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });
  let body: unknown = null;
  try { body = await req.json(); } catch { /* corps invalide : handle renverra une erreur 400 */ }
  const r = await handle(req.headers.get("authorization"), body, deps);
  return new Response(JSON.stringify(r.body), { status: r.status, headers: { ...cors, "Content-Type": "application/json" } });
});
