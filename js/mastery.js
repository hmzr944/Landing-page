/* État pédagogique de chaque notion, et « qu'apprendre maintenant ? ».
   Les états prolongent ceux du planificateur FSRS (open-spaced-repetition : New, Learning, Review, Relearning)
   avec ce qui intéresse l'étudiant : la notion est-elle découverte, fragile, à revoir, vraiment maîtrisée ?
   Règle : terminer une leçon ne rend jamais une notion « maîtrisée ». Seuls les rappels réussis dans le temps
   (stabilité FSRS d'au moins 21 jours, dernière réponse juste) le font. */
(function () {
  const STATES = {
    new: { label: 'Non étudiée', short: 'À découvrir', icon: 'circle-dashed', c: 'var(--st-new)' },
    seen: { label: 'Découverte', short: 'Découverte', icon: 'eye', c: 'var(--st-seen)' },
    learning: { label: 'En apprentissage', short: 'En cours', icon: 'plant', c: 'var(--st-learning)' },
    fragile: { label: 'Fragile', short: 'Fragile', icon: 'warning-circle', c: 'var(--st-fragile)' },
    due: { label: 'À réviser', short: 'À réviser', icon: 'clock-counter-clockwise', c: 'var(--st-due)' },
    mastered: { label: 'Maîtrisée', short: 'Maîtrisée', icon: 'seal-check', c: 'var(--st-mastered)' },
  };
  const ORDER = ['mastered', 'learning', 'due', 'fragile', 'seen', 'new'];
  const DAY = 86400000;

  const lessonOf = (n) => !!(n && ((n.module && (n.module.lessonDone || n.module.learned)) || n.lessonDone));

  /* État d'une notion. discovered : une leçon couvrant la notion (elle-même ou un parent) est faite */
  function stateOf(n, discovered, now = Date.now()) {
    const c = n.srs;
    if (!c || c.last == null) return discovered || lessonOf(n) ? 'seen' : 'new';
    const r = SRS.retrievability(c, now);
    const recentIllusion = c.illusions && c.illusionAt && now - c.illusionAt < 30 * DAY;
    if (c.s >= 21 && r >= 0.85 && (c.lastG == null || c.lastG >= 3) && !SRS.isDue(c, now)) return 'mastered';
    if (SRS.isDue(c, now)) return 'due';
    if (((c.lapses || 0) >= 2 && c.s < 21) || recentIllusion || r < 0.7 || c.lastG === 1) return 'fragile';
    return 'learning';
  }

  /* Toutes les notions d'un sujet, avec leur état (la racine ne compte pas si elle a des enfants) */
  function notions(s, now = Date.now()) {
    const out = [];
    const rec = (n, depth, inLesson) => {
      const disc = inLesson || lessonOf(n);
      // Une notion = une feuille de l'arbre (les chapitres et modules regroupent des notions)
      if (!n.children.length) out.push({ s, n, depth, state: stateOf(n, disc, now) });
      n.children.forEach((c) => rec(c, depth + 1, disc));
    };
    rec(s.root, 0, false);
    return out;
  }
  function counts(list) {
    const c = { total: list.length };
    ORDER.forEach((k) => { c[k] = 0; });
    list.forEach((x) => { c[x.state]++; });
    c.pct = c.total ? Math.round((c.mastered / c.total) * 100) : 0;
    return c;
  }
  function summary(state, now = Date.now()) {
    const per = state.subjects.map((s) => { const list = notions(s, now); return { s, list, c: counts(list) }; });
    const all = per.flatMap((p) => p.list);
    return { per, all, c: counts(all) };
  }

  /* Prochaine leçon utile : module du parcours dans l'ordre (le plus en retard d'abord),
     sinon première partie découpée en notions dont la leçon n'est pas faite. canLesson vient de Lesson.canStart. */
  function nextLesson(state, canLesson) {
    const today = SRS.dayKey();
    const subjects = state.subjects.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    for (const s of subjects) {
      if (!s.program) continue;
      const mods = s.root.children.filter((m) => m.module && !lessonOf(m) && canLesson(m));
      const m = mods.find((x) => x.module.date && x.module.date <= today) || mods[0];
      if (m) return { s, n: m, late: !!(m.module.date && m.module.date < today) };
    }
    for (const s of subjects) {
      let hit = null;
      const rec = (n, depth) => {
        if (hit) return;
        if (depth > 0 && n.children.length >= 2 && !lessonOf(n) && canLesson(n)) { hit = n; return; }
        n.children.forEach((c) => rec(c, depth + 1));
      };
      rec(s.root, 0);
      if (hit) return { s, n: hit };
    }
    return null;
  }

  /* « Qu'apprendre maintenant ? » : une seule réponse, dans cet ordre.
     1. Les révisions dues (ce qu'on est en train d'oublier coûte le moins à rattraper maintenant)
     2. Les notions fragiles (oubliées souvent ou crues sues à tort)
     3. Une nouvelle leçon
     4. Des notions découvertes jamais rappelées */
  function plan(state, ov, canLesson) {
    const sum = summary(state);
    const fragile = sum.all.filter((x) => x.state === 'fragile');
    const lesson = nextLesson(state, canLesson);
    const steps = [];
    if (ov.due) steps.push({ kind: 'review', n: ov.due, label: `${ov.due} révision${ov.due > 1 ? 's' : ''}` });
    if (fragile.length) steps.push({ kind: 'fragile', n: Math.min(fragile.length, 8), items: fragile.slice(0, 8), label: `${Math.min(fragile.length, 8)} notion${fragile.length > 1 ? 's' : ''} fragile${fragile.length > 1 ? 's' : ''}` });
    if (lesson) steps.push({ kind: 'lesson', ...lesson, label: `la leçon « ${lesson.n.title} »` });
    if (!ov.due && ov.newToday) steps.push({ kind: 'new', n: ov.newToday, label: `${ov.newToday} nouvelle${ov.newToday > 1 ? 's' : ''} carte${ov.newToday > 1 ? 's' : ''}` });
    return { steps, sum, fragile, lesson };
  }

  /* Charge de révision des 7 prochains jours */
  function forecast(state, days = 7, now = Date.now()) {
    const out = Array.from({ length: days }, (_, i) => ({ k: SRS.dayKey(now + i * DAY), n: 0 }));
    const idx = new Map(out.map((d, i) => [d.k, i]));
    state.subjects.forEach((s) => notions(s, now).forEach(({ n }) => {
      if (!n.srs || n.srs.due == null) return;
      const k = n.srs.due <= now ? out[0].k : SRS.dayKey(n.srs.due);
      if (idx.has(k)) out[idx.get(k)].n++;
    }));
    return out;
  }

  window.Mastery = { STATES, ORDER, stateOf, notions, counts, summary, nextLesson, plan, forecast, lessonOf };
})();
