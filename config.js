// ==========================================================================
// الإعدادات المشتركة: Firebase + الأسئلة + كلمة مرور اللوحة
// ==========================================================================
// ملاحظة: مشروع Firebase هذا يستضيف أيضاً لعبة المافيا.
// الاستبيان يقرأ ويكتب فقط داخل "survey_results" ولا يلمس أي مسار آخر.

export const firebaseConfig = {
    apiKey: "AIzaSyB5CobIKfYdAz8jaabJpMQrGoqS9Ton28Y",
    authDomain: "buttons-f3501.firebaseapp.com",
    databaseURL: "https://buttons-f3501-default-rtdb.firebaseio.com",
    projectId: "buttons-f3501"
};

export const DB_PATHS = {
    results: "survey_results",
    metadata: "survey_metadata"
};

// --------------------------------------------------------------------------
// الأسئلة
//   - السؤال العادي: بلا isTrap.
//   - السؤال المفخخ: isTrap = true و requiredAnswer = الجواب "الرومانسي".
//     أي جواب غيره يجعل زر الإرسال يهرب قليلاً ثم يستقر (دائماً يمكن إكماله).
// --------------------------------------------------------------------------
export const QUESTIONS = [
    {
        id: "q1",
        text: "أيش لونك المفضل؟",
        answers: ["أحمر", "أزرق", "بنفسجي", "أسود", "آخر"]
    },
    {
        id: "q2",
        text: "أيش افضل وقت فاليوم بالنسبة لك؟",
        answers: ["الصباح الباكر", "المساء", "منتصف الليل", "أي وقت أكون فيه معك"],
        isTrap: true,
        requiredAnswer: "أي وقت أكون فيه معك"
    },
    {
        id: "q3",
        text: "كم عمرك؟",
        answers: ["18-21", "21-30", "30-45", "أنت عمري"],
        isTrap: true,
        requiredAnswer: "أنت عمري"
    }
];

// --------------------------------------------------------------------------
// كلمة مرور لوحة النتائج (dashboard.html)
// القيمة المخزنة هي SHA-256 للكلمة وليست الكلمة نفسها.
// الكلمة الحالية: rose2026
// لتغييرها: في كونسول أي متصفح (F12) نفّذ السطر التالي ثم الصق الناتج بالأسفل:
//   crypto.subtle.digest('SHA-256', new TextEncoder().encode('كلمتك'))
//     .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join('')))
// --------------------------------------------------------------------------
export const DASHBOARD_PASSWORD_HASH =
    "2d3e22f6c1d44316d902f13d18d0bbca1872679dccdd60783bc1d87e790413f6";
