/* Analyse locale d'un PDF : repère les titres (taille de police, gras, numérotation),
   regroupe le texte par partie et extrait les phrases importantes. Tout se fait dans le navigateur. */
(function () {
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  const NUM_RE = /^((\d{1,2}(\.\d{1,2}){0,3})|[IVXLC]{1,6}|[A-H])[.)\-–]?\s+\S/;
  const KEYWORD_RE = /(?<!\p{L})(chapitre|partie|section|leçon|module|unité|annexe|introduction|conclusion|chapter|part)(?!\p{L})/iu;
  // « est l'ensemble » : après « l' » vient une lettre, d'où une alternative à part (sans le contrôle de fin de mot)
  const DEF_RE = /(?<!\p{L})(?:(est (un|une|le|la|ce qui|défini)|sont (des|les)|désigne|se définit|on appelle|on nomme|correspond à|signifie|consiste à|représente|permet de|is an?|refers to|means)(?!\p{L})|est l['’](?=\p{L}))/iu;
  const IMPORTANT_RE = /(?<!\p{L})(important|essentiel|fondamental|à retenir|retenir|attention|clé|principe|règle|loi|théorème|propriété|définition|formule|toujours|jamais|obligatoire|remarque|notamment|conclusion|donc|ainsi|en résumé|key|must)(?!\p{L})/iu;

  /* Lecture d'une page :
     - les polices ne sont chargées qu'après getOperatorList : sans ça, impossible de savoir ce qui est en gras ;
     - les morceaux de texte d'une même ligne sont regroupés en segments ;
     - une page sur deux colonnes est relue colonne par colonne ;
     - chaque ligne garde sa position (marges) et l'écart avec la précédente (paragraphes). */
  async function readLines(pdf, onProgress) {
    const lines = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const vp = page.getViewport({ scale: 1 });
      try { await page.getOperatorList(); } catch (e) { /* polices indisponibles : on continue sans le gras */ }
      const content = await page.getTextContent();
      const items = [];
      for (const it of content.items) {
        if (!it.str || !it.str.trim()) continue;
        const size = Math.round(Math.hypot(it.transform[2], it.transform[3]) * 10) / 10 || it.height || 10;
        let fontName = '';
        try { fontName = (page.commonObjs.has(it.fontName) && page.commonObjs.get(it.fontName).name) || ''; } catch (e) { /* ignore */ }
        const fam = (content.styles[it.fontName] && content.styles[it.fontName].fontFamily) || '';
        const f = fontName + ' ' + fam;
        items.push({ x: it.transform[4], y: it.transform[5], w: it.width || it.str.length * size * 0.5, str: it.str, size,
          bold: /bold|black|heavy|semibold|demi/i.test(f), italic: /italic|oblique|-it\b|bolditalic|boldi\b/i.test(f), mono: /mono|courier|cmtt|typewriter|consol|menlo|inconsolata|sfmono|code/i.test(f) });
      }
      // Segments : même ligne et morceaux contigus
      items.sort((a, b) => b.y - a.y || a.x - b.x);
      const segs = [];
      for (const it of items) {
        const sg = segs.find((g) => Math.abs(g.y - it.y) <= Math.max(2, it.size * 0.35) && it.x - g.x1 <= Math.max(it.size * 1.0, 6) && it.x >= g.x0 - 2);
        if (sg) { sg.parts.push(it); sg.x1 = Math.max(sg.x1, it.x + it.w); }
        else segs.push({ y: it.y, x0: it.x, x1: it.x + it.w, parts: [it] });
      }
      // Deux colonnes : dans une zone où des segments commencent après le milieu de la page,
      // on lit d'abord la colonne de gauche, puis celle de droite
      const W = vp.width, mid = W / 2;
      segs.forEach((g) => { g.kind = g.x0 >= mid - W * 0.04 ? 'right' : g.x1 <= mid + W * 0.04 ? 'left' : 'full'; });
      segs.sort((a, b) => b.y - a.y);
      const ordered = [];
      const segText = (g) => g.parts.map((x) => x.str).join(' ').trim();
      const isBullet = (g) => /^\s*[•●▪◦‣\-–*✓➢►○□☐]/.test(segText(g));
      const median = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };
      for (let i = 0; i < segs.length;) {
        if (segs[i].kind === 'full') { ordered.push(segs[i]); i++; continue; }
        let j = i; while (j < segs.length && segs[j].kind !== 'full') j++;
        const run = segs.slice(i, j);
        i = j;
        const L = run.filter((g) => g.kind === 'left'), R = run.filter((g) => g.kind === 'right');
        if (!L.length || !R.length) { ordered.push(...run); continue; }
        const mate = (r) => L.find((l) => Math.abs(l.y - r.y) <= 2.5);
        const paired = R.filter(mate);
        // Tableau à deux colonnes : cellules courtes alignées ligne à ligne -> une ligne « gauche : droite »
        const table = paired.length >= 3 && paired.length >= R.length * 0.8 && !L.some(isBullet)
          && median(L.map((g) => segText(g).length)) < 38 && median(R.map((g) => segText(g).length)) < 48;
        if (table) {
          const used = new Set();
          for (const l of L) {
            const r = R.find((x) => !used.has(x) && Math.abs(x.y - l.y) <= 2.5);
            if (r) { used.add(r); if (!/^\s*\.*\s*\d{1,4}\s*$/.test(segText(r))) { l.parts.push(...r.parts.map((x) => ({ ...x, cell: true }))); l.row = true; } }
            ordered.push(l);
          }
          ordered.push(...R.filter((x) => !used.has(x)));
          continue;
        }
        // Colonne latérale (encadrés) : on découpe en blocs au début de chaque titre de gauche,
        // chaque bloc = son texte de gauche puis ce qui est à droite à la même hauteur
        const starts = L.filter((g, k) => k === 0 || (g.parts.every((x) => x.bold) && !isBullet(g)));
        const blocks = starts.map((g, k) => ({ top: g.y + 3, bottom: k + 1 < starts.length ? starts[k + 1].y + 3 : -Infinity, segs: [] }));
        for (const g of run) {
          const b = blocks.find((x) => g.y <= x.top && g.y > x.bottom) || blocks[blocks.length - 1];
          // badge à droite d'un titre (« PRIORITÉ MAXIMALE », « ÉTAPE 2 ») : décoration, on l'ignore
          if (g.kind === 'right' && starts.some((st) => Math.abs(st.y - g.y) <= 2.5) && segText(g) === segText(g).toUpperCase() && segText(g).length < 30) continue;
          b.segs.push(g);
        }
        for (const b of blocks) ordered.push(...b.segs.filter((g) => g.kind !== 'right'), ...b.segs.filter((g) => g.kind === 'right'));
      }
      let prev = null;
      for (const g of ordered) {
        const parts = g.row ? g.parts : g.parts.sort((a, b) => a.x - b.x);
        const text = fixAccents((g.row ? parts.filter((x) => !x.cell).map((x) => x.str).join(' ') + ' : ' + parts.filter((x) => x.cell).map((x) => x.str).join(' ') : parts.map((x) => x.str).join(' ')).replace(/\s+/g, ' ').replace(/ ([,.;:)])/g, '$1').trim());
        if (!text) continue;
        const monoChars = parts.filter((x) => x.mono).reduce((a, x) => a + x.str.length, 0);
        const chars = parts.reduce((a, x) => a + x.str.length, 0) || 1;
        const size = Math.max(...parts.map((x) => x.size));
        const boldChars = parts.filter((x) => x.bold).reduce((a, x) => a + x.str.length, 0);
        const italChars = parts.filter((x) => x.italic).reduce((a, x) => a + x.str.length, 0);
        const lead = parts[0].bold && parts.length > 1 && !parts.every((x) => x.bold) ? parts.filter((x, k) => k === 0 || (x.bold && parts.slice(0, k).every((y) => y.bold))).map((x) => x.str).join(' ').trim() : '';
        const gap = prev && prev.page === p ? prev.y - g.y : null;
        // même hauteur que la ligne précédente (cellule de tableau, libellé d'encadré) : on les réunit
        if (prev && prev.page === p && Math.abs(prev.y - g.y) <= 2 && !g.row && !prev.row && prev.text.length < 60) {
          if (prev.bold && !(boldChars / chars > 0.6)) { prev.lead = prev.text; prev.text = `${prev.text} : ${text}`; prev.bold = false; prev.row = true; }
          else if (prev.bold && boldChars / chars > 0.6 && prev.text.length < 40 && text.length < 40) { prev.text = `${prev.text} : ${text}`; prev.row = true; } // en-tête de tableau
          else prev.text = `${prev.text} ${text}`;
          continue;
        }
        const line = { row: !!g.row, text, size, bold: boldChars / chars > 0.6, italic: italChars / chars > 0.6, mono: monoChars / (parts.reduce((a, x) => a + x.str.length, 0) || 1) > 0.6, lead, page: p, y: g.y, x: g.x0, pageH: vp.height, gap, prevSize: prev ? prev.size : size, col: g.kind };
        lines.push(line);
        prev = line;
      }
      onProgress && onProgress(p / pdf.numPages);
    }
    return lines;
  }

  /* Accents séparés de leur lettre (PDF produits par LaTeX avec des polices Type 1 : « r´ eseaux », « re¸ cu ») */
  const ACC = { '´': '\u0301', '`': '\u0300', 'ˆ': '\u0302', '¨': '\u0308', '¸': '\u0327', '˜': '\u0303', '˚': '\u030A' };
  function fixAccents(t) {
    if (!/[´`ˆ¨¸˜˚ı]/.test(t)) return t;
    return t.replace(/([´`ˆ¨])\s+(?=[´`ˆ¨])/g, '').replace(/([´`ˆ¨¸˜˚])\s?(\p{L})/gu, (m, a, l) => (l === 'ı' ? 'i' : l) + ACC[a])
      .replace(/ı(?=[\u0300-\u036f])/g, 'i').normalize('NFC');
  }

  /* En-têtes, pieds de page, numéros de page : position dans la marge, petite taille, ou répétition */
  function cleanLines(lines, numPages) {
    const body = bodySize(lines);
    const freq = new Map(), edgeFreq = new Map();
    const isEdge = (l) => l.y > l.pageH * 0.9 || l.y < l.pageH * 0.08;
    lines.forEach((l) => {
      const k = l.text.replace(/\d+/g, '#');
      freq.set(k, (freq.get(k) || 0) + 1);
      if (isEdge(l)) edgeFreq.set(k, (edgeFreq.get(k) || 0) + 1);
    });
    return lines.filter((l) => {
      if (/^(page\s*)?\d{1,4}(\s*(\/|sur)\s*\d{1,4})?$/i.test(l.text)) return false;
      const edge = l.y > l.pageH * 0.9 || l.y < l.pageH * 0.08;
      const k = l.text.replace(/\d+/g, '#');
      // dans la marge : répété d'une page à l'autre, ou minuscule
      if (edge && ((numPages > 1 && edgeFreq.get(k) > 1) || l.size < body * 0.75)) return false;
      // ailleurs, une ligne répétée n'est retirée que si elle ressemble à un en-tête (numéro de page inclus)
      if (numPages > 2 && freq.get(k) >= Math.max(3, numPages * 0.5) && /\d/.test(l.text) && l.text.length < 90 && (l.y > l.pageH * 0.8 || l.y < l.pageH * 0.15)) return false;
      if (l.size < body * 0.65) return false;
      return true;
    });
  }

  function bodySize(lines) {
    const w = new Map();
    lines.forEach((l) => w.set(l.size, (w.get(l.size) || 0) + l.text.length));
    return [...w.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 10;
  }

  function headingInfo(line, body) {
    const t = line.text;
    if (t.length > 110 || t.length < 2) return null;
    if (/[,;]$/.test(t)) return null;
    if (/^\s*[•●▪◦‣\-–*✓➢►○□☐]/.test(t) || line.row) return null;
    // code, sortie de terminal, adresse ou mesure : ce n'est pas un titre
    if (line.mono || /^;;|^\$ |^#\s|^\d{1,3}(\.\d{1,3}){3}\b|\b\d+(\.\d+)?\s?ms\b|[{}<>=]{2}|::/.test(t)) return null;
    const words = t.split(' ').length;
    const bigger = line.size >= body * 1.15;
    // un titre peut finir par un point (habitude LaTeX : « 1 Adressage. »), pas par deux points
    const numbered = NUM_RE.test(t) && words <= 14 && !/:\s*$/.test(t) && !(/\.\s*$/.test(t) && words > 9);
    const keyword = KEYWORD_RE.test(t.split(' ')[0]) && words <= 12;
    // en capitales, sans point final (« DHCP. » dans une liste n'est pas un titre)
    const allCaps = t.length > 4 && t === t.toUpperCase() && /[A-ZÀ-Ý]{3}/.test(t) && words <= 10 && !/[.;,]$/.test(t);
    if (!(bigger || (line.bold && (numbered || words <= 10)) || (numbered && (line.bold || bigger)) || keyword || allCaps)) return null;
    if (!bigger && !line.bold && !keyword && !allCaps) return null;
    if (/[.!?]$/.test(t) && !numbered && words > 6) return null;
    // profondeur suggérée par la numérotation
    let numDepth = null;
    const m = t.match(/^(\d{1,2}(?:\.\d{1,2}){1,3}[.)]?|\d{1,2}[.)]|\d{1,2}(?=\s+\p{Lu}))\s/u);
    if (m) numDepth = m[1].replace(/[.)]$/, '').split('.').length;
    else if (/^[IVXLC]{1,6}[.)\-–]\s/.test(t)) numDepth = 1;
    else if (/^[A-H][.)]\s/.test(t)) numDepth = 2;
    return { size: line.size, numDepth, keyword: keyword ? 1 : 0 };
  }

  function splitSentences(text) {
    return text
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+(?=[A-ZÀ-ÝÉ«"(])/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function scoreSentence(s, boldSet) {
    let score = 0;
    if (DEF_RE.test(s)) score += 3;
    if (IMPORTANT_RE.test(s)) score += 2;
    if (/^[^:]{3,60}\s:\s?\S/.test(s)) score += 2; // « Terme : explication »
    if (/\d/.test(s)) score += 0.5;
    if (boldSet.some((b) => s.includes(b))) score += 2.5;
    if (s.length < 35) score -= 2;
    // Texte d'accompagnement (« Je vais être franc », « Ce n'est pas une critique ») : ce n'est pas à apprendre
    if (/(?<!\p{L})(je|j['’]|me|m['’]|moi|mon|ma|mes)(?!\p{L})/iu.test(s) && !DEF_RE.test(s)) score -= 4;
    if (/^(ce n['’]est pas|c['’]est probablement|voici|avant de|réponds|tu peux|n['’]h[ée]site)/i.test(s)) score -= 3;
    if (s.length > 260) score -= 2;
    return score;
  }

  /* Blocs à libellé : « Définition. », « Exercice 2. », « Exemple : »… */
  const LABEL_RE = /^(définitions?|théorèmes?|propriétés?|règles?|formules?|lois?|principes?|corollaires?|propositions?|lemmes?|notations?|méthodes?|remarques?|exemples?|attention|exercices?|application|à retenir|important|objectifs?|astuce|conseil)\b\s*(\d{1,2}(\.\d{1,2})?)?\s*[.:)–—-]?\s*/i;
  const KEY_LABELS = /^(définition|théorème|propriété|règle|formule|loi|principe|corollaire|proposition|lemme|notation|à retenir|important)/i;
  const EX_SECTION = /^(exercices?|exercices? d['’]application|exercices? corrigés?|entraînement|travaux dirigés|td|applications?)$/i;
  const TOC_SECTION = /^(sommaire|table des mati[eè]res|plan( du (document|cours))?|contents?)$/i;
  const QUESTION_RE = /^(question|q)\s*\d{1,2}\s*[—–:.)-]\s*/i;
  const OPTION_RE = /^\s*[○◯□☐◻]\s*(.+)$/;
  const ANSWER_RE = /^(bonne réponse|réponse|correction|solution)\s*:\s*/i;
  const BULLET_RE = /^\s*[•●▪◦‣\-–*✓➢►]\s*(.+)$/;
  const SUM_SECTION = /^(à retenir|ce qu['’]il faut retenir|l['’]essentiel|résumé|synthèse|en résumé|bilan|points? clés?)$/i;

  function finalizeNode(node) {
    const blocks = node._blocks || [];
    const paras = blocks.filter((b) => typeof b === 'string');
    const bullets = node._bullets || [];
    const keys = node._keys || [];
    const boldSet = (node._bold || []).filter((b) => b.length > 3 && b.length < 80);
    const sentences = splitSentences(paras.join('\n'));
    const scored = sentences.map((s, i) => ({ s, i, score: scoreSentence(s, boldSet) }));
    // Les définitions et règles écrites comme telles passent avant les phrases repérées par mots-clés
    const room = Math.max(0, 5 - keys.length);
    const top = scored.filter((x) => x.score >= 2.5 && x.s.length >= 35).sort((a, b) => b.score - a.score).slice(0, Math.min(room, 3)).sort((a, b) => a.i - b.i);
    const keyPoints = [...keys];
    top.forEach((x) => keyPoints.push(x.s.length > 220 ? x.s.slice(0, 217) + '…' : x.s));
    const firstList = (blocks.find((b) => b.list) || { list: bullets }).list;
    firstList.slice(0, 6).forEach((b) => { if (keyPoints.length < 7 && !keyPoints.includes(b) && b.length > 12) keyPoints.push(b); });

    const keySet = new Set(top.map((x) => x.s));
    let notes = blocks
      .map((b) => (typeof b === 'string' ? splitSentences(b).map((s) => (keySet.has(s) ? `==${s}==` : s)).join(' ')
        : b.list ? (b.intro ? b.intro + '\n' : '') + b.list.map((x) => `- ${x}`).join('\n') : b.md))
      .join('\n\n');
    if (notes.length > 6000) notes = notes.slice(0, 6000) + '…';

    const head = [node._level ? `**Niveau estimé.** ${node._level}` : '', node._remark ? `**Constat.** ${node._remark}` : ''].filter(Boolean).join('\n\n');
    const skills = node._skills || [];
    if (skills.length) notes = [notes, `**À savoir faire**\n${skills.map((x) => `- ${x}`).join('\n')}`].filter((x) => x && x.trim()).join('\n\n');
    if (head) notes = head + (notes.trim() ? '\n\n' + notes : '');
    node.notes = notes;
    // Une partie qui regroupe des notions : ses points clés sont ses notions, pas des phrases d'accompagnement
    node.keyPoints = node.children.some((c) => c._notion) ? keyPoints.filter((k) => !/^(niveau|mon constat|constat)\b/i.test(k)).slice(0, 0) : keyPoints;
    if (skills.length) node.objectives = skills.slice(0, 8);
    // Savoir-faire et missions : des exercices pratiques, à faire dans son environnement de test
    const practice = [...skills.map((x) => ({ q: `Mets en pratique : ${x.charAt(0).toLowerCase() + x.slice(1)}.`, a: 'Fais-le sans aide dans ton environnement de test, vérifie que ça marche, puis note les étapes.' })),
      ...(node._missions || []).map((m) => ({ q: `Mission : ${m.t.charAt(0).toLowerCase() + m.t.slice(1)}.`, a: `Niveau indiqué dans le document : ${m.st}. Réalise la mission seul, de bout en bout, puis vérifie le résultat.` }))];
    let exs = (node._ex || []).filter((e) => e.q.length > 8);
    // QCM de 3 questions ou plus : une sous-partie par question, pour que chacune ait sa carte de révision
    const quizzes = exs.filter((e) => e.quiz);
    if (quizzes.length >= 3) {
      quizzes.forEach((e) => {
        const t = e.quiz.length > 80 ? e.quiz.slice(0, 77).replace(/\s+\S*$/, '') + '…' : e.quiz;
        const n = mk(cap(t));
        n._ex.push({ q: e.q, a: e.a });
        if (e.a) n._keys.push(e.a);
        node.children.push(n);
      });
      exs = exs.filter((e) => !e.quiz);
    }
    const seen = new Set();
    const uniq = practice.filter((x) => { const k = x.q.replace(/^(Mets en pratique|Mission) : /, '').toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    node.exercises = [...exs.map(({ q, a }) => ({ q, a })), ...uniq.slice(0, 10)];
    const pages = [...(node._pg || [])].sort((a, b) => a - b);
    const firstPara = (blocks.find((b) => typeof b === 'string') || node._quote || '').replace(/\s+/g, ' ');
    if (pages.length) node.src = { pages: pages.slice(0, 12), quote: firstPara.length > 220 ? firstPara.slice(0, 217).replace(/\s+\S*$/, '') + '…' : firstPara };
    delete node._pg; delete node._ip; delete node._quote;
    delete node._skills; delete node._missions; delete node._level; delete node._remark; delete node._notion; delete node._assess;
    delete node._blocks; delete node._bullets; delete node._bold; delete node._keys; delete node._ex;
    node.children.forEach(finalizeNode);
  }

  const mk = (title) => ({ title, children: [], _blocks: [], _bullets: [], _bold: [], _keys: [], _ex: [], _pg: new Set(), _ip: {} });
  const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
  const prominence = (h) => h.size * 10 + (h.bold ? 3 : 0) - (h.italic ? 2 : 0);

  // « BILAN DE NIVEAU ET PARCOURS TSSR » -> « Bilan de niveau et parcours TSSR » (les sigles restent)
  function unshout(t) {
    if (t !== t.toUpperCase() || !/[A-ZÀ-Ý]{3}/.test(t)) return t;
    const out = t.split(' ').map((w) => (/^[A-ZÀ-Ý0-9]{2,6}$/.test(w) && !/[AEIOUYÀÂÉÈÊËÎÏÔÙÛ]/.test(w) ? w : w.toLowerCase())).join(' ');
    return cap(out);
  }

  /* Titre du document : la plus grosse ligne de la 1re page, nettement plus grande que le texte,
     avec les lignes suivantes de même taille (titre sur plusieurs lignes) */
  function docTitleOf(lines, body) {
    const first = lines.filter((l) => l.page === 1 && l.text.length <= 120);
    if (!first.length) return null;
    // Bandeau institutionnel (« Licence professionnelle… », « Université de… ») : jamais le titre si un autre grand texte existe
    const INSTIT = /^(licence|master|bts|but|dut|l[123]\b|m[12]\b|universit|u\.?f\.?r|facult|d[ée]partement|iut|lyc[ée]e|[ée]cole|ann[ée]e|semestre|formation|module|ue\s*\d|e-?mail|web\s*:)/i;
    const bigs = first.filter((l) => l.size >= body * 1.3);
    const pool = bigs.filter((l) => !INSTIT.test(l.text.replace(/^[–—-]\s*/, '')) && !/@|https?:/.test(l.text));
    if (!bigs.length) return null;
    const framed = first.find((l) => /^[–—-]\s*\S.{2,80}\S\s*[–—-]$/.test(l.text) && l.size >= body * 1.15);
    const big = framed || (pool.length ? pool : bigs).reduce((a, b) => (b.size > a.size ? b : a));
    if (big.size < body * (framed ? 1.15 : 1.3)) return null;
    const used = [big];
    for (let i = lines.indexOf(big) + 1; i < lines.length; i++) {
      const l = lines[i];
      if (l.page !== big.page || Math.abs(l.size - big.size) > 0.5 || l.gap == null || l.gap > l.size * 1.8 || used.length >= 3) break;
      used.push(l);
    }
    const text = unshout(used.map((l) => l.text).join(' ')).replace(/^(chapitre|chapter|leçon|cours)\s*\d+\s*[:.—–-]\s*/i, '').replace(/^[–—-]\s*|\s*[–—-]$/g, '').trim();
    return { text, lines: new Set(used) };
  }


  /* ---------- Compréhension du document ----------
     Inspiré des outils open source d'analyse de documents (Docling d'IBM, unstructured) : avant de faire
     des chapitres, on donne un RÔLE à chaque bloc et à chaque section.
     - Listes à libellé : « Tu as découvert : » / « Notions : » → notions (sous-parties) ;
       « Ce que tu ne maîtrises pas encore : » / « Compétences : » / « Objectifs : » → savoir-faire (objectifs + exercices).
     - Sections : contenu (porte des notions), accompagnement (évaluation, avis, recommandation : texte à la
       1re personne, sans notions), plan (étapes), tableau d'état (« mission : non acquis »), questions (QCM).
     Seul le contenu devient des chapitres ; l'accompagnement va dans la vue d'ensemble, le plan ordonne
     les chapitres, les missions deviennent des exercices du bon chapitre, les questions restent à part.
     Un cours classique (sans ces signaux) n'est pas modifié. */
  const NOTION_CORE = "(tu as (découvert|vu|abordé|étudié)|vous avez (découvert|vu|abordé)|notions?( abordées| vues| clés| à connaître| essentielles)?|vocabulaire( à connaître)?|concepts?( clés)?|au programme|points? abordés|ce que (tu vas|vous allez) (voir|découvrir|apprendre)|thèmes? abordés|contenus?)";
  const SKILL_CORE = "(ce que (tu|vous) ne (maîtrises?|maîtrisez|sais|savez|connais|connaissez) pas( encore)?|à (acquérir|maîtriser|travailler|consolider)|compétences( visées| attendues| à acquérir)?|savoir-faire|objectifs?( pédagogiques| d['’]apprentissage)?|(tu dois|vous devez|tu devras|vous devrez) (savoir|être capables?)|être capables? de|capacités( visées)?)";
  // le libellé termine l'introduction de la liste ; ce qui précède est rendu au texte
  const labelCut = (intro, core) => { const m = intro.match(new RegExp(`(^|\\s)${core}\\s*:?\\s*$`, 'iu')); return m ? intro.slice(0, m.index).trim() : null; };
  const META_TITLE = /(évaluation|avis|potentiel|orientation|recommandation|remerciements?|à propos|préambule|avant-propos|mode d['’]emploi|comment utiliser|échelle|grille|critères|bilan|mot de l['’]auteur|note de l['’]auteur)/i;
  const ASSESS_TITLE = /(questions?|qcm|quiz|test de|auto-?évaluation|diagnostic de compréhension|vérifie|évalue tes)/i;
  const PLAN_STEP = /^(étape|phase|semaine|jour|palier|niveau|sprint|séance)\s*\d{1,2}\b/i;
  const STATUS_RE = /^(.{3,90}?)\s*:\s*((non )?acquis|en cours( d['’]acquisition)?|(non )?validée?s?|à revoir|à consolider|ok|ko|partiel(lement)?\b.*|.*\b(non (acquis|validée?)|pas encore)\b.*)$/i;
  // tableau aplati en texte : « Configurer un DHCP Non acquis Calculer un sous-réseau Non acquis … »
  const STATUS_INLINE = /([A-ZÀ-Ý][^.:!?]{2,80}?)\s+((?:[Nn]on )?[Aa]cquis(?: en pratique)?|[Ee]n cours|(?:[Nn]on )?[Vv]alidée?s?)(?=\s+[A-ZÀ-Ý]|\s*$|\s*[.])/g;
  const PERSONA = /(?<!\p{L})(je|j['’]|me|m['’]|moi|mon|ma|mes)(?!\p{L})/giu;
  const LEVEL_RE = /^(niveau( estimé| actuel)?)\s*:\s*/i;
  const REMARK_RE = /^(mon constat|constat|remarque|à noter|en bref|bilan)\s*:\s*/i;
  const cleanItem = (t) => String(t).replace(/\s+/g, ' ').replace(/\s*([;,])\s*/g, '$1 ').replace(/[.;,]\s*$/, '').trim();
  const stemW = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  const near = (a, b) => a === b || (a.length >= 5 && b.length >= 5 && (a.slice(0, 5) === b.slice(0, 5) || a.includes(b) || b.includes(a)));
  const bag = (t) => new Set(String(t).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3 && !/^(les|des|une|dans|pour|avec|sur|tes|ton|ta|aux|par|qui|que|est|son|ses|leur|plus|sans|entre)$/i.test(w)).map(stemW));
  const parasOf = (n) => n._blocks.filter((b) => typeof b === 'string');
  const wordsOf = (t) => (t.match(/\p{L}+/gu) || []).length;
  const personaRatio = (n) => { const t = parasOf(n).join(' '); return (t.match(PERSONA) || []).length / Math.max(1, wordsOf(t)); };
  const hasNotions = (n) => n.children.some((c) => c._notion) || n.children.some(hasNotions);
  const quizCount = (n) => n._ex.filter((e) => e.quiz).length + n.children.reduce((a, c) => a + quizCount(c), 0);
  const textOf = (n) => [n.title, ...parasOf(n), ...n._blocks.filter((b) => b && b.list).flatMap((b) => [b.intro, ...b.list])].join('\n');

  // 1. Dans chaque section : listes à libellé, niveau, constat
  function labelLists(n) {
    const keep = [];
    const str = (b) => {
      if (LEVEL_RE.test(b)) { const [lv, ...rest] = b.replace(LEVEL_RE, '').split(/(?<=\S)\s+(?=(?:Tu|Vous|Ce que|Mon constat)\b)/); n._level = cleanItem(lv); if (rest.length) keep.push(rest.join(' ')); return; }
      if (REMARK_RE.test(b)) { n._remark = cleanItem(b.replace(REMARK_RE, '')) + '.'; return; }
      keep.push(b);
    };
    n._blocks.forEach((b) => {
      if (b && b.list && b.intro) {
        // le libellé peut être collé à la phrase précédente (« … à consolider Tu as découvert : »)
        const intro = b.intro.trim();
        const before = labelCut(intro, NOTION_CORE);
        if (before !== null && b.list.length >= 2 && !n.children.length) {
          if (before) str(before);
          b.list.forEach((it) => { const c = mk(cleanItem(it).slice(0, 120)); c._notion = true; c._pg.add(n._ip[it] || [...n._pg][0] || 1); c._quote = cleanItem(it); n.children.push(c); });
          n._bullets = n._bullets.filter((x) => !b.list.includes(x));
          return;
        }
        const beforeS = labelCut(intro, SKILL_CORE);
        if (beforeS !== null && b.list.length) {
          if (beforeS) str(beforeS);
          n._skills = (n._skills || []).concat(b.list.map(cleanItem));
          n._bullets = n._bullets.filter((x) => !b.list.includes(x));
          return;
        }
      }
      if (typeof b === 'string') { str(b); return; }
      keep.push(b);
    });
    n._blocks = keep;
    n.children.forEach(labelLists);
  }

  // 2. Rôle d'une section de premier niveau
  function roleOf(n) {
    if (quizCount(n) >= 2 || (ASSESS_TITLE.test(n.title) && n._ex.length)) return 'assessment';
    if (n.children.length >= 2 && n.children.filter((c) => PLAN_STEP.test(c.title)).length >= n.children.length * 0.6) return 'plan';
    const items = n._blocks.filter((b) => b && b.list).flatMap((b) => b.list);
    if (items.length >= 4 && items.filter((x) => STATUS_RE.test(x)).length >= items.length * 0.6 && !n.children.length) return 'status';
    if (!n.children.length && (parasOf(n).join(' ').match(STATUS_INLINE) || []).length >= 3) return 'status';
    if (hasNotions(n)) return 'content';
    if (!n.children.length && (personaRatio(n) >= 0.012 || META_TITLE.test(n.title))) return 'meta';
    return 'content';
  }

  function refine(root) {
    labelLists(root);
    const roles = root.children.map((c) => ({ c, role: roleOf(c) }));
    const content = roles.filter((r) => r.role === 'content' && hasNotions(r.c));
    if (!content.length) return; // pas de signal fiable : on garde la structure telle quelle
    const metaMd = [];
    let plan = [], missions = [];
    const kept = [];
    roles.forEach(({ c, role }) => {
      if (role === 'meta' || (role === 'content' && !hasNotions(c) && personaRatio(c) >= 0.008)) {
        const body = [...parasOf(c), ...c._blocks.filter((b) => b && b.list).map((b) => (b.intro ? b.intro + '\n' : '') + b.list.map((x) => `- ${x}`).join('\n'))].join('\n\n');
        metaMd.push(`### ${c.title.replace(/^\s*\d{1,2}[.)]?\s+/, '')}\n\n${body}`);
      } else if (role === 'plan') {
        plan = c.children.map((s) => s.title.replace(PLAN_STEP, '').replace(/^\s*[—–:.-]\s*/, '').trim());
        metaMd.push(`### ${c.title.replace(/^\s*\d{1,2}[.)]?\s+/, '')}\n\n${plan.map((p, i) => `${i + 1}. ${p}`).join('\n')}`);
      } else if (role === 'status') {
        c._blocks.filter((b) => b && b.list).forEach((b) => b.list.forEach((x) => { const m = x.match(STATUS_RE); if (m) missions.push({ t: cleanItem(m[1]), st: cleanItem(m[2]).toLowerCase() }); }));
        if (!missions.length) [...parasOf(c).join(' ').matchAll(STATUS_INLINE)].forEach((m) => { const t = cleanItem(m[1]).replace(/^(mission( professionnelle)?|niveau( actuel)?( estimé)?)\s+/gi, ''); if (t.split(' ').length <= 12) missions.push({ t, st: m[2].toLowerCase() }); });
        metaMd.push(`### ${c.title.replace(/^\s*\d{1,2}[.)]?\s+/, '')}\n\n${missions.map((m) => `- ${m.t} : ${m.st}`).join('\n')}`);
      } else {
        if (role === 'assessment') { c.title = /questions?|qcm|quiz|diagnostic|vérifie/i.test(c.title) ? 'Vérifie ta compréhension' : c.title; c._assess = true; }
        kept.push(c);
      }
    });
    // Une seule section de contenu qui regroupe les vrais chapitres (« Diagnostic détaillé par domaine ») : on la déplie
    let chapters = kept.filter((c) => !c._assess);
    const assess = kept.filter((c) => c._assess);
    if (chapters.length === 1 && chapters[0].children.length >= 2 && chapters[0].children.some((x) => x.children.some((y) => y._notion))) {
      const wrap = chapters[0];
      const intro = parasOf(wrap).join(' ');
      if (intro) metaMd.unshift(intro);
      chapters = wrap.children;
    }
    // Le plan du document ordonne les chapitres (première étape qui les mentionne)
    if (plan.length) {
      const pb = plan.map(bag);
      const rank = (ch) => { const b = bag(ch.title); let best = 99; pb.forEach((p, i) => { if ([...b].some((w) => [...p].some((x) => near(w, x)))) best = Math.min(best, i); }); return best; };
      chapters = chapters.map((ch, i) => ({ ch, r: rank(ch), i })).sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.ch);
    }
    // Missions du tableau : rattachées au chapitre qui partage le plus de termes
    missions.forEach((m) => {
      const mb = bag(m.t);
      let best = null, score = 0;
      chapters.forEach((ch) => { const cb = bag(textOf(ch) + ' ' + ch.children.map((x) => x.title).join(' ') + ' ' + (ch._skills || []).join(' ')); const s = [...mb].filter((w) => [...cb].some((x) => near(w, x))).length; if (s > score) { score = s; best = ch; } });
      (best || root)._missions = ((best || root)._missions || []).concat(m);
    });
    root.children = [...chapters, ...assess];
    if (metaMd.length) root._blocks.push({ md: metaMd.join('\n\n') });
  }

  function build(lines, fileTitle) {
    const body = bodySize(lines);
    const dt = docTitleOf(lines, body);
    const docTitle = dt ? dt.text : fileTitle;
    const isTitle = (l) => dt && dt.lines.has(l);

    // 1. Titres : style, numérotation, mots-clés. Une ligne qui commence par un libellé n'en est pas un.
    const heads = [];
    const cont = new Set();
    const items = new Set(); // lignes d'une liste sans caractère de puce
    const coverLines = new Set(); // page de garde : bandeau, auteur
    let labelX = null;
    lines.forEach((l, i) => {
      if (labelX !== null) { if (l.x > labelX + 6 && l.text.length <= 140) { items.add(i); return; } labelX = null; }
      if (/:\s*$/.test(l.text) && l.text.length <= 90 && !BULLET_RE.test(l.text)) labelX = l.x;
      if (isTitle(l) || l.lead || QUESTION_RE.test(l.text) || LABEL_RE.test(l.text) && !EX_SECTION.test(l.text.replace(/[:.]$/, '')) && !SUM_SECTION.test(l.text.replace(/[:.]$/, ''))) return;
      const prev = lines[i - 1];
      if (prev && QUESTION_RE.test(prev.text) && !/\?\s*$/.test(prev.text)) return;
      if (prev && isTitle(prev) && !l.bold) return; // sous-titre du document
      // suite d'une phrase coupée : pas un titre
      if (prev && !l.bold && prev.size === l.size && !/[.!?:]$/.test(prev.text) && /^[a-zà-ÿ]/.test(l.text)) return;
      const h = headingInfo(l, body);
      // titre sur deux lignes : la 2e ligne (même style, commence par une minuscule) prolonge la 1re
      const last = heads[heads.length - 1];
      if (h && last && last.i === i - 1 && last.size === l.size && last.bold === l.bold && l.gap < l.size * 1.6 && /^[a-zà-ÿ]/.test(l.text)) { cont.add(i); return; }
      if (h) heads.push({ i, size: l.size, bold: l.bold, italic: l.italic, numDepth: h.numDepth, keyword: h.keyword });
    });

    const firstNum = heads.find((h) => h.numDepth);
    if (firstNum && heads.filter((h) => h.numDepth).length >= 3) {
      for (let k = heads.length - 1; k >= 0; k--) { const h = heads[k]; if (h.i < firstNum.i && lines[h.i].page === 1 && !h.numDepth) { coverLines.add(h.i); heads.splice(k, 1); } }
    }
    // Cours aux titres numérotés : un titre sans numéro doit être un mot-clé (Exercices, Conclusion…) ou en gras à la taille des titres
    const numbered = heads.filter((h) => h.numDepth);
    if (numbered.length >= 5) {
      const minNum = Math.min(...numbered.map((h) => h.size));
      for (let k = heads.length - 1; k >= 0; k--) {
        const h = heads[k];
        if (h.numDepth || h.keyword || PLAN_STEP.test(lines[h.i].text) || CHAP.test(lines[h.i].text) || EX_SECTION.test(lines[h.i].text.replace(/[:.]$/, '')) || SUM_SECTION.test(lines[h.i].text.replace(/[:.]$/, ''))) continue;
        if (!(h.bold && h.size >= minNum - 0.2) || /[,`´]$/.test(lines[h.i].text)) heads.splice(k, 1);
      }
    }
    // 2. Niveaux : la numérotation d'abord (relative à la plus haute du document), puis le style
    const nums = heads.filter((h) => h.numDepth);
    const minNum = nums.length ? Math.min(...nums.map((h) => h.numDepth)) : 1;
    const styleLevel = new Map(); // style d'un titre numéroté → niveau
    nums.forEach((h) => { const k = prominence(h); if (!styleLevel.has(k)) styleLevel.set(k, h.numDepth - minNum + 1); });
    const styles = [...new Set(heads.filter((h) => !h.numDepth).map(prominence))].sort((a, b) => b - a);
    const headAt = new Map(heads.map((h) => [h.i, h]));

    const root = mk(docTitle);
    const stack = [{ node: root, level: 0 }];
    const cur = () => stack[stack.length - 1].node;
    let mode = null; // null | 'ex' (section d'exercices) | 'sum' (à retenir) | 'toc' (sommaire, ignoré)
    let para = '', paraSize = body, block = null, list = null, quiz = null;
    const flushList = () => { list = null; };
    const flushPara = () => { if (para.trim()) cur()._blocks.push(para.trim()); para = ''; flushList(); };
    let curPage = 1;
    const addItem = (text) => {
      cur()._ip[text] = curPage;
      if (para.trim()) { const pt = para.trim(); para = ''; if (/:$/.test(pt)) { list = { intro: pt, list: [] }; cur()._blocks.push(list); } else cur()._blocks.push(pt); }
      if (!list) { list = { intro: '', list: [] }; cur()._blocks.push(list); }
      list.list.push(text);
      cur()._bullets.push(text);
    };
    // QCM : « Question 1 — … », options « ○ … », « Bonne réponse : … » -> un exercice corrigé
    const flushQuiz = () => {
      if (!quiz) return;
      const q = quiz.q.replace(/\s+/g, ' ').trim() + (quiz.opts.length ? '\n' + quiz.opts.map((o) => `- ${o}`).join('\n') : '');
      if (quiz.q.trim()) cur()._ex.push({ q: cap(q), a: cap(quiz.a.trim()), quiz: quiz.q.replace(/\s+/g, ' ').trim() });
      quiz = null;
    };
    const flushBlock = () => {
      if (!block) return;
      const text = block.text.replace(/\s+/g, ' ').trim();
      const label = block.label;
      if (/^exercice|^application/i.test(label) || mode === 'ex') {
        if (text) (mode === 'ex' ? root : cur())._ex.push({ q: cap(text), a: '' });
      } else if (KEY_LABELS.test(label)) {
        if (text) { cur()._keys.push(cap(text.length > 240 ? text.slice(0, 237) + '…' : text)); cur()._blocks.push({ md: `**${cap(label)}.** ==${text}==` }); }
      } else if (text) cur()._blocks.push({ md: `**${cap(label)}.** ${text}` });
      block = null;
    };
    const flush = () => { flushPara(); flushBlock(); flushQuiz(); };

    let headingCount = 0;
    let lastNode = null, lastNum = 0;
    lines.forEach((l, i) => {
      if (isTitle(l)) return;
      const t = l.text;
      curPage = l.page;
      if (!headAt.get(i)) cur()._pg.add(l.page); // source : pages où se trouve le contenu de la partie
      if (cont.has(i)) { if (lastNode) lastNode.title += ' ' + t; return; }
      const newPara = l.gap != null && (l.gap > l.size * 1.75 || (l.gap < 0 && /[.!?:]$/.test(lines[i - 1].text)));
      const h = headAt.get(i);
      if (h) {
        flush();
        const plain = t.replace(/[:.]$/, '').trim();
        if (TOC_SECTION.test(plain)) { mode = 'toc'; return; }
        if (EX_SECTION.test(plain)) { mode = 'ex'; return; }
        if (SUM_SECTION.test(plain)) { mode = 'sum'; return; }
        mode = null;
        let level;
        if (h.numDepth) level = h.numDepth - minNum + 1;
        else if (styleLevel.has(prominence(h))) level = styleLevel.get(prominence(h));
        else if (nums.length && prominence(h) < Math.min(...styleLevel.keys())) level = (lastNum || stack[stack.length - 1].level) + 1; // intertitre sous la dernière partie numérotée
        else level = styles.indexOf(prominence(h)) + 1 || 1;
        level = Math.min(Math.max(level, 1), 4);
        if (h.numDepth || styleLevel.has(prominence(h))) lastNum = level;
        while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
        const node = mk(t.replace(/(?<!etc)\.\s*$/, ''));
        node._pg.add(l.page);
        lastNode = node;
        cur().children.push(node);
        stack.push({ node, level });
        headingCount++;
        return;
      }
      if (mode === 'toc') return;
      // QCM
      if (QUESTION_RE.test(t)) { flush(); quiz = { q: t.replace(QUESTION_RE, ''), opts: [], a: '', open: !/\?\s*$/.test(t) }; return; }
      if (quiz) {
        const o = t.match(OPTION_RE);
        if (o) { quiz.opts.push(o[1].trim()); quiz.open = false; return; }
        if (ANSWER_RE.test(t)) { quiz.a = t.replace(ANSWER_RE, ''); quiz.open = false; quiz.inA = true; return; }
        if (quiz.open) { quiz.q += ' ' + t; if (/\?\s*$/.test(t)) quiz.open = false; return; }
        if (quiz.inA && !newPara && !l.bold) { quiz.a += ' ' + t; return; }
        flushQuiz();
      }
      // Bloc à libellé : « Définition. … », « Exercice 1. … »
      const lab = (l.lead && LABEL_RE.test(l.lead)) || (!l.lead && /^(définition|théorème|propriété|exercice|exemple|remarque|méthode|règle|formule|attention)s?\b\s*\d*\s*[.:]/i.test(t))
        || /^(objectifs?|exemples?|remarques?|attention|méthode|astuce|conseil)\s*:?$/i.test(t) ? t.match(LABEL_RE) : null;
      if (lab) {
        flush();
        block = { label: lab[0].replace(/[\s.:)–—-]+$/, ''), text: t.slice(lab[0].length) };
        return;
      }
      if (block) {
        if (newPara) flushBlock();
        else { block.text += (block.text.endsWith('-') ? '' : ' ') + t; return; }
      }
      const bullet = t.match(BULLET_RE) || (items.has(i) ? [t, t] : null);
      // élément sur deux lignes : la suite commence par une minuscule
      if (items.has(i) && list && list.list.length && /^[a-zà-ÿ]/.test(t) && !/[.;]$/.test(list.list[list.list.length - 1])) { list.list[list.list.length - 1] += ' ' + t; return; }
      if (mode === 'sum') { flushPara(); root._keys.push((bullet ? bullet[1] : t).trim()); return; }
      if (mode === 'ex') {
        // énoncé sans libellé dans une section d'exercices : un exercice par paragraphe
        if (newPara || !root._ex.length) root._ex.push({ q: (bullet ? bullet[1] : t).trim(), a: '' });
        else root._ex[root._ex.length - 1].q += ' ' + t;
        return;
      }
      // ligne de tableau : « cellule : cellule » ; la ligne d'en-tête (en gras) est ignorée
      if (l.row) { if (!l.bold) addItem(t); return; }
      if (bullet) { addItem(bullet[1].trim()); return; }
      if (list && !newPara && /^[a-zà-ÿ]/.test(t)) { list.list[list.list.length - 1] += ' ' + t; return; } // puce sur deux lignes
      flushList();
      if (newPara) flushPara();
      if (l.bold && t.length < 80) cur()._bold.push(t.replace(/[:.]$/, ''));
      if (para.endsWith('-')) para = para.slice(0, -1) + t;
      else para += (para ? ' ' : '') + t;
      paraSize = l.size;
    });
    flush();

    // Aucun titre détecté : découpe en parties régulières
    if (headingCount < 2 && !root.children.length) {
      const all = splitSentences(root._blocks.filter((b) => typeof b === 'string').join(' '));
      if (all.length > 12) {
        root._blocks = root._blocks.filter((b) => typeof b !== 'string');
        const chunk = Math.max(6, Math.ceil(all.length / 8));
        for (let i = 0; i < all.length; i += chunk) {
          const part = all.slice(i, i + chunk);
          const firstS = part[0].replace(/[.!?]$/, '');
          const title = firstS.split(' ').slice(0, 7).join(' ') + (firstS.split(' ').length > 7 ? '…' : '');
          const n = mk(`Partie ${root.children.length + 1} · ${title}`);
          n._blocks.push(part.join(' '));
          root.children.push(n);
        }
      }
    }

    // nettoie : intertitres vides sans enfants retirés
    (function prune(n) {
      n.children.forEach(prune);
      n.children = n.children.filter((c) => c.children.length || c._blocks.length || c._bullets.length || c._keys.length || c._ex.length);
    })(root);

    refine(root);
    finalizeNode(root);
    return root;
  }

  async function analyze(file, onProgress) {
    if (!window.pdfjsLib) throw new Error('pdf.js n’a pas pu être chargé (connexion internet ?)');
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const raw = await readLines(pdf, onProgress);
    if (raw.length < 3) throw new Error('Aucun texte lisible : le PDF est sans doute scanné (image).');
    const lines = cleanLines(raw, pdf.numPages);
    const title = file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ');
    const prog = programme(lines);
    const tree = build(lines, title);
    // le nom du document accompagne chaque source (« tcpip.pdf, p. 12 »)
    (function tag(n) { if (n.src) n.src.doc = file.name; n.children.forEach(tag); })(tree);
    return { tree, pages: pdf.numPages, title: prog.docTitle || (SKIP.test(tree.title) ? title : tree.title), topics: prog.topics, isProgramme: prog.isProgramme, hasPlan: prog.hasPlan, planCount: prog.planCount };
  }

  /* Programme ou sommaire : une liste de sujets sans vrai contenu.
     - « Chapitre 3 — Réplication de l'ADN : a, b, c » donne le sujet et ses notions ;
     - les lignes administratives (responsable, ECTS, modalités…) sont écartées ;
     - les numéros de page en fin de ligne d'un sommaire sont retirés. */
  const SKIP = /^(programme|sommaire|table des mati[eè]res|plan( du cours)?|contenu|contenus|objectifs?|sujets?( à réviser)?|chapitres?|page \d+|\d+)$/i;
  const ADMIN = /^(responsables?|enseignants?|intervenants?|volume horaire|ects|crédits?|coefficients?|modalités|évaluation|examen|bibliographie|références|objectifs?|prérequis|pré-requis|compétences|contenu|semestre|horaires?|contact|e-?mail|mots[- ]clés|langue|lieu|salle|ue\s*\d)\b/i;
  const CHAP = /^\s*(chapitre|partie|thème|séance|leçon|module|unité|cours|cm|td|tp|semaine|étape|phase|palier|niveau|sprint|jour|chapter|part|unit|step|week)\s*\d{1,2}\s*[—–\-:.)]\s*(?=\S)/i;
  const LISTM = /^\s*([•●▪◦‣\-–*✓➢►□☐]|\d{1,2}(\.\d{1,2}){0,3}[.)]?|[IVXLC]{1,6}[.)]|[A-H][.)])\s+(?=\S)/;
  function programme(lines) {
    const body = bodySize(lines);
    const isList = (l) => CHAP.test(l.text) || LISTM.test(l.text);
    const admin = (l) => ADMIN.test(l.lead || l.text);
    // Texte rédigé : lignes d'au moins 9 mots qui ne sont ni des éléments de liste ni des infos administratives
    const prose = lines.filter((l) => l.text.split(/\s+/).length >= 9 && !isList(l) && !admin(l)).reduce((a, l) => a + l.text.length, 0);
    const total = lines.filter((l) => !admin(l)).reduce((a, l) => a + l.text.length, 0) || 1;
    // Titre : la plus grande ligne de la première page, sans code d'UE ni crédits
    const firstP = lines.filter((l) => l.page === 1);
    const big = firstP.length ? firstP.reduce((a, b) => (b.size > a.size ? b : a)) : null;
    const dtt = docTitleOf(lines, body);
    const docTitle = big && big.size >= body * 1.2 && !SKIP.test(big.text)
      ? (dtt ? dtt.text : big.text).replace(/\(\s*\d+(?:[.,]\d+)?\s*(ects|crédits?)\s*\)/i, '').replace(/^(ue|ec|module)\s*[\w.]{1,6}\s*[—–\-:]\s*/i, '').trim()
      : null;

    const chapters = lines.filter((l) => CHAP.test(l.text));
    const listy = lines.filter((l) => isList(l) && l.text.length <= 160 && !admin(l));
    const source = chapters.length >= 3 ? chapters : listy.length >= 3 ? listy : lines.filter((l) => !admin(l) && l !== big);
    // Sommaire : numéros de page en fin de ligne
    const pageNums = source.filter((l) => /\s(\.{2,}\s*)?\d{1,4}$/.test(l.text)).length >= 3;

    const topics = [];
    const seen = new Set();
    const push = (title, depth) => {
      const t = title.replace(/^[\s,;:—–-]+|[\s.;:,—–-]+$/g, '').trim();
      if (t.length < 3 || t.length > 110 || SKIP.test(t)) return;
      const key = (depth ? 'd' : '') + t.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      topics.push({ title: cap(t), depth });
    };
    for (const l of source) {
      if (big && l === big && docTitle) continue;
      if (admin(l)) continue;
      let t = l.text;
      if (pageNums) t = t.replace(/\s*\.{2,}\s*\d{1,4}$|\s+\d{1,4}$/, '');
      t = t.replace(/\s*\.{3,}\s*\d+$/, '');
      const chap = CHAP.test(t);
      t = t.replace(CHAP, '').replace(LISTM, '').trim();
      if (!chap && /[.!?]$/.test(l.text) && t.split(' ').length > 9) continue; // une phrase, pas un sujet
      const depth = chap ? 0 : /^\s*\d{1,2}\.\d/.test(l.text) || /^\s*[a-h][.)]\s/.test(l.text) || (l.size < body * 1.05 && !l.bold && /^\s*[•●▪◦‣\-–*]/.test(l.text) && topics.length) ? 1 : 0;
      // « Sujet : notion, notion, notion »
      const m = t.match(/^([^:]{3,90}?)\s*[:—–]\s+(.{3,})$/);
      if (m && depth === 0 && /[,;]| et /.test(m[2])) {
        push(m[1], 0);
        m[2].replace(/[.;]$/, '').split(/\s*[,;]\s*|\s+et\s+(?=\S)/).forEach((n) => push(n, 1));
      } else push(t, depth);
    }
    // Peu de phrases rédigées et plusieurs sujets : c'est une liste de sujets
    const roots = topics.filter((t) => !t.depth).length;
    // (un document long et rédigé qui contient un plan n'est pas « un programme » : voir hasPlan)
    const isProgramme = roots >= 3 && (prose / total < 0.35 || (chapters.length >= 3 && prose / total < 0.6 && total < 3500));
    // Plan de progression dans un document rédigé (« Étape 1 — … » suivie de puces) :
    // chaque étape devient un module, ses puces deviennent ses notions
    let hasPlan = false;
    if (chapters.length >= 3) {
      const plan = [];
      let open = false;
      for (const l of lines) {
        if (CHAP.test(l.text)) {
          open = true;
          plan.push({ title: cap(l.text.replace(CHAP, '').replace(/[.;:]$/, '').trim()), depth: 0 });
          continue;
        }
        if (!open) continue;
        // « Objectif » de l'étape (souvent dans une colonne à côté) : gardé avec le module
        const mod = [...plan].reverse().find((t) => !t.depth);
        if (/^objectifs?\s*:?\s*$/i.test(l.text)) { mod.goal = ''; continue; }
        const og = l.text.match(/^objectifs?\s*:\s*(.+)$/i);
        if (og) { mod.goal = og[1]; continue; }
        if (mod.goal !== undefined && !/^\s*[•●▪◦‣\-–*✓➢►]/.test(l.text) && !l.bold) { mod.goal = (mod.goal + ' ' + l.text).trim(); continue; }
        const b = l.text.match(/^\s*[•●▪◦‣\-–*✓➢►]\s*(.+)$/);
        if (b) { const t = b[1].replace(/[.;:,]$/, '').trim(); if (t.length >= 2 && t.length <= 110) plan.push({ title: cap(t), depth: 1 }); continue; }
        if (l.size >= body * 1.15 || (l.bold && !CHAP.test(l.text) && l.text.length > 3 && !/^objectifs?/i.test(l.text))) open = false; // nouvelle section
      }
      if (plan.filter((t) => !t.depth).length >= 3 && plan.some((t) => t.depth)) { hasPlan = !isProgramme; topics.length = 0; topics.push(...plan); }
    }
    return { topics: topics.slice(0, 80), isProgramme, hasPlan, planCount: topics.filter((t) => !t.depth).length, docTitle };
  }

  // Phrases importantes d'un texte (définitions, règles, mots-clés), dans leur ordre d'origine
  function keySentences(text, n = 3) {
    const sentences = splitSentences(text).filter((x) => x.length >= 40 && x.length <= 260);
    return sentences.map((x, i) => ({ x, i, score: scoreSentence(x, []) + (i === 0 ? 1.5 : 0) }))
      .sort((a, b) => b.score - a.score).slice(0, n).sort((a, b) => a.i - b.i).map((o) => o.x);
  }

  window.PdfImport = { analyze, keySentences, splitSentences, fixAccents };
})();
