/* Vérifie une ou plusieurs fiches pédagogiques (format v1) et écrit le rapport à joindre à un lot de relecture :
   règles bloquantes, avertissements, chevauchements avec le jeu de mesure 3a, et les 3 éléments du jeu les plus proches
   de chaque élément de la fiche.
   Usage :  node tools/fiche-verifier.js <fiche.json> [autres fiches…] [--catalogue] [--jeu <jeu-de-mesure.json>]
   Code de sortie : 0 si aucune fiche n'a de règle bloquante en échec, 1 sinon. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');
const V = require(path.join(ROOT, 'js/pedagogie/fiche-validateur.js'));
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const fichierJeu = opt('--jeu') || path.join(ROOT, 'tests/fixtures/jeu-3a/jeu-de-mesure.json');
const fiches = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--jeu');
if (!fiches.length) { console.error('Usage : node tools/fiche-verifier.js <fiche.json> [autres fiches…] [--catalogue] [--jeu <fichier>]'); process.exit(2); }
const texteJeu = fs.existsSync(fichierJeu) ? fs.readFileSync(fichierJeu, 'utf8') : null;
const opts = { jeu: texteJeu ? JSON.parse(texteJeu) : null, shaJeu: texteJeu ? crypto.createHash('sha256').update(texteJeu).digest('hex') : null, catalogue: args.includes('--catalogue') };
const esc = (t) => String(t).replace(/\|/g, '\\|').replace(/\n/g, ' ');
let echec = false;
for (const f of fiches) {
  const fiche = JSON.parse(fs.readFileSync(f, 'utf8')), r = V.valider(fiche, opts), m = fiche.meta || {};
  if (r.bloquants.length) echec = true;
  const L = [`# Rapport de vérification : ${m.notion || f}`, '',
    `- Fiche : \`${path.basename(f)}\` · identifiant \`${m.id}\` · version ${m.version} · origine ${m.origine}${m.essai ? ' · **fiche d’essai fabriquée**' : ''}`,
    `- Statut : **${r.statut}** · utilisable comme parcours complet : **${r.utilisable ? 'oui' : 'non'}**`,
    `- Empreinte du contenu : \`${r.empreinte}\``,
    `- Jeu de mesure 3a : ${r.chevauchement.verifiable ? `vérifié (empreinte \`${opts.shaJeu.slice(0, 12)}…\`)` : `**non vérifiable** : ${r.chevauchement.raison}`}`, '',
    `## Règles bloquantes : ${r.bloquants.length ? `${r.bloquants.length} en échec` : 'aucune en échec'}`, ''];
  r.bloquants.forEach((b) => L.push(`- **${b.regle}** (\`${b.chemin}\`) : ${b.message}`));
  L.push('', `## Avertissements : ${r.avertissements.length || 'aucun'}`, '');
  r.avertissements.forEach((a) => L.push(`- ${a.regle} (\`${a.chemin}\`) : ${a.message}`));
  L.push('', `## Chevauchements avec le jeu 3a : ${r.chevauchement.chevauchements.length || 'aucun'}`, '');
  if (r.chevauchement.chevauchements.length) {
    L.push('| Élément de la fiche | Élément du jeu 3a | Règles | Jaccard |', '|---|---|---|---|');
    r.chevauchement.chevauchements.forEach((c) => L.push(`| \`${c.chemin}\` « ${esc(c.fiche)} » | ${c.ref} « ${esc(c.jeu)} » | ${c.regles.join(', ')} | ${c.jaccard.toFixed(2)} |`));
  }
  L.push('', '## Plus proches voisins dans le jeu 3a (pour la relecture, même sous les seuils)', '', '| Élément de la fiche | 1er | 2e | 3e |', '|---|---|---|---|');
  r.chevauchement.voisins.forEach((v) => L.push(`| \`${v.chemin}\` « ${esc(v.texte).slice(0, 90)} » | ${v.proches.map((p) => `${p.ref} (${p.jaccard.toFixed(2)})`).join(' | ')} |`));
  L.push('', '_Le validateur contrôle la structure, l’ordre, la cohérence et le non-chevauchement mesurable. Il ne contrôle pas la justesse pédagogique : c’est l’objet de la relecture humaine._', '');
  console.log(L.join('\n'));
}
if (fiches.length > 1) { const b = V.biaisCatalogue(fiches.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')))); console.log(`## Biais de longueur sur l’ensemble (seuils J16 à J19)\n\nBonne réponse la plus longue ${b.long}/${b.n}, la plus courte ${b.court}/${b.n}, rapport ${b.ratio.toFixed(2)} : **${b.conforme ? 'conforme' : 'non conforme'}**\n`); }
process.exit(echec ? 1 : 0);
