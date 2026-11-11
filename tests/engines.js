/* Moteurs de preuves et d'apprentissage adaptatif (js/evidence.js, js/adaptive.js) et intelligence d'équipe
   (OrgInsight.radar, OrgInsight.pathway) : règles déterministes, testées sans navigateur ni réseau.
   Lancer depuis la racine du dépôt :  node tests/engines.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const win = {};
const ctx = vm.createContext({ window: win, globalThis: win, console, Date, Math, Map, Set, JSON });
['js/evidence.js', 'js/adaptive.js', 'js/org-insight.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
const { Evidence, Adaptive, OrgInsight } = win;
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' : ' + extra : ''}`); if (!ok) failed++; };
const D = 864e5, t0 = Date.parse('2026-10-01T10:00:00Z');
const at = (d) => new Date(t0 + d * D).toISOString();
const e = (o) => ({ user_id: 'u1', knowledge_id: 'k1', activity: 'simulation', outcome: 'juste', at: at(0), ...o });

/* A. Niveaux de preuve */
check('A1 une explication personnelle reste « déclarée » (niveau 1), jamais une maîtrise', Evidence.assess([e({ activity: 'enseigne', level: 1 })]).level === 1);
check('A2 un QCM juste montre une connaissance reconnue (2)', Evidence.assess([e({ activity: 'diagnostic', level: 2 })]).level === 2);
check('A3 une application en situation vaut 4', Evidence.assess([e({ level: 4, session_id: 's1', context: 'simulation:client' })]).level === 4);
check('A4 appliquée dans deux parties du même contexte : démontrée (5), pas transférée',
  Evidence.assess([e({ level: 4, session_id: 's1', context: 'simulation:client' }), e({ level: 4, session_id: 's2', context: 'simulation:client', at: at(1) })]).level === 5);
const transfer = Evidence.assess([e({ level: 4, session_id: 's1', context: 'simulation:client' }), e({ level: 4, session_id: 's2', context: 'simulation:procedure', at: at(1) })]);
check('A5 (scénario 4) une compétence démontrée dans deux contextes distincts est « transférée » (6)', transfer.level === 6 && transfer.contexts.length === 2, JSON.stringify(transfer));
check('A6 une réussite unique ne donne jamais « durable »', Evidence.assess([e({ level: 4 })]).level < 7);
check('A7 deux réussites à 7 jours d’écart, la dernière juste : durable (7)', Evidence.assess([e({ activity: 'rappel', level: 3 }), e({ activity: 'rappel', level: 3, at: at(8) })]).level === 7);
check('A8 une dernière réponse fausse fait redescendre le niveau', Evidence.assess([e({ level: 4, session_id: 'a' }), e({ level: 4, session_id: 'b', context: 'x', at: at(1) }), e({ outcome: 'faux', at: at(2) })]).level <= 1);
const nd = Evidence.assess([e({ outcome: 'non_documente' }), e({ outcome: 'insuffisant', at: at(1) })]);
check('A9 « non documenté » et « insuffisant » ne sont ni juste ni faux, et restent comptés à part', nd.level === 0 && nd.undocumented === 1 && nd.insufficient === 1);
check('A10 la validation humaine au poste vaut 5 et est repérée', Evidence.assess([e({ activity: 'validation_humaine', level: 5 })]).human === true);

/* B. États (OrgInsight) : catégories distinctes */
check('B1 une affirmation non documentée ne rend pas une connaissance « à retravailler »', OrgInsight.stateOf([e({ activity: 'diagnostic' }), e({ outcome: 'non_documente', at: at(1) })]) !== 'a_retravailler');
check('B2 une réponse insuffisante donne « à préciser », pas « fausse »', OrgInsight.stateOf([e({ outcome: 'insuffisant' })]) === 'a_preciser');
check('B3 une erreur sûre reste une fausse certitude', OrgInsight.stateOf([e({ outcome: 'faux', confidence: 'reflexe' })]) === 'fausse_certitude');

