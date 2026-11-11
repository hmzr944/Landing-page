// Espace professionnel côté serveur (étapes E à G) : compétences, diagnostic, Client Mystère.
// Règles :
// - Le rôle dans l'organisation est vérifié ici à chaque appel (base, clé serveur), jamais pris du navigateur.
// - Seules les connaissances VALIDÉES servent : questions, fiche du client, vérification des affirmations.
// - Les preuves (evidence_events) sont écrites ici seulement : un collaborateur ne peut pas s'attribuer un résultat.
// - Le diagnostic est corrigé ici : la bonne réponse ne quitte jamais le serveur avant la réponse de la personne.
// - Client Mystère : la fiche (besoin caché, objections) reste sur le serveur ; un évaluateur séparé du rôle du client
//   relève des comportements observables en citant la phrase exacte du vendeur, et vérifie chaque affirmation produit
//   face aux connaissances validées. Une affirmation absente des fiches est signalée, jamais acceptée.
import { support } from "./generate.ts";
import { compareVersions, type EnginesDb, relations, scenarioDesign, scenarioStart, sendInvitation, verifyProvenance } from "./engines.ts";

export const ORG_TASKS = ["competences", "diagnostic_start", "diagnostic_answer", "mystere_start", "mystere_tour", "mystere_fin", "relations", "scenario_concevoir", "scenario_start", "comparer_versions", "invitation_envoyer", "verifier_provenance"] as const;
export type OrgTask = typeof ORG_TASKS[number];
export interface Knowledge { id: string; kind: string; title: string; body: string; quote: string; page: number | null; source_version_id: string }
export interface OrgDb extends EnginesDb {
  role(userId: string, orgId: string): Promise<string | null>;
  validatedKnowledge(orgId: string, limit: number): Promise<Knowledge[]>;
  knowledgeById(orgId: string, ids: string[]): Promise<Knowledge[]>;
  skillLinks(orgId: string): Promise<{ skill_id: string; knowledge_id: string }[]>;
  insertDiagItems(rows: Record<string, unknown>[]): Promise<{ id: string }[]>;
  getDiagItem(id: string): Promise<Record<string, unknown> | null>;
  markAnswered(id: string): Promise<boolean>; // faux si déjà répondu (mise à jour conditionnelle, atomique)
  insertEvidence(rows: Record<string, unknown>[]): Promise<void>;
  createScenario(row: Record<string, unknown>): Promise<string>;
  getScenario(id: string): Promise<Record<string, unknown> | null>;
  updateScenario(id: string, patch: Record<string, unknown>): Promise<void>;
  // Moteurs (migration 008) : facultatifs pour rester compatibles avec une base plus ancienne
  getScenarioVersion?(id: string): Promise<Record<string, unknown> | null>;
}
type Call = (p: { system: string; user: string; schema: Record<string, unknown>; effort: "low" | "medium"; maxTokens?: number }) => Promise<{ text: string; stop: string; model: string; inputTokens: number; outputTokens: number }>;
export interface OrgCtx { userId: string; db: OrgDb; callModel: Call; onModel(mode: string, r: { model: string; inputTokens: number; outputTokens: number; stop: string }): Promise<void> }

