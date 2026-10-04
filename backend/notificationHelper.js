const db = require('./db');

// Valid notification types — matches the ENUM in the schema
const VALID_TYPES = [
  'Match',
  'ClaimSubmitted',
  'ClaimApproved',
  'ClaimRejected',
  'ItemReturned',
];

/**
 * Creates a notification row for a user.
 *
 * Designed to be called as a fire-and-forget side effect inside
 * other routes. Failures are logged but never thrown, so the caller's
 * main operation (e.g. updating an item status) never fails because
 * a notification couldn't be written.
 *
 * @param {number} userId        - Recipient user id
 * @param {string} type          - One of VALID_TYPES
 * @param {string} message       - Human-readable notification text
 * @param {string|null} link     - Optional frontend route, e.g. /items/lost/LST-123
 * @returns {Promise<boolean>}   - true if inserted, false on failure
 */
async function createNotification(userId, type, message, link = null) {
  if (!userId || !VALID_TYPES.includes(type) || !message) {
    console.error('createNotification: invalid arguments', {
      userId,
      type,
      message,
    });
    return false;
  }

  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, message, link)
       VALUES (?, ?, ?, ?)`,
      [userId, type, message, link]
    );
    return true;
  } catch (err) {
    console.error('createNotification failed:', err.message);
    return false;
  }
}

module.exports = { createNotification, VALID_TYPES };