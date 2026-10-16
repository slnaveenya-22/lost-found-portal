const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../db', () => ({
  query: jest.fn(),
}));

const db = require('../db');
const app = require('../app');

function makeToken(id, role = 'admin') {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

describe('GET /api/admin/claims — quiz answers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/admin/claims');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    const token = makeToken(7, 'student');
    const res = await request(app)
      .get('/api/admin/claims')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('returns quiz questions and answers per claim', async () => {
    // First query: claims
    db.query.mockResolvedValueOnce([
      [
        {
          id: 10,
          found_item_id: 4,
          claimant_id: 5,
          status: 'Pending',
          quiz_passed: 1,
          quiz_attempts: 1,
          created_at: '2026-10-15T10:00:00.000Z',
          reviewed_by: null,
          rejection_reason: null,
          match_id: null,
          proof_text: null,
          item_report_id: 'FND-111111',
          item_name: 'Found wallet',
          item_location: 'Library',
          item_image_url: null,
          claimant_name: 'Alice',
          claimant_email: 'alice@example.com',
          reviewer_name: null,
        },
      ],
    ]);

    // Second query: questions + answers
    db.query.mockResolvedValueOnce([
      [
        {
          claim_id: 10,
          selected_option: 'Wallet',
          is_correct: 1,
          question_id: 100,
          question_text: 'What kind of item is this?',
          correct_option: 'Wallet',
          wrong_option_1: 'Bag',
          wrong_option_2: 'Books',
          wrong_option_3: 'Keys',
          display_order: 1,
        },
        {
          claim_id: 10,
          selected_option: 'A receipt',
          is_correct: 0,
          question_id: 101,
          question_text: 'What was inside?',
          correct_option: 'A photo of two dogs',
          wrong_option_1: 'A receipt',
          wrong_option_2: 'A business card',
          wrong_option_3: 'Nothing',
          display_order: 2,
        },
      ],
    ]);

    const token = makeToken(1, 'admin');
    const res = await request(app)
      .get('/api/admin/claims')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].questions).toHaveLength(2);

    const q1 = res.body.items[0].questions[0];
    expect(q1.question_text).toBe('What kind of item is this?');
    expect(q1.claimant_selected).toBe('Wallet');
    expect(q1.correct_option).toBe('Wallet');
    expect(q1.is_correct).toBe(true);

    const q2 = res.body.items[0].questions[1];
    expect(q2.claimant_selected).toBe('A receipt');
    expect(q2.correct_option).toBe('A photo of two dogs');
    expect(q2.is_correct).toBe(false);
  });

  it('returns empty questions array for legacy claims', async () => {
    db.query.mockResolvedValueOnce([
      [
        {
          id: 11,
          found_item_id: 5,
          claimant_id: 6,
          status: 'Pending',
          quiz_passed: 0,
          quiz_attempts: 0,
          created_at: '2026-10-15T10:00:00.000Z',
          reviewed_by: null,
          rejection_reason: null,
          match_id: null,
          proof_text: null,
          item_report_id: 'FND-222222',
          item_name: 'Legacy item',
          item_location: 'Cafeteria',
          item_image_url: null,
          claimant_name: 'Bob',
          claimant_email: 'bob@example.com',
          reviewer_name: null,
        },
      ],
    ]);

    db.query.mockResolvedValueOnce([[]]); // no answers

    const token = makeToken(1, 'admin');
    const res = await request(app)
      .get('/api/admin/claims')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items[0].questions).toEqual([]);
  });

  it('includes answers for auto-rejected claims (audit trail)', async () => {
    db.query.mockResolvedValueOnce([
      [
        {
          id: 12,
          status: 'Rejected',
          quiz_passed: 0,
          quiz_attempts: 1,
          rejection_reason: 'Failed verification quiz',
          // ... other fields abbreviated for brevity
          claimant_name: 'Carol',
          claimant_email: 'carol@example.com',
          item_name: 'Found keys',
          item_report_id: 'FND-333333',
        },
      ],
    ]);

    db.query.mockResolvedValueOnce([
      [
        {
          claim_id: 12,
          selected_option: 'Wrong',
          is_correct: 0,
          question_id: 102,
          question_text: 'What kind?',
          correct_option: 'Keys',
          wrong_option_1: 'Wrong',
          wrong_option_2: 'Wrong2',
          wrong_option_3: 'Wrong3',
          display_order: 1,
        },
      ],
    ]);

    const token = makeToken(1, 'admin');
    const res = await request(app)
      .get('/api/admin/claims')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items[0].questions).toHaveLength(1);
    expect(res.body.items[0].questions[0].is_correct).toBe(false);
  });

  it('returns empty items array when no claims exist', async () => {
    db.query.mockResolvedValueOnce([[]]);

    const token = makeToken(1, 'admin');
    const res = await request(app)
      .get('/api/admin/claims')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    // Only ONE query should fire when there are no claims
    expect(db.query).toHaveBeenCalledTimes(1);
  });
});