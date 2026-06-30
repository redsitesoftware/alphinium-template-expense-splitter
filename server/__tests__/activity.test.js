const request = require('supertest');
const app = require('../index');
const store = require('../store');

beforeEach(() => store.reset());

describe('GET /api/groups/:id/activity', () => {
  it('returns 400 when x-user-id header is missing', async () => {
    const res = await request(app).get('/api/groups/any-id/activity');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/x-user-id/i);
  });

  it('returns 404 when group does not exist', async () => {
    const res = await request(app)
      .get('/api/groups/nonexistent/activity')
      .set('x-user-id', 'u1');
    expect(res.status).toBe(404);
  });

  it('returns 200 with empty array for a new group with no events', async () => {
    const group = store.createGroup('Empty Group', []);
    const res = await request(app)
      .get(`/api/groups/${group.id}/activity`)
      .set('x-user-id', 'u1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns member_joined events for members created with the group', async () => {
    const group = store.createGroup('Group A', [
      { id: 'u1', name: 'Alice' },
      { id: 'u2', name: 'Bob' },
    ]);
    const res = await request(app)
      .get(`/api/groups/${group.id}/activity`)
      .set('x-user-id', 'u1');
    expect(res.status).toBe(200);
    const joined = res.body.filter((e) => e.type === 'member_joined');
    expect(joined).toHaveLength(2);
    expect(joined.map((e) => e.name)).toEqual(expect.arrayContaining(['Alice', 'Bob']));
  });

  it('returns expense events after POST /api/groups/:id/expenses', async () => {
    const group = store.createGroup('Group B', [{ id: 'u1', name: 'Alice' }]);
    store.addExpense(group.id, {
      amount: 50,
      description: 'Dinner',
      paid_by: 'u1',
      split_mode: 'equal',
    });
    const res = await request(app)
      .get(`/api/groups/${group.id}/activity`)
      .set('x-user-id', 'u1');
    expect(res.status).toBe(200);
    const expenses = res.body.filter((e) => e.type === 'expense');
    expect(expenses).toHaveLength(1);
    expect(expenses[0]).toMatchObject({
      type: 'expense',
      actor: 'u1',
      amount: 50,
      description: 'Dinner',
    });
  });

  it('returns settlement events after store.addSettlement()', async () => {
    const group = store.createGroup('Group C', [
      { id: 'u1', name: 'Alice' },
      { id: 'u2', name: 'Bob' },
    ]);
    store.addSettlement(group.id, { from: 'u2', to: 'u1', amount: 25 });
    const res = await request(app)
      .get(`/api/groups/${group.id}/activity`)
      .set('x-user-id', 'u1');
    expect(res.status).toBe(200);
    const settlements = res.body.filter((e) => e.type === 'settlement');
    expect(settlements).toHaveLength(1);
    expect(settlements[0]).toMatchObject({
      type: 'settlement',
      actor: 'u2',
      to: 'u1',
      amount: 25,
    });
  });

  it('returns events sorted by createdAt ascending', async () => {
    const group = store.createGroup('Group D', [{ id: 'u1', name: 'Alice' }]);
    // small delay so timestamps differ
    await new Promise((r) => setTimeout(r, 10));
    store.addExpense(group.id, {
      amount: 100,
      description: 'Lunch',
      paid_by: 'u1',
      split_mode: 'equal',
    });
    await new Promise((r) => setTimeout(r, 10));
    store.addSettlement(group.id, { from: 'u1', to: 'u1', amount: 10 });

    const res = await request(app)
      .get(`/api/groups/${group.id}/activity`)
      .set('x-user-id', 'u1');
    expect(res.status).toBe(200);
    const timestamps = res.body.map((e) => new Date(e.createdAt).getTime());
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
    }
  });

  it('returns all three event types in mixed feed', async () => {
    const group = store.createGroup('Group E', [{ id: 'u1', name: 'Alice' }]);
    store.addExpense(group.id, {
      amount: 30,
      description: 'Coffee',
      paid_by: 'u1',
      split_mode: 'equal',
    });
    store.addSettlement(group.id, { from: 'u1', to: 'u1', amount: 5 });
    const res = await request(app)
      .get(`/api/groups/${group.id}/activity`)
      .set('x-user-id', 'u1');
    expect(res.status).toBe(200);
    const types = new Set(res.body.map((e) => e.type));
    expect(types.has('expense')).toBe(true);
    expect(types.has('settlement')).toBe(true);
    expect(types.has('member_joined')).toBe(true);
  });
});

