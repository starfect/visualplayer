#!/usr/bin/env python3
"""Inject a release signing config into a Tauri-generated Android build.gradle.kts.

Idempotent: if the file already loads `keystore.properties`, it is left untouched.
The signing config reads credentials from `keystore.properties` in the Gradle root
project at build time, so no secrets are ever written into tracked sources.

Usage: android-signing.py <path/to/app/build.gradle.kts>
"""

import re
import sys

IMPORTS = "import java.io.FileInputStream\nimport java.util.Properties\n"

LOADER = (
    "\nval keystorePropertiesFile = rootProject.file(\"keystore.properties\")\n"
    "val keystoreProperties = Properties()\n"
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
    "            storePassword = keystoreProperties[\"password\"] as String\n"
    "        }\n"
    "    }\n"
)

RELEASE_SIGNING_LINE = '\n            signingConfig = signingConfigs.getByName("release")'


def find_block(text: str, header: str):
    """Return (open_brace_index, close_brace_index) of the first brace block whose
    header matches `header`, using brace counting."""
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

    if "keystore.properties" in src:
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

    block = find_block(src, r'getByName\("release"\)\s*\{')
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
