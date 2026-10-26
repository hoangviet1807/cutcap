use serde_json::Value;

/// Validate project JSON shape at the native boundary (M1+).
/// Full filesystem save/open lands with dialog/fs plugins once Rust toolchain is available.
#[tauri::command]
pub fn validate_project_json(json: String) -> Result<Value, String> {
    let value: Value =
        serde_json::from_str(&json).map_err(|e| format!("Invalid JSON: {e}"))?;
    let obj = value
        .as_object()
        .ok_or_else(|| "Project root must be an object".to_string())?;

    let schema = obj
        .get("schemaVersion")
        .and_then(|v| v.as_i64())
        .ok_or_else(|| "Missing schemaVersion".to_string())?;
    if schema != 1 && schema != 2 {
        return Err(format!("Unsupported schemaVersion: {schema}"));
    }

    if obj.get("id").and_then(|v| v.as_str()).is_none() {
        return Err("Missing id".to_string());
    }
    if obj.get("name").and_then(|v| v.as_str()).is_none() {
        return Err("Missing name".to_string());
    }

    Ok(value)
}
