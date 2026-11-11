/* Aperçu collaborateur (Employee Preview Sandbox) : un manager ou un administrateur vit le parcours d'un collaborateur
   fictif avant de le déployer : profil, compétence, parcours, diagnostic, situation simulée, débrief, progression.
   Isolation (docs/experience-architecture.md, D12) :
   - profils, réponses, preuves et progression sont fictifs et restent en mémoire (rien dans localStorage, rien en base) ;
   - les seules lectures possibles sont les compétences et connaissances VALIDÉES de l'organisation (pour un aperçu réaliste),
     sinon des données d'exemple ;
   - aucune tâche serveur, aucun e-mail, aucune invitation, aucun changement de statut : les questions, la simulation et le
     débrief sont produits ici, par des règles simples ; la progression utilise les moteurs purs (Evidence, OrgInsight) ;
   - tant que l'aperçu est ouvert, toute requête d'écriture vers la base est bloquée par une barrière (window.fetch).
   Le bandeau « Aperçu, rien n'est enregistré » distingue la simulation de la production. */
(function () {
  let d = null, S = null;
  const SB_HOST = 'supabase.co';
  const DEMO_K = [
    { id: 'sbx-k1', kind: 'regle', title: 'Délai de retour', body: 'Le client dispose de 30 jours pour rapporter un article, avec le ticket de caisse.', quote: 'Le client dispose de 30 jours pour rapporter un article, avec le ticket de caisse', page: 2 },
    { id: 'sbx-k2', kind: 'sensible', title: 'Batterie endommagée', body: 'Une batterie gonflée ou percée n’est jamais rechargée : on l’isole dans le bac prévu et on prévient le responsable.', quote: 'Une batterie gonflée ou percée n’est jamais rechargée', page: 3 },
    { id: 'sbx-k3', kind: 'produit', title: 'Autonomie de l’Alto 500', body: 'L’Alto 500 a une autonomie annoncée de 90 km en mode éco.', quote: 'Son autonomie annoncée est de 90 km en mode éco', page: 1 },
  ];
  const DEMO_SKILLS = [{ id: 'sbx-s1', name: 'Traiter un retour client', importance: 3 }, { id: 'sbx-s2', name: 'Manipuler les batteries en sécurité', importance: 3 }, { id: 'sbx-s3', name: 'Conseiller un vélo', importance: 2 }];
  const DEMO_LINKS = [{ skill_id: 'sbx-s1', knowledge_id: 'sbx-k1' }, { skill_id: 'sbx-s2', knowledge_id: 'sbx-k2' }, { skill_id: 'sbx-s3', knowledge_id: 'sbx-k3' }];
  const PERSONAS = [
    { id: 'sbx-u1', name: 'Léa', role: 'Nouvelle conseillère de vente', week: 'Première semaine', history: [] },
    { id: 'sbx-u2', name: 'Karim', role: 'Magasinier depuis 3 mois', week: 'A déjà fait le diagnostic', history: [['sbx-k1', 'juste', 'sait', 'diagnostic'], ['sbx-k2', 'faux', 'reflexe', 'diagnostic']] },
    { id: 'sbx-u3', name: 'Inès', role: 'Responsable de rayon', week: 'Expérimentée', history: [['sbx-k1', 'juste', 'reflexe', 'diagnostic'], ['sbx-k3', 'juste', 'sait', 'simulation'], ['sbx-k1', 'juste', null, 'simulation']] },
  ];
  const CONF = [['devine', 'Je devine'], ['sait', 'Je sais'], ['reflexe', 'C’est un réflexe']];

  // Barrière : pendant l'aperçu, aucune écriture vers la base ne peut partir (même par erreur d'un autre module)
  let realFetch = null;
  function guard(on) {
    if (on && !realFetch) {
      realFetch = window.fetch;
      window.fetch = function (input, init) {
        const url = String(input && input.url ? input.url : input);
        const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
        if (url.includes(SB_HOST) && method !== 'GET') { S && S.blocked++; return Promise.reject(new Error('Aperçu : aucune écriture n’est envoyée.')); }
        return realFetch.apply(this, arguments);
      };
    } else if (!on && realFetch) { window.fetch = realFetch; realFetch = null; }
  }
  // On quitte l'aperçu dès qu'on change d'écran
  window.addEventListener('hashchange', () => { if (!/\/apercu(\/|$)/.test(location.hash)) { guard(false); document.documentElement.classList.remove('in-sandbox'); } });

  const now = () => new Date().toISOString();
  const ev = (k, outcome, confidence, activity, extra = {}) => ({ user_id: S.persona.id, knowledge_id: k, activity, outcome, confidence, level: outcome === 'juste' ? (activity === 'simulation' ? 4 : 2) : null, context: activity === 'simulation' ? 'simulation:apercu' : activity, at: now(), session_id: extra.session || null, sandbox: true });
  const banner = () => `<div class="sbx-banner" role="note">${d.ic('eye', true)}<div><b>Aperçu collaborateur : simulation</b><small>Profil fictif. Rien n’est enregistré, envoyé ni modifié dans ${d.esc(S.org.name)}.</small></div><a class="btn ghost sm" href="#/org/${S.org.id}/apercu">Recommencer</a></div>`;
  const steps = [['profil', 'Profil'], ['parcours', 'Parcours'], ['diagnostic', 'Diagnostic'], ['scenario', 'Situation'], ['progression', 'Progression']];
  const stepper = (cur) => `<ol class="sbx-steps">${steps.map(([k, l], i) => `<li class="${k === cur ? 'cur' : steps.findIndex((x) => x[0] === cur) > i ? 'done' : ''}"><a href="#/org/${S.org.id}/apercu/${k}">${i + 1}. ${l}</a></li>`).join('')}</ol>`;
  const frame = (head, cur, body) => `${head}<section class="sec sbx">${banner()}${stepper(cur)}${body}</section>`;

  async function setup(o) {
    S = { org: o, persona: null, skill: null, evs: [], before: null, blocked: 0, demo: true, ks: DEMO_K, skills: DEMO_SKILLS, links: DEMO_LINKS };
    // Lecture seule des compétences et connaissances VALIDÉES (aucune donnée de personne n'est lue)
    try {
      const q = encodeURIComponent(o.id);
      const [ks, skills, links] = await Promise.all([
        Tutor.rest('/rest/v1/knowledge_nodes', { method: 'GET', query: `?org_id=eq.${q}&status=eq.valide&select=id,kind,title,body,quote,page&limit=200` }),
        Tutor.rest('/rest/v1/skills', { method: 'GET', query: `?org_id=eq.${q}&select=id,name,importance` }).catch(() => []),
        Tutor.rest('/rest/v1/skill_knowledge', { method: 'GET', query: `?org_id=eq.${q}&select=skill_id,knowledge_id` }).catch(() => []),
      ]);
      const usable = (skills || []).filter((s) => (links || []).some((l) => l.skill_id === s.id && (ks || []).some((k) => k.id === l.knowledge_id && k.quote)));
      if ((ks || []).length >= 2 && usable.length) Object.assign(S, { demo: false, ks, skills: usable, links: links.filter((l) => usable.some((s) => s.id === l.skill_id)) });
    } catch (e) { /* hors ligne ou base ancienne : données d'exemple */ }
  }
  function pickPersona(p) {
    S.persona = p;
    // historique fictif du profil, transposé sur les connaissances disponibles
    const map = { 'sbx-k1': S.ks[0], 'sbx-k2': S.ks[1] || S.ks[0], 'sbx-k3': S.ks[2] || S.ks[0] };
    S.evs = p.history.map(([k, o, c, a], i) => ({ ...ev(map[k].id, o, c, a), at: new Date(Date.now() - (10 - i) * 864e5).toISOString() }));
  }
  const pathway = () => OrgInsight.pathway(S.persona.id, S.evs, S.ks, S.skills, S.links, [], null, []);
  const kOfSkill = (sid) => S.links.filter((l) => l.skill_id === sid).map((l) => S.ks.find((k) => k.id === l.knowledge_id)).filter(Boolean);

  async function render(app, o, head, deps, step) {
    d = deps;
    guard(true);
    document.documentElement.classList.add('in-sandbox');
    if (!S || S.org.id !== o.id || !step) { S = { org: o, blocked: 0 }; app.innerHTML = frame(head, 'profil', '<p class="hint">Préparation de l’aperçu…</p>'); await setup(o); }
    if (!S.persona && step && step !== 'profil') step = 'profil';
    ({ profil: viewProfile, parcours: viewPath, diagnostic: viewDiag, scenario: viewScenario, progression: viewProgress }[step || 'profil'] || viewProfile)(app, head);
  }

  function viewProfile(app, head) {
    app.innerHTML = frame(head, 'profil', `<h2>Vivre le parcours d’un collaborateur</h2>
      <p class="hint">Choisis un profil fictif et une compétence. ${S.demo ? 'Ton organisation n’a pas encore de compétence reliée à des connaissances validées : l’aperçu utilise un exemple (magasin de vélos).' : `L’aperçu utilise les compétences et connaissances validées de ${d.esc(S.org.name)}, en lecture seule.`}</p>
      <h3>Profil</h3><div class="sbx-personas" role="radiogroup">${PERSONAS.map((p, i) => `<label class="sbx-persona"><input type="radio" name="sbxP" value="${p.id}" ${(S.persona ? S.persona.id === p.id : i === 0) ? 'checked' : ''} /><span><b>${p.name}</b><small>${p.role}</small><small>${p.week}</small></span></label>`).join('')}</div>
      <div class="field"><label for="sbxSkill">Compétence à découvrir</label><select id="sbxSkill">${S.skills.map((s) => `<option value="${s.id}" ${S.skill === s.id ? 'selected' : ''}>${d.esc(s.name)}</option>`).join('')}</select></div>
      <div class="row-btns"><button class="btn" id="sbxGo">${d.ic('play', true)}Commencer l’aperçu</button></div>`);
    app.querySelector('#sbxGo').onclick = () => {
      pickPersona(PERSONAS.find((p) => p.id === app.querySelector('input[name="sbxP"]:checked').value));
      S.skill = app.querySelector('#sbxSkill').value;
      S.before = pathway();
      d.go(`#/org/${S.org.id}/apercu/parcours`);
    };
  }
  function pathHtml(pw) {
    const ST = { acquise: 'Acquise', validation_humaine: 'Validation au poste attendue', en_cours: 'En cours', a_faire: 'À commencer', sans_connaissance: 'Sans connaissance liée', a_revalider: 'À revalider' };
    return `<ul class="pw-skills">${pw.skills.map((s) => `<li class="pw-${s.status}${s.skill.id === S.skill ? ' sbx-focus' : ''}"><div class="pw-h"><b>${d.esc(s.skill.name)}</b><span class="pw-st">${ST[s.status]}</span></div>
      <ul>${s.knowledge.map((k) => `<li><span>${d.esc((k.knowledge || {}).title || '')}</span><span class="lv lv-${k.level || 0}">${k.level ? `${k.level} · ${Evidence.LEVELS[k.level].label}` : 'Pas encore démontrée'}</span></li>`).join('')}</ul></li>`).join('')}</ul>`;
  }
  function viewPath(app, head) {
    const pw = pathway();
    app.innerHTML = frame(head, 'parcours', `<h2>Le parcours de ${S.persona.name}</h2>
      <p class="hint">${S.persona.role}. Voici ce qu’elle ou il voit dans « Mon parcours » : les compétences du poste, le niveau de preuve et la prochaine activité, avec sa raison.</p>
      ${pw.plan.length ? `<ol class="pw-plan">${pw.plan.slice(0, 3).map((a) => `<li>${d.ic(a.icon, true)}<span><b>${d.esc(a.label)}${a.item ? ` : ${d.esc(a.item.title)}` : ''}</b><small>${d.esc(a.reason)}</small></span></li>`).join('')}</ol>` : ''}
      ${pathHtml(pw)}
      <div class="row-btns"><a class="btn" href="#/org/${S.org.id}/apercu/diagnostic">${d.ic('target', true)}Faire le diagnostic</a></div>`);
  }
  // Questions locales : texte à trous sur l'extrait validé (même principe que le diagnostic de repli du serveur)
  function questions() {
    const ks = kOfSkill(S.skill).concat(S.ks.filter((k) => !kOfSkill(S.skill).includes(k))).slice(0, 3);
    return ks.filter((k) => k.quote).map((k) => {
      const w = k.quote.split(/\s+/);
      const idx = Math.max(w.findIndex((x) => /\d/.test(x)), w.reduce((b, x, i) => (x.replace(/[^\p{L}]/gu, '').length > w[b].replace(/[^\p{L}]/gu, '').length ? i : b), 0));
      const answer = w[idx].replace(/[.,;:!?]+$/, '');
      const pool = S.ks.flatMap((x) => (x.quote || '').split(/\s+/)).map((x) => x.replace(/[.,;:!?«»]+/g, '')).filter((x) => x.length >= Math.min(4, answer.length) && x.toLowerCase() !== answer.toLowerCase());
      const distract = [...new Set(/\d/.test(answer) ? [String(Number(answer.replace(/\D/g, '')) * 2 || 14), String(Math.max(1, Math.round(Number(answer.replace(/\D/g, '')) / 2)) || 7)] : pool)].slice(0, 2);
      const options = [answer, ...distract].sort(() => 0.5 - ((k.id.charCodeAt(k.id.length - 1) % 3) / 3));
      return { k, text: `D’après nos documents : « ${w.map((x, i) => (i === idx ? '____' : x)).join(' ')} »`, options, correct: options.indexOf(answer) };
    });
  }
  function viewDiag(app, head) {
    const qs = questions(); let i = 0, ok = 0;
    const show = () => {
      if (i >= qs.length) {
        app.innerHTML = frame(head, 'diagnostic', `<h2>Diagnostic terminé</h2><p><b>${ok}</b> réponse${ok > 1 ? 's' : ''} juste${ok > 1 ? 's' : ''} sur ${qs.length}. Dans la vraie application, ces réponses deviennent des preuves, corrigées par le serveur ; ici elles restent fictives.</p>
          <div class="row-btns"><a class="btn" href="#/org/${S.org.id}/apercu/scenario">${d.ic('storefront', true)}Passer à la situation</a></div>`);
        return;
      }
      const qq = qs[i];
      app.innerHTML = frame(head, 'diagnostic', `<p class="hint">Question ${i + 1} sur ${qs.length} · ${d.esc(qq.k.title)}</p><h2 class="dg-q">${d.esc(qq.text)}</h2>
        <div class="dg-opts" role="radiogroup">${qq.options.map((op, j) => `<label class="dg-opt"><input type="radio" name="sbxO" value="${j}" /><span>${d.esc(op)}</span></label>`).join('')}</div>
        <p class="label-like">Confiance</p><div class="conf-pick" role="radiogroup">${CONF.map(([k, l]) => `<label><input type="radio" name="sbxC" value="${k}" /><span>${l}</span></label>`).join('')}</div>
        <div class="row-btns"><button class="btn" id="sbxOk" disabled>Valider</button></div><div id="sbxFb" aria-live="polite"></div>`);
      const b = app.querySelector('#sbxOk');
      app.querySelectorAll('input').forEach((x) => { x.onchange = () => { b.disabled = !(app.querySelector('input[name="sbxO"]:checked') && app.querySelector('input[name="sbxC"]:checked')); }; });
      b.onclick = () => {
        const choice = Number(app.querySelector('input[name="sbxO"]:checked').value), conf = app.querySelector('input[name="sbxC"]:checked').value;
        const right = choice === qq.correct; if (right) ok++;
        S.evs.push(ev(qq.k.id, right ? 'juste' : 'faux', conf, 'diagnostic'));
        app.querySelectorAll('.dg-opt').forEach((l, j) => { l.classList.add(j === qq.correct ? 'right' : j === choice ? 'wrong' : 'dim'); l.querySelector('input').disabled = true; });
        app.querySelector('#sbxFb').innerHTML = `<div class="dg-fb ${right ? 'juste' : 'faux'}"><p><b>${right ? 'Juste.' : conf !== 'devine' ? 'Faux, alors que la réponse était donnée comme sûre : fausse certitude.' : 'Pas tout à fait.'}</b> ${d.esc(qq.k.body || '')}</p><blockquote>« ${d.esc(qq.k.quote)} »${qq.k.page ? `<cite>p. ${qq.k.page}</cite>` : ''}</blockquote>
          <div class="row-btns"><button class="btn" id="sbxNext">${i + 1 < qs.length ? 'Question suivante' : 'Terminer'}</button></div></div>`;
        app.querySelector('#sbxNext').onclick = () => { i++; show(); };
      };
    };
    show();
  }
  // Situation simulée : client écrit à l'avance, évaluation locale par mots de l'extrait (fictive, indiquée comme telle)
  function viewScenario(app, head) {
    const ks = kOfSkill(S.skill).length ? kOfSkill(S.skill) : S.ks.slice(0, 1);
    const k = ks[0];
    const script = [`Bonjour, j’ai une question sur « ${k.title.toLowerCase()} ». Vous pouvez m’aider ?`, 'D’accord… et si je suis pressé, on peut faire une exception ?', 'Bon, merci pour l’explication.'];
    const log = [{ who: 'client', text: script[0] }]; const said = []; let turn = 0;
    const event = 'Un autre client s’impatiente derrière.';
    const draw = () => {
      app.innerHTML = frame(head, 'scenario', `<h2>Situation simulée</h2><p class="hint">Ce que vit le collaborateur dans « Client mystère ». Ici, le client est écrit à l’avance et l’évaluation est fictive.</p>
        <div class="ms-feed sbx-feed">${log.map((l) => (l.who === 'event' ? `<p class="ms-event">${d.ic('lightning', true)}${d.esc(l.text)}</p>` : `<div class="ms-line ${l.who === 'client' ? 'client' : 'vendeur'}"><b>${l.who === 'client' ? 'Client' : S.persona.name}</b><p>${d.esc(l.text)}</p></div>`)).join('')}</div>
        ${turn < 2 ? `<form class="ms-form" id="sbxF"><label for="sbxT" class="sr-only">Réponse de ${S.persona.name}</label><textarea id="sbxT" rows="2" maxlength="600" required placeholder="Réponds comme le ferait ${S.persona.name}…"></textarea>
          <p class="label-like">Confiance</p><div class="conf-pick">${CONF.map(([c, l]) => `<label><input type="radio" name="sbxSc" value="${c}" /><span>${l}</span></label>`).join('')}</div>
          <div class="row-btns"><button class="btn">${d.ic('paper-plane-tilt')}Répondre</button></div></form>` : `<div class="row-btns"><button class="btn" id="sbxDeb">${d.ic('clipboard-text')}Voir le débrief fictif</button></div>`}`);
      const f = app.querySelector('#sbxF');
      if (f) f.onsubmit = (e) => {
        e.preventDefault(); const t = app.querySelector('#sbxT').value.trim(); if (!t) return;
        const c = app.querySelector('input[name="sbxSc"]:checked'); said.push({ text: t, conf: c ? c.value : null });
        log.push({ who: 'me', text: t }); turn++;
        if (turn === 1) log.push({ who: 'event', text: event });
        log.push({ who: 'client', text: script[turn] }); draw();
      };
      const db = app.querySelector('#sbxDeb'); if (db) db.onclick = () => debrief(app, head, ks, said, event);
    };
    draw();
  }
  // Chaque réponse est rapprochée de la fiche de la compétence qui lui correspond le mieux (règle simple, fictive)
  const toks = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  function debrief(app, head, ks, said, event) {
    const scored = said.map((s) => {
      const w = toks(s.text);
      const best = ks.map((k) => { const kw = new Set(toks(k.quote)); return { k, hit: w.filter((x) => kw.has(x)).length }; }).sort((a, b) => b.hit - a.hit)[0];
      return { ...s, k: best.k, verdict: best.hit >= 2 ? 'juste' : best.hit === 1 ? 'insuffisant' : 'non_documente' };
    });
    scored.forEach((s) => S.evs.push(ev(s.k.id, s.verdict, s.conf, 'simulation', { session: 'sbx-session' })));
    const k = (scored.find((s) => s.verdict !== 'non_documente') || {}).k || ks[0];
    const L = { juste: 'conforme à la fiche', insuffisant: 'trop peu étayée pour conclure', non_documente: 'non retrouvée dans la fiche (ni juste ni fausse)' };
    app.innerHTML = frame(head, 'scenario', `<h2>Débrief <small class="sbx-tag">fictif</small></h2>
      <p class="hint">Dans la vraie application, un évaluateur séparé du personnage cite chaque phrase et la compare aux connaissances validées. Ici, une règle simple imite ce débrief.</p>
      <ul class="db-claims">${scored.map((s) => `<li><b>« ${d.esc(s.text)} »</b><span>${L[s.verdict]}${s.verdict !== 'non_documente' ? ` (${d.esc(s.k.title)})` : ''}${s.conf ? ` · confiance déclarée : ${CONF.find((c) => c[0] === s.conf)[1].toLowerCase()}` : ' · confiance non déclarée'}</span></li>`).join('')}</ul>
      <p>Événement de la situation : ${d.esc(event)}</p>
      <p class="hint">La fiche dit : « ${d.esc(k.quote)} »${k.page ? ` (p. ${k.page})` : ''}. Une simulation réussie ne suffit pas à valider une compétence.</p>
      <div class="row-btns"><a class="btn" href="#/org/${S.org.id}/apercu/progression">${d.ic('chart-line-up', true)}Voir la progression simulée</a></div>`);
  }
  function viewProgress(app, head) {
    const after = pathway(), before = S.before || after;
    const fake = S.evs;
    app.innerHTML = frame(head, 'progression', `<h2>Progression simulée de ${S.persona.name}</h2>
      <p class="hint">Calculée par les mêmes moteurs que la production (niveaux de preuve, parcours, plan), sur ${fake.length} observation${fake.length > 1 ? 's' : ''} fictive${fake.length > 1 ? 's' : ''}.</p>
      <div class="sbx-compare"><div><h3>Avant</h3><p class="num">${before.done}/${before.total} acquises</p></div><div><h3>Après l’aperçu</h3><p class="num">${after.done}/${after.total} acquises</p></div></div>
      ${pathHtml(after)}
      ${after.plan[0] ? `<p class="next-box">${d.ic('compass', true)}<span><b>Prochaine activité proposée : ${d.esc(after.plan[0].label)}${after.plan[0].item ? ` : ${d.esc(after.plan[0].item.title)}` : ''}</b><small>${d.esc(after.plan[0].reason)}</small></span></p>` : ''}
      <div id="sbxMx"></div>
      <p class="hint">${d.ic('shield-check')}Rien n’a été écrit : ${S.blocked ? `${S.blocked} tentative${S.blocked > 1 ? 's' : ''} d’écriture bloquée${S.blocked > 1 ? 's' : ''}` : 'aucune requête d’écriture'} pendant l’aperçu.</p>
      <div class="row-btns"><a class="btn ghost" href="#/org/${S.org.id}/apercu">${d.ic('arrow-counter-clockwise')}Essayer un autre profil</a><a class="btn ghost" href="#/org/${S.org.id}">Quitter l’aperçu</a></div>`);
    if (window.OrgShell) OrgShell.renderMatrix(app.querySelector('#sbxMx'), OrgInsight.matrix(S.evs, S.ks, { userId: S.persona.id }), {}, d);
  }

  window.OrgSandbox = { render, _state: () => S, _guard: guard, PERSONAS };
})();
