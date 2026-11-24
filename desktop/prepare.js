/* Arbor Desktop : copie l'application web (seulement ce que le navigateur charge) dans desktop/dist.
   Ni tests, ni documents, ni fonctions serveur, ni fichiers personnels. Lancé par Tauri avant chaque construction. */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(__dirname, 'dist');
const KEEP = ['index.html', 'styles.css', 'manifest.webmanifest', 'sw.js', 'js', 'assets', 'icons'];
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const f of KEEP) fs.cpSync(path.join(ROOT, f), path.join(OUT, f), { recursive: true });
console.log(`Arbor Desktop : ${KEEP.length} éléments copiés dans ${path.relative(ROOT, OUT)}`);
