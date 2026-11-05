/* Analyse pédagogique d'un cours, sans IA et sans réseau.
   À partir de l'arbre déjà extrait du PDF (chapitres → notions), on calcule :
   - les termes clés de chaque notion (sigles, mots du titre, termes en gras ou surlignés) ;
   - les relations entre notions : B s'appuie sur A quand le texte de B emploie les termes de A
     (A venant avant dans le cours = prérequis ; sinon simple lien) ;
   - une difficulté estimée (texte, densité de termes techniques, nombre de prérequis, et oublis réels) ;
   - des objectifs d'apprentissage par chapitre, formulés à partir des titres ;
   - un thème visuel par chapitre (réseau, sécurité, données…) pour la carte d'exploration.
   Tout est déterministe : la même entrée donne la même carte, et chaque lien peut être justifié
   par les mots qui l'ont créé (« Pourquoi ce lien ? »). */
(function () {
  const STOP = new Set(('les des une dans pour avec sans sont cette ces leur leurs elle elles ils qui que quoi dont mais donc ainsi plus moins très tout tous toute toutes autre autres même entre aussi peut fait être avoir comme lors chez sous vers après avant depuis pendant selon notre votre alors cela celui celle ceux deux trois quatre premier première exemple partie chapitre notion notions introduction conclusion généralités définition définitions principe principes type types mise place cours module rappel rappels bases base niveau niveaux simple avancé '
    + 'comprendre installer configurer découvrir maîtriser connaître utiliser savoir gérer mettre prendre main faire réaliser créer appliquer vérifier identifier analyser étudier apprendre expliquer décrire sécuriser surveiller résoudre diagnostiquer documenter restaurer sauvegarder simple').split(' ').map((w) => w.normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
  const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const stem = (w) => { const n = norm(w).replace(/[^a-z0-9]/g, ''); return n.length > 5 ? n.slice(0, Math.max(5, n.length - 2)) : n; };
  const words = (t) => String(t || '').split(/[^\p{L}\p{N}-]+/u).map((w) => w.replace(/^-+|-+$/g, '')).filter(Boolean);
  const plain = (t) => String(t || '').replace(/==|\*\*|__|`/g, '');

  /* Termes clés d'une notion */
  function terms(n) {
    const out = new Map(); // stem -> forme lisible
    const add = (w, weight = 1) => { const k = stem(w); if (k.length < (/^[A-Z0-9]{2,}$/.test(w) ? 2 : 3) || STOP.has(norm(w))) return; const cur = out.get(k); out.set(k, { w: cur ? cur.w : w, weight: (cur ? cur.weight : 0) + weight }); };
    words(n.title).forEach((w) => { if (w.length >= 4 || /^[A-Z0-9]{2,}$/.test(w)) add(w, 3); });
    const txt = `${n.notes || ''}\n${(n.keyPoints || []).join('\n')}`;
    // Sigles (DNS, DHCP, VLAN) : gardés s'ils figurent dans le titre ou les points clés, ou reviennent au moins 3 fois.
    // Les textes encyclopédiques en contiennent beaucoup d'incidents (RAM, GNU…) qui créeraient de faux liens.
    const acr = {}; (txt.match(/\b[A-Z][A-Z0-9]{1,7}\b/g) || []).forEach((w) => { acr[w] = (acr[w] || 0) + 1; });
    const strong = `${n.title} ${(n.keyPoints || []).join(' ')}`;
    Object.entries(acr).forEach(([w, c]) => { if (/^(WARNING|CRITICAL|UNKNOWN|OK|NB|HTML|HTTP|URL|PDF|FAQ|HOWTO|MIT|GNU|README)$/.test(w)) return; if (new RegExp(`\\b${w}\\b`).test(strong) || c >= 3) add(w, 2); });
    [...plainKp(n).matchAll(/\*\*([^*]{2,40})\*\*|==([^=]{2,40})==/g)].forEach((m) => words(m[1] || m[2]).forEach((w) => { if (w.length >= 4) add(w, 2); }));
    return [...out.entries()].sort((a, b) => b[1].weight - a[1].weight).slice(0, 8).map(([k, v]) => ({ k, w: v.w }));
  }

  const plainKp = (n) => `${n.notes || ''}\n${(n.keyPoints || []).join('\n')}`;
  const leaves = (node) => { const out = []; const rec = (n) => { if (!n.children.length) out.push(n); else n.children.forEach(rec); }; node.children.forEach(rec); return out; };

  /* Thèmes visuels : un environnement réutilisable par grand domaine (icône + teinte) */
  const THEMES = [
    { k: 'network', re: /r[ée]seau|ip\b|tcp|routage|routeur|switch|vlan|dns|dhcp|ethernet|wifi|adressage|protocole|osi/i, icon: 'network', hue: 205, label: 'Réseau' },
    { k: 'security', re: /s[ée]curit|pare-feu|firewall|chiffr|crypt|attaque|menace|vpn|authentif|droit|permission|acc[eè]s/i, icon: 'shield-check', hue: 350, label: 'Sécurité' },
    { k: 'system', re: /syst[eè]me|windows|linux|debian|serveur|active directory|ad ds|gpo|script|powershell|bash|service|virtualis|hyperviseur|vm\b|conteneur|docker/i, icon: 'hard-drives', hue: 255, label: 'Systèmes' },
    { k: 'data', re: /donn[ée]es|base de|sql|sauvegarde|stockage|fichier|raid|restaur/i, icon: 'database', hue: 170, label: 'Données' },
    { k: 'support', re: /incident|support|ticket|assistance|utilisateur|diagnostic|d[ée]pann|supervision|surveill|documen/i, icon: 'lifebuoy', hue: 35, label: 'Support' },
    { k: 'bio', re: /cellul|g[èe]n|adn|mitose|m[ée]iose|prot[ée]ine|organ|bio|photosynth|enzym/i, icon: 'dna', hue: 140, label: 'Vivant' },
    { k: 'math', re: /fonction|[ée]quation|d[ée]riv|int[ée]gral|matrice|probabilit|statist|alg[eè]bre|g[ée]om[ée]tr|calcul/i, icon: 'function', hue: 230, label: 'Maths' },
    { k: 'law', re: /droit|contrat|loi|juridi|tribunal|responsabilit|code civil|constitution/i, icon: 'scales', hue: 25, label: 'Droit' },
    { k: 'history', re: /histoire|guerre|r[ée]volution|si[eè]cle|empire|r[ée]publique|antiquit/i, icon: 'scroll', hue: 40, label: 'Histoire' },
    { k: 'eco', re: /[ée]conom|march[ée]|entreprise|gestion|finance|comptab|marketing|management/i, icon: 'chart-line-up', hue: 150, label: 'Économie' },
    { k: 'lang', re: /langue|grammaire|conjugaison|vocabulaire|anglais|espagnol|litt[ée]rat|po[ée]sie/i, icon: 'translate', hue: 290, label: 'Langues' },
  ];
  function themeOf(chapter) {
    const txt = `${chapter.title} ${leaves(chapter).map((n) => n.title).join(' ')}`;
    let best = null, score = 0;
    THEMES.forEach((t) => { const m = (txt.match(new RegExp(t.re.source, 'gi')) || []).length + (t.re.test(chapter.title) ? 3 : 0); if (m > score) { score = m; best = t; } });
    return best || { k: 'generic', icon: 'map-pin', hue: 220, label: 'Notions' };
  }

  /* Objectifs d'apprentissage : formulés à partir du titre de chaque notion (verbe d'action si présent) */
  const VERBS = { installer: 'installer', configurer: 'configurer', 'mettre en place': 'mettre en place', sécuriser: 'sécuriser', diagnostiquer: 'diagnostiquer', résoudre: 'résoudre', créer: 'créer', gérer: 'gérer', administrer: 'administrer', déployer: 'déployer', calculer: 'calculer', analyser: 'analyser', appliquer: 'appliquer', vérifier: 'vérifier', restaurer: 'restaurer', sauvegarder: 'sauvegarder', superviser: 'superviser', documenter: 'documenter', comparer: 'comparer', distinguer: 'distinguer', faire: 'faire', surveiller: 'surveiller', utiliser: 'utiliser', rédiger: 'rédiger', planifier: 'planifier', organiser: 'organiser', tester: 'tester', mesurer: 'mesurer', protéger: 'protéger', identifier: 'identifier' };
  function objective(title) {
    const t = plain(title).trim();
    const low = t.charAt(0).toLowerCase() + t.slice(1);
    const v = Object.keys(VERBS).find((x) => norm(low).startsWith(norm(x)));
    if (v) return `Savoir ${low}`;
    if (/^(comprendre|connaître|découvrir|maîtriser|prendre en main)\b/i.test(t)) return `${t.replace(/^(\S+)/, (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase())}`;
    return `Expliquer ${/^(les?|la|l['’]|des|un|une)\b/i.test(low) ? low : `ce qu’est « ${t} »`}`;
  }

  /* Analyse complète d'un sujet (mise en cache tant que le sujet ne change pas) */
  const cache = new WeakMap();
  function analyze(s) {
    const c = cache.get(s);
    const decisions = (s.graph && s.graph.decisions) || {};
    const sig = `${s.updatedAt}:${Object.keys(decisions).length}`;
    if (c && c.at === sig) return c.res;
    const chapters = s.root.children.filter((ch) => ch.children.length);
    const order = []; // toutes les notions, dans l'ordre du cours
    const zoneOf = new Map();
    chapters.forEach((ch, zi) => leaves(ch).forEach((n) => { order.push(n); zoneOf.set(n.id, zi); }));
    s.root.children.filter((ch) => !ch.children.length).forEach((n) => { order.push(n); zoneOf.set(n.id, -1); });
    const idx = new Map(order.map((n, i) => [n.id, i]));
    const T = new Map(order.map((n) => [n.id, terms(n)]));
    const textStems = new Map(order.map((n) => [n.id, new Set(words(plain(`${n.title} ${n.notes || ''} ${(n.keyPoints || []).join(' ')}`)).map(stem))]));

    // Relations : la notion B utilise des termes propres à A (termes pondérés par leur rareté dans le cours)
    const df = new Map();
    order.forEach((n) => T.get(n.id).forEach(({ k }) => { let m = 0; order.forEach((o) => { if (textStems.get(o.id).has(k)) m++; }); df.set(k, m); }));
    const rel = new Map(order.map((n) => [n.id, { pre: [], next: [], links: [] }]));
    order.forEach((b) => {
      const cands = [];
      order.forEach((a) => {
        if (a === b) return;
        const shared = T.get(a.id).filter(({ k }) => textStems.get(b.id).has(k) && df.get(k) <= Math.max(3, order.length * 0.25));
        if (!shared.length) return;
        const w = shared.reduce((acc, { k }) => acc + 1 / df.get(k), 0);
        if (w >= 0.34) cands.push({ a, w, why: shared.slice(0, 3).map((x) => x.w) });
      });
      cands.sort((x, y) => y.w - x.w).slice(0, 3).forEach(({ a, w, why }) => {
        const before = idx.get(a.id) < idx.get(b.id);
        const r = rel.get(b.id);
        // identifiant stable (« A>B ») ; l'étudiant peut valider ou rejeter : un rejet n'est jamais recalculé
        const rid = `${a.id}>${b.id}`;
        const dec = decisions[rid] || decisions[`${b.id}>${a.id}`];
        if (dec && dec.status === 'rejete') return;
        const meta = { rid, why, w, provenance: 'regle', status: dec ? dec.status : 'propose' };
        if (before) { r.pre.push({ id: a.id, ...meta }); rel.get(a.id).next.push({ id: b.id, ...meta }); }
        else if (!r.links.some((x) => x.id === a.id)) { r.links.push({ id: a.id, ...meta }); }
      });
    });

    // Difficulté 1 à 3 : longueur, densité de sigles et termes, prérequis, oublis observés
    const diff = new Map();
    order.forEach((n) => {
      const txt = plain(n.notes || '');
      const len = words(txt).length;
      const acr = (txt.match(/\b[A-Z][A-Z0-9]{1,7}\b/g) || []).length;
      const longW = words(txt).filter((w) => w.length >= 11).length / Math.max(1, len);
      let sc = (len > 220 ? 1.2 : len > 90 ? 0.6 : 0) + Math.min(1.2, acr / 6) + Math.min(1, longW * 12) + Math.min(1, rel.get(n.id).pre.length * 0.35);
      if (n.srs) sc += n.srs.d >= 7 ? 0.5 : 0;
      diff.set(n.id, sc);
    });
    // Difficulté relative : on classe les notions du cours entre elles (un tiers par niveau),
    // puis les oublis réels font monter d'un cran (le vécu de l'étudiant compte plus que le texte)
    // Sans texte (cours pas encore rédigé), la difficulté est inconnue : 0, et elle n'est pas affichée
    const known = order.filter((n) => words(plain(n.notes || '')).length >= 15);
    order.forEach((n) => { if (!known.includes(n)) diff.set(n.id, n.srs && n.srs.lapses >= 2 ? 3 : 0); });
    const ranked = known.slice().sort((a, b) => diff.get(a.id) - diff.get(b.id));
    const spread = ranked.length ? diff.get(ranked[ranked.length - 1].id) - diff.get(ranked[0].id) : 0;
    ranked.forEach((n, i) => { const t = ranked.length > 2 && spread > 0.3 ? Math.floor((i / ranked.length) * 3) + 1 : 2; diff.set(n.id, Math.min(3, t + (n.srs && n.srs.lapses >= 2 ? 1 : 0))); });

    const zones = chapters.map((ch, zi) => {
      const ns = leaves(ch);
      const kn = ns.filter((n) => diff.get(n.id) > 0);
      const dAvg = kn.length ? kn.reduce((a, n) => a + diff.get(n.id), 0) / kn.length : 0;
      const objectives = [];
      // objectifs écrits dans le document (« ce que tu dois savoir faire ») d'abord ; sinon formulés depuis les titres
      (ch.objectives || []).forEach((o) => { const t = o.charAt(0).toUpperCase() + o.slice(1); if (!objectives.includes(t)) objectives.push(t); });
      if (!objectives.length) ns.forEach((n) => { const o = objective(n.title); if (!objectives.includes(o)) objectives.push(o); });
      const ext = new Set(); ns.forEach((n) => rel.get(n.id).pre.forEach((p) => { const z = zoneOf.get(p.id); if (z !== zi && z >= 0) ext.add(z); }));
      return { i: zi, node: ch, notions: ns, theme: themeOf(ch), difficulty: !dAvg ? 0 : dAvg >= 2.3 ? 3 : dAvg >= 1.5 ? 2 : 1, objectives: objectives.slice(0, 4), needs: [...ext].sort((a, b) => a - b) };
    });
    const res = { zones, rel, diff, terms: T, byId: new Map(order.map((n) => [n.id, n])), zoneOf, order };
    cache.set(s, { at: sig, res });
    return res;
  }

  const DIFF = ['', 'Accessible', 'Intermédiaire', 'Exigeant'];
  window.Insight = { analyze, terms, objective, themeOf, THEMES, DIFF, leaves };
})();
