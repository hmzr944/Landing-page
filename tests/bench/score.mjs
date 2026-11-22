/* Banc d'essai de l'extraction (mission 2) : calcul des scores, SANS IA et sans réseau.
   Utilisé par tests/bench/run.ts (Deno), tests/bench/report.mjs et tests/benchmark.js (Node, CI).
   Toutes les règles de correspondance sont écrites ici, pour qu'un résultat puisse être recalculé et contesté.

   Correspondance règle attendue ↔ connaissance extraite : au moins 50 % des suites de 4 mots de la règle (sans accents ni
   ponctuation) se retrouvent dans l'extrait (« quote ») de la connaissance. Une règle de moins de 4 mots doit y figurer entière.
   Valeur chiffrée exacte : la règle contient au moins un nombre, elle est retrouvée, et TOUS ses nombres (signe compris :
   – 18 n'est pas 18) figurent dans le titre ou le texte de la connaissance extraite (nombres écrits en lettres convertis :
   « quinze » = 15 ; « un » et « une » ne sont pas convertis, trop souvent des articles).
   Invention : extrait introuvable dans le document, ou nombre du texte de la connaissance absent du document. */

export const flat = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const grams = (words, n = 4) => { const out = []; for (let i = 0; i + n <= words.length; i++) out.push(words.slice(i, i + n).join(' ')); return out; };

export function covers(rule, quote) {
  const w = flat(rule).split(' ').filter(Boolean);
  const hay = ` ${flat(quote)} `;
  if (!w.length) return 0;
  if (w.length < 4) return hay.includes(` ${w.join(' ')} `) ? 1 : 0;
  const g = grams(w);
  return g.filter((x) => hay.includes(` ${x} `)).length / g.length;
}
export const MATCH = 0.5;

// Nombres écrits en lettres (« quinze minutes ») : convertis avant comparaison, une valeur juste écrite en lettres reste juste
const UNITS = { zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16 };
const TENS = { vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60 };
export function wordsToDigits(t) {
  return String(t ?? '').replace(/\b(vingt|trente|quarante|cinquante|soixante)(?:[- ](?:et[- ])?(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix))?\b/gi, (m, a, b) => String(TENS[a.toLowerCase()] + (b ? UNITS[b.toLowerCase()] : 0)))
    .replace(/\b(zero|zéro|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|cent|mille)\b/gi, (m) => { const k = m.toLowerCase().replace('é', 'e'); return String(k === 'cent' ? 100 : k === 'mille' ? 1000 : UNITS[k]); });
}
// Nombres d'un texte, signe compris ; « 1 000 » = 1000 ; « 9 h 00 » = 9 h ; virgule décimale = point
export function numbers(t) {
  const s = wordsToDigits(t).replace(/(\d)\s*h\s*00\b/g, '$1 h').replace(/(\d)[   ](?=\d{3}\b)/g, '$1');
  return (s.match(/(?:[-–−]\s?)?\d+(?:[.,]\d+)?/g) || []).map((x) => {
    const neg = /^[-–−]/.test(x);
    const v = x.replace(/^[-–−]\s?/, '').replace(',', '.');
    return (neg ? '-' : '') + String(Number(v));
  });
}
export const valueExact = (rule, item) => { const want = numbers(rule); if (!want.length) return null; const have = new Set(numbers(`${item.title} ${item.body}`)); return want.every((n) => have.has(n)); };

/* Extraction d'un document : rules = règles attendues du corrigé ; items = connaissances gardées par le serveur ;
   raw = connaissances proposées par le modèle avant le filtre du serveur ; docText = texte du document (serveur). */
