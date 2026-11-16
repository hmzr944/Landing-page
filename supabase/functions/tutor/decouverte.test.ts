// Découverte Business (simulation avant toute organisation) :  deno test --allow-env --allow-net --allow-read
import { assert, assertEquals } from "jsr:@std/assert@1";
import { type Deps, handle } from "./handler.ts";
import { MAX_TURNS } from "./decouverte.ts";

const req = (b: unknown, jwt = "jeton-valide") =>
  new Request("http://localhost/tutor", { method: "POST", headers: { authorization: `Bearer ${jwt}`, origin: "https://hmzr944.github.io", "content-type": "application/json" }, body: JSON.stringify(b) });
const SITUATION = "Un client exige le remboursement d'un article soldé hors délai et commence à s'énerver.";

function deps(outs: Record<string, unknown>[], over: Partial<Deps> = {}) {
  const recorded: { mode: string }[] = [];
  const prompts: string[] = [];
  let i = 0;
  const d: Deps = {
    limit: 3, origins: ["https://hmzr944.github.io"],
    getUser: async (jwt) => (jwt === "jeton-valide" ? { id: "u1" } : null),
    usedThisMonth: async () => 0,
    record: async (e) => { recorded.push(e as { mode: string }); },
    callModel: async (p) => { prompts.push(p.system + "\n" + p.user); return { text: JSON.stringify(outs[Math.min(i++, outs.length - 1)]), stop: "end_turn", model: "m", inputTokens: 10, outputTokens: 5 }; },
    ...over,
  };
  return { d, recorded, prompts };
}
const START = { name: "Nadia", profile: "cliente pressée", need: "être reconnue comme cliente fidèle", objections: ["Je l'ai payé cher", "Votre collègue m'a dit oui"], opening: "Je veux être remboursée, tout de suite.", assumptions: ["Hypothèse : les articles soldés ne sont pas remboursés", "Hypothèse : délai de retour de 30 jours"], skills: ["écoute", "désescalade", "application d'une règle"] };

Deno.test("découverte : sans connexion, refusé avant tout appel", async () => {
  const { d } = deps([START]);
  const r = await handle(req({ task: "decouverte_start", sector: "Commerce", situation: SITUATION }, "x"), d);
  assertEquals(r.status, 401);
});

Deno.test("découverte : sans organisation ni base, une fiche jouable ; les règles sont des hypothèses, jamais des règles", async () => {
  const { d, recorded, prompts } = deps([START]);
  const r = await handle(req({ task: "decouverte_start", sector: "Commerce", situation: SITUATION }), d);
  assertEquals(r.status, 200);
  const j = await r.json();
  assertEquals(j.opening, "Je veux être remboursée, tout de suite.");
  assertEquals(j.spec.assumptions.length, 2);
  assert(j.spec.assumptions.every((a: string) => a.startsWith("Hypothèse")));
  assertEquals(j.max_turns, MAX_TURNS);
  assertEquals(recorded[0].mode, "mystere"); // même quota que le Client Mystère
  assert(prompts[0].includes("Tu ne connais AUCUNE règle de l'entreprise"));
  assert(prompts[0].includes(SITUATION));
});

Deno.test("découverte : situation trop courte, refusée sans appel au modèle", async () => {
  let called = false;
  const { d } = deps([START], { callModel: async () => { called = true; throw new Error("x"); } });
  const r = await handle(req({ task: "decouverte_start", situation: "court" }), d);
  assertEquals(r.status, 400);
  assert(!called);
});

Deno.test("découverte : quota du Client Mystère atteint, 429", async () => {
  const { d } = deps([START], { usedThisMonth: async (_u, _m, kind) => (kind === "org" ? 400 : 0) });
  const r = await handle(req({ task: "decouverte_start", situation: SITUATION }), d);
  assertEquals(r.status, 429);
});

Deno.test("découverte : un tour de dialogue, puis fin au nombre de tours maximal", async () => {
  const { d } = deps([{ reply: "Mouais. Et vous proposez quoi ?", satisfied: false, leaves: false }]);
  const spec = { situation: SITUATION, name: "Nadia", profile: "pressée", need: "x", objections: [], assumptions: [], skills: [] };
  const r = await handle(req({ task: "decouverte_tour", spec, transcript: [{ role: "client", text: "Je veux être remboursée." }], message: "Je comprends, regardons ensemble." }), d);
  const j = await r.json();
  assertEquals(j.reply, "Mouais. Et vous proposez quoi ?");
  assertEquals(j.done, false);
  const many = Array.from({ length: MAX_TURNS }, (_, i) => [{ role: "client", text: `c${i}` }, { role: "vous", text: `v${i}` }]).flat();
  const r2 = await handle(req({ task: "decouverte_tour", spec, transcript: many, message: "Encore une phrase." }), d);
  assertEquals(r2.status, 409);
});

Deno.test("découverte : débrief ; un point fort sans citation exacte est écarté ; rien n'est présenté comme mesuré", async () => {
  const { d } = deps([{ decisions: ["Propose un avoir"], strengths: [{ text: "Reformule la demande", quote: "Si je comprends bien, vous voulez" }, { text: "Inventé", quote: "phrase jamais dite par la personne" }], misses: ["N'a pas vérifié le ticket"], skills: ["écoute"], improvements: ["Demander le ticket"] }]);
  const spec = { situation: SITUATION, name: "Nadia", need: "x", assumptions: ["Hypothèse : soldes non remboursés"], skills: ["écoute"] };
  const r = await handle(req({ task: "decouverte_fin", spec, transcript: [{ role: "client", text: "Remboursez-moi." }, { role: "vous", text: "Si je comprends bien, vous voulez être remboursée aujourd'hui." }] }), d);
  const j = await r.json();
  assertEquals(j.debrief.strengths.length, 1);
  assertEquals(j.debrief.strengths[0].text, "Reformule la demande");
  assertEquals(j.debrief.assumptions, ["Hypothèse : soldes non remboursés"]);
  assertEquals(j.debrief.measured, false);
});
