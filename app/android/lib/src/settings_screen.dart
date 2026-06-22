import 'package:flutter/material.dart';

import 'i18n.dart';
import 'settings.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key, required this.settings});

  final Settings settings;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(L.t('settings.title'))),
      body: AnimatedBuilder(
        animation: settings,
        builder: (context, _) => ListView(
          children: [
            ListTile(
              title: Text(L.t('settings.theme')),
              trailing: DropdownButton<ThemeMode>(
                value: settings.theme,
                onChanged: (mode) {
                  if (mode != null) settings.theme = mode;
                },
                items: [
                  DropdownMenuItem(
                      value: ThemeMode.system,
                      child: Text(L.t('settings.theme_system'))),
                  DropdownMenuItem(
                      value: ThemeMode.light,
                      child: Text(L.t('settings.theme_light'))),
                  DropdownMenuItem(
                      value: ThemeMode.dark,
                      child: Text(L.t('settings.theme_dark'))),
                ],
              ),
            ),
            ListTile(
              title: Text(L.t('settings.language')),
              trailing: DropdownButton<String>(
                value: settings.language,
                onChanged: (code) {
                  if (code != null) settings.language = code;
                },
                items: L.supported
                    .map((code) => DropdownMenuItem(
                          value: code,
                          child: Text(L.label(code)),
                        ))
                    .toList(),
              ),
            ),
            SwitchListTile(
              title: Text(L.t('settings.resume')),
              value: settings.resume,
              onChanged: (v) => settings.resume = v,
            ),
            const Divider(),
            ListTile(
              title: Text(L.t('settings.about')),
              subtitle: Text(L.t('settings.about_text')),
            ),
          ],
        ),
      ),
    );
  }
}
