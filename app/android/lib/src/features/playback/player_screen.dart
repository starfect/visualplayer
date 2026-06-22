import 'dart:async';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:media_kit_video/media_kit_video.dart';

import '../equalizer/equalizer.dart';
import '../../core/i18n.dart';
import '../../core/models.dart';
import '../history/history.dart';
import 'player_controller.dart';
import '../settings/settings.dart';

class PlayerScreen extends StatefulWidget {
  const PlayerScreen({
    super.key,
    required this.queue,
    required this.index,
    required this.history,
    required this.settings,
  });

  final List<MediaItem> queue;
  final int index;
  final History history;
  final Settings settings;

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  final PlayerController _pc = PlayerController();
  Timer? _hideTimer;
  Timer? _saveTimer;
  bool _controlsVisible = true;
  double _dim = 0;
  late int _index;

  @override
  void initState() {
    super.initState();
    _index = widget.index;
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _openCurrent();
    _scheduleHide();
    _saveTimer = Timer.periodic(const Duration(seconds: 10), (_) => _record());
    _pc.player.stream.completed.listen((done) {
      if (done) _playNext();
    });
  }

  MediaItem get _item => widget.queue[_index];

  Future<void> _openCurrent() async {
    Duration? start;
    if (widget.settings.resume) {
      final pos = widget.history.resumePosition(_item.path);
      if (pos != null && pos > 1) start = Duration(seconds: pos);
    }
    await _pc.open(_item.path, start: start);
  }

  void _record() {
    final pos = _pc.player.state.position.inSeconds;
    final dur = _pc.player.state.duration.inSeconds;
    if (dur > 0) {
      widget.history.record(_item.path,
          title: _item.title, position: pos, duration: dur);
    }
  }

  Future<void> _playNext() async {
    if (_index + 1 < widget.queue.length) {
      setState(() => _index += 1);
      await _openCurrent();
    }
  }

  Future<void> _playPrev() async {
    if (_index > 0) {
      setState(() => _index -= 1);
      await _openCurrent();
    }
  }

  void _scheduleHide() {
    _hideTimer?.cancel();
    _hideTimer = Timer(const Duration(seconds: 3), () {
      if (mounted && _pc.player.state.playing) {
        setState(() => _controlsVisible = false);
      }
    });
  }

  void _toggleControls() {
    setState(() => _controlsVisible = !_controlsVisible);
    if (_controlsVisible) _scheduleHide();
  }

