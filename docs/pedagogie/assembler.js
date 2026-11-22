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

/* Ce qu'une question évalue (repère pour la relecture, classement automatique à vérifier par un humain) :
   - application : un calcul ou une décision dans un cas concret (« Que fais-tu », « Un client… », un montant) ;
   - compréhension : expliquer une cause ou un mécanisme (« pourquoi », « comment ») ;
   - restitution : redonner une définition, un nom ou un chiffre appris (mémorisation). */
function niveau(t) {
  if (/\b(que fais-tu|acceptes-tu|es-tu obligé)\b/i.test(t) || /^(un client|une livraison|ton tiroir|tu |une pizza|si |un objet|dans un triangle|triangle rectangle|tu places|avec \d|\d)/i.test(t) || /(combien (as-tu|coûte|mesure)|devient|deviennent)/i.test(t)) return 'application';
  if (/\b(pourquoi|comment)\b/i.test(t)) return 'compréhension';
  return 'restitution';
}
const NIV = { application: 'application', 'compréhension': 'compréhension', restitution: 'restitution (mémorisation)' };

function build() {
  const items = [...read('sujets-1.json'), ...read('sujets-2.json'), ...read('procedures.json')];
  return {
    nom: 'Jeu de mesure pédagogique, mission 3a',
    statut: 'proposition à relire et valider avant toute mesure',
    genere_par: 'docs/pedagogie/assembler.js',
    note: 'Aucune question n\'est générée par Arbor. L\'ordre des choix est mélangé (graine fixe) ; « reponse » est l\'indice de la bonne réponse après mélange.',
    elements: items.map((x) => ({
      ...x,
      comprehension: x.comprehension.map((q, i) => ({ ...shuffleQ(q, `${x.id}-c${i}`), evalue: niveau(q.q) })),
      rappel: x.rappel.map((q, i) => ({ ...shuffleQ(q, `${x.id}-r${i}`), evalue: niveau(q.q) })),
    })),
  };
}

function markdown(j) {
  const L = ['# Jeu de mesure pédagogique (mission 3a) : version de relecture', '',
    `Statut : **${j.statut}**. Généré par \`${j.genere_par}\` à partir des sources relues ; ne pas modifier ce fichier à la main.`, '',
    'La bonne réponse est marquée ✔ (ordre des choix mélangé). Les participants voient les questions sans cette marque.', '',
    'Chaque question porte un repère « évalue » : **application** (calcul ou décision dans un cas concret), **compréhension** (expliquer une cause ou un mécanisme) ou **restitution** (redonner une définition ou un chiffre appris, donc de la mémorisation). Ce repère est un classement automatique, à vérifier à la relecture.', ''];
  const all = j.elements.flatMap((x) => [...x.comprehension.map((q) => ['c', q.evalue]), ...x.rappel.map((q) => ['r', q.evalue])]);
  const cnt = (part, n) => all.filter(([p, e]) => p === part && e === n).length;
  L.push('## Bilan : ce que les questions évaluent', '', '| Bloc | Application | Compréhension | Restitution (mémorisation) |', '|---|---|---|---|',
    `| Compréhension immédiate (${all.filter(([p]) => p === 'c').length} questions) | ${cnt('c', 'application')} | ${cnt('c', 'compréhension')} | ${cnt('c', 'restitution')} |`,
    `| Rappel à J+2 (${all.filter(([p]) => p === 'r').length} questions) | ${cnt('r', 'application')} | ${cnt('r', 'compréhension')} | ${cnt('r', 'restitution')} |`, '',
    '**Lecture critique :** une grande partie des questions de « compréhension » sont en réalité des questions de restitution (définitions). Elles vérifient que l\'on se souvient, pas que l\'on a compris. La compréhension est surtout mesurée par la situation de transfert et par la reformulation. Proposition de règle, à valider avant toute mesure : dans chaque sujet, au moins 2 des 3 questions de compréhension en application ou en compréhension ; au rappel à J+2, au plus 1 restitution sur 3.', '',
    '| Élément | Compréhension immédiate : restitutions | Rappel J+2 : restitutions |', '|---|---|---|');
  for (const x of j.elements) L.push(`| ${x.id} ${x.sujet} | ${x.comprehension.filter((q) => q.evalue === 'restitution').length} / 3 | ${x.rappel.filter((q) => q.evalue === 'restitution').length} / 3 |`);
  L.push('');
  for (const x of j.elements) {
    L.push(`## ${x.id} · ${x.sujet}`, '', `*Domaine : ${x.domaine}*`, '', `**Glossaire (termes à surveiller) :** ${x.glossaire.join(', ')}`, '', '**Compréhension immédiate**', '');
    x.comprehension.forEach((q, i) => { L.push(`${i + 1}. ${q.q} *(évalue : ${NIV[q.evalue]})*`); q.choix.forEach((c, k) => L.push(`   - ${k === q.reponse ? '✔ ' : ''}${c}`)); });
    L.push('', `**Situation de transfert :** ${x.transfert.situation}`, '', `> ${x.transfert.question}`, '', `*Réponse attendue :* ${x.transfert.attendu}`, '', '**Rappel à J+2**', '');
    x.rappel.forEach((q, i) => { L.push(`${i + 1}. ${q.q} *(évalue : ${NIV[q.evalue]})*`); q.choix.forEach((c, k) => L.push(`   - ${k === q.reponse ? '✔ ' : ''}${c}`)); });
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