const oclip = (s: unknown, n: number) => String(s ?? "").slice(0, n);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const onorm = (s: string) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[«»"“”’'`]/g, "'").replace(/\s+/g, " ").trim();
const inText = (needle: string, hay: string) => needle.trim().length >= 4 && onorm(hay).includes(onorm(needle));
const ostr = { type: "string" };
const nums = (t: string) => (String(t).match(/\d+(?:[.,]\d+)?/g) || []).map((x) => x.replace(',', '.'));
const numsIn = (t: string, src: string) => { const have = new Set(nums(src)); return nums(t).every((n) => have.has(n)); };
const CONF = ["devine", "sait", "reflexe"];
export class OrgError extends Error { constructor(public status: number, msg: string) { super(msg); } }

// Comportements observables évalués dans une simulation de vente (aucune qualité psychologique « mesurée » directement)
export const BEHAVIORS: Record<string, string> = {
  decouverte: "Pose des questions pour comprendre le besoin",
  reformulation: "Reformule le besoin du client",
  recommandation: "Propose une solution adaptée au besoin exprimé",
  procedure: "Applique une règle ou une procédure du magasin",
  objection: "Répond à une objection du client",
  clarte: "Explique simplement, sans jargon",
  securite: "Rappelle une consigne de sécurité ou oriente vers un responsable quand c'est nécessaire",
};
const BEHAVIOR_IDS = Object.keys(BEHAVIORS);

async function model(ctx: OrgCtx, mode: string, p: Parameters<Call>[0]): Promise<Record<string, unknown>> {
  let res;
  try { res = await ctx.callModel(p); }
  catch (e) { if ((e as Error)?.name === "Busy") throw new OrgError(503, "occupe"); throw new OrgError(502, "le service ne répond pas pour l'instant"); }
  await ctx.onModel(mode, res);
  if (res.stop === "refusal") throw new OrgError(422, "demande refusée par le modèle");
  try { return JSON.parse(res.text); } catch { throw new OrgError(502, "réponse illisible"); }
}

const kList = (ks: Knowledge[]) => ks.map((k, i) => `[k${i + 1}] (${k.kind}) ${k.title} : ${k.body} — extrait : « ${k.quote} »`).join("\n");
const kRef = (ks: Knowledge[], ref: unknown) => { const m = String(ref || "").match(/k(\d+)/i); return m ? ks[Number(m[1]) - 1] || null : null; };
// Une sélection variée et stable : d'abord le sensible et les règles, puis le reste
const pick = (ks: Knowledge[], n: number) => {
  const order = ["sensible", "regle", "procedure", "produit", "concept"];
  return [...ks].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.id.localeCompare(b.id)).slice(0, n);
};

/* ---------- E. Compétences : propositions à partir des connaissances validées (le manager valide ensuite) ---------- */
async function competences(ctx: OrgCtx, org: string) {
  const ks = pick(await ctx.db.validatedKnowledge(org, 60), 40);
  if (ks.length < 3) throw new OrgError(400, "il faut au moins 3 connaissances validées");
  const out = await model(ctx, "competences", {
    system: `Tu proposes un référentiel de compétences professionnelles à partir de connaissances validées d'une organisation.
Une compétence est une capacité observable au travail (verbe d'action : conseiller, appliquer, traiter, vérifier…), pas un thème.
Regroupe les connaissances [k…] utiles à chaque compétence. 3 à 7 compétences. Écris dans la langue des connaissances. N'invente aucune connaissance.`,
    user: kList(ks),
    schema: { type: "object", additionalProperties: false, required: ["skills"], properties: { skills: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "description", "knowledge"], properties: { name: ostr, description: ostr, knowledge: { type: "array", items: ostr } } } } } },
    effort: "medium", maxTokens: 1600,
  });
  const skills = (Array.isArray(out.skills) ? out.skills : []).slice(0, 8).map((s) => s as Record<string, unknown>).map((s) => ({
    name: oclip(s.name, 160).trim(), description: oclip(s.description, 600).trim(),
    knowledge: [...new Set((Array.isArray(s.knowledge) ? s.knowledge : []).map((r) => kRef(ks, r)).filter(Boolean).map((k) => (k as Knowledge).id))],
  })).filter((s) => s.name.length >= 3 && s.knowledge.length);
  return { skills };
}

