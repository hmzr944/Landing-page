#!/usr/bin/env python3
"""Génère les pages du site public PULS (puls/*.html, puls/secteurs/*.html).

Le site reste statique (aucun build côté serveur, aucune dépendance) : ce script assemble
l'en-tête, la navigation et le pied de page communs autour du contenu de chaque page.
Usage : python3 puls/site-src/build.py
"""
from pathlib import Path
import html

ROOT = Path(__file__).resolve().parent.parent

# ------------------------------------------------------------------ outils
def pulse(width=1600, height=120, beats=(0.62,), amp=1.0):
    """Ligne de pouls : plate, avec un battement aux positions données (0 à 1)."""
    y = height / 2
    d = f"M0 {y:.0f}"
    for b in beats:
        x = width * b
        a = 22 * amp
        d += (f" H{x - 60:.0f} l10 -{a * .3:.0f} l10 {a * .3:.0f} h10 l10 -{a * 1.6:.0f}"
              f" l12 {a * 2.6:.0f} l10 -{a:.0f} h12 l10 -{a * .45:.0f} l10 {a * .45:.0f}")
    return d + f" H{width}"

LOGO_SVG = '<svg viewBox="0 0 60 24" aria-hidden="true"><path d="M0 12 h12 l3 -3 l3 3 h3 l3 -10 l3 18 l3 -8 h4 l4 -4 l4 4 h18"/></svg>'

SECTORS = [
    ("gastronomie", "Gastronomie et produits artisanaux", "ph-cookie", "Chocolat, pâtisserie, glacerie : quelques degrés et quelques heures suffisent."),
    ("frais", "Produits frais et périssables", "ph-leaf", "Une durée de conservation courte transforme chaque retard en perte."),
    ("luxe", "Retail premium et luxe", "ph-diamond", "Colis de valeur, clients attentifs, gestes à encadrer."),
    ("mobilier", "Mobilier et objets fragiles", "ph-armchair", "La casse se règle en preuves, en réserves et en délais."),
    ("cadeaux", "Cadeaux et fleuristes", "ph-flower-tulip", "La date ne se négocie pas, le destinataire n'est pas l'acheteur."),
]

def nav(root, active):
    def cur(k):
        return ' aria-current="page"' if k == active else ""
    drop = "".join(
        f'<a href="{root}secteurs/{slug}.html"><i class="ph {ico}"></i><span><b>{name}</b><span>{tag}</span></span></a>'
        for slug, name, ico, tag in SECTORS)
    mob = "".join(f'<a href="{root}secteurs/{slug}.html">{name}</a>' for slug, name, _, _ in SECTORS)
    return f"""
<a class="skip" href="#contenu">Aller au contenu</a>
<span id="top-sentinel" aria-hidden="true"></span>
<header class="nav" id="nav">
  <div class="wrap nav-inner">
    <a class="logo" href="{root}index.html" aria-label="PULS, accueil"><span class="logo-mark">{LOGO_SVG}</span>PULS</a>
    <ul class="nav-links">
      <li><a href="{root}plateforme.html"{cur("plateforme")}>Plateforme</a></li>
      <li><button type="button" aria-expanded="false" aria-controls="drop-secteurs" data-drop{' aria-current="page"' if active == "secteurs" else ""}>Secteurs <i class="ph ph-caret-down"></i></button>
        <div class="dropdown" id="drop-secteurs">{drop}</div></li>
      <li><a href="{root}integrations.html"{cur("integrations")}>Intégrations</a></li>
      <li><a href="{root}securite.html"{cur("securite")}>Sécurité</a></li>
      <li><a href="{root}demo.html"{cur("contact")}>Contact</a></li>
    </ul>
    <div class="nav-actions">
      <a class="login" href="{root}connexion.html">Connexion</a>
      <a class="btn btn-primary btn-sm" href="{root}demo.html">Demander une démonstration</a>
    </div>
    <button class="burger" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Ouvrir le menu"><i class="ph ph-list"></i></button>
  </div>
</header>
<nav class="mobile-menu" id="mobile-menu" aria-label="Menu principal">
  <a href="{root}plateforme.html">Plateforme</a>
  <a href="{root}secteurs/index.html">Secteurs</a>
  <div class="sub">{mob}</div>
  <a href="{root}integrations.html">Intégrations</a>
  <a href="{root}securite.html">Sécurité</a>
  <a href="{root}demo.html">Contact</a>
  <div class="btns">
    <a class="btn btn-primary" href="{root}demo.html">Demander une démonstration</a>
    <a class="btn btn-line" href="{root}connexion.html">Connexion</a>
  </div>
</nav>"""

def footer(root):
    sec = "".join(f'<li><a href="{root}secteurs/{s}.html">{n}</a></li>' for s, n, _, _ in SECTORS)
    return f"""
<footer class="footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <a class="logo" href="{root}index.html"><span class="logo-mark">{LOGO_SVG}</span>PULS</a>
        <p class="sig">Save the experience.</p>
        <p class="muted small" style="margin-top:12px;max-width:36ch">Plateforme d'hospitalité opérationnelle et de gestion proactive des incidents post-achat.</p>
      </div>
      <div><h4>Produit</h4><ul>
        <li><a href="{root}plateforme.html">Plateforme</a></li>
        <li><a href="{root}plateforme.html#arbitrage">Arbitrage économique</a></li>
        <li><a href="{root}integrations.html">Intégrations</a></li>
        <li><a href="{root}securite.html">Sécurité</a></li></ul></div>
      <div><h4>Secteurs</h4><ul>{sec}</ul></div>
      <div><h4>Entreprise</h4><ul>
        <li><a href="{root}demo.html">Demander une démonstration</a></li>
        <li><a href="{root}connexion.html">Connexion</a></li>
        <li><a href="{root}confidentialite.html">Confidentialité</a></li></ul></div>
    </div>
    <div class="footer-bottom">
      <span>PULS, produit en phase pilote. Les écrans présentés utilisent des données fictives.</span>
      <span>Aucune certification de sécurité n'est revendiquée à ce jour.</span>
    </div>
  </div>
</footer>"""

def page(path, title, desc, body, active="", root="", bare=False):
    head = f"""<!doctype html>
<html lang="fr" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<meta name="theme-color" content="#F8F4EC">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<link rel="icon" href="{root}favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Figtree:wght@400;500;600&display=swap" rel="stylesheet">
<script src="https://unpkg.com/@phosphor-icons/web@2.1.1"></script>
<link rel="stylesheet" href="{root}site.css">
<script>document.documentElement.classList.remove("no-js")</script>
</head>
<body>"""
    if bare:
        content = body
    else:
        content = nav(root, active) + f'\n<main id="contenu">{body}</main>\n' + footer(root)
    out = head + content + f"""
<script src="{root}config.js"></script>
<script src="{root}site.js"></script>
</body>
</html>
"""
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(out, encoding="utf-8")
    print("écrit", path)

def sector_rows(root):
    return "".join(f"""
    <a class="sector-row reveal" style="--d:{i * 60}ms" href="{root}secteurs/{s}.html">
      <i class="ph {ico} ico"></i><h3>{n}</h3><p>{t}</p><span class="go"><i class="ph ph-arrow-right"></i></span>
    </a>""" for i, (s, n, ico, t) in enumerate(SECTORS))

def final_cta(root, title="Voyons ensemble vos incidents de livraison.", text="Une démonstration de 45 minutes sur vos produits, vos transporteurs et vos règles. Sans engagement."):
    return f"""
<section class="section tight"><div class="wrap">
  <div class="final reveal">
    <svg viewBox="0 0 1600 120" aria-hidden="true"><path d="{pulse(1600, 120, (0.7,))}"/></svg>
    <h2>{title}</h2>
    <p class="lede">{text}</p>
    <div class="hero-cta">
      <a class="btn btn-primary" href="{root}demo.html">Demander une démonstration <i class="ph ph-arrow-right"></i></a>
      <a class="btn btn-line" href="{root}plateforme.html">Découvrir la plateforme</a>
    </div>
  </div>
</div></section>"""

