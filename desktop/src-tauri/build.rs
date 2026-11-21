fn main() {
    // Link the Visual C++ runtime statically on Windows MSVC so the installed app
    // starts on a PC without the VC++ Redistributable. Tauri CLI 2.12 no longer
    // sets STATIC_VCRUNTIME (it moved to `build.windows.staticVCRuntime`), but the
    // locked tauri-build 2.6.x still reads only this variable. Respect an explicit
    // "false" so a deliberate dynamic build stays possible.
    if std::env::var("CARGO_CFG_TARGET_ENV").as_deref() == Ok("msvc")
        && std::env::var_os("STATIC_VCRUNTIME").is_none()
    {
        std::env::set_var("STATIC_VCRUNTIME", "true");
    }
    tauri_build::build()
}