/* ---------- E. Diagnostic : questions générées et corrigées ici ---------- */
const STOPW = new Set(["dans", "pour", "avec", "sans", "sont", "est", "les", "des", "une", "aux", "par", "sur", "que", "qui", "plus", "moins", "tout", "tous", "cette", "leur", "leurs", "elle", "elles", "doit", "peut", "avant", "apres", "entre", "chaque"]);
export function fallbackQuestions(ks: Knowledge[]) {
  const words = (t: string) => (String(t).match(/[A-Za-zÀ-ÿ]{6,}/g) || []).filter((w) => !STOPW.has(onorm(w)));
  const pool = [...new Set(ks.flatMap((k) => words(k.quote)))];
  const out: { k: Knowledge; question: string; options: string[]; correct: number }[] = [];
  ks.forEach((k, i) => {
    let target = "", distract: string[] = [];
    const n = (k.quote.match(/\d+(?:[.,]\d+)?/) || [])[0];
    if (n) {
      const v = Number(n.replace(",", "."));
      const alt = [v * 2, Math.max(1, Math.round(v / 2)), v + (v >= 10 ? 10 : 1), v + (v >= 10 ? 5 : 2)].map((x) => String(Math.round(x * 100) / 100).replace(".", ",")).filter((x) => x !== n);
      target = n; distract = [...new Set(alt)].slice(0, 2);
    } else {
      const own = words(k.quote).sort((a, b) => b.length - a.length);
      target = own[0] || "";
      distract = pool.filter((w) => onorm(w) !== onorm(target) && !onorm(k.quote).includes(onorm(w))).slice(i, i + 2);
      if (distract.length < 2) distract = pool.filter((w) => onorm(w) !== onorm(target) && !onorm(k.quote).includes(onorm(w))).slice(0, 2);
    }
    if (!target || distract.length < 2) return;
    const blank = k.quote.replace(target, "____");
    if (blank === k.quote) return;
    const correct = i % 3;
    const options = [...distract]; options.splice(correct, 0, target);
    out.push({ k, question: `Complète, d'après nos documents : « ${blank} »`, options, correct });
  });
  return out;
}
async function diagnosticStart(ctx: OrgCtx, org: string) {
  const all = await ctx.db.validatedKnowledge(org, 60);
  if (all.length < 3) throw new OrgError(400, "pas encore assez de connaissances validées pour un diagnostic");
  const ks = pick(all, 8);
  let qs: { k: Knowledge; question: string; options: string[]; correct: number }[] = [];
  try {
    const out = await model(ctx, "diagnostic", {
      system: `Tu écris un diagnostic court pour un collaborateur, à partir de connaissances validées [k…].
Pour chaque connaissance : une question de mise en situation professionnelle, 3 réponses possibles, l'indice (0, 1 ou 2) de la seule bonne réponse.
La bonne réponse doit découler directement de la connaissance ; les deux autres doivent être plausibles mais fausses. Pas de piège de vocabulaire. Écris dans la langue des connaissances.`,
      user: kList(ks),
      schema: { type: "object", additionalProperties: false, required: ["questions"], properties: { questions: { type: "array", items: { type: "object", additionalProperties: false, required: ["k", "question", "options", "correct"], properties: { k: ostr, question: ostr, options: { type: "array", items: ostr }, correct: { type: "integer" } } } } } },
      effort: "medium", maxTokens: 2200,
    });
    qs = (Array.isArray(out.questions) ? out.questions : []).map((q) => q as Record<string, unknown>).map((q) => {
      const k = kRef(ks, q.k); const options = (Array.isArray(q.options) ? q.options : []).map((o) => oclip(o, 240).trim());
      const c = Number(q.correct);
      return { k, question: oclip(q.question, 400).trim(), options, correct: c };
    }).filter((q) => q.k && q.question.length > 10 && q.options.length === 3 && new Set(q.options.map(onorm)).size === 3 && q.correct >= 0 && q.correct <= 2
      // la bonne réponse doit être portée par la connaissance (vocabulaire retrouvé), sinon la question est écartée
      && support(q.options[q.correct], `${q.k!.body} ${q.k!.quote} ${q.k!.title}`) >= 0.5
      // et chaque nombre de la bonne réponse doit figurer dans la connaissance (un chiffre inventé ne passe pas)
      && numsIn(q.options[q.correct], `${q.k!.body} ${q.k!.quote} ${q.k!.title}`)) as typeof qs;
  } catch (e) { if (e instanceof OrgError && e.status === 503) throw e; /* modèle indisponible : questions de repli */ }
  // Repli sans modèle (ou questions écartées) : texte à trous sur l'extrait du document. On masque un nombre ou un mot
  // porteur de sens ; les deux autres choix sont du même genre (nombre voisin, ou mot d'une autre connaissance).
  if (qs.length < 3) qs = fallbackQuestions(ks);
  const session = crypto.randomUUID();
  const rows = qs.slice(0, 8).map((q) => ({ org_id: org, user_id: ctx.userId, session_id: session, knowledge_id: q.k.id, question: q.question, options: q.options, correct: q.correct }));
  const ids = await ctx.db.insertDiagItems(rows);
  return { session, items: rows.map((r, i) => ({ id: ids[i].id, question: r.question, options: r.options })) };
}

