/* Arbor 2 : moteur de parcours (js/pedagogie/parcours.js) et correction (js/pedagogie/correction.js).
   Traces d'apprenants simulés : la séquence d'écrans attendue est figée ici. Une règle pédagogique qui change fait
   échouer ce test. Lancer depuis la racine :  node tests/parcours.js */
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const P = require(path.join(ROOT, 'js/pedagogie/parcours.js'));
const K = require(path.join(ROOT, 'js/pedagogie/correction.js'));
const LEVIER = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/fiches/essai-levier.json'), 'utf8'));
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' : ' + extra : ''}`); if (!ok) failed++; };
const clone = (x) => JSON.parse(JSON.stringify(x));

/* Simule un apprenant. reponses : id d'item → indice choisi (ou fonction(item) → réponse). Par défaut : bonne réponse.
   Renvoie la trace : suite d'écrans résumés. */
function jouer(fiche, reponses = {}, opts = {}) {
  const st = P.creer(clone(fiche));
  const trace = [];
  let e = P.courant(st), garde = 0;
  while (e.type !== 'bilan' && garde++ < 60) {
    if (e.type === 'situation') { trace.push('situation'); e = P.ouvrir(st, { sait: opts.sait !== false }); continue; }
    if (e.type === 'explication') { trace.push(`explication:${e.niveau}`); e = P.avancer(st); continue; }
    if (e.type === 'representation') { trace.push(`rep:${e.rep.id}`); e = P.avancer(st); continue; }
    if (e.type === 'epuise') { trace.push(`epuise:${e.ens}`); e = P.avancer(st); continue; }
    if (e.type === 'item') {
      const it = e.item, r = reponses[it.id];
      const bonne = it.choix ? it.choix.findIndex((c) => c.juste) : null;
      const rep = typeof r === 'function' ? r(it) : r === undefined ? bonne : r;
      const { correction } = P.repondre(st, rep);
      trace.push(`${it.id}:${correction.outcome}`);
      e = P.avancer(st);
    }
  }
  return { trace, st, bilan: P.bilan(st) };
}

// T1 : tout juste, l'apprenant pense savoir
{
  const { trace, bilan } = jouer(LEVIER);
  check('P01 ordre imposé : situation, explication, 3 compréhension, 2 application, 1 transfert, bilan',
    trace.join(' ') === 'situation explication:standard lq1:juste lq2:juste lq3:juste lq6:juste lq7:juste lq9:juste', trace.join(' '));
  check('P02 tout juste : rien à reprendre, application et transfert réussis, aucune remédiation', !bilan.aReprendre && bilan.application && bilan.transfert && bilan.remedes === 0 && bilan.changements === 0);
}
// T2 : « je ne sais pas » à l'ouverture → explication simple (R2)
check('P03 R2 : « je ne sais pas » à l’ouverture donne l’explication simple', jouer(LEVIER, {}, { sait: false }).trace[1] === 'explication:simple');
// T3 : erreur portant la confusion c1 sur lq1 → remède r4 puis contrôle lc-c1, puis réserve (R3)
{
  const { trace, st } = jouer(LEVIER, { lq1: 1 });
  check('P04 R3 : une erreur qui porte la confusion c1 montre son remède (r4) puis sa question de contrôle',
    trace.slice(2, 5).join(' ') === 'lq1:faux rep:r4 lc-c1:juste', trace.join(' '));
  check('P05 R3 : la confusion c1 n’est traitée qu’une fois ; l’erreur et le remède sont au journal', st.journal.filter((j) => j.quoi === 'remede').length === 1 && st.resultats[0].confusion === 'c1');
}
// T4 : même confusion une deuxième fois (lq6 choix 3 : c1) → plus de remède, une question de réserve d'application (R5)
{
  const { trace } = jouer(LEVIER, { lq1: 1, lq6: 3 });
  const i = trace.indexOf('lq6:faux');
  check('P06 R5 : confusion déjà traitée → question de réserve du même ensemble (lq8), jamais une question inventée', trace[i + 1] === 'lq7:juste' || trace.slice(i + 1).includes('lq8:juste'), trace.join(' '));
}
// T5 : deux erreurs sans confusion → changement de méthode : autre représentation + explication simple (R4)
{
  const { trace, st } = jouer(LEVIER, { lq2: 1, lq3: 0 });
  const i = trace.indexOf('lq3:faux');
  check('P07 R4 : deuxième erreur sans confusion → nouvelle représentation puis explication simple',
    /^rep:r\d$/.test(trace[i + 1]) && trace[i + 2] === 'explication:simple', trace.join(' '));
  check('P08 R4 : le changement de méthode est inscrit au journal, et les erreurs non diagnostiquées aussi',
    st.journal.some((j) => j.quoi === 'changement_methode') && st.journal.filter((j) => j.quoi === 'erreur_non_diagnostiquee').length === 2);
}
// T6 : réserve épuisée → le moteur le dit et passe à la suite (R5)
{
  const { trace, bilan } = jouer(LEVIER, { lq9: 0, lq10: 1 });
  check('P09 R4 et R5 : transfert raté puis réserve ratée → changement de méthode, puis « épuisée », aucune question inventée, notion à reprendre',
    trace.slice(-5).join(' ') === 'lq9:faux lq10:faux rep:r1 explication:simple epuise:transfert' && bilan.aReprendre && bilan.epuise.includes('transfert') && !bilan.transfert, trace.join(' '));
}
// T7 : toutes les questions fausses : le parcours se termine (pas de boucle), chaque question posée une seule fois
{
  const { trace, st } = jouer(LEVIER, Object.fromEntries([...Object.values(LEVIER.questions).flat(), ...LEVIER.confusions.map((c) => c.controle)].map((q) => [q.id, q.choix.findIndex((c) => !c.juste)])));
  const items = trace.filter((t) => /:(juste|faux)$/.test(t)).map((t) => t.split(':')[0]);
  check('P10 tout faux : le parcours se termine, aucune question n’est posée deux fois', st.fini && new Set(items).size === items.length && trace.length < 40, `${trace.length} écrans`);
}
// T8 : déterminisme
check('P11 déterminisme : mêmes réponses, même trace', JSON.stringify(jouer(LEVIER, { lq1: 1, lq3: 0 }).trace) === JSON.stringify(jouer(LEVIER, { lq1: 1, lq3: 0 }).trace));

// ── Correction ──
const courte = { id: 'c', type: 'courte', evalue: 'application', q: 'x', attendus: ['plus petit', 'plus faible'] };
const chiffre = { id: 'n', type: 'courte', evalue: 'application', q: 'x', attendus: ['5 cm'] };
check('P12 réponse courte : casse, accents et ponctuation ignorés ; nombres exigés à l’identique',
  K.corriger(courte, 'Plus PETIT !').outcome === 'juste' && K.corriger(courte, 'il devient plus grand').outcome === 'faux'
  && K.corriger(chiffre, 'environ 5 cm').outcome === 'juste' && K.corriger(chiffre, '6 cm').outcome === 'faux' && K.corriger(chiffre, '15 cm').outcome === 'faux');
const ordre = { id: 'o', type: 'ordre', evalue: 'application', q: 'x', etapes: ['a', 'b', 'c', 'd'] };
check('P13 mise en ordre : exact = juste ; extrémités justes = partiel ; sinon faux', K.corriger(ordre, [0, 1, 2, 3]).outcome === 'juste' && K.corriger(ordre, [0, 2, 1, 3]).outcome === 'partiel' && K.corriger(ordre, [1, 0, 2, 3]).outcome === 'faux');
const libre = { id: 'l', type: 'libre', evalue: 'application', q: 'x', grille: ['a', 'b'], reference: 'r' };
check('P14 R6 / Q6 : explication libre sans jugement du serveur → « non notée », niveau 0 ; jugée juste → niveau 4',
  K.corriger(libre, 'mon texte').outcome === 'non_note' && K.corriger(libre, 'mon texte').niveau === 0 && K.corriger(libre, { jugement: { outcome: 'juste' } }).niveau === 4);
const qcmApp = { id: 'q', evalue: 'application', q: 'x', choix: [{ texte: 'a', juste: true }, { texte: 'b' }, { texte: 'c' }, { texte: 'd' }] };
check('P15 Q2 : un QCM d’application réussi vaut le niveau 3, jamais 4 ; un QCM de compréhension 2 ; une réponse courte d’application 4',
  K.corriger(qcmApp, 0).niveau === 3 && K.corriger({ ...qcmApp, evalue: 'compréhension' }, 0).niveau === 2 && K.corriger(courte, 'plus petit').niveau === 4);
check('P16 contexte de la preuve : compréhension, application, transfert (réserves comprises), contrôle → compréhension',
  K.contexteOf('application_reserve') === 'application' && K.contexteOf('transfert') === 'transfert' && P.baseOf('controle') === 'comprehension');
{ // libre sans compte dans le parcours : aucune preuve
  const f = clone(LEVIER); f.format = 'fiche-v2'; f.questions.transfert = [{ ...libre, id: 'lt', evalue: 'application', q: 'Explique le casse-noix.' }];
  const st = P.creer(f); P.ouvrir(st, { sait: true }); P.avancer(st);
  let e = P.courant(st);
  while (e.type === 'item' && e.item.id !== 'lt') { P.repondre(st, e.item.choix.findIndex((c) => c.juste)); e = P.avancer(st); }
  const r = P.repondre(st, 'texte');
  check('P17 R6 : dans le parcours, une explication libre sans compte ne produit aucune preuve, et le journal le dit', r.preuve === null && st.journal.some((j) => j.quoi === 'non_note'));
}

console.log(failed ? `\n${failed} échec(s)` : '\nTous les tests passent');
process.exit(failed ? 1 : 0);
