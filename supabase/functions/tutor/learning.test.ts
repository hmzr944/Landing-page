// Arbor Learning universel (learning.ts) : fiche, jugement, compagnon. Modèle simulé ; aucune source réelle n'est
// appelée. La fiche assemblée est passée au validateur du navigateur (js/pedagogie/fiche-validateur.js).
//   deno test --allow-env --allow-net --allow-read
import { assert, assertEquals } from "jsr:@std/assert@1";
import { type Deps, handle } from "./handler.ts";

const req = (b: unknown, jwt = "jeton-valide") =>
  new Request("http://localhost/tutor", { method: "POST", headers: { authorization: `Bearer ${jwt}`, origin: "https://hmzr944.github.io", "content-type": "application/json" }, body: JSON.stringify(b) });
function deps(outs: Record<string, unknown>[], over: Partial<Deps> = {}) {
  const recorded: { mode: string }[] = [], prompts: string[] = [];
  let i = 0;
  const d: Deps = {
    limit: 5, genLimit: 5, origins: ["https://hmzr944.github.io"],
    getUser: async (jwt) => (jwt === "jeton-valide" ? { id: "u1" } : null),
    usedThisMonth: async () => 0,
    record: async (e) => { recorded.push(e as { mode: string }); },
    callModel: async (p) => { prompts.push(p.system + "\n" + p.user); return { text: JSON.stringify(outs[Math.min(i++, outs.length - 1)]), stop: "end_turn", model: "m", inputTokens: 10, outputTokens: 5 }; },
    ...over,
  };
  return { d, recorded, prompts };
}

// Réponse du modèle simulée à partir de la fiche d'essai « levier » (contenu fabriqué pour les tests)
const F = JSON.parse(await Deno.readTextFile(new URL("../../../tests/fixtures/fiches/essai-levier.json", import.meta.url)));
const EXTRAIT = F.sources[0].extrait as string;
const PASSAGES = [{ id: "p1", titre: "Wikipédia : Levier", url: "https://fr.wikipedia.org/wiki/Levier", licence: "CC BY-SA 4.0", texte: `${EXTRAIT} Le point d’appui est aussi appelé pivot. Plus le bras de levier est long, moins l’effort à fournir est grand.` }];
const conf = (c: Record<string, unknown>) => (c.confusion ? Number(String(c.confusion).slice(1)) - 1 : -1);
const toModel = (q: Record<string, unknown>) => ({ type: "choix", evalue: q.evalue, q: q.q, choix: (q.choix as Record<string, unknown>[]).map((c) => ({ texte: c.texte, juste: !!c.juste, confusion: conf(c) })), attendus: [], etapes: [] });
const repIndex = (id: string) => F.representations.findIndex((r: { id: string }) => r.id === id);
const MODEL = {
  situation: F.situation.texte, question_ouverture: F.situation.question_ouverture,
  explication_simple: F.explication.simple.texte, ancre_simple: F.explication.simple.ancre_situation,
  explication_standard: F.explication.standard.texte, ancre_standard: F.explication.standard.ancre_situation,
  sources_explication: ["p1"], idee_centrale: F.idee_centrale, elements_cles: F.elements_cles,
  representations: F.representations.map((r: Record<string, string>) => ({ type: r.type, texte: r.texte, limite: r.limite || "" })),
  confusions: F.confusions.map((c: Record<string, unknown>) => ({ libelle: c.libelle, description: c.description, remede: repIndex(String(c.remede)), controle: toModel(c.controle as Record<string, unknown>) })),
  ...Object.fromEntries(Object.entries(F.questions).map(([k, v]) => [k, (v as Record<string, unknown>[]).map(toModel)])),
  glossaire: F.glossaire,
  extraits: [{ passage: "p1", extrait: EXTRAIT }, { passage: "p1", extrait: "Archimède a démontré le principe du levier en 250 avant notre ère." }],
};
const BODY = { task: "fiche_rediger", notion: "Le levier", sujet: "Physique", niveau: "debutant", intention: "comprendre", passages: PASSAGES };

// validateur du navigateur, chargé tel quel (modules UMD : ils s'attachent à globalThis hors Node)
await import("../../../js/pedagogie/fiche-empreinte.js");
await import("../../../js/pedagogie/chevauchement.js");
await import("../../../js/pedagogie/fiche-validateur.js");
// deno-lint-ignore no-explicit-any
const V = (globalThis as any).FicheValidateur;