async function diagnosticAnswer(ctx: OrgCtx, org: string, b: Record<string, unknown>) {
  const id = String(b.item || ""); if (!UUID.test(id)) throw new OrgError(400, "question invalide");
  const choice = Number(b.choice); const confidence = CONF.includes(String(b.confidence)) ? String(b.confidence) : null;
  const item = await ctx.db.getDiagItem(id);
  if (!item || item.user_id !== ctx.userId || item.org_id !== org) throw new OrgError(404, "question introuvable");
  if (!(await ctx.db.markAnswered(id))) throw new OrgError(409, "question déjà répondue");
  const correct = Number(item.correct); const outcome = choice === correct ? "juste" : "faux";
  const [k] = await ctx.db.knowledgeById(org, [String(item.knowledge_id)]);
  const link = (await ctx.db.skillLinks(org)).find((l) => l.knowledge_id === item.knowledge_id);
  // Un QCM montre une connaissance reconnue (niveau 2) ; deviner rend l'observation peu fiable
  await ctx.db.insertEvidence([{ org_id: org, user_id: ctx.userId, knowledge_id: item.knowledge_id, skill_id: link ? link.skill_id : null, activity: "diagnostic", outcome, confidence,
    source_version_id: k ? k.source_version_id : null, evaluator: "regle", session_id: item.session_id, level: outcome === "juste" ? 2 : null,
    reliability: confidence === "devine" ? "faible" : "moyenne", context: "diagnostic", detail: { question: item.question, choice, correct } }]);
  return { outcome, correct, falseCertainty: outcome === "faux" && (confidence === "sait" || confidence === "reflexe"),
    explanation: k ? k.body : "", quote: k ? k.quote : "", page: k ? k.page : null, title: k ? k.title : "" };
}

/* ---------- F. Client Mystère ---------- */
const PERSONA_SCHEMA = { type: "object", additionalProperties: false, required: ["name", "profile", "personality", "need", "objections", "opening", "knowledge"],
  properties: { name: ostr, profile: ostr, personality: ostr, need: ostr, objections: { type: "array", items: ostr }, opening: ostr, knowledge: { type: "array", items: ostr } } };

async function mystereStart(ctx: OrgCtx, org: string, b: Record<string, unknown>) {
  const all = await ctx.db.validatedKnowledge(org, 60);
  if (all.length < 3) throw new OrgError(400, "pas encore assez de connaissances validées pour une simulation");
  const ks = pick(all, 12);
  const style = ["pressé", "hésitant", "exigeant"].includes(String(b.style)) ? String(b.style) : "hésitant";
  const out = await model(ctx, "mystere", {
    system: `Tu prépares une simulation de vente pour former un collaborateur. Tu crées la fiche d'un client fictif (${style}) qui entre dans le magasin.
Le client a un besoin réel qu'il n'exprime pas d'emblée, et 2 ou 3 objections. Tout ce qui concerne les produits et les règles doit venir des connaissances validées [k…] : liste celles que la situation mobilise dans "knowledge".
"opening" : la première phrase du client, naturelle, qui ne dévoile pas tout son besoin. Prénom fictif. Écris en français.`,
    user: kList(ks), schema: PERSONA_SCHEMA, effort: "medium", maxTokens: 1200,
  });
  const used = [...new Set((Array.isArray(out.knowledge) ? out.knowledge : []).map((r) => kRef(ks, r)).filter(Boolean) as Knowledge[])];
  const kn = used.length >= 2 ? used : ks.slice(0, 6);
  const objections = (Array.isArray(out.objections) ? out.objections : []).slice(0, 3).map((o) => ({ text: oclip(o, 200), resolved: false }));
  const spec = { style, name: oclip(out.name, 40) || "Client", profile: oclip(out.profile, 300), personality: oclip(out.personality, 300), need: oclip(out.need, 300), objections, knowledge: kn.map((k) => k.id) };
  const opening = oclip(out.opening, 400) || "Bonjour, je regarde un peu…";
  const state = { need_found: false, resolved: [] as number[], patience: style === "pressé" ? 3 : 4, turns: 0, behaviors: {} as Record<string, string>, claims: [] as unknown[], ended: false };
  const id = await ctx.db.createScenario({ org_id: org, user_id: ctx.userId, spec, state, transcript: [{ role: "client", text: opening }] });
  // la fiche (besoin, objections) reste secrète : seul le profil visible est renvoyé
  return { id, opening, client: { name: spec.name, style } };
}

