/* Effets : confettis, toasts */
(function () {
  const canvas = document.getElementById('confetti');
  const ctx = canvas.getContext('2d');
  let parts = [];
  let running = false;

  function resize() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
  }
  window.addEventListener('resize', resize);
  resize();

  function confetti(x = window.innerWidth / 2, y = window.innerHeight / 3, n = 90) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#7c5cff', '#ff5c8a', '#ffb020', '#22c55e', '#06b6d4', '#e879f9'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 4 + Math.random() * 8;
      parts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6,
        r: 4 + Math.random() * 5, c: colors[i % colors.length],
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, life: 1,
      });
    }
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  function tick() {
    const d = devicePixelRatio;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts.forEach((p) => {
      p.vy += 0.3; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.011;
      ctx.save();
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.translate(p.x * d, p.y * d);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r * d / 2, -p.r * d / 4, p.r * d, p.r * d / 2);
      ctx.restore();
    });
    parts = parts.filter((p) => p.life > 0 && p.y < window.innerHeight + 40);
    if (parts.length) requestAnimationFrame(tick);
    else { running = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }

  function toast(msg, type = 'info', ms = 2600) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, ms);
  }

  window.FX = { confetti, toast };
})();