/* C. Moteur adaptatif : priorités et raisons */
const recs = Adaptive.recommend([
  { id: 'a', title: 'Délai de retour', level: 2 }, { id: 'b', title: 'Batterie', falseCert: true, state: 'faux' },
  { id: 'c', title: 'Allergènes', level: 4, needsHuman: true }, { id: 'd', title: 'Remboursement', state: 'faux', prereqMissing: ['Délai de retour'] },
  { id: 'e', title: 'Prix', level: 1 },
], { actions: [{ status: 'a_faire', kind: 'revalidation', reason: 'La procédure a changé.' }], context: 'business', max: 6 });
check('C1 une action demandée par un responsable passe en premier', recs[0].kind === 'revalidation');
check('C2 puis la fausse certitude', recs[1].kind === 'correction' && /annoncée comme sûre/.test(recs[1].reason));
check('C3 un prérequis manquant est proposé avant l’erreur qu’il explique', recs[2].kind === 'prerequis' && /Délai de retour/.test(recs[2].reason));
check('C4 le sensible appliqué demande une validation humaine (une simulation ne la remplace pas)', recs.some((r) => r.kind === 'validation_humaine' && r.item.id === 'c'));
check('C5 une explication (niveau 1) appelle une question de vérification', recs.some((r) => r.kind === 'question' && r.item.id === 'e'));
check('C6 chaque proposition a une raison en clair', recs.every((r) => r.reason && r.reason.length > 15));
const fresh = Adaptive.recommend([], { context: 'business' });
check('C7 sans aucune donnée : commencer par le diagnostic', fresh[0].kind === 'diagnostic');
const dl = Adaptive.recommend([{ id: 'x', title: 'X', level: 2 }], { deadline: new Date(Date.now() + 5 * D).toISOString().slice(0, 10) });
check('C8 une échéance proche est rappelée dans la raison', /Échéance dans 5 jours/.test(dl[0].reason), dl[0].reason);

/* D. Parcours (scénario 3 : échec puis progrès) */
const K = [{ id: 'k1', title: 'Délai de retour', kind: 'regle' }, { id: 'k2', title: 'Allergènes', kind: 'sensible' }];
const prog = [e({ outcome: 'faux', confidence: 'sait', activity: 'diagnostic' }), e({ outcome: 'juste', activity: 'simulation', level: 4, session_id: 's1', context: 'simulation:client', at: at(1) })];
const pe = OrgInsight.person('u1', prog, K);
check('D1 après un échec puis une réussite en situation : la connaissance progresse (niveau 4), l’historique reste', pe.items[0].level === 4 && pe.items[0].n === 2);
const skills = [{ id: 's1', name: 'Conseiller', importance: 3 }, { id: 's2', name: 'Servir en sécurité', importance: 2 }, { id: 's3', name: 'Cuisine', importance: 1 }];
const links = [{ skill_id: 's1', knowledge_id: 'k1' }, { skill_id: 's2', knowledge_id: 'k2' }, { skill_id: 's3', knowledge_id: 'k1' }];
const units = [{ skill_id: 's3', unit_id: 'cuisine' }];
const evs = [...prog, e({ knowledge_id: 'k2', level: 4, session_id: 's9', context: 'simulation:client' })];
const pw = OrgInsight.pathway('u1', evs, K, skills, links, units, 'salle', []);
check('D2 le parcours ne contient que les compétences du poste (pas celles d’une autre équipe)', pw.skills.map((x) => x.skill.id).join() === 's1,s2');
check('D3 compétence sensible appliquée mais sans validation humaine : en attente de validation au poste', pw.skills.find((x) => x.skill.id === 's2').status === 'validation_humaine');
const pw2 = OrgInsight.pathway('u1', [...evs, { user_id: 'u1', skill_id: 's2', activity: 'validation_humaine', outcome: 'juste', level: 5, at: at(3) }], K, skills, links, units, 'salle', []);
check('D4 après la validation humaine : acquise', pw2.skills.find((x) => x.skill.id === 's2').status === 'acquise');

/* E. Radar d'équipe : limites statistiques */
const members = ['u1', 'u2', 'u3', 'u4'].map((user_id) => ({ user_id }));
const team = [
  { user_id: 'u1', knowledge_id: 'k2', outcome: 'faux', confidence: 'sait', at: at(0) }, { user_id: 'u2', knowledge_id: 'k2', outcome: 'faux', at: at(1) },
  { user_id: 'u3', knowledge_id: 'k2', outcome: 'juste', at: at(2) },
  { user_id: 'u1', knowledge_id: 'k1', outcome: 'faux', at: at(0) }, { user_id: 'u1', knowledge_id: 'k1', outcome: 'faux', at: at(1) },
  { user_id: 'u2', knowledge_id: 'k1', outcome: 'non_documente', at: at(1) }, { user_id: 'u3', knowledge_id: 'k1', outcome: 'non_documente', at: at(2) },
];
const r = OrgInsight.radar(team, K, members);
check('E1 une fragilité n’apparaît qu’avec assez d’observations et de personnes (une personne seule ne suffit pas)', r.blind.length === 1 && r.blind[0].knowledge.id === 'k2' && r.insufficient === 1);
check('E2 les affirmations non documentées ne comptent pas comme des erreurs', !r.blind.some((x) => x.knowledge.id === 'k1'));
check('E3 gravité élevée sur le sensible, couverture, période, personnes concernées et action proposée',
  r.blind[0].severity === 'elevee' && r.blind[0].coverage === 0.75 && r.blind[0].wrongPeople.length === 2 && /Revalidation/.test(r.blind[0].action) && r.blind[0].period.from === at(0));
