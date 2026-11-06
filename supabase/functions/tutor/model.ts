// Appel au modèle : n'importe quelle API « compatible OpenAI » (Groq, OpenRouter, Cerebras, Ollama, vLLM…).
// Par défaut : Groq (offre gratuite, sans carte) avec des modèles open source :
//   - openai/gpt-oss-120b (github.com/openai/gpt-oss, Apache 2.0) : sortie JSON stricte (schéma imposé)
//   - llama-3.3-70b-versatile (github.com/meta-llama, licence Llama) : modèle de secours si le premier est saturé
// Sortie : schéma JSON strict quand le modèle le permet, sinon mode JSON simple avec le schéma rappelé dans la consigne.
// Dans tous les cas, handler.ts revérifie chaque champ et chaque citation.
import type { Deps, ModelResult } from "./handler.ts";

export interface ModelConfig {
  baseUrl: string;
  apiKey: string;
  models: string[]; // essayés dans l'ordre
  fetch?: typeof fetch;
}

const STRICT = /gpt-oss|qwen3/i; // modèles qui acceptent un schéma JSON strict chez Groq

export function makeCallModel(cfg: ModelConfig): Deps["callModel"] {
  const doFetch = cfg.fetch || fetch;
  const url = cfg.baseUrl.replace(/\/+$/, "") + "/chat/completions";

  async function once(model: string, p: Parameters<Deps["callModel"]>[0], strict: boolean): Promise<Response> {
    const system = strict ? p.system : `${p.system}\n\nRéponds uniquement par un objet JSON conforme à ce schéma :\n${JSON.stringify(p.schema)}`;
    const body: Record<string, unknown> = {
      model,
      max_tokens: 2500,
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
    let last = "aucun modèle configuré";
    for (const model of cfg.models) {
      let strict = STRICT.test(model);
      let res = await once(model, p, strict);
      // schéma refusé par ce modèle : on retente en mode JSON simple
      if (res.status === 400 && strict) { strict = false; res = await once(model, p, false); }
      if (res.status === 429 || res.status >= 500) { last = `${model} : ${res.status}`; continue; } // saturé : modèle suivant
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(`${model} : ${res.status} ${JSON.stringify(data?.error?.message || "").slice(0, 160)}`);
      const choice = data.choices?.[0] || {};
      const out: ModelResult = {
        text: String(choice.message?.content ?? ""),
        stop: choice.finish_reason === "content_filter" ? "refusal" : String(choice.finish_reason || ""),
        model: String(data.model || model),
        inputTokens: Number(data.usage?.prompt_tokens) || 0,
        outputTokens: Number(data.usage?.completion_tokens) || 0,
      };
      return out;
    }
    throw new Error(last);
  };
}
