# Payload

The built VisualPlayer application files are placed here at packaging time; the
installer copies this directory to the chosen install location.

To produce an installer locally:

1. Build VisualPlayer: `cd app/main && npm run tauri build`.
2. Copy the build output (the app binary + resources) into this `payload/` folder.
3. Build the installer: `cd installer && npm run tauri build`.

This `README.md` keeps the directory present so the `payload/**/*` resource glob
always resolves. Real payload files are git-ignored.
