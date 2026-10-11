jest.mock('../db');

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../app');
const db = require('../db');

// Ensure JWT_SECRET is set for the login tests
beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-do-not-use-in-prod';
});

beforeEach(() => {
  db.query.mockReset();
});

/* ══════════════════════════════════════════════════════════════
   POST /api/auth/register
   ══════════════════════════════════════════════════════════════ */
describe('POST /api/auth/register', () => {
  test('400 when fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/all fields are required/i);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('400 when password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'a@b.com', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 8 characters/i);
  });

  test('409 when email already exists', async () => {
    // First SELECT finds an existing user
    db.query.mockResolvedValueOnce([[{ id: 1 }]]);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'a@b.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  test('201 on successful registration', async () => {
    // 1st query: SELECT finds no existing user
    db.query.mockResolvedValueOnce([[]]);
    // 2nd query: INSERT succeeds
    db.query.mockResolvedValueOnce([{ insertId: 42 }]);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'New User', email: 'new@b.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/registration successful/i);

    // Verify the INSERT was called with a bcrypt hash — not plaintext
    const insertParams = db.query.mock.calls[1][1];
    expect(insertParams[0]).toBe('New User');
    expect(insertParams[1]).toBe('new@b.com');
    expect(insertParams[2]).toMatch(/^\$2[aby]\$/);       // bcrypt hash format
    expect(insertParams[2]).not.toBe('password123');      // not plaintext
  });

  test('500 when the DB throws', async () => {
    db.query.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'a@b.com', password: 'password123' });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/something went wrong/i);
  });
});

/* ══════════════════════════════════════════════════════════════
   POST /api/auth/login
   ══════════════════════════════════════════════════════════════ */
describe('POST /api/auth/login', () => {
  test('400 when fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email and password are required/i);
  });

  test('401 when user does not exist', async () => {
    db.query.mockResolvedValueOnce([[]]); // no user found

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@b.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid email or password/i);
  });

  test('401 when password is wrong', async () => {
    // Pre-compute a hash for "correct-password"
    const hash = await bcrypt.hash('correct-password', 10);

    db.query.mockResolvedValueOnce([
      [
        {
          id: 1,
          name: 'Test',
          email: 'a@b.com',
          password_hash: hash,
          role: 'student',
        },
      ],
    ]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid email or password/i);
  });

  test('200 with token and user on valid credentials', async () => {
    const hash = await bcrypt.hash('correct-password', 10);

    db.query.mockResolvedValueOnce([
      [
        {
          id: 1,
          name: 'Test User',
          email: 'a@b.com',
          password_hash: hash,
          role: 'student',
        },
      ],
    ]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'correct-password' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/login successful/i);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toEqual({
      id: 1,
      name: 'Test User',
      email: 'a@b.com',
      role: 'student',
    });

    // The returned token must decode to the right user id and role
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.id).toBe(1);
    expect(decoded.role).toBe('student');
  });

  test('500 when the DB throws', async () => {
    db.query.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'password123' });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/something went wrong/i);
  });
});