describe('store.addSettlement', () => {
  it('returns undefined for nonexistent group', () => {
    expect(store.addSettlement('nope', { from: 'u1', to: 'u2', amount: 10 })).toBeUndefined();
  });

  it('saves settlement with id and createdAt', () => {
    const group = store.createGroup('G', []);
    const s = store.addSettlement(group.id, { from: 'u1', to: 'u2', amount: 20 });
    expect(s).toMatchObject({ from: 'u1', to: 'u2', amount: 20 });
    expect(s.id).toBeDefined();
    expect(s.createdAt).toBeDefined();
  });
});

describe('store.getActivity', () => {
  it('returns undefined for nonexistent group', () => {
    expect(store.getActivity('nope')).toBeUndefined();
  });
});

describe('POST /api/groups/:id/settlements', () => {
  it('returns 400 when x-user-id header is missing', async () => {
    const group = store.createGroup('G', []);
    const res = await request(app)
      .post(`/api/groups/${group.id}/settlements`)
      .send({ from: 'u1', to: 'u2', amount: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/x-user-id/i);
  });

  it('returns 400 when from is missing', async () => {
    const group = store.createGroup('G', []);
    const res = await request(app)
      .post(`/api/groups/${group.id}/settlements`)
      .set('x-user-id', 'u1')
      .send({ to: 'u2', amount: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/from/i);
  });

  it('returns 400 when to is missing', async () => {
    const group = store.createGroup('G', []);
    const res = await request(app)
      .post(`/api/groups/${group.id}/settlements`)
      .set('x-user-id', 'u1')
      .send({ from: 'u1', amount: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/to/i);
  });

  it('returns 400 when amount is invalid', async () => {
    const group = store.createGroup('G', []);
    const res = await request(app)
      .post(`/api/groups/${group.id}/settlements`)
      .set('x-user-id', 'u1')
      .send({ from: 'u1', to: 'u2', amount: -5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/amount/i);
  });

  it('returns 404 when group does not exist', async () => {
    const res = await request(app)
      .post('/api/groups/nonexistent/settlements')
      .set('x-user-id', 'u1')
      .send({ from: 'u1', to: 'u2', amount: 10 });
    expect(res.status).toBe(404);
  });

  it('returns 201 with created settlement', async () => {
    const group = store.createGroup('G', [{ id: 'u1', name: 'Alice' }, { id: 'u2', name: 'Bob' }]);
    const res = await request(app)
      .post(`/api/groups/${group.id}/settlements`)
      .set('x-user-id', 'u1')
      .send({ from: 'u2', to: 'u1', amount: 25 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ from: 'u2', to: 'u1', amount: 25 });
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
  });

  it('settlement appears in activity feed after creation', async () => {
    const group = store.createGroup('G', [{ id: 'u1', name: 'Alice' }]);
    await request(app)
      .post(`/api/groups/${group.id}/settlements`)
      .set('x-user-id', 'u1')
      .send({ from: 'u1', to: 'u1', amount: 10 });
    const res = await request(app)
      .get(`/api/groups/${group.id}/activity`)
      .set('x-user-id', 'u1');
    expect(res.status).toBe(200);
    expect(res.body.some((e) => e.type === 'settlement')).toBe(true);
  });
});
