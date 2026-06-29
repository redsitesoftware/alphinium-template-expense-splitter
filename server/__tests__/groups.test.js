const request = require('supertest');
const app = require('../index');
const store = require('../store');

beforeEach(() => {
  store.reset();
});

// ---------------------------------------------------------------------------
// POST /api/groups
// ---------------------------------------------------------------------------
describe('POST /api/groups', () => {
  test('creates a group and returns 201 with the group object', async () => {
    // Arrange
    const body = { name: 'Bali Trip', members: [{ id: 'u1', name: 'Alice' }] };

    // Act
    const res = await request(app).post('/api/groups').send(body);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Bali Trip',
      members: [{ id: 'u1', name: 'Alice' }],
      expenses: [],
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
  });

  test('creates a group with no members when members array is omitted', async () => {
    const res = await request(app).post('/api/groups').send({ name: 'Solo Trip' });

    expect(res.status).toBe(201);
    expect(res.body.members).toEqual([]);
  });

  test('returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/groups').send({ members: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 when name is an empty string', async () => {
    const res = await request(app).post('/api/groups').send({ name: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 when name is whitespace only', async () => {
    const res = await request(app).post('/api/groups').send({ name: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// GET /api/groups/me
// ---------------------------------------------------------------------------
describe('GET /api/groups/me', () => {
  test('returns groups the user belongs to', async () => {
    // Arrange — create a group with user u1
    store.createGroup('Trip', [{ id: 'u1', name: 'Alice' }, { id: 'u2', name: 'Bob' }]);

    // Act
    const res = await request(app).get('/api/groups/me').set('x-user-id', 'u1');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Trip');
  });

  test('returns an empty array for a user who belongs to no groups', async () => {
    store.createGroup('Trip', [{ id: 'u1', name: 'Alice' }]);

    const res = await request(app).get('/api/groups/me').set('x-user-id', 'unknown-user');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns multiple groups when user belongs to several', async () => {
    store.createGroup('Trip A', [{ id: 'u1', name: 'Alice' }]);
    store.createGroup('Trip B', [{ id: 'u1', name: 'Alice' }]);
    store.createGroup('Trip C', [{ id: 'u2', name: 'Bob' }]);

    const res = await request(app).get('/api/groups/me').set('x-user-id', 'u1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('returns 400 when x-user-id header is missing', async () => {
    const res = await request(app).get('/api/groups/me');

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// POST /api/groups/:id/invite
// ---------------------------------------------------------------------------
describe('POST /api/groups/:id/invite', () => {
  test('returns 200 with an inviteUrl for a valid group id', async () => {
    // Arrange
    const group = store.createGroup('Party', [{ id: 'u1', name: 'Alice' }]);

    // Act
    const res = await request(app).post(`/api/groups/${group.id}/invite`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.inviteUrl).toMatch(/^\/api\/groups\/join\//);
  });

  test('inviteUrl contains a non-empty token', async () => {
    const group = store.createGroup('Party', []);

    const res = await request(app).post(`/api/groups/${group.id}/invite`);
    const token = res.body.inviteUrl.split('/').pop();

    expect(token).toBeTruthy();
    expect(token.length).toBeGreaterThan(8);
  });

  test('returns 404 for an unknown group id', async () => {
    const res = await request(app).post('/api/groups/no-such-id/invite');

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// GET /api/groups/join/:token
// ---------------------------------------------------------------------------
describe('GET /api/groups/join/:token', () => {
  async function createGroupAndToken(name = 'Test Group', members = [{ id: 'u1', name: 'Alice' }]) {
    const group = store.createGroup(name, members);
    const inviteRes = await request(app).post(`/api/groups/${group.id}/invite`);
    const token = inviteRes.body.inviteUrl.split('/').pop();
    return { group, token };
  }

  test('returns 200 with a group preview when no user headers are provided', async () => {
    const { group, token } = await createGroupAndToken('Beach Trip', [
      { id: 'u1', name: 'Alice' },
      { id: 'u2', name: 'Bob' },
    ]);

    const res = await request(app).get(`/api/groups/join/${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: group.id, name: 'Beach Trip', memberCount: 2 });
  });

  test('does not expose full member list or expenses in preview', async () => {
    const { token } = await createGroupAndToken();

    const res = await request(app).get(`/api/groups/join/${token}`);

    expect(res.body.members).toBeUndefined();
    expect(res.body.expenses).toBeUndefined();
  });

  test('adds the user to the group and returns updated group when user headers are provided', async () => {
    const { group, token } = await createGroupAndToken('Trip', [{ id: 'u1', name: 'Alice' }]);

    const res = await request(app)
      .get(`/api/groups/join/${token}`)
      .set('x-user-id', 'u99')
      .set('x-user-name', 'NewPerson');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(group.id);
    expect(res.body.members).toHaveLength(2);
    expect(res.body.members.some((m) => m.id === 'u99')).toBe(true);
  });

  test('does not add duplicate members when the same user joins twice', async () => {
    const { token } = await createGroupAndToken('Trip', [{ id: 'u1', name: 'Alice' }]);

    await request(app)
      .get(`/api/groups/join/${token}`)
      .set('x-user-id', 'u99')
      .set('x-user-name', 'NewPerson');

    const res = await request(app)
      .get(`/api/groups/join/${token}`)
      .set('x-user-id', 'u99')
      .set('x-user-name', 'NewPerson');

    expect(res.body.members).toHaveLength(2);
  });

  test('returns 404 for an invalid token', async () => {
    const res = await request(app).get('/api/groups/join/invalid-token-xyz');

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// POST /api/groups/:id/expenses
// ---------------------------------------------------------------------------
describe('POST /api/groups/:id/expenses', () => {
  test('returns 400 when x-user-id header is missing', async () => {
    const group = store.createGroup('Trip', [{ id: 'u1', name: 'Alice' }]);

    const res = await request(app)
      .post(`/api/groups/${group.id}/expenses`)
      .send({ amount: 50, description: 'Lunch', paid_by: 'u1', split_mode: 'equal' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/x-user-id/i);
  });

  test('returns 404 when group does not exist', async () => {
    const res = await request(app)
      .post('/api/groups/no-such-group/expenses')
      .set('x-user-id', 'u1')
      .send({ amount: 50, description: 'Lunch', paid_by: 'u1', split_mode: 'equal' });

    expect(res.status).toBe(404);
  });

  test('returns 400 when amount is missing or non-positive', async () => {
    const group = store.createGroup('Trip', [{ id: 'u1', name: 'Alice' }]);

    const res = await request(app)
      .post(`/api/groups/${group.id}/expenses`)
      .set('x-user-id', 'u1')
      .send({ amount: 0, description: 'Lunch', paid_by: 'u1', split_mode: 'equal' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/amount/i);
  });

  test('returns 400 when description is empty or missing', async () => {
    const group = store.createGroup('Trip', [{ id: 'u1', name: 'Alice' }]);

    const res = await request(app)
      .post(`/api/groups/${group.id}/expenses`)
      .set('x-user-id', 'u1')
      .send({ amount: 50, description: '', paid_by: 'u1', split_mode: 'equal' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/description/i);
  });

  test('returns 400 when split_mode is invalid', async () => {
    const group = store.createGroup('Trip', [{ id: 'u1', name: 'Alice' }]);

    const res = await request(app)
      .post(`/api/groups/${group.id}/expenses`)
      .set('x-user-id', 'u1')
      .send({ amount: 50, description: 'Lunch', paid_by: 'u1', split_mode: 'random' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/split_mode/i);
  });

  test('returns 400 when split_mode is exact/percent but split_amounts is missing', async () => {
    const group = store.createGroup('Trip', [{ id: 'u1', name: 'Alice' }]);

    const res = await request(app)
      .post(`/api/groups/${group.id}/expenses`)
      .set('x-user-id', 'u1')
      .send({ amount: 50, description: 'Lunch', paid_by: 'u1', split_mode: 'percent' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/split_amounts/i);
  });

  test('returns 201 with equal split — auto-computes split_amounts for each member', async () => {
    const group = store.createGroup('Trip', [
      { id: 'u1', name: 'Alice' },
      { id: 'u2', name: 'Bob' },
    ]);

    const res = await request(app)
      .post(`/api/groups/${group.id}/expenses`)
      .set('x-user-id', 'u1')
      .send({ amount: 100, description: 'Dinner', paid_by: 'u1', split_mode: 'equal' });

    expect(res.status).toBe(201);
    expect(res.body.split_mode).toBe('equal');
    expect(res.body.split_amounts['u1']).toBe(50);
    expect(res.body.split_amounts['u2']).toBe(50);
  });

  test('returns 201 with exact split — stores provided split_amounts as-is', async () => {
    const group = store.createGroup('Trip', [
      { id: 'u1', name: 'Alice' },
      { id: 'u2', name: 'Bob' },
    ]);

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
    expect(res.body.split_amounts).toEqual({ u1: 60, u2: 30 });
  });

  test('returns 201 with percent split — stores provided percentages', async () => {
    const group = store.createGroup('Trip', [
      { id: 'u1', name: 'Alice' },
      { id: 'u2', name: 'Bob' },
    ]);

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

  test('response contains id, createdAt, and all input fields', async () => {
    const group = store.createGroup('Trip', [{ id: 'u1', name: 'Alice' }]);

    const res = await request(app)
      .post(`/api/groups/${group.id}/expenses`)
      .set('x-user-id', 'u1')
      .send({ amount: 25, description: 'Coffee', paid_by: 'u1', split_mode: 'equal' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.amount).toBe(25);
    expect(res.body.description).toBe('Coffee');
    expect(res.body.paid_by).toBe('u1');
    expect(res.body.split_mode).toBe('equal');
    expect(res.body.groupId).toBe(group.id);
  });
});

// ---------------------------------------------------------------------------
// GET /api/groups/:id/expenses
// ---------------------------------------------------------------------------
describe('GET /api/groups/:id/expenses', () => {
  test('returns 400 when x-user-id header is missing', async () => {
    const group = store.createGroup('Trip', [{ id: 'u1', name: 'Alice' }]);

    const res = await request(app).get(`/api/groups/${group.id}/expenses`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/x-user-id/i);
  });

  test('returns 404 when group does not exist', async () => {
    const res = await request(app)
      .get('/api/groups/no-such-group/expenses')
      .set('x-user-id', 'u1');

    expect(res.status).toBe(404);
  });

  test('returns 200 with empty array for a new group', async () => {
    const group = store.createGroup('Trip', [{ id: 'u1', name: 'Alice' }]);

    const res = await request(app)
      .get(`/api/groups/${group.id}/expenses`)
      .set('x-user-id', 'u1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns 200 with all expenses after POSTing multiple', async () => {
    const group = store.createGroup('Trip', [
      { id: 'u1', name: 'Alice' },
      { id: 'u2', name: 'Bob' },
    ]);

    await request(app)
      .post(`/api/groups/${group.id}/expenses`)
      .set('x-user-id', 'u1')
      .send({ amount: 40, description: 'Taxi', paid_by: 'u1', split_mode: 'equal' });

    await request(app)
      .post(`/api/groups/${group.id}/expenses`)
      .set('x-user-id', 'u2')
      .send({ amount: 60, description: 'Groceries', paid_by: 'u2', split_mode: 'equal' });

    const res = await request(app)
      .get(`/api/groups/${group.id}/expenses`)
      .set('x-user-id', 'u1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].description).toBe('Taxi');
    expect(res.body[1].description).toBe('Groceries');
  });
});
