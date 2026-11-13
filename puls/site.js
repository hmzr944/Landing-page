/* PULS : interactions du site public. Chaque bloc ne s'active que si sa page contient l'élément visé. */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CONFIG = window.PULS_CONFIG || {};
  const euro = (n) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- navigation ---------- */
  const nav = $("#nav"), sentinel = $("#top-sentinel");
  if (nav && sentinel && "IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => nav.classList.toggle("scrolled", !e.isIntersecting)).observe(sentinel);
  }
  const dropBtn = $("[data-drop]"), drop = $("#drop-secteurs");
  const setDrop = (open) => { if (!dropBtn) return; dropBtn.setAttribute("aria-expanded", open); drop.classList.toggle("open", open); };
  dropBtn?.addEventListener("click", (e) => { e.stopPropagation(); setDrop(dropBtn.getAttribute("aria-expanded") !== "true"); });
  if (dropBtn && window.matchMedia("(hover: hover)").matches) {
    const li = dropBtn.parentElement; let t;
    li.addEventListener("mouseenter", () => { clearTimeout(t); setDrop(true); });
    li.addEventListener("mouseleave", () => { t = setTimeout(() => setDrop(false), 160); });
  }
  document.addEventListener("click", (e) => { if (drop && !drop.contains(e.target)) setDrop(false); });

  const burger = $(".burger"), menu = $("#mobile-menu");
  burger?.addEventListener("click", () => {
    const open = burger.getAttribute("aria-expanded") !== "true";
    burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    burger.innerHTML = `<i class="ph ${open ? "ph-x" : "ph-list"}"></i>`;
    menu.classList.toggle("open", open);
    document.body.style.overflow = open ? "hidden" : "";
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    setDrop(false);
    if (menu?.classList.contains("open")) burger.click();
  });

  /* ---------- apparition au défilement ---------- */
  const reveals = $$(".reveal");
  if (reduce || !("IntersectionObserver" in window)) reveals.forEach((el) => el.classList.add("in"));
  else {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- visite guidée de l'écran ---------- */
  const tour = $(".demo-tour");
  if (tour) {
    const select = (k) => {
      $$(".tour-steps [data-spot]", tour).forEach((b) => b.setAttribute("aria-selected", String(b.dataset.spot === k)));
      $$(".hotspot", tour).forEach((h) => h.classList.toggle("dim", h.dataset.spot !== k));
    };
    tour.addEventListener("click", (e) => { const t = e.target.closest("[data-spot]"); if (t) select(t.dataset.spot); });
  }

  /* ---------- simulateur d'arbitrage (exemple fictif) ---------- */
  const arb = $("#arb");
  if (arb) {
    // Délégation financière : exemple de configuration d'une entreprise (plafond par rôle, en euros engagés)
    const ROLES = [
      ["collab", "Collaborateur", 60], ["sav", "Responsable SAV", 250], ["log", "Responsable logistique", 150],
      ["admin", "Administrateur", 1000], ["obs", "Observateur", 0],
    ];
    const CASES = [
      { id: "a", label: "Coffret chocolat, Paris, occasion hier", price: 89, cost: 31, deadline: "Aujourd'hui", reco: "courier",
        recoWhy: "La seule option livrée aujourd'hui sans demander à la cliente de se déplacer.",
        options: [
          ["standard", "Réexpédition standard", 9, 0, true, "48 h", "Stock entrepôt : 14"],
          ["express", "Réexpédition express", 24, 0, true, "Demain", "Stock entrepôt : 14"],
          ["courier", "Coursier dédié", 45, 0, true, "Avant 16 h 30", "Zone Paris, commande avant 15 h"],
          ["shop", "Remplacement en boutique", 0, 0, true, "Aujourd'hui", "Retrait par la cliente, stock boutique : 6"],
          ["refund", "Remboursement total", 0, 89, true, "Immédiat", "Aucun produit renvoyé"],
          ["extra", "Avoir complémentaire 15 %", 0, 13, true, "Immédiat", "Cumulable avec une autre option"],
        ] },
      { id: "b", label: "Vase en verre soufflé, Lyon, cassé", price: 240, cost: null, deadline: "Aucune", reco: "standard",
        recoWhy: "Pas d'échéance : la solution la moins coûteuse qui remplace l'objet suffit.",
        options: [
          ["standard", "Réexpédition standard", 28, 0, true, "3 jours", "Emballage renforcé"],
          ["express", "Réexpédition express", 52, 0, true, "Demain", "Emballage renforcé"],
          ["courier", "Coursier dédié", 60, 0, true, "Aujourd'hui", "Zone Lyon"],
          ["shop", "Remplacement en boutique", 0, 0, false, "", "Stock boutique de Lyon : 0"],
          ["refund", "Remboursement total", 0, 240, true, "Immédiat", "Aucun produit renvoyé"],
          ["extra", "Avoir complémentaire 15 %", 0, 36, true, "Immédiat", "Cumulable avec une autre option"],
        ] },
      { id: "c", label: "Bouquet fané, Bordeaux, cérémonie demain", price: 65, cost: 22, deadline: "Demain matin", reco: "shop",
        recoWhy: "L'atelier partenaire livre aujourd'hui ; la réexpédition standard arriverait trop tard.",
        options: [
          ["standard", "Réexpédition standard", 8, 0, false, "48 h", "Arriverait après la cérémonie"],
          ["express", "Réexpédition express", 21, 0, true, "Demain 13 h", "Livraison après l'heure de la cérémonie"],
          ["courier", "Coursier dédié", 0, 0, false, "", "Hors zone coursier (Paris, Lyon)"],
          ["shop", "Atelier partenaire local", 12, 0, true, "Aujourd'hui 18 h", "Atelier de Bordeaux, composition équivalente"],
          ["refund", "Remboursement total", 0, 65, true, "Immédiat", "Aucun produit renvoyé"],
          ["extra", "Avoir complémentaire 15 %", 0, 10, true, "Immédiat", "Cumulable avec une autre option"],
        ] },
    ];
    const cSel = $("#arb-case"), rSel = $("#arb-role");
    cSel.innerHTML = CASES.map((c) => `<option value="${c.id}">${esc(c.label)}</option>`).join("");
    rSel.innerHTML = ROLES.map((r) => `<option value="${r[0]}" ${r[0] === "collab" ? "selected" : ""}>${r[1]}</option>`).join("");

    const renderArb = () => {
      const c = CASES.find((x) => x.id === cSel.value);
      const role = ROLES.find((r) => r[0] === rSel.value);
      const known = c.cost !== null;
      const engaged = (o) => {
        const productCost = ["standard", "express", "courier", "shop"].includes(o[0]) ? c.cost : 0;
        return { min: o[2] + o[3] + (productCost || 0), partial: productCost === null };
      };
      const approver = (amt) => ROLES.filter((r) => r[0] !== "obs" && r[2] >= amt).sort((a, b) => a[2] - b[2])[0];
      $("#arb-body").innerHTML = c.options.map((o) => {
        const [k, name, log, gest, ok, delay, why] = o;
        const e = engaged(o);
        let auth;
        if (!ok) auth = "Indisponible";
        else if (role[0] === "obs") auth = "Lecture seule";
        else if (e.min <= role[2]) auth = e.partial ? "À confirmer, coût produit inconnu" : "Dans votre délégation";
        else auth = `Validation : ${approver(e.min)?.[1] || "Direction"}`;
        return `<tr class="${!ok ? "na" : ""} ${k === c.reco ? "best" : ""}">
          <td>${esc(name)}${k === c.reco ? ` <span class="lvl lvl-action" style="font-size:12px">Recommandé</span>` : ""}<span class="why">${esc(why)}</span></td>
          <td class="num">${ok ? euro(log) : ""}</td><td class="num">${ok ? (gest ? euro(gest) : "") : ""}</td>
          <td class="num">${ok ? (e.partial ? `${euro(e.min)} + produit` : euro(e.min)) : ""}</td>
          <td>${ok ? esc(delay) : ""}</td><td>${auth}</td></tr>`;
      }).join("");
      const best = c.options.find((o) => o[0] === c.reco), refund = c.options.find((o) => o[0] === "refund");
      const be = engaged(best).min, re = engaged(refund).min;
      $("#arb-foot").innerHTML = `
        <span><b>Échéance :</b> ${esc(c.deadline)}. ${esc(c.recoWhy)}</span>
        <span><b>Chiffre d'affaires de la commande :</b> ${euro(c.price)}. ${known
          ? `<b>Coût de revient renseigné :</b> ${euro(c.cost)}, marge connue ${euro(c.price - c.cost)}.`
          : `<b>Coût de revient non renseigné :</b> aucune marge n'est calculée.`}</span>
        <span><b>Économie potentielle</b> par rapport au remboursement total : ${known ? euro(Math.max(0, re - be)) : "non calculable sans coût de revient"}.</span>
        <span>Exemple fictif. Plafonds de délégation : collaborateur 60 €, responsable logistique 150 €, responsable SAV 250 €.</span>`;
    };
    cSel.addEventListener("change", renderArb);
    rSel.addEventListener("change", renderArb);
    renderArb();
  }

  /* ---------- formulaire de démonstration ---------- */
  const form = $("#lead-form");
  if (form) {
    const FREE = ["gmail.com", "googlemail.com", "yahoo.com", "yahoo.fr", "hotmail.com", "hotmail.fr", "outlook.com", "outlook.fr", "live.com", "live.fr", "icloud.com", "me.com", "orange.fr", "wanadoo.fr", "free.fr", "sfr.fr", "laposte.net", "aol.com", "gmx.fr", "gmx.com", "proton.me", "protonmail.com"];
    const params = new URLSearchParams(location.search);
    if (params.get("sujet")) form.topic.value = params.get("sujet");
    if (params.get("secteur")) form.sector.value = params.get("secteur");

    const fieldOf = (el) => el.closest(".field");
    const check = (el) => {
      let ok = el.checkValidity() && el.value.trim() !== "";
      if (el.name === "email" && ok) {
        const dom = el.value.split("@")[1]?.toLowerCase();
        const err = $('[data-err="email"]', fieldOf(el));
        if (FREE.includes(dom)) { ok = false; err.textContent = "Merci d'utiliser votre adresse professionnelle."; }
        else err.textContent = "Indiquez une adresse e-mail valide.";
      }
      fieldOf(el)?.classList.toggle("invalid", !ok);
      el.setAttribute("aria-invalid", String(!ok));
      return ok;
    };
    $$("input[required]:not([type=checkbox]), select[required]", form).forEach((el) => {
      el.addEventListener("blur", () => el.value && check(el));
      el.addEventListener("input", () => fieldOf(el).classList.contains("invalid") && check(el));
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const els = $$("input[required]:not([type=checkbox]), select[required]", form);
      const bad = els.filter((el) => !check(el));
      const consent = form.consent.checked;
      $("#consent-err").style.display = consent ? "none" : "block";
      if (bad.length || !consent) { (bad[0] || form.consent).focus(); return; }

      const data = Object.fromEntries(new FormData(form));
      data.consent = true;
      data.submittedAt = new Date().toISOString();
      data.source = "site-puls";
      const btn = $("button[type=submit]", form), status = $("#form-status");
      btn.disabled = true; status.textContent = "Envoi en cours";

      let sent = false;
      if (CONFIG.leadEndpoint) {
        try {
          const res = await fetch(CONFIG.leadEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
          if (!res.ok) throw new Error(res.status);
          sent = true;
        } catch (err) {
          btn.disabled = false;
          status.textContent = "L'envoi a échoué. Vos informations sont conservées dans le formulaire, réessayez dans un instant.";
          return;
        }
      }
      showDone(data, sent);
    });

    function showDone(d, sent) {
      const sectorLabel = form.sector.selectedOptions[0]?.text || d.sector;
      const topicLabel = form.topic.selectedOptions[0]?.text || d.topic;
      const first = d.name.trim().split(/\s+/)[0];
      $("#lead-card").innerHTML = `<div class="done" tabindex="-1" id="done">
        <div class="seal"><i class="ph ph-check"></i></div>
        <h2 style="font-size:clamp(28px,3vw,40px)">Merci, ${esc(first)}.</h2>
        <p class="lede" style="margin-top:14px">${sent
          ? "Votre demande est bien arrivée. Nous revenons vers vous sous deux jours ouvrés."
          : "Votre demande est prête, mais ce site n'a pas encore de point de collecte branché."}</p>
        <dl><dt>Entreprise</dt><dd>${esc(d.company)}</dd><dt>Secteur</dt><dd>${esc(sectorLabel)}</dd><dt>Volume</dt><dd>${esc(d.volume)}</dd><dt>Sujet</dt><dd>${esc(topicLabel)}</dd><dt>Contact</dt><dd>${esc(d.email)}</dd></dl>
        ${sent ? "" : `<div class="notice"><i class="ph ph-info"></i><span>Site en préproduction : la demande n'a pas été transmise et n'a pas quitté votre navigateur. Copiez-la pour nous l'adresser directement.</span></div>
        <div class="form-actions"><button class="btn btn-dark" type="button" id="copy-lead"><i class="ph ph-copy"></i>Copier ma demande</button><a class="btn btn-line" href="index.html">Retour à l'accueil</a></div>`}
      </div>`;
      $("#done").focus();
      $("#copy-lead")?.addEventListener("click", async (ev) => {
        const txt = Object.entries({ Nom: d.name, "E-mail": d.email, Entreprise: d.company, Fonction: d.role, Secteur: sectorLabel, Volume: d.volume, Sujet: topicLabel, Précisions: d.message || "" })
          .map(([k, v]) => `${k} : ${v}`).join("\n");
        try { await navigator.clipboard.writeText(txt); ev.currentTarget.innerHTML = '<i class="ph ph-check"></i>Demande copiée'; }
        catch (e2) { ev.currentTarget.textContent = "Copie impossible dans ce navigateur"; }
      });
    }
  }

  /* ---------- connexion ---------- */
  const demoLogin = $("#demo-login");
  if (demoLogin) {
    const params = new URLSearchParams(location.search);
    const note = (text) => { const n = $("#auth-note"); n.querySelector("span").textContent = text; n.hidden = false; };
    if (params.get("out")) $("#logout-note").hidden = false;
    if (params.get("expired")) note("Votre session a expiré. Reconnectez-vous.");

    demoLogin.addEventListener("submit", (e) => {
      e.preventDefault();
      try { sessionStorage.removeItem("puls-auth"); } catch (err) { /* stockage indisponible */ }
      const session = { mode: "demo", workspace: "Maison Valcour", user: "Inès Valadier", role: "Collaboratrice", roleKey: "agent", at: new Date().toISOString() };
      try { sessionStorage.setItem("puls-session", JSON.stringify(session)); }
      catch (err) { alert("Ce navigateur bloque le stockage de session : l'espace de démonstration ne peut pas s'ouvrir."); return; }
      location.href = "app/";
    });

    const db = window.PULS && window.PULS.client;
    const form = $("#account-form"), status = $("#account-status"), submit = $("#account-submit");
    const say = (text, isErr = false) => {
      status.innerHTML = text ? `<i class="ph ${isErr ? "ph-warning" : "ph-info"}"></i><span>${esc(text)}</span>` : "";
      status.classList.toggle("err", isErr);
    };
    const AUTH_ERR = [
      [/invalid login credentials/i, "E-mail ou mot de passe incorrect."],
      [/email not confirmed/i, "Confirmez d'abord votre adresse avec le lien reçu par e-mail."],
      [/already registered|already been registered/i, "Un compte existe déjà avec cette adresse. Connectez-vous."],
      [/password should be at least|weak password/i, "Mot de passe trop court ou trop simple : 8 caractères minimum."],
      [/rate limit|too many/i, "Trop de tentatives. Patientez quelques minutes avant de réessayer."],
      [/unable to validate email|invalid email/i, "Adresse e-mail invalide."],
      [/failed to fetch|network/i, "Connexion au serveur impossible. Vérifiez votre réseau."],
      [/signups not allowed|signup is disabled/i, "Les inscriptions sont fermées sur ce projet."],
    ];
    const authErr = (e) => { const m = String((e && e.message) || e); const hit = AUTH_ERR.find(([re]) => re.test(m)); return hit ? hit[1] : `Erreur : ${m}`; };
    const goApp = () => { try { sessionStorage.removeItem("puls-session"); } catch (err) { /* rien à effacer */ } location.href = "app/"; };
    const redirect = new URL("connexion.html", location.href).href;

    if (!db) {
      $$("input, button", form).forEach((el) => { el.disabled = true; });
      say("Les comptes ne sont pas disponibles : le serveur PULS n'est pas configuré sur ce site.");
    } else {
      let mode = "signin";
      const setMode = (m) => {
        mode = m;
        $$(".seg-switch button", form).forEach((b) => b.setAttribute("aria-selected", String(b.dataset.mode === m)));
        submit.textContent = m === "signin" ? "Se connecter" : "Créer mon compte";
        $("#l-pass").autocomplete = m === "signin" ? "current-password" : "new-password";
        $("#pass-help").hidden = m === "signin";
        $("#forgot").hidden = m !== "signin";
      };
      $$(".seg-switch button", form).forEach((b) => b.addEventListener("click", () => { setMode(b.dataset.mode); say(""); }));

      // Retour d'un lien reçu par e-mail (confirmation, réinitialisation) : supabase-js lit le jeton dans l'URL.
      db.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY") { form.hidden = true; $("#reset-form").hidden = false; $("#l-new").focus(); return; }
        if (event === "SIGNED_IN" && session && /access_token/.test(location.hash)) goApp();
      });

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = $("#l-email").value.trim(), password = $("#l-pass").value;
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { say("Indiquez une adresse e-mail valide.", true); return; }
        if (password.length < 8) { say("Le mot de passe doit contenir au moins 8 caractères.", true); return; }
        submit.disabled = true;
        say(mode === "signin" ? "Connexion en cours" : "Création du compte en cours");
        try {
          if (mode === "signin") {
            const { error } = await db.auth.signInWithPassword({ email, password });
            if (error) throw error;
            goApp();
          } else {
            const { data, error } = await db.auth.signUp({ email, password, options: { emailRedirectTo: redirect } });
            if (error) throw error;
            if (data.session) { goApp(); return; }
            setMode("signin");
            say(`Compte créé. Ouvrez le lien de confirmation envoyé à ${email}, puis connectez-vous.`);
          }
        } catch (err) { say(authErr(err), true); }
        finally { submit.disabled = false; }
      });

      $("#forgot").addEventListener("click", async () => {
        const email = $("#l-email").value.trim();
        if (!email) { say("Indiquez d'abord votre e-mail, puis cliquez sur « Mot de passe oublié ».", true); $("#l-email").focus(); return; }
        try {
          const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: redirect });
          if (error) throw error;
          say("Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé.");
        } catch (err) { say(authErr(err), true); }
      });

      $("#reset-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const pw = $("#l-new").value, st = $("#reset-status");
        if (pw.length < 8) { st.textContent = "8 caractères minimum."; st.classList.add("err"); return; }
        const { error } = await db.auth.updateUser({ password: pw });
        if (error) { st.textContent = authErr(error); st.classList.add("err"); return; }
        goApp();
      });

      // Déjà connecté dans cet onglet : proposer d'entrer directement.
      db.auth.getSession().then(({ data }) => {
        if (data.session && !params.get("out") && !/access_token/.test(location.hash)) {
          note(`Session ouverte pour ${data.session.user.email}.`);
          const b = document.createElement("button");
          b.className = "btn btn-dark btn-sm"; b.style.marginLeft = "auto"; b.textContent = "Entrer";
          b.addEventListener("click", goApp);
          $("#auth-note").appendChild(b);
        }
      });
    }
  }

  /* ---------- identité légale : affichée seulement si elle est fournie, jamais inventée ---------- */
  const legalBox = $("#legal-identity");
  const L = CONFIG.legal;
  if (legalBox && L && L.controller && L.contactEmail) {
    legalBox.innerHTML = `<div class="legal-card"><dl><dt>Responsable</dt><dd>${esc(L.controller)}</dd>${L.address ? `<dt>Adresse</dt><dd>${esc(L.address)}</dd>` : ""}${L.registration ? `<dt>Immatriculation</dt><dd>${esc(L.registration)}</dd>` : ""}<dt>Contact</dt><dd><a href="mailto:${esc(L.contactEmail)}">${esc(L.contactEmail)}</a></dd></dl></div>`;
  }
})();
