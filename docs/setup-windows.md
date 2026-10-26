# Windows setup (Tauri / M5 — deferred)

> **Not needed for the current web app.** Use `pnpm dev` in the browser. This doc is for when desktop packaging (M5) is resumed.

## Status on this machine

| Tool | Status |
|---|---|
| **FFmpeg** | Installed (`Gyan.FFmpeg.Essentials` 9.0.1) — restart terminal if `ffmpeg` not found |
| **ffmpeg.wasm** | Copied by `pnpm postinstall` → `public/ffmpeg/` |
| **Rust** | Installed (`Rustlang.Rust.MSVC` 1.99.1) — restart terminal if `rustc`/`cargo` not found |
| **VS Build Tools** | Installed (2022 + `VCTools` workload) — use elevated/`--passive` install if winget exits 1602 |

## Rust (required for `pnpm tauri dev`)

`static.rust-lang.org` may return **403** on some networks. Prefer:

```powershell
winget install --id Rustlang.Rust.MSVC -e
```

Or download [rustup-init.exe](https://www.rust-lang.org/tools/install) manually, then:

```powershell
.\rustup-init.exe -y --default-toolchain stable-x86_64-pc-windows-msvc
```

Also install **Visual Studio Build Tools 2022** with workload **Desktop development with C++**:

```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

Restart the terminal, then verify:

```powershell
rustc --version
cargo --version
ffmpeg -version
pnpm tauri dev
```

## Browser export smoke test (no Rust)

1. `pnpm install && pnpm dev`
2. Open a project with image + audio + cues
3. **Export MP4** → **Draft** → Start
4. Wait for preview → Download