export function scoreExtraction(rules, items, raw, docText) {
  const doc = ` ${flat(docText)} `;
  const docNums = new Set(numbers(docText));
  const per = rules.map((r) => {
    let best = null, bestC = 0;
    items.forEach((it) => { const c = covers(r.texte, it.quote); if (c > bestC) { bestC = c; best = it; } });
    const found = bestC >= MATCH;
    return { id: r.id, sensible: !!r.sensible, base: r.base, found, cover: Math.round(bestC * 100) / 100,
      chiffree: numbers(r.texte).length > 0, valeur_exacte: found ? valueExact(r.texte, best) : (numbers(r.texte).length ? false : null),
      classee_sensible: found && r.sensible ? best.kind === 'sensible' : null };
  });
  const invented = (list) => list.filter((it) => {
    const q = flat(it.quote);
    const quoteOk = q.length >= 4 && doc.includes(` ${q} `);
    const numsOk = numbers(`${it.title || ''} ${it.body || ''}`).every((n) => docNums.has(n));
    return !quoteOk || !numsOk;
  }).length;
  const matchedAny = (it) => rules.some((r) => covers(r.texte, it.quote) >= MATCH);
  return { per, items: items.length, raw: raw.length, inventions_avant_filtre: invented(raw), inventions_apres_filtre: invented(items), hors_corrige: items.filter((it) => !matchedAny(it)).length };
}

/* Comparaison de versions. knowledge = connaissances de la v1 (id, texte, regle) ; changes = éléments produits par
   compareVersions ; gold = changements et non-changements du corrigé ; v2rules = règles attendues de la v2. */
// opts.regles2c : règles de calcul de la mission 2c (2026-11-22) ; sans elles, calcul identique aux campagnes 2 et 2b
export function scoreComparison(knowledge, changes, gold, v2rules, opts = {}) {
  const byK = new Map(changes.filter((c) => c.knowledge_id).map((c) => [c.knowledge_id, c]));
  const kOfRule = (id) => knowledge.find((k) => k.regle === id);
  // un changement sans règle d'extraction (changement d'ordre de R1, décision du 2026-11-22) se repère par son texte en v1
  const kOf = (g) => (g.regle ? kOfRule(g.regle) : knowledge.find((k) => flat(k.texte) === flat(g.avant)));
  const alert = (c) => c && ['modifie', 'supprime'].includes(c.change);
  const news = changes.filter((c) => c.change === 'nouveau');
  const detections = gold.changements.map((g) => {
    if (g.type === 'ajoute') {
      const rule = v2rules.find((r) => r.id === g.regle);
      const hit = news.some((c) => covers(rule.texte, c.new_quote) >= MATCH);
      return { id: g.id, type: g.type, detecte: hit, type_exact: hit };
    }
    const k = kOf(g), c = k && byK.get(k.id);
    return { id: g.id, type: g.type, detecte: !!alert(c), type_exact: !!c && c.change === g.type, obtenu: c ? c.change : 'absent' };
  });
  const traps = gold.non_changements.map((n, i) => {
    const text = n.type === 'reformulation' ? n.avant : n.texte;
    const ks = knowledge.filter((k) => covers(text, k.texte) >= MATCH || flat(k.texte).includes(flat(text)));
    const alerted = ks.filter((k) => alert(byK.get(k.id)));
    const newOnTrap = n.type === 'reformulation' ? news.filter((c) => covers(n.apres, c.new_quote) >= MATCH) : [];
    return { piege: `${n.type} ${i + 1}`, connaissances: ks.length, fausse_alerte: alerted.length > 0 || newOnTrap.length > 0 };
  });
  const targeted = new Set(gold.changements.map((g) => g.type !== 'ajoute' && kOf(g)?.id).filter(Boolean));
  const trapK = new Set(gold.non_changements.flatMap((n) => knowledge.filter((k) => { const t = n.type === 'reformulation' ? n.avant : n.texte; return covers(t, k.texte) >= MATCH || flat(k.texte).includes(flat(t)); }).map((k) => k.id)));
  const autres = knowledge.filter((k) => !targeted.has(k.id) && !trapK.has(k.id) && alert(byK.get(k.id))).map((k) => k.regle || k.id);
  // Nouveauté non fondée : signalée « nouvelle » alors que son texte figurait déjà dans la v1 (fausse alerte pour le
  // responsable, qui doit la relire pour rien). Mesure ajoutée en mission 2b, recalculée aussi pour la mission 2.
  // Une nouveauté attendue par le corrigé n'est jamais « non fondée », même si sa phrase existait ailleurs en v1 (cas 2 du
  // contrôle hors corpus : même formulation, sens opérationnel nouveau).
  const attendues = gold.changements.filter((g) => g.type === 'ajoute').map((g) => (v2rules.find((r) => r.id === g.regle) || {}).texte).filter(Boolean);
  const nonFondees = news.filter((c) => !(opts.regles2c && attendues.some((t) => covers(t, c.new_quote) >= MATCH))
    && knowledge.some((k) => covers(c.new_quote, k.texte) >= 0.8 || covers(k.texte, c.new_quote) >= 0.8)).length;
  return { detections, traps, autres_fausses_alertes: autres, nouveautes_non_fondees: nonFondees, nouveautes: news.length };
}

