<div align="center">

# VisualPlayer 개발 설명서 (BLUEPRINT)

<img src="resources/icon.svg" alt="VisualPlayer" width="120" />

**간편하게 여러 동영상을 재생할 수 있는 비영리(non-profit) 크로스 플랫폼 앱**

`Rust · Tauri 2 · Swift` ｜ `Windows · macOS · Linux · Android · iOS`

> 이 프로젝트는 **비영리 목적**으로 개발·배포됩니다.

</div>

---

> **문서 메타데이터**
> - 문서 버전: `v2.1` (보강판 · 비영리/GPL/i18n 반영)
> - 대상 앱 버전: `0.1.0` (개발 시작 단계)
> - 성격: **비영리(non-profit) 오픈소스 프로젝트**
> - 라이선스: 자체 소스 Apache-2.0 / 배포 바이너리는 GPL 구성요소 포함 시 GPLv3 (§18)
> - 저작권: © 2026 starfect
> - 목적: **Claude Code 자동화 작업의 단일 기준 문서(Single Source of Truth)**

---

## 0. 이 문서를 읽는 에이전트/개발자를 위한 지침

이 문서는 VisualPlayer의 **설계 기준 문서**다. 코드를 작성하거나 구조를 변경하기 전, 항상 이 문서를 먼저 확인하고, 문서와 충돌하는 결정을 내릴 경우 **먼저 문서를 갱신한 뒤** 코드를 작성한다.

### 0.1 작업 원칙

- **검증 우선**: Rust 코드 작성 후에는 항상 `cargo check`와 `cargo clippy`를 실행해 컴파일과 린트를 확인한다. 검증 없이 "완료"를 선언하지 않는다.
- **계획 후 구현**: 새 기능/리팩터링은 먼저 설계(영향 범위, 변경 파일, 명령 시그니처)를 제시하고 승인을 받은 뒤 구현한다.
- **타입 있는 에러 선호**: 검증 경로에서는 `anyhow` 대신 명시적 에러 타입을 사용해 복구 가능/불가능 에러를 구분한다.
- **로그 파일 직접 열람 금지**: 로그가 수 GB까지 커질 수 있으므로 `rg`로 필터링하고 `head`/`tail`로 제한해서 본다.
- **작은 단위 커밋**: 한 커밋 = 한 논리적 변경. 컴파일 가능한 상태로 커밋한다.

### 0.2 우선순위 (구현 순서)

1. **MVP**: 로컬 단일 영상/오디오 재생 (libmpv 통합 + 기본 UI)
2. 플레이리스트·다중 재생, 이름이 같은 외부 자막 연동
3. 자동 자막(Whisper), 확장자 변환
4. 커스텀 포맷(`.webvideo`, `.ytvideo`, `.{media}.torrent`)
5. 인스톨러·디자인 마감·iOS 앱

### 0.3 명시적 비목표 (Non-Goals)

- 토렌트 **업로드/시딩** (다운로드 전용)
- 영상 **편집** 기능 (재생기에 집중)
- DRM이 걸린 스트리밍 서비스(넷플릭스 등)의 보호 콘텐츠 재생
- 객체기반 오디오(Dolby Atmos, DTS:X)의 **완전한 공간 렌더링** (코어 디코딩까지만, §8.4 참고)

---

## 1. 프로젝트 개요

VisualPlayer는 하나의 코드 기반(데스크톱·Android는 공유, iOS는 별도)으로 거의 모든 영상·오디오 포맷을 재생하는 경량 미디어 플레이어다. **비영리 목적**의 오픈소스 프로젝트이며, 핵심 차별점은 다음과 같다.

- **광범위한 포맷 지원**: 재생 엔진으로 mpv(FFmpeg 내장)를 사용해 명세의 컨테이너/코덱을 사실상 모두 커버
- **다중 재생**: 여러 영상을 동시에/연속으로 재생
- **자동 자막**: 자막이 없는 미디어도 로컬 Whisper로 자막 생성
- **확장 파일 포맷**: 유튜브/웹/토렌트 링크를 파일로 저장해 더블클릭만으로 재생
- **다국어 지원(i18n)**: 기본 언어 영어, 다국어 UI 제공 (§6.3)

> **비영리 전제의 라이선스 자유도**: 영리 목적이 아니고 소스를 공개하므로, copyleft(소스 공개) 의무를 수용해 **GPL 라이선스 구성요소(예: 전체 빌드 FFmpeg, GPL mpv 등)도 사용**한다. 단, 그 결과 배포 바이너리는 GPL을 따른다(§18).

---

## 2. 기술 스택

### 2.1 데스크톱(PC) · Android — Rust + Tauri

| 레이어 | 기술 | 버전(권장) | 비고 |
| --- | --- | --- | --- |
| 앱 프레임워크 | **Tauri** | `2.x` (현 2.11+) | 데스크톱 + 모바일 단일 코드 |
| 백엔드 언어 | **Rust** | edition `2021`+ | 핵심 로직·미디어 제어 |
| 프론트엔드 | **Vite** (Vanilla TypeScript, 프레임워크 없음) | `5.x`+ | UI 빌드·번들 + UI 레이어. §6 |
| 다국어(i18n) | **i18next** (프레임워크 비종속) 또는 경량 자체 로더 | 최신 | 기본 언어 영어. §6.3 |
| 재생 엔진 | **libmpv** (via `tauri-plugin-libmpv`) | `0.3.x` | §4. mpv = FFmpeg 내장 |
| 토렌트 | **librqbit** | `8.x` | 다운로드 전용·스트리밍 |
| 자동 자막 | **whisper-rs** (whisper.cpp) | `0.16.x` | 로컬 STT |
| 변환/디먹스 | **FFmpeg** (GPL 전체 빌드: x264/x265 등 포함) | `7.x` | 비영리·GPL 허용(§18) |
| 유튜브 추출 | **yt-dlp** (사이드카 바이너리) | 최신 | §10.2 |

> WebView 엔진은 OS 제공(Windows=WebView2, macOS=WKWebView, Linux=WebKitGTK)을 사용하므로 별도 Chromium 번들이 없어 바이너리가 작다.

### 2.2 iOS — Swift (별도 코드베이스)

| 항목 | 기술 |
| --- | --- |
| 언어 | **Swift** (최신) |
| UI | **SwiftUI** + **Liquid Glass** (iOS 26 디자인 언어) |
| 재생 | **AVPlayer**(네이티브 포맷) + **MobileVLCKit**(광범위 포맷, LGPL) |
| 빌드 | **Xcode 로컬 빌드** (GitHub Actions 빌드 대상 아님) |

