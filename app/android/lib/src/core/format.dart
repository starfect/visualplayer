/// Shared formatting helpers.
class Format {
  /// `h:mm:ss` or `m:ss` for a [Duration].
  static String duration(Duration d) {
    final hours = d.inHours;
    final minutes = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return hours > 0 ? '$hours:$minutes:$seconds' : '${d.inMinutes}:$seconds';
  }

  /// `h:mm:ss` / `m:ss` for a whole-second count.
  static String seconds(int totalSeconds) =>
      duration(Duration(seconds: totalSeconds < 0 ? 0 : totalSeconds));

  /// Human-readable byte size.
  static String bytes(int value) {
    if (value <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    var size = value.toDouble();
    var unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    return '${size.toStringAsFixed(unit == 0 ? 0 : 1)} ${units[unit]}';
  }
}
