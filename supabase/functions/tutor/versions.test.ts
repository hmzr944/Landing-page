// Comparaison de versions (mission 2c) : nouveautés et portée selon la section, reformulation sans appel au modèle.
// Exemples écrits pour ces tests, distincts du corpus du banc d'essai ; le modèle est simulé (réponse fixe).
import { assert, assertEquals } from "jsr:@std/assert@1";
import { compareVersions, verKnownSame, verOrderImposed, verSameWords, verStripNum, verSections, type EnginesDb } from "./engines.ts";

const V1 = `Retrait des commandes
Commandes payées en ligne
1. Demander le numéro de commande au client.
2. Remettre la commande sans demander de pièce d'identité.
Commandes payées en magasin
1. Demander une pièce d'identité.
Délai de garde
1. Ranger et étiqueter le colis dans la réserve.
2. Allumer la lumière et ouvrir le local.`;
const V2 = `Retrait des commandes
Commandes payées en ligne
1. Demander le numéro de commande au client.
2. Vérifier avec le client le nom inscrit sur la commande.
Commandes de moins de 50 €
1. Remettre la commande sans demander de pièce d'identité.
Commandes payées en magasin
1. Demander une pièce d'identité.
Retrait par une autre personne
1. Demander une pièce d'identité.
Délai de garde
1. Étiqueter et ranger le colis dans la réserve.
2. Ouvrir le local, puis allumer la lumière.`;

const K = (id: string, quote: string) => ({ id, org_id: "o", kind: "regle", title: quote.slice(0, 30), body: quote, quote, page: 1, status: "valide" });
const KNOW = [
  K("numero", "Demander le numéro de commande au client."),
  K("sans-piece", "Remettre la commande sans demander de pièce d'identité."),
  K("piece", "Demander une pièce d'identité."),
  K("ranger", "Ranger et étiqueter le colis dans la réserve."),
  K("ordre", "Allumer la lumière et ouvrir le local."),
];

async function compare(modelAdded: string[], modelItems: Record<string, string>[] = []) {
  const changes: Record<string, unknown>[] = [];
  const asked: string[] = [];
  const db = {
    versionInfo: async (id: string) => (id === "v2" ? { id: "v2", org_id: "o", source_id: "s", version: 2, storage_path: "v2", checksum: null } : null),
    versionByNumber: async () => ({ id: "v1", org_id: "o", source_id: "s", version: 1, storage_path: "v1", checksum: null }),
    knowledgeOfVersion: async () => KNOW,
    docFile: async (p: string) => ({ pages: [p === "v1" ? V1 : V2], sha256: "x" }),
    insertPolicyChange: async () => "c",
    insertChangeItems: async (rows: Record<string, unknown>[]) => { changes.push(...rows); },
    createScenario: async () => "",
  } as unknown as EnginesDb;
  const ctx = {
    userId: "u", db: db as never, onModel: async () => {},
    callModel: async (p: { user: string }) => {
      asked.push(p.user);
      return { text: JSON.stringify({ items: modelItems, added: modelAdded.map((q) => ({ title: q.slice(0, 20), body: q, quote: q })) }), stop: "stop", model: "m", inputTokens: 0, outputTokens: 0 };
    },
  };
  await compareVersions(ctx as never, db, "o", "admin", { version: "v2" });
  const of = (id: string) => changes.find((c) => c.knowledge_id === id);
  const news = changes.filter((c) => c.change === "nouveau").map((c) => String(c.new_quote));
  return { changes, of, news, asked };
}

Deno.test("cas 1 : une vraie nouveauté (absente de la v1) est gardée", async () => {
  const r = await compare(["Vérifier avec le client le nom inscrit sur la commande."]);
  assert(r.news.includes("Vérifier avec le client le nom inscrit sur la commande."));
});

Deno.test("cas 2 : formulation déjà présente en v1 mais dans une nouvelle section = nouveauté gardée (proposée ou non par le modèle)", async () => {
  for (const proposed of [["Demander une pièce d'identité."], []]) {
    const r = await compare(proposed);
    assertEquals(r.news.filter((q) => q === "Demander une pièce d'identité.").length, 1, `proposée par le modèle : ${proposed.length > 0}`);
    assertEquals(r.of("piece")?.change, "inchange", "la règle d'origine (commandes payées en magasin) reste valable telle quelle");
  }
});

Deno.test("cas 3 : connaissance identique, même section : ni alerte ni fausse nouveauté", async () => {
  const r = await compare(["Demander le numéro de commande au client."]);
  assertEquals(r.of("numero")?.change, "inchange");
  assert(!r.news.includes("Demander le numéro de commande au client."), "une nouveauté non fondée est écartée");
});

Deno.test("cas 4 : même phrase, autre section : la portée a changé, signalée comme modifiée", async () => {
  const r = await compare([]);
  assertEquals(r.of("sans-piece")?.change, "modifie");
  assert(String(r.of("sans-piece")?.explanation).includes("commandes de moins de 50"));
});

Deno.test("reformulation certaine (mêmes mots, autre ordre) : reconnue sans appel au modèle ; « et » → « puis » est une modification certaine (2d)", async () => {
  const r = await compare([]);
  assertEquals(r.of("ranger")?.change, "reformule");
  assert(!r.asked.join(" ").includes("Ranger et étiqueter"), "le modèle n'est pas interrogé sur une reformulation certaine");
  // mission 2d (décision du 2026-11-22 : l'ordre fait partie du fond) : un ordre nouvellement imposé est une modification,
  // conclue sans le modèle
  assertEquals(r.of("ordre")?.change, "modifie");
  assert(!r.asked.join(" ").includes("Allumer la lumière et ouvrir le local"), "le modèle n'est pas interrogé sur un ordre imposé certain");
  assert(verOrderImposed("Allumer la lumière et ouvrir le local.", "Ouvrir le local, puis allumer la lumière."));
  assert(!verOrderImposed("Débrancher, puis nettoyer.", "Nettoyer après avoir débranché."), "deux phrases ordonnées : pas de conclusion sans le modèle");
  assertEquals(verStripNum("4. Conserver le colis 10 jours."), "Conserver le colis 10 jours.");
  assertEquals(verStripNum("Conserver 4. colis"), "Conserver 4. colis");
  assert(verSameWords("Ranger et étiqueter le colis.", "Étiqueter et ranger le colis."));
  assert(!verSameWords("Allumer l'éclairage et démarrer les caisses.", "Démarrer les caisses, puis allumer l'éclairage."));
  assert(!verSameWords("Garder le colis 7 jours.", "Garder le colis 10 jours."), "un nombre différent n'est jamais une reformulation");
});

Deno.test("sections : titres reconnus, phrase « déjà connue » seulement si toutes ses sections existaient déjà", () => {
  const o = verSections([V1]), n = verSections([V2]);
  assertEquals(n.map((x) => x.heading), ["retrait des commandes", "commandes payees en ligne", "commandes de moins de 50", "commandes payees en magasin", "retrait par une autre personne", "delai de garde"]);
  assert(verKnownSame("Demander le numéro de commande au client.", o, n));
  assert(!verKnownSame("Demander une pièce d'identité.", o, n));
  assert(!verKnownSame("Vérifier avec le client le nom inscrit sur la commande.", o, n));
});
