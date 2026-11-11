// Tuteur Arbor : logique pure (aucun accès réseau ici, tout passe par `deps`), testable sans serveur.
//
// Règles :
// - Le tuteur ne s'appuie que sur les passages du cours envoyés avec la question. Il ne corrige jamais
//   sans source ; si le cours ne couvre pas la question, il le dit.
// - Chaque citation renvoyée est vérifiée : son extrait doit se trouver mot pour mot dans le passage cité.
//   Une citation inventée est retirée avant d'arriver à l'étudiant.
// - Quota mensuel vérifié AVANT l'appel ; jetons et coût enregistrés APRÈS, refus compris.
// - Aucun contenu (passages, réponses) n'est stocké côté serveur.

import { cleanGen, GEN_TASKS, type GenTask, genPrompt, validateGen } from "./generate.ts";
import { needsModel, ORG_TASKS, type OrgDb, OrgError, type OrgTask, orgTask } from "./org.ts";

export type Mode = "socratique" | "enseigne";
export type Kind = "dialogue" | "generation" | "org";
export interface Passage { page?: number; text: string }
export interface Turn { role: "tutor" | "student"; text: string }
export interface TutorRequest {
  mode: Mode;
  notion: { title: string; course?: string };
  passages: Passage[];
  history?: Turn[];
  message?: string;
  hint?: boolean;
  learner?: { state?: string; misconceptions?: string[]; prerequisites?: string[] };
}
export interface ModelResult {
  text: string; // JSON produit par le modèle
  stop: string; // stop_reason
  model: string;
  inputTokens: number;
  outputTokens: number;
}
export interface Deps {
  getUser(jwt: string): Promise<{ id: string } | null>;
  usedThisMonth(userId: string, month: string, kind: Kind): Promise<number>;
  record(e: { userId: string; month: string; mode: Mode | GenTask | "competences" | "diagnostic" | "mystere"; model: string; inputTokens: number; outputTokens: number; costUsd: number; refused: boolean }): Promise<void>;
  callModel(p: { system: string; user: string; schema: Record<string, unknown>; effort: "low" | "medium"; maxTokens?: number }): Promise<ModelResult>;
  limit: number; // échanges de dialogue par mois
  genLimit?: number; // générations de contenu par mois (enrichir un PDF, rédiger un cours)
  orgLimit?: number; // appels de l'espace professionnel par mois (diagnostic, Client Mystère, compétences)
  db?: OrgDb; // accès à la base (clé serveur) pour l'espace professionnel
  origins: string[];
  price?: { input: number; output: number }; // dollars par million de jetons ; 0 avec une offre gratuite
  now?: () => Date;
}

// Coût par défaut : nul (modèles open source sur une offre gratuite). Réglable par deps.price si on passe à une offre payante.
export const PRICE = { input: 0, output: 0 };

export const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "verdict", "misconception", "hint_level", "citations", "correct_points", "missing", "done", "next_activity"],
  properties: {
    reply: { type: "string", description: "Message à l'étudiant, en français, tutoiement, 80 mots au plus." },
    verdict: { type: "string", enum: ["juste", "partiel", "faux", "sans_reponse", "hors_cours"] },
    misconception: { type: "string", description: "Confusion conceptuelle repérée, en quelques mots (vide s'il n'y en a pas)." },
    hint_level: { type: "integer", description: "0 si aucun indice, puis 1, 2, 3 de plus en plus précis." },
    citations: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["passage", "quote"],
        properties: { passage: { type: "integer", description: "Numéro du passage, à partir de 1." }, quote: { type: "string", description: "Extrait copié mot pour mot dans ce passage." } },
      },
    },
    correct_points: { type: "array", items: { type: "string" } },
    missing: { type: "array", items: { type: "string" } },
    done: { type: "boolean", description: "Vrai quand l'étudiant a montré qu'il a compris la notion." },
    next_activity: { type: "string", enum: ["continuer", "relire_passage", "revoir_prerequis", "terminer"] },
  },
} as const;

