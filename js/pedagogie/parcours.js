/* Moteur de parcours d'une notion (Arbor 2) : Situation → Compréhension → Explication → Pratique → Vérification.
   Machine à états pure et déterministe : pas de DOM, pas de réseau, pas d'IA, pas de hasard. Les règles pédagogiques
   sont ici, dans le code, et testées (tests/parcours.js) ; elles ne dépendent d'aucune consigne donnée à un modèle.

   Règles :
   R1 Ordre : situation et question d'ouverture, puis explication, puis compréhension, application, transfert, bilan.
      Aucune définition avant la situation (la fiche est contrôlée par V-ordre-01 à 04).
   R2 Niveau : « je ne sais pas » à l'ouverture → explication simple ; sinon standard.
   R3 Erreur qui porte une confusion connue, pas encore traitée : remède (une autre représentation), puis la question
      de contrôle de cette confusion.
   R4 Deuxième erreur sur la notion (réussites intercalées comprises), hors confusion traitée par R3 : changement de méthode, c'est-à-dire une représentation pas encore
      montrée (d'un autre type si possible) et, si l'explication était standard, l'explication simple.
   R5 Après une erreur, une question de la réserve du même ensemble, jamais déjà posée. Réserve vide : le moteur le
      dit (« épuisée ») et passe à la suite, la notion est « à reprendre ». Il n'invente jamais de question.
   R6 Une explication libre sans jugement du serveur n'est pas notée et ne compte pas comme preuve.
   Chaque décision est inscrite au journal (sans contenu personnel), pour la mesure. */