# ================================================================== ACCUEIL
HOTSPOTS = {"queue": (31.5, 20.4), "score": (89.2, 20.0), "timeline": (57.8, 84.9), "gestures": (84.7, 84.9)}
TOUR = [
    ("queue", "ph-list-numbers", "Une file triée par criticité", "Les dossiers remontent selon le risque réel, pas selon l'heure d'arrivée. Ceux détectés avant toute réclamation sont signalés."),
    ("score", "ph-gauge", "Une criticité explicable", "Le score sur 100 se décompose en cinq facteurs visibles : produit, occasion, incident, relation client, émotion."),
    ("timeline", "ph-path", "Fait, risque, action", "Chaque ligne indique sa nature : fait remonté par le transporteur, risque estimé par calcul, ou action proposée."),
    ("gestures", "ph-hand-heart", "Des gestes encadrés", "Stock, zones de coursier, délégation financière : un geste impossible ou hors délégation ne peut pas partir."),
]

def home():
    steps = "".join(f"""<li><button type="button" role="tab" data-spot="{k}" aria-selected="{'true' if i == 0 else 'false'}"><b><i class="ph {ico}"></i>{t}</b><span>{d}</span></button></li>"""
                    for i, (k, ico, t, d) in enumerate(TOUR))
    spots = "".join(f'<button class="hotspot{"" if i == 0 else " dim"}" type="button" data-spot="{k}" style="left:{HOTSPOTS[k][0]}%;top:{HOTSPOTS[k][1]}%" aria-label="{t}">{i + 1}</button>'
                    for i, (k, _, t, _) in enumerate(TOUR))
    body = f"""
<section class="hero">
  <div class="wrap hero-grid">
    <div>
      <h1 class="reveal">Une livraison ne devrait jamais détruire une <em>expérience.</em></h1>
      <p class="lede reveal" style="--d:120ms">PULS anticipe les incidents, protège les produits sensibles et aide vos équipes à sauver chaque expérience client.</p>
      <div class="hero-cta reveal" style="--d:220ms">
        <a class="btn btn-dark" href="plateforme.html">Découvrir la plateforme <i class="ph ph-arrow-right"></i></a>
        <a class="btn btn-primary" href="demo.html">Demander une démonstration</a>
      </div>
    </div>
    <div class="hero-visual reveal" style="--d:180ms">
      <svg class="hero-pulse" viewBox="0 0 1600 120" preserveAspectRatio="none" aria-hidden="true"><path d="{pulse(1600, 120, (0.18,))}"/></svg>
      <div class="frame"><img src="assets/app-desk.jpg" width="1440" height="1000" alt="Concierge Desk de PULS : file d'urgence triée par criticité et dossier d'un coffret de chocolats livré en retard" fetchpriority="high"></div>
      <div class="float-note"><b>Détecté avant la réclamation</b>Un colis surgelé est immobilisé au hub : le client est prévenu avant de s'inquiéter.</div>
    </div>
  </div>
</section>

<section class="brief" aria-label="PULS en bref">
  <div class="wrap brief-grid">
    <div class="reveal"><h3>Ce que fait PULS</h3><p>Il repère les livraisons à risque, explique chaque incident et propose la meilleure solution au conseiller.</p></div>
    <div class="reveal" style="--d:80ms"><h3>Pour qui</h3><p>Les maisons qui expédient des produits fragiles, périssables, thermosensibles ou de valeur.</p></div>
    <div class="reveal" style="--d:160ms"><h3>Ce qui change</h3><p>Un logiciel SAV attend la réclamation. PULS part de l'événement transporteur, souvent des heures avant.</p></div>
  </div>
</section>

<section class="section" id="probleme">
  <div class="wrap">
    <p class="statement reveal">Un coffret arrivé le lendemain d'un anniversaire n'est pas un retard. <strong>C'est un cadeau perdu.</strong></p>
    <p class="lede reveal" style="margin-top:28px">Pour un produit sensible, l'incident commence bien avant le message du client. Voici la chronologie typique d'une livraison ratée.</p>
    <ol class="incident">
      <li class="reveal"><time>Mardi, 09:14</time><p>Le colis quitte le hub. Rien d'anormal.</p></li>
      <li class="reveal" style="--d:100ms"><time>Mardi, 17:52</time><p>Échec de livraison : destinataire absent. Le transporteur l'enregistre.</p></li>
      <li class="risk reveal" style="--d:200ms"><time>Mercredi, 08:31</time><p>Déposé en loge chauffée après 23 heures de transit. Le chocolat a probablement souffert.</p></li>
      <li class="claim reveal" style="--d:300ms"><time>Mercredi, 08:47</time><p>La cliente écrit. Le dîner était la veille. Le SAV découvre le dossier.</p></li>
    </ol>
  </div>
</section>

<section class="section" style="background:var(--cream)" id="trop-tard">
  <div class="wrap">
    <h2 class="reveal" style="max-width:18ch">Les outils traditionnels interviennent <em>trop tard.</em></h2>
    <div class="compare">
      <div class="compare-col reveal">
        <h3>Un logiciel de ticketing</h3>
        <p class="when">Commence à la réclamation</p>
        <ul>
          <li><i class="ph ph-hourglass"></i>Attend que le client écrive, souvent quand il est déjà trop tard.</li>
          <li><i class="ph ph-equals"></i>Traite un coffret de chocolats comme une boîte de biscuits.</li>
          <li><i class="ph ph-question"></i>Laisse le conseiller deviner le stock, les délais et le coût du geste.</li>
          <li><i class="ph ph-copy"></i>Répond avec des modèles génériques, sans contexte d'occasion.</li>
        </ul>
        <div class="axis"><b>Événement transporteur</b><span></span><b>Réclamation : intervention</b></div>
      </div>
      <div class="compare-col puls reveal" style="--d:100ms">
        <h3>PULS</h3>
        <p class="when">Commence à l'événement transporteur</p>
        <ul>
          <li><i class="ph ph-radar"></i>Détecte l'incident et prévient le client avant qu'il ne s'inquiète.</li>
          <li><i class="ph ph-thermometer-simple"></i>Pondère chaque dossier par la sensibilité du produit et l'échéance.</li>
          <li><i class="ph ph-scales"></i>Compare les solutions possibles avec leur coût, leur délai et leur faisabilité.</li>
          <li><i class="ph ph-pen-nib"></i>Prépare une réponse au ton de votre maison, relue par un conseiller.</li>
        </ul>
        <div class="axis"><b>Événement transporteur : intervention</b><span></span><b>Réclamation évitée</b></div>
      </div>
    </div>
    <div class="caps">
      <div class="cap reveal"><b>Anticiper</b><p>Détecter les incidents avant les réclamations.</p></div>
      <div class="cap reveal" style="--d:80ms"><b>Protéger</b><p>Évaluer les risques pour les produits fragiles, périssables ou thermosensibles.</p></div>
      <div class="cap reveal" style="--d:160ms"><b>Résoudre</b><p>Recommander et coordonner la meilleure solution.</p></div>
      <div class="cap reveal" style="--d:240ms"><b>Apprendre</b><p>Identifier les défaillances récurrentes et réduire les pertes.</p></div>
    </div>
  </div>
</section>

<section class="section" id="moteurs">
  <div class="wrap">
    <h2 class="reveal" style="max-width:16ch">Quatre moteurs, une seule décision à prendre.</h2>
    <p class="lede reveal" style="margin-top:20px">Chaque moteur traite une partie du problème. Le conseiller garde la décision finale.</p>
    <div class="engines">
      <a class="engine e-desk reveal" href="plateforme.html#concierge-desk">
        <div class="engine-body"><span class="name"><i class="ph ph-crown-simple"></i>Concierge Desk</span><h3>Comprendre et résoudre chaque incident.</h3><p>File d'urgence, contexte client, chronologie transporteur, gestes de résolution et réponse préparée.</p></div>
        <div class="engine-shot"><img src="assets/app-desk.jpg" alt="Concierge Desk" loading="lazy" width="1440" height="1000"></div>
      </a>
      <a class="engine e-thermal reveal" style="--d:80ms" href="plateforme.html#thermal-guard">
        <div class="engine-body"><span class="name"><i class="ph ph-thermometer-simple"></i>Thermal Guard</span><h3>Estimer le risque avant la réclamation.</h3><p>Sensibilité du produit, durée de transit, météo des hubs et événements transporteur, réunis dans un indice estimé.</p></div>
        <div class="engine-shot"><img src="assets/app-thermal.jpg" alt="Thermal Guard" loading="lazy" width="1192" height="760"></div>
      </a>
      <a class="engine e-proof reveal" href="plateforme.html#proof-studio">
        <div class="engine-body"><span class="name"><i class="ph ph-camera"></i>Proof Studio</span><h3>Des preuves sans friction.</h3><p>Un lien sécurisé, trois photos guidées depuis le smartphone du client, aucune application à installer.</p></div>
        <div class="engine-shot flat"><img src="assets/app-proof.jpg" alt="Proof Studio" loading="lazy" width="1192" height="700"></div>
      </a>
      <a class="engine e-carrier reveal" style="--d:80ms" href="plateforme.html#carrier-autopsy">
        <div class="engine-body"><span class="name"><i class="ph ph-truck"></i>Carrier Autopsy</span><h3>Des transporteurs jugés sur des faits.</h3><p>Incidents vérifiés, intervalles de confiance, aucune conclusion sans échantillon suffisant.</p></div>
        <div class="engine-shot flat"><img src="assets/app-carrier.jpg" alt="Carrier Autopsy" loading="lazy" width="1192" height="640"></div>
      </a>
      <a class="engine e-arbitrage reveal" style="--d:160ms" href="plateforme.html#arbitrage">
        <div class="engine-body"><span class="name"><i class="ph ph-scales"></i>Arbitrage économique</span><h3>La bonne solution, au juste coût.</h3><p>Chaque option est comparée sur le coût, le délai, le stock et l'autorisation requise.</p></div>
        <div class="mini-table" aria-label="Exemple fictif d'arbitrage">
          <div><span>Réexpédition express</span><em>demain</em><b>24 €</b></div>
          <div class="best"><span>Coursier depuis boutique</span><em>avant 16 h 30</em><b>45 €</b></div>
          <div><span>Remboursement total</span><em>validation</em><b>89 €</b></div>
        </div>
      </a>
    </div>
  </div>
</section>

<section class="section" style="background:var(--paper);border-top:1px solid var(--line);border-bottom:1px solid var(--line)" id="secteurs">
  <div class="wrap">
    <h2 class="reveal" style="max-width:18ch">Un même produit, configuré pour votre métier.</h2>
    <p class="lede reveal" style="margin-top:20px">Catalogue, seuils, gestes, ton éditorial et règles de priorité se paramètrent par entreprise. Aucune application distincte par secteur.</p>
    <div class="sectors">{sector_rows("")}</div>
  </div>
</section>

<section class="section" id="demonstration">
  <div class="wrap">
    <h2 class="reveal" style="max-width:18ch">Ce que voit un conseiller, dossier ouvert.</h2>
    <p class="lede reveal" style="margin-top:20px">Écran réel de PULS, avec des données fictives. Parcourez les quatre repères.</p>
    <div class="demo-tour">
      <ul class="tour-steps reveal" role="tablist" aria-label="Repères de l'écran">{steps}</ul>
      <div class="tour-stage reveal" style="--d:120ms">
        <div class="frame"><img src="assets/app-desk-tour.jpg" width="1440" height="1300" alt="Dossier ouvert dans le Concierge Desk" loading="lazy"></div>
        {spots}
      </div>
    </div>
  </div>
</section>

<section class="section" style="background:var(--cream)" id="integrations">
  <div class="wrap cols-2">
    <div>
      <h2 class="reveal">Branché sur vos outils, <em>sans les remplacer.</em></h2>
      <p class="lede reveal" style="margin-top:20px">PULS se connecte par adaptateurs : messagerie, e-commerce, ERP et OMS, CRM, transporteurs, stocks. Chaque connecteur affiche son véritable état d'avancement.</p>
      <div class="status-legend reveal">
        <span class="badge badge-ok">Disponible</span><span class="badge badge-dev">En cours de développement</span><span class="badge badge-ask">Sur demande</span>
      </div>
      <p class="reveal" style="margin-top:28px"><a class="link" href="integrations.html">Voir l'état de chaque intégration <i class="ph ph-arrow-right"></i></a></p>
    </div>
    <div>
      <h2 class="reveal">Vos données restent <em>les vôtres.</em></h2>
      <p class="lede reveal" style="margin-top:20px">Un espace isolé par entreprise, des autorisations par rôle, un journal des actions et des preuves en accès privé. L'IA prépare, un humain décide.</p>
      <p class="reveal" style="margin-top:28px"><a class="link" href="securite.html">Lire nos principes de sécurité <i class="ph ph-arrow-right"></i></a></p>
    </div>
  </div>
</section>
{final_cta("")}"""
    page("index.html", "PULS : sauver chaque expérience de livraison",
         "PULS anticipe les incidents de livraison, protège les produits sensibles et aide les équipes SAV à résoudre chaque dossier.", body, "accueil")

