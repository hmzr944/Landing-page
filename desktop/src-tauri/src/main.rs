// Arbor Desktop (Windows, macOS) : fenêtre native autour de l'application web d'Arbor.
// Pas de console sous Windows en version publiée.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    arbor_lib::run()
}
