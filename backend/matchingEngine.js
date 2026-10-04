const db = require('./db');
const { createNotification } = require('./notificationHelper');

// ── Scoring constants ───────────────────────────────────────
const WEIGHTS = {
  CATEGORY: 40,
  COLOR: 20,
  BRAND: 20,
  LOCATION: 10,
  DATE_PROXIMITY: 10,
};

const MATCH_THRESHOLD = 60;        // minimum to insert a match row
const NOTIFY_THRESHOLD = 80;       // minimum to send notifications
const DATE_PROXIMITY_DAYS = 5;     // bonus if reports are within N days
const CANDIDATE_WINDOW_DAYS = 60;  // only scan items from last N days

/* ── Normalization helpers ───────────────────────────────── */
function norm(v) {
  return (v || '').toString().trim().toLowerCase();
}

function fuzzyLocation(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

function daysBetween(d1, d2) {
  const t1 = new Date(d1).getTime();
  const t2 = new Date(d2).getTime();
  return Math.abs(t1 - t2) / (1000 * 60 * 60 * 24);
}

/**
 * Score a lost ↔ found pair. Returns 0–100.
 */
function scorePair(lost, found) {
  let score = 0;

  if (norm(lost.category) && norm(lost.category) === norm(found.category))
    score += WEIGHTS.CATEGORY;

  if (norm(lost.color) && norm(lost.color) === norm(found.color))
    score += WEIGHTS.COLOR;

  if (norm(lost.brand) && norm(lost.brand) === norm(found.brand))
    score += WEIGHTS.BRAND;

  if (fuzzyLocation(lost.location, found.location))
    score += WEIGHTS.LOCATION;

  if (lost.date_time && found.date_time) {
    if (daysBetween(lost.date_time, found.date_time) <= DATE_PROXIMITY_DAYS)
      score += WEIGHTS.DATE_PROXIMITY;
  }

  return score;
}

/**
 * Given a newly-created item, find matches against the opposite table,
 * insert `matches` rows for any score >= MATCH_THRESHOLD, and notify
 * both parties for any score >= NOTIFY_THRESHOLD.
 *
 * Safe to run repeatedly: skips pairs that already exist (including
 * those dismissed in the past).
 *
 * @param {number} itemId  - the internal `id` of the new item
 * @param {'lost'|'found'} itemType
 */
async function findMatchesFor(itemId, itemType) {
  if (!itemId || (itemType !== 'lost' && itemType !== 'found')) {
    console.error('findMatchesFor: invalid args', { itemId, itemType });
    return { created: 0, notified: 0 };
  }

  const sourceTable = itemType === 'lost' ? 'lost_items' : 'found_items';
  const targetTable = itemType === 'lost' ? 'found_items' : 'lost_items';

  try {
    // 1. Load the source item
    const [srcRows] = await db.query(
      `SELECT id, report_id, user_id, category, item_name, color, brand,
              location, date_time
       FROM ${sourceTable} WHERE id = ? LIMIT 1`,
      [itemId]
    );

    if (srcRows.length === 0) {
      console.error('findMatchesFor: source item not found', itemId);
      return { created: 0, notified: 0 };
    }

    const source = srcRows[0];

    // 2. Load candidate items from the opposite table
    //    Filtered to the last CANDIDATE_WINDOW_DAYS, excluding Removed items
    const [candidates] = await db.query(
      `SELECT id, report_id, user_id, category, item_name, color, brand,
              location, date_time
       FROM ${targetTable}
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         AND status != 'Removed'
       LIMIT 500`,
      [CANDIDATE_WINDOW_DAYS]
    );

    if (candidates.length === 0) {
      return { created: 0, notified: 0 };
    }

    // 3. Load existing pairs (any status — Suggested, Claimed, Dismissed)
    //    so we don't reinsert. Dismissed pairs stay dismissed.
    const candidateIds = candidates.map((c) => c.id);
    const placeholders = candidateIds.map(() => '?').join(',');

    const [existing] = await db.query(
      `SELECT lost_item_id, found_item_id, status
       FROM matches
       WHERE ${
         itemType === 'lost'
           ? `lost_item_id = ? AND found_item_id IN (${placeholders})`
           : `found_item_id = ? AND lost_item_id IN (${placeholders})`
       }`,
      [source.id, ...candidateIds]
    );

    const seen = new Set(
      existing.map((m) =>
        itemType === 'lost'
          ? `${m.lost_item_id}-${m.found_item_id}`
          : `${m.lost_item_id}-${m.found_item_id}`
      )
    );

    // 4. Score each candidate, insert new matches above threshold
    let created = 0;
    let notified = 0;

    for (const candidate of candidates) {
      const lost = itemType === 'lost' ? source : candidate;
      const found = itemType === 'lost' ? candidate : source;

      const key = `${lost.id}-${found.id}`;
      if (seen.has(key)) continue;

      const score = scorePair(lost, found);
      if (score < MATCH_THRESHOLD) continue;

      // Insert the match row
      try {
        await db.query(
          `INSERT INTO matches (lost_item_id, found_item_id, match_score, status)
           VALUES (?, ?, ?, 'Suggested')`,
          [lost.id, found.id, score]
        );
        created += 1;
        seen.add(key);
      } catch (insertErr) {
        console.error('match insert failed:', insertErr.message);
        continue;
      }

      // Notify both parties for strong matches
      if (score >= NOTIFY_THRESHOLD) {
        // Notify the lost-item reporter
        await createNotification(
          lost.user_id,
          'Match',
          `Possible match found for your lost item "${lost.item_name}".`,
          `/items/lost/${lost.report_id}`
        );

        // Notify the found-item reporter (if a different user)
        if (Number(found.user_id) !== Number(lost.user_id)) {
          await createNotification(
            found.user_id,
            'Match',
            `Someone may be looking for the item you found: "${found.item_name}".`,
            `/items/found/${found.report_id}`
          );
        }

        notified += 1;
      }
    }

    return { created, notified };
  } catch (err) {
    console.error('findMatchesFor error:', err.message);
    return { created: 0, notified: 0 };
  }
}

module.exports = { findMatchesFor, scorePair, MATCH_THRESHOLD, NOTIFY_THRESHOLD };