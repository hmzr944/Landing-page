# Concierge // PULS

Prototype interactif d'un poste de commandement SAV livraison pour la gastronomie haut de gamme.
**Données fictives, actions simulées** : aucune commande, aucun remboursement, aucun message réel n'est déclenché.

Ouvrir `puls/index.html` dans un navigateur (ou `python3 -m http.server` depuis `puls/`). Aucune étape de build.

## Les quatre moteurs

| Moteur | Rôle | Dans le prototype |
|---|---|---|
| Concierge Desk | Décider et résoudre | File d'urgence triée par criticité, fiche client et commande, 3 gestes avec règles, réponse IA modifiable, relecture obligatoire |
| Thermal Guard | Estimer le risque de détérioration | Indice thermique **estimé** (produit + retard + météo hub + incident froid), ouverture d'un dossier préventif |
| Proof Studio | Collecter les preuves | 3 photos guidées (dépôt réel ou simulation), observations **non certifiantes**, conclusion du conseiller |
| Carrier Autopsy | Identifier les défaillances | Taux d'incidents **vérifiés**, intervalle de confiance à 95 % (Wilson), aucune conclusion sous 30 incidents |

## Règle fondamentale : trois niveaux de vérité

Distingués par la forme, sans couleur supplémentaire :

- ● **Fait vérifié** : remonté par le transporteur (pastille pleine, encre)
- ◌ **Risque estimé** : calculé, jamais mesuré (pastille pointillée)
- ◆ **Action recommandée** : proposée, le conseiller décide (losange bordeaux)

## Garde-fous métier

- Réexpédition impossible sans stock réel (ex. tablettes ganache en rupture).
- Coursier : zones Paris et Lyon uniquement, avant 15 h, avec stock dans l'entrepôt local.
- Geste commercial au-delà de 150 € : envoi en validation responsable.
- Le brouillon IA n'affirme jamais qu'un produit est consommable ou impropre.
- La recommandation n'est jamais appliquée automatiquement.

## Design

- **3 couleurs** : ivoire `#F8F4EC`, encre `#1E1B18`, bordeaux `#7A1D2B`. Toutes les nuances sont des mélanges `color-mix` de ces trois.
- **2 polices** : Outfit (titres) et GT Walsheim (texte et boutons). GT Walsheim est sous licence Grilli Type : déposer `GT-Walsheim-Regular.woff2`, `-Medium.woff2`, `-Bold.woff2` dans `puls/fonts/`. Sans ces fichiers, Figtree sert de repli.
- Bento grid aérée, rayons cohérents (tuiles 18 px, champs 10 px, boutons en pilule).
- Motion : entrées en cascade, anneau de score, compteurs, file animée à la résolution, rédaction de la réponse en direct.
- Identité « pouls » (`effects.js`) : intro au tracé cardiaque (une fois par session), logo animé, moniteur **Pouls SAV** dont le rythme accélère de 9 bpm par dossier critique, rideau bordeaux entre les moteurs, pastille de navigation glissante, titres révélés mot à mot, sceau de cire « Résolu » à la clôture, halo sous le curseur, boutons aimantés, ondes au clic, grain papier.
- Tout est désactivé avec `prefers-reduced-motion`.
- Icônes Phosphor.

## Raccourcis

`J` / `K` dossier suivant / précédent · `1` `2` `3` gestes · `R` réponse · `/` recherche · `G` puis `D` `T` `P` `C` moteurs · `?` aide
