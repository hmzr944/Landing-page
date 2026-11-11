/* Interfaces des moteurs Business (docs/engines.md) :
   - Scénarios : concevoir à partir des connaissances validées, relire la fiche, tester, publier ; les publiés se jouent.
   - Live Policy Watchdog : changements d'une nouvelle version, décision humaine, impact, revalidation des personnes.
   - Graphe : relations proposées entre connaissances validées, à valider.
   - Mon parcours : compétences du poste, niveau de preuve, plan expliqué, actions demandées, mes données.
   - Radar des angles morts et validation humaine au poste (managers).
   Tous les droits sont vérifiés par la base et le serveur ; ce module affiche et transmet. */
(function () {
  let d = null;
  const q = (s) => encodeURIComponent(s);
  const srv = (p, onWait) => OrgLearn.srv(p, onWait);
  const rest = (path, opts) => Tutor.rest(path, opts);
  const rpc = (name, body) => Tutor.rest(`/rest/v1/rpc/${name}`, { body });
  const missing = (e) => /could not find|PGRST20[25]|schema cache|does not exist|migration 008/i.test(String(e && e.message));
  const needs008 = (what) => `<p class="empty-note">${d.ic('info')}${what} demande la mise à jour de la base d’Arbor (migration 008).</p>`;
  const fmt = (t) => (t ? new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '');
  const LEVEL_PILL = (n) => `<span class="lv lv-${n || 0}" title="${n ? Evidence.LEVELS[n].why : 'aucune preuve'}">${n ? `${n} · ${Evidence.LEVELS[n].label}` : 'Pas encore démontrée'}</span>`;

  /* ---------- Scénarios ---------- */
  const KINDS = [['client', 'Relation client'], ['procedure', 'Procédure'], ['technique', 'Technique'], ['management', 'Management'], ['autre', 'Autre']];
  async function scenariosView(app, o, head, deps) {
    d = deps;
    app.innerHTML = `${head}<section class="sec"><p class="hint">Chargement…</p></section>`;
    let scs = [], vs = [];
    try { [scs, vs] = await Promise.all([rest('/rest/v1/scenarios', { method: 'GET', query: `?org_id=eq.${q(o.id)}&select=id,title,kind,status,current_version&order=created_at.desc` }),
      rest('/rest/v1/scenario_versions', { method: 'GET', query: `?org_id=eq.${q(o.id)}&select=id,scenario_id,version,status,created_at&order=version.desc` })]); }
    catch (e) { app.querySelector('.sec').innerHTML = missing(e) ? needs008('Les scénarios') : `<p class="hint">${d.esc(e.message)}</p>`; return; }
    const verOf = (s) => vs.filter((v) => v.scenario_id === s.id);
    app.innerHTML = `${head}
      <section class="sec org-learn"><h2>Concevoir un scénario</h2>
        <p class="hint">Arbor propose une situation complète (contexte, objectif, personnage, contraintes, événements, grille de comportements) à partir des connaissances validées. Tu la relis, tu la testes, puis tu la publies.</p>
        <form class="obz-form" id="scForm"><div class="obz-two">
          <div class="field"><label for="scKind">Type</label><select id="scKind">${KINDS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
          <div class="field"><label for="scBrief">Ce que tu veux travailler <span class="optional">facultatif</span></label><input id="scBrief" maxlength="300" placeholder="Un client mécontent qui veut se faire rembourser sans ticket" /></div></div>
          <div class="row-btns"><button class="btn">${d.ic('sparkle')}Concevoir</button></div><p class="hint" id="scMsg" role="status"></p></form>
        <div id="scDraft"></div></section>
      <section class="sec org-learn"><h2>Scénarios <small class="num">${scs.length}</small></h2>
        ${scs.length ? `<ul class="org-list sc-list">${scs.map((s) => { const vv = verOf(s), pub = vv.find((v) => v.status === 'valide'), draft = vv.find((v) => v.status === 'brouillon');
          return `<li><span><b>${d.esc(s.title)}</b><small>${(KINDS.find((k) => k[0] === s.kind) || ['', s.kind])[1]} · ${s.status === 'publie' ? `publié (version ${pub ? pub.version : s.current_version})` : s.status === 'archive' ? 'archivé' : 'brouillon'}</small></span>
            <span class="row-btns">${draft ? `<button type="button" class="btn ghost sm" data-review="${draft.id}">Relire</button>` : ''}${pub ? `<button type="button" class="btn ghost sm" data-play="${pub.id}">Jouer</button>` : ''}</span></li>`; }).join('')}</ul>` : '<p class="hint">Aucun scénario pour l’instant.</p>'}
      </section>`;
    app.querySelector('#scForm').onsubmit = async (e) => {
      e.preventDefault();
      const msg = app.querySelector('#scMsg'); msg.textContent = 'Conception du scénario…';
      try { const r = await srv({ task: 'scenario_concevoir', org: o.id, kind: app.querySelector('#scKind').value, brief: app.querySelector('#scBrief').value.trim() }, (m) => { msg.textContent = m; });
        msg.textContent = ''; review(app, o, head, r.version, r.spec, r.title); }
      catch (x) { msg.textContent = x.message; }
    };
    app.querySelectorAll('[data-review]').forEach((b) => { b.onclick = async () => { try { const spec = await rpc('scenario_spec', { p_version: b.dataset.review }); review(app, o, head, b.dataset.review, spec, b.closest('li').querySelector('b').textContent); } catch (x) { d.toast(x.message, 'error'); } }; });
    app.querySelectorAll('[data-play]').forEach((b) => { b.onclick = () => play(app, o, head, b.dataset.play); });
  }
  // Relecture humaine : tout ce que le personnage sait et tout ce qui sera évalué est montré avant la publication
  function review(app, o, head, version, spec, title) {
    const box = app.querySelector('#scDraft');
    const li = (arr, f) => (arr && arr.length ? `<ul>${arr.map(f).join('')}</ul>` : '<p class="hint">Aucun.</p>');
    box.innerHTML = `<article class="sc-card glass"><h3>${d.esc(title)}</h3>
      <dl class="sc-spec"><dt>Contexte</dt><dd>${d.esc(spec.context || '')}</dd><dt>Objectif</dt><dd>${d.esc(spec.objective || '')}</dd>
      <dt>La personne joue</dt><dd>${d.esc(spec.role_label || '')}</dd><dt>Arbor joue</dt><dd>${d.esc(spec.name || '')}, ${d.esc(spec.role_play || '')}</dd>
      <dt>Enjeu caché</dt><dd>${d.esc(spec.need || '')}</dd></dl>
      <h4>Objections</h4>${li(spec.objections, (x) => `<li>${d.esc(x.text || x)}</li>`)}
      <h4>Contraintes</h4>${li(spec.constraints, (x) => `<li>${d.esc(x)}</li>`)}
      <h4>Événements</h4>${li(spec.events, (x) => `<li>Au tour ${x.turn} : ${d.esc(x.text)}</li>`)}
      <h4>Grille de comportements</h4>${li(spec.rubric || [], (x) => `<li>${d.esc(x.label)}</li>`)}
      <h4>Connaissances mobilisées</h4>${li(spec.knowledge || [], (x) => `<li>${d.esc(x.title || x)}</li>`)}
      <div class="row-btns"><button type="button" class="btn ghost" id="scTest">${d.ic('play')}Tester</button><button type="button" class="btn" id="scPub">${d.ic('seal-check')}Publier</button></div>
      <p class="hint">Publier rend le scénario jouable par l’équipe. La version précédente reste dans l’historique.</p></article>`;
    box.querySelector('#scTest').onclick = () => play(app, o, head, version);
    box.querySelector('#scPub').onclick = async () => { try { await rpc('publish_scenario_version', { p_version: version }); d.toast('Scénario publié', 'success'); scenariosView(app, o, head, d); } catch (x) { d.toast(x.message, 'error'); } };
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  async function play(app, o, head, version) {
    try { const s = await srv({ task: 'scenario_start', org: o.id, version }); OrgLearn.chat(app, o, head, s, [{ role: 'client', text: s.opening }]); }
    catch (x) { d.toast(x.message, 'error'); }
  }
  // Liste des scénarios publiés, proposée sur l'écran « Client mystère » à chaque membre
  async function publishedList(box, o, head, app, deps) {
    d = deps;
    let scs = [], vs = [];
    try { [scs, vs] = await Promise.all([rest('/rest/v1/scenarios', { method: 'GET', query: `?org_id=eq.${q(o.id)}&status=eq.publie&select=id,title,kind` }),
      rest('/rest/v1/scenario_versions', { method: 'GET', query: `?org_id=eq.${q(o.id)}&status=eq.valide&select=id,scenario_id` })]); }
    catch (e) { return; } // base sans 008 : seule la simulation improvisée est proposée
    const rows = scs.map((s) => ({ s, v: vs.find((v) => v.scenario_id === s.id) })).filter((x) => x.v);
    if (!rows.length) return;
    box.innerHTML = `<h3>Scénarios de ton équipe</h3><ul class="org-list">${rows.map(({ s, v }) => `<li><span><b>${d.esc(s.title)}</b><small>${(KINDS.find((k) => k[0] === s.kind) || ['', ''])[1]}</small></span><button type="button" class="btn sm" data-play="${v.id}">${d.ic('play', true)}Jouer</button></li>`).join('')}</ul>`;
    box.querySelectorAll('[data-play]').forEach((b) => { b.onclick = () => play(app, o, head, b.dataset.play); });
  }

  /* ---------- Live Policy Watchdog (page d'un document) ---------- */
  const CH = { inchange: ['Inchangée', 'check'], reformule: ['Reformulée', 'pencil-simple'], modifie: ['Modifiée', 'warning'], supprime: ['Supprimée', 'minus-circle'], nouveau: ['Nouvelle', 'plus-circle'] };
  async function watchdog(box, o, sourceId, deps) {
    d = deps;
    let chs = [];
    try { chs = await rest('/rest/v1/policy_changes', { method: 'GET', query: `?source_id=eq.${q(sourceId)}&select=id,status,summary,created_at,to_version_id&order=created_at.desc&limit=5` }); }
    catch (e) { box.innerHTML = ''; return; }
    if (!chs.length) { box.innerHTML = ''; return; }
    const ch = chs[0];
    let items = [], imp = null;
    try { [items, imp] = await Promise.all([rest('/rest/v1/policy_change_items', { method: 'GET', query: `?change_id=eq.${q(ch.id)}&select=*&order=change` }), rpc('policy_change_impact', { p_change: ch.id })]); }
    catch (e) { box.innerHTML = `<p class="hint">${d.esc(e.message)}</p>`; return; }
    const ks = items.filter((i) => i.knowledge_id).length ? await rest('/rest/v1/knowledge_nodes', { method: 'GET', query: `?id=in.(${items.filter((i) => i.knowledge_id).map((i) => i.knowledge_id).join(',')})&select=id,title,quote,page` }).catch(() => []) : [];
    const kOf = (id) => ks.find((k) => k.id === id) || {};
    const lead = ['admin', 'manager'].includes(o.role);
    const order = { modifie: 0, supprime: 1, nouveau: 2, reformule: 3, inchange: 4 };
    items.sort((a, b) => order[a.change] - order[b.change]);
    const s = ch.summary || {};
    const people = imp && Array.isArray(imp.people) ? imp.people : [];
    box.innerHTML = `<section class="sec wd glass"><h2>${d.ic('siren', true)}Changements de cette version</h2>
      <p class="hint">${s.modifie || 0} modifiée${(s.modifie || 0) > 1 ? 's' : ''}, ${s.supprime || 0} supprimée${(s.supprime || 0) > 1 ? 's' : ''}, ${s.nouveau || 0} nouvelle${(s.nouveau || 0) > 1 ? 's' : ''}, ${s.reformule || 0} reformulée${(s.reformule || 0) > 1 ? 's' : ''}, ${s.inchange || 0} inchangée${(s.inchange || 0) > 1 ? 's' : ''}.${s.analysed === false ? ' Analyse automatique indisponible : chaque changement est à revoir.' : ''} Rien n’est appliqué sans ta décision ; une règle sensible demande un manager ou un administrateur.</p>
      ${imp ? `<div class="wd-impact"><b>Impact</b><span>${imp.knowledge} connaissance${imp.knowledge > 1 ? 's' : ''} touchée${imp.knowledge > 1 ? 's' : ''} · ${(imp.skills || []).length} compétence${(imp.skills || []).length > 1 ? 's' : ''}${(imp.skills || []).length ? ` (${imp.skills.map((x) => d.esc(x.name)).join(', ')})` : ''} · ${(imp.scenarios || []).length} scénario${(imp.scenarios || []).length > 1 ? 's' : ''} publié${(imp.scenarios || []).length > 1 ? 's' : ''}${(imp.scenarios || []).length ? ` (${imp.scenarios.map((x) => d.esc(x.title)).join(', ')})` : ''} · ${people.length} personne${people.length > 1 ? 's' : ''} avec des preuves sur l’ancienne version</span>
        ${lead && people.length ? `<button type="button" class="btn sm" id="wdAssign">${d.ic('arrows-clockwise')}Demander une revalidation à ${people.length} personne${people.length > 1 ? 's' : ''}</button>` : ''}</div>` : ''}
      <ul class="wd-items">${items.map((i) => { const k = kOf(i.knowledge_id); const [lab, icn] = CH[i.change];
        return `<li class="wd-${i.change}${i.sensitive ? ' sens' : ''}"><div class="wd-h"><span class="wd-tag">${d.ic(icn)}${lab}</span>${i.sensitive ? `<span class="wd-tag s">${d.ic('shield-warning', true)}Sensible</span>` : ''}<b>${d.esc(i.new_title || k.title || '')}</b></div>
          ${i.change !== 'nouveau' && k.quote ? `<p class="${i.change === 'inchange' ? 'wd-same' : 'wd-old'}"><small>${i.change === 'inchange' ? 'Texte' : 'Avant'}</small>« ${d.esc(k.quote)} »</p>` : ''}
          ${i.new_quote && i.change !== 'inchange' ? `<p class="wd-new"><small>Maintenant${i.new_page ? ` · p. ${i.new_page}` : ''}</small>« ${d.esc(i.new_quote)} »</p>` : ''}
          ${i.explanation && i.change !== 'inchange' ? `<p class="hint">${d.esc(i.explanation)}</p>` : ''}
          ${i.decision === 'a_valider' ? (i.sensitive && !lead ? `<p class="hint">${d.ic('lock-simple')}Décision par un manager ou un administrateur.</p>`
            : `<div class="row-btns"><button type="button" class="btn sm" data-dec="${i.id}" data-v="accepte">${d.ic('check')}${i.change === 'supprime' ? 'Confirmer la suppression' : 'Accepter'}</button><button type="button" class="btn ghost sm" data-dec="${i.id}" data-v="rejete">${d.ic('x')}Rejeter</button></div>`)
            : `<p class="hint">${i.decision === 'accepte' ? 'Accepté' : 'Rejeté'}${i.decided_at ? ` le ${fmt(i.decided_at)}` : ''}</p>`}</li>`; }).join('')}</ul></section>`;
    box.querySelectorAll('[data-dec]').forEach((b) => { b.onclick = async () => { b.disabled = true; try { await rpc('decide_change_item', { p_item: b.dataset.dec, p_decision: b.dataset.v }); watchdog(box, o, sourceId, d); } catch (x) { d.toast(x.message, 'error'); b.disabled = false; } }; });
    const as = box.querySelector('#wdAssign');
    if (as) as.onclick = async () => {
      const kids = items.filter((i) => ['modifie', 'supprime', 'reformule'].includes(i.change)).map((i) => i.new_knowledge_id || i.knowledge_id).filter(Boolean);
      try { const n = await rpc('assign_learning_actions', { p_org: o.id, p_users: people, p_kind: 'revalidation', p_reason: 'Le document a changé : ta preuve porte sur l’ancienne version.', p_knowledge: kids, p_change: ch.id });
        d.toast(`Revalidation demandée à ${n} personne${n > 1 ? 's' : ''}`, 'success'); as.disabled = true; }
      catch (x) { d.toast(x.message, 'error'); }
    };
  }

  /* ---------- Graphe : relations entre connaissances ---------- */
  const REL = { prerequis: 'est un prérequis de', partie_de: 'fait partie de', precise: 'précise', exemple_de: 'est un exemple de', contredit: 'contredit', confusion_frequente: 'se confond souvent avec', remplace: 'remplace' };
  async function relations(box, o, deps) {
    d = deps;
    let es = [], ks = [];
    try { [es, ks] = await Promise.all([rest('/rest/v1/knowledge_edges', { method: 'GET', query: `?org_id=eq.${q(o.id)}&select=id,from_id,to_id,relation,status,method,note&order=created_at.desc&limit=200` }),
      rest('/rest/v1/knowledge_nodes', { method: 'GET', query: `?org_id=eq.${q(o.id)}&status=eq.valide&select=id,title&limit=1000` })]); }
    catch (e) { box.innerHTML = ''; return; }
    const t = (id) => (ks.find((k) => k.id === id) || {}).title || 'Connaissance';
    const can = ['admin', 'manager', 'expert'].includes(o.role);
    box.innerHTML = `<section class="sec"><h2>Relations entre connaissances <small class="num">${es.filter((e) => e.status === 'valide').length}</small></h2>
      <p class="hint">Prérequis, confusions fréquentes, précisions : elles servent à proposer le bon prérequis quand une erreur revient. Arbor les propose, un humain les valide.</p>
      ${can ? `<div class="row-btns"><button type="button" class="btn ghost sm" id="relGo" ${ks.length >= 3 ? '' : 'disabled'}>${d.ic('graph')}Proposer des relations</button></div><p class="hint" id="relMsg" role="status"></p>` : ''}
      ${es.length ? `<ul class="org-list rel-list">${es.filter((e) => e.status !== 'rejete').map((e) => `<li class="rel-${e.status}"><span><b>${d.esc(t(e.from_id))}</b> ${REL[e.relation]} <b>${d.esc(t(e.to_id))}</b>${e.note ? `<small>${d.esc(e.note)}</small>` : ''}</span>
        ${e.status === 'propose' && can ? `<span class="row-btns"><button type="button" class="btn sm" data-edge="${e.id}" data-s="valide">${d.ic('check')}Valider</button><button type="button" class="icon-btn sm" data-edge="${e.id}" data-s="rejete" aria-label="Rejeter">${d.ic('x')}</button></span>` : `<small>${e.status === 'valide' ? 'validée' : 'proposée'}</small>`}</li>`).join('')}</ul>` : ''}</section>`;
    const go = box.querySelector('#relGo');
    if (go) go.onclick = async () => { const m = box.querySelector('#relMsg'); m.textContent = 'Analyse des connaissances validées…'; try { const r = await srv({ task: 'relations', org: o.id }, (x) => { m.textContent = x; }); m.textContent = `${r.proposed} relation${r.proposed > 1 ? 's' : ''} proposée${r.proposed > 1 ? 's' : ''}.`; relations(box, o, d); } catch (x) { m.textContent = x.message; } };
    box.querySelectorAll('[data-edge]').forEach((b) => { b.onclick = async () => { try { await rpc('set_edge_status', { p_id: b.dataset.edge, p_status: b.dataset.s }); relations(box, o, d); } catch (x) { d.toast(x.message, 'error'); } }; });
  }

  /* ---------- Mon parcours (collaborateur) ---------- */
  const ST = { acquise: ['Acquise', 'seal-check'], validation_humaine: ['Validation au poste attendue', 'user-check'], en_cours: ['En cours', 'plant'], a_faire: ['À commencer', 'circle-dashed'], sans_connaissance: ['Sans connaissance liée', 'question'] };
  async function pathway(box, o, deps, evs, ks) {
    d = deps;
    const me = Tutor.userId();
    let skills = [], links = [], su = [], actions = [], mine = [], edges = [];
    try {
      [skills, links, su, actions, mine, edges] = await Promise.all([
        rest('/rest/v1/skills', { method: 'GET', query: `?org_id=eq.${q(o.id)}&select=id,name,description,importance` }).catch(() => rest('/rest/v1/skills', { method: 'GET', query: `?org_id=eq.${q(o.id)}&select=id,name,description` })),
        rest('/rest/v1/skill_knowledge', { method: 'GET', query: `?org_id=eq.${q(o.id)}&select=skill_id,knowledge_id` }),
        rest('/rest/v1/skill_units', { method: 'GET', query: `?org_id=eq.${q(o.id)}&select=skill_id,unit_id` }).catch(() => []),
        rest('/rest/v1/learning_actions', { method: 'GET', query: `?org_id=eq.${q(o.id)}&user_id=eq.${q(me)}&select=id,kind,reason,status,due,created_at&order=created_at.desc` }).catch(() => []),
        rest('/rest/v1/memberships', { method: 'GET', query: `?org_id=eq.${q(o.id)}&user_id=eq.${q(me)}&select=*` }).catch(() => []),
        rest('/rest/v1/knowledge_edges', { method: 'GET', query: `?org_id=eq.${q(o.id)}&status=eq.valide&relation=eq.prerequis&select=from_id,to_id` }).catch(() => []),
      ]);
    } catch (e) { box.innerHTML = `<p class="hint">${d.esc(e.message)}</p>`; return; }
    const unit = mine[0] && mine[0].unit_id;
    const kT = new Map(ks.map((k) => [k.id, k.title]));
    const prereq = (kid, items) => edges.filter((e) => e.to_id === kid).map((e) => e.from_id).filter((id) => !(items.find((x) => x.knowledge.id === id && x.level >= 3))).map((id) => kT.get(id)).filter(Boolean);
    const pw = OrgInsight.pathway(me, evs, ks, skills, links, su, unit, actions, { prereq });
    box.innerHTML = `<section class="sec org-learn pw"><h2>Mon parcours <small class="num">${pw.done}/${pw.total}</small></h2>
      ${pw.plan.length ? `<ol class="pw-plan">${pw.plan.map((a) => `<li>${d.ic(a.icon, true)}<span><b>${d.esc(a.label)}${a.item ? ` : ${d.esc(a.item.title)}` : ''}</b><small>${d.esc(a.reason)}</small></span></li>`).join('')}</ol>` : '<p class="hint">Rien d’urgent : continue à t’entraîner, la suite viendra de tes preuves.</p>'}
      ${actions.filter((a) => a.status === 'a_faire').length ? `<h3>Demandé par ton responsable</h3><ul class="org-list">${actions.filter((a) => a.status === 'a_faire').map((a) => `<li><span><b>${d.esc(a.reason)}</b><small>${a.due ? `avant le ${fmt(a.due)}` : `depuis le ${fmt(a.created_at)}`}</small></span><button type="button" class="btn ghost sm" data-done="${a.id}">${d.ic('check')}Fait</button></li>`).join('')}</ul>` : ''}
      <h3>Compétences du poste</h3>
      ${pw.skills.length ? `<ul class="pw-skills">${pw.skills.map((s) => `<li class="pw-${s.status}"><div class="pw-h">${d.ic(ST[s.status][1], true)}<b>${d.esc(s.skill.name)}</b><span class="pw-st">${ST[s.status][0]}</span></div>
        <ul>${s.knowledge.map((k) => `<li><span>${d.esc((k.knowledge || {}).title || '')}</span>${LEVEL_PILL(k.level)}</li>`).join('')}</ul>${s.sensitive ? `<p class="hint">${d.ic('shield-check')}Règle de sécurité ou réglementaire : une validation par un responsable reste nécessaire, quel que soit le résultat d’une simulation.</p>` : ''}</li>`).join('')}</ul>` : '<p class="hint">Ton responsable n’a pas encore défini les compétences attendues.</p>'}
      <details class="pw-levels"><summary>Que veulent dire les niveaux ?</summary><ol>${Object.entries(Evidence.LEVELS).map(([n, l]) => `<li><b>${n}. ${l.label}</b> : ${l.why}</li>`).join('')}</ol><p class="hint">Une explication personnelle reste au niveau 1. Une réussite unique ne prouve pas une maîtrise durable.</p></details>
      </section>
      <section class="sec"><h2>Mes données dans ${d.esc(o.name)}</h2>
        <p class="hint">Ce que l’organisation a enregistré sur ton apprentissage (réponses, simulations, actions), et rien de ton espace personnel.</p>
        <div class="row-btns"><button type="button" class="btn ghost sm" id="myExport">${d.ic('download-simple')}Télécharger mes données</button><button type="button" class="btn danger sm" id="myErase">${d.ic('trash')}Effacer mes données d’apprentissage</button></div></section>`;
    box.querySelectorAll('[data-done]').forEach((b) => { b.onclick = async () => { try { await rpc('set_action_status', { p_id: b.dataset.done, p_status: 'fait' }); b.closest('li').remove(); } catch (x) { d.toast(x.message, 'error'); } }; });
    box.querySelector('#myExport').onclick = async () => {
      try { const data = await rpc('export_my_org_data', { p_org: o.id });
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = `arbor-${o.name.replace(/[^\w-]+/g, '-').toLowerCase()}-mes-donnees.json`; a.click(); }
      catch (x) { d.toast(missing(x) ? 'Fonction disponible après la mise à jour de la base.' : x.message, 'error'); }
    };
    box.querySelector('#myErase').onclick = async () => {
      if (!confirm(`Effacer définitivement tes réponses, simulations et actions dans ${o.name} ? Ton appartenance à l’organisation reste ; ce n’est pas réversible.`)) return;
      try { const r = await rpc('erase_my_org_data', { p_org: o.id }); d.toast(`${r.evidence} preuve${r.evidence > 1 ? 's' : ''} et ${r.simulations} simulation${r.simulations > 1 ? 's' : ''} effacées`, 'success'); d.go(`#/org/${o.id}`); }
      catch (x) { d.toast(x.message, 'error'); }
    };
  }

  /* ---------- Radar des angles morts et validation humaine (managers) ---------- */
  const SEV = { elevee: 'Gravité élevée', moyenne: 'Gravité moyenne', faible: 'Gravité faible' };
  function radar(box, o, deps, evs, ks, ms) {
    d = deps;
    const r = OrgInsight.radar(evs, ks, ms);
    const email = (u) => (ms.find((m) => m.user_id === u) || {}).email || 'membre';
    const L = r.limits;
    box.innerHTML = `<section class="sec org-learn radar"><h2>${d.ic('radar', true)}Radar des angles morts</h2>
      <p class="hint">Analyse sur ${L.evidence} observation${L.evidence > 1 ? 's' : ''}, ${L.people} personne${L.people > 1 ? 's' : ''} observée${L.people > 1 ? 's' : ''} sur ${L.members} (couverture ${Math.round(L.coverage * 100)} %)${L.from ? `, du ${fmt(L.from)} au ${fmt(L.to)}` : ''}. Une connaissance n’apparaît qu’à partir de ${L.minObs} observations et ${L.minPeople} personnes. Une affirmation non documentée n’est pas comptée comme une erreur. Ce sont des signaux à vérifier, pas un jugement des personnes.</p>
      ${r.blind.length ? `<ul class="radar-list">${r.blind.slice(0, 8).map((x) => `<li class="sev-${x.severity}"><div class="rd-h"><span class="rd-sev">${SEV[x.severity]}</span><b>${d.esc(x.knowledge.title)}</b></div>
        <p>${x.wrong} erreur${x.wrong > 1 ? 's' : ''}${x.partial ? `, ${x.partial} réponse${x.partial > 1 ? 's' : ''} incomplète${x.partial > 1 ? 's' : ''}` : ''} sur ${x.n} observation${x.n > 1 ? 's' : ''} (${Math.round(x.rate * 100)} %)${x.falseCert ? `, dont ${x.falseCert} fausse${x.falseCert > 1 ? 's' : ''} certitude${x.falseCert > 1 ? 's' : ''}` : ''} · ${x.people} personne${x.people > 1 ? 's' : ''} observée${x.people > 1 ? 's' : ''} (${Math.round(x.coverage * 100)} % de l’équipe) · confiance ${x.confidence}${x.knowledge.page ? ` · source p. ${x.knowledge.page}` : ''}</p>
        <p class="rd-act">${d.ic('lightbulb')}${d.esc(x.action)}</p>
        ${x.wrongPeople.length ? `<button type="button" class="btn ghost sm" data-assign="${x.knowledge.id}" data-people="${x.wrongPeople.join(',')}">${d.ic('arrows-clockwise')}Proposer une activité corrective à ${x.wrongPeople.length} personne${x.wrongPeople.length > 1 ? 's' : ''}</button>` : ''}</li>`).join('')}</ul>`
        : `<p class="empty-note">${d.ic('info')}Aucun angle mort confirmé${r.insufficient ? ` ; ${r.insufficient} connaissance${r.insufficient > 1 ? 's' : ''} avec des erreurs, mais un échantillon trop petit pour conclure` : ''}.</p>`}</section>`;
    box.querySelectorAll('[data-assign]').forEach((b) => { b.onclick = async () => {
      try { const n = await rpc('assign_learning_actions', { p_org: o.id, p_users: b.dataset.people.split(','), p_kind: 'revoir', p_reason: `Activité corrective : « ${b.closest('li').querySelector('b').textContent} »`, p_knowledge: [b.dataset.assign] });
        d.toast(`Activité proposée à ${n} personne${n > 1 ? 's' : ''}`, 'success'); b.disabled = true; }
      catch (x) { d.toast(missing(x) ? 'Fonction disponible après la mise à jour de la base.' : x.message, 'error'); }
    }; });
    void email;
  }
  async function humanValidation(box, o, deps, userId) {
    d = deps;
    let skills = [];
    try { skills = await rest('/rest/v1/skills', { method: 'GET', query: `?org_id=eq.${q(o.id)}&select=id,name&order=name` }); } catch (e) { return; }
    if (!skills.length || userId === Tutor.userId()) { box.innerHTML = ''; return; }
    box.innerHTML = `<section class="sec"><h2>${d.ic('user-check', true)}Validation au poste</h2>
      <p class="hint">Tu as observé cette personne en situation réelle ? Ta validation est une preuve forte, distincte des simulations. Elle est enregistrée à ton nom.</p>
      <form class="obz-form" id="hvForm"><div class="obz-two"><div class="field"><label for="hvSkill">Compétence</label><select id="hvSkill">${skills.map((s) => `<option value="${s.id}">${d.esc(s.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="hvOut">Résultat</label><select id="hvOut"><option value="juste">Maîtrisée</option><option value="partiel">Partiellement</option><option value="faux">Non maîtrisée</option><option value="insuffisant">Pas assez observée pour conclure</option></select></div></div>
      <div class="field"><label for="hvNote">Ce que tu as observé</label><input id="hvNote" maxlength="400" placeholder="Service du midi : a appliqué la procédure allergènes sans aide" /></div>
      <div class="row-btns"><button class="btn sm">${d.ic('check')}Enregistrer</button></div></form></section>`;
    box.querySelector('#hvForm').onsubmit = async (e) => {
      e.preventDefault();
      try { await rpc('record_human_validation', { p_org: o.id, p_user: userId, p_outcome: box.querySelector('#hvOut').value, p_note: box.querySelector('#hvNote').value.trim(), p_skill: box.querySelector('#hvSkill').value });
        d.toast('Validation enregistrée', 'success'); box.querySelector('#hvNote').value = ''; }
      catch (x) { d.toast(missing(x) ? 'Fonction disponible après la mise à jour de la base.' : x.message, 'error'); }
    };
  }

  /* ---------- Invitation : envoi par e-mail (serveur) ; conservation des données ---------- */
  async function emailInvite(out, o, email, token, deps) {
    d = deps;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn sm'; b.innerHTML = `${d.ic('paper-plane-tilt')}Envoyer par e-mail`;
    (out.querySelector('.row-btns:last-child') || out).appendChild(b);
    b.onclick = async () => {
      b.disabled = true;
      try {
        const inv = (await rest('/rest/v1/invitations', { method: 'GET', query: `?org_id=eq.${q(o.id)}&email=eq.${q(email)}&accepted_at=is.null&select=id,created_at&order=created_at.desc&limit=1` }))[0];
        if (!inv) throw new Error('invitation introuvable');
        await srv({ task: 'invitation_envoyer', org: o.id, invitation: inv.id, token });
        d.toast(`Invitation envoyée à ${email}`, 'success'); b.innerHTML = `${d.ic('check')}Envoyée`;
      } catch (x) { b.disabled = false; d.toast(/non configuré/.test(x.message) ? 'L’envoi par e-mail n’est pas encore configuré : partage le lien.' : x.message, 'error'); }
    };
  }
  async function retention(box, o, deps) {
    d = deps;
    if (o.role !== 'admin') return;
    let row = null;
    try { [row] = await rest('/rest/v1/organizations', { method: 'GET', query: `?id=eq.${q(o.id)}&select=retention_days` }); } catch (e) { return; }
    if (!row || row.retention_days == null) return;
    box.innerHTML = `<section class="sec"><h2>Conservation des données</h2><p class="hint">Les conversations de simulation sont effacées après ce délai (le débrief et les preuves restent, pour le suivi). Chaque collaborateur peut télécharger ou effacer ses propres données.</p>
      <form class="row-btns" id="retForm"><label for="retDays" class="sr-only">Durée</label><select id="retDays">${[90, 180, 365, 730].map((n) => `<option value="${n}" ${row.retention_days === n ? 'selected' : ''}>${n} jours</option>`).join('')}</select><button class="btn ghost sm">Enregistrer</button></form></section>`;
    box.querySelector('#retForm').onsubmit = async (e) => { e.preventDefault(); try { await rpc('set_retention', { p_org: o.id, p_days: Number(box.querySelector('#retDays').value) }); d.toast('Durée enregistrée', 'success'); } catch (x) { d.toast(x.message, 'error'); } };
  }

  window.OrgEngines = { scenariosView, publishedList, watchdog, relations, pathway, radar, humanValidation, emailInvite, retention };
})();
