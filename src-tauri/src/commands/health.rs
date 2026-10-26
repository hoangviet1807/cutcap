#[tauri::command]
pub fn app_health() -> serde_json::Value {
    serde_json::json!({
        "ok": true,
        "app": "cutcap",
        "milestone": "M0",
    })
}
