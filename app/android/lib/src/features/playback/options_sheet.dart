import 'package:flutter/material.dart';

import '../../core/i18n.dart';
import 'player_controller.dart';

/// Real-time video colour + geometry adjustments (mpv): brightness, contrast,
/// saturation, gamma, hue and zoom.
class VideoAdjustSheet extends StatefulWidget {
  const VideoAdjustSheet({super.key, required this.controller});

  final PlayerController controller;

  @override
  State<VideoAdjustSheet> createState() => _VideoAdjustSheetState();
}

class _VideoAdjustSheetState extends State<VideoAdjustSheet> {
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
            Row(
              children: [
                Text(L.t('adjust.title'), style: Theme.of(context).textTheme.titleMedium),
                const Spacer(),
                TextButton(
                  onPressed: () {
                    pc.resetAdjustments();
                    pc.setZoom(0);
                    setState(() {});
                  },
                  child: Text(L.t('common.reset')),
                ),
              ],
            ),
            for (final channel in kVideoAdjustments)
              _row(
                L.t('adjust.$channel'),
                pc.adjustments[channel]!,
                -100,
                100,
                (v) {
                  setState(() => pc.adjustments[channel] = v);
                  pc.setAdjustment(channel, v);
                },
              ),
            _row(L.t('adjust.zoom'), pc.zoom, -1, 2, (v) {
              setState(() => pc.zoom = v);
              pc.setZoom(v);
            }),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, double value, double min, double max, ValueChanged<double> onChanged) {
    return Row(
      children: [
        SizedBox(width: 96, child: Text(label)),
        Expanded(child: Slider(min: min, max: max, value: value, onChanged: onChanged)),
      ],
    );
  }
}

/// A simple +/- stepper for audio or subtitle delay (seconds).
class DelaySheet extends StatefulWidget {
  const DelaySheet({
    super.key,
    required this.title,
    required this.initial,
    required this.onChanged,
  });

  final String title;
  final double initial;
  final ValueChanged<double> onChanged;

  @override
  State<DelaySheet> createState() => _DelaySheetState();
}

class _DelaySheetState extends State<DelaySheet> {
  late double _value = widget.initial;

  void _bump(double delta) {
    setState(() => _value = double.parse((_value + delta).toStringAsFixed(2)));
    widget.onChanged(_value);
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(widget.title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton.filledTonal(
                  onPressed: () => _bump(-0.1),
                  icon: const Icon(Icons.remove),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Text('${_value.toStringAsFixed(2)} s',
                      style: Theme.of(context).textTheme.titleLarge),
                ),
                IconButton.filledTonal(
                  onPressed: () => _bump(0.1),
                  icon: const Icon(Icons.add),
                ),
              ],
            ),
            TextButton(
              onPressed: () => _bump(-_value),
              child: Text(L.t('common.reset')),
            ),
          ],
        ),
      ),
    );
  }
}
