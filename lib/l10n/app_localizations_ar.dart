// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class AppLocalizationsAr extends AppLocalizations {
  AppLocalizationsAr([String locale = 'ar']) : super(locale);

  @override
  String get appTitle => 'ثروتي';

  @override
  String get onbTitle1 => 'اعرف أين يذهب مالك';

  @override
  String get onbBody1 =>
      'سجّل دخلك ومصروفاتك في ثوانٍ، وشاهد صورة شهرك كاملة بنظرة واحدة.';

  @override
  String get onbTitle2 => 'خطّط لراتبك';

  @override
  String get onbBody2 =>
      'ضع ميزانية شهرية بسيطة لكل تصنيف، واحصل على تنبيه قبل أن تتجاوزها.';

  @override
  String get onbTitle3 => 'ابنِ عادة الادخار';

  @override
  String get onbBody3 =>
      'حدّد أهدافًا بتاريخ مستهدف، واعرف بالضبط كم تدّخر كل شهر.';

  @override
  String get onbPrivacy =>
      'بياناتك تبقى على هذا الجهاز. لا نطلب بيانات دخول بنكية ولا حاجة لإنشاء حساب.';

  @override
  String get next => 'التالي';

  @override
  String get back => 'رجوع';

  @override
  String get skip => 'تخطٍّ';

  @override
  String get getStarted => 'ابدأ';

  @override
  String get setupTitle => 'إعداد سريع';

  @override
  String get setupCurrencyLabel => 'عملتك';

  @override
  String get setupIncomeLabel => 'الدخل الشهري (اختياري)';

  @override
  String get setupIncomeHint => 'مثل: الراتب بعد الاستقطاعات';

  @override
  String get setupFinish => 'ابدأ استخدام ثروتي';

  @override
  String get currencyLockedNote =>
      'لا يتم تحويل المبالغ بين العملات. لتغيير العملة لاحقًا ستحتاج إلى إعادة ضبط بياناتك.';

  @override
  String get navHome => 'الرئيسية';

  @override
  String get navExpenses => 'المصروفات';

  @override
  String get navGoals => 'الأهداف';

  @override
  String get navPlan => 'التخطيط';

  @override
  String get navSettings => 'الإعدادات';

  @override
  String get income => 'الدخل';

  @override
  String get expenses => 'المصروفات';

  @override
  String get net => 'المتبقي';

  @override
  String get savingsRate => 'نسبة الادخار';

  @override
  String get notAvailable => '—';

  @override
  String get monthSummary => 'هذا الشهر';

  @override
  String get addIncome => 'إضافة دخل';

  @override
  String get editIncome => 'تعديل الدخل';

  @override
  String get manageIncome => 'إدارة الدخل';

  @override
  String get copyLastMonthIncome => 'استخدم دخل الشهر الماضي';

  @override
  String get noIncomeYet => 'لم تسجّل دخلًا لهذا الشهر بعد.';

  @override
  String get budgetsTitle => 'الميزانيات';

  @override
  String get setBudgets => 'ضبط الميزانيات';

  @override
  String get noBudgets =>
      'لا توجد ميزانيات بعد. ضع حدًا شهريًا للتصنيفات التي تريد مراقبتها.';

  @override
  String get goalsTitle => 'أهداف الادخار';

  @override
  String get noGoalsShort => 'لا توجد أهداف بعد.';

  @override
  String get insightsTitle => 'تنبيهات';

  @override
  String get allGood => 'لا توجد تنبيهات هذا الشهر. أحسنت!';

  @override
  String get seeAll => 'عرض الكل';

  @override
  String get prevMonth => 'الشهر السابق';

  @override
  String get nextMonth => 'الشهر التالي';

  @override
  String get insightNoIncome => 'لديك مصروفات بدون دخل مسجّل لهذا الشهر.';

  @override
  String insightNegativeCashFlow(String amount) {
    return 'مصروفاتك هذا الشهر تزيد على دخلك بمقدار $amount.';
  }

  @override
  String insightOverBudget(String category, String amount) {
    return 'تجاوز تصنيف «$category» ميزانيته بمقدار $amount.';
  }

  @override
  String insightNearBudget(String category, String amount) {
    return 'تصنيف «$category» قريب من حدّه: متبقٍّ $amount.';
  }

  @override
  String insightGoalAtRisk(String goal, String amount) {
    return 'هدف «$goal» يحتاج $amount شهريًا، وهذا أكثر من المتبقي لديك هذا الشهر.';
  }

  @override
  String insightGoalOverdue(String goal, String amount) {
    return 'انقضى موعد هدف «$goal» وما زال ينقصه $amount. فكّر في تاريخ جديد.';
  }

  @override
  String get addExpense => 'إضافة مصروف';

  @override
  String get editExpense => 'تعديل المصروف';

  @override
  String get amount => 'المبلغ';

  @override
  String get category => 'التصنيف';

  @override
  String get date => 'التاريخ';

  @override
  String get note => 'ملاحظة';

  @override
  String get noteHint => 'اختياري';

  @override
  String get save => 'حفظ';

  @override
  String get delete => 'حذف';

  @override
  String get cancel => 'إلغاء';

  @override
  String get edit => 'تعديل';

  @override
  String get deleteExpenseConfirm => 'حذف هذا المصروف؟';

  @override
  String get noExpenses => 'لا توجد مصروفات هذا الشهر';

  @override
  String get noExpensesBody => 'اضغط «إضافة مصروف» لتسجيل أول مصروف.';

  @override
  String get deleted => 'تم الحذف';

  @override
  String get saved => 'تم الحفظ';

  @override
  String get errAmountEmpty => 'أدخل المبلغ';

  @override
  String get errAmountInvalid => 'أدخل رقمًا صحيحًا';

  @override
  String errAmountDecimals(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count خانة عشرية كحد أقصى',
      many: '$count خانة عشرية كحد أقصى',
      few: '$count خانات عشرية كحد أقصى',
      two: 'خانتان عشريتان كحد أقصى',
      one: 'خانة عشرية واحدة كحد أقصى',
      zero: 'لا يُسمح بخانات عشرية',
    );
    return '$_temp0';
  }

  @override
  String get errAmountTooLarge => 'المبلغ كبير جدًا';

  @override
  String get errAmountPositive => 'يجب أن يكون المبلغ أكبر من صفر';

  @override
  String get errCategoryRequired => 'اختر تصنيفًا';

  @override
  String get errNameEmpty => 'أدخل اسمًا';

  @override
  String get errGeneric => 'حدث خطأ. لم يتم تغيير بياناتك.';

  @override
  String get errLoad => 'تعذّر فتح بياناتك.';

  @override
  String get retry => 'إعادة المحاولة';

  @override
  String get salaryLabel => 'الراتب';

  @override
  String get incomeTitle => 'الدخل';

  @override
  String get incomeLabel => 'المصدر';

  @override
  String get incomeLabelHint => 'مثل: الراتب';

  @override
  String get incomeTotal => 'إجمالي الدخل';

  @override
  String get deleteIncomeConfirm => 'حذف هذا الدخل؟';

  @override
  String get budgetsScreenTitle => 'الميزانيات الشهرية';

  @override
  String get budgetsScreenHint =>
      'الحدود تتكرر كل شهر. اتركها فارغة إن لم ترد حدًا.';

  @override
  String get monthlyLimit => 'الحد الشهري';

  @override
  String get noLimit => 'بدون حد';

  @override
  String budgetUsage(String spent, String limit) {
    return '$spent من $limit';
  }

  @override
  String overBy(String amount) {
    return 'تجاوز بمقدار $amount';
  }

  @override
  String remaining(String amount) {
    return 'متبقٍّ $amount';
  }

  @override
  String percentUsed(int percent) {
    return 'استُخدم $percent٪';
  }

  @override
  String get clearLimit => 'إزالة الحد';

  @override
  String get addGoal => 'هدف جديد';

  @override
  String get editGoal => 'تعديل الهدف';

  @override
  String get goalName => 'اسم الهدف';

  @override
  String get goalNameHint => 'مثل: صندوق طوارئ، سيارة، زواج';

  @override
  String get goalTarget => 'المبلغ المستهدف';

  @override
  String get goalTargetDate => 'التاريخ المستهدف';

  @override
  String get goalAlreadySaved => 'المدّخر حاليًا (اختياري)';

  @override
  String goalSaved(String saved, String target) {
    return '$saved من $target';
  }

  @override
  String goalRequiredMonthly(String amount) {
    return 'ادّخر $amount شهريًا لتصل في الموعد';
  }

  @override
  String get goalReached => 'تحقق الهدف';

  @override
  String get goalOverdue => 'انقضى التاريخ المستهدف';

  @override
  String goalDue(String date) {
    return 'بحلول $date';
  }

  @override
  String monthsLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'متبقٍّ $count شهر',
      many: 'متبقٍّ $count شهرًا',
      few: 'متبقٍّ $count أشهر',
      two: 'متبقٍّ شهران',
      one: 'متبقٍّ شهر واحد',
      zero: 'يستحق هذا الشهر',
    );
    return '$_temp0';
  }

  @override
  String get addMoney => 'إضافة مبلغ';

  @override
  String get withdraw => 'سحب';

  @override
  String get contributionAmount => 'المبلغ';

  @override
  String get errWithdrawTooMuch => 'لا يمكنك سحب أكثر من المدّخر';

  @override
  String get deleteGoalConfirm => 'حذف هذا الهدف وسجله؟';

  @override
  String get goalsEmpty => 'لا توجد أهداف ادخار بعد';

  @override
  String get goalsEmptyBody =>
      'الهدف المرتبط بتاريخ يحوّل «يجب أن أدّخر» إلى رقم شهري واضح.';

  @override
  String get planTitle => 'حاسبة الادخار';

  @override
  String get calcIntro =>
      'شاهد كيف يتراكم الادخار المنتظم، وكيف قد يغيّره عائد افتراضي أو التضخم.';

  @override
  String get calcInitial => 'المبلغ المبدئي';

  @override
  String get calcMonthly => 'الادخار الشهري';

  @override
  String get calcYears => 'عدد السنوات';

  @override
  String get calcRate => 'عائد سنوي افتراضي ٪';

  @override
  String get calcInflation => 'تضخم سنوي مفترض ٪';

  @override
  String get calcContributed => 'ما ستدفعه أنت';

  @override
  String get calcNoReturn => 'ادخار فقط (عائد ٠٪)';

  @override
  String calcWithReturn(String rate) {
    return 'مع عائد افتراضي $rate٪';
  }

  @override
  String get calcGrowth => 'النمو الافتراضي';

  @override
  String calcRealValue(String rate) {
    return 'بقيمة اليوم (تضخم $rate٪)';
  }

  @override
  String get calcDisclaimer =>
      'للتوضيح فقط — ليس توقعًا ولا ضمانًا ولا نصيحة استثمارية. العوائد الفعلية تتغير وقد تكون سالبة. النتائج قبل الرسوم والضرائب. يُحتسب العائد شهريًا، والإيداع في نهاية كل شهر.';

  @override
  String get errRateRange => 'أدخل من ٠ إلى ١٠٠';

  @override
  String get errInflationRange => 'أدخل من -٥٠ إلى ١٠٠';

  @override
  String get errYearsRange => 'أدخل من ١ إلى ٥٠ سنة';

  @override
  String get settingsTitle => 'الإعدادات';

  @override
  String get language => 'اللغة';

  @override
  String get arabic => 'العربية';

  @override
  String get english => 'English';

  @override
  String get theme => 'المظهر';

  @override
  String get themeSystem => 'حسب النظام';

  @override
  String get themeLight => 'فاتح';

  @override
  String get themeDark => 'داكن';

  @override
  String get currency => 'العملة';

  @override
  String get categories => 'التصنيفات';

  @override
  String get addCategory => 'إضافة تصنيف';

  @override
  String get rename => 'إعادة تسمية';

  @override
  String get categoryName => 'اسم التصنيف';

  @override
  String get categoryArchivedNote =>
      'التصنيف مرتبط بمصروفات، لذلك تم إخفاؤه بدل حذفه.';

  @override
  String get deleteCategoryConfirm => 'حذف هذا التصنيف؟';

  @override
  String get privacy => 'الخصوصية والبيانات';

  @override
  String get privacyBody =>
      'يحفظ الإصدار الأول من ثروتي كل بياناتك على هذا الجهاز فقط. لا يُرفع شيء، ولا إعلانات ولا تتبّع. حذف التطبيق يحذف البيانات.';

  @override
  String get deleteAllData => 'حذف جميع بياناتي';

  @override
  String get deleteAllConfirmTitle => 'حذف كل شيء؟';

  @override
  String get deleteAllConfirmBody =>
      'سيتم حذف كل الدخل والمصروفات والميزانيات والأهداف على هذا الجهاز نهائيًا. لا يمكن التراجع.';

  @override
  String get deleteAllConfirmAction => 'حذف نهائي';

  @override
  String get about => 'عن التطبيق';

  @override
  String get aboutBody =>
      'يساعدك ثروتي على تخطيط أموالك ومتابعتها. لا يقدّم نصائح استثمارية أو ضريبية أو قانونية.';

  @override
  String version(String version) {
    return 'الإصدار $version';
  }

  @override
  String get cat_housing => 'السكن';

  @override
  String get cat_food => 'الطعام والبقالة';

  @override
  String get cat_transport => 'المواصلات والوقود';

  @override
  String get cat_utilities => 'الكهرباء والماء';

  @override
  String get cat_telecom => 'الهاتف والإنترنت';

  @override
  String get cat_health => 'الصحة';

  @override
  String get cat_education => 'التعليم';

  @override
  String get cat_family => 'العائلة والهدايا';

  @override
  String get cat_shopping => 'التسوق';

  @override
  String get cat_entertainment => 'الترفيه';

  @override
  String get cat_debt => 'أقساط القروض';

  @override
  String get cat_other => 'أخرى';
}
