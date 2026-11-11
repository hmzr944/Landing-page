/* Moteur de preuves : niveaux et résultats, partagés par Student (journal local) et Business (evidence_events).
   Sept niveaux, du plus faible au plus fort. Une déclaration n'est jamais une preuve de maîtrise ;
   une réussite unique ne donne jamais « confirmée dans la durée ».
   1 déclarée     la personne dit savoir, explique avec ses mots (non vérifié)
   2 reconnue     elle reconnaît la bonne réponse parmi d'autres (QCM, diagnostic)
   3 restituée    elle retrouve la réponse sans aide (rappel, réponse écrite jugée juste)
   4 appliquée    elle l'utilise correctement en situation (simulation, mise en situation)
   5 démontrée    appliquée plusieurs fois, ou validée par un humain au poste
   6 transférée   appliquée juste dans au moins deux contextes différents
   7 durable      réussites espacées d'au moins 7 jours, la dernière juste
   Cinq résultats qui ne se confondent jamais : juste, partiel, faux, insuffisant (trop peu étayé pour conclure),
   non_documente (aucune source ne couvre l'affirmation : ni juste ni faux). */
(function (root) {
  const DAY = 864e5;
  const LEVELS = {
    1: { key: 'declaree', label: 'Déclarée', why: 'expliquée ou affirmée, pas encore vérifiée' },
    2: { key: 'reconnue', label: 'Reconnue', why: 'bonne réponse reconnue parmi d’autres' },
    3: { key: 'restituee', label: 'Restituée', why: 'retrouvée sans aide' },
    4: { key: 'appliquee', label: 'Appliquée', why: 'utilisée correctement en situation' },
    5: { key: 'demontree', label: 'Démontrée', why: 'appliquée plusieurs fois, ou validée par un humain' },
    6: { key: 'transferee', label: 'Transférée', why: 'appliquée dans au moins deux contextes différents' },
    7: { key: 'durable', label: 'Confirmée dans la durée', why: 'réussie à au moins 7 jours d’écart, dernière réponse juste' },
  };
  const OUTCOMES = {
    juste: { label: 'Juste', success: true }, partiel: { label: 'Partiellement juste', success: false },
    faux: { label: 'Incorrect', success: false, wrong: true }, insuffisant: { label: 'Insuffisamment étayé', success: false },
    non_documente: { label: 'Non documenté', success: false, neutral: true },
  };
  // Niveau qu'une observation réussie montre à elle seule (avant agrégation)
  const BASE = { diagnostic: 2, lecon: 2, rappel: 3, dialogue: 3, socratique: 3, enseigne: 1, situation: 4, simulation: 4, revalidation: 3, validation_humaine: 5, explication: 1 };
  function levelOfEvent(e) {
    if (!e || e.outcome !== 'juste') return 0;
    if (Number(e.level) >= 1) return Number(e.level);
    return BASE[e.activity] || 2;
  }
  const ctxOf = (e) => e.context || (e.activity === 'simulation' || e.activity === 'situation' ? `${e.activity}:${(e.detail && e.detail.kind) || 'general'}` : e.activity);
  const dayOf = (t) => new Date(t).toISOString().slice(0, 10);

  /* Niveau atteint sur une connaissance, à partir de toutes ses observations (ordre indifférent).
     Renvoie aussi ce qui a servi à conclure, pour l'expliquer. */
  function assess(evs) {
    const s = [...(evs || [])].sort((a, b) => new Date(a.at) - new Date(b.at));
    if (!s.length) return { level: 0, label: 'Aucune preuve', why: '', n: 0 };
    const last = s[s.length - 1];
    const ok = s.filter((e) => e.outcome === 'juste');
    let level = ok.reduce((m, e) => Math.max(m, levelOfEvent(e)), 0);
    const applied = ok.filter((e) => levelOfEvent(e) >= 4);
    const appliedSessions = new Set(applied.map((e) => e.session_id || e.at));
    if (applied.length && appliedSessions.size >= 2) level = Math.max(level, 5);
    if (new Set(applied.map(ctxOf)).size >= 2) level = Math.max(level, 6);
    const days = [...new Set(ok.map((e) => dayOf(e.at)))].sort();
    const durable = days.length >= 2 && (new Date(days[days.length - 1]) - new Date(days[0])) / DAY >= 7 && last.outcome === 'juste';
    if (durable && level >= 3) level = 7;
    // la dernière observation fausse fait redescendre : on ne garde pas un niveau que la personne vient de contredire
    const contradicted = last.outcome === 'faux';
    if (contradicted) level = Math.min(level, 1);
    const human = s.some((e) => e.activity === 'validation_humaine' && e.outcome === 'juste');
    return { level, label: level ? LEVELS[level].label : 'Pas encore démontrée', why: contradicted ? 'dernière réponse incorrecte' : level ? LEVELS[level].why : 'aucune réussite observée',
      n: s.length, contexts: [...new Set(applied.map(ctxOf))], human, last: last.at, lastOutcome: last.outcome,
      undocumented: s.filter((e) => e.outcome === 'non_documente').length, insufficient: s.filter((e) => e.outcome === 'insuffisant').length };
  }

  const api = { LEVELS, OUTCOMES, levelOfEvent, assess, label: (n) => (LEVELS[n] ? LEVELS[n].label : 'Pas encore démontrée') };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Evidence = api;
})(typeof window !== 'undefined' ? window : globalThis);
