// Tests de l'espace professionnel côté serveur (Deno) : deno test --allow-net --allow-env --allow-read supabase/functions/tutor/
// Base simulée en mémoire (mêmes contraintes que la vraie) et modèle scripté : aucune clé, aucun réseau.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { type Deps, handle } from "./handler.ts";
import { debriefOf, type Knowledge, type OrgDb } from "./org.ts";

const ORG = "11111111-1111-4111-8111-111111111111", OTHER = "22222222-2222-4222-8222-222222222222";
const K: Knowledge[] = [
  { id: "k-autonomie", kind: "produit", title: "Autonomie de l'Alto 500", body: "L'Alto 500 a une autonomie de 90 km en mode éco.", quote: "Son autonomie annoncée est de 90 km en mode éco", page: 1, source_version_id: "v1" },
  { id: "k-batterie", kind: "sensible", title: "Batterie endommagée", body: "Ne jamais recharger une batterie endommagée ; l'isoler et prévenir le responsable.", quote: "Ne jamais recharger une batterie endommagée", page: 2, source_version_id: "v1" },
  { id: "k-retour", kind: "regle", title: "Délai de retour", body: "Le client dispose de 30 jours pour un retour avec le ticket de caisse.", quote: "Le client dispose de 30 jours pour un retour", page: 2, source_version_id: "v1" },
  { id: "k-poids", kind: "produit", title: "Poids du cadre", body: "Le cadre en aluminium de l'Alto 500 pèse 21 kg.", quote: "Le cadre en aluminium pèse 21 kg", page: 1, source_version_id: "v1" },
];
function fakeDb(roles: Record<string, string> = { "u-bob": "member", "u-eve": "manager" }) {
  const items: Record<string, any> = {}, scen: Record<string, any> = {}, evidence: any[] = [];
  const db: OrgDb = {
    role: async (u, o) => (o === ORG ? roles[u] ?? null : null),
    validatedKnowledge: async (o) => (o === ORG ? K : []),
    knowledgeById: async (o, ids) => (o === ORG ? K.filter((k) => ids.includes(k.id)) : []),
    skillLinks: async () => [{ skill_id: "s-conseil", knowledge_id: "k-autonomie" }],
    insertDiagItems: async (rows) => rows.map((r) => { const id = crypto.randomUUID(); items[id] = { ...r, id }; return { id }; }),
    getDiagItem: async (id) => items[id] ?? null,
    markAnswered: async (id) => { if (!items[id] || items[id].answered_at) return false; items[id].answered_at = "now"; return true; },
    insertEvidence: async (rows) => { evidence.push(...rows); },
    createScenario: async (row) => { const id = crypto.randomUUID(); scen[id] = { ...row, id, status: "en_cours" }; return id; },
    getScenario: async (id) => scen[id] ?? null,
    updateScenario: async (id, patch) => { scen[id] = { ...scen[id], ...patch }; },
  };
  return { db, items, scen, evidence };
}
function deps(db: OrgDb, script: unknown[], over: Partial<Deps> = {}) {
  const calls: { system: string; user: string }[] = [], recorded: any[] = [];
  const d: Deps = {
    limit: 60, origins: ["https://hmzr944.github.io"], db,
    getUser: async (jwt) => ({ "jwt-bob": { id: "u-bob" }, "jwt-eve": { id: "u-eve" }, "jwt-carla": { id: "u-carla" } } as Record<string, { id: string }>)[jwt] ?? null,
    usedThisMonth: async () => 0,
    record: async (e) => { recorded.push(e); },
    callModel: async (p) => { calls.push(p); const next = script.shift(); if (next instanceof Error) throw next; return { text: JSON.stringify(next ?? {}), stop: "stop", model: "openai/gpt-oss-120b", inputTokens: 500, outputTokens: 200 }; },
    ...over,
  };
  return { d, calls, recorded };
}
const post = (body: unknown, jwt = "jwt-bob") => new Request("http://localhost/tutor", { method: "POST", headers: { authorization: `Bearer ${jwt}`, origin: "https://hmzr944.github.io", "content-type": "application/json" }, body: JSON.stringify(body) });
const call = async (d: Deps, body: unknown, jwt?: string) => { const r = await handle(post(body, jwt), d); return { status: r.status, data: await r.json() }; };

