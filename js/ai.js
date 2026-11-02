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
    };
    const required = ['title', 'notes', 'keyPoints'];
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

  window.AI = { structure };
})();
