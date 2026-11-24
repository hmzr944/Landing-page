// Classement « sensible » forcé par le serveur (mission 2b). Les phrases ci-dessous NE viennent PAS du corpus métier :
// le vocabulaire doit valoir pour n'importe quel document, pas seulement pour celui qui sert au banc d'essai.
import { assertEquals } from "jsr:@std/assert@1";
import { isSensitive } from "./generate.ts";

const OUI = [
  "En cas d'allergie déclarée, prévenir le cuisinier avant la commande.",
  "Les viandes sont stockées à 3 °C au plus.",
  "Ne jamais laisser la porte de la réserve ouverte.",
  "L'extincteur à CO2 se trouve près du tableau électrique.",
  "Un avoir est proposé si le remboursement est refusé.",
  "Le code d'accès du local change chaque mois.",
  "Les produits périmés sont retirés du rayon chaque matin.",
  "Tout paiement par chèque est vérifié avec une pièce d'identité.",
  "La vente d'alcool est interdite aux mineurs.",
  "Les données personnelles des clients ne sont jamais imprimées.",
];
const NON = [
  "Le magasin ouvre à 9 h 30 du lundi au samedi.",
  "Les étiquettes de prix sont posées à droite du produit.",
  "La réunion d'équipe a lieu le lundi matin.",
  "Le parking est loin de l'entrée principale.",
  "Ranger les cintres par taille dans la réserve.",
];

Deno.test("sensible : sécurité, santé, hygiène, argent, juridique et données sont reconnus", () => {
  assertEquals(OUI.filter((t) => !isSensitive(t)), []);
});
Deno.test("sensible : les consignes ordinaires ne sont pas classées sensibles (« loin » n'est pas « loi »)", () => {
  assertEquals(NON.filter((t) => isSensitive(t)), []);
});

// Connaissance dont le texte se réduit à une valeur (« + 2 °C ») : gardée avec la citation exacte comme texte
import { cleanGen } from "./generate.ts";
Deno.test("extraire : un texte réduit à une valeur reprend la citation exacte, au lieu d'être écarté", () => {
  const passages = [{ page: 1, text: "Températures maximales. Poissons frais : + 2 °C. Glaces : – 18 °C." }];
  const out = cleanGen({ task: "extraire", title: "Fiche", text: passages[0].text, sourceTitle: "", passages, org: "o", version: "v" } as never,
    { items: [{ kind: "produit", title: "Poissons", body: "+ 2 °C", quote: "Poissons frais : + 2 °C.", passage: 1, confidence: 1 }] }) as { items: { body: string }[] };
  assertEquals(out.items.map((x) => x.body), ["Poissons frais : + 2 °C."]);
});
