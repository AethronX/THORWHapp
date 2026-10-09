// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Tharwati';

  @override
  String get onbTitle1 => 'Know where your money goes';

  @override
  String get onbBody1 =>
      'Record your income and expenses in seconds and see your month at a glance.';

  @override
  String get onbTitle2 => 'Plan your salary';

  @override
  String get onbBody2 =>
      'Set a simple monthly budget per category and get a heads-up before you overspend.';

  @override
  String get onbTitle3 => 'Build your savings habit';

  @override
  String get onbBody3 =>
      'Set goals with a target date and see exactly how much to save each month.';

  @override
  String get onbPrivacy =>
      'Your data stays on this device. No bank login, no account required.';

  @override
  String get next => 'Next';

  @override
  String get back => 'Back';

  @override
  String get skip => 'Skip';

  @override
  String get getStarted => 'Get started';

  @override
  String get setupTitle => 'Quick setup';

  @override
  String get setupCurrencyLabel => 'Your currency';

  @override
  String get setupIncomeLabel => 'Monthly income (optional)';

  @override
  String get setupIncomeHint => 'e.g. salary after deductions';

  @override
  String get setupFinish => 'Start using Tharwati';

  @override
  String get currencyLockedNote =>
      'Amounts are not converted between currencies. To change currency later you will need to reset your data.';

  @override
  String get navHome => 'Home';

  @override
  String get navExpenses => 'Expenses';

  @override
  String get navGoals => 'Goals';

  @override
  String get navPlan => 'Plan';

  @override
  String get navSettings => 'Settings';

  @override
  String get income => 'Income';

  @override
  String get expenses => 'Expenses';

  @override
  String get net => 'Left over';

  @override
  String get savingsRate => 'Savings rate';

  @override
  String get notAvailable => '—';

  @override
  String get monthSummary => 'This month';

  @override
  String get addIncome => 'Add income';

  @override
  String get editIncome => 'Edit income';

  @override
  String get manageIncome => 'Manage income';

  @override
  String get copyLastMonthIncome => 'Use last month\'s income';

  @override
  String get noIncomeYet => 'No income recorded for this month yet.';

  @override
  String get budgetsTitle => 'Budgets';

  @override
  String get setBudgets => 'Set budgets';

  @override
  String get noBudgets =>
      'No budgets yet. Set a monthly limit for the categories you want to watch.';

  @override
  String get goalsTitle => 'Savings goals';

  @override
  String get noGoalsShort => 'No goals yet.';

  @override
  String get insightsTitle => 'Heads-up';

  @override
  String get allGood => 'No alerts this month. Keep it up!';

  @override
  String get seeAll => 'See all';

  @override
  String get prevMonth => 'Previous month';

  @override
  String get nextMonth => 'Next month';

  @override
  String get insightNoIncome =>
      'You have expenses but no income recorded for this month.';

  @override
  String insightNegativeCashFlow(String amount) {
    return 'You are spending $amount more than your income this month.';
  }

  @override
  String insightOverBudget(String category, String amount) {
    return '$category is over budget by $amount.';
  }

  @override
  String insightNearBudget(String category, String amount) {
    return '$category is close to its limit: $amount left.';
  }

  @override
  String insightGoalAtRisk(String goal, String amount) {
    return '\"$goal\" needs $amount a month, more than what is left over this month.';
  }

  @override
  String insightGoalOverdue(String goal, String amount) {
    return '\"$goal\" passed its target date with $amount still to go. Consider a new date.';
  }

  @override
  String get addExpense => 'Add expense';

  @override
  String get editExpense => 'Edit expense';

  @override
  String get amount => 'Amount';

  @override
  String get category => 'Category';

  @override
  String get date => 'Date';

  @override
  String get note => 'Note';

  @override
  String get noteHint => 'Optional';

  @override
  String get save => 'Save';

  @override
  String get delete => 'Delete';

  @override
  String get cancel => 'Cancel';

  @override
  String get edit => 'Edit';

  @override
  String get deleteExpenseConfirm => 'Delete this expense?';

  @override
  String get noExpenses => 'No expenses this month';

  @override
  String get noExpensesBody => 'Tap \"Add expense\" to record your first one.';

  @override
  String get deleted => 'Deleted';

  @override
  String get saved => 'Saved';

  @override
  String get errAmountEmpty => 'Enter an amount';

  @override
  String get errAmountInvalid => 'Enter a valid number';

  @override
  String errAmountDecimals(int count) {
    return 'Use at most $count decimal places';
  }

  @override
  String get errAmountTooLarge => 'Amount is too large';

  @override
  String get errAmountPositive => 'Amount must be greater than zero';

  @override
  String get errCategoryRequired => 'Choose a category';

  @override
  String get errNameEmpty => 'Enter a name';

  @override
  String get errGeneric => 'Something went wrong. Your data was not changed.';

  @override
  String get errLoad => 'Could not open your data.';

  @override
  String get retry => 'Retry';

  @override
  String get salaryLabel => 'Salary';

  @override
  String get incomeTitle => 'Income';

  @override
  String get incomeLabel => 'Source';

  @override
  String get incomeLabelHint => 'e.g. Salary';

  @override
  String get incomeTotal => 'Total income';

  @override
  String get deleteIncomeConfirm => 'Delete this income entry?';

  @override
  String get budgetsScreenTitle => 'Monthly budgets';

  @override
  String get budgetsScreenHint =>
      'Limits repeat every month. Leave empty for no limit.';

  @override
  String get monthlyLimit => 'Monthly limit';

  @override
  String get noLimit => 'No limit';

  @override
  String budgetUsage(String spent, String limit) {
    return '$spent of $limit';
  }

  @override
  String overBy(String amount) {
    return 'Over by $amount';
  }

  @override
  String remaining(String amount) {
    return '$amount left';
  }

  @override
  String percentUsed(int percent) {
    return '$percent% used';
  }

  @override
  String get clearLimit => 'Remove limit';

  @override
  String get addGoal => 'New goal';

  @override
  String get editGoal => 'Edit goal';

  @override
  String get goalName => 'Goal name';

  @override
  String get goalNameHint => 'e.g. Emergency fund, Car, Wedding';

  @override
  String get goalTarget => 'Target amount';

  @override
  String get goalTargetDate => 'Target date';

  @override
  String get goalAlreadySaved => 'Already saved (optional)';

  @override
  String goalSaved(String saved, String target) {
    return '$saved of $target';
  }

  @override
  String goalRequiredMonthly(String amount) {
    return 'Save $amount a month to reach it on time';
  }

  @override
  String get goalReached => 'Goal reached';

  @override
  String get goalOverdue => 'Target date passed';

  @override
  String goalDue(String date) {
    return 'By $date';
  }

  @override
  String monthsLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count months left',
      one: '1 month left',
      zero: 'Due this month',
    );
    return '$_temp0';
  }

  @override
  String get addMoney => 'Add money';

  @override
  String get withdraw => 'Withdraw';

  @override
  String get contributionAmount => 'Amount';

  @override
  String get errWithdrawTooMuch => 'You cannot withdraw more than is saved';

  @override
  String get deleteGoalConfirm => 'Delete this goal and its history?';

  @override
  String get goalsEmpty => 'No savings goals yet';

  @override
  String get goalsEmptyBody =>
      'A goal with a date turns \"I should save\" into a monthly number.';

  @override
  String get planTitle => 'Savings calculator';

  @override
  String get calcIntro =>
      'See how regular saving adds up, and how a hypothetical return or inflation could change it.';

  @override
  String get calcInitial => 'Starting amount';

  @override
  String get calcMonthly => 'Monthly saving';

  @override
  String get calcYears => 'Years';

  @override
  String get calcRate => 'Hypothetical annual return %';

  @override
  String get calcInflation => 'Assumed annual inflation %';

  @override
  String get calcContributed => 'You put in';

  @override
  String get calcNoReturn => 'Saving only (0% return)';

  @override
  String calcWithReturn(String rate) {
    return 'With a hypothetical $rate% return';
  }

  @override
  String get calcGrowth => 'Hypothetical growth';

  @override
  String calcRealValue(String rate) {
    return 'In today\'s money ($rate% inflation)';
  }

  @override
  String get calcDisclaimer =>
      'Illustration only — not a forecast, a guarantee, or investment advice. Real returns vary and can be negative. Results are before fees and taxes. Returns are compounded monthly; deposits are at the end of each month.';

  @override
  String get errRateRange => 'Enter 0 to 100';

  @override
  String get errInflationRange => 'Enter -50 to 100';

  @override
  String get errYearsRange => 'Enter 1 to 50 years';

  @override
  String get settingsTitle => 'Settings';

  @override
  String get language => 'Language';

  @override
  String get arabic => 'العربية';

  @override
  String get english => 'English';

  @override
  String get theme => 'Appearance';

  @override
  String get themeSystem => 'System';

  @override
  String get themeLight => 'Light';

  @override
  String get themeDark => 'Dark';

  @override
  String get currency => 'Currency';

  @override
  String get categories => 'Categories';

  @override
  String get addCategory => 'Add category';

  @override
  String get rename => 'Rename';

  @override
  String get categoryName => 'Category name';

  @override
  String get categoryArchivedNote =>
      'Category has expenses, so it was hidden instead of deleted.';

  @override
  String get deleteCategoryConfirm => 'Delete this category?';

  @override
  String get privacy => 'Privacy & data';

  @override
  String get privacyBody =>
      'Tharwati v1 stores everything only on this device. Nothing is uploaded, there are no ads and no tracking. Uninstalling the app removes the data.';

  @override
  String get deleteAllData => 'Delete all my data';

  @override
  String get deleteAllConfirmTitle => 'Delete everything?';

  @override
  String get deleteAllConfirmBody =>
      'This permanently deletes all income, expenses, budgets and goals on this device. It cannot be undone.';

  @override
  String get deleteAllConfirmAction => 'Delete permanently';

  @override
  String get about => 'About';

  @override
  String get aboutBody =>
      'Tharwati helps you plan and track your money. It does not provide investment, tax or legal advice.';

  @override
  String version(String version) {
    return 'Version $version';
  }

  @override
  String get cat_housing => 'Housing';

  @override
  String get cat_food => 'Food & groceries';

  @override
  String get cat_transport => 'Transport & fuel';

  @override
  String get cat_utilities => 'Electricity & water';

  @override
  String get cat_telecom => 'Phone & internet';

  @override
  String get cat_health => 'Health';

  @override
  String get cat_education => 'Education';

  @override
  String get cat_family => 'Family & gifts';

  @override
  String get cat_shopping => 'Shopping';

  @override
  String get cat_entertainment => 'Entertainment';

  @override
  String get cat_debt => 'Loan payments';

  @override
  String get cat_other => 'Other';
}
