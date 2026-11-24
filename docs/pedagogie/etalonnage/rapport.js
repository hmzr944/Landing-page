/* Rapport de l'exercice d'étalonnage. Lit les feuilles remplies, si elles existent :
     notes/notes-correcteur-A.csv et notes/notes-correcteur-B.csv  (copies des feuilles, remplies par chaque correcteur)
   Sans elles, le rapport est écrit avec « NON MESURÉ » à la place des notes et des accords : rien n'est estimé.
   Lancer depuis la racine :  node docs/pedagogie/etalonnage/rapport.js   (--check : vérifie que le rapport est à jour) */
const fs = require('fs'), path = require('path');
const E = require('./etalonnage.js');
const NOTES = process.env.ETALONNAGE_NOTES_DIR || path.join(E.DIR, 'notes'); // autre dossier : seulement pour les tests
const FA = path.join(NOTES, 'notes-correcteur-A.csv'), FB = path.join(NOTES, 'notes-correcteur-B.csv');
const fr = (x, d = 2) => x === null || x === undefined ? 'non calculable' : x.toFixed(d).replace('.', ',');
const pct = (a, n) => n ? `${fr((100 * a) / n, 0)} %` : '–';
const esc = (t) => String(t).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const prevuTxt = (it) => it.grille === 'B2' ? `C1 ${it.prevu.C1}, C2 ${it.prevu.C2}, C3 ${it.prevu.C3}, C4 ${it.prevu.C4} (total ${it.prevu.C1 + it.prevu.C2 + it.prevu.C3 + it.prevu.C4})` : it.grille === 'B3' ? `${it.prevu.note}` : `Q1 ${it.prevu.Q1}, Q2 ${it.prevu.Q2} : ${it.prevu.decision}`;
const repTxt = (it) => it.grille === 'B4' ? `Q1 : « ${it.q1.choix} » ; « ${it.q1.justification} » · Q2 : « ${it.q2.choix} » ; « ${it.q2.justification} »` : `« ${it.reponse} »`;