  @override
  void dispose() {
    _record();
    _hideTimer?.cancel();
    _saveTimer?.cancel();
    _pc.dispose();
    SystemChrome.setPreferredOrientations(DeviceOrientation.values);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: GestureDetector(
        onTap: _toggleControls,
        onDoubleTapDown: _onDoubleTap,
        onHorizontalDragUpdate: _onSeekDrag,
        onVerticalDragUpdate: _onVerticalDrag,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Video(controller: _pc.controller, controls: NoVideoControls),
            IgnorePointer(
              child: Container(color: Colors.black.withValues(alpha: _dim)),
            ),
            AnimatedOpacity(
              opacity: _controlsVisible ? 1 : 0,
              duration: const Duration(milliseconds: 200),
              child: _controls(),
            ),
          ],
        ),
      ),
    );
  }

  // ---- Gestures ----------------------------------------------------------
  void _onDoubleTap(TapDownDetails details) {
    final width = MediaQuery.of(context).size.width;
    final forward = details.globalPosition.dx > width / 2;
    final pos = _pc.player.state.position;
    _pc.player.seek(pos + Duration(seconds: forward ? 10 : -10));
  }

  void _onSeekDrag(DragUpdateDetails details) {
    final pos = _pc.player.state.position;
    final target = pos + Duration(milliseconds: (details.delta.dx * 600).round());
    _pc.player.seek(target.isNegative ? Duration.zero : target);
  }

  void _onVerticalDrag(DragUpdateDetails details) {
    final width = MediaQuery.of(context).size.width;
    final delta = -details.delta.dy / 200;
    if (details.globalPosition.dx > width / 2) {
      final v = (_pc.player.state.volume + delta * 100).clamp(0, 100).toDouble();
      _pc.player.setVolume(v);
    } else {
      setState(() => _dim = (_dim - delta).clamp(0.0, 0.85));
    }
  }

  // ---- Controls ----------------------------------------------------------
  Widget _controls() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Colors.black54, Colors.transparent, Colors.black54],
        ),
      ),
      child: Column(
        children: [
          SafeArea(
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back, color: Colors.white),
                  onPressed: () => Navigator.of(context).maybePop(),
                ),
                Expanded(
                  child: Text(
                    _item.displayTitle,
                    style: const TextStyle(color: Colors.white),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          const Spacer(),
          _seekRow(),
          _buttonRow(),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _seekRow() {
    return StreamBuilder<Duration>(
      stream: _pc.player.stream.position,
      builder: (context, snapshot) {
        final pos = snapshot.data ?? Duration.zero;
        final dur = _pc.player.state.duration;
        final max = dur.inMilliseconds.toDouble();
        final value = pos.inMilliseconds.clamp(0, max.toInt()).toDouble();
        return Row(
          children: [
            const SizedBox(width: 12),
            Text(_fmt(pos), style: const TextStyle(color: Colors.white)),
            Expanded(
              child: Slider(
                value: max > 0 ? value : 0,
                max: max > 0 ? max : 1,
                onChanged: (v) =>
                    _pc.player.seek(Duration(milliseconds: v.round())),
              ),
            ),
            Text(_fmt(dur), style: const TextStyle(color: Colors.white)),
            const SizedBox(width: 12),
          ],
        );
      },
    );
  }

  Widget _buttonRow() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        IconButton(
          icon: const Icon(Icons.skip_previous, color: Colors.white),
          onPressed: _playPrev,
        ),
        StreamBuilder<bool>(
          stream: _pc.player.stream.playing,
          builder: (context, snapshot) {
            final playing = snapshot.data ?? false;
            return IconButton(
              iconSize: 40,
              icon: Icon(playing ? Icons.pause : Icons.play_arrow,
                  color: Colors.white),
              onPressed: () {
                _pc.player.playOrPause();
                _scheduleHide();
              },
            );
          },
        ),
        IconButton(
          icon: const Icon(Icons.skip_next, color: Colors.white),
          onPressed: _playNext,
        ),
        IconButton(
          icon: const Icon(Icons.closed_caption, color: Colors.white),
          onPressed: _showSubtitles,
        ),
        IconButton(
          icon: const Icon(Icons.graphic_eq, color: Colors.white),
          onPressed: _showEqualizer,
        ),
        IconButton(
          icon: const Icon(Icons.bookmark, color: Colors.white),
          onPressed: _showChapters,
        ),
        IconButton(
          icon: const Icon(Icons.speed, color: Colors.white),
          onPressed: _showSpeed,
        ),
      ],
    );
  }

  // ---- Panels ------------------------------------------------------------
  void _sheet(Widget child) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surface,
      builder: (_) => SafeArea(child: Padding(padding: const EdgeInsets.all(16), child: child)),
    );
  }

  Future<void> _showSubtitles() async {
    _sheet(Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        ListTile(
          leading: const Icon(Icons.add),
          title: Text(L.t('player.add_subtitle')),
          onTap: () async {
            Navigator.of(context).pop();
            final result = await FilePicker.platform.pickFiles(type: FileType.any);
            final path = result?.files.single.path;
            if (path != null) await _pc.addSubtitle(path);
          },
        ),
        ListTile(
          leading: const Icon(Icons.subtitles_off),
          title: Text(L.t('player.no_subtitle')),
          onTap: () {
            Navigator.of(context).pop();
            _pc.disableSubtitle();
          },
        ),
      ],
    ));
  }

  void _showChapters() {
    _sheet(Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        TextButton.icon(
          icon: const Icon(Icons.skip_previous),
          label: Text(L.t('player.prev_chapter')),
          onPressed: _pc.prevChapter,
        ),
        TextButton.icon(
          icon: const Icon(Icons.skip_next),
          label: Text(L.t('player.next_chapter')),
          onPressed: _pc.nextChapter,
        ),
      ],
    ));
  }

  void _showSpeed() {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    _sheet(Wrap(
      spacing: 8,
      children: speeds
          .map((s) => ActionChip(
                label: Text('${s}x'),
                onPressed: () {
                  _pc.player.setRate(s);
                  Navigator.of(context).pop();
                },
              ))
          .toList(),
    ));
  }

  void _showEqualizer() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surface,
      isScrollControlled: true,
      builder: (_) => _EqualizerSheet(controller: _pc),
    );
  }

  static String _fmt(Duration d) {
    final h = d.inHours;
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return h > 0 ? '$h:$m:$s' : '${d.inMinutes}:$s';
  }
}

class _EqualizerSheet extends StatefulWidget {
  const _EqualizerSheet({required this.controller});
  final PlayerController controller;

  @override
  State<_EqualizerSheet> createState() => _EqualizerSheetState();
}

class _EqualizerSheetState extends State<_EqualizerSheet> {
  String _preset = 'flat';

  @override
  Widget build(BuildContext context) {
    final pc = widget.controller;
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(L.t('player.eq_enable')),
              value: pc.eqEnabled,
              onChanged: (v) {
                setState(() => pc.eqEnabled = v);
                pc.applyEqualizer();
              },
            ),
            Wrap(
              spacing: 8,
              children: kEqPresets
                  .map((preset) => ChoiceChip(
                        label: Text(L.t('eq.${preset.id}')),
                        selected: _preset == preset.id,
                        onSelected: (_) {
                          setState(() {
                            _preset = preset.id;
                            pc.preamp = preset.preamp;
                            pc.gains = List<double>.from(preset.gains);
                            pc.eqEnabled = preset.id != 'flat';
                          });
                          pc.applyEqualizer();
                        },
                      ))
                  .toList(),
            ),
            const SizedBox(height: 8),
            for (var i = 0; i < kEqBands.length; i++)
              Row(
                children: [
                  SizedBox(
                    width: 44,
                    child: Text(
                      kEqBands[i] >= 1000 ? '${kEqBands[i] ~/ 1000}k' : '${kEqBands[i]}',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                  Expanded(
                    child: Slider(
                      min: -20,
                      max: 20,
                      value: pc.gains[i],
                      onChanged: (v) {
                        setState(() {
                          pc.gains[i] = v;
                          _preset = 'custom';
                          pc.eqEnabled = true;
                        });
                        pc.applyEqualizer();
                      },
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
