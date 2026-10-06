const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('./db');
const { findMatchesFor } = require('./matchingEngine');
const { generateQuestionsFor, isUselessAnswer } = require('./quizGenerator');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

function generateReportId() {
  const randomNumber = Math.floor(100000 + Math.random() * 900000);
  return `FND-${randomNumber}`;
}

// POST /api/items/found
router.post('/', upload.single('image'), async (req, res) => {
  const {
    user_id,
    category,
    item_name,
    color,
    brand,
    location,
    date_time,
    description,
    private_verification_detail,
    pv_kind,
    pv_inside,
    pv_extra_detail,
  } = req.body;

  // Existing required fields
  if (!user_id || !category || !item_name || !location || !date_time) {
    return res.status(400).json({ error: 'Required fields are missing' });
  }

  // NEW — quiz fields are mandatory
  if (!pv_kind || !pv_inside || !pv_extra_detail) {
    return res.status(400).json({
      error: 'Private verification fields are required (kind, inside, extra detail)',
    });
  }

  if (pv_inside.trim().length < 10 || pv_inside.trim().length > 200) {
    return res
      .status(400)
      .json({ error: 'The "inside or attached" answer must be 10–200 characters' });
  }
  if (pv_extra_detail.trim().length < 10 || pv_extra_detail.trim().length > 200) {
    return res
      .status(400)
      .json({ error: 'The "distinctive detail" answer must be 10–200 characters' });
  }
  if (isUselessAnswer(pv_inside) || isUselessAnswer(pv_extra_detail)) {
    return res.status(400).json({
      error: 'Please provide specific answers — not "nothing" or "idk".',
    });
  }

  try {
    const reportId = generateReportId();
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await db.query(
      `INSERT INTO found_items 
       (report_id, user_id, category, item_name, color, brand, location,
        date_time, description, image_url, private_verification_detail,
        pv_kind, pv_inside, pv_extra_detail) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reportId,
        user_id,
        category,
        item_name,
        color,
        brand,
        location,
        date_time,
        description,
        imageUrl,
        private_verification_detail || null,
        pv_kind.trim(),
        pv_inside.trim(),
        pv_extra_detail.trim(),
      ]
    );

    const newId = result.insertId;

    // Fire-and-forget: generate the ownership quiz
    setImmediate(() => {
      generateQuestionsFor(newId).catch((err) =>
        console.error('background quiz generation failed:', err.message)
      );
    });

    // Fire-and-forget: matching engine (from Ticket 11)
    setImmediate(() => {
      findMatchesFor(newId, 'found').catch((err) =>
        console.error('background match scan failed:', err.message)
      );
    });

    res.status(201).json({
      message: 'Found item reported successfully',
      reportId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;