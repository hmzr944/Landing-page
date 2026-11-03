/* Rédaction d'un cours à partir d'un simple sujet.
   - Sans clé API : Arbor cherche l'article Wikipédia en français le plus pertinent et le transforme
     en cours (introduction, notions par section, points clés). Texte sous licence CC BY-SA, source citée.
   - Avec une clé Claude : Claude cherche sur le web et rédige le cours (voir ai.js).
   Une seule requête Wikipédia par sujet, avec l'en-tête d'identification demandé par Wikimedia. */
(function () {
  const API = 'https://fr.wikipedia.org/w/api.php';
  const SKIP = /^(notes?( et références)?|références|bibliographie|voir aussi|liens? externes?|annexes|articles? connexes|galerie|filmographie|discographie|sources|lectures? complémentaires?|notes et sources|webographie)$/i;

  async function wikiPage(query) {
    const url = `${API}?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1`
      + '&prop=extracts%7Cinfo&inprop=url&explaintext=1&exsectionformat=wiki&redirects=1&format=json&origin=*';
    const res = await fetch(url, { headers: { 'Api-User-Agent': 'ArborStudyApp/1.0 (https://github.com/hmzr944/Landing-page)' } });
    if (!res.ok) throw new Error(res.status === 429 ? 'Wikipédia demande de ralentir : réessaie dans une minute.' : `Wikipédia ne répond pas (${res.status}).`);
    const data = await res.json();
    const pages = data.query && data.query.pages ? Object.values(data.query.pages) : [];
    return pages.length && pages[0].extract ? pages[0] : null;
  }

  // « == Titre == » -> sections ; les sous-sections sont rattachées à leur section
  function sections(extract) {
    const parts = extract.split(/\n(?===+[^=\n]+==+\s*\n)/);
    const intro = parts[0].trim();
    const out = [];
    for (const p of parts.slice(1)) {
      const m = p.match(/^(==+)\s*([^=\n]+?)\s*==+\s*\n?([\s\S]*)$/);
      if (!m) continue;
      const level = m[1].length, title = m[2].trim(), text = m[3].trim();
      if (level <= 2) out.push({ title, text, subs: [] });
      else if (out.length) out[out.length - 1].subs.push({ title, text });
    }
    return { intro, sections: out.filter((x) => !SKIP.test(x.title)) };
  }

  // Coupe un texte à une limite de phrase, autour de max caractères
  function trimText(text, max) {
    const clean = text.replace(/\n{2,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
    if (clean.length <= max) return clean;
    const cut = clean.slice(0, max);
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'));
    return (end > max * 0.5 ? cut.slice(0, end + 1) : cut + '…').trim();
  }

  function highlight(text, keys) {
    let t = text;
    keys.forEach((k) => { if (k.length < 200 && t.includes(k)) t = t.replace(k, `==${k}==`); });
    return t;
  }

  // Les sections encyclopédiques (histoire, étymologie, culture) passent après celles qui expliquent
  const LESS = /^(histoire|historique|étymologie|origines?|dans la culture|culture populaire|postérité|controverses?|anecdotes?|chronologie|personnalités|distinctions|hommages?|dans les arts|économie|statistiques|recherche|découverte)/i;
  const MORE = /(principe|mécanisme|fonctionnement|définition|structure|étapes?|propriétés?|caractéristiques|types?|classification|rôle|fonctions?|formule|calcul|méthode|régulation|processus|composition|description|modèle|théorie|exemples?|applications?|loi|règles?|conditions|effets?)/i;
  const rank = (title) => (MORE.test(title) ? 2 : 0) - (LESS.test(title) ? 3 : 0);

  async function fromWikipedia(topic, context) {
    let page = await wikiPage(topic);
    if (!page && context) page = await wikiPage(`${topic} ${context}`);
    if (!page) throw new Error(`Aucun article trouvé pour « ${topic} ». Reformule le sujet, ou complète-le à la main.`);
    const { intro, sections: secs } = sections(page.extract);
    const overview = trimText(PdfImport.splitSentences(intro).slice(0, 3).join(' '), 600);
    const notions = secs
      .map((sec) => {
        const body = [sec.text, ...sec.subs.map((x) => x.text)].filter(Boolean).join('\n\n');
        return { sec, body };
      })
      .map((x, i) => ({ ...x, i, r: rank(x.sec.title) }))
      .filter(({ body, r }) => body.length >= 220 && r > -3)
      .sort((a, b) => b.r - a.r || a.i - b.i)
      .slice(0, 6)
      .sort((a, b) => a.i - b.i)
      .map(({ sec, body }) => {
        const notes = trimText(body, 1100);
        const keyPoints = PdfImport.keySentences(notes, 3);
        return { title: sec.title, notes: highlight(notes, keyPoints.slice(0, 2)), keyPoints, exercises: [] };
      });
    // Article court sans sections : on découpe l'introduction elle-même
    if (!notions.length) {
      const sents = PdfImport.splitSentences(intro);
      for (let i = 0; i < sents.length && notions.length < 4; i += 4) {
        const chunk = sents.slice(i, i + 4).join(' ');
        if (chunk.length > 150) notions.push({ title: `${page.title} (${notions.length + 1})`, notes: chunk, keyPoints: PdfImport.keySentences(chunk, 2), exercises: [] });
      }
    }
    return {
      overview: `${overview}\n\n_Fiche de départ tirée de l’article Wikipédia « ${page.title} » (licence CC BY-SA 4.0)._`,
      notions,
      sources: [{ title: `Wikipédia : ${page.title}`, url: page.fullurl || `https://fr.wikipedia.org/wiki/${encodeURIComponent(page.title)}` }],
      from: 'wikipedia',
    };
  }

  window.Course = { fromWikipedia };
})();
