/* Règles de lecture des preuves (js/org-insight.js), testées seules : node tests/org-insight.js */
global.window = {};
require('../js/org-insight.js');
const I = global.window.OrgInsight;
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' : ' + extra : ''}`); if (!ok) failed++; };
const D = (n) => new Date(Date.UTC(2026, 10, 1) + n * 864e5).toISOString();
const ev = (user, k, day, outcome, confidence = null, extra = {}) => ({ user_id: user, knowledge_id: k, at: D(day), outcome, confidence, activity: 'simulation', session_id: 's' + day, ...extra });

check('R1 une seule simulation réussie ne donne jamais « maîtrise durable »', I.stateOf([ev('a', 'k', 0, 'juste', 'reflexe')]) === 'en_cours');
check('R2 deux réussites le même jour : solide, à confirmer', I.stateOf([ev('a', 'k', 0, 'juste', 'sait'), ev('a', 'k', 0, 'juste', 'sait')]) === 'solide');
check('R3 deux réussites à 7 jours d’écart, la dernière juste : maîtrise durable', I.stateOf([ev('a', 'k', 0, 'juste', 'sait'), ev('a', 'k', 7, 'juste', 'sait')]) === 'durable');
check('R4 deux réussites à 6 jours seulement : pas encore durable', I.stateOf([ev('a', 'k', 0, 'juste', 'sait'), ev('a', 'k', 6, 'juste', 'sait')]) === 'solide');
check('R5 une erreur après des réussites l’emporte (le plus récent compte)', I.stateOf([ev('a', 'k', 0, 'juste'), ev('a', 'k', 8, 'juste'), ev('a', 'k', 9, 'faux', 'devine')]) === 'a_retravailler');
check('R6 une erreur annoncée comme sûre est une fausse certitude', I.stateOf([ev('a', 'k', 0, 'faux', 'reflexe')]) === 'fausse_certitude' && I.stateOf([ev('a', 'k', 0, 'faux', 'sait')]) === 'fausse_certitude');
check('R7 juste en devinant : hésitant', I.stateOf([ev('a', 'k', 0, 'juste', 'devine')]) === 'hesitant');

const ks = [{ id: 'k1', title: 'Autonomie', page: 1 }, { id: 'k2', title: 'Batterie', page: 2 }];
const p = I.person('a', [ev('a', 'k1', 0, 'faux', 'reflexe', { activity: 'diagnostic', session_id: 'd1' }), ev('a', 'k2', 0, 'juste', 'sait', { activity: 'diagnostic', session_id: 'd1' })], ks);
check('P1 la fausse certitude passe en tête et guide la recommandation, avec la page', p.items[0].state === 'fausse_certitude' && p.next.kind === 'revoir' && /Autonomie/.test(p.next.text) && /p\. 1/.test(p.next.text));
check('P2 sans diagnostic, la recommandation est de le faire', I.person('b', [], ks).next.kind === 'diagnostic');
check('P3 diagnostic fait sans erreur ni simulation : jouer un client mystère', I.person('c', [ev('c', 'k2', 0, 'juste', 'sait', { activity: 'diagnostic', session_id: 'd2' })], ks).next.kind === 'mystere');

const members = [{ user_id: 'a' }, { user_id: 'b' }, { user_id: 'c' }];
const small = I.team([ev('a', 'k1', 0, 'faux', 'reflexe'), ev('a', 'k1', 1, 'faux', 'sait')], ks, members);
check('T1 un échantillon trop petit (une seule personne) ne produit aucune fragilité', small.fragile.length === 0 && small.insufficient === 1);
const big = I.team([ev('a', 'k1', 0, 'faux', 'reflexe'), ev('b', 'k1', 1, 'faux', 'sait'), ev('c', 'k1', 2, 'juste'), ev('a', 'k2', 0, 'faux', 'devine'), ev('b', 'k2', 0, 'juste'), ev('c', 'k2', 3, 'juste')], ks, members);
check('T2 avec 3 observations sur 2 personnes, la fragilité apparaît, la fausse certitude pèse plus', big.fragile.length === 2 && big.fragile[0].knowledge.id === 'k1' && big.fragile[0].falseCert === 2);
check('T3 la taille de l’échantillon, la période et la couverture sont fournies', big.sample.evidence === 6 && big.sample.people === 3 && big.sample.members === 3 && big.sample.from === D(0) && big.sample.to === D(3));
check('T4 le niveau de confiance suit la taille de l’échantillon', big.fragile[0].confidence === 'faible');

console.log(failed ? `\n${failed} test(s) en échec` : '\nTous les tests passent');
process.exit(failed ? 1 : 0);
