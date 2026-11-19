// Appel au modèle : n'importe quelle API « compatible OpenAI » (Groq, OpenRouter, Cerebras, Ollama, vLLM…).
// Par défaut : Groq (offre gratuite, sans carte) avec des modèles open source :
//   - openai/gpt-oss-120b (github.com/openai/gpt-oss, Apache 2.0) : sortie JSON stricte (schéma imposé)
//   - openai/gpt-oss-20b (même famille, plus petit) : modèle de secours si le premier est saturé ; l'ancien secours
//     llama-3.3-70b-versatile a été retiré par Groq (404 constaté le 2026-11-18, docs/benchmark-extraction.md)
// Sortie : schéma JSON strict quand le modèle le permet, sinon mode JSON simple avec le schéma rappelé dans la consigne.
// Dans tous les cas, handler.ts revérifie chaque champ et chaque citation.
import type { Deps, ModelResult } from "./handler.ts";

export interface ModelConfig {
  baseUrl: string;
  apiKey: string;
  models: string[]; // essayés dans l'ordre
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>; // remplaçable dans les tests
  maxWaitMs?: number; // attente totale permise sur une limite de débit (429), par appel ; 25 s par défaut
}

const STRICT = /gpt-oss|qwen3/i; // modèles qui acceptent un schéma JSON strict chez Groq
const MAX_TOKENS_CAP = 8000;
const parses = (t: string) => { try { JSON.parse(t); return true; } catch { return false; } };

/* Nouveaux essais (mission 2b, docs/benchmark-extraction.md) :
   - 429 (limite de débit) avec un délai « retry-after » : on attend puis on réessaie LE MÊME modèle, tant que l'attente
     totale reste sous maxWaitMs ; sans délai indiqué ou au-delà : modèle suivant ; tous saturés : « Busy » (503 au client).
   - 404 ou modèle retiré : modèle suivant (le modèle de secours configuré peut disparaître chez le fournisseur).
   - 5xx : un nouvel essai, puis modèle suivant.
   - 400 en schéma strict : même modèle en JSON simple ; 400 en JSON simple (réponse hors format) : un nouvel essai.
   - réponse coupée (finish_reason « length », le raisonnement de gpt-oss compte dans max_tokens) : un nouvel essai avec
     deux fois plus de jetons ; réponse qui n'est pas du JSON : un nouvel essai, puis modèle suivant. */
export function makeCallModel(cfg: ModelConfig): Deps["callModel"] {
  const doFetch = cfg.fetch || fetch;
  const sleep = cfg.sleep || ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const maxWait = cfg.maxWaitMs ?? 25000;
  const url = cfg.baseUrl.replace(/\/+$/, "") + "/chat/completions";

  async function once(model: string, p: Parameters<Deps["callModel"]>[0], strict: boolean, maxTokens: number): Promise<Response> {
    const system = strict ? p.system : `${p.system}\n\nRéponds uniquement par un objet JSON conforme à ce schéma :\n${JSON.stringify(p.schema)}`;
    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      temperature: 0.3,
      messages: [{ role: "system", content: system }, { role: "user", content: p.user }],
      response_format: strict
        ? { type: "json_schema", json_schema: { name: "tutor_reply", strict: true, schema: p.schema } }
        : { type: "json_object" },
    };
    if (/gpt-oss/i.test(model)) body.reasoning_effort = p.effort; // gpt-oss raisonne plus ou moins selon la tâche
    return await doFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify(body),
    });
  }

  return async (p) => {
    let last = "aucun modèle configuré", saturated = false, waited = 0;
    if (!cfg.models.length) throw new Error(last);
    for (const model of cfg.models) {
      let strict = STRICT.test(model), maxTokens = p.maxTokens || 2500;
      let retries5xx = 0, retriesFormat = 0, retriesLength = 0;
      for (let attempt = 0; attempt < 10; attempt++) {
        const res = await once(model, p, strict, maxTokens);
        if (res.status === 429) {
          saturated = true;
          const ra = Number(res.headers.get("retry-after"));
          const wait = Number.isFinite(ra) && ra > 0 ? Math.ceil(ra * 1000) + 250 : 0;
          last = `${model} : 429`;
          if (wait && waited + wait <= maxWait) { waited += wait; await sleep(wait); continue; }
          break; // modèle suivant
        }
        if (res.status === 404) { last = `${model} : 404 (modèle introuvable)`; break; }
        if (res.status >= 500) { last = `${model} : ${res.status}`; if (retries5xx++ < 1) { await sleep(1000); continue; } break; }
        const data = await res.json().catch(() => null);
        if (res.status === 400) {
          const code = String(data?.error?.code || "");
          if (/model_(not_found|decommissioned)/.test(code)) { last = `${model} : modèle retiré`; break; }
          if (strict) { strict = false; continue; } // schéma refusé : JSON simple
          last = `${model} : 400 ${JSON.stringify(data?.error?.message || "").slice(0, 160)}`;
          if (retriesFormat++ < 1) continue; // réponse hors format : un nouvel essai
          break;
        }
        if (!res.ok || !data) throw new Error(`${model} : ${res.status} ${JSON.stringify(data?.error?.message || "").slice(0, 160)}`);
        const choice = data.choices?.[0] || {};
        const text = String(choice.message?.content ?? "");
        const stop = choice.finish_reason === "content_filter" ? "refusal" : String(choice.finish_reason || "");
        if (stop !== "refusal") {
          if (stop === "length" && retriesLength++ < 1 && maxTokens < MAX_TOKENS_CAP) { maxTokens = Math.min(MAX_TOKENS_CAP, maxTokens * 2); continue; }
          if (!parses(text)) { last = `${model} : réponse qui n'est pas du JSON`; if (retriesFormat++ < 1) continue; break; }
        }
        const out: ModelResult = {
          text,
          stop,
          model: String(data.model || model),
          inputTokens: Number(data.usage?.prompt_tokens) || 0,
          outputTokens: Number(data.usage?.completion_tokens) || 0,
        };
        return out;
      }
    }
    // tous les modèles saturés : le client peut réessayer un peu plus tard
    if (saturated) { const busy = new Error(last); busy.name = "Busy"; throw busy; }
    throw new Error(last);
  };
}