# ================================================================== PLATEFORME
def platform():
    body = f"""
<section class="page-head"><div class="wrap">
  <h1 class="reveal">Détecter, comprendre, <em>arbitrer</em>, résoudre.</h1>
  <p class="lede reveal" style="--d:100ms">PULS réunit quatre moteurs et un moteur d'arbitrage économique. Chacun s'appuie sur une règle commune : distinguer ce qui est vérifié, ce qui est estimé et ce qui est recommandé.</p>
  <div class="status-legend reveal" style="--d:180ms"><span class="lvl lvl-fait">Fait vérifié : remonté par une source</span><span class="lvl lvl-risque">Risque estimé : calculé, jamais mesuré</span><span class="lvl lvl-action">Action recommandée : le conseiller décide</span></div>
</div></section>

<div class="wrap">
  <article class="feature" id="concierge-desk">
    <div class="f-text">
      <span class="name reveal">Concierge Desk</span>
      <h2 class="reveal">Le poste de commandement du SAV.</h2>
      <p class="lede reveal">Un dossier ouvert réunit tout ce qu'il faut pour décider en une minute, sans changer d'outil.</p>
      <ul class="f-list reveal">
        <li><i class="ph ph-check"></i>File d'urgence triée par une criticité explicable en cinq facteurs.</li>
        <li><i class="ph ph-check"></i>Dossiers détectés avant réclamation, signalés comme tels.</li>
        <li><i class="ph ph-check"></i>Contexte client, historique d'achat, nature du produit et chronologie transporteur.</li>
        <li><i class="ph ph-check"></i>Gestes de résolution vérifiés contre le stock, les zones et la délégation.</li>
        <li><i class="ph ph-check"></i>Réponse préparée au ton de la maison, relecture obligatoire avant envoi.</li>
        <li><i class="ph ph-check"></i>Navigation au clavier : J, K, 1, 2, 3, R.</li>
      </ul>
      <div class="scenario reveal"><span class="label">Situation</span><p>Un coffret pour vingt ans de mariage arrive le lendemain. Score 91 : produit très sensible, occasion passée, cliente fidèle depuis 2017. PULS recommande un coursier avec un coffret neuf avant 16 h 30, car le stock parisien le permet et l'heure limite n'est pas dépassée.</p></div>
    </div>
    <div class="f-visual reveal"><div class="frame"><img src="assets/app-desk.jpg" alt="Concierge Desk" loading="lazy" width="1440" height="1000"></div></div>
  </article>

  <article class="feature flip" id="thermal-guard">
    <div class="f-text">
      <span class="name reveal">Thermal Guard</span>
      <h2 class="reveal">Voir venir la détérioration.</h2>
      <p class="lede reveal">Une surveillance des expéditions en cours, pondérée par ce que vous expédiez.</p>
      <ul class="f-list reveal">
        <li><i class="ph ph-check"></i>Catalogue qualifié : fragile, périssable, thermosensible, durée de conservation.</li>
        <li><i class="ph ph-check"></i>Durée de transit comparée au délai prévu, détection des retards.</li>
        <li><i class="ph ph-check"></i>Météo des hubs utilisée comme facteur de risque, jamais comme mesure du colis.</li>
        <li><i class="ph ph-check"></i>Seuils définis et validés par vos équipes qualité.</li>
        <li><i class="ph ph-check"></i>Pré-alertes et ouverture d'un dossier préventif en un clic.</li>
      </ul>
      <div class="scenario reveal"><span class="label">Situation</span><p>Deux bûches glacées sont immobilisées à Lyon après un incident de groupe froid déclaré par le transporteur. Indice estimé 82. La réception a lieu samedi : le conseiller prévient le client et réexpédie en express depuis l'entrepôt lyonnais.</p></div>
    </div>
    <div class="f-visual reveal"><div class="frame"><img src="assets/app-thermal.jpg" alt="Thermal Guard" loading="lazy" width="1192" height="760"></div></div>
  </article>

  <article class="feature" id="proof-studio">
    <div class="f-text">
      <span class="name reveal">Proof Studio</span>
      <h2 class="reveal">La preuve, depuis le téléphone du client.</h2>
      <p class="lede reveal">Le conseiller génère un lien, le client photographie, le dossier se complète.</p>
      <ul class="f-list reveal">
        <li><i class="ph ph-check"></i>Lien unique, à durée limitée, ouvert sans application ni compte.</li>
        <li><i class="ph ph-check"></i>Trois prises guidées : emballage, produit, étiquette transporteur.</li>
        <li><i class="ph ph-check"></i>Consentement recueilli, durée de conservation fixée par l'entreprise.</li>
        <li><i class="ph ph-check"></i>Observations assistées par l'IA, qualifiées de non certifiantes.</li>
        <li><i class="ph ph-check"></i>Conclusion toujours rendue par un conseiller.</li>
      </ul>
      <div class="scenario reveal"><span class="label">Situation</span><p>Des tablettes collées entre elles. L'IA décrit un aspect compatible avec une fonte partielle, sans conclure sur la consommation. Le conseiller juge les preuves suffisantes et rembourse.</p></div>
    </div>
    <div class="f-visual reveal"><div class="frame"><img src="assets/app-proof.jpg" alt="Proof Studio" loading="lazy" width="1192" height="700"></div></div>
  </article>

  <article class="feature flip" id="carrier-autopsy">
    <div class="f-text">
      <span class="name reveal">Carrier Autopsy</span>
      <h2 class="reveal">Comprendre où la chaîne casse.</h2>
      <p class="lede reveal">Une lecture des incidents transporteurs utile aux équipes logistiques et financières.</p>
      <ul class="f-list reveal">
        <li><i class="ph ph-check"></i>Taux d'incidents vérifiés par transporteur, hub, période et type de produit.</li>
        <li><i class="ph ph-check"></i>Intervalle de confiance et seuil minimum d'échantillons avant toute conclusion.</li>
        <li><i class="ph ph-check"></i>Montants indemnisables distingués des montants seulement estimés.</li>
        <li><i class="ph ph-check"></i>Dossiers à réclamer et export de dossiers de litige.</li>
      </ul>
      <div class="scenario reveal"><span class="label">Situation</span><p>Un transporteur affiche 3,3 % d'incidents vérifiés contre 1,8 % pour le réseau, écart confirmé par l'intervalle. Un autre n'a que 11 incidents : PULS refuse de conclure.</p></div>
    </div>
    <div class="f-visual reveal"><div class="frame"><img src="assets/app-carrier.jpg" alt="Carrier Autopsy" loading="lazy" width="1192" height="640"></div></div>
  </article>

  <article class="feature" id="arbitrage">
    <div class="f-text">
      <span class="name reveal">Moteur d'arbitrage économique</span>
      <h2 class="reveal">Comparer avant de promettre.</h2>
      <p class="lede reveal">Pour chaque dossier, PULS met côte à côte les solutions possibles et ce qu'elles engagent.</p>
      <ul class="f-list reveal">
        <li><i class="ph ph-check"></i>Coût du produit, coût logistique, coût du geste.</li>
        <li><i class="ph ph-check"></i>Stock disponible, délai estimé, faisabilité.</li>
        <li><i class="ph ph-check"></i>Délégation financière configurable par entreprise et par rôle.</li>
        <li><i class="ph ph-check"></i>Chiffre d'affaires, coût réel, marge connue et économie potentielle distingués.</li>
        <li><i class="ph ph-check"></i>Aucune marge affichée sans coût de revient renseigné.</li>
      </ul>
      <div class="scenario reveal"><span class="label">Essayez</span><p>Changez de dossier ou de rôle : les options deviennent indisponibles ou soumises à validation selon les règles de l'entreprise. Exemple fictif.</p></div>
    </div>
    <div class="f-visual reveal">
      <div class="arb" id="arb">
        <div class="arb-head">
          <b>Arbitrage du dossier</b>
          <label>Dossier <select id="arb-case"></select></label>
          <label>Rôle <select id="arb-role"></select></label>
        </div>
        <div class="arb-wrap"><table class="arb-table"><thead><tr><th>Solution</th><th class="num">Logistique</th><th class="num">Geste</th><th class="num">Engagé</th><th>Délai</th><th>Autorisation</th></tr></thead><tbody id="arb-body"></tbody></table></div>
        <div class="arb-foot" id="arb-foot"></div>
      </div>
    </div>
  </article>
</div>

<section class="section" style="background:var(--charcoal);color:var(--ivory)" id="ia">
  <div class="wrap cols-2">
    <div>
      <h2 class="reveal">L'IA prépare. <em style="color:color-mix(in srgb,var(--bordeaux) 45%,var(--ivory))">Un humain décide.</em></h2>
      <p class="lede reveal" style="color:var(--on-dark);margin-top:20px">Les sorties de l'IA sont structurées, sourcées et modifiables. Elles ne déclenchent jamais seules une action qui engage l'entreprise.</p>
    </div>
    <div class="cols-2" style="gap:32px">
      <div class="reveal"><h3 style="font-size:20px">Ce que l'IA fait</h3><ul class="f-list" style="color:var(--on-dark)">
        <li><i class="ph ph-check"></i>Qualifier la réclamation et son motif</li>
        <li><i class="ph ph-check"></i>Extraire les numéros de commande</li>
        <li><i class="ph ph-check"></i>Résumer le dossier</li>
        <li><i class="ph ph-check"></i>Détecter l'occasion et l'urgence</li>
        <li><i class="ph ph-check"></i>Décrire les justificatifs</li>
        <li><i class="ph ph-check"></i>Préparer la réponse au ton de la maison</li>
        <li><i class="ph ph-check"></i>Signaler les informations manquantes</li></ul></div>
      <div class="reveal" style="--d:100ms"><h3 style="font-size:20px">Ce qu'elle ne fait jamais seule</h3><ul class="f-list" style="color:var(--on-dark)">
        <li><i class="ph ph-x"></i>Rembourser</li>
        <li><i class="ph ph-x"></i>Réexpédier</li>
        <li><i class="ph ph-x"></i>Commander un coursier</li>
        <li><i class="ph ph-x"></i>Promettre un montant au client</li>
        <li><i class="ph ph-x"></i>Certifier la qualité sanitaire d'un produit</li>
        <li><i class="ph ph-x"></i>Affirmer la température réelle d'un colis</li></ul></div>
    </div>
  </div>
</section>
{final_cta("")}"""
    page("plateforme.html", "La plateforme PULS : quatre moteurs et l'arbitrage économique",
         "Concierge Desk, Thermal Guard, Proof Studio, Carrier Autopsy et moteur d'arbitrage économique : comment PULS aide à résoudre les incidents de livraison.", body, "plateforme")

