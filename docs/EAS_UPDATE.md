# تحديثات EAS: كيف تصل إلى الهاتف فعلًا

> **القاعدة التي كلّفتنا أسابيع:** `eas update` **لا يصل إلى Expo Go**. التحديث المنشور بـ`runtimeVersion`
> لا يُحمَّل في Expo Go؛ يلزم **بناء خاص بك** مثبَّت على الجهاز (development build أو preview build).
> المصدر: <https://docs.expo.dev/build/updates/> — وانظر D-046.

## الصورة الكاملة

| ما تريده | ما تحتاجه مرة واحدة | بعدها كل تحديث |
|---|---|---|
| معاينة فورية بلا تثبيت | لا شيء | `npx expo start` + QR في Expo Go |
| **EAS على أندرويد** | `eas build -p android --profile development` ← ملف APK تثبّته | `eas update --branch development` |
| **EAS على iPhone** | حساب Apple Developer **مدفوع** (٩٩ $/سنة) ثم `eas build -p ios --profile development` | `eas update --branch development` |

ما دام الـbuild مثبّتًا، تصل التحديثات **بلا إعادة بناء** ما دمت لم تغيّر مكتبة أصلية (native) ولا إصدار SDK.

## الخطوات بالترتيب (مرة واحدة)

```bash
git fetch && git reset --hard origin/claude/great-brown-kz81yw
cd expo-app && npm install

npx eas-cli@latest login          # حسابك أنت
npx eas-cli@latest init           # يكتب extra.eas.projectId في app.json — لا تحذفه
```

> **مهم:** `eas init` يكتب `projectId` في `app.json` على جهازك. لا تنفّذ `git reset --hard` بعدها،
> وإلا مُسح المعرّف ولم يعرف التطبيق من أين يسحب التحديثات. احفظه بـ`git add app.json && git commit`.

ثم ابنِ نسخة مرة واحدة:

```bash
npx eas-cli@latest build -p android --profile development   # مجاني
# أو، بعد تفعيل حساب Apple المدفوع:
npx eas-cli@latest build -p ios --profile development
```

ثبّت الملف الناتج على الجهاز من الرابط الذي يعطيك إياه EAS. من الآن فصاعدًا:

```bash
npx eas-cli@latest update --branch development --message "وصف التغيير"
```

أغلق التطبيق وافتحه — يسحب التحديث عند الإقلاع (`checkAutomatically: ON_LOAD` في نسخ الاختبار فقط).

## لماذا نسخة الإنتاج لا تتحدّث تلقائيًّا
النسخة المنشورة للمستخدمين تُبقي `checkAutomatically: NEVER` (في `app.json`) حتى يبقى الوعد صحيحًا:
**التطبيق لا يتصل بالإنترنت ولا يرسل بياناتك**. سياسة الخصوصية مبنية على هذا، فلا تغيّره دون تحديثها.

## أخطاء شائعة
- **«لم يتحدث» مع Expo Go** ← السبب الوحيد غالبًا: Expo Go لا يقرأ تحديثات EAS. استخدم `npx expo start`.
- **التحديث لا يصل إلى البناء المثبّت** ← تأكد أن `--branch` مرتبط بالقناة `channel` نفسها في `eas.json`،
  وأن `app.json` ما زال يحمل `extra.eas.projectId`.
- **غيّرت مكتبة أصلية أو إصدار SDK** ← التحديث لا يكفي، أعد البناء.
