jest.mock('../db');   // mock the DB module so no real queries run

const db = require('../db');
const {
  isUselessAnswer,
  CATEGORIES,
  generateQuestionsFor,
} = require('../quizGenerator');

/* ══════════════════════════════════════════════════════════════
   isUselessAnswer
   ══════════════════════════════════════════════════════════════ */
describe('isUselessAnswer', () => {
  test('returns true for the useless-answers blocklist', () => {
    expect(isUselessAnswer('nothing')).toBe(true);
    expect(isUselessAnswer('none')).toBe(true);
    expect(isUselessAnswer('N/A')).toBe(true);
    expect(isUselessAnswer('idk')).toBe(true);
    expect(isUselessAnswer('empty')).toBe(true);
    expect(isUselessAnswer('-')).toBe(true);
  });

  test('is case-insensitive', () => {
    expect(isUselessAnswer('NOTHING')).toBe(true);
    expect(isUselessAnswer('Nothing')).toBe(true);
    expect(isUselessAnswer('NoThInG')).toBe(true);
  });

  test('trims whitespace before checking', () => {
    expect(isUselessAnswer('   nothing   ')).toBe(true);
    expect(isUselessAnswer('\tnone\n')).toBe(true);
  });

  test('returns true for empty, null, or undefined', () => {
    expect(isUselessAnswer('')).toBe(true);
    expect(isUselessAnswer(null)).toBe(true);
    expect(isUselessAnswer(undefined)).toBe(true);
  });

  test('returns false for real answers', () => {
    expect(isUselessAnswer('A photo of two dogs')).toBe(false);
    expect(isUselessAnswer('A red sticker on the back')).toBe(false);
    expect(isUselessAnswer('Zipper is broken')).toBe(false);
  });

  test('does not match partial words', () => {
    // "none" is useless, but "non-empty" should NOT be caught
    expect(isUselessAnswer('non-empty envelope')).toBe(false);
    // "unknown" is useless, but "unknown brand logo" should NOT be caught
    expect(isUselessAnswer('unknown brand logo')).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════
   CATEGORIES constant
   ══════════════════════════════════════════════════════════════ */
describe('CATEGORIES', () => {
  test('is an array with at least 8 entries', () => {
    expect(Array.isArray(CATEGORIES)).toBe(true);
    expect(CATEGORIES.length).toBeGreaterThanOrEqual(8);
  });

  test('contains "Wallet" and "Other"', () => {
    expect(CATEGORIES).toContain('Wallet');
    expect(CATEGORIES).toContain('Other');
  });

  test('has no duplicates', () => {
    expect(new Set(CATEGORIES).size).toBe(CATEGORIES.length);
  });
});

/* ══════════════════════════════════════════════════════════════
   generateQuestionsFor — the async, DB-touching function
   ══════════════════════════════════════════════════════════════ */
describe('generateQuestionsFor', () => {
  // Clear mock state before each test
  beforeEach(() => {
    db.query.mockReset();
  });

  test('returns { created: 0 } when called without an id', async () => {
    const result = await generateQuestionsFor(null);
    expect(result.created).toBe(0);
    // Did not touch the DB
    expect(db.query).not.toHaveBeenCalled();
  });

  test('returns { created: 0 } when the item is not found', async () => {
    db.query.mockResolvedValueOnce([[]]); // empty rows
    const result = await generateQuestionsFor(999);
    expect(result.created).toBe(0);
  });

  test('skips generation when pv_inside is a useless answer', async () => {
    db.query.mockResolvedValueOnce([
      [
        {
          id: 1,
          pv_kind: 'Wallet',
          pv_inside: 'nothing',   // ← useless
          pv_extra_detail: 'A small red sticker on the back',
        },
      ],
    ]);

    const result = await generateQuestionsFor(1);
    expect(result.created).toBe(0);
    // Only one call: the SELECT. No INSERTs.
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  test('skips generation when pv_kind is missing', async () => {
    db.query.mockResolvedValueOnce([
      [
        {
          id: 1,
          pv_kind: null,       // ← missing
          pv_inside: 'A photo of two dogs',
          pv_extra_detail: 'A red sticker',
        },
      ],
    ]);

    const result = await generateQuestionsFor(1);
    expect(result.created).toBe(0);
  });

  test('inserts 3 questions for a valid item', async () => {
    // 1st call = SELECT item; 2nd-4th calls = INSERT × 3
    db.query
      .mockResolvedValueOnce([
        [
          {
            id: 1,
            pv_kind: 'Wallet',
            pv_inside: 'A photo of two dogs in the ID slot',
            pv_extra_detail: 'A small red sticker on the back',
          },
        ],
      ])
      .mockResolvedValueOnce([{ insertId: 10 }])
      .mockResolvedValueOnce([{ insertId: 11 }])
      .mockResolvedValueOnce([{ insertId: 12 }]);

    const result = await generateQuestionsFor(1);

    expect(result.created).toBe(3);
    expect(db.query).toHaveBeenCalledTimes(4); // 1 SELECT + 3 INSERTs
  });

  test('the 3 INSERTs use the correct correct_option values', async () => {
    db.query
      .mockResolvedValueOnce([
        [
          {
            id: 1,
            pv_kind: 'Wallet',
            pv_inside: 'A photo of two dogs',
            pv_extra_detail: 'A red sticker on the back',
          },
        ],
      ])
      .mockResolvedValueOnce([{ insertId: 10 }])
      .mockResolvedValueOnce([{ insertId: 11 }])
      .mockResolvedValueOnce([{ insertId: 12 }]);

    await generateQuestionsFor(1);

    // Calls at index 1, 2, 3 are the INSERTs
    const insert1Params = db.query.mock.calls[1][1];
    const insert2Params = db.query.mock.calls[2][1];
    const insert3Params = db.query.mock.calls[3][1];

    // Params layout: [foundItemId, questionText, correct, wrong1, wrong2, wrong3, order]
    expect(insert1Params[2]).toBe('Wallet');
    expect(insert2Params[2]).toBe('A photo of two dogs');
    expect(insert3Params[2]).toBe('A red sticker on the back');
  });

  test('each INSERT has 3 wrong options that differ from the correct one', async () => {
    db.query
      .mockResolvedValueOnce([
        [
          {
            id: 1,
            pv_kind: 'Wallet',
            pv_inside: 'A photo of two dogs',
            pv_extra_detail: 'A red sticker on the back',
          },
        ],
      ])
      .mockResolvedValueOnce([{ insertId: 10 }])
      .mockResolvedValueOnce([{ insertId: 11 }])
      .mockResolvedValueOnce([{ insertId: 12 }]);

    await generateQuestionsFor(1);

    // Check each INSERT
    for (let i = 1; i <= 3; i++) {
      const params = db.query.mock.calls[i][1];
      const correct = params[2];
      const wrong1 = params[3];
      const wrong2 = params[4];
      const wrong3 = params[5];

      // 3 wrongs present
      expect(wrong1).toBeDefined();
      expect(wrong2).toBeDefined();
      expect(wrong3).toBeDefined();

      // None equals the correct option
      expect(wrong1).not.toBe(correct);
      expect(wrong2).not.toBe(correct);
      expect(wrong3).not.toBe(correct);

      // All three wrongs are distinct
      expect(new Set([wrong1, wrong2, wrong3]).size).toBe(3);
    }
  });

  test('does not crash if one INSERT fails mid-loop', async () => {
    db.query
      .mockResolvedValueOnce([
        [
          {
            id: 1,
            pv_kind: 'Wallet',
            pv_inside: 'A photo of two dogs',
            pv_extra_detail: 'A red sticker',
          },
        ],
      ])
      .mockResolvedValueOnce([{ insertId: 10 }])       // INSERT 1 OK
      .mockRejectedValueOnce(new Error('db down'))     // INSERT 2 fails
      .mockResolvedValueOnce([{ insertId: 12 }]);      // INSERT 3 OK

    const result = await generateQuestionsFor(1);

    // 2 succeeded, 1 failed — function returns count of successes
    expect(result.created).toBe(2);
  });
});