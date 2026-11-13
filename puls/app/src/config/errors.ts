// Traduit les erreurs de la base et de l'API en messages compréhensibles par un conseiller.
interface ErrLike { message?: string; code?: string; details?: string | null }

const RULES: [RegExp | string, string][] = [
  ["not allowed", "Action non autorisée pour votre rôle."],
  ["row-level security", "Action non autorisée pour votre rôle."],
  ["permission denied", "Action non autorisée pour votre rôle."],
  ["no PULS account for this e-mail yet", "Cette personne n'a pas encore de compte PULS. Elle doit d'abord s'inscrire depuis la page de connexion."],
  ["at least one active administrator", "L'entreprise doit garder au moins un administrateur actif."],
  ["workspace already configured", "Cet espace contient déjà un catalogue : la configuration de démonstration ne peut pas être chargée."],
  ["demo configuration is only allowed", "La configuration de démonstration est réservée aux entreprises en environnement de démonstration."],
  ["only a draft can be activated", "Seul un brouillon peut être activé."],
  ["cannot be modified", "Une version active ou retirée ne peut plus être modifiée. Créez une nouvelle version."],
  ["too many companies", "Ce compte administre déjà le nombre maximal d'entreprises."],
  ["company name too short", "Le nom de l'entreprise doit contenir au moins deux caractères."],
  ["authentication required", "Votre session a expiré. Reconnectez-vous."],
  ["JWT", "Votre session a expiré. Reconnectez-vous."],
  ["Failed to fetch", "Connexion au serveur impossible. Vérifiez votre réseau puis réessayez."],
  ["schema cache", "La base PULS n'est pas encore installée sur ce projet (migrations à appliquer)."],
];

export function humanError(e: unknown): string {
  const err = (e ?? {}) as ErrLike;
  const msg = String(err.message ?? e ?? "");
  if (err.code === "23505") return "Cet élément existe déjà (référence en double).";
  if (err.code === "23503") return "Cet élément est encore utilisé ailleurs, ou fait référence à un élément introuvable.";
  if (err.code === "23514") return "Une valeur ne respecte pas les règles (par exemple une température minimale supérieure à la maximale).";
  for (const [needle, text] of RULES) {
    if (typeof needle === "string" ? msg.includes(needle) : needle.test(msg)) return text;
  }
  return msg ? `Erreur : ${msg}` : "Une erreur inattendue est survenue.";
}
