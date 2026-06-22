import { video } from '../features/video';
import { toggleAbLoop, abLoopLabel } from '../features/abloop';
import { equalizer, EQ_PRESETS } from '../features/equalizer';
import { chapters } from '../features/chapters';
import { mpv } from '../ipc/mpv';
import { player, whisper } from '../ipc';
import { playerStore } from '../stores/player';
import { videoStore, type VideoState } from '../features/video/store';
import { equalizerStore, EQ_BANDS, type EqualizerState } from '../features/equalizer/store';
import { chaptersStore, type ChaptersState } from '../features/chapters/store';
import { uiStore } from '../stores/ui';
import { h, icon } from './dom';
import { t } from '../i18n';
import { toast, describeError } from './toast';

type EqChannel = 'brightness' | 'contrast' | 'gamma' | 'saturation' | 'hue';

function section(title: string, children: Node[]): HTMLElement {
  return h('section', { class: 'tool-section' }, [
    h('h3', { class: 'tool-title' }, [title]),
    ...children,
  ]);
}

function chip(label: string, onClick: () => void): HTMLButtonElement {
  return h('button', { class: 'chip', type: 'button', onclick: onClick }, [label]);
}

function eqSlider(
  channel: EqChannel,
  label: string,
): { row: HTMLElement; input: HTMLInputElement } {
  const input = h('input', {
    type: 'range',
    min: '-100',
    max: '100',
    step: '1',
    value: '0',
    'aria-label': label,
  }) as HTMLInputElement;
  input.addEventListener('input', () => void video.setEq(channel, Number(input.value)));
  const row = h('label', { class: 'tool-row' }, [
    h('span', { class: 'tool-label' }, [label]),
    input,
  ]);
  return { row, input };
}

function freqLabel(hz: number): string {
  return hz >= 1000 ? `${hz / 1000}k` : String(hz);
}

function gainSlider(
  label: string,
  onInput: (value: number) => void,
): { row: HTMLElement; input: HTMLInputElement } {
  const input = h('input', {
    type: 'range',
    min: '-20',
    max: '20',
    step: '1',
    value: '0',
    'aria-label': label,
  }) as HTMLInputElement;
  input.addEventListener('input', () => onInput(Number(input.value)));
  const row = h('label', { class: 'tool-row eq-row' }, [
    h('span', { class: 'tool-label eq-label' }, [label]),
    input,
  ]);
  return { row, input };
}

function createEqualizerSection(): HTMLElement {
  const enable = chip(t('eq.enable'), () => void equalizer.toggle());
  const preset = h(
    'select',
    { class: 'eq-preset', 'aria-label': t('eq.preset') },
    EQ_PRESETS.map((p) => h('option', { value: p.name }, [t(`eq.preset_${p.name}`)])),
  ) as HTMLSelectElement;
  preset.addEventListener('change', () => void equalizer.applyPreset(preset.value));

  const preamp = gainSlider(t('eq.preamp'), (v) => void equalizer.setPreamp(v));
  const bands = EQ_BANDS.map((hz, i) =>
    gainSlider(freqLabel(hz), (v) => void equalizer.setBand(i, v)),
  );

  const section = h('section', { class: 'tool-section' }, [
    h('h3', { class: 'tool-title' }, [t('eq.title')]),
    h('div', { class: 'chip-row' }, [enable, preset]),
    preamp.row,
    h('div', { class: 'eq-bands' }, [...bands.map((b) => b.row)]),
  ]);

  equalizerStore.subscribe((s: EqualizerState) => {
    enable.classList.toggle('active', s.enabled);
    if (s.preset !== 'custom') preset.value = s.preset;
    preamp.input.value = String(s.preamp);
    s.gains.forEach((g, i) => (bands[i].input.value = String(g)));
  });
  return section;
}

function createChaptersSection(): HTMLElement {
  const list = h('div', { class: 'chapter-list' });
  const section = h('section', { class: 'tool-section', hidden: true }, [
    h('h3', { class: 'tool-title' }, [t('chapters.title')]),
    h('div', { class: 'chip-row' }, [
      chip('‹', () => void chapters.prev()),
      chip('›', () => void chapters.next()),
    ]),
    list,
  ]);

  chaptersStore.subscribe((s: ChaptersState) => {
    section.hidden = s.count < 1;
    if (s.count > 0 && s.titles.length !== s.count) void chapters.refresh();
    list.replaceChildren(
      ...s.titles.map((title, i) =>
        h(
          'button',
          {
            class: `chapter-chip${i === s.current ? ' current' : ''}`,
            type: 'button',
            onclick: () => void chapters.goTo(i),
          },
          [`${i + 1}. ${title}`],
        ),
      ),
    );
  });
  return section;
}

