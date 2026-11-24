/* Fiche pédagogique (mission 3b-0) : validateur du format v1 (docs/pedagogie/fiche-v1.md).
   Dit si une fiche est utilisable comme parcours complet, et sinon pourquoi, règle par règle.
   - Déterministe, sans réseau, sans IA ; ne modifie jamais la fiche reçue.
   - Une fiche est utilisable si : aucun contrôle bloquant n'échoue ET son statut est « reference » ou « generee_validee ».
   - Garantit la structure, l'ordre, la cohérence et le non-chevauchement mesurable ; PAS la justesse pédagogique.
   Module sans interface ; il n'est chargé par aucune page de l'application. */
(function (root) {
  const req = (n, g) => (typeof module !== 'undefined' && module.exports ? require(n) : root[g]);
  const E = req('./fiche-empreinte.js', 'FicheEmpreinte');
  const C = req('./chevauchement.js', 'FicheChevauchement');

  const FORMAT = 'fiche-v1';
  const ORIGINES = ['humaine', 'serveur', 'ia_locale'];
  const EVALUE = ['application', 'compréhension', 'restitution'];
  const TYPES_REP = ['exemple', 'etapes', 'analogie', 'contre_exemple', 'schema'];
  // Ensembles de questions et nombre exact attendu (« reserve » : questions de remédiation, jamais inventées par le moteur)
  const ENSEMBLES = { comprehension: 3, comprehension_reserve: 2, application: 2, application_reserve: 1, transfert: 1, transfert_reserve: 1, rappel: 3 };
  const DEF_FORTE = /\b(on appelle|se definit|designe|definition)\b/;

  /* Toutes les règles, avec leur identifiant et leur caractère bloquant : la spécification en est le reflet exact */
  const REGLES = {
    'V-forme-01': 'format égal à « fiche-v1 »',
    'V-forme-02': 'bloc meta complet (id, notion, version, langue, statut, origine)',
    'V-forme-03': 'sources présentes et complètes (obligatoires sauf fiche d’origine humaine)',
    'V-forme-04': 'situation : texte d’au moins 80 caractères et question d’ouverture',
    'V-forme-05': 'explication : niveaux « simple » et « standard », chacun avec un texte d’au moins 120 caractères et un ancrage',
    'V-forme-06': 'idée centrale et exactement 2 éléments clés',
    'V-forme-07': 'glossaire : 5 à 10 termes distincts, chacun expliqué',
    'V-forme-08': 'ensembles de questions présents, avec le nombre exact attendu (réserve comprise)',
    'V-forme-09': 'chaque question : identifiant, classement, énoncé d’au moins 10 caractères, 4 choix distincts, une seule bonne réponse',
    'V-forme-10': 'prérequis : 0 à 3, chacun avec sa notion et une question valide',
    'V-forme-11': 'identifiants uniques (questions, représentations, confusions)',
    'V-ordre-01': 'la situation ne nomme pas la notion',
    'V-ordre-02': 'la situation ne contient pas de définition',
    'V-ordre-03': 'chaque explication reprend la situation (ancrage présent dans le texte, et relié à la situation)',
    'V-ordre-04': 'chaque explication reprend la situation avant de nommer la notion',
    'V-confusions-01': '1 à 3 confusions, chacune avec libellé, description, remède et question de contrôle',
    'V-confusions-02': 'le remède d’une confusion est une représentation existante',
    'V-confusions-03': 'la question de contrôle d’une confusion est valide et au moins un de ses mauvais choix porte cette confusion',
    'V-confusions-04': 'un choix ne porte qu’une confusion existante, et la bonne réponse n’en porte jamais',
    'V-representations-01': 'au moins 3 représentations, d’au moins 2 types reconnus',
    'V-representations-02': 'une analogie a toujours sa limite',
    'V-representations-03': 'chaque représentation a un texte d’au moins 60 caractères',
    'V-questions-01': 'compréhension : au moins 2 des 3 questions principales ne sont pas de la restitution',
    'V-questions-02': 'application (principales et réserve) : classées « application »',
    'V-questions-03': 'transfert : jamais classé « restitution »',
    'V-questions-04': 'rappel : classé « restitution »',
    'V-questions-05': 'une question « pourquoi » est classée « compréhension »',
    'V-questions-06': 'une phrase à compléter sans cas chiffré est classée « restitution »',
    'V-questions-07': 'une question de décision (« que fais-tu », « est-ce conforme ») est classée « application »',
    'V-questions-08': 'aucun énoncé en double, aucune bonne réponse répétée entre questions',
    'V-questions-09': 'le transfert se passe dans un autre contexte que la situation de départ',
    'V-longueur-01': 'aucune bonne réponse nettement plus longue que toutes les autres (plus de 1,5 fois et 15 signes)',
    'V-longueur-02': 'bonne réponse strictement la plus longue dans 35 % des questions au plus',
    'V-statut-01': 'statut reconnu',
    'V-statut-02': 'une fiche « reference » est d’origine humaine et porte une validation dont l’empreinte est celle de son contenu actuel',
    'V-statut-03': 'une fiche « generee_validee » est générée (serveur ou IA locale) et a des sources',
    'V-statut-04': 'catalogue : une fiche d’essai n’est jamais utilisable',
    'V-chevauchement-00': 'jeu de mesure 3a fourni et à l’empreinte attendue (sinon le non-chevauchement n’est pas vérifiable)',
    'V-chevauchement-01': 'aucun chevauchement avec le jeu 3a (règles NC1 à NC5)',
  };
  const AVERTISSEMENTS = {
    'V-lisibilite-01': 'phrases de plus de 25 mots dans une explication',
    'V-lisibilite-02': 'terme du glossaire absent des explications',
    'V-longueur-03': 'longueur moyenne bonne réponse / mauvaises hors de 0,85 à 1,15 (mesuré sur peu de questions : simple avertissement)',
  };

  const str = (v, min = 1) => typeof v === 'string' && v.trim().length >= min;
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
  const choixTexte = (c) => (c && typeof c === 'object' ? c.texte : c);

  function toutesQuestions(f) {
    const out = [];
    const Q = (f && f.questions) || {};
    Object.keys(ENSEMBLES).forEach((ens) => (Array.isArray(Q[ens]) ? Q[ens] : []).forEach((q, i) => out.push({ q, chemin: `questions.${ens}[${i}]`, ens })));
    ((f && f.confusions) || []).forEach((c, i) => c && c.controle && out.push({ q: c.controle, chemin: `confusions[${i}].controle`, ens: 'controle' }));
    ((f && f.prerequis) || []).forEach((p, i) => p && p.question && out.push({ q: p.question, chemin: `prerequis[${i}].question`, ens: 'prerequis' }));
    return out;
  }
  function questionValide(q) {
    if (!q || typeof q !== 'object') return 'question absente';
    if (!str(q.id)) return 'identifiant absent';
    if (!EVALUE.includes(q.evalue)) return `classement « ${q.evalue} » inconnu`;
    if (!str(q.q, 10)) return 'énoncé absent ou trop court';
    if (!Array.isArray(q.choix) || q.choix.length !== 4) return 'il faut exactement 4 choix';
    const t = q.choix.map(choixTexte);
    if (t.some((x) => !str(x))) return 'choix vide';
    if (new Set(t.map(norm)).size !== 4) return 'choix en double';
    if (q.choix.filter((c) => c && c.juste === true).length !== 1) return 'il faut exactement une bonne réponse';
    return null;
  }
  // Mots du nom de la notion qui la désignent (6 lettres ou plus), et la notion entière normalisée
  function termesNotion(notion) {
    const n = norm(notion).replace(/^(le|la|les|l|un|une|des)\s+/, '');
    return { phrase: n, mots: n.split(' ').filter((w) => w.length >= 6) };
  }

  function valider(fiche, opts = {}) {
    const bloquants = [], avertissements = [];
    const ko = (regle, chemin, message) => bloquants.push({ regle, chemin, message: message || REGLES[regle] });
    const warn = (regle, chemin, message) => avertissements.push({ regle, chemin, message: message || AVERTISSEMENTS[regle] });
    const f = fiche && typeof fiche === 'object' ? fiche : {};
    const meta = f.meta || {};

    // ── Forme ──
    if (f.format !== FORMAT) ko('V-forme-01', 'format');
    if (!str(meta.id) || !/^[a-z0-9][a-z0-9-]*$/.test(meta.id) || !str(meta.notion, 2) || !(Number.isInteger(meta.version) && meta.version >= 1) || meta.langue !== 'fr'
      || !str(meta.statut) || !ORIGINES.includes(meta.origine)) ko('V-forme-02', 'meta');
    const sources = Array.isArray(f.sources) ? f.sources : null;
    if (!sources || sources.some((s) => !s || !str(s.titre) || !str(s.licence) || !str(s.extrait, 20)) || (meta.origine !== 'humaine' && !sources.length)) ko('V-forme-03', 'sources');
    const sit = f.situation || {};
    if (!str(sit.texte, 80) || !str(sit.question_ouverture, 10)) ko('V-forme-04', 'situation');
    const ex = f.explication || {};
    ['simple', 'standard'].forEach((niv) => { const x = ex[niv] || {}; if (!str(x.texte, 120) || !str(x.ancre_situation, 10)) ko('V-forme-05', `explication.${niv}`); });
    if (!str(f.idee_centrale, 20) || !Array.isArray(f.elements_cles) || f.elements_cles.length !== 2 || f.elements_cles.some((e) => !str(e, 5))) ko('V-forme-06', 'idee_centrale');
    const glo = Array.isArray(f.glossaire) ? f.glossaire : [];
    if (glo.length < 5 || glo.length > 10 || glo.some((g) => !g || !str(g.terme) || !str(g.explication, 10)) || new Set(glo.map((g) => norm(g && g.terme))).size !== glo.length) ko('V-forme-07', 'glossaire');
    const Q = f.questions || {};
    Object.entries(ENSEMBLES).forEach(([ens, n]) => { if (!Array.isArray(Q[ens]) || Q[ens].length !== n) ko('V-forme-08', `questions.${ens}`, `${REGLES['V-forme-08']} : « ${ens} » doit en compter ${n}`); });
    const tq = toutesQuestions(f);
    tq.filter((x) => x.ens !== 'prerequis').forEach(({ q, chemin }) => { const e = questionValide(q); if (e) ko('V-forme-09', chemin, `${REGLES['V-forme-09']} : ${e}`); });
    const pre = f.prerequis === undefined ? [] : f.prerequis;
    if (!Array.isArray(pre) || pre.length > 3 || pre.some((p) => !p || !str(p.notion) || questionValide(p.question))) ko('V-forme-10', 'prerequis');
    const reps = Array.isArray(f.representations) ? f.representations : [];
    const confs = Array.isArray(f.confusions) ? f.confusions : [];
    const ids = [...tq.map((x) => x.q && x.q.id), ...reps.map((r) => r && r.id), ...confs.map((c) => c && c.id)].filter(Boolean);
    if (new Set(ids).size !== ids.length) ko('V-forme-11', 'identifiants');

    // ── Ordre : situation avant définition ──
    const T = termesNotion(meta.notion), sitN = norm(sit.texte) + ' ' + norm(sit.question_ouverture);
    if (T.phrase && (sitN.includes(T.phrase) || T.mots.some((w) => new RegExp(`\\b${w}`).test(sitN)))) ko('V-ordre-01', 'situation.texte');
    if (DEF_FORTE.test(sitN)) ko('V-ordre-02', 'situation.texte');
    ['simple', 'standard'].forEach((niv) => {
      const x = ex[niv] || {}, t = norm(x.texte), a = norm(x.ancre_situation);
      if (!a) return;
      const pos = t.indexOf(a), motsA = C.mots(x.ancre_situation), sitSet = new Set(C.mots(sit.texte));
      if (pos < 0 || motsA.filter((w) => sitSet.has(w)).length < 2) { ko('V-ordre-03', `explication.${niv}`); return; }
      const premier = Math.min(...[T.phrase, ...T.mots].filter(Boolean).map((w) => { const i = t.indexOf(w); return i < 0 ? Infinity : i; }));
      if (premier < pos) ko('V-ordre-04', `explication.${niv}`);
    });

    // ── Confusions ──
    const repIds = new Set(reps.map((r) => r && r.id)), confIds = new Set(confs.map((c) => c && c.id));
    if (confs.length < 1 || confs.length > 3 || confs.some((c) => !c || !str(c.id) || !str(c.libelle) || !str(c.description, 10) || !str(c.remede) || !c.controle)) ko('V-confusions-01', 'confusions');
    confs.forEach((c, i) => {
      if (!c) return;
      if (c.remede && !repIds.has(c.remede)) ko('V-confusions-02', `confusions[${i}].remede`);
      if (c.controle && (questionValide(c.controle) || !c.controle.choix.some((x) => x && !x.juste && x.confusion === c.id))) ko('V-confusions-03', `confusions[${i}].controle`);
    });
    tq.forEach(({ q, chemin }) => (q && Array.isArray(q.choix) ? q.choix : []).forEach((x, j) => {
      if (x && x.confusion !== undefined && (x.juste || !confIds.has(x.confusion))) ko('V-confusions-04', `${chemin}.choix[${j}]`);
    }));

    // ── Représentations ──
    const types = new Set(reps.filter((r) => r && TYPES_REP.includes(r.type)).map((r) => r.type));
    if (reps.length < 3 || types.size < 2 || reps.some((r) => !r || !TYPES_REP.includes(r.type))) ko('V-representations-01', 'representations');
    reps.forEach((r, i) => { if (r && r.type === 'analogie' && !str(r.limite, 10)) ko('V-representations-02', `representations[${i}].limite`); });
    reps.forEach((r, i) => { if (r && !str(r.texte, 60)) ko('V-representations-03', `representations[${i}].texte`); });

    // ── Questions : composition et classement ──
    const ens = (k) => (Array.isArray(Q[k]) ? Q[k] : []);
    if (ens('comprehension').filter((q) => q && q.evalue !== 'restitution').length < 2) ko('V-questions-01', 'questions.comprehension');
    [...ens('application'), ...ens('application_reserve')].forEach((q, i) => { if (q && q.evalue !== 'application') ko('V-questions-02', `questions.application[${i}]`); });
    [...ens('transfert'), ...ens('transfert_reserve')].forEach((q, i) => { if (q && q.evalue === 'restitution') ko('V-questions-03', `questions.transfert[${i}]`); });
    ens('rappel').forEach((q, i) => { if (q && q.evalue !== 'restitution') ko('V-questions-04', `questions.rappel[${i}]`); });
    tq.forEach(({ q, chemin }) => {
      if (!q || !str(q.q)) return;
      if (/\bpourquoi\b/i.test(q.q) && q.evalue !== 'compréhension') ko('V-questions-05', chemin);
      if (/…$/.test(q.q.trim()) && !/\d/.test(q.q) && q.evalue !== 'restitution') ko('V-questions-06', chemin);
      if (/\bque fais-tu\b|\bque fait-il\b|\best-ce conforme\b/i.test(q.q) && q.evalue !== 'application') ko('V-questions-07', chemin);
    });
    const enonces = tq.map((x) => norm(x.q && x.q.q)).filter(Boolean);
    const bonnes = tq.map((x) => x.q && Array.isArray(x.q.choix) ? x.q.choix.find((c) => c && c.juste) : null).filter(Boolean).map((c) => norm(c.texte)).filter((t) => t.length > 6);
    if (new Set(enonces).size !== enonces.length || new Set(bonnes).size !== bonnes.length) ko('V-questions-08', 'questions');
    const sitP = C.prepare(sit.texte);
    [...ens('transfert'), ...ens('transfert_reserve')].forEach((q, i) => {
      if (!q || !str(q.q)) return;
      const p = C.prepare(q.q); let communs = 0; p.noms.forEach((w) => { if (sitP.noms.has(w)) communs++; });
      if (communs >= C.SEUILS.nc5Noms && C.jaccard(p.set, sitP.set) >= C.SEUILS.nc5Jaccard) ko('V-questions-09', `questions.transfert[${i}]`);
    });

    // ── Biais de longueur (sur les questions notées de la fiche) ──
    const notees = tq.filter((x) => x.ens !== 'prerequis' && x.q && Array.isArray(x.q.choix) && x.q.choix.length === 4 && x.q.choix.filter((c) => c && c.juste).length === 1);
    let long = 0, ratio = 0;
    notees.forEach(({ q, chemin }) => {
      const L = q.choix.map((c) => String(choixTexte(c) || '').length), k = q.choix.findIndex((c) => c.juste), d = L.filter((_, j) => j !== k), m = Math.max(...d);
      if (L[k] > m) long++;
      if (L[k] > 1.5 * m && L[k] - m > 15) ko('V-longueur-01', chemin);
      ratio += L[k] / (d.reduce((s, v) => s + v, 0) / d.length);
    });
    if (notees.length && long > 0.35 * notees.length) ko('V-longueur-02', 'questions', `${REGLES['V-longueur-02']} : ${long} sur ${notees.length}`);
    if (notees.length && (ratio / notees.length < 0.85 || ratio / notees.length > 1.15)) warn('V-longueur-03', 'questions', `${AVERTISSEMENTS['V-longueur-03']} : ${(ratio / notees.length).toFixed(2)}`);

    // ── Statut ──
    const statut = meta.statut;
    if (!E.STATUTS.includes(statut)) ko('V-statut-01', 'meta.statut');
    const emp = E.empreinte(f);
    if (statut === 'reference') {
      const v = f.validation || {};
      if (meta.origine !== 'humaine' || !str(v.date) || !(Number.isInteger(v.lot) && v.lot >= 1) || v.version !== meta.version || !str(v.role) || v.empreinte !== emp) ko('V-statut-02', 'validation');
    }
    if (statut === 'generee_validee' && (meta.origine === 'humaine' || !sources || !sources.length)) ko('V-statut-03', 'meta.statut');
    if (opts.catalogue && meta.essai === true) ko('V-statut-04', 'meta.essai');

    // ── Non-chevauchement avec le jeu 3a ──
    const ch = C.controler(f, opts.jeu, { shaJeu: opts.shaJeu, elementsJeu: opts.elementsJeu });
    if (!ch.verifiable) ko('V-chevauchement-00', 'jeu-3a', `${REGLES['V-chevauchement-00']} : ${ch.raison}`);
    ch.chevauchements.forEach((c) => ko('V-chevauchement-01', c.chemin, `${c.regles.join(', ')} avec ${c.ref} (Jaccard ${c.jaccard.toFixed(2)})`));

    // ── Lisibilité (avertissements) ──
    ['simple', 'standard'].forEach((niv) => {
      const t = String((ex[niv] || {}).texte || ''), ph = t.split(/(?<=[.!?])\s+/).filter(Boolean);
      if (ph.some((p) => p.split(/\s+/).length > 25)) warn('V-lisibilite-01', `explication.${niv}`);
    });
    const tousTextes = norm(`${(ex.simple || {}).texte} ${(ex.standard || {}).texte} ${reps.map((r) => r && r.texte).join(' ')}`);
    glo.forEach((g, i) => { if (g && str(g.terme) && !tousTextes.includes(norm(g.terme))) warn('V-lisibilite-02', `glossaire[${i}]`, `${AVERTISSEMENTS['V-lisibilite-02']} : « ${g.terme} »`); });

    const utilisable = !bloquants.length && E.UTILISABLES.includes(statut);
    return { utilisable, statut: statut || null, empreinte: emp, bloquants, avertissements, chevauchement: ch };
  }

  /* Biais de longueur sur un catalogue de fiches : mêmes seuils que J16 à J19 du jeu 3a (sur peu de questions, une
     seule fiche ne permet pas ces bornes statistiques : elles s'appliquent à l'ensemble des fiches de référence). */
  function biaisCatalogue(fiches) {
    let n = 0, long = 0, court = 0, ratio = 0;
    for (const f of fiches) for (const { q } of toutesQuestions(f).filter((x) => x.ens !== 'prerequis')) {
      const L = q.choix.map((c) => String(choixTexte(c)).length), k = q.choix.findIndex((c) => c.juste), d = L.filter((_, j) => j !== k);
      n++; if (L[k] > Math.max(...d)) long++; if (L[k] < Math.min(...d)) court++; ratio += L[k] / (d.reduce((s, v) => s + v, 0) / d.length);
    }
    const r = n ? ratio / n : 0;
    return { n, long, court, ratio: r, conforme: !!n && long >= 0.1 * n && long <= 0.35 * n && court >= 0.1 * n && court <= 0.35 * n && r >= 0.85 && r <= 1.15 };
  }

  const api = { FORMAT, ENSEMBLES, REGLES, AVERTISSEMENTS, valider, biaisCatalogue, toutesQuestions };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FicheValidateur = api;
})(typeof window !== 'undefined' ? window : globalThis);
