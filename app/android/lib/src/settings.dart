import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'i18n.dart';

/// App settings, persisted with `shared_preferences` and exposed as a
/// [ChangeNotifier] so widgets can rebuild on change.
class Settings extends ChangeNotifier {
  Settings(this._prefs) {
    _theme = _readTheme();
    _language = _prefs.getString(_kLanguage) ?? 'en';
    _resume = _prefs.getBool(_kResume) ?? true;
    L.lang.value = _language;
  }

  static const _kTheme = 'theme';
  static const _kLanguage = 'language';
  static const _kResume = 'resume';

  final SharedPreferences _prefs;

  late ThemeMode _theme;
  late String _language;
  late bool _resume;

  ThemeMode get theme => _theme;
  String get language => _language;
  bool get resume => _resume;

  ThemeMode _readTheme() {
    switch (_prefs.getString(_kTheme)) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  set theme(ThemeMode mode) {
    _theme = mode;
    _prefs.setString(_kTheme, mode.name);
    notifyListeners();
  }

  set language(String code) {
    _language = code;
    L.lang.value = code;
    _prefs.setString(_kLanguage, code);
    notifyListeners();
  }

  set resume(bool value) {
    _resume = value;
    _prefs.setBool(_kResume, value);
    notifyListeners();
  }
}
