# Pilote réel G7 : protocole de vérification en production (v46)

À mener par le propriétaire du projet, avec de vraies adresses e-mail. Ce que Claude a vérifié depuis l'extérieur
(sans compte) est indiqué « déjà vérifié » ; tout le reste ne peut l'être qu'avec des comptes connectés.
Durée : environ 1 heure. Matériel : un ordinateur (1366 × 768 ou plus), un téléphone, 3 adresses e-mail.

| Rôle | Qui | Appareil |
|---|---|---|
| Administratrice | toi (compte A) | ordinateur |
| Manager | adresse B | ordinateur ou 2e navigateur en navigation privée |
| Collaborateur | adresse C | téléphone |

## 0. Déjà vérifié (13 novembre 2026, sans compte)
- Migration 009 : tables `skill_revalidations`, `out_of_scope_knowledge`, fonctions `cancel_revalidation`,
  `review_out_of_scope`, colonne `knowledge_nodes.provenance` présentes et protégées.
- GitHub Pages : les fichiers servis sont identiques au dépôt (v45 au moment du contrôle ; v46 ensuite).
- Site publié : Student et Business (base simulée) en 1366 × 768 et 1920 × 1080 ; PWA (manifeste, icônes, service
  worker, cache, hors connexion) : `tests/production.js`.
- **Non vérifiable sans compte** : la version de la fonction `tutor` (l'authentification passe avant tout).

## 1. La fonction `tutor` est-elle compatible avec 009 ? (5 minutes, compte A)
1. Organisation → Documents → envoyer `docs/demo/procedure-retours-EXEMPLE-FICTIF.pdf`.
2. Résultat attendu dans le compte rendu : « Provenance : N extraits retrouvés dans le fichier stocké ».
   Sous chaque connaissance : « Extrait retrouvé dans le fichier stocké ».
3. Cliquer « Valider » sur une connaissance non sensible : elle passe « Validée ».
- **Échec type A** : « tâche inconnue » ou provenance jamais affichée → l'ancienne fonction est en ligne : recoller la
  fonction du guide Supabase et Deploy.
- **Échec type B** : « provenance non vérifiée » au moment de valider → la fonction n'a pas pu relire le fichier :
  noter le message exact (et l'heure) et me l'envoyer.

## 2. Parcours pilote (40 minutes)
| # | Qui | Action | Attendu |
|---|---|---|---|
| 1 | A | Valider les connaissances de la procédure (sensibles comprises) | toutes « Validée », provenance vérifiée |
| 2 | A | Compétences → proposer, garder 2 compétences | reliées aux connaissances validées |
| 3 | A | Membres et accès → inviter B (manager) et C (collaborateur), « Envoyer par e-mail » | e-mails reçus (sinon : partager le lien) |
| 4 | B, C | Ouvrir le lien, créer le compte, rejoindre | arrivent dans l'organisation avec le bon rôle |
| 5 | C | Vue d'ensemble → « Commencer par une épreuve » → Diagnostic, en déclarant sa confiance | correction avec l'extrait et la page |
| 6 | C | Client mystère : affirmer volontairement une erreur avec « C'est un réflexe » | débrief : « Fausse certitude » + extrait |
| 7 | C | Mon parcours | niveaux de preuve, plan expliqué, matrice personnelle |
| 8 | B | Intelligence | radar (ou « échantillon insuffisant »), matrice d'équipe sans nom, parcours de C |
| 9 | B | Aperçu collaborateur, du profil à la progression | bandeau « simulation », aucun changement dans l'équipe ensuite |
| 10 | A | Envoyer une version 2 de la procédure, avec un délai modifié (par exemple 30 → 14 jours) | « Changements de cette version » : 1 modifiée |
| 11 | A ou B | Accepter le changement | C (s'il avait juste sur cette règle) passe « à revalider », micro-mission créée |
| 12 | C | Mon parcours → refaire une situation sur la nouvelle règle, réussir | la revalidation disparaît, l'ancienne preuve reste |
| 13 | C | Mes données → Télécharger | fichier JSON avec ses seules données |

## 3. À me renvoyer
Pour chaque étape : OK ou le message exact affiché, avec une capture si possible. Je corrige et j'ajoute un test
pour chaque écart constaté. Ne m'envoie jamais de mot de passe ni de clé.

## 4. Nettoyage après le pilote
Supprimer l'organisation de test (ou garder seulement le document fictif). Les comptes B et C peuvent effacer leurs
données (Mon parcours → Effacer mes données d'apprentissage).
