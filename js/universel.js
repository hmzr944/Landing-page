/* Arbor Learning universel : apprendre n'importe quel sujet, même sans document.
   - Passages d'une notion : ses notes (cours importé, document, notes de l'apprenant) avec leur source réelle ; si elles
     sont trop maigres, une source ouverte réelle (Wikipédia, CC BY-SA), récupérée ici avec son adresse.
     Aucune source n'est inventée : sans passage, pas de fiche.
   - Fiche : écrite par le serveur (tâche « fiche_rediger »), contrôlée ICI par le validateur ; un défaut renvoie la fiche
     au serveur une fois, avec la liste des défauts. Seule une fiche sans défaut bloquant devient « générée et vérifiée ».
   - Compagnon : passages trouvés dans les cours → réponse sourcée du serveur, ou « information absente ». */
(function () {
  const MIN_TEXTE = 280;
  const chunks = (t, n = 1400) => { const out = []; let cur = ''; String(t || '').split(/\n{2,}|(?<=[.!?])\s+(?=[A-ZÀ-Ý])/).forEach((ph) => { if ((cur + ' ' + ph).length > n && cur) { out.push(cur.trim()); cur = ph; } else cur += ' ' + ph; }); if (cur.trim()) out.push(cur.trim()); return out; };
  const clean = (t) => String(t || '').replace(/==/g, '').replace(/\*\*/g, '').replace(/^#+\s*/gm, '').trim();

  function sourceOf(s, node) {
    const c = (node.course && node.course.sources && node.course.sources[0]) || (node.module && node.module.sources && node.module.sources[0]);
    if (c) return { titre: c.title || 'Source du cours', url: c.url, licence: /wiki/.test(c.url || '') ? 'CC BY-SA 4.0' : undefined };
    if (node.src && node.src.doc) return { titre: `${node.src.doc}${node.src.pages && node.src.pages.length ? `, p. ${node.src.pages.join(', ')}` : ''}`, licence: 'document de l’apprenant' };
    return { titre: `Notes de « ${s.title} »`, licence: 'notes de l’apprenant' };
  }
  function passagesNotion(s, node) {
    const txt = [clean(node.notes), (node.keyPoints || []).join('. '), clean(node.explain)].filter(Boolean).join('\n\n');
    const src = sourceOf(s, node);
    return chunks(txt).slice(0, 6).filter((t) => t.length >= 60).map((t, i) => ({ id: `p${i + 1}`, ...src, texte: t }));
  }
  async function passagesOuverts(sujet, contexte) {
    if (!window.Course || !Course.wikiSource) return [];
    let w = null;
    try { w = await Course.wikiSource(sujet, contexte); } catch (e) { w = null; }
    if (!w || !w.text) return [];
    return chunks(w.text).slice(0, 6).filter((t) => t.length >= 60).map((t, i) => ({ id: `w${i + 1}`, titre: `Wikipédia : ${w.title}`, url: w.url, licence: 'CC BY-SA 4.0', texte: t }));
  }

  /* Défauts bloquants (hors jeu de mesure 3a, qui n'est pas fourni dans l'application) */
  const defauts = (f) => FicheValidateur.valider(f, {}).bloquants.filter((b) => !/^V-chevauchement/.test(b.regle));

  async function construireFiche(s, node, opts = {}) {
    const st = opts.onStatus || (() => {});
    let passages = passagesNotion(s, node);
    if (passages.reduce((a, p) => a + p.texte.length, 0) < MIN_TEXTE) {
      st('Recherche de sources ouvertes…');
      passages = [...passages, ...(await passagesOuverts(node.title, s.title !== node.title ? s.title : ''))];
    }
    if (!passages.length) throw Object.assign(new Error('Aucune source trouvée pour cette notion. Ajoute des notes ou un document : Arbor n’écrit pas sans source.'), { kind: 'sources' });
    const profil = { ...(s.profil || {}), ...(opts.profil || {}) };
    const payload = { task: 'fiche_rediger', notion: node.title, sujet: s.title, niveau: profil.niveau || 'debutant', intention: profil.intention || 'comprendre', objectif: profil.objectif || '', question: profil.question || '', passages };
    st('Arbor conçoit la situation, les explications et les exercices…');
    let { fiche } = await AI.fiche(payload, st);
    let d = defauts({ ...fiche, meta: { ...fiche.meta, statut: 'generee_validee' } });
    if (d.length) {
      st('Contrôle : la fiche est reprise pour corriger ses défauts…');
      ({ fiche } = await AI.fiche({ ...payload, retour: d.slice(0, 12).map((b) => `${b.regle} (${b.chemin}) : ${b.message}`) }, st));
      d = defauts({ ...fiche, meta: { ...fiche.meta, statut: 'generee_validee' } });
    }
    if (d.length) throw Object.assign(new Error(`La fiche ne passe pas les contrôles (${d.slice(0, 3).map((b) => b.regle).join(', ')}${d.length > 3 ? '…' : ''}). Elle n’est pas servie.`), { kind: 'controle', defauts: d });
    fiche.meta.statut = 'generee_validee';
    node.fiche = fiche;
    return fiche;
  }

  async function compagnon(question, resultats, contexte) {
    const passages = resultats.slice(0, 5).flatMap((r, i) => passagesNotion(r.s, r.n).slice(0, 2).map((p, j) => ({ ...p, id: `p${i + 1}${String.fromCharCode(97 + j)}`, titre: `${r.s.title} › ${r.n.title}`, _ref: { sid: r.s.id, nid: r.n.id } })));
    const refs = Object.fromEntries(passages.map((p) => [p.id, { ...p._ref, titre: p.titre }]));
    const out = await AI.compagnon({ task: 'compagnon', question, contexte, passages: passages.map(({ _ref, ...p }) => p) });
    return { ...out, citations: (out.citations || []).map((c) => ({ ...c, ref: refs[c.passage] })) };
  }

  window.Universel = { passagesNotion, passagesOuverts, construireFiche, compagnon, defauts };
})();
