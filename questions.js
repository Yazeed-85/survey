// ==========================================================================
// SURVEY QUESTIONS CONFIGURATION
// Edit this file to change question text, answers, or add/remove questions.
// Each question needs a unique "id" (used as the Firebase field key).
//
// The LAST question in this array is treated as the special "trap" question.
// Set its `requiredAnswer` to the exact answer text that should NOT trigger
// the playful button animation.
// ==========================================================================

const QUESTIONS = [
    {
        id: "q1",
        text: "ما هو لونك المفضل؟",
        answers: ["أحمر", "أزرق", "أخضر", "أسود"]
    },
    {
        id: "q2",
        text: "ما هو موسمك المفضل؟",
        answers: ["الصيف", "الشتاء", "الربيع", "الخريف"]
    },
    {
        id: "q3",
        text: "أي وقت من اليوم تفضل؟",
        answers: ["الصباح الباكر", "المساء", "منتصف الليل", "بعد الظهر"]
    },
    {
        id: "q4",
        text: "ماذا تفضل في عطلتك؟",
        answers: ["السفر", "الراحة في المنزل", "مغامرة", "وقت مع الأصدقاء"]
    },
    {
        id: "q5_final",
        text: "كم عمرك؟",
        answers: ["18-21", "21-30", "30-45", "نفس عمري ❤️"],
        isTrap: true,
        requiredAnswer: "نفس عمري ❤️"
    }
];

export default QUESTIONS;
