const express = require('express');
const router = express.Router();
const db = require('./db');
const { verifyToken, optionalAuth } = require('./middleware/auth');

/**
 * GET /api/matches/suggestions?type=lost|found&report_id=LST-XXX
 *
 * Returns matches for a specific item. Used by ItemDetail's
 * "Similar items" section. Public — no auth required.
 */
router.get('/suggestions', optionalAuth, async (req, res) => {
  const { type, report_id } = req.query;

  if (type !== 'lost' && type !== 'found') {
    return res.status(400).json({ error: 'type must be "lost" or "found"' });
  }
  if (!report_id) {
    return res.status(400).json({ error: 'report_id is required' });
  }

  const sourceTable = type === 'lost' ? 'lost_items' : 'found_items';
  const oppositeTable = type === 'lost' ? 'found_items' : 'lost_items';

  try {
    // Find the source item's internal id
    const [srcRows] = await db.query(
      `SELECT id FROM ${sourceTable} WHERE report_id = ? LIMIT 1`,
      [report_id]
    );

    if (srcRows.length === 0) {
      return res.json({ items: [] });
    }

    const sourceId = srcRows[0].id;

    // Query matches — join to the opposite item's table
    const joinCol = type === 'lost' ? 'found_item_id' : 'lost_item_id';
    const selectCols = `
      o.id, o.report_id, o.user_id, o.category, o.item_name,
      o.color, o.brand, o.location, o.date_time, o.description,
      o.image_url, o.status, o.created_at,
      m.match_score, m.status AS match_status, m.id AS match_id
    `;

    const [rows] = await db.query(
      `SELECT ${selectCols}
       FROM matches m
       JOIN ${oppositeTable} o ON o.id = m.${joinCol}
       WHERE m.${type === 'lost' ? 'lost_item_id' : 'found_item_id'} = ?
         AND m.status != 'Dismissed'
         AND o.status != 'Removed'
       ORDER BY m.match_score DESC, m.created_at DESC
       LIMIT 20`,
      [sourceId]
    );

    res.json({ items: rows });
  } catch (err) {
    console.error('matches suggestions error:', err);
    res.status(500).json({ error: 'Failed to load suggestions' });
  }
});

/**
 * GET /api/matches/my
 * Returns all matches involving the current user's items.
 * Sorted by score DESC.
 */
router.get('/my', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await db.query(
      `
      SELECT
        m.id AS match_id,
        m.match_score,
        m.status AS match_status,
        m.created_at AS matched_at,
        l.id   AS lost_id,   l.report_id AS lost_report_id,
        l.item_name AS lost_item_name, l.user_id AS lost_user_id,
        l.image_url AS lost_image_url, l.status AS lost_status,
        f.id   AS found_id,  f.report_id AS found_report_id,
        f.item_name AS found_item_name, f.user_id AS found_user_id,
        f.image_url AS found_image_url, f.status AS found_status
      FROM matches m
      JOIN lost_items  l ON l.id = m.lost_item_id
      JOIN found_items f ON f.id = m.found_item_id
      WHERE m.status != 'Dismissed'
        AND (l.user_id = ? OR f.user_id = ?)
      ORDER BY m.match_score DESC, m.created_at DESC
      LIMIT 50
      `,
      [userId, userId]
    );

    res.json({ items: rows });
  } catch (err) {
    console.error('matches/my error:', err);
    res.status(500).json({ error: 'Failed to load your matches' });
  }
});

/**
 * PATCH /api/matches/:id/dismiss
 * Marks a match as Dismissed. Only the owner of either linked item
 * can dismiss it. Dismissed pairs never reappear.
 */
router.patch('/:id/dismiss', verifyToken, async (req, res) => {
  const matchId = req.params.id;
  const userId = req.user.id;

  if (!matchId || Number.isNaN(Number(matchId))) {
    return res.status(400).json({ error: 'Invalid match id' });
  }

  try {
    // Load the match + the two items' user_ids
    const [rows] = await db.query(
      `
      SELECT m.id, m.status,
             l.user_id AS lost_user_id,
             f.user_id AS found_user_id
      FROM matches m
      JOIN lost_items  l ON l.id = m.lost_item_id
      JOIN found_items f ON f.id = m.found_item_id
      WHERE m.id = ? LIMIT 1
      `,
      [matchId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const m = rows[0];
    const isParticipant =
      Number(m.lost_user_id) === Number(userId) ||
      Number(m.found_user_id) === Number(userId);

    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not allowed to dismiss this match' });
    }

    if (m.status === 'Dismissed') {
      return res.json({ message: 'Already dismissed', id: Number(matchId) });
    }

    await db.query(
      `UPDATE matches SET status = 'Dismissed' WHERE id = ?`,
      [matchId]
    );

    res.json({ message: 'Match dismissed', id: Number(matchId) });
  } catch (err) {
    console.error('match dismiss error:', err);
    res.status(500).json({ error: 'Failed to dismiss match' });
  }
});

module.exports = router;