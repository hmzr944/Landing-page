/* Dialogue avec Pousse : mode socratique et mode Enseigne-moi, sur UNE notion de ton cours.
   - Le tuteur ne reçoit que les passages de cette notion (texte importé, points clés, extrait d'origine),
     et chaque citation qu'il renvoie est vérifiée côté serveur.
   - Chaque évaluation devient une observation (journal) ; une confusion nommée rend la notion « fragile »
     jusqu'à la prochaine bonne réponse, et une activité corrective est proposée (prérequis ou passage). */
(function () {
  let el = null;
  const plainMd = (t) => String(t || '').replace(/==|\*\*|__|`/g, '').replace(/^#+\s*/gm, '').replace(/^[-*]\s+/gm, '• ').replace(/\n{3,}/g, '\n\n').trim();

  // Passages envoyés au tuteur : ce que le cours dit de la notion, avec sa page quand elle est connue
  function passagesOf(node) {
    const pages = (node.src && node.src.pages) || [];
    const page = pages.length === 1 ? pages[0] : undefined;
    const out = [];
    const notes = plainMd(node.notes);
    for (let i = 0; i < notes.length && out.length < 5; i += 2200) {
      let chunk = notes.slice(i, i + 2400);
      if (i + 2400 < notes.length) chunk = chunk.slice(0, chunk.lastIndexOf('. ') + 1 || chunk.length);
      if (chunk.trim().length >= 20) out.push({ page, text: chunk.trim() });
    }
    if (node.keyPoints && node.keyPoints.length) out.push({ page, text: 'Points clés : ' + node.keyPoints.map(plainMd).join(' ; ') });
    if (node.src && node.src.quote && !notes.includes(node.src.quote.slice(0, 40))) out.push({ page: pages[0], text: node.src.quote });
    return out;
  }
  const canTalk = (node) => passagesOf(node).reduce((a, p) => a + p.text.length, 0) >= 60;

  const VERDICT = { juste: ['juste', 'check-circle'], partiel: ['en partie', 'circle-half'], faux: ['à revoir', 'x-circle'] };

  function open({ mode, s, node, d }) {
    close();
    const passages = passagesOf(node);
    const pageLabel = node.src && node.src.pages && node.src.pages.length ? `p. ${node.src.pages.length > 2 ? `${node.src.pages[0]}–${node.src.pages[node.src.pages.length - 1]}` : node.src.pages.join(', ')}` : '';
    const history = [];
    let busy = false, finished = false, errors = 0;
    el = document.createElement('div');
    el.className = 'lesson dlg';
    el.style.setProperty('--lc', 'var(--accent)');
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', `${mode === 'socratique' ? 'Dialogue' : 'Enseigne-moi'} : ${node.title}`);
    el.innerHTML = `<div class="ls-top"><button class="icon-btn ls-close" aria-label="Fermer">${d.ic('x')}</button>
        <div class="dlg-title"><small>${mode === 'socratique' ? 'Dialogue avec Pousse' : 'Enseigne-moi'}</small><b>${d.esc(node.title)}</b></div></div>
      <div class="dlg-feed" aria-live="polite"></div>
      <form class="dlg-form"><textarea id="dlgInput" rows="2" placeholder="${mode === 'socratique' ? 'Ta réponse…' : 'Explique la notion avec tes mots…'}" aria-label="Ta réponse"></textarea>
        <div class="dlg-actions">${mode === 'socratique' ? `<button type="button" class="btn ghost sm" data-dlg="hint">${d.ic('lightbulb')}Un indice</button>` : ''}<button class="btn" type="submit">${d.ic('paper-plane-right', true)}Envoyer</button></div></form>`;
    document.body.appendChild(el);
    document.documentElement.classList.add('in-lesson');
    requestAnimationFrame(() => el.classList.add('show'));
    const feed = el.querySelector('.dlg-feed'), form = el.querySelector('.dlg-form'), input = el.querySelector('#dlgInput');
    const scroll = () => { feed.scrollTop = feed.scrollHeight; };
    const add = (html, cls) => { const b = document.createElement('div'); b.className = cls; b.innerHTML = html; feed.appendChild(b); scroll(); return b; };
    const avatar = (mood = 'smile') => `<span class="dlg-av">${(window.Mascot && Mascot.mini({ size: 34, mood })) || d.ic('plant', true)}</span>`;
    const pousse = (text, mood) => add(`${avatar(mood)}<p>${d.esc(text)}</p>`, 'dlg-msg pousse');

    const st = () => { const x = Mastery.notions(s).find((y) => y.n.id === node.id); return x ? x.state : 'new'; };
    const learner = () => ({
      state: Mastery.STATES[st()].label,
      misconceptions: ((node.ev && node.ev.mis) || []).map((m) => m.label),
      prerequisites: d.prereqs.map((p) => p.title),
    });

    function loginPanel(reason) {
      const last = Tutor.lastEmail();
      const box = add(`<div class="dlg-login">
        <p><b>${reason === 'expired' ? 'Ta session a expiré.' : 'Connecte-toi pour parler à Pousse.'}</b> Le tuteur a besoin d'un compte pour garder ton quota d'échanges. Tes cours restent sur ton appareil.</p>
        <p class="hint">Pour répondre, Arbor envoie au tuteur les passages de cette notion. Ils servent à cette réponse et ne sont pas conservés.</p>
        <label for="dlgEmail">Adresse e-mail</label><input id="dlgEmail" type="email" autocomplete="email" value="${d.esc(last)}" placeholder="toi@exemple.fr" />
        <div class="row-btns"><button type="button" class="btn sm" data-dlg="send-link">${d.ic('envelope-simple')}Recevoir le lien</button></div>
        <div class="dlg-code" hidden><label for="dlgCode">Ou colle le code reçu par e-mail</label><input id="dlgCode" inputmode="numeric" autocomplete="one-time-code" placeholder="123456" /><button type="button" class="btn ghost sm" data-dlg="verify">Valider le code</button></div>
        <p class="dlg-err" role="alert"></p></div>`, 'dlg-msg system');
      const err = box.querySelector('.dlg-err');
      box.querySelector('[data-dlg="send-link"]').onclick = async () => {
        const email = box.querySelector('#dlgEmail').value.trim();
        if (!/^\S+@\S+\.\S+$/.test(email)) { err.textContent = 'Saisis une adresse e-mail valide.'; return; }
        try { await Tutor.signIn(email); err.textContent = ''; box.querySelector('.dlg-code').hidden = false; box.querySelector('[data-dlg="send-link"]').textContent = 'Lien envoyé'; pousse('Je t’ai envoyé un lien. Ouvre-le sur cet appareil, ou colle le code ici.'); }
        catch (e) { err.textContent = e.message; }
      };
      box.querySelector('[data-dlg="verify"]').onclick = async () => {
        try { await Tutor.verifyCode(box.querySelector('#dlgEmail').value.trim(), box.querySelector('#dlgCode').value); box.remove(); start(); }
        catch (e) { err.textContent = e.message; }
      };
    }

    function showError(e) {
      errors++;
      if (e.kind === 'auth') { loginPanel('expired'); return; }
      const msg = e.kind === 'offline' ? 'Pas de connexion internet : le tuteur en a besoin. Tes révisions, elles, marchent hors ligne.'
        : e.kind === 'quota' ? `Tu as utilisé tes ${e.limit || ''} échanges avec Pousse ce mois-ci. Ils reviennent le mois prochain ; les révisions restent illimitées.`
        : `${e.message} Réessaie dans un instant.`;
      add(`<p>${d.ic('warning-circle', true)} ${d.esc(msg)}</p>`, 'dlg-msg system warn');
    }

    // Une observation par réponse évaluée ; une confusion programme une révision proche
    function observe(r, answer) {
      const outcome = { juste: 'juste', partiel: 'partiel', faux: 'faux' }[r.verdict];
      if (!outcome && !r.misconception) return;
      const obs = { sid: s.id, nid: node.id, activity: mode === 'socratique' ? 'socratique' : 'enseigne', outcome: outcome || 'faux', answer, ...(r.misconception ? { misconception: r.misconception } : {}) };
      Obs.summarize(node, { ...obs, at: Date.now() }); Obs.add(obs);
      if (r.misconception && node.srs) node.srs.due = Math.min(node.srs.due, Date.now() + 12 * 3600 * 1000);
      d.save();
    }

    function render(r, answer) {
      if (answer && VERDICT[r.verdict]) {
        const last = feed.querySelector('.dlg-msg.me:last-of-type');
        if (last) last.insertAdjacentHTML('beforeend', `<span class="dlg-verdict v-${r.verdict}">${d.ic(VERDICT[r.verdict][1], true)}${VERDICT[r.verdict][0]}</span>`);
      }
      if (r.refused) { pousse(r.reply); return; }
      const b = pousse(r.reply, r.verdict === 'juste' ? 'happy' : 'smile');
      if (r.citations && r.citations.length) b.insertAdjacentHTML('beforeend', `<div class="dlg-cites">${r.citations.map((c) => `<span class="dlg-cite">${d.ic('quotes', true)}${c.page ? `p. ${c.page}` : pageLabel || 'cours'} · « ${d.esc(c.quote)} »</span>`).join('')}</div>`);
      if (mode === 'enseigne' && answer && ((r.correct_points || []).length || (r.missing || []).length)) {
        add(`${(r.correct_points || []).length ? `<p class="ok">${d.ic('check-circle', true)}<b>Juste</b></p><ul>${r.correct_points.map((x) => `<li>${d.esc(x)}</li>`).join('')}</ul>` : ''}
          ${(r.missing || []).length ? `<p class="miss">${d.ic('plus-circle', true)}<b>À compléter</b></p><ul>${r.missing.map((x) => `<li>${d.esc(x)}</li>`).join('')}</ul>` : ''}`, 'dlg-msg card');
      }
      if (r.misconception || r.next_activity === 'revoir_prerequis' || r.next_activity === 'relire_passage') corrective(r);
      if (r.done) end();
    }

    // Activité corrective : un prérequis à revoir (graphe du cours) ou le passage à relire
    function corrective(r) {
      const pre = r.next_activity === 'revoir_prerequis' && d.prereqs[0];
      const cited = (r.citations || [])[0];
      const box = add(`${r.misconception ? `<p class="mis">${d.ic('warning-circle', true)}<b>Confusion repérée :</b> ${d.esc(r.misconception)}</p><p class="hint">La notion passe en « fragile » et revient en révision bientôt. Une bonne réponse plus tard la répare.</p>` : ''}
        <div class="row-btns">
          ${pre ? `<a class="btn sm" href="${d.link(s.id, pre.id)}">${d.ic('arrow-bend-up-left')}Revoir « ${d.esc(pre.title)} »</a>` : ''}
          ${cited || passages[0] ? `<button type="button" class="btn ${pre ? 'ghost' : ''} sm" data-dlg="reread">${d.ic('book-open-text')}Relire le passage</button>` : ''}
        </div><div class="dlg-passage" hidden></div>`, 'dlg-msg card corrective');
      const rr = box.querySelector('[data-dlg="reread"]');
      if (rr) rr.onclick = () => {
        const p = passages[(cited && cited.passage ? cited.passage : 1) - 1] || passages[0];
        const pane = box.querySelector('.dlg-passage'); pane.hidden = false;
        pane.innerHTML = `<small>${p.page ? `Cours, p. ${p.page}` : pageLabel ? `Cours, ${pageLabel}` : 'Cours'}</small><p>${d.esc(p.text.slice(0, 900))}${p.text.length > 900 ? '…' : ''}</p>`;
        rr.remove();
        scroll(); // le passage reste visible au-dessus du champ de réponse
      };
      if (pre) box.querySelector('a').addEventListener('click', () => close());
    }

    function end() {
      finished = true;
      const state = st();
      add(`<p>${d.ic('seal-check', true)}<b>Bien joué.</b> État de la notion : ${d.esc(Mastery.STATES[state].label)}.</p><p class="hint">${d.esc(Mastery.reasonOf(node, state))}</p>
        <div class="row-btns"><button type="button" class="btn sm" data-dlg="close">Terminer</button></div>`, 'dlg-msg card');
      feed.querySelector('[data-dlg="close"]').onclick = close;
      form.hidden = true;
    }

    async function send(text, hint) {
      if (busy) return;
      busy = true;
      const answer = text && text.trim();
      if (answer) { add(`<p>${d.esc(answer)}</p>`, 'dlg-msg me'); history.push({ role: 'student', text: answer }); }
      // Pousse écrit : la mascotte, un crayon qui s'agite et trois points, le temps que la réponse arrive
      const wait = add(`${(window.Mascot && Mascot.mini({ size: 46, mood: 'smile', writing: true })) || ''}<span class="sr-only">Pousse écrit sa réponse</span>`, 'dlg-msg pousse typing');
      try {
        const r = await Tutor.ask({ mode, notion: { title: node.title, course: s.title }, passages, history: history.slice(0, -1).concat(answer ? [] : history.slice(-1)).filter(Boolean), message: answer || '', hint: !!hint, learner: learner() });
        wait.remove();
        history.push({ role: 'tutor', text: r.reply });
        if (answer) observe(r, answer);
        render(r, answer);
      } catch (e) { wait.remove(); if (answer) history.pop(); showError(e); }
      busy = false;
      if (!finished) input.focus();
    }

    function start() {
      if (!Tutor.signedIn()) { loginPanel(); return; }
      if (mode === 'socratique') send('', false);
      else pousse(`Explique « ${node.title} » avec tes mots, comme si tu l’apprenais à quelqu’un. Je compare avec ton cours.`);
    }

    form.onsubmit = (e) => { e.preventDefault(); const v = input.value; if (!v.trim()) return; input.value = ''; send(v, false); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
    el.querySelector('[data-dlg="hint"]') && (el.querySelector('[data-dlg="hint"]').onclick = () => send('', true));
    el.querySelector('.ls-close').onclick = close;
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    start();
  }

  function close() {
    if (!el) return;
    const node = el; el = null;
    node.classList.remove('show');
    document.documentElement.classList.remove('in-lesson');
    setTimeout(() => node.remove(), 300);
  }

  window.Dialogue = { open, close, canTalk, passagesOf };
})();
