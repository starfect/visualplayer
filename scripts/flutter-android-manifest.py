#!/usr/bin/env python3
"""Customize the Flutter-generated AndroidManifest for VisualPlayer.

Sets a proper display label and grants the read-media permissions the player
needs to open files the user picks. Media is opened through the in-app file
picker (which yields a readable path), so no custom intent handling is required.

Usage: flutter-android-manifest.py <app/android dir>
"""

import sys

PERMISSIONS = (
    '    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />\n'
    '    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />\n'
    '    <uses-permission android:name="android.permission.INTERNET" />\n'
)


def main() -> int:
    root = sys.argv[1]
    path = f"{root}/android/app/src/main/AndroidManifest.xml"
    with open(path, encoding="utf-8") as handle:
        xml = handle.read()

    xml = xml.replace('android:label="visualplayer"', 'android:label="VisualPlayer"')

    if "READ_MEDIA_VIDEO" not in xml:
        marker = "<application"
        idx = xml.find(marker)
        if idx == -1:
            print("error: no <application> tag", file=sys.stderr)
            return 1
        xml = xml[:idx] + PERMISSIONS + xml[idx:]

    with open(path, "w", encoding="utf-8") as handle:
        handle.write(xml)
    print("customized", path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
