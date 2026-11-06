/* Génération de contenu par le serveur Arbor (fonction Supabase « tutor », modèles open source).
   Aucune clé d'IA dans le navigateur : la clé vit dans les secrets du serveur, l'étudiant se connecte par e-mail.
   Même interface que l'IA locale (LocalAI) pour les trois usages, afin que l'app choisisse simplement le moteur :
     enrich(title, text)                       points clés et questions pour une partie d'un PDF
     writeCourse(topic, context, source)       petit cours à partir d'un texte de référence (Wikipédia)
     writeNotion(notion, module, sources)      une notion à partir de passages numérotés (STORM)
   Le serveur écarte ce qui n'est pas ancré dans le texte fourni ; on le signale au lieu de le cacher. */
(function () {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Erreurs lisibles, et nouvel essai quand les modèles gratuits sont saturés (limite par minute)
  async function run(payload, onStatus) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try { return await Tutor.ask(payload); }
      catch (e) {
        if (e.kind === 'busy' && attempt < 2) {
          for (let s = 20; s > 0; s--) { onStatus && onStatus(`Beaucoup de demandes en ce moment, nouvel essai dans ${s} s…`); await wait(1000); }
          continue;
        }
        throw friendly(e);
      }
    }
  }
  function friendly(e) {
    const k = e && e.kind;
    if (k === 'auth') return Object.assign(new Error('Connecte-toi gratuitement (Réglages, puis Compte) pour utiliser l’analyse avancée.'), { kind: k });
    if (k === 'offline') return Object.assign(new Error('Pas de connexion : l’analyse avancée a besoin d’internet.'), { kind: k });
    if (k === 'quota') return Object.assign(new Error(`Tu as utilisé tes ${e.limit || ''} générations du mois. Elles reviennent le mois prochain.`), { kind: k });
    if (k === 'busy') return Object.assign(new Error('Le service est très demandé : réessaie dans quelques minutes.'), { kind: k });
    return e instanceof Error ? e : new Error(String(e));
  }

  async function enrich(title, text, opts = {}) {
    const r = await run({ task: 'enrichir', title, text: String(text || '').replace(/==/g, '').slice(0, 3500) }, opts.onStatus);
    return { keyPoints: (r.keyPoints || []).map(String), exercises: (r.exercises || []).filter((e) => e && e.q && e.a), dropped: r.dropped || 0 };
  }
  async function writeCourse(topic, context, source, opts = {}) {
    opts.onStatus && opts.onStatus('Arbor rédige le cours…');
    const r = await run({ task: 'rediger_cours', title: topic, context: context || '', text: source && source.text ? source.text.slice(0, 4500) : '', sourceTitle: source ? source.title : '' }, opts.onStatus);
    return { overview: String(r.overview || ''), notions: (r.notions || []).filter((n) => n && n.title && n.notes), dropped: r.dropped || 0, grounded: !!r.grounded };
  }
  async function writeNotion(notion, module, sources, opts = {}) {
    opts.onStatus && opts.onStatus('Arbor rédige la notion…');
    const r = await run({ task: 'rediger_notion', title: notion, context: module || '', text: String(sources || '').slice(0, 4000) }, opts.onStatus);
    if (r.ungrounded || !r.notes) throw new Error('La rédaction s’éloignait trop des sources : cours assemblé à partir des extraits.');
    return { notes: String(r.notes), keyPoints: (r.keyPoints || []).map(String), exercises: (r.exercises || []).map((e) => ({ q: String(e.q), a: String(e.a) })) };
  }

  // Disponible quand l'étudiant est connecté et en ligne (la connexion sert aussi au quota)
  const available = () => !!(window.Tutor && Tutor.signedIn() && navigator.onLine);
  window.AI = { available, enrich, writeCourse, writeNotion };
})();
