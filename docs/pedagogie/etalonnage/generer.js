/* Prépare la remise aux deux correcteurs : un dossier par correcteur, avec seulement ce qu'il doit recevoir.
     remise/correcteur-A/ : consignes.md, grille-reformulation.md (copie exacte de la version 523f730), copie-correcteur-A.md, feuille-correcteur-A.csv
     remise/correcteur-B/ : idem pour B (ordre des réponses différent)
   Rien de la clé (reponses-fictives.js) n'y figure ; tests/etalonnage.js le vérifie.
   Lancer depuis la racine :  node docs/pedagogie/etalonnage/generer.js   (--check : vérifie que tout est à jour) */
const fs = require('fs'), path = require('path');
const { copie, feuille, DIR, ITEMS } = require('./etalonnage.js');
const GRILLE = fs.readFileSync(path.join(DIR, '..', 'grille-reformulation.md'), 'utf8');
const consignes = (L) => `# Exercice d'étalonnage, mission 3a : consignes pour le correcteur ${L}

Merci de participer. **Ce n'est pas une évaluation de vous** : l'exercice vérifie que la grille de correction est
assez claire pour que deux personnes donnent les mêmes notes. **Toutes les réponses sont fabriquées** : aucune ne vient
d'une vraie personne.

## Ce que vous avez reçu
- \`consignes.md\` : ce document ;
- \`grille-reformulation.md\` : la grille, parties 1 (reformulation, B2), 2 (transfert, B3) et 3 (déblocage, B4) ;
- \`copie-correcteur-${L}.md\` : ${ITEMS.length} réponses à noter, chacune avec son code (« E-… ») et ce qui était attendu ;
- \`feuille-correcteur-${L}.csv\` : votre feuille de notes, une ligne par code.

## Avant de commencer : l'étalonnage à blanc (environ 10 minutes)
1. Lisez la grille en entier.
2. Allez à la fin de la grille, **« Annexe A : copies d'ancrage »** : 4 réponses sur la chaîne du froid, avec leurs
   notes C1, C2, C3, C4 et leur total.
3. **Cachez les notes**, notez vous-même les 4 copies, puis comparez. En cas d'écart, relisez la partie 1 de la
   grille pour comprendre la note donnée.
4. Cette annexe ne concerne que la reformulation (B2). Pour le transfert (B3) et le déblocage (B4), chaque réponse de
   votre copie est accompagnée d'exemples notés (2, 1 et 0 point ; juste, insuffisant, faux) : servez-vous-en de la
   même manière.

## Noter (environ 1 h 30, en une ou deux fois)
- **Seul**, sans en parler avec l'autre correcteur, ni avec personne d'autre, avant d'avoir rendu votre feuille.
- Dans l'ordre de votre copie. Pour chaque code, remplissez seulement les colonnes de sa grille :
  - **B2** : \`C1\`, \`C2\`, \`C3\`, \`C4\` ;
  - **B3** : \`B3\` ;
  - **B4** : \`Q1\` et \`Q2\` (la décision « débloqué, partiellement, non » est calculée à partir de vos deux notes :
    ne l'écrivez pas).
- Une note est toujours **0, 1 ou 2**, un nombre entier.
- En cas d'hésitation entre deux notes, mettez **la plus basse** et écrivez le critère dans la colonne \`hesitation\`
  (par exemple \`C4\`, ou \`C2 C4\` séparés par un **espace**, pas par une virgule ni un point-virgule).
- La colonne \`commentaire\` est libre et facultative.
- Ne cherchez pas de « bonne réponse » ailleurs que dans la grille et votre copie. **Ne consultez pas le dépôt Git du
  projet** : il contient la clé de l'exercice.

## Enregistrer et rendre la feuille
- Ouvrez \`feuille-correcteur-${L}.csv\` avec un tableur ou un éditeur de texte. Ne changez ni l'ordre des colonnes, ni
  les codes, ni la colonne \`grille\`.
- Enregistrez au format **CSV** (le séparateur virgule ou point-virgule est accepté), puis envoyez le fichier au
  coordinateur.
- **Une fois rendue, votre feuille n'est plus modifiée**, même si vous changez d'avis : c'est l'accord de départ entre
  les deux correcteurs qui est mesuré. Vous pourrez expliquer vos choix lors de la discussion qui suit.
`;
const out = {};
for (const L of ['A', 'B']) {
  const d = `remise/correcteur-${L}/`;
  out[d + 'consignes.md'] = consignes(L);
  out[d + 'grille-reformulation.md'] = GRILLE;
  out[d + `copie-correcteur-${L}.md`] = copie(L);
  out[d + `feuille-correcteur-${L}.csv`] = feuille(L);
}
if (process.argv.includes('--check')) {
  const bad = Object.entries(out).filter(([f, t]) => !fs.existsSync(path.join(DIR, f)) || fs.readFileSync(path.join(DIR, f), 'utf8') !== t).map(([f]) => f);
  console.log(bad.length ? 'PAS à jour : ' + bad.join(', ') : 'dossiers de remise à jour'); process.exit(bad.length ? 1 : 0);
}
for (const [f, t] of Object.entries(out)) { fs.mkdirSync(path.dirname(path.join(DIR, f)), { recursive: true }); fs.writeFileSync(path.join(DIR, f), t); }
console.log('écrit : ' + Object.keys(out).join(', '));
