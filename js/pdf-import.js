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

  async function readLines(pdf, onProgress) {
    const lines = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const rows = new Map();
      for (const it of content.items) {
        if (!it.str || !it.str.trim()) { if (it.hasEOL) continue; else continue; }
        const size = Math.round(Math.hypot(it.transform[2], it.transform[3]) * 10) / 10 || it.height || 10;
        const y = Math.round(it.transform[5] / 2) * 2;
        let fontName = '';
        try { fontName = (page.commonObjs.has(it.fontName) && page.commonObjs.get(it.fontName).name) || ''; } catch (e) { /* ignore */ }
        const famStyle = (content.styles[it.fontName] && content.styles[it.fontName].fontFamily) || '';
        const bold = /bold|black|heavy|semibold|demi/i.test(fontName + ' ' + famStyle);
        if (!rows.has(y)) rows.set(y, []);
        rows.get(y).push({ x: it.transform[4], str: it.str, size, bold });
      }
      const ys = [...rows.keys()].sort((a, b) => b - a);
      for (const y of ys) {
        const items = rows.get(y).sort((a, b) => a.x - b.x);
        const text = items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();
        if (!text) continue;
        const chars = items.reduce((s, i) => s + i.str.length, 0);
        const size = Math.max(...items.map((i) => i.size));
        const boldChars = items.filter((i) => i.bold).reduce((s, i) => s + i.str.length, 0);
        lines.push({ text, size, bold: boldChars / Math.max(chars, 1) > 0.6, page: p, y });
      }
      onProgress && onProgress(p / pdf.numPages);
    }
    return lines;
  }

  /* Retire en-têtes / pieds de page répétés et numéros de page */
  function cleanLines(lines, numPages) {
    const freq = new Map();
    lines.forEach((l) => { const k = l.text.replace(/\d+/g, '#'); freq.set(k, (freq.get(k) || 0) + 1); });
    return lines.filter((l) => {
      if (/^(page\s*)?\d{1,4}(\s*\/\s*\d{1,4})?$/i.test(l.text)) return false;
      const k = l.text.replace(/\d+/g, '#');
      if (numPages > 3 && freq.get(k) > numPages * 0.5 && l.text.length < 80) return false;
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

  function finalizeNode(node) {
    const paras = node._paras || [];
    const bullets = node._bullets || [];
    const boldSet = (node._bold || []).filter((b) => b.length > 3 && b.length < 80);
    const text = paras.join('\n');
    const sentences = splitSentences(text);
    const scored = sentences.map((s, i) => ({ s, i, score: scoreSentence(s, boldSet) }));
    const top = scored.filter((x) => x.score >= 2).sort((a, b) => b.score - a.score).slice(0, 5).sort((a, b) => a.i - b.i);
    const keyPoints = [];
    top.forEach((x) => keyPoints.push(x.s.length > 220 ? x.s.slice(0, 217) + '…' : x.s));
    bullets.slice(0, 6).forEach((b) => { if (keyPoints.length < 8 && !keyPoints.includes(b)) keyPoints.push(b); });
    boldSet.slice(0, 3).forEach((b) => { if (keyPoints.length < 8 && !keyPoints.some((k) => k.includes(b))) keyPoints.push(`**${b}**`); });

    // Notes : paragraphes, avec les phrases clés surlignées
    const keySet = new Set(top.map((x) => x.s));
    let notes = paras
      .map((p) => splitSentences(p).map((s) => (keySet.has(s) ? `==${s}==` : s)).join(' '))
      .join('\n\n');
    if (bullets.length) notes += (notes ? '\n\n' : '') + bullets.map((b) => `- ${b}`).join('\n');
    if (notes.length > 6000) notes = notes.slice(0, 6000) + '…';

    node.notes = notes;
    node.keyPoints = keyPoints;
    delete node._paras; delete node._bullets; delete node._bold;
    node.children.forEach(finalizeNode);
  }

  function build(lines, fileTitle) {
    const body = bodySize(lines);
    const candidates = lines.map((l) => ({ l, h: headingInfo(l, body) }));
    const headSizes = [...new Set(candidates.filter((c) => c.h && !c.h.numDepth).map((c) => c.h.size))].sort((a, b) => b - a).slice(0, 3);

    // Titre du document : la plus grosse ligne de la 1re page, si elle est seule
    let docTitle = fileTitle;
    const firstPage = candidates.filter((c) => c.l.page === 1 && c.h);
    if (firstPage.length) {
      const biggest = firstPage.reduce((a, b) => (b.l.size > a.l.size ? b : a));
      if (biggest.l.size >= body * 1.4) { docTitle = biggest.l.text; biggest.isDocTitle = true; }
    }

    const root = { title: docTitle, children: [], _paras: [], _bullets: [], _bold: [] };
    const stack = [{ node: root, level: 0 }];
    let para = '';
    const cur = () => stack[stack.length - 1].node;
    const flush = () => { if (para.trim()) cur()._paras.push(para.trim()); para = ''; };

    let headingCount = 0;
    for (const c of candidates) {
      if (c.isDocTitle) continue;
      const { l, h } = c;
      if (h) {
        flush();
        let level = h.numDepth || (headSizes.indexOf(h.size) + 1) || (h.keyword ? 1 : headSizes.length + 1) || 1;
        level = Math.min(Math.max(level, 1), 4);
        while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
        const node = { title: l.text, children: [], _paras: [], _bullets: [], _bold: [] };
        cur().children.push(node);
        stack.push({ node, level });
        headingCount++;
        continue;
      }
      const bullet = l.text.match(/^\s*[•●▪◦‣\-–*✓➢►]\s*(.+)$/);
      if (bullet) { flush(); cur()._bullets.push(bullet[1].trim()); continue; }
      if (l.bold && l.text.length < 80) cur()._bold.push(l.text.replace(/[:.]$/, ''));
      // fusion des lignes en paragraphes
      if (para.endsWith('-')) para = para.slice(0, -1) + l.text;
      else para += (para ? ' ' : '') + l.text;
      if (/[.!?:]$/.test(l.text) && l.text.length < 60) flush();
    }
    flush();

    // Aucun titre détecté : découpe en parties régulières
    if (headingCount < 2) {
      const paras = root._paras.length ? root._paras : [];
      const all = splitSentences(paras.join(' '));
      root._paras = [];
      const chunk = Math.max(6, Math.ceil(all.length / 8));
      for (let i = 0; i < all.length; i += chunk) {
        const part = all.slice(i, i + chunk);
        const first = part[0].replace(/[.!?]$/, '');
        const title = first.split(' ').slice(0, 7).join(' ') + (first.split(' ').length > 7 ? '…' : '');
        root.children.push({ title: `Partie ${root.children.length + 1} · ${title}`, children: [], _paras: [part.join(' ')], _bullets: [], _bold: [] });
      }
    }

    // nettoie : parties vides sans enfants fusionnées dans le parent
    (function prune(n) {
      n.children.forEach(prune);
      n.children = n.children.filter((c) => c.children.length || c._paras.length || c._bullets.length || c.title.length > 3);
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
    return { tree: build(lines, title), pages: pdf.numPages };
  }

  window.PdfImport = { analyze };
})();
