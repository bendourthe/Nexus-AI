//! Loopback capture of the Nexus window only.
//!
//! The server binds 127.0.0.1 and requires the bearer token passed to the
//! sidecar. It never captures the desktop or another process. On Windows it
//! reads the Nexus webview's client pixels. On other hosts it answers
//! `unavailable` rather than guessing a screen API.

use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

use base64::Engine;
use serde_json::{json, Value};
use tauri::{AppHandle, Manager};

const ALLOWED_ROUTES: &[&str] = &["/chatbot", "/coding", "/images", "/videos"];
const MAX_REQUEST_BYTES: usize = 4096;

pub struct WindowCapture {
    pub url: String,
    pub token: String,
    shutdown: Arc<AtomicBool>,
}

impl Drop for WindowCapture {
    fn drop(&mut self) {
        self.shutdown.store(true, Ordering::SeqCst);
    }
}

pub fn start(app: AppHandle) -> Result<WindowCapture, String> {
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|err| err.to_string())?;
    listener.set_nonblocking(true).map_err(|err| err.to_string())?;
    let port = listener.local_addr().map_err(|err| err.to_string())?.port();
    let token = random_token();
    let shutdown = Arc::new(AtomicBool::new(false));
    let flag = shutdown.clone();
    let token_for_thread = token.clone();
    thread::Builder::new()
        .name("nexus-window-capture".to_string())
        .spawn(move || serve(listener, app, token_for_thread, flag))
        .map_err(|err| err.to_string())?;
    Ok(WindowCapture {
        url: format!("http://127.0.0.1:{port}/capture"),
        token,
        shutdown,
    })
}

fn random_token() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let mixed = nanos
        ^ (std::process::id() as u128).wrapping_mul(0x9E37_79B9_7F4A_7C15);
    format!("{mixed:032x}")
}

fn serve(listener: TcpListener, app: AppHandle, token: String, shutdown: Arc<AtomicBool>) {
    while !shutdown.load(Ordering::SeqCst) {
        match listener.accept() {
            Ok((stream, addr)) => {
                if addr.ip().is_loopback() {
                    let _ = handle_client(stream, &app, &token);
                }
            }
            Err(err) if err.kind() == std::io::ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(50));
            }
            Err(_) => break,
        }
    }
}

fn handle_client(mut stream: TcpStream, app: &AppHandle, token: &str) -> std::io::Result<()> {
    let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
    let mut buf = [0u8; MAX_REQUEST_BYTES];
    let n = stream.read(&mut buf)?;
    let text = String::from_utf8_lossy(&buf[..n]);
    let (status, body) = match parse_request(&text, token) {
        Ok(request) => match capture(app, &request) {
            Ok(value) => (200, value.to_string()),
            Err(message) => (
                503,
                json!({ "error": { "code": "unavailable", "message": message } }).to_string(),
            ),
        },
        Err(RequestError::Auth(message)) => (
            401,
            json!({ "error": { "code": "auth", "message": message } }).to_string(),
        ),
        Err(RequestError::Schema(message)) => (
            400,
            json!({ "error": { "code": "schema", "message": message } }).to_string(),
        ),
    };
    let header = format!(
        "HTTP/1.1 {status} {}\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n",
        if status == 200 { "OK" } else { "Error" },
        body.len()
    );
    stream.write_all(header.as_bytes())?;
    stream.write_all(body.as_bytes())?;
    Ok(())
}

struct CaptureRequest {
    route: Option<String>,
}

enum RequestError {
    Auth(String),
    Schema(String),
}

fn parse_request(raw: &str, token: &str) -> Result<CaptureRequest, RequestError> {
    let (head, body) = raw.split_once("\r\n\r\n").unwrap_or((raw, ""));
    let mut authorized = false;
    for line in head.split("\r\n") {
        let Some((name, value)) = line.split_once(':') else { continue };
        if name.eq_ignore_ascii_case("authorization") {
            let presented = value.trim();
            let expected = format!("Bearer {token}");
            authorized = presented == expected;
        }
    }
    if !authorized {
        return Err(RequestError::Auth("Bearer token rejected".to_string()));
    }
    if body.trim().is_empty() {
        return Ok(CaptureRequest { route: None });
    }
    let parsed: Value = serde_json::from_str(body)
        .map_err(|_| RequestError::Schema("capture body is not JSON".to_string()))?;
    let route = match parsed.get("route") {
        None | Some(Value::Null) => None,
        Some(Value::String(route)) if ALLOWED_ROUTES.contains(&route.as_str()) => Some(route.clone()),
        Some(_) => {
            return Err(RequestError::Schema(
                "route is not a Nexus window route".to_string(),
            ))
        }
    };
    Ok(CaptureRequest { route })
}