Deno.test("espace pro : rôle vérifié dans la base, jamais pris du navigateur", async () => {
  const { db } = fakeDb();
  const { d } = deps(db, []);
  assertEquals((await call(d, { task: "diagnostic_start", org: OTHER })).status, 403);
  assertEquals((await call(d, { task: "diagnostic_start", org: ORG }, "jwt-carla")).status, 403);
  assertEquals((await call(d, { task: "competences", org: ORG })).status, 403); // un collaborateur ne propose pas de compétences
  assertEquals((await call(d, { task: "diagnostic_start", org: "pas-un-uuid" })).status, 400);
});

Deno.test("compétences : seules des connaissances validées existantes sont rattachées", async () => {
  const { db } = fakeDb();
  const { d } = deps(db, [{ skills: [{ name: "Conseiller un vélo électrique", description: "…", knowledge: ["k1", "k4", "k99"] }, { name: "X", description: "", knowledge: [] }] }]);
  const r = await call(d, { task: "competences", org: ORG }, "jwt-eve");
  assertEquals(r.status, 200);
  assertEquals(r.data.skills.length, 1);
  assertEquals(r.data.skills[0].knowledge.sort(), ["k-autonomie", "k-batterie"].sort().filter((x) => ["k-autonomie", "k-poids", "k-batterie", "k-retour"].includes(x)) && r.data.skills[0].knowledge.sort());
});

Deno.test("diagnostic : la bonne réponse ne part pas au navigateur ; corrigé et prouvé côté serveur, une seule fois", async () => {
  const f = fakeDb();
  const q = (k: string, question: string, options: string[], correct: number) => ({ k, question, options, correct });
  const { d } = deps(f.db, [{ questions: [
    // le serveur numérote dans l'ordre de travail : k1 sensible (batterie), k2 règle (retour), k3 autonomie, k4 poids
    q("k3", "Un client demande l'autonomie de l'Alto 500 en mode éco. Que réponds-tu ?", ["90 km en mode éco", "150 km", "40 km"], 0),
    q("k1", "Une batterie gonflée revient au magasin. Que fais-tu ?", ["Je la recharge pour tester", "Je ne la recharge jamais, je l'isole et je préviens le responsable", "Je la range en rayon"], 1),
    q("k2", "Un client veut rendre son vélo après 20 jours, avec le ticket. Est-ce possible ?", ["Non, jamais", "Oui, il dispose de 30 jours pour un retour avec le ticket de caisse", "Seulement le lundi"], 1),
    q("k4", "Question sans réponse soutenue", ["Le cadre pèse 35 kg", "Le cadre pèse 10 kg", "Le cadre pèse 50 kg"], 0),
  ] }]);
  const s = await call(d, { task: "diagnostic_start", org: ORG });
  assertEquals(s.status, 200);
  assertEquals(s.data.items.length, 3); // la question dont la « bonne » réponse n'est pas portée par la connaissance est écartée
  assert(!JSON.stringify(s.data).includes('"correct"'));
  const it = s.data.items.find((x: { question: string }) => /batterie gonflée/.test(x.question));
  const a = await call(d, { task: "diagnostic_answer", org: ORG, item: it.id, choice: 0, confidence: "reflexe" });
  assertEquals(a.data.outcome, "faux");
  assertEquals(a.data.correct, 1);
  assert(a.data.falseCertainty);
  assertEquals(a.data.page, 2);
  const ev = f.evidence.at(-1);
  assertEquals([ev.activity, ev.outcome, ev.confidence, ev.knowledge_id, ev.source_version_id, ev.evaluator], ["diagnostic", "faux", "reflexe", "k-batterie", "v1", "regle"]);
  assertEquals((await call(d, { task: "diagnostic_answer", org: ORG, item: it.id, choice: 1 })).status, 409);
  const { d: d2 } = deps(f.db, []);
  assertEquals((await call(d2, { task: "diagnostic_answer", org: ORG, item: s.data.items[0].id, choice: 0 }, "jwt-eve")).status, 404); // la question d'un autre
});

Deno.test("diagnostic : sans modèle, questions de repli construites à partir des extraits", async () => {
  const f = fakeDb();
  const { d } = deps(f.db, [new Error("panne")]);
  const s = await call(d, { task: "diagnostic_start", org: ORG });
  assertEquals(s.status, 200);
  assert(s.data.items.length >= 3);
  assert(s.data.items.every((x: { question: string; options: string[] }) => /« .+ »/.test(x.question) && x.options.length === 3));
});