# ================================================================== SECTEURS
SECTOR_PAGES = {
    "gastronomie": dict(
        h1="Le chocolat ne pardonne ni la chaleur ni <em>l'attente.</em>",
        lede="Chocolatiers, pâtissiers, glaciers : vos produits sont faits main, offerts à date fixe, et sensibles à quelques degrés près.",
        risks=[("Sensibilité thermique", "Élevée à critique"), ("Pics d'activité", "Fêtes de fin d'année, Pâques, Saint-Valentin"), ("Remplacement", "Dépend de la production"), ("Part de cadeaux", "Majoritaire en saison")],
        problems=[("Blanchiment et fonte", "Un dépôt en loge chauffée ou un camion au soleil suffit. Le client le découvre à l'ouverture du coffret."),
                  ("L'occasion est passée", "Un réveillon, un anniversaire, une réception : une réexpédition le lendemain ne répare rien."),
                  ("Un produit pas toujours disponible", "Les pièces de saison et les créations limitées ne se remplacent pas toujours à l'identique."),
                  ("La saison concentre tout", "En décembre, le volume de réclamations peut changer d'échelle en quelques jours.")],
        flow=[("Thermal Guard surveille les colis chocolat", "Seuils et durées définis par votre équipe qualité, par famille de produits.", "risque"),
              ("Concierge Desk remonte les occasions imminentes", "Une échéance à 24 h passe devant un retard sans date.", "action"),
              ("L'arbitrage compare coursier depuis boutique et réexpédition", "Stock par boutique, zones et heures limites de vos coursiers.", "action"),
              ("Proof Studio décrit l'aspect, sans juger la consommation", "Le conseiller conclut, l'IA ne certifie rien.", "fait")],
        feats=["Thermal Guard", "Concierge Desk", "Arbitrage économique", "Proof Studio"]),
    "frais": dict(
        h1="Quand la durée de conservation <em>se compte en heures.</em>",
        lede="Produits de la mer, fromages, traiteur, viandes : chaque retard rapproche le produit de sa date limite, et un week-end au hub peut tout perdre.",
        risks=[("Chaîne du froid", "Dépend du transporteur"), ("Durée de conservation", "Courte, paramétrable par produit"), ("Point critique", "Immobilisation et absence du destinataire"), ("Règle sanitaire", "Ne jamais recommander la consommation")],
        problems=[("Un colis immobilisé un vendredi soir", "Sans action avant le samedi matin, le produit dépasse sa durée de transport admissible."),
                  ("L'incident froid n'est connu que du transporteur", "Il figure dans ses événements, rarement dans votre SAV."),
                  ("Le destinataire absent", "Un second passage le lendemain n'a pas de sens pour un produit frais."),
                  ("La tentation de rassurer", "Dire au client qu'il peut consommer un produit est une responsabilité que l'outil ne doit jamais prendre.")],
        flow=[("La durée de conservation est confrontée au transit cumulé", "Paramétrée produit par produit, validée par l'entreprise.", "risque"),
              ("Une pré-alerte part dès l'immobilisation déclarée", "L'événement du transporteur est affiché comme un fait vérifié.", "fait"),
              ("Le client est prévenu, la réexpédition est préparée", "Depuis l'entrepôt disposant du stock le plus proche.", "action"),
              ("Les réponses ne promettent jamais la consommabilité", "Le brouillon applique la règle de prudence de l'entreprise.", "action")],
        feats=["Thermal Guard", "Concierge Desk", "Proof Studio", "Carrier Autopsy"]),
    "luxe": dict(
        h1="Une boîte abîmée peut coûter <em>une relation.</em>",
        lede="Maroquinerie, horlogerie, prêt-à-porter, art de la table : le colis fait partie de l'expérience, et chaque geste commercial engage la marque.",
        risks=[("Valeur unitaire", "Élevée"), ("Risque principal", "Perte, vol, emballage endommagé"), ("Attente client", "Réponse personnelle et rapide"), ("Gestes", "Encadrés par la délégation")],
        problems=[("L'emballage est le premier contact", "Un coffret écrasé abîme l'expérience même si le produit est intact."),
                  ("Les non-réceptions contestées", "Signature, dépôt, point relais : il faut séparer ce que le transporteur prouve de ce qui est déclaré."),
                  ("Des gestes coûteux et visibles", "Un geste trop généreux crée un précédent, un geste trop faible abîme la relation."),
                  ("Un ton qui ne se délègue pas", "Une réponse générique sonne faux pour une clientèle habituée au service en boutique.")],
        flow=[("Carrier Autopsy sépare preuve de livraison et déclaration", "Les montants indemnisables sont isolés des estimations.", "fait"),
              ("La délégation financière s'applique par rôle", "Au-delà du plafond, le geste part en validation.", "action"),
              ("La réponse suit la charte éditoriale de la maison", "Vocabulaire, formules et signatures configurés par workspace.", "action"),
              ("Proof Studio documente l'emballage", "Photos horodatées jointes au dossier, accès privé.", "fait")],
        feats=["Arbitrage économique", "Carrier Autopsy", "Concierge Desk", "Proof Studio"]),
    "mobilier": dict(
        h1="Pour un objet fragile, la preuve vaut <em>autant que le geste.</em>",
        lede="Mobilier, luminaires, verrerie, céramique : la casse est coûteuse à réparer, plus encore à retourner, et l'indemnisation dépend de délais précis.",
        risks=[("Risque principal", "Casse et dommages cachés"), ("Coût logistique", "Élevé, retour souvent impossible"), ("Délais", "Réserves et réclamations encadrés"), ("Solutions", "Pièce, réparation, remise, remplacement")],
        problems=[("Le dommage découvert après le départ du livreur", "Sans réserve ni photo, l'indemnisation devient difficile."),
                  ("Un retour qui coûte plus que l'objet", "Renvoyer une table cassée n'a souvent aucun sens économique."),
                  ("Des solutions intermédiaires ignorées", "Une pièce de remplacement ou une remise peut satisfaire le client à moindre coût."),
                  ("Des délais de réclamation dépassés", "Chaque transporteur a ses règles, et un dossier oublié est perdu.")],
        flow=[("Proof Studio guide photo et vidéo", "Emballage, réserve sur le bordereau, dommage, étiquette.", "fait"),
              ("L'arbitrage compare pièce, réparation, remise et remplacement", "Avec le coût logistique réel de chaque option.", "action"),
              ("Carrier Autopsy liste les dossiers à réclamer", "Avant l'échéance, avec un export de litige prêt à transmettre.", "action"),
              ("Les dommages se lisent par hub et par transporteur", "Pour corriger l'emballage ou le choix du prestataire.", "risque")],
        feats=["Proof Studio", "Arbitrage économique", "Carrier Autopsy", "Concierge Desk"]),
    "cadeaux": dict(
        h1="Un bouquet livré le lendemain <em>n'est plus un cadeau.</em>",
        lede="Fleuristes, coffrets, box cadeaux : la date est fixée par la vie du client, et la personne qui reçoit n'est pas celle qui a commandé.",
        risks=[("Échéance", "Non négociable"), ("Produit", "Vivant ou périssable"), ("Interlocuteurs", "Acheteur et destinataire distincts"), ("Ton", "Variable selon l'occasion")],
        problems=[("Une date qui ne se déplace pas", "Anniversaire, naissance, deuil : un retard rend la commande inutile."),
                  ("Qui prévenir ?", "Contacter le destinataire peut gâcher une surprise ; l'acheteur doit être informé en premier."),
                  ("Un produit qui se fane", "Une composition florale supporte mal un jour de transit en plus."),
                  ("Des occasions qui demandent de la retenue", "Un message joyeux après un retard pour un deuil serait une faute.")],
        flow=[("L'occasion et l'échéance pèsent dans la criticité", "Un deuil demain passe devant un retard sans date.", "risque"),
              ("Le contact cible l'acheteur, selon vos règles", "Configurable par workspace et par type de commande.", "action"),
              ("Le remplacement local est proposé quand il existe", "Atelier ou boutique partenaire, avec son stock et ses horaires.", "action"),
              ("Le ton s'adapte à l'occasion", "Sobriété pour un deuil, chaleur pour une naissance, toujours relu.", "action")],
        feats=["Concierge Desk", "Arbitrage économique", "Thermal Guard", "Proof Studio"]),
}
FEAT_ANCHOR = {"Concierge Desk": "concierge-desk", "Thermal Guard": "thermal-guard", "Proof Studio": "proof-studio", "Carrier Autopsy": "carrier-autopsy", "Arbitrage économique": "arbitrage"}
LVL = {"fait": ("lvl-fait", "Fait vérifié"), "risque": ("lvl-risque", "Risque estimé"), "action": ("lvl-action", "Action recommandée")}

