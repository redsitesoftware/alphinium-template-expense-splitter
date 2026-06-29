const request = require('supertest');
const app = require('../index');
const store = require('../store');

beforeEach(() => {
  store.reset();
});

// Helper: create a group with two members
function makeGroup() {
  return store.createGroup('Trip', [
    { id: 'u1', name: 'Alice' },
    { id: 'u2', name: 'Bob' },
  ]);
}

// ---------------------------------------------------------------------------
// POST /api/groups/:id/expenses
// ---------------------------------------------------------------------------
describe('POST /api/groups/:id/expenses', () => {
  test('creates an equal-split expense and returns 201', async () => {
    const group = makeGroup();

    const res = await request(app)
      .post(`/api/groups/${group.id}/expenses`)
      .set('x-user-id', 'u1')
      .send({ amount: 100, description: 'Dinner', paid_by: 'u1', split_mode: 'equal' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      groupId: group.id,
      amount: 100,
      description: 'Dinner',
      paid_by: 'u1',
      split_mode: 'equal',
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
    // Equal split: 100 / 2 = 50 per member
    expect(res.body.split_amounts['u1']).toBe(50);
    expect(res.body.split_amounts['u2']).toBe(50);
  });

  test('creates an exact-split expense with supplied split_amounts', async () => {
    const group = makeGroup();

    const res = await request(app)
      .post(`/api/groups/${group.id}/expenses`)
      .set('x-user-id', 'u1')
      .send({
        amount: 90,
        description: 'Hotel',
        paid_by: 'u1',
        split_mode: 'exact',
        split_amounts: { u1: 60, u2: 30 },
      });

    expect(res.status).toBe(201);
    expect(res.body.split_mode).toBe('exact');
    expect(res.body.split_amounts).toEqual({ u1: 60, u2: 30 });
  });

  test('creates a percent-split expense with supplied split_amounts', async () => {
    const group = makeGroup();

    const res = await request(app)
      .post(`/api/groups/${group.id}/expenses`)
      .set('x-user-id', 'u1')
      .send({
        amount: 200,
        description: 'Flights',
        paid_by: 'u2',
        split_mode: 'percent',
        split_amounts: { u1: 70, u2: 30 },
      });

    expect(res.status).toBe(201);
    expect(res.body.split_mode).toBe('percent');
    expect(res.body.split_amounts).toEqual({ u1: 70, u2: 30 });
  });

  test('returns 400 when x-user-id header is missing', async () => {
    const group = makeGroup();

    const res = await request(app)
      .post(`/api/groups/${group.id}/expenses`)
      .send({ amount: 50, description: 'Lunch', paid_by: 'u1', split_mode: 'equal' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/x-user-id/i);
  });

  test('returns 404 when group does not exist', async () => {
    const res = await request(app)
      .post('/api/groups/nonexistent-id/expenses')
      .set('x-user-id', 'u1')
      .send({ amount: 50, description: 'Lunch', paid_by: 'u1', split_mode: 'equal' });

    expect(res.status).toBe(404);
  });

  test('returns 400 when amount is not a positive number', async () => {
    const group = makeGroup();

    const res = await request(app)
      .post(`/api/groups/${group.id}/expenses`)
      .set('x-user-id', 'u1')
      .send({ amount: -10, description: 'Lunch', paid_by: 'u1', split_mode: 'equal' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/amount/i);
  });

  test('returns 400 when description is missing', async () => {
    const group = makeGroup();

    const res = await request(app)
      .post(`/api/groups/${group.id}/expenses`)
      .set('x-user-id', 'u1')
      .send({ amount: 50, paid_by: 'u1', split_mode: 'equal' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/description/i);
  });

  test('returns 400 when split_mode is invalid', async () => {
    const group = makeGroup();

    const res = await request(app)
      .post(`/api/groups/${group.id}/expenses`)
      .set('x-user-id', 'u1')
      .send({ amount: 50, description: 'Lunch', paid_by: 'u1', split_mode: 'random' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/split_mode/i);
  });

  test('returns 400 when exact mode is used without split_amounts', async () => {
    const group = makeGroup();

    const res = await request(app)
      .post(`/api/groups/${group.id}/expenses`)
      .set('x-user-id', 'u1')
      .send({ amount: 50, description: 'Lunch', paid_by: 'u1', split_mode: 'exact' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/split_amounts/i);
  });
});

// ---------------------------------------------------------------------------
// GET /api/groups/:id/expenses
// ---------------------------------------------------------------------------
describe('GET /api/groups/:id/expenses', () => {
  test('returns 200 with empty array for a new group', async () => {
    const group = makeGroup();

    const res = await request(app)
      .get(`/api/groups/${group.id}/expenses`)
      .set('x-user-id', 'u1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns 200 with all expenses after they are created', async () => {
    const group = makeGroup();

    await request(app)
      .post(`/api/groups/${group.id}/expenses`)
      .set('x-user-id', 'u1')
      .send({ amount: 80, description: 'Taxi', paid_by: 'u1', split_mode: 'equal' });

    await request(app)
      .post(`/api/groups/${group.id}/expenses`)
      .set('x-user-id', 'u2')
      .send({ amount: 120, description: 'Groceries', paid_by: 'u2', split_mode: 'equal' });

    const res = await request(app)
      .get(`/api/groups/${group.id}/expenses`)
      .set('x-user-id', 'u1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].description).toBe('Taxi');
    expect(res.body[1].description).toBe('Groceries');
  });

  test('returns 400 when x-user-id header is missing', async () => {
    const group = makeGroup();

    const res = await request(app).get(`/api/groups/${group.id}/expenses`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/x-user-id/i);
  });

  test('returns 404 when group does not exist', async () => {
    const res = await request(app)
      .get('/api/groups/nonexistent-id/expenses')
      .set('x-user-id', 'u1');

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// store.addExpense — unit tests
// ---------------------------------------------------------------------------
describe('store.addExpense', () => {
  test('auto-computes equal split_amounts for equal mode', () => {
    const group = store.createGroup('Test', [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C' },
    ]);

    const expense = store.addExpense(group.id, {
      amount: 90,
      description: 'Dinner',
      paid_by: 'a',
      split_mode: 'equal',
      split_amounts: {},
    });

    expect(expense.split_amounts).toEqual({ a: 30, b: 30, c: 30 });
  });

  test('returns undefined for an unknown groupId', () => {
    const result = store.addExpense('no-such-id', {
      amount: 10,
      description: 'Test',
      paid_by: 'u1',
      split_mode: 'equal',
    });

    expect(result).toBeUndefined();
  });

  test('persists expense in group.expenses', () => {
    const group = store.createGroup('Test', [{ id: 'u1', name: 'Alice' }]);

    store.addExpense(group.id, {
      amount: 20,
      description: 'Coffee',
      paid_by: 'u1',
      split_mode: 'equal',
    });

    const expenses = store.getExpenses(group.id);
    expect(expenses).toHaveLength(1);
    expect(expenses[0].description).toBe('Coffee');
  });
});

// ---------------------------------------------------------------------------
// store.getExpenses — unit tests
// ---------------------------------------------------------------------------
describe('store.getExpenses', () => {
  test('returns empty array for a group with no expenses', () => {
    const group = store.createGroup('Test', []);
    expect(store.getExpenses(group.id)).toEqual([]);
  });

  test('returns undefined for an unknown groupId', () => {
    expect(store.getExpenses('no-such-id')).toBeUndefined();
  });
});
