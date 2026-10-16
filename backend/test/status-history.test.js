const request = require('supertest');
jest.mock('../db', () => ({ query: jest.fn() }));
const db = require('../db');
const app = require('../app');

describe('GET /api/items/:type/:reportId/history', () => {
  beforeEach(() => jest.clearAllMocks());

  it('400 for invalid type', async () => {
    const res = await request(app).get('/api/items/xyz/LST-123/history');
    expect(res.status).toBe(400);
  });

  it('404 when the item does not exist', async () => {
    db.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/items/lost/LST-999/history');
    expect(res.status).toBe(404);
  });

  it('returns history rows for a lost item', async () => {
    db.query.mockResolvedValueOnce([
      [
        {
          id: 1,
          user_id: 7,
          status: 'Matched',
          created_at: '2026-10-10T10:00:00Z',
        },
      ],
    ]);
    db.query.mockResolvedValueOnce([
      [
        {
          id: 5,
          old_status: 'Posted',
          new_status: 'Matched',
          actor_role: 'system',
          changed_at: '2026-10-11T10:00:00Z',
        },
      ],
    ]);
    const res = await request(app).get('/api/items/lost/LST-123/history');
    expect(res.status).toBe(200);
    // Real row first, synthetic "Reported" row appended
    expect(res.body.history).toHaveLength(2);
    expect(res.body.history[0].new_status).toBe('Matched');
    expect(res.body.history[1].synthetic).toBe(true);
  });

  it('adds a synthetic Reported row when no creation history exists', async () => {
    db.query.mockResolvedValueOnce([
      [
        {
          id: 1,
          user_id: 7,
          status: 'Posted',
          created_at: '2026-10-10T10:00:00Z',
        },
      ],
    ]);
    db.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/items/lost/LST-123/history');
    expect(res.status).toBe(200);
    expect(res.body.history).toHaveLength(1);
    expect(res.body.history[0].synthetic).toBe(true);
    expect(res.body.history[0].new_status).toBe('Posted');
  });

  it('does not duplicate if a real creation row exists', async () => {
    db.query.mockResolvedValueOnce([
      [
        {
          id: 1,
          user_id: 7,
          status: 'Posted',
          created_at: '2026-10-10T10:00:00Z',
        },
      ],
    ]);
    db.query.mockResolvedValueOnce([
      [
        {
          id: 5,
          old_status: null,
          new_status: 'Posted',
          actor_role: 'student',
          changed_at: '2026-10-10T10:00:00Z',
        },
      ],
    ]);
    const res = await request(app).get('/api/items/lost/LST-123/history');
    expect(res.status).toBe(200);
    expect(res.body.history).toHaveLength(1);
    expect(res.body.history[0].new_status).toBe('Posted');
    expect(res.body.history[0].synthetic).toBeUndefined();
  });

  it('works for found items too', async () => {
    db.query.mockResolvedValueOnce([
      [
        {
          id: 2,
          user_id: 7,
          status: 'Returned',
          created_at: '2026-10-12T10:00:00Z',
        },
      ],
    ]);
    db.query.mockResolvedValueOnce([
      [
        {
          id: 6,
          old_status: 'Posted',
          new_status: 'Returned',
          actor_role: 'admin',
          changed_at: '2026-10-15T10:00:00Z',
        },
      ],
    ]);
    const res = await request(app).get('/api/items/found/FND-456/history');
    expect(res.status).toBe(200);
    // Real row first, synthetic "Reported" row appended
    expect(res.body.history).toHaveLength(2);
    expect(res.body.history[0].new_status).toBe('Returned');
    expect(res.body.history[0].actor_role).toBe('admin');
    expect(res.body.history[1].synthetic).toBe(true);
  });

  it('500 when DB throws', async () => {
    // Use mockRejectedValue (no "Once") so BOTH queries reject
    db.query.mockRejectedValue(new Error('DB down'));
    const res = await request(app).get('/api/items/lost/LST-123/history');
    expect(res.status).toBe(500);
  });
});