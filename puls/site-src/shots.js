// Génère les captures réelles de PULS App utilisées par le site (puls/assets/).
// Usage : depuis puls/, servir le dossier (python3 -m http.server 8765) puis `node site-src/shots.js`.
const { chromium } = require("playwright");
const path = require("path");
const OUT = path.join(__dirname, "..", "assets");
const BASE = process.env.PULS_BASE || "http://localhost:8765";

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  await ctx.addInitScript(() => sessionStorage.setItem("puls-session", JSON.stringify({
    workspace: "Maison Valcour", user: "Inès Valadier", role: "Responsable SAV", mode: "demo",
  })));
  const p = await ctx.newPage();
  await p.goto(BASE + "/app/");
  await p.waitForTimeout(1500);
  await p.mouse.move(0, 0);
  const shot = (name, clip) => p.screenshot({ path: path.join(OUT, name), type: "jpeg", quality: 84, clip });

  // Concierge Desk : vue complète pour le hero, et repères de la visite guidée
  await shot("app-desk.jpg", { x: 0, y: 0, width: 1440, height: 1000 });
  const H = 1300;
  await p.setViewportSize({ width: 1440, height: H });
  await p.waitForTimeout(400);
  await shot("app-desk-tour.jpg", { x: 0, y: 0, width: 1440, height: H });
  const spots = await p.evaluate((H) => {
    const c = (sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return [+((r.left + r.width / 2) / 14.4).toFixed(1), +((r.top + Math.min(r.height, 160) / 2) / (H / 100)).toFixed(1)]; };
    return { queue: c(".q-item"), score: c(".c-score .ring"), timeline: c(".c-timeline .timeline"), gestures: c(".c-gestures .gestures") };
  }, H);
  console.log("HOTSPOTS", JSON.stringify(spots));

  await p.setViewportSize({ width: 1440, height: 1000 });
  await p.click('.rail-link[data-view="thermal"]');
  await p.waitForTimeout(900);
  await shot("app-thermal.jpg", { x: 248, y: 100, width: 1192, height: 760 });

  await p.click('.rail-link[data-view="proof"]');
  await p.waitForTimeout(700);
  await p.click("[data-sim-photos]");
  await p.click("[data-analyze]");
  await p.waitForTimeout(1600);
  await shot("app-proof.jpg", { x: 248, y: 100, width: 1192, height: 700 });

  await p.click('.rail-link[data-view="carrier"]');
  await p.waitForTimeout(900);
  await shot("app-carrier.jpg", { x: 248, y: 100, width: 1192, height: 640 });
  await b.close();
})();