(function (root) {
  const req = (n, g) => (typeof module !== 'undefined' && module.exports ? require(n) : root[g]);
  const K = req('./correction.js', 'FicheCorrection');

  const ENSEMBLES = ['comprehension', 'application', 'transfert'];
  const baseOf = (ens) => (ens === 'controle' ? 'comprehension' : String(ens).replace(/_reserve$/, ''));

  function creer(fiche, opts = {}) {
    const Q = fiche.questions || {};
    const file = [{ type: 'situation' }, { type: 'explication', niveau: null }];
    ENSEMBLES.forEach((ens) => (Q[ens] || []).forEach((q) => file.push({ type: 'item', ens, id: q.id })));
    file.push({ type: 'bilan' });
    return {
      fiche, niveau: opts.niveau || 'standard', file, pos: 0, poses: new Set(), remedies: new Set(), montrees: new Set(),
      erreurs: 0, epuise: new Set(), resultats: [], journal: [], fini: false, compte: !!opts.compte,
    };
  }

  const itemPar = (st, ens, id) => {
    if (ens === 'controle') return ((st.fiche.confusions || []).find((c) => c.controle && c.controle.id === id) || {}).controle;
    return ((st.fiche.questions || {})[ens] || []).find((q) => q.id === id);
  };
  const log = (st, quoi, detail = {}) => st.journal.push({ quoi, etape: st.pos, ...detail });
  const inserer = (st, steps) => { st.file.splice(st.pos + 1, 0, ...steps); };

  /* Écran courant : tout ce qu'il faut pour l'afficher */
  function courant(st) {
    const s = st.file[st.pos], f = st.fiche;
    if (!s) return { type: 'bilan', ...bilan(st) };
    if (s.type === 'situation') return { type: 'situation', texte: f.situation.texte, question: f.situation.question_ouverture };
    if (s.type === 'explication') {
      const niv = s.niveau || st.niveau, x = (f.explication || {})[niv] || {};
      return { type: 'explication', niveau: niv, texte: x.texte, idee: f.idee_centrale, elements: f.elements_cles || [], glossaire: f.glossaire || [], raison: s.raison || null };
    }
    if (s.type === 'representation') return { type: 'representation', rep: (f.representations || []).find((r) => r.id === s.id), raison: s.raison };
    if (s.type === 'item') return { type: 'item', ens: s.ens, item: itemPar(st, s.ens, s.id), raison: s.raison || null };
    if (s.type === 'epuise') return { type: 'epuise', ens: s.ens };
    return { type: 'bilan', ...bilan(st) };
  }

  function avancer(st) {
    if (st.pos < st.file.length - 1) st.pos++;
    if (st.file[st.pos] && st.file[st.pos].type === 'bilan') st.fini = true;
    return courant(st);
  }

  /* R2 : réponse à la question d'ouverture. sait = l'apprenant pense savoir répondre */
  function ouvrir(st, { sait } = {}) {
    st.niveau = sait ? 'standard' : 'simple';
    const ex = st.file.find((x) => x.type === 'explication' && !x.niveau);
    if (ex) ex.niveau = st.niveau;
    log(st, 'niveau', { niveau: st.niveau });
    return avancer(st);
  }

  function representationNouvelle(st, preferTypeDiff) {
    const reps = st.fiche.representations || [];
    const vues = reps.filter((r) => st.montrees.has(r.id));
    const libres = reps.filter((r) => !st.montrees.has(r.id));
    if (!libres.length) return null;
    const typesVus = new Set(vues.map((r) => r.type));
    return (preferTypeDiff && libres.find((r) => !typesVus.has(r.type))) || libres[0];
  }

  /* Réponse à l'écran « item » courant. Renvoie la correction, les preuves et l'écran suivant. */
  function repondre(st, reponse) {
    const s = st.file[st.pos];
    if (!s || s.type !== 'item') throw new Error('aucune question en cours');
    const item = itemPar(st, s.ens, s.id);
    const corr = K.corriger(item, reponse, s.ens);
    st.poses.add(s.id);
    const preuve = corr.outcome === 'non_note' ? null : { item_id: s.id, ens: s.ens, contexte: corr.contexte, type: corr.type, evalue: item.evalue, outcome: corr.outcome, niveau: corr.niveau, confusion: corr.confusion };
    if (preuve) st.resultats.push(preuve);
    if (corr.outcome === 'non_note') log(st, 'non_note', { item: s.id });
    if (corr.outcome !== 'juste' && corr.outcome !== 'non_note') remedier(st, s, corr);
    return { correction: corr, preuve };
  }

  function remedier(st, s, corr) {
    const conf = corr.confusion && (st.fiche.confusions || []).find((c) => c.id === corr.confusion);
    const ajout = [];
    if (conf && !st.remedies.has(conf.id)) { // R3
      st.remedies.add(conf.id);
      if (conf.remede && !st.montrees.has(conf.remede)) { ajout.push({ type: 'representation', id: conf.remede, raison: { confusion: conf.libelle } }); st.montrees.add(conf.remede); }
      if (conf.controle && !st.poses.has(conf.controle.id)) ajout.push({ type: 'item', ens: 'controle', id: conf.controle.id, raison: { controle: conf.libelle } });
      log(st, 'remede', { confusion: conf.id });
      inserer(st, ajout);
      return;
    }
    st.erreurs++;
    if (!conf && corr.outcome === 'faux') log(st, 'erreur_non_diagnostiquee', { item: s.id });
    if (st.erreurs >= 2) { // R4
      const r = representationNouvelle(st, true);
      if (r) { st.montrees.add(r.id); ajout.push({ type: 'representation', id: r.id, raison: { methode: true } }); }
      if (st.niveau === 'standard') { st.niveau = 'simple'; ajout.push({ type: 'explication', niveau: 'simple', raison: { methode: true } }); }
      log(st, 'changement_methode', { representation: r ? r.id : null, niveau: st.niveau });
      st.erreurs = 0;
    }
    // R5 : réserve du même ensemble
    const base = baseOf(s.ens), res = ((st.fiche.questions || {})[`${base}_reserve`] || []).find((q) => !st.poses.has(q.id) && !st.file.some((x) => x.id === q.id));
    if (res) ajout.push({ type: 'item', ens: `${base}_reserve`, id: res.id, raison: { reserve: true } });
    else if (!st.epuise.has(base)) { st.epuise.add(base); ajout.push({ type: 'epuise', ens: base }); log(st, 'epuisement', { ens: base }); }
    inserer(st, ajout);
  }

  function bilan(st) {
    const par = {};
    st.resultats.forEach((r) => { const k = r.contexte; par[k] = par[k] || { juste: 0, total: 0 }; par[k].total++; if (r.outcome === 'juste') par[k].juste++; });
    const dernier = (ctx) => [...st.resultats].reverse().find((r) => r.contexte === ctx);
    const reussi = (ctx) => { const d = dernier(ctx); return !!(d && d.outcome === 'juste'); };
    return {
      par, epuise: [...st.epuise], aReprendre: st.epuise.size > 0 || !reussi('application') || !reussi('transfert'),
      application: reussi('application'), transfert: reussi('transfert'), niveau: st.niveau,
      remedes: st.journal.filter((j) => j.quoi === 'remede').length, changements: st.journal.filter((j) => j.quoi === 'changement_methode').length,
    };
  }

  const api = { creer, courant, avancer, ouvrir, repondre, bilan, baseOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Parcours = api;
})(typeof window !== 'undefined' ? window : globalThis);
