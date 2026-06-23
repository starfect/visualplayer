import 'package:flutter/material.dart';

import '../../core/i18n.dart';
import '../backup/backup.dart';
import '../bookmarks/bookmarks.dart';
import '../history/history.dart';
import 'settings.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({
    super.key,
    required this.settings,
    required this.history,
    required this.bookmarks,
  });

  final Settings settings;
  final History history;
  final Bookmarks bookmarks;

  Future<void> _export(BuildContext context) async {
    final backup = Backup(settings: settings, history: history, bookmarks: bookmarks);
    final saved = await backup.export();
    if (saved != null && context.mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(L.t('backup.exported'))));
    }
  }

  Future<void> _import(BuildContext context) async {
    final backup = Backup(settings: settings, history: history, bookmarks: bookmarks);
    final ok = await backup.import();
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(L.t(ok ? 'backup.imported' : 'backup.failed')),
      ));
    }
  }

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
              dense: true,
              title: Text(L.t('settings.backup'),
                  style: Theme.of(context).textTheme.labelLarge),
            ),
            ListTile(
              leading: const Icon(Icons.upload_file),
              title: Text(L.t('backup.export')),
              subtitle: Text(L.t('backup.export_hint')),
              onTap: () => _export(context),
            ),
            ListTile(
              leading: const Icon(Icons.download),
              title: Text(L.t('backup.import')),
              subtitle: Text(L.t('backup.import_hint')),
              onTap: () => _import(context),
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
