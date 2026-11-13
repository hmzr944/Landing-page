# Arbor Business v2 et Arbor League : audit, conception, règles (décision D13)

Audit du dépôt au commit `9b7d0a1` (v47). Production, vérifiée de l'extérieur : migrations 001 à 010 présentes
(010 confirmée le 13 novembre par un sondage de la table `feedback`). Le code fait foi.

## A1. Diagnostic

**Ce qui existe et fonctionne (à conserver)**
- Moteurs : connaissances (provenance vérifiée par le serveur, 009), preuves (7 niveaux, 5 résultats, immuables),
  scénarios versionnés, adaptatif, évolution des connaissances (Watchdog + revalidations ciblées), intelligence
  (radar, matrice confiance × compétence, parcours), aperçu collaborateur, retours (010).
- Rôles et droits côté base : RLS sur toutes les tables, fonctions `security definer` avec `arbor_private.has_role`.

**Ce qui pose problème**
- Navigation : 11 entrées, organisées par module technique (Suivi, Intelligence, Documents, Compétences, Scénarios,
  Membres, Aperçu, Paramètres…), pas par intention.
- Création d'organisation : assistant en 6 étapes, administratif avant toute valeur.
- États vides : longues phrases statistiques (« 0 preuve, 0 personne observée sur 1… »).
- Arrivée d'un collaborateur : 3 écrans théoriques avant toute action.
- Pas de reconnaissance des réussites (rangs, trophées, collectif).

**Point d'architecture à trancher (non destructif pour l'instant)**
Les managers lisent aujourd'hui les preuves brutes de leur équipe (RLS `evidence_read`, migration 003), parce que les
analyses d'équipe (radar, matrice) sont calculées dans le navigateur. Le « double voile » demande qu'un manager ne voie
que l'information professionnelle. Options :
1. *Voile d'interface* (fait dans cette mission) : l'écran manager ne montre plus les erreurs ni les fausses certitudes
   individuelles, seulement « à renforcer » ; les pairs n'ont jamais accès aux preuves d'autrui (déjà vrai en base).
2. *Voile en base* (proposé, non fait) : retirer aux managers la lecture des colonnes `confidence` et `detail`,
   et calculer radar et matrice dans des fonctions SQL agrégées. Plus sûr, mais déplace des moteurs dans la base.
Recommandation : 1 maintenant, 2 après le pilote si les managers n'ont pas besoin du détail. Rien n'est supprimé.

## A2. Nouvelle navigation (5 rubriques, par intention)

| Rubrique | Contenu | Remplace | Rôles |
|---|---|---|---|
| Cockpit | indicateurs clés, compétences maîtrisées / à renforcer, évolutions des connaissances, revalidations, actions, activité récente | Vue d'ensemble | admin, manager |
| Mon équipe | collaborateurs, progression, compétences, trophées publics, cordées, invitations (bouton visible), fiche collaborateur | Équipe, Membres et accès, Aperçu | admin, manager |
| Base de savoir | Document → extraction → connaissances proposées → validation → compétences ; provenance accessible sans être imposée | Documents, Compétences | admin, manager, expert |
| Développer | Diagnostiquer (angles morts, confiance, revalidations, progression) ; Entraîner (client mystère, scénarios, défis de saison) | Intelligence, Scénarios | admin, manager |
| Mon apprentissage | ses propres portes, diagnostic, simulations, parcours, Canopée, accès à l'espace personnel | Apprendre, Mon parcours | tous |

Paramètres : icône dédiée (administrateur). Les anciennes adresses (`suivi`, `documents`, `competences`, `intelligence`,
`scenarios`, `equipe`, `apercu`) continuent de fonctionner. Le collaborateur a sa propre navigation : Accueil, Canopée,
Explorer (les cinq portes), Mon parcours.

