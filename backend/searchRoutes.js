const express = require('express');
const router = express.Router();
const db = require('./db');
const { optionalAuth } = require('./middleware/auth');

// Whitelisted columns — never SELECT * on found_items (leaks private field)
const PUBLIC_LOST_COLS = `
  id, report_id, user_id, category, item_name, color, brand,
  location, date_time, description, image_url, status, created_at
`;
const PUBLIC_FOUND_COLS = `
  id, report_id, user_id, category, item_name, color, brand,
  location, date_time, description, image_url, status, created_at
`;

// GET /api/items/search
// Query params:
//   type     = "lost" | "found"   (required)
//   q        = keyword            (optional)
//   category = exact match        (optional)
//   days     = integer            (optional)
//   sort     = recent|oldest|name (optional, default recent)
router.get('/', optionalAuth, async (req, res) => {
  const { type, q, category, days, sort = 'recent' } = req.query;

  if (type !== 'lost' && type !== 'found') {
    return res.status(400).json({ error: 'type must be "lost" or "found"' });
  }

  const table = type === 'lost' ? 'lost_items' : 'found_items';
  const cols = type === 'lost' ? PUBLIC_LOST_COLS : PUBLIC_FOUND_COLS;

  const where = [];
  const params = [];

  // Keyword search across several columns
  if (q && q.trim()) {
    const like = `%${q.trim()}%`;
    where.push(`(
      item_name LIKE ? OR
      brand LIKE ? OR
      color LIKE ? OR
      location LIKE ? OR
      description LIKE ?
    )`);
    params.push(like, like, like, like, like);
  }

  if (category) {
    where.push('category = ?');
    params.push(category);
  }

  if (days) {
    const n = parseInt(days, 10);
    if (!Number.isNaN(n) && n > 0) {
      where.push('date_time >= DATE_SUB(NOW(), INTERVAL ? DAY)');
      params.push(n);
    }
  }

  // Default: don't show Removed items in public browse
  where.push("status != 'Removed'");

  const orderBy = {
    recent: 'created_at DESC',
    oldest: 'created_at ASC',
    name: 'item_name ASC',
  }[sort] || 'created_at DESC';

  const sql = `
    SELECT ${cols}
    FROM ${table}
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY ${orderBy}
    LIMIT 200
  `;

  try {
    const [rows] = await db.query(sql, params);
    res.json({ items: rows });
  } catch (err) {
    console.error('search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;