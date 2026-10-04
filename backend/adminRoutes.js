const express = require('express');
const router = express.Router();
const db = require('./db');
const { verifyToken, requireAdmin } = require('./middleware/auth');

// ── All routes below require JWT + admin role ───────────────
router.use(verifyToken, requireAdmin);

const VALID_ROLES = ['student', 'staff', 'admin'];
const VALID_CLAIM_ACTIONS = ['approve', 'reject'];

/* ══════════════════════════════════════════════════════════════
   GET /api/admin/stats
   Platform-wide counts for the admin dashboard.
   ══════════════════════════════════════════════════════════════ */
router.get('/stats', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users)                          AS total_users,
        (SELECT COUNT(*) FROM lost_items)  +
        (SELECT COUNT(*) FROM found_items)                    AS total_items,
        (SELECT COUNT(*) FROM claims WHERE status = 'Pending') AS pending_claims,
        (SELECT COUNT(*) FROM lost_items  WHERE status = 'Returned') +
        (SELECT COUNT(*) FROM found_items WHERE status = 'Returned') AS returned_items
    `);

    const s = rows[0] || {};
    res.json({
      stats: {
        total_users:    Number(s.total_users)    || 0,
        total_items:    Number(s.total_items)    || 0,
        pending_claims: Number(s.pending_claims) || 0,
        returned_items: Number(s.returned_items) || 0,
      },
    });
  } catch (err) {
    console.error('admin stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

/* ══════════════════════════════════════════════════════════════
   GET /api/admin/items?status=&type=&q=&limit=
   All items across both tables, with reporter name.
   ══════════════════════════════════════════════════════════════ */
router.get('/items', async (req, res) => {
  const { status, type, q, limit } = req.query;
  const maxRows = Math.min(parseInt(limit, 10) || 500, 500);

  // Whitelist columns — same public shape plus reporter info
  const PUBLIC_COLS = `
    i.id, i.report_id, i.user_id, i.category, i.item_name,
    i.color, i.brand, i.location, i.date_time, i.description,
    i.image_url, i.status, i.created_at,
    u.name AS reporter_name, u.email AS reporter_email
  `;

  const params = [];
  let sql;

  if (type === 'lost' || type === 'found') {
    const table = type === 'lost' ? 'lost_items' : 'found_items';
    const where = ['1=1'];

    if (status) {
      where.push('i.status = ?');
      params.push(status);
    }
    if (q && q.trim()) {
      const like = `%${q.trim()}%`;
      where.push(
        '(i.item_name LIKE ? OR i.brand LIKE ? OR i.location LIKE ? OR i.report_id LIKE ?)'
      );
      params.push(like, like, like, like);
    }

    sql = `
      SELECT ${PUBLIC_COLS}, '${type}' AS type
      FROM ${table} i
      LEFT JOIN users u ON u.id = i.user_id
      WHERE ${where.join(' AND ')}
      ORDER BY i.created_at DESC
      LIMIT ?
    `;
    params.push(maxRows);
  } else {
    // Both types — UNION with a type column
    const lostWhere = ['1=1'];
    const foundWhere = ['1=1'];
    const lostParams = [];
    const foundParams = [];

    if (status) {
      lostWhere.push('i.status = ?');
      foundWhere.push('i.status = ?');
      lostParams.push(status);
      foundParams.push(status);
    }
    if (q && q.trim()) {
      const like = `%${q.trim()}%`;
      const cond = '(i.item_name LIKE ? OR i.brand LIKE ? OR i.location LIKE ? OR i.report_id LIKE ?)';
      lostWhere.push(cond);
      foundWhere.push(cond);
      lostParams.push(like, like, like, like);
      foundParams.push(like, like, like, like);
    }

    sql = `
      (SELECT ${PUBLIC_COLS}, 'lost' AS type
       FROM lost_items i
       LEFT JOIN users u ON u.id = i.user_id
       WHERE ${lostWhere.join(' AND ')})
      UNION ALL
      (SELECT ${PUBLIC_COLS}, 'found' AS type
       FROM found_items i
       LEFT JOIN users u ON u.id = i.user_id
       WHERE ${foundWhere.join(' AND ')})
      ORDER BY created_at DESC
      LIMIT ?
    `;
    params.push(...lostParams, ...foundParams, maxRows);
  }

  try {
    const [rows] = await db.query(sql, params);
    res.json({ items: rows });
  } catch (err) {
    console.error('admin items error:', err);
    res.status(500).json({ error: 'Failed to load items' });
  }
});

/* ══════════════════════════════════════════════════════════════
   GET /api/admin/claims?status=
   Claims with joined item + claimant + reviewer details.
   ══════════════════════════════════════════════════════════════ */
router.get('/claims', async (req, res) => {
  const { status } = req.query;
  const where = [];
  const params = [];

  if (status && ['Pending', 'Approved', 'Rejected'].includes(status)) {
    where.push('c.status = ?');
    params.push(status);
  }

  try {
    const [rows] = await db.query(
      `
      SELECT
        c.id, c.match_id, c.found_item_id, c.claimant_id,
        c.proof_text, c.status, c.rejection_reason,
        c.reviewed_by, c.created_at,
        fi.report_id AS item_report_id,
        fi.item_name  AS item_name,
        fi.location   AS item_location,
        fi.image_url  AS item_image_url,
        claimant.name  AS claimant_name,
        claimant.email AS claimant_email,
        reviewer.name  AS reviewer_name
      FROM claims c
      LEFT JOIN found_items fi ON fi.id = c.found_item_id
      LEFT JOIN users claimant ON claimant.id = c.claimant_id
      LEFT JOIN users reviewer ON reviewer.id = c.reviewed_by
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY c.created_at DESC
      LIMIT 500
      `,
      params
    );

    res.json({ items: rows });
  } catch (err) {
    console.error('admin claims error:', err);
    res.status(500).json({ error: 'Failed to load claims' });
  }
});

/* ══════════════════════════════════════════════════════════════
   GET /api/admin/users?q=&role=
   User list — never includes password_hash.
   ══════════════════════════════════════════════════════════════ */
router.get('/users', async (req, res) => {
  const { q, role } = req.query;
  const where = [];
  const params = [];

  if (q && q.trim()) {
    const like = `%${q.trim()}%`;
    where.push('(name LIKE ? OR email LIKE ?)');
    params.push(like, like);
  }
  if (role && VALID_ROLES.includes(role)) {
    where.push('role = ?');
    params.push(role);
  }

  try {
    const [rows] = await db.query(
      `
      SELECT id, name, email, role, created_at
      FROM users
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY created_at DESC
      LIMIT 500
      `,
      params
    );

    res.json({ items: rows });
  } catch (err) {
    console.error('admin users error:', err);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

/* ══════════════════════════════════════════════════════════════
   PATCH /api/admin/claims/:id
   Body: { action: "approve" | "reject", rejection_reason?: string }
   On approve:
     - claim.status = 'Approved', reviewed_by = admin.id
     - if match exists → matches.status = 'Claimed'
     - found_items.status = 'Returned'
     - if match links to a lost item → that lost item → 'Returned'
     - status_history rows written for each item change
   On reject:
     - claim.status = 'Rejected', reviewed_by, rejection_reason saved
   ══════════════════════════════════════════════════════════════ */
router.patch('/claims/:id', async (req, res) => {
  const claimId = req.params.id;
  const { action, rejection_reason } = req.body || {};

  if (!claimId || Number.isNaN(Number(claimId))) {
    return res.status(400).json({ error: 'Invalid claim id' });
  }
  if (!action || !VALID_CLAIM_ACTIONS.includes(action)) {
    return res.status(400).json({
      error: `action must be one of: ${VALID_CLAIM_ACTIONS.join(', ')}`,
    });
  }
  if (action === 'reject' && rejection_reason && rejection_reason.length > 500) {
    return res.status(400).json({ error: 'Rejection reason too long (max 500)' });
  }

  try {
    // ── Load the claim ────────────────────────────────────────
    const [rows] = await db.query(
      `SELECT id, match_id, found_item_id, claimant_id, status
       FROM claims WHERE id = ? LIMIT 1`,
      [claimId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const claim = rows[0];

    if (claim.status !== 'Pending') {
      return res.status(400).json({
        error: `Claim is already ${claim.status.toLowerCase()}`,
      });
    }

    const adminId = req.user.id;

    if (action === 'reject') {
      await db.query(
        `UPDATE claims
         SET status = 'Rejected',
             reviewed_by = ?,
             rejection_reason = ?
         WHERE id = ?`,
        [adminId, rejection_reason || null, claimId]
      );

      return res.json({
        message: 'Claim rejected',
        claim: { id: claim.id, status: 'Rejected' },
      });
    }

    // ── Approve path ──────────────────────────────────────────
    // 1. Update the claim
    await db.query(
      `UPDATE claims
       SET status = 'Approved', reviewed_by = ?
       WHERE id = ?`,
      [adminId, claimId]
    );

    // 2. Load the found item (need its current status for history)
    const [foundRows] = await db.query(
      `SELECT id, report_id, user_id, status FROM found_items WHERE id = ?`,
      [claim.found_item_id]
    );

    const foundItem = foundRows[0];

    // 3. Update found item to Returned (if not already)
    if (foundItem && foundItem.status !== 'Returned') {
      await db.query(
        `UPDATE found_items SET status = 'Returned' WHERE id = ?`,
        [foundItem.id]
      );

      try {
        await db.query(
          `INSERT INTO status_history
            (item_id, item_type, old_status, new_status, actor_id, actor_role)
           VALUES (?, 'Found', ?, 'Returned', ?, 'admin')`,
          [foundItem.id, foundItem.status, adminId]
        );
      } catch (hErr) {
        console.error('status_history (found) insert failed:', hErr.message);
      }
    }

    // 4. If the claim was linked to a match, update that match
    //    and its lost item too.
    if (claim.match_id) {
      await db.query(
        `UPDATE matches SET status = 'Claimed' WHERE id = ?`,
        [claim.match_id]
      );

      const [matchRows] = await db.query(
        `SELECT lost_item_id FROM matches WHERE id = ?`,
        [claim.match_id]
      );

      const lostItemId = matchRows[0]?.lost_item_id;

      if (lostItemId) {
        const [lostRows] = await db.query(
          `SELECT id, status FROM lost_items WHERE id = ?`,
          [lostItemId]
        );
        const lostItem = lostRows[0];

        if (lostItem && lostItem.status !== 'Returned') {
          await db.query(
            `UPDATE lost_items SET status = 'Returned' WHERE id = ?`,
            [lostItem.id]
          );

          try {
            await db.query(
              `INSERT INTO status_history
                (item_id, item_type, old_status, new_status, actor_id, actor_role)
               VALUES (?, 'Lost', ?, 'Returned', ?, 'admin')`,
              [lostItem.id, lostItem.status, adminId]
            );
          } catch (hErr) {
            console.error('status_history (lost) insert failed:', hErr.message);
          }
        }
      }
    }

    res.json({
      message: 'Claim approved',
      claim: { id: claim.id, status: 'Approved' },
      item: {
        found_item_id: foundItem?.id,
        found_report_id: foundItem?.report_id,
        status: 'Returned',
      },
    });
  } catch (err) {
    console.error('admin claim patch error:', err);
    res.status(500).json({ error: 'Failed to update claim' });
  }
});

/* ══════════════════════════════════════════════════════════════
   PATCH /api/admin/users/:id/role
   Body: { role: "student" | "staff" | "admin" }
   Rejects self-change (admin can't demote themselves).
   ══════════════════════════════════════════════════════════════ */
router.patch('/users/:id/role', async (req, res) => {
  const targetId = req.params.id;
  const { role } = req.body || {};

  if (!targetId || Number.isNaN(Number(targetId))) {
    return res.status(400).json({ error: 'Invalid user id' });
  }
  if (!role || !VALID_ROLES.includes(role)) {
    return res.status(400).json({
      error: `role must be one of: ${VALID_ROLES.join(', ')}`,
    });
  }
  if (Number(targetId) === Number(req.user.id)) {
    return res.status(403).json({ error: "You can't change your own role" });
  }

  try {
    const [existing] = await db.query(
      'SELECT id, name, role FROM users WHERE id = ? LIMIT 1',
      [targetId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (existing[0].role === role) {
      return res.json({
        message: 'Role unchanged',
        user: { id: existing[0].id, role },
      });
    }

    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, targetId]);

    res.json({
      message: 'Role updated',
      user: { id: Number(targetId), name: existing[0].name, role },
    });
  } catch (err) {
    console.error('admin role patch error:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

module.exports = router;