import 'package:flutter/widgets.dart';

/// Tiny localization helper. `lang` is a notifier so changing the language
/// rebuilds the app. English is the source and the fallback.
class L {
  static final ValueNotifier<String> lang = ValueNotifier<String>('en');

  static const List<String> supported = ['en', 'ko', 'ja'];

  static String label(String code) {
    switch (code) {
      case 'ko':
        return '한국어';
      case 'ja':
        return '日本語';
      default:
        return 'English';
    }
  }

  static String t(String key) {
    final table = _data[lang.value] ?? _data['en']!;
    return table[key] ?? _data['en']![key] ?? key;
  }

  static const Map<String, Map<String, String>> _data = {
    'en': {
      'app.title': 'VisualPlayer',
      'home.open': 'Open file',
      'home.recent': 'Recent',
      'home.empty': 'Nothing played yet',
      'home.settings': 'Settings',
      'home.clear': 'Clear history',
      'player.resumed': 'Resumed',
      'player.subtitles': 'Subtitles',
      'player.add_subtitle': 'Add subtitle file',
      'player.no_subtitle': 'Disable subtitles',
      'player.equalizer': 'Equalizer',
      'player.eq_enable': 'Enable equalizer',
      'player.preamp': 'Pre-amp',
      'player.chapters': 'Chapters',
      'player.prev_chapter': 'Previous chapter',
      'player.next_chapter': 'Next chapter',
      'player.speed': 'Speed',
      'settings.title': 'Settings',
      'settings.theme': 'Theme',
      'settings.theme_system': 'System',
      'settings.theme_light': 'Light',
      'settings.theme_dark': 'Dark',
      'settings.language': 'Language',
      'settings.resume': 'Resume from last position',
      'settings.about': 'About',
      'settings.about_text': 'Non-profit open-source media player. Plays nearly any '
          'format with the mpv engine.',
      'eq.flat': 'Flat',
      'eq.rock': 'Rock',
      'eq.pop': 'Pop',
      'eq.jazz': 'Jazz',
      'eq.classical': 'Classical',
      'eq.dance': 'Dance',
      'eq.bass': 'Bass boost',
      'eq.treble': 'Treble boost',
      'eq.vocal': 'Vocal',
      'eq.soft': 'Soft',
    },
    'ko': {
      'app.title': 'VisualPlayer',
      'home.open': '파일 열기',
      'home.recent': '최근 재생',
      'home.empty': '재생 기록이 없습니다',
      'home.settings': '설정',
      'home.clear': '기록 지우기',
      'player.resumed': '이어 재생',
      'player.subtitles': '자막',
      'player.add_subtitle': '자막 파일 추가',
      'player.no_subtitle': '자막 끄기',
      'player.equalizer': '이퀄라이저',
      'player.eq_enable': '이퀄라이저 사용',
      'player.preamp': '프리앰프',
      'player.chapters': '챕터',
      'player.prev_chapter': '이전 챕터',
      'player.next_chapter': '다음 챕터',
      'player.speed': '재생 속도',
      'settings.title': '설정',
      'settings.theme': '테마',
      'settings.theme_system': '시스템',
      'settings.theme_light': '밝게',
      'settings.theme_dark': '어둡게',
      'settings.language': '언어',
      'settings.resume': '이전 위치에서 이어 재생',
      'settings.about': '정보',
      'settings.about_text': '비영리 오픈소스 미디어 플레이어. mpv 엔진으로 거의 모든 '
          '형식을 재생합니다.',
      'eq.flat': '플랫',
      'eq.rock': '록',
      'eq.pop': '팝',
      'eq.jazz': '재즈',
      'eq.classical': '클래식',
      'eq.dance': '댄스',
      'eq.bass': '저음 강화',
      'eq.treble': '고음 강화',
      'eq.vocal': '보컬',
      'eq.soft': '소프트',
    },
    'ja': {
      'app.title': 'VisualPlayer',
      'home.open': 'ファイルを開く',
      'home.recent': '最近の再生',
      'home.empty': '再生履歴がありません',
      'home.settings': '設定',
      'home.clear': '履歴を消去',
      'player.resumed': '再開しました',
      'player.subtitles': '字幕',
      'player.add_subtitle': '字幕ファイルを追加',
      'player.no_subtitle': '字幕をオフ',
      'player.equalizer': 'イコライザー',
      'player.eq_enable': 'イコライザーを有効化',
      'player.preamp': 'プリアンプ',
      'player.chapters': 'チャプター',
      'player.prev_chapter': '前のチャプター',
      'player.next_chapter': '次のチャプター',
      'player.speed': '再生速度',
      'settings.title': '設定',
      'settings.theme': 'テーマ',
      'settings.theme_system': 'システム',
      'settings.theme_light': 'ライト',
      'settings.theme_dark': 'ダーク',
      'settings.language': '言語',
      'settings.resume': '前回の位置から再開',
      'settings.about': '情報',
      'settings.about_text': '非営利のオープンソース・メディアプレーヤー。mpv エンジンで'
          'ほぼすべての形式を再生します。',
      'eq.flat': 'フラット',
      'eq.rock': 'ロック',
      'eq.pop': 'ポップ',
      'eq.jazz': 'ジャズ',
      'eq.classical': 'クラシック',
      'eq.dance': 'ダンス',
      'eq.bass': '低音強調',
      'eq.treble': '高音強調',
      'eq.vocal': 'ボーカル',
      'eq.soft': 'ソフト',
    },
  };
}
