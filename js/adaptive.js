/* Moteur d'apprentissage adaptatif : « que faire maintenant, et pourquoi ».
   Règles lisibles, classées par ordre de priorité ; chaque proposition porte sa raison en clair.
   Entrées (toutes facultatives) : items = [{ id, title, state, level, falseCert, due, prereqMissing:[titres],
   sensitive, needsHuman, lastAt, page, inChange }], actions assignées, activité déjà faite, échéance.
   Partagé par Student et Business : seuls les libellés des activités diffèrent selon le contexte. */
(function (root) {
  const DAY = 864e5;
  const KINDS = {
    validation_humaine: { label: 'Validation au poste', icon: 'user-check' },
    revalidation: { label: 'Revalidation', icon: 'arrows-clockwise' },
    prerequis: { label: 'Revoir un prérequis', icon: 'tree-structure' },
    correction: { label: 'Activité corrective', icon: 'first-aid' },
    revoir: { label: 'Révision', icon: 'cards' },
    question: { label: 'Question de vérification', icon: 'question' },
    simulation: { label: 'Mise en situation', icon: 'storefront' },
    transfert: { label: 'Transfert dans un autre contexte', icon: 'shuffle' },
    diagnostic: { label: 'Diagnostic', icon: 'target' },
    confirmer: { label: 'Confirmation dans la durée', icon: 'calendar-check' },
  };

  function recommend(items = [], opts = {}) {
    const now = opts.now || Date.now();
    const out = [];
    const add = (kind, item, reason, prio) => out.push({ kind, label: KINDS[kind].label, icon: KINDS[kind].icon, item: item || null, reason, prio });
    // 1. Ce qu'une personne responsable a demandé (revalidation après un changement de procédure, etc.)
    (opts.actions || []).filter((a) => a.status === 'a_faire').forEach((a) => add(a.kind === 'revalidation' ? 'revalidation' : a.kind === 'validation_humaine' ? 'validation_humaine' : a.kind === 'simulation' ? 'simulation' : a.kind === 'diagnostic' ? 'diagnostic' : 'revoir',
      a.item || null, a.reason || 'Demandé par ton responsable.', 0));
    if (!items.length && !opts.hasDiagnostic && opts.context === 'business') add('diagnostic', null, 'Aucune donnée encore : le diagnostic dit par où commencer.', 1);
    items.forEach((x) => {
      // 2. Une erreur annoncée comme sûre passe inaperçue en formation classique : priorité
      if (x.falseCert) return add('correction', x, `Erreur annoncée comme sûre sur « ${x.title} » : à corriger avant tout.`, 1);
      // 3. Un prérequis non maîtrisé explique souvent l'erreur suivante
      if (x.state === 'faux' && x.prereqMissing && x.prereqMissing.length) return add('prerequis', x, `« ${x.title} » repose sur « ${x.prereqMissing[0]} », pas encore acquis.`, 2);
      if (x.state === 'faux') return add('correction', x, `Dernière réponse incorrecte sur « ${x.title} ».`, 3);
      // 4. Changement de procédure : l'ancienne preuve ne suffit plus
      if (x.inChange) return add('revalidation', x, `La source de « ${x.title} » a changé : ta preuve porte sur l'ancienne version.`, 3);
      if (x.due) return add('revoir', x, `« ${x.title} » arrive à l'oubli : c'est le bon moment pour la revoir.`, 4);
      // 5. Le sensible exige un humain : une simulation réussie ne le remplace jamais
      if (x.needsHuman && x.level >= 4) return add('validation_humaine', x, `« ${x.title} » est réglementaire ou de sécurité : une validation par un responsable reste nécessaire.`, 4);
      if (x.level === 1) return add('question', x, `Tu as expliqué « ${x.title} » avec tes mots ; une question vérifie que c'est juste.`, 5);
      if (x.level >= 2 && x.level <= 3) return add('simulation', x, `« ${x.title} » est su, pas encore appliqué en situation.`, 6);
      if (x.level >= 4 && x.level <= 5) return add('transfert', x, `« ${x.title} » est appliqué dans un seul contexte : essaie-le dans une autre situation.`, 7);
      if (x.level === 6 && (!x.lastAt || now - new Date(x.lastAt).getTime() >= 7 * DAY)) return add('confirmer', x, `Rejouer « ${x.title} » confirme la maîtrise dans la durée.`, 8);
      return null;
    });
    // l'échéance remonte ce qui n'est pas encore appliqué
    if (opts.deadline) {
      const days = (new Date(opts.deadline).getTime() - now) / DAY;
      if (days >= 0 && days <= 14) out.forEach((a) => { if (['revoir', 'simulation', 'correction', 'question'].includes(a.kind)) { a.prio -= 0.5; a.reason += ` Échéance dans ${Math.ceil(days)} jour${Math.ceil(days) > 1 ? 's' : ''}.`; } });
    }
    return out.sort((a, b) => a.prio - b.prio).slice(0, opts.max || 5);
  }

  const api = { recommend, KINDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Adaptive = api;
})(typeof window !== 'undefined' ? window : globalThis);
