const request = require('supertest');
const app = require('../index');
const store = require('../store');

// Stable FX rates for all tests: USD base, rates = units per 1 USD
// EUR: 0.91 (1 USD = 0.91 EUR → 1 EUR = 1.0989 USD)
// GBP: 0.79
// AUD: 1.55
const TEST_RATES = { USD: 1, EUR: 0.91, GBP: 0.79, AUD: 1.55 };

beforeEach(() => {
  store.reset();
  store._setFxCache({ base: 'USD', rates: TEST_RATES, updatedAt: Date.now() });
});

describe('GET /api/fx-rates', () => {
  it('returns cached rates object with base and rates fields', async () => {
    const res = await request(app).get('/api/fx-rates');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('base', 'USD');
    expect(res.body).toHaveProperty('rates');
    expect(typeof res.body.rates).toBe('object');
    expect(res.body).toHaveProperty('updatedAt');
  });

  it('returns USD=1 in the rates', async () => {
    const res = await request(app).get('/api/fx-rates');
    expect(res.body.rates.USD).toBe(1);
  });
});

describe('addExpense with currency conversion', () => {
  let groupId;

  beforeEach(() => {
    const group = store.createGroup('Test Group', [
      { id: 'm1', name: 'Alice' },
      { id: 'm2', name: 'Bob' },
    ], 'USD');
    groupId = group.id;
  });

  it('stores convertedAmount=amount when currency matches baseCurrency', () => {
    const expense = store.addExpense(groupId, {
      amount: 100,
      description: 'Lunch',
      paid_by: 'm1',
      split_mode: 'equal',
      currency: 'USD',
    });
    expect(expense.currency).toBe('USD');
    expect(expense.convertedAmount).toBe(100);
    expect(expense.originalAmount).toBeNull();
  });

  it('converts EUR to USD and stores convertedAmount', () => {
    // 100 EUR → USD: 100 / 0.91 ≈ 109.89
    const expense = store.addExpense(groupId, {
      amount: 100,
      description: 'Dinner',
      paid_by: 'm1',
      split_mode: 'equal',
      currency: 'EUR',
    });
    expect(expense.currency).toBe('EUR');
    expect(expense.originalAmount).toBe(100);
    expect(expense.convertedAmount).toBeCloseTo(109.89, 1);
  });

  it('POST /api/groups/:id/expenses accepts currency field', async () => {
    const res = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set('x-user-id', 'm1')
      .send({
        amount: 50,
        description: 'Coffee',
        paid_by: 'm1',
        split_mode: 'equal',
        currency: 'EUR',
      });
    expect(res.status).toBe(201);
    expect(res.body.currency).toBe('EUR');
    expect(res.body.convertedAmount).toBeCloseTo(54.95, 1); // 50 / 0.91
    expect(res.body.originalAmount).toBe(50);
  });

  it('defaults currency to group baseCurrency when not provided', () => {
    const expense = store.addExpense(groupId, {
      amount: 75,
      description: 'Taxi',
      paid_by: 'm2',
      split_mode: 'equal',
    });
    expect(expense.currency).toBe('USD');
    expect(expense.convertedAmount).toBe(75);
    expect(expense.originalAmount).toBeNull();
  });
});

describe('getBalances with mixed-currency expenses', () => {
  it('uses convertedAmount for balance calculation', () => {
    const group = store.createGroup('Mixed', [
      { id: 'm1', name: 'Alice' },
      { id: 'm2', name: 'Bob' },
    ], 'USD');

    // m1 pays EUR 91 ≈ USD 100 (91 / 0.91 = 100), split equally
    // If using raw amount (91):  m1 net = +91 - 45.5 = +45.5
    // If using convertedAmount (~100): m1 net ≈ +100 - 50 = +50
    store.addExpense(group.id, {
      amount: 91,
      description: 'Dinner EUR',
      paid_by: 'm1',
      split_mode: 'equal',
      currency: 'EUR',
    });

    const { net } = store.getBalances(group.id);
    // Verify conversion is applied: net should reflect ~$100 not ~€91
    expect(net.m1).toBeGreaterThan(49);  // ~+50 USD, not ~+45.5 EUR
    expect(net.m2).toBeLessThan(-49);    // ~-50 USD, not ~-45.5 EUR
  });
});

describe('FX rate cache TTL', () => {
  it('returns cached value within 24 hours', async () => {
    const now = Date.now();
    store._setFxCache({ base: 'USD', rates: { USD: 1, EUR: 0.91 }, updatedAt: now });
    const res = await request(app).get('/api/fx-rates');
    expect(res.body.rates.EUR).toBe(0.91);
  });

  it('refreshes cache after TTL expiry', async () => {
    // Set cache to 25 hours old (expired)
    const expired = Date.now() - 25 * 60 * 60 * 1000;
    store._setFxCache({ base: 'USD', rates: { USD: 1, EUR: 0.5 }, updatedAt: expired });
    // fetchFxRates will try to fetch from network; on failure it keeps old cache
    // In test env there's no network so we verify it still returns a valid object
    const res = await request(app).get('/api/fx-rates');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('base');
    expect(res.body).toHaveProperty('rates');
  });
});

describe('createGroup with baseCurrency', () => {
  it('stores baseCurrency on the group', () => {
    const group = store.createGroup('Euro Group', [], 'EUR');
    expect(group.baseCurrency).toBe('EUR');
  });

  it('defaults to USD when baseCurrency not provided', () => {
    const group = store.createGroup('Default Group', []);
    expect(group.baseCurrency).toBe('USD');
  });

  it('POST /api/groups accepts baseCurrency field', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set('x-user-id', 'm1')
      .send({ name: 'Euro Trip', members: [], baseCurrency: 'EUR' });
    expect(res.status).toBe(201);
    expect(res.body.baseCurrency).toBe('EUR');
  });
});
