/* Index des évolutions de Pousse : un carrousel horizontal des 8 formes.
   Les formes débloquées sont en couleur ; les autres en silhouette noire, enchaînées, avec un cadenas. */
(function () {
  const DESC = [
    'Tout commence ici', 'La coque a craqué', 'Une feuille sur le ventre', 'Des bras en feuilles et un bouton',
    'Des racines et des fleurs', 'De l’écorce et des glands', 'Mousse, champignon et un oiseau', 'Jade, or et couronne',
  ];
  const VIGOR = [
    { d: 3, icon: 'sparkle', name: 'Étincelles' }, { d: 7, icon: 'sun', name: 'Disque doré' },
    { d: 30, icon: 'star-four', name: 'Lucioles' }, { d: 100, icon: 'rainbow', name: 'Anneau arc-en-ciel' },
  ];
  let el = null, lastFocus = null;

  // Chaîne : des maillons le long d'une diagonale, un sur deux vu de profil
  function chain(x1, y1, x2, y2) {
    const n = 13, ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    let out = '';
    for (let i = 0; i <= n; i++) {
      const x = x1 + ((x2 - x1) * i) / n, y = y1 + ((y2 - y1) * i) / n;
      out += i % 2
        ? `<rect x="${(x - 7).toFixed(1)}" y="${(y - 1.8).toFixed(1)}" width="14" height="3.6" rx="1.8" class="lk-side" transform="rotate(${ang.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`
        : `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="7.4" ry="4.4" class="lk" transform="rotate(${ang.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }
    return `<g class="chain">${out}</g>`;
  }
  const chains = () => `<svg class="dex-chains" viewBox="0 0 160 160" aria-hidden="true">
      ${chain(-6, 28, 166, 128)}${chain(166, 28, -6, 128)}
      <g class="padlock" transform="translate(80 80)">
        <path d="M-9 -4 L-9 -11 C-9 -22 9 -22 9 -11 L9 -4" class="pl-shackle" fill="none" stroke-width="5" stroke-linecap="round"/>
        <rect x="-15" y="-5" width="30" height="24" rx="6" class="pl-body"/>
        <rect x="-15" y="9" width="30" height="10" rx="5" class="pl-shade"/>
        <circle cx="0" cy="4" r="3.4" class="pl-hole"/><rect x="-1.4" y="5" width="2.8" height="7" rx="1.4" class="pl-hole"/>
      </g></svg>`;

  function svgOf() {
    const src = document.querySelector('.mascot-svg');
    return src ? src.outerHTML.replace(/ style="[^"]*"/g, '').replace('class="mascot-svg"', 'class="mascot-svg dex-svg"') : '';
  }

  function open(info) {
    if (!window.Trophies) return;
    close(true);
    lastFocus = document.activeElement;
    const R = Trophies.RANKS, rank = info.rank, lvl = info.level || 1;
    const next = R[rank + 1];
    const svg = svgOf();
    el = document.createElement('div');
    el.className = 'dex-backdrop';
    el.innerHTML = `
      <section class="dex glass" role="dialog" aria-modal="true" aria-labelledby="dexTitle">
        <header class="dex-head">
          <div>
            <h2 id="dexTitle">Les évolutions de Pousse</h2>
            <p>${next ? `Prochaine forme au niveau ${next.from} · <b>plus que ${next.from - lvl} niveau${next.from - lvl > 1 ? 'x' : ''}</b>` : '<b>Toutes les formes sont débloquées</b>'}</p>
          </div>
          <button class="icon-btn dex-close" aria-label="Fermer"><i class="ph ph-x" aria-hidden="true"></i></button>
        </header>
        <div class="dex-track" tabindex="0" aria-label="Évolutions, fais défiler horizontalement">
          ${R.map((r, i) => {
            const st = i < rank ? 'past' : i === rank ? 'now' : 'locked';
            return `<article class="dex-card ${st}" data-i="${i}" style="--i:${i};--rank:${r.c}">
              <div class="dex-stage">
                <span class="dex-glow" aria-hidden="true"></span>
                <div class="mascot dex-pousse" data-rank="${i}" data-vigor="0" data-mood="smile">${svg}</div>
                ${st === 'locked' ? chains() : ''}
              </div>
              <div class="dex-info">
                <span class="dex-num num">${String(i + 1).padStart(2, '0')}</span>
                <h3>${st === 'locked' ? '???' : r.name}</h3>
                <p>${st === 'locked' ? `Niveau ${r.from}` : DESC[i]}</p>
                ${st === 'now' ? '<span class="dex-badge">Toi</span>' : st === 'past' ? '<span class="dex-badge ok"><i class="ph-fill ph-check" aria-hidden="true"></i></span>' : ''}
              </div>
              ${st === 'locked' ? `<span class="dex-tip" role="status">Encore ${r.from - lvl} niveau${r.from - lvl > 1 ? 'x' : ''}</span>` : ''}
            </article>`;
          }).join('')}
        </div>
        <div class="dex-dots" aria-hidden="true">${R.map((_, i) => `<i class="${i <= rank ? 'on' : ''}"></i>`).join('')}</div>
        <div class="dex-vigor">
          <h4>Éclats de régularité <span>${info.streak || 0} jour${(info.streak || 0) > 1 ? 's' : ''} de suite</span></h4>
          <div class="dex-chips">${VIGOR.map((v) => {
            const ok = (info.streak || 0) >= v.d;
            return `<span class="dex-chip ${ok ? 'ok' : ''}"><i class="ph-fill ph-${ok ? v.icon : 'lock-simple'}" aria-hidden="true"></i><b>${v.name}</b><small>${v.d} jours</small></span>`;
          }).join('')}</div>
        </div>
      </section>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    const track = el.querySelector('.dex-track');
    // centre la forme actuelle
    const cur = el.querySelector('.dex-card.now');
    if (cur) setTimeout(() => track.scrollTo({ left: cur.offsetLeft - (track.clientWidth - cur.clientWidth) / 2, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' }), 30);
    // points de pagination selon la carte au centre
    const dots = [...el.querySelectorAll('.dex-dots i')];
    track.addEventListener('scroll', () => {
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0, d = Infinity;
      [...track.children].forEach((c, i) => { const m = c.offsetLeft + c.clientWidth / 2; if (Math.abs(m - mid) < d) { d = Math.abs(m - mid); best = i; } });
      dots.forEach((x, i) => x.classList.toggle('here', i === best));
    }, { passive: true });
    track.dispatchEvent(new Event('scroll'));
    // toucher une forme : celle débloquée sautille, celle à débloquer fait trembler ses chaînes
    track.addEventListener('click', (e) => {
      const c = e.target.closest('.dex-card');
      if (!c) return;
      c.classList.remove('tap'); void c.offsetWidth; c.classList.add('tap');
    });
    el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('.dex-close')) close(); });
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    el.querySelector('.dex-close').focus();
  }

  function close(instant) {
    if (!el) return;
    const node = el; el = null;
    if (instant) { node.remove(); return; }
    node.classList.remove('show');
    setTimeout(() => node.remove(), 320);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  window.PousseDex = { open, close };
})();
