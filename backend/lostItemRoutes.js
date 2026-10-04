const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('./db');
const { findMatchesFor } = require('./matchingEngine');
// Configure where uploaded images get saved and how they're named
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

// Helper to generate a human-friendly report ID
function generateReportId() {
  const randomNumber = Math.floor(100000 + Math.random() * 900000);
  return `LST-${randomNumber}`;
}

// POST /api/items/lost
router.post('/', upload.single('image'), async (req, res) => {
  const { user_id, category, item_name, color, brand, location, date_time, description } = req.body;

  if (!user_id || !category || !item_name || !location || !date_time) {
    return res.status(400).json({ error: 'Required fields are missing' });
  }

  try {
    const reportId = generateReportId();
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await db.query(
      `INSERT INTO lost_items 
       (report_id, user_id, category, item_name, color, brand, location, date_time, description, image_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [reportId, user_id, category, item_name, color, brand, location, date_time, description, imageUrl]
    );

    // Fire-and-forget matching scan — do NOT await, so the POST
    // response isn't blocked by the scan.
    const newId = result.insertId;
    setImmediate(() => {
      findMatchesFor(newId, 'lost').catch((err) =>
        console.error('background match scan failed:', err.message)
      );
    });

    res.status(201).json({ message: 'Lost item reported successfully', reportId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;