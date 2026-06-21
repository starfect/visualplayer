# Native libraries (`lib/`)

Holds native playback libraries bundled into the app (BLUEPRINT §4.2):

- **Windows:** `libmpv-2.dll` + `libmpv-wrapper.dll`. `tauri-plugin-libmpv`
  downloads these automatically on first build; they are git-ignored.
- **macOS/Linux:** the system `libmpv` is used (install via `brew install mpv` /
  your distro package). A bundled `.dylib`/`.so` may be placed here if shipping
  a self-contained build.

This `README.md` keeps the directory present so the `bundle.resources` glob
(`lib/**/*`) always resolves. Do not commit the binaries themselves.
