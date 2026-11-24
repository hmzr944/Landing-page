# Arbor Desktop (Windows, macOS)

Application installable construite avec **Tauri 2** autour du code web d'Arbor (aucune réécriture : le même
`index.html`, les mêmes modules `js/`). Fenêtre native, icône dans le Dock et la barre des tâches, une seule
instance, taille et position retenues, notifications natives, liens externes ouverts dans le navigateur.

## Construire
- Prérequis : Rust stable, Node 20 ou plus ; sous Linux, `libwebkit2gtk-4.1-dev` (développement seulement).
- Icônes (une fois) : `npx @tauri-apps/cli@2 icon ../icons/icon-512.png` depuis `desktop/src-tauri`.
- Préparer les fichiers : `node desktop/prepare.js` depuis la racine (copie de l'application web dans `desktop/dist`).
- Développement : `npx @tauri-apps/cli@2 dev` depuis `desktop/`.
- Installateurs : `npx @tauri-apps/cli@2 build` sur la plateforme visée (`.dmg` sous macOS, `.msi` et `.exe` sous Windows),
  ou le flux GitHub Actions « Desktop » (déclenchement manuel, sans publication).

## Avant une diffusion publique (décisions et accès du propriétaire)
- **Signature** : certificat Apple Developer (abonnement payant) et notarisation pour macOS ; certificat de signature de
  code pour Windows. Sans eux, les systèmes affichent un avertissement à l'installation.
- **Mises à jour automatiques** : `tauri-plugin-updater` demande une paire de clés de signature et un point de publication
  des versions ; non activé tant que ce n'est pas décidé.
- **Serveur** : ajouter les origines de l'application à `TUTOR_ORIGINS` de la fonction Supabase
  (`tauri://localhost`, `http://tauri.localhost`), sinon la connexion et Pousse sont refusés depuis l'application.
