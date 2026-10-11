const { scorePair } = require('../matchingEngine');

function makeItem(overrides = {}) {
  return {
    category: 'Wallet',
    color: 'Black',
    brand: 'Hidesign',
    location: 'Library',
    date_time: '2026-10-01T10:00:00',
    ...overrides,
  };
}

describe('scorePair', () => {
  test('returns 100 for identical items', () => {
    const item = makeItem();
    expect(scorePair(item, item)).toBe(100);
  });

  test('category match alone gives 40', () => {
    const lost = makeItem({ color: 'Black', brand: 'Hidesign', location: 'Library' });
    const found = makeItem({
      color: 'Brown',
      brand: 'Other',
      location: 'Cafeteria',
      date_time: '2026-10-20T10:00:00',
    });
    expect(scorePair(lost, found)).toBe(40);
  });

  test('category + color gives 60', () => {
    const lost = makeItem({ brand: 'Hidesign', location: 'Library' });
    const found = makeItem({
      brand: 'Other',
      location: 'Cafeteria',
      date_time: '2026-10-20T10:00:00',
    });
    expect(scorePair(lost, found)).toBe(60);
  });

  test('category + color + brand gives 80', () => {
    const lost = makeItem({ location: 'Library' });
    const found = makeItem({
      location: 'Cafeteria',
      date_time: '2026-10-20T10:00:00',
    });
    expect(scorePair(lost, found)).toBe(80);
  });

  test('all matches except date gives 90', () => {
    const lost = makeItem();
    const found = makeItem({ date_time: '2026-10-20T10:00:00' });
    expect(scorePair(lost, found)).toBe(90);
  });

  test('is case-insensitive for color and brand', () => {
    const lost = makeItem({ color: 'Black', brand: 'Hidesign' });
    const found = makeItem({ color: 'black', brand: 'HIDESIGN' });
    expect(scorePair(lost, found)).toBe(100);
  });

  test('handles missing fields gracefully', () => {
    expect(scorePair({}, {})).toBe(0);
    expect(scorePair({ category: 'Wallet' }, {})).toBe(0);
  });

  test('location fuzzy match: "Library" matches "Library, 2nd floor"', () => {
    const lost = makeItem({ location: 'Library' });
    const found = makeItem({ location: 'Library, 2nd floor' });
    expect(scorePair(lost, found)).toBe(100);
  });

  test('score is never above 100', () => {
    const item = makeItem();
    expect(scorePair(item, item)).toBeLessThanOrEqual(100);
  });

  test('score is never below 0', () => {
    expect(scorePair({}, {})).toBeGreaterThanOrEqual(0);
  });
});