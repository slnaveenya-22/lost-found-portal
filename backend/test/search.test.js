jest.mock('../db');

const request = require('supertest');
const app = require('../app');
const db = require('../db');

beforeEach(() => {
  db.query.mockReset();
});

/* ══════════════════════════════════════════════════════════════
   Validation
   ══════════════════════════════════════════════════════════════ */
describe('GET /api/items/search — validation', () => {
  test('400 when type is missing', async () => {
    const res = await request(app).get('/api/items/search');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type must be "lost" or "found"/i);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('400 when type is an invalid string', async () => {
    const res = await request(app).get('/api/items/search?type=whatever');
    expect(res.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
});

/* ══════════════════════════════════════════════════════════════
   Basic queries — lost and found
   ══════════════════════════════════════════════════════════════ */
describe('GET /api/items/search — basic', () => {
  test('queries the lost_items table when type=lost', async () => {
    db.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get('/api/items/search?type=lost');

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);

    const [sql] = db.query.mock.calls[0];
    expect(sql).toMatch(/FROM\s+lost_items/);
    // The "Removed" exclusion is inlined in the SQL, not a bound parameter
    expect(sql).toMatch(/status != 'Removed'/);
  });

  test('queries the found_items table when type=found', async () => {
    db.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get('/api/items/search?type=found');

    expect(res.status).toBe(200);

    const [sql] = db.query.mock.calls[0];
    expect(sql).toMatch(/FROM\s+found_items/);
  });

  test('returns the rows from the DB as-is', async () => {
    const fakeRows = [
      { id: 1, report_id: 'LST-111111', item_name: 'Wallet' },
      { id: 2, report_id: 'LST-222222', item_name: 'Bag' },
    ];
    db.query.mockResolvedValueOnce([fakeRows]);

    const res = await request(app).get('/api/items/search?type=lost');

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual(fakeRows);
  });

  test('500 when the DB throws', async () => {
    db.query.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app).get('/api/items/search?type=lost');

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/search failed/i);
  });
});

/* ══════════════════════════════════════════════════════════════
   Keyword filter (q)
   ══════════════════════════════════════════════════════════════ */
describe('GET /api/items/search — keyword q', () => {
  test('adds a 5-column LIKE clause when q is provided', async () => {
    db.query.mockResolvedValueOnce([[]]);

    await request(app).get('/api/items/search?type=lost&q=wallet');

    const [sql, params] = db.query.mock.calls[0];

    expect(sql).toMatch(/item_name LIKE \?/);
    expect(sql).toMatch(/brand LIKE \?/);
    expect(sql).toMatch(/color LIKE \?/);
    expect(sql).toMatch(/location LIKE \?/);
    expect(sql).toMatch(/description LIKE \?/);

    // 5 LIKE params, all containing "wallet"
    const likeParams = params.filter(
      (p) => typeof p === 'string' && p.startsWith('%') && p.endsWith('%')
    );
    expect(likeParams.length).toBe(5);
    likeParams.forEach((p) => expect(p).toBe('%wallet%'));
  });

  test('does not add a LIKE clause when q is missing', async () => {
    db.query.mockResolvedValueOnce([[]]);

    await request(app).get('/api/items/search?type=lost');

    const [sql] = db.query.mock.calls[0];
    expect(sql).not.toMatch(/LIKE \?/);
  });

  test('ignores q when it is only whitespace', async () => {
    db.query.mockResolvedValueOnce([[]]);

    await request(app).get('/api/items/search?type=lost&q=%20%20%20');

    const [sql] = db.query.mock.calls[0];
    expect(sql).not.toMatch(/LIKE \?/);
  });
});

/* ══════════════════════════════════════════════════════════════
   Category filter
   ══════════════════════════════════════════════════════════════ */
describe('GET /api/items/search — category', () => {
  test('adds category = ? when category is provided', async () => {
    db.query.mockResolvedValueOnce([[]]);

    await request(app).get('/api/items/search?type=lost&category=Wallet');

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/category = \?/);
    expect(params).toContain('Wallet');
  });

  test('does not add category clause when omitted', async () => {
    db.query.mockResolvedValueOnce([[]]);

    await request(app).get('/api/items/search?type=lost');

    const [sql] = db.query.mock.calls[0];
    expect(sql).not.toMatch(/category = \?/);
  });
});

