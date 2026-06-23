#!/usr/bin/env python3
"""Make the Flutter MainActivity extend audio_service's AudioServiceActivity.

audio_service needs the host activity to derive from ``AudioServiceActivity`` so
the running Flutter engine is shared with the background media session. The
Flutter-generated ``MainActivity.kt`` extends ``FlutterActivity``; this rewrites
it to extend ``AudioServiceActivity`` instead. Idempotent.

Usage: flutter-android-mainactivity.py <app/android dir>
"""

import glob
import sys


def main() -> int:
    root = sys.argv[1]
    matches = glob.glob(
        f"{root}/android/app/src/main/kotlin/**/MainActivity.kt", recursive=True
    )
    if not matches:
        print("error: MainActivity.kt not found", file=sys.stderr)
        return 1
    path = matches[0]
    with open(path, encoding="utf-8") as handle:
        src = handle.read()

    if "AudioServiceActivity" in src:
        print("already patched", path)
        return 0

    src = src.replace(
        "import io.flutter.embedding.android.FlutterActivity",
        "import com.ryanheise.audioservice.AudioServiceActivity",
    )
    src = src.replace(": FlutterActivity()", ": AudioServiceActivity()")
    src = src.replace(": FlutterActivity(", ": AudioServiceActivity(")

    with open(path, "w", encoding="utf-8") as handle:
        handle.write(src)
    print("patched", path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
