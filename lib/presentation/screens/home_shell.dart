import 'package:flutter/material.dart';

import '../../application/app_scope.dart';
import '../format.dart';
import 'calculator_screen.dart';
import 'dashboard_screen.dart';
import 'expenses_screen.dart';
import 'goals_screen.dart';
import 'settings_screen.dart';

/// Bottom-navigation shell. Tabs keep their state via [IndexedStack].
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;
  late final AppLifecycleListener _lifecycle;

  @override
  void initState() {
    super.initState();
    _lifecycle = AppLifecycleListener(
      onResume: () => AppScope.read(context).onResumed(),
    );
  }

  @override
  void dispose() {
    _lifecycle.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: [
          DashboardScreen(onOpenGoals: () => setState(() => _index = 2)),
          const ExpensesScreen(),
          const GoalsScreen(),
          const CalculatorScreen(),
          const SettingsScreen(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          NavigationDestination(
            key: const Key('nav.home'),
            icon: const Icon(Icons.home_outlined),
            selectedIcon: const Icon(Icons.home),
            label: l.navHome,
          ),
          NavigationDestination(
            key: const Key('nav.expenses'),
            icon: const Icon(Icons.receipt_long_outlined),
            selectedIcon: const Icon(Icons.receipt_long),
            label: l.navExpenses,
          ),
          NavigationDestination(
            key: const Key('nav.goals'),
            icon: const Icon(Icons.flag_outlined),
            selectedIcon: const Icon(Icons.flag),
            label: l.navGoals,
          ),
          NavigationDestination(
            key: const Key('nav.plan'),
            icon: const Icon(Icons.calculate_outlined),
            selectedIcon: const Icon(Icons.calculate),
            label: l.navPlan,
          ),
          NavigationDestination(
            key: const Key('nav.settings'),
            icon: const Icon(Icons.settings_outlined),
            selectedIcon: const Icon(Icons.settings),
            label: l.navSettings,
          ),
        ],
      ),
    );
  }
}
