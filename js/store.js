/* Arbor : données et persistance (localStorage) */
(function () {
  const KEY = 'arbor:v1';

  // Couleurs de sujet : toutes lisibles avec du texte blanc (contraste ≥ 4.5:1)
  // Jade, bois de rose, cuivre, sarcelle, ardoise, prune, forêt, olive : accordées au vert d'Arbor, texte blanc lisible
  const PALETTE = ['#1E7A57', '#A8455A', '#9A5A22', '#0F766E', '#2F6F8F', '#6B5BA8', '#3E5C4B', '#5F7224'];
  // Icônes Phosphor proposées pour un sujet
  const ICONS = ['book-open', 'brain', 'flask', 'atom', 'globe-hemisphere-west', 'bank', 'scales', 'heartbeat',
    'calculator', 'chart-line-up', 'code', 'translate', 'music-notes', 'palette', 'planet', 'leaf'];
  // anciennes couleurs (y compris l'ancienne palette vive) -> palette accordée
  const OLD_COLORS = { '#7c5cff': '#6B5BA8', '#ff5c8a': '#A8455A', '#ffb020': '#9A5A22', '#22c55e': '#1E7A57', '#06b6d4': '#2F6F8F', '#f97316': '#9A5A22', '#e879f9': '#6B5BA8', '#3b82f6': '#2F6F8F', '#3451D1': '#1E7A57', '#D93A40': '#A8455A', '#C2550A': '#9A5A22', '#0B7F75': '#0F766E', '#0369A1': '#2F6F8F', '#9333B8': '#6B5BA8', '#C2255C': '#3E5C4B', '#5B7A1E': '#5F7224' };
  const OLD_EMOJIS = { '🧠': 'brain', '📚': 'book-open', '🧪': 'flask', '🌍': 'globe-hemisphere-west', '⚙️': 'code', '🎨': 'palette', '🧬': 'heartbeat', '📐': 'calculator', '💡': 'brain', '🏛️': 'bank', '🎵': 'music-notes', '💻': 'code', '⚖️': 'scales', '🩺': 'heartbeat', '📈': 'chart-line-up', '🪐': 'planet', '🌱': 'leaf' };

  const DEFAULT_SETTINGS = { theme: 'auto', mascot: true, dailyGoal: 15, newPerDay: 10, focusMin: 25, breakMin: 5, calm: false, plan: null, localAI: false, localModel: 'Qwen2.5-3B-Instruct-q4f16_1-MLC' };
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  function makeNode(title = 'Nouvelle partie', extra = {}) {
    return {
      id: uid(),
      title,
      notes: '',
      explain: '',
      keyPoints: [],
      exercises: [], // { id, q, a } : énoncé et méthode/solution
      srs: null, // répétition espacée : { s, d, last, due, reps, lapses }
      status: 'todo', // todo | doing | done
      collapsed: false,
      children: [],
      ...extra,
    };
  }

  function makeSubject(title = 'Nouveau sujet', extra = {}) {
    const color = extra.color || PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const icon = ICONS.includes(extra.icon) ? extra.icon : OLD_EMOJIS[extra.emoji] || ICONS[Math.floor(Math.random() * ICONS.length)];
    const root = extra.root || makeNode(title);
    root.title = title;
    return { id: uid(), title, color: OLD_COLORS[color] || color, icon, createdAt: Date.now(), updatedAt: Date.now(), root };
  }

  /* Normalise un arbre venant d'un import (PDF, IA, JSON) */
  const NUMBERING = /^\s*(?:(?:chapitre|partie|section|leçon)\s+)?(?:\d{1,2}(?:\.\d{1,2})*[.)]|\d{1,2}(?:\.\d{1,2})+|[IVXLC]{1,5}[.)]|[A-H][.)])\s+(?=\S)/i;
  const NUM_SPACE = /^\s*\d{1,2}\s+(?=\p{Lu})/u; // « 1 Adressage » (LaTeX), mais pas « 3 trucs à voir »
  const cleanTitle = (t) => {
    const out = String(t || '').replace(NUMBERING, '').replace(NUM_SPACE, '').trim();
    return out ? out.charAt(0).toUpperCase() + out.slice(1) : String(t || '').trim();
  };

  const ID = /^[a-z0-9]{6,24}$/;
  const lessonRes = (r) => (r && typeof r === 'object' ? { at: +r.at || Date.now(), good: +r.good || 0, asked: +r.asked || 0 } : undefined);
  function normalize(node, keepIds = false) {
    const n = makeNode(cleanTitle(node.title || 'Sans titre').slice(0, 160), {
      notes: String(node.notes || ''),
      explain: String(node.explain || ''),
      exercises: Array.isArray(node.exercises) ? node.exercises.filter((e) => e && e.q).map((e) => ({ id: uid(), q: String(e.q), a: String(e.a || '') })) : [],
      srs: node.srs && typeof node.srs.s === 'number' ? node.srs : null,
      ...(node.course && typeof node.course === 'object' ? { course: { from: String(node.course.from || ''), sources: Array.isArray(node.course.sources) ? node.course.sources : [] } } : {}),
      ...(node.module && typeof node.module === 'object' ? { module: { pretest: String(node.module.pretest || ''), learned: !!node.module.learned, generated: !!node.module.generated, sources: Array.isArray(node.module.sources) ? node.module.sources : [], date: node.module.date || null, ...(node.module.lessonDone ? { lessonDone: lessonRes(node.module.lessonDone) } : {}) } } : {}),
      ...(node.lessonDone ? { lessonDone: lessonRes(node.lessonDone) } : {}),
      keyPoints: Array.isArray(node.keyPoints) ? node.keyPoints.map(String).filter(Boolean) : [],
      // résumé des observations (le détail est dans le journal) : nombre, succès, jours de rappel réussi, confusions
      ...(node.ev && typeof node.ev === 'object' ? { ev: { n: +node.ev.n || 0, ok: +node.ev.ok || 0, miss: +node.ev.miss || 0, last: +node.ev.last || 0, lastOkAt: +node.ev.lastOkAt || 0,
        recall: Array.isArray(node.ev.recall) ? node.ev.recall.filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).slice(-10) : [],
        ...(Array.isArray(node.ev.mis) ? { mis: node.ev.mis.slice(-5).map((m) => ({ label: String(m.label || '').slice(0, 120), at: +m.at || 0 })) } : {}) } } : {}),
      // passage d'origine dans le document importé : pages et extrait exact
      ...(node.src && Array.isArray(node.src.pages) ? { src: { pages: node.src.pages.filter((x) => Number.isInteger(x) && x > 0).slice(0, 12), quote: String(node.src.quote || '').slice(0, 300), doc: String(node.src.doc || '').slice(0, 120) } } : {}),
      ...(Array.isArray(node.objectives) && node.objectives.length ? { objectives: node.objectives.map(String).filter(Boolean).slice(0, 12) } : {}),
      status: ['todo', 'doing', 'done'].includes(node.status) ? node.status : 'todo',
    });
    if (keepIds && ID.test(String(node.id || ''))) n.id = node.id;
    n.children = Array.isArray(node.children) ? node.children.map((c) => normalize(c, keepIds)) : [];
    return n;
  }

  function demoSubject() {
    const s = makeSubject('Découvrir Arbor', { icon: 'leaf', color: '#1E7A57' });
    s.root.notes = "Bienvenue ! Un sujet est un arbre : chaque partie peut contenir des sous-parties, de plus en plus petites, jusqu’à ce que chacune tienne en une idée.\n\n- Clique sur une partie dans l’arbre pour l’ouvrir\n- Ajoute des notes et des points clés\n- Glisse une partie sur une autre pour la ranger dedans\n- Révise chaque jour les cartes que te propose Arbor";
    const a = makeNode('Découper le sujet', {
      notes: "Commence large, puis découpe jusqu’à obtenir des morceaux digestes : une idée par feuille.",
      keyPoints: ['Une feuille = une seule idée', 'Pas plus de 5 à 7 enfants par partie'],
    });
    a.children.push(
      makeNode('Les grandes parties', { keyPoints: ['Les chapitres du cours'] }),
      makeNode('Les sous-catégories', { keyPoints: ['Les notions à l’intérieur de chaque chapitre'] })
    );
    const b = makeNode('Prendre des notes', {
      notes: "Les notes acceptent un **markdown** simple :\n\n# Titre\n- liste\n**gras**, *italique*, ==surligné==, `code`",
      keyPoints: ['Reformule avec tes mots', 'Surligne avec ==texte=='],
    });
    const c = makeNode('Importer un PDF', {
      notes: "Le bouton Importer un PDF analyse le document (titres, définitions, points importants) et construit un cours structuré. Avec une clé API Claude (Réglages), l’analyse est encore plus fine.",
      keyPoints: ['Les titres deviennent des parties', 'Les définitions deviennent des points clés'],
    });
    a.exercises = [{ id: uid(), q: 'Découpe le sujet « Les volcans » en 3 à 5 grandes parties.', a: 'Une idée par partie, du plus général au plus précis. Par exemple : formation, types de volcans, éruptions, risques et prévention.' }];
    const d = makeNode('Réviser', {
      notes: 'Le mode révision transforme chaque partie en carte. Retourne-la, puis dis si tu la maîtrises : tu gagnes de l’XP !',
      keyPoints: ['Je maîtrise → statut « Maîtrisé » + XP', 'À revoir → statut « En cours »'],
    });
    s.root.children.push(a, b, c, d);
    return s;
  }

  /* ---------- Lecture ----------
     Règle d'or : des données illisibles ne sont JAMAIS écrasées. Elles sont mises de côté (RESCUE),
     puis Arbor essaie la copie de secours du jour précédent (BAK), et seulement ensuite la démo. */
  const BAK = KEY + ':bak', BAK_DAY = KEY + ':bakDay', RESCUE = KEY + ':rescue';
  const status = { load: 'ok', bakAt: null, rescued: false, persisted: null, lastError: null };
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { localStorage.setItem(k, v); };

  function migrate(data) {
    data.settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
    // Ancienne version : une clé d'IA pouvait être enregistrée dans le navigateur. Elle est effacée pour de bon.
    delete data.settings.apiKey; delete data.settings.model;
    data.stats = data.stats || { days: {}, calib: {} };
    data.subjects.forEach((s) => {
      if (!ICONS.includes(s.icon)) s.icon = OLD_EMOJIS[s.emoji] || 'book-open';
      s.color = OLD_COLORS[s.color] || s.color;
      delete s.emoji;
      walk(s.root, (n, depth) => {
        if (depth > 0) n.title = cleanTitle(n.title);
        if (n.explain === undefined) n.explain = '';
        if (n.srs === undefined) n.srs = null;
        if (!Array.isArray(n.children)) n.children = [];
        if (!Array.isArray(n.keyPoints)) n.keyPoints = [];
        // Anciennes parties marquées « maîtrisées » : on leur donne une mémoire de départ
        if (!n.srs && n.status === 'done') {
          const now = Date.now();
          n.srs = { s: 7, d: 5, last: now - 2 * 86400000, due: now + (2 + Math.random() * 4) * 86400000, reps: 1, lapses: 0 };
        }
        if (!Array.isArray(n.exercises)) n.exercises = [];
        // anciens exercices générés, trop longs : raccourcis (et retirés s'il n'y a rien à manipuler)
        n.exercises = n.exercises.filter((e) => {
          if (/^Mise en pratique : /.test(e.q)) {
            if (/^(comprendre|apprendre|maîtriser|découvrir|connaître|savoir|étudier|expliquer|définir|décrire)\b/i.test(n.title)) return false;
            e.q = `À toi : ${n.title.charAt(0).toLowerCase() + n.title.slice(1)} dans ton environnement de test.`; e.a = 'Note les étapes, puis vérifie que ça marche.';
          } else if (/^Explique avec tes mots, sans regarder : /.test(e.q)) e.q = `En une phrase : c’est quoi, « ${n.title} » ?`;
          return true;
        });
        // Statut calculé à partir de la mémoire mesurée, plus jamais déclaré à la main
        n.status = !n.srs ? 'todo' : n.srs.s >= 21 ? 'done' : 'doing';
      });
    });
    data.xp = data.xp || 0;
    return data;
  }
  // Renvoie l'état, ou null si le texte n'est pas un état Arbor lisible
  function parse(raw) {
    try {
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.subjects) || data.subjects.some((s) => !s || !s.root)) return null;
      return migrate(data);
    } catch (e) { return null; }
  }

  function load() {
    const raw = get(KEY);
    if (raw) {
      const data = parse(raw);
      if (data) return data;
      // Illisible : on met l'original de côté (sans écraser un sauvetage plus ancien différent)
      try { if (get(RESCUE) !== raw) put(RESCUE, raw); status.rescued = true; }
      catch (e) { status.rescued = false; status.readOnly = true; } // impossible de mettre de côté : on n'écrit plus rien par-dessus
      const bak = get(BAK) && parse(get(BAK));
      if (bak) { status.load = 'backup'; status.bakAt = get(BAK_DAY); return bak; }
      status.load = 'lost';
    }
    return { subjects: [demoSubject()], settings: { ...DEFAULT_SETTINGS }, stats: { days: {}, calib: {} }, xp: 0, firstRun: !raw };
  }

  /* ---------- Écriture ----------
     Une fois par jour, la dernière version lisible devient la copie de secours. Si le stockage est plein,
     la copie de secours est sacrifiée d'abord ; si ça ne suffit pas, l'appli est prévenue (onError). */
  let saveTimer = null, pending = null;
  const listeners = [];
  const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  function writeNow(state) {
    if (status.readOnly) return fail('blocked', new Error('données illisibles non sauvegardées'));
    let json;
    try { json = JSON.stringify(state); } catch (e) { return fail('serialize', e); }
    try {
      if (get(BAK_DAY) !== dayKey()) {
        const prev = get(KEY);
        if (prev && parse(prev)) { try { put(BAK, prev); put(BAK_DAY, dayKey()); } catch (e) { try { localStorage.removeItem(BAK); } catch (_) { /* rien */ } } }
      }
    } catch (e) { /* la copie de secours est un bonus */ }
    try { put(KEY, json); }
    catch (e) {
      try { localStorage.removeItem(BAK); localStorage.removeItem(BAK_DAY); put(KEY, json); }
      catch (e2) { return fail(/quota/i.test(e2.name + e2.message) ? 'quota' : 'write', e2); }
    }
    if (status.lastError) { status.lastError = null; listeners.forEach((f) => f(null)); }
    return true;
  }
  function fail(kind, err) {
    console.warn('Sauvegarde impossible', err);
    status.lastError = kind;
    listeners.forEach((f) => f(kind));
    return false;
  }
  function save(state) {
    pending = state;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 150);
  }
  // Écrit tout de suite ce qui attend (fermeture d'onglet, passage en arrière-plan)
  function flush() {
    clearTimeout(saveTimer);
    if (!pending) return true;
    const st = pending; pending = null;
    return writeNow(st);
  }
  const onError = (fn) => listeners.push(fn);

  // Demande au navigateur de ne pas effacer les données (Safari les efface sinon après 7 jours sans visite)
  async function persist() {
    try {
      if (!navigator.storage || !navigator.storage.persist) { status.persisted = null; return null; }
      status.persisted = (await navigator.storage.persisted()) || (await navigator.storage.persist());
    } catch (e) { status.persisted = null; }
    return status.persisted;
  }

  /* ---------- Sauvegarde complète (fichier) ---------- */
  const FORMAT = 'arbor-backup';
  function backup(state) {
    const data = JSON.parse(JSON.stringify(state));
    delete data.settings.apiKey; delete data.settings.model; // aucune clé dans une sauvegarde
    delete data.firstRun;
    return { format: FORMAT, version: 1, exportedAt: new Date().toISOString(), data };
  }
  // Lit un fichier : sauvegarde complète, ancien export { subjects, xp }, ou un seul sujet
  function readFile(obj) {
    if (obj && obj.format === FORMAT && obj.data) {
      const data = parse(JSON.stringify(obj.data));
      return data ? { kind: 'full', data, subjects: data.subjects, exportedAt: obj.exportedAt } : null;
    }
    const list = obj && Array.isArray(obj.subjects) ? obj.subjects : obj && obj.root ? [obj] : [];
    if (!list.length || list.some((x) => !x || !x.root)) return null;
    return { kind: 'subjects', subjects: list, xp: typeof obj.xp === 'number' ? obj.xp : null };
  }
  // Sujets d'un fichier, nettoyés ; on garde les identifiants pour reconnaître un sujet déjà présent
  function importSubject(s) {
    const ns = makeSubject(s.title || 'Sujet importé', { color: s.color, icon: s.icon, emoji: s.emoji, root: normalize(s.root, true) });
    if (ID.test(String(s.id || ''))) ns.id = s.id;
    ns.updatedAt = +s.updatedAt || Date.now(); ns.createdAt = +s.createdAt || Date.now();
    ['program', 'examDate'].forEach((k) => { if (s[k]) ns[k] = s[k]; });
    // décisions de l'étudiant sur les liens du graphe (validé / rejeté)
    if (s.graph && s.graph.decisions && typeof s.graph.decisions === 'object') {
      const decisions = {};
      Object.entries(s.graph.decisions).forEach(([k, v]) => { if (/^[a-z0-9]{6,24}>[a-z0-9]{6,24}$/.test(k) && v && ['valide', 'rejete'].includes(v.status)) decisions[k] = { status: v.status, at: +v.at || Date.now(), by: 'utilisateur' }; });
      ns.graph = { v: 1, decisions };
    }
    return ns;
  }
  // Ajoute sans doublon : un sujet déjà présent n'est remplacé que si le fichier est plus récent
  function merge(state, subjects) {
    let added = 0, updated = 0, kept = 0;
    subjects.forEach((raw) => {
      const ns = importSubject(raw);
      const i = state.subjects.findIndex((x) => x.id === ns.id);
      if (i < 0) { state.subjects.push(ns); added++; }
      else if (ns.updatedAt > (state.subjects[i].updatedAt || 0)) { state.subjects[i] = ns; updated++; }
      else kept++;
    });
    return { added, updated, kept };
  }
  // Remplace tout l'état par une sauvegarde complète (en gardant la clé et les réglages de cet appareil)
  function replaceAll(state, data) {
    const keep = { theme: state.settings.theme, localAI: state.settings.localAI, localModel: state.settings.localModel };
    Object.keys(state).forEach((k) => delete state[k]);
    Object.assign(state, data);
    state.settings = { ...data.settings, ...keep };
  }
  const rescued = () => get(RESCUE);
  const dropRescue = () => { try { localStorage.removeItem(RESCUE); } catch (e) { /* rien */ } };

  /* Outils d'arbre */
  function walk(node, fn, depth = 0, parent = null) {
    fn(node, depth, parent);
    node.children.forEach((c) => walk(c, fn, depth + 1, node));
  }
  function find(root, id) {
    let res = null;
    walk(root, (n, d, p) => { if (n.id === id) res = { node: n, parent: p, depth: d }; });
    return res;
  }
  function pathTo(root, id) {
    if (root.id === id) return [root];
    for (const c of root.children) {
      const p = pathTo(c, id);
      if (p) return [root, ...p];
    }
    return null;
  }
  function stats(root) {
    let total = 0, done = 0, doing = 0;
    walk(root, (n, d) => {
      if (d === 0 && root.children.length) return; // la racine ne compte pas si elle a des enfants
      total++;
      if (n.status === 'done') done++;
      if (n.status === 'doing') doing++;
    });
    return { total, done, doing, pct: total ? Math.round((done / total) * 100) : 0 };
  }
  function isDescendant(node, id) {
    let found = false;
    walk(node, (n) => { if (n.id === id) found = true; });
    return found;
  }

  window.Store = { cleanTitle, PALETTE, ICONS, uid, makeNode, makeSubject, normalize, load, save, flush, onError, persist, status, backup, readFile, merge, replaceAll, rescued, dropRescue, walk, find, pathTo, stats, isDescendant };
})();
