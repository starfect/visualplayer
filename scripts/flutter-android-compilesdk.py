#!/usr/bin/env python3
"""Force `compileSdk = 36` on every Gradle module of the Flutter Android project.

Newer Flutter plugins (e.g. `flutter_plugin_android_lifecycle`, pulled by
`media_kit_video`) require consumers to compile against Android API 36, but the
Flutter SDK default is lower — so plugin modules like `file_picker` fail the AAR
metadata check. Setting `compileSdk` only on the app does not help; it must be
applied to every subproject. This appends a root-project `subprojects` hook that
does so via reflection (compatible across AGP DSL variants).

Usage: flutter-android-compilesdk.py <android/build.gradle.kts>
"""

import sys

MARKER = "// visualplayer: force compileSdk"

BLOCK = '''
// visualplayer: force compileSdk 36 on the app and every plugin module.
subprojects {
    afterEvaluate {
        val androidExtension = project.extensions.findByName("android") ?: return@afterEvaluate
        runCatching {
            androidExtension.javaClass.methods
                .firstOrNull { it.name == "setCompileSdk" && it.parameterTypes.size == 1 }
                ?.invoke(androidExtension, 36)
        }
        runCatching {
            androidExtension.javaClass.methods
                .firstOrNull {
                    it.name == "compileSdkVersion" &&
                        it.parameterTypes.size == 1 &&
                        it.parameterTypes[0] == Integer.TYPE
                }
                ?.invoke(androidExtension, 36)
        }
    }
}
'''


def main() -> int:
    path = sys.argv[1]
    with open(path, encoding="utf-8") as handle:
        src = handle.read()
    if MARKER in src:
        print("compileSdk override already present")
        return 0
    with open(path, "a", encoding="utf-8") as handle:
        handle.write("\n" + BLOCK)
    print("appended compileSdk override to", path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
