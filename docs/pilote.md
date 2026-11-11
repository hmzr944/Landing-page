# Pilote Arbor Business : Client Mystère (retail)

Ce document sert à préparer et à mener le premier pilote. Tout ce qui est décrit ici fonctionne dans l'application
(version 36) ; les limites connues sont listées à la fin. Aucun chiffre de démonstration n'est présenté comme réel :
les documents d'exemple sont marqués « EXEMPLE FICTIF » sur chaque page.

## Préparer (une fois, 15 minutes)

1. Supabase : appliquer les migrations jusqu'à `006` et redéployer la fonction (guide « Supabase pour Arbor »).
2. Créer l'organisation du magasin (Réglages → Espace professionnel), en tant qu'administrateur.
3. Inviter un manager (si ce n'est pas soi) et 2 à 5 collaborateurs (onglet Équipe).
4. Documents : envoyer 2 ou 3 PDF réels du magasin (fiche produit, procédure retours). Pour un essai sans document
   réel : `docs/demo/fiche-produit-alto-500-EXEMPLE-FICTIF.pdf` et `docs/demo/procedure-retours-EXEMPLE-FICTIF.pdf`.
5. Valider les connaissances extraites (les sensibles d'abord, par le manager), puis proposer et retenir 3 à 5 compétences.

## Démonstration (7 moments, 15 minutes)

1. **Import d'une fiche métier** (onglet Documents) : le fichier va dans l'espace privé de l'organisation.
2. **Compréhension et structuration** : chaque connaissance a son type, son extrait exact, sa page et sa version ;
   ce qui touche à la sécurité ou à l'argent est « sensible » et attend la validation d'un manager.
3. **Simulation Client Mystère** (un collaborateur, sur téléphone) : client hésitant, conversation libre.
4. **Erreur ou fausse certitude** : dans la démo, le collaborateur annonce « 150 km d'autonomie » avec « C'est un réflexe ».
   Le débrief montre l'affirmation, l'extrait du document (« 90 km en mode éco », p. 1) et la marque « fausse certitude ».
5. **Diagnostic individuel** (Suivi → la personne) : état de chaque connaissance, avec sa raison.
6. **Vue manager** (Suivi) : les 3 fragilités prioritaires, la taille de l'échantillon, la période, la couverture.
7. **Activité corrective** : la prochaine activité recommandée, avec la page du document à revoir.

Le moment clé est le 4 : une erreur annoncée comme sûre passe inaperçue dans une formation classique (QCM réussi au
hasard, présentiel), alors qu'ici elle est relevée, prouvée par l'échange et reliée au document.

## Indicateurs à suivre pendant le pilote

Mesurés à partir des preuves réelles (tables `evidence_events`, `scenario_sessions`) et d'entretiens courts :

| Indicateur | Comment le mesurer | Point de départ |
|---|---|---|
| Temps pour rendre un collaborateur opérationnel | Date d'arrivée → date où le manager le juge autonome (entretien) | Durée habituelle déclarée par le manager avant le pilote |
| Diagnostic initial et final | Part de réponses justes au premier diagnostic, puis à un diagnostic refait en fin de pilote | Premier diagnostic |
| Lacunes identifiées | Connaissances en « à retravailler » ou « fausse certitude » au moins une fois | — |
| Fausses certitudes détectées | Réponses fausses annoncées « Je sais » ou « C'est un réflexe » | — |
| Progression en simulation | Comportements observés par partie, affirmations inexactes par partie, d'une partie à l'autre | Première partie |
| Réussite des tâches critiques | Connaissances sensibles : dernière preuve juste, à 7 jours d'écart au moins | — |
| Temps consacré | Nombre de diagnostics et de parties par personne et par semaine | — |
| Satisfaction | Questionnaire de 5 questions, collaborateurs et manager, en fin de pilote | — |

Aucun pourcentage d'accélération ne doit être annoncé avant d'avoir comparé ces mesures au point de départ.

## Limites connues (à dire en démonstration)

- Le modèle d'IA est gratuit (Groq, modèles open source) : quotas par minute et par jour sur le compte entier, une partie
  de Client Mystère fait environ 2 appels par réplique. Suffisant pour un magasin, pas pour un déploiement large.
- La qualité du jeu de rôle et de l'évaluation dépend du modèle : chaque comportement relevé cite la phrase exacte du
  vendeur et chaque affirmation est comparée aux fiches validées, mais l'évaluateur peut en manquer.
- Les passages envoyés à l'extraction viennent du navigateur de l'équipe de contenu (voir `docs/architecture.md`, D8).
- Les règles d'accès aux fichiers (stockage Supabase) sont à vérifier lors du premier envoi réel.
- RGPD : les échanges de simulation sont des données de salariés. Prévoir une information écrite, une durée de
  conservation et l'accès de chacun à ses propres résultats (« Mes résultats »). À faire relire avant le pilote réel.