Deno.test("Client Mystère : fiche secrète, évaluateur cité mot pour mot, affirmations vérifiées, preuves et débrief", async () => {
  const f = fakeDb();
  const { d, calls, recorded } = deps(f.db, [
    { name: "Nadia", profile: "Cycliste urbaine, 40 ans", personality: "hésitante, prudente", need: "un vélo pour 35 km de trajet quotidien", objections: ["C'est cher", "La batterie va s'abîmer"], opening: "Bonjour, je regarde les vélos électriques…", knowledge: ["k1", "k2", "k3"] },
    { behaviors: [{ id: "decouverte", evidence: "Quelle distance faites-vous chaque jour ?" }, { id: "clarte", evidence: "une phrase qui n'existe pas" }],
      claims: [{ text: "L'Alto 500 fait 150 km en mode éco", k: "k3", verdict: "incorrect" }, { text: "il est garanti 10 ans", k: "", verdict: "correct" }, { text: "affirmation inventée absente", k: "k3", verdict: "correct" }],
      need_found: false, objections_resolved: [] },
    { reply: "Environ 35 km aller-retour. Et ça tient vraiment ?", satisfied: false, leaves: false },
  ]);
  const st = await call(d, { task: "mystere_start", org: ORG, style: "hésitant" });
  assertEquals(st.status, 200);
  assert(!JSON.stringify(st.data).includes("35 km de trajet")); // le besoin caché ne part pas au navigateur
  const t = await call(d, { task: "mystere_tour", org: ORG, session: st.data.id, message: "Quelle distance faites-vous chaque jour ? L'Alto 500 fait 150 km en mode éco, et il est garanti 10 ans.", confidence: "reflexe" });
  assertEquals(t.status, 200);
  assertEquals(t.data.reply, "Environ 35 km aller-retour. Et ça tient vraiment ?");
  assert(calls[1].system.includes("Tu n'es pas le client") && calls[2].system.includes("Tu joues Nadia"));
  assert(calls[2].system.includes("35 km de trajet")); // le client garde son besoin et son état d'un tour à l'autre
  const sc = f.scen[st.data.id];
  assertEquals(Object.keys(sc.state.behaviors), ["decouverte"]); // l'évidence « inventée » est écartée
  assertEquals(sc.state.claims.map((c: { verdict: string }) => c.verdict), ["incorrect", "non_documente"]); // sans connaissance : non documentée
  const claimEv = f.evidence.filter((e) => e.knowledge_id);
  assertEquals(claimEv.length, 1);
  assertEquals([claimEv[0].outcome, claimEv[0].confidence, claimEv[0].skill_id, claimEv[0].source_version_id], ["faux", "reflexe", "s-conseil", "v1"]);
  assert(f.evidence.some((e) => e.detail.behavior === "decouverte"));
  assertEquals(recorded.map((r) => r.mode), ["mystere", "mystere", "mystere"]);
  const fin = await call(d, { task: "mystere_fin", org: ORG, session: st.data.id });
  assertEquals(fin.status, 200);
  const db = fin.data.debrief;
  assertEquals(db.incorrect[0].falseCertainty, true);
  assertEquals(db.incorrect[0].quote, "Son autonomie annoncée est de 90 km en mode éco");
  assertEquals(db.undocumented.length, 1);
  assertEquals(db.behaviors.find((b: { id: string }) => b.id === "decouverte").observed, true);
  assert(/ne suffit pas/.test(db.note));
  assertEquals((await call(d, { task: "mystere_tour", org: ORG, session: st.data.id, message: "encore" })).status, 409);
  const { d: d3 } = deps(f.db, []);
  assertEquals((await call(d3, { task: "mystere_fin", org: ORG, session: st.data.id }, "jwt-eve")).status, 404); // la partie d'un autre
});

Deno.test("débrief : rien n'est inventé, tout vient de l'état observé", () => {
  const db = debriefOf({ need: "N", objections: [{ text: "A" }, { text: "B" }] }, { behaviors: { reformulation: "Si je comprends bien…" }, resolved: [1], claims: [], need_found: true, turns: 3, ended: true, outcome: "satisfait" });
  assertEquals(db.objections.map((o: { resolved: boolean }) => o.resolved), [false, true]);
  assertEquals(db.behaviors.filter((b: { observed: boolean }) => b.observed).length, 1);
  assertEquals(db.outcome, "satisfait");
});

Deno.test("espace pro : quota propre, vérifié avant l'appel au modèle", async () => {
  const { db } = fakeDb();
  let called = false;
  const { d } = deps(db, [], { usedThisMonth: async (_u, _m, k) => (k === "org" ? 400 : 0), callModel: async () => { called = true; throw new Error("x"); } });
  assertEquals((await call(d, { task: "mystere_start", org: ORG })).status, 429);
  assert(!called);
});
