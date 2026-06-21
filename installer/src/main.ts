import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { getCurrentWindow } from '@tauri-apps/api/window';
import './style.css';

interface InstallInfo {
  appName: string;
  version: string;
  defaultDir: string;
  alreadyInstalled: boolean;
}
interface InstallReport {
  installDir: string;
  files: number;
  shortcuts: string[];
}

type Attrs = Record<string, string | boolean | EventListener>;
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') node.className = String(v);
    else if (v === true) node.setAttribute(k, '');
    else if (v !== false) node.setAttribute(k, String(v));
  }
  for (const c of children) node.append(c);
  return node;
}

const LICENSE = `VisualPlayer — non-profit open source.

Own source code is licensed under Apache-2.0. Distributed binaries include GPL
components (full-build FFmpeg, mpv) and are therefore provided under the GNU
General Public License v3 (GPLv3). Corresponding source is available in the
public repository.

The software is provided "AS IS", without warranty of any kind. You are
responsible for the legality of the content you open. Torrents are download-only.

By continuing you agree to these terms.`;

const root = document.getElementById('app') as HTMLElement;
let info: InstallInfo = { appName: 'VisualPlayer', version: '', defaultDir: '', alreadyInstalled: false };
const options = { targetDir: '', desktopShortcut: true, startMenu: true, registerFileTypes: true };

function shell(stepTitle: string, body: HTMLElement, footer: HTMLElement): void {
  root.replaceChildren(
    el('div', { class: 'wizard' }, [
      el('header', { class: 'wiz-head' }, [
        el('div', { class: 'logo' }, ['▶']),
        el('div', {}, [
          el('div', { class: 'app-name' }, [info.appName]),
          el('div', { class: 'app-ver' }, [`v${info.version}`]),
        ]),
      ]),
      el('h2', { class: 'step-title' }, [stepTitle]),
      el('div', { class: 'step-body' }, [body]),
      footer,
    ]),
  );
}

function button(label: string, onClick: () => void, kind = ''): HTMLButtonElement {
  return el('button', { class: `btn ${kind}`.trim(), type: 'button', onclick: onClick }, [label]);
}

function welcome(): void {
  const body = el('div', {}, [
    el('p', {}, [
      `Welcome. This will install ${info.appName} on your computer — a lightweight player for almost any video and audio format.`,
    ]),
    info.alreadyInstalled ? el('p', { class: 'note' }, ['An existing installation was detected.']) : el('span'),
  ]);
  const footer = el('footer', { class: 'wiz-foot' }, [
    info.alreadyInstalled ? button('Uninstall', confirmUninstall, 'ghost') : el('span'),
    el('div', { class: 'spacer' }),
    button('Next', license, 'primary'),
  ]);
  shell('Welcome', body, footer);
}

function license(): void {
  let agreed = false;
  const next = button('Install', () => void runInstall(), 'primary');
  next.disabled = true;
  const agree = el('input', { type: 'checkbox' }) as HTMLInputElement;
  agree.addEventListener('change', () => {
    agreed = agree.checked;
    next.disabled = !agreed;
  });
  const body = el('div', {}, [
    el('pre', { class: 'license' }, [LICENSE]),
    el('div', { class: 'options' }, [optionsBlock()]),
    el('label', { class: 'agree' }, [agree, 'I accept the terms above']),
  ]);
  const footer = el('footer', { class: 'wiz-foot' }, [
    button('Back', welcome, 'ghost'),
    el('div', { class: 'spacer' }),
    next,
  ]);
  shell('License & options', body, footer);
}

function optionsBlock(): HTMLElement {
  const dir = el('input', { class: 'dir', type: 'text', value: options.targetDir }) as HTMLInputElement;
  dir.addEventListener('input', () => (options.targetDir = dir.value));
  const browse = button('Browse…', async () => {
    const picked = await open({ directory: true, defaultPath: options.targetDir });
    if (typeof picked === 'string') {
      options.targetDir = picked;
      dir.value = picked;
    }
  }, 'ghost');

  const toggle = (label: string, key: 'desktopShortcut' | 'startMenu' | 'registerFileTypes') => {
    const input = el('input', { type: 'checkbox' }) as HTMLInputElement;
    input.checked = options[key];
    input.addEventListener('change', () => (options[key] = input.checked));
    return el('label', { class: 'opt' }, [input, label]);
  };

  return el('div', {}, [
    el('div', { class: 'field' }, [el('span', { class: 'lbl' }, ['Install location']), el('div', { class: 'dir-row' }, [dir, browse])]),
    toggle('Create desktop shortcut', 'desktopShortcut'),
    toggle('Add to applications / Start Menu', 'startMenu'),
    toggle('Set as default for media & subtitle files', 'registerFileTypes'),
  ]);
}

async function runInstall(): Promise<void> {
  shell('Installing', el('div', { class: 'progress' }, [el('div', { class: 'spinner' }), el('p', {}, ['Copying files…'])]), el('footer', { class: 'wiz-foot' }));
  try {
    const report = await invoke<InstallReport>('installer_install', { options });
    done(report);
  } catch (err) {
    failed(String((err as { message?: string })?.message ?? err));
  }
}

function done(report: InstallReport): void {
  const body = el('div', {}, [
    el('div', { class: 'big-check' }, ['✓']),
    el('p', {}, [`${info.appName} was installed to:`]),
    el('code', { class: 'path' }, [report.installDir]),
    el('p', { class: 'note' }, [`${report.files} files · ${report.shortcuts.length} shortcuts`]),
  ]);
  const footer = el('footer', { class: 'wiz-foot' }, [
    el('div', { class: 'spacer' }),
    button('Launch', async () => {
      await invoke('installer_launch', { installDir: report.installDir }).catch(() => {});
      await getCurrentWindow().close();
    }, 'ghost'),
    button('Finish', () => void getCurrentWindow().close(), 'primary'),
  ]);
  shell('Done', body, footer);
}

function failed(message: string): void {
  const body = el('div', {}, [el('div', { class: 'big-x' }, ['✕']), el('p', {}, ['Installation failed:']), el('code', { class: 'path' }, [message])]);
  const footer = el('footer', { class: 'wiz-foot' }, [button('Back', license, 'ghost'), el('div', { class: 'spacer' }), button('Close', () => void getCurrentWindow().close())]);
  shell('Error', body, footer);
}

function confirmUninstall(): void {
  const body = el('div', {}, [el('p', {}, [`Remove ${info.appName} and its shortcuts from this computer?`])]);
  const footer = el('footer', { class: 'wiz-foot' }, [
    button('Cancel', welcome, 'ghost'),
    el('div', { class: 'spacer' }),
    button('Uninstall', async () => {
      shell('Uninstalling', el('div', { class: 'progress' }, [el('div', { class: 'spinner' }), el('p', {}, ['Removing files…'])]), el('footer', { class: 'wiz-foot' }));
      await invoke('installer_uninstall').catch(() => {});
      const f = el('footer', { class: 'wiz-foot' }, [el('div', { class: 'spacer' }), button('Close', () => void getCurrentWindow().close(), 'primary')]);
      shell('Removed', el('div', {}, [el('div', { class: 'big-check' }, ['✓']), el('p', {}, [`${info.appName} was removed.`])]), f);
    }, 'danger'),
  ]);
  shell('Uninstall', body, footer);
}

async function boot(): Promise<void> {
  try {
    info = await invoke<InstallInfo>('installer_info');
  } catch {
    /* dev/browser fallback keeps defaults */
  }
  options.targetDir = info.defaultDir;
  welcome();
}

void boot();