/* ══════════════════════════════════════════════════════════════
   Days filter
   ══════════════════════════════════════════════════════════════ */
describe('GET /api/items/search — days', () => {
  test('adds DATE_SUB when days is a positive integer', async () => {
    db.query.mockResolvedValueOnce([[]]);

    await request(app).get('/api/items/search?type=lost&days=7');

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/DATE_SUB\(NOW\(\), INTERVAL \? DAY\)/);
    expect(params).toContain(7);
  });

  test('ignores days when it is not a number', async () => {
    db.query.mockResolvedValueOnce([[]]);

    await request(app).get('/api/items/search?type=lost&days=abc');

    const [sql] = db.query.mock.calls[0];
    expect(sql).not.toMatch(/DATE_SUB/);
  });

  test('ignores days when it is zero or negative', async () => {
    db.query.mockResolvedValueOnce([[]]);

    await request(app).get('/api/items/search?type=lost&days=0');

    const [sql] = db.query.mock.calls[0];
    expect(sql).not.toMatch(/DATE_SUB/);
  });

  test('ignores days when omitted', async () => {
    db.query.mockResolvedValueOnce([[]]);

    await request(app).get('/api/items/search?type=lost');

    const [sql] = db.query.mock.calls[0];
    expect(sql).not.toMatch(/DATE_SUB/);
  });
});

/* ══════════════════════════════════════════════════════════════
   Sort param
   ══════════════════════════════════════════════════════════════ */
describe('GET /api/items/search — sort', () => {
  test('defaults to created_at DESC when sort is omitted', async () => {
    db.query.mockResolvedValueOnce([[]]);

    await request(app).get('/api/items/search?type=lost');

    const [sql] = db.query.mock.calls[0];
    expect(sql).toMatch(/ORDER BY created_at DESC/);
  });

  test('sort=oldest → created_at ASC', async () => {
    db.query.mockResolvedValueOnce([[]]);

    await request(app).get('/api/items/search?type=lost&sort=oldest');

    const [sql] = db.query.mock.calls[0];
    expect(sql).toMatch(/ORDER BY created_at ASC/);
  });

  test('sort=name → item_name ASC', async () => {
    db.query.mockResolvedValueOnce([[]]);

    await request(app).get('/api/items/search?type=lost&sort=name');

    const [sql] = db.query.mock.calls[0];
    expect(sql).toMatch(/ORDER BY item_name ASC/);
  });

  test('unknown sort falls back to created_at DESC', async () => {
    db.query.mockResolvedValueOnce([[]]);

    await request(app).get('/api/items/search?type=lost&sort=whatever');

    const [sql] = db.query.mock.calls[0];
    expect(sql).toMatch(/ORDER BY created_at DESC/);
  });
});

/* ══════════════════════════════════════════════════════════════
   Composition — multiple filters together
   ══════════════════════════════════════════════════════════════ */
describe('GET /api/items/search — combined filters', () => {
  test('applies q + category + days + status filter together', async () => {
    db.query.mockResolvedValueOnce([[]]);

    await request(app).get(
      '/api/items/search?type=lost&q=wallet&category=Wallet&days=30&sort=name'
    );

    const [sql, params] = db.query.mock.calls[0];

    // All clauses present
    expect(sql).toMatch(/item_name LIKE \?/);
    expect(sql).toMatch(/category = \?/);
    expect(sql).toMatch(/DATE_SUB\(NOW\(\), INTERVAL \? DAY\)/);
    expect(sql).toMatch(/status != 'Removed'/);
    expect(sql).toMatch(/ORDER BY item_name ASC/);

    // Bound params include the like (x5), category, days — but not "Removed"
    expect(params).toContain('Wallet');
    expect(params).toContain(30);

    // Always LIMIT 200
    expect(sql).toMatch(/LIMIT 200/);
  });

  test('only Removed filter is applied when no optional params given', async () => {
    db.query.mockResolvedValueOnce([[]]);

    await request(app).get('/api/items/search?type=found');

    const [sql, params] = db.query.mock.calls[0];

    expect(sql).toMatch(/status != 'Removed'/);
    expect(params).toEqual([]); // no bound params when only status filter applies
    expect(sql).not.toMatch(/LIKE \?/);
    expect(sql).not.toMatch(/category = \?/);
    expect(sql).not.toMatch(/DATE_SUB/);
  });
});