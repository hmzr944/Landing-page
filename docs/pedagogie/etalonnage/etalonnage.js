/* Outils de l'exercice d'étalonnage des correcteurs (mission 3a) : copies, feuilles de notes, calcul de l'accord.
   Aucun appel réseau, aucune donnée de participant. Utilisé par generer.js, rapport.js et tests/etalonnage.js. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const DIR = __dirname;
const ITEMS = require('./reponses-fictives.js');
const JEU = () => JSON.parse(fs.readFileSync(path.join(DIR, '..', 'jeu-de-mesure.json'), 'utf8'));

// ── Hasard reproductible (mulberry32), comme pour le jeu de mesure ──
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const seedOf = (s) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
function shuffle(list, seed) { const r = rng(seedOf(seed)), a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// Codes anonymes : rien n'y révèle la grille, le numéro ni le type de réponse. Les mêmes codes pour les deux correcteurs.
function codes(items = ITEMS) {
  const r = rng(seedOf('etalonnage-3a-codes')), A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', used = new Set(), map = {};
  for (const it of items) { let c; do { c = 'E-' + Array.from({ length: 4 }, () => A[Math.floor(r() * A.length)]).join(''); } while (used.has(c)); used.add(c); map[it.id] = c; }
  return map;
}
const ORDRE = { A: 'etalonnage-3a-ordre-correcteur-A', B: 'etalonnage-3a-ordre-correcteur-B' };

// ── Décision de déblocage (grille, partie 3) ──
const DECISIONS = ['non débloqué', 'partiellement débloqué', 'débloqué'];
const decision = (q1, q2) => { const s = q1 + q2; return s >= 3 ? 'débloqué' : s === 2 ? 'partiellement débloqué' : 'non débloqué'; };

// ── Copies des correcteurs : réponse + matériel de la grille, jamais la clé ──
const GRILLE = { B2: 'B2 · reformulation (C1, C2, C3, C4 : 0, 1 ou 2)', B3: 'B3 · transfert (note 0, 1 ou 2)', B4: 'B4 · déblocage (Q1 et Q2 : 0, 1 ou 2)' };
function bloc(it, el, code) {
  const L = [`## Réponse ${code}`, '', `**Grille :** ${GRILLE[it.grille]} · **Élément :** ${el.id}, ${el.sujet}`, ''];
  const q = (t) => `> ${String(t).replace(/\n/g, '\n> ')}`;
  if (it.grille === 'B2') {
    L.push('*Consigne donnée :* « Explique cette notion avec tes propres mots, comme à un ami qui n\'en a jamais entendu parler. »', '',
      `*Idée centrale attendue :* ${el.reformulation.idee_centrale}`, '', `*Éléments clés attendus :* ${el.reformulation.elements_cles.join(' ; ')}`, '',
      '**Réponse à noter :**', '', q(it.reponse), '', '| C1 | C2 | C3 | C4 | Hésitation (critères) |', '|---|---|---|---|---|', '|  |  |  |  |  |', '');
  } else if (it.grille === 'B3') {
    const t = el.transfert, k = t.criteres;
    L.push(`*Situation :* ${t.situation}`, '', `*Question :* ${t.question}`, '', `*Réponse attendue :* ${t.attendu}`, '');
    if (t.source) L.push(`*Appui dans la procédure :* ${t.source.map((s) => `« ${s} »`).join(' ')}`, '');
    L.push(`*Élément 1, décision :* ${k.decision}`, '', `*Élément 2, raison :* ${k.raison}`, '',
      `*Exemples de la grille :* 2 points « ${k.note2} » ; 1 point « ${k.note1} » ; 0 point « ${k.note0} »`, '',
      '**Réponse à noter :**', '', q(it.reponse), '', '| Note (0, 1, 2) | Hésitation |', '|---|---|', '|  |  |', '');
  } else {
    [['Q1', it.q1, el.deblocage[0]], ['Q2', it.q2, el.deblocage[1]]].forEach(([n, rep, d]) => {
      const k = d.criteres;
      L.push(`**${n}.** ${d.q}`, '', `*Bonne réponse :* ${d.choix[d.reponse]}`, '', `*Justification juste si elle contient :* ${k.raison}`, '',
        `*Exemples de la grille :* juste « ${k.juste} » ; insuffisant « ${k.insuffisant} » ; faux « ${k.faux} »`, '',
        `*Choix de la personne :* ${rep.choix}`, '', `*Justification de la personne :*`, '', q(rep.justification), '');
    });
    L.push('| Q1 (0, 1, 2) | Q2 (0, 1, 2) | Hésitation (Q1, Q2) |', '|---|---|---|', '|  |  |  |', '');
  }
  return L;
}
function copie(lettre) {
  const jeu = JEU(), map = codes(), order = shuffle(ITEMS, ORDRE[lettre]);
  const L = [`# Exercice d'étalonnage, mission 3a : copie du correcteur ${lettre}`, '',
    '**Réponses entièrement fabriquées pour l\'exercice : aucune ne vient d\'un participant.**', '',
    'Notez seul, sans échanger avec l\'autre correcteur, avec la grille `grille-reformulation.md` (parties 1, 2 et 3). Reportez vos notes dans votre feuille (`feuille-correcteur-' + lettre + '.csv`). Une fois remise, une note n\'est plus modifiée. En cas d\'hésitation entre deux notes, mettez la plus basse et indiquez le critère dans la colonne « hésitation ».', '',
    `${order.length} réponses. L'ordre est propre à votre copie.`, ''];
  order.forEach((it) => L.push(...bloc(it, jeu.elements.find((x) => x.id === it.element), map[it.id])));
  return L.join('\n') + '\n';
}
const COLS = ['code', 'grille', 'C1', 'C2', 'C3', 'C4', 'B3', 'Q1', 'Q2', 'hesitation', 'commentaire'];
function feuille(lettre) {
  const map = codes();
  return COLS.join(',') + '\n' + shuffle(ITEMS, ORDRE[lettre]).map((it) => [map[it.id], it.grille, '', '', '', '', '', '', '', '', ''].join(',')).join('\n') + '\n';
}

// ── Lecture des feuilles remplies ──
function parseCSV(txt) {
  const rows = [], re = /("([^"]|"")*"|[^,\n]*)(,|\n|$)/g; let row = [], m;
  const t = txt.replace(/\r/g, '');
  while ((m = re.exec(t)) && m[0] !== '') { let v = m[1]; if (v.startsWith('"')) v = v.slice(1, -1).replace(/""/g, '"'); row.push(v.trim()); if (m[3] !== ',') { rows.push(row); row = []; } }
  const [head, ...data] = rows.filter((r) => r.some((v) => v !== ''));
  return data.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
function lireFeuille(file) {
  const txt = fs.readFileSync(file, 'utf8'), erreurs = [], notes = {};
  for (const r of parseCSV(txt)) {
    const champs = r.grille === 'B2' ? ['C1', 'C2', 'C3', 'C4'] : r.grille === 'B3' ? ['B3'] : ['Q1', 'Q2'];
    const n = {};
    for (const c of champs) { if (!/^[012]$/.test(r[c] || '')) erreurs.push(`${r.code} : ${c} vide ou hors de 0, 1, 2`); n[c] = Number(r[c]); }
    notes[r.code] = { grille: r.grille, ...n, hesitation: (r.hesitation || '').split(/[;\s]+/).filter(Boolean), commentaire: r.commentaire || '' };
  }
  return { notes, erreurs, sha256: crypto.createHash('sha256').update(txt).digest('hex') };
}

// ── Accord : % d'accord exact et kappa de Cohen pondéré quadratique ──
function kappaQ(x, y, k) {
  const n = x.length; if (!n) return null;
  const O = Array.from({ length: k }, () => Array(k).fill(0)), ra = Array(k).fill(0), rb = Array(k).fill(0);
  x.forEach((a, i) => { O[a][y[i]]++; ra[a]++; rb[y[i]]++; });
  let num = 0, den = 0;
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) { const w = ((i - j) ** 2) / ((k - 1) ** 2); num += w * O[i][j] / n; den += w * (ra[i] * rb[j]) / (n * n); }
  return den === 0 ? null : 1 - num / den; // null : non calculable (aucune variation des notes)
}
function ic(x, y, k, B = 2000) {
  const r = rng(seedOf('etalonnage-3a-bootstrap')), v = [];
  for (let b = 0; b < B; b++) { const xs = [], ys = []; for (let i = 0; i < x.length; i++) { const j = Math.floor(r() * x.length); xs.push(x[j]); ys.push(y[j]); } const kk = kappaQ(xs, ys, k); if (kk !== null) v.push(kk); }
  if (v.length < B / 2) return null; v.sort((a, b) => a - b);
  return [v[Math.floor(0.025 * v.length)], v[Math.floor(0.975 * v.length) - 1]];
}
function mesure(nom, paires, k) {
  const x = paires.map((p) => p[0]), y = paires.map((p) => p[1]);
  return { nom, n: paires.length, exact: paires.filter(([a, b]) => a === b).length, kappa: kappaQ(x, y, k), ic: ic(x, y, k) };
}
function accord(A, B, items = ITEMS) {
  const map = codes(items), byCode = Object.fromEntries(items.map((it) => [map[it.id], it]));
  const vals = (g, f) => items.filter((it) => it.grille === g).map((it) => [A[map[it.id]][f], B[map[it.id]][f]]);
  const dec = (N, c) => DECISIONS.indexOf(decision(N[c].Q1, N[c].Q2));
  const b4 = items.filter((it) => it.grille === 'B4').map((it) => map[it.id]);
  const mesures = [
    ...['C1', 'C2', 'C3', 'C4'].map((c) => mesure(`B2 ${c}`, vals('B2', c), 3)),
    mesure('B2 total sur 8', items.filter((it) => it.grille === 'B2').map((it) => { const a = A[map[it.id]], b = B[map[it.id]]; return [a.C1 + a.C2 + a.C3 + a.C4, b.C1 + b.C2 + b.C3 + b.C4]; }), 9),
    mesure('B3 note sur 2', vals('B3', 'B3'), 3),
    mesure('B4 Q1', vals('B4', 'Q1'), 3), mesure('B4 Q2', vals('B4', 'Q2'), 3),
    mesure('B4 décision', b4.map((c) => [dec(A, c), dec(B, c)]), 3),
  ];
  const desaccords = [];
  for (const it of items) {
    const c = map[it.id], a = A[c], b = B[c];
    const champs = it.grille === 'B2' ? ['C1', 'C2', 'C3', 'C4'] : it.grille === 'B3' ? ['B3'] : ['Q1', 'Q2'];
    for (const f of champs) if (a[f] !== b[f]) desaccords.push({ code: c, id: it.id, champ: f, A: a[f], B: b[f], ecart: Math.abs(a[f] - b[f]) });
    if (it.grille === 'B4' && decision(a.Q1, a.Q2) !== decision(b.Q1, b.Q2)) desaccords.push({ code: c, id: it.id, champ: 'décision', A: decision(a.Q1, a.Q2), B: decision(b.Q1, b.Q2), ecart: Math.abs(dec(A, c) - dec(B, c)) });
  }
  const hesitations = items.map((it) => { const c = map[it.id]; return { code: c, id: it.id, A: A[c].hesitation, B: B[c].hesitation, nb: A[c].hesitation.length + B[c].hesitation.length, desaccords: desaccords.filter((d) => d.code === c).length }; })
    .filter((h) => h.nb || h.desaccords).sort((p, q) => (q.nb + q.desaccords) - (p.nb + p.desaccords));
  // Information secondaire : chaque correcteur comparé aux notes prévues par le concepteur (qui ne fait pas foi)
  const prevu = (N) => { let tot = 0, ok = 0; for (const it of items) { const c = map[it.id]; for (const [f, v] of Object.entries(it.prevu)) { if (f === 'decision') continue; const champ = f === 'note' ? 'B3' : f; tot++; if (N[c][champ] === v) ok++; } } return { ok, tot }; };
  return { mesures, desaccords, hesitations, prevu: { A: prevu(A), B: prevu(B) }, byCode };
}

module.exports = { ITEMS, JEU, codes, shuffle, ORDRE, copie, feuille, COLS, parseCSV, lireFeuille, kappaQ, ic, accord, decision, DECISIONS, DIR };