> iOS는 mpv/FFmpeg 직접 통합 대신, 폭넓은 코덱을 LGPL로 다룰 수 있는 **MobileVLCKit(VLCKit)** 을 1차 후보로 한다. (참고: `ffmpeg-kit` prebuilt는 유지보수가 중단되었으므로 의존하지 않는다.)

### 2.3 검증된 핵심 의존성 요약

- **`tauri-plugin-libmpv`** — Tauri WebView 아래 GPU 레이어에 mpv를 임베드. `init / setProperty / getProperty / observeProperties / command / destroy` API 제공. Windows는 libmpv DLL 자동 다운로드, macOS·Linux는 시스템 libmpv 사용.
- **`librqbit`** — 순수 Rust 토렌트 라이브러리. 시퀀셜/스트리밍 다운로드 + 조각 우선순위로 "받으면서 재생" 지원. 최근 빌드는 **업로드가 기본 비활성화**(feature flag)되어 다운로드 전용 요구와 정확히 일치.
- **`whisper-rs`** — whisper.cpp 바인딩. 세그먼트 타임스탬프(`t0`/`t1`), VAD, GPU(CUDA/Metal/Vulkan) 가속 지원.

---

## 3. 시스템 아키텍처

```
┌──────────────────────────────────────────────────────────┐
│                     VisualPlayer (Tauri)                   │
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │  WebView (Vite + Vanilla TS)  ── UI/컨트롤/상태    │    │  ← 투명 배경
│  │   재생바, 플레이리스트, 설정, 자막 오버레이 UI       │    │
│  └───────────────▲──────────────────────────────────┘    │
│                  │  Tauri IPC (command / event / channel)  │
│  ┌───────────────▼──────────────────────────────────┐    │
│  │              Rust Core (백엔드)                     │    │
│  │  player │ playlist │ subtitle │ whisper │ convert │    │
│  │  torrent(librqbit) │ net(yt-dlp/web) │ fs/assoc   │    │
│  └───────┬──────────────────────────────┬────────────┘    │
│          │ libmpv FFI                    │ HTTP(localhost) │
│  ┌───────▼─────────┐            ┌────────▼──────────┐      │
│  │  mpv 렌더 레이어  │            │  librqbit 스트림   │      │  ← GPU surface
│  │ (영상/오디오 출력) │◀──────────│  서버(127.0.0.1)   │      │
│  └─────────────────┘            └───────────────────┘      │
└──────────────────────────────────────────────────────────┘
```

**핵심 흐름**
1. UI(WebView)는 사용자 입력을 받아 Tauri **command**로 Rust Core에 전달한다.
2. Rust Core는 libmpv에 명령을 보내 재생을 제어하고, mpv 속성 변화(time-pos, duration, pause 등)를 **event/channel**로 WebView에 푸시한다.
3. 영상 화면은 WebView가 아니라 그 아래의 **mpv GPU 레이어**에 렌더된다. WebView는 투명 배경으로 그 위에 컨트롤·자막 UI만 그린다.
4. 토렌트/유튜브/웹 소스는 로컬 HTTP 스트림 URL로 변환되어 mpv에 입력으로 전달된다.

---

## 4. 재생 엔진 (가장 중요한 결정)

### 4.1 왜 libmpv인가

명세는 25종 컨테이너 · 30+ 비디오 코덱 · 40+ 오디오 코덱 · 21종 자막을 요구한다. 이를 직접 구현하는 것은 비현실적이며, **mpv(내부적으로 FFmpeg 사용)** 가 이 목록의 거의 전부를 이미 처리한다. HTML5 `<video>`(WebView)는 코덱 지원이 제한적이라 부적합하다.

### 4.2 임베딩 전략 — `tauri-plugin-libmpv`

- WebView를 **투명 배경**으로 두고, 그 아래 GPU 표면에 mpv가 직접 렌더한다.
- 권장 mpv 설정: `vo=gpu-next`, `hwdec=auto`(하드웨어 디코딩), `media-controls=no`(자체 UI 사용).
- 프론트는 `observeProperties`로 `pause / time-pos / duration / filename / track-list / sub-text` 등을 구독하고, `command`/`setProperty`로 재생을 제어한다.
- **라이브러리 번들링**: Windows는 `libmpv-2.dll` + `libmpv-wrapper.dll`을 `src-tauri/lib/`에 두고 Tauri 번들에 포함. macOS·Linux는 시스템 libmpv(또는 dylib/so 동봉)를 사용한다. 비영리·GPL 허용 정책이므로 코덱 폭이 넓은 **GPL 빌드**를 사용해도 되며, 배포 바이너리는 GPL을 따른다(§18).

### 4.3 대안 및 트레이드오프

| 방식 | 장점 | 단점 |
| --- | --- | --- |
| **libmpv 임베드** (채택) | 광범위 코덱, 자막/하드웨어 디코딩 내장, 고성능 | 네이티브 라이브러리 번들 필요, WebView 위 오버레이 합성 주의 |
| FFmpeg 직접 + wgpu 렌더 | 최대 제어 | 구현량 막대, 동기화/오디오 직접 처리 |
| `tauri-plugin-mpv` (별도 mpv 프로세스 + JSON IPC) | 통합 단순 | mpv가 PATH에 설치되어 있어야 함, 창 합성 제약 |

### 4.4 플랫폼별 재생 백엔드

| 플랫폼 | 백엔드 | 비고 |
| --- | --- | --- |
| Windows/macOS/Linux | **libmpv** | 1차 |
| Android | **libmpv**(가능 시) 또는 **Media3/ExoPlayer** 플러그인 | mpv Android 빌드 또는 네이티브 폴백 |
| iOS | **AVPlayer + MobileVLCKit** | 별도 Swift 코드(§13) |

---

## 5. 폴더 구조