## A3. Setup Express (3 étapes)
1. **Identité** : nom, secteur. Tout le reste plus tard (Paramètres → Configuration détaillée, l'ancien assistant, conservé).
2. **Premier savoir** : importer un document, ou écrire une règle. Une règle écrite devient un document PDF signé
   (« Règle écrite par … le … »), stocké comme tout document : la provenance est vérifiée par le serveur exactement
   comme pour un import. Puis 3 à 5 cartes proposées (titre, reformulation, provenance, modifier, exclure, statut).
   « Tout valider » ne valide que les cartes présentées et non exclues ; chaque validation passe par
   `set_knowledge_status` (provenance obligatoire). Les compétences sont ensuite proposées à partir des seules
   connaissances validées.
3. **Première expérience** : tester mon client mystère (connaissances validées seulement) ; inviter mon équipe
   (lien sécurisé, ignorable).
Configuration progressive : équipes et établissements quand on range les collaborateurs ; cordées quand on lance un
défi ; rôles quand on ajoute un manager.

## A4. États des données (cinq, sans conclusion négative prématurée)
| État | Condition (seuils existants conservés) | Message | Action |
|---|---|---|---|
| Aucune donnée | 0 preuve | « Votre radar d'équipe se prépare » | Inviter mon équipe |
| Insuffisant | < 3 observations ou < 2 personnes par connaissance | « Premières réponses reçues » | Lancer un diagnostic |
| Première observation | au moins un signal, pas encore de conclusion | « Les premiers signaux apparaissent » | Proposer une simulation |
| Documenté | seuils atteints | résultats affichés | selon le résultat |
| Revalidation | une revalidation ouverte | « Une procédure a changé » | Voir qui revalider |

## A5. Arbor League : règles métier
Toutes les règles s'exécutent dans la base (déclencheur sur `evidence_events`), jamais dans le navigateur.
Elles reprennent les définitions des niveaux de preuve (`js/evidence.js`) : *appliquée* = résultat juste de niveau ≥ 4 ;
*transférée* = appliquée dans au moins deux contextes ; *durable* = réussites à au moins 7 jours d'écart, la dernière juste.

**Trophées** (catalogue `league_trophies`, attribution `league_awards`, chaque attribution porte la preuve source) :
| Trophée | Condition | Portée |
|---|---|---|
| Première pousse | première connaissance appliquée | une fois |
| Maître du terrain | une connaissance appliquée dans 2 contextes distincts | par connaissance |
| Feuille d'or | une connaissance réussie à ≥ 7 jours d'écart, dernière réponse juste, au moins une application | par connaissance |
| Feuille de résilience | une erreur sur une connaissance, puis plus tard une application juste, dans une autre partie | par connaissance |
| Arbre de savoir | 3 feuilles d'or | une fois |
| Mentor | la personne accompagnée applique la connaissance après le début du mentorat, sans l'avoir appliquée avant | par mentorat |
| Défi relevé (saison) | la cordée atteint l'objectif du défi pendant la saison | par défi |

**Rangs** (table `league_ranks`, seuils configurables par le système, documentés ici, à recalibrer avec le pilote) :
| Rang | Connaissances appliquées | Feuilles d'or | Maître du terrain |
|---|---|---|---|
| Graine | 0 | 0 | 0 |
| Pousse | 1 | 0 | 0 |
| Arbuste | 3 | 1 | 0 |
| Arbre | 6 | 3 | 1 |
| Canopée | 10 | 6 | 3 |
Un rang atteint est conservé (historique `league_rank_history`) ; il ne baisse pas.

**Anti-manipulation** : une preuve n'est écrite que par le serveur ou par une validation humaine nominative ;
chaque trophée est unique par (personne, trophée, portée) ; un mentorat est créé par un responsable, entre deux
personnes différentes, et seulement si le mentor a lui-même appliqué la connaissance ; une validation humaine faite
par le mentor ne compte pas pour son propre trophée ; un mentorat ne rapporte qu'une fois.

**Cordées** : petits groupes (équipe, établissement, groupe, binôme). Progression = part des compétences attendues
démontrées par l'ensemble du groupe, affichée en agrégé seulement. Personne n'est pénalisé : la progression d'un
membre ne retire rien aux autres.

**Saisons** : une période, des défis collectifs (une connaissance à appliquer par une part des membres d'une cordée).
À la fin : le score de saison (calculé sur la période) repart de zéro ; trophées permanents, compétences, preuves et
historique restent. Le score de saison ne compte que ce qui a été fait pendant la saison : un nouveau venu n'est pas
désavantagé.

**Double voile** : les pairs voient rangs, trophées, cordées et défis (fonction `league_board`, sans preuve ni erreur).
La personne voit ses trophées avec leur preuve source. Le manager voit compétences, progression, besoins de formation
et trophées ; l'interface ne lui montre plus les fausses certitudes individuelles (voir A1).

## F. Réalisation et validation (v48)
**Livré** : navigation par intention (`js/org.js` `navOf`, 5 rubriques au plus, Paramètres en icône), Cockpit, Mon équipe,
Base de savoir, Développer (Diagnostiquer / Entraîner), Mon apprentissage (`js/org-hub.js`) ; Setup Express
(`js/org-setup.js`, `js/textpdf.js`) ; arrivée collaborateur en un écran et accueil d'action (`js/org-onboarding.js`,
`js/league.js`) ; Canopée, trophées avec preuve, cordées, mentorat, saisons et défis (`js/league.js`) ;
migration `011_league.sql` (moteur dans la base). Les anciens écrans restent joignables par leur adresse
(suivi, intelligence, documents, compétences, scénarios, aperçu, paramètres) ; l'assistant détaillé reste dans
Paramètres et à `#/org/nouvelle/detaillee`.

**Choix faits pendant la réalisation**
- Une règle écrite devient un PDF minimal produit dans le navigateur (`TextPdf`), puis suit exactement le chemin d'un
  document importé : dépôt, extraction, vérification de la provenance par le serveur sur le fichier stocké.
  Aucune exception de provenance n'est créée pour le Setup Express.
- « Tout valider » appelle `set_knowledge_status` carte par carte : la base refuse toute carte dont l'extrait n'a pas
  été retrouvé (009) et la raison s'affiche sur la carte. Une carte exclue est marquée « rejetée » (décision explicite).
- Les compétences proposées partent des seules connaissances validées.
- Cockpit et Mon équipe tolèrent une table absente (migration non appliquée : état « pas encore de données ») mais
  affichent toute autre erreur (réseau, droits) au lieu d'un faux vide.
- Double voile, option 1 (interface) : côté responsable, « fausse certitude » et « à retravailler » deviennent
  « À renforcer ». L'option 2 (voile dans la base) reste à décider après le pilote.
- Le Cockpit reprend les actions de l'ancienne vue d'ensemble (revalidations, angle mort, connaissances de terrain
  hors référentiel) ; le diagnostic et le client mystère restent proposés au manager dans « Entraîner ».

**Tests (locaux, base et serveur simulés ou PostgreSQL 16 local)**
| Suite | Vérifie |
|---|---|
| `tests/org-setup.js` | les 3 étapes, double clic, règle écrite en PDF, cartes, modifier, exclure, provenance refusée, compétences, invitation, reprise |
| `tests/league.js` | Canopée, trophées et preuve, tableau sans fragilité, cordées, mentorat (règles), saison et défi, sans 011 |
| `tests/org-shell.js` | navigation par rôle (5 rubriques), Cockpit, double voile, accueil collaborateur, Explorer |
| `tests/db-rls.js` section L | moteur League réel dans PostgreSQL (dates des preuves, rang qui ne baisse pas, anti-collusion, board sans erreur) |

**Ce qui reste à vérifier en production** (impossible ici sans compte ni base réelle) : migration 011 appliquée,
rattrapage des trophées des preuves existantes, Setup Express avec la vraie fonction `extraire` sur une règle écrite.
