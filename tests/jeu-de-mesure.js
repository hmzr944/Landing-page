/* Jeu de mesure pédagogique (mission 3a) : structure complète et sans biais évident, avant toute mesure.
   Ne mesure rien d'Arbor : vérifie seulement que le matériel validé est cohérent et que les fichiers générés sont à jour.
   Lancer depuis la racine :  node tests/jeu-de-mesure.js */
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const { build, biaisLongueur } = require(path.join(ROOT, 'docs/pedagogie/assembler.js'));
const { DOCS } = require(path.join(ROOT, 'docs/corpus-metier/contenu.js'));
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' : ' + extra : ''}`); if (!ok) failed++; };

const j = build();
const sujets = j.elements.filter((x) => /^S\d+$/.test(x.id)), procs = j.elements.filter((x) => /^P-/.test(x.id));
check('J1 20 sujets pour débutants et 3 procédures métier', sujets.length === 20 && procs.length === 3, `${sujets.length} + ${procs.length}`);
check('J2 identifiants uniques', new Set(j.elements.map((x) => x.id)).size === j.elements.length);
const badGloss = j.elements.filter((x) => x.glossaire.length < 5 || x.glossaire.length > 10 || new Set(x.glossaire).size !== x.glossaire.length);
check('J3 glossaire de 5 à 10 termes distincts pour chaque élément', !badGloss.length, badGloss.map((x) => x.id).join(', '));
const qs = j.elements.flatMap((x) => [...x.comprehension, ...x.rappel, ...x.deblocage].map((q) => ({ ...q, id: x.id })));
check('J4 par élément : 3 questions de compréhension, 4 de rappel, 2 de déblocage', j.elements.every((x) => x.comprehension.length === 3 && x.rappel.length === 4 && x.deblocage.length === 2));
const badQ = qs.filter((q) => q.choix.length !== 4 || new Set(q.choix).size !== 4 || !(q.reponse >= 0 && q.reponse < 4) || q.q.length < 10);
check('J5 chaque question a 4 choix distincts et une bonne réponse valide', !badQ.length, badQ.map((q) => q.id).join(', '));
const rappelDiff = j.elements.filter((x) => { const t = [...x.comprehension, ...x.rappel, ...x.deblocage].map((q) => q.q); return new Set(t).size !== t.length; });
check('J6 compréhension, rappel et déblocage : aucune question en double', !rappelDiff.length, rappelDiff.map((x) => x.id).join(', '));
check('J7 une situation de transfert, sa question et sa réponse attendue pour chaque élément', j.elements.every((x) => x.transfert && x.transfert.situation.length > 30 && x.transfert.question && x.transfert.attendu));
check('J8 reformulation : idée centrale et deux éléments clés pour chaque élément', j.elements.every((x) => x.reformulation.idee_centrale && x.reformulation.elements_cles.length === 2));
const pos = [0, 1, 2, 3].map((k) => qs.filter((q) => q.reponse === k).length);
check('J9 bonnes réponses réparties entre les 4 positions après mélange (aucune position au-delà de 40 %)', Math.max(...pos) <= qs.length * 0.4, pos.join(' / '));
const transferLeak = j.elements.filter((x) => x.comprehension.some((q) => q.q.includes(x.transfert.situation.slice(0, 40))));
check('J10 la situation de transfert n’apparaît pas dans les questions de compréhension', !transferLeak.length, transferLeak.map((x) => x.id).join(', '));
const NIVS = ['application', 'compréhension', 'restitution'];
const sansNiv = qs.filter((q) => !NIVS.includes(q.evalue));
check('J12 chaque question a un classement explicite (application, compréhension ou restitution)', !sansNiv.length, sansNiv.map((q) => q.id).join(', '));
const compMem = j.elements.filter((x) => x.comprehension.filter((q) => q.evalue !== 'restitution').length < 2);
check('J13 compréhension immédiate : au moins 2 questions sur 3 en application ou compréhension', !compMem.length, compMem.map((x) => x.id).join(', '));
const rapBad = j.elements.filter((x) => x.rappel.filter((q) => q.evalue === 'restitution').length !== 3 || x.rappel.filter((q) => q.evalue === 'application').length !== 1);
check('J14 rappel à J+2 : 3 restitutions (mémorisation) et 1 application', !rapBad.length, rapBad.map((x) => x.id).join(', '));
const debBad = j.elements.filter((x) => x.deblocage.map((q) => q.evalue).sort().join() !== (/^P-/.test(x.id) ? 'application,application' : 'application,compréhension'));
check('J15 déblocage : sujets, 1 application et 1 compréhension ; procédures, 2 applications', !debBad.length, debBad.map((x) => x.id).join(', '));

// ── Biais de longueur (correction du 2026-11-23) ──
const all = j.elements.flatMap((x) => [...x.comprehension, ...x.rappel, ...x.deblocage]);
const bl = biaisLongueur(all);
check('J16 bonne réponse strictement la plus longue dans 10 % à 35 % des questions (hasard : environ 25 %)', bl.long >= 0.10 * bl.n && bl.long <= 0.35 * bl.n, `${bl.long}/${bl.n}`);
check('J17 bonne réponse strictement la plus courte dans 10 % à 35 % des questions (le biais ne doit pas s’inverser)', bl.court >= 0.10 * bl.n && bl.court <= 0.35 * bl.n, `${bl.court}/${bl.n}`);
check('J18 longueur moyenne bonne réponse / mauvaises entre 0,85 et 1,15', bl.ratio >= 0.85 && bl.ratio <= 1.15, bl.ratio.toFixed(2));
const blocs = ['comprehension', 'rappel', 'deblocage'].map((b) => [b, biaisLongueur(j.elements.flatMap((x) => x[b]))]).filter(([, v]) => v.long > 0.35 * v.n);
check('J19 dans chaque bloc, bonne réponse la plus longue dans 35 % des questions au plus', !blocs.length, blocs.map(([b, v]) => `${b} ${v.long}/${v.n}`).join(', '));
const outliers = all.filter((q) => { const L = q.choix.map((c) => c.length), d = L.filter((_, k) => k !== q.reponse); return L[q.reponse] > 1.5 * Math.max(...d) && L[q.reponse] - Math.max(...d) > 15; });
check('J20 aucune bonne réponse nettement plus longue que toutes les autres (plus de 1,5 fois et 15 signes)', !outliers.length, outliers.slice(0, 5).map((q) => q.q.slice(0, 40)).join(' | ') + (outliers.length > 5 ? ` … (${outliers.length})` : ''));

// ── Cohérence entre questions, réponses et classements ──
const withId = j.elements.flatMap((x) => [['c', x.comprehension], ['r', x.rappel], ['d', x.deblocage]].flatMap(([k, qs]) => qs.map((q, i) => ({ ...q, ref: `${x.id}.${k}${i + 1}`, el: x }))));
const pourquoi = withId.filter((q) => /\bpourquoi\b/i.test(q.q) && q.evalue !== 'compréhension');
check('J21 une question « pourquoi » est classée compréhension', !pourquoi.length, pourquoi.map((q) => q.ref).join(', '));
const completion = withId.filter((q) => /…$/.test(q.q) && !/\d/.test(q.q) && q.evalue !== 'restitution');
check('J22 une phrase à compléter sans cas chiffré (« Le capital, c’est… ») est classée restitution', !completion.length, completion.map((q) => q.ref).join(', '));
const quefais = withId.filter((q) => /\bque fais-tu\b|\bque fait-il\b|\best-ce conforme\b/i.test(q.q) && q.evalue !== 'application');
check('J23 une question de décision dans un cas (« Que fais-tu ? », « Est-ce conforme ? ») est classée application', !quefais.length, quefais.map((q) => q.ref).join(', '));
const dupRep = j.elements.filter((x) => { const r = [...x.comprehension, ...x.rappel, ...x.deblocage].map((q) => q.choix[q.reponse]).filter((t) => t.length > 6); return new Set(r).size !== r.length; });
check('J24 dans un élément, deux questions n’ont jamais la même bonne réponse (pas de question redondante)', !dupRep.length, dupRep.map((x) => x.id).join(', '));

// Recalcul des réponses chiffrées : la bonne réponse doit être celle que donne le calcul
const eur = (v) => `${String(Math.round(v * 100) / 100).replace('.', ',')} €`;
const shift = (w, n) => [...w].map((c) => String.fromCharCode(((c.charCodeAt(0) - 65 + n + 26) % 26) + 65)).join('');
const frac = (a, b) => a / b;
const get = (ref) => withId.find((q) => q.ref === ref);
const CALCULS = [
  ['S03.r4', shift('OUI', 1)], ['S03.d1', shift('EBUF', -1)],
  ['S04.c1', String(Math.hypot(3, 4))], ['S04.r4', String(Math.hypot(6, 8))], ['S04.d1', `${Math.hypot(30, 40)} cm`],
  ['S04.c3', 5 ** 2 + 12 ** 2 === 13 ** 2 ? 'Oui' : 'Non'],
  ['S05.c1', '3/8'], ['S05.r2', frac(4, 8) === frac(1, 2) ? '1/2' : '?'], ['S05.r3', frac(1, 10) < frac(1, 3) ? '1/10' : '1/3'],
  ['S05.r4', Math.abs(frac(2, 6) - frac(1, 3)) < 1e-9 ? 'Autant' : '?'], ['S05.d1', String((1 - 3 / 4) * 4)],
  ['S06.c1', eur(100 * 1.1 ** 2)], ['S06.r4', eur(100 * 1.5 ** 2)], ['S06.d1', `${eur(200 * 1.1)}, puis ${eur(200 * 1.1 ** 2)}`],
  ['S14.d1', String(4.5 / 1.5)],
  ['S15.c1', eur(100 * 1.10)], ['S15.c3', 1.02 / 1.05 < 1 ? 'baisse' : 'monte'],
  ['S17.c1', eur(100 * 1.2)], ['S17.c3', eur(60 / 1.2)], ['S17.r4', eur(50 * 1.2)], ['S17.d1', eur(10 * 1.055)],
  // procédures : seuils écrits dans la procédure, comparés à la valeur du cas
  ['P-R1.r4', (19 * 60 - 15) === (18 * 60 + 45) ? 'Annoncer aux clients la fermeture' : '?'],
  ['P-H1.c1', 4 > 2 ? 'Je la refuse' : "Je l'accepte"], ['P-H1.c3', 3 <= 4 ? 'Je les accepte' : 'Je les refuse'],
  ['P-H1.r4', 3 > 2 ? 'Je le refuse' : "Je l'accepte"], ['P-H1.d1', 5 > 3 ? 'Je la refuse' : "Je l'accepte"],
  ['P-R3.c1', 1200 > 1000 ? 'Je refuse' : "J'accepte"], ['P-R3.c2', 30 / 0.01 > 50 ? 'Non' : 'Oui'],
  ['P-R3.c3', 850 > 800 ? 'Le responsable fait un prélèvement' : 'Rien'], ['P-R3.r4', 15 > 10 ? "Je remplis une fiche d'écart" : 'Rien'],
];
const calcBad = CALCULS.filter(([ref, attendu]) => { const q = get(ref); return !q || !q.choix[q.reponse].startsWith(attendu); });
check(`J25 réponses chiffrées recalculées (${CALCULS.length} questions : calculs, et seuils des procédures)`, !calcBad.length, calcBad.map(([r, a]) => `${r} attend « ${a} »`).join(' ; '));

// Procédures : chaque bonne réponse s'appuie sur une phrase écrite dans la procédure
const norm = (t) => String(t).replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
const DOC = { 'P-R1': 'R1-v2', 'P-H1': 'H1-v2', 'P-R3': 'R3-v1' };
const docText = (id) => { const d = DOCS.find((x) => x.id === id); return norm(d.sections.flatMap((s) => [...(s.p || []), ...(s.ol || []), ...(s.ul || [])].map((e) => (typeof e === 'string' ? e : e.t))).join(' ')); };
const srcBad = [];
for (const x of procs) {
  const txt = docText(DOC[x.id]);
  for (const q of [...x.comprehension, ...x.rappel, ...x.deblocage, x.transfert]) {
    if (!Array.isArray(q.source) || !q.source.length) { srcBad.push(`${x.id} : sans appui « ${(q.q || q.question).slice(0, 30)} »`); continue; }
    for (const t of q.source) if (!txt.includes(norm(t))) srcBad.push(`${x.id} : phrase introuvable « ${t.slice(0, 40)} »`);
  }
}
check('J26 procédures : chaque question et chaque transfert citent une phrase présente mot pour mot dans la procédure', !srcBad.length, srcBad.join(' ; '));
const procPourquoi = procs.flatMap((x) => [...x.comprehension, ...x.rappel, ...x.deblocage].filter((q) => /\bpourquoi\b/i.test(q.q)).map((q) => `${x.id} « ${q.q.slice(0, 40)} »`));
check('J27 procédures : aucune question « pourquoi » (les procédures n’écrivent pas la raison de leurs règles)', !procPourquoi.length, procPourquoi.join(' ; '));

// Déblocage : critères complets pour noter la justification
const critBad = withId.filter((q) => q.ref.includes('.d')).filter((q) => { const c = q.criteres || {}; const v = [c.raison, c.juste, c.insuffisant, c.faux]; return v.some((t) => !t || t.length < 8) || new Set(v).size !== 4 || v.includes(q.choix[q.reponse]); });
check('J28 chaque question de déblocage a ses critères : raison attendue, exemples juste, insuffisant et faux, distincts', !critBad.length, critBad.map((q) => q.ref).join(', '));
const critHors = withId.filter((q) => !q.ref.includes('.d') && q.criteres);
check('J29 les critères de justification ne figurent que sur les questions de déblocage', !critHors.length, critHors.map((q) => q.ref).join(', '));
try { execFileSync('node', [path.join(ROOT, 'docs/pedagogie/assembler.js'), '--check'], { stdio: 'pipe' }); check('J11 jeu-de-mesure.json et .md à jour avec les sources', true); }
catch (e) { check('J11 jeu-de-mesure.json et .md à jour avec les sources', false, String(e.stdout || '').trim()); }

console.log(failed ? `\n${failed} échec(s)` : '\nTous les tests passent');
process.exit(failed ? 1 : 0);
