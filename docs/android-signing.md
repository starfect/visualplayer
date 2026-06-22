# Android release signing

The release workflow builds **per-ABI APKs** (`arm64-v8a`, `armeabi-v7a`, `x86`,
`x86_64`) so each download is a fraction of the size of a universal APK. When the
keystore secrets below are configured, those APKs are built as a **signed
release**; otherwise the workflow falls back to debug-signed APKs so CI never
breaks.

## 1. Create an upload keystore (once, on your machine)

```sh
keytool -genkey -v -keystore visualplayer-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Keep `visualplayer-upload.jks` and the passwords safe and private — losing the
key means you can no longer ship updates under the same signature.

## 2. Add the repository secrets

In **GitHub → repo → Settings → Secrets and variables → Actions**, add:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | the keystore, base64-encoded (see below) |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore (store) password |
| `ANDROID_KEY_ALIAS` | the key alias (e.g. `upload`) |
| `ANDROID_KEY_PASSWORD` | the key password (optional; defaults to the store password) |

Encode the keystore for the secret:

```sh
base64 -w0 visualplayer-upload.jks   # Linux
base64 visualplayer-upload.jks       # macOS
```

## 3. That's it

On the next push to `main`, the `android` job decodes the keystore, writes a
`keystore.properties`, patches the generated `app/build.gradle.kts` via
`scripts/android-signing.py`, and produces signed per-ABI release APKs that are
uploaded to the GitHub release as `VisualPlayer-<version>-<abi>-release.apk`.

Keystore files (`*.jks`, `*.keystore`, `keystore.properties`) are git-ignored and
only ever exist on the CI runner — they are never committed.
