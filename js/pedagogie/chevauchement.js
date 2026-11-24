/* Fiche pédagogique (mission 3b-0) : contrôle de non-chevauchement avec le jeu de mesure 3a.
   Une fiche peut enseigner la même notion qu'un élément du jeu 3a ; elle ne doit pas en reprendre les éléments de
   MESURE (énoncés, choix, cas chiffrés, situations de transfert, questions de déblocage), ni mot pour mot ni de façon
   proche. Cinq règles (NC1 à NC5), seuils ci-dessous (SEUILS), à l'essai : voir docs/pedagogie/fiche-v1.md.
   Limite : une reformulation qui change tous les mots peut échapper aux règles ; le rapport des plus proches voisins
   sert à la relecture humaine.
   Module sans interface, sans réseau ; il n'est chargé par aucune page de l'application. */
(function (root) {
  const SHA_JEU_3A = '3abd95ebcee3afc193d7f45905317a4c422e8be6d297142d2a58e2efd2443257'; // version 523f730
  // Seuils proposés en 3b-0, à l'essai : ils ne sont PAS validés définitivement.
  const SEUILS = { nc1MinMots: 3, nc2Ngram: 5, nc3Jaccard: 0.5, nc3MinMots: 4, nc4MinNombres: 2, nc4Jaccard: 0.15, nc5Noms: 2, nc5Jaccard: 0.3 };

  const STOP = new Set(('a au aux avec ce ces cet cette c ca d dans de des du elle elles en est et etre il ils je j l la le les leur leurs lui ma mais me meme '
    + 'mes moi mon n ne ni nos notre nous on ou par pas pour qu que qui s sa se ses si son sont sur ta te tes toi ton tu un une vos votre vous y '
    + 'plus moins tres tout tous toute toutes autre autres aussi alors donc ainsi comme quand dont puis sans sous vers entre chez apres avant '
    + 'ont as ai avez avons fait faire faut peut peuvent doit doivent etait sera ete est-ce quel quelle quels quelles combien comment pourquoi '
    + 'oui non ici la-bas deja encore toujours jamais seulement surtout bien bon bonne celui celle ceux celles cela ceci rien chaque leur').split(/\s+/));
  // Mots trop généraux pour désigner un scénario (NC5)
  const GENERIQUES = new Set('personne personnes chose choses cas fois jour jours annee annees exemple question reponse situation notion moment temps facon partie'.split(' '));

  const sansAccents = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  /* Nombres du texte : « 1 200 » → 1200, « 5,5 » → 5.5, « 3/4 » → 3/4 */
  function nombres(texte) {
    const t = String(texte || '').replace(/(\d)[  ](?=\d{3}\b)/g, '$1');
    return [...new Set((t.match(/\d+(?:[.,]\d+)?(?:\/\d+)?/g) || []).map((n) => n.replace(',', '.')))];
  }
  /* Mots porteurs de sens : minuscules, sans accents ni ponctuation, sans mots grammaticaux, réduits à leurs 6 premières lettres */
  function mots(texte) {
    return sansAccents(texte).replace(/[’'`]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim().split(' ')
      .filter((w) => w && !STOP.has(w) && !/^\d+$/.test(w)).map((w) => w.slice(0, 6));
  }
  const ensemble = (l) => new Set(l);
  function jaccard(a, b) {
    const A = a instanceof Set ? a : ensemble(a), B = b instanceof Set ? b : ensemble(b);
    if (!A.size && !B.size) return 0;
    let inter = 0; A.forEach((x) => { if (B.has(x)) inter++; });
    return inter / (A.size + B.size - inter);
  }
  function ngrams(l, n) { const s = new Set(); for (let i = 0; i + n <= l.length; i++) s.add(l.slice(i, i + n).join(' ')); return s; }
  const noms = (l) => new Set(l.filter((w) => w.length >= 5 && !GENERIQUES.has(w)));

  function prepare(texte) { const m = mots(texte); return { texte: String(texte || ''), mots: m, set: ensemble(m), noms: noms(m), nombres: nombres(texte) }; }
  /* Vocabulaire propre à une notion (son nom, son glossaire, son idée centrale, ses éléments clés) : deux textes sur la
     même notion le partagent forcément. Il ne compte donc pas comme « objet du scénario » (NC5). */
  const vocabulaire = (...textes) => new Set(textes.flat().filter(Boolean).flatMap((t) => mots(t)));

  /* Éléments de mesure du jeu 3a, à ne pas reprendre. La reformulation attendue (idée centrale, éléments clés) n'en
     fait pas partie : elle décrit la notion elle-même, qu'une fiche enseigne forcément. */
  function elementsJeu(jeu) {
    const out = [];
    for (const el of (jeu && jeu.elements) || []) {
      const vocab = vocabulaire(el.sujet, (el.glossaire || []), el.reformulation && el.reformulation.idee_centrale, (el.reformulation && el.reformulation.elements_cles) || []);
      const push = (ref, nature, texte, opts = {}) => { if (String(texte || '').trim()) out.push({ ref, nature, vocab, ...prepare(texte), ...opts }); };
      for (const [bloc, k] of [['comprehension', 'c'], ['rappel', 'r'], ['deblocage', 'd']]) {
        (el[bloc] || []).forEach((q, i) => {
          const ref = `${el.id}.${k}${i + 1}`;
          push(ref, 'enonce', q.q, { scenario: true });
          push(ref, 'question_complete', [q.q, ...(q.choix || [])].join(' '));
          (q.choix || []).forEach((c, j) => push(`${ref}.choix${j + 1}`, 'choix', c, { court: mots(c).length < 4 }));
        });
      }
      if (el.transfert) {
        push(`${el.id}.transfert.situation`, 'transfert', el.transfert.situation, { scenario: true });
        push(`${el.id}.transfert.question`, 'transfert', el.transfert.question, { scenario: true });
        push(`${el.id}.transfert.attendu`, 'transfert', el.transfert.attendu);
      }
    }
    return out;
  }

  /* Éléments d'une fiche à comparer : situation, question d'ouverture, questions (énoncé, question complète, choix),
     exemples et contre-exemples, questions de prérequis et de contrôle des confusions. */
  function elementsFiche(f) {
    const out = [];
    const vocab = vocabulaire(f && f.meta && f.meta.notion, ((f && f.glossaire) || []).map((g) => g && g.terme), f && f.idee_centrale, (f && f.elements_cles) || []);
    const push = (chemin, nature, texte, opts = {}) => { if (String(texte || '').trim()) out.push({ chemin, nature, vocab, ...prepare(texte), ...opts }); };
    const question = (chemin, q) => {
      if (!q) return;
      // v2 : réponses admises d'une réponse courte et étapes d'une mise en ordre comparées comme des choix ; la réponse
      // de référence d'une explication libre comme un énoncé
      const choix = [...(q.choix || []).map((c) => (typeof c === 'string' ? c : c && c.texte) || ''), ...(q.attendus || []), ...(q.etapes || [])];
      if (q.reference) push(`${chemin}.reference`, 'enonce', q.reference);
      push(`${chemin}.q`, 'enonce', q.q, { scenario: true });
      push(`${chemin}`, 'question_complete', [q.q, ...choix].join(' '));
      choix.forEach((c, j) => push(`${chemin}.choix[${j}]`, 'choix', c, { court: mots(c).length < 4 }));
    };
    if (f && f.situation) { push('situation.texte', 'situation', f.situation.texte, { scenario: true }); push('situation.question_ouverture', 'situation', f.situation.question_ouverture, { scenario: true }); }
    const Q = (f && f.questions) || {};
    Object.keys(Q).forEach((ens) => (Q[ens] || []).forEach((q, i) => question(`questions.${ens}[${i}]`, q)));
    ((f && f.confusions) || []).forEach((c, i) => question(`confusions[${i}].controle`, c.controle));
    ((f && f.prerequis) || []).forEach((p, i) => question(`prerequis[${i}].question`, p.question));
    ((f && f.representations) || []).forEach((r, i) => { if (r.type === 'exemple' || r.type === 'contre_exemple') push(`representations[${i}]`, 'exemple', r.texte, { scenario: true }); });
    return out;
  }

  /* Compare un élément de fiche à un élément du jeu : règles déclenchées et scores */
  function comparer(a, b) {
    const regles = [], j = jaccard(a.set, b.set);
    const comparable = a.nature === 'choix' || b.nature === 'choix' ? a.nature === b.nature : true;
    if (!comparable) return { regles, jaccard: j };
    // NC1 : identique après normalisation (et assez long pour avoir un sens)
    if (a.mots.length >= SEUILS.nc1MinMots && a.mots.join(' ') === b.mots.join(' ')) regles.push('NC1');
    // NC2 : une suite de 5 mots porteurs de sens reprise telle quelle
    if (a.mots.length >= SEUILS.nc2Ngram && b.mots.length >= SEUILS.nc2Ngram) {
      const g = ngrams(b.mots, SEUILS.nc2Ngram);
      for (const x of ngrams(a.mots, SEUILS.nc2Ngram)) if (g.has(x)) { regles.push('NC2'); break; }
    }
    // NC3 : reformulation proche. Les choix n'y sont pas soumis : un même contresens (« le froid tue les bactéries »)
    // s'écrit forcément avec les mots de la notion ; seuls NC1 et NC2 (reprise quasi littérale) s'appliquent aux choix.
    if (a.nature !== 'choix' && a.set.size >= SEUILS.nc3MinMots && b.set.size >= SEUILS.nc3MinMots && j >= SEUILS.nc3Jaccard) regles.push('NC3');
    // NC4 : même cas chiffré (au moins 2 nombres identiques) sur un sujet proche
    if (a.nombres.length >= SEUILS.nc4MinNombres && a.nombres.length === b.nombres.length && a.nombres.every((n) => b.nombres.includes(n)) && j >= SEUILS.nc4Jaccard) regles.push('NC4');
    // NC5 : même scénario (mêmes objets ou acteurs principaux)
    if (a.scenario && b.scenario) {
      const hors = (w) => !(a.vocab && a.vocab.has(w)) && !(b.vocab && b.vocab.has(w));
      let communs = 0; a.noms.forEach((x) => { if (b.noms.has(x) && hors(x)) communs++; });
      if (communs >= SEUILS.nc5Noms && j >= SEUILS.nc5Jaccard) regles.push('NC5');
    }
    return { regles: [...new Set(regles)], jaccard: j };
  }

  /* Rapport complet : chevauchements (bloquants) et, pour chaque élément de la fiche, les 3 éléments du jeu les plus proches */
  function controler(fiche, jeu, opts = {}) {
    const sha = opts.shaJeu;
    if (!jeu || !Array.isArray(jeu.elements)) return { verifiable: false, raison: 'jeu de mesure 3a absent', chevauchements: [], voisins: [] };
    if (sha !== SHA_JEU_3A) return { verifiable: false, raison: `empreinte du jeu 3a inattendue (${String(sha || 'absente').slice(0, 12)}…), attendue ${SHA_JEU_3A.slice(0, 12)}…`, chevauchements: [], voisins: [] };
    const J = opts.elementsJeu || elementsJeu(jeu), F = elementsFiche(fiche);
    const chevauchements = [], voisins = [];
    for (const a of F) {
      const scores = [];
      for (const b of J) {
        const r = comparer(a, b);
        if (r.regles.length) chevauchements.push({ chemin: a.chemin, ref: b.ref, regles: r.regles, jaccard: r.jaccard, fiche: a.texte, jeu: b.texte });
        if (a.nature !== 'choix' && b.nature !== 'choix') scores.push({ ref: b.ref, jaccard: r.jaccard, texte: b.texte });
      }
      if (a.nature !== 'choix') {
        const meilleur = new Map(); // un élément du jeu n'apparaît qu'une fois (son énoncé et sa forme complète portent la même référence)
        scores.forEach((x) => { if (!meilleur.has(x.ref) || meilleur.get(x.ref).jaccard < x.jaccard) meilleur.set(x.ref, x); });
        voisins.push({ chemin: a.chemin, texte: a.texte, proches: [...meilleur.values()].sort((x, y) => y.jaccard - x.jaccard || (x.ref < y.ref ? -1 : 1)).slice(0, 3) });
      }
    }
    // Une même question est comparée par son énoncé et par sa forme complète : un seul signalement par paire
    const vus = new Map();
    for (const c of chevauchements) {
      const k = `${c.chemin.replace(/\.q$/, '')}|${c.ref}`;
      if (!vus.has(k)) vus.set(k, { ...c, chemin: c.chemin.replace(/\.q$/, '') });
      else { const v = vus.get(k); v.regles = [...new Set([...v.regles, ...c.regles])].sort(); v.jaccard = Math.max(v.jaccard, c.jaccard); }
    }
    return { verifiable: true, chevauchements: [...vus.values()], voisins };
  }

  const api = { SHA_JEU_3A, SEUILS, mots, nombres, jaccard, prepare, comparer, elementsJeu, elementsFiche, controler };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FicheChevauchement = api;
})(typeof window !== 'undefined' ? window : globalThis);
