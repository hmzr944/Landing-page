// Arbor Learning universel : trois tâches du moteur pédagogique, toutes ancrées sur des passages fournis par le client
// (document importé, notes de l'apprenant, ou sources ouvertes réelles récupérées par le navigateur : Wikilivres,
// Wikiversité, Wikipédia). Le serveur ne cherche rien sur Internet et n'invente aucune source.
//   - "fiche_rediger" : une fiche pédagogique v2 (Situation → Compréhension → Explication → Pratique → Vérification),
//     adaptée au niveau et à l'intention de l'apprenant. Chaque extrait de source est vérifié mot pour mot dans les
//     passages ; une fiche sans extrait vérifiable est refusée. Le navigateur la contrôle ensuite avec le validateur
//     (js/pedagogie/fiche-validateur.js) avant de la servir : la fiche quitte le serveur en « brouillon ».
//   - "fiche_juger"   : juge une explication libre sur la grille de l'item ; une confusion n'est retenue que si elle
//     figure dans la liste fermée de la fiche (sinon « erreur non diagnostiquée »).
//   - "compagnon"     : répond à une question à partir des passages, avec citations vérifiées ; dit ce qui manque
//     quand les passages ne suffisent pas ; propose un exercice et des pistes d'approfondissement.
export const LEARN_TASKS = ["fiche_rediger", "fiche_juger", "compagnon"] as const;
export type LearnTask = typeof LEARN_TASKS[number];
type Call = (p: { system: string; user: string; schema: Record<string, unknown>; effort: "low" | "medium"; maxTokens?: number }) => Promise<{ text: string; stop: string; model: string; inputTokens: number; outputTokens: number }>;
export interface LearnCtx { callModel: Call; onModel(r: { model: string; inputTokens: number; outputTokens: number; stop: string }): Promise<void> }
export class LearnError extends Error { constructor(public status: number, msg: string) { super(msg); } }

