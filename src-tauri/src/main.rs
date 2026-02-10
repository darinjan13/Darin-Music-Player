#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // This tells Rust to run the 'run' function inside lib.rs
    app_lib::run(); 
}