const SYSTEM = `Tu es Pousse, le tuteur d'Arbor. Tu aides un étudiant à comprendre une notion de SON cours.

Règles absolues :
- Appuie-toi uniquement sur les passages du cours fournis, numérotés [P1], [P2]… Ne corrige jamais l'étudiant avec une information absente des passages. Si les passages ne permettent pas de répondre, dis-le simplement et mets verdict = "hors_cours".
- Chaque fois que tu t'appuies sur le cours, ajoute une citation : le numéro du passage et un extrait copié mot pour mot (pas de reformulation dans "quote").
- Réponds en français, en tutoyant, avec bienveillance et sans infantiliser. 80 mots au plus.

Mode socratique :
- Pose une question ouverte à la fois. Ne donne pas la réponse : fais réfléchir.
- Évalue la dernière réponse de l'étudiant (verdict). S'il confond deux idées, nomme la confusion en quelques mots dans "misconception" (par exemple « confond masque et passerelle »).
- Indices progressifs : hint_level 1 (piste), 2 (piste plus précise), 3 (presque la réponse). N'en donne que si l'étudiant le demande ou s'il s'est trompé deux fois.
- Quand l'étudiant a montré qu'il a compris, félicite-le brièvement, done = true, next_activity = "terminer".

Mode Enseigne-moi :
- L'étudiant explique la notion avec ses mots. Évalue l'exactitude et la complétude par rapport aux passages.
- correct_points : ce qui est juste ; missing : ce qui manque d'important ; misconception : une erreur de fond s'il y en a une.
- reply : un retour précis et encourageant, puis une question qui l'aide à compléter.

next_activity : "revoir_prerequis" si l'erreur vient d'une notion préalable listée, "relire_passage" si la réponse est dans un passage qu'il n'a pas compris, sinon "continuer" ou "terminer".`;

