// Appel au modèle : sortie structurée (schéma JSON strict) et bascule serveur en cas de refus de sécurité.
import type Anthropic from "npm:@anthropic-ai/sdk@1.4.0";
import { MODEL, type Deps } from "./handler.ts";

export function makeCallModel(claude: Anthropic): Deps["callModel"] {
  return async ({ system, user, schema, effort }) => {
    const params: Anthropic.Beta.Messages.MessageCreateParamsNonStreaming = {
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort, format: { type: "json_schema", schema } },
      system,
      messages: [{ role: "user", content: user }],
    };
    const response = await claude.beta.messages.create(params);
    // toujours vérifier le motif d'arrêt avant de lire le contenu
    const text = response.stop_reason === "refusal" ? "" : response.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    return { text, stop: String(response.stop_reason), model: response.model, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
  };
}
