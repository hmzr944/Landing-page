// Lecture serveur du corpus métier n° 1 (docs/corpus-metier) : le texte relu par le serveur (pdfPages, unpdf) doit contenir
// chaque règle attendue, dans la série normale comme dans la série avec ligatures typographiques (« fi », « ff », « fl »).
// C'est ce texte qui sert à vérifier les extraits envoyés par le navigateur (passageFound).
import { assert, assertEquals } from "jsr:@std/assert@1";
import { passageFound, pdfPages } from "./pdftext.ts";

const DIR = new URL("../../../docs/corpus-metier/", import.meta.url);
type Doc = { id: string; fichier: string; regles_attendues: { id: string; texte: string }[] };
const corpus = JSON.parse(await Deno.readTextFile(new URL("corpus.json", DIR))) as { documents: Doc[] };

for (const serie of ["", "ligatures/"]) {
  Deno.test(`corpus métier ${serie ? "avec ligatures" : "sans ligatures"} : les 74 règles se retrouvent dans le texte relu par le serveur`, async () => {
    let total = 0;
    const missing: string[] = [];
    for (const d of corpus.documents) {
      const pages = await pdfPages(await Deno.readFile(new URL(serie + d.fichier, DIR)));
      for (const r of d.regles_attendues) {
        total++;
        if (!passageFound(r.texte, pages, 1)) missing.push(`${d.id} ${r.id}`);
      }
    }
    assertEquals(total, 74);
    assertEquals(missing, []);
  });
}

Deno.test("corpus métier : un mot coupé par une ligature (ancienne lecture du navigateur) n'est pas reconnu par le serveur", async () => {
  const d = corpus.documents.find((x) => x.id === "R3-v1")!;
  const pages = await pdfPages(await Deno.readFile(new URL("ligatures/" + d.fichier, DIR)));
  const regle = d.regles_attendues.find((x) => x.id === "R3.session")!.texte;
  assert(passageFound(regle, pages, 1));
  assert(!passageFound(regle.replace("identifiant", "identi fi ant"), pages, 1, 1), "le serveur ne doit pas confondre un texte abîmé avec le document");
});
