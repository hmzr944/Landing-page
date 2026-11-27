# Arbor 3 : recherches et décisions

**Branche :** `arbor-3` (rien n'est fusionné ni déployé sans l'accord du propriétaire).
**Point de départ :** retours du propriétaire du 27 novembre 2026. Les problèmes relevés sont les suivants.
- Business présenté comme gratuit.
- Éléments trop imposants, grilles « bento » vides.
- Fenêtres défectueuses.
- Responsive et espacements.
- Contenu d'exemple sur les réseaux.
- Méthode qui fait « deviner ».
- Liens d'invitation.

## 1. Méthode d'apprentissage : ce que disent les études

### 1.1 Les sources retenues (publiées, vérifiables)
| Source | Ce qu'elle établit | Conséquence pour Arbor |
|---|---|---|
| Dunlosky, Rawson, Marsh, Nathan, Willingham (2013), *Psychological Science in the Public Interest* 14(1), 4–58 | Sur 10 techniques étudiées : **utilité élevée** pour la pratique de récupération (se tester) et la pratique espacée ; **modérée** pour l'interrogation élaborative, l'auto-explication et l'alternance ; **faible** pour relire, surligner, résumer | Le cœur d'Arbor est de se tester et de réviser à intervalles. Pas de « relire la fiche » comme activité principale |
| Roediger & Karpicke (2006), *Psychological Science* | À 5 minutes, relire semble meilleur ; à quelques jours, se tester l'emporte nettement (effet de test) | Chaque notion se termine par des questions de rappel, pas par un résumé |
| Cepeda, Pashler, Vul, Wixted, Rohrer (2006), *Psychological Bulletin*, méta-analyse de 317 expériences | La pratique espacée l'emporte sur la pratique massée ; l'intervalle optimal grandit avec la durée de rétention visée | Révisions programmées (FSRS), date d'examen prise en compte |
| Rohrer et al. (2014, 2019), essais en classe de mathématiques | Mélanger des types de problèmes (alternance) améliore nettement les résultats différés (d ≈ 0,8 dans l'essai de 2019) | Les révisions du jour mélangent les sujets et les types de questions |
| Sweller, Ayres, Kalyuga, Chandler (2003) ; Kalyuga (2007), *Educational Psychology Review* | Pour un **débutant**, étudier un **exemple résolu** vaut mieux que chercher seul ; l'avantage s'inverse quand on devient expert (effet d'inversion d'expertise) | Un débutant reçoit d'abord un exemple résolu ; une personne qui a déjà des bases passe plus vite à la pratique |
| Rosenshine (2012), *American Educator* 36(1) | Synthèse : petites étapes, modèle et exemples, pratique guidée, vérifier la compréhension, taux de réussite élevé, révision régulière | Structure de chaque notion |
| Hattie & Timperley (2007), *Review of Educational Research* 77(1) ; Wisniewski, Zierer & Hattie (2020) | Le retour d'information a un effet moyen (d ≈ 0,48) qui dépend fortement de sa forme : il doit dire ce qui est juste, ce qui manque et quoi faire ensuite | Correction immédiate, réponse attendue, confusion nommée, prochaine étape |
| Kornell, Hays & Bjork (2009) ; revue *Educational Psychology Review* (2023) sur les pré-questions | Deviner avant d'apprendre peut aider la mémorisation, mais l'effet varie selon la procédure | Le pré-test devient **facultatif** (« vérifier ce que je sais déjà »). Il sert à sauter ce qu'on maîtrise, jamais à faire deviner un débutant |

### 1.2 Nouvelle séquence d'une notion
L'ancienne séquence ouvrait sur une question « Pourquoi, d'après toi ? » à laquelle un débutant ne peut que deviner.

La nouvelle séquence :
1. **Où tu en es** : « Je découvre » ou « J'ai déjà des bases ». C'est une déclaration, pas une devinette. Elle règle le niveau de l'explication (inversion d'expertise).
2. **Exemple concret** : la situation est présentée comme un cas réel, déjà résolu, sans rien demander.
3. **Explication** en petites étapes, appuyée sur la source.
4. **Exemple résolu pas à pas**, si la fiche en a un (représentation « étape par étape » ou « exemple »). Il est montré avant la pratique.
5. **Pratique guidée** : compréhension, puis application, avec un retour immédiat après chaque réponse.
6. **Transfert** : la même idée dans un autre contexte.
7. **Bilan**, puis révisions espacées et mélangées.

Les règles R3 à R6 du moteur (remède ciblé, changement de méthode, réserve, pas de note sans jugement) sont conservées.

## 2. Parcours web : inspirations retenues
Sources consultées :
- les guides publics d'Appcues, Userpilot, Supademo et ProductLed sur l'accueil et les états vides ;
- les recommandations d'interface de Vercel (skill `web-design-guidelines`) ;
- les principes iOS de uizze (`ios-design`, `ui-taste`).

| Principe | Application |
|---|---|
| Un état vide explique ce qui apparaîtra, pourquoi c'est utile, et propose **une** action évidente | Plus de grilles de blocs remplies de zéros : une organisation vide affiche une liste de mise en route en 3 étapes |
| Faire faire plutôt que présenter | Le premier écran Learning demande « Que veux-tu apprendre ? » et démarre ; pas de sujet d'exemple imposé |
| Liste de mise en route persistante, cochée au fil de l'eau | Business : ajouter un document, valider les premières règles, faire entrer l'équipe |
| Densité : la hiérarchie vient de la typographie et de l'alignement avant les cadres | Listes à lignes plutôt que cartes de même poids ; une seule action principale par écran |
| Interface : listes natives stylées en sombre, `overscroll-behavior: contain` dans les fenêtres, texte d'exemple terminé par « … » | Correctifs des formulaires et des fenêtres |

