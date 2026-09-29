const express = require('express');
const router = express.Router();
const db = require('./db');

// GET /api/items/search
// Query params: query, category, status, dateFrom, dateTo, type (lost/found/all)
router.get('/', async (req, res) => {
  const { query, category, status, dateFrom, dateTo, type } = req.query;

  // Build WHERE conditions shared by both tables
  let conditions = [];
  let params = [];

  if (query) {
    conditions.push('(item_name LIKE ? OR description LIKE ? OR brand LIKE ? OR color LIKE ?)');
    const likeValue = `%${query}%`;
    params.push(likeValue, likeValue, likeValue, likeValue);
  }
  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (dateFrom) {
    conditions.push('date_time >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push('date_time <= ?');
    params.push(dateTo);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    let results = [];

    // Search lost_items unless the user specifically asked for only 'found'
    if (!type || type === 'lost' || type === 'all') {
      const [lostRows] = await db.query(
        `SELECT report_id, category, item_name, color, brand, location, date_time, description, image_url, status, 'Lost' AS type
         FROM lost_items ${whereClause} ORDER BY date_time DESC LIMIT 100`,
        params
      );
      results = results.concat(lostRows);
    }

    // Search found_items unless the user specifically asked for only 'lost'
    // NOTE: private_verification_detail is intentionally NOT selected here — stays hidden from search results
    if (!type || type === 'found' || type === 'all') {
      const [foundRows] = await db.query(
        `SELECT report_id, category, item_name, color, brand, location, date_time, description, image_url, status, 'Found' AS type
         FROM found_items ${whereClause} ORDER BY date_time DESC LIMIT 100`,
        params
      );
      results = results.concat(foundRows);
    }

    // Sort combined results by most recent first
    results.sort((a, b) => new Date(b.date_time) - new Date(a.date_time));

    res.status(200).json({ count: results.length, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;