function build() {
  const map = E.codes(), items = E.ITEMS;
  const mesure = fs.existsSync(FA) && fs.existsSync(FB);
  let A, B, res, erreurs = [];
  if (mesure) {
    A = E.lireFeuille(FA); B = E.lireFeuille(FB); erreurs = [...A.erreurs.map((e) => 'A ' + e), ...B.erreurs.map((e) => 'B ' + e)];
    if (!erreurs.length) res = E.accord(A.notes, B.notes);
  }
  const L = ['# Exercice d\'étalonnage des correcteurs, mission 3a : rapport', '',
    'Généré par `docs/pedagogie/etalonnage/rapport.js`. Ne pas modifier à la main.', '',
    '**Toutes les réponses sont fabriquées pour l\'exercice. Aucune ne vient d\'un participant.** Aucune mesure réelle n\'a été faite.', ''];
  L.push('## Statut', '');
  if (!mesure) L.push('**NON MESURÉ.** Les deux correcteurs n\'ont pas encore rendu leurs feuilles (`notes/notes-correcteur-A.csv`, `notes/notes-correcteur-B.csv`). Les sections 3 à 6 restent vides : aucune note n\'est estimée ni simulée.', '');
  else if (erreurs.length) L.push('**FEUILLES INCOMPLÈTES : accord non calculé.**', '', ...erreurs.map((e) => `- ${e}`), '');
  else L.push(`**MESURÉ** sur les notes individuelles, telles que remises, avant toute discussion. Empreintes SHA-256 des feuilles : A \`${A.sha256.slice(0, 16)}\`, B \`${B.sha256.slice(0, 16)}\`.`, '');

  // 1. Couverture
  L.push('## 1. Ce que les réponses fictives mettent à l\'épreuve', '');
  const types = [...new Set(items.flatMap((it) => it.types))];
  L.push('| Type de réponse | B2 | B3 | B4 |', '|---|---|---|---|');
  for (const t of types) L.push(`| ${t} | ${['B2', 'B3', 'B4'].map((g) => items.filter((it) => it.grille === g && it.types.includes(t)).length || '').join(' | ')} |`);
  L.push('', `Total : ${items.filter((i) => i.grille === 'B2').length} reformulations (B2), ${items.filter((i) => i.grille === 'B3').length} transferts (B3), ${items.filter((i) => i.grille === 'B4').length} paires de déblocage (B4). ${items.filter((i) => i.limite).length} réponses sont des cas limites choisis exprès : le concepteur s'attend à des hésitations.`, '');

  // 2. Réponses
  L.push('## 2. Les réponses fictives et les notes prévues par le concepteur', '',
    'La note prévue est la lecture du concepteur du jeu, qui n\'est pas correcteur. Elle ne fait pas foi : elle sert seulement à discuter les désaccords. Elle n\'a jamais été montrée aux correcteurs.', '',
    '| Réf. | Code | Grille | Élément | Réponse | Note prévue | Cas limite | Raison du concepteur |', '|---|---|---|---|---|---|---|---|');
  for (const it of items) L.push(`| ${it.id} | ${map[it.id]} | ${it.grille} | ${it.element} | ${esc(repTxt(it))} | ${prevuTxt(it)} | ${it.limite ? 'oui' : ''} | ${esc(it.pourquoi)} |`);
  L.push('');

  // 3. Notes
  L.push('## 3. Notes indépendantes des deux correcteurs', '');
  if (!res) L.push('NON MESURÉ.', '');
  else {
    L.push('| Réf. | Code | Grille | Correcteur A | Correcteur B | Hésitations A / B |', '|---|---|---|---|---|---|');
    const f = (it, n) => it.grille === 'B2' ? `${n.C1}, ${n.C2}, ${n.C3}, ${n.C4} (${n.C1 + n.C2 + n.C3 + n.C4})` : it.grille === 'B3' ? `${n.B3}` : `${n.Q1}, ${n.Q2} : ${E.decision(n.Q1, n.Q2)}`;
    for (const it of items) { const c = map[it.id], a = A.notes[c], b = B.notes[c]; L.push(`| ${it.id} | ${c} | ${it.grille} | ${f(it, a)} | ${f(it, b)} | ${a.hesitation.join(' ') || '–'} / ${b.hesitation.join(' ') || '–'} |`); }
    L.push('');
  }

  // 4. Accord
  L.push('## 4. Accord entre les deux correcteurs', '',
    'Pourcentage d\'accord exact, et kappa de Cohen pondéré quadratique (notes ordinales), avec un intervalle de confiance à 95 % par rééchantillonnage (2 000 tirages, graine fixe). Avec si peu de réponses, l\'intervalle est large : il est donné pour cette raison. Repère prévu par la grille : un kappa pondéré inférieur à 0,6 signale un critère ambigu.', '');
  if (!res) L.push('NON MESURÉ.', '');
  else {
    L.push('| Mesure | Réponses | Accord exact | Kappa pondéré | IC 95 % | Signal |', '|---|---|---|---|---|---|');
    for (const m of res.mesures) L.push(`| ${m.nom} | ${m.n} | ${m.exact} (${pct(m.exact, m.n)}) | ${fr(m.kappa)} | ${m.ic ? `${fr(m.ic[0])} à ${fr(m.ic[1])}` : 'non calculable'} | ${m.kappa === null ? 'à examiner' : m.kappa < 0.6 ? '**ambigu**' : ''} |`);
    L.push('', `Information secondaire : notes identiques à la note prévue par le concepteur, A ${res.prevu.A.ok}/${res.prevu.A.tot}, B ${res.prevu.B.ok}/${res.prevu.B.tot}.`, '');
  }

  // 5. Désaccords
  L.push('## 5. Désaccords et hésitations', '');
  if (!res) L.push('NON MESURÉ.', '');
  else {
    const par = {}; res.desaccords.forEach((d) => { par[d.champ] = (par[d.champ] || 0) + 1; });
    L.push('**Désaccords par critère :** ' + (Object.entries(par).map(([k, v]) => `${k} : ${v}`).join(' ; ') || 'aucun'), '',
      '| Réf. | Critère | A | B | Écart | Réponse | Note prévue | Explication (après discussion des correcteurs) |', '|---|---|---|---|---|---|---|---|');
    for (const d of res.desaccords) { const it = E.ITEMS.find((x) => x.id === d.id); L.push(`| ${d.id} | ${d.champ} | ${d.A} | ${d.B} | ${d.ecart} | ${esc(repTxt(it))} | ${prevuTxt(it)} | à compléter |`); }
    L.push('', '**Réponses qui ont le plus fait hésiter** (hésitations signalées + désaccords) :', '', '| Réf. | Hésitations A | Hésitations B | Désaccords | Cas limite prévu |', '|---|---|---|---|---|');
    for (const h of res.hesitations.slice(0, 15)) L.push(`| ${h.id} | ${h.A.join(' ') || '–'} | ${h.B.join(' ') || '–'} | ${h.desaccords} | ${E.ITEMS.find((x) => x.id === h.id).limite ? 'oui' : 'non'} |`);
    L.push('');
  }

  // 6. Critères ambigus
  L.push('## 6. Critères de la grille qui restent ambigus', '');
  if (res) { const amb = res.mesures.filter((m) => m.kappa === null || m.kappa < 0.6 || m.exact / m.n < 0.8); L.push('**Mesurés :** ' + (amb.map((m) => `${m.nom} (accord ${pct(m.exact, m.n)}, kappa ${fr(m.kappa)})`).join(' ; ') || 'aucun critère sous les repères (kappa ≥ 0,6 et accord ≥ 80 %)'), ''); }
  else L.push('**Mesurés :** NON MESURÉ.', '');
  L.push('**Anticipés par le concepteur** (cas limites construits exprès, à confirmer ou infirmer par l\'exercice) :', '');
  for (const it of items.filter((i) => i.limite)) L.push(`- ${it.id} (${it.grille}, ${it.element}) : ${it.pourquoi}`);
  const FD = path.join(NOTES, 'discussion.md');
  L.push('', '## 6 bis. Discussion des désaccords', '', fs.existsSync(FD) ? 'Explications écrites par les correcteurs après la remise de leurs notes (`notes/discussion.md`) ; elles ne modifient pas les notes individuelles.' : 'Pas encore de discussion : elle n\'a lieu qu\'après la remise et le gel des deux feuilles.', '');
  if (fs.existsSync(FD)) L.push(fs.readFileSync(FD, 'utf8').trim(), '');
  L.push('## 7. Propositions de clarification', '', 'Voir `propositions-clarification.md`. Elles ne modifient pas les grilles : chacune doit être validée séparément.', '');
  return L.join('\n') + '\n';
}
if (require.main === module) {
const out = path.join(E.DIR, 'rapport-etalonnage.md'), txt = build();
if (process.argv.includes('--check')) { const ok = fs.existsSync(out) && fs.readFileSync(out, 'utf8') === txt; console.log(ok ? 'rapport à jour' : 'rapport PAS à jour'); process.exit(ok ? 0 : 1); }
fs.writeFileSync(out, txt); console.log('écrit rapport-etalonnage.md');
}
module.exports = { build };
