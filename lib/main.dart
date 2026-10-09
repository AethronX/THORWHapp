import 'package:flutter/widgets.dart';
import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

import 'app.dart';
import 'application/app_controller.dart';
import 'data/database.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final dir = await getDatabasesPath();
  final controller = AppController(
    dbFactory: databaseFactory,
    dbPath: p.join(dir, databaseFileName),
  );
  runApp(TharwatiApp(controller: controller));
  await controller.init();
}