Deno.test("fiche : sans connexion, refusé ; sans passage, refusé (Arbor n'écrit pas sans source)", async () => {
  assertEquals((await handle(req(BODY, "x"), deps([MODEL]).d)).status, 401);
  const r = await handle(req({ ...BODY, passages: [] }), deps([MODEL]).d);
  assertEquals(r.status, 400);
});

Deno.test("fiche : fiche v2 assemblée, sources VÉRIFIÉES (l'extrait inventé est écarté), brouillon d'origine serveur", async () => {
  const { d, recorded, prompts } = deps([MODEL]);
  const r = await handle(req(BODY), d);
  assertEquals(r.status, 200);
  const { fiche } = await r.json();
  assertEquals(fiche.format, "fiche-v2");
  assertEquals([fiche.meta.statut, fiche.meta.origine, fiche.meta.niveau], ["brouillon", "serveur", "debutant"]);
  assertEquals(fiche.sources.length, 1);
  assertEquals(fiche.sources[0].url, "https://fr.wikipedia.org/wiki/Levier"); // titre et adresse viennent du client, pas du modèle
  assert(!JSON.stringify(fiche).includes("Archimède"), "un extrait absent des passages ne devient jamais une source");
  assertEquals(fiche.confusions[0].remede.startsWith("r"), true);
  assert(prompts[0].includes("débutant complet") && prompts[0].includes("SANS nommer la notion"));
  assertEquals(recorded[0].mode, "rediger_notion");
  // le validateur du navigateur l'accepte telle quelle (hors contrôle du jeu 3a, non fourni ici)
  const v = V.valider({ ...fiche, meta: { ...fiche.meta, statut: "generee_validee" } }, {});
  const bloquants = v.bloquants.filter((b: { regle: string }) => !b.regle.startsWith("V-chevauchement"));
  assertEquals(bloquants.map((b: { regle: string; message: string }) => `${b.regle} ${b.message}`), []);
});

Deno.test("fiche : aucun extrait vérifiable → 422, pas de fiche", async () => {
  const r = await handle(req(BODY), deps([{ ...MODEL, extraits: [{ passage: "p1", extrait: "Une phrase qui n'est dans aucun passage fourni." }] }]).d);
  assertEquals(r.status, 422);
});

Deno.test("fiche : les défauts relevés par le validateur sont renvoyés au modèle pour correction", async () => {
  const { d, prompts } = deps([MODEL]);
  await handle(req({ ...BODY, retour: ["V-ordre-01 : la situation nomme la notion"] }), d);
  assert(prompts[0].includes("Corrige ces défauts") && prompts[0].includes("V-ordre-01"));
});

Deno.test("juger : une confusion hors de la liste fermée n'est jamais retenue", async () => {
  const item = { q: "Explique le casse-noix.", grille: ["Nomme le point fixe", "Relie la longueur à l'effort"], reference: "La charnière est le point fixe ; plus on appuie loin, moins on force." };
  const { d } = deps([{ outcome: "partiel", confusion: "c9", retour: "Le point fixe est juste ; il manque le lien avec la longueur.", criteres: [true, false] }]);
  const r = await handle(req({ task: "fiche_juger", item, reponse: "La charnière ne bouge pas.", confusions: [{ id: "c1", libelle: "Une barre plus longue aide toujours" }] }), d);
  const { jugement } = await r.json();
  assertEquals([jugement.outcome, jugement.confusion], ["partiel", null]);
  assertEquals(jugement.criteres, [true, false]);
});

Deno.test("compagnon : citation vérifiée → réponse sourcée ; citation inventée → « information absente », pas de réponse", async () => {
  const ok = { repond: true, reponse: "Le point d'appui permet de multiplier une force.", citations: [{ passage: "p1", extrait: EXTRAIT }], absent: "", exercice: "Où placer la cale pour soulever une pierre lourde ?", attendu: "Près de la pierre", approfondir: ["Le moment d'une force"] };
  let r = await handle(req({ task: "compagnon", question: "À quoi sert un levier ?", passages: PASSAGES }), deps([ok]).d);
  let j = await r.json();
  assertEquals([j.repond, j.citations.length], [true, 1]);
  assert(j.exercice.length > 0);
  r = await handle(req({ task: "compagnon", question: "Qui a inventé le levier ?", passages: PASSAGES }), deps([{ ...ok, citations: [{ passage: "p1", extrait: "Archimède a inventé le levier en Sicile, il y a longtemps." }] }]).d);
  j = await r.json();
  assertEquals([j.repond, j.reponse, j.exercice], [false, "", ""]);
  assert(j.absent.length > 0);
});