def sectors():
    for slug, name, ico, tag in SECTORS:
        s = SECTOR_PAGES[slug]
        risks = "".join(f"<div><b>{a}</b><span>{b}</span></div>" for a, b in s["risks"])
        probs = "".join(f'<li class="reveal" style="--d:{i * 60}ms"><h3>{a}</h3><p>{b}</p></li>' for i, (a, b) in enumerate(s["problems"]))
        flow = "".join(f'<li class="reveal" style="--d:{i * 60}ms"><b>{a}</b><p>{b}</p><span class="lvl {LVL[k][0]}">{LVL[k][1]}</span></li>' for i, (a, b, k) in enumerate(s["flow"]))
        feats = "".join(f'<a href="../plateforme.html#{FEAT_ANCHOR[f]}">{f}</a>' for f in s["feats"])
        others = "".join(f'<a class="btn btn-line btn-sm" href="{o}.html">{n}</a>' for o, n, _, _ in SECTORS if o != slug)
        body = f"""
<section class="page-head"><div class="wrap">
  <p class="crumbs"><a href="index.html">Secteurs</a> / {name}</p>
  <div class="sector-hero">
    <div><h1 class="reveal">{s["h1"]}</h1><p class="lede reveal" style="--d:100ms">{s["lede"]}</p></div>
    <div class="risk-list reveal" style="--d:160ms" aria-label="Profil de risque">{risks}</div>
  </div>
</div></section>

<section class="section tight" style="padding-top:0"><div class="wrap cols-2">
  <div><h2 class="reveal" style="font-size:clamp(28px,2.8vw,40px)">Ce qui se passe aujourd'hui</h2><ul class="problems">{probs}</ul></div>
  <div><h2 class="reveal" style="font-size:clamp(28px,2.8vw,40px)">Comment PULS intervient</h2><ol class="flow">{flow}</ol></div>
</div></section>

<section class="section tight" style="background:var(--cream)"><div class="wrap">
  <h2 class="reveal" style="font-size:clamp(28px,2.8vw,40px)">Les moteurs les plus utiles ici</h2>
  <div class="chips reveal">{feats}</div>
  <h3 class="reveal" style="margin-top:56px;font-size:20px">Autres secteurs</h3>
  <div class="other-sectors reveal">{others}</div>
</div></section>
{final_cta("../", "Parlons de vos produits et de vos transporteurs.", "Nous configurons la démonstration avec vos familles de produits, vos seuils et vos gestes habituels.")}"""
        page(f"secteurs/{slug}.html", f"PULS pour {name.lower()}", f"{name} : les risques de livraison propres au secteur et la façon dont PULS les traite.", body, "secteurs", "../")

    body = f"""
<section class="page-head"><div class="wrap">
  <h1 class="reveal">Un produit, <em>configuré</em> pour chaque métier.</h1>
  <p class="lede reveal" style="--d:100ms">Chaque entreprise paramètre son catalogue, ses seuils, ses gestes, son ton et ses règles de priorité. Voici comment PULS aborde cinq marchés.</p>
</div></section>
<section class="section tight" style="padding-top:0"><div class="wrap"><div class="sectors">{sector_rows("../")}</div></div></section>
{final_cta("../")}"""
    page("secteurs/index.html", "Secteurs : PULS selon votre métier", "Gastronomie, produits frais, retail premium, mobilier, cadeaux : PULS s'adapte à chaque métier par configuration.", body, "secteurs", "../")

