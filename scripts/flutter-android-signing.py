#!/usr/bin/env python3
"""Inject release signing into a Flutter-generated `android/app/build.gradle.kts`.

Reads credentials from `key.properties` (Gradle root project) at build time, so
no secrets are written into tracked sources. Idempotent: if the file already
loads `key.properties`, it is left untouched.

Usage: flutter-android-signing.py <android/app/build.gradle.kts>
"""

import re
import sys

IMPORTS = "import java.util.Properties\nimport java.io.FileInputStream\n"

LOADER = (
    "\nval keystoreProperties = Properties()\n"
    "val keystorePropertiesFile = rootProject.file(\"key.properties\")\n"
    "if (keystorePropertiesFile.exists()) {\n"
    "    keystoreProperties.load(FileInputStream(keystorePropertiesFile))\n"
    "}\n\n"
)

SIGNING_CONFIGS = (
    "\n    signingConfigs {\n"
    "        create(\"release\") {\n"
    "            keyAlias = keystoreProperties[\"keyAlias\"] as String\n"
    "            keyPassword = keystoreProperties[\"keyPassword\"] as String\n"
    "            storeFile = file(keystoreProperties[\"storeFile\"] as String)\n"
    "            storePassword = keystoreProperties[\"storePassword\"] as String\n"
    "        }\n"
    "    }\n"
)

RELEASE_SIGNING_LINE = '\n            signingConfig = signingConfigs.getByName("release")'


def find_block(text: str, header: str):
    match = re.search(header, text)
    if not match:
        return None
    open_idx = text.index("{", match.start())
    depth = 0
    for i in range(open_idx, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return open_idx, i
    return None


def main() -> int:
    path = sys.argv[1]
    with open(path, encoding="utf-8") as handle:
        src = handle.read()

    if "key.properties" in src:
        print("signing config already present; nothing to patch")
        return 0

    src = IMPORTS + src

    android = re.search(r"(?m)^android\s*\{", src)
    if not android:
        print("error: could not find `android {` block", file=sys.stderr)
        return 1
    src = src[: android.start()] + LOADER + src[android.start() :]

    android = re.search(r"(?m)^android\s*\{", src)
    assert android is not None
    src = src[: android.end()] + SIGNING_CONFIGS + src[android.end() :]

    # Flutter's release buildType is written as `release {` (Kotlin DSL).
    block = find_block(src, r'(?m)^\s*release\s*\{')
    if not block:
        print("error: could not find release buildType block", file=sys.stderr)
        return 1
    open_idx, close_idx = block
    body = src[open_idx + 1 : close_idx]
    if "signingConfig" in body:
        body = re.sub(
            r'signingConfig\s*=\s*signingConfigs\.getByName\([^)]*\)',
            'signingConfig = signingConfigs.getByName("release")',
            body,
        )
    else:
        body = RELEASE_SIGNING_LINE + body
    src = src[: open_idx + 1] + body + src[close_idx:]

    with open(path, "w", encoding="utf-8") as handle:
        handle.write(src)
    print("patched", path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
