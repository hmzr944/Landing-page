/* Génère les deux copies (ordre différent pour chaque correcteur) et les deux feuilles de notes vides.
   Lancer depuis la racine :  node docs/pedagogie/etalonnage/generer.js   (--check : vérifie qu'elles sont à jour) */
const fs = require('fs'), path = require('path');
const { copie, feuille, DIR } = require('./etalonnage.js');
const out = { 'copie-correcteur-A.md': copie('A'), 'copie-correcteur-B.md': copie('B'), 'feuille-correcteur-A.csv': feuille('A'), 'feuille-correcteur-B.csv': feuille('B') };
if (process.argv.includes('--check')) {
  const bad = Object.entries(out).filter(([f, t]) => !fs.existsSync(path.join(DIR, f)) || fs.readFileSync(path.join(DIR, f), 'utf8') !== t).map(([f]) => f);
  console.log(bad.length ? 'PAS à jour : ' + bad.join(', ') : 'copies et feuilles à jour'); process.exit(bad.length ? 1 : 0);
}
for (const [f, t] of Object.entries(out)) fs.writeFileSync(path.join(DIR, f), t);
console.log('écrit : ' + Object.keys(out).join(', '));
