// Arbor Desktop : le même code web que le site (index.html, js/, styles.css), servi depuis l'application.
// - une seule instance : un second lancement remet la fenêtre existante au premier plan ;
// - position et taille de la fenêtre retenues d'une session à l'autre ;
// - notifications natives (rappels de révision) et ouverture des liens externes dans le navigateur.
// Aucune clé d'IA n'est embarquée : l'application parle au même serveur Arbor que le site.
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("Arbor n'a pas pu démarrer");
}
