/* Banc d'essai de l'extraction (mission 2), étape 3 : tableau des résultats, RECALCULÉ à partir des réponses brutes
   enregistrées (docs/benchmark/runs/passage-*.json) avec tests/bench/score.mjs. Aucune valeur n'est recopiée à la main.
   node tests/bench/report.mjs            → écrit le bloc de résultats dans docs/benchmark-extraction.md
   node tests/bench/report.mjs --check    → vérifie que le rapport contient exactement ce bloc (utilisé par la CI) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreComparison, scoreExtraction, summarize, THRESHOLDS } from './score.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const corpus = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/corpus-metier/corpus.json'), 'utf8'));
const passages = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/benchmark/passages.json'), 'utf8'));
// Deux campagnes : mission 2 (référence « avant ») et mission 2b (« après »), chacune avec son rapport
export const CAMPAGNES = {
  'mission-2': { runs: path.join(ROOT, 'docs/benchmark/runs'), report: path.join(ROOT, 'docs/benchmark-extraction.md') },
  'mission-2b': { runs: path.join(ROOT, 'docs/benchmark/runs-2b'), report: path.join(ROOT, 'docs/benchmark-extraction-2b.md') },
};
const START = '<!-- RESULTATS:DEBUT (généré par tests/bench/report.mjs, ne pas modifier à la main) -->', END = '<!-- RESULTATS:FIN -->';
const START_CMP = '<!-- COMPARAISON:DEBUT (généré par tests/bench/report.mjs, ne pas modifier à la main) -->', END_CMP = '<!-- COMPARAISON:FIN -->';

export function rescore(run) {
  const extraction = run.extraction.map((d) => {
    const doc = corpus.documents.find((x) => x.id === d.id);
    const text = passages.documents.find((x) => x.id === d.id).batches.flat().map((p) => p.text).join(' ');
    const items = d.appels.flatMap((c) => (c.reponse && c.reponse.items) || []);
    const raw = d.appels.flatMap((c) => c.proposees || []);
    return { id: d.id, erreurs: d.appels.filter((c) => c.status !== 200).length, score: scoreExtraction(doc.regles_attendues, items, raw, text) };
  });
  const comparaison = run.comparaison.map((c) => {
    const v2 = corpus.documents.find((x) => x.id === c.id);
    return { id: c.id, analysee: !!(c.resultat && c.resultat.summary && c.resultat.summary.analysed), erreur: c.erreur, score: scoreComparison(c.connaissances_v1, c.elements, v2, v2.regles_attendues) };
  });
  return { passage: run.passage, date: run.date, modeles: run.modeles_utilises, attentes: run.attentes_limite_debit || 0, extraction, comparaison };
}

export function loadRuns(campagne = 'mission-2') {
  const RUNS = CAMPAGNES[campagne].runs;
  if (!fs.existsSync(RUNS)) return [];
  return fs.readdirSync(RUNS).filter((f) => /^passage-\d+\.json$/.test(f)).sort().map((f) => rescore(JSON.parse(fs.readFileSync(path.join(RUNS, f), 'utf8'))));
}

const pct = (a, b) => (b ? `${Math.round((a / b) * 100)} %` : '–');
const yes = (b) => (b ? 'oui' : '**non**');
export function block(runs) {
  const S = runs.map((r) => ({ r, s: summarize(r) }));
  const avg = (k) => (S.reduce((a, x) => a + x.s[k], 0) / S.length);
  const minmax = (k) => `${Math.min(...S.map((x) => x.s[k]))} à ${Math.max(...S.map((x) => x.s[k]))}`;
  const L = [];
  L.push(`Passages mesurés : ${runs.length}. Modèle(s) : ${[...new Set(runs.flatMap((r) => r.modeles))].join(', ')}. Attentes dues à la limite de débit : ${runs.map((r) => r.attentes).join(', ')}.`, '');
  L.push('### Seuils (à atteindre sur chacun des passages)', '');
  L.push(`| Seuil | ${S.map((x) => `Passage ${x.r.passage}`).join(' | ')} |`, `|---|${S.map(() => '---').join('|')}|`);
  L.push(`| Valeurs chiffrées exactes : 100 % | ${S.map((x) => `${x.s.valeurs_exactes}/${x.s.valeurs_total} (${yes(x.s.seuils.valeurs_exactes)})`).join(' | ')} |`);
  L.push(`| Règles sensibles retrouvées : au moins ${THRESHOLDS.sensibles_min}/47 | ${S.map((x) => `${x.s.sensibles_trouvees}/${x.s.sensibles_total} (${yes(x.s.seuils.sensibles)})`).join(' | ')} |`);
  L.push(`| Changements détectés : 9/9 | ${S.map((x) => `${x.s.changements_detectes}/${x.s.changements_total} (${yes(x.s.seuils.changements)})`).join(' | ')} |`);
  L.push(`| Fausses alertes sur les 4 pièges : 0 | ${S.map((x) => `${x.s.fausses_alertes_pieges} (${yes(x.s.seuils.pieges)})`).join(' | ')} |`);
  L.push(`| **Les quatre seuils** | ${S.map((x) => (x.s.seuils_atteints ? 'atteints' : '**non atteints**')).join(' | ')} |`, '');
  L.push('### Autres mesures', '');
  L.push(`| Mesure | ${S.map((x) => `P${x.r.passage}`).join(' | ')} | Moyenne | Écart (min à max) |`, `|---|${S.map(() => '---').join('|')}|---|---|`);
  const row = (label, k, tot) => L.push(`| ${label} | ${S.map((x) => (tot ? `${x.s[k]}/${x.s[tot]}` : `${x.s[k]}`)).join(' | ')} | ${avg(k).toFixed(1)}${tot ? ` (${pct(avg(k), avg(tot))})` : ''} | ${minmax(k)} |`);
  row('Règles retrouvées (74)', 'regles_trouvees', 'regles_total');
  row('Sensibles retrouvées (47)', 'sensibles_trouvees', 'sensibles_total');
  row('Sensibles retrouvées et classées « sensible »', 'sensibles_bien_classees', 'sensibles_trouvees');
  row('Valeurs chiffrées exactes', 'valeurs_exactes', 'valeurs_total');
  row('Connaissances proposées par le modèle', 'proposees_avant_filtre');
  row('Connaissances gardées par le serveur', 'gardees');
  row('Inventions avant le filtre du serveur', 'inventions_avant_filtre');
  row('Inventions après le filtre du serveur', 'inventions_apres_filtre');
  row('Gardées hors corrigé (vraies mais non attendues)', 'hors_corrige');
  row('Changements détectés (9)', 'changements_detectes', 'changements_total');
  row('Changements avec le bon type', 'changements_type_exact', 'changements_total');
  row('Fausses alertes sur les pièges (4)', 'fausses_alertes_pieges', 'pieges_total');
  row('Autres fausses alertes (règles inchangées signalées)', 'autres_fausses_alertes');
  row('Nouveautés signalées par la comparaison', 'nouveautes');
  row('dont non fondées (texte déjà présent en v1)', 'nouveautes_non_fondees', 'nouveautes');
  L.push('', '### Détail par document (règles retrouvées, par passage)', '');
  L.push(`| Document | ${S.map((x) => `P${x.r.passage}`).join(' | ')} | Règles le plus souvent manquées |`, `|---|${S.map(() => '---').join('|')}|---|`);
  runs[0].extraction.forEach((d0, i) => {
    const miss = {};
    runs.forEach((r) => r.extraction[i].score.per.filter((p) => !p.found).forEach((p) => { miss[p.id] = (miss[p.id] || 0) + 1; }));
    const top = Object.entries(miss).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} (${v}/${runs.length})`).join(', ') || 'aucune';
    L.push(`| ${d0.id} | ${runs.map((r) => { const p = r.extraction[i].score.per; const e = r.extraction[i].erreurs; return `${p.filter((x) => x.found).length}/${p.length}${e ? ' (erreur)' : ''}`; }).join(' | ')} | ${top} |`);
  });
  L.push('', '### Détail de la comparaison de versions', '');
  L.push(`| Changement attendu | ${S.map((x) => `P${x.r.passage}`).join(' | ')} |`, `|---|${S.map(() => '---').join('|')}|`);
  runs[0].comparaison.forEach((c0, i) => c0.score.detections.forEach((d, j) => L.push(`| ${d.id} (${d.type}) | ${runs.map((r) => { const x = r.comparaison[i].score.detections[j]; return x.detecte ? (x.type_exact ? 'détecté' : `détecté, classé « ${x.obtenu} »`) : `**manqué** (${x.obtenu || 'absent'})`; }).join(' | ')} |`)));
  runs[0].comparaison.forEach((c0, i) => c0.score.traps.forEach((t, j) => L.push(`| Piège ${c0.id} ${t.piege} | ${runs.map((r) => (r.comparaison[i].score.traps[j].fausse_alerte ? '**fausse alerte**' : 'pas d’alerte')).join(' | ')} |`)));
  return [START, ...L, END].join('\n');
}

// Avant (mission 2) et après (mission 2b) côte à côte : moyennes et pires passages, mêmes seuils
export function compareBlock(before, after) {
  const B = before.map(summarize), A = after.map(summarize);
  const avg = (xs, k) => (xs.reduce((a, x) => a + x[k], 0) / xs.length).toFixed(1);
  const min = (xs, k) => Math.min(...xs.map((x) => x[k])), max = (xs, k) => Math.max(...xs.map((x) => x[k]));
  const L = ['| Mesure | Avant : moyenne (pire passage) | Après : moyenne (pire passage) |', '|---|---|---|'];
  const row = (label, k, worst = 'min') => L.push(`| ${label} | ${avg(B, k)} (${worst === 'min' ? min(B, k) : max(B, k)}) | ${avg(A, k)} (${worst === 'min' ? min(A, k) : max(A, k)}) |`);
  row('Valeurs chiffrées exactes (sur 49)', 'valeurs_exactes');
  row('Règles sensibles retrouvées (sur 47)', 'sensibles_trouvees');
  row('Changements détectés (sur 9)', 'changements_detectes');
  row('Fausses alertes sur les pièges (sur 4)', 'fausses_alertes_pieges', 'max');
  row('Règles retrouvées (sur 74)', 'regles_trouvees');
  row('Sensibles classées « sensible »', 'sensibles_bien_classees');
  row('Inventions après le filtre du serveur', 'inventions_apres_filtre', 'max');
  row('Nouveautés non fondées (texte déjà présent en v1)', 'nouveautes_non_fondees', 'max');
  L.push(`| Passages où les quatre seuils sont atteints | ${B.filter((x) => x.seuils_atteints).length} sur ${B.length} | ${A.filter((x) => x.seuils_atteints).length} sur ${A.length} |`);
  return [START_CMP, ...L, END_CMP].join('\n');
}

function writeBetween(file, start, end, text, check) {
  const doc = fs.readFileSync(file, 'utf8');
  const i = doc.indexOf(start), j = doc.indexOf(end);
  if (i < 0 || j < 0) throw new Error(`marqueurs absents de ${path.basename(file)}`);
  const current = doc.slice(i, j + end.length);
  if (check) return current === text;
  fs.writeFileSync(file, doc.slice(0, i) + text + doc.slice(j + end.length));
  return true;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const check = process.argv.includes('--check');
  let ok = true;
  for (const [name, c] of Object.entries(CAMPAGNES)) {
    const runs = loadRuns(name);
    if (!runs.length || !fs.existsSync(c.report)) { console.log(`${name} : aucune campagne enregistrée`); continue; }
    ok = writeBetween(c.report, START, END, block(runs), check) && ok;
    if (name === 'mission-2b') ok = writeBetween(c.report, START_CMP, END_CMP, compareBlock(loadRuns('mission-2'), runs), check) && ok;
    console.log(`${name} : ${check ? (ok ? 'rapport à jour' : 'rapport PAS à jour : relancer node tests/bench/report.mjs') : 'rapport écrit'}`);
  }
  process.exit(ok ? 0 : 1);
}
