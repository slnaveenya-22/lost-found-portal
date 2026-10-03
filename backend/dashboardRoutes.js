const express = require('express');
const router = express.Router();
const db = require('./db');
const { verifyToken } = require('./middleware/auth');

/**
 * GET /api/dashboard/stats
 * Returns counts scoped to the authenticated user.
 */
router.get('/stats', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await db.query(
      `
      SELECT
        (SELECT COUNT(*) FROM lost_items
         WHERE user_id = ? AND status NOT IN ('Returned','Removed')) +
        (SELECT COUNT(*) FROM found_items
         WHERE user_id = ? AND status NOT IN ('Returned','Removed'))
        AS active_reports,

        (SELECT COUNT(*) FROM matches
         WHERE status = 'Suggested'
           AND (
             lost_item_id IN (SELECT id FROM lost_items WHERE user_id = ?)
             OR found_item_id IN (SELECT id FROM found_items WHERE user_id = ?)
           ))
        AS matches,

        (SELECT COUNT(*) FROM claims
         WHERE status = 'Pending'
           AND (
             claimant_id = ?
             OR found_item_id IN (SELECT id FROM found_items WHERE user_id = ?)
           ))
        AS pending_claims,

        (SELECT COUNT(*) FROM lost_items
         WHERE user_id = ? AND status = 'Returned') +
        (SELECT COUNT(*) FROM found_items
         WHERE user_id = ? AND status = 'Returned')
        AS returned
      `,
      [userId, userId, userId, userId, userId, userId, userId, userId]
    );

    const stats = rows[0] || {};

    res.json({
      stats: {
        active_reports: Number(stats.active_reports) || 0,
        matches: Number(stats.matches) || 0,
        pending_claims: Number(stats.pending_claims) || 0,
        returned: Number(stats.returned) || 0,
      },
    });
  } catch (err) {
    console.error('dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

/**
 * GET /api/dashboard/activity?limit=10
 * Merges recent activity across lost_items, found_items, matches, and claims.
 */
router.get('/activity', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

  try {
    // Recent reports by this user
    const [reports] = await db.query(
      `
      SELECT
        CONCAT('lost-', id) AS id,
        'report_created' AS kind,
        item_name, report_id,
        'lost' AS type,
        status,
        NULL AS actor_name,
        created_at
      FROM lost_items
      WHERE user_id = ?
      UNION ALL
      SELECT
        CONCAT('found-', id) AS id,
        'report_created' AS kind,
        item_name, report_id,
        'found' AS type,
        status,
        NULL AS actor_name,
        created_at
      FROM found_items
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [userId, userId, limit]
    );

    // Merge in any matches and claims — placeholder for later stories.
    // For now, just return the reports as the activity feed.
    // Once Story 7 (matching) and Story 8 (claims) populate those tables,
    // add two more UNION ALL blocks for match_suggested and claim_submitted.

    res.json({ items: reports });
  } catch (err) {
    console.error('dashboard activity error:', err);
    res.status(500).json({ error: 'Failed to load activity' });
  }
});

module.exports = router;