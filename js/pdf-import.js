/* Analyse locale d'un PDF : repère les titres (taille de police, gras, numérotation),
   regroupe le texte par partie et extrait les phrases importantes. Tout se fait dans le navigateur. */
(function () {
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  const NUM_RE = /^((\d{1,2}(\.\d{1,2}){0,3})|[IVXLC]{1,6}|[A-H])[.)\-–]?\s+\S/;
  const KEYWORD_RE = /(?<!\p{L})(chapitre|partie|section|leçon|module|unité|annexe|introduction|conclusion|chapter|part)(?!\p{L})/iu;
  const DEF_RE = /(?<!\p{L})(est (un|une|le|la|l['’]|ce qui|défini)|sont (des|les)|désigne|se définit|on appelle|on nomme|correspond à|signifie|consiste à|représente|permet de|is an?|refers to|means)(?!\p{L})/iu;
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
          bold: /bold|black|heavy|semibold|demi/i.test(f), italic: /italic|oblique|-it\b|bolditalic|boldi\b/i.test(f) });
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
      for (let i = 0; i < segs.length;) {
        if (segs[i].kind === 'full') { ordered.push(segs[i]); i++; continue; }
        let j = i; while (j < segs.length && segs[j].kind !== 'full') j++;
        const run = segs.slice(i, j);
        if (run.some((g) => g.kind === 'right') && run.some((g) => g.kind === 'left')) ordered.push(...run.filter((g) => g.kind === 'left'), ...run.filter((g) => g.kind === 'right'));
        else ordered.push(...run);
        i = j;
      }
      let prev = null;
      for (const g of ordered) {
        const parts = g.parts.sort((a, b) => a.x - b.x);
        const text = parts.map((x) => x.str).join(' ').replace(/\s+/g, ' ').replace(/ ([,.;:)])/g, '$1').trim();
        if (!text) continue;
        const chars = parts.reduce((a, x) => a + x.str.length, 0) || 1;
        const size = Math.max(...parts.map((x) => x.size));
        const boldChars = parts.filter((x) => x.bold).reduce((a, x) => a + x.str.length, 0);
        const italChars = parts.filter((x) => x.italic).reduce((a, x) => a + x.str.length, 0);
        const lead = parts[0].bold && parts.length > 1 && !parts.every((x) => x.bold) ? parts.filter((x, k) => k === 0 || (x.bold && parts.slice(0, k).every((y) => y.bold))).map((x) => x.str).join(' ').trim() : '';
        const gap = prev && prev.page === p ? prev.y - g.y : null;
        const line = { text, size, bold: boldChars / chars > 0.6, italic: italChars / chars > 0.6, lead, page: p, y: g.y, x: g.x0, pageH: vp.height, gap, prevSize: prev ? prev.size : size, col: g.kind };
        lines.push(line);
        prev = line;
      }
      onProgress && onProgress(p / pdf.numPages);
    }
    return lines;
  }

  /* En-têtes, pieds de page, numéros de page : position dans la marge, petite taille, ou répétition */
  function cleanLines(lines, numPages) {
    const body = bodySize(lines);
    const freq = new Map();
    lines.forEach((l) => { const k = l.text.replace(/\d+/g, '#'); freq.set(k, (freq.get(k) || 0) + 1); });
    return lines.filter((l) => {
      if (/^(page\s*)?\d{1,4}(\s*(\/|sur)\s*\d{1,4})?$/i.test(l.text)) return false;
      const edge = l.y > l.pageH * 0.9 || l.y < l.pageH * 0.08;
      const k = l.text.replace(/\d+/g, '#');
      if (edge && (l.size < body * 0.95 || (numPages > 1 && freq.get(k) > 1))) return false;
      if (numPages > 2 && freq.get(k) >= Math.max(2, numPages * 0.5) && l.text.length < 90) return false;
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
    const words = t.split(' ').length;
    const bigger = line.size >= body * 1.15;
    const numbered = NUM_RE.test(t) && words <= 14 && !/[.:]\s*$/.test(t.replace(/^\S+\s/, ''));
    const keyword = KEYWORD_RE.test(t.split(' ').slice(0, 2).join(' ')) && words <= 12;
    const allCaps = t.length > 4 && t === t.toUpperCase() && /[A-ZÀ-Ý]{3}/.test(t) && words <= 10;
    if (!(bigger || (line.bold && (numbered || words <= 10)) || (numbered && (line.bold || bigger)) || keyword || allCaps)) return null;
    if (!bigger && !line.bold && !keyword && !allCaps) return null;
    if (/[.!?]$/.test(t) && !numbered && words > 6) return null;
    // profondeur suggérée par la numérotation
    let numDepth = null;
    const m = t.match(/^(\d{1,2}(\.\d{1,2}){0,3})[.)]?\s/);
    if (m) numDepth = m[1].split('.').length;
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
    if (s.length > 260) score -= 2;
    return score;
  }

  /* Blocs à libellé : « Définition. », « Exercice 2. », « Exemple : »… */
  const LABEL_RE = /^(définitions?|théorèmes?|propriétés?|règles?|formules?|lois?|principes?|corollaires?|propositions?|lemmes?|notations?|méthodes?|remarques?|exemples?|attention|exercices?|application|à retenir|important)\b\s*(\d{1,2}(\.\d{1,2})?)?\s*[.:)–—-]?\s*/i;
  const KEY_LABELS = /^(définition|théorème|propriété|règle|formule|loi|principe|corollaire|proposition|lemme|notation|à retenir|important)/i;
  const EX_SECTION = /^(exercices?|exercices? d['’]application|exercices? corrigés?|entraînement|travaux dirigés|td|applications?)$/i;
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
    bullets.slice(0, 6).forEach((b) => { if (keyPoints.length < 7 && !keyPoints.includes(b) && b.length > 12) keyPoints.push(b); });

    const keySet = new Set(top.map((x) => x.s));
    let notes = blocks
      .map((b) => (typeof b === 'string' ? splitSentences(b).map((s) => (keySet.has(s) ? `==${s}==` : s)).join(' ') : b.md))
      .join('\n\n');
    if (bullets.length) notes += (notes ? '\n\n' : '') + bullets.map((b) => `- ${b}`).join('\n');
    if (notes.length > 6000) notes = notes.slice(0, 6000) + '…';

    node.notes = notes;
    node.keyPoints = keyPoints;
    node.exercises = (node._ex || []).filter((e) => e.q.length > 8);
    delete node._blocks; delete node._bullets; delete node._bold; delete node._keys; delete node._ex;
    node.children.forEach(finalizeNode);
  }

  const mk = (title) => ({ title, children: [], _blocks: [], _bullets: [], _bold: [], _keys: [], _ex: [] });
  const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
  const prominence = (h) => h.size * 10 + (h.bold ? 3 : 0) - (h.italic ? 2 : 0);

  function build(lines, fileTitle) {
    const body = bodySize(lines);

    // Titre du document : la plus grosse ligne de la 1re page, nettement plus grande que le texte
    let docTitle = fileTitle, titleLine = null;
    const first = lines.filter((l) => l.page === 1 && l.text.length <= 120);
    if (first.length) {
      const big = first.reduce((a, b) => (b.size > a.size ? b : a));
      if (big.size >= body * 1.3) { titleLine = big; docTitle = big.text.replace(/^(chapitre|chapter|leçon|cours)\s*\d+\s*[:.—–-]\s*/i, ''); }
    }

    // 1. Titres : style, numérotation, mots-clés. Une ligne qui commence par un libellé n'en est pas un.
    const heads = [];
    lines.forEach((l, i) => {
      if (l === titleLine || l.lead || LABEL_RE.test(l.text) && !EX_SECTION.test(l.text.replace(/[:.]$/, '')) && !SUM_SECTION.test(l.text.replace(/[:.]$/, ''))) return;
      const prev = lines[i - 1];
      // suite d'une phrase coupée : pas un titre
      if (prev && !l.bold && prev.size === l.size && !/[.!?:]$/.test(prev.text) && /^[a-zà-ÿ]/.test(l.text)) return;
      const h = headingInfo(l, body);
      if (h) heads.push({ i, size: l.size, bold: l.bold, italic: l.italic, numDepth: h.numDepth, keyword: h.keyword });
    });

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
    let mode = null; // null | 'ex' (section d'exercices) | 'sum' (à retenir)
    let para = '', paraSize = body, block = null;
    const flushPara = () => { if (para.trim()) cur()._blocks.push(para.trim()); para = ''; };
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
    const flush = () => { flushPara(); flushBlock(); };

    let headingCount = 0;
    lines.forEach((l, i) => {
      if (l === titleLine) return;
      const t = l.text;
      const newPara = l.gap != null && (l.gap > l.size * 1.75 || (l.gap < 0 && /[.!?:]$/.test(lines[i - 1].text)));
      const h = headAt.get(i);
      if (h) {
        flush();
        const plain = t.replace(/[:.]$/, '').trim();
        if (EX_SECTION.test(plain)) { mode = 'ex'; return; }
        if (SUM_SECTION.test(plain)) { mode = 'sum'; return; }
        mode = null;
        let level;
        if (h.numDepth) level = h.numDepth - minNum + 1;
        else if (styleLevel.has(prominence(h))) level = styleLevel.get(prominence(h));
        else if (nums.length && prominence(h) < Math.min(...styleLevel.keys())) level = stack[stack.length - 1].level + 1; // intertitre sous la partie en cours
        else level = styles.indexOf(prominence(h)) + 1 || 1;
        level = Math.min(Math.max(level, 1), 4);
        while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
        const node = mk(t);
        cur().children.push(node);
        stack.push({ node, level });
        headingCount++;
        return;
      }
      // Bloc à libellé : « Définition. … », « Exercice 1. … »
      const lab = (l.lead && LABEL_RE.test(l.lead)) || (!l.lead && /^(définition|théorème|propriété|exercice|exemple|remarque|méthode|règle|formule|attention)s?\b\s*\d*\s*[.:]/i.test(t)) ? t.match(LABEL_RE) : null;
      if (lab) {
        flush();
        block = { label: lab[0].replace(/[\s.:)–—-]+$/, ''), text: t.slice(lab[0].length) };
        return;
      }
      if (block) {
        if (newPara) flushBlock();
        else { block.text += (block.text.endsWith('-') ? '' : ' ') + t; return; }
      }
      const bullet = t.match(/^\s*[•●▪◦‣\-–*✓➢►]\s*(.+)$/);
      if (mode === 'sum') { flushPara(); root._keys.push((bullet ? bullet[1] : t).trim()); return; }
      if (mode === 'ex') {
        // énoncé sans libellé dans une section d'exercices : un exercice par paragraphe
        if (newPara || !root._ex.length) root._ex.push({ q: (bullet ? bullet[1] : t).trim(), a: '' });
        else root._ex[root._ex.length - 1].q += ' ' + t;
        return;
      }
      if (bullet) { flushPara(); cur()._bullets.push(bullet[1].trim()); return; }
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
    return { tree: build(lines, title), pages: pdf.numPages, title: prog.docTitle || title, topics: prog.topics, isProgramme: prog.isProgramme };
  }

  /* Programme ou sommaire : une liste de sujets sans vrai contenu.
     - « Chapitre 3 — Réplication de l'ADN : a, b, c » donne le sujet et ses notions ;
     - les lignes administratives (responsable, ECTS, modalités…) sont écartées ;
     - les numéros de page en fin de ligne d'un sommaire sont retirés. */
  const SKIP = /^(programme|sommaire|table des mati[eè]res|plan( du cours)?|contenu|contenus|objectifs?|sujets?( à réviser)?|chapitres?|page \d+|\d+)$/i;
  const ADMIN = /^(responsables?|enseignants?|intervenants?|volume horaire|ects|crédits?|coefficients?|modalités|évaluation|examen|bibliographie|références|objectifs?|prérequis|pré-requis|compétences|contenu|semestre|horaires?|contact|e-?mail|mots[- ]clés|langue|lieu|salle|ue\s*\d)\b/i;
  const CHAP = /^\s*(chapitre|partie|thème|séance|leçon|module|unité|cours|cm|td|tp|semaine|chapter|part|unit)\s*\d{1,2}\s*[—–\-:.)]?\s*/i;
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
    const docTitle = big && big.size >= body * 1.2 && !SKIP.test(big.text)
      ? big.text.replace(/\(\s*\d+(?:[.,]\d+)?\s*(ects|crédits?)\s*\)/i, '').replace(/^(ue|ec|module)\s*[\w.]{1,6}\s*[—–\-:]\s*/i, '').trim()
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
    const isProgramme = roots >= 3 && (prose / total < 0.35 || (chapters.length >= 3 && prose / total < 0.6));
    return { topics: topics.slice(0, 80), isProgramme, docTitle };
  }

  // Phrases importantes d'un texte (définitions, règles, mots-clés), dans leur ordre d'origine
  function keySentences(text, n = 3) {
    const sentences = splitSentences(text).filter((x) => x.length >= 40 && x.length <= 260);
    return sentences.map((x, i) => ({ x, i, score: scoreSentence(x, []) + (i === 0 ? 1.5 : 0) }))
      .sort((a, b) => b.score - a.score).slice(0, n).sort((a, b) => a.i - b.i).map((o) => o.x);
  }

  window.PdfImport = { analyze, keySentences, splitSentences };
})();