# ================================================================== INTÉGRATIONS
INTEGRATIONS = [
    ("ph-database", "Données de démonstration", "Un espace complet avec des dossiers, expéditions et transporteurs fictifs, pour évaluer PULS sans connecter vos systèmes.", "ok", []),
    ("ph-pencil-simple-line", "Création manuelle", "Ouvrir un dossier à la main depuis un appel ou un message, avec les mêmes contrôles qu'un dossier importé.", "dev", []),
    ("ph-file-csv", "Import CSV contrôlé", "Commandes, expéditions et catalogue importés avec aperçu, validation des colonnes et rapport d'erreurs avant écriture.", "dev", []),
    ("ph-plugs-connected", "API et webhooks", "Une API pour pousser des événements vers PULS et des webhooks pour notifier vos outils. Clés conservées côté serveur.", "dev", []),
    ("ph-envelope-simple", "Messagerie", "Lecture des boîtes SAV, extraction du numéro de commande et rattachement automatique au dossier.", "ask", ["Boîtes partagées", "Formulaires web"]),
    ("ph-shopping-bag", "E-commerce", "Commandes, clients et historique d'achat depuis votre plateforme de vente.", "ask", ["Plateformes du marché", "Sites sur mesure"]),
    ("ph-stack", "ERP et OMS", "Statuts de commande, coûts de revient et préparation des réexpéditions.", "ask", ["Selon votre système"]),
    ("ph-address-book", "CRM", "Statut du client, historique de relation et consignes particulières.", "ask", ["Selon votre système"]),
    ("ph-truck", "Transporteurs", "Événements de suivi, incidents déclarés et dossiers de réclamation.", "ask", ["Messagerie", "Froid", "Coursiers"]),
    ("ph-warehouse", "Stocks et boutiques", "Disponibilités par entrepôt et par boutique, pour des gestes réellement faisables.", "ask", ["Entrepôts", "Boutiques"]),
]
BADGE = {"ok": ("badge-ok", "Disponible"), "dev": ("badge-dev", "En cours de développement"), "ask": ("badge-ask", "Sur demande")}

