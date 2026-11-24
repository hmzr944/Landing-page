// Arbor : le même code web que le site (index.html, js/, styles.css), servi depuis l'application.
// Ordinateur (Windows, macOS) :
// - une seule instance : un second lancement remet la fenêtre existante au premier plan ;
// - position et taille de la fenêtre retenues d'une session à l'autre, mais toujours bornées à l'écran ;
// - notifications natives (rappels de révision) et ouverture des liens externes dans le navigateur.
// iPhone (essai) : même application web, interface téléphone ; notifications et liens externes seulement.
// Aucune clé d'IA n'est embarquée : l'application parle au même serveur Arbor que le site.
#[cfg(desktop)]
use tauri::Manager;

/// Fenêtre plus grande que l'écran (petit écran, ou position retenue d'un autre écran) : on la ramène à 92 % et on la centre.
#[cfg(desktop)]
fn borner_a_l_ecran(app: &tauri::App) {
    let Some(w) = app.get_webview_window("main") else { return };
    let Ok(Some(m)) = w.current_monitor() else { return };
    let sf = m.scale_factor();
    let ecran = m.size().to_logical::<f64>(sf);
    let Ok(taille) = w.outer_size() else { return };
    let taille = taille.to_logical::<f64>(sf);
    if taille.width > ecran.width * 0.96 || taille.height > ecran.height * 0.96 {
        let _ = w.set_size(tauri::LogicalSize::new(ecran.width * 0.92, ecran.height * 0.88));
        let _ = w.center();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build());
    builder
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|_app| {
            #[cfg(desktop)]
            borner_a_l_ecran(_app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Arbor n'a pas pu démarrer");
}
