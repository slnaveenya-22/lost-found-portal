jest.mock('../db');
jest.mock('../notificationHelper', () => ({
  createNotification: jest.fn().mockResolvedValue(true),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const db = require('../db');
const { createNotification } = require('../notificationHelper');

beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-do-not-use-in-prod';
});

beforeEach(() => {
  db.query.mockReset();
  createNotification.mockClear();
});

function makeToken(id, role = 'student') {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// Row shape returned by the SELECT that loads the item
function itemRow(overrides = {}) {
  return {
    id: 42,
    user_id: 7,
    status: 'Posted',
    ...overrides,
  };
}

/* ══════════════════════════════════════════════════════════════
   Authentication + validation
   ══════════════════════════════════════════════════════════════ */
describe('PATCH /api/items/:type/:reportId — auth + validation', () => {
  test('401 when no token is provided', async () => {
    const res = await request(app)
      .patch('/api/items/lost/LST-123456')
      .send({ status: 'Removed' });

    expect(res.status).toBe(401);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('400 when type is invalid', async () => {
    const token = makeToken(7);

    const res = await request(app)
      .patch('/api/items/whatever/LST-123456')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Removed' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type must be/i);
  });

  test('400 when status is missing', async () => {
    const token = makeToken(7);

    const res = await request(app)
      .patch('/api/items/lost/LST-123456')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status must be one of/i);
  });

  test('400 when status is not a valid enum value', async () => {
    const token = makeToken(7);

    const res = await request(app)
      .patch('/api/items/lost/LST-123456')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Deleted' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status must be one of/i);
  });

  test('404 when the item does not exist', async () => {
    const token = makeToken(7);
    db.query.mockResolvedValueOnce([[]]); // empty rows

    const res = await request(app)
      .patch('/api/items/lost/LST-999999')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Removed' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

/* ══════════════════════════════════════════════════════════════
   Authorization
   ══════════════════════════════════════════════════════════════ */
describe('PATCH /api/items — authorization', () => {
  test('403 when a non-owner tries to change someone else\'s item', async () => {
    const token = makeToken(99); // different user
    db.query.mockResolvedValueOnce([[itemRow({ user_id: 7 })]]);

    const res = await request(app)
      .patch('/api/items/lost/LST-123456')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Removed' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/only modify your own/i);
  });

  test('403 when owner tries an admin-only status (Matched)', async () => {
    const token = makeToken(7);
    db.query.mockResolvedValueOnce([[itemRow({ user_id: 7 })]]);

    const res = await request(app)
      .patch('/api/items/lost/LST-123456')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Matched' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/owners may only set status to/i);
  });

  test('403 when owner tries Verified', async () => {
    const token = makeToken(7);
    db.query.mockResolvedValueOnce([[itemRow({ user_id: 7 })]]);

    const res = await request(app)
      .patch('/api/items/lost/LST-123456')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Verified' });

    expect(res.status).toBe(403);
  });

  test('403 when owner tries Returned', async () => {
    const token = makeToken(7);
    db.query.mockResolvedValueOnce([[itemRow({ user_id: 7 })]]);

    const res = await request(app)
      .patch('/api/items/lost/LST-123456')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Returned' });

    expect(res.status).toBe(403);
  });
});

/* ══════════════════════════════════════════════════════════════
   Owner happy path
   ══════════════════════════════════════════════════════════════ */
describe('PATCH /api/items — owner allowed transitions', () => {
  test('200 when owner sets status to Removed', async () => {
    const token = makeToken(7);
    db.query
      .mockResolvedValueOnce([[itemRow({ user_id: 7, status: 'Posted' })]]) // SELECT
      .mockResolvedValueOnce([{}]) // UPDATE
      .mockResolvedValueOnce([{}]); // status_history INSERT

    const res = await request(app)
      .patch('/api/items/lost/LST-123456')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Removed' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/status updated/i);
    expect(res.body.item.old_status).toBe('Posted');
    expect(res.body.item.status).toBe('Removed');

    // Verify UPDATE and history INSERT were called
    expect(db.query).toHaveBeenCalledTimes(3);

    const updateCall = db.query.mock.calls[1];
    expect(updateCall[0]).toMatch(/UPDATE\s+lost_items/);
    expect(updateCall[1]).toEqual(['Removed', 'LST-123456']);

    const historyCall = db.query.mock.calls[2];
    expect(historyCall[0]).toMatch(/INSERT INTO status_history/);
    expect(historyCall[1]).toEqual([42, 'Lost', 'Posted', 'Removed', 7, 'student']);
  });

  test('200 when owner restores a Removed item to Posted', async () => {
    const token = makeToken(7);
    db.query
      .mockResolvedValueOnce([[itemRow({ user_id: 7, status: 'Removed' })]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    const res = await request(app)
      .patch('/api/items/found/FND-123456')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Posted' });

    expect(res.status).toBe(200);
    expect(res.body.item.old_status).toBe('Removed');
    expect(res.body.item.status).toBe('Posted');

    const historyCall = db.query.mock.calls[2];
    expect(historyCall[1]).toEqual([42, 'Found', 'Removed', 'Posted', 7, 'student']);
  });
});

/* ══════════════════════════════════════════════════════════════
   Admin — any status
   ══════════════════════════════════════════════════════════════ */
describe('PATCH /api/items — admin can set any status', () => {
  test('admin sets status to Verified', async () => {
    const adminToken = makeToken(1, 'admin');
    db.query
      .mockResolvedValueOnce([[itemRow({ user_id: 7, status: 'Posted' })]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    const res = await request(app)
      .patch('/api/items/lost/LST-123456')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Verified' });

    expect(res.status).toBe(200);
    expect(res.body.item.old_status).toBe('Posted');
    expect(res.body.item.status).toBe('Verified');

    const historyCall = db.query.mock.calls[2];
    expect(historyCall[1]).toEqual([42, 'Lost', 'Posted', 'Verified', 1, 'admin']);
  });

  test('admin sets status to Matched', async () => {
    const adminToken = makeToken(1, 'admin');
    db.query
      .mockResolvedValueOnce([[itemRow({ user_id: 7, status: 'Posted' })]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    const res = await request(app)
      .patch('/api/items/found/FND-123456')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Matched' });

    expect(res.status).toBe(200);
    expect(res.body.item.status).toBe('Matched');
  });
});

/* ══════════════════════════════════════════════════════════════
   No-op guard
   ══════════════════════════════════════════════════════════════ */
describe('PATCH /api/items — no-op guard', () => {
  test('returns "Status unchanged" when new status equals current', async () => {
    const token = makeToken(7);
    db.query.mockResolvedValueOnce([[itemRow({ user_id: 7, status: 'Posted' })]]);

    const res = await request(app)
      .patch('/api/items/lost/LST-123456')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Posted' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/status unchanged/i);
    expect(db.query).toHaveBeenCalledTimes(1); // only the SELECT ran
  });
});

/* ══════════════════════════════════════════════════════════════
   Status history side effect
   ══════════════════════════════════════════════════════════════ */
describe('PATCH /api/items — status_history', () => {
  test('writes a history row on a real status change', async () => {
    const token = makeToken(7);
    db.query
      .mockResolvedValueOnce([[itemRow({ user_id: 7, status: 'Posted' })]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    await request(app)
      .patch('/api/items/lost/LST-123456')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Removed' });

    const historyCall = db.query.mock.calls[2];
    expect(historyCall[0]).toMatch(/INSERT INTO status_history/);
  });

  test('still returns 200 if the history insert fails', async () => {
    const token = makeToken(7);
    db.query
      .mockResolvedValueOnce([[itemRow({ user_id: 7, status: 'Posted' })]])
      .mockResolvedValueOnce([{}]) // UPDATE succeeds
      .mockRejectedValueOnce(new Error('history table gone')); // INSERT fails

    const res = await request(app)
      .patch('/api/items/lost/LST-123456')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Removed' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/status updated/i);
  });
});

/* ══════════════════════════════════════════════════════════════
   ItemReturned notification side effect
   ══════════════════════════════════════════════════════════════ */
describe('PATCH /api/items — ItemReturned notification', () => {
  test('fires createNotification when admin marks an item as Returned', async () => {
    const adminToken = makeToken(1, 'admin');
    db.query
      .mockResolvedValueOnce([[itemRow({ user_id: 7, status: 'Posted' })]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    const res = await request(app)
      .patch('/api/items/lost/LST-123456')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Returned' });

    expect(res.status).toBe(200);
    expect(createNotification).toHaveBeenCalledTimes(1);

    const [userId, type, message, link] = createNotification.mock.calls[0];
    expect(userId).toBe(7); // the reporter
    expect(type).toBe('ItemReturned');
    expect(message).toMatch(/lost item "LST-123456" was marked as returned/i);
    expect(link).toBe('/items/lost/LST-123456');
  });

  test('does NOT fire a notification for non-Returned status changes', async () => {
    const adminToken = makeToken(1, 'admin');
    db.query
      .mockResolvedValueOnce([[itemRow({ user_id: 7, status: 'Posted' })]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    await request(app)
      .patch('/api/items/lost/LST-123456')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Verified' });

    expect(createNotification).not.toHaveBeenCalled();
  });

  test('does NOT notify when the actor IS the reporter', async () => {
    // Same user id for actor and item owner. But a non-admin can't set Returned,
    // so simulate by making the same user an admin. The guard checks user_id equality.
    const token = makeToken(7, 'admin'); // user 7 is both actor and owner
    db.query
      .mockResolvedValueOnce([[itemRow({ user_id: 7, status: 'Posted' })]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    const res = await request(app)
      .patch('/api/items/lost/LST-123456')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Returned' });

    expect(res.status).toBe(200);
    expect(createNotification).not.toHaveBeenCalled();
  });
});

/* ══════════════════════════════════════════════════════════════
   Error handling
   ══════════════════════════════════════════════════════════════ */
describe('PATCH /api/items — error handling', () => {
  test('500 when the SELECT throws', async () => {
    const token = makeToken(7);
    db.query.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app)
      .patch('/api/items/lost/LST-123456')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Removed' });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed to update/i);
  });

  test('500 when the UPDATE throws', async () => {
    const token = makeToken(7);
    db.query
      .mockResolvedValueOnce([[itemRow({ user_id: 7, status: 'Posted' })]])
      .mockRejectedValueOnce(new Error('UPDATE failed'));

    const res = await request(app)
      .patch('/api/items/lost/LST-123456')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Removed' });

    expect(res.status).toBe(500);
  });
});