export interface Passage { id: string; titre: string; url?: string; licence?: string; texte: string }
const clip = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const norm = (s: string) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[«»"“”’'`]/g, "'").replace(/\s+/g, " ").trim();
export const inPassage = (extrait: string, p: Passage) => extrait.trim().length >= 20 && norm(p.texte).includes(norm(extrait));

const NIVEAUX: Record<string, string> = {
  debutant: "débutant complet : vocabulaire courant, une idée à la fois, exemples du quotidien",
  intermediaire: "a déjà des bases : vocabulaire du domaine expliqué au besoin, liens entre idées",
  avance: "à l'aise : précision, cas limites, nuances",
};
const INTENTIONS: Record<string, string> = {
  comprendre: "comprendre vraiment (pourquoi, comment)",
  examen: "réussir un examen (rappel précis, applications typiques)",
  pratique: "s'en servir au travail ou dans un projet (décisions, gestes, erreurs à éviter)",
  curiosite: "par curiosité (situations parlantes, liens avec le quotidien)",
};

function passagesOf(b: Record<string, unknown>): Passage[] {
  const ps = (Array.isArray(b.passages) ? b.passages : []).slice(0, 12).map((x, i) => {
    const p = x as Record<string, unknown>;
    return { id: clip(p.id, 20) || `p${i + 1}`, titre: clip(p.titre, 160) || "Source", url: clip(p.url, 300) || undefined, licence: clip(p.licence, 60) || undefined, texte: String(p.texte ?? "").slice(0, 2500) };
  }).filter((p) => p.texte.trim().length >= 60);
  if (!ps.length) throw new LearnError(400, "aucun passage : Arbor n'écrit une fiche qu'à partir de sources");
  return ps;
}
const pBlock = (ps: Passage[]) => ps.map((p) => `[${p.id}] ${p.titre}\n${p.texte}`).join("\n\n");
async function ask(ctx: LearnCtx, p: Parameters<Call>[0]) {
  const r = await ctx.callModel(p);
  await ctx.onModel(r);
  try { return JSON.parse(r.text) as Record<string, unknown>; } catch { throw new LearnError(502, "réponse illisible du modèle"); }
}

/* ---------- Fiche ---------- */
const S = { type: "string" }, SA = { type: "array", items: S }, I = { type: "integer" };
const ITEM = { type: "object", additionalProperties: false, required: ["type", "evalue", "q", "choix", "attendus", "etapes"],
  properties: { type: { type: "string", enum: ["choix", "courte", "ordre"] }, evalue: { type: "string", enum: ["application", "compréhension", "restitution"] }, q: S,
    choix: { type: "array", items: { type: "object", additionalProperties: false, required: ["texte", "juste", "confusion"], properties: { texte: S, juste: { type: "boolean" }, confusion: I } } },
    attendus: SA, etapes: SA } };
const ITEMS = { type: "array", items: ITEM };
export const FICHE_SCHEMA = { type: "object", additionalProperties: false,
  required: ["situation", "question_ouverture", "explication_simple", "ancre_simple", "explication_standard", "ancre_standard", "sources_explication", "idee_centrale", "elements_cles", "representations", "confusions", "comprehension", "comprehension_reserve", "application", "application_reserve", "transfert", "transfert_reserve", "rappel", "glossaire", "extraits"],
  properties: {
    situation: S, question_ouverture: S, explication_simple: S, ancre_simple: S, explication_standard: S, ancre_standard: S, sources_explication: SA, idee_centrale: S, elements_cles: SA,
    representations: { type: "array", items: { type: "object", additionalProperties: false, required: ["type", "texte", "limite"], properties: { type: { type: "string", enum: ["exemple", "etapes", "analogie", "contre_exemple", "schema"] }, texte: S, limite: S } } },
    confusions: { type: "array", items: { type: "object", additionalProperties: false, required: ["libelle", "description", "remede", "controle"], properties: { libelle: S, description: S, remede: I, controle: ITEM } } },
    comprehension: ITEMS, comprehension_reserve: ITEMS, application: ITEMS, application_reserve: ITEMS, transfert: ITEMS, transfert_reserve: ITEMS, rappel: ITEMS,
    glossaire: { type: "array", items: { type: "object", additionalProperties: false, required: ["terme", "explication"], properties: { terme: S, explication: S } } },
    extraits: { type: "array", items: { type: "object", additionalProperties: false, required: ["passage", "extrait"], properties: { passage: S, extrait: S } } },
  } };

export function fichePrompt(b: Record<string, unknown>, ps: Passage[]) {
  const notion = clip(b.notion, 160), sujet = clip(b.sujet, 160);
  const niveau = NIVEAUX[String(b.niveau)] || NIVEAUX.debutant, intention = INTENTIONS[String(b.intention)] || INTENTIONS.comprendre;
  const objectif = clip(b.objectif, 300), question = clip(b.question, 300);
  const retour = (Array.isArray(b.retour) ? b.retour : []).slice(0, 12).map((x) => `- ${clip(x, 200)}`).join("\n");
  const system = `Tu conçois une fiche pédagogique Arbor pour apprendre « ${notion} »${sujet && sujet !== notion ? ` (domaine : ${sujet})` : ""}.
Apprenant : ${niveau}. Intention : ${intention}.${objectif ? ` Objectif : ${objectif}.` : ""}${question ? ` Sa question de départ : ${question}.` : ""}
Philosophie : Situation → Compréhension → Explication → Pratique → Vérification → Maîtrise.
Règles impératives :
1. Tout fait vient des passages [p…] fournis. N'ajoute aucun fait, chiffre, nom ou référence absent des passages. "extraits" : 2 à 6 phrases COPIÉES MOT POUR MOT des passages, avec l'identifiant du passage ; "sources_explication" : les identifiants des passages utilisés.
2. "situation" (80 caractères au moins) : un cas concret et familier qui pose le problème SANS nommer la notion ni la définir (pas de « on appelle », « désigne », « définition »). "question_ouverture" : ce que l'apprenant ferait ou penserait.
3. Deux explications (120 caractères au moins chacune) : "explication_simple" et "explication_standard". Chacune COMMENCE par reprendre la situation : "ancre_simple" / "ancre_standard" est une courte phrase (10 caractères au moins) copiée de l'explication, qui reprend au moins deux mots de la situation, et qui apparaît AVANT la première mention de la notion.
4. "idee_centrale" (une phrase) et exactement 2 "elements_cles". Glossaire de 5 à 10 termes.
5. Au moins 3 représentations de 2 types différents (texte de 60 caractères au moins) ; une analogie a toujours sa "limite" ("" sinon).
6. 1 à 3 confusions typiques : "remede" = l'indice (à partir de 0) d'une représentation qui défait la confusion ; "controle" = un QCM dont au moins un mauvais choix porte cette confusion ("confusion" = indice de la confusion, -1 sinon).
7. Questions : comprehension (2 à 4, au moins 2 qui ne sont pas de la restitution), comprehension_reserve (1 à 2), application (1 à 3, classées « application »), application_reserve (0 à 2), transfert (1 : un AUTRE contexte que la situation, jamais « restitution »), transfert_reserve (0 à 1), rappel (2 à 3, classés « restitution »).
   Types : "choix" (exactement 4 choix distincts, un seul juste, longueurs comparables : la bonne réponse n'est pas la plus longue), "courte" (réponse de quelques mots ou un nombre dans "attendus"), "ordre" (au moins 3 étapes dans le bon ordre, application seulement). Pour "choix", "attendus" et "etapes" sont vides ; pour les autres, "choix" est vide.
   Classement : une question « pourquoi » est « compréhension » ; « que fais-tu », « est-ce conforme » sont « application » ; une phrase à compléter par « … » sans nombre est « restitution ». Au moins une question d'application en réponse courte ou en mise en ordre.
8. Adapte le vocabulaire, les exemples et la difficulté à l'apprenant. Écris en français.${retour ? `\nCorrige ces défauts de la version précédente :\n${retour}` : ""}`;
  return { system, user: `Passages :\n${pBlock(ps)}`, schema: FICHE_SCHEMA as unknown as Record<string, unknown>, effort: "medium" as const, maxTokens: 7000 };
}

const slug = (s: string) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "notion";
/* Assemble la fiche v2 à partir de la réponse du modèle : identifiants, liens confusions ↔ remèdes, sources VÉRIFIÉES. */
export function assembleFiche(out: Record<string, unknown>, b: Record<string, unknown>, ps: Passage[]) {
  const notion = clip(b.notion, 160);
  // sources : seulement les extraits retrouvés mot pour mot dans leur passage ; titre, adresse et licence viennent du client
  const byId = new Map(ps.map((p) => [p.id, p]));
  const verified = (Array.isArray(out.extraits) ? out.extraits : []).map((x) => x as Record<string, string>)
    .map((x) => ({ p: byId.get(clip(x.passage, 20)), extrait: clip(x.extrait, 400) })).filter((x) => x.p && inPassage(x.extrait, x.p!));
  const used = new Map<string, { id: string; titre: string; url?: string; licence: string; extrait: string }>();
  verified.forEach(({ p, extrait }) => { if (!used.has(p!.id)) used.set(p!.id, { id: p!.id, titre: p!.titre, ...(p!.url ? { url: p!.url } : {}), licence: p!.licence || "non précisée", extrait }); });
  if (!used.size) throw new LearnError(422, "aucun extrait vérifiable dans les passages : fiche refusée");
  const srcIds = [...used.keys()];
  const expSrc = (Array.isArray(out.sources_explication) ? out.sources_explication : []).map((x) => clip(x, 20)).filter((id) => used.has(id));
  const explSources = expSrc.length ? expSrc : srcIds.slice(0, 2);
  let n = 0;
  const reps = (Array.isArray(out.representations) ? out.representations : []).slice(0, 6).map((r, i) => {
    const x = r as Record<string, string>;
    return { id: `r${i + 1}`, type: x.type, texte: clip(x.texte, 900), ...(x.type === "analogie" ? { limite: clip(x.limite, 300) } : {}) };
  });
  const confs = (Array.isArray(out.confusions) ? out.confusions : []).slice(0, 3) as Record<string, unknown>[];
  const item = (raw: unknown, evalueDefault?: string) => {
    const x = (raw || {}) as Record<string, unknown>;
    const type = ["choix", "courte", "ordre"].includes(String(x.type)) ? String(x.type) : "choix";
    const it: Record<string, unknown> = { id: `q${++n}`, evalue: String(x.evalue || evalueDefault || "compréhension"), q: clip(x.q, 400) };
    if (type !== "choix") it.type = type;
    if (type === "choix") it.choix = (Array.isArray(x.choix) ? x.choix : []).slice(0, 4).map((c) => { const y = c as Record<string, unknown>; const ci = Number(y.confusion); return { texte: clip(y.texte, 240), ...(y.juste ? { juste: true } : {}), ...(!y.juste && ci >= 0 && ci < confs.length ? { confusion: `c${ci + 1}` } : {}) }; });
    if (type === "courte") it.attendus = (Array.isArray(x.attendus) ? x.attendus : []).map((a) => clip(a, 80)).filter(Boolean).slice(0, 5);
    if (type === "ordre") it.etapes = (Array.isArray(x.etapes) ? x.etapes : []).map((a) => clip(a, 160)).filter(Boolean).slice(0, 8);
    return it;
  };
  const list = (k: string) => (Array.isArray(out[k]) ? (out[k] as unknown[]) : []).slice(0, 8).map((x) => item(x));
  return {
    format: "fiche-v2",
    meta: { id: `gen-${slug(notion)}`, notion, version: 1, langue: "fr", statut: "brouillon", origine: "serveur", domaine: clip(b.sujet, 160) || notion,
      niveau: String(b.niveau || "debutant"), intention: String(b.intention || "comprendre") },
    validation: null,
    sources: [...used.values()],
    prerequis: [],
    situation: { texte: clip(out.situation, 900), question_ouverture: clip(out.question_ouverture, 300) },
    explication: { simple: { texte: clip(out.explication_simple, 1600), ancre_situation: clip(out.ancre_simple, 200), sources: explSources },
      standard: { texte: clip(out.explication_standard, 2400), ancre_situation: clip(out.ancre_standard, 200), sources: explSources } },
    idee_centrale: clip(out.idee_centrale, 300),
    elements_cles: (Array.isArray(out.elements_cles) ? out.elements_cles : []).map((e) => clip(e, 300)).slice(0, 2),
    representations: reps,
    confusions: confs.map((c, i) => { const r = Number(c.remede); return { id: `c${i + 1}`, libelle: clip(c.libelle, 120), description: clip(c.description, 400), remede: reps[r] ? reps[r].id : (reps[0] || { id: "" }).id, controle: item(c.controle, "compréhension") }; }),
    questions: { comprehension: list("comprehension"), comprehension_reserve: list("comprehension_reserve"), application: list("application"), application_reserve: list("application_reserve"),
      transfert: list("transfert"), transfert_reserve: list("transfert_reserve"), rappel: list("rappel") },
    glossaire: (Array.isArray(out.glossaire) ? out.glossaire : []).slice(0, 10).map((g) => { const x = g as Record<string, string>; return { terme: clip(x.terme, 80), explication: clip(x.explication, 300) }; }),
  };
}

/* ---------- Juger une explication libre ---------- */
const JUGE_SCHEMA = { type: "object", additionalProperties: false, required: ["outcome", "confusion", "retour", "criteres"],
  properties: { outcome: { type: "string", enum: ["juste", "partiel", "faux"] }, confusion: S, retour: S, criteres: { type: "array", items: { type: "boolean" } } } };

/* ---------- Compagnon ---------- */
const COMP_SCHEMA = { type: "object", additionalProperties: false, required: ["repond", "reponse", "citations", "absent", "exercice", "attendu", "approfondir"],
  properties: { repond: { type: "boolean" }, reponse: S, citations: { type: "array", items: { type: "object", additionalProperties: false, required: ["passage", "extrait"], properties: { passage: S, extrait: S } } },
    absent: S, exercice: S, attendu: S, approfondir: SA } };

export async function learnTask(task: LearnTask, b: Record<string, unknown>, ctx: LearnCtx) {
  if (task === "fiche_rediger") {
    const ps = passagesOf(b);
    if (clip(b.notion, 160).length < 2) throw new LearnError(400, "notion absente");
    const out = await ask(ctx, fichePrompt(b, ps));
    return { fiche: assembleFiche(out, b, ps) };
  }
  if (task === "fiche_juger") {
    const it = (b.item || {}) as Record<string, unknown>;
    const grille = (Array.isArray(it.grille) ? it.grille : []).map((g) => clip(g, 200)).filter(Boolean).slice(0, 6);
    const reponse = clip(b.reponse, 1500);
    if (!grille.length || !reponse) throw new LearnError(400, "grille ou réponse absente");
    const confs = (Array.isArray(b.confusions) ? b.confusions : []).slice(0, 3).map((c) => c as Record<string, string>).map((c) => ({ id: clip(c.id, 10), libelle: clip(c.libelle, 120) }));
    const out = await ask(ctx, { effort: "low", maxTokens: 1200, schema: JUGE_SCHEMA as unknown as Record<string, unknown>,
      system: `Tu évalues l'explication d'un apprenant, avec bienveillance et précision, UNIQUEMENT sur la grille donnée et la réponse de référence. "juste" si tous les critères sont remplis, "partiel" si une partie, "faux" sinon. "criteres" : un booléen par critère, dans l'ordre. "confusion" : l'identifiant d'UNE confusion de la liste si l'erreur y correspond clairement, sinon "". "retour" : deux phrases au plus, ce qui est juste puis ce qui manque.`,
      user: `Question : ${clip(it.q, 400)}\nGrille :\n${grille.map((g, i) => `${i + 1}. ${g}`).join("\n")}\nRéférence : ${clip(it.reference, 800)}\nConfusions connues : ${confs.map((c) => `${c.id} = ${c.libelle}`).join(" ; ") || "aucune"}\n\nExplication de l'apprenant :\n${reponse}` });
    const outcome = ["juste", "partiel", "faux"].includes(String(out.outcome)) ? String(out.outcome) : "faux";
    const confusion = confs.some((c) => c.id === out.confusion) ? String(out.confusion) : null; // liste fermée
    return { jugement: { outcome, confusion, retour: clip(out.retour, 400), criteres: (Array.isArray(out.criteres) ? out.criteres : []).slice(0, grille.length).map(Boolean) } };
  }
  // compagnon
  const question = clip(b.question, 600);
  if (question.length < 3) throw new LearnError(400, "question absente");
  const ps = (Array.isArray(b.passages) && b.passages.length) ? passagesOf(b) : [];
  const ctxt = clip(b.contexte, 600);
  const out = await ask(ctx, { effort: "medium", maxTokens: 2200, schema: COMP_SCHEMA as unknown as Record<string, unknown>,
    system: `Tu es le Compagnon Arbor, assistant pédagogique. Tu réponds UNIQUEMENT à partir des passages [p…] des cours et documents de l'apprenant.
- Si les passages permettent de répondre : "repond" = true, une explication claire et adaptée (en partant d'un exemple concret si c'est utile), et 1 à 3 "citations" COPIÉES MOT POUR MOT des passages avec leur identifiant.
- Sinon : "repond" = false, "reponse" = "", et "absent" dit précisément ce qui manque dans ses sources. N'invente rien, ne réponds pas de mémoire.
- "exercice" : une question courte pour mettre en pratique, et "attendu" sa réponse, seulement si les passages le permettent (sinon "").
- "approfondir" : 0 à 3 pistes (notions voisines à étudier), sans inventer de référence. Écris en français.${ctxt ? `\nContexte de l'apprenant : ${ctxt}` : ""}`,
    user: `Question : ${question}\n\nPassages :\n${ps.length ? pBlock(ps) : "(aucun passage)"}` });
  const byId = new Map(ps.map((p) => [p.id, p]));
  const citations = (Array.isArray(out.citations) ? out.citations : []).map((x) => x as Record<string, string>)
    .map((x) => ({ passage: clip(x.passage, 20), extrait: clip(x.extrait, 400) })).filter((x) => byId.get(x.passage) && inPassage(x.extrait, byId.get(x.passage)!)).slice(0, 3);
  // une réponse sans aucune citation vérifiable n'est pas une réponse sourcée : on dit qu'elle manque
  const repond = !!out.repond && citations.length > 0;
  return { repond, reponse: repond ? clip(out.reponse, 2000) : "", citations, absent: repond ? clip(out.absent, 400) : (clip(out.absent, 400) || "Tes sources ne permettent pas de répondre à cette question."),
    exercice: repond ? clip(out.exercice, 400) : "", attendu: repond ? clip(out.attendu, 300) : "", approfondir: (Array.isArray(out.approfondir) ? out.approfondir : []).map((x) => clip(x, 120)).filter(Boolean).slice(0, 3) };
}
