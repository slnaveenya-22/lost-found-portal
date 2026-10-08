const express = require('express');
const router = express.Router();
const db = require('./db');
const { verifyToken } = require('./middleware/auth');
const { createNotification } = require('./notificationHelper');

/* ══════════════════════════════════════════════════════════════
   GET /api/items/found/:reportId/quiz
   Returns the 3 questions with SHUFFLED options, no correct
   answers revealed. Public — no auth needed.
   ══════════════════════════════════════════════════════════════ */
router.get('/items/found/:reportId/quiz', async (req, res) => {
  const { reportId } = req.params;

  try {
    // 1. Find the found item
    const [items] = await db.query(
      `SELECT id, report_id, status FROM found_items
       WHERE report_id = ? LIMIT 1`,
      [reportId]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = items[0];

    // 2. Load questions
    const [questions] = await db.query(
      `SELECT id, question_text, correct_option,
              wrong_option_1, wrong_option_2, wrong_option_3,
              display_order
       FROM found_item_questions
       WHERE found_item_id = ?
       ORDER BY display_order ASC`,
      [item.id]
    );

    if (questions.length === 0) {
      return res.json({
        questions: [],
        legacy: true,
        item_status: item.status,
      });
    }

    // 3. Shuffle options per question
    function shuffle(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    const payload = questions.map((q) => {
      const options = shuffle([
        q.correct_option,
        q.wrong_option_1,
        q.wrong_option_2,
        q.wrong_option_3,
      ]);

      return {
        id: q.id,
        question_text: q.question_text,
        options,
        display_order: q.display_order,
      };
    });

    res.json({
      questions: payload,
      legacy: false,
      item_status: item.status,
    });
  } catch (err) {
    console.error('fetch quiz error:', err);
    res.status(500).json({ error: 'Failed to load quiz' });
  }
});

/* ══════════════════════════════════════════════════════════════
   POST /api/claims
   Body: {
     found_item_id: number,
     match_id: number | null,
     answers: [{ question_id, selected_option }]
   }
   ══════════════════════════════════════════════════════════════ */
router.post('/claims', verifyToken, async (req, res) => {
  const { found_item_id, match_id, answers } = req.body || {};
  const claimantId = req.user.id;

  // ── Validation ────────────────────────────────────────────
  if (!found_item_id || Number.isNaN(Number(found_item_id))) {
    return res.status(400).json({ error: 'found_item_id is required' });
  }
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'answers array is required' });
  }

  try {
    // ── Load the found item ───────────────────────────────────
    const [items] = await db.query(
      `SELECT id, report_id, user_id, item_name, status
       FROM found_items WHERE id = ? LIMIT 1`,
      [found_item_id]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Found item not found' });
    }

    const foundItem = items[0];

    // ── Guard: item not claimable ─────────────────────────────
    if (foundItem.status === 'Removed') {
      return res.status(400).json({ error: 'This item has been removed' });
    }
    if (foundItem.status === 'Returned') {
      return res.status(400).json({ error: 'This item has already been returned' });
    }

    // ── Guard: can't claim your own item ──────────────────────
    if (Number(foundItem.user_id) === Number(claimantId)) {
      return res.status(403).json({ error: "You can't claim your own item" });
    }

    // ── Guard: no duplicate pending claim from same user ──────
    const [ownPending] = await db.query(
      `SELECT id FROM claims
       WHERE found_item_id = ?
         AND claimant_id = ?
         AND status = 'Pending'`,
      [found_item_id, claimantId]
    );
    if (ownPending.length > 0) {
      return res.status(409).json({
        error: 'You already have a pending claim on this item',
      });
    }

    // ── Guard: item already being claimed by someone ──────────
    const [others] = await db.query(
      `SELECT id FROM claims
       WHERE found_item_id = ?
         AND status IN ('Pending', 'Approved')`,
      [found_item_id]
    );
    if (others.length > 0) {
      return res.status(409).json({
        error: 'Someone is already claiming this item',
      });
    }

    // ── Load the questions ────────────────────────────────────
    const [questions] = await db.query(
      `SELECT id, correct_option FROM found_item_questions
       WHERE found_item_id = ?
       ORDER BY display_order ASC`,
      [found_item_id]
    );

    if (questions.length === 0) {
      // Legacy item with no quiz — fall back to manual admin review.
      // Create a Pending claim with quiz_passed = FALSE so the admin
      // knows it wasn't verified automatically.
      const [result] = await db.query(
        `INSERT INTO claims
          (found_item_id, match_id, claimant_id, status, quiz_passed)
         VALUES (?, ?, ?, 'Pending', FALSE)`,
        [
          found_item_id,
          match_id || null,
          claimantId,
        ]
      );

      // Notify admins
      await notifyAdmins(
        'ClaimSubmitted',
        `A claim was raised on "${foundItem.item_name}" (no quiz — manual review needed).`,
        `/admin/claims`
      );

      // Notify the finder
      if (Number(foundItem.user_id) !== Number(claimantId)) {
        await createNotification(
          foundItem.user_id,
          'ClaimSubmitted',
          `Someone raised a claim on your found item "${foundItem.item_name}".`,
          `/items/found/${foundItem.report_id}`
        );
      }

      return res.json({
        claim_id: result.insertId,
        status: 'Pending',
        legacy: true,
      });
    }

    // ── Grade the quiz ────────────────────────────────────────
    const questionById = new Map(
      questions.map((q) => [Number(q.id), q.correct_option])
    );

    const graded = answers.map((a) => {
      const correct = questionById.get(Number(a.question_id));
      const isCorrect =
        correct != null &&
        String(a.selected_option).trim() === String(correct).trim();
      return {
        question_id: a.question_id,
        selected_option: a.selected_option,
        is_correct: isCorrect,
      };
    });

    const allCorrect = graded.every((g) => g.is_correct);

    // ── Create the claim ──────────────────────────────────────
    if (allCorrect) {
      const [result] = await db.query(
        `INSERT INTO claims
          (found_item_id, match_id, claimant_id, status, quiz_passed)
         VALUES (?, ?, ?, 'Pending', TRUE)`,
        [
          found_item_id,
          match_id || null,
          claimantId,
        ]
      );

      const claimId = result.insertId;

      // Record each answer
      for (const g of graded) {
        await db.query(
          `INSERT INTO claim_answers
            (claim_id, question_id, selected_option, is_correct)
           VALUES (?, ?, ?, ?)`,
          [claimId, g.question_id, g.selected_option, g.is_correct]
        );
      }

      // Notify admins
      await notifyAdmins(
        'ClaimSubmitted',
        `New claim on "${foundItem.item_name}" — quiz passed.`,
        `/admin/claims`
      );

      // Notify the finder
      if (Number(foundItem.user_id) !== Number(claimantId)) {
        await createNotification(
          foundItem.user_id,
          'ClaimSubmitted',
          `Someone raised a claim on your found item "${foundItem.item_name}".`,
          `/items/found/${foundItem.report_id}`
        );
      }

      return res.json({
        claim_id: claimId,
        status: 'Pending',
      });
    }

    // ── Failure path ──────────────────────────────────────────
    const [result] = await db.query(
      `INSERT INTO claims
        (found_item_id, match_id, claimant_id, status, quiz_passed, rejection_reason)
       VALUES (?, ?, ?, 'Rejected', FALSE, 'Failed verification quiz')`,
      [
        found_item_id,
        match_id || null,
        claimantId,
      ]
    );

    const claimId = result.insertId;

    // Still record answers, for audit
    for (const g of graded) {
      await db.query(
        `INSERT INTO claim_answers
          (claim_id, question_id, selected_option, is_correct)
         VALUES (?, ?, ?, ?)`,
        [claimId, g.question_id, g.selected_option, g.is_correct]
      );
    }

    // Notify the claimant
    await createNotification(
      claimantId,
      'ClaimRejected',
      `Your claim on "${foundItem.item_name}" was rejected because one or more answers were incorrect.`,
      `/items/found/${foundItem.report_id}`
    );

    return res.status(200).json({
      claim_id: claimId,
      status: 'Rejected',
      reason: 'quiz_failed',
    });
  } catch (err) {
    console.error('claim submission error:', err);
    res.status(500).json({ error: 'Failed to submit claim' });
  }
});

/* ── Helper: notify all admins ──────────────────────────── */
async function notifyAdmins(type, message, link) {
  try {
    const [admins] = await db.query(
      `SELECT id FROM users WHERE role = 'admin'`
    );
    for (const a of admins) {
      await createNotification(a.id, type, message, link);
    }
  } catch (err) {
    console.error('notifyAdmins failed:', err.message);
  }
}

module.exports = router;