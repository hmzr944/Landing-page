/* Exercice d'étalonnage des correcteurs (mission 3a) : vérifie le matériel et le calcul de l'accord.
   Ne mesure rien : aucune note de correcteur n'est simulée dans les fichiers de l'exercice. Les feuilles de test
   ci-dessous sont écrites dans un dossier temporaire et supprimées à la fin.
   Lancer depuis la racine :  node tests/etalonnage.js */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const E = require(path.join(ROOT, 'docs/pedagogie/etalonnage/etalonnage.js'));
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' : ' + extra : ''}`); if (!ok) failed++; };
const items = E.ITEMS, jeu = E.JEU(), el = (id) => jeu.elements.find((x) => x.id === id);
const n = (g) => items.filter((i) => i.grille === g).length;

check('E1 réponses fictives : identifiants uniques, trois grilles', new Set(items.map((i) => i.id)).size === items.length && n('B2') >= 12 && n('B3') >= 12 && n('B4') >= 10, `B2 ${n('B2')}, B3 ${n('B3')}, B4 ${n('B4')}`);
const refBad = items.filter((i) => !el(i.element) || (i.grille === 'B4' && [[i.q1, 0], [i.q2, 1]].some(([q, k]) => !el(i.element).deblocage[k].choix.includes(q.choix))));
check('E2 chaque réponse renvoie à un élément du jeu ; chaque choix de déblocage est recopié mot pour mot', !refBad.length, refBad.map((i) => i.id).join(', '));
const prevBad = items.filter((i) => {
  const v = i.grille === 'B2' ? [i.prevu.C1, i.prevu.C2, i.prevu.C3, i.prevu.C4] : i.grille === 'B3' ? [i.prevu.note] : [i.prevu.Q1, i.prevu.Q2];
  if (v.some((x) => ![0, 1, 2].includes(x))) return true;
  if (i.grille === 'B4') { const bon = (q, k) => el(i.element).deblocage[k].choix[el(i.element).deblocage[k].reponse] === q.choix; if ((!bon(i.q1, 0) && i.prevu.Q1 !== 0) || (!bon(i.q2, 1) && i.prevu.Q2 !== 0)) return true; return E.decision(i.prevu.Q1, i.prevu.Q2) !== i.prevu.decision; }
  return false;
});
check('E3 notes prévues cohérentes : valeurs 0, 1, 2 ; mauvais choix noté 0 ; décision = somme des deux questions', !prevBad.length, prevBad.map((i) => i.id).join(', '));

// Couverture demandée
const TYPES = ['entièrement correcte', 'partiellement correcte', 'réponse fausse', 'réponse ambiguë', 'bonne réponse avec justification incorrecte', 'bonne conclusion sans justification', 'erreur de calcul avec méthode correcte', 'raisonnement avec contradiction', 'courte, maladroite, avec fautes, mais juste', 'vocabulaire technique sans compréhension démontrée', 'exemple personnel pertinent', 'un critère réussi, un autre échoué', 'raison vraie non écrite dans la procédure', 'procédure métier', 'calcul', 'erreur de fond', 'bon choix et justification correcte', 'bon choix et justification insuffisante', 'bon choix et justification fausse', 'mauvais choix'];
const manque = TYPES.filter((t) => !items.some((i) => i.types.includes(t)));
check('E4 tous les types de réponses demandés sont présents', !manque.length, manque.join(', '));
const couvre = (g, f, vals) => vals.every((v) => items.some((i) => i.grille === g && i.prevu[f] === v));
const crit = ['C1', 'C2', 'C3', 'C4'].filter((c) => !couvre('B2', c, [0, 1, 2]));
check('E5 B2 : chaque critère C1 à C4 est prévu à 0, 1 et 2 dans au moins une réponse', !crit.length, crit.join(', '));
check('E6 B3 : notes 0, 1 et 2 ; calculs ; procédures ; raison vraie non écrite ; contradiction', couvre('B3', 'note', [0, 1, 2]) && ['calcul', 'procédure métier', 'raison vraie non écrite dans la procédure', 'raisonnement avec contradiction', 'erreur de fond'].every((t) => items.some((i) => i.grille === 'B3' && i.types.includes(t))));
check('E7 B4 : questions notées 0, 1 et 2, et les trois décisions (débloqué, partiellement, non débloqué)', couvre('B4', 'Q1', [0, 1, 2]) && couvre('B4', 'Q2', [0, 1, 2]) && E.DECISIONS.every((d) => items.some((i) => i.grille === 'B4' && i.prevu.decision === d)));

// Copies
const dir = path.join(ROOT, 'docs/pedagogie/etalonnage'), rd = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
const map = E.codes(), all = Object.values(map);
const ordre = (txt) => [...txt.matchAll(/^## Réponse (E-\w{4})$/gm)].map((m) => m[1]);
const oA = ordre(rd('remise/correcteur-A/copie-correcteur-A.md')), oB = ordre(rd('remise/correcteur-B/copie-correcteur-B.md'));
check('E8 deux copies avec les mêmes réponses, chacune une seule fois', oA.length === items.length && oB.length === items.length && [...new Set(oA)].sort().join() === [...all].sort().join() && [...new Set(oB)].sort().join() === [...all].sort().join());
const memePlace = oA.filter((c, i) => oB[i] === c).length;
check('E9 ordre différent pour chaque correcteur (moins de 20 % de réponses à la même place)', memePlace < 0.2 * items.length, `${memePlace} à la même place`);
const fuite = [];
const REMISE = ['A', 'B'].flatMap((L) => fs.readdirSync(path.join(dir, 'remise', `correcteur-${L}`)).map((f) => `remise/correcteur-${L}/${f}`));
for (const f of REMISE) {
  const t = rd(f);
  for (const i of items) { if (t.includes(i.pourquoi)) fuite.push(`${f} : raison du concepteur ${i.id}`); if (new RegExp(`\\b${i.id}\\b`).test(t)) fuite.push(`${f} : référence ${i.id}`); }
  for (const tp of TYPES.filter((x) => x.length > 15)) if (t.includes(tp)) fuite.push(`${f} : type « ${tp} »`);
  for (const mot of ['prevu', 'Note prévue', 'cas limite', 'Cas limite']) if (t.includes(mot)) fuite.push(`${f} : « ${mot} »`);
}
check('E10 les dossiers de remise ne contiennent rien de la clé (types, notes prévues, raisons, références)', !fuite.length, fuite.slice(0, 5).join(' ; '));
const feuilleBad = ['A', 'B'].filter((L) => { const r = E.parseCSV(rd(`remise/correcteur-${L}/feuille-correcteur-${L}.csv`)).data; return r.length !== items.length || r.some((x) => !all.includes(x.code) || x.C1 || x.B3 || x.Q1); });
check('E11 feuilles de notes vides, une ligne par réponse', !feuilleBad.length, feuilleBad.join(', '));

// Calcul de l'accord
const near = (a, b) => a !== null && Math.abs(a - b) < 1e-9;
check('E12 kappa pondéré quadratique : accord parfait = 1', near(E.kappaQ([0, 1, 2, 1], [0, 1, 2, 1], 3), 1));
check('E13 kappa pondéré quadratique : exemple calculé à la main = 0,75', near(E.kappaQ([0, 0, 1, 1, 2, 2], [0, 1, 1, 2, 2, 2], 3), 0.75));
{ // seconde méthode, indépendante : kappa quadratique = 2·cov / (var x + var y + (moy x − moy y)²), moments de population
  const r = ((seed) => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; })(42); let ecart = 0;
  for (let t = 0; t < 50; t++) { const x = [], y = []; for (let i = 0; i < 12; i++) { const a = Math.floor(r() * 3); x.push(a); y.push(r() < 0.6 ? a : Math.floor(r() * 3)); }
    const m = (v) => v.reduce((s, z) => s + z, 0) / v.length, mx = m(x), my = m(y), vx = m(x.map((z) => (z - mx) ** 2)), vy = m(y.map((z) => (z - my) ** 2)), cv = m(x.map((z, i) => (z - mx) * (y[i] - my)));
    const ref = 2 * cv / (vx + vy + (mx - my) ** 2), k = E.kappaQ(x, y, 3); if (k !== null) ecart = Math.max(ecart, Math.abs(k - ref)); }
  check('E13b kappa identique à une seconde méthode de calcul indépendante, sur 50 jeux de notes', ecart < 1e-9, `écart maximal ${ecart.toExponential(1)}`);
}
check('E14 kappa : désaccord systématique négatif ; notes sans variation : non calculable', E.kappaQ([0, 2, 0, 2], [2, 0, 2, 0], 3) < 0 && E.kappaQ([1, 1, 1], [1, 1, 1], 3) === null);

// Intervalle de confiance (rééchantillonnage)
{
  const x = [0, 1, 2, 0, 1, 2, 2, 1, 0, 1, 2, 0], y = [0, 1, 2, 1, 1, 2, 1, 1, 0, 2, 2, 0], k = E.kappaQ(x, y, 3), i1 = E.ic(x, y, 3), i2 = E.ic(x, y, 3);
  check('E25 IC : accord parfait → [1 ; 1]', JSON.stringify(E.ic([0, 1, 2, 1, 0, 2], [0, 1, 2, 1, 0, 2], 3)) === '[1,1]');
  check('E26 IC : bornes ordonnées, dans [−1 ; 1], encadrant le kappa observé, et reproductibles (graine fixe)', i1 && i1[0] <= k && k <= i1[1] && i1[0] >= -1 && i1[1] <= 1 && JSON.stringify(i1) === JSON.stringify(i2), `kappa ${k.toFixed(3)}, IC ${i1 && i1.map((v) => v.toFixed(3)).join(' à ')}`);
  check('E27 IC : notes sans aucune variation → non calculable (pas d\'intervalle inventé)', E.ic([1, 1, 1, 1], [1, 1, 1, 1], 3) === null);
}

// Bout en bout sur des feuilles de test (dossier temporaire, jamais dans le dépôt)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'etal-'));
const ecrire = (f, modif) => {
  const lignes = [E.COLS.join(',')];
  for (const it of items) {
    const p = { ...it.prevu, B3: it.prevu.note }, m = modif[it.id] || {}, v = { ...p, ...m };
    lignes.push([map[it.id], it.grille, ...(it.grille === 'B2' ? [v.C1, v.C2, v.C3, v.C4, '', '', ''] : it.grille === 'B3' ? ['', '', '', '', v.B3, '', ''] : ['', '', '', '', '', v.Q1, v.Q2]), m.h || '', '"note de test, avec virgule"'].join(','));
  }
  fs.writeFileSync(path.join(tmp, f), lignes.join('\n') + '\n');
  return E.lireFeuille(path.join(tmp, f));
};
const A = ecrire('a.csv', {}), B = ecrire('b.csv', { 'B2-03': { C4: 2, h: 'C4' }, 'B3-05': { B3: 1, h: 'B3' }, 'B4-11': { Q2: 0 } });
const r = E.accord(A.notes, B.notes);
const des = r.desaccords.map((d) => `${d.id}:${d.champ}`).sort().join(' ');
check('E15 désaccords retrouvés, y compris le changement de décision qu\'entraîne une note de question', des === 'B2-03:C4 B3-05:B3 B4-11:Q2 B4-11:décision', des);
check('E16 hésitations classées en tête ; accord exact recalculé', r.hesitations[0] && ['B2-03', 'B3-05'].includes(r.hesitations[0].id) && r.mesures.find((m) => m.nom === 'B3 note sur 2').exact === n('B3') - 1);
// Données invalides : chaque défaut est signalé, et le rapport ne calcule alors aucun accord
const valide = fs.readFileSync(path.join(tmp, 'a.csv'), 'utf8'), lignes = valide.trimEnd().split('\n');
const essai = (nom, txt) => { fs.writeFileSync(path.join(tmp, nom), txt); return E.lireFeuille(path.join(tmp, nom)).erreurs; };
const remplace = (code, f) => lignes.map((l) => (l.startsWith(code + ',') ? f(l) : l)).join('\n') + '\n';
const b2 = map['B2-01'], b3 = map['B3-01'], b4 = map['B4-01'];
const CAS = [
  ['note 3', remplace(b3, (l) => l.replace(/^([^,]*,B3,,,,,)2/, '$13')), `${b3} : B3`],
  ['note 1,5 (entre guillemets)', remplace(b3, (l) => l.replace(/^([^,]*,B3,,,,,)2/, '$1"1,5"')), `${b3} : B3`],
  ['note vide', remplace(b2, (l) => l.replace(/^([^,]*,B2,)2/, '$1')), `${b2} : C1`],
  ['code en double', valide + lignes.find((l) => l.startsWith(b3)) + '\n', 'présent deux fois'],
  ['code inconnu', valide + 'E-ZZZZ,B3,,,,,1,,,,\n', 'E-ZZZZ : code inconnu'],
  ['code absent', lignes.filter((l) => !l.startsWith(b4)).join('\n') + '\n', `${b4} : absent`],
  ['grille modifiée', remplace(b3, (l) => l.replace(',B3,', ',B2,')), 'grille « B2 »'],
  ['note dans la colonne d\'une autre grille', remplace(b2, (l) => l.replace(/^([^,]*,B2,\d,\d,\d,\d,)/, '$11')), 'rempli alors que'],
  ['colonne manquante', valide.replace('hesitation,', ''), 'colonnes absentes'],
  ['hésitations séparées par une virgule non protégée', remplace(b2, (l) => l.replace(/,,"note/, ',C2,C4,"note')), 'plus de valeurs que de colonnes'],
];
const rates = CAS.filter(([, txt, attendu], i) => !essai(`inv${i}.csv`, txt).some((e) => e.includes(attendu))).map(([nom]) => nom);
check(`E17 ${CAS.length} sortes de données invalides signalées (note hors de 0, 1, 2, vide, double, inconnue, absente, grille, colonnes)`, !rates.length, rates.join(', '));
const pv = valide.replace(/^﻿?/, '﻿').split('\n').map((l) => l.replace(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g, ';')).join('\r\n');
const lpv = essai('pv.csv', pv);
check('E21 feuille enregistrée par un tableur réglé en français (point-virgule, BOM, fins de ligne Windows) acceptée telle quelle', !lpv.length && Object.keys(E.lireFeuille(path.join(tmp, 'pv.csv')).notes).length === items.length, lpv.slice(0, 2).join(' ; '));
check('E22 la feuille de test valide ne produit aucune erreur', !A.erreurs.length && !B.erreurs.length, [...A.erreurs, ...B.erreurs].slice(0, 2).join(' ; '));
{ // rapport : refuse de calculer sur une feuille invalide, calcule sur des feuilles valides
  const d1 = path.join(tmp, 'ok'), d2 = path.join(tmp, 'ko'); fs.mkdirSync(d1); fs.mkdirSync(d2);
  fs.copyFileSync(path.join(tmp, 'a.csv'), path.join(d1, 'notes-correcteur-A.csv')); fs.copyFileSync(path.join(tmp, 'b.csv'), path.join(d1, 'notes-correcteur-B.csv'));
  fs.copyFileSync(path.join(tmp, 'a.csv'), path.join(d2, 'notes-correcteur-A.csv')); fs.copyFileSync(path.join(tmp, 'inv0.csv'), path.join(d2, 'notes-correcteur-B.csv'));
  const rap = (d) => { process.env.ETALONNAGE_NOTES_DIR = d; delete require.cache[require.resolve(path.join(dir, 'rapport.js'))]; const t = require(path.join(dir, 'rapport.js')).build(); delete process.env.ETALONNAGE_NOTES_DIR; return t; };
  const ok = rap(d1), ko = rap(d2);
  check('E23 rapport : feuilles valides → statut MESURÉ, accords et désaccords calculés', /\*\*MESURÉ\*\*/.test(ok) && /\| B4 décision \| 13 \|/.test(ok) && /B2-03 \| C4/.test(ok));
  check('E24 rapport : une feuille invalide → aucun accord calculé, erreurs listées', /FEUILLES INCOMPLÈTES/.test(ko) && !/\| B4 décision \| 13 \|/.test(ko) && ko.includes(`${b3} : B3`));
}
fs.rmSync(tmp, { recursive: true });

// Fichiers générés à jour ; grille et jeu de mesure intacts
for (const [nom, script] of [['E18 copies et feuilles à jour', 'generer.js'], ['E19 rapport à jour', 'rapport.js']]) {
  try { execFileSync('node', [path.join(dir, script), '--check'], { stdio: 'pipe' }); check(nom, true); } catch (e) { check(nom, false, String(e.stdout || '').trim()); }
}
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex');
const GELES = { 'docs/pedagogie/grille-reformulation.md': 'ad04fb422f1773d1947389cae74f581790ec606fe1f1c8c477b06297eb99815c', 'docs/pedagogie/jeu-de-mesure.json': '3abd95ebcee3afc193d7f45905317a4c422e8be6d297142d2a58e2efd2443257', 'docs/protocole-mission-3a.md': 'ccbfb1896b084922a9180ad631a762a3515c63003e9868f6e857bb9161b6938b' };
const modifies = Object.entries(GELES).filter(([f, h]) => sha(f) !== h).map(([f]) => f);
check('E20 grille, jeu de mesure et protocole identiques à la version 523f730 (aucune modification automatique)', !modifies.length, modifies.join(', '));

const grilleRemise = ['A', 'B'].filter((L) => sha(`docs/pedagogie/etalonnage/remise/correcteur-${L}/grille-reformulation.md`) !== GELES['docs/pedagogie/grille-reformulation.md']);
const annexe = rd('remise/correcteur-A/grille-reformulation.md').includes("## Annexe A : copies d'ancrage") && rd('remise/correcteur-A/consignes.md').includes('Annexe A');
check('E28 chaque dossier de remise contient la grille 523f730 à l\'identique, avec son annexe A d\'ancrage, citée dans les consignes', !grilleRemise.length && annexe, grilleRemise.join(', '));

console.log(failed ? `\n${failed} échec(s)` : '\nTous les tests passent');
process.exit(failed ? 1 : 0);
