import { defineConfig } from 'vite';

// Vite is the build tool/bundler; the UI itself is framework-free Vanilla TS
// (BLUEPRINT §6.1). The dev server uses a fixed port so it matches
// `tauri.conf.json` `build.devUrl`.
export default defineConfig({
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
    emptyOutDir: true,
  },
});
