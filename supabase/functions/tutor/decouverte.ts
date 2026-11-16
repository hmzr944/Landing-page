// Découverte Business (docs/ux-v51.md, « reverse-onboarding ») : une première simulation Client Mystère jouable AVANT
// toute configuration, à partir d'un secteur et d'une situation décrite par le manager.
// Règles :
// - Aucune organisation, aucune écriture en base, aucune preuve : c'est une démonstration, pas une mesure.
// - Le personnage ne connaît AUCUNE règle de l'entreprise : chaque règle qu'il suppose est rendue comme « hypothèse
//   générique à confirmer » (connaissance suggérée), jamais comme une règle métier.
// - Sans état côté serveur : la fiche et l'échange reviennent du navigateur à chaque tour. Une fiche modifiée ne peut
//   tromper que la démonstration de la personne elle-même ; rien n'est enregistré.
// - Même quota que le Client Mystère (mode « mystere » dans le journal des appels) : connexion obligatoire.
export const DECOUVERTE_TASKS = ["decouverte_start", "decouverte_tour", "decouverte_fin"] as const;
export type DecouverteTask = typeof DECOUVERTE_TASKS[number];
type Call = (p: { system: string; user: string; schema: Record<string, unknown>; effort: "low" | "medium"; maxTokens?: number }) => Promise<{ text: string; stop: string; model: string; inputTokens: number; outputTokens: number }>;
export interface DecouverteCtx { callModel: Call; onModel(r: { model: string; inputTokens: number; outputTokens: number; stop: string }): Promise<void> }
export class DecouverteError extends Error { constructor(public status: number, msg: string) { super(msg); } }

