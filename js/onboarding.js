/* Onboarding : 5 écrans courts, orientés résultat. L'étudiant apprend quelque chose avant d'avoir
   eu le temps de se demander comment ça marche.
   1. La promesse   2. Ce qu'il veut améliorer   3. Formation, matière, examen (facultatifs)
   4. Premier cours : PDF, création, ou cours de démonstration sur les réseaux
   5. Le moment clé : la structure du cours, puis une première question avec un vrai retour.
   Pas de compte, pas de paiement, pas de statistiques ni de trophées pendant l'introduction. */
(function () {
  let el = null, d = null, step = 0, profile = null, pending = false;
  const GOALS = [
    ['understand', 'lightbulb', 'Comprendre mes cours'],
    ['retain', 'brain', 'Retenir plus facilement'],
    ['exams', 'flag-checkered', 'Préparer mes examens'],
    ['organise', 'calendar-check', 'M’organiser dans mes révisions'],
  ];
  const LEVELS = ['BTS', 'BUT', 'Licence', 'Titre professionnel', 'Lycée', 'Master', 'Autre'];

  /* Cours de démonstration : les bases des réseaux, rédigé pour Arbor (contenu vérifiable, sans PDF) */
  const n = (title, notes, keyPoints) => ({ title, notes, keyPoints });
  const DEMO = {
    title: 'Réseaux : les bases',
    children: [
      { title: 'Adressage IP', children: [
        n('Adresse IP', "Une adresse IP identifie une interface sur un réseau. En IPv4, elle est codée sur 32 bits et s'écrit en notation décimale pointée : quatre nombres de 0 à 255, comme 192.168.1.20.\n\nElle comporte deux parties : l'identifiant du réseau et l'identifiant de la machine. Les plages 10.0.0.0/8, 172.16.0.0/12 et 192.168.0.0/16 sont réservées aux réseaux privés.",
          ['IPv4 : 32 bits, quatre nombres de 0 à 255', 'Une partie réseau et une partie machine', 'Plages privées : 10/8, 172.16/12, 192.168/16']),
        n('Masque de sous-réseau', "Le masque indique combien de bits de l'adresse désignent le réseau. En notation CIDR, 192.168.1.20/24 signifie que les 24 premiers bits (192.168.1) identifient le réseau ; le même masque s'écrit 255.255.255.0.\n\nUn ET logique entre l'adresse et le masque donne l'adresse du réseau. Deux machines du même réseau communiquent directement, sans routeur.",
          ['Le masque sépare la partie réseau de la partie machine', '/24 = 255.255.255.0', 'Adresse ET masque = adresse du réseau']),
        n('Passerelle par défaut', "La passerelle par défaut est le routeur auquel une machine envoie les paquets destinés à un autre réseau. La machine compare l'adresse de destination à son propre réseau grâce au masque : si la destination est hors du réseau local, le paquet part vers la passerelle.",
          ['Routeur qui mène vers les autres réseaux', 'Utilisée quand la destination est hors du réseau local', 'Le masque permet de le savoir']),
      ] },
      { title: 'Services et diagnostic', children: [
        n('DHCP', "Le DHCP attribue automatiquement la configuration réseau d'une machine : adresse IP, masque, passerelle par défaut et serveurs DNS. L'adresse est prêtée pour une durée limitée, appelée bail.\n\nSans réponse d'un serveur DHCP, une machine peut s'attribuer une adresse en 169.254.x.x : c'est le signe qu'elle n'a pas obtenu de configuration.",
          ['Donne adresse IP, masque, passerelle et DNS', 'L’adresse est prêtée : c’est le bail', '169.254.x.x : pas de réponse du DHCP']),
        n('DNS', "Le DNS traduit un nom de domaine, comme exemple.fr, en adresse IP. La machine interroge un serveur DNS, qui répond lui-même ou interroge d'autres serveurs de la hiérarchie.\n\nUne panne DNS donne souvent l'impression qu'Internet ne marche plus alors que les adresses IP restent joignables.",
          ['Traduit un nom en adresse IP', 'Serveurs organisés en hiérarchie', 'Panne DNS : les noms échouent, les adresses IP répondent']),
        n('Ping et diagnostic', "La commande ping vérifie qu'une machine répond. On diagnostique du plus proche au plus lointain : sa propre interface (127.0.0.1), puis la passerelle par défaut, puis une adresse IP extérieure, puis un nom de domaine pour tester le DNS.",
          ['Ping : la machine répond-elle ?', 'Du plus proche au plus lointain', 'Tester une IP puis un nom isole le DNS']),
      ] },
    ],
  };
  const DEMO_Q = {
    notion: 'Passerelle par défaut',
    ask: 'Ton ordinateur a l’adresse 192.168.1.20/24. Il veut joindre 8.8.8.8. À qui envoie-t-il le paquet ?',
    opts: ['Directement à 8.8.8.8', 'À sa passerelle par défaut', 'Au serveur DNS'],
    right: 'À sa passerelle par défaut',
    why: '8.8.8.8 n’est pas dans le réseau 192.168.1.0/24 : le paquet part vers la passerelle, le routeur qui mène aux autres réseaux. Le DNS, lui, traduit des noms en adresses.',
  };

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pousse = (size, mood = 'happy') => (window.Mascot && Mascot.mini({ size, mood })) || '';

  function shell() {
    el = document.createElement('div');
    el.className = 'onb';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Bienvenue dans Arbor');
    el.innerHTML = `<div class="onb-top"><div class="onb-bar" aria-hidden="true"><span></span></div><button type="button" class="onb-skip" data-onb="skip">Passer</button></div><div class="onb-stage"></div>`;
    document.body.appendChild(el);
    document.documentElement.classList.add('in-onboarding');
    requestAnimationFrame(() => el.classList.add('show'));
    el.querySelector('[data-onb="skip"]').onclick = () => finish(null);
  }
  const stage = () => el.querySelector('.onb-stage');
  const setBar = () => { el.querySelector('.onb-bar span').style.transform = `scaleX(${(step + 1) / 5})`; el.querySelector('.onb-skip').hidden = step === 4; };
  const paint = (html) => { const s = stage(); s.classList.remove('in'); void s.offsetWidth; s.innerHTML = html; s.classList.add('in'); setBar(); const f = s.querySelector('[autofocus], .btn'); if (f && matchMedia('(hover: hover)').matches) f.focus(); };

  function s1() {
    step = 0;
    paint(`<div class="onb-hero">${pousse(108)}
      <h1>Tes cours ne devraient pas finir oubliés dans un dossier.</h1>
      <p>Transforme-les en connaissances que tu maîtrises vraiment.</p></div>
      <div class="onb-foot"><button class="btn big" data-onb="next">Commencer</button><small>Gratuit, sans carte bancaire, sans compte.</small></div>`);
    stage().querySelector('[data-onb="next"]').onclick = s2;
  }
  function s2() {
    step = 1;
    paint(`<div class="onb-q"><h2>Qu’est-ce que tu veux améliorer ?</h2><p>Plusieurs réponses possibles.</p>
      <div class="onb-choices">${GOALS.map(([k, icon, label]) => `<button type="button" class="onb-choice" data-k="${k}" aria-pressed="${profile.goals.includes(k)}"><i class="ph-fill ph-${icon}" aria-hidden="true"></i><span>${label}</span></button>`).join('')}</div></div>
      <div class="onb-foot"><button class="btn big" data-onb="next">Continuer</button></div>`);
    stage().querySelectorAll('.onb-choice').forEach((b) => b.onclick = () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      profile.goals = on ? [...profile.goals, b.dataset.k] : profile.goals.filter((x) => x !== b.dataset.k);
    });
    stage().querySelector('[data-onb="next"]').onclick = s3;
  }
  function s3() {
    step = 2;
    paint(`<div class="onb-q"><h2>Dis-m’en un peu plus</h2><p>Tout est facultatif.</p>
      <div class="onb-form">
        <label for="onbLevel">Formation</label>
        <select id="onbLevel"><option value="">Choisir</option>${LEVELS.map((l) => `<option ${profile.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <label for="onbSubject">Matière principale</label>
        <input id="onbSubject" autocomplete="off" placeholder="Par exemple : réseaux, droit, biologie" value="${esc(profile.subject || '')}" />
        <label for="onbExam">Date d’examen</label>
        <input id="onbExam" type="date" value="${esc(profile.examDate || '')}" />
      </div></div>
      <div class="onb-foot"><button class="btn big" data-onb="next">Continuer</button></div>`);
    stage().querySelector('[data-onb="next"]').onclick = () => {
      profile.level = stage().querySelector('#onbLevel').value;
      profile.subject = stage().querySelector('#onbSubject').value.trim().slice(0, 80);
      const ex = stage().querySelector('#onbExam').value;
      profile.examDate = ex && ex >= new Date().toISOString().slice(0, 10) ? ex : '';
      s4();
    };
  }
  function s4() {
    step = 3;
    paint(`<div class="onb-q"><h2>Ajoute ton premier cours</h2><p>Pas de PDF sous la main ? Essaie le cours de démonstration.</p>
      <div class="onb-cards">
        <button type="button" class="onb-card" data-onb="pdf"><i class="ph-fill ph-file-arrow-up" aria-hidden="true"></i><span><b>Importer un PDF</b><small>Arbor trouve les chapitres et les notions</small></span></button>
        <button type="button" class="onb-card" data-onb="demo"><i class="ph-fill ph-network" aria-hidden="true"></i><span><b>Essayer un cours sur les réseaux</b><small>6 notions, prêt tout de suite</small></span></button>
        <button type="button" class="onb-card" data-onb="manual"><i class="ph-fill ph-pencil-simple-line" aria-hidden="true"></i><span><b>Créer un cours moi-même</b><small>Titre, chapitres, notes</small></span></button>
      </div></div>`);
    stage().querySelector('[data-onb="demo"]').onclick = () => { const s = d.addCourse(DEMO, profile.examDate); wow(s, true); };
    stage().querySelector('[data-onb="pdf"]').onclick = () => { pending = true; hide(); d.importPdf(); };
    stage().querySelector('[data-onb="manual"]').onclick = () => { finish('manual'); d.newCourse(profile.subject); };
  }

  /* Écran 5 : la structure du cours, puis une première question */
  function wow(s, demo) {
    if (!el) shell();
    el.classList.add('show'); el.hidden = false;
    document.documentElement.classList.add('in-onboarding');
    step = 4;
    const A = window.Insight ? Insight.analyze(s) : null;
    const notions = A ? A.order.length : 0;
    const links = A ? [...A.rel.values()].reduce((a, r) => a + r.pre.length, 0) : 0;
    const zones = A ? A.zones : [];
    paint(`<div class="onb-q"><div class="onb-guide">${pousse(56)}<p>J’ai rangé ton cours. Voilà ce qu’il contient.</p></div>
      <h2>${esc(s.title)}</h2>
      <div class="onb-stats"><div><b class="num">${zones.length || s.root.children.length}</b><span>chapitres</span></div><div><b class="num">${notions}</b><span>notions</span></div><div><b class="num">${links}</b><span>liens entre notions</span></div></div>
      <ol class="onb-zones">${(zones.length ? zones.map((z) => [z.theme.icon, z.node.title, z.notions.length]) : s.root.children.map((c) => ['folder', c.title, c.children.length])).slice(0, 6).map(([icon, t, k], i) => `<li style="--i:${i}"><i class="ph-fill ph-${icon}" aria-hidden="true"></i><span>${esc(t)}</span><small class="num">${k}</small></li>`).join('')}</ol></div>
      <div class="onb-foot"><button class="btn big" data-onb="quiz">On vérifie ce que tu as compris ?</button></div>`);
    stage().querySelector('[data-onb="quiz"]').onclick = () => question(s, demo);
  }

  function question(s, demo) {
    // Démo : question écrite pour le cours. Cours importé : première question de la première leçon possible.
    let q = null, node = null;
    const all = []; (function rec(x) { x.children.forEach((c) => { all.push(c); rec(c); }); })(s.root);
    if (demo) { q = DEMO_Q; node = all.find((x) => x.title === DEMO_Q.notion); }
    else if (window.Lesson) {
      for (const ch of [s.root, ...all.filter((x) => x.children.length)]) {
        const b = Lesson.build(ch);
        const st = b.steps.find((x) => x.kind === 'quiz');
        if (st) { q = { ask: st.q.kind === 'gap' ? `${st.q.ask} : « ${st.q.before}… ${st.q.after} »` : `${st.q.ask}${st.q.quote ? ` « ${st.q.quote} »` : ''}`, opts: st.q.opts, right: st.q.right, why: st.d.idea }; node = all.find((x) => x.id === st.d.id); break; }
      }
    }
    if (!q) { done(s); return; }
    paint(`<div class="onb-q"><div class="onb-guide">${pousse(56, 'smile')}<p>Une seule question, pour commencer.</p></div>
      <h2 class="onb-ask">${esc(q.ask)}</h2>
      <div class="onb-opts">${q.opts.map((o, i) => `<button type="button" class="onb-opt" data-i="${i}">${esc(o)}</button>`).join('')}</div>
      <div class="onb-fb" aria-live="polite"></div></div>
      <div class="onb-foot"><button class="btn big" data-onb="next" hidden>Voir mon progrès</button></div>`);
    stage().querySelectorAll('.onb-opt').forEach((b) => b.onclick = () => {
      const pick = q.opts[+b.dataset.i], ok = pick === q.right;
      stage().querySelectorAll('.onb-opt').forEach((x) => { x.disabled = true; const v = q.opts[+x.dataset.i]; x.classList.add(v === q.right ? 'right' : x === b ? 'wrong' : 'dim'); });
      stage().querySelector('.onb-fb').innerHTML = `<p class="${ok ? 'ok' : 'ko'}"><b>${ok ? 'Exact.' : `Pas tout à fait : ${esc(q.right)}.`}</b> ${esc(q.why || '')}</p>`;
      if (node) d.firstAnswer(s, node, ok);
      const nx = stage().querySelector('[data-onb="next"]'); nx.hidden = false; nx.onclick = () => progress(s, node, ok);
    });
  }

  function progress(s, node, ok) {
    paint(`<div class="onb-hero">${pousse(108, 'joy')}
      <h1>${ok ? 'Premier pas, déjà juste.' : 'Premier pas fait.'}</h1>
      <p>« ${esc(node ? node.title : s.title)} » est maintenant <b>découverte</b>. Arbor te la reposera au bon moment, jusqu’à ce que tu la maîtrises vraiment.</p></div>
      <div class="onb-foot"><button class="btn big" data-onb="next">Explorer mon cours</button><small>Reviens demain : quelques minutes suffisent.</small></div>`);
    stage().querySelector('[data-onb="next"]').onclick = () => done(s);
  }

  function done(s) { finish('course'); d.go(s); }
  function hide() { if (el) { el.classList.remove('show'); el.hidden = true; document.documentElement.classList.remove('in-onboarding'); } }
  function finish(how) {
    d.saveProfile({ ...profile, done: true, how: how || 'skip', at: Date.now() });
    pending = false;
    if (!el) return;
    const node = el; el = null;
    node.classList.remove('show');
    document.documentElement.classList.remove('in-onboarding');
    setTimeout(() => node.remove(), 350);
  }

  window.Onboarding = {
    open(deps) { d = deps; profile = { goals: [], level: '', subject: '', examDate: '', ...(deps.profile || {}) }; if (el) el.remove(); shell(); s1(); },
    // Après l'import d'un PDF lancé depuis l'onboarding : on reprend à l'écran 5
    afterImport(s) { if (!pending) return false; pending = false; if (profile.examDate && !s.examDate) s.examDate = profile.examDate; wow(s, false); return true; },
    pending: () => pending,
    active: () => !!el && !el.hidden,
    cancelPending() { if (pending) finish('import-annule'); },
    DEMO,
  };
})();
