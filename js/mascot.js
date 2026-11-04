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
    smile: 'M53 88 Q60 95 67 88',
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
  let calm = false; // mode calme : pas d'occupations spontanées ni de bavardage

  const markup = `
    <div class="mascot-bubble" id="mascotBubble" aria-hidden="true"></div>
    <button class="mascot-btn" id="mascotBtn" type="button" aria-label="Pousse, la mascotte. Clique pour jouer, ou attrape-la pour la lancer">
      <svg viewBox="0 0 120 120" class="mascot-svg" aria-hidden="true">
        <ellipse class="m-shadow" cx="60" cy="113" rx="26" ry="4"/>
        <g class="m-sprite">
          <circle class="m-aura" cx="60" cy="74" r="50"/>
          <circle class="m-aura-rainbow" cx="60" cy="74" r="47" fill="none" stroke-width="3"/>
          <g class="m-body">
            <!-- Ce qui pousse sur la tête : une silhouette simple par rang -->
            <g class="m-leaves">
              <g class="pc r0"><path class="p-stem" d="M60 43 C60 39 61 36 63 34"/><g class="p-leaf" transform="translate(63 35) rotate(40) scale(0.55)"><path class="pl-a" d="M0 0 C-7 -6 -7 -15 0 -22 Z"/><path class="pl-b" d="M0 0 C7 -6 7 -15 0 -22 Z"/></g></g>
              <g class="pc r1"><path class="p-stem" d="M60 44 L60 32"/><g class="p-leaf" transform="translate(60 33) rotate(-48) scale(0.85)"><path class="pl-a" d="M0 0 C-7 -6 -7 -15 0 -22 Z"/><path class="pl-b" d="M0 0 C7 -6 7 -15 0 -22 Z"/></g><g class="p-leaf" transform="translate(60 33) rotate(48) scale(0.85)"><path class="pl-a" d="M0 0 C-7 -6 -7 -15 0 -22 Z"/><path class="pl-b" d="M0 0 C7 -6 7 -15 0 -22 Z"/></g></g>
              <g class="pc r2"><path class="p-stem" d="M60 44 L60 26"/><g class="p-leaf" transform="translate(60 36) rotate(-60) scale(0.8)"><path class="pl-a" d="M0 0 C-7 -6 -7 -15 0 -22 Z"/><path class="pl-b" d="M0 0 C7 -6 7 -15 0 -22 Z"/></g><g class="p-leaf" transform="translate(60 36) rotate(60) scale(0.8)"><path class="pl-a" d="M0 0 C-7 -6 -7 -15 0 -22 Z"/><path class="pl-b" d="M0 0 C7 -6 7 -15 0 -22 Z"/></g><g class="p-leaf" transform="translate(60 27) rotate(0) scale(0.95)"><path class="pl-a" d="M0 0 C-7 -6 -7 -15 0 -22 Z"/><path class="pl-b" d="M0 0 C7 -6 7 -15 0 -22 Z"/></g></g>
              <g class="pc r3"><path class="p-stem" d="M60 44 L60 22"/><g class="p-leaf" transform="translate(60 38) rotate(-78) scale(0.75)"><path class="pl-a" d="M0 0 C-7 -6 -7 -15 0 -22 Z"/><path class="pl-b" d="M0 0 C7 -6 7 -15 0 -22 Z"/></g><g class="p-leaf" transform="translate(60 38) rotate(78) scale(0.75)"><path class="pl-a" d="M0 0 C-7 -6 -7 -15 0 -22 Z"/><path class="pl-b" d="M0 0 C7 -6 7 -15 0 -22 Z"/></g><g class="p-leaf" transform="translate(60 31) rotate(-38) scale(0.85)"><path class="pl-a" d="M0 0 C-7 -6 -7 -15 0 -22 Z"/><path class="pl-b" d="M0 0 C7 -6 7 -15 0 -22 Z"/></g><g class="p-leaf" transform="translate(60 31) rotate(38) scale(0.85)"><path class="pl-a" d="M0 0 C-7 -6 -7 -15 0 -22 Z"/><path class="pl-b" d="M0 0 C7 -6 7 -15 0 -22 Z"/></g>
                <g class="p-bud"><path d="M60 23 C55.5 20 56 13 60 9 C64 13 64.5 20 60 23 Z"/></g></g>
              <g class="pc r4"><path class="p-trunk" d="M57 44 L57.6 30 L62.4 30 L63 44 Z"/><g class="p-canopy" transform="translate(60 24)"><path class="pc-a" d="M-22 4 C-27 4 -29 -4 -24 -8 C-27 -16 -18 -22 -12 -18 C-10 -27 4 -29 8 -21 C14 -26 24 -21 22 -13 C29 -11 29 0 22 3 C20 9 -16 10 -22 4 Z"/><path class="pc-b" d="M22 3 C20 9 -16 10 -22 4 C-10 6 10 5 20 -2 C24 -4 26 -8 25 -11 C29 -7 28 1 22 3 Z"/><path class="pc-h" d="M-17 -10 C-14 -15 -8 -17 -3 -15" stroke-width="3.2" stroke-linecap="round" fill="none"/></g><g class="p-flower" transform="translate(50 16) scale(0.9)"><circle cx="0" cy="-3.2" r="2.6"/><circle cx="3" cy="-1" r="2.6"/><circle cx="1.9" cy="2.6" r="2.6"/><circle cx="-1.9" cy="2.6" r="2.6"/><circle cx="-3" cy="-1" r="2.6"/><circle class="pf-c" r="1.8"/></g><g class="p-flower" transform="translate(70 19) scale(0.8)"><circle cx="0" cy="-3.2" r="2.6"/><circle cx="3" cy="-1" r="2.6"/><circle cx="1.9" cy="2.6" r="2.6"/><circle cx="-1.9" cy="2.6" r="2.6"/><circle cx="-3" cy="-1" r="2.6"/><circle class="pf-c" r="1.8"/></g><g class="p-flower" transform="translate(62 6) scale(0.75)"><circle cx="0" cy="-3.2" r="2.6"/><circle cx="3" cy="-1" r="2.6"/><circle cx="1.9" cy="2.6" r="2.6"/><circle cx="-1.9" cy="2.6" r="2.6"/><circle cx="-3" cy="-1" r="2.6"/><circle class="pf-c" r="1.8"/></g></g>
              <g class="pc r5"><path class="p-trunk" d="M57 44 L57.6 30 L62.4 30 L63 44 Z"/><g class="p-canopy" transform="translate(60 24)"><path class="pc-a" d="M-22 4 C-27 4 -29 -4 -24 -8 C-27 -16 -18 -22 -12 -18 C-10 -27 4 -29 8 -21 C14 -26 24 -21 22 -13 C29 -11 29 0 22 3 C20 9 -16 10 -22 4 Z"/><path class="pc-b" d="M22 3 C20 9 -16 10 -22 4 C-10 6 10 5 20 -2 C24 -4 26 -8 25 -11 C29 -7 28 1 22 3 Z"/><path class="pc-h" d="M-17 -10 C-14 -15 -8 -17 -3 -15" stroke-width="3.2" stroke-linecap="round" fill="none"/></g><g class="p-flower" transform="translate(52 12) scale(0.75)"><circle cx="0" cy="-3.2" r="2.6"/><circle cx="3" cy="-1" r="2.6"/><circle cx="1.9" cy="2.6" r="2.6"/><circle cx="-1.9" cy="2.6" r="2.6"/><circle cx="-3" cy="-1" r="2.6"/><circle class="pf-c" r="1.8"/></g>
                <g class="p-acorn" transform="translate(76 26)"><path d="M0 0 L0 3" stroke="#7A5230" stroke-width="1.4"/><ellipse cx="0" cy="8" rx="3.8" ry="4.8" fill="#D08A47"/><path d="M-4.4 5.6 C-4 2 4 2 4.4 5.6 Z" fill="#7A4E2C"/></g>
                <g class="p-acorn a2" transform="translate(44 27)"><path d="M0 0 L0 3" stroke="#7A5230" stroke-width="1.4"/><ellipse cx="0" cy="8" rx="3.4" ry="4.4" fill="#D08A47"/><path d="M-4 5.4 C-3.6 2 3.6 2 4 5.4 Z" fill="#7A4E2C"/></g></g>
              <g class="pc r6"><path class="p-trunk" d="M57 44 L57.6 30 L62.4 30 L63 44 Z"/><g class="p-canopy" transform="translate(60 24)"><path class="pc-a" d="M-22 4 C-27 4 -29 -4 -24 -8 C-27 -16 -18 -22 -12 -18 C-10 -27 4 -29 8 -21 C14 -26 24 -21 22 -13 C29 -11 29 0 22 3 C20 9 -16 10 -22 4 Z"/><path class="pc-b" d="M22 3 C20 9 -16 10 -22 4 C-10 6 10 5 20 -2 C24 -4 26 -8 25 -11 C29 -7 28 1 22 3 Z"/><path class="pc-h" d="M-17 -10 C-14 -15 -8 -17 -3 -15" stroke-width="3.2" stroke-linecap="round" fill="none"/></g><g class="p-flower" transform="translate(50 17) scale(0.8)"><circle cx="0" cy="-3.2" r="2.6"/><circle cx="3" cy="-1" r="2.6"/><circle cx="1.9" cy="2.6" r="2.6"/><circle cx="-1.9" cy="2.6" r="2.6"/><circle cx="-3" cy="-1" r="2.6"/><circle class="pf-c" r="1.8"/></g><g class="p-flower" transform="translate(71 15) scale(0.7)"><circle cx="0" cy="-3.2" r="2.6"/><circle cx="3" cy="-1" r="2.6"/><circle cx="1.9" cy="2.6" r="2.6"/><circle cx="-1.9" cy="2.6" r="2.6"/><circle cx="-3" cy="-1" r="2.6"/><circle class="pf-c" r="1.8"/></g>
                <g class="p-bird" transform="translate(64 0)"><path class="pb-a" d="M-7 0 C-7 -6 -1 -8 3 -5 C6 -3 7 1 5 4 C2 7 -7 6 -7 0 Z"/><path class="pb-b" d="M-1 1 C2 0 5 2 5 4 C2 6 -1 5 -1 1 Z"/>
                  <circle cx="-3.2" cy="-2.6" r="1.1" fill="#1C1F2A"/><path d="M-7.2 -1.6 L-10 -0.6 L-7.2 0.4 Z" fill="#FFB020"/></g></g>
              <g class="pc r7"><path class="p-trunk" d="M57 44 L57.6 30 L62.4 30 L63 44 Z"/><g class="p-canopy" transform="translate(60 24)"><path class="pc-a" d="M-22 4 C-27 4 -29 -4 -24 -8 C-27 -16 -18 -22 -12 -18 C-10 -27 4 -29 8 -21 C14 -26 24 -21 22 -13 C29 -11 29 0 22 3 C20 9 -16 10 -22 4 Z"/><path class="pc-b" d="M22 3 C20 9 -16 10 -22 4 C-10 6 10 5 20 -2 C24 -4 26 -8 25 -11 C29 -7 28 1 22 3 Z"/><path class="pc-h" d="M-17 -10 C-14 -15 -8 -17 -3 -15" stroke-width="3.2" stroke-linecap="round" fill="none"/></g><g class="p-flower" transform="translate(51 15) scale(0.8)"><circle cx="0" cy="-3.2" r="2.6"/><circle cx="3" cy="-1" r="2.6"/><circle cx="1.9" cy="2.6" r="2.6"/><circle cx="-1.9" cy="2.6" r="2.6"/><circle cx="-3" cy="-1" r="2.6"/><circle class="pf-c" r="1.8"/></g><g class="p-flower" transform="translate(70 18) scale(0.75)"><circle cx="0" cy="-3.2" r="2.6"/><circle cx="3" cy="-1" r="2.6"/><circle cx="1.9" cy="2.6" r="2.6"/><circle cx="-1.9" cy="2.6" r="2.6"/><circle cx="-3" cy="-1" r="2.6"/><circle class="pf-c" r="1.8"/></g>
                <g class="p-crown" transform="translate(60 -6)"><path d="M-9 4 L-9 -4 L-4.5 0 L0 -7 L4.5 0 L9 -4 L9 4 Z"/><circle cx="0" cy="-7" r="1.6"/><circle cx="-9" cy="-4" r="1.3"/><circle cx="9" cy="-4" r="1.3"/></g></g>
            </g>
            <!-- Corps : couleur à plat, une ombre, un reflet. Aucun dégradé, aucun contour -->
            <g class="m-arm m-arm-l"><ellipse class="p-limb" cx="25" cy="82" rx="6.5" ry="5"/></g>
            <g class="m-arm m-arm-r"><ellipse class="p-limb" cx="95" cy="82" rx="6.5" ry="5"/></g>
            <g class="m-foot m-foot-l"><ellipse class="p-limb" cx="47" cy="110" rx="8" ry="4.6"/></g>
            <g class="m-foot m-foot-r"><ellipse class="p-limb" cx="73" cy="110" rx="8" ry="4.6"/></g>
            <path class="p-body" d="M60 40 C84 40 98 56 98 78 C98 100 82 112 60 112 C38 112 22 100 22 78 C22 56 36 40 60 40 Z"/>
            <path class="p-shade" d="M98 78 C98 100 82 112 60 112 C78 106 91 94 92 74 C93 60 88 50 80 45 C92 51 98 63 98 78 Z"/>
            <path class="p-belly" d="M38 96 C38 88 48 84 60 84 C72 84 82 88 82 96 C82 104 72 108 60 108 C48 108 38 104 38 96 Z"/>
            <path class="p-hi" d="M34 64 C37 56 43 50 50 47" stroke-width="4" stroke-linecap="round" fill="none"/>
            <g class="pc r0 p-seam"><path d="M60 46 C57.5 62 57.5 88 60 106" stroke-width="1.8" stroke-linecap="round" fill="none"/></g>
            <g class="m-book">
              <path d="M34 86 L60 90 L60 106 L34 102 Z" fill="#FFFFFF"/>
              <path d="M86 86 L60 90 L60 106 L86 102 Z" fill="#EEF1F6"/>
              <path d="M38 92 L55 94.5 M38 96 L55 98.5 M65 94.5 L82 92 M65 98.5 L82 96" stroke="#B7BDC9" stroke-width="1.4" stroke-linecap="round"/>
              <path class="m-page" d="M60 90 L82 87 L82 103 L60 106 Z" fill="#FFFFFF"/>
            </g>
            <g class="m-band">
              <path d="M27 64 C44 56 76 56 93 64 L92 71 C75 63 45 63 28 71 Z" fill="#FF5C7A"/>
              <path d="M90 64 L102 58 L99 67 Z M90 66 L103 70 L96 73 Z" fill="#FF5C7A"/>
            </g>
            <g class="m-face">
              <ellipse class="m-cheek" cx="37" cy="88" rx="5.5" ry="3.4"/>
              <ellipse class="m-cheek" cx="83" cy="88" rx="5.5" ry="3.4"/>
              <g class="m-eye m-eye-l"><ellipse cx="47" cy="74" rx="9.5" ry="11" fill="#fff"/><g class="m-pupil"><circle cx="48.5" cy="76" r="6" fill="#1C1F2A"/><circle cx="51" cy="73" r="2.2" fill="#fff"/></g></g>
              <g class="m-eye m-eye-r"><ellipse cx="73" cy="74" rx="9.5" ry="11" fill="#fff"/><g class="m-pupil"><circle cx="74.5" cy="76" r="6" fill="#1C1F2A"/><circle cx="77" cy="73" r="2.2" fill="#fff"/></g></g>
              <g class="m-closed"><path d="M40 76 Q47 81 54 76" /><path d="M66 76 Q73 81 80 76" /></g>
              <g class="m-joy"><path d="M40 78 Q47 68 54 78" /><path d="M66 78 Q73 68 80 78" /></g>
              <g class="m-dizzy"><path d="M42 70 L52 80 M52 70 L42 80"/><path d="M68 70 L78 80 M78 70 L68 80"/></g>
              <path class="m-mouth" d="${MOUTHS.smile}"/>
            </g>
          </g>
          <g class="m-glints"><path d="M40 22 l1.4 3.2 3.2 1.4 -3.2 1.4 -1.4 3.2 -1.4 -3.2 -3.2 -1.4 3.2 -1.4 z"/><path d="M82 14 l1.1 2.6 2.6 1.1 -2.6 1.1 -1.1 2.6 -1.1 -2.6 -2.6 -1.1 2.6 -1.1 z"/></g>
          <g class="m-flies"><g class="m-orbit o1"><circle cx="12" cy="70" r="2.4"/></g><g class="m-orbit o2"><circle cx="108" cy="60" r="1.9"/></g><g class="m-orbit o3"><circle cx="60" cy="16" r="2.1"/></g></g>
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
      if (enabled && !document.hidden && state === 'idle' && !focusOn && !calm && !reduced()) rand([dance, helicopter, lookAround, yawn, hop, peek])();
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
    if (!enabled || !text || ((focusOn || calm) && !force)) return;
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
    if (calm && !['levelup', 'goal', 'finished', 'focusdone', 'imported'].includes(type)) { activity(); return; }
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
  /* Pousse évolue avec le rang (niveaux) : coque de graine, feuilles, bourgeon, fleur, gland, papillon, couronne */
  let rank = -1, vigor = -1;
  function setLevel(lvl, silent) {
    const grew = lvl > level;
    level = lvl;
    if (!root) return;
    const r = window.Trophies ? Trophies.rankOf(lvl) : Math.min(7, Math.floor((lvl - 1) / 3));
    const rankUp = rank >= 0 && r > rank;
    rank = r;
    root.dataset.rank = r;
    root.dataset.stage = window.Trophies ? Trophies.stageOf(lvl) : lvl >= 6 ? 4 : lvl >= 4 ? 3 : lvl >= 2 ? 2 : 1;
    if (grew && !silent) react('levelup');
    if (rankUp && !silent) setTimeout(() => say(rand(RANK_LINES[r] || LINES.levelup), 4200, true), 1200);
  }
  const RANK_LINES = {
    1: ['Ma coque a craqué ! Me voilà pousse.'], 2: ['Une troisième feuille ! Je deviens une vraie tige.'],
    3: ['Regarde : un bouton de fleur !'], 4: ['Je suis devenu un petit arbre en fleurs. Grâce à toi.'],
    5: ['Des glands ! Je deviens un grand chêne.'], 6: ['Un oiseau s’est posé sur moi.'], 7: ['Une couronne… Forêt ancienne, rien que ça.'],
  };
  /* Pousse évolue aussi avec la régularité (série de jours) : reflets, halo, lucioles, halo irisé */
  function setVigor(streak) {
    const v = streak >= 100 ? 4 : streak >= 30 ? 3 : streak >= 7 ? 2 : streak >= 3 ? 1 : 0;
    if (!root || v === vigor) return;
    const up = vigor >= 0 && v > vigor;
    vigor = v;
    root.dataset.vigor = v;
    if (up) setTimeout(() => say(['', 'Mes feuilles brillent : 3 jours de suite !', 'Une semaine de suite ! Je rayonne.', '30 jours… les lucioles sont venues.', '100 jours. Je n’ai jamais été aussi beau.'][v], 4200, true), 600);
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
    if (on) { say('Je travaille avec toi. On se concentre !', 2600, true); setMood('flat'); }
    else setMood('smile');
    resetIdle();
  }

  function setCalm(on) { calm = on; if (root) root.classList.toggle('calm', on); }

  window.Mascot = { init, react, say: (t, ms) => say(t, ms, true), setLevel, setVigor, setEnabled, setThirst, setFocus, setCalm };
})();
