/* Rédaction d'un cours entier à partir de simples thématiques (un programme, un plan de progression).
   Méthode adaptée de STORM (Stanford OVAL, github.com/stanford-oval/storm, licence MIT) :
   1. des recherches ciblées par notion, dans plusieurs sources ;
   2. découpage des pages en passages, classés par pertinence (BM25) avec un critère de diversité ;
   3. rédaction section par section, chaque notion à partir de SES meilleurs passages (avec l'IA locale si
      elle est activée ; sinon assemblage des passages, phrases clés surlignées et exercices) ;
   4. une introduction de module, tirée elle aussi des sources.
   Sources libres (CC BY-SA), interrogées depuis le navigateur : Wikilivres (manuels), Wikiversité (cours), Wikipédia. */
(function () {
  const SITES = [
    { host: 'fr.wikibooks.org', name: 'Wikilivres', w: 1.35 },
    { host: 'fr.wikiversity.org', name: 'Wikiversité', w: 1.2 },
    { host: 'fr.wikipedia.org', name: 'Wikipédia', w: 1 },
  ];
  const HEADERS = { 'Api-User-Agent': 'ArborStudyApp/1.0 (https://github.com/hmzr944/Landing-page)' };

  /* ---------- Requêtes : une à la fois, espacées, avec nouvel essai si Wikimedia demande de ralentir ---------- */
  // Cache borné (les pages peuvent être longues : on garde les 40 dernières réponses)
  const cache = new Map();
  const remember = (k, v) => { cache.set(k, v); if (cache.size > 40) cache.delete(cache.keys().next().value); };
  // 4 requêtes à la fois au plus (raisonnable pour les serveurs de Wikimedia, bien plus rapide qu'une par une)
  let inflight = 0;
  const waiting = [], pending = new Map();
  const acquire = () => new Promise((r) => { if (inflight < 4) { inflight++; r(); } else waiting.push(r); });
  const release = () => { const next = waiting.shift(); if (next) next(); else inflight--; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function api(host, params) {
    const url = `https://${host}/w/api.php?` + new URLSearchParams({ ...params, format: 'json', origin: '*' });
    if (cache.has(url)) return cache.get(url);
    if (pending.has(url)) return pending.get(url); // même requête déjà en cours : on la partage
    const job = (async () => {
      await acquire();
      try {
        for (let attempt = 0; attempt < 4; attempt++) {
          let res;
          try { res = await fetch(url, { headers: HEADERS }); } catch (e) { res = null; }
          if (res && res.ok) { const data = await res.json(); remember(url, data); return data; }
          if (res && res.status !== 429 && res.status < 500) throw new Error(`${host} répond ${res.status}`);
          await sleep(1200 * 2 ** attempt); // 1,2 s, 2,4 s, 4,8 s, 9,6 s
        }
        throw new Error('Les sources demandent de ralentir : réessaie dans une minute.');
      } finally { release(); pending.delete(url); }
    })();
    pending.set(url, job);
    return job;
  }

  /* ---------- Texte : mots, mots vides, racines ---------- */
  const STOP = new Set(('le la les l un une des du de d au aux et ou en dans sur sous par pour avec sans ce cet cette ces son sa ses leur leurs '
    + 'qui que quoi dont où est sont être a ont avoir plus moins très ne pas se s il elle ils elles on nous vous je tu y à comme si mais donc ainsi '
    + 'cela ceci tout tous toute toutes autre autres même entre aussi peut faire fait été lors chez via etc').split(' '));
  // Verbes d'action des programmes : retirés de la requête, mais ils signalent une notion « pratique »
  const ACTION = /^(installer|configurer|créer|comprendre|gérer|appliquer|utiliser|faire|maîtriser|apprendre|sécuriser|vérifier|surveiller|diagnostiquer|résoudre|documenter|restaurer|sauvegarder|découvrir|connaître|savoir|mettre en place|mettre en œuvre|administrer|déployer|calculer|identifier|analyser|réaliser|construire|prendre en main|tester|consulter|attribuer|joindre|organiser|optimiser|interpréter|expliquer|définir|décrire|étudier|réviser)\b\s*/i;
  const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  // racine : les 6 premières lettres (journal, journaux, journalisation -> « journa »)
  const stem = (w) => w.replace(/(s|x)$/, '').slice(0, 6);
  // mots trop courants pour définir un domaine
  const GENERIC = new Set(['simple', 'faire', 'donnee', 'system', 'base', 'servic', 'gerer', 'creer', 'compre', 'appren', 'maitri', 'prendr', 'main', 'bilan', 'niveau', 'parcou', 'etape', 'verifi', 'resoud', 'instal', 'config', 'utilis', 'surveil', 'appliq', 'introd', 'genera', 'notion', 'partie', 'chapit', 'cours', 'module', 'theme', 'seance', 'princip', 'concep', 'method', 'exempl'].map((w) => w.slice(0, 6)));
  // mots entiers (sans pluriel) : pour le vocabulaire du domaine, où une racine trop courte prête à confusion (direct / directory)
  const words = (t) => norm(t).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.replace(/(s|x)$/, ''));
  const tokens = (t) => norm(t).split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w)).map(stem);

  // « Installer Debian » -> { core: "Debian", action: "installer" }
  function analyse(notion) {
    let core = notion.trim(), action = '';
    const m = core.match(ACTION);
    if (m) { action = m[1].toLowerCase(); core = core.slice(m[0].length); }
    core = core.replace(/^(?:(?:les?|la|des|un|une|du|de)\s+|[ld]['’]\s*)/i, '').replace(/[.;:]$/, '').trim();
    return { core: core || notion, action };
  }
  const moduleTerms = (module) => analyse(module || '').core;

  /* ---------- 1. Recherche des pages candidates ---------- */
  async function searchSite(site, q, limit) {
    const d = await api(site.host, { action: 'query', list: 'search', srsearch: q, srlimit: String(limit), srprop: 'wordcount|snippet', srnamespace: '0' });
    return ((d.query && d.query.search) || []).map((r) => ({ site, title: r.title, words: r.wordcount || 0, snippet: (r.snippet || '').replace(/<[^>]+>/g, '') }));
  }
  async function pageText(site, title) {
    const d = await api(site.host, { action: 'query', prop: 'extracts|info', inprop: 'url', explaintext: '1', exsectionformat: 'wiki', redirects: '1', titles: title });
    const p = d.query && d.query.pages ? Object.values(d.query.pages)[0] : null;
    // un livre entier (« Version imprimable ») peut peser plusieurs Mo : on n'en garde que le début
    return p && p.extract ? { site, title: p.title, url: p.fullurl || `https://${site.host}/wiki/${encodeURIComponent(p.title)}`, text: p.extract.slice(0, 60000) } : null;
  }
  /* Pages candidates, notées : mots de la notion (titre ou extrait), mots du module, vocabulaire du domaine
     (tous les titres du parcours), longueur, source pédagogique. Une page hors sujet est écartée. */
  async function candidates(query, focusTerms, look, sites = SITES) {
    const all = [];
    for (const site of sites) {
      try { all.push(...(await searchSite(site, query, 3))); } catch (e) { if (/ralentir/.test(e.message)) throw e; }
    }
    const ft = new Set(focusTerms);
    all.forEach((c) => {
      const tt = tokens(c.title.replace(/\//g, ' ')), st = tokens(c.snippet), both = new Set([...tt, ...st]);
      const bothW = new Set(words(`${c.title.replace(/\//g, ' ')} ${c.snippet}`));
      const hit = tt.filter((w) => ft.has(w)).length;
      const inText = [...ft].filter((w) => both.has(w)).length;
      const modHit = look.modW.filter((w) => bothW.has(w)).length;
      const titleW = new Set(words(c.title.replace(/\//g, ' ')));
      const modTitle = look.modW.filter((w) => titleW.has(w)).length;
      const dom = look.domain.size ? [...bothW].filter((w) => look.domain.has(w) && !ft.has(stem(w))).length : 2;
      // parle d'un AUTRE module du parcours (Linux) et pas du sien (Windows) : hors sujet
      const other = look.others.filter((w) => bothW.has(w)).length;
      c.dbg = `inText=${inText} mod=${modHit} dom=${dom} other=${other} domWords=${[...bothW].filter((w) => look.domain.has(w)).join(',')}`;
      // ou une page dont le titre est le sujet du module (« Active Directory ») : ses passages seront filtrés sur la notion
      // exigence proportionnée au contexte : un sujet isolé (« La mitose ») n'a presque pas de vocabulaire de domaine
      const ctxSize = [...look.domain].filter((w) => !ft.has(stem(w))).length;
      const need = ctxSize >= 6 ? 2 : ctxSize >= 3 ? 1 : 0;
      // une notion d'un seul mot (« données », « permissions ») est trop vague : la page doit aussi parler du module
      const vague = ft.size === 1 && look.modW.length > 0;
      c.relevant = ((inText > 0 && (modHit > 0 || (!vague && hit === ft.size && dom >= need) || dom >= Math.max(need, 2) + (vague ? 1 : 0))) || modTitle >= 2) && !(other > 0 && !modHit);
      c.score = (hit / Math.max(1, ft.size)) * 2 + (inText / Math.max(1, ft.size)) + Math.min(2, modHit) * 0.8 + Math.min(3, dom) * 0.35
        + Math.min(1, c.words / 1500) * 0.5 + (c.site.w - 1) * 2 + (/homonymie|liste de|portail|^liste/i.test(c.title) ? -3 : 0)
        + (look.mod.length && !modHit && hit < ft.size ? -1.6 : 0);
    });
    if (window.Storm && Storm.debug) all.forEach((c) => console.log(`[cand] ${c.site.name} « ${c.title} » score=${c.score.toFixed(2)} relevant=${c.relevant} :: ${c.dbg}`));
    return all.filter((c) => c.relevant && !/version imprimable|texte entier|livre complet|sommaire$/i.test(c.title)).sort((a, b) => b.score - a.score);
  }

  /* ---------- 2. Passages ---------- */
  const SKIP_SEC = /^(notes?( et références)?|références|bibliographie|voir aussi|liens? externes?|annexes|articles? connexes|sources|galerie|historique|histoire|étymologie|voir également|pour aller plus loin|lectures?)/i;
  function passages(page) {
    const out = [];
    let section = '', top = '';
    const blocks = page.text.split(/\n(?=={2,}[^=\n]+={2,})/);
    for (const b of blocks) {
      const m = b.match(/^(={2,})\s*([^=\n]+?)\s*={2,}\s*\n?([\s\S]*)$/);
      const body = m ? m[3] : b;
      if (m) { section = m[2].trim(); if (m[1].length === 2) top = section; }
      if (SKIP_SEC.test(section)) continue;
      for (let para of body.split(/\n{2,}|\n(?=={3,})/)) {
        para = para.split('\n').filter((ln) => !/^={2,}/.test(ln) && (ln.length >= 70 || /[.!?:]\s*$/.test(ln))).join(' ').replace(/\s+/g, ' ').trim();
        if (para.length < 110 || !/[.!?]/.test(para)) continue;
        // découpe des longs paragraphes en morceaux d'environ 650 caractères, à une fin de phrase
        const sents = PdfImport.splitSentences(para);
        let chunk = '';
        for (const s of sents) {
          if ((chunk + ' ' + s).length > 700 && chunk.length > 200) { out.push({ text: chunk.trim(), section, top, page }); chunk = ''; }
          chunk += ' ' + s;
        }
        if (chunk.trim().length >= 110) out.push({ text: chunk.trim(), section, top, page });
      }
    }
    return out.map((p) => ({ ...p, text: p.text.replace(/\s*[^.!?]*:\s*$/, '').trim() })).filter((p) => p.text.length >= 110 && prose(p.text));
  }
  // Du français rédigé : assez de mots outils, peu de symboles de code
  const FUNC = /^(le|la|les|un|une|des|de|du|et|est|sont|qui|que|pour|dans|sur|avec|par|en|à|au|aux|il|elle|on|ce|cette|se|ne|pas|plus)$/i;
  function prose(t) {
    const words = t.split(/\s+/);
    const func = words.filter((w) => FUNC.test(w)).length / words.length;
    const code = (t.match(/[#{}=<>|$;\\]|\/\w+\/|--\w|\b\w+\(\)/g) || []).length / words.length;
    return func >= 0.16 && code < 0.06;
  }

  const DEF = /(?<!\p{L})(?:(est (un|une|le|la|ce qui)|sont (des|les)|désigne|se définit|on appelle|on nomme|correspond à|permet de|sert à|consiste à|signifie)(?!\p{L})|est l['’](?=\p{L}))/iu;
  // BM25 (k1 = 1,4 ; b = 0,75), titre de section et de page comptés en bonus
  function rank(list, weights) {
    const docs = list.map((p) => tokens(p.text));
    const N = docs.length || 1;
    const avg = docs.reduce((a, d) => a + d.length, 0) / N || 1;
    const df = new Map();
    docs.forEach((d) => new Set(d).forEach((w) => df.set(w, (df.get(w) || 0) + 1)));
    list.forEach((p, i) => {
      const d = docs[i], tf = new Map();
      d.forEach((w) => tf.set(w, (tf.get(w) || 0) + 1));
      let s = 0;
      for (const [w, q] of weights) {
        const f = tf.get(w) || 0;
        if (!f) continue;
        const idf = Math.log(1 + (N - (df.get(w) || 0) + 0.5) / ((df.get(w) || 0) + 0.5));
        s += q * idf * (f * 2.4) / (f + 1.4 * (0.25 + 0.75 * d.length / avg));
      }
      const head = new Set(tokens(`${p.section} ${p.page.title.replace(/\//g, ' ')}`));
      for (const [w, q] of weights) if (head.has(w)) s += q * 0.8;
      const core = [...weights].filter(([, q]) => q >= 2).map(([w]) => w);
      if (core.length && !core.some((w) => tf.has(w))) s = 0;
      if (DEF.test(p.text)) s *= 1.25;
      // l'introduction d'une page qui porte le nom de la notion : c'est souvent la meilleure entrée en matière
      if (!p.section && core.some((w) => head.has(w))) s *= 1.4;
      // passage qui renvoie à ce qui précède (« C'est la méthode… », « Dans ce cas… ») : peu clair hors contexte
      if (ANAPHOR.test(p.text) || /^(sinon|lors de)/i.test(p.text)) s *= 0.6;
      p.score = s * p.page.site.w;
      p.toks = new Set(d);
    });
    return list.sort((a, b) => b.score - a.score);
  }
  // Diversité (MMR simplifié) : on écarte un passage qui répète un passage déjà choisi
  function select(ranked, maxChars, maxN) {
    const out = [];
    let chars = 0;
    const best = ranked[0] ? ranked[0].score : 0;
    for (const p of ranked) {
      if (out.length >= maxN || chars > maxChars) break;
      if (p.score < best * 0.35 || p.score <= 0) break;
      const dup = out.some((o) => { let c = 0; p.toks.forEach((w) => { if (o.toks.has(w)) c++; }); return c / Math.max(1, Math.min(p.toks.size, o.toks.size)) > 0.6; });
      if (dup) continue;
      out.push(p); chars += p.text.length;
    }
    return out;
  }

  // Rassemble les meilleurs passages pour une requête : pages candidates (2 au plus par source), puis passages classés
  async function research(notion, ctx, onStatus) {
    const { core, action } = analyse(notion);
    const mod = moduleTerms(ctx.module);
    const coreT = tokens(core), modT = tokens(mod).filter((w) => !coreT.includes(w));
    // une notion d'un seul mot (« Terminal », « Services ») est ambiguë : on y ajoute le contexte du module
    const look = { mod: modT, modW: words(mod).filter((w) => !GENERIC.has(stem(w))), domain: new Set(words(ctx.domain || '').filter((w) => !GENERIC.has(stem(w)))), others: [...new Set(words(ctx.others || ''))].filter((w) => !modT.includes(stem(w)) && !coreT.includes(stem(w)) && !GENERIC.has(stem(w))) };
    const merge = (list, more) => more.forEach((c) => { const o = list.find((x) => x.title === c.title && x.site === c.site); if (!o) list.push(c); else o.score = Math.max(o.score, c.score); });
    // deux angles de recherche, comme les « perspectives » de STORM : la notion dans son module, puis la notion seule
    // notion vague (un seul mot) : on garde le verbe, il dit de quoi il s'agit (« restaurer données »)
    const query = [coreT.length <= 1 && action ? action : '', core, mod].filter(Boolean).join(' ');
    onStatus && onStatus(`recherche « ${core} »`);
    let cands = await candidates(query, coreT, look);
    if (mod && cands.length < 3) merge(cands, await candidates(core, coreT, look));
    const parts = core.split(/\s*(?:,|\bet\b|\bou\b|\/)\s*/i).map((x) => x.trim()).filter((x) => tokens(x).length);
    if (parts.length >= 2 && cands.length < 4) {
      for (const part of parts.slice(0, 3)) {
        merge(cands, (await candidates(mod ? `${part} ${mod}` : part, tokens(part), look, SITES.slice(0, 2)).catch(() => [])).slice(0, 2));
      }
    }
    cands.sort((a, b) => b.score - a.score);
    // 3 pages lues au plus (2 par source), en passant les pages vides (sommaires de livres)
    onStatus && onStatus('lecture des sources');
    const pages = [], perSite = new Map();
    let tries = 0;
    for (const c of cands) {
      if (pages.length >= 3 || tries >= 6) break;
      if ((perSite.get(c.site.host) || 0) >= 2) continue;
      tries++;
      try {
        const p = await pageText(c.site, c.title);
        if (p && p.text.length > 400) { pages.push(p); perSite.set(c.site.host, (perSite.get(c.site.host) || 0) + 1); }
      } catch (e) { if (/ralentir/.test(e.message)) throw e; }
    }
    if (window.Storm && Storm.debug) console.log('[outline] lues : ' + pages.map((p) => `${p.site.name}:${p.title}`).join(' | '));
    const weights = new Map();
    coreT.forEach((w) => weights.set(w, 2));
    modT.forEach((w) => { if (!weights.has(w)) weights.set(w, 0.6); });
    look.domain.forEach((w) => { if (!weights.has(w)) weights.set(w, 0.15); });
    // notion issue d'une section du plan : le texte de cette section est sa meilleure source
    const from = outline.from && outline.from.get(norm(notion));
    if (from && !pages.some((p) => p.url === from.page.url)) pages.push(from.page);
    const ranked = rank(pages.flatMap(passages), weights);
    if (from) {
      const max = ranked.reduce((a, p) => Math.max(a, p.score || 0), 0);
      ranked.forEach((p) => { if (p.page.url === from.page.url && (p.section === from.section || p.top === from.section)) p.score = max + 1 + (p.score || 0); });
      ranked.sort((a, b) => b.score - a.score);
    }
    const chosen = select(ranked, 2600, 4);
    chosen.sort((a, b) => (DEF.test(b.text) && !DEF.test(a.text) ? 1 : 0) - (DEF.test(a.text) && !DEF.test(b.text) ? 1 : 0) || b.score - a.score);
    return { core, action, chosen, pages, coreT };
  }

  /* ---------- 3. Rédaction ---------- */
  const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
  const sourcesOf = (chosen) => chosen.map((p) => p.page).filter((p, i, a) => a.findIndex((x) => x.url === p.url) === i)
    .map((p) => ({ title: `${p.site.name} : ${p.title}`, url: p.url }));

  const low = (t) => (/^.[a-zà-ÿ]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t); // garde « SSH », « DNS »
  // Une vraie manipulation (installer, configurer…), pas « comprendre » ni « apprendre »
  const PRACTICAL = /^(installer|configurer|créer|sécuriser|surveiller|diagnostiquer|résoudre|documenter|restaurer|sauvegarder|mettre en place|mettre en œuvre|administrer|déployer|calculer|réaliser|construire|tester|attribuer|joindre|organiser|appliquer|gérer|vérifier|faire)/i;
  function practice(notion, action, ctx) {
    if (!action || !PRACTICAL.test(action)) return null;
    return { q: `À toi : ${low(notion)} dans ton environnement de test.`, a: 'Note les étapes, puis vérifie que ça marche.' };
  }

  // Sans IA : on assemble les passages choisis, on surligne l'essentiel, on prépare les questions
  function extractive(notion, r, ctx) {
    const text = r.chosen.map((p) => p.text).join('\n\n');
    const keys = PdfImport.keySentences(text, 3);
    let notes = r.chosen.map((p) => {
      let t = p.text;
      keys.slice(0, 2).forEach((k) => { if (t.includes(k)) t = t.replace(k, `==${k}==`); });
      return t;
    }).join('\n\n');
    if (notes.length > 3000) notes = notes.slice(0, notes.lastIndexOf('. ', 3000) + 1);
    const exercises = [];
    if (keys[0]) exercises.push({ q: `En une phrase : c’est quoi, « ${notion} » ?`, a: keys[0] });
    const pr = practice(notion, r.action, ctx);
    if (pr) exercises.push(pr);
    return { notes, keyPoints: keys, exercises };
  }

  async function withWriter(notion, r, ctx, ai, onStatus) {
    const src = r.chosen.map((p, i) => `[${i + 1}] (${p.page.site.name}, « ${p.page.title} ») ${p.text}`).join('\n\n').slice(0, 3600);
    const out = await ai.writeNotion(notion, ctx.module || '', src, { onStatus, onProgress: (p, t) => onStatus && onStatus(p < 1 ? `${t} (${Math.round(p * 100)} %)` : 'rédaction en cours…') });
    const pr = practice(notion, r.action, ctx);
    if (pr) out.exercises.push(pr);
    return out;
  }

  /* Une notion : recherches, passages, rédaction. ai = { kind, writeNotion } : serveur Arbor ou IA locale.
     Si la reformulation échoue ou s'éloigne des sources, le cours est assemblé à partir des extraits eux-mêmes. */
  async function buildNotion(notion, ctx = {}, opts = {}) {
    const r = await research(notion, ctx, opts.onStatus);
    if (!r.chosen.length) throw new Error(`Rien trouvé de fiable sur « ${notion} ».`);
    let out, from = 'sources';
    if (opts.ai) {
      try { out = await withWriter(notion, r, ctx, opts.ai, opts.onStatus); from = opts.ai.kind; }
      catch (e) {
        if (['auth', 'quota'].includes(e.kind)) throw e;
        console.warn('Rédaction indisponible, cours assemblé à partir des sources :', e.message); out = extractive(notion, r, ctx);
      }
    } else out = extractive(notion, r, ctx);
    return { ...out, sources: sourcesOf(r.chosen), from };
  }

  /* Introduction d'un module (la « section d'introduction » de STORM) : un passage qui situe le thème */
  // introduction : début (hors section) d'une page dont le titre nomme le thème, sans phrase qui renvoie à ce qui précède
  const ANAPHOR = /^(c['’]est|ce sont|cela|ceci|ce |cette|ces |il |elle |ils |elles |dans ce cas|de même|en revanche|par contre|ainsi|enfin|ensuite|puis)/i;
  function leadOf(r) {
    const strict = (pg) => r.coreT.length && r.coreT.every((w) => tokens(pg.title.split('/').pop()).includes(w));
    const pool = [...r.pages.filter(strict), ...((outline.last === r && outline.extra) || [])];
    const p = pool.flatMap(passages).find((x) => !x.section && !ANAPHOR.test(x.text) && /^[A-ZÀ-Ý«"(]/.test(x.text))
      || r.chosen.find((x) => !ANAPHOR.test(x.text)) || r.chosen[0];
    return p ? { text: PdfImport.splitSentences(p.text).slice(0, 3).join(' '), sources: sourcesOf([p]) } : null;
  }
  async function moduleLead(module, ctx = {}, opts = {}) {
    if (ctx.research) return leadOf(ctx.research);
    const r = await research(module, { module: '' }, opts.onStatus); // le module est lui-même le thème : pas de filtre de domaine
    const named = r.pages.find((pg) => tokens(pg.title.replace(/\//g, ' ')).some((w) => r.coreT.includes(w)));
    const p = (named && passages(named).find((x) => !x.section)) || r.chosen[0];
    if (!p) return null;
    const intro = PdfImport.splitSentences(p.text).slice(0, 3).join(' ');
    return { text: intro, sources: sourcesOf([p]) };
  }

  /* Plan d'un thème seul (sans notions) : les sections explicatives de la meilleure source deviennent les notions */
  const LESS = /^(histoire|historique|étymologie|origines?|dans la culture|culture populaire|controverses?|anecdotes?|chronologie|personnalités|distinctions|statistiques|introduction|présentation|généralités|conclusion|résumé|exercices?|annexes?|remarques?|actualités|application suivant|par pays|dans le monde|perspectives)/i;
  async function outline(topic, ctx = {}, opts = {}) {
    outline.from = outline.from || new Map();
    const r = await research(topic, ctx, opts.onStatus);
    const secs = [];
    // d'abord les pages dont le titre nomme le thème (Wikipédia « Mitose » plutôt qu'un manuel général)
    // le plan ne vient QUE d'une page dont le titre nomme le thème : sinon on va la chercher exprès
    const named = (p) => r.coreT.length && r.coreT.every((w) => tokens(p.title.split('/').pop()).includes(w));
    let pages = r.pages.filter(named);
    if (!pages.length) {
      const look = { mod: [], modW: [], domain: new Set(), others: [] };
      for (const c of (await candidates(r.core, r.coreT, look)).filter(named).slice(0, 2)) {
        try { const p = await pageText(c.site, c.title); if (p && p.text.length > 400) pages.push(p); } catch (e) { if (/ralentir/.test(e.message)) throw e; }
      }
    }
    for (const page of pages) {
      for (const m of page.text.matchAll(/\n==\s*([^=\n]+?)\s*==\s*\n/g)) {
        const t = m[1].trim();
        if (SKIP_SEC.test(t) || LESS.test(t) || t.length > 70 || /\?$/.test(t) || secs.some((x) => norm(x) === norm(t))) continue;
        if (tokens(t).every((w) => r.coreT.includes(w))) continue; // la section « Mitose » d'une page sur la mitose n'apprend rien de plus
        secs.push(t);
        outline.from.set(norm(t), { page, section: t });
      }
      if (secs.length >= 4) break;
    }
    outline.last = r; // pour l'introduction du module, sans refaire la recherche
    outline.extra = pages;
    if (window.Storm && Storm.debug) console.log('[outline] pages: ' + pages.map((p) => `${p.title} (${(p.text.match(/\n==[^=]/g) || []).length} sections)`).join(' | ') + ' -> ' + secs.join(' ; '));
    return secs.slice(0, 4);
  }

  window.Storm = { buildNotion, moduleLead, outline, analyse, _rank: rank, _tokens: tokens };
})();