export function createToolsPanel(): HTMLElement {
  const aspect = chip(t('tools.aspect'), () => void video.cycleAspect());
  const rotate = chip(t('tools.rotate'), () => void video.rotate());
  const deint = chip(t('tools.deinterlace'), () => void video.toggleDeinterlace());
  const zoomOut = chip('−', () => void video.zoomOut());
  const zoomReset = chip('100%', () => void video.zoomReset());
  const zoomIn = chip('+', () => void video.zoomIn());

  const brightness = eqSlider('brightness', t('tools.brightness'));
  const contrast = eqSlider('contrast', t('tools.contrast'));
  const gamma = eqSlider('gamma', t('tools.gamma'));
  const saturation = eqSlider('saturation', t('tools.saturation'));
  const hue = eqSlider('hue', t('tools.hue'));

  const audioDelayValue = h('span', { class: 'delay-value' }, ['0.0s']);
  const subDelayValue = h('span', { class: 'delay-value' }, ['0.0s']);
  const abButton = chip(abLoopLabel(), () => void toggleAbLoop());

  const infoBox = h('div', { class: 'media-info', hidden: true });
  const infoBtn = chip(t('tools.media_info'), async () => {
    const info = await player.mediaInfo();
    infoBox.hidden = false;
    infoBox.replaceChildren(
      infoRow(t('mediainfo.file'), info.filename ?? '—'),
      infoRow(t('mediainfo.resolution'), info.width ? `${info.width}×${info.height}` : '—'),
      infoRow(t('mediainfo.video_codec'), info.videoCodec ?? '—'),
      infoRow(t('mediainfo.audio_codec'), info.audioCodec ?? '—'),
      infoRow(t('mediainfo.fps'), info.fps ? info.fps.toFixed(2) : '—'),
      infoRow(t('mediainfo.tracks'), String(info.tracks.length)),
    );
  });

  const header = h('header', { class: 'panel-header' }, [
    h('h2', {}, [t('tools.title')]),
    h(
      'button',
      {
        class: 'icon-btn small',
        type: 'button',
        'aria-label': t('settings.close'),
        onclick: () => uiStore.update({ toolsOpen: false }),
      },
      [icon('close')],
    ),
  ]);

  const panel = h('aside', { class: 'panel tools-panel' }, [
    header,
    section(t('tools.video'), [
      h('div', { class: 'chip-row' }, [aspect, rotate, deint]),
      h('div', { class: 'chip-row' }, [
        h('span', { class: 'tool-label' }, [t('tools.zoom')]),
        zoomOut,
        zoomReset,
        zoomIn,
      ]),
    ]),
    section(t('tools.equalizer'), [
      brightness.row,
      contrast.row,
      gamma.row,
      saturation.row,
      hue.row,
      h('div', { class: 'chip-row' }, [chip(t('tools.reset'), () => void video.resetEq())]),
    ]),
    createChaptersSection(),
    section(t('tools.audio'), [
      delayControls(
        t('tools.audio_delay'),
        audioDelayValue,
        (d) => void video.nudgeAudioDelay(d),
        () => mpv.cycleAudioTrack(),
      ),
    ]),
    createEqualizerSection(),
    section(t('subtitle.title'), [
      delayControls(
        t('tools.subtitle_delay'),
        subDelayValue,
        (d) => void video.nudgeSubDelay(d),
        () => mpv.cycleSubtitle(),
      ),
      h('div', { class: 'chip-row' }, [chip(t('subtitle.auto_generate'), autoSubtitles)]),
    ]),
    section(t('tools.ab_loop'), [h('div', { class: 'chip-row' }, [abButton, infoBtn]), infoBox]),
  ]);

  videoStore.subscribe((v: VideoState) => {
    brightness.input.value = String(v.brightness);
    contrast.input.value = String(v.contrast);
    gamma.input.value = String(v.gamma);
    saturation.input.value = String(v.saturation);
    hue.input.value = String(v.hue);
    audioDelayValue.textContent = `${v.audioDelay.toFixed(1)}s`;
    subDelayValue.textContent = `${v.subDelay.toFixed(1)}s`;
    abButton.textContent = abLoopLabel();
    deint.classList.toggle('active', v.deinterlace);
    zoomReset.textContent = `${Math.round(2 ** v.zoom * 100)}%`;
  });
  uiStore.subscribe((ui) => panel.classList.toggle('open', ui.toolsOpen));
  return panel;
}

async function autoSubtitles(): Promise<void> {
  const url = playerStore.get().url;
  if (!url) return;
  try {
    await whisper.generate(url);
    toast(t('task.generating_subtitles', { percent: 0 }));
  } catch (err) {
    toast(describeError(err), 'error');
  }
}

function delayControls(
  label: string,
  value: HTMLElement,
  nudge: (delta: number) => void,
  cycle: () => void,
): HTMLElement {
  return h('div', { class: 'chip-row' }, [
    h('span', { class: 'tool-label' }, [label]),
    chip('−', () => nudge(-0.1)),
    value,
    chip('+', () => nudge(0.1)),
    chip(t('tools.cycle'), cycle),
  ]);
}

function infoRow(label: string, value: string): HTMLElement {
  return h('div', { class: 'info-row' }, [
    h('span', { class: 'info-label' }, [label]),
    h('span', { class: 'info-value' }, [value]),
  ]);
}