// Grille de comportements : celle de la fiche publiée, sinon celle de la vente
const rubricOf = (spec: Record<string, any>): Record<string, string> => {
  const r = Array.isArray(spec?.rubric) ? spec.rubric : [];
  const m: Record<string, string> = {};
  r.forEach((x: { id?: string; label?: string }) => { const id = String(x?.id || "").replace(/[^a-z_]/g, "").slice(0, 30); if (id && x?.label) m[id] = oclip(x.label, 160); });
  return Object.keys(m).length >= 2 ? m : BEHAVIORS;
};
const evalSchema = (ids: string[]) => ({ ...EVAL_SCHEMA, properties: { ...EVAL_SCHEMA.properties, behaviors: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "evidence"], properties: { id: { type: "string", enum: ids }, evidence: ostr } } } } });
// Verdicts d'une affirmation : conformité aux connaissances validées, pas « vérité » en général.
// hors_referentiel : absente des connaissances validées mais présentée comme une pratique de terrain ou un fait général plausible
// (avec une raison) ; ni juste ni fausse, jamais comptée comme maîtrise ; signalée à l'équipe de contenu.
const VERDICTS = ["correct", "incorrect", "insuffisant", "non_documente", "hors_referentiel"];
const EVAL_SCHEMA = { type: "object", additionalProperties: false, required: ["behaviors", "claims", "need_found", "objections_resolved"],
  properties: {
    behaviors: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "evidence"], properties: { id: { type: "string", enum: BEHAVIOR_IDS }, evidence: ostr } } },
    claims: { type: "array", items: { type: "object", additionalProperties: false, required: ["text", "k", "verdict", "why"], properties: { text: ostr, k: ostr, verdict: { type: "string", enum: VERDICTS }, why: ostr } } },
    need_found: { type: "boolean" }, objections_resolved: { type: "array", items: { type: "integer" } },
  } };
const CLIENT_SCHEMA = { type: "object", additionalProperties: false, required: ["reply", "satisfied", "leaves"], properties: { reply: ostr, satisfied: { type: "boolean" }, leaves: { type: "boolean" } } };

