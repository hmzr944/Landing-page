/* Un texte court devient un document PDF minimal (Setup Express : « écrire une règle »).
   Pourquoi un PDF : la provenance d'une connaissance est vérifiée par le serveur sur le fichier stocké (migration 009) ;
   une règle écrite suit donc exactement le même chemin qu'un document importé (empreinte, relecture, extraits retrouvés).
   Aucune dépendance : PDF 1.4, police standard Helvetica, encodage WinAnsi (accents du français, guillemets, euro). */
(function (root) {
  // Unicode vers WinAnsi (Windows-1252) ; ce qui n'existe pas devient « ? »
  const W = { 0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c,
    0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
    0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f, 0x202f: 0x20, 0x00a0: 0x20 };
  const byteOf = (ch) => { const c = ch.codePointAt(0); if (c < 0x80 || (c >= 0xa0 && c <= 0xff)) return c; return W[c] || 0x3f; };
  // chaîne PDF littérale : ( ) et \ sont échappés
  const lit = (s) => [...s].map((ch) => { const b = byteOf(ch); return b === 0x28 || b === 0x29 || b === 0x5c ? [0x5c, b] : [b]; }).flat();
  function wrap(text, width = 88) {
    const out = [];
    String(text).replace(/\r/g, '').split('\n').forEach((para) => {
      let line = '';
      para.split(/\s+/).filter(Boolean).forEach((w) => { if ((`${line} ${w}`).trim().length > width) { if (line) out.push(line); line = w; } else line = `${line} ${w}`.trim(); });
      out.push(line);
    });
    return out;
  }
  function make(text, { title = 'Règle', author = '', date = new Date() } = {}) {
    const head = [title, author ? `Écrite par ${author}, le ${date.toLocaleDateString('fr-FR')}` : `Écrite le ${date.toLocaleDateString('fr-FR')}`, ''];
    const lines = [...head, ...wrap(text)];
    const perPage = 44, pages = [];
    for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
    const bytes = []; const offsets = [];
    const push = (s) => { for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i) & 0xff); };
    const pushB = (arr) => { for (const b of arr) bytes.push(b); };
    push('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
    const n = pages.length, kids = pages.map((_, i) => `${4 + i * 2} 0 R`).join(' ');
    const obj = (id, body) => { offsets[id] = bytes.length; push(`${id} 0 obj\n`); if (typeof body === 'string') push(body); else pushB(body); push('\nendobj\n'); };
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${n} >>`);
    obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    pages.forEach((pl, i) => {
      const content = [];
      const add = (s) => { for (let k = 0; k < s.length; k++) content.push(s.charCodeAt(k) & 0xff); };
      add('BT\n/F1 12 Tf\n16 TL\n56 786 Td\n');
      pl.forEach((l, k) => { if (k) add('T*\n'); add('('); content.push(...lit(l)); add(') Tj\n'); });
      add('ET');
      obj(4 + i * 2, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`);
      offsets[5 + i * 2] = bytes.length;
      push(`${5 + i * 2} 0 obj\n<< /Length ${content.length} >>\nstream\n`); pushB(content); push('\nendstream\nendobj\n');
    });
    const total = 3 + n * 2, xref = bytes.length;
    push(`xref\n0 ${total + 1}\n0000000000 65535 f \n`);
    for (let id = 1; id <= total; id++) push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
    push(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Uint8Array(bytes);
  }
  const api = { make, wrap };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TextPdf = api;
})(typeof window !== 'undefined' ? window : globalThis);
