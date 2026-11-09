// Tests de la fonction « tutor » (Deno) :  deno test --allow-net --allow-env supabase/functions/tutor/
// Aucune clé ni aucun réseau réel : un faux serveur local « compatible OpenAI » (comme Groq) reçoit les requêtes.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { buildPrompt, checkCitations, type Deps, handle, validate } from "./handler.ts";
import { support } from "./generate.ts";
import { makeCallModel } from "./model.ts";

const passages = [
  { page: 3, text: "Le masque désigne le nombre de bits constituant l'identifiant de réseau dans l'adresse A.B.C.D." },
  { page: 9, text: "La passerelle est le routeur qui permet de sortir du réseau local vers les autres réseaux." },
];
const body = { mode: "socratique", notion: { title: "Masque de sous-réseau", course: "Protocoles TCP-IP" }, passages, message: "Le masque envoie le paquet au bon réseau." };
const req = (b: unknown, jwt = "jeton-valide", origin = "https://hmzr944.github.io") =>
  new Request("http://localhost/tutor", { method: "POST", headers: { authorization: `Bearer ${jwt}`, origin, "content-type": "application/json" }, body: JSON.stringify(b) });

function fakeDeps(over: Partial<Deps> = {}, modelOut: Record<string, unknown> = {}) {
  const recorded: unknown[] = [];
  const deps: Deps = {
    limit: 3, origins: ["https://hmzr944.github.io"],
    getUser: async (jwt) => (jwt === "jeton-valide" ? { id: "u1" } : null),
    usedThisMonth: async () => 0,
    record: async (e) => { recorded.push(e); },
    callModel: async () => ({
      text: JSON.stringify({ reply: "Le masque ne transporte rien : à quoi sert-il quand on compare deux adresses ?", verdict: "faux", misconception: "confond masque et passerelle", hint_level: 0,
        citations: [{ passage: 1, quote: "nombre de bits constituant l'identifiant de réseau" }, { passage: 2, quote: "phrase inventée qui n'est pas dans le cours" }],
        correct_points: [], missing: ["le masque sépare réseau et machine"], done: false, next_activity: "relire_passage", ...modelOut }),
      stop: "end_turn", model: "openai/gpt-oss-120b", inputTokens: 1000, outputTokens: 200,
    }),
    ...over,
  };
  return { deps, recorded };
}

Deno.test("une confusion est nommée et les citations inventées sont retirées", async () => {
  const { deps, recorded } = fakeDeps();
  const r = await handle(req(body), deps);
  assertEquals(r.status, 200);
  const j = await r.json();
  assertEquals(j.verdict, "faux");
  assertEquals(j.misconception, "confond masque et passerelle");
  assertEquals(j.citations.length, 1);
  assertEquals(j.citations[0].page, 3);
  assertEquals(j.citations_dropped, 1);
  assertEquals(j.usage, { used: 1, limit: 3 });
  // coût : 1000 × 4 $ + 200 × 20 $ par million = 0,008 $
  assertEquals((recorded[0] as { costUsd: number }).costUsd, 0);
});

Deno.test("sans connexion : 401, sans appel au modèle", async () => {
  let called = false;
  const { deps } = fakeDeps({ callModel: async () => { called = true; throw new Error("x"); } });
  const r = await handle(req(body, "faux-jeton"), deps);
  assertEquals(r.status, 401);
  assert(!called);
});

Deno.test("quota atteint : 429 avant tout appel au modèle", async () => {
  let called = false;
  const { deps } = fakeDeps({ usedThisMonth: async () => 3, callModel: async () => { called = true; throw new Error("x"); } });
  const r = await handle(req(body), deps);
  assertEquals(r.status, 429);
  assertEquals((await r.json()).error, "quota");
  assert(!called);
});

Deno.test("sans passage du cours, le tuteur refuse de répondre", async () => {
  const { deps } = fakeDeps();
  const r = await handle(req({ ...body, passages: [] }), deps);
  assertEquals(r.status, 400);
});

