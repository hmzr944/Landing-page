/* Banc d'essai de l'extraction (mission 2), étape 2 : un passage complet avec le VRAI modèle, par le VRAI code serveur.
   - Extraction : handle() de supabase/functions/tutor/handler.ts, tâche « extraire », pour chaque lot de passages enregistré
     par tests/bench/passages.js (lecture du navigateur). Le serveur relit le PDF (pdfPages), vérifie les passages, appelle
     le modèle, puis filtre (cleanGen).
   - Comparaison : compareVersions() de engines.ts entre v1 et v2 de R1 et H1. Connaissances validées de la v1 = chaque
     consigne de la v1 (texte exact du corrigé), pour mesurer la comparaison seule, indépendamment de l'extraction.
   Seuls la base et le stockage sont simulés en mémoire. Aucune clé n'est lue ni écrite : la clé Groq est ajoutée par le
   proxy de l'environnement (variable AI_API_KEY = « proxy-injected »). Les en-têtes de limite de débit sont relevés.
   Lancer depuis la racine :  AI_API_KEY=proxy-injected deno run -A tests/bench/run.ts 1   (1, 2 ou 3 : numéro du passage)
   BENCH_CAMPAGNE=mission-2b : écrit dans docs/benchmark/runs-2b (la campagne de la mission 2 reste la référence « avant »). */
import { handle, type Deps } from "../../supabase/functions/tutor/handler.ts";
import { makeCallModel } from "../../supabase/functions/tutor/model.ts";
import { compareVersions, type EnginesDb } from "../../supabase/functions/tutor/engines.ts";
import { pdfPages, sha256Hex } from "../../supabase/functions/tutor/pdftext.ts";
import { scoreComparison, scoreExtraction, summarize } from "./score.mjs";

const ROOT = new URL("../../", import.meta.url);
const n = Number(Deno.args[0] || "1");
const corpus = JSON.parse(await Deno.readTextFile(new URL("docs/corpus-metier/corpus.json", ROOT)));
const passages = JSON.parse(await Deno.readTextFile(new URL("docs/benchmark/passages.json", ROOT)));
// deno-lint-ignore no-explicit-any
const load = async (f: string) => { const m = { exports: {} as Record<string, any> }; new Function("module", await Deno.readTextFile(new URL(f, ROOT)))(m); return m.exports.DOCS as any[]; };
const DOCS = await load("docs/corpus-metier/contenu.js");
// Contrôle hors corpus (mission 2c) : mesuré à part, jamais compté dans les seuils
const HORS = JSON.parse(await Deno.readTextFile(new URL("docs/corpus-metier/hors-corpus/corpus.json", ROOT)));
const HORS_DOCS = [...await load("docs/corpus-metier/hors-corpus/contenu.js"), ...await load("docs/corpus-metier/hors-corpus/contenu-p2.js")];

// Configuration identique à la production (index.ts) : modèle principal, puis modèle de secours
const MODELS = [Deno.env.get("AI_MODEL") || "openai/gpt-oss-120b", Deno.env.get("AI_FALLBACK_MODEL") || "openai/gpt-oss-20b"];
const rate: Record<string, unknown>[] = [];
const raws: { mode: string; model: string; text: string }[] = [];
let rateWaits = 0;
// Limite de débit (429) : on attend le délai donné par Groq puis on réessaie LE MÊME modèle, pour mesurer la qualité et non
// le débit. Sans cette attente, le code de production bascule sur le modèle de secours (voir runs/preuve-limite-debit.json).
const loggedFetch: typeof fetch = async (input, init) => {
  let res = await fetch(input, init);
  for (let i = 0; res.status === 429 && i < 8; i++) {
    rate.push({ at: new Date().toISOString(), status: 429, model: JSON.parse(String(init?.body || "{}")).model, retry_after: res.headers.get("retry-after") });
    rateWaits++;
    await new Promise((r) => setTimeout(r, (Number(res.headers.get("retry-after")) || 20) * 1000 + 1000));
    res = await fetch(input, init);
  }
  const h = res.headers;
  rate.push({ at: new Date().toISOString(), status: res.status, model: JSON.parse(String(init?.body || "{}")).model,
    remaining_requests: h.get("x-ratelimit-remaining-requests"), limit_requests: h.get("x-ratelimit-limit-requests"),
    remaining_tokens: h.get("x-ratelimit-remaining-tokens"), limit_tokens: h.get("x-ratelimit-limit-tokens"), retry_after: h.get("retry-after") });
  return res;
};
const baseCall = makeCallModel({ baseUrl: "https://api.groq.com/openai/v1", apiKey: Deno.env.get("AI_API_KEY") || "proxy-injected", models: MODELS, fetch: loggedFetch });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let busyWaits = 0;
// Saturation (429 sur tous les modèles) : on attend et on réessaie, et on le note dans le rapport
const callModel: Deps["callModel"] = async (p) => {
  for (let i = 0; ; i++) {
    try { const r = await baseCall(p); raws.push({ mode: "?", model: r.model, text: r.text }); return r; }
    catch (e) { if ((e as Error).name !== "Busy" || i >= 6) throw e; busyWaits++; await sleep(30000); }
  }
};

