// Test de bout en bout du site public et de l'accès à PULS App.
// Usage : servir puls/ sur le port 8765 puis `node site-src/test-site.cjs [dossier-captures]`.
const { chromium } = require("playwright");
const path = require("path");
const BASE = process.env.PULS_BASE || "http://localhost:8765";
const OUT = process.argv[2];
const PAGES = ["index.html", "plateforme.html", "secteurs/index.html", "secteurs/gastronomie.html", "secteurs/frais.html", "secteurs/luxe.html",
  "secteurs/mobilier.html", "secteurs/cadeaux.html", "integrations.html", "securite.html", "demo.html", "confidentialite.html", "connexion.html"];
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? "OK  " : "FAIL"} ${msg}`); if (!cond) failures++; };

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const watch = (p, tag) => {
    p.on("pageerror", (e) => errs.push(`${tag} ${e.message}`));
    p.on("console", (m) => { if (m.type() === "error" && !/GT-Walsheim/.test(m.text()) && !/404|400/.test(m.text())) errs.push(`${tag} ${m.text()}`); });
    p.on("requestfailed", (r) => { if (!/GT-Walsheim|fonts\.g|unpkg/.test(r.url())) errs.push(`${tag} échec ${r.url()}`); });
    p.on("response", (r) => { if (r.status() >= 400 && !/GT-Walsheim|auth\/v1\/token/.test(r.url())) errs.push(`${tag} ${r.status()} ${r.url()}`); });
  };

  // 1. toutes les pages, bureau et mobile
  for (const [w, h, tag] of [[1440, 900, "desktop"], [390, 844, "mobile"]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    watch(p, tag);
    for (const pg of PAGES) {
      await p.goto(`${BASE}/${pg}`);
      await p.waitForTimeout(250);
      const sw = await p.evaluate(() => document.documentElement.scrollWidth);
      ok(sw <= w, `${tag} ${pg} sans débordement (${sw}px)`);
      const links = await p.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => a.href).filter((u) => u.startsWith(location.origin)));
      for (const u of [...new Set(links)]) {
        const r = await p.request.get(u.split("#")[0]);
        if (r.status() >= 400) { errs.push(`${tag} lien cassé ${u} depuis ${pg}`); }
      }
    }
    await p.close();
  }

  // 2. accueil : visite guidée, menu secteurs, captures
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  watch(p, "flow");
  await p.goto(`${BASE}/index.html`);
  await p.waitForTimeout(1200);
  if (OUT) await p.screenshot({ path: path.join(OUT, "site-home.png") });
  await p.hover("[data-drop]");
  await p.waitForTimeout(300);
  ok(await p.isVisible("#drop-secteurs a"), "menu Secteurs ouvert au survol");
  if (OUT) await p.screenshot({ path: path.join(OUT, "site-dropdown.png") });
  await p.mouse.move(700, 700);
  await p.evaluate(() => document.querySelectorAll(".reveal").forEach((e) => e.classList.add("in")));
  await p.click('.tour-steps [data-spot="gestures"]');
  ok(await p.getAttribute('.hotspot[data-spot="gestures"]', "class") === "hotspot", "visite : repère « gestes » actif");
  if (OUT) await p.screenshot({ path: path.join(OUT, "site-home-full.png"), fullPage: true });

  // 3. plateforme : arbitrage
  await p.goto(`${BASE}/plateforme.html`);
  await p.evaluate(() => document.querySelectorAll(".reveal").forEach((e) => e.classList.add("in")));
  await p.selectOption("#arb-case", "b");
  ok((await p.textContent("#arb-foot")).includes("aucune marge n'est calculée"), "arbitrage : pas de marge sans coût de revient");
  await p.selectOption("#arb-case", "a");
  await p.selectOption("#arb-role", "collab");
  const courierAuth = await p.textContent("#arb-body tr.best td:last-child");
  ok(courierAuth.includes("Validation"), `arbitrage : coursier hors délégation collaborateur (${courierAuth.trim()})`);
  await p.selectOption("#arb-role", "sav");
  ok((await p.textContent("#arb-body tr.best td:last-child")).includes("Dans votre délégation"), "arbitrage : coursier dans la délégation du responsable SAV");
  if (OUT) { await p.locator("#arbitrage").scrollIntoViewIfNeeded(); await p.screenshot({ path: path.join(OUT, "site-arbitrage.png") }); }

  // 4. formulaire de démonstration
  await p.goto(`${BASE}/demo.html?sujet=integration`);
  ok(await p.inputValue("#f-topic") === "integration", "formulaire : sujet prérempli depuis l'URL");
  await p.click("#lead-form button[type=submit]");
  ok(await p.locator(".field.invalid").count() >= 5, "formulaire : champs requis signalés");
  await p.fill("#f-name", "Camille Ortega");
  await p.fill("#f-email", "camille@gmail.com");
  await p.fill("#f-company", "Atelier Brume");
  await p.fill("#f-role", "Directrice des opérations");
  await p.selectOption("#f-sector", "cadeaux");
  await p.selectOption("#f-volume", "50 à 200");
  await p.click("#lead-form button[type=submit]");
  ok((await p.textContent('[data-err="email"]')).includes("professionnelle"), "formulaire : adresse personnelle refusée");
  await p.fill("#f-email", "camille@atelier-brume.fr");
  await p.click("#lead-form button[type=submit]");
  ok(await p.isVisible("#consent-err"), "formulaire : consentement exigé");
  await p.check("#f-consent");
  await p.click("#lead-form button[type=submit]");
  await p.waitForTimeout(400);
  ok((await p.textContent("#lead-card")).includes("n'a pas été transmise"), "formulaire : confirmation honnête sans point de collecte");
  if (OUT) await p.screenshot({ path: path.join(OUT, "site-demo-done.png") });

  // 5. connexion, application, déconnexion
  await p.goto(`${BASE}/app/`);
  await p.waitForURL(/connexion\.html/);
  ok(true, "app : redirection vers la connexion sans session");
  if (OUT) await p.screenshot({ path: path.join(OUT, "site-login.png") });
  ok(await p.isEnabled("#account-submit"), "connexion : comptes nominatifs disponibles (Supabase configuré)");
  // Appel RÉEL au projet Supabase : identifiants inexistants, aucune donnée créée.
  await p.fill("#l-email", "compte-inexistant@puls-test.invalid");
  await p.fill("#l-pass", "mauvais-mot-de-passe");
  await p.click("#account-submit");
  await p.waitForFunction(() => /incorrect|Erreur|Trop de tentatives|réseau/.test(document.querySelector("#account-status")?.textContent || ""), null, { timeout: 15000 });
  const authMsg = (await p.textContent("#account-status")).trim();
  ok(/E-mail ou mot de passe incorrect/.test(authMsg), `connexion réelle : refus traduit (${authMsg})`);
  await p.click('.seg-switch [data-mode="signup"]');
  await p.fill("#l-pass", "court");
  await p.click("#account-submit");
  ok((await p.textContent("#account-status")).includes("8 caractères"), "inscription : mot de passe trop court refusé avant tout envoi");
  await p.click("#demo-login button[type=submit]");
  await p.waitForURL(/app\/$/);
  await p.waitForTimeout(1200);
  ok((await p.textContent("#workspace")).includes("Maison Valcour"), "app : espace de travail affiché");
  ok(await p.locator(".q-item").count() === 7, "app : file d'urgence chargée");
  const manifest = await p.evaluate(async () => (await fetch(document.querySelector('link[rel=manifest]').href)).json());
  ok(manifest.icons.length === 3 && manifest.display === "standalone", "PWA : manifeste valide");
  const swOk = await p.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; });
  ok(swOk, "PWA : service worker actif");
  const cached = await p.evaluate(async () => { const keys = await caches.keys(); const c = await caches.open(keys.find((k) => k.startsWith("puls-app"))); return (await c.keys()).map((r) => new URL(r.url).pathname); });
  ok(cached.every((u) => /\.(html|css|js|png|webmanifest)$|\/$/.test(u)), `PWA : cache limité aux fichiers d'interface (${cached.length} fichiers)`);
  const ls = await p.evaluate(() => Object.keys(localStorage));
  ok(!ls.some((k) => /session|case|dossier/i.test(k)), "app : aucune donnée de session ni de dossier dans localStorage");
  await p.click("#logout-btn");
  await p.waitForURL(/connexion\.html\?out=1/);
  ok(await p.isVisible("#logout-note"), "déconnexion : session effacée et message affiché");
  await p.goto(`${BASE}/app/`);
  await p.waitForURL(/connexion\.html/);
  ok(true, "après déconnexion : l'app redemande la connexion");

  // 6. mobile : menu
  const m = await b.newPage({ viewport: { width: 390, height: 844 } });
  watch(m, "mobile-flow");
  await m.goto(`${BASE}/index.html`);
  await m.click(".burger");
  await m.waitForTimeout(300);
  ok(await m.isVisible("#mobile-menu a"), "mobile : menu ouvert");
  if (OUT) await m.screenshot({ path: path.join(OUT, "site-mobile-menu.png") });
  await m.click(".burger");
  await m.waitForTimeout(300);
  await m.evaluate(() => document.querySelectorAll(".reveal").forEach((e) => e.classList.add("in")));
  if (OUT) await m.screenshot({ path: path.join(OUT, "site-mobile.png") });

  console.log(errs.length ? "ERREURS:\n" + [...new Set(errs)].join("\n") : "Aucune erreur console ni lien cassé");
  console.log(failures ? `${failures} échec(s)` : "Tous les contrôles passent");
  await b.close();
  process.exit(failures || errs.length ? 1 : 0);
})();