Deno.test("refus de sécurité : enregistré, message neutre, pas de contenu", async () => {
  const { deps, recorded } = fakeDeps({ callModel: async () => ({ text: "", stop: "refusal", model: "openai/gpt-oss-120b", inputTokens: 500, outputTokens: 0 }) });
  const j = await (await handle(req(body), deps)).json();
  assert(j.refused);
  assertEquals((recorded[0] as { refused: boolean }).refused, true);
});

Deno.test("modèle injoignable : 502 lisible, rien n'est facturé", async () => {
  const { deps, recorded } = fakeDeps({ callModel: async () => { throw new Error("réseau"); } });
  const r = await handle(req(body), deps);
  assertEquals(r.status, 502);
  assertEquals(recorded.length, 0);
});

Deno.test("CORS : une autre origine ne reçoit pas son origine en retour", async () => {
  const { deps } = fakeDeps();
  const r = await handle(new Request("http://localhost/tutor", { method: "OPTIONS", headers: { origin: "https://exemple.com" } }), deps);
  assertEquals(r.headers.get("access-control-allow-origin"), "https://hmzr944.github.io");
});

Deno.test("validation : tailles bornées, historique limité", () => {
  const v = validate({ ...body, passages: Array.from({ length: 20 }, () => ({ page: 1, text: "x".repeat(5000) })), history: Array.from({ length: 40 }, () => ({ role: "student", text: "y" })) });
  assert(v.ok);
  if (v.ok) { assert(v.req.passages.length <= 8); assert(v.req.passages.reduce((a, p) => a + p.text.length, 0) <= 12000); assertEquals(v.req.history!.length, 12); }
});

Deno.test("le prompt numérote les passages avec leur page", () => {
  const v = validate(body);
  assert(v.ok);
  if (v.ok) { const p = buildPrompt(v.req); assert(p.includes("[P1] (page 3)")); assert(p.includes("Réponse de l'étudiant : Le masque envoie")); }
});

Deno.test("citations : accents et guillemets tolérés, extraits inventés refusés", () => {
  const c = checkCitations([{ passage: 1, quote: "Le masque designe le nombre de bits" }, { passage: 9, quote: "rien" }, { passage: 2, quote: "le routeur qui permet de sortir" }], passages);
  assertEquals(c.map((x) => x.passage), [1, 2]);
});

const ok = { reply: "ok", verdict: "juste", misconception: "", hint_level: 0, citations: [], correct_points: [], missing: [], done: true, next_activity: "terminer" };
async function fakeApi(handler: (b: Record<string, any>, n: number) => Response, run: (base: string, seen: Record<string, any>[]) => Promise<void>) {
  const seen: Record<string, any>[] = [];
  const server = Deno.serve({ port: 0, onListen() {} }, async (r) => { const b = await r.json(); b._auth = r.headers.get("authorization"); b._path = new URL(r.url).pathname; seen.push(b); return handler(b, seen.length); });
  try { await run(`http://localhost:${server.addr.port}/openai/v1`, seen); } finally { await server.shutdown(); }
}
const completion = (model: string, content: string, finish = "stop") => Response.json({ model, choices: [{ message: { role: "assistant", content }, finish_reason: finish }], usage: { prompt_tokens: 42, completion_tokens: 7 } });

Deno.test("gpt-oss reçoit le schéma JSON strict, la clé en en-tête et l'effort de raisonnement", async () => {
  await fakeApi((b) => completion(b.model, JSON.stringify(ok)), async (base, seen) => {
    const out = await makeCallModel({ baseUrl: base, apiKey: "cle-de-test", models: ["openai/gpt-oss-120b", "llama-3.3-70b-versatile"] })({ system: "s", user: "u", schema: { type: "object" }, effort: "low" });
    assertEquals(seen.length, 1);
    assertEquals(seen[0]._path, "/openai/v1/chat/completions");
    assertEquals(seen[0]._auth, "Bearer cle-de-test");
    assertEquals(seen[0].model, "openai/gpt-oss-120b");
    assertEquals(seen[0].response_format, { type: "json_schema", json_schema: { name: "tutor_reply", strict: true, schema: { type: "object" } } });
    assertEquals(seen[0].reasoning_effort, "low");
    assertEquals(out.inputTokens, 42);
    assertEquals(JSON.parse(out.text).verdict, "juste");
  });
});

