/* Structuration d'un PDF par Claude (optionnel, avec ta propre clé API).
   La clé reste dans ton navigateur (localStorage) et n'est envoyée qu'à l'API d'Anthropic. */
(function () {
  const SDK_URL = 'https://esm.sh/@anthropic-ai/sdk@1.3.0';

  // Schéma récursif déplié sur 4 niveaux (les feuilles n'ont pas d'enfants)
  const nodeSchema = (depth) => {
    const properties = {
      title: { type: 'string' },
      notes: { type: 'string' },
      keyPoints: { type: 'array', items: { type: 'string' } },
      exercises: {
        type: 'array',
        items: { type: 'object', additionalProperties: false, required: ['q', 'a'], properties: { q: { type: 'string' }, a: { type: 'string' } } },
      },
    };
    const required = ['title', 'notes', 'keyPoints', 'exercises'];
    if (depth > 0) {
      properties.children = { type: 'array', items: nodeSchema(depth - 1) };
      required.push('children');
    }
    return { type: 'object', additionalProperties: false, required, properties };
  };

  const SYSTEM = `Tu transformes un document de cours en un cours structuré en arborescence, pour un étudiant qui apprend en découpant chaque sujet en petites parties.
Règles :
- La racine porte le titre du cours ; ses enfants sont les grandes parties, puis des sous-catégories de plus en plus fines (jusqu'à 4 niveaux).
- Chaque feuille = une seule notion, assez petite pour être apprise en une fois.
- Titres courts qui nomment le contenu, en minuscules sauf la première lettre, sans numérotation (pas de « 1. », « 2.1 », « I. »).
- Pas de gras décoratif : réserve **gras** aux termes à retenir.
- 3 à 7 enfants par partie quand le contenu le permet.
- "notes" : explication claire et fidèle au document, en markdown simple (listes "- ", **gras**, ==surligné== pour l'essentiel). Pas d'invention.
- "keyPoints" : 2 à 5 phrases courtes à retenir (définitions, formules, dates, règles).
- "exercises" : seulement si le document contient des exercices, des calculs ou des méthodes à appliquer. "q" = un énoncé, "a" = les étapes de la méthode puis le résultat. Sinon, liste vide.
- Ne rédige pas d'explication personnelle ni de moyen mnémotechnique : c'est à l'étudiant de le faire, c'est ce qui l'aide à retenir.
- Rédige dans la langue du document.`;

  function toBase64(buf) {
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  async function structure(file, apiKey, model, onStatus) {
    onStatus && onStatus('Chargement du client Claude…');
    const { default: Anthropic } = await import(SDK_URL);
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    const data = toBase64(await file.arrayBuffer());

    onStatus && onStatus('Claude lit ton document…');
    const stream = client.beta.messages.stream({
      model: model || 'claude-opus-5-5',
      max_tokens: 64000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: nodeSchema(4) },
      },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } },
          { type: 'text', text: 'Construis le cours structuré de ce document.' },
        ],
      }],
    });

    let chars = 0;
    stream.on('text', (t) => {
      chars += t.length;
      onStatus && onStatus(`Claude structure le cours… (${Math.round(chars / 100) / 10} k caractères)`);
    });
    const msg = await stream.finalMessage();

    if (msg.stop_reason === 'refusal') throw new Error('Claude a refusé de traiter ce document.');
    if (msg.stop_reason === 'max_tokens') throw new Error('Le document est trop long pour une seule passe : essaie l’analyse locale ou découpe le PDF.');
    const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    let tree;
    try { tree = JSON.parse(text); }
    catch (e) { throw new Error('Réponse illisible de Claude, réessaie.'); }
    return tree;
  }

  /* Recherche d'un sujet de programme (module d'apprentissage).
     Claude cherche sur le web (outil web_search), puis construit le module : notions, points clés,
     exercices et sources. Garde-fous pédagogiques : pas d'ancrage ni de moyen mnémotechnique
     (c'est à l'étudiant de les produire), des questions plutôt que des résumés à relire. */
  const RESEARCH_SYSTEM = `Tu prépares un module d'apprentissage pour un étudiant qui révise un programme d'examen.
Tu reçois un sujet du programme (et le contexte du cours). Cherche sur le web des sources fiables (manuels, universités, encyclopédies, sites institutionnels), puis construis le module.
Règles :
- 3 à 6 notions qui découpent le sujet, de la plus fondamentale à la plus avancée. Une notion = une idée.
- Pour chaque notion : "notes" courtes et exactes (4 à 8 lignes, markdown simple, ==surligné== pour l'essentiel), 2 à 4 "keyPoints" (définitions, formules, dates, règles), et des "exercises" seulement si le sujet se pratique (calculs, méthodes, cas).
- "overview" : 3 phrases maximum qui situent le sujet et disent pourquoi il compte.
- "sources" : les pages réellement consultées, avec titre et URL.
- Ne rédige ni image mentale, ni exemple personnel, ni moyen mnémotechnique : l'étudiant les écrit lui-même, c'est ce qui l'aide à retenir.
- Titres courts, sans numérotation. Rédige en français.
Réponds à la fin par UN SEUL bloc JSON, sans texte après, de la forme :
{"overview":"…","notions":[{"title":"…","notes":"…","keyPoints":["…"],"exercises":[{"q":"…","a":"…"}]}],"sources":[{"title":"…","url":"…"}]}`;

  function lastJson(text) {
    const fenced = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1]);
    const cands = fenced.length ? fenced.reverse() : [text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)];
    for (const c of cands) { try { return JSON.parse(c); } catch (e) { /* suivant */ } }
    throw new Error('Réponse illisible de Claude, réessaie.');
  }

  async function researchTopic(topic, context, apiKey, model, onStatus) {
    onStatus && onStatus('Chargement du client Claude…');
    const { default: Anthropic } = await import(SDK_URL);
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    const messages = [{ role: 'user', content: `Sujet du programme : « ${topic} »\nCours : « ${context} »\nPrépare le module.` }];
    let msg = null;
    const found = new Map();
    // Les outils serveur peuvent mettre le tour en pause (pause_turn) : on relance, 4 fois au plus
    for (let round = 0; round < 4; round++) {
      onStatus && onStatus(round ? 'Claude continue ses recherches…' : 'Claude cherche des sources fiables…');
      const stream = client.beta.messages.stream({
        model: model || 'claude-opus-5-5',
        max_tokens: 32000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium' },
        system: RESEARCH_SYSTEM,
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 6 }],
        messages,
      });
      stream.on('text', () => onStatus && onStatus('Claude construit ton module…'));
      msg = await stream.finalMessage();
      for (const b of msg.content) {
        if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) b.content.forEach((r) => r.url && found.set(r.url, r.title || r.url));
      }
      if (msg.stop_reason !== 'pause_turn') break;
      messages.push({ role: 'assistant', content: msg.content });
    }
    if (msg.stop_reason === 'refusal') throw new Error('Claude a refusé de traiter ce sujet.');
    if (msg.stop_reason === 'max_tokens') throw new Error('Le module est trop long : essaie avec un sujet plus précis.');
    const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const data = lastJson(text);
    // Sources : celles citées par Claude, complétées par les pages réellement consultées
    const sources = (Array.isArray(data.sources) ? data.sources : []).filter((x) => x && /^https?:/.test(x.url));
    for (const [url, title] of found) if (sources.length < 6 && !sources.some((x) => x.url === url)) sources.push({ title, url });
    return { overview: String(data.overview || ''), notions: Array.isArray(data.notions) ? data.notions : [], sources: sources.slice(0, 8) };
  }

  window.AI = { structure, researchTopic };
})();
