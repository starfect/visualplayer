// Whether we are running inside the Tauri runtime. Lets the UI render in a plain
// browser (for quick UI work) while guarding native IPC/mpv calls.
export const inTauri: boolean = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
