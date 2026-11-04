/* Niveaux et trophées.
   - Niveaux : chaque niveau demande un peu plus d'XP que le précédent (60, 100, 140…), regroupés en 8 rangs
     qui suivent la croissance d'un arbre. Le rang fait aussi grandir Pousse.
   - Trophées : 10 familles à 4 paliers (bronze, argent, or, platine) et 4 trophées uniques.
     Ils récompensent l'effort et la régularité (réviser, ancrer, se concentrer, revenir), jamais le fait
     de cliquer « Bien » : la recherche montre qu'une ludification qui récompense la performance déclarée
     pousse à se surnoter (voir la page Méthode). */
(function () {
  /* ---------- Niveaux ---------- */
  const step = (lvl) => 60 + 40 * (lvl - 1); // XP pour passer du niveau lvl au suivant
  function levelOf(xp) {
    let lvl = 1, base = 0;
    while (xp >= base + step(lvl)) { base += step(lvl); lvl++; }
    return { lvl, into: xp - base, need: step(lvl), pct: Math.round(((xp - base) / step(lvl)) * 100), base };
  }
  const RANKS = [
    { from: 1, name: 'Graine', icon: 'grains', c: '#A3773D' },
    { from: 3, name: 'Pousse', icon: 'plant', c: '#3FBF6A' },
    { from: 5, name: 'Tige', icon: 'leaf', c: '#12A150' },
    { from: 8, name: 'Arbuste', icon: 'flower-tulip', c: '#0B7F75' },
    { from: 12, name: 'Arbre', icon: 'tree', c: '#3451D1' },
    { from: 17, name: 'Grand chêne', icon: 'tree-evergreen', c: '#9333B8' },
    { from: 24, name: 'Forêt', icon: 'tree-structure', c: '#C2255C' },
    { from: 32, name: 'Forêt ancienne', icon: 'crown-simple', c: '#C27803' },
  ];
  const rankOf = (lvl) => { let r = 0; RANKS.forEach((x, i) => { if (lvl >= x.from) r = i; }); return r; };
  // Étape de croissance de la mascotte (1 à 4) selon le rang
  const stageOf = (lvl) => { const r = rankOf(lvl); return r >= 4 ? 4 : r >= 3 ? 3 : r >= 1 ? 2 : 1; };

  /* ---------- Trophées ---------- */
  const TIERS = [
    { key: 'bronze', name: 'Bronze', xp: 10 },
    { key: 'silver', name: 'Argent', xp: 25 },
    { key: 'gold', name: 'Or', xp: 60 },
    { key: 'platinum', name: 'Platine', xp: 150 },
  ];
  // unit : comment dire ce qui manque (« plus que 4 cartes »)
  const FAMILIES = [
    { id: 'reviews', name: 'Réviseur', icon: 'cards', goals: [10, 100, 500, 2000], unit: ['carte révisée', 'cartes révisées'] },
    { id: 'streak', name: 'Régularité', icon: 'fire', goals: [3, 7, 30, 100], unit: ['jour de suite', 'jours de suite'] },
    { id: 'goal', name: 'Objectif du jour', icon: 'target', goals: [1, 5, 20, 60], unit: ['objectif atteint', 'objectifs atteints'] },
    { id: 'anchors', name: 'Ancrage', icon: 'anchor-simple', goals: [1, 10, 50, 200], unit: ['ancrage écrit', 'ancrages écrits'] },
    { id: 'focus', name: 'Concentration', icon: 'timer', goals: [25, 250, 1000, 5000], unit: ['minute de focus', 'minutes de focus'] },
    { id: 'mastered', name: 'Mémoire durable', icon: 'brain', goals: [1, 10, 50, 200], unit: ['partie maîtrisée', 'parties maîtrisées'] },
    { id: 'recovered', name: 'Persévérance', icon: 'arrow-counter-clockwise', goals: [1, 10, 50, 200], unit: ['oubli rattrapé', 'oublis rattrapés'] },
    { id: 'lucid', name: 'Lucidité', icon: 'scales', goals: [5, 25, 100, 400], unit: ['« certain » juste', '« certain » justes'] },
    { id: 'builder', name: 'Bâtisseur', icon: 'tree-structure', goals: [10, 50, 200, 1000], unit: ['partie créée', 'parties créées'] },
    { id: 'modules', name: 'Explorateur', icon: 'path', goals: [1, 3, 10, 25], unit: ['module terminé', 'modules terminés'] },
  ];
  const SINGLES = [
    { id: 'pdf', name: 'Premier import', icon: 'file-arrow-up', desc: 'Importer un PDF', xp: 15 },
    { id: 'program', name: 'Cap fixé', icon: 'flag-checkered', desc: 'Créer un parcours', xp: 15 },
    { id: 'quick', name: 'Juste 2 minutes', icon: 'lightning', desc: 'Démarrer en 2 minutes', xp: 10 },
    { id: 'comeback', name: 'Le retour', icon: 'hand-waving', desc: 'Revenir après 3 jours sans réviser', xp: 20 },
  ];

  // Valeurs actuelles, calculées depuis les données (rien à migrer pour les anciens utilisateurs)
  function measure(state, ctx) {
    const days = Object.entries(state.stats.days || {});
    const c = state.stats.counters || {};
    let mastered = 0, anchors = 0, nodes = 0, modules = 0;
    state.subjects.forEach((s) => ctx.walk(s.root, (n, d) => {
      if (d > 0) nodes++;
      if (n.srs && n.srs.s >= 21) mastered++;
      if (n.explain && n.explain.trim().length >= 8) anchors++;
      if (n.module && ctx.moduleDone(n)) modules++;
    }));
    const sure = (state.stats.calib && state.stats.calib.sure) || [0, 0];
    return {
      reviews: days.reduce((a, [, d]) => a + (d.reviews || 0), 0),
      streak: Math.max(ctx.streak, state.stats.bestStreak || 0),
      goal: days.filter(([, d]) => (d.reviews || 0) >= (state.settings.dailyGoal || 15)).length,
      anchors,
      focus: days.reduce((a, [, d]) => a + (d.focusMin || 0), 0),
      mastered,
      recovered: c.recovered || 0,
      lucid: sure[0] || 0,
      builder: nodes,
      modules,
    };
  }

  /* Compare aux trophées déjà obtenus ; renvoie les nouveaux (et les enregistre) */
  function evaluate(state, ctx) {
    state.trophies = state.trophies || {};
    const v = measure(state, ctx);
    const fresh = [];
    FAMILIES.forEach((f) => {
      const have = state.trophies[f.id] ? state.trophies[f.id].tier : -1;
      let tier = -1;
      f.goals.forEach((g, i) => { if (v[f.id] >= g) tier = i; });
      for (let t = have + 1; t <= tier; t++) fresh.push({ kind: 'family', f, tier: t, xp: TIERS[t].xp });
      if (tier > have) state.trophies[f.id] = { tier, at: Date.now() };
    });
    const c = state.stats.counters || {};
    SINGLES.forEach((s) => {
      if (!state.trophies[s.id] && c[s.id]) { state.trophies[s.id] = { tier: 0, at: Date.now() }; fresh.push({ kind: 'single', f: s, tier: -1, xp: s.xp }); }
    });
    return { fresh, values: v };
  }

  // Les trophées les plus proches, pour encourager (« plus que 4 cartes »)
  function nextUp(state, values, n = 3) {
    return FAMILIES.map((f) => {
      const have = state.trophies && state.trophies[f.id] ? state.trophies[f.id].tier : -1;
      if (have >= 3) return null;
      const goal = f.goals[have + 1], prev = have >= 0 ? f.goals[have] : 0;
      const left = goal - values[f.id];
      return { f, tier: have + 1, goal, left, pct: Math.max(0, Math.min(100, Math.round(((values[f.id] - prev) / (goal - prev)) * 100))) };
    }).filter(Boolean).sort((a, b) => b.pct - a.pct || a.left - b.left).slice(0, n);
  }

  const total = () => FAMILIES.length * TIERS.length + SINGLES.length;
  const owned = (state) => FAMILIES.reduce((a, f) => a + (state.trophies && state.trophies[f.id] ? state.trophies[f.id].tier + 1 : 0), 0)
    + SINGLES.filter((s) => state.trophies && state.trophies[s.id]).length;

  /* Médaille : disque métallique (palier), icône gravée, ruban. tier -1 = verrouillée, 'single' = violet */
  function medal(icon, tier, size = 64, extra = '') {
    const key = tier === 'single' ? 'single' : tier < 0 ? 'locked' : TIERS[tier].key;
    return `<span class="medal m-${key} ${extra}" style="--ms:${size}px" aria-hidden="true"><span class="m-ribbon"></span><span class="m-disc"><i class="ph-fill ph-${icon}"></i></span><span class="m-shine"></span></span>`;
  }

  window.Trophies = { levelOf, RANKS, rankOf, stageOf, TIERS, FAMILIES, SINGLES, evaluate, nextUp, total, owned, measure, medal };
})();
