/* Arbor 2 · Business : « Changements » (lot C2, conçu pour l'ordinateur).
   Une procédure change : on voit sur un seul écran la chaîne complète, l'« onde de changement » :
   Document (version) → règles modifiées, ajoutées, supprimées → compétences touchées → personnes dont la preuve porte
   sur l'ancienne version, avec l'état de leur revalidation.
   Toutes les données viennent de la base (policy_changes, policy_change_items, policy_change_impact,
   skill_revalidations) ; les décisions passent par les fonctions existantes (decide_change_item,
   assign_learning_actions), avec les mêmes droits. Rien n'est appliqué sans décision humaine. */
(function () {
  let d = null;
  const q = (s) => encodeURIComponent(s);
  const rest = (path, query) => Tutor.rest(path, { method: 'GET', query });
  const rpc = (name, body) => Tutor.rest(`/rest/v1/rpc/${name}`, { body });
  const soft = (p, dflt) => p.catch(() => dflt);
  const fmt = (t) => (t ? new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '');
  const plural = (n, one, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
  const CH = { modifie: ['Modifiée', 'pencil-simple-line'], supprime: ['Supprimée', 'minus-circle'], nouveau: ['Nouvelle', 'plus-circle'], reformule: ['Reformulée', 'text-aa'], inchange: ['Inchangée', 'equals'] };
  const nom = (m) => (m && m.email ? m.email.split('@')[0] : 'Personne');
  /* Différence mot à mot (plus longue sous-suite commune) : ce qui disparaît à gauche, ce qui apparaît à droite */
  function diffMots(a, b) {
    const A = String(a || '').split(/(\s+)/).filter((x) => x !== ''), B = String(b || '').split(/(\s+)/).filter((x) => x !== '');
    const n = A.length, m = B.length, L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const gauche = [], droite = []; let i = 0, j = 0;
    while (i < n && j < m) { if (A[i] === B[j]) { gauche.push([A[i], 0]); droite.push([B[j], 0]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) gauche.push([A[i++], -1]); else droite.push([B[j++], 1]); }
    while (i < n) gauche.push([A[i++], -1]); while (j < m) droite.push([B[j++], 1]);
    const html = (parts, cls) => parts.map(([t, k]) => (k && /\S/.test(t) ? `<mark class="${cls}">${d.esc(t)}</mark>` : d.esc(t))).join('');
    return { gauche: html(gauche, 'del'), droite: html(droite, 'ins') };
  }

  async function render(app, o, head, deps, sel) {
    d = deps;
    app.innerHTML = `${head}<section class="chg"><p class="hint">Chargement des changements…</p></section>`;
    const lead = ['admin', 'manager'].includes(o.role);
    const [changes, sources, revals, ms] = await Promise.all([
      soft(rest('/rest/v1/policy_changes', `?org_id=eq.${q(o.id)}&select=id,source_id,status,summary,created_at,to_version_id&order=created_at.desc&limit=30`), []),
      soft(rest('/rest/v1/sources', `?org_id=eq.${q(o.id)}&select=id,title,current_version`), []),
      soft(rest('/rest/v1/skill_revalidations', `?org_id=eq.${q(o.id)}&select=*`), []),
      soft(rest('/rest/v1/memberships', `?org_id=eq.${q(o.id)}&select=user_id,email,role,unit_id`), []),
    ]);
    const base = window.Desk2 && lead ? `#/org/${o.id}/savoir/impact` : `#/org/${o.id}/changements`;
    const box = app.querySelector('.chg');
    if (!changes.length) {
      box.innerHTML = `<div class="chg-empty card">${d.ic('waves', true)}<h2>Aucun changement de procédure</h2><p>Quand vous ajoutez une nouvelle version d’un document, Arbor la compare à la précédente, règle par règle, et montre ici qui doit revalider quoi.</p><a class="btn" href="#/org/${o.id}/savoir">${d.ic('books')}Base de savoir</a></div>`;
      return;
    }
    const srcOf = (id) => sources.find((s) => s.id === id) || {};
    const cur = changes.find((c) => c.id === sel) || changes[0];
    const [items, imp] = await Promise.all([
      soft(rest('/rest/v1/policy_change_items', `?change_id=eq.${q(cur.id)}&select=*&order=change`), []),
      soft(rpc('policy_change_impact', { p_change: cur.id }), null),
    ]);
    const kIds = items.filter((i) => i.knowledge_id).map((i) => i.knowledge_id);
    const ks = kIds.length ? await soft(rest('/rest/v1/knowledge_nodes', `?id=in.(${kIds.join(',')})&select=id,title,quote,page`), []) : [];
    const kOf = (id) => ks.find((k) => k.id === id) || {};
    const visibles = items.filter((i) => i.change !== 'inchange');
    const order = { modifie: 0, supprime: 1, nouveau: 2, reformule: 3 };
    visibles.sort((a, b) => order[a.change] - order[b.change]);
    const skills = (imp && imp.skills) || [];
    const people = (imp && imp.people) || [];
    const rv = revals.filter((r) => r.change_id === cur.id);
    const etatPers = (uid) => { const r = rv.filter((x) => x.user_id === uid); if (!r.length) return ['a_demander', 'Non demandée']; if (r.every((x) => x.status === 'revalidee')) return ['ok', 'Revalidée']; return ['attente', 'À revalider']; };
    const aDecider = visibles.filter((i) => i.decision === 'a_valider').length;
    const s = cur.summary || {};
    // Rayon d'impact : chaque maillon compté, et le niveau de certitude dit tel quel
    const sensAttente = visibles.filter((i) => i.sensitive && i.decision === 'a_valider');
    const equipes = new Set(people.map((u) => (ms.find((m) => m.user_id === u) || {}).unit_id).filter(Boolean)).size;
    const ouvertes = rv.filter((r) => r.status === 'requires_revalidation').length, closes = rv.filter((r) => r.status === 'revalidee').length;
    const certitude = s.analysed === false ? ['insuffisant', 'Données insuffisantes', 'L’analyse automatique n’a pas abouti : chaque règle est à revoir à la main.']
      : aDecider ? ['probable', 'Impact probable', `${plural(aDecider, 'décision')} en attente : l’impact ne sera confirmé qu’après décision humaine.`]
      : ['confirme', 'Impact confirmé', 'Toutes les modifications ont été décidées par une personne habilitée.'];
    const maillon = (icn, n, l, sub = '') => `<li><span class="ir-n num">${n}</span><span class="ir-l">${d.ic(icn)}${l}</span>${sub ? `<small>${sub}</small>` : ''}</li>`;
    const rayon = `<section class="impact-radius card" aria-label="Rayon d’impact">
        <div class="ir-head"><h3>Rayon d’impact</h3><span class="cert ${certitude[0]}">${certitude[1]}</span></div>
        <ol class="ir-chain">
          ${maillon('file-text', 1, 'Document', d.esc(srcOf(cur.source_id).title || ''))}
          ${maillon('list-checks', visibles.length, 'Règles', `${s.modifie || 0} mod. · ${s.nouveau || 0} nouv. · ${s.supprime || 0} suppr.`)}
          ${maillon('target', skills.length, 'Compétences')}
          ${maillon('users-three', equipes || '—', 'Équipes', equipes ? '' : 'non rangées par équipe')}
          ${maillon('user', people.length, 'Collaborateurs', 'preuve sur l’ancienne version')}
          ${maillon('arrows-clockwise', ouvertes + closes, 'Revalidations', `${closes} revalidée${closes > 1 ? 's' : ''} · ${ouvertes} en attente`)}
        </ol>
        <p class="hint">${certitude[2]}</p>
      </section>`;
    const modifiees = visibles.filter((i) => i.change === 'modifie' && kOf(i.knowledge_id).quote && i.new_quote);
    const diff = modifiees.length ? `<section class="diff card" aria-label="Comparaison des versions">
        <div class="diff-head"><h3>Comparaison</h3><span class="diff-legend"><mark class="del">retiré</mark><mark class="ins">ajouté</mark></span></div>
        ${modifiees.map((i) => { const k = kOf(i.knowledge_id), x = diffMots(k.quote, i.new_quote); return `<div class="diff-row"><p class="diff-t"><b>${d.esc(i.new_title || k.title || '')}</b>${i.sensitive ? ` <span class="wd-tag s">${d.ic('shield-warning', true)}Sensible</span>` : ''}</p>
          <div class="diff-cols"><div class="diff-col old"><small>Version précédente${k.page ? ` · p. ${k.page}` : ''}</small><p>${x.gauche}</p></div><div class="diff-col new"><small>Nouvelle version${i.new_page ? ` · p. ${i.new_page}` : ''}</small><p>${x.droite}</p></div></div>
          ${i.explanation ? `<p class="hint">${d.esc(i.explanation)}</p>` : ''}</div>`; }).join('')}
      </section>` : '';

    box.innerHTML = `
      <aside class="chg-list" aria-label="Changements récents">
        ${changes.map((c) => { const src = srcOf(c.source_id), sm = c.summary || {}; return `<a class="chg-li${c.id === cur.id ? ' on' : ''}" href="${base}/${c.id}" ${c.id === cur.id ? 'aria-current="true"' : ''}>
          <b>${d.esc(src.title || 'Document')}</b><small>${fmt(c.created_at)}${src.current_version ? ` · v${src.current_version}` : ''}</small>
          <span class="chg-counts">${['modifie', 'nouveau', 'supprime'].filter((k) => sm[k]).map((k) => `<i class="cc-${k}">${sm[k]} ${CH[k][0].toLowerCase()}${sm[k] > 1 ? 's' : ''}</i>`).join('') || '<i>aucune règle touchée</i>'}</span></a>`; }).join('')}
      </aside>
      <div class="chg-main">
        <header class="chg-head card">
          <div><p class="chg-eyebrow">${d.ic('waves')} Onde de changement</p><h2>${d.esc(srcOf(cur.source_id).title || 'Document')}</h2>
          <p class="hint">${fmt(cur.created_at)} · ${s.modifie || 0} modifiée${(s.modifie || 0) > 1 ? 's' : ''}, ${s.nouveau || 0} nouvelle${(s.nouveau || 0) > 1 ? 's' : ''}, ${s.supprime || 0} supprimée${(s.supprime || 0) > 1 ? 's' : ''}, ${s.reformule || 0} reformulée${(s.reformule || 0) > 1 ? 's' : ''}.${s.analysed === false ? ' Analyse automatique indisponible : chaque règle est à revoir.' : ''}</p></div>
          ${aDecider ? `<span class="chg-pill warn">${d.ic('hourglass')} ${plural(aDecider, 'décision')} à prendre</span>` : '<span class="chg-pill ok">' + d.ic('check') + ' Toutes les décisions sont prises</span>'}
        </header>
        ${rayon}${diff}
        <ol class="chg-wave">
          <li class="cw-col"><h3><span class="cw-n">1</span>Règles</h3>
            <ul>${visibles.map((i) => { const k = kOf(i.knowledge_id), [lab, icn] = CH[i.change]; return `<li class="cw-rule cw-${i.change}${i.sensitive ? ' sens' : ''}">
              <div class="cw-tags"><span class="wd-tag">${d.ic(icn)}${lab}</span>${i.sensitive ? `<span class="wd-tag s">${d.ic('shield-warning', true)}Sensible</span>` : ''}</div>
              <b>${d.esc(i.new_title || k.title || '')}</b>
              ${i.change !== 'nouveau' && k.quote ? `<p class="cw-old"><small>Avant</small>« ${d.esc(k.quote)} »</p>` : ''}
              ${i.new_quote ? `<p class="cw-new"><small>Maintenant${i.new_page ? ` · p. ${i.new_page}` : ''}</small>« ${d.esc(i.new_quote)} »</p>` : ''}
              ${i.decision === 'a_valider' ? (i.sensitive && !lead ? `<p class="hint">${d.ic('lock-simple')} Décision par un manager.</p>` : `<div class="row-btns"><button type="button" class="btn sm" data-dec="${i.id}" data-v="accepte">${d.ic('check')}${i.change === 'supprime' ? 'Confirmer' : 'Accepter'}</button><button type="button" class="btn ghost sm" data-dec="${i.id}" data-v="rejete">${d.ic('x')}Rejeter</button></div>`)
                : `<p class="cw-dec">${i.decision === 'accepte' ? d.ic('check') + ' Acceptée' : d.ic('x') + ' Rejetée'}</p>`}
            </li>`; }).join('') || '<li class="hint">Aucune règle touchée.</li>'}</ul></li>
          <li class="cw-col"><h3><span class="cw-n">2</span>Compétences touchées</h3>
            <ul>${skills.map((x) => `<li class="cw-skill">${d.ic('target')}<span>${d.esc(x.name)}</span></li>`).join('') || '<li class="hint">Aucune compétence reliée à ces règles.</li>'}
            ${(imp && imp.scenarios && imp.scenarios.length) ? `<li class="cw-sub"><small>Scénarios à revoir</small>${imp.scenarios.map((x) => d.esc(x.title)).join(', ')}</li>` : ''}</ul></li>
          <li class="cw-col"><h3><span class="cw-n">3</span>Personnes</h3>
            <p class="hint">Leur preuve porte sur l’ancienne version. Elle reste dans l’historique.</p>
            <ul>${people.map((uid) => { const m = ms.find((x) => x.user_id === uid), [k, l] = etatPers(uid); return `<li class="cw-person"><span class="cw-av" aria-hidden="true">${d.esc(nom(m).charAt(0).toUpperCase())}</span><span>${d.esc(nom(m))}</span><em class="cw-st ${k}">${l}</em></li>`; }).join('') || '<li class="hint">Personne n’a encore de preuve sur ces règles.</li>'}</ul>
            ${lead && people.length && people.some((u) => etatPers(u)[0] === 'a_demander') ? (sensAttente.length
              ? `<p class="gate">${d.ic('lock-simple', true)}<span>Validation humaine obligatoire : ${plural(sensAttente.length, 'règle sensible')} à décider avant toute revalidation.</span></p><button type="button" class="btn" id="chgAssign" disabled>${d.ic('arrows-clockwise')}Demander la revalidation</button>`
              : `<button type="button" class="btn" id="chgAssign">${d.ic('arrows-clockwise')}Demander la revalidation</button>`) : ''}
          </li>
        </ol>
      </div>`;
    box.querySelectorAll('[data-dec]').forEach((b) => { b.onclick = async () => { b.disabled = true; try { await rpc('decide_change_item', { p_item: b.dataset.dec, p_decision: b.dataset.v }); render(app, o, head, d, cur.id); } catch (x) { d.toast(x.message, 'error'); b.disabled = false; } }; });
    const as = box.querySelector('#chgAssign');
    if (as && !as.disabled) as.onclick = async () => {
      const kids = items.filter((i) => ['modifie', 'supprime', 'reformule'].includes(i.change)).map((i) => i.new_knowledge_id || i.knowledge_id).filter(Boolean);
      const cible = people.filter((u) => etatPers(u)[0] === 'a_demander');
      try { const n = await rpc('assign_learning_actions', { p_org: o.id, p_users: cible, p_kind: 'revalidation', p_reason: 'Le document a changé : ta preuve porte sur l’ancienne version.', p_knowledge: kids, p_change: cur.id });
        d.toast(`Revalidation demandée à ${plural(Number(n) || cible.length, 'personne')}`, 'success'); as.disabled = true; }
      catch (x) { d.toast(x.message, 'error'); }
    };
  }

  window.OrgChanges = { render };
})();
