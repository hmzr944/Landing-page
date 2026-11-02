/* Arbor : données et persistance (localStorage) */
(function () {
  const KEY = 'arbor:v1';

  // Couleurs de sujet : toutes lisibles avec du texte blanc (contraste ≥ 4.5:1)
  const PALETTE = ['#3451D1', '#D93A40', '#C2550A', '#0B7F75', '#0369A1', '#9333B8', '#C2255C', '#5B7A1E'];
  // Icônes Phosphor proposées pour un sujet
  const ICONS = ['book-open', 'brain', 'flask', 'atom', 'globe-hemisphere-west', 'bank', 'scales', 'heartbeat',
    'calculator', 'chart-line-up', 'code', 'translate', 'music-notes', 'palette', 'planet', 'leaf'];
  const OLD_COLORS = { '#7c5cff': '#3451D1', '#ff5c8a': '#C2255C', '#ffb020': '#C2550A', '#22c55e': '#0B7F75', '#06b6d4': '#0369A1', '#f97316': '#C2550A', '#e879f9': '#9333B8', '#3b82f6': '#3451D1' };
  const OLD_EMOJIS = { '🧠': 'brain', '📚': 'book-open', '🧪': 'flask', '🌍': 'globe-hemisphere-west', '⚙️': 'code', '🎨': 'palette', '🧬': 'heartbeat', '📐': 'calculator', '💡': 'brain', '🏛️': 'bank', '🎵': 'music-notes', '💻': 'code', '⚖️': 'scales', '🩺': 'heartbeat', '📈': 'chart-line-up', '🪐': 'planet', '🌱': 'leaf' };

  const DEFAULT_SETTINGS = { theme: 'auto', apiKey: '', model: 'claude-opus-5-5', mascot: true, dailyGoal: 15, newPerDay: 10, focusMin: 25, breakMin: 5 };
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  function makeNode(title = 'Nouvelle partie', extra = {}) {
    return {
      id: uid(),
      title,
      notes: '',
      explain: '',
      keyPoints: [],
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
  function normalize(node) {
    const n = makeNode(String(node.title || 'Sans titre').slice(0, 160), {
      notes: String(node.notes || ''),
      explain: String(node.explain || ''),
      srs: node.srs && typeof node.srs.s === 'number' ? node.srs : null,
      keyPoints: Array.isArray(node.keyPoints) ? node.keyPoints.map(String).filter(Boolean) : [],
      status: ['todo', 'doing', 'done'].includes(node.status) ? node.status : 'todo',
    });
    n.children = Array.isArray(node.children) ? node.children.map(normalize) : [];
    return n;
  }

  function demoSubject() {
    const s = makeSubject('Découvrir Arbor', { icon: 'leaf', color: '#3451D1' });
    s.root.notes = "Bienvenue ! Un **sujet** est un arbre : chaque partie peut contenir des **sous-parties**.\n\n- Clique sur une partie dans l’arbre pour l’ouvrir\n- Ajoute des notes, des points clés, change son statut\n- Glisse-dépose une partie sur une autre pour la ranger dedans\n- Lance le mode **Révision** pour t’entraîner en cartes";
    const a = makeNode('1. Découper le sujet', {
      notes: "Commence large, puis découpe jusqu’à obtenir des morceaux **digestes** (une idée = une feuille).",
      keyPoints: ['Une feuille = une seule idée', 'Pas plus de 5 à 7 enfants par partie'],
      status: 'done',
    });
    a.children.push(
      makeNode('Les grandes parties', { keyPoints: ['Les chapitres du cours'], status: 'done' }),
      makeNode('Les sous-catégories', { keyPoints: ['Les notions à l’intérieur de chaque chapitre'], status: 'doing' })
    );
    const b = makeNode('2. Prendre des notes', {
      notes: "Les notes acceptent un **markdown** simple :\n\n# Titre\n- liste\n**gras**, *italique*, ==surligné==, `code`",
      keyPoints: ['Reformule avec tes mots', 'Surligne avec ==texte=='],
      status: 'doing',
    });
    const c = makeNode('3. Importer un PDF', {
      notes: "Le bouton **Importer un PDF** analyse le document (titres, définitions, points importants) et construit un cours structuré. Avec une clé API Claude (Réglages), l’analyse est encore plus fine.",
      keyPoints: ['Les titres deviennent des parties', 'Les définitions deviennent des points clés'],
    });
    const d = makeNode('4. Réviser', {
      notes: 'Le mode révision transforme chaque partie en carte. Retourne-la, puis dis si tu la maîtrises : tu gagnes de l’XP !',
      keyPoints: ['Je maîtrise → statut « Maîtrisé » + XP', 'À revoir → statut « En cours »'],
    });
    s.root.children.push(a, b, c, d);
    return s;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.subjects)) {
          data.settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
          data.stats = data.stats || { days: {}, calib: {} };
          data.subjects.forEach((s) => {
            if (!ICONS.includes(s.icon)) s.icon = OLD_EMOJIS[s.emoji] || 'book-open';
            s.color = OLD_COLORS[s.color] || s.color;
            delete s.emoji;
            // Anciennes parties marquées « maîtrisées » : on leur donne une mémoire de départ
            walk(s.root, (n) => {
              if (n.explain === undefined) n.explain = '';
              if (n.srs === undefined) n.srs = null;
              if (!n.srs && n.status === 'done') {
                const now = Date.now();
                n.srs = { s: 7, d: 5, last: now - 2 * 86400000, due: now + (2 + Math.random() * 4) * 86400000, reps: 1, lapses: 0 };
              }
            });
          });
          data.xp = data.xp || 0;
          return data;
        }
      }
    } catch (e) { console.warn('Lecture impossible', e); }
    return { subjects: [demoSubject()], settings: { ...DEFAULT_SETTINGS }, stats: { days: {}, calib: {} }, xp: 0, firstRun: true };
  }

  let saveTimer = null;
  function save(state) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); }
      catch (e) { console.warn('Sauvegarde impossible', e); }
    }, 150);
  }

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

  window.Store = { PALETTE, ICONS, uid, makeNode, makeSubject, normalize, load, save, walk, find, pathTo, stats, isDescendant };
})();