fn capture(app: &AppHandle, request: &CaptureRequest) -> Result<Value, String> {
    let window = app
        .webview_windows()
        .into_values()
        .next()
        .ok_or_else(|| "Nexus window is not open".to_string())?;
    if let Some(route) = &request.route {
        let script = format!(
            "(() => {{ const link = document.querySelector('a[href=\"{route}\"]'); if (link) link.click(); }})()"
        );
        window.eval(&script).map_err(|err| err.to_string())?;
        thread::sleep(Duration::from_millis(400));
    }
    let (width, height, png) = capture_window_png(&window)?;
    Ok(json!({
        "scope": "nexus-window",
        "route": request.route,
        "width": width,
        "height": height,
        "mediaType": "image/png",
        "pngBase64": base64::engine::general_purpose::STANDARD.encode(png),
    }))
}

#[cfg(windows)]
fn capture_window_png(window: &tauri::WebviewWindow) -> Result<(u32, u32, Vec<u8>), String> {
    use std::mem::size_of;
    use windows_sys::Win32::Foundation::RECT;
    use windows_sys::Win32::Graphics::Gdi::{
        CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, GetDIBits,
        SelectObject, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::GetClientRect;

    #[link(name = "user32")]
    extern "system" {
        fn PrintWindow(hwnd: *mut core::ffi::c_void, hdc: *mut core::ffi::c_void, flags: u32) -> i32;
        fn ReleaseDC(hwnd: *mut core::ffi::c_void, hdc: *mut core::ffi::c_void) -> i32;
    }

    let hwnd = window.hwnd().map_err(|err| err.to_string())?.0 as _;
    unsafe {
        let mut rect = RECT { left: 0, top: 0, right: 0, bottom: 0 };
        if GetClientRect(hwnd, &mut rect) == 0 {
            return Err("Nexus window has no client area".to_string());
        }
        let width = rect.right.saturating_sub(rect.left).max(0) as u32;
        let height = rect.bottom.saturating_sub(rect.top).max(0) as u32;
        const MAX_EDGE: u32 = 4096;
        if width == 0 || height == 0 || width > MAX_EDGE || height > MAX_EDGE {
            return Err("Nexus window size is outside the capture bounds".to_string());
        }
        let window_dc = GetDC(hwnd);
        if window_dc.is_null() {
            return Err("Nexus window device context is unavailable".to_string());
        }
        let memory_dc = CreateCompatibleDC(window_dc);
        let bitmap = CreateCompatibleBitmap(window_dc, width as i32, height as i32);
        if memory_dc.is_null() || bitmap.is_null() {
            if !bitmap.is_null() {
                DeleteObject(bitmap);
            }
            if !memory_dc.is_null() {
                DeleteDC(memory_dc);
            }
            ReleaseDC(hwnd, window_dc);
            return Err("Nexus window bitmap could not be created".to_string());
        }
        let previous = SelectObject(memory_dc, bitmap);
        let printed = PrintWindow(hwnd, memory_dc, 2);
        if printed == 0 {
            SelectObject(memory_dc, previous);
            DeleteObject(bitmap);
            DeleteDC(memory_dc);
            ReleaseDC(hwnd, window_dc);
            return Err("Nexus window capture returned no pixels".to_string());
        }
        let mut header = BITMAPINFOHEADER {
            biSize: size_of::<BITMAPINFOHEADER>() as u32,
            biWidth: width as i32,
            biHeight: -(height as i32),
            biPlanes: 1,
            biBitCount: 32,
            biCompression: BI_RGB,
            biSizeImage: 0,
            biXPelsPerMeter: 0,
            biYPelsPerMeter: 0,
            biClrUsed: 0,
            biClrImportant: 0,
        };
        let mut pixels = vec![0u8; (width as usize) * (height as usize) * 4];
        let rows = GetDIBits(
            memory_dc,
            bitmap,
            0,
            height,
            pixels.as_mut_ptr().cast(),
            (&mut header as *mut BITMAPINFOHEADER).cast(),
            DIB_RGB_COLORS,
        );
        SelectObject(memory_dc, previous);
        DeleteObject(bitmap);
        DeleteDC(memory_dc);
        ReleaseDC(hwnd, window_dc);
        if rows == 0 {
            return Err("Nexus window pixels could not be read".to_string());
        }
        for chunk in pixels.chunks_exact_mut(4) {
            chunk.swap(0, 2);
        }
        let mut png = Vec::new();
        {
            let mut encoder = png::Encoder::new(&mut png, width, height);
            encoder.set_color(png::ColorType::Rgba);
            encoder.set_depth(png::BitDepth::Eight);
            let mut writer = encoder.write_header().map_err(|err| err.to_string())?;
            writer.write_image_data(&pixels).map_err(|err| err.to_string())?;
        }
        Ok((width, height, png))
    }
}

#[cfg(not(windows))]
fn capture_window_png(_window: &tauri::WebviewWindow) -> Result<(u32, u32, Vec<u8>), String> {
    Err("Nexus window capture is implemented for the Windows webview".to_string())
}

#[cfg(test)]
mod tests {
    use super::ALLOWED_ROUTES;

    #[test]
    fn capture_routes_are_the_four_pillars() {
        assert_eq!(ALLOWED_ROUTES, &["/chatbot", "/coding", "/images", "/videos"]);
    }
}
