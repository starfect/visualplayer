import 'dart:math' as math;

/// ISO 10-band graphic-equalizer centre frequencies (Hz).
const List<int> kEqBands = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

class EqPreset {
  const EqPreset(this.id, this.preamp, this.gains);
  final String id;
  final double preamp;
  final List<double> gains;
}

const List<EqPreset> kEqPresets = [
  EqPreset('flat', 0, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  EqPreset('rock', 0, [7, 4, -4, -6, -2, 2, 5, 7, 8, 8]),
  EqPreset('pop', 0, [-1, 3, 5, 6, 5, 2, -1, -1, -1, -2]),
  EqPreset('jazz', 0, [4, 3, 1, 2, -2, -2, 0, 1, 3, 4]),
  EqPreset('classical', 0, [5, 4, 3, 2, -1, -1, 0, 2, 3, 4]),
  EqPreset('dance', 0, [8, 6, 2, 0, 0, -3, -4, -4, 1, 0]),
  EqPreset('bass', 0, [10, 8, 6, 3, 1, 0, 0, 0, 0, 0]),
  EqPreset('treble', 0, [0, 0, 0, 0, 0, 2, 4, 7, 9, 10]),
  EqPreset('vocal', 0, [-3, -2, 0, 3, 5, 5, 4, 2, 0, -2]),
  EqPreset('soft', 0, [4, 2, 1, 0, -1, -1, 0, 2, 4, 5]),
];

/// Build the mpv `af` value (a libavfilter graph of peaking equalizers plus an
/// optional pre-amp). Returns an empty string when nothing is applied.
String buildAudioFilter(double preamp, List<double> gains) {
  final filters = <String>[];
  if (preamp != 0) {
    final linear = math.pow(10, preamp / 20).toStringAsFixed(4);
    filters.add('volume=volume=$linear');
  }
  for (var i = 0; i < gains.length && i < kEqBands.length; i++) {
    if (gains[i] != 0) {
      filters.add('equalizer=f=${kEqBands[i]}:t=o:w=2:g=${gains[i]}');
    }
  }
  return filters.isEmpty ? '' : 'lavfi=[${filters.join(',')}]';
}
