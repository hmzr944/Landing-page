/* IA locale : un modèle open source (Qwen, d'Alibaba, licence Apache 2.0) qui tourne dans le navigateur
   grâce à WebLLM (github.com/mlc-ai/web-llm). Gratuit, sans compte ni clé, et rien ne quitte l'appareil.
   - Il faut un navigateur avec WebGPU (Chrome, Edge, Safari récents ; ordinateur ou téléphone récent).
   - Le modèle est téléchargé une seule fois (1,5 à 3 Go), puis gardé en cache.
   - Un petit modèle se trompe plus qu'un grand : pour rédiger un cours, on lui donne un texte de référence
     (Wikipédia) à reformuler plutôt que de le laisser inventer. */
(function () {
  const LIB = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.86/+esm';
  const MODELS = [
    { id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC', label: 'Équilibré', size: '2 Go', vram: 2.5 },
    { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', label: 'Léger', size: '1 Go', vram: 1.6 },
    { id: 'Qwen3.5-4B-q4f16_1-MLC', label: 'Plus précis', size: '2,8 Go', vram: 3.9, thinking: true },
  ];
  const DEFAULT = MODELS[0].id;
  let lib = null, engine = null, loadedId = null, loading = null, grammarBroken = false;

  /* Un modèle de 1 à 3 Go fait planter Safari sur iPhone et beaucoup de téléphones : on ne le lance que sur ordinateur,
     avec assez de mémoire. Et si un chargement précédent n'est jamais allé au bout (la page a planté), on n'insiste pas. */
  const CRASH_KEY = 'arbor:llm-try';
  const isMobile = () => /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  const crashed = () => { try { return !!localStorage.getItem(CRASH_KEY); } catch (e) { return false; } };
  const supported = () => typeof navigator !== 'undefined' && !!navigator.gpu && !isMobile() && !(navigator.deviceMemory && navigator.deviceMemory < 8) && !crashed();
  const info = (id) => MODELS.find((m) => m.id === id) || MODELS[0];
  async function getLib() { return lib || (lib = await import(LIB)); }

  // Certaines cartes graphiques ne savent pas calculer en demi-précision (f16) : on prend alors la variante f32
  let f16 = null;
  async function resolve(id) {
    if (f16 === null) {
      try { const a = await navigator.gpu.requestAdapter(); f16 = !!(a && a.features.has('shader-f16')); } catch (e) { f16 = false; }
    }
    if (f16) return id;
    const alt = id.replace('q4f16_1', 'q4f32_1');
    const { prebuiltAppConfig } = await getLib();
    return prebuiltAppConfig.model_list.some((m) => m.model_id === alt) ? alt : id;
  }

  async function isCached(id = DEFAULT) {
    try { return await (await getLib()).hasModelInCache(await resolve(id)); } catch (e) { return false; }
  }

  // Charge le modèle (téléchargement la première fois). onProgress(fraction 0-1, texte)
  async function load(id = DEFAULT, onProgress) {
    if (!supported()) throw new Error('Cette option n’est pas disponible sur cet appareil.');
    id = await resolve(id);
    if (engine && loadedId === id) return engine;
    if (loading && loading.id === id) return loading.p;
    const p = (async () => {
      const { CreateMLCEngine } = await getLib();
      if (engine) { try { await engine.unload(); } catch (e) { /* ignore */ } engine = null; }
      try { localStorage.setItem(CRASH_KEY, String(Date.now())); } catch (e) { /* ignore */ }
      try {
        const e = await CreateMLCEngine(id, {
          initProgressCallback: (r) => onProgress && onProgress(r.progress || 0, frenchProgress(r.text || '')),
        });
        engine = e; loadedId = id;
        return e;
      } finally { try { localStorage.removeItem(CRASH_KEY); } catch (e) { /* ignore */ } }
    })();
    loading = { id, p };
    try { return await p; }
    catch (err) { throw friendly(err); }
    finally { loading = null; }
  }

  function frenchProgress(t) {
    const m = t.match(/(\d+)MB/i);
    if (/finish/i.test(t)) return 'C’est prêt';
    return 'Arbor se prépare…';
  }

  function friendly(err) {
    const m = String((err && err.message) || err);
    if (/out of memory|OOM|device lost|maxBufferSize|exceeds/i.test(m)) return new Error('Cet appareil manque de mémoire pour cette option : choisis « Léger » dans les Réglages.');
    if (/quota|storage/i.test(m)) return new Error('Plus assez d’espace sur cet appareil.');
    if (/fetch|network/i.test(m)) return new Error('Connexion interrompue : réessaie.');
    return err instanceof Error ? err : new Error(m);
  }

  // Exemple de forme attendue, tiré du schéma, pour guider le modèle quand la sortie n'est pas contrainte
  function example(sc) {
    if (sc.type === 'object') return '{' + Object.entries(sc.properties).map(([k, v]) => `"${k}": ${example(v)}`).join(', ') + '}';
    if (sc.type === 'array') return `[${example(sc.items)}]`;
    return '"…"';
  }

  // Extrait le premier objet JSON lisible d'un texte (réponse libre ou coupée par la limite de longueur)
  function parseJson(text) {
    const t = text.replace(/```(?:json)?/g, '').trim();
    const start = t.indexOf('{');
    if (start < 0) throw new Error('Réponse illisible, réessaie.');
    const body = t.slice(start);
    for (const tail of ['', ']}', '"]}]}', '"}]}', ']}]}']) {
      const end = body.lastIndexOf('}');
      for (const cand of [body + tail, body.slice(0, end + 1) + tail]) { try { return JSON.parse(cand); } catch (e) { /* suivant */ } }
    }
    throw new Error('Réponse illisible, réessaie.');
  }

  /* Une demande au modèle. On essaie d'abord une sortie JSON contrainte par le schéma ; si la contrainte
     échoue (cela arrive avec certains modèles), on réessaie en JSON libre, puis en texte dont on extrait le JSON. */
  async function ask(system, user, schema, { id = DEFAULT, maxTokens = 1600, onProgress } = {}) {
    const e = await load(id, onProgress);
    const base = {
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.3,
      max_tokens: maxTokens,
    };
    if (/Qwen3/.test(loadedId || '')) base.extra_body = { enable_thinking: false };
    // (json_object sans schéma est cassé dans cette version de WebLLM : on passe directement au texte libre)
    const formats = grammarBroken ? [null] : [{ type: 'json_object', schema: JSON.stringify(schema) }, null];
    let lastErr = null;
    for (const fmt of formats) {
      const req = fmt ? { ...base, response_format: fmt } : { ...base, messages: [base.messages[0], { role: 'user', content: user + `\n\nRéponds uniquement par un objet JSON de cette forme, sans texte autour :\n${example(schema)}` }] };
      try {
        const out = await e.chat.completions.create(req);
        const txt = out.choices[0].message.content || '';
        try { return parseJson(txt); } catch (pe) { console.warn('IA locale, réponse brute :', txt.slice(0, 400)); throw pe; }
      } catch (err) {
        lastErr = err;
        if (fmt && /grammar/i.test(String(err && err.message))) grammarBroken = true; // inutile de réessayer à chaque demande
        if (/memory|device lost/i.test(String(err && err.message))) break;
        console.warn('IA locale, nouvel essai :', err && err.message);
        try { await e.resetChat(); } catch (e2) { /* ignore */ }
      }
    }
    throw friendly(lastErr);
  }

  const str = { type: 'string' };
  const qa = { type: 'object', properties: { q: str, a: str }, required: ['q', 'a'] };
  const COURSE_SCHEMA = {
    type: 'object',
    properties: {
      overview: str,
      notions: {
        type: 'array',
        items: { type: 'object', properties: { title: str, notes: str, keyPoints: { type: 'array', items: str }, exercises: { type: 'array', items: qa } }, required: ['title', 'notes', 'keyPoints', 'exercises'] },
      },
    },
    required: ['overview', 'notions'],
  };

  const COURSE_SYSTEM = `Tu es un professeur qui rédige un cours clair pour un étudiant français.
On te donne un sujet et, souvent, un texte de référence. Appuie-toi d'abord sur ce texte : n'invente ni chiffres, ni dates, ni noms qui n'y sont pas.
Rédige :
- "overview" : 2 ou 3 phrases qui disent de quoi parle le sujet et pourquoi il compte.
- "notions" : 3 ou 4 notions, de la plus simple à la plus avancée. Pour chacune :
  - "title" : titre court, sans numéro ;
  - "notes" : un vrai paragraphe d'explication (5 à 8 phrases simples) : la définition, puis comment ça marche ou pourquoi, puis un exemple concret. Entoure la phrase la plus importante de == (exemple : ==phrase==) ;
  - "keyPoints" : 2 ou 3 phrases courtes à retenir ;
  - "exercises" : 1 ou 2 questions qui obligent à réfléchir (pas de simple définition), avec la réponse attendue dans "a".
Écris en français, avec des phrases courtes.`;

  async function writeCourse(topic, context, source, opts = {}) {
    const ref = source && source.text ? `\n\nTexte de référence (${source.title}) :\n"""${source.text.slice(0, 4200)}"""` : '\n\n(Aucun texte de référence : reste général et prudent, et ne donne que ce dont tu es sûr.)';
    opts.onStatus && opts.onStatus('Arbor rédige le cours…');
    const r = await ask(COURSE_SYSTEM, `Sujet : « ${topic} »${context ? `\nCours : « ${context} »` : ''}${ref}`, COURSE_SCHEMA, { ...opts, maxTokens: 1900 });
    return {
      overview: String(r.overview || ''),
      notions: (Array.isArray(r.notions) ? r.notions : []).filter((n) => n && n.title && n.notes).slice(0, 5),
    };
  }

  /* Enrichit une partie d'un PDF : on garde le texte d'origine (fidèle au cours du prof),
     le modèle ajoute seulement les points clés et des questions de compréhension. */
  const ENRICH_SCHEMA = { type: 'object', properties: { keyPoints: { type: 'array', items: str }, exercises: { type: 'array', items: qa } }, required: ['keyPoints', 'exercises'] };
  const ENRICH_SYSTEM = `Tu aides un étudiant à réviser un extrait de son cours. N'utilise que ce qui est dans l'extrait.
- "keyPoints" : 2 à 4 phrases courtes, l'essentiel à retenir (définitions, règles, formules), reformulées simplement.
- "exercises" : 1 ou 2 questions de compréhension ou d'application, avec la réponse tirée de l'extrait dans "a".
Écris en français.`;
  async function enrich(title, text, opts = {}) {
    const clean = text.replace(/==/g, '').slice(0, 3500);
    const r = await ask(ENRICH_SYSTEM, `Partie : « ${title} »\nExtrait :\n"""${clean}"""`, ENRICH_SCHEMA, { ...opts, maxTokens: 700 });
    return {
      keyPoints: (r.keyPoints || []).map(String).filter((k) => k.length > 8).slice(0, 4),
      exercises: (r.exercises || []).filter((e) => e && e.q && e.a).slice(0, 2),
    };
  }

  /* Une notion d'un parcours, à partir des passages sélectionnés (méthode inspirée de STORM :
     chaque section est rédigée à partir de SES sources, ce qui tient dans la petite mémoire du modèle) */
  const NOTION_SCHEMA = { type: 'object', properties: { notes: str, keyPoints: { type: 'array', items: str }, exercises: { type: 'array', items: qa } }, required: ['notes', 'keyPoints', 'exercises'] };
  const NOTION_SYSTEM = `Tu es un formateur qui rédige une partie de cours pour un étudiant français débutant.
On te donne une notion, le module dont elle fait partie et des extraits de sources numérotés. N'utilise que ces extraits : n'invente ni chiffre, ni commande, ni nom.
- "notes" : un cours clair en markdown simple (8 à 14 phrases courtes) : à quoi ça sert, comment ça marche, puis un exemple concret. Si c'est une manipulation, donne les étapes dans l'ordre en liste "- ". Entoure la phrase la plus importante de == (==phrase==).
- "keyPoints" : 2 à 4 phrases courtes à retenir.
- "exercises" : 1 ou 2 questions qui font réfléchir ou appliquer, avec la réponse attendue dans "a".
Écris en français.`;
  async function writeNotion(notion, module, sources, opts = {}) {
    const r = await ask(NOTION_SYSTEM, `Notion : « ${notion} »${module ? `\nModule : « ${module} »` : ''}\n\nExtraits :\n${sources}`, NOTION_SCHEMA, { ...opts, maxTokens: 1300 });
    if (!r.notes || String(r.notes).length < 80) throw new Error('Rien n’a pu être rédigé.');
    return {
      notes: String(r.notes),
      keyPoints: (r.keyPoints || []).map(String).filter((k) => k.length > 8).slice(0, 4),
      exercises: (r.exercises || []).filter((e) => e && e.q && e.a).map((e) => ({ q: String(e.q), a: String(e.a) })).slice(0, 2),
    };
  }

  async function remove(id = DEFAULT) {
    const l = await getLib();
    id = await resolve(id);
    if (engine && loadedId === id) { try { await engine.unload(); } catch (e) { /* ignore */ } engine = null; loadedId = null; }
    await l.deleteModelAllInfoInCache(id);
  }

  window.LocalAI = { MODELS, DEFAULT, supported, isCached, load, writeCourse, writeNotion, enrich, remove, loaded: () => loadedId, ask };
})();
