/* Pousse, la mascotte d'Arbor.
   Une petite pousse en SVG : ses yeux suivent le curseur, elle cligne, respire et se balance,
   réagit aux clics et aux progrès, s'endort quand on ne fait rien et grandit avec le niveau.
   Animations : CSS pour les boucles calmes, Web Animations API pour les réactions (interruptibles). */
(function () {
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a) => a[Math.floor(Math.random() * a.length)];
  const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
  const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

  const MOUTHS = {
    smile: 'M52 89 Q60 96 68 89',
    grin: 'M50 87 Q60 100 70 87 Z',
    open: 'M55 89 Q60 99 65 89 Q60 86 55 89 Z',
    sad: 'M53 94 Q60 87 67 94',
    flat: 'M54 91 L66 91',
    sleep: 'M55 91 Q60 94 65 91',
  };

  const LINES = {
    hello: [
      'Salut ! On fait pousser quelques connaissances ?',
      'Coucou ! Une petite branche aujourd’hui ?',
      'Te revoilà ! J’ai arrosé tes sujets.',
    ],
    poke: [
      'Hé, ça chatouille !',
      'Astuce : une feuille de l’arbre = une seule idée.',
      'Astuce : colle un plan indenté pour créer plein de parties d’un coup.',
      'Astuce : glisse une partie sur une autre pour la ranger dedans.',
      'Je suis une pousse, pas un bouton ! Enfin… un peu les deux.',
      'Révise un peu chaque jour, je grandis avec toi.',
      'Astuce : en révision, Espace retourne la carte.',
      'Tu savais ? Réexpliquer avec tes mots, c’est la meilleure façon de retenir.',
      'Photosynthèse en cours… ah non, c’est juste ta lumière d’écran.',
    ],
    dizzy: ['Ouh là, j’ai la tête qui tourne…', 'Doucement, je vais perdre mes feuilles !'],
    done: ['Bravo, une de plus !', 'Maîtrisé ! +10 XP', 'Joli travail !', 'Ça pousse, ça pousse !'],
    again: ['Pas grave, on la reverra.', 'Courage, la prochaine sera la bonne !', 'Les racines prennent du temps.'],
    levelup: ['Niveau supérieur ! Regarde, j’ai une nouvelle feuille !', 'Je grandis ! Merci de t’occuper de moi.'],
    reading: ['Je lis ton PDF…', 'Je range tout en petites branches…'],
    imported: ['Voilà ton cours, bien rangé !'],
    created: ['Nouveau sujet ! On va le faire pousser.', 'Une nouvelle graine de plantée !'],
    wake: ['Hein ? J’étais pas endormi !', 'Ah, te revoilà !'],
    finished: ['Session terminée, champion !', 'Fin de la révision, bien joué !'],
  };

  let root, svg, bubble, pupils, face, eyes, mouth, body, sprite, shadow, zzz, sparkles, leaf3, bud, flower;
  let state = 'idle';
  let level = 1;
  let blinkTimer, idleTimer, bubbleTimer, moodTimer;
  let lastPokes = [];
  let pointer = null, raf = null;
  let enabled = true;

  const markup = `
    <div class="mascot-bubble" id="mascotBubble" aria-hidden="true"></div>
    <button class="mascot-btn" id="mascotBtn" type="button" aria-label="Pousse, la mascotte. Cliquer pour jouer avec elle">
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
            <path class="m-torso" fill="url(#mBody)" d="M60 46 C84 46 96 62 95 82 C94 102 80 110 60 110 C40 110 26 102 25 82 C24 62 36 46 60 46 Z"/>
            <ellipse cx="60" cy="96" rx="22" ry="10" fill="#B9F5C7" opacity=".35"/>
            <path d="M40 58 C46 52 54 50 60 50" stroke="#fff" stroke-opacity=".45" stroke-width="3" stroke-linecap="round" fill="none"/>
            <g class="m-face">
              <ellipse cx="41" cy="88" rx="6" ry="3.6" fill="#FF7A9C" opacity=".5"/>
              <ellipse cx="79" cy="88" rx="6" ry="3.6" fill="#FF7A9C" opacity=".5"/>
              <g class="m-eye m-eye-l"><ellipse cx="49" cy="76" rx="7.5" ry="8.5" fill="#fff"/><g class="m-pupil"><circle cx="49" cy="77" r="4.4" fill="#18202B"/><circle cx="50.6" cy="75.2" r="1.5" fill="#fff"/></g></g>
              <g class="m-eye m-eye-r"><ellipse cx="71" cy="76" rx="7.5" ry="8.5" fill="#fff"/><g class="m-pupil"><circle cx="71" cy="77" r="4.4" fill="#18202B"/><circle cx="72.6" cy="75.2" r="1.5" fill="#fff"/></g></g>
              <g class="m-closed"><path d="M42 77 Q49 81 56 77" /><path d="M64 77 Q71 81 78 77" /></g>
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
    svg = root.querySelector('svg');
    bubble = root.querySelector('#mascotBubble');
    sprite = root.querySelector('.m-sprite');
    body = root.querySelector('.m-body');
    shadow = root.querySelector('.m-shadow');
    face = root.querySelector('.m-face');
    pupils = [...root.querySelectorAll('.m-pupil')];
    eyes = [...root.querySelectorAll('.m-eye')];
    mouth = root.querySelector('.m-mouth');
    zzz = root.querySelector('.m-zzz');
    sparkles = root.querySelector('.m-sparkles');
    leaf3 = root.querySelector('.m-leaf-3');
    bud = root.querySelector('.m-bud');
    flower = root.querySelector('.m-flower');

    root.querySelector('#mascotBtn').addEventListener('click', poke);
    root.querySelector('#mascotHide').addEventListener('click', () => { opts.onHide && opts.onHide(); });
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('keydown', activity, { passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleBlink(); });

    setLevel(opts.level || 1, true);
    setEnabled(enabled);
    scheduleBlink();
    resetIdle();

    // Salut : souvent les premières fois, puis de plus en plus rarement (la mascotte se fait discrète)
    let visits = 0;
    try { visits = +localStorage.getItem('arbor:visits') || 0; localStorage.setItem('arbor:visits', visits + 1); } catch (e) { /* stockage indisponible */ }
    if (enabled && (visits < 3 || Math.random() < 0.25)) setTimeout(() => react('hello'), 900);
  }

  function setEnabled(on) {
    enabled = on;
    if (!root) return;
    root.classList.toggle('off', !on);
  }

  /* ---------- Regard ---------- */
  function onPointer(e) {
    pointer = { x: e.clientX, y: e.clientY };
    activity();
    if (!raf) raf = requestAnimationFrame(look);
  }
  function look() {
    raf = null;
    if (!pointer || !enabled || state === 'sleep' || state === 'dizzy') return;
    const r = svg.getBoundingClientRect();
    const cx = r.left + r.width * 0.5, cy = r.top + r.height * 0.64;
    const dx = pointer.x - cx, dy = pointer.y - cy;
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / 260);
    const px = (dx / d) * 3.2 * k, py = (dy / d) * 3.2 * k;
    pupils.forEach((p) => { p.style.transform = `translate(${px}px, ${py}px)`; });
    face.style.transform = `translate(${px * 0.45}px, ${py * 0.35}px)`;
  }

  /* ---------- Clignement ---------- */
  function scheduleBlink() {
    clearTimeout(blinkTimer);
    blinkTimer = setTimeout(() => {
      if (!document.hidden && state !== 'sleep' && state !== 'dizzy' && !reduced()) {
        eyes.forEach((el) => el.animate(
          [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.1)', offset: 0.45 }, { transform: 'scaleY(1)' }],
          { duration: 160, easing: 'ease-out' }));
        if (Math.random() < 0.2) setTimeout(() => eyes.forEach((el) => el.animate(
          [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.1)', offset: 0.45 }, { transform: 'scaleY(1)' }],
          { duration: 140 })), 220);
      }
      scheduleBlink();
    }, 2600 + Math.random() * 3800);
  }

  /* ---------- Sommeil ---------- */
  function activity() {
    if (state === 'sleep') wake();
    resetIdle();
  }
  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(sleep, 45000);
  }
  function sleep() {
    if (!enabled || state === 'sleep') return;
    setMood('sleep');
    state = 'sleep';
    root.classList.add('sleeping');
  }
  function wake() {
    state = 'idle';
    root.classList.remove('sleeping');
    setMood('open');
    hop(0.6);
    say(rand(LINES.wake), 2200);
    clearTimeout(moodTimer);
    moodTimer = setTimeout(() => setMood('smile'), 900);
  }

  /* ---------- Expressions ---------- */
  function setMood(m) {
    root.dataset.mood = m;
    if (MOUTHS[m]) mouth.setAttribute('d', MOUTHS[m]);
    if (m === 'happy') mouth.setAttribute('d', MOUTHS.grin);
    if (m === 'dizzy') mouth.setAttribute('d', MOUTHS.open);
  }
  function moodFor(m, ms) {
    setMood(m);
    clearTimeout(moodTimer);
    moodTimer = setTimeout(() => { if (state !== 'sleep') setMood('smile'); }, ms);
  }

  /* ---------- Bulle ---------- */
  function say(text, ms = 3200) {
    if (!enabled || !text) return;
    bubble.textContent = text;
    bubble.classList.remove('show');
    void bubble.offsetWidth;
    bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('show'), ms);
  }

  /* ---------- Mouvements (WAAPI, interruptibles) ---------- */
  function play(el, frames, opts) {
    if (reduced()) return null;
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
    const arm = root.querySelector('.m-arm-r');
    play(arm, [
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
      say(rand(LINES.dizzy));
      setTimeout(() => { state = 'idle'; root.classList.remove('dizzy'); setMood('smile'); }, 1800);
      return;
    }
    const pick = Math.floor(Math.random() * 3);
    if (pick === 0) hop(); else if (pick === 1) wiggle(); else spin();
    moodFor('happy', 900);
    say(rand(LINES.poke), 3600);
  }

  function react(type) {
    if (!root || !enabled) return;
    activity();
    switch (type) {
      case 'hello': wave(); moodFor('happy', 1200); say(rand(LINES.hello), 3800); break;
      case 'done': hop(1); sparkle(); moodFor('happy', 1200); say(rand(LINES.done), 2200); break;
      case 'again': droop(); moodFor('sad', 1600); say(rand(LINES.again), 2600); break;
      case 'levelup': spin(); sparkle(); moodFor('happy', 1800); say(rand(LINES.levelup), 3800); break;
      case 'reading': root.classList.add('reading'); moodFor('open', 99999); say(rand(LINES.reading), 60000); break;
      case 'imported': root.classList.remove('reading'); hop(1.2); sparkle(); moodFor('happy', 1400); say(rand(LINES.imported), 2600); break;
      case 'stop-reading': root.classList.remove('reading'); setMood('smile'); bubble.classList.remove('show'); break;
      case 'created': hop(0.8); wave(); moodFor('happy', 1200); say(rand(LINES.created), 2600); break;
      case 'finished': spin(); sparkle(); moodFor('happy', 1600); say(rand(LINES.finished), 3000); break;
    }
  }

  /* ---------- Croissance ---------- */
  function setLevel(lvl, silent) {
    const grew = lvl > level;
    level = lvl;
    if (!root) return;
    root.dataset.stage = lvl >= 6 ? 4 : lvl >= 4 ? 3 : lvl >= 2 ? 2 : 1;
    if (grew && !silent) react('levelup');
  }

  window.Mascot = { init, react, say, setLevel, setEnabled };
})();