Deno.test("modèle saturé (429) : bascule sur le modèle de secours, en mode JSON simple", async () => {
  await fakeApi((b, n) => n === 1 ? new Response("{}", { status: 429 }) : completion(b.model, JSON.stringify(ok)), async (base, seen) => {
    const out = await makeCallModel({ baseUrl: base, apiKey: "k", models: ["openai/gpt-oss-120b", "llama-3.3-70b-versatile"] })({ system: "s", user: "u", schema: { type: "object" }, effort: "low" });
    assertEquals(seen.map((x) => x.model), ["openai/gpt-oss-120b", "llama-3.3-70b-versatile"]);
    assertEquals(seen[1].response_format, { type: "json_object" });
    assert(String(seen[1].messages[0].content).includes("objet JSON"), "le schéma est rappelé dans la consigne");
    assert(!("reasoning_effort" in seen[1]));
    assertEquals(out.model, "llama-3.3-70b-versatile");
  });
});

Deno.test("schéma refusé (400) : même modèle, en mode JSON simple ; filtre de contenu = refus", async () => {
  await fakeApi((b, n) => n === 1 ? Response.json({ error: { message: "schema" } }, { status: 400 }) : completion(b.model, "", "content_filter"), async (base, seen) => {
    const out = await makeCallModel({ baseUrl: base, apiKey: "k", models: ["openai/gpt-oss-120b"] })({ system: "s", user: "u", schema: { type: "object" }, effort: "medium" });
    assertEquals(seen.length, 2);
    assertEquals(seen[1].response_format, { type: "json_object" });
    assertEquals(out.stop, "refusal");
  });
});

Deno.test("coût nul par défaut, prix réglable", async () => {
  const a = fakeDeps(); await handle(req(body), a.deps);
  assertEquals((a.recorded[0] as { costUsd: number }).costUsd, 0);
  const b = fakeDeps({ price: { input: 1, output: 2 } }); await handle(req(body), b.deps);
  assertEquals((b.recorded[0] as { costUsd: number }).costUsd, 0.0014);
});

/* ---------- Génération de contenu (remplace l'appel direct depuis le navigateur) ---------- */
const extrait = "Le protocole DHCP attribue automatiquement une adresse IP, un masque de sous-réseau et une passerelle par défaut à chaque poste qui rejoint le réseau. Le client envoie une requête DHCPDISCOVER en diffusion, le serveur répond par une offre DHCPOFFER.";
function genDeps(modelOut: Record<string, unknown>, over: Partial<Deps> = {}) {
  const calls: { kind: string }[] = [], recorded: unknown[] = [], seen: Record<string, unknown>[] = [];
  const { deps } = fakeDeps({
    usedThisMonth: async (_u, _m, kind) => { calls.push({ kind }); return 0; },
    record: async (e) => { recorded.push(e); },
    callModel: async (p) => { seen.push(p as unknown as Record<string, unknown>); return { text: JSON.stringify(modelOut), stop: "stop", model: "openai/gpt-oss-120b", inputTokens: 300, outputTokens: 120 }; },
    ...over,
  });
  return { deps, calls, recorded, seen };
}

Deno.test("enrichir : points ancrés gardés, inventions écartées, quota de génération séparé", async () => {
  const g = genDeps({
    keyPoints: ["DHCP attribue automatiquement l'adresse IP, le masque et la passerelle par défaut.", "Kerberos chiffre les tickets avec AES256 dans Active Directory."],
    exercises: [{ q: "Que fournit DHCP ?", a: "Une adresse IP, un masque de sous-réseau et une passerelle par défaut." }, { q: "Quel port ?", a: "Kerberos utilise toujours le port 88 sur Windows Server." }],
  });
  const r = await handle(req({ task: "enrichir", title: "DHCP", text: extrait }), g.deps);
  assertEquals(r.status, 200);
  const d = await r.json();
  assertEquals(d.keyPoints.length, 1);
  assertEquals(d.exercises.length, 1);
  assertEquals(d.dropped, 2);
  assertEquals(g.calls[0].kind, "generation");
  assertEquals((g.recorded[0] as { mode: string }).mode, "enrichir");
  assertEquals(g.seen[0].maxTokens, 800);
  assert(String(g.seen[0].user).includes("DHCPDISCOVER"));
});

