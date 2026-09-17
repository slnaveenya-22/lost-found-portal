const request = require('supertest');
const bcrypt = require('bcryptjs');

// Tell Jest: replace the real db.js with a fake one we control
jest.mock('../db', () => ({
  query: jest.fn(),
}));

const db = require('../db');
const app = require('../app');

describe('POST /api/auth/login', () => {
  const testEmail = 'jest.login.test@example.com';
  const testPassword = 'password123';
  let hashedPassword;

  beforeAll(async () => {
    // Pre-compute a real bcrypt hash, so the fake "user" looks realistic
    hashedPassword = await bcrypt.hash(testPassword, 10);
  });

  afterEach(() => {
    // Clear any fake return values so tests don't leak into each other
    jest.clearAllMocks();
  });

  test('logs in successfully with correct credentials', async () => {
    // Tell the fake db: "when queried, pretend you found this user"
    db.query.mockResolvedValueOnce([
      [{ id: 1, name: 'Test User', email: testEmail, password_hash: hashedPassword, role: 'user' }],
    ]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(testEmail);
  });

  test('fails with wrong password', async () => {
    db.query.mockResolvedValueOnce([
      [{ id: 1, name: 'Test User', email: testEmail, password_hash: hashedPassword, role: 'user' }],
    ]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'wrongpassword' });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('fails when email does not exist', async () => {
    // Tell the fake db: "pretend no user was found"
    db.query.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: testPassword });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });
});