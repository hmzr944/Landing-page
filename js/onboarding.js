/* Introduction Student : apprendre à partir de n'importe quel point de départ (docs/onboarding.md, phase 3).
   A. Comment souhaites-tu apprendre ? Parler, Scanner, Discuter, Se tester, Importer (ou un cours d'exemple).
   B. Qu'aimerais-tu accomplir ? (choix ou réponse libre)   C. Précisions facultatives (sujet, niveau, échéance).
   D. Première expérience selon l'entrée, puis le moment clé : la structure, une question, un vrai retour.
   Chaque entrée alimente le même moteur : un sujet Arbor (notions, révisions, observations). Rien n'est simulé :
   la dictée utilise la reconnaissance vocale du navigateur, la photo la reconnaissance de texte Tesseract.js
   (open source, dans le navigateur), l'organisation et Pousse le serveur Arbor quand on est connecté.
   Une explication personnelle n'est jamais une preuve de maîtrise : ses notions restent « à vérifier ». */
(function () {
  let el = null, d = null, step = 0, profile = null, pending = false, rec = null, recTimer = null;
  const STEPS = 4;
  const ENTRIES = [
    ['parler', 'microphone', 'Parler', 'Explique à voix haute ce que tu sais ou veux apprendre'],
    ['scanner', 'camera', 'Scanner', 'Photographie un tableau, une page, des notes'],
    ['discuter', 'chats-circle', 'Discuter', 'Explore un sujet avec Pousse, question après question'],
    ['tester', 'puzzle-piece', 'Se tester', 'Commence par un défi, apprends de ta réponse'],
    ['importer', 'file-arrow-up', 'Importer', 'Un PDF, une page Wikipédia, tes propres notes'],
  ];
  const GOALS = [
    ['comprendre', 'lightbulb', 'Comprendre un sujet'], ['examen', 'flag-checkered', 'Préparer un examen'],
    ['competence', 'wrench', 'Développer une compétence'], ['pro', 'briefcase', 'Progresser professionnellement'],
    ['nouveau', 'sparkle', 'Apprendre quelque chose de nouveau'], ['explorer', 'compass', 'Explorer librement'],
  ];
  const LEVELS = [['debut', 'Je découvre'], ['bases', 'J’ai des bases'], ['avance', 'Je suis à l’aise']];
  const TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  // Brouillon de l'introduction (sur l'appareil) : si l'app se ferme au milieu, on reprend au même écran
  const DRAFT = 'arbor:onb-draft';
  const saveDraft = (screen) => { try { localStorage.setItem(DRAFT, JSON.stringify({ screen, profile, at: Date.now() })); } catch (e) { /* stockage indisponible */ } };
  const readDraft = () => { try { const x = JSON.parse(localStorage.getItem(DRAFT) || 'null'); return x && Date.now() - x.at < 7 * 864e5 ? x : null; } catch (e) { return null; } };
  const clearDraft = () => { try { localStorage.removeItem(DRAFT); } catch (e) { /* rien */ } };

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
  const ic = (n, fill) => `<i class="${fill ? 'ph-fill' : 'ph'} ph-${n}" aria-hidden="true"></i>`;
  const signedIn = () => !!(window.Tutor && Tutor.signedIn());
  const aiOk = () => !!(window.AI && AI.available());

  function shell() {
    el = document.createElement('div');
    el.className = 'onb';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Bienvenue dans Arbor');
    el.innerHTML = `<div class="onb-top"><button type="button" class="onb-back" data-onb="back" aria-label="Retour" hidden>${ic('caret-left')}</button><div class="onb-bar" aria-hidden="true"><span></span></div><button type="button" class="onb-skip" data-onb="skip">Passer</button></div><div class="onb-stage"></div>`;
    document.body.appendChild(el);
    document.documentElement.classList.add('in-onboarding');
    requestAnimationFrame(() => el.classList.add('show'));
    el.querySelector('[data-onb="skip"]').onclick = () => finish(null);
  }
  const stage = () => el.querySelector('.onb-stage');
  const setBar = () => {
    el.querySelector('.onb-bar span').style.transform = `scaleX(${Math.min(1, (step + 1) / STEPS)})`;
    el.querySelector('.onb-skip').hidden = step >= 3;
  };
  let backTo = null;
  const paint = (html, back) => {
    stopRec();
    const s = stage(); s.classList.remove('in'); void s.offsetWidth; s.innerHTML = html; s.classList.add('in'); setBar();
    backTo = back || null;
    const b = el.querySelector('[data-onb="back"]'); b.hidden = !backTo; b.onclick = () => backTo && backTo();
    const f = s.querySelector('[autofocus], .btn'); if (f && matchMedia('(hover: hover)').matches) f.focus();
  };
  const $ = (sel) => stage().querySelector(sel);
  const status = (msg) => { const m = $('.onb-status'); if (m) m.textContent = msg; };

  /* ---------- A. Comment souhaites-tu apprendre ? ---------- */
  function s1() {
    step = 0;
    paint(`<div class="onb-q"><div class="onb-guide">${pousse(56)}<p>Tout peut devenir un point de départ.</p></div>
      <h2>Comment souhaites-tu apprendre ?</h2><p>Choisis une porte d’entrée, tu pourras utiliser les autres ensuite.</p>
      <div class="onb-entries">${ENTRIES.map(([k, icn, t, sub]) => `<button type="button" class="onb-entry" data-entry="${k}">${ic(icn, true)}<span><b>${t}</b><small>${sub}</small></span>${ic('caret-right')}</button>`).join('')}</div></div>
      <div class="onb-foot"><button type="button" class="link-btn" data-onb="demo">Ou essaie un cours d’exemple sur les réseaux</button>
        <button type="button" class="link-btn onb-join" data-onb="join">J’ai une invitation de mon organisation</button></div>`);
    stage().querySelectorAll('[data-entry]').forEach((b) => { b.onclick = () => { profile.entry = b.dataset.entry; s2(); }; });
    $('[data-onb="demo"]').onclick = () => { profile.entry = 'exemple'; const s = d.addCourse(DEMO, profile.examDate); mark('exemple'); wow(s, true); };
    // Invité par son entreprise : on passe directement à l'espace professionnel (l'introduction reste disponible dans les réglages)
    $('[data-onb="join"]').onclick = () => { finish('join'); location.hash = '#/rejoindre'; };
  }

  /* ---------- B. Objectif ---------- */
  function s2() {
    step = 1; saveDraft('s2');
    paint(`<div class="onb-q"><h2>Qu’aimerais-tu accomplir avec Arbor ?</h2><p>Plusieurs réponses possibles.</p>
      <div class="onb-choices">${GOALS.map(([k, icn, label]) => `<button type="button" class="onb-choice" data-k="${k}" aria-pressed="${profile.goals.includes(k)}">${ic(icn, true)}<span>${label}</span></button>`).join('')}</div>
      <div class="onb-form"><label for="onbGoalFree">Avec tes mots <span class="optional">facultatif</span></label><input id="onbGoalFree" maxlength="120" autocomplete="off" placeholder="Par exemple : comprendre mon moteur de moto" value="${esc(profile.goalText || '')}" /></div></div>
      <div class="onb-foot"><button class="btn big" data-onb="next">Continuer</button></div>`, s1);
    stage().querySelectorAll('.onb-choice').forEach((b) => b.onclick = () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      profile.goals = on ? [...profile.goals, b.dataset.k] : profile.goals.filter((x) => x !== b.dataset.k);
    });
    $('[data-onb="next"]').onclick = () => { profile.goalText = $('#onbGoalFree').value.trim().slice(0, 120); s3(); };
  }

  /* ---------- C. Précisions, toutes facultatives ---------- */
  function s3() {
    step = 2; saveDraft('s3');
    paint(`<div class="onb-q"><h2>Quelques précisions ?</h2><p>Tout est facultatif : Arbor fonctionne sans.</p>
      <div class="onb-form">
        <label for="onbSubject">Sujet ou domaine</label>
        <input id="onbSubject" autocomplete="off" maxlength="80" placeholder="Mécanique, droit, piano, réseaux…" value="${esc(profile.subject || '')}" />
        <span class="onb-label" id="onbLvlL">Où en es-tu ?</span>
        <div class="onb-pills" role="radiogroup" aria-labelledby="onbLvlL">${LEVELS.map(([k, l]) => `<label><input type="radio" name="onbLvl" value="${k}" ${profile.level === k ? 'checked' : ''} /><span>${l}</span></label>`).join('')}</div>
        <label for="onbExam">Échéance</label>
        <input id="onbExam" type="date" value="${esc(profile.examDate || '')}" />
      </div></div>
      <div class="onb-foot"><button class="btn big" data-onb="next">Continuer</button><button type="button" class="link-btn" data-onb="later">Passer, je préciserai plus tard</button></div>`, s2);
    const save = () => {
      profile.subject = $('#onbSubject').value.trim().slice(0, 80);
      const lv = stage().querySelector('input[name="onbLvl"]:checked'); profile.level = lv ? lv.value : profile.level || '';
      const ex = $('#onbExam').value; profile.examDate = ex && ex >= new Date().toISOString().slice(0, 10) ? ex : '';
    };
    $('[data-onb="next"]').onclick = () => { save(); s4(); };
    $('[data-onb="later"]').onclick = () => s4();
  }

  /* ---------- D. Première expérience ---------- */
  function s4() {
    step = 3; saveDraft('s4');
    ({ parler: speak, scanner: scan, discuter: () => topicScreen('discuter'), tester: () => topicScreen('tester'), importer: importScreen }[profile.entry] || importScreen)();
  }
  // Note dans le parcours : l'entrée choisie et la première action (jamais le contenu)
  const mark = (entry) => { if (window.Journey) Journey.set({ entry, firstActionAt: Journey.get().firstActionAt || Date.now() }); };

  // Un sujet à explorer : le cours se construit à partir de sources fiables (serveur si connecté, sinon Wikipédia)
  function topicScreen(kind) {
    const talk = kind === 'discuter';
    paint(`<div class="onb-q"><div class="onb-guide">${pousse(56, 'smile')}<p>${talk ? 'De quoi veux-tu parler ?' : 'Sur quel sujet veux-tu te tester ?'}</p></div>
      <h2>${talk ? 'Discuter avec Pousse' : 'Un défi pour commencer'}</h2>
      <p>${talk ? 'Pousse s’appuie sur des sources fiables et te pose des questions, au lieu de réciter.' : 'Tu réponds d’abord ; Arbor t’explique ensuite ce qu’il fallait savoir, puis tu retentes.'}</p>
      <div class="onb-form"><label for="onbTopic">Sujet</label><input id="onbTopic" autocomplete="off" maxlength="80" placeholder="La photosynthèse, le moteur à 4 temps…" value="${esc(profile.subject || '')}" autofocus /></div>
      ${talk && !signedIn() ? `<p class="onb-note">${ic('info')}Pousse demande un compte gratuit. Sans compte, tu peux explorer le sujet et répondre à des questions.</p>` : ''}
      <p class="onb-status" role="status"></p></div>
      <div class="onb-foot"><button class="btn big" data-onb="go">${talk ? (signedIn() ? 'Commencer la discussion' : 'Explorer le sujet') : 'Lancer le défi'}</button>
        ${talk && !signedIn() && window.Welcome ? '<button type="button" class="link-btn" data-onb="account">Créer un compte pour parler à Pousse</button>' : ''}</div>`, s3);
    const acc = $('[data-onb="account"]');
    if (acc) acc.onclick = () => { hide(); Welcome.auth({ after: () => { show(); topicScreen(kind); } }, 'signup'); };
    $('[data-onb="go"]').onclick = async () => {
      const topic = $('#onbTopic').value.trim();
      if (topic.length < 2) { status('Indique un sujet.'); $('#onbTopic').focus(); return; }
      profile.subject = profile.subject || topic;
      const b = $('[data-onb="go"]'); b.disabled = true;
      let s;
      try { s = await d.courseFromTopic(topic, status); }
      catch (e) { status(e.message || 'Le cours n’a pas pu être préparé. Vérifie ta connexion et réessaie.'); b.disabled = false; return; }
      if (!s) { status('Aucune source fiable trouvée pour ce sujet. Essaie une formulation plus courante.'); b.disabled = false; return; }
      mark(kind);
      if (talk && aiOk()) {
        const node = firstNotion(s);
        if (node) { finish('discuter'); d.talk(s, node); return; }
      }
      if (talk) wow(s, false); else question(s, false, { retry: true });
    };
  }
  const allNotions = (s) => { const out = []; (function rec(x) { x.children.forEach((c) => { if (!c.children.length) out.push(c); rec(c); }); })(s.root); return out; };
  const firstNotion = (s) => allNotions(s).find((n) => window.Dialogue && Dialogue.canTalk(n)) || null;

  /* ---------- Importer ---------- */
  function importScreen() {
    paint(`<div class="onb-q"><h2>Ajoute ce que tu as déjà</h2><p>Arbor trouve les chapitres et les notions, avec les pages d’origine.</p>
      <div class="onb-cards">
        <button type="button" class="onb-card" data-onb="pdf">${ic('file-arrow-up', true)}<span><b>Un PDF</b><small>Cours, support, polycopié, rapport</small></span></button>
        <button type="button" class="onb-card" data-onb="wiki">${ic('globe-hemisphere-west', true)}<span><b>Une page Wikipédia</b><small>Colle son lien ou son titre</small></span></button>
        <button type="button" class="onb-card" data-onb="manual">${ic('pencil-simple-line', true)}<span><b>Mes propres notes</b><small>Titre, chapitres, notes, à ton rythme</small></span></button>
      </div>
      <div class="onb-form onb-wiki" hidden><label for="onbWiki">Lien ou titre de la page</label><input id="onbWiki" autocomplete="off" placeholder="https://fr.wikipedia.org/wiki/Photosynthèse" /><button class="btn" data-onb="wikigo">Importer</button></div>
      <p class="onb-status" role="status"></p></div>`, s3);
    $('[data-onb="pdf"]').onclick = () => { pending = true; mark('importer'); hide(); d.importPdf(); };
    $('[data-onb="manual"]').onclick = () => { mark('importer'); finish('manual'); d.newCourse(profile.subject); };
    $('[data-onb="wiki"]').onclick = () => { $('.onb-wiki').hidden = false; $('#onbWiki').focus(); };
    $('[data-onb="wikigo"]').onclick = async () => {
      const v = $('#onbWiki').value.trim();
      const m = v.match(/wikipedia\.org\/wiki\/([^?#]+)/i);
      const title = m ? decodeURIComponent(m[1]).replace(/_/g, ' ') : v;
      if (title.length < 2) { status('Colle le lien d’une page Wikipédia, ou son titre.'); return; }
      if (/^https?:\/\//i.test(title)) { status('Pour l’instant, Arbor importe les pages Wikipédia. Pour une autre page web, enregistre-la en PDF puis importe le PDF.'); return; }
      const b = $('[data-onb="wikigo"]'); b.disabled = true;
      try { const s = await d.courseFromTopic(title, status); if (!s) throw new Error('Page introuvable.'); mark('importer'); wow(s, false); }
      catch (e) { status(e.message || 'Import impossible.'); b.disabled = false; }
    };
  }

  /* ---------- Parler : dictée (reconnaissance vocale du navigateur) ou écriture ---------- */
  const SR = () => window.SpeechRecognition || window.webkitSpeechRecognition;
  function stopRec() { if (rec) { try { rec.onend = null; rec.stop(); } catch (e) { /* déjà arrêtée */ } rec = null; } clearInterval(recTimer); recTimer = null; }
  function speak() {
    const can = !!SR();
    paint(`<div class="onb-q"><div class="onb-guide">${pousse(56, 'smile')}<p>Dis tout ce qui te vient, sans te censurer.</p></div>
      <h2>Explique ce que tu sais</h2>
      <p>${profile.subject ? `Sur « ${esc(profile.subject)} » : ` : ''}ce que tu sais déjà, ce que tu crois savoir, ce que tu voudrais comprendre. 30 secondes à 2 minutes.</p>
      ${can ? `<div class="onb-rec"><button type="button" class="onb-mic" data-onb="mic" aria-pressed="false" aria-label="Commencer la dictée">${ic('microphone', true)}</button><div><b class="onb-time num">0:00</b><small class="onb-rec-st">Touche le micro pour commencer</small></div></div>`
        : `<p class="onb-note">${ic('info')}La dictée n’est pas disponible dans ce navigateur. Écris ton explication ; le reste fonctionne pareil.</p>`}
      <div class="onb-form"><label for="onbDump">${can ? 'Transcription (modifiable)' : 'Ton explication'}</label><textarea id="onbDump" rows="7" placeholder="Par exemple : la photosynthèse, c’est quand la plante…"></textarea></div>
      <p class="onb-hint">${ic('lock-simple')}${can ? 'La reconnaissance vocale est faite par ton navigateur (selon le navigateur, le son peut passer par ses serveurs). ' : ''}Rien n’est enregistré tant que tu ne l’as pas décidé.</p>
      <p class="onb-status" role="status"></p></div>
      <div class="onb-foot"><button class="btn big" data-onb="organize">Organiser mes idées</button></div>`, s3);
    const ta = $('#onbDump');
    if (can) {
      const mic = $('[data-onb="mic"]');
      mic.onclick = () => {
        if (rec) { stopRec(); mic.setAttribute('aria-pressed', 'false'); $('.onb-rec-st').textContent = 'Dictée en pause'; return; }
        const R = SR(); rec = new R(); rec.lang = 'fr-FR'; rec.continuous = true; rec.interimResults = true;
        const base = ta.value ? ta.value.trim() + ' ' : ''; let finalTxt = ''; const t0 = Date.now();
        rec.onresult = (e) => { let interim = ''; for (let i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) finalTxt += e.results[i][0].transcript + ' '; else interim += e.results[i][0].transcript; } ta.value = (base + finalTxt + interim).trim(); };
        rec.onerror = (e) => { $('.onb-rec-st').textContent = e.error === 'not-allowed' ? 'Micro refusé : autorise-le, ou écris ton explication.' : 'La dictée s’est interrompue. Tu peux reprendre ou écrire.'; stopRec(); mic.setAttribute('aria-pressed', 'false'); };
        rec.onend = () => { if (rec) { try { rec.start(); } catch (e) { stopRec(); } } }; // le navigateur coupe après un silence : on relance jusqu'à 2 minutes
        try { rec.start(); } catch (e) { $('.onb-rec-st').textContent = 'Impossible de démarrer la dictée.'; rec = null; return; }
        mic.setAttribute('aria-pressed', 'true'); $('.onb-rec-st').textContent = 'Je t’écoute… touche à nouveau pour arrêter';
        recTimer = setInterval(() => {
          const s = Math.floor((Date.now() - t0) / 1000); const t = $('.onb-time'); if (t) t.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
          if (s >= 120) { stopRec(); mic.setAttribute('aria-pressed', 'false'); $('.onb-rec-st').textContent = '2 minutes : c’est parfait, organisons tout ça.'; }
        }, 500);
      };
    }
    $('[data-onb="organize"]').onclick = () => { stopRec(); organize(ta.value.trim(), 'explication'); };
  }

  /* ---------- Scanner : reconnaissance de texte dans le navigateur (Tesseract.js) ---------- */
  function loadTess() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    return new Promise((ok, ko) => { const sc = document.createElement('script'); sc.src = TESS; sc.async = true; sc.crossOrigin = 'anonymous'; sc.onload = () => (window.Tesseract ? ok(window.Tesseract) : ko(new Error('ocr'))); sc.onerror = () => ko(new Error('ocr')); document.head.appendChild(sc); });
  }
  function scan() {
    paint(`<div class="onb-q"><h2>Photographie un support</h2><p>Un tableau, une diapositive, une page de livre, des notes, un exercice. Arbor lit le texte, puis l’organise.</p>
      <label class="onb-shot"><input type="file" accept="image/*" capture="environment" id="onbImg" />${ic('camera', true)}<span><b>Prendre ou choisir une photo</b><small>Bien éclairée, de face, texte net</small></span></label>
      <img class="onb-preview" id="onbPrev" alt="Photo choisie" hidden />
      <div class="onb-form" id="onbOcrBox" hidden><label for="onbOcr">Texte lu (corrige-le si besoin)</label><textarea id="onbOcr" rows="7"></textarea></div>
      <p class="onb-hint">${ic('lock-simple')}La lecture se fait sur ton téléphone ; la photo n’est envoyée nulle part.</p>
      <p class="onb-status" role="status"></p></div>
      <div class="onb-foot"><button class="btn big" data-onb="organize" hidden>Organiser ce texte</button></div>`, s3);
    $('#onbImg').onchange = async (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      const url = URL.createObjectURL(f); const img = $('#onbPrev'); img.src = url; img.hidden = false;
      status('Préparation de la lecture (la première fois, environ 10 Mo à télécharger)…');
      let T;
      try { T = await loadTess(); } catch (x) { status('La lecture de texte n’a pas pu se charger (connexion ?). Tu peux taper le texte toi-même.'); showOcr(''); return; }
      try {
        const r = await T.recognize(f, 'fra', { logger: (m) => { if (m.status === 'recognizing text') status(`Lecture du texte… ${Math.round((m.progress || 0) * 100)} %`); } });
        const txt = String(r.data.text || '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        const conf = Number(r.data.confidence) || 0;
        showOcr(txt);
        if (txt.replace(/[^a-zà-ÿ]/gi, '').length < 30 || conf < 45) status(`Photo difficile à lire (confiance ${Math.round(conf)} %). Reprends-la de plus près, bien éclairée, ou corrige le texte ci-dessus. L’écriture manuscrite est souvent mal lue.`);
        else status(`Texte lu (confiance ${Math.round(conf)} %). Vérifie-le, puis organise-le.`);
      } catch (x) { status('La lecture a échoué sur cette image. Essaie une autre photo, ou tape le texte.'); showOcr(''); }
    };
    const showOcr = (t) => { $('#onbOcrBox').hidden = false; $('#onbOcr').value = t; $('[data-onb="organize"]').hidden = false; };
    $('[data-onb="organize"]').onclick = () => organize($('#onbOcr').value.trim(), 'support');
  }

  /* ---------- Organiser un texte libre (explication ou photo) en notions ---------- */
  async function organize(text, mode) {
    if (text.replace(/\s+/g, ' ').length < 40) { status(mode === 'explication' ? 'Dis-en un peu plus (au moins une ou deux phrases).' : 'Il faut un peu plus de texte pour en tirer des notions.'); return; }
    const title = profile.subject || (mode === 'explication' ? 'Mes idées' : 'Ma photo');
    mark(mode === 'explication' ? 'parler' : 'scanner');
    if (!aiOk()) {
      // Sans compte : le texte est gardé tel quel, et on le dit
      const s = d.addCourse({ title, children: [{ title: mode === 'explication' ? 'Ce que j’ai expliqué' : 'Texte de la photo', notes: text, keyPoints: [] }] }, profile.examDate);
      paint(`<div class="onb-q"><div class="onb-guide">${pousse(56, 'smile')}<p>C’est gardé dans « ${esc(s.title)} ».</p></div>
        <h2>Ton texte est enregistré</h2><p>Pour qu’Arbor le découpe en notions et repère ce qui est à vérifier, il faut un compte gratuit (l’analyse se fait sur le serveur d’Arbor).</p></div>
        <div class="onb-foot">${window.Welcome ? '<button class="btn big" data-onb="account">Créer un compte et organiser</button>' : ''}<button type="button" class="link-btn" data-onb="open">Ouvrir mon texte</button></div>`);
      const a = $('[data-onb="account"]'); if (a) a.onclick = () => { hide(); Welcome.auth({ after: () => { show(); d.removeCourse(s); organize(text, mode); } }, 'signup'); };
      $('[data-onb="open"]').onclick = () => done(s);
      return;
    }
    paint(`<div class="onb-q"><div class="onb-guide">${pousse(56, 'happy')}<p>J’organise tes idées…</p></div><h2>Un instant</h2><p class="onb-status" role="status">Analyse du texte…</p></div>`);
    let r;
    try { r = await AI.structure(text, mode, profile.subject, { onStatus: status }); }
    catch (e) { paint(`<div class="onb-q"><h2>L’analyse n’a pas abouti</h2><p>${esc(e.message)}</p></div><div class="onb-foot"><button class="btn big" data-onb="again">Réessayer</button></div>`, mode === 'explication' ? speak : scan); $('[data-onb="again"]').onclick = () => organize(text, mode); return; }
    if (!r.notions.length) { paint(`<div class="onb-q"><h2>Pas assez de matière</h2><p>Arbor n’a pas trouvé de notion claire dans ce texte. Ajoute quelques phrases, ou choisis une autre porte d’entrée.</p></div><div class="onb-foot"><button class="btn big" data-onb="again">Compléter</button></div>`, s1); $('[data-onb="again"]').onclick = mode === 'explication' ? speak : scan; return; }
    const self = mode === 'explication';
    paint(`<div class="onb-q"><div class="onb-guide">${pousse(56, 'joy')}<p>Voilà ce que j’ai trouvé.</p></div>
      <h2>${esc(r.title || title)}</h2>
      <p>${r.notions.length} notion${r.notions.length > 1 ? 's' : ''}${self ? `, dont ${r.notions.filter((n) => n.check).length} à vérifier` : ''}. ${self ? 'Une explication n’est pas encore une preuve : on va vérifier ensemble.' : ''}</p>
      <ol class="onb-notions">${r.notions.map((n, i) => `<li style="--i:${i}" class="${n.check ? 'chk' : ''}"><b>${esc(n.title)}</b>${n.check ? `<span class="onb-tag">${ic('magnifying-glass')}À vérifier</span>` : ''}<small>« ${esc(n.quote)} »</small></li>`).join('')}</ol>
      ${r.gaps.length ? `<p class="onb-gaps">${ic('puzzle-piece')}À découvrir : ${r.gaps.map(esc).join(', ')}</p>` : ''}</div>
      <div class="onb-foot"><button class="btn big" data-onb="save">Enregistrer et m’entraîner</button></div>`);
    $('[data-onb="save"]').onclick = () => {
      const tree = { title: r.title || title, children: r.notions.map((n) => ({
        title: n.title,
        notes: `${self ? '**Ce que tu as dit**' : '**D’après la photo**'} : « ${n.quote} »${n.check ? '\n\n_À vérifier dans une source fiable._' : ''}${n.question ? `\n\n**Pour vérifier** : ${n.question}` : ''}`,
        keyPoints: [],
      })).concat(r.gaps.map((g) => ({ title: g, notes: '', keyPoints: [] }))) };
      const s = d.addCourse(tree, profile.examDate);
      const want = (r.notions.find((n) => n.check) || r.notions[0]).title;
      const target = allNotions(s).find((x) => x.title === want) || allNotions(s)[0];
      // Ce qui est « à vérifier » reçoit tout de suite un passage d'une source fiable, à comparer avec ce qui a été dit
      paint(`<div class="onb-q"><div class="onb-guide">${pousse(56, 'smile')}<p>On compare avec une source fiable.</p></div>
        <h2>${esc(target.title)}</h2><p class="onb-status" role="status">Recherche d’une source…</p></div>`);
      // 25 s au plus : sans source trouvée, ce qui a été dit reste tel quel (et reste « à vérifier »)
      const limit = new Promise((_, ko) => setTimeout(() => ko(new Error('délai')), 25000));
      Promise.race([d.completeNotion(s, target, status), limit]).then(() => wow(s, false))
        .catch(() => { status('Pas de source trouvée pour l’instant : tes mots restent « à vérifier ».'); setTimeout(() => wow(s, false), 1600); });
    };
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

  // Questions d'un cours : celle de démonstration, ou celles des leçons (Lesson), dans l'ordre du cours
  function quizzes(s, demo) {
    const all = []; (function rec(x) { x.children.forEach((c) => { all.push(c); rec(c); }); })(s.root);
    if (demo) return [{ q: DEMO_Q, node: all.find((x) => x.title === DEMO_Q.notion) }];
    const out = [];
    if (!window.Lesson) return out;
    for (const ch of [s.root, ...all.filter((x) => x.children.length)]) {
      const b = Lesson.build(ch);
      b.steps.filter((x) => x.kind === 'quiz').forEach((st) => {
        out.push({ q: { ask: st.q.kind === 'gap' ? `${st.q.ask} : « ${st.q.before}… ${st.q.after} »` : `${st.q.ask}${st.q.quote ? ` « ${st.q.quote} »` : ''}`, opts: st.q.opts, right: st.q.right, why: st.d.idea }, node: all.find((x) => x.id === st.d.id) });
      });
      if (out.length >= 4) break;
    }
    return out;
  }
  const excerpt = (node) => { const t = String((node && node.notes) || '').replace(/==|\*\*|__/g, '').replace(/^#+\s*/gm, '').trim(); return t.length > 420 ? `${t.slice(0, t.lastIndexOf(' ', 420))}…` : t; };

  /* Le défi : une question, un vrai retour, la notion à lire, puis une nouvelle tentative (mode « Se tester ») */
  function question(s, demo, opts = {}) {
    const list = opts.list || quizzes(s, demo);
    const i = opts.i || 0;
    const item = list[i];
    if (!item) { done(s); return; }
    const { q, node } = item;
    paint(`<div class="onb-q"><div class="onb-guide">${pousse(56, 'smile')}<p>${i === 0 ? (opts.retry ? 'Un défi pour commencer. Réponds sans chercher.' : 'Une seule question, pour commencer.') : 'Nouvelle tentative.'}</p></div>
      <h2 class="onb-ask">${esc(q.ask)}</h2>
      <div class="onb-opts">${q.opts.map((o, k) => `<button type="button" class="onb-opt" data-i="${k}">${esc(o)}</button>`).join('')}</div>
      <div class="onb-fb" aria-live="polite"></div>
      <div class="onb-learn" hidden></div></div>
      <div class="onb-foot"><button class="btn big" data-onb="next" hidden>Voir mon progrès</button><button type="button" class="link-btn" data-onb="retry" hidden>Nouvelle tentative</button></div>`);
    stage().querySelectorAll('.onb-opt').forEach((b) => b.onclick = () => {
      const pick = q.opts[+b.dataset.i], ok = pick === q.right;
      stage().querySelectorAll('.onb-opt').forEach((x) => { x.disabled = true; const v = q.opts[+x.dataset.i]; x.classList.add(v === q.right ? 'right' : x === b ? 'wrong' : 'dim'); });
      $('.onb-fb').innerHTML = `<p class="${ok ? 'ok' : 'ko'}"><b>${ok ? 'Exact.' : `Pas tout à fait : ${esc(q.right)}.`}</b> ${esc(q.why || '')}</p>`;
      if (node) d.firstAnswer(s, node, ok);
      // Ce qu'il fallait savoir : le passage du cours, puis une autre question (le défi sert à apprendre, pas à noter)
      const ex = excerpt(node);
      if (opts.retry && ex) { const l = $('.onb-learn'); l.hidden = false; l.innerHTML = `<h3>${ic('book-open-text', true)}${esc(node.title)}</h3><p>${esc(ex)}</p>`; }
      const nx = $('[data-onb="next"]'); nx.hidden = false; nx.onclick = () => progress(s, node, ok);
      const rt = $('[data-onb="retry"]');
      if (opts.retry && list[i + 1]) { rt.hidden = false; rt.onclick = () => question(s, demo, { ...opts, list, i: i + 1 }); if (!ok) { nx.textContent = 'Voir mon progrès'; rt.classList.add('strong'); } }
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
  function hide() { stopRec(); if (el) { el.classList.remove('show'); el.hidden = true; document.documentElement.classList.remove('in-onboarding'); } }
  function show() { if (el) { el.hidden = false; el.classList.add('show'); document.documentElement.classList.add('in-onboarding'); } }
  function finish(how) {
    stopRec(); clearDraft();
    d.saveProfile({ ...profile, done: true, how: how || 'skip', at: Date.now() });
    pending = false;
    if (!el) return;
    const node = el; el = null;
    node.classList.remove('show');
    document.documentElement.classList.remove('in-onboarding');
    setTimeout(() => node.remove(), 350);
  }

  window.Onboarding = {
    open(deps) {
      d = deps; profile = { goals: [], goalText: '', entry: '', level: '', subject: '', examDate: '', ...(deps.profile || {}) };
      if (el) el.remove(); shell();
      // Porte d'entrée choisie depuis l'accueil (hors premier lancement) : on y va directement
      if (deps.entry && ENTRIES.some(([k]) => k === deps.entry)) { profile.entry = deps.entry; s4(); return; }
      const dr = readDraft();
      if (dr && dr.profile) { profile = { ...profile, ...dr.profile }; ({ s2, s3, s4 }[dr.screen] || s1)(); } else s1();
    },
    // Après l'import d'un PDF lancé depuis l'onboarding : on reprend à l'écran 5
    afterImport(s) { if (!pending) return false; pending = false; if (profile.examDate && !s.examDate) s.examDate = profile.examDate; wow(s, false); return true; },
    pending: () => pending,
    active: () => !!el && !el.hidden,
    cancelPending() { if (pending) finish('import-annule'); },
    DEMO,
    // réutilisés par les portes d'entrée Business (js/org-shell.js) : même dictée, même lecture de texte sur l'appareil
    speech: SR,
    ENTRIES,
    ocr: loadTess,
  };
})();
