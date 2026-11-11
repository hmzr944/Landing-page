/* Lecture des preuves d'une organisation (étape G) : calculs explicables, sans rien inventer.
   Entrées : événements de preuve (ajout seul, écrits par le serveur), connaissances, membres.
   - L'état d'une connaissance pour une personne vient de ses preuves dans le temps. Une simulation ou un diagnostic
     réussi ne donne jamais « maîtrise durable » : il faut au moins deux réussites, à 7 jours d'écart, la dernière juste.
   - Une erreur annoncée avec « Je sais » ou « C'est un réflexe » est une fausse certitude : priorité pédagogique.
   - Une fragilité d'équipe n'est affichée que si l'échantillon suffit (au moins 3 observations, 2 personnes) ;
     la taille de l'échantillon, la période et la couverture sont toujours montrées. */
(function () {
  const DAY = 864e5;
  const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
  const sure = (c) => c === 'sait' || c === 'reflexe';
  const STATES = {
    fausse_certitude: { label: 'Fausse certitude', rank: 0, why: 'dernière réponse fausse, annoncée comme sûre' },
    a_retravailler: { label: 'À retravailler', rank: 1, why: 'dernière réponse fausse' },
    hesitant: { label: 'Juste mais hésitant', rank: 2, why: 'juste, mais en devinant' },
    en_cours: { label: 'En cours', rank: 3, why: 'premières réponses justes' },
    solide: { label: 'Solide, à confirmer', rank: 4, why: 'juste plusieurs fois, pas encore dans la durée' },
    durable: { label: 'Maîtrise durable', rank: 5, why: 'juste au moins deux fois, à 7 jours d’écart ou plus' },
  };

  // État d'une connaissance pour une personne, à partir de ses preuves (ordre chronologique)
  function stateOf(evs) {
    const s = [...evs].sort((a, b) => new Date(a.at) - new Date(b.at));
    if (!s.length) return null;
    const last = s[s.length - 1];
    if (last.outcome === 'faux') return sure(last.confidence) ? 'fausse_certitude' : 'a_retravailler';
    const okDays = [...new Set(s.filter((e) => e.outcome === 'juste').map((e) => dayOf(e.at)))].sort();
    if (okDays.length >= 2 && (new Date(okDays[okDays.length - 1]) - new Date(okDays[0])) / DAY >= 7) return 'durable';
    if (last.confidence === 'devine') return 'hesitant';
    return s.filter((e) => e.outcome === 'juste').length >= 2 ? 'solide' : 'en_cours';
  }

  /* Vue d'une personne : ses connaissances évaluées, ses comportements en simulation, sa prochaine activité */
  function person(userId, evs, knowledge) {
    const mine = evs.filter((e) => e.user_id === userId);
    const kById = new Map(knowledge.map((k) => [k.id, k]));
    const byK = new Map();
    mine.filter((e) => e.knowledge_id).forEach((e) => { if (!byK.has(e.knowledge_id)) byK.set(e.knowledge_id, []); byK.get(e.knowledge_id).push(e); });
    const items = [...byK.entries()].map(([kid, list]) => {
      const st = stateOf(list);
      return { knowledge: kById.get(kid) || { id: kid, title: 'Connaissance', kind: '' }, state: st, label: STATES[st].label, why: STATES[st].why, n: list.length, last: list.reduce((a, e) => (e.at > a ? e.at : a), '') };
    }).sort((a, b) => STATES[a.state].rank - STATES[b.state].rank);
    const sessions = new Set(mine.filter((e) => e.activity === 'simulation' && e.session_id).map((e) => e.session_id));
    const behaviors = {};
    mine.filter((e) => e.detail && e.detail.behavior).forEach((e) => { behaviors[e.detail.behavior] = (behaviors[e.detail.behavior] || 0) + 1; });
    const diag = mine.filter((e) => e.activity === 'diagnostic');
    return { userId, items, n: mine.length, diagnostics: new Set(diag.map((e) => e.session_id)).size, simulations: sessions.size, behaviors,
      falseCertainties: items.filter((x) => x.state === 'fausse_certitude').length, last: mine.reduce((a, e) => (e.at > a ? e.at : a), ''), next: nextAction(items, diag.length, sessions.size) };
  }

  // Prochaine activité recommandée, avec sa raison (la règle est simple et lisible)
  function nextAction(items, diagCount, simCount) {
    const pick = (st) => items.find((x) => x.state === st);
    const fc = pick('fausse_certitude');
    if (fc) return { kind: 'revoir', knowledge: fc.knowledge, text: `Revoir « ${fc.knowledge.title} »${fc.knowledge.page ? ` (p. ${fc.knowledge.page} du document)` : ''}, puis rejouer un client mystère`, why: 'Erreur annoncée comme sûre : c’est la priorité, car elle passe inaperçue en formation classique.' };
    if (!diagCount) return { kind: 'diagnostic', text: 'Faire le diagnostic', why: 'Aucune donnée encore sur les connaissances de référence.' };
    const ar = pick('a_retravailler');
    if (ar) return { kind: 'revoir', knowledge: ar.knowledge, text: `Revoir « ${ar.knowledge.title} »`, why: 'Dernière réponse fausse sur cette connaissance.' };
    if (!simCount) return { kind: 'mystere', text: 'Jouer un client mystère', why: 'Les connaissances n’ont pas encore été mobilisées en situation.' };
    const h = pick('hesitant');
    if (h) return { kind: 'mystere', knowledge: h.knowledge, text: `Rejouer une situation qui mobilise « ${h.knowledge.title} »`, why: 'Réponse juste, mais en devinant.' };
    return { kind: 'confirmer', text: 'Rejouer dans 7 jours pour confirmer dans la durée', why: 'Une réussite ponctuelle ne prouve pas une maîtrise durable.' };
  }

  /* Vue d'équipe : les fragilités les plus importantes, seulement si l'échantillon le permet */
  function team(evs, knowledge, members) {
    const kById = new Map(knowledge.map((k) => [k.id, k]));
    const agg = new Map();
    evs.filter((e) => e.knowledge_id).forEach((e) => {
      const a = agg.get(e.knowledge_id) || { n: 0, wrong: 0, falseCert: 0, people: new Set(), wrongPeople: new Set() };
      a.n++; a.people.add(e.user_id);
      if (e.outcome === 'faux') { a.wrong++; a.wrongPeople.add(e.user_id); if (sure(e.confidence)) a.falseCert++; }
      agg.set(e.knowledge_id, a);
    });
    const rows = [...agg.entries()].map(([kid, a]) => ({ knowledge: kById.get(kid) || { id: kid, title: 'Connaissance' }, n: a.n, people: a.people.size, wrong: a.wrong, falseCert: a.falseCert, wrongPeople: a.wrongPeople.size,
      rate: a.wrong / a.n, enough: a.n >= 3 && a.people.size >= 2, score: (a.wrong + 2 * a.falseCert) / a.n }));
    const fragile = rows.filter((r) => r.enough && r.wrong > 0).sort((a, b) => b.score - a.score || b.n - a.n).slice(0, 3)
      .map((r) => ({ ...r, confidence: r.n >= 15 ? 'bonne' : r.n >= 6 ? 'moyenne' : 'faible' }));
    const times = evs.map((e) => e.at).sort();
    const learners = new Set(evs.map((e) => e.user_id));
    return {
      fragile, insufficient: rows.filter((r) => !r.enough && r.wrong > 0).length,
      sample: { evidence: evs.length, people: learners.size, members: members.length, from: times[0] || null, to: times[times.length - 1] || null },
    };
  }

  window.OrgInsight = { stateOf, person, team, nextAction, STATES };
})();
