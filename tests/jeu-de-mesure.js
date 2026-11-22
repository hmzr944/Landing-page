/* Jeu de mesure pédagogique (mission 3a) : structure complète et sans biais évident, avant toute mesure.
   Ne mesure rien d'Arbor : vérifie seulement que le matériel validé est cohérent et que les fichiers générés sont à jour.
   Lancer depuis la racine :  node tests/jeu-de-mesure.js */
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const { build } = require(path.join(ROOT, 'docs/pedagogie/assembler.js'));
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' : ' + extra : ''}`); if (!ok) failed++; };

const j = build();
const sujets = j.elements.filter((x) => /^S\d+$/.test(x.id)), procs = j.elements.filter((x) => /^P-/.test(x.id));
check('A1 20 sujets pour débutants et 3 procédures métier', sujets.length === 20 && procs.length === 3, `${sujets.length} + ${procs.length}`);
check('A2 identifiants uniques', new Set(j.elements.map((x) => x.id)).size === j.elements.length);
const badGloss = j.elements.filter((x) => x.glossaire.length < 5 || x.glossaire.length > 10 || new Set(x.glossaire).size !== x.glossaire.length);
check('A3 glossaire de 5 à 10 termes distincts pour chaque élément', !badGloss.length, badGloss.map((x) => x.id).join(', '));
const qs = j.elements.flatMap((x) => [...x.comprehension, ...x.rappel, ...x.deblocage].map((q) => ({ ...q, id: x.id })));
check('A4 par élément : 3 questions de compréhension, 4 de rappel, 2 de déblocage', j.elements.every((x) => x.comprehension.length === 3 && x.rappel.length === 4 && x.deblocage.length === 2));
const badQ = qs.filter((q) => q.choix.length !== 4 || new Set(q.choix).size !== 4 || !(q.reponse >= 0 && q.reponse < 4) || q.q.length < 10);
check('A5 chaque question a 4 choix distincts et une bonne réponse valide', !badQ.length, badQ.map((q) => q.id).join(', '));
const rappelDiff = j.elements.filter((x) => { const t = [...x.comprehension, ...x.rappel, ...x.deblocage].map((q) => q.q); return new Set(t).size !== t.length; });
check('A6 compréhension, rappel et déblocage : aucune question en double', !rappelDiff.length, rappelDiff.map((x) => x.id).join(', '));
check('A7 une situation de transfert, sa question et sa réponse attendue pour chaque élément', j.elements.every((x) => x.transfert && x.transfert.situation.length > 30 && x.transfert.question && x.transfert.attendu));
check('A8 reformulation : idée centrale et deux éléments clés pour chaque élément', j.elements.every((x) => x.reformulation.idee_centrale && x.reformulation.elements_cles.length === 2));
const pos = [0, 1, 2, 3].map((k) => qs.filter((q) => q.reponse === k).length);
check('A9 bonnes réponses réparties entre les 4 positions après mélange (aucune position au-delà de 40 %)', Math.max(...pos) <= qs.length * 0.4, pos.join(' / '));
const transferLeak = j.elements.filter((x) => x.comprehension.some((q) => q.q.includes(x.transfert.situation.slice(0, 40))));
check('A10 la situation de transfert n’apparaît pas dans les questions de compréhension', !transferLeak.length, transferLeak.map((x) => x.id).join(', '));
const NIVS = ['application', 'compréhension', 'restitution'];
const sansNiv = qs.filter((q) => !NIVS.includes(q.evalue));
check('A12 chaque question a un classement explicite (application, compréhension ou restitution)', !sansNiv.length, sansNiv.map((q) => q.id).join(', '));
const compMem = j.elements.filter((x) => x.comprehension.filter((q) => q.evalue !== 'restitution').length < 2);
check('A13 compréhension immédiate : au moins 2 questions sur 3 en application ou compréhension', !compMem.length, compMem.map((x) => x.id).join(', '));
const rapBad = j.elements.filter((x) => x.rappel.filter((q) => q.evalue === 'restitution').length !== 3 || x.rappel.filter((q) => q.evalue === 'application').length !== 1);
check('A14 rappel à J+2 : 3 restitutions (mémorisation) et 1 application', !rapBad.length, rapBad.map((x) => x.id).join(', '));
const debBad = j.elements.filter((x) => x.deblocage.map((q) => q.evalue).sort().join() !== 'application,compréhension');
check('A15 déblocage : 1 application et 1 compréhension préparées à l’avance', !debBad.length, debBad.map((x) => x.id).join(', '));
try { execFileSync('node', [path.join(ROOT, 'docs/pedagogie/assembler.js'), '--check'], { stdio: 'pipe' }); check('A11 jeu-de-mesure.json et .md à jour avec les sources', true); }
catch (e) { check('A11 jeu-de-mesure.json et .md à jour avec les sources', false, String(e.stdout || '').trim()); }

console.log(failed ? `\n${failed} échec(s)` : '\nTous les tests passent');
process.exit(failed ? 1 : 0);
