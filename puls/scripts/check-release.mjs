// Contrôle avant mise en production de PULS. Échoue (code 1) si une condition n'est pas remplie.
// Usage : npm run check:release
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];

// 1. Identité légale : obligatoire avant tout traitement de données personnelles réelles. Jamais inventée.
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(join(root, "config.js"), "utf8"), sandbox);
const cfg = sandbox.window.PULS_CONFIG || {};
const L = cfg.legal;
if (!L || !L.controller || !L.contactEmail) {
  problems.push("Informations légales à compléter : config.js > legal (responsable du traitement, contact). La page Confidentialité doit être finalisée.");
}

// 2. Point de collecte des demandes de démonstration.
if (!cfg.leadEndpoint) problems.push("Formulaire de démonstration non branché : config.js > leadEndpoint.");

// 3. Aucune clé secrète dans les fichiers servis au navigateur.
const SECRET = [/sk-[A-Za-z0-9_-]{20,}/, /sb_secret_[A-Za-z0-9_-]+/, /service_role["']?\s*[:=]\s*["'][^"']{20,}/, /eyJhbGciOi[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}/];
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  if (["node_modules", "supabase", "db", "site-src", "scripts", ".git"].includes(f)) return [];
  return statSync(p).isDirectory() ? walk(p) : /\.(html|js|json|webmanifest)$/.test(f) ? [p] : [];
});
for (const file of walk(root)) {
  const txt = readFileSync(file, "utf8");
  if (SECRET.some((re) => re.test(txt))) problems.push(`Clé secrète probable dans un fichier public : ${file.replace(root + "/", "")}`);
}

if (problems.length) {
  console.error("Mise en production refusée :\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log("Contrôles de mise en production : OK");