// Seuils fixés le 2026-11-18 : sur CHACUN des passages
// Seuils fixés le 2026-11-18 : sur CHACUN des passages. Le nombre de changements et de pièges vient du corrigé de la
// campagne (9 et 4 jusqu'au 2026-11-22 ; 10 et 3 ensuite, décision sur R1) : tous détectés, aucune fausse alerte.
export const THRESHOLDS = { valeurs_exactes: 1, sensibles_min: 43, fausses_alertes_pieges: 0 };
// Critères supplémentaires de la mission 2c (fixés le 2026-11-22, avant la campagne) : aucune nouveauté non fondée,
// aucune invention gardée, pas de régression de l'extraction (au moins 73 règles sur 74, le pire passage de la mission 2b).
export const CRITERES_2C = { nouveautes_non_fondees: 0, inventions_apres_filtre: 0, regles_min: 73 };
export const criteres2c = (s) => ({
  nouveautes: s.nouveautes_non_fondees === CRITERES_2C.nouveautes_non_fondees,
  inventions: s.inventions_apres_filtre === CRITERES_2C.inventions_apres_filtre,
  extraction: s.regles_trouvees >= CRITERES_2C.regles_min,
});

export function summarize(run) {
  const per = run.extraction.flatMap((d) => d.score.per);
  const chif = per.filter((p) => p.chiffree);
  const sens = per.filter((p) => p.sensible);
  const det = run.comparaison.flatMap((c) => c.score.detections);
  const traps = run.comparaison.flatMap((c) => c.score.traps);
  const s = {
    regles_trouvees: per.filter((p) => p.found).length, regles_total: per.length,
    valeurs_exactes: chif.filter((p) => p.valeur_exacte).length, valeurs_total: chif.length,
    sensibles_trouvees: sens.filter((p) => p.found).length, sensibles_total: sens.length,
    sensibles_bien_classees: sens.filter((p) => p.classee_sensible).length,
    inventions_avant_filtre: run.extraction.reduce((a, d) => a + d.score.inventions_avant_filtre, 0),
    inventions_apres_filtre: run.extraction.reduce((a, d) => a + d.score.inventions_apres_filtre, 0),
    proposees_avant_filtre: run.extraction.reduce((a, d) => a + d.score.raw, 0),
    gardees: run.extraction.reduce((a, d) => a + d.score.items, 0),
    hors_corrige: run.extraction.reduce((a, d) => a + d.score.hors_corrige, 0),
    changements_detectes: det.filter((x) => x.detecte).length, changements_total: det.length,
    changements_type_exact: det.filter((x) => x.type_exact).length,
    fausses_alertes_pieges: traps.filter((t) => t.fausse_alerte).length, pieges_total: traps.length,
    autres_fausses_alertes: run.comparaison.reduce((a, c) => a + c.score.autres_fausses_alertes.length, 0),
    nouveautes_non_fondees: run.comparaison.reduce((a, c) => a + (c.score.nouveautes_non_fondees || 0), 0),
    nouveautes: run.comparaison.reduce((a, c) => a + (c.score.nouveautes || 0), 0),
  };
  s.seuils = {
    valeurs_exactes: s.valeurs_exactes === s.valeurs_total,
    sensibles: s.sensibles_trouvees >= THRESHOLDS.sensibles_min,
    changements: s.changements_total > 0 && s.changements_detectes === s.changements_total,
    pieges: s.fausses_alertes_pieges === THRESHOLDS.fausses_alertes_pieges,
  };
  s.seuils_atteints = Object.values(s.seuils).every(Boolean);
  return s;
}