## 3. Modèle économique
**Repères relevés, à vérifier sur les pages des éditeurs avant toute publication :**
- Quizlet Plus : environ 7,99 $ par mois ou 35,99 $ par an.
- Brainscape Pro : environ 8 $ par mois en annuel.
- 360Learning, offre Équipe : environ 8 $ ou 8 € par utilisateur et par mois, essai de 30 jours ; offres supérieures sur devis.
- Docebo : sur devis, avec un contrat médian d'environ 42 000 $ par an selon des données d'achat publiques.

**Décision (proposition de lancement, à valider par le propriétaire avant publication) :**

| Offre | Pour qui | Contenu | Prix proposé |
|---|---|---|---|
| **Learning Essentiel** | Particuliers | Tout l'apprentissage sur l'appareil : sujets, import PDF (analyse rapide), révisions espacées, partage par lien. Générations limitées (10 par mois) | 0 € |
| **Learning Plus** | Particuliers | Génération de parcours et compagnon avec un quota élevé, analyse avancée des documents, synchronisation quand elle sera disponible | 6,99 € par mois, ou 59 € par an |
| **Business Équipe** | Organisations de 5 à 200 personnes | Espace d'organisation, connaissances validées, mises en situation, preuves de maîtrise, transmission, rattachement automatique et pass d'équipe | 7 € par utilisateur **actif** et par mois, facturé à l'année, minimum 10 utilisateurs ; essai de 30 jours |
| **Business Entreprise** | Plus de 200 personnes, ou besoins spécifiques | Hébergement dans l'Union européenne, connexion unique (SSO), accompagnement, contrat de traitement des données | Sur devis |

**Raisons :**
- un prix par utilisateur **actif**, et non par compte créé, convient aux équipes de terrain qui tournent beaucoup (renforts, saisonniers) ;
- le prix reste légèrement sous 360Learning, qui est le repère du marché ;
- Learning garde une porte d'entrée gratuite, cohérente avec l'exigence « le Web reste un vrai produit d'apprentissage ».

**Ce qui n'existe pas encore :**
- le paiement ;
- la limitation par offre, au-delà des quotas serveur actuels.

Le site présente donc les offres avec la mention « Tarifs de lancement ». Les boutons mènent à la démonstration Business existante et à Arbor Web. Aucun faux formulaire de paiement.

## 4. Business : entrer dans l'organisation sans lien d'invitation
Deux portes, demandées par le propriétaire.

### A. Rattachement automatique (équipes stables)
- Le responsable déclare des **adresses** ou un **domaine** autorisés, éventuellement par site ou pôle, avec un rôle.
- La personne se connecte avec son propre compte. Dès que son adresse est **vérifiée**, elle est rattachée.
- Les domaines de messagerie publique (gmail.com, outlook.fr…) sont refusés, pour ne pas ouvrir l'organisation à tout le monde.

### B. Pass d'équipe éphémère (terrain)
- Le manager génère un **code court** et son **QR code**.
- Le pass dure 15 minutes par défaut, 60 au maximum, et compte un nombre limité de places.
- Il est rattaché à un site ou pôle et porte un libellé (par exemple « briefing du matin »).
- La personne scanne ou tape le code, se connecte (code reçu par e-mail) et entre directement, avec le rôle de membre.
- Contre les essais au hasard : 10 tentatives ratées par heure et par compte au maximum.

Les liens d'invitation déjà envoyés restent acceptés jusqu'à leur expiration, pour ne pas casser d'accès existant. On ne peut plus en créer depuis l'interface.

## 5. Skills (skills.sh) appliqués
- `frontend-design` (Anthropic) : une seule audace par écran, pas d'étiquettes en capitales, pas de cartes identiques.
- `emil-design-eng` (Emil Kowalski) : mouvement utile seulement, pression des boutons, fenêtres (origine, durée, sortie plus rapide).
- `ios-design` et `ui-taste` (uizze) : une couleur d'accent, une échelle de rayons, états vides utiles, contrôles natifs.
- `web-design-guidelines` (Vercel) : formulaires, focus, listes en mode sombre, fenêtres (`overscroll-behavior`), états vides, chargements.
- `high-end-visual-design` et `redesign-existing-projects` (taste-skill) : retravailler l'existant sans tout jeter, par l'audit.

## Trois identités (retour du 27 novembre : « Arbor Web on dirait une pâle copie du Desktop »)

Appui : skill `design-taste-frontend` (lecture du besoin, une seule couleur d'accent, une seule échelle de rayons, pas de décor en boucle, mouvement réduit respecté), plus les références GitHub (navigation de dépôt à onglets soulignés) et Linear ou Raycast (barre latérale graphite d'outil).

| Surface | Détection | Langage |
|---|---|---|
| Arbor Web (navigateur, ≥ 1200 px) | `html.is-web` (js/desktop.js) | Éditorial : en-tête horizontal à onglets soulignés, trame de points, bandeaux de titre larges avec motif d'anneaux de croissance, carte du jour en bandeau |
| Arbor Desktop (application Tauri) | `html.is-desktop-app` | Atelier : barre latérale graphite permanente, raccourcis Ctrl+1…8 affichés, en-têtes en barre d'outils collante, chiffres en mono, densité élevée |
| Téléphone (≤ 767 px) | largeur | Tactile : grand titre, carte du jour pleine couleur, tuiles teintées, boutons de 48 px, barre d'onglets flottante |

Tous les motifs sont en CSS (gradients), sans image ni animation en boucle. Le code est dans styles.css, section « ARBOR 3 · Trois identités ».