check('E4 les limites de l’analyse sont toujours fournies', r.limits.minObs === 3 && r.limits.minPeople === 2 && r.limits.members === 4 && r.limits.people === 3);

/* F. Matrice confiance × compétence (confiance déclarée seulement) */
const now = Date.parse('2026-11-11T10:00:00Z');
const ago = (d) => new Date(now - d * D).toISOString();
const mx = [
  { user_id: 'u1', knowledge_id: 'k1', outcome: 'juste', confidence: 'reflexe', at: ago(3) },        // solide
  { user_id: 'u1', knowledge_id: 'k2', outcome: 'juste', confidence: 'devine', at: ago(3) },         // sous-estimée
  { user_id: 'u2', knowledge_id: 'k1', outcome: 'faux', confidence: 'devine', at: ago(2) },          // lacune reconnue
  { user_id: 'u2', knowledge_id: 'k2', outcome: 'faux', confidence: 'sait', at: ago(40) },           // fausse certitude (ancienne)
  { user_id: 'u3', knowledge_id: 'k2', outcome: 'faux', confidence: 'sait', at: ago(5) },            // fausse certitude (récente)
  { user_id: 'u3', knowledge_id: 'k1', outcome: 'juste', confidence: 'sait', at: ago(9) },
  { user_id: 'u3', knowledge_id: 'k1', outcome: 'juste', confidence: null, at: ago(1) },             // dernière sans confiance : non mesurée
  { user_id: 'u4', knowledge_id: 'k1', outcome: 'non_documente', confidence: 'sait', at: ago(1) },   // hors matrice
];
const M = OrgInsight.matrix(mx, K, { now });
check('F1 les quatre cases sont distinctes et comptées', M.cells.solide.n === 1 && M.cells.sous_estimee.n === 1 && M.cells.lacune_reconnue.n === 1 && M.cells.fausse_certitude.n === 2, JSON.stringify(Object.fromEntries(Object.entries(M.cells).map(([k, v]) => [k, v.n]))));
check('F2 sans confiance déclarée sur la dernière réponse : « non mesurée », jamais déduite', M.unmeasured === 1 && M.measured === 5);
check('F3 une affirmation non documentée n’entre pas dans la matrice', M.total === 6);
check('F4 évolution des fausses certitudes (30 derniers jours / 30 précédents)', M.trend.recent === 1 && M.trend.previous === 1);
check('F5 sous 5 mesures, pas de conclusion d’équipe', !OrgInsight.matrix(mx.slice(0, 3), K, { now }).enough && M.enough);
const mine = OrgInsight.matrix(mx, K, { now, userId: 'u2' });
check('F6 matrice personnelle : ses seules réponses', mine.measured === 2 && mine.cells.fausse_certitude.knowledge[0].title === 'Allergènes');
/* G. Parcours : revalidation ciblée */
const pwR = OrgInsight.pathway('u1', [...evs, { user_id: 'u1', skill_id: 's2', activity: 'validation_humaine', outcome: 'juste', level: 5, at: at(3) }], K, skills, links, units, 'salle', [],
  { revalidations: [{ user_id: 'u1', skill_id: 's2', status: 'requires_revalidation', reason: 'La règle a changé' }, { user_id: 'u2', skill_id: 's1', status: 'requires_revalidation' }] });
check('G1 une compétence acquise dont la règle a changé passe « à revalider » pour cette personne seulement', pwR.skills.find((x) => x.skill.id === 's2').status === 'a_revalider' && pwR.skills.find((x) => x.skill.id === 's1').status !== 'a_revalider');
const Kr = [...K, { id: 'k0', title: 'Ancienne règle', kind: 'regle', status: 'remplace' }];
const pwOld = OrgInsight.pathway('u1', evs, Kr, skills, [...links, { skill_id: 's1', knowledge_id: 'k0' }], units, 'salle', []);
check('G2 une connaissance remplacée ne compte plus dans la compétence', !pwOld.skills.find((x) => x.skill.id === 's1').knowledge.some((x) => x.knowledge.id === 'k0'));

console.log(failed ? `\n${failed} échec(s)` : '\nTous les tests passent');
process.exit(failed ? 1 : 0);
