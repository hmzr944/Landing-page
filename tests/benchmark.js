/* Banc d'essai de l'extraction (mission 2) : vérifications SANS appel à l'IA, exécutées par la CI.
   A. Le calcul des scores (tests/bench/score.mjs) se comporte comme documenté, sur des cas construits à la main.
   B. Les passages enregistrés sont exactement ceux que produit la lecture du navigateur (docs/benchmark/passages.json).
   C. Le rapport docs/benchmark-extraction.md contient exactement les résultats recalculés à partir des réponses brutes
      enregistrées : aucun chiffre du rapport ne peut avoir été modifié à la main.
   D. Les résultats enregistrés ne contiennent aucune clé ni en-tête d'authentification.
   Le banc lui-même (vrais appels au modèle) se lance à part : tests/bench/run.ts (voir docs/benchmark-extraction.md).
   Lancer depuis la racine du dépôt :  node tests/benchmark.js   (Playwright requis pour B). */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' : ' + extra : ''}`); if (!ok) failed++; };

(async () => {
  const S = await import(path.join(ROOT, 'tests/bench/score.mjs'));
  /* ---------- A. Calcul des scores ---------- */
  check('A1 une règle citée mot pour mot est retrouvée', S.covers('Ranger les produits acceptés en chambre froide dans les 15 minutes.', 'Ranger les produits acceptés en chambre froide dans les 15 minutes.') === 1);
  check('A2 une citation sans rapport ne correspond pas', S.covers('Ranger les produits acceptés en chambre froide dans les 15 minutes.', 'Les livraisons sont reçues entre 7 h et 10 h') < S.MATCH);
  check('A3 le signe compte : – 18 °C n’est pas 18 °C', JSON.stringify(S.numbers('Glaces : – 18 °C')) === '["-18"]' && S.valueExact('Glaces : – 18 °C.', { title: '', body: 'glaces à 18 °C' }) === false);
  check('A4 « quinze minutes » vaut 15 ; « une » n’est pas un nombre', JSON.stringify(S.numbers('dans les quinze minutes, une fois')) === '["15"]');
  check('A5 « 1 000 € » vaut 1000 et « 9 h 00 » vaut 9 h', JSON.stringify(S.numbers('plus de 1 000 € dès 9 h 00')) === '["1000","9"]');
  check('A6 une valeur changée (150 au lieu de 200) est une valeur fausse', S.valueExact('Le fond de caisse est de 200 €.', { title: 'Fond de caisse', body: 'Le fond de caisse est de 150 €.' }) === false);
  const ext = S.scoreExtraction([{ id: 'r', texte: 'Le fond de caisse est de 200 €.', sensible: false }],
    [{ kind: 'regle', title: 'Fond', body: 'Fond de caisse : 200 €.', quote: 'Le fond de caisse est de 200 €.' }],
    [{ kind: 'regle', title: 'Fond', body: 'Fond de caisse : 200 €.', quote: 'Le fond de caisse est de 200 €.' }, { kind: 'regle', title: 'x', body: 'Le coffre ferme à 21 h.', quote: 'Le coffre ferme à 21 h.' }],
    'Le fond de caisse est de 200 €.');
  check('A7 une connaissance absente du document compte comme invention avant le filtre, pas après', ext.inventions_avant_filtre === 1 && ext.inventions_apres_filtre === 0 && ext.per[0].found && ext.per[0].valeur_exacte === true);
  const kn = [{ id: 'k1', texte: 'Le fond de caisse est de 150 €.', regle: 'F' }, { id: 'k2', texte: 'Allumer l’éclairage et démarrer les caisses.', regle: null }];
  const gold = { changements: [{ id: 'c1', type: 'modifie', regle: 'F' }], non_changements: [{ type: 'reformulation', avant: 'Allumer l’éclairage et démarrer les caisses.', apres: 'Démarrer les caisses, puis allumer l’éclairage.' }] };
  const good = S.scoreComparison(kn, [{ knowledge_id: 'k1', change: 'modifie' }, { knowledge_id: 'k2', change: 'reformule' }], gold, []);
  const bad = S.scoreComparison(kn, [{ knowledge_id: 'k1', change: 'inchange' }, { knowledge_id: 'k2', change: 'modifie' }], gold, []);
  check('A8 comparaison : changement détecté et reformulation sans alerte', good.detections[0].detecte && !good.traps[0].fausse_alerte);
  check('A9 comparaison : changement manqué et fausse alerte sur le piège', !bad.detections[0].detecte && bad.traps[0].fausse_alerte);

  /* ---------- B. Passages ---------- */
  try { execFileSync('node', [path.join(ROOT, 'tests/bench/passages.js'), '--check'], { stdio: 'pipe' }); check('B1 passages.json correspond à la lecture actuelle du navigateur', true); }
  catch (e) { check('B1 passages.json correspond à la lecture actuelle du navigateur', false, String(e.stdout || e.message).trim().slice(0, 200)); }

  /* ---------- C. Rapport ---------- */
  const R = await import(path.join(ROOT, 'tests/bench/report.mjs'));
  const runs = R.loadRuns('mission-2');
  check('C1 au moins trois passages enregistrés (mission 2)', runs.length >= 3, String(runs.length));
  const doc = fs.readFileSync(path.join(ROOT, 'docs/benchmark-extraction.md'), 'utf8');
  check('C2 le rapport de la mission 2 contient exactement les résultats recalculés à partir des réponses brutes', doc.includes(R.block(runs)));
  const runs2b = R.loadRuns('mission-2b');
  if (runs2b.length) {
    check('C3 au moins trois passages indépendants enregistrés (mission 2b)', runs2b.length >= 3, String(runs2b.length));
    const doc2b = fs.readFileSync(path.join(ROOT, 'docs/benchmark-extraction-2b.md'), 'utf8');
    check('C4 le rapport de la mission 2b contient exactement ses résultats recalculés et la comparaison avant / après', doc2b.includes(R.block(runs2b)) && doc2b.includes(R.compareBlock(runs, runs2b)));
  }

  const runs2c = R.loadRuns('mission-2c');
  if (runs2c.length) {
    check('C5 au moins trois passages indépendants enregistrés (mission 2c)', runs2c.length >= 3, String(runs2c.length));
    const doc2c = fs.readFileSync(path.join(ROOT, 'docs/benchmark-extraction-2c.md'), 'utf8');
    check('C6 le rapport de la mission 2c contient exactement ses résultats, ses critères et le contrôle hors corpus recalculés', doc2c.includes(R.block(runs2c)) && doc2c.includes(R.criteriaBlock(runs2c)) && doc2c.includes(R.horsBlock(runs2c)));
  }

  /* ---------- D. Aucun secret ---------- */
  const files = ['runs', 'runs-2b', 'runs-2c'].filter((d) => fs.existsSync(path.join(ROOT, 'docs/benchmark', d))).flatMap((d) => fs.readdirSync(path.join(ROOT, 'docs/benchmark', d)).map((f) => fs.readFileSync(path.join(ROOT, 'docs/benchmark', d, f), 'utf8'))).join('\n');
  check('D1 aucune clé ni en-tête d’authentification dans les résultats enregistrés', !/gsk_[A-Za-z0-9]{8,}|sk-[A-Za-z0-9]{16,}|authorization|Bearer\s+[A-Za-z0-9._-]{12,}|service_role/i.test(files));

  console.log(failed ? `\n${failed} échec(s)` : '\nTous les tests passent');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
