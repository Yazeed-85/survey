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
        id: "q3",
        text: "أي وقت من اليوم تفضل؟",
        answers: ["الصباح الباكر", "المساء", "منتصف الليل", "بعد الظهر"]
    },

    {
        id: "q4_final",
        text: "كم عمرك؟",
        answers: ["18-21", "21-30", "30-45", "أنت عمري ❤️"],
        isTrap: true,
        requiredAnswer: "أنت عمري ❤️"
    }
];

export default QUESTIONS;