const docText = new Map<string, { pages: string[]; sha256: string }>();
const stored = async (fichier: string) => {
  if (!docText.has(fichier)) { const bytes = await Deno.readFile(new URL(`docs/corpus-metier/${fichier}`, ROOT)); docText.set(fichier, { pages: await pdfPages(bytes), sha256: await sha256Hex(bytes) }); }
  return docText.get(fichier)!;
};
const ORG = crypto.randomUUID();

/* ---------- 1. Extraction ---------- */
// deno-lint-ignore no-explicit-any
async function extractAll(documents: any[], prefix = "") {
const extraction = [];
for (const d0 of documents) {
  const d = { ...d0, fichier: prefix + d0.fichier };
  const versionId = crypto.randomUUID();
  const deps = {
    getUser: async () => ({ id: "banc-essai" }),
    usedThisMonth: async () => 0,
    record: async () => {},
    callModel,
    limit: 1000, genLimit: 1000, origins: ["http://localhost"],
    db: { role: async () => "admin" },
    docVersion: async (id: string) => (id === versionId ? { id, org_id: ORG, storage_path: d.fichier, checksum: null } : null),
    docFile: (p: string) => stored(p),
    markIntegrity: async () => {},
  } as unknown as Deps;
  const lots = passages.documents.find((x: { id: string }) => x.id === d.id).batches;
  const calls = [];
  for (const lot of lots) {
    const before = raws.length;
    const req = new Request("http://localhost/tutor", { method: "POST", headers: { authorization: "Bearer banc", origin: "http://localhost" },
      body: JSON.stringify({ task: "extraire", title: d.titre, passages: lot, org: ORG, version: versionId }) });
    const res = await handle(req, deps);
    const body = await res.json();
    const raw = raws.slice(before).map((r) => ({ ...r, mode: "extraire" }));
    let proposed: Record<string, unknown>[] = [];
    try { const last = raw[raw.length - 1]; proposed = last ? (JSON.parse(last.text).items || []) : []; } catch { proposed = []; }
    calls.push({ status: res.status, reponse: body, brut: raw, proposees: proposed });
  }
  const items = calls.flatMap((c) => (c.reponse.items || []));
  const proposees = calls.flatMap((c) => c.proposees);
  const text = (await stored(d.fichier)).pages.join("\n");
  const score = scoreExtraction(d.regles_attendues, items, proposees, text);
  extraction.push({ id: d.id, appels: calls, score });
  console.log(`extraction ${d.id} : ${score.per.filter((p: { found: boolean }) => p.found).length}/${score.per.length} règles, ${items.length} gardées / ${proposees.length} proposées`);
}
return extraction;
}

