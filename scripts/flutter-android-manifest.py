#!/usr/bin/env python3
"""Customize the Flutter-generated AndroidManifest for VisualPlayer.

Applies everything the player needs on top of the freshly generated manifest:

* a proper display label;
* the read-media permissions used to open files the user picks, plus the
  foreground-service permissions audio_service needs for background playback;
* the audio_service ``<service>`` / ``<receiver>`` declarations that drive the
  media notification and lock-screen controls;
* ``android:supportsPictureInPicture`` on the launcher activity so the video
  can pop out into a floating mini-player.

Media is opened through the in-app file picker (which yields a readable path),
so no custom intent handling is required.

Usage: flutter-android-manifest.py <app/android dir>
"""

import sys

PERMISSIONS = (
    '    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />\n'
    '    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />\n'
    '    <uses-permission android:name="android.permission.INTERNET" />\n'
    '    <uses-permission android:name="android.permission.WAKE_LOCK" />\n'
    '    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />\n'
    '    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />\n'
)

# audio_service media session: a MediaBrowserService and a media-button receiver.
AUDIO_SERVICE = (
    "        <service\n"
    '            android:name="com.ryanheise.audioservice.AudioService"\n'
    '            android:foregroundServiceType="mediaPlayback"\n'
    '            android:exported="true">\n'
    "            <intent-filter>\n"
    '                <action android:name="android.media.browse.MediaBrowserService" />\n'
    "            </intent-filter>\n"
    "        </service>\n"
    "        <receiver\n"
    '            android:name="com.ryanheise.audioservice.MediaButtonReceiver"\n'
    '            android:exported="true">\n'
    "            <intent-filter>\n"
    '                <action android:name="android.intent.action.MEDIA_BUTTON" />\n'
    "            </intent-filter>\n"
    "        </receiver>\n"
)


def main() -> int:
    root = sys.argv[1]
    path = f"{root}/android/app/src/main/AndroidManifest.xml"
    with open(path, encoding="utf-8") as handle:
        xml = handle.read()

    xml = xml.replace('android:label="visualplayer"', 'android:label="VisualPlayer"')

    if "READ_MEDIA_VIDEO" not in xml:
        idx = xml.find("<application")
        if idx == -1:
            print("error: no <application> tag", file=sys.stderr)
            return 1
        xml = xml[:idx] + PERMISSIONS + xml[idx:]

    # Let the launcher activity enter Picture-in-Picture.
    if "supportsPictureInPicture" not in xml:
        xml = xml.replace(
            'android:name=".MainActivity"',
            'android:name=".MainActivity"\n'
            '            android:supportsPictureInPicture="true"',
            1,
        )

    # Register the media-session service/receiver inside <application>.
    if "com.ryanheise.audioservice.AudioService" not in xml:
        idx = xml.rfind("</application>")
        if idx == -1:
            print("error: no </application> tag", file=sys.stderr)
            return 1
        xml = xml[:idx] + AUDIO_SERVICE + xml[idx:]

    with open(path, "w", encoding="utf-8") as handle:
        handle.write(xml)
    print("customized", path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
