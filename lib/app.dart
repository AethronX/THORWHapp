import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'application/app_controller.dart';
import 'application/app_scope.dart';
import 'l10n/app_localizations.dart';
import 'presentation/format.dart';
import 'presentation/screens/home_shell.dart';
import 'presentation/screens/onboarding_screen.dart';
import 'presentation/theme/app_theme.dart';
import 'presentation/theme/tokens.dart';
import 'presentation/widgets/common.dart';

class TharwatiApp extends StatelessWidget {
  const TharwatiApp({super.key, required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    return AppScope(
      controller: controller,
      child: ListenableBuilder(
        listenable: controller,
        builder: (context, _) => MaterialApp(
          onGenerateTitle: (c) => AppLocalizations.of(c).appTitle,
          debugShowCheckedModeBanner: false,
          locale: controller.locale,
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          theme: buildTheme(AppPalette.light),
          darkTheme: buildTheme(AppPalette.dark),
          themeMode: controller.themeMode,
          home: const _Root(),
        ),
      ),
    );
  }
}

/// Routes between loading / error / onboarding / main app.
class _Root extends StatelessWidget {
  const _Root();

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    return switch (app.status) {
      LoadStatus.loading => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      LoadStatus.error => Scaffold(
        body: ErrorView(message: context.l10n.errLoad, onRetry: app.init),
      ),
      LoadStatus.ready =>
        app.onboarded ? const HomeShell() : const OnboardingScreen(),
    };
  }
}
