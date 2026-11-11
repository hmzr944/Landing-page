# Les cinq moteurs d'Arbor : architecture cible (décision D11)

Audit du 11 novembre 2026, sur le dépôt et sur le projet Supabase réel (sondé avec la clé publiable) :
migrations 001 à 007 appliquées ; `knowledge_edges`, `source_chunks`, `mastery_states` absents.
Ce document décrit ce qui existe, ce qui est ajouté par la migration 008, et pourquoi.

## Principe : un noyau, deux contextes

| | Student (personnel) | Business (organisation) |
|---|---|---|
| Où vivent les données | sur l'appareil (D1) | dans la base, cloisonnées par organisation (RLS) |
| Connaissances | arbre de notions + graphe local (passages sourcés, relations validées) | `knowledge_nodes` + `knowledge_edges` (provenance, version, page, extrait, validation) |
| Preuves | journal local d'observations (IndexedDB) | `evidence_events` (ajout seul, écrit par le serveur ou une validation humaine) |
| Niveaux et catégories | **`js/evidence.js`, partagé** | **`js/evidence.js`, partagé** |
| Maîtrise | `js/mastery.js` (FSRS + preuves) | `js/org-insight.js` (règles explicables, déterministes) |
| Recommandation | **`js/adaptive.js`, partagé** | **`js/adaptive.js`, partagé** |

Un employeur n'a aucun accès aux données Student : elles ne quittent pas l'appareil, et le profil serveur ne
contient que des drapeaux d'onboarding (D10).

## Moteur 1 : connaissances
- Existant : `knowledge_nodes` (type, extrait mot pour mot, page, version, confiance, statut, `replaces`).
- Ajout 008 : type `erreur_frequente`, champ `context` (où la connaissance s'applique), `knowledge_edges`
  (prérequis, partie de, précise, exemple de, contredit, confusion fréquente, remplace), proposées par le serveur
  (tâche `relations`, uniquement entre connaissances validées) ou par un humain, validées par l'équipe de contenu.
- Durcissement : le serveur relit le PDF stocké (unpdf, pdf.js open source) et écarte tout passage absent de la page
  annoncée avant d'extraire quoi que ce soit (`extraire` exige l'organisation et la version).

## Moteur 2 : preuves
Sept niveaux (`js/evidence.js`) : 1 déclarée, 2 reconnue, 3 restituée, 4 appliquée, 5 démontrée,
6 transférée (appliquée dans au moins deux contextes distincts), 7 confirmée dans la durée.
Cinq résultats distincts, jamais fusionnés : `juste`, `partiel`, `faux`, `non_documente` (aucune source ne couvre
l'affirmation : ni juste ni faux), `insuffisant` (réponse trop peu étayée pour conclure).
Ajout 008 sur `evidence_events` : `level`, `reliability` (faible, moyenne, forte), `context`, `scenario_version_id`.
Les preuves restent immuables (déclencheur) ; l'effacement RGPD passe par une fonction dédiée et journalisée.
Une réussite unique ne donne jamais « durable » ; une explication personnelle reste au niveau 1.

## Moteur 3 : scénarios
- Existant : Client Mystère (fiche secrète, évaluateur séparé du personnage, débrief calculé sans modèle).
- Ajout 008 : `scenarios` et `scenario_versions` (contexte, objectif, personnage, contraintes, événements déclenchés
  par tour, grille de comportements, compétences, connaissances autorisées), conçus par le serveur à partir des
  connaissances validées, publiés par un humain, versionnés. Une partie référence la version jouée.
- Student : mode de dialogue `situation` (mise en situation sur une notion, ancrée dans ses passages).

## Moteur 4 : apprentissage adaptatif
`js/adaptive.js` : une liste d'actions classées (revoir, expliquer, question, simulation, correction, transfert,
revalidation, validation humaine), chacune avec sa raison en clair. Entrées : états de maîtrise, fausses certitudes,
erreurs, prérequis non maîtrisés (graphe), échéances, actions assignées, âge des preuves.

## Moteur 5 : évolution des connaissances (Live Policy Watchdog)
Nouvelle version d'un document → tâche serveur `comparer_versions` : pour chaque connaissance validée,
`inchange` (extrait retrouvé mot pour mot), sinon analyse sémantique du modèle sur le texte de la nouvelle version
relu sur le serveur : `reformule`, `modifie` (nouvel extrait vérifié), `supprime` ; plus les connaissances `nouveau`.
Tout est enregistré (`policy_changes`, `policy_change_items`) ; rien ne change sans décision humaine
(obligatoire par un manager ou un administrateur pour le sensible). L'impact (compétences, scénarios, personnes ayant
des preuves sur l'ancienne version) est calculé par `policy_change_impact` ; la revalidation crée des `learning_actions`.

## Enterprise Intelligence
- Blind Spot Radar : `OrgInsight.radar` (gravité, fréquence, couverture, période, sources, action recommandée),
  jamais de conclusion sous 3 observations et 2 personnes ; limites affichées.
- Dynamic Onboarding Loop : `OrgInsight.pathway` (compétences du poste via les équipes, acquis démontrés, écarts,
  parcours, validation humaine exigée pour le sensible : une simulation ne la remplace jamais).
- Live Policy Watchdog : moteur 5.

## Gouvernance des données (008)
- `organizations.retention_days` : durée de conservation des transcriptions de simulation (les débriefs et preuves restent).
- `export_my_org_data`, `erase_my_org_data` (la personne), `purge_expired_transcripts` (serveur).
- Invitations envoyées par e-mail par le serveur (Brevo) si la clé est configurée ; sinon, partage du lien.
- Stockage : un fichier ne peut être déposé qu'au chemin prévu d'une version existante.
