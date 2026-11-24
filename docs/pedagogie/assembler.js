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

/* Ce qu'une question évalue : classement EXPLICITE, écrit et relu dans les sources (champ « evalue »), jamais deviné par
   une heuristique :
   - application : décider ou calculer dans un cas concret nouveau, en utilisant ce qui a été expliqué ;
   - compréhension : expliquer une cause ou un mécanisme (pourquoi, comment, que se passe-t-il si…) ;
   - restitution : redonner une définition, un nom ou un chiffre appris (mémorisation). */
const NIV = { application: 'application', 'compréhension': 'compréhension', restitution: 'restitution (mémorisation)' };
const BLOCS = [['comprehension', 'c'], ['rappel', 'r'], ['deblocage', 'd']];

function build() {
  const items = [...read('sujets-1.json'), ...read('sujets-2.json'), ...read('procedures.json')];
  return {
    nom: 'Jeu de mesure pédagogique, mission 3a',
    statut: 'proposition corrigée, à relire et valider avant toute mesure',
    genere_par: 'docs/pedagogie/assembler.js',
    note: 'Aucune question n\'est générée par Arbor. L\'ordre des choix est mélangé (graine fixe) ; « reponse » est l\'indice de la bonne réponse après mélange ; « evalue » vient des sources (classement relu).',
    elements: items.map((x) => {
      const o = { ...x };
      for (const [bloc, k] of BLOCS) o[bloc] = (x[bloc] || []).map((q, i) => {
        const { q: _q, choix: _c, reponse: _r, ...extra } = q; // evalue, source, criteres : recopiés tels quels
        return { ...shuffleQ(q, `${x.id}-${k}${i}`), ...extra };
      });
      return o;
    }),
  };
}

/* Biais de longueur : une bonne réponse plus longue que les autres est un indice qui permet de réussir sans
   comprendre. On compte, parmi les questions, celles où la bonne réponse est strictement la plus longue, et
   strictement la plus courte. Au hasard, on attend environ 25 % pour chacune. */
function biaisLongueur(qs) {
  let long = 0, court = 0, ratio = 0;
  for (const q of qs) {
    const L = q.choix.map((c) => c.length), b = L[q.reponse], d = L.filter((_, k) => k !== q.reponse);
    if (b > Math.max(...d)) long++;
    if (b < Math.min(...d)) court++;
    ratio += b / (d.reduce((s, v) => s + v, 0) / d.length);
  }
  return { n: qs.length, long, court, ratio: ratio / qs.length };
}
const fr = (x, d) => x.toFixed(d).replace('.', ',');
const pct = (a, n) => `${fr((a / n) * 100, 1)} %`;
function longueurs(j) {
  const L = ['## Bilan : longueur des réponses', '', 'Une bonne réponse plus longue que les autres est un indice qui permet de réussir sans comprendre. Au hasard, on attend environ 25 % de questions où la bonne réponse est la plus longue, et autant où elle est la plus courte. Seuils vérifiés par `tests/jeu-de-mesure.js` : entre 10 % et 35 % pour chacune, rapport moyen entre 0,85 et 1,15.', '',
    '| Bloc | Questions | Bonne réponse la plus longue | Bonne réponse la plus courte | Longueur moyenne bonne réponse / mauvaises |', '|---|---|---|---|---|'];
  for (const [nom, bloc] of [['Compréhension immédiate', 'comprehension'], ['Rappel à J+2', 'rappel'], ['Déblocage', 'deblocage']]) {
    const b = biaisLongueur(j.elements.flatMap((x) => x[bloc]));
    L.push(`| ${nom} | ${b.n} | ${b.long} (${pct(b.long, b.n)}) | ${b.court} (${pct(b.court, b.n)}) | ${fr(b.ratio, 2)} |`);
  }
  const t = biaisLongueur(j.elements.flatMap((x) => [...x.comprehension, ...x.rappel, ...x.deblocage]));
  L.push(`| **Total** | ${t.n} | ${t.long} (${pct(t.long, t.n)}) | ${t.court} (${pct(t.court, t.n)}) | ${fr(t.ratio, 2)} |`);
  return L;
}

