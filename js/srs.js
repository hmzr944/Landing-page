/* Répétition espacée : modèle FSRS-5 (Free Spaced Repetition Scheduler, open source).
   Chaque partie a une stabilité S (en jours : le temps pour que la probabilité de s'en souvenir
   tombe à 90 %) et une difficulté D (1 à 10). La « mémoire » affichée est la rétention R :
   R(t, S) = (1 + 19/81 · t / S) ^ -0,5. Après chaque réponse, S et D sont mis à jour
   et la prochaine révision tombe quand R repasse sous 90 %. */
(function () {
  const W = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192,
    1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621];
  const DECAY = -0.5;
  const FACTOR = 19 / 81;
  const RETENTION = 0.9;
  const DAY = 86400000;
  const MIN = 60000;

  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const initD = (g) => clamp(W[4] - Math.exp(W[5] * (g - 1)) + 1, 1, 10);
  const initS = (g) => W[g - 1];

  function retrievability(card, now = Date.now()) {
    if (!card || card.last == null) return null;
    const t = Math.max(0, (now - card.last) / DAY);
    return Math.pow(1 + FACTOR * t / card.s, DECAY);
  }

  function nextD(d, g) {
    const delta = -W[6] * (g - 3);
    const d1 = d + delta * (10 - d) / 9;
    return clamp(W[7] * initD(4) + (1 - W[7]) * d1, 1, 10);
  }
  function recallS(d, s, r, g) {
    const hard = g === 2 ? W[15] : 1;
    const easy = g === 4 ? W[16] : 1;
    return s * (Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * hard * easy + 1);
  }
  function forgetS(d, s, r) {
    return Math.min(s, W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r)));
  }
  function sameDayS(s, g) { return s * Math.exp(W[17] * (g - 3 + W[18])); }

  const intervalDays = (s) => clamp(Math.round((s / FACTOR) * (Math.pow(RETENTION, 1 / DECAY) - 1)), 1, 365);

  /* g : 1 = Oublié, 2 = Difficile, 3 = Bien, 4 = Facile */
  function schedule(card, g, now = Date.now()) {
    let s, d;
    const isNew = !card || card.last == null;
    if (isNew) { s = initS(g); d = initD(g); }
    else {
      const elapsed = (now - card.last) / DAY;
      const r = retrievability(card, now);
      d = nextD(card.d, g);
      if (elapsed < 1) s = sameDayS(card.s, g);
      else s = g === 1 ? forgetS(card.d, card.s, r) : recallS(card.d, card.s, r, g);
    }
    s = Math.max(0.1, s);
    const next = {
      s, d, last: now,
      reps: ((card && card.reps) || 0) + 1,
      lapses: ((card && card.lapses) || 0) + (g === 1 && !isNew ? 1 : 0),
    };
    // « Oublié » : la carte revient dans quelques minutes, dans la même session
    next.due = g === 1 ? now + 10 * MIN : now + intervalDays(s) * DAY;
    return next;
  }

  function preview(card, now = Date.now()) {
    return [1, 2, 3, 4].map((g) => {
      const n = schedule(card, g, now);
      return label(n.due - now);
    });
  }
  function label(ms) {
    if (ms < 60 * MIN) return `${Math.max(1, Math.round(ms / MIN))} min`;
    const d = Math.round(ms / DAY);
    if (d < 30) return `${d} j`;
    if (d < 365) return `${Math.round(d / 30)} mois`;
    return `${(d / 365).toFixed(1).replace('.', ',')} an`;
  }
  const isDue = (card, now = Date.now()) => !!card && card.due != null && card.due <= now;

  /* ---------- Statistiques quotidiennes ---------- */
  const dayKey = (t = Date.now()) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  function today(stats) {
    const k = dayKey();
    stats.days = stats.days || {};
    stats.days[k] = stats.days[k] || { reviews: 0, newCards: 0, correct: 0, focusMin: 0 };
    return stats.days[k];
  }
  function streak(stats) {
    const days = (stats && stats.days) || {};
    const active = (k) => days[k] && (days[k].reviews > 0 || days[k].focusMin >= 10);
    let n = 0;
    let t = Date.now();
    if (!active(dayKey(t))) t -= DAY; // la série tient encore tant que la journée n'est pas finie
    while (active(dayKey(t))) { n++; t -= DAY; }
    return n;
  }
  function last7(stats) {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const t = Date.now() - i * DAY;
      const k = dayKey(t);
      const d = (stats.days || {})[k] || { reviews: 0 };
      out.push({ k, label: new Intl.DateTimeFormat('fr-FR', { weekday: 'narrow' }).format(new Date(t)), reviews: d.reviews || 0 });
    }
    return out;
  }

  window.SRS = { retrievability, schedule, preview, isDue, label, intervalDays, dayKey, today, streak, last7, DAY };
})();
