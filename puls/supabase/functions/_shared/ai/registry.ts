// Choix du fournisseur par configuration (secrets de la fonction), sans modifier le code appelant.
//   AI_PROVIDER     « openai » (défaut)
//   AI_MODEL        modèle à utiliser : obligatoire, aucun modèle n'est deviné
//   OPENAI_API_KEY  clé OpenAI (si AI_PROVIDER = openai)
// Pour ajouter Anthropic : créer anthropic.ts qui implémente AIProvider (sorties structurées via
// l'outil « tool use » ou le format JSON de l'API Messages), puis l'ajouter au switch ci-dessous.
import { OpenAIProvider } from "./openai.ts";
import { AIError, type AIProvider, type FetchLike } from "./provider.ts";

export function createProvider(env: (k: string) => string, fetchFn: FetchLike): AIProvider {
  const provider = (env("AI_PROVIDER") || "openai").toLowerCase();
  switch (provider) {
    case "openai":
      return new OpenAIProvider(env("OPENAI_API_KEY"), env("AI_MODEL"), fetchFn, env("OPENAI_BASE_URL") || undefined);
    default:
      throw new AIError("not_configured", `Fournisseur d'IA non pris en charge : ${provider}`);
  }
}
