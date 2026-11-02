/* Pousse, la mascotte d'Arbor : un petit jouet vivant.
   - Ses yeux suivent le curseur, elle cligne, respire, se balance.
   - On peut l'attraper, la secouer et la lancer : elle rebondit sur les bords et retombe.
   - On peut la caresser (passer la souris dessus en faisant des allers-retours) : elle fait des cœurs.
   - Toute seule, elle s'occupe : danse, hélicoptère, regarde autour, bâille.
   - Elle a soif quand des cartes attendent d'être révisées (ses feuilles tombent un peu).
   - Elle met un bandeau pendant le mode Focus et se tait.
   - Elle grandit avec ton niveau : nouvelle feuille, bourgeon, puis fleur.
   Boucles calmes en CSS, réactions en Web Animations API (interruptibles), lancer en physique simple. */
(function () {
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a) => a[Math.floor(Math.random() * a.length)];
  const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

  const MOUTHS = {
    smile: 'M52 89 Q60 96 68 89',
    grin: 'M50 87 Q60 100 70 87 Z',
    open: 'M55 89 Q60 99 65 89 Q60 86 55 89 Z',
    wide: 'M53 87 Q60 103 67 87 Q60 84 53 87 Z',
    sad: 'M53 94 Q60 87 67 94',
    flat: 'M54 91 L66 91',
    sleep: 'M55 91 Q60 94 65 91',
  };

  const LINES = {
    hello: ['Salut ! On fait pousser quelques connaissances ?', 'Coucou ! Une petite branche aujourd’hui ?', 'Te revoilà ! J’ai arrosé tes sujets.', 'Hé ! Attrape-moi et lance-moi, pour voir !'],
    poke: [
      'Hé, ça chatouille !',
      'Astuce : une feuille de l’arbre = une seule idée.',
      'Astuce : écris ta réponse avant de retourner la carte, même si tu n’es pas sûr.',
      'Astuce : relire donne l’impression de savoir. Se tester, c’est savoir pour de vrai.',
      'Astuce : glisse une carte vers la droite si tu la connais, vers la gauche sinon.',
      'Je suis une pousse, pas un bouton ! Enfin… un peu les deux.',
      'Tu peux m’attraper et me lancer. Je rebondis !',
      'Caresse-moi avec la souris, j’adore ça.',
      'Photosynthèse en cours… ah non, c’est juste la lumière de ton écran.',
      'Un peu chaque jour, c’est mieux que tout la veille de l’examen.',
    ],
    dizzy: ['Ouh là, j’ai la tête qui tourne…', 'Doucement, je vais perdre mes feuilles !'],
    grab: ['Wouhou !', 'Hé, pose-moi !', 'Je vole !', 'Pas trop haut !'],
    throw: ['Wiiiii !', 'Youpiii !', 'Aaaah !'],
    land: ['Atterrissage réussi.', 'Encore, encore !', 'Ouf, sur mes racines.', 'Note : 9/10 pour le style.'],
    pet: ['Hihi, encore !', 'Mmmh, j’adore ça.', 'Ronron… ah non, ça c’est les chats.'],
    done: ['Bravo, une de plus !', 'Maîtrisé ! +10 XP', 'Joli travail !', 'Ça pousse, ça pousse !'],
    again: ['Pas grave, on la reverra.', 'Courage, la prochaine sera la bonne !', 'Oublier puis retrouver, c’est comme ça qu’on retient.'],
    levelup: ['Niveau supérieur ! Regarde, j’ai grandi !', 'Je grandis ! Merci de t’occuper de moi.'],
    reading: ['Je lis ton PDF…', 'Je range tout en petites branches…'],
    imported: ['Voilà ton cours, bien rangé !'],
    created: ['Nouveau sujet ! On va le faire pousser.', 'Une nouvelle graine de plantée !'],
    wake: ['Hein ? J’étais pas endormi !', 'Ah, te revoilà !'],
    finished: ['Session terminée, champion !', 'Fin de la révision, bien joué !'],
    goal: ['Objectif du jour atteint ! On fait la fête !', 'Objectif atteint, je danse !'],
    focus: ['Concentration ! Je ne dis plus rien.', 'Mode Focus : je me tais et je t’encourage en silence.'],
    focusdone: ['Session terminée ! Pause méritée, lève-toi et bouge.', 'Bravo pour ta concentration ! Petite pause ?'],
    thirsty: (n) => [`J’ai soif… ${n} ${n > 1 ? 'cartes attendent' : 'carte attend'} ta révision.`, `Arrose-moi : ${n} ${n > 1 ? 'cartes sont' : 'carte est'} à revoir aujourd’hui !`],
  };

  let root, btn, svg, bubble, pupils, face, eyes, mouth, sprite, shadow, sparkles;
  let state = 'idle';
  let level = 1, thirst = 0, dueN = 0, focusOn = false;
  let blinkTimer, idleTimer, bubbleTimer, moodTimer, anticTimer;
  let lastPokes = [];
  let pointer = null, raf = null;
  let enabled = true;
  let pos = null; // position libre après un lancer : { x, y } (coin haut-gauche, en px)
  let petDist = 0, petT = 0, petCool = 0;
  let thirstSaid = false;

  const markup = `
    <div class="mascot-bubble" id="mascotBubble" aria-hidden="true"></div>
    <button class="mascot-btn" id="mascotBtn" type="button" aria-label="Pousse, la mascotte. Clique pour jouer, ou attrape-la pour la lancer">
      <svg viewBox="0 0 120 120" class="mascot-svg" aria-hidden="true">
        <defs>
          <radialGradient id="mBody" cx="40%" cy="35%" r="75%">
            <stop offset="0" stop-color="#7EE09A"/><stop offset=".6" stop-color="#3FBF6A"/><stop offset="1" stop-color="#249652"/>
          </radialGradient>
          <linearGradient id="mLeaf" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stop-color="#2FA85C"/><stop offset="1" stop-color="#8BE36A"/>
          </linearGradient>
        </defs>
        <ellipse class="m-shadow" cx="60" cy="113" rx="27" ry="4.5"/>
        <g class="m-sprite">
          <g class="m-body">
            <path class="m-stem" d="M60 50 C60 42 61 36 60 30" />
            <g class="m-leaves">
              <path class="m-leaf m-leaf-l" d="M60 32 C50 20 36 22 32 30 C42 38 54 38 60 32 Z"/>
              <path class="m-leaf m-leaf-r" d="M60 30 C66 16 82 12 88 18 C82 30 70 34 60 30 Z"/>
              <path class="m-leaf m-leaf-3" d="M60 34 C56 22 58 10 62 4 C68 12 66 26 60 34 Z"/>
              <g class="m-bud"><circle cx="62" cy="6" r="6" fill="#FF7A9C"/><circle cx="62" cy="6" r="2.6" fill="#FFD46B"/></g>
              <g class="m-flower">
                <circle cx="62" cy="-2" r="6" fill="#FF7A9C"/><circle cx="70" cy="5" r="6" fill="#FF9AB4"/>
                <circle cx="54" cy="5" r="6" fill="#FF9AB4"/><circle cx="62" cy="12" r="5" fill="#FF7A9C"/>
                <circle cx="62" cy="5" r="4" fill="#FFD46B"/>
              </g>
            </g>
            <g class="m-arm m-arm-l"><ellipse cx="27" cy="82" rx="7" ry="5" fill="#2FA85C"/></g>
            <g class="m-arm m-arm-r"><ellipse cx="93" cy="82" rx="7" ry="5" fill="#2FA85C"/></g>
            <g class="m-foot m-foot-l"><ellipse cx="47" cy="109" rx="8" ry="4.5" fill="#249652"/></g>
            <g class="m-foot m-foot-r"><ellipse cx="73" cy="109" rx="8" ry="4.5" fill="#249652"/></g>
            <path class="m-torso" fill="url(#mBody)" d="M60 46 C84 46 96 62 95 82 C94 102 80 110 60 110 C40 110 26 102 25 82 C24 62 36 46 60 46 Z"/>
            <ellipse cx="60" cy="96" rx="22" ry="10" fill="#B9F5C7" opacity=".35"/>
            <path d="M40 58 C46 52 54 50 60 50" stroke="#fff" stroke-opacity=".45" stroke-width="3" stroke-linecap="round" fill="none"/>
            <g class="m-band">
              <path d="M29 66 C44 58 76 58 91 66 L90 72 C75 64 45 64 30 72 Z" fill="#E5484D"/>
              <path d="M88 66 L100 60 L97 69 Z M88 68 L101 72 L94 75 Z" fill="#E5484D"/>
            </g>
            <g class="m-face">
              <ellipse class="m-cheek" cx="41" cy="88" rx="6" ry="3.6" fill="#FF7A9C" opacity=".5"/>
              <ellipse class="m-cheek" cx="79" cy="88" rx="6" ry="3.6" fill="#FF7A9C" opacity=".5"/>
              <g class="m-eye m-eye-l"><ellipse cx="49" cy="76" rx="7.5" ry="8.5" fill="#fff"/><g class="m-pupil"><circle cx="49" cy="77" r="4.4" fill="#18202B"/><circle cx="50.6" cy="75.2" r="1.5" fill="#fff"/></g></g>
              <g class="m-eye m-eye-r"><ellipse cx="71" cy="76" rx="7.5" ry="8.5" fill="#fff"/><g class="m-pupil"><circle cx="71" cy="77" r="4.4" fill="#18202B"/><circle cx="72.6" cy="75.2" r="1.5" fill="#fff"/></g></g>
              <g class="m-closed"><path d="M42 77 Q49 81 56 77" /><path d="M64 77 Q71 81 78 77" /></g>
              <g class="m-joy"><path d="M42 79 Q49 70 56 79" /><path d="M64 79 Q71 70 78 79" /></g>
              <g class="m-dizzy"><path d="M44 72 L54 82 M54 72 L44 82"/><path d="M66 72 L76 82 M76 72 L66 82"/></g>
              <path class="m-mouth" d="${MOUTHS.smile}"/>
            </g>
          </g>
        </g>
        <g class="m-zzz"><text x="88" y="40">z</text><text x="96" y="28">z</text><text x="104" y="16">Z</text></g>
        <g class="m-sparkles">
          <path d="M18 30 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z"/><path d="M100 50 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z"/>
          <path d="M96 12 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2 z"/>
        </g>
      </svg>
    </button>
    <button class="mascot-hide" id="mascotHide" type="button" aria-label="Masquer la mascotte"><i class="ph ph-x" aria-hidden="true"></i></button>`;

  function init(opts = {}) {
    enabled = opts.enabled !== false;
    root = document.createElement('div');
    root.className = 'mascot';
    root.innerHTML = markup;
    document.body.appendChild(root);
    btn = root.querySelector('#mascotBtn');
    svg = root.querySelector('svg');
    bubble = root.querySelector('#mascotBubble');
    sprite = root.querySelector('.m-sprite');
    shadow = root.querySelector('.m-shadow');
    face = root.querySelector('.m-face');
    pupils = [...root.querySelectorAll('.m-pupil')];
    eyes = [...root.querySelectorAll('.m-eye')];
    mouth = root.querySelector('.m-mouth');
    sparkles = root.querySelector('.m-sparkles');

    bindDrag();
    btn.addEventListener('pointermove', onPet);
    btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke(); } });
    root.querySelector('#mascotHide').addEventListener('click', () => { opts.onHide && opts.onHide(); });
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('keydown', activity, { passive: true });
    window.addEventListener('resize', () => { if (pos) place(clampPos(pos.x, pos.y)); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { scheduleBlink(); scheduleAntic(); } });

    try { const p = JSON.parse(localStorage.getItem('arbor:mascotPos') || 'null'); if (p) { pos = { x: p.x * innerWidth, y: 0 }; requestAnimationFrame(() => place(clampPos(pos.x, floorY()))); } } catch (e) { /* rien */ }

    setLevel(opts.level || 1, true);
    setEnabled(enabled);
    scheduleBlink();
    scheduleAntic();
    resetIdle();

    // Salut : souvent les premières fois, puis de plus en plus rarement
    let visits = 0;
    try { visits = +localStorage.getItem('arbor:visits') || 0; localStorage.setItem('arbor:visits', visits + 1); } catch (e) { /* stockage indisponible */ }
    if (enabled && (visits < 3 || Math.random() < 0.25)) setTimeout(() => react('hello'), 900);
    setTimeout(() => { if (enabled && dueN && !thirstSaid && state === 'idle' && !focusOn) { thirstSaid = true; say(rand(LINES.thirsty(dueN)), 4200); droopLeaves(); } }, 25000);
  }

  function setEnabled(on) {
    enabled = on;
    if (root) root.classList.toggle('off', !on);
  }

  /* ---------- Position libre (après un lancer) ---------- */
  const size = () => btn.getBoundingClientRect().width || 96;
  function floorY() {
    const nav = document.querySelector('.bottom-nav');
    const navH = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect().height : 0;
    return innerHeight - size() - navH - 10;
  }
  const clampPos = (x, y) => ({ x: Math.min(innerWidth - size() - 6, Math.max(6, x)), y: Math.min(floorY(), Math.max(70, y)) });
  function place(p) {
    pos = p;
    root.classList.add('free');
    root.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
  }
  function savePos() { try { localStorage.setItem('arbor:mascotPos', JSON.stringify({ x: pos.x / innerWidth })); } catch (e) { /* rien */ } }

  /* ---------- Attraper et lancer ---------- */
  function bindDrag() {
    let start = null, dragging = false, last = [], grabOff = null, pid = null;
    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || pid !== null) return;
      pid = e.pointerId;
      const r = btn.getBoundingClientRect();
      start = { x: e.clientX, y: e.clientY };
      grabOff = { x: e.clientX - r.left, y: e.clientY - r.top };
      last = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
      dragging = false;
      btn.setPointerCapture(pid);
    });
    btn.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid) return;
      last.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (last.length > 6) last.shift();
      if (!dragging && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) {
        dragging = true;
        stopPhysics();
        root.classList.add('grabbed');
        state = 'grab';
        setMood('wide');
        sprite.getAnimations().forEach((a) => a.cancel());
        say(rand(LINES.grab), 1600);
      }
      if (dragging) {
        place({ x: e.clientX - grabOff.x, y: e.clientY - grabOff.y });
        // Balancier : le corps penche selon la vitesse horizontale
        const a = last[0], b = last[last.length - 1];
        const vx = (b.x - a.x) / Math.max(16, b.t - a.t);
        sprite.style.transform = `rotate(${Math.max(-35, Math.min(35, -vx * 18))}deg)`;
      }
    });
    const up = (e) => {
      if (e.pointerId !== pid) return;
      pid = null;
      root.classList.remove('grabbed');
      if (!dragging) { poke(); return; }
      dragging = false;
      sprite.style.transform = '';
      const a = last[0], b = last[last.length - 1];
      const dt = Math.max(16, b.t - a.t);
      const vx = ((b.x - a.x) / dt) * 16, vy = ((b.y - a.y) / dt) * 16;
      if (Math.hypot(vx, vy) > 8) say(rand(LINES.throw), 1400);
      throwIt(vx, vy);
    };
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
  }

  let phys = null;
  function stopPhysics() { if (phys) cancelAnimationFrame(phys); phys = null; }
  function throwIt(vx, vy) {
    stopPhysics();
    if (reduced()) { place(clampPos(pos.x, floorY())); land(false); return; }
    let x = pos.x, y = pos.y, spin = 0;
    let bounces = 0;
    const G = 0.9, R = 0.55, F = 0.985;
    let tPrev = performance.now();
    // Physique en temps réel (pas en images) : même trajectoire sur un téléphone lent
    const sub = () => {
      vy += G; vx *= F;
      x += vx; y += vy; spin += vx * 1.2;
      const maxX = innerWidth - size() - 6, fy = floorY();
      if (x < 6) { x = 6; vx = -vx * R; }
      if (x > maxX) { x = maxX; vx = -vx * R; }
      if (y < 70) { y = 70; vy = -vy * R; }
      if (y > fy) {
        y = fy;
        if (Math.abs(vy) > 4) { bounces++; squash(Math.min(1, Math.abs(vy) / 22)); }
        vy = -vy * R;
        vx *= 0.8;
      }
    };
    const step = (now) => {
      const frames = Math.min(30, Math.max(1, Math.round((now - tPrev) / 16.67)));
      tPrev = now;
      for (let i = 0; i < frames; i++) sub();
      const fy = floorY();
      place({ x, y });
      sprite.style.transform = `rotate(${spin}deg)`;
      const resting = y >= fy - 0.5 && Math.abs(vy) < 1.5 && Math.abs(vx) < 0.4;
      if (resting) {
        phys = null;
        place({ x, y: fy });
        sprite.animate([{ transform: `rotate(${spin % 360}deg)` }, { transform: 'rotate(0deg)' }], { duration: 300, easing: EASE_OUT })
          .finished.then(() => { sprite.style.transform = ''; });
        land(bounces > 1 || Math.abs(spin) > 200);
        return;
      }
      phys = requestAnimationFrame(step);
    };
    phys = requestAnimationFrame(step);
  }
  function squash(k) {
    if (reduced()) return;
    root.querySelector('.m-body').animate([
      { transform: 'scale(1, 1)' }, { transform: `scale(${1 + 0.25 * k}, ${1 - 0.25 * k})`, offset: 0.3 }, { transform: 'scale(1, 1)' },
    ], { duration: 260, easing: 'ease-out' });
  }
  function land(dizzy) {
    savePos();
    state = 'idle';
    if (dizzy) {
      root.classList.add('dizzy'); setMood('dizzy');
      say(rand(LINES.dizzy), 1800);
      setTimeout(() => { root.classList.remove('dizzy'); setMood('smile'); }, 1600);
    } else { moodFor('happy', 900); say(rand(LINES.land), 1800); }
  }

  /* ---------- Caresses ---------- */
  function onPet(e) {
    if (state !== 'idle' || e.buttons) return;
    const now = performance.now();
    if (now - petT > 600) petDist = 0;
    petDist += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
    petT = now;
    if (petDist > 260 && now > petCool) {
      petCool = now + 3500; petDist = 0;
      joy(1400);
      hearts(5);
      say(rand(LINES.pet), 1800);
    }
  }
  function hearts(n) {
    if (reduced()) return;
    for (let i = 0; i < n; i++) {
      const h = document.createElement('span');
      h.className = 'm-heart';
      h.textContent = '♥';
      h.style.left = `${30 + Math.random() * 40}%`;
      h.style.setProperty('--dx', `${(Math.random() - 0.5) * 50}px`);
      h.style.animationDelay = `${i * 90}ms`;
      root.appendChild(h);
      setTimeout(() => h.remove(), 1400 + i * 90);
    }
  }

  /* ---------- Regard ---------- */
  function onPointer(e) {
    pointer = { x: e.clientX, y: e.clientY };
    activity();
    if (!raf) raf = requestAnimationFrame(look);
  }
  function look() {
    raf = null;
    if (!pointer || !enabled || state === 'sleep' || state === 'antic') return;
    const r = svg.getBoundingClientRect();
    const cx = r.left + r.width * 0.5, cy = r.top + r.height * 0.64;
    const dx = pointer.x - cx, dy = pointer.y - cy;
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / 260);
    lookAt((dx / d) * 3.2 * k, (dy / d) * 3.2 * k);
  }
  function lookAt(px, py) {
    pupils.forEach((p) => { p.style.transform = `translate(${px}px, ${py}px)`; });
    face.style.transform = `translate(${px * 0.45}px, ${py * 0.35}px)`;
  }

  /* ---------- Clignement ---------- */
  function blink() {
    eyes.forEach((el) => el.animate(
      [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.1)', offset: 0.45 }, { transform: 'scaleY(1)' }],
      { duration: 160, easing: 'ease-out' }));
  }
  function scheduleBlink() {
    clearTimeout(blinkTimer);
    blinkTimer = setTimeout(() => {
      if (!document.hidden && state === 'idle' && !reduced()) {
        blink();
        if (Math.random() < 0.2) setTimeout(blink, 220);
      }
      scheduleBlink();
    }, 2600 + Math.random() * 3800);
  }

  /* ---------- Petites occupations quand on la laisse tranquille ---------- */
  function scheduleAntic() {
    clearTimeout(anticTimer);
    anticTimer = setTimeout(() => {
      if (enabled && !document.hidden && state === 'idle' && !focusOn && !reduced()) rand([dance, helicopter, lookAround, yawn, hop, peek])();
      scheduleAntic();
    }, 9000 + Math.random() * 11000);
  }
  function lookAround() {
    state = 'antic';
    const seq = [[-3.2, 0], [3.2, 0], [0, -2.5], [0, 0]];
    seq.forEach(([x, y], i) => setTimeout(() => lookAt(x, y), i * 420));
    setTimeout(() => { state = 'idle'; }, seq.length * 420);
  }
  function yawn() {
    setMood('wide');
    root.classList.add('yawning');
    play(sprite, [{ transform: 'scale(1,1)' }, { transform: 'scale(0.97,1.06)', offset: 0.5 }, { transform: 'scale(1,1)' }], { duration: 1300, easing: 'ease-in-out' });
    setTimeout(() => { root.classList.remove('yawning'); setMood('smile'); }, 1300);
  }
  function dance() {
    play(sprite, [
      { transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-8px) rotate(-10deg)' }, { transform: 'translateY(0) rotate(0)' },
      { transform: 'translateY(-8px) rotate(10deg)' }, { transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-14px) rotate(-6deg)' },
      { transform: 'translateY(0) rotate(0)' },
    ], { duration: 1300, easing: 'ease-in-out' });
    wave(); moodFor('happy', 1300);
  }
  function helicopter() {
    const leaves = root.querySelector('.m-leaves');
    play(leaves, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(1080deg)' }], { duration: 1300, easing: 'cubic-bezier(0.45, 0, 0.55, 1)' });
    play(sprite, [{ transform: 'translateY(0)' }, { transform: 'translateY(-22px)', offset: 0.5 }, { transform: 'translateY(0)' }], { duration: 1300, easing: 'ease-in-out' });
    play(shadow, [{ transform: 'scale(1)' }, { transform: 'scale(0.6)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: 1300, easing: 'ease-in-out' });
    moodFor('open', 1300);
  }
  function peek() {
    play(sprite, [{ transform: 'rotate(0) translateX(0)' }, { transform: 'rotate(-14deg) translateX(-6px)', offset: 0.35 }, { transform: 'rotate(-14deg) translateX(-6px)', offset: 0.65 }, { transform: 'rotate(0) translateX(0)' }], { duration: 1400, easing: 'ease-in-out' });
    lookAt(-3.2, -1);
  }

  /* ---------- Sommeil ---------- */
  function activity() {
    if (state === 'sleep') wake();
    resetIdle();
  }
  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(sleep, focusOn ? 30 * 60000 : 45000);
  }
  function sleep() {
    if (!enabled || state !== 'idle') return;
    setMood('sleep');
    state = 'sleep';
    root.classList.add('sleeping');
  }
  function wake() {
    state = 'idle';
    root.classList.remove('sleeping');
    setMood('wide');
    hop(0.6);
    if (!focusOn) say(rand(LINES.wake), 2200);
    clearTimeout(moodTimer);
    moodTimer = setTimeout(() => setMood('smile'), 900);
  }

  /* ---------- Expressions ---------- */
  function setMood(m) {
    root.dataset.mood = m;
    if (MOUTHS[m]) mouth.setAttribute('d', MOUTHS[m]);
    if (m === 'happy' || m === 'joy') mouth.setAttribute('d', MOUTHS.grin);
    if (m === 'dizzy') mouth.setAttribute('d', MOUTHS.open);
  }
  function moodFor(m, ms) {
    setMood(m);
    clearTimeout(moodTimer);
    moodTimer = setTimeout(() => { if (state !== 'sleep') setMood(focusOn ? 'flat' : 'smile'); }, ms);
  }
  function joy(ms) { moodFor('joy', ms); }

  /* ---------- Bulle ---------- */
  function say(text, ms = 3200, force) {
    if (!enabled || !text || (focusOn && !force)) return;
    bubble.textContent = text;
    bubble.classList.remove('show');
    void bubble.offsetWidth;
    bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('show'), ms);
  }

  /* ---------- Mouvements (WAAPI, interruptibles) ---------- */
  function play(el, frames, opts) {
    if (reduced() || state === 'grab') return null;
    el.getAnimations().forEach((a) => a.cancel());
    return el.animate(frames, opts);
  }
  function hop(power = 1) {
    const h = -26 * power;
    play(sprite, [
      { transform: 'translateY(0) scale(1, 1)' },
      { transform: 'translateY(0) scale(1.12, 0.86)', offset: 0.15 },
      { transform: `translateY(${h}px) scale(0.92, 1.1)`, offset: 0.45 },
      { transform: 'translateY(0) scale(1.1, 0.9)', offset: 0.78 },
      { transform: 'translateY(0) scale(1, 1)' },
    ], { duration: 520 + 120 * power, easing: 'ease-out' });
    play(shadow, [
      { transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.6)', opacity: 0.5, offset: 0.45 }, { transform: 'scale(1)', opacity: 1 },
    ], { duration: 520 + 120 * power, easing: 'ease-out' });
  }
  function spin() {
    play(sprite, [
      { transform: 'translateY(0) rotate(0deg)' },
      { transform: 'translateY(-30px) rotate(180deg)', offset: 0.5 },
      { transform: 'translateY(0) rotate(360deg)' },
    ], { duration: 720, easing: 'cubic-bezier(0.45, 0, 0.2, 1)' });
  }
  function wiggle() {
    play(sprite, [
      { transform: 'rotate(0deg)' }, { transform: 'rotate(-9deg)' }, { transform: 'rotate(8deg)' },
      { transform: 'rotate(-5deg)' }, { transform: 'rotate(3deg)' }, { transform: 'rotate(0deg)' },
    ], { duration: 560, easing: 'ease-in-out' });
  }
  function wave() {
    play(root.querySelector('.m-arm-r'), [
      { transform: 'rotate(0deg)' }, { transform: 'rotate(-40deg)', offset: 0.2 }, { transform: 'rotate(-15deg)', offset: 0.4 },
      { transform: 'rotate(-40deg)', offset: 0.6 }, { transform: 'rotate(-15deg)', offset: 0.8 }, { transform: 'rotate(0deg)' },
    ], { duration: 1100, easing: 'ease-in-out' });
  }
  function droop() {
    play(sprite, [
      { transform: 'translateY(0) scale(1, 1)' },
      { transform: 'translateY(4px) scale(1.05, 0.93)', offset: 0.4 },
      { transform: 'translateY(0) scale(1, 1)' },
    ], { duration: 900, easing: EASE_OUT });
  }
  function droopLeaves() {
    play(root.querySelector('.m-leaves'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-14deg) translateY(4px)', offset: 0.5 }, { transform: 'rotate(0)' }], { duration: 1400, easing: 'ease-in-out' });
  }
  function sparkle() {
    play(sparkles, [
      { opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'scale(1.1)', offset: 0.3 }, { opacity: 0, transform: 'scale(1.2)' },
    ], { duration: 900, easing: EASE_OUT });
  }

  /* ---------- Réactions ---------- */
  function poke() {
    if (state === 'sleep') { wake(); return; }
    const now = Date.now();
    lastPokes = lastPokes.filter((t) => now - t < 1600);
    lastPokes.push(now);
    if (lastPokes.length >= 5) {
      lastPokes = [];
      state = 'dizzy';
      root.classList.add('dizzy');
      setMood('dizzy');
      play(sprite, [{ transform: 'rotate(0)' }, { transform: 'rotate(-14deg)' }, { transform: 'rotate(12deg)' }, { transform: 'rotate(-8deg)' }, { transform: 'rotate(0)' }],
        { duration: 1400, easing: 'ease-in-out' });
      say(rand(LINES.dizzy), 2200, true);
      setTimeout(() => { state = 'idle'; root.classList.remove('dizzy'); setMood('smile'); }, 1800);
      return;
    }
    rand([hop, wiggle, spin, dance, helicopter])();
    moodFor('happy', 900);
    if (dueN && Math.random() < 0.3) say(rand(LINES.thirsty(dueN)), 3600, true);
    else say(rand(LINES.poke), 3600, true);
  }

  function react(type) {
    if (!root || !enabled) return;
    activity();
    switch (type) {
      case 'hello': wave(); hop(0.5); moodFor('happy', 1200); say(rand(LINES.hello), 3800); break;
      case 'done': hop(1); sparkle(); joy(1200); say(rand(LINES.done), 2200, true); break;
      case 'again': droop(); moodFor('sad', 1600); say(rand(LINES.again), 2600, true); break;
      case 'levelup': spin(); sparkle(); hearts(4); joy(1800); say(rand(LINES.levelup), 3800, true); break;
      case 'reading': root.classList.add('reading'); moodFor('open', 99999); say(rand(LINES.reading), 60000, true); break;
      case 'imported': root.classList.remove('reading'); hop(1.2); sparkle(); joy(1400); say(rand(LINES.imported), 2600, true); break;
      case 'stop-reading': root.classList.remove('reading'); setMood('smile'); bubble.classList.remove('show'); break;
      case 'created': hop(0.8); wave(); moodFor('happy', 1200); say(rand(LINES.created), 2600, true); break;
      case 'finished': spin(); sparkle(); joy(1600); say(rand(LINES.finished), 3000, true); break;
      case 'goal': dance(); sparkle(); hearts(6); joy(2000); say(rand(LINES.goal), 3200, true); break;
      case 'focusdone': hop(1); sparkle(); joy(1600); say(rand(LINES.focusdone), 4000, true); break;
    }
  }

  /* ---------- États liés à l'étude ---------- */
  function setLevel(lvl, silent) {
    const grew = lvl > level;
    level = lvl;
    if (!root) return;
    root.dataset.stage = lvl >= 6 ? 4 : lvl >= 4 ? 3 : lvl >= 2 ? 2 : 1;
    if (grew && !silent) react('levelup');
  }
  function setThirst(n) {
    dueN = n;
    thirst = n === 0 ? 0 : n < 10 ? 1 : 2;
    if (root) root.dataset.thirst = thirst;
  }
  function setFocus(on) {
    if (!root || on === focusOn) return;
    focusOn = on;
    root.classList.toggle('focus', on);
    if (on) { say(rand(LINES.focus), 2600, true); setMood('flat'); }
    else setMood('smile');
    resetIdle();
  }

  window.Mascot = { init, react, say: (t, ms) => say(t, ms, true), setLevel, setEnabled, setThirst, setFocus };
})();
