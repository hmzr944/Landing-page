// Tests de la fonction « tutor » (Deno) :  deno test --allow-net --allow-env supabase/functions/tutor/
// Aucune clé ni aucun réseau réel : un faux serveur Anthropic local reçoit la requête du vrai SDK.
import { assert, assertEquals } from "jsr:@std/assert@1";
import Anthropic from "npm:@anthropic-ai/sdk@1.4.0";
import { buildPrompt, checkCitations, type Deps, handle, validate } from "./handler.ts";
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
      stop: "end_turn", model: "claude-opus-5-5", inputTokens: 1000, outputTokens: 200,
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
  assertEquals((recorded[0] as { costUsd: number }).costUsd, 0.008);
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
  const { deps, recorded } = fakeDeps({ callModel: async () => ({ text: "", stop: "refusal", model: "claude-opus-5-5", inputTokens: 500, outputTokens: 0 }) });
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

Deno.test("le vrai SDK envoie le bon modèle, le schéma strict et la bascule de sécurité", async () => {
  let seen: Record<string, unknown> | null = null, headers: Headers | null = null;
  const server = Deno.serve({ port: 0, onListen() {} }, async (r) => {
    seen = await r.json(); headers = r.headers;
    return Response.json({ id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5", stop_reason: "end_turn", stop_sequence: null,
      content: [{ type: "text", text: JSON.stringify({ reply: "ok", verdict: "juste", misconception: "", hint_level: 0, citations: [], correct_points: [], missing: [], done: true, next_activity: "terminer" }) }],
      usage: { input_tokens: 42, output_tokens: 7 } });
  });
  try {
    const claude = new Anthropic({ apiKey: "cle-de-test", baseURL: `http://localhost:${server.addr.port}`, maxRetries: 0 });
    const out = await makeCallModel(claude)({ system: "s", user: "u", schema: { type: "object" }, effort: "low" });
    const s = seen as unknown as Record<string, any>;
    assertEquals(s.model, "claude-opus-5-5");
    assertEquals(s.fallbacks, "default");
    assertEquals(s.output_config, { effort: "low", format: { type: "json_schema", schema: { type: "object" } } });
    assert(!("betas" in s), "les betas passent en en-tête, pas dans le corps");
    assert(String((headers as unknown as Headers).get("anthropic-beta")).includes("server-side-fallback-2026-07-01"));
    assertEquals(out.inputTokens, 42);
    assertEquals(JSON.parse(out.text).verdict, "juste");
  } finally { await server.shutdown(); }
});