def integrations():
    cards = ""
    for i, (ico, t, d, st, subs) in enumerate(INTEGRATIONS):
        b = BADGE[st]
        sub = "".join(f"<li><span>{x}</span></li>" for x in subs)
        cards += f"""<article class="int reveal{' lead' if st == 'ok' else ''}" style="--d:{(i % 3) * 60}ms">
      <div class="top"><i class="ph {ico} ico"></i><span class="badge {b[0]}">{b[1]}</span></div>
      <h3>{t}</h3><p>{d}</p>{f'<ul>{sub}</ul>' if sub else ''}</article>"""
    body = f"""
<section class="page-head"><div class="wrap">
  <h1 class="reveal">Des connexions annoncées <em>telles qu'elles sont.</em></h1>
  <p class="lede reveal" style="--d:100ms">PULS s'appuie sur des adaptateurs : ajouter un fournisseur ne demande pas de réécrire le cœur du produit. Chaque intégration indique son état réel.</p>
  <div class="status-legend reveal" style="--d:160ms">
    <span><span class="badge badge-ok">Disponible</span> développée et testée</span>
    <span><span class="badge badge-dev">En cours de développement</span> en construction</span>
    <span><span class="badge badge-ask">Sur demande</span> à réaliser avec vous</span>
  </div>
</div></section>
<section class="section tight" style="padding-top:0"><div class="wrap"><div class="int-grid">{cards}</div></div></section>

<section class="section" style="background:var(--cream)"><div class="wrap cols-2">
  <div>
    <h2 class="reveal">Un déploiement par étapes.</h2>
    <p class="lede reveal" style="margin-top:20px">Commencer simple, mesurer, puis connecter. La durée de chaque étape dépend de vos systèmes : nous l'établissons ensemble.</p>
  </div>
  <ol class="flow">
    <li class="reveal"><b>Phase initiale</b><p>Données de démonstration, création manuelle des dossiers, import CSV contrôlé.</p></li>
    <li class="reveal" style="--d:60ms"><b>Phase suivante</b><p>Connexion de la messagerie, identification des commandes, connexions transporteurs.</p></li>
    <li class="reveal" style="--d:120ms"><b>Phase avancée</b><p>Synchronisation des stocks, CRM et ERP, automatisations métier validées par vos équipes.</p></li>
  </ol>
</div></section>

<section class="section tight"><div class="wrap cols-2">
  <div><h2 class="reveal" style="font-size:clamp(28px,2.8vw,40px)">Principes techniques</h2></div>
  <ul class="f-list reveal" style="margin-top:0">
    <li><i class="ph ph-check"></i>Toutes les clés d'API restent côté serveur, jamais dans le navigateur.</li>
    <li><i class="ph ph-check"></i>Chaque adaptateur écrit dans le workspace de l'entreprise concernée, et nulle part ailleurs.</li>
    <li><i class="ph ph-check"></i>Les traitements longs passent par des tâches asynchrones, sans bloquer les conseillers.</li>
    <li><i class="ph ph-check"></i>Aucune intégration n'est simulée : une source non connectée est affichée comme telle.</li>
  </ul>
</div></section>
{final_cta("", "Votre outil n'apparaît pas ?", "Décrivez votre système dans la demande de démonstration : nous évaluons l'adaptateur nécessaire et son délai réaliste.")}"""
    page("integrations.html", "Intégrations PULS : état réel de chaque connexion",
         "Messagerie, e-commerce, ERP, OMS, CRM, transporteurs, stocks, API : l'état d'avancement de chaque intégration PULS.", body, "integrations")

# ================================================================== SÉCURITÉ
SECURITY = [
    ("ph-buildings", "Isolation des entreprises", "Chaque entreprise dispose de son propre workspace. Le cloisonnement est appliqué par la base de données elle-même, à chaque requête, et non par l'interface.", "dev"),
    ("ph-user-gear", "Gestion des autorisations", "Cinq rôles : administrateur, responsable SAV, collaborateur, responsable logistique, observateur. Les plafonds financiers dépendent du rôle.", "dev"),
    ("ph-lock-key", "Authentification sécurisée", "Comptes nominatifs, sessions limitées dans le temps, aucun mot de passe stocké en clair. L'espace de démonstration actuel n'utilise pas de compte.", "dev"),
    ("ph-list-checks", "Journal des actions", "Chaque geste, validation, envoi et modification de règle est journalisé avec son auteur et son horodatage, sans possibilité de réécriture.", "dev"),
    ("ph-paperclip", "Protection des pièces jointes", "Preuves stockées en accès privé, consultées par liens signés à durée limitée, jamais indexées ni publiques.", "dev"),
    ("ph-hard-drives", "Hébergement et traitement", "Hébergement dans l'Union européenne visé. Le prestataire et la localisation définitive seront précisés contractuellement avant tout déploiement.", "ask"),
    ("ph-scales", "RGPD", "Minimisation des données, finalités documentées, droits des personnes, contrat de sous-traitance avec chaque client.", "ask"),
    ("ph-clock-counter-clockwise", "Durées de conservation", "Durées configurables par workspace pour les dossiers, les preuves et les journaux, avec suppression automatique à échéance.", "dev"),
]

def security():
    items = "".join(f"""<div class="sec reveal"><i class="ph {ico}"></i><div><h3>{t}</h3><p>{d}</p><span class="badge {BADGE[st][0]}">{'En cours de développement' if st == 'dev' else 'À formaliser avec chaque client'}</span></div></div>"""
                    for ico, t, d, st in SECURITY)
    body = f"""
<section class="page-head"><div class="wrap">
  <h1 class="reveal">La confiance se construit <em>dans l'architecture.</em></h1>
  <p class="lede reveal" style="--d:100ms">PULS traite des données clients, des commandes et des photographies. Voici les principes qui guident sa conception, et l'état réel de chacun.</p>
</div></section>
<section class="section tight" style="padding-top:0"><div class="wrap">
  <div class="sec-grid">{items}</div>
  <div class="honest reveal"><i class="ph ph-seal-warning"></i><div>
    <h3 style="font-size:22px">Ce que nous ne revendiquons pas</h3>
    <p class="muted" style="margin-top:8px">PULS est en phase pilote. Aucune certification ni conformité auditée (ISO 27001, SOC 2, HDS ou autre) n'est revendiquée à ce jour. Les principes ci-dessus décrivent des engagements de conception ; leur mise en œuvre est indiquée pour chacun. Nous répondons à vos questionnaires de sécurité sur demande.</p>
  </div></div>
</div></section>

<section class="section" style="background:var(--cream)"><div class="wrap cols-2">
  <div><h2 class="reveal">L'IA, sous contrôle.</h2><p class="lede reveal" style="margin-top:20px">Les traitements d'IA s'exécutent côté serveur, sur les seules données nécessaires au dossier.</p></div>
  <ul class="f-list reveal" style="margin-top:0">
    <li><i class="ph ph-check"></i>Aucune action financière ou logistique sans validation humaine.</li>
    <li><i class="ph ph-check"></i>Les sorties de l'IA sont marquées comme suggestions, jamais comme faits.</li>
    <li><i class="ph ph-check"></i>Pas d'avis sanitaire ni de température réelle déduits d'une photo.</li>
    <li><i class="ph ph-check"></i>Les données d'un workspace ne servent pas à entraîner de modèle pour un autre.</li>
  </ul>
</div></section>
{final_cta("", "Une question de sécurité précise ?", "Indiquez-la dans votre demande : nous y répondons par écrit, sans approximation.")}"""
    page("securite.html", "Sécurité et confidentialité de PULS", "Isolation des entreprises, autorisations, authentification, journal des actions, pièces jointes, hébergement, RGPD et conservation : les principes de PULS.", body, "securite")

