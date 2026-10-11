jest.mock('../db');
jest.mock('../matchingEngine', () => ({
  findMatchesFor: jest.fn().mockResolvedValue({ created: 0 }),
}));
jest.mock('../quizGenerator', () => ({
  generateQuestionsFor: jest.fn().mockResolvedValue({ created: 3 }),
  isUselessAnswer: jest.requireActual('../quizGenerator').isUselessAnswer,
}));

const request = require('supertest');
const app = require('../app');
const db = require('../db');
const { findMatchesFor } = require('../matchingEngine');
const { generateQuestionsFor } = require('../quizGenerator');

beforeEach(() => {
  db.query.mockReset();
  findMatchesFor.mockClear();
  generateQuestionsFor.mockClear();
});

/* ══════════════════════════════════════════════════════════════
   POST /api/items/lost
   ══════════════════════════════════════════════════════════════ */
describe('POST /api/items/lost', () => {
  test('400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/items/lost')
      .field('user_id', '1')
      .field('category', 'Wallet');
    // item_name, location, date_time are missing

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required fields/i);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('201 on successful insert with no image', async () => {
    // Mock the INSERT response
    db.query.mockResolvedValueOnce([{ insertId: 42 }]);

    const res = await request(app)
      .post('/api/items/lost')
      .field('user_id', '1')
      .field('category', 'Wallet')
      .field('item_name', 'Black Wallet')
      .field('color', 'Black')
      .field('brand', 'Hidesign')
      .field('location', 'Library')
      .field('date_time', '2026-10-01T10:00')
      .field('description', 'Small leather wallet');

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/lost item reported successfully/i);
    expect(res.body.reportId).toMatch(/^LST-\d{6}$/);

    // Verify the INSERT params
    expect(db.query).toHaveBeenCalledTimes(1);
    const params = db.query.mock.calls[0][1];
    expect(params[0]).toMatch(/^LST-\d{6}$/); // report_id
    expect(params[1]).toBe('1');              // user_id (comes through as string via form)
    expect(params[2]).toBe('Wallet');         // category
    expect(params[3]).toBe('Black Wallet');   // item_name
    expect(params[4]).toBe('Black');          // color
    expect(params[5]).toBe('Hidesign');       // brand
    expect(params[6]).toBe('Library');        // location
    expect(params[9]).toBeNull();             // image_url (no file)
  });

  test('500 when the DB throws', async () => {
    db.query.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app)
      .post('/api/items/lost')
      .field('user_id', '1')
      .field('category', 'Wallet')
      .field('item_name', 'Black Wallet')
      .field('location', 'Library')
      .field('date_time', '2026-10-01T10:00');

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/something went wrong/i);
  });

  test('the background matching task is invoked after insert', async () => {
    db.query.mockResolvedValueOnce([{ insertId: 42 }]);

    await request(app)
      .post('/api/items/lost')
      .field('user_id', '1')
      .field('category', 'Wallet')
      .field('item_name', 'Test')
      .field('location', 'Library')
      .field('date_time', '2026-10-01T10:00');

    // setImmediate runs on the next tick — wait for the pending macrotask
    await new Promise((resolve) => setImmediate(resolve));

    expect(findMatchesFor).toHaveBeenCalledWith(42, 'lost');
  });
});

/* ══════════════════════════════════════════════════════════════
   POST /api/items/found
   ══════════════════════════════════════════════════════════════ */
describe('POST /api/items/found', () => {
  // Reusable valid body for the found-item route
  function validFields() {
    return {
      user_id: '1',
      category: 'Wallet',
      item_name: 'Found Wallet',
      color: 'Black',
      brand: 'Hidesign',
      location: 'Library',
      date_time: '2026-10-02T14:00',
      description: 'Found on a table',
      pv_kind: 'Wallet',
      pv_inside: 'A photo of two dogs in the ID slot',
      pv_extra_detail: 'A small red sticker on the back',
    };
  }

  function postFound(fields, overrides = {}) {
    const f = { ...fields, ...overrides };
    let req = request(app).post('/api/items/found');
    for (const [k, v] of Object.entries(f)) {
      if (v !== undefined) req = req.field(k, v);
    }
    return req;
  }

  test('400 when common required fields are missing', async () => {
    const res = await postFound({
      user_id: '1',
      category: 'Wallet',
      // item_name, location, date_time missing
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required fields/i);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('400 when pv_* fields are missing', async () => {
    const res = await postFound({
      user_id: '1',
      category: 'Wallet',
      item_name: 'Found Wallet',
      location: 'Library',
      date_time: '2026-10-02T14:00',
      // pv_* fields missing
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/private verification fields are required/i);
  });

  test('400 when pv_inside is too short', async () => {
    const res = await postFound(validFields(), { pv_inside: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/inside or attached/i);
  });

  test('400 when pv_extra_detail is too short', async () => {
    const res = await postFound(validFields(), { pv_extra_detail: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/distinctive detail/i);
  });

  test('400 when pv_inside is a useless answer', async () => {
    const res = await postFound(validFields(), { pv_inside: 'nothing' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/specific answers/i);
  });

  test('201 on successful insert with all pv_* fields', async () => {
    db.query.mockResolvedValueOnce([{ insertId: 99 }]);

    const res = await postFound(validFields());

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/found item reported successfully/i);
    expect(res.body.reportId).toMatch(/^FND-\d{6}$/);

    // Verify INSERT params — 14 columns
    expect(db.query).toHaveBeenCalledTimes(1);
    const params = db.query.mock.calls[0][1];
    expect(params[0]).toMatch(/^FND-\d{6}$/);       // report_id
    expect(params[1]).toBe('1');                    // user_id
    expect(params[2]).toBe('Wallet');               // category
    expect(params[3]).toBe('Found Wallet');         // item_name
    expect(params[9]).toBeNull();                   // image_url (no file)
    expect(params[11]).toBe('Wallet');              // pv_kind
    expect(params[12]).toBe('A photo of two dogs in the ID slot'); // pv_inside
    expect(params[13]).toBe('A small red sticker on the back');    // pv_extra_detail
  });

  test('500 when the DB throws', async () => {
    db.query.mockRejectedValueOnce(new Error('DB down'));

    const res = await postFound(validFields());

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/something went wrong/i);
  });

  test('the background quiz + matching tasks are invoked after insert', async () => {
    db.query.mockResolvedValueOnce([{ insertId: 99 }]);

    await postFound(validFields());
    await new Promise((resolve) => setImmediate(resolve));

    expect(generateQuestionsFor).toHaveBeenCalledWith(99);
    expect(findMatchesFor).toHaveBeenCalledWith(99, 'found');
  });

  test('trims pv_* fields before insert', async () => {
    db.query.mockResolvedValueOnce([{ insertId: 99 }]);

    const res = await postFound(validFields(), {
      pv_kind: '  Wallet  ',
      pv_inside: '   A photo of two dogs in the ID slot   ',
      pv_extra_detail: '   A small red sticker on the back   ',
    });

    expect(res.status).toBe(201);

    const params = db.query.mock.calls[0][1];
    expect(params[11]).toBe('Wallet');
    expect(params[12]).toBe('A photo of two dogs in the ID slot');
    expect(params[13]).toBe('A small red sticker on the back');
  });
});