async function mystereTour(ctx: OrgCtx, org: string, b: Record<string, unknown>) {
  const id = String(b.session || ""); if (!UUID.test(id)) throw new OrgError(400, "partie invalide");
  const msg = oclip(b.message, 800).trim(); if (msg.length < 2) throw new OrgError(400, "message vide");
  const confidence = CONF.includes(String(b.confidence)) ? String(b.confidence) : null;
  const sc = await ctx.db.getScenario(id);
  if (!sc || sc.user_id !== ctx.userId || sc.org_id !== org) throw new OrgError(404, "partie introuvable");
  if (sc.status !== "en_cours") throw new OrgError(409, "partie terminée");
  const spec = sc.spec as Record<string, any>, state = sc.state as Record<string, any>, transcript = (sc.transcript as { role: string; text: string }[]) || [];
  // même numérotation [k…] que la fiche du client, d'un tour à l'autre
  const ks = (await ctx.db.knowledgeById(org, spec.knowledge || [])).sort((a, b) => (spec.knowledge || []).indexOf(a.id) - (spec.knowledge || []).indexOf(b.id));
  const lastClient = [...transcript].reverse().find((t) => t.role === "client")?.text || "";

  const rubric = rubricOf(spec), rubricIds = Object.keys(rubric);
  const role = spec.role_label || "vendeur";
  // 1. Évaluateur (séparé du personnage) : comportements observés et affirmations, chacun cité mot pour mot
  const ev = await model(ctx, "mystere", {
    system: `Tu évalues la réponse d'un ${role} dans une simulation. Tu n'es pas le personnage simulé.
- "behaviors" : les comportements observables présents dans CETTE réponse, parmi : ${rubricIds.map((x) => `${x} (${rubric[x]})`).join(" ; ")}. "evidence" = la phrase exacte qui le montre (copiée mot pour mot).
- "claims" : chaque affirmation factuelle (produit, prix, règle, procédure, fait technique). "text" = copiée mot pour mot. Compare aux connaissances validées [k…] : "correct" si elle y est conforme, "incorrect" si elle les contredit, "insuffisant" si elle va dans le bon sens mais reste trop vague ou incomplète pour être vérifiée, "non_documente" si aucune ne la couvre et que tu ne peux pas juger sa plausibilité (ce n'est PAS une erreur), "hors_referentiel" si aucune ne la couvre mais qu'elle décrit une pratique de terrain ou un fait général plausible (ni juste ni faux : à signaler). "k" = la connaissance concernée ("" si aucune). "why" = une phrase : pourquoi ce verdict (pour hors_referentiel : ce qui la rend plausible).
- "need_found" : le besoin caché ou l'enjeu principal a-t-il été identifié ? "objections_resolved" : numéros (à partir de 0) des objections levées par cette réponse.
Ne juge pas la personnalité. N'invente rien.`,
    user: `Connaissances validées :\n${kList(ks)}\n\nBesoin caché ou enjeu : ${spec.need}\nObjections : ${(spec.objections || []).map((o: { text: string }, i: number) => `${i}. ${o.text}`).join(" ; ")}\n\nDernière phrase de ${spec.name} : « ${lastClient} »\nRéponse : « ${msg} »`,
    schema: evalSchema(rubricIds), effort: "medium", maxTokens: 1200,
  });
  const behaviors = (Array.isArray(ev.behaviors) ? ev.behaviors : []).map((x) => x as Record<string, string>).filter((x) => rubricIds.includes(x.id) && inText(x.evidence, msg));
  const claims = (Array.isArray(ev.claims) ? ev.claims : []).map((x) => x as Record<string, string>).filter((x) => inText(x.text, msg)).map((x) => {
    const k = kRef(ks, x.k);
    // Quatre catégories qui ne se confondent jamais. Sans connaissance de référence : ni juste ni fausse, non documentée.
    // Sans connaissance de référence, seules deux issues : non documentée, ou hors référentiel (plausible, à examiner).
    // Une affirmation reliée à une connaissance ne peut pas être « hors référentiel ».
    const verdict = !k ? (x.verdict === "hors_referentiel" ? "hors_referentiel" : "non_documente")
      : ["correct", "incorrect", "insuffisant", "non_documente"].includes(x.verdict) ? x.verdict : "non_documente";
    return { text: oclip(x.text, 300), verdict, k: k ? k.id : null, quote: k ? k.quote : "", page: k ? k.page : null, confidence, turn: state.turns + 1, why: oclip(x.why, 300) };
  });
  // un comportement ne compte qu'une fois par partie (sa première observation), sinon il gonflerait les preuves
  const fresh = behaviors.filter((x, i, a) => !state.behaviors[x.id] && a.findIndex((y) => y.id === x.id) === i);
  fresh.forEach((x) => { state.behaviors[x.id] = oclip(x.evidence, 300); });
  state.claims = [...(state.claims || []), ...claims];
  if (ev.need_found === true) state.need_found = true;
  (Array.isArray(ev.objections_resolved) ? ev.objections_resolved : []).forEach((i) => { const n = Number(i); if (spec.objections?.[n] && !state.resolved.includes(n)) state.resolved.push(n); });
  state.turns = (state.turns || 0) + 1;
  if (!behaviors.length) state.patience = (state.patience || 3) - 1;
  if (claims.some((c) => c.verdict === "incorrect")) state.patience = (state.patience || 3) - 1;
  // Événement prévu par la fiche à ce tour (la situation évolue) : le personnage le vit, le journal le garde
  const event = (Array.isArray(spec.events) ? spec.events : []).find((e: { turn?: number }) => Number(e?.turn) === state.turns);
  if (event) state.events = [...(state.events || []), { turn: state.turns, text: oclip(event.text, 300) }];

  // 2. Le client répond, selon sa fiche et l'état de la situation (pas seulement la dernière phrase)
  const cl = await model(ctx, "mystere", {
    system: `Tu joues ${spec.name}, ${spec.role_play || `un client ${spec.style} dans un magasin`}. ${spec.context ? `Contexte : ${spec.context}. ` : ""}Profil : ${spec.profile}. Personnalité : ${spec.personality}.${event ? `\nÉvénement qui survient maintenant : ${event.text}. Réagis-y.` : ""}
Ton besoin réel (à ne dévoiler que si le vendeur pose les bonnes questions) : ${spec.need}.
Tes objections : ${(spec.objections || []).map((o: { text: string }, i: number) => `${o.text}${state.resolved.includes(i) ? " (levée)" : ""}`).join(" ; ")}.
État : besoin ${state.need_found ? "découvert" : "pas encore découvert"} ; patience ${state.patience} (0 = tu pars).
Reste dans ton rôle, réponds en 1 à 3 phrases naturelles. Tu ne connais des produits que ce que le vendeur te dit ; n'invente aucune caractéristique.
"satisfied" = vrai si tu es prêt à acheter ou si ta demande est réglée ; "leaves" = vrai si tu pars (patience épuisée, réponse inacceptable).`,
    user: [...transcript.slice(-6), { role: "vendeur", text: msg }].map((t) => `${t.role === "client" ? spec.name : "Vendeur"} : ${t.text}`).join("\n"),
    schema: CLIENT_SCHEMA, effort: "low", maxTokens: 400,
  });
  const reply = oclip(cl.reply, 500).trim() || "…";
  const ended = cl.satisfied === true || cl.leaves === true || state.patience <= 0 || state.turns >= 12;
  state.ended = ended; state.outcome = cl.satisfied === true ? "satisfait" : cl.leaves === true || state.patience <= 0 ? "parti" : ended ? "temps ecoule" : null;

  // 3. Preuves : chaque affirmation rattachée à une connaissance validée ; chaque comportement observé
  const links = await ctx.db.skillLinks(org);
  const kv = new Map(ks.map((k) => [k.id, k]));
  // juste / faux / insuffisant / non documenté restent distincts ; une affirmation appliquée en situation vaut le niveau 4
  const OUT: Record<string, string> = { correct: "juste", incorrect: "faux", insuffisant: "insuffisant", non_documente: "non_documente", hors_referentiel: "non_documente" };
  const ctxName = `simulation:${oclip(spec.kind || spec.style || "client", 30)}`;
  const base = { org_id: org, user_id: ctx.userId, activity: "simulation", evaluator: "ia", session_id: id, context: ctxName, reliability: "moyenne", ...(sc.scenario_version_id ? { scenario_version_id: sc.scenario_version_id } : {}) };
  const rows: Record<string, unknown>[] = claims.map((c) => ({ ...base, knowledge_id: c.k, skill_id: c.k ? links.find((l) => l.knowledge_id === c.k)?.skill_id || null : null,
    outcome: OUT[c.verdict], confidence, level: c.verdict === "correct" ? 4 : null, source_version_id: c.k ? kv.get(c.k as string)?.source_version_id || null : null,
    detail: { claim: c.text, turn: state.turns, ...(c.verdict === "hors_referentiel" ? { scope: "out_of_scope_knowledge" } : {}) } }));
  // Connaissances de terrain hors référentiel : signalées à l'équipe de contenu (migration 009), sans effet sur la maîtrise
  const oos = claims.filter((c) => c.verdict === "hors_referentiel");
  if (oos.length && ctx.db.insertOutOfScope) {
    await ctx.db.insertOutOfScope(oos.map((c) => ({ org_id: org, user_id: ctx.userId, session_id: id, claim: c.text, context: ctxName, rationale: c.why || "" }))).catch(() => {}); // base sans 009 : le débrief le montre quand même
  }
  fresh.forEach((x) => rows.push({ ...base, knowledge_id: null, skill_id: null, outcome: "juste", confidence: null, level: 4, source_version_id: null, detail: { behavior: x.id, label: rubric[x.id], evidence: oclip(x.evidence, 300), turn: state.turns } }));
  if (rows.length) await ctx.db.insertEvidence(rows);
  await ctx.db.updateScenario(id, { state, transcript: [...transcript, { role: "vendeur", text: msg, confidence }, { role: "client", text: reply }] });
  return { reply, ended, turn: state.turns, event: event ? event.text : null };
}

