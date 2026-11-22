/* Assemble le jeu de mesure de la mission 3a à partir des sources relues (sujets-1.json, sujets-2.json, procedures.json).
   - Mélange l'ordre des choix de chaque question, de façon déterministe (graine fixe) : dans les sources, la bonne
     réponse est souvent écrite en premier ; sans ce mélange, la mesure serait biaisée.
   - Écrit jeu-de-mesure.json (pour le futur script de mesure) et jeu-de-mesure.md (version lisible, pour relecture).
   Lancer depuis la racine :  node docs/pedagogie/assembler.js   (--check : vérifie que les deux fichiers sont à jour) */
const fs = require('fs'), path = require('path');
const DIR = __dirname;
const read = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));

// Générateur pseudo-aléatoire à graine fixe (mulberry32) : même mélange à chaque exécution
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const seedOf = (s) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
function shuffleQ(q, key) {
  const r = rng(seedOf(key)), idx = q.choix.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return { q: q.q, choix: idx.map((i) => q.choix[i]), reponse: idx.indexOf(q.reponse) };
}

function build() {
  const items = [...read('sujets-1.json'), ...read('sujets-2.json'), ...read('procedures.json')];
  return {
    nom: 'Jeu de mesure pédagogique, mission 3a',
    statut: 'proposition à relire et valider avant toute mesure',
    genere_par: 'docs/pedagogie/assembler.js',
    note: 'Aucune question n\'est générée par Arbor. L\'ordre des choix est mélangé (graine fixe) ; « reponse » est l\'indice de la bonne réponse après mélange.',
    elements: items.map((x) => ({
      ...x,
      comprehension: x.comprehension.map((q, i) => shuffleQ(q, `${x.id}-c${i}`)),
      rappel: x.rappel.map((q, i) => shuffleQ(q, `${x.id}-r${i}`)),
    })),
  };
}

function markdown(j) {
  const L = ['# Jeu de mesure pédagogique (mission 3a) : version de relecture', '',
    `Statut : **${j.statut}**. Généré par \`${j.genere_par}\` à partir des sources relues ; ne pas modifier ce fichier à la main.`, '',
    'La bonne réponse est marquée ✔ (ordre des choix mélangé). Les participants voient les questions sans cette marque.', ''];
  for (const x of j.elements) {
    L.push(`## ${x.id} · ${x.sujet}`, '', `*Domaine : ${x.domaine}*`, '', `**Glossaire (termes à surveiller) :** ${x.glossaire.join(', ')}`, '', '**Compréhension immédiate**', '');
    x.comprehension.forEach((q, i) => { L.push(`${i + 1}. ${q.q}`); q.choix.forEach((c, k) => L.push(`   - ${k === q.reponse ? '✔ ' : ''}${c}`)); });
    L.push('', `**Situation de transfert :** ${x.transfert.situation}`, '', `> ${x.transfert.question}`, '', `*Réponse attendue :* ${x.transfert.attendu}`, '', '**Rappel à J+2**', '');
    x.rappel.forEach((q, i) => { L.push(`${i + 1}. ${q.q}`); q.choix.forEach((c, k) => L.push(`   - ${k === q.reponse ? '✔ ' : ''}${c}`)); });
    L.push('', `**Reformulation, idée centrale :** ${x.reformulation.idee_centrale}`, '', `**Éléments clés :** ${x.reformulation.elements_cles.join(' ; ')}`, '');
  }
  return L.join('\n') + '\n';
}

if (require.main === module) {
  const j = build(), json = JSON.stringify(j, null, 2) + '\n', md = markdown(j);
  const fj = path.join(DIR, 'jeu-de-mesure.json'), fm = path.join(DIR, 'jeu-de-mesure.md');
  if (process.argv.includes('--check')) {
    const ok = fs.existsSync(fj) && fs.readFileSync(fj, 'utf8') === json && fs.existsSync(fm) && fs.readFileSync(fm, 'utf8') === md;
    console.log(ok ? 'jeu de mesure à jour' : 'jeu de mesure PAS à jour : relancer node docs/pedagogie/assembler.js');
    process.exit(ok ? 0 : 1);
  }
  fs.writeFileSync(fj, json); fs.writeFileSync(fm, md);
  console.log(`écrit jeu-de-mesure.json et jeu-de-mesure.md : ${j.elements.length} éléments`);
}
module.exports = { build, markdown };
