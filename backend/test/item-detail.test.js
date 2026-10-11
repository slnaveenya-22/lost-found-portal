jest.mock('../db');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const db = require('../db');

beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-do-not-use-in-prod';
});

beforeEach(() => {
  db.query.mockReset();
});

// Helper: create a valid JWT for a test user
function makeToken(id, role = 'student') {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// Helper: build a fake found-item row (includes all private fields)
function foundItemRow(overrides = {}) {
  return {
    id: 42,
    report_id: 'FND-123456',
    user_id: 7,
    category: 'Wallet',
    item_name: 'Found Wallet',
    color: 'Black',
    brand: 'Hidesign',
    location: 'Library',
    date_time: '2026-10-02T14:00:00',
    description: 'Found on a table',
    image_url: null,
    status: 'Posted',
    created_at: '2026-10-02T15:00:00',
    private_verification_detail: 'Has a photo of two dogs inside',
    pv_kind: 'Wallet',
    pv_inside: 'A photo of two dogs in the ID slot',
    pv_extra_detail: 'A small red sticker on the back',
    ...overrides,
  };
}

/* ══════════════════════════════════════════════════════════════
   GET /api/items/lost  +  /found  (list)
   ══════════════════════════════════════════════════════════════ */
describe('GET /api/items/lost — public list', () => {
  test('returns rows without requiring auth', async () => {
    db.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get('/api/items/lost');

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);

    const [sql] = db.query.mock.calls[0];
    expect(sql).toMatch(/FROM\s+lost_items/);
    expect(sql).toMatch(/status != 'Removed'/);
  });

  test('500 when the DB throws', async () => {
    db.query.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app).get('/api/items/lost');

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed to load items/i);
  });
});

describe('GET /api/items/found — public list', () => {
  test('returns rows without requiring auth', async () => {
    db.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get('/api/items/found');

    expect(res.status).toBe(200);

    const [sql] = db.query.mock.calls[0];
    expect(sql).toMatch(/FROM\s+found_items/);
  });
});

/* ══════════════════════════════════════════════════════════════
   GET /api/items/found?user_id=N  (list scoped to a user)
   ══════════════════════════════════════════════════════════════ */
