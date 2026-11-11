/* Classification du contenu d'un document : qu'est-ce qui est à apprendre, et qu'est-ce qui ne l'est pas ?
   Universel (toutes disciplines), en français et en anglais, sans aucune règle propre à un document.

   Types :
     cours            définition, mécanisme, règle, exemple, procédure : la matière à apprendre
     evaluation       jugement porté sur l'apprenant (niveau, acquis, note, appréciation)
     recommandation   conseil personnel adressé à l'apprenant (priorités, « je te conseille »)
     commentaire      avis ou propos de l'auteur sur sa démarche ou la relation (« je vais être franc »)
     annexe           champs de formulaire, échelles de notation, crédits, mode d'emploi du document

   Principe : on distingue ce qui parle DU SUJET de ce qui parle DE L'APPRENANT ou DU DOCUMENT.
   Un « je » ou un « tu » isolé ne suffit pas : « Je pense donc je suis » reste du cours.
   Les marques fortes (« non acquis », « ton niveau », « je te conseille ») suffisent seules ; les marques faibles
   (« je pense ») ne comptent que si le document est personnel, c'est-à-dire adressé à un apprenant précis.
   Chaque décision garde sa raison (why), pour être expliquée et corrigée. */
(function () {
  const plain = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’`´]/g, "'").replace(/\s+/g, ' ').trim();

  // Marques fortes : suffisent à elles seules
  const EVAL = [
    [/\b(non acquis|pas encore acquis|en cours d'acquisition|partiellement acquis|acquis en pratique|pratique non validee|autonomie non validee|non maitrise en pratique)\b/, 'statut d’acquisition'],
    [/\bniveau (estime|actuel|global|de depart)\b|\bpoint de depart\b/, 'niveau de l’apprenant'],
    [/\b(ton|ta|tes|votre|vos) (niveau|travail|copie|devoir|resultats?|points? (faibles?|forts?)|plus gros points? faibles?|potentiel|profil|retard|progres|lacunes|difficultes|principal probleme|orientation)\b/, 'jugement adressé à l’apprenant'],
    [/\b(tu|vous) (ne )?(maitrises?|maitrisez|sais|savez|connais|connaissez|confonds|confondez)\b[^.]{0,80}\b(pas|encore|mal|bien|parfaitement|quelques)\b/, 'ce que l’apprenant sait ou non'],
    [/\b(tu|vous) (as|avez) (beaucoup |encore |deja )?(progresse|du mal|des difficultes|des lacunes|du retard|reussi|echoue|bien travaille|fait des progres|vu beaucoup|identifie un probleme|precise que)\b/, 'constat sur l’apprenant'],
    [/\b(tu|vous) (es|etes|n'es|n'etes) (davantage|encore|plutot|deja|au stade|pas encore)\b|\b(tu|vous) manques? (encore )?de\b/, 'situation de l’apprenant'],
    [/\b(l'eleve|l'etudiante?|le stagiaire|la stagiaire|le candidat|la candidate|l'apprenante?|le beneficiaire|la beneficiaire)\b.{0,60}\b(maitrise|confond|a (bien )?compris|a progresse|montre|fait preuve|eprouve|manque|n'a pas|reussit|parvient|doit encore|devra)\b/, 'appréciation d’un apprenant'],
    [/\b(bon travail|tres bon travail|peut mieux faire|ensemble (satisfaisant|insuffisant|correct|fragile)|resultats? (satisfaisants?|insuffisants?|encourageants?)|bravo|felicitations)\b/, 'appréciation'],
    [/\bnote\s*:?\s*\d+([.,]\d+)?\s*\/\s*20\b|\bresultat\s*:?\s*\d+\s*\/\s*\d+\b/, 'note'],
    [/\b(mon|notre) (constat|avis|diagnostic|evaluation|appreciation)\b/, 'constat de l’auteur'],
    [/^(niveau\s*:?\s*)?(debutant|grand debutant|intermediaire|avance|confirme|beginner|intermediate|advanced)\b[^.]{0,40}\.?$/, 'niveau de l’apprenant'],
    [/\b(n'est|ne sont) pas (encore )?validee?s?\b|\bne valide pas (encore )?\b|\bmontre une (bonne|faible|certaine|reelle) (comprehension|maitrise)\b|\bentre les niveaux \d\b/, 'constat d’acquisition'],
    [/\bje (ne )?(te|vous) (considere|trouve|juge|situe|ferai pas)\b|\bje n'ai pas (encore )?de preuve\b/, 'jugement de l’auteur sur l’apprenant'],
    [/\b(you|he|she) (have|has|'ve) (shown|demonstrated|made (good |some |little |great )?progress|struggled|improved|not yet)\b/, 'judgement on the learner'],
    [/\byour (work|essay|assignment|grade|level|performance|answers?|understanding|writing|argument|report) (is|was|shows|showed|demonstrates|needs|lacks|could)\b/, 'judgement on the learner'],
    [/\b(well done|good effort|needs improvement|excellent work|not yet achieved|meets expectations|below expectations|above expectations)\b/, 'appraisal'],
    [/\b(the student|the learner|the candidate|the trainee)\b.{0,40}\b(demonstrates|shows|struggles|has made|needs to|should|is able|is not|lacks)\b/, 'appraisal of a learner'],
    [/\bgrade\s*:\s*[a-f][+-]?\b|\bscore\s*:?\s*\d+\s*\/\s*\d+\b/, 'grade'],
  ];
  const RECO = [
    [/\bje (te|vous) (conseille|recommande|propose|suggere|encourage)\b/, 'conseil de l’auteur'],
    [/\bje (prefere|veux|voudrais|souhaite) (que|te voir|vous voir)\b|\bje (ne )?(veux|voudrais) (surtout )?pas que\b/, 'souhait de l’auteur'],
    [/\b(ma|notre) recommandation\b|\bce que je te conseille\b/, 'recommandation'],
    [/\b(tu|vous) (dois|devez|devrais|devriez) (d'abord|commencer|consacrer|travailler|revoir|reviser|t'entrainer|vous entrainer|insister|approfondir|construire|te concentrer|vous concentrer)\b/, 'consigne personnelle'],
    [/\bne (cherche|cherchez) pas (encore )?a\b|\bconstrui[st]z? d'abord\b|\bpriorite (absolue|maximale)\b/, 'priorité personnelle'],
    [/\b(il faudrait|il faut) que (tu|vous)\b|\bcontinue[sz]? (comme ca|ainsi|tes efforts|vos efforts)\b/, 'conseil personnel'],
    [/\bi (recommend|suggest|advise|would (like|encourage) you)\b|\bmy recommendation\b|\bkeep up the good work\b/, 'recommendation'],
    [/\byou (should|need to|must) (focus|work on|revise|practi[cs]e|spend|review|start by)\b/, 'personal advice'],
  ];
  const COMMENT = [
    [/\bje vais (etre|te dire)\b|\b(franchement|honnetement|pour etre franc)\b/, 'propos de l’auteur'],
    [/\bnos echanges\b|\bce n'est pas une critique\b|\bpas forcement agreables? a entendre\b/, 'relation auteur-apprenant'],
    [/\bto be honest\b|\bi have to be honest\b/, 'author’s remark'],
  ];
  // Marques faibles : ne comptent que dans un document personnel
  const WEAK = [
    [/\b(je|j') (ne |n')?(me base|pense|crois|estime|prefere|considere|choisirais|utiliserai)\b/, 'avis de l’auteur', 'commentaire'],
    [/\bnous (avons|en avons) (aborde|abordes|parle|vu|travaille)\b|\bque nous avons abordes?\b/, 'échanges auteur-apprenant', 'commentaire'],
    [/\b(tu|vous) (as|avez) (deja )?(rencontre|commence|aborde|decouvert)\b/, 'parcours de l’apprenant', 'evaluation'],
    [/\b(ton|ta|tes) (laboratoire|apprentissage|programme|parcours)\b/, 'situation de l’apprenant', 'recommandation'],
    [/\bi (think|believe|feel)\b/, 'author’s opinion', 'commentaire'],
  ];
  const ANNEX = [
    [/^[^.…_]{0,60}:\s*(\.{4,}|…{2,}|_{4,})|^(\.{4,}|…{2,}|_{4,})|^.{0,100}(\.{6,}|…{3,}|_{6,})\s*$/, 'champ à remplir'],
    [/^(nom|prenom|date( de (naissance|debut|fin))?|signature|adresse|numero|n°|cachet|e-?mail|telephone|statut|name|surname|signed)\s*:/, 'champ de formulaire'],
    [/\b(ce (cours|document|guide|support|module) (vous )?(est|a ete) (propose|realise|redige|concu|compose))|\bce document (reprend|distingue|presente|resume)\b/, 'présentation du document'],
    [/^(sommaire|table des matieres|contents|table of contents)\b/, 'sommaire'],
    [/^.{0,60}(©|\btous droits reserves\b|\ball rights reserved\b|\blicence creative commons\b).{0,40}$/, 'mentions légales'],
    [/\bbienvenue dans ce (cours|module|guide)\b|\bcomment (etudier|utiliser) ce (cours|guide|document)\b|\bil ne s'agit pas d'un examen\b/, 'mode d’emploi'],
    [/\b(mettre|cocher|entourer) (une croix|la case)\b|\b(a|faire) remplir\b|\bto be completed by\b|\b(fiche|grille) d'(evaluation|appreciation)\b/, 'consigne de formulaire'],
  ];
  const SCALE = /\b(excellent|tres bien|bien|assez bien|passable|insuffisant|tres satisfaisant|satisfaisant|non satisfaisant|good|fair|poor|very good)\b/g;

  // Une phrase qui définit ou explique reste du cours, même si elle tutoie
  const DEFN = /\b(est (un|une|le|la|l')|sont (des|les)|designe|se definit|on appelle|correspond a|signifie|consiste a|permet (de|d'))\b/;
  const test = (rules, p) => { for (const [re, why] of rules) if (re.test(p)) return why; return null; };
  // Suite de libellés vides (« Nom : Prénom : Date : ») : des champs de formulaire, pas du texte
  const emptyFields = (p) => {
    if (p.length > 400) return false;
    const parts = p.split(/\s?:(?:\s+|$)/).map((x) => x.trim()); // « 00:03:BA » ou « 12:30 » ne sont pas des libellés
    if (parts.length < 4) return false;
    const inner = parts.slice(1, -1);
    // entre deux « : » il n'y a qu'un libellé court (ou rien) : c'est une grille de champs, pas une phrase
    // (un libellé est fait de mots, pas de chiffres : « QUERY: 1, ANSWER: 5 » est une sortie de commande)
    return inner.filter((x) => x.length <= 30 && !/\d/.test(x)).length >= Math.max(3, inner.length * 0.8);
  };

  /* Une phrase. personal = le document s'adresse à un apprenant précis. */
  function sentence(s, personal) {
    const p = plain(s);
    if (!p) return { kind: 'cours', why: '' };
    let w;
    if ((w = test(ANNEX, p))) return { kind: 'annexe', why: w };
    if ((p.match(SCALE) || []).length >= 4) return { kind: 'annexe', why: 'échelle de notation' };
    if (emptyFields(p)) return { kind: 'annexe', why: 'champs de formulaire' };
    if (/\b(remarques? (eventuelles?|generales?)|appreciation generale|evaluation generale|observations? du (tuteur|jury|correcteur))\b/.test(p)) return { kind: 'annexe', why: 'grille d’évaluation' };
    if ((w = test(EVAL, p))) return { kind: 'evaluation', why: w };
    if ((w = test(RECO, p))) return { kind: 'recommandation', why: w };
    if ((w = test(COMMENT, p))) return { kind: 'commentaire', why: w };
    if (personal) {
      for (const [re, why, kind] of WEAK) if (re.test(p)) return { kind, why };
      // intitulé court d'un bilan (« Évaluation honnête • compétences à construire ») : pas une phrase de cours
      if (p.length <= 100 && !DEFN.test(p)) { const tk = titleKind(s); if (tk === 'evaluation' || tk === 'recommandation') return { kind: tk, why: 'intitulé de bilan' }; }
      if (/\b(tu|te|t'|toi|ton|ta|tes|vous|votre|vos)\b/.test(p) && !DEFN.test(p)) return { kind: 'commentaire', why: 'adressé à l’apprenant' };
    }
    return { kind: 'cours', why: '' };
  }

  // Découpe en phrases sans jamais perdre de texte : « 192.168.1.1 », « 3,5 » ou « www.site.fr » ne coupent pas
  const split = (t) => String(t || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?…])\s+(?=[\p{Lu}\d«"“(\[•\-–—○])/u).map((x) => x.trim()).filter(Boolean);

  /* Profil du document : est-il adressé à un apprenant précis (bilan, appréciation, rapport) ? Un formulaire ? */
  function profile(text) {
    const ss = split(text);
    let strong = 0, annex = 0;
    ss.forEach((s) => { const k = sentence(s, false).kind; if (k === 'annexe') annex++; else if (k !== 'cours') strong++; });
    const p = plain(text);
    const words = (p.match(/[a-z]+/g) || []).length || 1;
    const tu = (p.match(/\b(tu|te|toi|ton|ta|tes)\b/g) || []).length / words; // tutoiement : adressé à une personne
        const ratio = strong / Math.max(1, ss.length);
    const learner = /\b(l'eleve|l'etudiante?|le stagiaire|la stagiaire|le candidat|la candidate|l'apprenante?|the student|the learner|the candidate)\b/.test(p);
    const fields = ss.filter((s) => /champ|formulaire|echelle|notation/.test(plain(sentence(s, false).why))).length + (p.match(SCALE) || []).length / 6;
    return {
      sentences: ss.length, strong, annex,
      // adressé à une personne précise : plusieurs jugements, et un « tu » ou un apprenant nommé, ou une forte densité
      personal: strong >= 2 && (tu > 0.003 || learner || ratio >= 0.04),
      // formulaire ou grille à remplir : des champs, des cases, une échelle de notation
      form: fields >= 4,
      ratio: Math.round(ratio * 1000) / 1000,
    };
  }

  /* Un paragraphe : renvoie le cours qu'il contient et ce qui est mis de côté, phrase par phrase */
  /* opts.strict : document de travail (organisation). Les marques fortes (jugement, conseil personnel) sont écartées
     même si le document n'est pas « personnel » ; les marques faibles (« vous devez… ») restent du contenu. */
  function paragraph(text, personal, opts = {}) {
    const keep = [], aside = [];
    const ss = split(text);
    const kinds = ss.map((s) => sentence(s, personal));
    if (personal) kinds.forEach((k, i) => {
      if (k.kind !== 'cours' || DEFN.test(plain(ss[i])) || ss[i].length > 160) return;
      const prev = kinds[i - 1], next = kinds[i + 1];
      const side = (x) => x && x.kind !== 'cours' && x.kind !== 'annexe';
      if ((side(prev) && (side(next) || !next)) || (!prev && side(next))) kinds[i] = { kind: (prev && side(prev) ? prev : next).kind, why: 'dans la continuité du passage' };
    });
    // « Ce document reprend… Il distingue… » : la phrase qui reprend le sujet d'une annexe en fait partie
    kinds.forEach((k, i) => { if (k.kind === 'cours' && i > 0 && kinds[i - 1].kind === 'annexe' && /^(il|elle|celui-ci|celle-ci|it|this)\b/.test(plain(ss[i]))) kinds[i] = { kind: 'annexe', why: kinds[i - 1].why }; });
    ss.forEach((s, i) => {
      const r = kinds[i];
      // Dans un document qui ne s'adresse pas à une personne précise (cours, guide, texte officiel), une phrase
      // de jugement est un exemple ou une explication : elle reste. Seules les annexes y sont mises de côté.
      if (r.kind === 'cours' || (!personal && !opts.strict && r.kind !== 'annexe')) keep.push(s); else aside.push({ kind: r.kind, text: s, why: r.why });
    });
    // rien à écarter : le texte d'origine est rendu tel quel (sauts de ligne compris)
    return { cours: aside.length ? keep.join(' ') : String(text || ''), aside };
  }

  /* Un titre de section qui annonce un type (« Mon avis », « Recommandation finale », « Feedback », « Bilan ») */
  const TITLE = [
    [/\b(evaluation|diagnostic|bilan|appreciation|avis|niveau|resultats?|acquis|feedback|assessment|progress report|report card)\b/, 'evaluation'],
    [/\b(recommandations?|conseils?|priorites?|plan de (progression|travail)|ce que je te conseille|next steps|recommendations?)\b/, 'recommandation'],
    [/\b(mot de l'auteur|remerciements?|a propos|preambule|avant-propos|mode d'emploi|sommaire|echelle|grille|criteres|contacts?|acknowledg|about this)\b/, 'annexe'],
  ];
  function titleKind(title) { const p = plain(title); for (const [re, k] of TITLE) if (re.test(p)) return k; return null; }

  /* Lisibilité d'un texte extrait : une police mal encodée donne des symboles au lieu de mots */
  function readable(text) {
    const t = String(text || '').replace(/[.…_·•\-–—]{3,}/g, ' '); // pointillés de formulaire : pas du texte illisible
    const nonSpace = t.replace(/\s/g, '');
    if (nonSpace.length < 40) return true; // trop court pour juger
    const letters = (t.match(/\p{L}/gu) || []).length / nonSpace.length;
    const tokens = t.split(/\s+/).filter(Boolean);
    const wordy = tokens.filter((w) => /\p{L}{2,}/u.test(w) && /[aeiouyàâäéèêëîïôöùûüœæ]/i.test(w)).length / (tokens.length || 1);
    return letters >= 0.55 && wordy >= 0.45;
  }

  const LABELS = { cours: 'Cours', evaluation: 'Évaluation', recommandation: 'Recommandation', commentaire: 'Commentaire', annexe: 'Annexe' };
  window.DocClassify = { sentence, paragraph, profile, titleKind, readable, split, plain, LABELS };
})();