export const MAX_TURNS = 6;
const clip = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const list = (a: unknown, n: number, len: number) => (Array.isArray(a) ? a : []).map((x) => clip(x, len)).filter(Boolean).slice(0, n);
const norm = (s: string) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[«»"“”’'`]/g, "'").replace(/\s+/g, " ").trim();
const inText = (needle: string, hay: string) => needle.trim().length >= 4 && norm(hay).includes(norm(needle));
const str = { type: "string" };
const arr = { type: "array", items: str };

const START_SCHEMA = { type: "object", additionalProperties: false, required: ["name", "profile", "need", "objections", "opening", "assumptions", "skills"],
  properties: { name: str, profile: str, need: str, objections: arr, opening: str, assumptions: arr, skills: arr } };
const TOUR_SCHEMA = { type: "object", additionalProperties: false, required: ["reply", "satisfied", "leaves"], properties: { reply: str, satisfied: { type: "boolean" }, leaves: { type: "boolean" } } };
const FIN_SCHEMA = { type: "object", additionalProperties: false, required: ["decisions", "strengths", "misses", "skills", "improvements"],
  properties: {
    decisions: arr, misses: arr, skills: arr, improvements: arr,
    strengths: { type: "array", items: { type: "object", additionalProperties: false, required: ["text", "quote"], properties: { text: str, quote: str } } },
  } };

async function model(ctx: DecouverteCtx, p: { system: string; user: string; schema: Record<string, unknown>; maxTokens: number }) {
  let r;
  try { r = await ctx.callModel({ ...p, effort: "medium" }); }
  catch (e) { throw new DecouverteError((e as Error)?.name === "Busy" ? 503 : 502, "la simulation ne répond pas pour l'instant"); }
  await ctx.onModel(r);
  if (r.stop === "refusal") throw new DecouverteError(422, "cette situation ne peut pas être simulée ; décrivez une situation de travail ordinaire");
  try { return JSON.parse(r.text) as Record<string, unknown>; } catch { throw new DecouverteError(502, "réponse illisible"); }
}

// Fiche renvoyée par le navigateur : relue et bornée à chaque tour
function specOf(b: Record<string, unknown>) {
  const s = (b.spec && typeof b.spec === "object" ? b.spec : {}) as Record<string, unknown>;
  const spec = { sector: clip(s.sector, 60), situation: clip(s.situation, 600), name: clip(s.name, 40) || "Client", profile: clip(s.profile, 300), need: clip(s.need, 300), objections: list(s.objections, 3, 200), assumptions: list(s.assumptions, 5, 200), skills: list(s.skills, 5, 80) };
  if (spec.situation.length < 20) throw new DecouverteError(400, "situation manquante");
  return spec;
}
function transcriptOf(b: Record<string, unknown>) {
  const t = (Array.isArray(b.transcript) ? b.transcript : []).slice(-2 * MAX_TURNS - 1).map((x) => ({ role: (x as { role?: string })?.role === "client" ? "client" : "vous", text: clip((x as { text?: string })?.text, 600) })).filter((x) => x.text);
  return t;
}
const show = (t: { role: string; text: string }[]) => t.map((x) => `${x.role === "client" ? "Client" : "Collaborateur"} : ${x.text}`).join("\n");

async function start(ctx: DecouverteCtx, b: Record<string, unknown>) {
  const sector = clip(b.sector, 60), situation = clip(b.situation, 600);
  if (situation.length < 20) throw new DecouverteError(400, "décrivez la situation en une ou deux phrases");
  const out = await model(ctx, {
    system: `Tu prépares une courte simulation de formation : un client fictif, joué ensuite par l'IA, face à un collaborateur.
Tu ne connais AUCUNE règle de l'entreprise. Tu ne dois jamais présenter une règle comme celle de l'entreprise.
- "assumptions" : les règles ou procédures que la situation suppose et que l'entreprise devra confirmer (délais, conditions, montants…), chacune formulée comme une hypothèse générique, par exemple « Hypothèse : les articles soldés ne sont ni repris ni échangés ». 2 à 4.
- "need" : l'enjeu réel du client, qu'il ne dit pas d'emblée. "objections" : 2 ou 3 objections ou relances réalistes.
- "skills" : 2 à 4 compétences professionnelles observables que la situation mobilise (écoute, reformulation, application d'une règle, désescalade…).
- "opening" : la première phrase du client, naturelle. Prénom fictif. Écris en français, sans données personnelles réelles.`,
    user: `Secteur : ${sector || "non précisé"}\nSituation décrite par le manager : ${situation}`, schema: START_SCHEMA, maxTokens: 1100,
  });
  const spec = { sector, situation, name: clip(out.name, 40) || "Client", profile: clip(out.profile, 300), need: clip(out.need, 300), objections: list(out.objections, 3, 200), assumptions: list(out.assumptions, 4, 200), skills: list(out.skills, 4, 80) };
  return { spec, opening: clip(out.opening, 400) || "Bonjour… j'ai un problème avec un achat.", max_turns: MAX_TURNS };
}

async function tour(ctx: DecouverteCtx, b: Record<string, unknown>) {
  const spec = specOf(b), t = transcriptOf(b);
  const msg = clip(b.message, 800);
  if (msg.length < 2) throw new DecouverteError(400, "message vide");
  const turns = t.filter((x) => x.role === "vous").length;
  if (turns >= MAX_TURNS) throw new DecouverteError(409, "simulation terminée");
  const out = await model(ctx, {
    system: `Tu joues ${spec.name}, un client (${spec.profile}). Situation : ${spec.situation}. Ton enjeu caché : ${spec.need}. Tes objections possibles : ${spec.objections.join(" ; ")}.
Réponds en une à trois phrases, en restant dans le personnage, en français. Tu ne connais pas les règles du magasin. Si le collaborateur t'écoute et propose une solution claire, apaise-toi ("satisfied": true). Si on t'ignore ou te contredit sèchement deux fois, tu peux partir ("leaves": true).`,
    user: `${show(t)}\nCollaborateur : ${msg}`, schema: TOUR_SCHEMA, maxTokens: 400,
  });
  const done = !!out.leaves || !!out.satisfied || turns + 1 >= MAX_TURNS;
  return { reply: clip(out.reply, 500), satisfied: !!out.satisfied, leaves: !!out.leaves, done, turns_left: Math.max(0, MAX_TURNS - turns - 1) };
}

async function fin(ctx: DecouverteCtx, b: Record<string, unknown>) {
  const spec = specOf(b), t = transcriptOf(b);
  const said = t.filter((x) => x.role === "vous").map((x) => x.text).join("\n");
  if (!said) throw new DecouverteError(400, "aucune réponse à analyser");
  const out = await model(ctx, {
    system: `Tu débriefes une simulation de formation, de façon bienveillante et concrète. Tu ne connais pas les règles de l'entreprise : ne juge jamais une réponse « fausse » au regard d'une règle supposée ; signale plutôt ce qu'il faudra vérifier.
- "decisions" : ce que le collaborateur a décidé ou proposé, en une phrase chacune.
- "strengths" : ses points forts ; "quote" = la phrase exacte du collaborateur qui le montre (copiée mot pour mot).
- "misses" : ce qui a été oublié ou pourrait être mieux fait (écoute, reformulation, solution, ton).
- "skills" : les compétences mobilisées, parmi : ${spec.skills.join(" ; ") || "écoute ; reformulation ; proposition d'une solution"}.
- "improvements" : 2 ou 3 pistes concrètes pour la prochaine fois.
Écris en français, sans note chiffrée.`,
    user: `Situation : ${spec.situation}\nEnjeu caché du client : ${spec.need}\n\n${show(t)}`, schema: FIN_SCHEMA, maxTokens: 1100,
  });
  // un point fort sans citation exacte de la personne est écarté (rien n'est attribué sans preuve dans l'échange)
  const strengths = (Array.isArray(out.strengths) ? out.strengths : []).map((x) => x as Record<string, string>).filter((x) => inText(x.quote, said)).map((x) => ({ text: clip(x.text, 200), quote: clip(x.quote, 240) })).slice(0, 4);
  return { debrief: { decisions: list(out.decisions, 4, 220), strengths, misses: list(out.misses, 4, 220), skills: list(out.skills, 5, 80), improvements: list(out.improvements, 3, 220), assumptions: spec.assumptions, measured: false } };
}

export function decouverteTask(task: DecouverteTask, b: Record<string, unknown>, ctx: DecouverteCtx) {
  if (task === "decouverte_start") return start(ctx, b);
  if (task === "decouverte_tour") return tour(ctx, b);
  return fin(ctx, b);
}
