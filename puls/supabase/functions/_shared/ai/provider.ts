// Abstraction des fournisseurs d'IA. Le reste de PULS ne connaît que cette interface :
// changer de fournisseur (OpenAI aujourd'hui, Anthropic ou autre demain) revient à ajouter
// une implémentation et à la déclarer dans registry.ts, sans toucher aux tâches ni au client.

/** Sous-ensemble de JSON Schema utilisé pour les sorties structurées. */
export type JsonSchema = {
  type: string | string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  additionalProperties?: boolean;
  enum?: (string | null)[];
  description?: string;
  minimum?: number;
  maximum?: number;
};

export interface StructuredRequest {
  /** Consignes système : règles de l'entreprise et garde-fous PULS. */
  system: string;
  /** Contenu à traiter (déjà minimisé par la tâche). */
  user: string;
  schemaName: string;
  schema: JsonSchema;
  maxOutputTokens: number;
}

export interface StructuredResult<T> {
  data: T;
  provider: string;
  model: string;
  usage: { input: number; output: number };
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  generate<T>(req: StructuredRequest): Promise<StructuredResult<T>>;
}

/** Erreur typée : le code est renvoyé tel quel au client, jamais le message brut du fournisseur. */
export type AIErrorCode = "not_configured" | "provider_auth" | "rate_limited" | "timeout" | "refused" | "invalid_output" | "provider_error";
export class AIError extends Error {
  readonly code: AIErrorCode;
  constructor(code: AIErrorCode, message: string) {
    super(message);
    this.name = "AIError";
    this.code = code;
  }
}

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{
  ok: boolean; status: number; json(): Promise<unknown>; text(): Promise<string>;
}>;
