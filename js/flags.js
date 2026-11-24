/* Interrupteurs d'Arbor 2 : chaque ensemble nouveau peut être éteint sans redéployer, pour revenir au comportement v53.
   Valeurs par défaut ci-dessous ; surcharge par l'URL (?flags=-arbor2,+autre) ou par localStorage « arbor:flags »
   ({ "arbor2": false }). Lecture seule pour le reste de l'application. */
(function (root) {
  const DEFAUTS = {
    arbor2: true, // maîtrise v2 (mémoire × preuves), parcours de fiche, items notés
  };
  let cache = null;
  function lire() {
    if (cache) return cache;
    const v = { ...DEFAUTS };
    try { Object.assign(v, JSON.parse(root.localStorage.getItem('arbor:flags') || '{}')); } catch (e) { /* stockage indisponible */ }
    try {
      const q = new URLSearchParams((root.location && root.location.search) || '').get('flags');
      if (q) q.split(',').forEach((t) => { const k = t.replace(/^[+-]/, '').trim(); if (k) v[k] = !t.startsWith('-'); });
    } catch (e) { /* hors navigateur */ }
    cache = v;
    return v;
  }
  const api = { on: (k) => !!lire()[k], all: () => ({ ...lire() }), DEFAUTS, _reset: () => { cache = null; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Flags = api;
})(typeof window !== 'undefined' ? window : globalThis);