describe('GET /api/items/found?user_id=N', () => {
  test('403 when guest asks for a specific user_id', async () => {
    const res = await request(app).get('/api/items/found?user_id=7');

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not allowed/i);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('403 when a different user asks for someone else', async () => {
    const otherToken = makeToken(99);

    const res = await request(app)
      .get('/api/items/found?user_id=7')
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('200 when the same user asks for their own reports', async () => {
    const token = makeToken(7);
    db.query.mockResolvedValueOnce([[foundItemRow()]]);

    const res = await request(app)
      .get('/api/items/found?user_id=7')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/WHERE\s+user_id = \?/);
    expect(params).toContain('7');

    // Scoped query should NOT add the Removed filter
    expect(sql).not.toMatch(/status != 'Removed'/);
  });

  test('200 when an admin asks for any user_id', async () => {
    const adminToken = makeToken(1, 'admin');
    db.query.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get('/api/items/found?user_id=7')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});

/* ══════════════════════════════════════════════════════════════
   GET /api/items/detail/:type/:reportId  — validation
   ══════════════════════════════════════════════════════════════ */
describe('GET /api/items/detail — validation', () => {
  test('400 when type is invalid', async () => {
    const res = await request(app).get('/api/items/detail/whatever/FND-123456');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type must be "lost" or "found"/i);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('404 when the item does not exist', async () => {
    db.query.mockResolvedValueOnce([[]]); // empty rows

    const res = await request(app).get('/api/items/detail/found/FND-999999');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test('500 when the DB throws', async () => {
    db.query.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app).get('/api/items/detail/found/FND-123456');

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed to load item/i);
  });
});

/* ══════════════════════════════════════════════════════════════
   GET /api/items/detail/found/:reportId  — pv_* stripping rules
   ══════════════════════════════════════════════════════════════ */
describe('GET /api/items/detail/found — private-field protection', () => {
  test('guest does NOT receive pv_* or private_verification_detail', async () => {
    db.query.mockResolvedValueOnce([[foundItemRow()]]);

    const res = await request(app).get('/api/items/detail/found/FND-123456');

    expect(res.status).toBe(200);
    expect(res.body.item.pv_kind).toBeUndefined();
    expect(res.body.item.pv_inside).toBeUndefined();
    expect(res.body.item.pv_extra_detail).toBeUndefined();
    expect(res.body.item.private_verification_detail).toBeUndefined();

    // Public fields are still present
    expect(res.body.item.item_name).toBe('Found Wallet');
    expect(res.body.item.status).toBe('Posted');
  });

  test('non-owner logged-in user does NOT receive pv_*', async () => {
    const otherToken = makeToken(99); // different user
    db.query.mockResolvedValueOnce([[foundItemRow()]]);

    const res = await request(app)
      .get('/api/items/detail/found/FND-123456')
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.item.pv_kind).toBeUndefined();
    expect(res.body.item.pv_inside).toBeUndefined();
    expect(res.body.item.pv_extra_detail).toBeUndefined();
  });

  test('owner DOES receive pv_* fields', async () => {
    const ownerToken = makeToken(7); // matches foundItemRow.user_id
    db.query.mockResolvedValueOnce([[foundItemRow()]]);

    const res = await request(app)
      .get('/api/items/detail/found/FND-123456')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.item.pv_kind).toBe('Wallet');
    expect(res.body.item.pv_inside).toBe('A photo of two dogs in the ID slot');
    expect(res.body.item.pv_extra_detail).toBe('A small red sticker on the back');
  });

  test('admin DOES receive pv_* fields', async () => {
    const adminToken = makeToken(1, 'admin');
    db.query.mockResolvedValueOnce([[foundItemRow()]]);

    const res = await request(app)
      .get('/api/items/detail/found/FND-123456')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.item.pv_kind).toBe('Wallet');
    expect(res.body.item.pv_inside).toBe('A photo of two dogs in the ID slot');
    expect(res.body.item.pv_extra_detail).toBe('A small red sticker on the back');
  });
});

/* ══════════════════════════════════════════════════════════════
   GET /api/items/detail/lost/:reportId — no pv_* fields on lost items
   ══════════════════════════════════════════════════════════════ */
describe('GET /api/items/detail/lost', () => {
  test('returns the lost item for any user', async () => {
    const lostRow = {
      id: 10,
      report_id: 'LST-654321',
      user_id: 5,
      category: 'Bag',
      item_name: 'Blue Backpack',
      color: 'Blue',
      brand: 'Wildcraft',
      location: 'Cafeteria',
      date_time: '2026-10-01T10:00:00',
      description: 'Contains books',
      image_url: null,
      status: 'Posted',
      created_at: '2026-10-01T11:00:00',
    };
    db.query.mockResolvedValueOnce([[lostRow]]);

    const res = await request(app).get('/api/items/detail/lost/LST-654321');

    expect(res.status).toBe(200);
    expect(res.body.item.item_name).toBe('Blue Backpack');
    expect(res.body.item.report_id).toBe('LST-654321');
    // Lost items never had pv_* fields, so nothing to strip
    expect(res.body.item.pv_kind).toBeUndefined();
  });

  test('guest can view a lost item', async () => {
    const lostRow = { id: 10, report_id: 'LST-654321', item_name: 'Test' };
    db.query.mockResolvedValueOnce([[lostRow]]);

    const res = await request(app).get('/api/items/detail/lost/LST-654321');

    expect(res.status).toBe(200);
  });
});

/* ══════════════════════════════════════════════════════════════
   The critical security invariant
   ══════════════════════════════════════════════════════════════ */
describe('SECURITY: pv_* fields must never leak to non-owners', () => {
  test('the response NEVER contains pv_* keys for a guest on a found item', async () => {
    db.query.mockResolvedValueOnce([[foundItemRow()]]);

    const res = await request(app).get('/api/items/detail/found/FND-123456');

    // Raw-string check — ensures even a "null" value doesn't sneak through
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/"pv_kind"/);
    expect(body).not.toMatch(/"pv_inside"/);
    expect(body).not.toMatch(/"pv_extra_detail"/);
    expect(body).not.toMatch(/"private_verification_detail"/);
  });

  test('the response NEVER contains pv_* keys for a non-owner on a found item', async () => {
    const otherToken = makeToken(99);
    db.query.mockResolvedValueOnce([[foundItemRow()]]);

    const res = await request(app)
      .get('/api/items/detail/found/FND-123456')
      .set('Authorization', `Bearer ${otherToken}`);

    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/"pv_kind"/);
    expect(body).not.toMatch(/"pv_inside"/);
    expect(body).not.toMatch(/"pv_extra_detail"/);
  });
});