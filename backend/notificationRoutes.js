const express = require('express');
const router = express.Router();
const db = require('./db');
const { verifyToken } = require('./middleware/auth');

/**
 * GET /api/notifications
 * Returns the authenticated user's notifications, newest first.
 */
router.get('/', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await db.query(
      `SELECT id, type, message, link, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId]
    );

    res.json({ items: rows });
  } catch (err) {
    console.error('notifications list error:', err);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Marks all unread notifications for the user as read.
 * NOTE: this route MUST be declared before /:id/read, otherwise
 * Express will interpret "read-all" as an :id parameter.
 */
router.patch('/read-all', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const [result] = await db.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    );

    res.json({ updated: result.affectedRows });
  } catch (err) {
    console.error('notifications read-all error:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read. Rejects if the notification
 * doesn't belong to the requesting user.
 */
router.patch('/:id/read', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const notificationId = req.params.id;

  if (!notificationId || Number.isNaN(Number(notificationId))) {
    return res.status(400).json({ error: 'Invalid notification id' });
  }

  try {
    // Look up first — needed to distinguish 404 vs 403
    const [rows] = await db.query(
      'SELECT id, user_id, is_read FROM notifications WHERE id = ? LIMIT 1',
      [notificationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (Number(rows[0].user_id) !== Number(userId)) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    if (rows[0].is_read) {
      return res.json({ message: 'Already read', id: Number(notificationId) });
    }

    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ?',
      [notificationId]
    );

    res.json({ message: 'Marked as read', id: Number(notificationId) });
  } catch (err) {
    console.error('notification read error:', err);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

module.exports = router;