```
.
├── .github/
│   └── workflows/
│       ├── build-desktop.yml      # Win/macOS/Linux 빌드·릴리스
│       ├── build-android.yml      # APK/AAB 빌드
│       └── ci.yml                 # fmt·clippy·test
├── resources/
│   ├── icon.svg                   # PC 아이콘
│   └── app.png                    # Android·iOS 앱 아이콘
├── app/
│   ├── main/                      # (PC, Android) Tauri 프로젝트
│   │   ├── src/                   # 프론트엔드(Vite + Vanilla TS) 소스
│   │   │   ├── ui/                # UI 컴포넌트(프레임워크 없음, DOM/웹컴포넌트)
│   │   │   ├── stores/            # 상태 관리(경량 reactive store)
│   │   │   ├── ipc/               # Tauri command 래퍼
│   │   │   ├── i18n/              # 다국어 로더·헬퍼
│   │   │   │   └── locales/       # en.json(기본), ko.json, ja.json ...
│   │   │   ├── styles/            # 디자인 토큰·테마 CSS
│   │   │   └── main.ts
│   │   ├── src-tauri/             # Rust 백엔드
│   │   │   ├── src/
│   │   │   │   ├── main.rs
│   │   │   │   ├── lib.rs
│   │   │   │   ├── player/        # libmpv 제어
│   │   │   │   ├── playlist/      # 재생목록
│   │   │   │   ├── subtitle/      # 자막 연동·렌더
│   │   │   │   ├── whisper/       # 자동 자막
│   │   │   │   ├── convert/       # 확장자 변환(FFmpeg)
│   │   │   │   ├── torrent/       # librqbit 래퍼
│   │   │   │   ├── net/           # yt-dlp / web 소스
│   │   │   │   ├── formats/       # .ytvideo/.webvideo 파서
│   │   │   │   ├── i18n/          # 백엔드 메시지 로케일(선택)
│   │   │   │   ├── assoc/         # 파일 연결 처리
│   │   │   │   └── error.rs       # 공용 에러 타입
│   │   │   ├── lib/               # libmpv 등 동적 라이브러리
│   │   │   ├── capabilities/      # Tauri v2 권한
│   │   │   ├── Cargo.toml
│   │   │   └── tauri.conf.json
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── ios/                       # (iOS) Swift 프로젝트
│       ├── VisualPlayer/
│       │   └── Localizable.xcstrings  # iOS 다국어 문자열
│       └── VisualPlayer.xcodeproj
├── installer/                     # Windows 인스톨러 커스터마이징(NSIS .nsh 등)
├── licenses/                      # 서드파티 라이선스 모음(§18)
├── CLAUDE.md                      # AI 에이전트(Claude Code) 컨텍스트(§21)
├── LICENSE                        # 자체 소스 라이선스 (Apache-2.0)
├── COPYING                        # 배포 바이너리 GPL 고지 (§18)
└── README.md
```

---

## 6. 프론트엔드(Vite) 구조 & 상태 관리

### 6.1 스택

- **UI 레이어**: 무거운 UI 프레임워크(React/Svelte/Solid)를 쓰지 않고 **Vite + Vanilla TypeScript**로 구성한다. (참고: Vite는 엄밀히는 UI 프레임워크가 아니라 빌드 도구/번들러이므로, "프레임워크 없이 Vite로 직접 구성"한다는 의미다.)
- **컴포넌트화**: 표준 Web Components(Custom Elements) 또는 가벼운 모듈 패턴으로 재사용 컴포넌트를 만든다. 외부 의존성을 최소화한다.
- **스타일**: `styles/`의 CSS 변수(디자인 토큰, §11)로 테마를 구현한다.

### 6.2 상태 관리

