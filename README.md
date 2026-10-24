# استبيان الوردة 🌹

صفحة واحدة (`index.html`) تضم كل المشاهد: طرفية ← وردة تتفتح ← استبيان ← رسالة كوميدية. الحركة كلها بمكتبة GSAP (محلية في `vendor/`).

## الملفات
- `index.html` + `style.css` + `app.js` + `rose.js`: الموقع
- `config.js`: Firebase والأسئلة وكلمة مرور اللوحة
- `dashboard.html`: لوحة النتائج (كلمة المرور الحالية: `rose2026`)
- `vendor/gsap.min.js`: المكتبة

## النشر
GitHub ← Settings ← Pages ← Deploy from branch ← `main` / root.

## ملاحظات
- كلمة مرور اللوحة تُغلق الواجهة فقط (قاعدة Firebase نفسها مفتوحة). طريقة تغييرها داخل `config.js`.
- عدّل الأسئلة من `config.js`؛ السؤال المفخخ يحتاج `isTrap` و`requiredAnswer`.