// Débrief calculé ici, sans modèle : uniquement à partir de ce qui a été observé et vérifié
export function debriefOf(spec: Record<string, any>, state: Record<string, any>) {
  const claims = (state.claims || []) as { text: string; verdict: string; quote: string; page: number | null; confidence: string | null }[];
  return {
    outcome: state.outcome || (state.ended ? "termine" : "interrompu"),
    turns: state.turns || 0,
    need: { found: !!state.need_found, text: spec.need },
    objections: (spec.objections || []).map((o: { text: string }, i: number) => ({ text: o.text, resolved: (state.resolved || []).includes(i) })),
    behaviors: Object.entries(rubricOf(spec)).map(([id, label]) => ({ id, label, observed: !!state.behaviors?.[id], evidence: state.behaviors?.[id] || "" })),
    correct: claims.filter((c) => c.verdict === "correct"),
    incorrect: claims.filter((c) => c.verdict === "incorrect").map((c) => ({ ...c, falseCertainty: c.confidence === "sait" || c.confidence === "reflexe" })),
    insufficient: claims.filter((c) => c.verdict === "insuffisant"),
    undocumented: claims.filter((c) => c.verdict === "non_documente"),
    outOfScope: claims.filter((c) => c.verdict === "hors_referentiel").map((c) => ({ text: c.text, why: (c as { why?: string }).why || "" })),
    events: state.events || [],
    note: "Une simulation réussie ne suffit pas à valider une compétence : elle s'ajoute aux autres preuves, dans le temps.",
  };
}