Deno.test("génération : connexion exigée, quota vérifié avant l'appel, texte source obligatoire pour enrichir", async () => {
  const g = genDeps({}, { usedThisMonth: async () => 150 });
  assertEquals((await handle(req({ task: "enrichir", title: "DHCP", text: extrait }, "faux"), g.deps)).status, 401);
  const q = await handle(req({ task: "enrichir", title: "DHCP", text: extrait }), g.deps);
  assertEquals(q.status, 429);
  assertEquals(g.seen.length, 0);
  const g2 = genDeps({});
  assertEquals((await handle(req({ task: "enrichir", title: "DHCP", text: "trop court" }), g2.deps)).status, 400);
  assertEquals((await handle(req({ task: "inconnue", title: "x", text: extrait }), g2.deps)).status, 400);
});

Deno.test("rédiger un cours : notions hors du texte de référence écartées", async () => {
  const g = genDeps({ overview: "DHCP configure les postes.", notions: [
    { title: "Rôle de DHCP", notes: "Le protocole DHCP attribue automatiquement une adresse IP, un masque de sous-réseau et une passerelle par défaut à chaque poste du réseau.", keyPoints: [], exercises: [] },
    { title: "Histoire", notes: "Inventé par Ralph Droms en 1993 à Bucknell University, standardisé ensuite par IETF dans la RFC 2131 publiée en mars 1997.", keyPoints: [], exercises: [] },
  ] });
  const d = await (await handle(req({ task: "rediger_cours", title: "DHCP", text: extrait, sourceTitle: "Wikipédia : DHCP" }), g.deps)).json();
  assertEquals(d.notions.map((n: { title: string }) => n.title), ["Rôle de DHCP"]);
  assertEquals(d.dropped, 1);
  assert(String(g.seen[0].user).includes("Wikipédia : DHCP"));
});

Deno.test("modèles saturés : 503 « occupe », rien n'est enregistré", async () => {
  const g = genDeps({}, { callModel: async () => { const e = new Error("429"); e.name = "Busy"; throw e; } });
  const r = await handle(req({ task: "rediger_notion", title: "DHCP", text: extrait }), g.deps);
  assertEquals(r.status, 503);
  assertEquals(g.recorded.length, 0);
});

Deno.test("ancrage lexical : reformulation fidèle acceptée, invention refusée", () => {
  assert(support("DHCP attribue une adresse IP et un masque automatiquement", extrait) >= 0.5);
  assert(support("Kerberos chiffre les tickets avec AES256", extrait) < 0.5);
});

Deno.test("génération : rien sur l'apprenant (niveau, conseil personnel), même si l'extrait en contient", async () => {
  const src = "Le protocole DHCP attribue automatiquement une adresse IP à chaque poste. Niveau estimé : débutant. Je te conseille de configurer ton laboratoire d'abord.";
  const g = genDeps({
    keyPoints: ["DHCP attribue automatiquement une adresse IP à chaque poste.", "Ton niveau estimé en DHCP est débutant.", "Je te conseille de configurer ton laboratoire."],
    exercises: [{ q: "Que fait DHCP ?", a: "Il attribue automatiquement une adresse IP à chaque poste." }, { q: "Quel est ton niveau ?", a: "Niveau estimé : débutant." }],
  });
  const d = await (await handle(req({ task: "enrichir", title: "DHCP", text: src }), g.deps)).json();
  assertEquals(d.keyPoints, ["DHCP attribue automatiquement une adresse IP à chaque poste."]);
  assertEquals(d.exercises.length, 1);
  assert(String(g.seen[0].system).includes("Ignore tout passage qui juge l'étudiant"));
});