/* ---------- 2. Comparaison de versions ---------- */
// deno-lint-ignore no-explicit-any
async function compareAll(documents: any[], sources: any[], prefix = "", regles2c = false) {
const comparaison = [];
for (const v2 of documents.filter((d: { changements?: unknown }) => d.changements)) {
  const v1doc = sources.find((x) => x.id === v2.remplace);
  // deno-lint-ignore no-explicit-any
  const knowledge: any[] = v1doc.sections.flatMap((s: Record<string, unknown[]>) => (s.ol || s.ul || s.p) as unknown[])
    .map((x: unknown, i: number) => {
      const it = typeof x === "string" ? { t: x } : x as { t: string; r?: { id: string; sensible?: boolean } };
      return { id: crypto.randomUUID(), idx: i, texte: it.t, regle: it.r?.id || null, kind: it.r?.sensible ? "sensible" : "regle",
        title: it.t.split(" ").slice(0, 6).join(" "), body: it.t, quote: it.t, page: 1, status: "valide" };
    });
  const from = { id: crypto.randomUUID(), org_id: ORG, source_id: "src-" + v2.procedure, version: 1, storage_path: prefix + v1doc.id + ".pdf", checksum: null };
  const to = { id: crypto.randomUUID(), org_id: ORG, source_id: "src-" + v2.procedure, version: 2, storage_path: prefix + v2.fichier, checksum: null };
  const changes: Record<string, unknown>[] = [];
  const db = {
    versionInfo: async (id: string) => (id === to.id ? to : null),
    versionByNumber: async (_s: string, num: number) => (num === 1 ? from : null),
    knowledgeOfVersion: async () => knowledge,
    docFile: (p: string) => stored(p),
    markIntegrity: async () => {},
    audit: async () => {},
    insertPolicyChange: async () => "chg-" + v2.procedure,
    insertChangeItems: async (rows: Record<string, unknown>[]) => { changes.push(...rows); },
    createScenario: async () => "",
  } as unknown as EnginesDb;
  const before = raws.length;
  // deno-lint-ignore no-explicit-any
  const ctx = { userId: "banc-essai", db: db as any, callModel, onModel: async () => {} };
  let result: unknown = null, erreur: string | null = null;
  try { result = await compareVersions(ctx, db, ORG, "admin", { version: to.id }); } catch (e) { erreur = String((e as Error).message || e); }
  const score = scoreComparison(knowledge, changes, v2, v2.regles_attendues, { regles2c });
  comparaison.push({ id: v2.id, resultat: result, erreur, brut: raws.slice(before).map((r) => ({ ...r, mode: "comparer" })),
    connaissances_v1: knowledge.map((k: { id: string; texte: string; regle: string | null }) => ({ id: k.id, texte: k.texte, regle: k.regle })), elements: changes, score });
  console.log(`comparaison ${v2.id} : ${score.detections.filter((x: { detecte: boolean }) => x.detecte).length}/${score.detections.length} changements, ${score.traps.filter((t: { fausse_alerte: boolean }) => t.fausse_alerte).length} fausse(s) alerte(s) sur pièges, ${score.nouveautes_non_fondees} nouveauté(s) non fondée(s)${erreur ? " ; ERREUR " + erreur : ""}`);
}
return comparaison;
}

const CAMPAGNE = Deno.env.get("BENCH_CAMPAGNE") || "mission-2";
const R2C = CAMPAGNE === "mission-2c";
const extraction = await extractAll(corpus.documents);
const comparaison = await compareAll(corpus.documents, DOCS, "", R2C);
// Contrôle hors corpus : seulement à partir de la mission 2c
const hors_corpus = R2C ? { extraction: await extractAll(HORS.documents, "hors-corpus/"), comparaison: await compareAll(HORS.documents, HORS_DOCS, "hors-corpus/", true) } : undefined;

const run = { passage: n, date: new Date().toISOString(), modeles_configures: MODELS, modeles_utilises: [...new Set(raws.map((r) => r.model))],
  attentes_limite_debit: rateWaits, attentes_saturation: busyWaits, limites_debit: rate, extraction, comparaison, ...(hors_corpus ? { hors_corpus } : {}) };
const synthese = summarize(run);
// Campagne : BENCH_CAMPAGNE=mission-2 (runs), mission-2b (runs-2b) ou mission-2c (runs-2c), pour comparer avant et après
const OUT = { "mission-2b": "docs/benchmark/runs-2b", "mission-2c": "docs/benchmark/runs-2c" }[CAMPAGNE] || "docs/benchmark/runs";
await Deno.mkdir(new URL(OUT + "/", ROOT), { recursive: true });
await Deno.writeTextFile(new URL(`${OUT}/passage-${n}.json`, ROOT), JSON.stringify({ ...run, synthese }, null, 2) + "\n");
console.log(JSON.stringify(synthese, null, 1));
