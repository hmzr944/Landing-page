// Génération de contenu de cours côté serveur (remplace l'appel direct à l'API depuis le navigateur).
// Trois tâches, toutes ancrées sur un texte fourni par le client (extrait du PDF, passages Wikipédia/Wikilivres) :
//   - "enrichir"        : points clés et questions pour une partie d'un PDF (le texte du prof reste intact)
//   - "rediger_cours"   : un petit cours (vue d'ensemble + notions) à partir d'un sujet et d'un texte de référence
//   - "rediger_notion"  : une notion à partir de passages numérotés (méthode inspirée de STORM)
// Garde-fou : le modèle reformule, donc on ne peut pas exiger des citations mot pour mot. On mesure à la place
// la part des mots porteurs de sens qui figurent dans le texte source ; ce qui n'y est pas assez est écarté.

export type GenTask = "enrichir" | "rediger_cours" | "rediger_notion";
export const GEN_TASKS: GenTask[] = ["enrichir", "rediger_cours", "rediger_notion"];
export interface GenRequest {
  task: GenTask;
  title: string; // partie, sujet ou notion
  context: string; // cours ou module (facultatif)
  text: string; // texte source (extrait, référence ou passages)
  sourceTitle: string;
}

const gclip = (s: unknown, n: number) => String(s ?? "").slice(0, n);
const LIMITS: Record<GenTask, number> = { enrichir: 3500, rediger_cours: 4500, rediger_notion: 4000 };

export function validateGen(body: unknown): { ok: true; req: GenRequest } | { ok: false; error: string } {
  const b = body as Record<string, unknown>;
  if (!b || typeof b !== "object") return { ok: false, error: "requête vide" };
  if (!GEN_TASKS.includes(b.task as GenTask)) return { ok: false, error: "tâche inconnue" };
  const task = b.task as GenTask;
  const title = gclip(b.title, 200).trim();
  if (!title) return { ok: false, error: "titre manquant" };
  const text = gclip(b.text, LIMITS[task]).trim();
  // enrichir et rédiger une notion n'ont de sens qu'avec un texte ; un cours peut partir d'un sujet seul (mode prudent)
  if (task !== "rediger_cours" && text.length < 80) return { ok: false, error: "texte source trop court" };
  return { ok: true, req: { task, title, context: gclip(b.context, 200).trim(), text, sourceTitle: gclip(b.sourceTitle, 160).trim() } };
}

// Schémas compatibles « strict » : tous les champs requis, aucun champ en plus
const str = { type: "string" };
const qa = { type: "object", additionalProperties: false, required: ["q", "a"], properties: { q: str, a: str } };
const strs = { type: "array", items: str };
const qas = { type: "array", items: qa };
export const GEN_SCHEMAS: Record<GenTask, Record<string, unknown>> = {
  enrichir: { type: "object", additionalProperties: false, required: ["keyPoints", "exercises"], properties: { keyPoints: strs, exercises: qas } },
  rediger_notion: { type: "object", additionalProperties: false, required: ["notes", "keyPoints", "exercises"], properties: { notes: str, keyPoints: strs, exercises: qas } },
  rediger_cours: {
    type: "object", additionalProperties: false, required: ["overview", "notions"],
    properties: {
      overview: str,
      notions: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "notes", "keyPoints", "exercises"], properties: { title: str, notes: str, keyPoints: strs, exercises: qas } } },
    },
  },
};

const NO_MNEMO = "Ne rédige ni image mentale ni moyen mnémotechnique : l'étudiant les produit lui-même, c'est ce qui l'aide à retenir.";
const SYSTEMS: Record<GenTask, string> = {
  enrichir: `Tu aides un étudiant à réviser un extrait de SON cours. N'utilise que ce qui est dans l'extrait, n'ajoute aucun fait.
- "keyPoints" : 2 à 4 phrases courtes, l'essentiel à retenir (définitions, règles, formules), reformulées simplement avec les mots du cours.
- "exercises" : 1 ou 2 questions de compréhension ou d'application, avec la réponse tirée de l'extrait dans "a".
${NO_MNEMO} Écris dans la langue de l'extrait.`,
  rediger_cours: `Tu es un professeur qui rédige un cours clair pour un étudiant français.
On te donne un sujet et, le plus souvent, un texte de référence. Appuie-toi uniquement sur ce texte : n'invente ni chiffre, ni date, ni nom qui n'y figure pas. Sans texte de référence, reste général et ne donne que ce qui est certain.
- "overview" : 2 ou 3 phrases qui disent de quoi parle le sujet et pourquoi il compte.
- "notions" : 3 ou 4 notions, de la plus simple à la plus avancée. Pour chacune : "title" court sans numéro ; "notes" = un vrai paragraphe (5 à 8 phrases simples : définition, fonctionnement, exemple concret), la phrase la plus importante entourée de == ; "keyPoints" = 2 ou 3 phrases à retenir ; "exercises" = 1 ou 2 questions qui font réfléchir, réponse attendue dans "a".
${NO_MNEMO} Écris en français, avec des phrases courtes.`,
  rediger_notion: `Tu es un formateur qui rédige une partie de cours pour un étudiant français débutant.
On te donne une notion, le module dont elle fait partie et des extraits de sources numérotés. N'utilise que ces extraits : n'invente ni chiffre, ni commande, ni nom.
- "notes" : un cours clair en markdown simple (8 à 14 phrases courtes) : à quoi ça sert, comment ça marche, puis un exemple concret. Pour une manipulation, les étapes dans l'ordre en liste "- ". La phrase la plus importante entourée de ==.
- "keyPoints" : 2 à 4 phrases courtes à retenir.
- "exercises" : 1 ou 2 questions qui font réfléchir ou appliquer, réponse attendue dans "a".
${NO_MNEMO} Écris en français.`,
};
const MAX_TOKENS: Record<GenTask, number> = { enrichir: 800, rediger_cours: 2200, rediger_notion: 1500 };

