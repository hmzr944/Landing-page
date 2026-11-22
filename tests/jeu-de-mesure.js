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
const qs = j.elements.flatMap((x) => [...x.comprehension, ...x.rappel].map((q) => ({ ...q, id: x.id })));
check('A4 3 questions de compréhension et 3 de rappel par élément', j.elements.every((x) => x.comprehension.length === 3 && x.rappel.length === 3));
const badQ = qs.filter((q) => q.choix.length !== 4 || new Set(q.choix).size !== 4 || !(q.reponse >= 0 && q.reponse < 4) || q.q.length < 10);
check('A5 chaque question a 4 choix distincts et une bonne réponse valide', !badQ.length, badQ.map((q) => q.id).join(', '));
const rappelDiff = j.elements.filter((x) => x.rappel.some((r) => x.comprehension.some((c) => c.q === r.q)));
check('A6 les questions de rappel à J+2 diffèrent des questions de compréhension', !rappelDiff.length, rappelDiff.map((x) => x.id).join(', '));
check('A7 une situation de transfert, sa question et sa réponse attendue pour chaque élément', j.elements.every((x) => x.transfert && x.transfert.situation.length > 30 && x.transfert.question && x.transfert.attendu));
check('A8 reformulation : idée centrale et deux éléments clés pour chaque élément', j.elements.every((x) => x.reformulation.idee_centrale && x.reformulation.elements_cles.length === 2));
const pos = [0, 1, 2, 3].map((k) => qs.filter((q) => q.reponse === k).length);
check('A9 bonnes réponses réparties entre les 4 positions après mélange (aucune position au-delà de 40 %)', Math.max(...pos) <= qs.length * 0.4, pos.join(' / '));
const transferLeak = j.elements.filter((x) => x.comprehension.some((q) => q.q.includes(x.transfert.situation.slice(0, 40))));
check('A10 la situation de transfert n’apparaît pas dans les questions de compréhension', !transferLeak.length, transferLeak.map((x) => x.id).join(', '));
try { execFileSync('node', [path.join(ROOT, 'docs/pedagogie/assembler.js'), '--check'], { stdio: 'pipe' }); check('A11 jeu-de-mesure.json et .md à jour avec les sources', true); }
catch (e) { check('A11 jeu-de-mesure.json et .md à jour avec les sources', false, String(e.stdout || '').trim()); }

console.log(failed ? `\n${failed} échec(s)` : '\nTous les tests passent');
process.exit(failed ? 1 : 0);
