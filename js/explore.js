/* Carte d'exploration d'un cours : chaque chapitre devient une zone, reliée aux autres par un sentier.
   Un seul environnement visuel, réutilisé pour tous les cours : seuls l'icône et la teinte de chaque zone
   changent selon le domaine détecté (réseau, sécurité, vivant…). Aucune génération d'image, aucun appel IA.
   Chaque élément mène à une action d'apprentissage : leçon de la zone, fiche ou révision d'une notion. */
(function () {
  let selected = null;

  function render(el, s, d) {
    const A = Insight.analyze(s);
    const states = new Map(Mastery.notions(s).map((x) => [x.n.id, x.state]));
    const recommended = (() => { const l = Mastery.nextLesson({ subjects: [s] }, d.canLesson); return l ? l.n.id : null; })();
    const dots = (k) => !k ? '' : `<span class="xd" aria-label="Difficulté : ${Insight.DIFF[k].toLowerCase()}">${[1, 2, 3].map((i) => `<i class="${i <= k ? 'on' : ''}"></i>`).join('')}</span>`;
    const zoneState = (z) => {
      const c = Mastery.counts(z.notions.map((n) => ({ state: states.get(n.id) })));
      const status = c.mastered === c.total ? 'mastered' : c.new === c.total ? 'new' : 'active';
      return { c, status };
    };

    el.innerHTML = `
      <div class="xmap">
        <ol class="zones">
          ${A.zones.map((z) => {
            const { c, status } = zoneState(z);
            const lessonDone = Mastery.lessonOf(z.node);
            const can = d.canLesson(z.node);
            return `
            <li class="zone ${status} ${z.node.id === recommended ? 'reco' : ''}" style="--zh:${z.theme.hue}" data-z="${z.i}">
              <span class="zone-pin" aria-hidden="true">${d.ic(status === 'mastered' ? 'seal-check' : z.theme.icon, true)}</span>
              <div class="zone-card">
                <div class="zone-head">
                  <small>Zone ${z.i + 1} · ${z.theme.label}${z.node.id === recommended ? ' · <b>Recommandée</b>' : ''}</small>
                  <h3><a href="${d.link(s.id, z.node.id)}">${d.esc(z.node.title)}</a></h3>
                  <div class="zone-meta">${dots(z.difficulty)}${z.difficulty ? `<span>${Insight.DIFF[z.difficulty]}</span>` : ''}<span class="num">${c.mastered}/${c.total} maîtrisées</span></div>
                  ${d.stateBar(c)}
                </div>
                <ul class="zone-goals" aria-label="Objectifs">${z.objectives.slice(0, 3).map((o) => `<li>${d.ic('target')}${d.esc(o)}</li>`).join('')}</ul>
                <div class="zone-notions">
                  ${z.notions.map((n) => `<button type="button" class="xn" data-id="${n.id}" style="--sc:${Mastery.STATES[states.get(n.id)].c}" aria-pressed="${selected === n.id}" title="${d.esc(n.title)} · ${Mastery.STATES[states.get(n.id)].label}">
                    <span class="st-dot" aria-hidden="true"></span><span class="xn-t">${d.esc(n.title)}</span>${dots(A.diff.get(n.id))}</button>`).join('')}
                </div>
                <div class="zone-foot">
                  ${!lessonDone && can ? `<button class="btn sm" data-act="start-lesson" data-id="${z.node.id}">${d.ic('play', true)}Leçon</button>` : ''}
                  ${lessonDone || c.total - c.new - c.seen > 0 ? `<a class="btn ghost sm" href="${d.link(s.id, z.node.id, 'revision')}">${d.ic('cards')}Réviser la zone</a>` : ''}
                  ${z.needs.length ? `<span class="zone-needs">${d.ic('arrow-bend-up-left')}S’appuie sur ${z.needs.map((i) => `zone ${i + 1}`).join(', ')}</span>` : ''}
                </div>
              </div>
            </li>`;
          }).join('')}
        </ol>
        <svg class="xlinks" aria-hidden="true"></svg>
        <aside class="xpanel glass empty" aria-live="polite"></aside>
      </div>`;

    const panel = el.querySelector('.xpanel');
    const svg = el.querySelector('.xlinks');
    const map = el.querySelector('.xmap');

    // Lignes entre la notion choisie et ce sur quoi elle s'appuie / ce qu'elle prépare
    function drawLinks() {
      svg.innerHTML = '';
      if (!selected) return;
      const from = map.querySelector(`.xn[data-id="${selected}"]`); if (!from) return;
      const box = map.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
      svg.style.height = `${box.height}px`;
      const r = A.rel.get(selected);
      const c = (e) => { const b = e.getBoundingClientRect(); return [b.left - box.left + b.width / 2, b.top - box.top + b.height / 2]; };
      const [x1, y1] = c(from);
      [...r.pre.map((x) => [x.id, 'pre', x.status]), ...r.next.map((x) => [x.id, 'next', x.status]), ...r.links.map((x) => [x.id, 'link', x.status])].forEach(([id, kind, status]) => {
        const to = map.querySelector(`.xn[data-id="${id}"]`); if (!to) return;
        const [x2, y2] = c(to);
        const mx = (x1 + x2) / 2 + (Math.abs(y2 - y1) < 30 ? 0 : (x2 > x1 ? 40 : -40)), my = (y1 + y2) / 2 - (Math.abs(y2 - y1) < 30 ? 36 : 0);
        svg.insertAdjacentHTML('beforeend', `<path class="xl ${kind} ${status}" d="M${x1},${y1} Q${mx},${my} ${x2},${y2}"/>`);
      });
    }

    function showPanel(id) {
      const n = A.byId.get(id); if (!n) return;
      const st = states.get(id), r = A.rel.get(id);
      // Un lien calculé reste « proposé » tant que l'étudiant ne l'a pas validé : on montre d'où il vient
      const item = (x) => { const m = A.byId.get(x.id); return `<li class="xrel ${x.status}"><button type="button" class="xn-link" data-id="${x.id}"><span class="st-dot" style="--sc:${Mastery.STATES[states.get(x.id)].c}" aria-hidden="true"></span>${d.esc(m.title)}</button>
        <small>${x.status === 'valide' ? `${d.ic('check-circle', true)}validé` : 'proposé'} · mots communs : ${x.why.map(d.esc).join(', ')}</small>
        ${x.status === 'valide' ? '' : `<span class="xrel-act"><button type="button" class="icon-btn sm" data-rel="${x.rid}" data-st="valide" aria-label="Valider le lien avec ${d.esc(m.title)}">${d.ic('check')}</button><button type="button" class="icon-btn sm" data-rel="${x.rid}" data-st="rejete" aria-label="Rejeter le lien avec ${d.esc(m.title)}">${d.ic('x')}</button></span>`}</li>`; };
      panel.classList.remove('empty');
      panel.innerHTML = `
        <button type="button" class="icon-btn sm xpanel-close" aria-label="Fermer">${d.ic('x')}</button>
        <small class="xp-state" style="--sc:${Mastery.STATES[st].c}"><span class="st-dot" aria-hidden="true"></span>${Mastery.STATES[st].label}${A.diff.get(id) ? ` · ${Insight.DIFF[A.diff.get(id)]}` : ''}</small>
        <h3>${d.esc(n.title)}</h3>
        <p class="xp-reason">${d.esc(Mastery.reasonOf(n, st))}</p>
        ${A.terms.get(id).length ? `<p class="xp-terms">${A.terms.get(id).slice(0, 5).map((t) => `<span>${d.esc(t.w)}</span>`).join('')}</p>` : ''}
        ${r.pre.length ? `<h4>${d.ic('arrow-bend-up-left')}S’appuie sur</h4><ul>${r.pre.map(item).join('')}</ul>` : ''}
        ${r.next.length ? `<h4>${d.ic('arrow-bend-down-right')}Prépare à</h4><ul>${r.next.map(item).join('')}</ul>` : ''}
        ${r.links.length ? `<h4>${d.ic('link')}Liée à</h4><ul>${r.links.map(item).join('')}</ul>` : ''}
        ${!r.pre.length && !r.next.length && !r.links.length ? '<p class="muted">Aucun lien net avec les autres notions dans le texte du cours.</p>' : ''}
        <div class="row-btns">
          <a class="btn sm" href="${d.link(s.id, id)}">${d.ic('book-open-text')}Fiche</a>
          ${window.Dialogue && Dialogue.canTalk(n) && d.onTalk ? `<button type="button" class="btn ghost sm" data-talk="${id}">${d.ic('chat-circle-text', true)}Dialogue</button>` : ''}
          ${n.srs || st !== 'new' ? `<a class="btn ghost sm" href="${d.link(s.id, id, 'revision')}">${d.ic('cards')}Réviser</a>` : ''}
        </div>`;
      panel.querySelector('.xpanel-close').onclick = () => select(null);
      panel.querySelectorAll('.xn-link').forEach((b) => { b.onclick = () => select(b.dataset.id, true); });
      panel.querySelectorAll('[data-rel]').forEach((b) => { b.onclick = () => { d.onDecide && d.onDecide(b.dataset.rel, b.dataset.st); }; });
      const tk = panel.querySelector('[data-talk]'); if (tk) tk.onclick = () => d.onTalk(tk.dataset.talk);
    }

    function select(id, scroll) {
      selected = id;
      const r = id && A.rel.get(id);
      const rel = new Map(); if (r) { r.pre.forEach((x) => rel.set(x.id, 'pre')); r.next.forEach((x) => rel.set(x.id, 'next')); r.links.forEach((x) => rel.set(x.id, 'link')); }
      map.classList.toggle('has-sel', !!id);
      document.documentElement.classList.toggle('xp-open', !!id);
      map.querySelectorAll('.xn').forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.id === id));
        b.dataset.rel = rel.get(b.dataset.id) || '';
      });
      if (id) { showPanel(id); if (scroll) { const b = map.querySelector(`.xn[data-id="${id}"]`); b && b.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); } }
      else { panel.classList.add('empty'); panel.innerHTML = `<p>${d.ic('hand-pointing')} Touche une notion pour voir sur quoi elle s’appuie et ce qu’elle prépare.</p><p class="xp-legend"><span><i class="lg pre"></i>s’appuie sur</span><span><i class="lg next"></i>prépare à</span></p>`; }
      requestAnimationFrame(drawLinks);
    }

    map.querySelectorAll('.xn').forEach((b) => { b.onclick = () => select(selected === b.dataset.id ? null : b.dataset.id); });
    if (selected && !A.byId.has(selected)) selected = null;
    select(selected);
    const ro = new ResizeObserver(() => drawLinks()); ro.observe(map);
  }

  window.Explore = { render, reset: () => { selected = null; } };
})();