export function genPrompt(r: GenRequest): { system: string; user: string; schema: Record<string, unknown>; maxTokens: number } {
  const ctx = r.context ? `\n${r.task === "rediger_notion" ? "Module" : "Cours"} : « ${r.context} »` : "";
  let user: string;
  if (r.task === "enrichir") user = `Partie : « ${r.title} »${ctx}\nExtrait :\n"""${r.text.replace(/==/g, "")}"""`;
  else if (r.task === "rediger_notion") user = `Notion : « ${r.title} »${ctx}\n\nExtraits :\n${r.text}`;
  else user = `Sujet : « ${r.title} »${ctx}${r.text ? `\n\nTexte de référence${r.sourceTitle ? ` (${r.sourceTitle})` : ""} :\n"""${r.text}"""` : "\n\n(Aucun texte de référence.)"}`;
  return { system: SYSTEMS[r.task], user, schema: GEN_SCHEMAS[r.task], maxTokens: MAX_TOKENS[r.task] };
}

/* Ancrage lexical : part des mots porteurs de sens (5 lettres ou plus, hors mots outils) présents dans la source.
   Une reformulation fidèle garde l'essentiel du vocabulaire ; une invention en apporte du nouveau. */
const gnorm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const STOP = new Set(["comme", "cette", "celui", "celle", "entre", "aussi", "alors", "avoir", "faire", "permet", "permettent", "chaque", "toutes", "votre", "notre", "leurs", "elles", "quand", "parce", "depuis", "pendant", "selon", "ainsi", "encore", "toujours", "plusieurs", "autre", "autres", "exemple", "important", "importante", "notion", "notions", "pourquoi", "comment", "quelle", "quelles", "lequel", "laquelle", "explique", "expliquer", "donne", "donner", "citer", "definition", "principe", "fonctionne", "utilise", "utiliser", "servir", "permettre"]);
const words = (s: string) => (gnorm(s).match(/[a-z0-9]{5,}/g) || []).filter((w) => !STOP.has(w));
export function support(text: string, source: string): number {
  const w = words(text);
  if (!w.length) return 1;
  const src = new Set(words(source));
  // tolère les variations de fin de mot (pluriel, conjugaison) : on compare aussi les 6 premières lettres
  const stems = new Set([...src].map((x) => x.slice(0, 6)));
  return w.filter((x) => src.has(x) || stems.has(x.slice(0, 6))).length / w.length;
}

const KP_MIN = 0.5, ANSWER_MIN = 0.4, NOTES_MIN = 0.35;
const cleanQA = (x: unknown, src: string) => (Array.isArray(x) ? x : [])
  .filter((e) => e && typeof e === "object" && (e as Record<string, unknown>).q && (e as Record<string, unknown>).a)
  .map((e) => ({ q: gclip((e as Record<string, unknown>).q, 400), a: gclip((e as Record<string, unknown>).a, 900) }))
  .filter((e) => !src || support(e.a, src) >= ANSWER_MIN)
  .slice(0, 2);
const cleanKP = (x: unknown, src: string) => (Array.isArray(x) ? x : []).map((k) => gclip(k, 300).trim())
  .filter((k) => k.length > 8 && (!src || support(k, src) >= KP_MIN)).slice(0, 4);

/* Nettoie et vérifie la sortie du modèle. Renvoie aussi ce qui a été écarté, pour le dire honnêtement à l'étudiant. */
export function cleanGen(r: GenRequest, out: Record<string, unknown>) {
  const src = r.text;
  let dropped = 0;
  const count = <T>(before: unknown, after: T[]) => { dropped += Math.max(0, (Array.isArray(before) ? before.length : 0) - after.length); return after; };
  if (r.task === "enrichir") {
    return { keyPoints: count(out.keyPoints, cleanKP(out.keyPoints, src)), exercises: count(out.exercises, cleanQA(out.exercises, src)), dropped };
  }
  if (r.task === "rediger_notion") {
    const notes = gclip(out.notes, 6000);
    if (notes.length < 80 || support(notes, src) < NOTES_MIN) return { notes: "", keyPoints: [], exercises: [], dropped: 1, ungrounded: true };
    return { notes, keyPoints: count(out.keyPoints, cleanKP(out.keyPoints, src)), exercises: count(out.exercises, cleanQA(out.exercises, src)), dropped };
  }
  const notions = (Array.isArray(out.notions) ? out.notions : []).slice(0, 5).map((n) => n as Record<string, unknown>)
    .filter((n) => n && n.title && n.notes)
    .filter((n) => { const ok = !src || support(String(n.notes), src) >= NOTES_MIN; if (!ok) dropped++; return ok; })
    .map((n) => ({ title: gclip(n.title, 160), notes: gclip(n.notes, 5000), keyPoints: cleanKP(n.keyPoints, src), exercises: cleanQA(n.exercises, src) }));
  return { overview: gclip(out.overview, 800), notions, dropped, grounded: !!src };
}
