#!/usr/bin/env python3
"""Force `compileSdk = 36` on every Gradle module of the Flutter Android project.

Why this is needed and tricky:
- `flutter_plugin_android_lifecycle` (pulled by `media_kit_video`) marks its AAR
  with `minCompileSdk=36`, so every consuming module must compile against API 36.
- Some plugins hardcode a lower level (e.g. `file_picker` sets `compileSdk 34`),
  and the Flutter SDK default is also below 36 — so those modules fail the AAR
  metadata check.
- The override therefore has to run *after* each module's own `android {}` block
  sets `compileSdk`, otherwise that assignment wins. We use `afterEvaluate`, but
  Flutter's root forces early evaluation (`evaluationDependsOn(":app")`), so for
  modules that are already evaluated we apply the change immediately instead of
  scheduling another `afterEvaluate` (which would throw "already evaluated").

Usage: flutter-android-compilesdk.py <android/build.gradle.kts>
"""

import sys

MARKER = "// visualplayer: force compileSdk"

BLOCK = '''
// visualplayer: force compileSdk 36 on the app and every plugin module.
subprojects {
    val sub = this
    fun forceCompileSdk() {
        val androidExtension = sub.extensions.findByName("android") ?: return
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
    if (sub.state.executed) {
        forceCompileSdk()
    } else {
        sub.afterEvaluate { forceCompileSdk() }
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
