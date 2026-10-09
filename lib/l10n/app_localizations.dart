import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('en'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'Tharwati'**
  String get appTitle;

  /// No description provided for @onbTitle1.
  ///
  /// In en, this message translates to:
  /// **'Know where your money goes'**
  String get onbTitle1;

  /// No description provided for @onbBody1.
  ///
  /// In en, this message translates to:
  /// **'Record your income and expenses in seconds and see your month at a glance.'**
  String get onbBody1;

  /// No description provided for @onbTitle2.
  ///
  /// In en, this message translates to:
  /// **'Plan your salary'**
  String get onbTitle2;

  /// No description provided for @onbBody2.
  ///
  /// In en, this message translates to:
  /// **'Set a simple monthly budget per category and get a heads-up before you overspend.'**
  String get onbBody2;

  /// No description provided for @onbTitle3.
  ///
  /// In en, this message translates to:
  /// **'Build your savings habit'**
  String get onbTitle3;

  /// No description provided for @onbBody3.
  ///
  /// In en, this message translates to:
  /// **'Set goals with a target date and see exactly how much to save each month.'**
  String get onbBody3;

  /// No description provided for @onbPrivacy.
  ///
  /// In en, this message translates to:
  /// **'Your data stays on this device. No bank login, no account required.'**
  String get onbPrivacy;

  /// No description provided for @next.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get next;

  /// No description provided for @back.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get back;

  /// No description provided for @skip.
  ///
  /// In en, this message translates to:
  /// **'Skip'**
  String get skip;

  /// No description provided for @getStarted.
  ///
  /// In en, this message translates to:
  /// **'Get started'**
  String get getStarted;

  /// No description provided for @setupTitle.
  ///
  /// In en, this message translates to:
  /// **'Quick setup'**
  String get setupTitle;

  /// No description provided for @setupCurrencyLabel.
  ///
  /// In en, this message translates to:
  /// **'Your currency'**
  String get setupCurrencyLabel;

  /// No description provided for @setupIncomeLabel.
  ///
  /// In en, this message translates to:
  /// **'Monthly income (optional)'**
  String get setupIncomeLabel;

  /// No description provided for @setupIncomeHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. salary after deductions'**
  String get setupIncomeHint;

  /// No description provided for @setupFinish.
  ///
  /// In en, this message translates to:
  /// **'Start using Tharwati'**
  String get setupFinish;

  /// No description provided for @currencyLockedNote.
  ///
  /// In en, this message translates to:
  /// **'Amounts are not converted between currencies. To change currency later you will need to reset your data.'**
  String get currencyLockedNote;

  /// No description provided for @navHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get navHome;

  /// No description provided for @navExpenses.
  ///
  /// In en, this message translates to:
  /// **'Expenses'**
  String get navExpenses;

  /// No description provided for @navGoals.
  ///
  /// In en, this message translates to:
  /// **'Goals'**
  String get navGoals;

  /// No description provided for @navPlan.
  ///
  /// In en, this message translates to:
  /// **'Plan'**
  String get navPlan;

  /// No description provided for @navSettings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get navSettings;

  /// No description provided for @income.
  ///
  /// In en, this message translates to:
  /// **'Income'**
  String get income;

  /// No description provided for @expenses.
  ///
  /// In en, this message translates to:
  /// **'Expenses'**
  String get expenses;

  /// No description provided for @net.
  ///
  /// In en, this message translates to:
  /// **'Left over'**
  String get net;

  /// No description provided for @savingsRate.
  ///
  /// In en, this message translates to:
  /// **'Savings rate'**
  String get savingsRate;

  /// No description provided for @notAvailable.
  ///
  /// In en, this message translates to:
  /// **'—'**
  String get notAvailable;

  /// No description provided for @monthSummary.
  ///
  /// In en, this message translates to:
  /// **'This month'**
  String get monthSummary;

  /// No description provided for @addIncome.
  ///
  /// In en, this message translates to:
  /// **'Add income'**
  String get addIncome;

  /// No description provided for @editIncome.
  ///
  /// In en, this message translates to:
  /// **'Edit income'**
  String get editIncome;

  /// No description provided for @manageIncome.
  ///
  /// In en, this message translates to:
  /// **'Manage income'**
  String get manageIncome;

  /// No description provided for @copyLastMonthIncome.
  ///
  /// In en, this message translates to:
  /// **'Use last month\'s income'**
  String get copyLastMonthIncome;

  /// No description provided for @noIncomeYet.
  ///
  /// In en, this message translates to:
  /// **'No income recorded for this month yet.'**
  String get noIncomeYet;

  /// No description provided for @budgetsTitle.
  ///
  /// In en, this message translates to:
  /// **'Budgets'**
  String get budgetsTitle;

  /// No description provided for @setBudgets.
  ///
  /// In en, this message translates to:
  /// **'Set budgets'**
  String get setBudgets;

  /// No description provided for @noBudgets.
  ///
  /// In en, this message translates to:
  /// **'No budgets yet. Set a monthly limit for the categories you want to watch.'**
  String get noBudgets;

  /// No description provided for @goalsTitle.
  ///
  /// In en, this message translates to:
  /// **'Savings goals'**
  String get goalsTitle;

  /// No description provided for @noGoalsShort.
  ///
  /// In en, this message translates to:
  /// **'No goals yet.'**
  String get noGoalsShort;

  /// No description provided for @insightsTitle.
  ///
  /// In en, this message translates to:
  /// **'Heads-up'**
  String get insightsTitle;

  /// No description provided for @allGood.
  ///
  /// In en, this message translates to:
  /// **'No alerts this month. Keep it up!'**
  String get allGood;

  /// No description provided for @seeAll.
  ///
  /// In en, this message translates to:
  /// **'See all'**
  String get seeAll;

  /// No description provided for @prevMonth.
  ///
  /// In en, this message translates to:
  /// **'Previous month'**
  String get prevMonth;

  /// No description provided for @nextMonth.
  ///
  /// In en, this message translates to:
  /// **'Next month'**
  String get nextMonth;

  /// No description provided for @insightNoIncome.
  ///
  /// In en, this message translates to:
  /// **'You have expenses but no income recorded for this month.'**
  String get insightNoIncome;

  /// No description provided for @insightNegativeCashFlow.
  ///
  /// In en, this message translates to:
  /// **'You are spending {amount} more than your income this month.'**
  String insightNegativeCashFlow(String amount);

  /// No description provided for @insightOverBudget.
  ///
  /// In en, this message translates to:
  /// **'{category} is over budget by {amount}.'**
  String insightOverBudget(String category, String amount);

  /// No description provided for @insightNearBudget.
  ///
  /// In en, this message translates to:
  /// **'{category} is close to its limit: {amount} left.'**
  String insightNearBudget(String category, String amount);

  /// No description provided for @insightGoalAtRisk.
  ///
  /// In en, this message translates to:
  /// **'\"{goal}\" needs {amount} a month, more than what is left over this month.'**
  String insightGoalAtRisk(String goal, String amount);

  /// No description provided for @insightGoalOverdue.
  ///
  /// In en, this message translates to:
  /// **'\"{goal}\" passed its target date with {amount} still to go. Consider a new date.'**
  String insightGoalOverdue(String goal, String amount);

  /// No description provided for @addExpense.
  ///
  /// In en, this message translates to:
  /// **'Add expense'**
  String get addExpense;

  /// No description provided for @editExpense.
  ///
  /// In en, this message translates to:
  /// **'Edit expense'**
  String get editExpense;

  /// No description provided for @amount.
  ///
  /// In en, this message translates to:
  /// **'Amount'**
  String get amount;

  /// No description provided for @category.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get category;

  /// No description provided for @date.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get date;

  /// No description provided for @note.
  ///
  /// In en, this message translates to:
  /// **'Note'**
  String get note;

  /// No description provided for @noteHint.
  ///
  /// In en, this message translates to:
  /// **'Optional'**
  String get noteHint;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @delete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get delete;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @edit.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get edit;

  /// No description provided for @deleteExpenseConfirm.
  ///
  /// In en, this message translates to:
  /// **'Delete this expense?'**
  String get deleteExpenseConfirm;

  /// No description provided for @noExpenses.
  ///
  /// In en, this message translates to:
  /// **'No expenses this month'**
  String get noExpenses;

  /// No description provided for @noExpensesBody.
  ///
  /// In en, this message translates to:
  /// **'Tap \"Add expense\" to record your first one.'**
  String get noExpensesBody;

  /// No description provided for @deleted.
  ///
  /// In en, this message translates to:
  /// **'Deleted'**
  String get deleted;

  /// No description provided for @saved.
  ///
  /// In en, this message translates to:
  /// **'Saved'**
  String get saved;

  /// No description provided for @errAmountEmpty.
  ///
  /// In en, this message translates to:
  /// **'Enter an amount'**
  String get errAmountEmpty;

  /// No description provided for @errAmountInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid number'**
  String get errAmountInvalid;

  /// No description provided for @errAmountDecimals.
  ///
  /// In en, this message translates to:
  /// **'Use at most {count} decimal places'**
  String errAmountDecimals(int count);

  /// No description provided for @errAmountTooLarge.
  ///
  /// In en, this message translates to:
  /// **'Amount is too large'**
  String get errAmountTooLarge;

  /// No description provided for @errAmountPositive.
  ///
  /// In en, this message translates to:
  /// **'Amount must be greater than zero'**
  String get errAmountPositive;

  /// No description provided for @errCategoryRequired.
  ///
  /// In en, this message translates to:
  /// **'Choose a category'**
  String get errCategoryRequired;

  /// No description provided for @errNameEmpty.
  ///
  /// In en, this message translates to:
  /// **'Enter a name'**
  String get errNameEmpty;

  /// No description provided for @errGeneric.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Your data was not changed.'**
  String get errGeneric;

  /// No description provided for @errLoad.
  ///
  /// In en, this message translates to:
  /// **'Could not open your data.'**
  String get errLoad;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get retry;

  /// No description provided for @salaryLabel.
  ///
  /// In en, this message translates to:
  /// **'Salary'**
  String get salaryLabel;

  /// No description provided for @incomeTitle.
  ///
  /// In en, this message translates to:
  /// **'Income'**
  String get incomeTitle;

  /// No description provided for @incomeLabel.
  ///
  /// In en, this message translates to:
  /// **'Source'**
  String get incomeLabel;

  /// No description provided for @incomeLabelHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Salary'**
  String get incomeLabelHint;

  /// No description provided for @incomeTotal.
  ///
  /// In en, this message translates to:
  /// **'Total income'**
  String get incomeTotal;

  /// No description provided for @deleteIncomeConfirm.
  ///
  /// In en, this message translates to:
  /// **'Delete this income entry?'**
  String get deleteIncomeConfirm;

  /// No description provided for @budgetsScreenTitle.
  ///
  /// In en, this message translates to:
  /// **'Monthly budgets'**
  String get budgetsScreenTitle;

  /// No description provided for @budgetsScreenHint.
  ///
  /// In en, this message translates to:
  /// **'Limits repeat every month. Leave empty for no limit.'**
  String get budgetsScreenHint;

  /// No description provided for @monthlyLimit.
  ///
  /// In en, this message translates to:
  /// **'Monthly limit'**
  String get monthlyLimit;

  /// No description provided for @noLimit.
  ///
  /// In en, this message translates to:
  /// **'No limit'**
  String get noLimit;

  /// No description provided for @budgetUsage.
  ///
  /// In en, this message translates to:
  /// **'{spent} of {limit}'**
  String budgetUsage(String spent, String limit);

  /// No description provided for @overBy.
  ///
  /// In en, this message translates to:
  /// **'Over by {amount}'**
  String overBy(String amount);

  /// No description provided for @remaining.
  ///
  /// In en, this message translates to:
  /// **'{amount} left'**
  String remaining(String amount);

  /// No description provided for @percentUsed.
  ///
  /// In en, this message translates to:
  /// **'{percent}% used'**
  String percentUsed(int percent);

  /// No description provided for @clearLimit.
  ///
  /// In en, this message translates to:
  /// **'Remove limit'**
  String get clearLimit;

  /// No description provided for @addGoal.
  ///
  /// In en, this message translates to:
  /// **'New goal'**
  String get addGoal;

  /// No description provided for @editGoal.
  ///
  /// In en, this message translates to:
  /// **'Edit goal'**
  String get editGoal;

  /// No description provided for @goalName.
  ///
  /// In en, this message translates to:
  /// **'Goal name'**
  String get goalName;

  /// No description provided for @goalNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Emergency fund, Car, Wedding'**
  String get goalNameHint;

  /// No description provided for @goalTarget.
  ///
  /// In en, this message translates to:
  /// **'Target amount'**
  String get goalTarget;

  /// No description provided for @goalTargetDate.
  ///
  /// In en, this message translates to:
  /// **'Target date'**
  String get goalTargetDate;

  /// No description provided for @goalAlreadySaved.
  ///
  /// In en, this message translates to:
  /// **'Already saved (optional)'**
  String get goalAlreadySaved;

  /// No description provided for @goalSaved.
  ///
  /// In en, this message translates to:
  /// **'{saved} of {target}'**
  String goalSaved(String saved, String target);

  /// No description provided for @goalRequiredMonthly.
  ///
  /// In en, this message translates to:
  /// **'Save {amount} a month to reach it on time'**
  String goalRequiredMonthly(String amount);

  /// No description provided for @goalReached.
  ///
  /// In en, this message translates to:
  /// **'Goal reached'**
  String get goalReached;

  /// No description provided for @goalOverdue.
  ///
  /// In en, this message translates to:
  /// **'Target date passed'**
  String get goalOverdue;

  /// No description provided for @goalDue.
  ///
  /// In en, this message translates to:
  /// **'By {date}'**
  String goalDue(String date);

  /// No description provided for @monthsLeft.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Due this month} =1{1 month left} other{{count} months left}}'**
  String monthsLeft(int count);

  /// No description provided for @addMoney.
  ///
  /// In en, this message translates to:
  /// **'Add money'**
  String get addMoney;

  /// No description provided for @withdraw.
  ///
  /// In en, this message translates to:
  /// **'Withdraw'**
  String get withdraw;

  /// No description provided for @contributionAmount.
  ///
  /// In en, this message translates to:
  /// **'Amount'**
  String get contributionAmount;

  /// No description provided for @errWithdrawTooMuch.
  ///
  /// In en, this message translates to:
  /// **'You cannot withdraw more than is saved'**
  String get errWithdrawTooMuch;

  /// No description provided for @deleteGoalConfirm.
  ///
  /// In en, this message translates to:
  /// **'Delete this goal and its history?'**
  String get deleteGoalConfirm;

  /// No description provided for @goalsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No savings goals yet'**
  String get goalsEmpty;

  /// No description provided for @goalsEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'A goal with a date turns \"I should save\" into a monthly number.'**
  String get goalsEmptyBody;

  /// No description provided for @planTitle.
  ///
  /// In en, this message translates to:
  /// **'Savings calculator'**
  String get planTitle;

  /// No description provided for @calcIntro.
  ///
  /// In en, this message translates to:
  /// **'See how regular saving adds up, and how a hypothetical return or inflation could change it.'**
  String get calcIntro;

  /// No description provided for @calcInitial.
  ///
  /// In en, this message translates to:
  /// **'Starting amount'**
  String get calcInitial;

  /// No description provided for @calcMonthly.
  ///
  /// In en, this message translates to:
  /// **'Monthly saving'**
  String get calcMonthly;

  /// No description provided for @calcYears.
  ///
  /// In en, this message translates to:
  /// **'Years'**
  String get calcYears;

  /// No description provided for @calcRate.
  ///
  /// In en, this message translates to:
  /// **'Hypothetical annual return %'**
  String get calcRate;

  /// No description provided for @calcInflation.
  ///
  /// In en, this message translates to:
  /// **'Assumed annual inflation %'**
  String get calcInflation;

  /// No description provided for @calcContributed.
  ///
  /// In en, this message translates to:
  /// **'You put in'**
  String get calcContributed;

  /// No description provided for @calcNoReturn.
  ///
  /// In en, this message translates to:
  /// **'Saving only (0% return)'**
  String get calcNoReturn;

  /// No description provided for @calcWithReturn.
  ///
  /// In en, this message translates to:
  /// **'With a hypothetical {rate}% return'**
  String calcWithReturn(String rate);

  /// No description provided for @calcGrowth.
  ///
  /// In en, this message translates to:
  /// **'Hypothetical growth'**
  String get calcGrowth;

  /// No description provided for @calcRealValue.
  ///
  /// In en, this message translates to:
  /// **'In today\'s money ({rate}% inflation)'**
  String calcRealValue(String rate);

  /// No description provided for @calcDisclaimer.
  ///
  /// In en, this message translates to:
  /// **'Illustration only — not a forecast, a guarantee, or investment advice. Real returns vary and can be negative. Results are before fees and taxes. Returns are compounded monthly; deposits are at the end of each month.'**
  String get calcDisclaimer;

  /// No description provided for @errRateRange.
  ///
  /// In en, this message translates to:
  /// **'Enter 0 to 100'**
  String get errRateRange;

  /// No description provided for @errInflationRange.
  ///
  /// In en, this message translates to:
  /// **'Enter -50 to 100'**
  String get errInflationRange;

  /// No description provided for @errYearsRange.
  ///
  /// In en, this message translates to:
  /// **'Enter 1 to 50 years'**
  String get errYearsRange;

  /// No description provided for @settingsTitle.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settingsTitle;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @arabic.
  ///
  /// In en, this message translates to:
  /// **'العربية'**
  String get arabic;

  /// No description provided for @english.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get english;

  /// No description provided for @theme.
  ///
  /// In en, this message translates to:
  /// **'Appearance'**
  String get theme;

  /// No description provided for @themeSystem.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get themeSystem;

  /// No description provided for @themeLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get themeLight;

  /// No description provided for @themeDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get themeDark;

  /// No description provided for @currency.
  ///
  /// In en, this message translates to:
  /// **'Currency'**
  String get currency;

  /// No description provided for @categories.
  ///
  /// In en, this message translates to:
  /// **'Categories'**
  String get categories;

  /// No description provided for @addCategory.
  ///
  /// In en, this message translates to:
  /// **'Add category'**
  String get addCategory;

  /// No description provided for @rename.
  ///
  /// In en, this message translates to:
  /// **'Rename'**
  String get rename;

  /// No description provided for @categoryName.
  ///
  /// In en, this message translates to:
  /// **'Category name'**
  String get categoryName;

  /// No description provided for @categoryArchivedNote.
  ///
  /// In en, this message translates to:
  /// **'Category has expenses, so it was hidden instead of deleted.'**
  String get categoryArchivedNote;

  /// No description provided for @deleteCategoryConfirm.
  ///
  /// In en, this message translates to:
  /// **'Delete this category?'**
  String get deleteCategoryConfirm;

  /// No description provided for @privacy.
  ///
  /// In en, this message translates to:
  /// **'Privacy & data'**
  String get privacy;

  /// No description provided for @privacyBody.
  ///
  /// In en, this message translates to:
  /// **'Tharwati v1 stores everything only on this device. Nothing is uploaded, there are no ads and no tracking. Uninstalling the app removes the data.'**
  String get privacyBody;

  /// No description provided for @deleteAllData.
  ///
  /// In en, this message translates to:
  /// **'Delete all my data'**
  String get deleteAllData;

  /// No description provided for @deleteAllConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete everything?'**
  String get deleteAllConfirmTitle;

  /// No description provided for @deleteAllConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'This permanently deletes all income, expenses, budgets and goals on this device. It cannot be undone.'**
  String get deleteAllConfirmBody;

  /// No description provided for @deleteAllConfirmAction.
  ///
  /// In en, this message translates to:
  /// **'Delete permanently'**
  String get deleteAllConfirmAction;

  /// No description provided for @about.
  ///
  /// In en, this message translates to:
  /// **'About'**
  String get about;

  /// No description provided for @aboutBody.
  ///
  /// In en, this message translates to:
  /// **'Tharwati helps you plan and track your money. It does not provide investment, tax or legal advice.'**
  String get aboutBody;

  /// No description provided for @version.
  ///
  /// In en, this message translates to:
  /// **'Version {version}'**
  String version(String version);

  /// No description provided for @cat_housing.
  ///
  /// In en, this message translates to:
  /// **'Housing'**
  String get cat_housing;

  /// No description provided for @cat_food.
  ///
  /// In en, this message translates to:
  /// **'Food & groceries'**
  String get cat_food;

  /// No description provided for @cat_transport.
  ///
  /// In en, this message translates to:
  /// **'Transport & fuel'**
  String get cat_transport;

  /// No description provided for @cat_utilities.
  ///
  /// In en, this message translates to:
  /// **'Electricity & water'**
  String get cat_utilities;

  /// No description provided for @cat_telecom.
  ///
  /// In en, this message translates to:
  /// **'Phone & internet'**
  String get cat_telecom;

  /// No description provided for @cat_health.
  ///
  /// In en, this message translates to:
  /// **'Health'**
  String get cat_health;

  /// No description provided for @cat_education.
  ///
  /// In en, this message translates to:
  /// **'Education'**
  String get cat_education;

  /// No description provided for @cat_family.
  ///
  /// In en, this message translates to:
  /// **'Family & gifts'**
  String get cat_family;

  /// No description provided for @cat_shopping.
  ///
  /// In en, this message translates to:
  /// **'Shopping'**
  String get cat_shopping;

  /// No description provided for @cat_entertainment.
  ///
  /// In en, this message translates to:
  /// **'Entertainment'**
  String get cat_entertainment;

  /// No description provided for @cat_debt.
  ///
  /// In en, this message translates to:
  /// **'Loan payments'**
  String get cat_debt;

  /// No description provided for @cat_other.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get cat_other;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ar', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return AppLocalizationsAr();
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
