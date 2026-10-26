//! Native FFmpeg render commands (M2+).
//! Browser export currently uses ffmpeg.wasm; this stub reserves the Tauri surface.

#[tauri::command]
pub fn render_status() -> serde_json::Value {
    serde_json::json!({
        "engine": "pending-native-ffmpeg",
        "browserFallback": "ffmpeg.wasm",
        "ready": false,
    })
}
