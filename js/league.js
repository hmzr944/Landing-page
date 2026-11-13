/* Arbor League « Faire grandir les talents » (docs/business-v2.md, A5 ; migration 011).
   Tout ce qui est affiché vient de la base : rang et trophées calculés par le serveur à partir des preuves
   (my_league, league_board). Le navigateur ne calcule ni n'envoie aucun score.
   Double voile : la personne voit ses trophées avec leur preuve ; l'équipe voit rangs, trophées, cordées et défis,
   jamais une erreur ni une confiance. */
(function () {
  let d = null;
  const q = (s) => encodeURIComponent(s);
  const rest = (path, query) => Tutor.rest(path, { method: 'GET', query });
  const rpc = (name, body) => Tutor.rest(`/rest/v1/rpc/${name}`, { body });
  const soft = (p, dflt = null) => p.catch(() => dflt);
  const fmt = (t) => (t ? new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '');
  const plural = (n, one, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
  const missing = (e) => /could not find|PGRST20[25]|does not exist|42883/i.test(String(e && e.message));
  const needs011 = (what) => `<p class="empty-note">${d.ic('info')}${what} sera disponible après la mise à jour de la base (migration 011).</p>`;

  const RANKS = {
    1: { label: 'Graine', icon: 'circle-half', why: 'Le point de départ.' },
    2: { label: 'Pousse', icon: 'plant', why: 'Une première connaissance appliquée en situation.' },
    3: { label: 'Arbuste', icon: 'tree', why: 'Trois connaissances appliquées, dont une maîtrisée dans la durée.' },
    4: { label: 'Arbre', icon: 'tree-evergreen', why: 'Six appliquées, trois durables, une transférée à un autre contexte.' },
    5: { label: 'Canopée', icon: 'tree-palm', why: 'Une maîtrise large, durable et transférée.' },
  };
  const TROPHIES = {
    premiere_pousse: { name: 'Première pousse', icon: 'plant', rule: 'Appliquer une connaissance en situation (simulation ou poste).' },
    maitre_terrain: { name: 'Maître du terrain', icon: 'compass', rule: 'Appliquer la même connaissance dans deux contextes différents.' },
    feuille_or: { name: 'Feuille d’or', icon: 'leaf', rule: 'Réussir une connaissance à au moins 7 jours d’écart, dont au moins une application.' },
    resilience: { name: 'Feuille de résilience', icon: 'arrow-u-up-right', rule: 'Après une erreur, réussir plus tard l’application de cette connaissance.' },
    arbre_savoir: { name: 'Arbre de savoir', icon: 'tree-structure', rule: 'Obtenir trois feuilles d’or.' },
    mentor: { name: 'Mentor', icon: 'hand-heart', rule: 'Accompagner quelqu’un jusqu’à ce qu’il applique la connaissance.' },
    defi_releve: { name: 'Défi relevé', icon: 'mountains', rule: 'Votre cordée atteint l’objectif d’un défi de saison.' },
  };
  const TROPHY_NAMES = Object.fromEntries(Object.entries(TROPHIES).map(([k, t]) => [k, t.name]));
  const ACT = { simulation: 'en simulation', diagnostic: 'au diagnostic', validation_humaine: 'validée au poste', revalidation: 'en revalidation' };

  /* L'arbre : il ne grandit qu'avec des preuves (rang, connaissances appliquées, feuilles d'or) */
  function treeSvg({ rank = 1, applied = 0, durable = 0 }, size = 220) {
    const trunk = [0, 18, 46, 74, 96, 112][rank];
    const leaves = Math.min(applied, 28), gold = Math.min(durable, leaves);
    const pts = [];
    for (let i = 0; i < leaves; i++) { // spirale régulière : même nombre de preuves, même arbre
      const a = i * 2.39996, r = 10 + 7 * Math.sqrt(i + 1) * (0.7 + rank * 0.12);
      pts.push([110 + Math.cos(a) * r * 1.25, 196 - trunk - 6 + Math.sin(a) * r * 0.85]);
    }
    return `<svg class="lg-tree r${rank}" viewBox="0 0 220 220" width="${size}" height="${size}" role="img" aria-label="Arbre de progression : rang ${RANKS[rank].label}, ${plural(applied, 'connaissance appliquée', 'connaissances appliquées')}">
      <ellipse cx="110" cy="204" rx="${40 + rank * 10}" ry="7" class="lg-ground"/>
      ${rank === 1 && !applied ? '<ellipse cx="110" cy="196" rx="11" ry="8" class="lg-seed"/>' : `<path class="lg-trunk" d="M106 204 C107 ${204 - trunk * 0.6} 104 ${204 - trunk * 0.8} 108 ${204 - trunk} L112 ${204 - trunk} C116 ${204 - trunk * 0.8} 113 ${204 - trunk * 0.6} 114 204 Z"/>`}
      ${pts.map(([x, y], i) => `<circle class="lg-leaf ${i < gold ? 'gold' : ''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(7 + rank).toFixed(1)}" style="--i:${i}"/>`).join('')}
    </svg>`;
  }
  const rankChip = (rank) => `<span class="lg-rank r${rank}">${d.ic(RANKS[rank].icon, true)}${RANKS[rank].label}</span>`;

  async function mine(o) { return rpc('my_league', { p_org: o.id }); }
  async function board(o) { return rpc('league_board', { p_org: o.id }); }

  /* ---------- Accueil collaborateur : orienté action ---------- */
  async function home(app, o, head, deps) {
    d = deps;
    app.innerHTML = `${head}<section class="sec"><p class="hint">Chargement…</p></section>`;
    const me = Tutor.userId();
    const [lg, acts, evs, ks, revals] = await Promise.all([
      soft(mine(o)), soft(rest('/rest/v1/learning_actions', `?org_id=eq.${q(o.id)}&user_id=eq.${q(me)}&status=eq.a_faire&select=id,kind,reason,due,created_at&order=created_at`), []),
      soft(rest('/rest/v1/evidence_events', `?org_id=eq.${q(o.id)}&user_id=eq.${q(me)}&select=knowledge_id,activity,outcome,level,context,at&order=at.desc&limit=200`), []),
      soft(rest('/rest/v1/knowledge_nodes', `?org_id=eq.${q(o.id)}&select=id,title,kind,status&limit=2000`), []),
      soft(rest('/rest/v1/skill_revalidations', `?org_id=eq.${q(o.id)}&user_id=eq.${q(me)}&status=eq.requires_revalidation&select=reason,created_at`), []),
    ]);
    const kT = new Map((ks || []).map((k) => [k.id, k.title]));
    // une mission n'existe que si elle est réelle : demandée par un responsable, ou née d'un changement de procédure
    const mission = (acts && acts[0]) ? { t: acts[0].reason, s: acts[0].due ? `avant le ${fmt(acts[0].due)}` : 'demandée par ton responsable' }
      : (revals && revals[0]) ? { t: revals[0].reason, s: 'une règle a changé : une réussite sur la nouvelle version suffit' } : null;
    const last = (evs || []).find((e) => e.knowledge_id);
    const rank = lg ? lg.rank : 1;
    const recent = lg ? (lg.awards || []).slice(0, 3) : [];
    app.innerHTML = `${head}
      <section class="sec lg-home">
        <div class="lg-home-hero">
          <div class="lg-home-tree">${treeSvg(lg || {}, 132)}</div>
          <div><p class="hint">Ta progression</p><h2>${lg ? rankChip(rank) : 'Bienvenue'}</h2>
            <p>${lg ? `${plural(lg.applied, 'connaissance appliquée', 'connaissances appliquées')}${lg.durable ? `, ${plural(lg.durable, 'maîtrisée', 'maîtrisées')} dans la durée` : ''}.` : 'Tes réussites feront grandir ton arbre.'}</p>
            <div class="row-btns">${lg ? `<a class="btn" href="#/org/${o.id}/canopee">${d.ic('tree', true)}Ma Canopée</a>` : ''}<a class="btn ghost" href="#/org/${o.id}/apprendre">${d.ic('compass')}Explorer</a></div></div>
        </div>
      </section>
      ${mission ? `<section class="sec lg-mission">${d.ic('flag-banner', true)}<div><p class="hint">Ta mission</p><b>${d.esc(mission.t)}</b><small>${d.esc(mission.s)}</small></div><a class="btn" href="#/org/${o.id}/resultats">Commencer</a></section>` : ''}
      <div class="hub-cols">
        <section class="sec"><h3>${d.ic('book-open-text', true)}Dernier apprentissage</h3>
          ${last ? `<p><b>${d.esc(kT.get(last.knowledge_id) || 'Une connaissance')}</b><br><small class="hint">${ACT[last.activity] || last.activity}, le ${fmt(last.at)}</small></p>` : `<p class="hint">Pas encore commencé. <a href="#/org/${o.id}/apprendre/epreuve">Un premier diagnostic</a> montre par où commencer.</p>`}</section>
        <section class="sec"><h3>${d.ic('trophy', true)}Trophées récents</h3>
          ${recent.length ? `<ul class="lg-mini">${recent.map((a) => `<li>${d.ic(TROPHIES[a.trophy].icon, true)}<span><b>${TROPHIES[a.trophy].name}</b><small>${a.knowledge ? `${d.esc(a.knowledge)} · ` : ''}${fmt(a.at)}</small></span></li>`).join('')}</ul>` : `<p class="hint">${lg ? 'Ton premier trophée viendra avec ta première application réussie.' : 'Les trophées arrivent avec la mise à jour d’Arbor League.'}</p>`}</section>
      </div>
      ${window.Feedback ? `<section class="org-grid"><button type="button" class="org-card fb-card" data-org-feedback><span>${d.ic('chat-teardrop-text')}</span><div><b>Donner mon avis</b><p>Trois questions sur ton expérience, environ deux minutes.</p></div></button></section>` : ''}
      <p class="org-note">${d.ic('lock-simple')}Tes résultats t’aident à progresser. Ton espace personnel reste privé.</p>`;
  }

  /* ---------- La Canopée ---------- */
  async function canopy(app, o, head, deps) {
    d = deps;
    app.innerHTML = `${head}<section class="sec"><p class="hint">Chargement…</p></section>`;
    let lg, bd;
    try { [lg, bd] = await Promise.all([mine(o), board(o)]); }
    catch (e) { app.querySelector('.sec').innerHTML = missing(e) ? needs011('La Canopée') : `<p class="hint">${d.esc(e.message)}</p>`; return; }
    const me = Tutor.userId();
    const next = lg.next;
    const need = next ? [['connaissance appliquée', 'connaissances appliquées', next.min_applied - lg.applied], ['feuille d’or', 'feuilles d’or', next.min_durable - lg.durable], ['Maître du terrain', 'Maître du terrain', next.min_transfer - lg.transfer]].filter((x) => x[2] > 0) : [];
    const owned = {}; (lg.awards || []).forEach((a) => { (owned[a.trophy] = owned[a.trophy] || []).push(a); });
    const myCordees = (bd.cordees || []).filter((c) => (c.member_ids || []).includes(me));
    app.innerHTML = `${head}
      <section class="sec lg-canopy">
        <div class="lg-hero">
          <div class="lg-hero-tree">${treeSvg(lg, 240)}</div>
          <div class="lg-hero-tx"><p class="hint">Arbor League · Faire grandir les talents</p><h2>${rankChip(lg.rank)}</h2>
            <p>${RANKS[lg.rank].why}</p>
            <div class="lg-stats"><span><b class="num">${lg.applied}</b>appliquées</span><span><b class="num">${lg.durable}</b>durables</span><span><b class="num">${lg.transfer}</b>transférées</span></div>
            ${next ? `<p class="lg-next">${d.ic('arrow-up-right')}Vers <b>${next.label}</b> : ${need.map(([one, many, n]) => `${n} ${n > 1 ? many : one}`).join(', ')} de plus.</p>` : '<p class="lg-next">Tu as atteint le plus haut rang.</p>'}
            <details class="hub-info"><summary aria-label="Comment l’arbre grandit">${d.ic('info')}</summary><p>Ton arbre ne grandit qu’avec des preuves : chaque feuille est une connaissance appliquée en situation, chaque feuille dorée une maîtrise confirmée dans la durée. Ouvrir l’application ne le fait pas grandir, une erreur ne le fait jamais rétrécir.</p></details>
          </div>
        </div>
      </section>
      <section class="sec"><h2>Mes trophées <small class="num">${(lg.awards || []).length}</small></h2>
        <ul class="lg-trophies">${Object.entries(TROPHIES).map(([k, t]) => { const got = owned[k];
          return `<li class="${got ? 'got' : 'locked'}"><span class="lg-medal">${d.ic(t.icon, true)}</span><b>${t.name}${got && got.length > 1 ? ` <small>× ${got.length}</small>` : ''}</b>
            <small>${got ? `Obtenu le ${fmt(got[0].at)}${got[0].knowledge ? `, ${d.esc(got[0].knowledge)}` : ''}` : t.rule}</small>
            ${got && got[0].evidence ? `<details><summary>Voir la preuve</summary><p>Preuve ${ACT[got[0].evidence.activity] || got[0].evidence.activity}${got[0].evidence.context ? ` (${d.esc(got[0].evidence.context)})` : ''}, le ${fmt(got[0].evidence.at)}.</p></details>` : ''}</li>`; }).join('')}</ul>
      </section>
      <div class="hub-cols">
        <section class="sec"><h3>${d.ic('users-four', true)}Ma cordée</h3>
          ${myCordees.length ? myCordees.map((c) => `<div class="lg-cordee"><b>${d.esc(c.name)}</b><small>${plural(c.members, 'membre')} · ${plural(c.applied, 'application réussie', 'applications réussies')} ensemble · ${plural(c.trophies, 'trophée')}</small></div>`).join('') : '<p class="hint">Tu ne fais pas encore partie d’une cordée. Ton responsable en crée une lors d’un défi collectif.</p>'}</section>
        <section class="sec"><h3>${d.ic('mountains', true)}Défis de la saison</h3>
          ${bd.season ? `<p class="hint">${d.esc(bd.season.name)}, jusqu’au ${fmt(bd.season.ends_at)}</p>${(bd.challenges || []).length ? `<ul class="lg-mini">${bd.challenges.map((c) => `<li>${d.ic(c.achieved_at ? 'check-circle' : 'circle-dashed', true)}<span><b>${d.esc(c.title)}</b><small>${c.achieved_at ? `Relevé le ${fmt(c.achieved_at)}` : `${(c.knowledge || []).map((x) => d.esc(x)).join(', ')} · ${Math.round(c.target_ratio * 100)} % du groupe`}</small></span></li>`).join('')}</ul>` : '<p class="hint">Pas encore de défi cette saison.</p>'}` : '<p class="hint">Pas de saison en cours.</p>'}</section>
      </div>
      <section class="sec"><h3>${d.ic('users-three', true)}L’équipe</h3>
        <p class="hint">Rangs et trophées de chacun. Les erreurs et les résultats détaillés restent privés.</p>
        <ul class="lg-board">${(bd.members || []).map((m) => `<li class="${m.user_id === me ? 'me' : ''}"><span class="hub-av">${d.esc(m.name.slice(0, 1).toUpperCase())}</span><b>${d.esc(m.name)}</b>${rankChip(m.rank)}<small>${m.trophies.reduce((a, t) => a + t.count, 0)} ${d.ic('medal')}</small></li>`).join('')}</ul>
      </section>`;
  }

  /* ---------- Mon équipe (responsables) : cordées et mentorats ---------- */
  async function cordeesBlock(box, o, deps, bd, ms) {
    d = deps;
    if (!bd) { box.innerHTML = `<section class="sec"><h2>${d.ic('users-four', true)}Cordées</h2>${needs011('Les cordées')}</section>`; return; }
    let ments = [], ks = [];
    try { [ments, ks] = await Promise.all([rest('/rest/v1/league_mentorships', `?org_id=eq.${q(o.id)}&select=*&order=started_at.desc`), rest('/rest/v1/knowledge_nodes', `?org_id=eq.${q(o.id)}&status=eq.valide&select=id,title&order=title`)]); } catch (e) { /* listes vides */ }
    const name = (u) => ((bd.members || []).find((m) => m.user_id === u) || {}).name || 'membre';
    const kT = (id) => (ks.find((k) => k.id === id) || {}).title || 'connaissance';
    const KIND = { equipe: 'Équipe', etablissement: 'Établissement', groupe: 'Groupe', binome: 'Binôme' };
    const opts = (ms || []).map((m) => `<option value="${m.user_id}">${d.esc((m.email || 'membre').split('@')[0])}</option>`).join('');
    box.innerHTML = `<section class="sec"><header class="hub-h"><h2>${d.ic('users-four', true)}Cordées</h2><button type="button" class="btn ghost sm" id="lgCordNew">${d.ic('plus')}Nouvelle cordée</button></header>
        <p class="hint">Des petits groupes qui progressent ensemble. La réussite de chacun nourrit le groupe ; personne n’est pénalisé par le rythme d’un autre.</p>
        ${(bd.cordees || []).length ? `<ul class="lg-cords">${bd.cordees.map((c) => `<li><b>${d.esc(c.name)}</b><small>${KIND[c.kind]} · ${plural(c.members, 'membre')} · ${plural(c.applied, 'application réussie', 'applications réussies')} · ${plural(c.trophies, 'trophée')}</small></li>`).join('')}</ul>` : '<p class="hint">Aucune cordée pour l’instant.</p>'}
        <form class="obz-form lg-form" id="lgCordForm" hidden><div class="obz-two"><div class="field"><label for="lgCName">Nom</label><input id="lgCName" maxlength="80" required placeholder="Équipe du matin" /></div>
          <div class="field"><label for="lgCKind">Type</label><select id="lgCKind">${Object.entries(KIND).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div></div>
          <fieldset class="field"><legend>Membres</legend><div class="lg-pick">${(ms || []).map((m) => `<label><input type="checkbox" value="${m.user_id}" /><span>${d.esc((m.email || 'membre').split('@')[0])}</span></label>`).join('')}</div></fieldset>
          <div class="row-btns"><button class="btn sm">${d.ic('check')}Créer la cordée</button></div></form>
      </section>
      <section class="sec"><h2>${d.ic('hand-heart', true)}Mentorat</h2>
        <p class="hint">Un collaborateur qui maîtrise une connaissance en accompagne un autre. Le mentor est reconnu seulement quand la personne accompagnée applique à son tour la connaissance.</p>
        ${ments.length ? `<ul class="lg-cords">${ments.map((m) => `<li><b>${d.esc(name(m.mentor_id))} accompagne ${d.esc(name(m.mentee_id))}</b><small>${d.esc(kT(m.knowledge_id))} · ${m.status === 'reussi' ? 'réussi' : m.status === 'clos' ? 'clos' : `depuis le ${fmt(m.started_at)}`}</small></li>`).join('')}</ul>` : ''}
        <form class="obz-form lg-form" id="lgMentForm"><div class="obz-two">
          <div class="field"><label for="lgMMentor">Mentor</label><select id="lgMMentor">${opts}</select></div>
          <div class="field"><label for="lgMMentee">Accompagné</label><select id="lgMMentee">${opts}</select></div></div>
          <div class="field"><label for="lgMK">Connaissance</label><select id="lgMK">${ks.map((k) => `<option value="${k.id}">${d.esc(k.title)}</option>`).join('')}</select></div>
          <div class="row-btns"><button class="btn sm" ${ks.length && (ms || []).length > 1 ? '' : 'disabled'}>${d.ic('hand-heart')}Lancer le mentorat</button></div><p class="hint" id="lgMMsg" role="status"></p></form>
      </section>`;
    box.querySelector('#lgCordNew').onclick = () => { const f = box.querySelector('#lgCordForm'); f.hidden = !f.hidden; if (!f.hidden) box.querySelector('#lgCName').focus(); };
    box.querySelector('#lgCordForm').onsubmit = async (e) => {
      e.preventDefault();
      const members = [...box.querySelectorAll('#lgCordForm input[type="checkbox"]:checked')].map((c) => c.value);
      try { await rpc('league_save_cordee', { p_org: o.id, p_name: box.querySelector('#lgCName').value.trim(), p_kind: box.querySelector('#lgCKind').value, p_members: members });
        d.toast('Cordée créée', 'success'); cordeesBlock(box, o, d, await board(o), ms); }
      catch (x) { d.toast(x.message, 'error'); }
    };
    box.querySelector('#lgMentForm').onsubmit = async (e) => {
      e.preventDefault();
      const msg = box.querySelector('#lgMMsg');
      try { await rpc('league_start_mentorship', { p_org: o.id, p_mentor: box.querySelector('#lgMMentor').value, p_mentee: box.querySelector('#lgMMentee').value, p_knowledge: box.querySelector('#lgMK').value });
        d.toast('Mentorat lancé', 'success'); cordeesBlock(box, o, d, bd, ms); }
      catch (x) { msg.textContent = /appliqué/.test(x.message) ? 'Le mentor doit avoir lui-même appliqué cette connaissance.' : /autre personne/.test(x.message) ? 'Choisis deux personnes différentes.' : /lui-même/.test(x.message) ? 'Tu ne peux pas te désigner toi-même mentor.' : x.message; }
    };
  }

  /* ---------- Développer > Entraîner (responsables) : saisons et défis ---------- */
  async function seasonBlock(box, o, deps) {
    d = deps;
    let bd, ks = [];
    try { [bd, ks] = await Promise.all([board(o), rest('/rest/v1/knowledge_nodes', `?org_id=eq.${q(o.id)}&status=eq.valide&select=id,title&order=title`)]); }
    catch (e) { box.innerHTML = `<section class="sec"><h2>${d.ic('mountains', true)}Saisons et défis</h2>${missing(e) ? needs011('Les saisons') : `<p class="hint">${d.esc(e.message)}</p>`}</section>`; return; }
    const today = new Date().toISOString().slice(0, 10), in90 = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
    box.innerHTML = `<section class="sec"><h2>${d.ic('mountains', true)}Saisons et défis</h2>
      ${bd.season ? `<p><b>${d.esc(bd.season.name)}</b> <span class="hint">du ${fmt(bd.season.starts_at)} au ${fmt(bd.season.ends_at)}</span></p>
        ${(bd.challenges || []).length ? `<ul class="lg-mini">${bd.challenges.map((c) => `<li>${d.ic(c.achieved_at ? 'check-circle' : 'circle-dashed', true)}<span><b>${d.esc(c.title)}</b><small>${c.achieved_at ? `Relevé le ${fmt(c.achieved_at)}` : `${Math.round(c.target_ratio * 100)} % du groupe doit appliquer : ${(c.knowledge || []).map((x) => d.esc(x)).join(', ')}`}</small></span></li>`).join('')}</ul>` : '<p class="hint">Aucun défi pour cette saison.</p>'}
        <form class="obz-form lg-form" id="lgChForm"><div class="field"><label for="lgChT">Nouveau défi</label><input id="lgChT" maxlength="120" required placeholder="Toute l’équipe maîtrise les retours" /></div>
          <div class="obz-two"><div class="field"><label for="lgChK">Connaissance</label><select id="lgChK">${ks.map((k) => `<option value="${k.id}">${d.esc(k.title)}</option>`).join('')}</select></div>
          <div class="field"><label for="lgChC">Pour</label><select id="lgChC"><option value="">Toute l’organisation</option>${(bd.cordees || []).map((c) => `<option value="${c.id}">${d.esc(c.name)}</option>`).join('')}</select></div></div>
          <div class="field"><label for="lgChR">Part du groupe à atteindre</label><select id="lgChR"><option value="0.6">60 %</option><option value="0.8" selected>80 %</option><option value="1">Tout le groupe</option></select></div>
          <div class="row-btns"><button class="btn sm" ${ks.length ? '' : 'disabled'}>${d.ic('plus')}Lancer le défi</button></div></form>`
      : `<p class="hint">Une saison donne un rythme : des défis collectifs, des trophées de saison. À la fin, le score de saison repart de zéro ; trophées, compétences et preuves restent.</p>
        <form class="obz-form lg-form" id="lgSeForm"><div class="field"><label for="lgSeN">Nom de la saison</label><input id="lgSeN" maxlength="80" required placeholder="Printemps 2027" /></div>
          <div class="obz-two"><div class="field"><label for="lgSeA">Début</label><input id="lgSeA" type="date" value="${today}" required /></div><div class="field"><label for="lgSeB">Fin</label><input id="lgSeB" type="date" value="${in90}" required /></div></div>
          <div class="row-btns"><button class="btn sm">${d.ic('flag')}Ouvrir la saison</button></div></form>`}
      ${(bd.past_seasons || []).length ? `<details class="lg-past"><summary>Saisons passées</summary><ul class="hub-list">${bd.past_seasons.map((s) => `<li><b>${d.esc(s.name)}</b><small>terminée le ${fmt(s.ends_at)} · ${plural(s.achieved, 'défi relevé', 'défis relevés')}</small></li>`).join('')}</ul></details>` : ''}
    </section>`;
    const se = box.querySelector('#lgSeForm');
    if (se) se.onsubmit = async (e) => {
      e.preventDefault();
      try { await rpc('league_create_season', { p_org: o.id, p_name: box.querySelector('#lgSeN').value.trim(), p_starts: new Date(`${box.querySelector('#lgSeA').value}T00:00`).toISOString(), p_ends: new Date(`${box.querySelector('#lgSeB').value}T23:59`).toISOString() });
        d.toast('Saison ouverte', 'success'); seasonBlock(box, o, d); }
      catch (x) { d.toast(/couvre/.test(x.message) ? 'Une saison couvre déjà cette période.' : x.message, 'error'); }
    };
    const ch = box.querySelector('#lgChForm');
    if (ch) ch.onsubmit = async (e) => {
      e.preventDefault();
      try { await rpc('league_create_challenge', { p_org: o.id, p_season: bd.season.id, p_title: box.querySelector('#lgChT').value.trim(), p_knowledge: [box.querySelector('#lgChK').value], p_ratio: Number(box.querySelector('#lgChR').value), p_cordee: box.querySelector('#lgChC').value || null });
        d.toast('Défi lancé', 'success'); seasonBlock(box, o, d); }
      catch (x) { d.toast(x.message, 'error'); }
    };
  }

  window.League = { home, canopy, cordeesBlock, seasonBlock, treeSvg, RANKS, TROPHIES, TROPHY_NAMES };
})();
