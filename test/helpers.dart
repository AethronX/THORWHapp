import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:tharwati/app.dart';
import 'package:tharwati/application/app_controller.dart';
import 'package:tharwati/data/database.dart';

/// sqflite's FFI factory performs real async file I/O, which the widget-test
/// fake clock cannot complete on its own. Interleave short real waits with
/// frame pumps until the UI is idle.
Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 5)),
    );
    await tester.pump(const Duration(milliseconds: 50));
  }
  await tester.pumpAndSettle();
}

/// Fixed "today" for deterministic tests.
final testClock = DateTime(2026, 10, 9, 10);

/// Test-only database location. Real user data never touches tests.
class TestDb {
  late Directory dir;
  late String path;

  Future<void> create() async {
    sqfliteFfiInit();
    dir = await Directory.systemTemp.createTemp('tharwati_test');
    path = p.join(dir.path, databaseFileName);
  }

  Future<void> delete() => dir.delete(recursive: true);
}

/// Pumps the real app on a phone-sized surface backed by [db].
Future<AppController> launchApp(
  WidgetTester tester,
  TestDb db, {
  double textScale = 1.0,
}) async {
  tester.view.physicalSize = const Size(1080, 2340);
  tester.view.devicePixelRatio = 2.625;
  tester.platformDispatcher.textScaleFactorTestValue = textScale;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  final c = AppController(
    dbFactory: databaseFactoryFfiNoIsolate,
    dbPath: db.path,
    clock: () => testClock,
  );
  await tester.pumpWidget(TharwatiApp(controller: c));
  unawaited(c.init());
  await settle(tester);
  return c;
}

Future<void> closeApp(WidgetTester tester, AppController c) async {
  await tester.pumpWidget(const SizedBox());
  c.dispose();
  await tester.pumpAndSettle();
}
