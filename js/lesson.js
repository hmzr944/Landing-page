/* Leçon guidée d'un module : une idée par écran, comme une petite partie de jeu.
   Pour chaque notion : « Découvre » (l'idée clé), « Retiens » (2 ou 3 points courts), « Vérifie » (une question à toucher).
   Le contenu est tiré automatiquement du cours (analyse rapide) ; une question ratée revient à la fin. */
(function () {
  const STOP = new Set('les des une dans pour avec sans sont cette ces leur leurs elle elles ils qui que quoi dont mais donc ainsi plus moins très tout tous toute toutes autre autres même entre aussi peut fait être avoir comme lors chez sous vers après avant depuis pendant selon notre votre leurs alors'.split(' '));
  const DEF = /(?<!\p{L})(?:(est (un|une|le|la|ce qui)|sont (des|les)|désigne|se définit|on appelle|correspond à|permet de|sert à|consiste à|signifie)(?!\p{L})|est l['’](?=\p{L}))/iu;
  const clean = (t) => String(t || '').replace(/==|\*\*|__|`/g, '').replace(/^#+\s*/gm, '').replace(/\s+/g, ' ').trim();
  const sentences = (t) => clean(t).split(/(?<=[.!?])\s+(?=[A-ZÀ-ÝÉ«"(])/).map((x) => x.trim()).filter((x) => x.length > 25);
  // Raccourcit à une limite de phrase ou de virgule, jamais au milieu d'un mot
  function short(t, max) {
    t = clean(t);
    if (t.length <= max) return t;
    const cut = t.slice(0, max);
    const at = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(' : '), cut.lastIndexOf(', '), cut.lastIndexOf(' ; '));
    return (at > max * 0.55 ? cut.slice(0, at) : cut.slice(0, cut.lastIndexOf(' '))).replace(/[,;:]$/, '') + '…';
  }
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Une phrase qui se comprend seule (pas « Ces fichiers… », « Cependant… ») et qui parle de la notion
  const ANAPHOR = /^(ces?|cet|cette|cela|ça|il|elle|ils|elles|on|déjà|cependant|mais|donc|ainsi|alors|en effet|par contre|de plus|aussi|pour cela|celui|celle|ceux|leur|là|enfin|puis|ensuite|toutefois|néanmoins|or)(?!\p{L})/iu;
  const stem = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, 6);
  function scorer(title) {
    const keys = title.split(/[^\p{L}]+/u).filter((w) => w.length >= 4 && !STOP.has(w.toLowerCase()) && !/^(comprendre|installer|configurer|découvrir|maîtriser|connaître|utiliser|savoir|gérer|mettre|prendre|main)$/i.test(w)).map(stem);
    return (x) => {
      const t = clean(x), w = t.split(/[^\p{L}]+/u).map(stem);
      let sc = keys.filter((k) => w.includes(k)).length * 2;
      if (DEF.test(t)) sc += 2;
      if (ANAPHOR.test(t)) sc -= 4;
      if (/[…]$|\.\.\.$/.test(t)) sc -= 1;
      if (t.length > 220) sc -= 1;
      const caps = (t.match(/\p{Lu}/gu) || []).length / Math.max(1, (t.match(/\p{L}/gu) || []).length);
      if (caps > 0.25 || /\(\s|\s\)/.test(t)) sc -= 4; // texte en capitales ou mal formé
      return sc;
    };
  }
  // L'essentiel d'une notion : idée clé + points à retenir
  function digest(n) {
    const sc = scorer(n.title);
    const hl = [...String(n.notes || '').matchAll(/==([^=\n]{20,260})==/g)].map((m) => clean(m[1]));
    const cand = [...new Set([...hl, ...n.keyPoints.map(clean), ...sentences(n.notes)])].filter((x) => x && x.length > 20)
      .map((x, k) => ({ x, v: sc(x) + (hl.includes(x) ? 2 : 0) - k * 0.01 })).sort((a, b) => b.v - a.v);
    const good = cand.filter((c) => c.v > -2);
    const ideaC = good.find((c) => DEF.test(c.x)) || good[0] || cand[0];
    const idea = ideaC ? short(ideaC.x, 200) : '';
    const points = [];
    for (const c of good) {
      if (c === ideaC) continue;
      const p = short(c.x, 130);
      if (!points.some((q) => q.slice(0, 30) === p.slice(0, 30)) && !idea.startsWith(p.slice(0, 40))) points.push(p);
      if (points.length >= 3) break;
    }
    return { id: n.id, title: n.title, idea, points, all: [idea, ...points] };
  }

  // Question 1 : une phrase, « de quelle notion parle-t-elle ? » (réponses courtes : les titres)
  function qWhich(d, others) {
    if (others.length < 2) return null;
    const quote = d.points[0] || d.idea;
    if (!quote) return null;
    const wrong = shuffle(others).slice(0, 2).map((o) => o.title);
    return { kind: 'which', ask: 'De quelle notion parle cette phrase ?', quote: short(quote, 150), opts: shuffle([d.title, ...wrong]), right: d.title };
  }
  // Question 2 : mot manquant, à choisir parmi trois
  function qGap(d, others) {
    const title = new Set(d.title.toLowerCase().split(/[^a-zà-ÿ]+/));
    for (const s of [d.idea, ...d.points]) {
      const words = s.split(/\s+/).map((w) => w.split(/['’]/).pop().replace(/[^\p{L}-]/gu, '')).filter((w) => w.length >= 5 && !STOP.has(w.toLowerCase()) && !title.has(w.toLowerCase()));
      if (!words.length) continue;
      const word = words.sort((a, b) => b.length - a.length)[0];
      const decoys = shuffle([...new Set(others.flatMap((o) => o.all.join(' ').split(/\s+/)).map((w) => w.split(/['’]/).pop().replace(/[^\p{L}-]/gu, '')))]
        .filter((w) => w.length >= 5 && w.toLowerCase() !== word.toLowerCase() && !STOP.has(w.toLowerCase()) && !s.includes(w))).slice(0, 2);
      if (decoys.length < 2) continue;
      const text = short(s, 150);
      if (!text.includes(word)) continue;
      return { kind: 'gap', ask: 'Choisis le mot manquant', before: text.slice(0, text.indexOf(word)), after: text.slice(text.indexOf(word) + word.length), opts: shuffle([word, ...decoys]), right: word };
    }
    return null;
  }

  function build(module) {
    const notions = module.children.filter((c) => (c.notes || '').trim() || c.keyPoints.length).slice(0, 6);
    const ds = notions.map(digest).filter((d) => d.idea);
    const steps = [];
    ds.forEach((d, i) => {
      const others = ds.filter((x) => x !== d);
      steps.push({ kind: 'learn', d, i });
      if (d.points.length) steps.push({ kind: 'keep', d, i });
      const q = (i % 2 ? qGap(d, others) || qWhich(d, others) : qWhich(d, others) || qGap(d, others));
      if (q) steps.push({ kind: 'quiz', q, d, i });
    });
    return { ds, steps };
  }

  const minutesOf = (n) => Math.max(2, Math.round(n * 0.4));

  /* ---------- Lecteur ---------- */
  let el = null;
  function start({ module, subject, color, onFinish, onAnswer }) {
    const { ds, steps } = build(module);
    if (!ds.length) return false;
    const queue = [{ kind: 'intro' }, ...steps, { kind: 'end' }];
    const total = steps.length;
    let pos = 0, done = 0, good = 0, asked = 0, retried = new Set(), choice = null, checked = false;
    el = document.createElement('div');
    el.className = 'lesson';
    el.style.setProperty('--lc', color || '#3451D1');
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', `Leçon : ${module.title}`);
    el.innerHTML = `<div class="ls-top"><button class="icon-btn ls-close" aria-label="Quitter la leçon"><i class="ph ph-x" aria-hidden="true"></i></button>
      <div class="ls-bar" aria-hidden="true"><span></span></div><span class="ls-xp num"><i class="ph-fill ph-lightning" aria-hidden="true"></i><b>0</b></span></div>
      <div class="ls-stage"></div><div class="ls-foot"></div>`;
    document.body.appendChild(el);
    document.documentElement.classList.add('in-lesson');
    requestAnimationFrame(() => el.classList.add('show'));
    const stage = el.querySelector('.ls-stage'), foot = el.querySelector('.ls-foot');
    let xp = 0;
    const setBar = () => { el.querySelector('.ls-bar span').style.transform = `scaleX(${Math.max(0.03, done / Math.max(1, total))})`; el.querySelector('.ls-xp b').textContent = xp; };

    const minutes = minutesOf(total);
    function render() {
      const st = queue[pos];
      choice = null; checked = false;
      stage.classList.remove('in'); void stage.offsetWidth; stage.classList.add('in');
      if (st.kind === 'intro') {
        stage.innerHTML = `<div class="ls-card intro"><span class="ls-orb" aria-hidden="true"><i></i><i></i><i></i></span>
          <small class="ls-kicker">Leçon</small><h2>${esc(module.title)}</h2>
          ${module.module && module.notes && /Objectif/.test(module.notes) ? `<p class="ls-goal"><i class="ph-fill ph-target" aria-hidden="true"></i>${esc(clean(module.notes.match(/\*\*Objectif\.\*\*\s*([^\n]+)/) ? module.notes.match(/\*\*Objectif\.\*\*\s*([^\n]+)/)[1] : ''))}</p>` : ''}
          <div class="ls-meta"><span><b class="num">${ds.length}</b> notions</span><span><b class="num">${minutes}</b> min</span><span><b class="num">${steps.filter((x) => x.kind === 'quiz').length}</b> questions</span></div></div>`;
        foot.innerHTML = `<button class="btn big ls-go">C’est parti</button>`;
      } else if (st.kind === 'learn') {
        stage.innerHTML = `<div class="ls-card"><span class="ls-step">${st.i + 1}/${ds.length} · Découvre</span><h2>${esc(st.d.title)}</h2><p class="ls-idea">${esc(st.d.idea)}</p></div>`;
        foot.innerHTML = `<button class="btn big ls-go">Continuer</button>`;
      } else if (st.kind === 'keep') {
        stage.innerHTML = `<div class="ls-card"><span class="ls-step">${st.i + 1}/${ds.length} · Retiens</span><h2>${esc(st.d.title)}</h2>
          <ul class="ls-points">${st.d.points.map((p, k) => `<li style="--k:${k}"><span class="ls-dot" aria-hidden="true">${k + 1}</span>${esc(p)}</li>`).join('')}</ul></div>`;
        foot.innerHTML = `<button class="btn big ls-go">J’ai retenu</button>`;
      } else if (st.kind === 'quiz') {
        const q = st.q;
        stage.innerHTML = `<div class="ls-card quiz"><span class="ls-step">${st.retry ? 'On réessaie' : 'Vérifie'}</span><h2>${esc(q.ask)}</h2>
          ${q.quote ? `<blockquote class="ls-quote">${esc(q.quote)}</blockquote>` : ''}${q.kind === 'gap' ? `<p class="ls-gap">${esc(q.before)}<span class="ls-blank" aria-label="mot manquant">…</span>${esc(q.after)}</p>` : ''}
          <div class="ls-opts ${q.kind}">${q.opts.map((o, k) => `<button class="ls-opt" data-k="${k}">${esc(o)}</button>`).join('')}</div></div>`;
        foot.innerHTML = `<button class="btn big ls-go" disabled>Vérifier</button>`;
      } else {
        const score = asked ? Math.round((good / asked) * 100) : 100;
        stage.innerHTML = `<div class="ls-card end"><span class="ls-trophy" aria-hidden="true"><i class="ph-fill ph-trophy"></i></span>
          <h2>Leçon terminée !</h2><div class="ls-meta"><span><b class="num">${score} %</b> de bonnes réponses</span><span><b class="num">+${xp + 10}</b> XP</span></div>
          <p class="ls-next">Ces notions reviendront en révision juste avant que tu les oublies.</p></div>`;
        foot.innerHTML = `<button class="btn big ls-go">Terminer</button>`;
        window.FX && !document.documentElement.classList.contains('calm') && FX.confetti(innerWidth / 2, innerHeight * 0.3, 160);
        window.Mascot && Mascot.react('finished');
      }
      const go = foot.querySelector('.ls-go');
      go.onclick = next;
      if (window.matchMedia('(hover: hover)').matches) go.focus();
      stage.querySelectorAll('.ls-opt').forEach((b) => b.onclick = () => {
        if (checked) return;
        stage.querySelectorAll('.ls-opt').forEach((x) => x.classList.toggle('on', x === b));
        choice = st.q.opts[+b.dataset.k];
        if (st.q.kind === 'gap') stage.querySelector('.ls-blank').textContent = choice;
        go.disabled = false;
      });
    }
    function next() {
      const st = queue[pos];
      if (st.kind === 'quiz' && !checked) {
        checked = true; asked++;
        const ok = choice === st.q.right;
        if (onAnswer && st.d && st.d.id) onAnswer({ nid: st.d.id, ok });
        if (ok) { good++; xp += 2; } else if (!st.retry && !retried.has(st)) { retried.add(st); queue.splice(queue.length - 1, 0, { ...st, retry: true }); }
        stage.querySelectorAll('.ls-opt').forEach((b) => { const v = st.q.opts[+b.dataset.k]; b.classList.add(v === st.q.right ? 'right' : b.classList.contains('on') ? 'wrong' : 'dim'); b.disabled = true; });
        foot.innerHTML = `<div class="ls-feedback ${ok ? 'ok' : 'ko'}"><span class="ls-fb-ic" aria-hidden="true"><i class="ph-fill ph-${ok ? 'check-circle' : 'x-circle'}"></i></span>
          <span><b>${ok ? ['Bravo !', 'Exact !', 'Bien vu !'][asked % 3] : 'Pas tout à fait'}</b>${ok ? '' : `<small>Bonne réponse : ${esc(st.q.right)}</small>`}</span></div><button class="btn big ls-go">Continuer</button>`;
        foot.querySelector('.ls-go').onclick = next;
        foot.querySelector('.ls-go').focus();
        window.Mascot && Mascot.react(ok ? 'done' : 'again');
        if (!st.retry) done++;
        setBar();
        return;
      }
      if (st.kind === 'end') { finish(true); return; }
      if (st.kind !== 'quiz' && st.kind !== 'intro') { done++; xp += 1; }
      setBar();
      pos++;
      render();
    }
    function finish(completed) {
      const node = el; el = null;
      node.classList.remove('show');
      document.documentElement.classList.remove('in-lesson');
      setTimeout(() => node.remove(), 350);
      if (completed && onFinish) onFinish({ good, asked, xp: xp + 10 });
    }
    el.querySelector('.ls-close').onclick = () => finish(false);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') finish(false);
      if (e.key === 'Enter' && !e.target.closest('.ls-opt')) { const g = foot.querySelector('.ls-go'); if (g && !g.disabled) { e.preventDefault(); g.click(); } }
    });
    setBar();
    render();
    return true;
  }

  const canStart = (module) => build(module).ds.length > 0;
  const minutes = (module) => minutesOf(build(module).steps.length);
  window.Lesson = { start, canStart, build, minutes };
})();
