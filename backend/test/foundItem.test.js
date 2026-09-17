const request = require('supertest');

jest.mock('../db', () => ({
  query: jest.fn(),
}));

const db = require('../db');
const app = require('../app');

describe('POST /api/items/found', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('reports a found item successfully (no image)', async () => {
    db.query.mockResolvedValueOnce([{ insertId: 1 }]);

    const res = await request(app)
      .post('/api/items/found')
      .field('user_id', '1')
      .field('category', 'Electronics')
      .field('item_name', 'Blue Water Bottle')
      .field('color', 'Blue')
      .field('brand', 'Milton')
      .field('location', 'Library')
      .field('date_time', '2026-09-10 10:00')
      .field('description', 'Found near the entrance')
      .field('private_verification_detail', 'Has a small dent on the cap');

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('reportId');
    expect(res.body.reportId).toMatch(/^FND-\d{6}$/);
  });

  test('reports a found item successfully (with image)', async () => {
    db.query.mockResolvedValueOnce([{ insertId: 2 }]);

    const res = await request(app)
      .post('/api/items/found')
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
      .post('/api/items/found')
      .field('user_id', '1')
      .field('category', 'Electronics');
      // missing item_name, location, date_time

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(db.query).not.toHaveBeenCalled();
  });

  test('passes the private verification detail through to the database insert', async () => {
    db.query.mockResolvedValueOnce([{ insertId: 3 }]);

    await request(app)
      .post('/api/items/found')
      .field('user_id', '1')
      .field('category', 'Electronics')
      .field('item_name', 'Blue Water Bottle')
      .field('location', 'Library')
      .field('date_time', '2026-09-10 10:00')
      .field('private_verification_detail', 'Has a small dent on the cap');

    // Check the second argument (the values array) passed to db.query
    const valuesPassedToQuery = db.query.mock.calls[0][1];
    expect(valuesPassedToQuery).toContain('Has a small dent on the cap');
  });
});