function markdown(j) {
  const L = ['# Jeu de mesure pédagogique (mission 3a) : version de relecture', '',
    `Statut : **${j.statut}**. Généré par \`${j.genere_par}\` à partir des sources relues ; ne pas modifier ce fichier à la main.`, '',
    'La bonne réponse est marquée ✔ (ordre des choix mélangé). Les participants voient les questions sans cette marque.', '',
    'Chaque question porte un classement « évalue », **écrit et relu dans les sources** (pas deviné par un programme) : **application** (décider ou calculer dans un cas concret nouveau), **compréhension** (expliquer une cause ou un mécanisme) ou **restitution** (redonner une définition, un nom ou un chiffre appris, donc de la mémorisation).', '',
    'Règles de composition, vérifiées par `tests/jeu-de-mesure.js` : compréhension immédiate, au moins 2 questions sur 3 en application ou compréhension ; rappel à J+2, 3 restitutions (mesure de mémorisation) et 1 application ; déblocage, 2 questions préparées à l\'avance (sujets : 1 application, 1 compréhension ; procédures : 2 applications), posées seulement après la seconde explication, chacune avec les critères qui permettent de noter la justification.', '',
    'Procédures métier : chaque question cite la phrase de la procédure qui justifie la bonne réponse (« Appui dans la procédure »). Aucune raison non écrite dans la procédure n\'est attendue : quand la procédure ne donne pas la raison d\'une règle, la question porte sur son application.', ''];
  const all = j.elements.flatMap((x) => BLOCS.flatMap(([bloc, k]) => x[bloc].map((q) => [k, q.evalue])));
  const cnt = (part, n) => all.filter(([p, e]) => p === part && e === n).length;
  const row = (nom, k) => `| ${nom} (${all.filter(([p]) => p === k).length} questions) | ${cnt(k, 'application')} | ${cnt(k, 'compréhension')} | ${cnt(k, 'restitution')} |`;
  L.push('## Bilan : ce que les questions évaluent', '', '| Bloc | Application | Compréhension | Restitution (mémorisation) |', '|---|---|---|---|',
    row('Compréhension immédiate', 'c'), row('Rappel à J+2', 'r'), row('Déblocage', 'd'), '',
    ...longueurs(j), '',
    '| Élément | Compréhension immédiate (app. / comp. / rest.) | Rappel J+2 (app. / comp. / rest.) | Déblocage (app. / comp.) |', '|---|---|---|---|');
  const n3 = (qs, e) => qs.filter((q) => q.evalue === e).length;
  for (const x of j.elements) L.push(`| ${x.id} ${x.sujet} | ${n3(x.comprehension, 'application')} / ${n3(x.comprehension, 'compréhension')} / ${n3(x.comprehension, 'restitution')} | ${n3(x.rappel, 'application')} / ${n3(x.rappel, 'compréhension')} / ${n3(x.rappel, 'restitution')} | ${n3(x.deblocage, 'application')} / ${n3(x.deblocage, 'compréhension')} |`);
  L.push('');
  const list = (qs) => qs.forEach((q, i) => {
    L.push(`${i + 1}. ${q.q} *(évalue : ${NIV[q.evalue]})*`);
    q.choix.forEach((c, k) => L.push(`   - ${k === q.reponse ? '✔ ' : ''}${c}`));
    if (q.source) L.push(`   - *Appui dans la procédure :* ${q.source.map((t) => `« ${t} »`).join(' ')}`);
    if (q.criteres) {
      const c = q.criteres;
      L.push(`   - *Justification juste si elle contient :* ${c.raison}`,
        `   - *Exemple juste (2 points avec le bon choix) :* « ${c.juste} »`,
        `   - *Exemple insuffisant (1 point avec le bon choix) :* « ${c.insuffisant} »`,
        `   - *Exemple faux (0 point, même avec le bon choix) :* « ${c.faux} »`);
    }
  });
  for (const x of j.elements) {
    L.push(`## ${x.id} · ${x.sujet}`, '', `*Domaine : ${x.domaine}*`, '', `**Glossaire (termes à surveiller) :** ${x.glossaire.join(', ')}`, '', '**Compréhension immédiate**', '');
    list(x.comprehension);
    L.push('', `**Situation de transfert :** ${x.transfert.situation}`, '', `> ${x.transfert.question}`, '', `*Réponse attendue :* ${x.transfert.attendu}`, '',
      ...(x.transfert.source ? [`*Appui dans la procédure :* ${x.transfert.source.map((t) => `« ${t} »`).join(' ')}`, ''] : []),
      ...(x.transfert.criteres ? ['*Notation du transfert (sur 2, `grille-reformulation.md`, partie 2) :*', '',
        `- élément 1, la décision ou la conclusion : ${x.transfert.criteres.decision}`,
        `- élément 2, la raison : ${x.transfert.criteres.raison}`,
        `- 2 points, exemple : « ${x.transfert.criteres.note2} »`,
        `- 1 point, exemple : « ${x.transfert.criteres.note1} »`,
        `- 0 point, exemple : « ${x.transfert.criteres.note0} »`, ''] : []),
      '**Déblocage** *(seulement si la compréhension immédiate donne moins de 2 sur 3, ou si la personne se dit bloquée ; posé après le transfert et la seconde explication ; notation : `grille-reformulation.md`, partie 3)*', '');
    list(x.deblocage);
    L.push('', '**Rappel à J+2**', '');
    list(x.rappel);
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
module.exports = { build, markdown, biaisLongueur };
