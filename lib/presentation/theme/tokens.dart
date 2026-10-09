import 'package:flutter/material.dart';

/// Design tokens: the single source of truth for colour, spacing, radius and
/// type. Widgets must use these (via [AppTokens.of] / `Theme.of`) rather than
/// literal values. Contrast of every text/background pair is checked in
/// `test/presentation/contrast_test.dart` (WCAG AA, >= 4.5:1).
abstract final class Space {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;

  /// Side gutter of every screen.
  static const double gutter = 16;
}

abstract final class Radii {
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double pill = 999;
}

/// Minimum interactive target (Material / WCAG 2.5.8 guidance).
const double minTapTarget = 48;

const String fontFamily = 'IBMPlexSansArabic';

/// Semantic palette for one brightness.
@immutable
class AppPalette {
  const AppPalette({
    required this.brightness,
    required this.primary,
    required this.onPrimary,
    required this.primaryContainer,
    required this.onPrimaryContainer,
    required this.accent,
    required this.background,
    required this.surface,
    required this.surfaceMuted,
    required this.onSurface,
    required this.onSurfaceMuted,
    required this.outline,
    required this.positive,
    required this.warning,
    required this.negative,
    required this.onNegative,
  });

  final Brightness brightness;

  /// Brand: deep teal — calm, trustworthy.
  final Color primary;
  final Color onPrimary;
  final Color primaryContainer;
  final Color onPrimaryContainer;

  /// Muted gold, used sparingly for highlights (never for body text).
  final Color accent;

  final Color background;
  final Color surface;
  final Color surfaceMuted;
  final Color onSurface;
  final Color onSurfaceMuted;
  final Color outline;

  /// Semantic states. Always paired with an icon or text, never colour alone.
  final Color positive;
  final Color warning;
  final Color negative;
  final Color onNegative;

  static const light = AppPalette(
    brightness: Brightness.light,
    primary: Color(0xFF0B5D51),
    onPrimary: Color(0xFFFFFFFF),
    primaryContainer: Color(0xFFD3EEE7),
    onPrimaryContainer: Color(0xFF00201B),
    accent: Color(0xFFB8892B),
    background: Color(0xFFF6F7F5),
    surface: Color(0xFFFFFFFF),
    surfaceMuted: Color(0xFFEDF1EF),
    onSurface: Color(0xFF17201E),
    onSurfaceMuted: Color(0xFF4B5754),
    outline: Color(0xFFC7D0CD),
    positive: Color(0xFF1B6E40),
    warning: Color(0xFF8A5200),
    negative: Color(0xFFB3261E),
    onNegative: Color(0xFFFFFFFF),
  );

  static const dark = AppPalette(
    brightness: Brightness.dark,
    primary: Color(0xFF7BD5C3),
    onPrimary: Color(0xFF00382F),
    primaryContainer: Color(0xFF0E4A41),
    onPrimaryContainer: Color(0xFFD3EEE7),
    accent: Color(0xFFE2BD6B),
    background: Color(0xFF0F1413),
    surface: Color(0xFF182120),
    surfaceMuted: Color(0xFF212B29),
    onSurface: Color(0xFFE2E8E6),
    onSurfaceMuted: Color(0xFFA8B4B1),
    outline: Color(0xFF3B4744),
    positive: Color(0xFF7FD9A3),
    warning: Color(0xFFF2C46D),
    negative: Color(0xFFFFB4AB),
    onNegative: Color(0xFF690005),
  );
}

/// Exposes the palette to widgets through the theme.
class AppTokens extends ThemeExtension<AppTokens> {
  const AppTokens(this.palette);

  final AppPalette palette;

  static AppPalette of(BuildContext context) =>
      Theme.of(context).extension<AppTokens>()!.palette;

  @override
  AppTokens copyWith({AppPalette? palette}) =>
      AppTokens(palette ?? this.palette);

  @override
  AppTokens lerp(AppTokens? other, double t) =>
      t < 0.5 ? this : (other ?? this);
}
