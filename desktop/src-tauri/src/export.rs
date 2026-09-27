//! Diagram export. The save dialog and the write happen in this command.
//! A path supplied by the renderer is rejected. There is no general filesystem scope.

use base64::Engine;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

const RESERVED: &[&str] = &[
    "con", "prn", "aux", "nul", "com1", "com2", "com3", "com4", "lpt1", "lpt2", "lpt3",
];

pub fn sanitize_export_filename(raw: &str, extension: &str) -> String {
    let leaf = raw.rsplit(['/', '\\']).next().unwrap_or("diagram");
    let mut cleaned: String = leaf
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric() || *ch == '.' || *ch == '_' || *ch == '-')
        .take(64)
        .collect();
    let stem = cleaned.split('.').next().unwrap_or("");
    let stem_lower = stem.to_ascii_lowercase();
    if cleaned.is_empty() || RESERVED.contains(&stem_lower.as_str()) {
        cleaned = "diagram".to_string();
    }
    if !cleaned.to_ascii_lowercase().ends_with(&format!(".{extension}")) {
        cleaned = format!("{cleaned}.{extension}");
    }
    cleaned
}

pub fn reject_renderer_path(path: Option<&str>) -> Result<(), String> {
    if path.map(|value| !value.is_empty()).unwrap_or(false) {
        return Err("renderer-supplied path rejected".to_string());
    }
    Ok(())
}

pub fn decode_export_bytes(bytes_base64: &str) -> Result<Vec<u8>, String> {
    base64::engine::general_purpose::STANDARD
        .decode(bytes_base64.trim())
        .map_err(|err| format!("export payload is not base64: {err}"))
}

fn refuse_remote_svg(bytes: &[u8]) -> Result<(), String> {
    let text = String::from_utf8_lossy(bytes);
    let trimmed = text.trim_start();
    if trimmed.starts_with('<') && text.to_ascii_lowercase().contains("http") {
        return Err("refusing to write a diagram that still contains an http scheme".to_string());
    }
    Ok(())
}

#[tauri::command]
pub async fn export_diagram(
    app: AppHandle,
    suggested_name: String,
    bytes_base64: String,
    extension: String,
    path: Option<String>,
) -> Result<String, String> {
    reject_renderer_path(path.as_deref())?;
    let extension = if extension == "svg" { "svg" } else { "png" };
    let filename = sanitize_export_filename(&suggested_name, extension);
    let bytes = decode_export_bytes(&bytes_base64)?;
    if bytes.is_empty() {
        return Err("refusing to write an empty file".to_string());
    }
    refuse_remote_svg(&bytes)?;
    let picked = app
        .dialog()
        .file()
        .set_file_name(&filename)
        .blocking_save_file();
    let Some(file) = picked else {
        return Err("save cancelled".to_string());
    };
    let target = file
        .into_path()
        .map_err(|err| format!("save dialog did not return a file path: {err}"))?;
    std::fs::write(&target, &bytes).map_err(|err| {
        let _ = std::fs::remove_file(&target);
        format!("export failed: {err}")
    })?;
    Ok(target.display().to_string())
}

#[cfg(test)]
mod tests {
    use super::{decode_export_bytes, reject_renderer_path, sanitize_export_filename};

    #[test]
    fn strips_traversal_and_reserved_names() {
        let name = sanitize_export_filename(r"..\..\CON", "png");
        assert!(!name.contains('\\'));
        assert!(!name.contains('/'));
        assert_eq!(name, "diagram.png");
        let nested = sanitize_export_filename("../../secret", "svg");
        assert_eq!(nested, "secret.svg");
        assert!(!nested.contains('/'));
    }

    #[test]
    fn rejects_a_renderer_path() {
        assert!(reject_renderer_path(Some("C:\\Users\\me\\out.svg")).is_err());
        assert!(reject_renderer_path(None).is_ok());
        assert!(reject_renderer_path(Some("")).is_ok());
    }

    #[test]
    fn decodes_payload_bytes() {
        let bytes = decode_export_bytes("aGVsbG8=").unwrap();
        assert_eq!(bytes, b"hello");
    }
}
