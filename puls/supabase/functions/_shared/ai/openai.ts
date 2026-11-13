// Implémentation OpenAI (API Chat Completions, sorties structurées en JSON Schema strict).
// La clé ne quitte jamais le serveur : elle est lue dans les secrets de la fonction Supabase.
import { AIError, type AIProvider, type FetchLike, type StructuredRequest, type StructuredResult } from "./provider.ts";

interface ChatResponse {
  model?: string;
  choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  readonly model: string;
  private readonly apiKey: string;
  private readonly fetchFn: FetchLike;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  // Champs explicites (pas de propriétés de paramètres) : code exécutable tel quel par Node et Deno.
  constructor(apiKey: string, model: string, fetchFn: FetchLike, baseUrl = "https://api.openai.com/v1", timeoutMs = 30000) {
    this.apiKey = apiKey; this.model = model; this.fetchFn = fetchFn; this.baseUrl = baseUrl; this.timeoutMs = timeoutMs;
    if (!apiKey) throw new AIError("not_configured", "OPENAI_API_KEY manquante");
    if (!model) throw new AIError("not_configured", "AI_MODEL manquant");
  }

  async generate<T>(req: StructuredRequest): Promise<StructuredResult<T>> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    let res;
    try {
      res = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "system", content: req.system }, { role: "user", content: req.user }],
          response_format: { type: "json_schema", json_schema: { name: req.schemaName, schema: req.schema, strict: true } },
          max_completion_tokens: req.maxOutputTokens,
        }),
        signal: ctrl.signal,
      });
    } catch (e) {
      throw new AIError((e as Error).name === "AbortError" ? "timeout" : "provider_error", "Appel au fournisseur impossible");
    } finally {
      clearTimeout(timer);
    }
    if (res.status === 401 || res.status === 403) throw new AIError("provider_auth", "Clé du fournisseur refusée");
    if (res.status === 429) throw new AIError("rate_limited", "Limite du fournisseur atteinte");
    if (!res.ok) throw new AIError("provider_error", `Fournisseur : statut ${res.status}`);
    const body = (await res.json()) as ChatResponse;
    const msg = body.choices?.[0]?.message;
    if (msg?.refusal) throw new AIError("refused", "Le modèle a refusé la demande");
    if (body.choices?.[0]?.finish_reason === "length") throw new AIError("invalid_output", "Réponse tronquée");
    let data: T;
    try { data = JSON.parse(msg?.content ?? "") as T; } catch { throw new AIError("invalid_output", "Sortie non conforme au schéma"); }
    return {
      data, provider: this.name, model: body.model ?? this.model,
      usage: { input: body.usage?.prompt_tokens ?? 0, output: body.usage?.completion_tokens ?? 0 },
    };
  }
}
