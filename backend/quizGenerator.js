const db = require('./db');

// Same list as the frontend report form — keep these in sync
const CATEGORIES = [
    'Electronics',
    'Bag',
    'ID Card',
    'Books',
    'Clothing',
    'Keys',
    'Wallet',
    'Water Bottle',
    'Other',
];

// Curated distractor pools — plausible but wrong answers
const INSIDE_DISTRACTORS = [
    'A business card',
    'A shopping receipt',
    'A name tag',
];
const DISTINCTIVE_DISTRACTORS = [
    'A small tear or scratch',
    'A faded label',
    'A handwritten mark',
];

// Reject trivially-guessable answers
const USELESS_ANSWERS = new Set([
    'nothing',
    'none',
    'n/a',
    'na',
    'idk',
    "i don't know",
    'dont know',
    "don't know",
    'no idea',
    'unknown',
    'empty',
    'nil',
    '-',
]);

function isUselessAnswer(text) {
    if (!text) return true;
    return USELESS_ANSWERS.has(text.trim().toLowerCase());
}

// Fisher-Yates shuffle
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Pick 3 distractors from a pool, avoiding the correct answer.
 * If the correct answer happens to match a pool item, swap in a
 * fallback to keep 3 unique wrong options.
 */
function pickDistractors(pool, correctAnswer, fallback = 'Something else') {
    const correct = (correctAnswer || '').trim().toLowerCase();
    const filtered = pool.filter((p) => p.toLowerCase() !== correct);
    const picked = filtered.slice(0, 3);

    while (picked.length < 3) {
        // Extremely unlikely, but keep the array at exactly 3
        picked.push(`${fallback} ${picked.length + 1}`);
    }
    return picked;
}

/**
 * Generate the 3 MCQs for a found item and insert them.
 * Called right after the item is inserted in POST /api/items/found.
 */
async function generateQuestionsFor(foundItemId) {
    if (!foundItemId) {
        console.error('generateQuestionsFor: missing foundItemId');
        return { created: 0 };
    }

    try {
        // Load the pv_* fields
        const [rows] = await db.query(
            `SELECT id, pv_kind, pv_inside, pv_extra_detail
       FROM found_items WHERE id = ? LIMIT 1`,
            [foundItemId]
        );

        if (rows.length === 0) {
            console.error('generateQuestionsFor: item not found', foundItemId);
            return { created: 0 };
        }

        const item = rows[0];

        // Guard: skip if any field is empty or useless
        if (
            !item.pv_kind ||
            isUselessAnswer(item.pv_inside) ||
            isUselessAnswer(item.pv_extra_detail)
        ) {
            console.warn(
                'generateQuestionsFor: missing or useless pv_* fields',
                foundItemId
            );
            return { created: 0 };
        }

        // ── Question 1: kind ─────────────────────────────────────
        const otherCategories = CATEGORIES.filter((c) => c !== item.pv_kind);
        const kindDistractors = shuffle(otherCategories).slice(0, 3);

        // ── Question 2: inside/attached ──────────────────────────
        const insideDistractors = shuffle(
            pickDistractors(INSIDE_DISTRACTORS, item.pv_inside, 'Something inside')
        );

        // ── Question 3: distinctive ──────────────────────────────
        const distinctiveDistractors = shuffle(
            pickDistractors(
                DISTINCTIVE_DISTRACTORS,
                item.pv_extra_detail,
                'Another mark'
            )
        );

        const questions = [
            {
                text: 'What kind of item is this?',
                correct: item.pv_kind,
                wrong: kindDistractors,
                order: 1,
            },
            {
                text: 'What was inside or attached to this item?',
                correct: item.pv_inside,
                wrong: insideDistractors,
                order: 2,
            },
            {
                text: 'Which of these makes this item distinctive?',
                correct: item.pv_extra_detail,
                wrong: distinctiveDistractors,
                order: 3,
            },
        ];

        let created = 0;
        for (const q of questions) {
            try {
                await db.query(
                    `INSERT INTO found_item_questions
            (found_item_id, question_text, correct_option,
             wrong_option_1, wrong_option_2, wrong_option_3, display_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        foundItemId,
                        q.text,
                        q.correct,
                        q.wrong[0],
                        q.wrong[1],
                        q.wrong[2],
                        q.order,
                    ]
                );
                created += 1;
            } catch (insertErr) {
                console.error('question insert failed:', insertErr.message);
            }
        }

        return { created };
    } catch (err) {
        console.error('generateQuestionsFor error:', err.message);
        return { created: 0 };
    }
}

module.exports = { generateQuestionsFor, CATEGORIES, isUselessAnswer };