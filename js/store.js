/* Arbor — données et persistance (localStorage) */
(function () {
  const KEY = 'arbor:v1';

  const PALETTE = ['#7c5cff', '#ff5c8a', '#ffb020', '#22c55e', '#06b6d4', '#f97316', '#e879f9', '#3b82f6'];
  const EMOJIS = ['🧠', '📚', '🧪', '🌍', '⚙️', '🎨', '🧬', '📐', '💡', '🏛️', '🎵', '💻', '⚖️', '🩺', '📈', '🪐'];

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  function makeNode(title = 'Nouvelle partie', extra = {}) {
    return {
      id: uid(),
      title,
      notes: '',
      keyPoints: [],
      status: 'todo', // todo | doing | done
      collapsed: false,
      children: [],
      ...extra,
    };
  }

  function makeSubject(title = 'Nouveau sujet', extra = {}) {
    const color = extra.color || PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const emoji = extra.emoji || EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const root = extra.root || makeNode(title);
    root.title = title;
    return { id: uid(), title, color, emoji, createdAt: Date.now(), updatedAt: Date.now(), root };
  }

  /* Normalise un arbre venant d'un import (PDF, IA, JSON) */
  function normalize(node) {
    const n = makeNode(String(node.title || 'Sans titre').slice(0, 160), {
      notes: String(node.notes || ''),
      keyPoints: Array.isArray(node.keyPoints) ? node.keyPoints.map(String).filter(Boolean) : [],
      status: ['todo', 'doing', 'done'].includes(node.status) ? node.status : 'todo',
    });
    n.children = Array.isArray(node.children) ? node.children.map(normalize) : [];
    return n;
  }

  function demoSubject() {
    const s = makeSubject('Découvrir Arbor', { emoji: '🌱', color: '#7c5cff' });
    s.root.notes = "Bienvenue ! Un **sujet** est un arbre : chaque partie peut contenir des **sous-parties**.\n\n- Clique sur une partie dans l'arbre pour l'ouvrir\n- Ajoute des notes, des points clés, change son statut\n- Glisse-dépose une partie sur une autre pour la ranger dedans\n- Lance le mode **Révision** pour t'entraîner en cartes";
    const a = makeNode('1. Découper le sujet', {
      notes: "Commence large, puis découpe jusqu'à obtenir des morceaux **digestes** (une idée = une feuille).",
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
      notes: "Le bouton **📄 Importer un PDF** analyse le document (titres, définitions, points importants) et construit un cours structuré. Avec une clé API Claude (⚙️ Réglages), l'analyse est encore plus fine.",
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
          data.settings = { theme: 'dark', apiKey: '', model: 'claude-opus-5-5', ...(data.settings || {}) };
          data.xp = data.xp || 0;
          return data;
        }
      }
    } catch (e) { console.warn('Lecture impossible', e); }
    return { subjects: [demoSubject()], settings: { theme: 'dark', apiKey: '', model: 'claude-opus-5-5' }, xp: 0 };
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

  window.Store = { PALETTE, EMOJIS, uid, makeNode, makeSubject, normalize, load, save, walk, find, pathTo, stats, isDescendant };
})();
