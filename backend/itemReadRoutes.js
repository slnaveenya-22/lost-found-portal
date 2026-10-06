const express = require('express');
const router = express.Router();
const db = require('./db');
const { optionalAuth } = require('./middleware/auth');

const PUBLIC_COLS = `
  id, report_id, user_id, category, item_name, color, brand,
  location, date_time, description, image_url, status, created_at
`;

/**
 * GET /api/items/lost?user_id=7
 * GET /api/items/found?user_id=7
 *
 * Without user_id: returns all non-Removed items (public browse).
 * With user_id:     returns that user's items (all statuses).
 *                   Non-admins can only request their own user_id.
 */
router.get('/lost', optionalAuth, (req, res) => listHandler('lost', req, res));
router.get('/found', optionalAuth, (req, res) => listHandler('found', req, res));

async function listHandler(type, req, res) {
  const table = type === 'lost' ? 'lost_items' : 'found_items';
  const { user_id } = req.query;

  const where = [];
  const params = [];

  if (user_id) {
    // If requester is logged in and NOT the same user, and NOT admin → forbid.
    // If requester is a guest → forbid (can't list someone else's reports).
    const requesterId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';
    const sameUser = requesterId && Number(requesterId) === Number(user_id);

    if (!isAdmin && !sameUser) {
      return res.status(403).json({ error: 'Not allowed to view these reports' });
    }

    where.push('user_id = ?');
    params.push(user_id);
  } else {
    // Public list — hide Removed
    where.push("status != 'Removed'");
  }

  const sql = `
    SELECT ${PUBLIC_COLS}
    FROM ${table}
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY created_at DESC
    LIMIT 500
  `;

  try {
    const [rows] = await db.query(sql, params);
    res.json({ items: rows });
  } catch (err) {
    console.error(`${type} list error:`, err);
    res.status(500).json({ error: 'Failed to load items' });
  }
}

/**
 * GET /api/items/detail/:type/:reportId
 *
 * Returns a single item. For found items, includes private_verification_detail
 * ONLY if the requester is the owner or an admin.
 */
router.get('/detail/:type/:reportId', optionalAuth, async (req, res) => {
  const { type, reportId } = req.params;

  if (type !== 'lost' && type !== 'found') {
    return res.status(400).json({ error: 'type must be "lost" or "found"' });
  }

  const table = type === 'lost' ? 'lost_items' : 'found_items';

  try {
    // Fetch full row (including private field) — we'll strip it below.
    const [rows] = await db.query(
      `SELECT * FROM ${table} WHERE report_id = ? LIMIT 1`,
      [reportId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = rows[0];

    const isOwner = req.user && Number(req.user.id) === Number(item.user_id);
    const isAdmin = req.user?.role === 'admin';

    // Strip sensitive fields unless owner or admin
    if (type === 'found' && !isOwner && !isAdmin) {
      delete item.private_verification_detail;
      delete item.pv_kind;
      delete item.pv_inside;
      delete item.pv_extra_detail;
    }

    res.json({ item });
  } catch (err) {
    console.error('detail error:', err);
    res.status(500).json({ error: 'Failed to load item' });
  }
});

module.exports = router;