- **경량 reactive store**: 작은 자체 store(또는 `nanostores` 같은 초경량 라이브러리)로 상태를 관리한다.
- **상태 도메인**: `player`(재생/위치/볼륨/배속), `playlist`(목록/인덱스/반복/셔플), `subtitle`(트랙/싱크/스타일), `tasks`(다운로드·변환·자막 진행도), `settings`(테마/기본 해상도/**언어**).
- **IPC 래퍼**: `src/ipc/`에 command 호출을 타입 안전하게 감싼다. 모든 백엔드 호출은 이 레이어만 사용한다(직접 `invoke` 금지).
- **이벤트 구독**: mpv 속성 변화·작업 진행도는 Tauri event/channel로 받아 store에 반영한다.

### 6.3 다국어(i18n) 지원

> **기본 언어: 영어(`en`).** 모든 신규 UI 텍스트는 하드코딩하지 않고 반드시 번역 키로 작성한다.

- **로케일 파일**: `src/i18n/locales/`에 언어별 JSON. `en.json`이 **기준(소스 오브 트루스)** 이며, 누락 키는 영어로 폴백.
  ```jsonc
  // src/i18n/locales/en.json (기준)
  {
    "player.play": "Play",
    "player.pause": "Pause",
    "subtitle.auto_generate": "Auto-generate subtitles",
    "task.downloading": "Downloading... {percent}%"
  }
  ```
  ```jsonc
  // src/i18n/locales/ko.json
  {
    "player.play": "재생",
    "player.pause": "일시정지",
    "subtitle.auto_generate": "자막 자동 생성",
    "task.downloading": "다운로드 중... {percent}%"
  }
  ```
- **라이브러리**: 프레임워크 비종속 **`i18next`** 또는 동등한 경량 자체 로더. 변수 보간(`{percent}` 등)과 복수형 처리를 지원한다.
- **언어 결정 순서**: ① 사용자 설정(`settings.language`) → ② OS 로케일(Tauri `tauri-plugin-os`/`locale` crate로 감지) → ③ 폴백 `en`.
- **설정 UI**: 설정 화면에 언어 선택 드롭다운. 변경 즉시 적용(앱 재시작 불필요).
- **백엔드 메시지**: Rust 측 사용자 노출 문자열(에러/알림)은 ① 백엔드는 안정적인 **메시지 코드/키**만 반환하고 ② 표시 문구는 프론트 i18n에서 번역하는 방식을 기본으로 한다. (백엔드 자체 번역이 필요하면 `src-tauri/src/i18n/` 사용.)
- **초기 지원 언어**: `en`(기본), `ko`. 이후 `ja`, `zh`, `es`, `fr` 등을 로케일 파일 추가만으로 확장.
- **RTL/폰트**: 아랍어 등 RTL은 차후 확장 시 `dir="rtl"` 토글 고려. CJK 가독성을 위한 폰트 폴백을 디자인 토큰에 둔다(§11).
- **번역 일관성 규칙**: 키는 `도메인.식별자` 형식(소문자·점 구분). `en.json`에 키를 먼저 추가한 뒤 다른 로케일을 채운다.

---

## 7. 백엔드(Rust) 구조 & Tauri Command(IPC) 설계

명령 시그니처는 아래를 기준으로 한다. 모든 명령은 `error.rs`의 공용 에러 타입을 반환한다.

| 명령(command) | 입력 | 동작 |
| --- | --- | --- |
| `player_load` | `path/url`, `options` | 미디어 로드(libmpv `loadfile`) |
| `player_play` / `player_pause` | – | 재생/일시정지 |
| `player_seek` | `seconds`, `mode` | 탐색 |
| `player_set_volume` | `0–100` | 볼륨 |
| `player_set_speed` | `f64` | 배속 |
| `player_select_track` | `kind`(audio/sub), `id` | 트랙 선택 |
| `playlist_add` / `playlist_remove` / `playlist_reorder` | – | 재생목록 편집 |
| `subtitle_attach` | `sub_path` | 외부 자막 부착 |
| `subtitle_set_delay` | `seconds` | 자막 싱크 보정 |
| `whisper_generate` | `media_path`, `model`, `lang` | 자동 자막 생성(작업 ID 반환) |
| `convert_media` | `input`, `target_ext`, `opts` | 확장자/컨테이너 변환(작업 ID) |
| `torrent_open` | `.torrent path` | 토렌트 메타 로드 + 스트림 시작 |
| `source_resolve_ytvideo` | `path` | `.ytvideo` 파싱 → 해상도 목록 |
| `source_resolve_webvideo` | `path` | `.webvideo` 파싱 → 스트림 URL |
| `task_cancel` | `task_id` | 진행 작업 취소 |
| `settings_get` / `settings_set` | `key`, `value` | 설정 읽기/쓰기 |
| `settings_set_language` | `lang`(`en`/`ko`/…) | UI 언어 변경(기본 `en`) |
| `system_locale` | – | OS 로케일 반환(i18n 자동 감지용) |
| `licenses_list` | – | 동봉된 서드파티 라이선스 목록(§18) |

**이벤트(event)**: `player://prop-changed`, `task://progress`(다운로드/변환/자막 %), `task://done`, `task://error`.

---

## 8. 지원 포맷 & 라이선스 정책

> 원칙: 비영리·GPL 허용 정책이므로 **GPL/LGPL 구성요소를 모두 사용**해 FFmpeg/mpv로 디코딩 가능한 것은 폭넓게 지원한다. 객체기반 공간오디오의 완전 렌더링, DRM, 별도 상용 라이선스가 별도로 필요한 것은 제외하고, 사용한 모든 구성요소의 라이선스는 앱 내 라이선스 화면(§18)에 표기한다.

### 8.1 비디오 컨테이너

| 확장자 | 설명 | | 확장자 | 설명 |
| --- | --- | --- | --- | --- |
| .mp4 | 가장 널리 사용 | | .mpg/.mpeg | MPEG |
| .mkv | 다양한 코덱·자막 | | .vob | DVD |
| .avi | 오래된 형식 | | .ogv | Ogg Video |
| .mov | Apple QuickTime | | .rm/.rmvb | RealMedia |
| .wmv | Microsoft | | .asf | Advanced Systems Format |
| .flv | Adobe Flash Video | | .divx | DivX |
| .webm | 웹용 오픈 포맷 | | .f4v | Flash Video |
| .m4v | Apple 계열 | | .amv | 저가 MP4 플레이어용 |
| .3gp | 휴대폰용 | | .drc | Dirac |
| .ts | 방송 송출용 | | .qt | QuickTime |
| .mts | AVCHD 캠코더 | | .mxf | 방송국용 |
| .m2ts | 블루레이 | | .nut | 실험적 컨테이너 |
|  |  | | .y4m / .dat | YUV4MPEG / VCD |

### 8.2 자막

`.srt .ass .ssa .vtt .sub .idx .sup .smi .sami .ttml .dfxp .stl .xml .sbv .lrc .usf .rt .pjs .aqt .jss .txt`
— `.ass/.ssa`(고급 스타일)와 `.srt/.vtt`(기본)를 1차 완전 지원으로, 나머지는 mpv/FFmpeg 처리 범위에서 점진 지원.

### 8.3 비디오 코덱 (디코딩 기준)

H.264(AVC) · H.265(HEVC) · H.266(VVC) · AV1 · VP9 · VP8 · MPEG-4 Part 2 · MPEG-2 · MPEG-1 · Theora · Dirac · ProRes · DNxHD/DNxHR · CineForm · MJPEG · JPEG 2000 · FFV1 · HuffYUV · Lagarith · AVC-Intra · XAVC · XDCAM · VC-1 · WMV · RealVideo · Sorenson · Indeo · Cinepak · DV · HDV

### 8.4 오디오 코덱 (디코딩 기준)

- **일반**: MP3 · AAC · HE-AAC · Opus · Vorbis · WMA · AC-3 · E-AC-3 · DTS · DTS-HD · MP2 · ATRAC · RealAudio · AMR-NB/WB · EVS · PCM/LPCM · ADPCM · G.711(μ-law/A-law)
- **무손실**: FLAC · ALAC · APE · WavPack · TTA · TAK · OptimFROG · MPEG-4 ALS · Dolby TrueHD · DTS-HD MA
- **주의(공간오디오)**: **Dolby Atmos / DTS:X**는 코어 베드(TrueHD/DTS-HD) 디코딩까지만 지원하며, 완전한 객체 기반 공간 렌더링은 비목표(§0.3).

### 8.5 라이선스 표기 정책

각 코덱/라이브러리의 라이선스를 `licenses/`에 수집하고, 앱 내 "라이선스" 화면에서 열람 가능하게 한다(§18.2).

---

## 9. 기능 명세

### 9.1 영상·오디오 재생

- 단일/다중 파일 로드, 드래그&드롭, "폴더 열기".
- 표준 컨트롤: 재생/일시정지, 탐색, 볼륨, 배속, 전체화면, 프레임 단위 이동, 스크린샷.
- 오디오 전용 파일은 앨범아트/파형 + 가사(`.lrc`) 표시 모드.

### 9.2 플레이리스트 · 다중 재생

- 재생목록(순서 변경/반복/셔플), 다음/이전.
- **다중 동시 재생**: 여러 mpv 인스턴스 또는 타일형 멀티뷰(메모리/성능 한계 고려해 동시 개수 상한 설정).

### 9.3 자막 연동

- **동명 자막 자동 연동**: `movie.mkv` 재생 시 같은 폴더의 `movie.srt`/`movie.ass` 등을 자동 탐지·부착.
- 다중 자막 트랙 전환, 자막 싱크 보정(±초), 스타일(폰트/크기/색/외곽선) 조정.
- 내장 자막 트랙(예: mkv 임베디드)도 선택 가능.

### 9.4 자동 자막 (Whisper, 로컬)

- 자막이 없는 미디어에 **로컬 Whisper**(`whisper-rs`)로 자막 생성. 외부 전송 없음(프라이버시).
- **흐름**: 미디어 → FFmpeg로 16kHz mono PCM 추출 → VAD로 구간 분할 → Whisper 추론 → 세그먼트 타임스탬프(`t0/t1`) → `.srt` 생성 또는 인메모리 적용.
- **모델**: ggml `base/small/medium`를 온디맨드 다운로드 또는 동봉. 가능 시 GPU(CUDA/Metal/Vulkan) 가속.
- **오디오 가사형 싱크**: 음악 등 오디오 재생 시 Spotify 가사처럼 현재 줄을 하이라이트. 단어 단위 강조가 필요하면 토큰 레벨 타임스탬프를 사용.
- 백그라운드 작업으로 실행하고 진행도를 `task://progress`로 표시.

### 9.5 영상 확장자 변환

- **FFmpeg(GPL 전체 빌드)** 로 컨테이너/코덱 변환. 비영리·GPL 허용이므로 **x264/x265 등 GPL 인코더를 그대로 사용**할 수 있다.
- UI: 입력 → 대상 포맷/코덱/품질 선택 → 진행도 → 완료.
- 통합 방식: 사이드카 바이너리 호출 또는 FFmpeg 라이브러리 바인딩. 어느 쪽이든 배포 바이너리는 GPL을 따른다(§18).

### 9.6 커스텀 파일 포맷 (요약)

- `.{media}.torrent` — 토렌트로 받아와 재생 (다운로드 전용)
- `.ytvideo` — 유튜브 링크 파일
- `.webvideo` — 일반 웹 영상 링크 파일

상세 명세는 §10 참고.

---

## 10. 커스텀 파일 포맷 명세

### 10.1 `.{media}.torrent`

- 예: `movie.mp4.torrent`, `song.flac.torrent` — 더블클릭하면 `librqbit`이 메타데이터를 해석하고 **스트리밍 재생**(받으면서 재생, 조각 우선순위)을 시작한다.
- **다운로드 전용**: 업로드/시딩 비활성화(librqbit feature flag). 완료 후에도 시딩하지 않음.
- **프라이버시/보호**:
  - BitTorrent 프로토콜 암호화(MSE/PE) 활성화.
  - 다운로드 받은 파일은 앱 캐시 경로에 저장하고 필요 시 자동 정리.
  - ⚠️ 토렌트 자체는 본질적으로 익명이 아니다. "암호화/정보 보호"는 *전송 암호화·비시딩* 수준임을 UI에 정직하게 안내하고, 익명성이 필요하면 사용자의 VPN/프록시 사용은 사용자 책임임을 고지한다.
- **UI**: "로딩중..." 아래에 다운로드 진행도(%/속도/피어 수) 표시.
- **법적 고지**: 합법적으로 배포되는 콘텐츠에만 사용하도록 안내(§18.3).

### 10.2 `.ytvideo`

유튜브 영상을 받아와 재생. 추출은 **yt-dlp**(사이드카 바이너리)로 수행.

- **최소 포맷**(한 줄에 URL 하나):
  ```
  https://youtu.be/XXXXXXXXXXX
  ```
- **확장 포맷**(선택 메타데이터, TOML 권장):
  ```toml
  url = "https://www.youtube.com/watch?v=XXXXXXXXXXX"
  preferred_resolution = "1080p"   # 선택: 2160p/1440p/1080p/720p/480p ...
  title = "예시 영상"               # 선택
  ```
- 더블클릭 → yt-dlp로 사용 가능한 포맷/해상도 조회 → 사용자 선택(또는 `preferred_resolution`) → 스트림 URL을 mpv에 전달하거나 다운로드 후 재생.
- 지원 링크: `https://youtu.be/*`, `https://www.youtube.com/watch?v=*` 등.

### 10.3 `.webvideo`

인터넷의 직접 영상 링크를 재생.

- **최소 포맷**:
  ```
  https://example.com/example.mp4
  ```
- **확장 포맷**(TOML):
  ```toml
  url = "https://example.com/stream.m3u8"
  headers = { Referer = "https://example.com" }  # 선택: 필요한 요청 헤더
  ```
- mpv가 http(s)/HLS 등을 직접 재생 가능하므로 URL을 그대로 전달하거나, 필요 시 다운로드 후 재생.

### 10.4 파일 연결(File Association) 등록

- Tauri `tauri.conf.json`의 `fileAssociations`로 위 확장자 + 모든 미디어 확장자를 앱과 연결.
- 더블클릭 시 OS가 전달하는 경로/딥링크를 백엔드 `assoc/`에서 받아 적절한 핸들러로 라우팅.

---

## 11. 디자인 시스템

### 11.1 색상 토큰

- **Primary / Brand**: `#0040FF`
- 권장 토큰 스케일(예시):
  | 토큰 | 라이트 | 다크 |
  | --- | --- | --- |
  | `--brand` | `#0040FF` | `#3D6BFF` |
  | `--bg` | `#FFFFFF` | `#0B0E14` |
  | `--surface` | `#F4F6FB` | `#151A24` |
  | `--text` | `#0B0E14` | `#EAEEF7` |
  | `--muted` | `#5B6472` | `#9AA4B2` |
  | `--border` | `#E2E6EF` | `#26303D` |

### 11.2 스타일 방향

- 간결한 **플랫 디자인**, 충분한 여백, 둥근 모서리, 절제된 모션.
- 다크/라이트 테마 + 시스템 연동.
- 타이포: 시스템 폰트 스택 기본. **다국어(i18n) 폰트 폴백**으로 라틴 + CJK(한·중·일) 가독 폰트를 함께 지정한다. 필요 시 가변 폰트 1종.
- **레이아웃은 텍스트 길이 변화에 견고하게**: 언어마다 길이가 달라지므로 버튼/라벨은 고정 폭을 피하고 말줄임·줄바꿈을 허용한다.
- 영상 위 컨트롤은 자동 숨김(마우스/탭 시 표시), 자막과 겹치지 않도록 안전 영역 확보.

---

## 12. 플랫폼별 고려사항

| 플랫폼 | 지원 아키텍처 | 패키지 | 비고 |
| --- | --- | --- | --- |
| Windows 10+ | x86_64, Arm64 | NSIS(`.exe`) / MSI | WebView2 런타임 필요 |
| macOS | Intel, Apple Silicon | `.dmg` / `.app` | 공증(notarization) 권장 |
| Linux | x86_64, Arm64 | `.deb`(Ubuntu/Debian), `.rpm`(RHEL), `pacman`(Arch), AppImage | WebKitGTK + libmpv 의존성 |
| Android | arm64-v8a, x86_64 | `.apk` / `.aab` | NDK·SDK 필요, 재생 백엔드 §4.4 |
| iOS | – | – | 별도 Swift(§13), Actions 빌드 제외 |

---

## 13. iOS 앱 명세 (Swift)

- **구조**: `app/ios/`의 독립 Swift/Xcode 프로젝트. 데스크톱과 코드 공유 없음.
- **UI**: SwiftUI + **Liquid Glass**(iOS 26 디자인 언어)로 반투명·굴절 질감의 컨트롤/네비게이션 구성.
- **재생**: 표준 포맷은 **AVPlayer**, 그 외 광범위 포맷은 **MobileVLCKit**(LGPL).
- **기능 우선순위**: 로컬 재생 → 자막 연동 → `.webvideo`/`.ytvideo` → 자동 자막(가능 시).
- **빌드/배포**: Xcode 로컬 빌드 + 서명. GitHub Actions 빌드 대상이 아님(서명·Mac 러너·정책 이유).
- 앱 아이콘: `resources/app.png`.

---

## 14. Windows 인스톨러

### 14.1 설치 흐름

```
[시작] → [이용약관 동의] → [설치] → [부가 설정] → [완료]
```

### 14.2 구현

- 기본은 Tauri 번들러의 **NSIS** 사용. 커스텀 메시지/페이지는 `installer/`의 `.nsh`로 분기, 브랜드 색 `#0040FF` 적용.
- "이용약관 동의" 페이지는 NSIS 라이선스 페이지로, "부가 설정"은 커스텀 컴포넌트 페이지로 구성.
- NSIS 테마만으로 "Flutter풍 플랫 디자인" 구현이 부족하면, 별도 경량 커스텀 인스톨러(예: 소형 Tauri/네이티브 앱)를 `installer/`에 두는 방안을 대안으로 둔다.
- 설치 시 **서드파티 라이선스 파일을 설치 경로(`licenses/`)에 함께 배치**(§18.2).

---

## 15. CI/CD (GitHub Actions)

`.github/workflows/`에 다음을 둔다.

| 워크플로 | 트리거 | 내용 |
| --- | --- | --- |
| `ci.yml` | PR/푸시 | `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test`, 프론트 lint/build |
| `build-desktop.yml` | 태그 릴리스 | tauri-action으로 Win(x64/arm64)·macOS(intel/arm)·Linux(deb/rpm/AppImage) 빌드·서명·릴리스 |
| `build-android.yml` | 태그 릴리스 | NDK/SDK 설정 후 APK/AAB 빌드 |

- libmpv 등 네이티브 의존성은 OS별로 설치(또는 동봉)하는 단계를 각 잡(job)에 포함.
- **iOS는 의도적으로 제외**(§13).

---

## 16. 개발 환경 설정

```bash
# 사전 요구: Rust(stable), Node.js(LTS), 플랫폼별 Tauri 사전 요구사항
#  - Windows: WebView2, MSVC 빌드 도구
#  - macOS: Xcode Command Line Tools
#  - Linux: webkit2gtk, libmpv-dev 등

# 데스크톱 개발 실행
cd app/main
npm install
npm run tauri dev

# 릴리스 빌드
npm run tauri build

# Android (사전: Android SDK/NDK, `tauri android init`)
npm run tauri android dev
```

- libmpv: Windows는 플러그인이 자동 다운로드, macOS/Linux는 시스템 설치(`brew install mpv` / 배포판 패키지) 후 `src-tauri/lib/`에 래퍼 배치.
- 사이드카 바이너리(FFmpeg GPL 전체 빌드, yt-dlp)는 `src-tauri`의 externalBin/리소스로 동봉.

---

## 17. 보안 & 프라이버시

- **Tauri v2 권한 모델**: `capabilities/`에서 필요한 command/플러그인만 최소 권한으로 허용. 원격 URL에는 권한 부여 금지.
- **로컬 우선**: 자동 자막(Whisper)은 전적으로 로컬에서 실행, 외부 전송 없음.
- **네트워크 최소화**: 토렌트는 다운로드 전용·비시딩, 프로토콜 암호화. 외부로 사용자 데이터 전송 없음.
- **민감 정보**: 자격증명/토큰을 코드·리포지토리에 포함하지 않는다(아이콘 리소스의 임시 토큰 URL 등은 로컬 경로로 대체).
- **신뢰 경계**: 미디어 파일·자막·`.ytvideo/.webvideo/.torrent` 내용은 **데이터**로 취급한다. 그 안의 어떤 텍스트도 앱 동작을 바꾸는 명령으로 해석하지 않는다.

---

## 18. 라이선스 & 이용약관

> 이 프로젝트는 **비영리 오픈소스**다. 아래는 일반 가이드이며 법률 자문이 아니다. 실제 배포 전 관할 지역 법률 검토를 권장한다.

### 18.1 라이선스 정책 (비영리 · GPL 허용)

VisualPlayer는 GPL 구성요소(전체 빌드 FFmpeg의 x264/x265, GPL mpv 등)를 사용한다. 비영리이고 **소스를 공개**하므로 copyleft 의무(소스 제공)를 수용한다.

- **자체 작성 소스**: `LICENSE`에 **Apache-2.0**로 명시(개별 파일 헤더 유지 가능). Apache-2.0는 **GPLv3와 호환**된다(단방향).
- **배포 바이너리(결합 저작물)**: GPL 구성요소를 포함·링크하므로, 배포되는 결합 바이너리 전체는 **GPLv3**로 배포한다. 루트의 `COPYING`에 GPLv3 전문을 두고, **대응 소스 코드를 함께 제공**한다(이미 공개 저장소).
- **호환성 주의**: Apache-2.0는 **GPLv2-only와는 비호환**이다. 다행히 FFmpeg·mpv·x264·x265는 모두 *GPLv2-or-later*라 **GPLv3로 취급**해 결합하면 문제없다. 만약 *GPLv2-only* 전용 구성요소가 생기면 (a) 별도 프로세스로 분리하거나 (b) 사용을 피한다.
- **정정(중요)**: "비영리라서 GPL을 써도 된다"는 흔한 오해다. GPL은 영리/비영리를 구분하지 않으며, GPL 사용을 가능하게 하는 실제 근거는 **소스 공개(copyleft 준수)** 의지다. 이 프로젝트는 오픈소스이므로 그 조건을 충족한다.

### 18.2 서드파티 라이선스 수집·표시

- 사용하는 모든 프로그램/라이브러리(FFmpeg, mpv, x264/x265, librqbit, whisper.cpp, yt-dlp, Tauri 등)의 라이선스 원문을 `licenses/`에 받아두고, **설치 경로에 함께 배치**한다.
- 앱 내 **"라이선스" 화면**에서 사용된 모든 구성요소의 라이선스를 열람할 수 있게 한다(`licenses_list` command).
- GPL 의무 충족을 위해 앱/설치본에 **대응 소스 코드 입수 경로(저장소 링크)** 를 명시한다.

### 18.3 이용약관(개발자 보호 관점) — 작성 가이드

- **"있는 그대로(AS IS)" 제공**·보증 부인, 책임 제한 조항.
- VisualPlayer는 **비영리 범용 재생 도구**이며, 사용자가 입력하는 링크/토렌트/파일의 **합법성·저작권 준수 책임은 사용자에게 있음**을 명시.
- 유튜브 등 제3자 서비스 콘텐츠 다운로드는 해당 서비스 약관·현지 법률의 적용을 받을 수 있으며, 준수 책임은 사용자에게 있음을 안내.
- 불법 복제·무단 배포 콘텐츠 사용 금지 고지.

---

## 19. 개발 로드맵 (마일스톤)

| 마일스톤 | 범위 |
| --- | --- |
| **M1 — MVP** | libmpv 통합, 로컬 단일 영상/오디오 재생, 기본 컨트롤·UI |
| **M2 — 재생 경험** | 플레이리스트·다중 재생, 동명 자막 자동 연동, 트랙/싱크 |
| **M3 — 지능형 기능** | 자동 자막(Whisper), 확장자 변환 |
| **M4 — 네트워크 소스** | `.webvideo` → `.ytvideo`(yt-dlp) → `.{media}.torrent`(librqbit) |
| **M5 — 배포** | Windows 인스톨러, 디자인 마감, 라이선스 화면, CI 릴리스 |
| **M6 — 모바일** | Android 패키징, iOS(Swift/Liquid Glass) 앱 |

---

## 20. 코딩 컨벤션

- **Rust**: `rustfmt` + `clippy`(경고 0 목표). 모듈은 §5 구조를 따른다. 공용 에러는 `error.rs`.
- **프론트엔드**: ESLint + Prettier. IPC는 `src/ipc/` 래퍼만 사용.
- **i18n 필수**: 사용자에게 보이는 모든 문자열은 **하드코딩 금지**, 반드시 번역 키 사용. 새 키는 `en.json`에 먼저 추가(§6.3).
- **커밋**: Conventional Commits(`feat:`, `fix:`, `refactor:`, `docs:`, `i18n:` …).
- **PR**: 설계 → 승인 → 구현 → `cargo check/clippy/test` 통과 → 리뷰.
- **문서 우선**: 동작/구조 변경 시 이 BLUEPRINT를 먼저 갱신한다.

---

## 21. AI 에이전트(Claude Code) 학습용 컨텍스트

> 이 섹션은 **Claude Code 등 AI 에이전트가 프로젝트를 빠르게 학습**하고 일관되게 작업하도록 돕는 압축 컨텍스트다. 사람용 설명과 별개로, 에이전트가 매번 전체 문서를 다시 읽지 않아도 핵심을 잡을 수 있게 한다.

### 21.1 `CLAUDE.md` 운영

- 저장소 루트에 **`CLAUDE.md`** 를 두어 Claude Code가 세션 시작 시 자동으로 읽게 한다. (필요하면 `app/main/src-tauri/CLAUDE.md`처럼 하위에도 둔다.)
- `CLAUDE.md`에는 아래 21.2~21.6의 요약을 담고, 상세는 이 BLUEPRINT를 가리킨다. 충돌 시 **BLUEPRINT가 우선**이며, 변경은 BLUEPRINT → `CLAUDE.md` 순으로 반영한다.

### 21.2 프로젝트 한눈 요약 (Project at a glance)

- **무엇**: 비영리 크로스 플랫폼 미디어 플레이어 (영상/오디오/자막).
- **스택**: Tauri 2 + Rust(백엔드) + Vite/Vanilla TS(프론트). iOS는 별도 Swift.
- **재생 엔진**: libmpv(`tauri-plugin-libmpv`) — 거의 모든 코덱은 mpv/FFmpeg가 처리.
- **핵심 외부**: `librqbit`(토렌트, 다운로드 전용), `whisper-rs`(로컬 자막), `yt-dlp`/FFmpeg(사이드카).
- **기본 언어**: 영어(`en`), 다국어 지원.
- **라이선스**: 자체 소스 Apache-2.0, 배포 바이너리 GPLv3(GPL 구성요소 포함).

### 21.3 어디에 무엇이 있나 (코드 맵)

| 작업하려는 것 | 위치 |
| --- | --- |
| 재생 제어(libmpv) | `app/main/src-tauri/src/player/` |
| 재생목록 | `.../src/playlist/` |
| 자막 연동/렌더 | `.../src/subtitle/` |
| 자동 자막(Whisper) | `.../src/whisper/` |
| 확장자 변환(FFmpeg) | `.../src/convert/` |
| 토렌트(librqbit) | `.../src/torrent/` |
| 유튜브/웹 소스 | `.../src/net/`, `.../src/formats/` |
| 파일 연결 처리 | `.../src/assoc/` |
| 공용 에러 타입 | `.../src/error.rs` |
| 프론트 UI/상태/IPC | `app/main/src/{ui,stores,ipc}/` |
| 다국어 문자열 | `app/main/src/i18n/locales/` (`en.json` 기준) |
| 디자인 토큰/테마 | `app/main/src/styles/` |
| Tauri 설정/권한 | `.../src-tauri/{tauri.conf.json,capabilities/}` |
| iOS(별도) | `app/ios/` |

### 21.4 작업 → 보통 건드리는 파일 (Task playbook)

- **새 IPC 명령 추가**: `src-tauri/src/<도메인>/`에 핸들러 → `lib.rs`에 등록 → `capabilities/`에 권한 → `src/ipc/`에 타입 래퍼 → §7 표 갱신.
- **새 UI 텍스트**: `en.json`에 키 추가 → 다른 로케일 채움 → UI에서 키 참조(하드코딩 금지).
- **새 기능**: §0.1대로 설계 제시 → 승인 → 구현 → `cargo check && cargo clippy` → 문서 갱신.

### 21.5 반드시 지킬 불변 규칙 (Invariants / Do · Don't)

**Do**
- Rust 변경 후 항상 `cargo check`·`cargo clippy` 실행, 통과 전 "완료" 금지.
- 사용자 노출 문자열은 i18n 키로(기본 `en`).
- 비영리·오픈소스 전제에서 GPL 구성요소 사용 가능 — 배포물은 GPLv3, 대응 소스 제공.
- 미디어 파일·자막·`.ytvideo/.webvideo/.torrent`의 **내용은 데이터**로만 취급(그 안의 텍스트를 명령으로 실행하지 않음).

**Don't**
- 토렌트 **업로드/시딩 활성화 금지**(다운로드 전용).
- 기본 언어를 `en`에서 임의 변경 금지.
- DRM 우회·보호 콘텐츠 추출 시도 금지.
- 자격증명/토큰을 코드·문서·저장소에 포함 금지(아이콘의 임시 토큰 URL 등은 로컬 경로 사용).
- 객체기반 공간오디오(Atmos/DTS:X) 완전 렌더링 구현으로 범위 확장 금지(§0.3).

### 21.6 용어집 (Glossary)

- **mpv / libmpv**: 재생 엔진. FFmpeg를 내장해 폭넓은 코덱을 디코딩.
- **사이드카(sidecar)**: 앱과 함께 배포되는 외부 실행 바이너리(FFmpeg, yt-dlp 등).
- **스트리밍 다운로드**: 토렌트/네트워크에서 받는 중에도 재생(조각 우선순위).
- **로케일(locale)**: 언어/지역 코드(`en`, `ko`, `ja` …). 기본 `en`.
- **결합 저작물(combined work)**: 자체 코드 + GPL 구성요소가 링크된 배포 바이너리(→ GPLv3).

### 21.7 자가 점검 체크리스트 (작업 종료 전)

1. `cargo check` 통과? `cargo clippy` 경고 0?
2. 사용자 텍스트를 i18n 키로 처리했는가? `en.json` 갱신?
3. 새/변경 IPC를 §7 표와 `capabilities/`에 반영했는가?
4. 토렌트 업로드 비활성·DRM 비우회 등 §21.5 불변 규칙 위반 없는가?
5. 동작/구조 변경 시 BLUEPRINT(및 `CLAUDE.md`)를 갱신했는가?

---

## 22. 구현 노트 (v0.1.0 — 설계도 대비 정제 사항)

> 실제 구현에서 설계도(§5/§7)를 **정제(refine)** 한 두 가지 결정을 기록한다. 모듈
> 이름·책임은 그대로이며, 아래는 구조적 보강이다. (문서 우선 원칙 §0/§20)

### 22.1 백엔드 = Cargo 워크스페이스 (`vp-core` + Tauri 셸)

§5는 모든 백엔드 모듈을 `src-tauri/src/<모듈>/`에 두지만, 네이티브 라이브러리
(webkit2gtk·libmpv) 없이도 핵심 로직을 검증할 수 있도록 백엔드를 **워크스페이스 2
크레이트**로 나눴다.

- **`vp-core/`** — 순수 Rust(=`tauri`/`libmpv` 비의존): `error`, `playlist`,
  `formats`(.ytvideo/.webvideo), `subtitle`(동명 탐지), `settings`, `i18n`(메시지
  코드). 헤드리스 단위테스트: `cargo test -p vp-core`.
- **`app/main/src-tauri/`** (크레이트 `visualplayer`) — Tauri 바이너리: libmpv 글루,
  IPC 핸들러, 이벤트, 파일 연결 라우팅. `vp-core`에 의존.

루트에 워크스페이스 `Cargo.toml`을 둔다(§5 트리에는 없던 파일).

### 22.2 IPC 실현 방식 — 일부 §7 명령은 공식 플러그인으로 처리

§7의 명령 표는 유지하되, **저수준 mpv 트랜스포트**(`player_play/pause/seek/
set_volume/set_speed/select_track`)와 **OS 로케일**(`system_locale`),
**자막 부착/싱크**(`subtitle_attach/set_delay`)는 Rust 명령 대신 프론트의 단일 IPC
퍼널(`app/main/src/ipc/`)에서 **공식 플러그인**으로 호출한다.

- mpv 제어: `tauri-plugin-libmpv`(JS: `loadfile`/`setProperty`/`observeProperties`).
- 로케일: `tauri-plugin-os`(JS `locale()`).

Rust 명령으로 남는 것(앱 고유 로직): `player_load`(소스 해석+동명 자막 탐지),
`playlist_*`, `subtitle_discover`, `settings_*`, `source_resolve_*`(.ytvideo/
.webvideo 파싱), `assoc_initial_files`, `licenses_list`, 그리고 후속 마일스톤 스텁
(`whisper_generate`/`convert_media`/`torrent_open`/`task_cancel`).

### 22.3 현재 마일스톤 상태

- **M1(MVP)**: libmpv 로드/재생/탐색/볼륨/배속/트랙, 컨트롤 UI, i18n(en/ko), 디자인
  토큰 — 구현. 헤드리스에서 컴파일/코어 테스트 통과, 실제 재생은 로컬 검증.
- **M2~M4**: 타입 있는 스텁 + UI 자리표시자(플레이리스트/자막/작업 진행).
- **M5~M6**: CI 스켈레톤, `installer/`·`licenses/` 디렉터리, Android 설정 스텁. iOS 보류.

---

<div align="center">

**VisualPlayer** · 비영리(non-profit) 오픈소스
자체 소스 Apache-2.0 · 배포 바이너리 GPLv3 · © 2026 starfect

</div>