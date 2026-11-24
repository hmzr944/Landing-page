/* Mission 3b-0 : format de fiche pédagogique v1, validateur, empreinte et statuts, contrôle de non-chevauchement.
   Tests unitaires, de propriétés (graine fixe), de mutation, et de non-régression (périmètre et empreintes).
   Aucune fiche réelle : uniquement des fiches d'essai fabriquées (tests/fixtures/fiches) et le jeu 3a figé.
   Lancer depuis la racine :  node tests/fiche.js */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const V = require(path.join(ROOT, 'js/pedagogie/fiche-validateur.js'));
const E = require(path.join(ROOT, 'js/pedagogie/fiche-empreinte.js'));
const C = require(path.join(ROOT, 'js/pedagogie/chevauchement.js'));
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' : ' + extra : ''}`); if (!ok) failed++; };
const clone = (x) => JSON.parse(JSON.stringify(x));
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const jeuTexte = rd('tests/fixtures/jeu-3a/jeu-de-mesure.json');
const jeu = JSON.parse(jeuTexte), shaJeu = crypto.createHash('sha256').update(jeuTexte).digest('hex');
const EJ = C.elementsJeu(jeu);
const OPTS = { jeu, shaJeu, elementsJeu: EJ };
const FICHES = Object.fromEntries(fs.readdirSync(path.join(ROOT, 'tests/fixtures/fiches')).map((f) => [f.replace('.json', ''), JSON.parse(rd(`tests/fixtures/fiches/${f}`))]));
const BASE = FICHES['essai-levier'];
const regles = (r) => [...new Set(r.bloquants.map((b) => b.regle))];

// ── 0. Jeu 3a figé ──
check('F00 jeu 3a : copie identique à la version 523f730 (empreinte 3abd95eb…)', shaJeu === C.SHA_JEU_3A, shaJeu.slice(0, 12));

// ── 1. SHA-256 et empreinte ──
const vecteurs = ['', 'abc', 'é à ç 漢字 🙂', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'a'.repeat(1000)];
check('F01 SHA-256 en JavaScript pur identique à celui de Node', vecteurs.every((s) => E.sha256(s) === crypto.createHash('sha256').update(s).digest('hex')));
{
  const inverse = (v) => (Array.isArray(v) ? v.map(inverse) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).reverse().map((k) => [k, inverse(v[k])])) : v);
  const a = clone(BASE), b = inverse(clone(BASE));
  b.situation.texte = '  ' + b.situation.texte.replace(/ /g, '  ') + ' ';
  const c = clone(BASE); c.meta.statut = 'en_relecture'; c.validation = { date: '2026-11-24', lot: 1, version: 1, empreinte: 'x', role: 'responsable produit' };
  const d = clone(BASE); d.situation.texte = d.situation.texte.replace('pierre', 'Pierre');
  check('F02 empreinte stable si l’ordre des clés, les espaces, le statut ou le bloc validation changent', E.empreinte(a) === E.empreinte(b) && E.empreinte(a) === E.empreinte(c));
  check('F03 empreinte différente si un seul caractère du contenu change', E.empreinte(a) !== E.empreinte(d));
}

// ── 2. Statuts ──
check('F04 transitions permises : brouillon → en_relecture → reference (humaine) ; brouillon → generee_validee (générée)',
  E.peutPasser('brouillon', 'en_relecture', 'humaine') && E.peutPasser('en_relecture', 'reference', 'humaine') && E.peutPasser('brouillon', 'generee_validee', 'serveur') && E.peutPasser('a_corriger', 'brouillon', 'humaine') && E.peutPasser('reference', 'brouillon', 'humaine'));
check('F05 transitions interdites : brouillon → reference ; reference par une fiche générée ; generee_validee par une fiche humaine ; sortie de « rejetee »',
  !E.peutPasser('brouillon', 'reference', 'humaine') && !E.peutPasser('en_relecture', 'reference', 'serveur') && !E.peutPasser('brouillon', 'generee_validee', 'humaine') && !E.peutPasser('rejetee', 'brouillon', 'humaine'));

// ── 3. Fiches d'essai valides ──
const resultats = Object.fromEntries(Object.entries(FICHES).map(([k, f]) => [k, V.valider(f, OPTS)]));
const sansBloquant = Object.entries(resultats).filter(([, r]) => r.bloquants.length);
check('F06 les 4 fiches d’essai (2 hors jeu 3a, 2 sur des notions du jeu 3a) n’ont aucun bloquant', !sansBloquant.length, sansBloquant.map(([k, r]) => `${k} : ${regles(r).join(', ')}`).join(' ; '));
check('F07 une fiche en « brouillon » sans bloquant n’est pas utilisable', Object.values(resultats).every((r) => r.statut === 'brouillon' && !r.utilisable));
const reference = (f) => { const g = clone(f); g.meta.statut = 'reference'; g.validation = { date: '2026-11-24', lot: 1, version: g.meta.version, empreinte: E.empreinte(g), role: 'responsable produit' }; return g; };
{
  const ref = reference(BASE), r = V.valider(ref, OPTS);
  const modif = clone(ref); modif.explication.simple.texte = modif.explication.simple.texte.replace('rondin.', 'rondin !');
  const r2 = V.valider(modif, OPTS);
  check('F08 une fiche « reference » validée (empreinte égale) est utilisable', r.utilisable, regles(r).join(', '));
  check('F09 CA3 : un seul caractère modifié après validation rend la fiche inutilisable (V-statut-02)', !r2.utilisable && regles(r2).includes('V-statut-02'));
  const gen = clone(BASE); gen.meta.origine = 'serveur'; gen.meta.statut = 'generee_validee';
  check('F10 une fiche générée « generee_validee », avec sources et sans bloquant, est utilisable', V.valider(gen, OPTS).utilisable);
}

// ── 4. Mutations : chaque règle bloquante a au moins un cas qui la déclenche (CA1, CA5 du validateur) ──
const MUT = {
  'V-forme-01': (f) => { f.format = 'fiche-v2'; },
  'V-forme-02': (f) => { f.meta.version = 0; },
  'V-forme-03': (f) => { f.sources[0].licence = ''; },
  'V-forme-04': (f) => { f.situation.texte = 'Trop court.'; },
  'V-forme-05': (f) => { f.explication.simple.texte = 'Trop court.'; },
  'V-forme-06': (f) => { f.elements_cles = ['un seul élément clé']; },
  'V-forme-07': (f) => { f.glossaire = f.glossaire.slice(0, 3); },
  'V-forme-08': (f) => { f.questions.application_reserve = []; },
  'V-forme-09': (f) => { f.questions.rappel[0].choix.forEach((c) => { c.juste = true; }); },
  'V-forme-10': (f) => { f.prerequis = [{ notion: 'Une notion', question: {} }]; },
  'V-forme-11': (f) => { f.representations[1].id = f.representations[0].id; },
  'V-ordre-01': (f) => { f.situation.texte += ' Samir utilise donc un levier.'; },
  'V-ordre-02': (f) => { f.situation.texte += ' On appelle cela une machine simple.'; },
  'V-ordre-03': (f) => { f.explication.simple.ancre_situation = 'une phrase absente du texte explicatif'; },
  'V-ordre-04': (f) => { f.explication.simple.texte = 'Le levier est une barre rigide. ' + f.explication.simple.texte; },
  'V-confusions-01': (f) => { f.confusions = []; },
  'V-confusions-02': (f) => { f.confusions[0].remede = 'r99'; },
  'V-confusions-03': (f) => { f.confusions[0].controle.choix.forEach((c) => { delete c.confusion; }); },
  'V-confusions-04': (f) => { f.questions.rappel[0].choix.find((c) => c.juste).confusion = 'c1'; },
  'V-representations-01': (f) => { f.representations.forEach((r) => { r.type = 'exemple'; delete r.limite; }); },
  'V-representations-02': (f) => { f.representations.find((r) => r.type === 'analogie').limite = ''; },
  'V-representations-03': (f) => { f.representations[0].texte = 'Trop court.'; },
  'V-questions-01': (f) => { f.questions.comprehension.forEach((q) => { q.evalue = 'restitution'; }); },
  'V-questions-02': (f) => { f.questions.application[0].evalue = 'compréhension'; },
  'V-questions-03': (f) => { f.questions.transfert_reserve[0].evalue = 'restitution'; },
  'V-questions-04': (f) => { f.questions.rappel[1].evalue = 'application'; },
  'V-questions-05': (f) => { f.questions.comprehension[0].evalue = 'application'; },
  'V-questions-06': (f) => { f.questions.comprehension_reserve[1].q = 'Une porte s’ouvre facilement quand la poignée est…'; },
  'V-questions-07': (f) => { f.questions.comprehension_reserve[1].q = 'Ton voisin n’arrive pas à ouvrir une porte lourde. Que fais-tu pour l’aider ?'; },
  'V-questions-08': (f) => { f.questions.rappel[1].q = f.questions.rappel[0].q; },
  'V-questions-09': (f) => { f.questions.transfert[0].q = 'Samir glisse une longue barre de fer sous la grosse pierre du jardin, posée sur un rondin : pourquoi la pierre se soulève-t-elle ?'; },
  'V-longueur-01': (f) => { f.questions.rappel[2].choix.find((c) => c.juste).texte = 'd’un point d’appui, c’est-à-dire le point fixe autour duquel tourne toute la barre'; },
  'V-longueur-02': (f) => { V.toutesQuestions(f).slice(0, 9).forEach(({ q }) => { const c = q.choix.find((x) => x.juste); c.texte += ' (le détail qui rend la réponse plus complète)'; }); },
  'V-statut-01': (f) => { f.meta.statut = 'publiee'; },
  'V-statut-02': (f) => { f.meta.statut = 'reference'; },
  'V-statut-03': (f) => { f.meta.statut = 'generee_validee'; },
  'V-statut-04': (f) => { f.__catalogue = true; },
  'V-chevauchement-00': (f) => { f.__sansJeu = true; },
  'V-chevauchement-01': (f) => { f.questions.comprehension_reserve[0].q = 'Pourquoi un fichier envoyé sur Internet est-il découpé en paquets ?'; },
};
const appliquer = (regle) => {
  const f = clone(BASE); MUT[regle](f);
  const opts = f.__sansJeu ? { ...OPTS, shaJeu: 'autre' } : { ...OPTS, catalogue: !!f.__catalogue };
  delete f.__sansJeu; delete f.__catalogue;
  return V.valider(f, opts);
};
const nonCouvertes = Object.keys(V.REGLES).filter((r) => !MUT[r]);
check('F11 CA1 : chaque règle bloquante du validateur a sa mutation de test', !nonCouvertes.length, nonCouvertes.join(', '));
const rates = Object.keys(MUT).filter((r) => { const res = appliquer(r); return res.utilisable || !regles(res).includes(r); });
check(`F12 mutation : chacune des ${Object.keys(MUT).length} règles bloquantes est déclenchée par sa mutation`, !rates.length, rates.join(', '));

// Spécification : chaque règle du validateur y figure, et inversement (CA1)
const spec = rd('docs/pedagogie/fiche-v1.md');
const dansSpec = new Set(spec.match(/V-[a-z]+-\d\d|NC\d/g) || []);
const absentesSpec = [...Object.keys(V.REGLES), ...Object.keys(V.AVERTISSEMENTS), 'NC1', 'NC2', 'NC3', 'NC4', 'NC5'].filter((r) => !dansSpec.has(r));
const inconnues = [...dansSpec].filter((r) => !V.REGLES[r] && !V.AVERTISSEMENTS[r] && !/^NC[1-5]$/.test(r));
check('F13 CA1 : la spécification docs/pedagogie/fiche-v1.md liste exactement les règles du validateur', !absentesSpec.length && !inconnues.length, [...absentesSpec, ...inconnues].join(', '));

// Avertissements (non bloquants)
{
  const r = resultats['essai-fermentation'];
  const g = clone(BASE); g.glossaire[0].terme = 'mot absent des explications';
  check('F14 avertissements : phrases longues (V-lisibilite-01) et terme de glossaire non employé (V-lisibilite-02), sans bloquer', r.avertissements.some((a) => a.regle === 'V-lisibilite-01') && !r.bloquants.length && V.valider(g, OPTS).avertissements.some((a) => a.regle === 'V-lisibilite-02'));
}

// ── 5. Non-chevauchement ──
const cas = JSON.parse(rd('tests/fixtures/chevauchements.json'));
function injecter(c) {
  const f = clone(BASE); let chemin;
  if (c.place === 'choix') { f.questions.application[0].choix.find((x) => !x.juste).texte = c.texte; chemin = 'questions.application[0]'; }
  else if (c.place === 'situation') { f.situation.texte = c.texte; chemin = 'situation.texte'; }
  else if (c.place === 'exemple') { f.representations[0].texte = c.texte; chemin = 'representations[0]'; }
  else { f.questions.comprehension_reserve[0].q = c.texte; chemin = 'questions.comprehension_reserve[0]'; }
  return C.controler(f, jeu, { shaJeu, elementsJeu: EJ }).chevauchements.filter((h) => h.chemin.startsWith(chemin));
}
const detecte = (c, h) => h.some((x) => x.ref.startsWith(c.ref) && (!c.regles || x.regles.some((r) => c.regles.includes(r))));
const repRates = cas.reprises.filter((c) => !detecte(c, injecter(c)));
check(`F15 CA5 : les ${cas.reprises.length} reprises plantées sont détectées, par une règle attendue`, !repRates.length, repRates.map((c) => c.id).join(', '));
const regleCouverte = ['NC1', 'NC2', 'NC3', 'NC4', 'NC5'].filter((r) => !cas.reprises.some((c) => injecter(c).some((h) => h.ref.startsWith(c.ref) && h.regles.includes(r))));
check('F16 chaque règle NC1 à NC5 détecte au moins une reprise plantée', !regleCouverte.length, regleCouverte.join(', '));
const legFaux = cas.legitimes.filter((c) => injecter({ ...c, place: 'question' }).length);
check(`F17 CA6 : aucune des ${cas.legitimes.length} questions légitimes sur des notions du jeu 3a n’est signalée`, !legFaux.length, legFaux.map((c) => c.id).join(', '));
check('F18 CA6 : aucune des 4 fiches d’essai n’est signalée (dont 2 sur des notions du jeu 3a : S20 et S04)', Object.values(resultats).every((r) => r.chevauchement.verifiable && !r.chevauchement.chevauchements.length));
const diff = cas.difficiles.map((c) => ({ id: c.id, ok: injecter(c).some((h) => h.ref.startsWith(c.ref)) }));
console.log(`– information : reformulations libres (« difficiles ») détectées : ${diff.filter((d) => d.ok).length} sur ${diff.length} (${diff.filter((d) => d.ok).map((d) => d.id).join(', ') || 'aucune'}) ; les autres sont des faux négatifs connus, à couvrir par la relecture humaine`);
{
  let paires = 0; const el = (r) => r.split('.')[0];
  for (const a of EJ) for (const b of EJ) if (el(a.ref) !== el(b.ref) && a.ref < b.ref && C.comparer(a, b).regles.length) paires++;
  check('F19 faux positifs : aucune paire signalée entre deux éléments différents du jeu 3a (environ 800 000 comparaisons)', paires === 0, `${paires}`);
}
{
  const f = clone(BASE); const r = V.valider(f, { ...OPTS, shaJeu: crypto.createHash('sha256').update(jeuTexte.replace('Pourquoi', 'Pourquoy')).digest('hex') });
  const r2 = V.valider(f, { shaJeu });
  check('F20 CA7 : jeu 3a modifié d’un caractère, ou absent : non-chevauchement « non vérifiable », fiche inutilisable', regles(r).includes('V-chevauchement-00') && regles(r2).includes('V-chevauchement-00') && !r.chevauchement.verifiable);
}
{
  const v = resultats['essai-pythagore'].chevauchement.voisins;
  check('F21 CA8 : pour chaque élément de la fiche, les 3 éléments du jeu 3a les plus proches sont donnés, avec leur score', v.length > 20 && v.every((x) => x.proches.length === 3 && x.proches.every((p) => typeof p.jaccard === 'number' && p.ref)) && v.every((x) => x.proches[0].jaccard >= x.proches[2].jaccard) && v.every((x) => new Set(x.proches.map((p) => p.ref)).size === 3));
}

// ── 6. Propriétés (graine fixe) ──
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const r = rng(20261124), pick = (l) => l[Math.floor(r() * l.length)];
{ // Générateur de fiches valides : à partir des fiches d'essai, mélange des choix, espaces, identifiants renommés
  let ko = 0;
  for (let n = 0; n < 60; n++) {
    const f = clone(pick(Object.values(FICHES)));
    V.toutesQuestions(f).forEach(({ q }) => { for (let i = q.choix.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [q.choix[i], q.choix[j]] = [q.choix[j], q.choix[i]]; } });
    if (r() < 0.5) f.situation.texte = ` ${f.situation.texte}  `;
    const suf = `-${n}`; V.toutesQuestions(f).forEach(({ q }) => { q.id += suf; });
    if (V.valider(f, OPTS).bloquants.length) ko++;
  }
  check('F22 propriété : 60 fiches produites valides par le générateur (choix mélangés, espaces, identifiants) sont validées', ko === 0, `${ko} refusée(s)`);
}
{ // Une mutation aléatoire d'une règle bloquante rend la fiche inutilisable, avec la bonne règle
  let ko = 0; const cles = Object.keys(MUT);
  for (let n = 0; n < 80; n++) { const k = pick(cles), res = appliquer(k); if (res.utilisable || !regles(res).includes(k)) ko++; }
  check('F23 propriété : 80 mutations tirées au hasard rendent toutes la fiche inutilisable, avec la règle attendue', ko === 0, `${ko}`);
}
{ // Normalisation : idempotente ; insensible à la casse, aux accents, aux espaces ; nombres
  const textes = EJ.slice(0, 300).map((x) => x.texte);
  const idem = textes.every((t) => { const m = C.mots(t); return C.mots(m.join(' ')).join(' ') === m.join(' '); });
  const insens = textes.every((t) => C.mots(t).join(' ') === C.mots(t.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ /g, '   ')).join(' '));
  check('F24 propriété : normalisation idempotente et insensible à la casse, aux accents et aux espaces (300 textes du jeu 3a)', idem && insens);
  check('F25 nombres : « 1 200 € » → 1200, « 5,5 % » → 5.5, « 3/4 » reste 3/4, « 1,10 m » → 1.10',
    JSON.stringify(C.nombres('1 200 €')) === '["1200"]' && JSON.stringify(C.nombres('5,5 %')) === '["5.5"]' && JSON.stringify(C.nombres('3/4 de litre')) === '["3/4"]' && JSON.stringify(C.nombres('1,10 m')) === '["1.10"]');
}
{ // Symétrie des comparaisons, sur 3 000 paires tirées au hasard
  let ko = 0;
  for (let n = 0; n < 3000; n++) { const a = pick(EJ), b = pick(EJ), x = C.comparer(a, b), y = C.comparer(b, a); if (x.regles.sort().join() !== y.regles.sort().join() || Math.abs(x.jaccard - y.jaccard) > 1e-12) ko++; }
  check('F26 propriété : comparaisons symétriques (3 000 paires)', ko === 0, `${ko}`);
}
{ // Déterminisme et absence d'effet sur la fiche lue
  const f = clone(FICHES['essai-chaine-du-froid']), avant = JSON.stringify(f);
  const a = V.valider(f, OPTS), b = V.valider(f, OPTS);
  check('F27 propriété : validateur déterministe, et la fiche lue n’est jamais modifiée', JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(f) === avant);
}
{ // Biais de longueur sur un catalogue : mêmes seuils que J16 à J19 du jeu 3a
  const b = V.biaisCatalogue(Object.values(FICHES));
  const faux = V.biaisCatalogue([1, 2, 3, 4].map(() => { const f = clone(BASE); V.toutesQuestions(f).forEach(({ q }) => { q.choix.find((c) => c.juste).texte += ' (version longue de la bonne réponse)'; }); return f; }));
  console.log(`– information : biais de longueur des 4 fiches d’essai : bonne réponse la plus longue ${b.long}/${b.n}, la plus courte ${b.court}/${b.n}, rapport ${b.ratio.toFixed(2)}`);
  check('F28 biais de longueur d’un catalogue : un catalogue où la bonne réponse est toujours la plus longue est refusé (seuils J16 à J19)', faux.conforme === false && b.n === 4 * 15);
}

// ── 7. Les garde-fous de périmètre de la mission 3b-0 (F29 à F31 : modules non chargés, application identique à
// main 5be606a) ont été retirés à l'intégration dans arbor-2 : ces modules sont désormais branchés sur l'application.

console.log(failed ? `\n${failed} échec(s)` : '\nTous les tests passent');
process.exit(failed ? 1 : 0);