async function mystereFin(ctx: OrgCtx, org: string, b: Record<string, unknown>) {
  const id = String(b.session || ""); if (!UUID.test(id)) throw new OrgError(400, "partie invalide");
  const sc = await ctx.db.getScenario(id);
  if (!sc || sc.user_id !== ctx.userId || sc.org_id !== org) throw new OrgError(404, "partie introuvable");
  if (sc.status === "termine" && sc.debrief) return { debrief: sc.debrief };
  const debrief = debriefOf(sc.spec as Record<string, any>, sc.state as Record<string, any>);
  await ctx.db.updateScenario(id, { status: "termine", debrief, ended_at: new Date().toISOString() });
  return { debrief };
}

/* ---------- Point d'entrée ---------- */
export async function orgTask(task: OrgTask, b: Record<string, unknown>, ctx: OrgCtx) {
  const org = String(b.org || "");
  if (!UUID.test(org)) throw new OrgError(400, "organisation invalide");
  const role = await ctx.db.role(ctx.userId, org);
  if (!role) throw new OrgError(403, "accès refusé");
  if (task === "competences") { if (!["admin", "manager"].includes(role)) throw new OrgError(403, "accès refusé"); return competences(ctx, org); }
  if (task === "diagnostic_start") return diagnosticStart(ctx, org);
  if (task === "diagnostic_answer") return diagnosticAnswer(ctx, org, b);
  if (task === "mystere_start") return mystereStart(ctx, org, b);
  if (task === "mystere_tour") return mystereTour(ctx, org, b);
  if (task === "relations") return relations(ctx, ctx.db, org, role);
  if (task === "scenario_concevoir") return scenarioDesign(ctx, ctx.db, org, role, b);
  if (task === "scenario_start") return scenarioStart(ctx, ctx.db, org, role, b);
  if (task === "comparer_versions") return compareVersions(ctx, ctx.db, org, role, b);
  if (task === "invitation_envoyer") return sendInvitation(ctx, ctx.db, org, role, b);
  if (task === "verifier_provenance") return verifyProvenance(ctx, ctx.db, org, role, b);
  return mystereFin(ctx, org, b);
}
export const needsModel = (t: OrgTask) => ["competences", "diagnostic_start", "mystere_start", "mystere_tour", "relations", "scenario_concevoir", "comparer_versions"].includes(t);
