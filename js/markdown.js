/* Mini-markdown : titres, listes, gras, italique, surligné, code */
(function () {
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function inline(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/==([^=]+)==/g, '<mark>$1</mark>')
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  }

  function render(src) {
    const lines = String(src || '').split(/\r?\n/);
    let html = '';
    let list = null;
    const close = () => { if (list) { html += `</${list}>`; list = null; } };
    for (const raw of lines) {
      const line = raw.trimEnd();
      let m;
      if (!line.trim()) { close(); continue; }
      if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
        close();
        const lvl = m[1].length + 2;
        html += `<h${lvl}>${inline(m[2])}</h${lvl}>`;
      } else if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) {
        if (list !== 'ul') { close(); html += '<ul>'; list = 'ul'; }
        html += `<li>${inline(m[1])}</li>`;
      } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
        if (list !== 'ol') { close(); html += '<ol>'; list = 'ol'; }
        html += `<li>${inline(m[1])}</li>`;
      } else if ((m = line.match(/^>\s?(.*)$/))) {
        close();
        html += `<blockquote>${inline(m[1])}</blockquote>`;
      } else {
        close();
        html += `<p>${inline(line)}</p>`;
      }
    }
    close();
    return html;
  }

  window.MD = { render, esc };
})();
