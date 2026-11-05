/* Effets : confettis (réservés au moment rare où l'on maîtrise une partie) et notifications */
(function () {
  const canvas = document.getElementById('confetti');
  const ctx = canvas.getContext('2d');
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let parts = [];
  let running = false;

  function resize() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
  }
  window.addEventListener('resize', resize);
  resize();

  function confetti(x = window.innerWidth / 2, y = window.innerHeight / 3, n = 60, colors) {
    if (reduced() || document.documentElement.classList.contains('calm')) return;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#1E7A57';
    const palette = colors || [accent, '#12A150', '#E08A00', '#D93A40', '#0369A1'];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2;
      const v = 5 + Math.random() * 7;
      parts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        w: 5 + Math.random() * 5, c: palette[i % palette.length],
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.35, life: 1,
      });
    }
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  function tick() {
    const d = devicePixelRatio;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts.forEach((p) => {
      p.vy += 0.28; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.012;
      ctx.save();
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.translate(p.x * d, p.y * d);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect((-p.w * d) / 2, (-p.w * d) / 4, p.w * d, (p.w * d) / 2);
      ctx.restore();
    });
    parts = parts.filter((p) => p.life > 0 && p.y < window.innerHeight + 40);
    if (parts.length) requestAnimationFrame(tick);
    else { running = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }

  const ICON = { success: 'ph-check-circle', error: 'ph-warning-circle', info: 'ph-info' };
  function toast(msg, type = 'info', ms = 2800) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="ph-fill ${ICON[type] || ICON.info}" aria-hidden="true"></i><span></span>`;
    el.querySelector('span').textContent = msg;
    document.getElementById('toasts').appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
    setTimeout(() => {
      el.classList.remove('in');
      el.classList.add('out');
      setTimeout(() => el.remove(), 220);
    }, ms);
  }

  window.FX = { confetti, toast };
})();
