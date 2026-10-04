const express = require('express');
const router = express.Router();
const db = require('./db');
const { verifyToken } = require('./middleware/auth');
const { createNotification } = require('./notificationHelper');

// Valid statuses per the ENUM we just confirmed
const VALID_STATUSES = ['Posted', 'Matched', 'Verified', 'Returned', 'Removed'];

// Statuses that a non-admin owner is allowed to set.
// Owners can soft-delete (Removed) or restore to Posted. Nothing else.
const OWNER_ALLOWED_STATUSES = ['Posted', 'Removed'];

/**
 * PATCH /api/items/:type/:reportId
 *
 * Body: { status: "Posted" | "Matched" | "Verified" | "Returned" | "Removed" }
 *
 * Auth: JWT required.
 * Authorization:
 *   - Owner: can only set status to Posted or Removed.
 *   - Admin: can set any valid status.
 *
 * Side effects:
 *   - Updates lost_items.status or found_items.status
 *   - Writes a row to status_history
 */
router.patch('/:type/:reportId', verifyToken, async (req, res) => {
  const { type, reportId } = req.params;
  const { status } = req.body;

  // ── Validate type ───────────────────────────────────────────
  if (type !== 'lost' && type !== 'found') {
    return res.status(400).json({ error: 'type must be "lost" or "found"' });
  }

  // ── Validate status ─────────────────────────────────────────
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
    });
  }

  const table = type === 'lost' ? 'lost_items' : 'found_items';
  const itemTypeLabel = type === 'lost' ? 'Lost' : 'Found';

  try {
    // ── Look up the item ──────────────────────────────────────
    const [rows] = await db.query(
      `SELECT id, user_id, status FROM ${table} WHERE report_id = ? LIMIT 1`,
      [reportId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = rows[0];
    const isOwner = Number(req.user.id) === Number(item.user_id);
    const isAdmin = req.user.role === 'admin';

    // ── Authorization ─────────────────────────────────────────
    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ error: 'You can only modify your own reports' });
    }

    if (isOwner && !isAdmin && !OWNER_ALLOWED_STATUSES.includes(status)) {
      return res.status(403).json({
        error: `Owners may only set status to: ${OWNER_ALLOWED_STATUSES.join(
          ', '
        )}. Contact an admin for other changes.`,
      });
    }

    // ── No-op guard ───────────────────────────────────────────
    if (item.status === status) {
      return res.json({
        message: 'Status unchanged',
        item: { report_id: reportId, type, status },
      });
    }

    const oldStatus = item.status;

    // ── Update the item ───────────────────────────────────────
    await db.query(
      `UPDATE ${table} SET status = ? WHERE report_id = ?`,
      [status, reportId]
    );

    // ── Log to status_history ─────────────────────────────────
    // If the table doesn't exist or the insert fails for any reason,
    // we still want the update to succeed. Log and continue.
       // ── Log to status_history ─────────────────────────────────
        // ── Log to status_history ─────────────────────────────────
    try {
      await db.query(
        `INSERT INTO status_history
          (item_id, item_type, old_status, new_status, actor_id, actor_role)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [item.id, itemTypeLabel, oldStatus, status, req.user.id, req.user.role]
      );
    } catch (historyErr) {
      console.error('status_history insert failed:', historyErr.message);
    }

    // ── Fire notification if status became Returned ────────────
    // Notify the reporter (not the actor, who already knows).
    // Skip if the actor IS the reporter — no point telling someone
    // what they just did themselves.
    if (status === 'Returned' && Number(req.user.id) !== Number(item.user_id)) {
      await createNotification(
        item.user_id,
        'ItemReturned',
        `Your ${itemTypeLabel.toLowerCase()} item "${reportId}" was marked as returned.`,
        `/items/${type}/${reportId}`
      );
    }

    res.json({
      message: 'Status updated',
      item: {
        report_id: reportId,
        type,
        old_status: oldStatus,
        status,
      },
    });
    
  } catch (err) {
    console.error('patch item error:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

module.exports = router;