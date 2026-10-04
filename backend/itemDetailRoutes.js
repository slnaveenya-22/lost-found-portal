const express = require('express');
const router = express.Router();
const db = require('./db');

// GET /api/items/detail/:type/:reportId
// type must be 'lost' or 'found'
router.get('/:type/:reportId', async (req, res) => {
  const { type, reportId } = req.params;

  if (type !== 'lost' && type !== 'found') {
    return res.status(400).json({ error: 'Invalid item type' });
  }

  const table = type === 'lost' ? 'lost_items' : 'found_items';

  // NOTE: private_verification_detail is intentionally excluded here too —
  // this stays a public, read-only view, even for a found item's detail page
  try {
    const [rows] = await db.query(
      `SELECT report_id, category, item_name, color, brand, location, date_time, description, image_url, status
       FROM ${table} WHERE report_id = ?`,
      [reportId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.status(200).json({ item: { ...rows[0], type } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;