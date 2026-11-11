/* Documents d'une organisation (étape D) : envoyer un PDF, en extraire les connaissances, les valider, gérer les versions.
   Traçabilité (docs/architecture.md, D4) : chaque connaissance garde sa version de document, sa page, un extrait
   retrouvé mot pour mot (vérifié par le serveur) et son statut. Rien n'est utilisé avant validation ; une information
   « sensible » (sécurité, santé, juridique, argent) ne se valide que par un manager ou un administrateur.
   Seul le contenu pédagogique est envoyé à l'extraction : le tri cours / hors cours de l'import (DocClassify) s'applique.
   Ce module ne lit jamais l'espace personnel. */
(function () {
  const KIND = { sensible: ['Sensible', 'warning-octagon'], regle: ['Règle', 'scales'], procedure: ['Procédure', 'list-numbers'], produit: ['Produit', 'package'], concept: ['Notion', 'lightbulb'] };
  const STATUS = { propose: 'À valider', valide: 'Validée', rejete: 'Rejetée', a_revalider: 'À revalider', remplace: 'Remplacée' };
  const q = (s) => encodeURIComponent(s);
  const plain = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[«»"“”’'`]/g, "'").replace(/\s+/g, ' ').trim();

  /* ---------- Accès à la base (les règles d'accès décident de ce qui est visible) ---------- */
  const sources = (org) => Tutor.rest('/rest/v1/sources', { method: 'GET', query: `?org_id=eq.${q(org)}&select=id,title,current_version,created_at&order=created_at.desc` });
  const versions = (src) => Tutor.rest('/rest/v1/source_versions', { method: 'GET', query: `?source_id=eq.${q(src)}&select=id,version,page_count,created_at&order=version` });
  const knowledgeOf = (versionIds) => (versionIds.length ? Tutor.rest('/rest/v1/knowledge_nodes', { method: 'GET', query: `?source_version_id=in.(${versionIds.map(q).join(',')})&select=id,kind,title,body,quote,page,confidence,status,source_version_id,validated_at&order=created_at` }) : Promise.resolve([]));
  const setStatus = (id, status) => Tutor.rest('/rest/v1/rpc/set_knowledge_status', { body: { p_id: id, p_status: status } });
  const insertKnowledge = (rows) => (rows.length ? Tutor.rest('/rest/v1/knowledge_nodes', { body: rows }) : Promise.resolve(null));
  const rpcRow = (r) => (Array.isArray(r) ? r[0] : r);

  async function sha256(file) {
    const h = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /* Texte du PDF page par page, débarrassé de ce qui n'est pas du cours (évaluation, conseil, annexe) */
  async function readPages(file) {
    if (!window.pdfjsLib) throw new Error('Le lecteur de PDF n’a pas pu être chargé (connexion internet ?)');
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const raw = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 80); i++) { const tc = await (await pdf.getPage(i)).getTextContent(); raw.push(tc.items.map((x) => x.str).join(' ').replace(/\s+/g, ' ').trim()); }
    const profile = DocClassify.profile(raw.join('\n'));
    let aside = 0;
    const pages = raw.map((t, i) => {
      if (!t || !DocClassify.readable(t)) return { page: i + 1, text: '', unreadable: !!t };
      const r = DocClassify.paragraph(t, profile.personal, { strict: true });
      aside += r.aside.length;
      return { page: i + 1, text: r.cours.trim() };
    });
    if (pages.every((p) => !p.text)) throw new Error(pages.some((p) => p.unreadable) ? 'Le texte de ce PDF est illisible (police encodée ou document scanné).' : 'Ce PDF ne contient pas de texte exploitable.');
    return { pages, count: pdf.numPages, aside, unreadable: pages.filter((p) => p.unreadable).map((p) => p.page) };
  }
  // Lots de passages (une page = un passage, découpée si elle est longue) qui tiennent dans une demande
  function batches(pages) {
    const ps = [];
    pages.forEach((p) => { for (let i = 0; i < p.text.length; i += 1800) { const t = p.text.slice(i, i + 1900).trim(); if (t.length >= 40) ps.push({ page: p.page, text: t }); } });
    const out = []; let cur = [], size = 0;
    ps.forEach((p) => { if (cur.length && (size + p.text.length > 3800 || cur.length >= 5)) { out.push(cur); cur = []; size = 0; } cur.push(p); size += p.text.length; });
    if (cur.length) out.push(cur);
    return out;
  }

  /* Envoi d'un document (nouveau, ou nouvelle version d'un document existant) */
  async function addDocument(org, file, { title, sourceId, onStep } = {}) {
    const step = (m, k) => onStep && onStep(m, k);
    step('Lecture du document…', 0.05);
    const read = await readPages(file);
    const checksum = await sha256(file);
    step('Enregistrement de la version…', 0.2);
    const row = rpcRow(sourceId
      ? await Tutor.rest('/rest/v1/rpc/add_version', { body: { p_source: sourceId, p_checksum: checksum, p_pages: read.count } })
      : await Tutor.rest('/rest/v1/rpc/add_source', { body: { p_org: org.id, p_title: title, p_checksum: checksum, p_pages: read.count } }));
    step('Dépôt du fichier dans l’espace privé…', 0.3);
    await Tutor.upload('org-sources', row.storage_path, file);

    // Nouvelle version : ce qui a été validé avant reste valable si son extrait figure toujours dans le document
    let kept = [], revalidate = 0;
    if (sourceId) {
      const vs = await versions(sourceId);
      const old = (await knowledgeOf(vs.filter((v) => v.id !== row.version_id).map((v) => v.id))).filter((k) => ['valide', 'propose', 'a_revalider'].includes(k.status));
      const full = plain(read.pages.map((p) => p.text).join(' '));
      for (const k of old) {
        if (k.quote && full.includes(plain(k.quote))) { kept.push(k); continue; }
        if (k.status !== 'a_revalider') { try { await setStatus(k.id, 'a_revalider'); revalidate++; } catch (e) { /* droits insuffisants (sensible) : laissé tel quel */ } }
      }
    }

    // Live Policy Watchdog (serveur, migration 008) : comparaison détaillée de l'ancienne et de la nouvelle version,
    // décidée ensuite par un humain. Sans 008, la comparaison ci-dessus suffit.
    let change = null; const fromChange = new Set();
    if (sourceId) {
      step('Comparaison avec la version précédente…', 0.33);
      try {
        change = await OrgLearn.srv({ task: 'comparer_versions', org: org.id, source: sourceId, version: row.version_id });
        const its = await Tutor.rest('/rest/v1/policy_change_items', { method: 'GET', query: `?change_id=eq.${q(change.change)}&select=new_quote` });
        its.forEach((x) => x.new_quote && fromChange.add(plain(x.new_quote)));
      } catch (e) { change = null; }
    }

    // Extraction, lot par lot ; le serveur ne garde que les connaissances dont l'extrait est retrouvé mot pour mot
    const bs = batches(read.pages);
    const items = []; let dropped = 0, unverified = 0;
    for (let i = 0; i < bs.length; i++) {
      step(`Extraction des connaissances (${i + 1}/${bs.length})…`, 0.35 + 0.55 * (i / bs.length));
      const r = await AI.extract(title || 'Document', bs[i], { org: org.id, version: row.version_id, onStatus: (m) => step(m, 0.35 + 0.55 * (i / bs.length)) });
      items.push(...r.items); dropped += r.dropped; unverified += r.unverified || 0;
    }
    const known = new Set([...kept.map((k) => plain(k.quote)), ...fromChange]);
    const fresh = items.filter((x) => !known.has(plain(x.quote)) && (known.add(plain(x.quote)), true));
    step('Enregistrement des connaissances…', 0.95);
    const me = Tutor.userId();
    await insertKnowledge(fresh.map((x) => ({ org_id: org.id, source_version_id: row.version_id, kind: x.kind, title: x.title, body: x.body, quote: x.quote, page: x.page, confidence: x.confidence, extracted_by: 'ia', created_by: me })));
    return { sourceId: row.source_id, version: row.version, proposed: fresh.length, sensitive: fresh.filter((x) => x.kind === 'sensible').length, dropped, unverified, kept: kept.length, revalidate, aside: read.aside, unreadable: read.unreadable, change: change && change.summary };
  }

  /* ---------- Écrans ---------- */
  let d = null;
  let lastReport = null; // compte rendu du dernier envoi, affiché sur la page du document
  const canEdit = (o) => ['admin', 'manager', 'expert'].includes(o.role);
  const canSensitive = (o) => ['admin', 'manager'].includes(o.role);

  async function listView(app, o, headHtml) {
    app.innerHTML = `${headHtml}<section class="sec"><p class="hint">Chargement des documents…</p></section>`;
    let srcs = [];
    try { srcs = await sources(o.id); } catch (e) { app.querySelector('.sec').innerHTML = `<p class="hint">${d.esc(e.message)}</p>`; return; }
    app.innerHTML = `${headHtml}
      <section class="sec">
        <h2>Ajouter un document</h2>
        <p class="hint">Fiche produit, procédure, règlement : Arbor en extrait les connaissances utiles, chacune avec sa page et l’extrait exact. Rien n’est utilisé avant ta validation.</p>
        <form class="org-invite" id="docForm">
          <label for="dfTitle">Titre</label><input id="dfTitle" required maxlength="200" placeholder="Fiche produit Alto 500" />
          <label for="dfFile">Fichier PDF</label><input id="dfFile" type="file" accept="application/pdf" required />
          <div class="row-btns"><button class="btn">${d.ic('file-arrow-up')}Envoyer et analyser</button></div>
          <div class="doc-progress" id="dfProg" hidden><span id="dfMsg"></span><span class="bar"><span id="dfBar"></span></span></div>
          <p class="hint" id="dfOut" role="status"></p>
        </form>
      </section>
      <section class="sec">
        <h2>Documents <small class="num">${srcs.length}</small></h2>
        ${srcs.length ? `<ul class="org-list">${srcs.map((s) => `<li><a href="#/org/${o.id}/documents/${s.id}">${d.ic('file-pdf')} ${d.esc(s.title)}</a><small>version ${s.current_version}</small></li>`).join('')}</ul>` : '<p class="hint">Aucun document pour l’instant.</p>'}
      </section>`;
    bindUpload(app, o, null);
  }

  function bindUpload(app, o, src) {
    const f = app.querySelector('#docForm'); if (!f) return;
    f.onsubmit = async (e) => {
      e.preventDefault();
      const file = f.querySelector('#dfFile').files[0];
      if (!file) return;
      const out = f.querySelector('#dfOut'), prog = f.querySelector('#dfProg');
      const btn = f.querySelector('button'); btn.disabled = true; prog.hidden = false; out.textContent = '';
      try {
        const r = await addDocument(o, file, { title: src ? src.title : f.querySelector('#dfTitle').value.trim(), sourceId: src ? src.id : null, onStep: (m, k) => { f.querySelector('#dfMsg').textContent = m; f.querySelector('#dfBar').style.transform = `scaleX(${Math.max(0.04, k)})`; } });
        const parts = [`Version ${r.version} enregistrée. ${r.proposed} connaissance${r.proposed > 1 ? 's' : ''} à valider${r.sensitive ? `, dont ${r.sensitive} sensible${r.sensitive > 1 ? 's' : ''}` : ''}.`];
        if (src) parts.push(`${r.kept} toujours valable${r.kept > 1 ? 's' : ''} (extrait retrouvé dans la nouvelle version), ${r.revalidate} à revalider.`);
        if (r.change) parts.push(`Changements détectés : ${r.change.modifie || 0} modifiée${(r.change.modifie || 0) > 1 ? 's' : ''}, ${r.change.supprime || 0} supprimée${(r.change.supprime || 0) > 1 ? 's' : ''}, ${r.change.nouveau || 0} nouvelle${(r.change.nouveau || 0) > 1 ? 's' : ''} : à décider ci-dessous.`);
        if (r.dropped) parts.push(`${r.dropped} proposition${r.dropped > 1 ? 's' : ''} écartée${r.dropped > 1 ? 's' : ''} : extrait introuvable dans le document.`);
        if (r.aside) parts.push(`${r.aside} passage${r.aside > 1 ? 's' : ''} hors cours non envoyé${r.aside > 1 ? 's' : ''} (évaluation, conseil, annexe).`);
        if (r.unreadable.length) parts.push(`Pages illisibles ignorées : ${r.unreadable.join(', ')}.`);
        d.toast('Document analysé', 'success');
        lastReport = { sourceId: r.sourceId, text: parts.join(' ') };
        const target = `#/org/${o.id}/documents/${r.sourceId}`;
        if (location.hash === target) detailView(app, o, r.sourceId, app.querySelector('.org-head').outerHTML); else d.go(target);
      } catch (x) {
        out.textContent = /inchang/.test(x.message) ? 'Ce fichier est identique à la dernière version : rien à mettre à jour.' : x.message;
      } finally { btn.disabled = false; prog.hidden = true; }
    };
  }

  async function detailView(app, o, sourceId, headHtml) {
    app.innerHTML = `${headHtml}<section class="sec"><p class="hint">Chargement…</p></section>`;
    let src, vs, ks;
    try {
      src = (await Tutor.rest('/rest/v1/sources', { method: 'GET', query: `?id=eq.${q(sourceId)}&select=id,title,current_version` }))[0];
      if (!src) throw new Error('Document introuvable.');
      vs = await versions(sourceId);
      ks = await knowledgeOf(vs.map((v) => v.id));
    } catch (e) { app.querySelector('.sec').innerHTML = `<p class="hint">${d.esc(e.message)}</p>`; return; }
    const vOf = (id) => (vs.find((v) => v.id === id) || {}).version;
    // L'ordre de travail : sensibles à valider, puis à revalider, puis le reste à valider ; validées et rejetées ensuite
    const rank = (k) => (k.status === 'propose' && k.kind === 'sensible' ? 0 : k.status === 'a_revalider' ? 1 : k.status === 'propose' ? 2 : k.status === 'valide' ? 3 : 4);
    ks.sort((a, b) => rank(a) - rank(b));
    const todo = ks.filter((k) => ['propose', 'a_revalider'].includes(k.status));
    const easy = ks.filter((k) => k.status === 'propose' && k.kind !== 'sensible');
    const card = (k) => {
      const [kl, ki] = KIND[k.kind] || KIND.concept;
      const lockSens = k.kind === 'sensible' && !canSensitive(o);
      const act = canEdit(o) && ['propose', 'a_revalider'].includes(k.status)
        ? (lockSens ? `<p class="hint">${d.ic('lock-simple')}Validation par un manager ou un administrateur.</p>` : `<div class="row-btns"><button class="btn sm" data-k="${k.id}" data-s="valide">${d.ic('check')}Valider</button><button class="btn ghost sm" data-k="${k.id}" data-s="rejete">${d.ic('x')}Rejeter</button></div>`)
        : '';
      return `<li class="kn kn-${k.kind} st-${k.status}">
        <div class="kn-head"><span class="kn-kind">${d.ic(ki)}${kl}</span><span class="kn-status">${STATUS[k.status] || k.status}</span></div>
        <b>${d.esc(k.title)}</b><p>${d.esc(k.body)}</p>
        <blockquote>« ${d.esc(k.quote)} »<cite>p. ${k.page} · version ${vOf(k.source_version_id)}${k.confidence != null ? ` · confiance ${Math.round(k.confidence * 100)} %` : ''}</cite></blockquote>
        ${act}</li>`;
    };
    app.innerHTML = `${headHtml}
      <section class="sec">
        <p><a href="#/org/${o.id}/documents">${d.ic('arrow-left')} Tous les documents</a></p>
        <h2>${d.esc(src.title)} <small class="num">version ${src.current_version}</small></h2>
        ${lastReport && lastReport.sourceId === sourceId ? `<p class="doc-report" id="docReport">${d.ic('info')}${d.esc(lastReport.text)}</p>` : ''}
        <p class="hint">${todo.length} à traiter · ${ks.filter((k) => k.status === 'valide').length} validée${ks.filter((k) => k.status === 'valide').length > 1 ? 's' : ''} · ${ks.length} au total</p>
        <div id="wdBox"></div>
        ${canEdit(o) && easy.length ? `<div class="row-btns"><button class="btn ghost sm" id="kAll">${d.ic('checks')}Valider les ${easy.length} propositions non sensibles</button></div>` : ''}
        <ul class="kn-list">${ks.map(card).join('') || '<li class="hint">Aucune connaissance extraite.</li>'}</ul>
      </section>
      ${canEdit(o) ? `<section class="sec"><h2>Nouvelle version</h2><p class="hint">Les connaissances dont l’extrait figure toujours dans la nouvelle version restent valables ; les autres passent « à revalider ».</p>
        <form class="org-invite" id="docForm"><label for="dfFile">Fichier PDF</label><input id="dfFile" type="file" accept="application/pdf" required />
        <div class="row-btns"><button class="btn">${d.ic('arrows-clockwise')}Envoyer la nouvelle version</button></div>
        <div class="doc-progress" id="dfProg" hidden><span id="dfMsg"></span><span class="bar"><span id="dfBar"></span></span></div><p class="hint" id="dfOut" role="status"></p></form></section>` : ''}
      <div id="relBox"></div>`;
    if (window.OrgEngines) { OrgEngines.watchdog(app.querySelector('#wdBox'), o, sourceId, d); OrgEngines.relations(app.querySelector('#relBox'), o, d); }
    if (lastReport && lastReport.sourceId === sourceId) lastReport = null;
    app.querySelectorAll('[data-k]').forEach((b) => { b.onclick = async () => { b.disabled = true; try { await setStatus(b.dataset.k, b.dataset.s); detailView(app, o, sourceId, headHtml); } catch (x) { d.toast(x.message, 'error'); b.disabled = false; } }; });
    const all = app.querySelector('#kAll');
    if (all) all.onclick = async () => { all.disabled = true; for (const k of easy) { try { await setStatus(k.id, 'valide'); } catch (x) { /* une erreur n'arrête pas les autres */ } } detailView(app, o, sourceId, headHtml); };
    bindUpload(app, o, src);
  }

  function render(app, o, rest, deps, headHtml) {
    d = deps;
    if (!canEdit(o)) { app.innerHTML = `${headHtml}<section class="sec"><p class="hint">Les documents sont gérés par l’équipe de contenu.</p></section>`; return; }
    return rest ? detailView(app, o, rest, headHtml) : listView(app, o, headHtml);
  }

  window.OrgDocs = { render, addDocument, readPages, batches, KIND, STATUS };
})();