const clip = (s: unknown, n: number) => String(s ?? "").slice(0, n);
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[«»"“”’']/g, "'").replace(/\s+/g, " ").trim();

export function validate(body: unknown): { ok: true; req: TutorRequest } | { ok: false; error: string } {
  const b = body as Partial<TutorRequest> | null;
  if (!b || typeof b !== "object") return { ok: false, error: "corps invalide" };
  if (b.mode !== "socratique" && b.mode !== "enseigne") return { ok: false, error: "mode invalide" };
  if (!b.notion || typeof b.notion.title !== "string" || !b.notion.title.trim()) return { ok: false, error: "notion manquante" };
  if (!Array.isArray(b.passages) || !b.passages.length) return { ok: false, error: "aucun passage du cours : le tuteur ne répond qu'à partir du cours" };
  const passages = b.passages.slice(0, 8).map((p) => ({ page: Number.isInteger(p?.page) ? p.page : undefined, text: clip(p?.text, 2500) })).filter((p) => p.text.trim().length >= 20);
  if (!passages.length) return { ok: false, error: "passages trop courts" };
  let total = 0;
  const kept = passages.filter((p) => (total += p.text.length) <= 12000);
  const history = (Array.isArray(b.history) ? b.history : []).slice(-12).map((t) => ({ role: t?.role === "student" ? "student" : "tutor", text: clip(t?.text, 1500) })) as Turn[];
  return {
    ok: true,
    req: {
      mode: b.mode,
      notion: { title: clip(b.notion.title, 200), course: clip(b.notion.course, 200) },
      passages: kept,
      history,
      message: clip(b.message, 2000),
      hint: !!b.hint,
      learner: {
        state: clip(b.learner?.state, 40),
        misconceptions: (b.learner?.misconceptions || []).slice(0, 5).map((m) => clip(m, 120)),
        prerequisites: (b.learner?.prerequisites || []).slice(0, 5).map((m) => clip(m, 120)),
      },
    },
  };
}

export function buildPrompt(r: TutorRequest): string {
  const lines: string[] = [];
  lines.push(`Mode : ${r.mode === "socratique" ? "socratique" : "Enseigne-moi"}`);
  lines.push(`Cours : ${r.notion.course || "(sans titre)"} · Notion : ${r.notion.title}`);
  if (r.learner?.state) lines.push(`État estimé de la notion : ${r.learner.state}`);
  if (r.learner?.misconceptions?.length) lines.push(`Confusions déjà repérées : ${r.learner.misconceptions.join(" ; ")}`);
  if (r.learner?.prerequisites?.length) lines.push(`Notions préalables : ${r.learner.prerequisites.join(" ; ")}`);
  lines.push("", "Passages du cours :");
  r.passages.forEach((p, i) => lines.push(`[P${i + 1}]${p.page ? ` (page ${p.page})` : ""} ${p.text}`));
  if (r.history?.length) {
    lines.push("", "Échange jusqu'ici :");
    r.history.forEach((t) => lines.push(`${t.role === "student" ? "Étudiant" : "Pousse"} : ${t.text}`));
  }
  lines.push("");
  if (r.message) lines.push(`${r.mode === "enseigne" ? "Explication de l'étudiant" : "Réponse de l'étudiant"} : ${r.message}`);
  else if (!r.hint || !r.history?.length) lines.push(r.mode === "socratique" ? "Commence le dialogue par une première question ouverte sur la notion." : "Demande à l'étudiant d'expliquer la notion avec ses mots.");
  if (r.hint) lines.push("L'étudiant demande un indice.");
  return lines.join("\n");
}

// Garde seulement les citations dont l'extrait figure vraiment dans le passage cité
export function checkCitations(cits: unknown, passages: Passage[]) {
  const out: { passage: number; page?: number; quote: string }[] = [];
  for (const c of Array.isArray(cits) ? cits : []) {
    const i = Number((c as { passage?: number })?.passage) - 1;
    const q = String((c as { quote?: string })?.quote || "").trim();
    if (!passages[i] || q.length < 8) continue;
    if (!norm(passages[i].text).includes(norm(q).replace(/^\.\.\.|\.\.\.$|…/g, "").trim())) continue;
    out.push({ passage: i + 1, page: passages[i].page, quote: q.slice(0, 300) });
  }
  return out.slice(0, 4);
}

const month = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export async function handle(request: Request, deps: Deps): Promise<Response> {
  const origin = request.headers.get("origin") || "";
  const allow = deps.origins.includes(origin) ? origin : deps.origins[0];
  const cors = {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return json(405, { error: "méthode non autorisée" });

  const jwt = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const user = jwt ? await deps.getUser(jwt) : null;
  if (!user) return json(401, { error: "connexion requise" });

  let body: unknown;
  try { body = await request.json(); } catch { return json(400, { error: "JSON invalide" }); }
  const m = month((deps.now || (() => new Date()))());
  if (GEN_TASKS.includes((body as { task?: GenTask })?.task as GenTask)) return generate(body, user.id, m, deps, json);
  if (ORG_TASKS.includes((body as { task?: OrgTask })?.task as OrgTask)) return org(body as Record<string, unknown>, user.id, m, deps, json);
  const v = validate(body);
  if (!v.ok) return json(400, { error: v.error });
  const req = v.req;

  const used = await deps.usedThisMonth(user.id, m, "dialogue");
  if (used >= deps.limit) return json(429, { error: "quota", used, limit: deps.limit });

  let res: ModelResult;
  try {
    res = await deps.callModel({ system: SYSTEM, user: buildPrompt(req), schema: SCHEMA as unknown as Record<string, unknown>, effort: req.mode === "enseigne" ? "medium" : "low" });
  } catch (e) {
    if ((e as Error)?.name === "Busy") return json(503, { error: "occupe" });
    return json(502, { error: "le tuteur ne répond pas pour l'instant", detail: String((e as Error)?.message || e).slice(0, 200) });
  }
  const price = deps.price || PRICE;
  const cost = Math.round(((res.inputTokens * price.input + res.outputTokens * price.output) / 1e6) * 1e5) / 1e5;
  const refused = res.stop === "refusal";
  await deps.record({ userId: user.id, month: m, mode: req.mode, model: res.model, inputTokens: res.inputTokens, outputTokens: res.outputTokens, costUsd: cost, refused });
  const usage = { used: used + 1, limit: deps.limit };
  if (refused) return json(200, { refused: true, reply: "Je ne peux pas répondre à cette demande. Reformule ta réponse en restant sur la notion du cours.", usage });

  let out: Record<string, unknown>;
  try { out = JSON.parse(res.text); } catch { return json(502, { error: "réponse illisible du tuteur", usage }); }
  const verdicts = ["juste", "partiel", "faux", "sans_reponse", "hors_cours"];
  const nexts = ["continuer", "relire_passage", "revoir_prerequis", "terminer"];
  const citations = checkCitations(out.citations, req.passages);
  const dropped = (Array.isArray(out.citations) ? out.citations.length : 0) - citations.length;
  return json(200, {
    reply: clip(out.reply, 1200),
    verdict: verdicts.includes(String(out.verdict)) ? out.verdict : "sans_reponse",
    misconception: clip(out.misconception, 120).trim(),
    hint_level: Math.max(0, Math.min(3, Number(out.hint_level) || 0)),
    citations,
    citations_dropped: dropped,
    correct_points: (Array.isArray(out.correct_points) ? out.correct_points : []).slice(0, 6).map((x) => clip(x, 200)),
    missing: (Array.isArray(out.missing) ? out.missing : []).slice(0, 6).map((x) => clip(x, 200)),
    done: !!out.done,
    next_activity: nexts.includes(String(out.next_activity)) ? out.next_activity : "continuer",
    usage,
  });
}

/* Génération de contenu (enrichir une partie de PDF, rédiger un cours ou une notion).
   Mêmes garanties que le dialogue : connexion, quota vérifié avant l'appel, usage enregistré après, sortie revérifiée. */
async function generate(body: unknown, userId: string, m: string, deps: Deps, json: (s: number, d: unknown) => Response): Promise<Response> {
  const v = validateGen(body);
  if (!v.ok) return json(400, { error: v.error });
  const req = v.req;
  const limit = deps.genLimit ?? 150;
  const used = await deps.usedThisMonth(userId, m, "generation");
  if (used >= limit) return json(429, { error: "quota", used, limit });
  const p = genPrompt(req);
  let res: ModelResult;
  try {
    res = await deps.callModel({ system: p.system, user: p.user, schema: p.schema, effort: req.task === "enrichir" ? "low" : "medium", maxTokens: p.maxTokens });
  } catch (e) {
    if ((e as Error)?.name === "Busy") return json(503, { error: "occupe" });
    return json(502, { error: "la génération ne répond pas pour l'instant", detail: String((e as Error)?.message || e).slice(0, 200) });
  }
  const price = deps.price || PRICE;
  const cost = Math.round(((res.inputTokens * price.input + res.outputTokens * price.output) / 1e6) * 1e5) / 1e5;
  const refused = res.stop === "refusal";
  await deps.record({ userId, month: m, mode: req.task, model: res.model, inputTokens: res.inputTokens, outputTokens: res.outputTokens, costUsd: cost, refused });
  const usage = { used: used + 1, limit };
  if (refused) return json(200, { refused: true, usage });
  let out: Record<string, unknown>;
  try { out = JSON.parse(res.text); } catch { return json(502, { error: "réponse illisible", usage }); }
  return json(200, { ...cleanGen(req, out), usage });
}

/* Espace professionnel : rôle vérifié dans la base, preuves écrites ici, quota propre */
async function org(b: Record<string, unknown>, userId: string, m: string, deps: Deps, json: (s: number, d: unknown) => Response): Promise<Response> {
  if (!deps.db) return json(501, { error: "espace professionnel indisponible" });
  const task = b.task as OrgTask;
  const limit = deps.orgLimit ?? 400;
  let used = 0;
  if (needsModel(task)) {
    used = await deps.usedThisMonth(userId, m, "org");
    if (used >= limit) return json(429, { error: "quota", used, limit });
  }
  const price = deps.price || PRICE;
  try {
    const out = await orgTask(task, b, {
      userId, db: deps.db, callModel: deps.callModel,
      onModel: async (mode, r) => {
        used++;
        const cost = Math.round(((r.inputTokens * price.input + r.outputTokens * price.output) / 1e6) * 1e5) / 1e5;
        await deps.record({ userId, month: m, mode: mode as "mystere", model: r.model, inputTokens: r.inputTokens, outputTokens: r.outputTokens, costUsd: cost, refused: r.stop === "refusal" });
      },
    });
    return json(200, { ...(out as Record<string, unknown>), usage: { used, limit } });
  } catch (e) {
    if (e instanceof OrgError) return json(e.status, { error: e.status === 503 ? "occupe" : e.message });
    return json(500, { error: "erreur interne", detail: String((e as Error)?.message || e).slice(0, 200) });
  }
}