# ================================================================== DÉMO
def demo():
    opts = "".join(f'<option value="{s}">{n}</option>' for s, n, _, _ in SECTORS)
    body = f"""
<section class="page-head" style="padding-bottom:48px"><div class="wrap">
  <h1 class="reveal">Demander une <em>démonstration.</em></h1>
  <p class="lede reveal" style="--d:100ms">45 minutes avec votre cas d'usage : vos produits, vos transporteurs, vos règles de geste. Nous revenons vers vous sous deux jours ouvrés.</p>
</div></section>
<section class="section tight" style="padding-top:0"><div class="wrap form-grid">
  <aside>
    <ul class="next-steps">
      <li class="reveal"><i class="ph ph-chat-circle-text"></i><div><b>Un premier échange</b><p>Vos produits sensibles, votre volume, ce qui coûte le plus aujourd'hui.</p></div></li>
      <li class="reveal" style="--d:60ms"><i class="ph ph-presentation-chart"></i><div><b>Une démonstration configurée</b><p>Sur un espace de démonstration paramétré avec vos familles de produits.</p></div></li>
      <li class="reveal" style="--d:120ms"><i class="ph ph-path"></i><div><b>Un plan de déploiement</b><p>Phases, intégrations nécessaires et délais réalistes, établis avec vous.</p></div></li>
    </ul>
    <div class="notice reveal" style="margin-top:40px"><i class="ph ph-shield-check"></i><span>Vos informations servent uniquement à répondre à votre demande. <a href="confidentialite.html">Politique de confidentialité</a>.</span></div>
  </aside>
  <div class="form-card reveal" id="lead-card">
    <form id="lead-form" novalidate>
      <div class="fields">
        <div class="field"><label for="f-name">Nom et prénom</label><input id="f-name" name="name" autocomplete="name" required><span class="err">Indiquez votre nom.</span></div>
        <div class="field"><label for="f-email">E-mail professionnel</label><input id="f-email" name="email" type="email" autocomplete="email" required><span class="err" data-err="email">Indiquez une adresse e-mail valide.</span></div>
        <div class="field"><label for="f-company">Entreprise</label><input id="f-company" name="company" autocomplete="organization" required><span class="err">Indiquez votre entreprise.</span></div>
        <div class="field"><label for="f-role">Fonction</label><input id="f-role" name="role" autocomplete="organization-title" required placeholder="Responsable service client"><span class="err">Indiquez votre fonction.</span></div>
        <div class="field"><label for="f-sector">Secteur</label><select id="f-sector" name="sector" required><option value="">Choisir</option>{opts}<option value="autre">Autre secteur</option></select><span class="err">Choisissez un secteur.</span></div>
        <div class="field"><label for="f-volume">Réclamations liées à la livraison, par mois</label><select id="f-volume" name="volume" required><option value="">Choisir</option><option>Moins de 50</option><option>50 à 200</option><option>200 à 1 000</option><option>Plus de 1 000</option><option>Je ne sais pas</option></select><span class="err">Choisissez une estimation.</span></div>
        <div class="field full"><label for="f-topic">Problématique principale</label><select id="f-topic" name="topic" required><option value="">Choisir</option><option value="anticipation">Détecter les incidents plus tôt</option><option value="thermique">Produits thermosensibles ou périssables</option><option value="casse">Casse et preuves</option><option value="cout">Coût des gestes commerciaux</option><option value="transporteurs">Performance des transporteurs</option><option value="integration">Intégration avec nos outils</option><option value="autre">Autre</option></select><span class="err">Choisissez une problématique.</span></div>
        <div class="field full"><label for="f-msg">Précisions</label><textarea id="f-msg" name="message" placeholder="Vos produits, vos transporteurs, vos outils actuels"></textarea><span class="help">Facultatif, mais utile pour préparer la démonstration.</span></div>
        <label class="consent"><input type="checkbox" name="consent" id="f-consent" required><span>J'accepte que PULS utilise ces informations pour me recontacter au sujet de ma demande.</span></label>
        <span class="err" id="consent-err" style="grid-column:1/-1">Votre accord est nécessaire pour que nous puissions vous répondre.</span>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" type="submit">Envoyer la demande <i class="ph ph-arrow-right"></i></button>
        <span class="muted small" id="form-status" role="status"></span>
      </div>
      <div class="notice" id="lead-mode" hidden><i class="ph ph-info"></i><span></span></div>
    </form>
  </div>
</div></section>"""
    page("demo.html", "Demander une démonstration de PULS", "Demandez une démonstration de PULS configurée avec vos produits, vos transporteurs et vos règles.", body, "contact")

# ================================================================== CONFIDENTIALITÉ
def privacy():
    body = """
<section class="page-head"><div class="wrap">
  <h1 class="reveal">Confidentialité</h1>
  <p class="lede reveal">Ce que devient l'information que vous nous confiez via ce site.</p>
</div></section>
<section class="section tight" style="padding-top:0"><div class="wrap" style="max-width:820px">
  <div class="stack">
    <h3>Données collectées</h3>
    <p class="muted">Le formulaire de démonstration recueille votre nom, votre adresse e-mail professionnelle, votre entreprise, votre fonction, votre secteur, une estimation de volume et votre problématique.</p>
    <h3>Finalité</h3>
    <p class="muted">Ces informations servent uniquement à répondre à votre demande et à préparer la démonstration. Elles ne sont ni vendues ni cédées.</p>
    <h3>Conservation</h3>
    <p class="muted">Les demandes sans suite sont supprimées au plus tard trois ans après le dernier contact.</p>
    <h3>Vos droits</h3>
    <p class="muted">Vous pouvez demander l'accès, la rectification ou la suppression de vos données, ainsi que vous opposer à leur traitement, en écrivant à l'adresse de contact indiquée ci-dessous. Vous pouvez aussi saisir la CNIL.</p>
    <h3>Mesure d'audience et cookies</h3>
    <p class="muted">Ce site ne dépose aucun cookie de mesure d'audience ni de publicité.</p>
    <div class="notice"><i class="ph ph-info"></i><span>Responsable du traitement et adresse de contact : à compléter avant la mise en ligne publique du site.</span></div>
  </div>
</div></section>"""
    page("confidentialite.html", "Confidentialité : PULS", "Politique de confidentialité du site PULS.", body, "")

# ================================================================== CONNEXION
def login():
    body = f"""
<div class="login-page">
  <aside class="login-side">
    <a class="logo" href="index.html" style="color:var(--ivory)"><span class="logo-mark">{LOGO_SVG}</span>PULS</a>
    <svg class="bg" viewBox="0 0 1600 120" aria-hidden="true"><path d="{pulse(1600, 120, (0.55,), 1.4)}"/></svg>
    <div><h2>Save the experience.</h2><p>L'espace professionnel où vos équipes détectent, comprennent, arbitrent et résolvent les incidents de livraison.</p></div>
  </aside>
  <main class="login-main" id="contenu">
    <div class="login-box">
      <p class="small" style="margin-bottom:28px"><a class="link" href="index.html"><i class="ph ph-arrow-left"></i>Retour au site</a></p>
      <h1>Connexion</h1>
      <p class="lede">Accédez à votre espace PULS.</p>
      <div class="notice" id="logout-note" hidden style="margin-top:20px"><i class="ph ph-check-circle"></i><span>Vous êtes déconnecté. La session a été effacée de cet onglet.</span></div>

      <form id="account-form" style="margin-top:28px" novalidate>
        <div class="field"><label for="l-email">E-mail professionnel</label><input id="l-email" type="email" autocomplete="username" disabled></div>
        <div class="field" style="margin-top:16px"><label for="l-pass">Mot de passe</label><input id="l-pass" type="password" autocomplete="current-password" disabled></div>
        <button class="btn btn-dark btn-block" type="submit" style="margin-top:20px" disabled>Se connecter</button>
        <p class="status-line" id="account-status"><i class="ph ph-info"></i><span>Les comptes nominatifs ne sont pas encore ouverts : l'authentification serveur est en cours de développement.</span></p>
      </form>

      <div class="divider">ou</div>

      <form id="demo-login">
        <h2 style="font-size:22px">Espace de démonstration</h2>
        <div class="ws-pick">
          <label><input type="radio" name="ws" value="valcour" checked><span class="m">MV</span><span><b>Maison Valcour</b><span>Chocolaterie fictive, données simulées</span></span><span class="badge badge-ok">Démo</span></label>
        </div>
        <button class="btn btn-primary btn-block" type="submit" style="margin-top:16px">Entrer dans l'espace de démonstration <i class="ph ph-arrow-right"></i></button>
        <p class="status-line"><i class="ph ph-flask"></i><span>Aucune commande, aucun remboursement ni aucun message réel n'est déclenché. La session s'efface à la fermeture de l'onglet.</span></p>
      </form>
    </div>
  </main>
</div>"""
    page("connexion.html", "Connexion : PULS", "Connexion à l'espace professionnel PULS.", body, bare=True)

if __name__ == "__main__":
    home(); platform(); sectors(); integrations(); security(); demo(); privacy(); login()
