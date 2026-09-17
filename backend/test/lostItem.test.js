const request = require('supertest');

// Mock the database, same pattern as the login test
jest.mock('../db', () => ({
  query: jest.fn(),
}));

const db = require('../db');
const app = require('../app');

describe('POST /api/items/lost', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('reports a lost item successfully (no image)', async () => {
    // Tell the fake db: "pretend the insert succeeded"
    db.query.mockResolvedValueOnce([{ insertId: 1 }]);

    const res = await request(app)
      .post('/api/items/lost')
      .field('user_id', '1')
      .field('category', 'Electronics')
      .field('item_name', 'Blue Water Bottle')
      .field('color', 'Blue')
      .field('brand', 'Milton')
      .field('location', 'Library')
      .field('date_time', '2026-09-10 10:00')
      .field('description', 'Lost near the entrance');

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('reportId');
    expect(res.body.reportId).toMatch(/^LST-\d{6}$/);
  });

  test('reports a lost item successfully (with image)', async () => {
    db.query.mockResolvedValueOnce([{ insertId: 2 }]);

    const res = await request(app)
      .post('/api/items/lost')
      .field('user_id', '1')
      .field('category', 'Electronics')
      .field('item_name', 'Blue Water Bottle')
      .field('location', 'Library')
      .field('date_time', '2026-09-10 10:00')
      .attach('image', Buffer.from('fake-image-content'), 'test.jpg');

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('reportId');
  });

  test('fails when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/items/lost')
      .field('user_id', '1')
      .field('category', 'Electronics');
      // missing item_name, location, date_time

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
    // db.query should never have been called, since validation fails first
    expect(db.query).not.toHaveBeenCalled();
  });
});