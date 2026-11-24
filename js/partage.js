/* Arbor · Partager un parcours par lien (Web, ordinateur, téléphone), sans compte ni serveur.
   - Le parcours voyage DANS le lien, après « # » : il n'est envoyé à aucun serveur (le fragment ne part jamais en HTTP).
   - Partagé : la structure, les notes, les explications, les exercices, les fiches et leurs sources citées.
     Jamais partagé : la progression, les révisions (FSRS), les preuves, le statut, l'historique, le compte.
   - Le lien : #/partage/v1.<deflate-raw + base64url du JSON>. Trop gros pour un lien : on propose le fichier.
   - À l'arrivée : aperçu, puis « Ajouter à mes apprentissages » ; le parcours repasse par Store.normalize (nouveaux
     identifiants, champs contrôlés) et chaque fiche repasse par le validateur avant d'être servie, comme toute fiche. */
(function () {
  const MAX_LIEN = 60000; // caractères : au-delà, certaines messageries tronquent les liens
  const MAX_JSON = 2 * 1024 * 1024; // garde-fou à l'arrivée (un lien gonflé ne fait pas exploser la mémoire)
  const KEEP = ['title', 'notes', 'explain', 'keyPoints', 'objectives', 'context', 'fiche'];

  function strip(node) {
    const o = {};
    for (const k of KEEP) if (node[k] != null && !(Array.isArray(node[k]) && !node[k].length) && node[k] !== '') o[k] = node[k];
    if (Array.isArray(node.exercises) && node.exercises.length) o.exercises = node.exercises.map((e) => ({ q: e.q, a: e.a || '' }));
    if (node.course) o.course = { from: node.course.from || '', sources: node.course.sources || [] };
    if (node.module) o.module = { pretest: node.module.pretest || '', generated: !!node.module.generated, sources: node.module.sources || [] };
    if (node.src) o.src = { pages: node.src.pages || [], quote: node.src.quote || '', doc: node.src.doc || '' };
    if (o.fiche) { o.fiche = JSON.parse(JSON.stringify(o.fiche)); if (o.fiche.meta) delete o.fiche.meta.auteur; }
    if (node.children && node.children.length) o.children = node.children.map(strip);
    return o;
  }

  const b64u = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64u = (s) => { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  async function pipe(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
  const supported = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

  async function encode(subject) {
    const payload = { a: 'arbor-partage', v: 1, title: subject.title, icon: subject.icon, root: strip(subject.root) };
    const z = await pipe(new TextEncoder().encode(JSON.stringify(payload)), new CompressionStream('deflate-raw'));
    return `v1.${b64u(z)}`;
  }
  async function decode(code) {
    if (!/^v1\.[A-Za-z0-9_-]+$/.test(code || '')) throw new Error('Ce lien de partage est incomplet ou abîmé.');
    let raw;
    try { raw = await pipe(unb64u(code.slice(3)), new DecompressionStream('deflate-raw')); } catch (x) { throw new Error('Ce lien de partage est incomplet ou abîmé.'); }
    if (raw.length > MAX_JSON) throw new Error('Ce parcours est trop volumineux pour un lien.');
    let p; try { p = JSON.parse(new TextDecoder().decode(raw)); } catch (x) { throw new Error('Ce lien de partage est illisible.'); }
    if (!p || p.a !== 'arbor-partage' || p.v !== 1 || !p.root || typeof p.title !== 'string') throw new Error('Ce lien ne contient pas un parcours Arbor.');
    return p;
  }
  const count = (n) => 1 + (n.children || []).reduce((a, c) => a + count(c), 0);
  const fiches = (n) => (n.fiche ? 1 : 0) + (n.children || []).reduce((a, c) => a + fiches(c), 0);
  const base = () => location.href.split('#')[0];

  /* Fenêtre « Partager » (depuis un sujet) */
  async function open(subject, d) {
    if (!supported()) { d.openModal(`<h2 id="modalTitle">Partager</h2><p>Ce navigateur ne sait pas créer de lien de partage. Utilise « Exporter » pour envoyer le parcours sous forme de fichier.</p><div class="row-btns end"><button class="btn" data-close-modal>Compris</button></div>`, (el) => el.querySelector('[data-close-modal]').onclick = d.closeModal); return; }
    const code = await encode(subject);
    const url = `${base()}#/partage/${code}`;
    const trop = url.length > MAX_LIEN;
    const n = count(subject.root) - 1, f = fiches(subject.root);
    d.openModal(`<h2 id="modalTitle">Partager « ${d.esc(subject.title)} »</h2>
      ${trop ? `<p>Ce parcours est trop volumineux pour tenir dans un lien (${Math.round(url.length / 1000)} 000 caractères). Envoie-le sous forme de fichier : la personne l’importera depuis Arbor.</p>
        <div class="row-btns end"><button type="button" class="btn ghost" data-close-modal>Fermer</button><button type="button" class="btn" id="shFile">${d.ic('download-simple')}Exporter le fichier</button></div>`
      : `<p>Le lien contient le parcours : ${n} partie${n > 1 ? 's' : ''}${f ? `, ${f} fiche${f > 1 ? 's' : ''}` : ''}, les notes et les sources citées. <b>Ta progression et tes révisions ne sont pas partagées.</b></p>
        <label for="shUrl">Lien de partage</label>
        <input id="shUrl" class="input" readonly value="${d.esc(url)}" />
        <p class="hint">${d.ic('lock-simple')} Le parcours voyage dans le lien et n’est envoyé à aucun serveur. Toute personne qui a le lien peut le lire : ne partage pas ainsi un contenu confidentiel.</p>
        <div class="row-btns end">${navigator.share ? `<button type="button" class="btn ghost" id="shNative">${d.ic('share-network')}Envoyer…</button>` : ''}<button type="button" class="btn" id="shCopy">${d.ic('copy')}Copier le lien</button></div>`}`, (el) => {
      const c = el.querySelector('[data-close-modal]'); if (c) c.onclick = d.closeModal;
      const file = el.querySelector('#shFile'); if (file) file.onclick = () => { d.closeModal(); d.exporter(subject); };
      const cp = el.querySelector('#shCopy');
      if (cp) cp.onclick = async () => {
        try { await navigator.clipboard.writeText(url); d.toast('Lien copié'); } catch (x) { const i = el.querySelector('#shUrl'); i.select(); d.toast('Sélectionne le lien et copie-le', 'error'); }
      };
      const nat = el.querySelector('#shNative'); if (nat) nat.onclick = () => navigator.share({ title: subject.title, text: `Un parcours Arbor : ${subject.title}`, url }).catch(() => {});
      const i = el.querySelector('#shUrl'); if (i) i.onfocus = () => i.select();
    });
  }

  /* Écran d'arrivée : #/partage/<code> */
  async function render(app, code, d) {
    app.innerHTML = `<div class="d2 sp"><p class="b-note">${d.ic('hourglass')} Ouverture du parcours partagé…</p></div>`;
    let p;
    try { if (!supported()) throw new Error('Ce navigateur ne sait pas ouvrir les liens de partage. Demande le fichier exporté.'); p = await decode(code); }
    catch (x) { app.innerHTML = `<div class="d2 sp"><header class="d2-head"><div><p class="d2-eyebrow">Parcours partagé</p><h1>Impossible d’ouvrir ce lien</h1><p class="d2-sub">${d.esc(x.message)}</p></div></header><a class="btn" href="#/explorer">${d.ic('compass')}Aller dans Explorer</a></div>`; return; }
    const kids = (p.root.children || []);
    const n = count(p.root) - 1, f = fiches(p.root);
    app.innerHTML = `<div class="d2 sp sh-in">
      <header class="d2-head"><div><p class="d2-eyebrow">Parcours partagé</p><h1>${d.esc(p.title)}</h1>
        <p class="d2-sub">${n} partie${n > 1 ? 's' : ''}${f ? ` · ${f} fiche${f > 1 ? 's' : ''} pédagogique${f > 1 ? 's' : ''}` : ''}. Il sera ajouté à tes apprentissages, sur cet appareil ; tu le suivras avec ta propre progression.</p></div></header>
      <section class="b-card"><ol class="sh-tree">${kids.slice(0, 30).map((c) => `<li><b>${d.esc(c.title || 'Sans titre')}</b>${(c.children || []).length ? `<small>${c.children.length} sous-partie${c.children.length > 1 ? 's' : ''}</small>` : ''}</li>`).join('')}${kids.length > 30 ? `<li><small>et ${kids.length - 30} autres…</small></li>` : ''}</ol></section>
      <p class="b-note">${d.ic('shield-check')} Ce parcours a été créé par quelqu’un d’autre. Chaque fiche sera contrôlée par Arbor avant de t’être proposée, comme toute fiche.</p>
      <div class="row-btns"><button type="button" class="btn" id="shAdd">${d.ic('plus')}Ajouter à mes apprentissages</button><a class="btn ghost" href="#/">Ignorer</a></div>
    </div>`;
    app.querySelector('#shAdd').onclick = () => { const r = d.ajouter(p); d.toast('Parcours ajouté'); d.go(`#/s/${r.sid}/${r.nid}`); };
  }

  window.Partage = { encode, decode, strip, open, render, supported, MAX_LIEN };
})();
