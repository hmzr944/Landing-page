/* =========================================================
   PULS : couche identité et effets
   Chaque effet a une raison :
   - pouls (logo, moniteur) : l'état du SAV, il accélère avec les dossiers critiques
   - rideau bordeaux : changement de moteur
   - pastille glissante : où l'on se trouve
   - sceau : un dossier est clos, geste de maison
   - halo, aimant, onde : retour tactile sur ce qui est cliquable
   Tout est neutralisé avec prefers-reduced-motion.
   ========================================================= */
window.PULSFX = (() => {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;
  const $ = (s, el = document) => el.querySelector(s);

  /* ---------- Tracé du pouls (motif d'un battement, 60 px) ---------- */
  const BEAT = "h18 l3 -3 l3 3 h3 l3 -10 l3 18 l3 -8 h4 l4 -4 l4 4 h12";
  const ecgPath = (beats, y = 12) => `M0 ${y} ` + Array(beats).fill(BEAT).join(" ");

  function initMonitor() {
    const p = $("#ecg");
    if (p) p.setAttribute("d", ecgPath(5));
    const one = "M0 12 h12 l3 -3 l3 3 h3 l3 -10 l3 18 l3 -8 h4 l4 -4 l4 4 h18";
    ["#brand-ecg", "#brand-ecg-base"].forEach((s) => $(s)?.setAttribute("d", one));
  }

  // fréquence : 58 battements par minute au repos, +9 par dossier critique
  function setPulse(critical) {
    const bpm = 58 + critical * 9;
    document.documentElement.style.setProperty("--beat", (60 / bpm).toFixed(3) + "s");
    const n = $("#pulse-n");
    if (n && n.textContent !== String(bpm)) {
      n.textContent = bpm;
      n.classList.remove("tick"); void n.offsetWidth; n.classList.add("tick");
    }
    const m = $(".monitor");
    if (m) m.classList.toggle("alert", critical >= 3);
  }

  /* ---------- Intro : une fois par session ---------- */
  function intro() {
    const el = $("#intro");
    if (!el) return;
    let seen = false;
    try { seen = sessionStorage.getItem("puls-intro") === "1"; sessionStorage.setItem("puls-intro", "1"); } catch (e) {}
    if (reduce || seen) { el.remove(); return; }
    $(".intro-pulse path").setAttribute("d", "M0 20 H70 L78 14 L86 20 H96 L104 4 L114 36 L122 20 H134 L142 12 L150 20 H220");
    el.classList.add("play");
    setTimeout(() => el.classList.add("lift"), 1350);
    setTimeout(() => el.remove(), 2100);
  }

  /* ---------- Rideau entre les moteurs ---------- */
  let wiping = false;
  // Partie 12 : pas de transition plein écran. Le changement de moteur reste un fondu local (puls.js).
  function wipe(swap) {
    const w = $("#wipe");
    if (reduce || !w || wiping) return swap();
    wiping = true;
    w.className = "wipe in";
    setTimeout(() => {
      swap();
      w.className = "wipe out";
      setTimeout(() => { w.className = "wipe"; wiping = false; }, 420);
    }, 330);
  }

  /* ---------- Pastille de navigation ---------- */
  function movePill() {
    const pill = $(".rail-pill"), a = $(".rail-link.is-active");
    if (!pill || !a) return;
    pill.style.width = a.offsetWidth + "px";
    pill.style.height = a.offsetHeight + "px";
    pill.style.transform = `translate(${a.offsetLeft}px, ${a.offsetTop}px)`;
    pill.classList.add("ready");
  }
  window.addEventListener("resize", () => requestAnimationFrame(movePill));

  /* ---------- Titres : révélation mot à mot ---------- */
  function splitTitle(h) {
    if (!h || h.querySelector(".w")) return;
    let i = 0;
    const wrap = (node) => {
      const outer = document.createElement("span");
      outer.className = "w";
      const inner = document.createElement("span");
      inner.style.setProperty("--w", i++);
      inner.appendChild(node);
      outer.appendChild(inner);
      return outer;
    };
    [...h.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          frag.appendChild(/^\s+$/.test(part) ? document.createTextNode(part) : wrap(document.createTextNode(part)));
        });
        h.replaceChild(frag, n);
      } else {
        const placeholder = document.createTextNode("");
        h.replaceChild(placeholder, n);
        h.replaceChild(wrap(n), placeholder);
      }
    });
  }

  function afterRender(root) {
    if (!root) return;
    root.querySelectorAll(".c-hero h2, .topbar h1").forEach(splitTitle);
  }

  /* ---------- Sceau de résolution ---------- */
  // caseEl est atténué, le sceau se pose sur anchor (le bloc où l'on vient de cliquer)
  function seal(caseEl, anchor, pending) {
    const host = anchor || caseEl;
    if (!host || reduce) return;
    const s = document.createElement("div");
    s.className = "seal" + (pending ? " pending" : "");
    const label = pending ? "EN VALIDATION • CONCIERGE PULS • " : "RÉSOLU • CONCIERGE PULS • RÉSOLU • ";
    s.innerHTML = `<svg viewBox="0 0 160 160" aria-hidden="true">
        <defs><path id="sealArc" d="M80 80 m-58 0 a58 58 0 1 1 116 0 a58 58 0 1 1 -116 0"/></defs>
        <circle cx="80" cy="80" r="76" class="seal-disc"/>
        <circle cx="80" cy="80" r="44" class="seal-in"/>
        <text class="seal-text"><textPath href="#sealArc">${label}</textPath></text>
      </svg><i class="ph ${pending ? "ph-hourglass-medium" : "ph-check"}"></i>`;
    caseEl?.classList.add("sealed");
    host.appendChild(s);
  }

  /* ---------- Halo sous le curseur, aimant, onde ---------- */
  if (fine && !reduce) {
    let raf = 0, last;
    document.addEventListener("pointermove", (e) => {
      last = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const t = last.target.closest?.(".tile, .q-item, .ship, .gesture");
        if (t) {
          const r = t.getBoundingClientRect();
          t.style.setProperty("--mx", `${last.clientX - r.left}px`);
          t.style.setProperty("--my", `${last.clientY - r.top}px`);
        }
        const m = last.target.closest?.(".btn-bx:not(:disabled), .btn-ink:not(:disabled)");
        document.querySelectorAll(".btn.magnet").forEach((b) => { if (b !== m) { b.style.translate = ""; b.classList.remove("magnet"); } });
        if (m) {
          const r = m.getBoundingClientRect();
          const dx = last.clientX - (r.left + r.width / 2), dy = last.clientY - (r.top + r.height / 2);
          m.classList.add("magnet");
          m.style.translate = `${dx * 0.16}px ${dy * 0.3}px`;
        }
      });
    }, { passive: true });
  }

  document.addEventListener("pointerdown", (e) => {
    if (reduce) return;
    const t = e.target.closest(".btn, .gesture, .chip, .q-item, .rail-link, .seg button");
    if (!t || t.disabled) return;
    const r = t.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * 2.2;
    const s = document.createElement("span");
    s.className = "ripple";
    s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    t.appendChild(s);
    setTimeout(() => s.remove(), 650);
  });

  document.addEventListener("DOMContentLoaded", initMonitor);
  if (document.readyState !== "loading") initMonitor();

  return { afterRender, wipe, movePill, seal, setPulse, reduce };
})();
