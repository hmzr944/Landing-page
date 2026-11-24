/* Correction d'un item de fiche (Arbor 2), sans IA : QCM, réponse courte, mise en ordre.
   L'explication libre n'est jamais corrigée ici : sans jugement du serveur, elle n'est « pas notée » et ne produit
   aucune preuve (décision Q6).
   Niveau de preuve d'une réussite (échelle de js/evidence.js) :
   - QCM : 2 (reconnue) ; un QCM d'application vaut 3, jamais 4 (décision Q2) ;
   - réponse courte, mise en ordre : 3 (restituée) ; 4 (appliquée) si l'item évalue l'application ;
   - explication libre jugée juste par le serveur : 3, ou 4 si l'item évalue l'application.
   Contexte : la place de l'item (compréhension, application, transfert). Deux contextes d'application réussis à un
   niveau d'au moins 4 donnent « transférée » dans Evidence. */
(function (root) {
  const norm = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`]/g, ' ')
    .replace(/(\d),(\d)/g, '$1.$2').replace(/[^a-z0-9.]+/g, ' ').replace(/\s+/g, ' ').trim();
  const nombres = (s) => (String(s || '').replace(/(\d)[\s  ](?=\d{3}\b)/g, '$1').match(/\d+(?:[.,]\d+)?/g) || []).map((n) => Number(n.replace(',', '.')));
  const memes = (a, b) => a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);

  const typeOf = (item) => (item && item.type) || 'choix';
  const contexteOf = (ens) => (/^transfert/.test(ens) ? 'transfert' : /^application/.test(ens) ? 'application' : /^comprehension/.test(ens) ? 'comprehension' : ens === 'rappel' ? 'rappel' : ens || 'autre');

  function niveau(item, outcome) {
    if (outcome !== 'juste') return 0;
    const t = typeOf(item), app = item.evalue === 'application';
    if (t === 'choix') return app ? 3 : 2;
    return app ? 4 : 3;
  }

  /* reponse : QCM → indice du choix ; courte → texte ; ordre → indices des étapes dans l'ordre donné ;
     libre → { jugement: { outcome, confusion? } } venu du serveur, sinon rien */
  function corriger(item, reponse, ens = '') {
    const t = typeOf(item);
    const base = { type: t, evalue: item.evalue, contexte: contexteOf(ens) };
    let outcome = 'faux', confusion = null, attendu = '';
    if (t === 'choix') {
      const c = (item.choix || [])[Number(reponse)];
      outcome = c && c.juste ? 'juste' : 'faux';
      confusion = c && !c.juste && c.confusion ? c.confusion : null;
      attendu = ((item.choix || []).find((x) => x.juste) || {}).texte || '';
    } else if (t === 'courte') {
      const r = norm(reponse), nr = nombres(reponse);
      const ok = r && (item.attendus || []).some((a) => {
        const na = nombres(a);
        if (na.length) return memes(na, nr) && norm(a).split(' ').filter((w) => !/^\d/.test(w) && w.length > 2).every((w) => r.includes(w));
        const x = norm(a);
        return r === x || (` ${r} `).includes(` ${x} `);
      });
      outcome = ok ? 'juste' : 'faux';
      attendu = (item.attendus || [])[0] || '';
    } else if (t === 'ordre') {
      const n = (item.etapes || []).length, r = Array.isArray(reponse) ? reponse.map(Number) : [];
      const exact = r.length === n && r.every((x, i) => x === i);
      outcome = exact ? 'juste' : r.length === n && r[0] === 0 && r[n - 1] === n - 1 ? 'partiel' : 'faux';
      attendu = (item.etapes || []).join(' → ');
    } else if (t === 'libre') {
      const j = reponse && reponse.jugement;
      if (!j || !['juste', 'partiel', 'faux'].includes(j.outcome)) return { ...base, outcome: 'non_note', niveau: 0, confusion: null, attendu: item.reference || '', note: 'Sans compte, une explication libre n’est pas notée : elle ne compte pas comme preuve.' };
      outcome = j.outcome; confusion = j.confusion || null; attendu = item.reference || '';
    }
    return { ...base, outcome, niveau: niveau(item, outcome), confusion, attendu };
  }

  const api = { corriger, niveau, contexteOf, norm, nombres };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FicheCorrection = api;
})(typeof window !== 'undefined' ? window : globalThis);
