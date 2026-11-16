# Corpus métier n° 1

Huit documents de procédure pour tester l'espace Business d'Arbor : extraction des connaissances, questions, et
détection des changements entre deux versions d'une procédure.

> **Tous ces documents sont fabriqués.** Les deux organisations (Maison Ardoise, Brasserie du Quai) sont fictives.
> Chaque PDF porte un bandeau « Document fictif ». Aucune procédure réelle d'entreprise n'a été utilisée : aucune
> n'était disponible (réponse du 2026-11-16).

## Contenu

| Fichier | Secteur | Procédure | Version | Règles attendues |
|---|---|---|---|---|
| `R1-v1.pdf` | Commerce de détail | Ouverture et fermeture du magasin | v1 du 2026-03-03 | 7 |
| `R1-v2.pdf` | Commerce de détail | Ouverture et fermeture du magasin | v2 du 2026-09-02 | 7 |
| `R2-v1.pdf` | Commerce de détail | Retour d'un article par un client | v1 | 9 |
| `R3-v1.pdf` | Commerce de détail | Tenue de la caisse | v1 | 9 |
| `H1-v1.pdf` | Hôtellerie-restauration | Réception des livraisons | v1 du 2026-02-10 | 12 |
| `H1-v2.pdf` | Hôtellerie-restauration | Réception des livraisons | v2 du 2026-07-15 | 13 |
| `H2-v1.pdf` | Hôtellerie-restauration | Chaîne du froid en cuisine | v1 | 8 |
| `H3-v1.pdf` | Hôtellerie-restauration | Réclamation d'un client | v1 | 9 |

En tout : 74 règles attendues, dont 25 réglementaires et 47 sensibles (sécurité, argent, hygiène, allergies).

## Deux natures de règles, toujours séparées
- **`reglementaire`** : la règle reprend un texte public. Elle a été vérifiée le 2026-11-16 à la source citée dans
  `corpus.json`, par exemple les températures de l'arrêté du 21 décembre 2009 (annexe I), le plafond de 1 000 € en
  espèces, les 50 pièces au plus, la garantie légale de 2 ans ou les 14 allergènes du règlement INCO.
- **`interne`** : la règle est inventée pour l'exercice (fond de caisse de 200 €, délai de rangement de 15 minutes,
  geste commercial de 30 €…). Ce n'est ni une obligation légale, ni une recommandation.

Précautions de rédaction :
- Le refroidissement rapide (de + 63 °C à moins de + 10 °C en moins de 2 heures) figure dans l'arrêté pour la
  restauration collective ; la brasserie fictive l'applique comme règle interne, et la source le précise.
- Le plafond en espèces pour un client domicilié à l'étranger n'est pas chiffré : les sources consultées ne
  concordaient pas (10 000 € ou 15 000 € selon la situation).

## Changements entre versions (corrigé attendu)
`corpus.json` décrit pour chaque v2 ce qui a changé et ce qui n'a **pas** changé. C'est le corrigé pour évaluer la
détection des changements et la revalidation ciblée.

| Procédure | Changements à détecter | Pièges (rien ne doit être revalidé) |
|---|---|---|
| R1 | fond de caisse 150 → 200 € ; alarme 45 → 30 s ; ajout du contrôle du défibrillateur ; suppression de la fermeture seul le dimanche | deux étapes inversées dans une phrase ; section « Incident » déplacée |
| H1 | le commis ne réceptionne plus (suppression d'une exception, changement de rôle) ; DLC 3 → 4 jours ; ajout de la tolérance de 3 °C au déchargement ; ajout des photos des refus ; rangement 30 → 15 minutes | consigne reformulée (emballages) ; tableau des températures identique |

## Défaut constaté pendant la constitution du corpus
Une première version des PDF, imprimée avec les ligatures typographiques (« fi », « ff », « fl »), a été lue par le
lecteur de l'espace Business (`OrgDocs.readPages`). Résultat : 13 règles sur 74 n'étaient plus retrouvées, dans 5
documents sur 8. Le lecteur insère un espace entre les morceaux de texte : « identi fi ant », « co ff re »,
« véri fi er ». Beaucoup de PDF réels (traitement de texte, LaTeX) contiennent ces ligatures. **Ce défaut n'est pas
corrigé** (la mission 1 ne modifie pas le code). Les PDF du corpus sont donc imprimés sans ligatures ; le défaut est à
traiter dans la mission sur l'extraction des documents.

## Régénérer et tester
```
node docs/corpus-metier/generer.js   # contenu.js → sources/*.html, *.pdf, corpus.json
node tests/corpus-metier.js          # manifeste cohérent + lecture réelle des 8 PDF par OrgDocs.readPages
```
Pour modifier un document, éditer `contenu.js`, régénérer, puis relancer le test. Le test vérifie notamment que
chaque changement décrit existe bien dans le texte, et que chaque règle est retrouvée mot pour mot après lecture.
