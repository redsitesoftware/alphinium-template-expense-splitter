const request = require('supertest');
const app = require('../index');
const store = require('../store');

beforeEach(() => store.reset());

describe('GET /api/categories', () => {
  it('returns 200 with 5 categories', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(5);
    res.body.forEach((c) => {
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('name');
      expect(c).toHaveProperty('emoji');
    });
  });

  it('includes expected category ids', async () => {
    const res = await request(app).get('/api/categories');
    const ids = res.body.map((c) => c.id);
    expect(ids).toContain('food');
    expect(ids).toContain('transport');
    expect(ids).toContain('accommodation');
    expect(ids).toContain('activities');
    expect(ids).toContain('other');
  });
});

describe('POST /api/groups/:id/expenses — category_id', () => {
  let groupId;
  beforeEach(async () => {
    const g = await request(app)
      .post('/api/groups')
      .send({ name: 'Test', members: [{ id: 'u1', name: 'Alice' }, { id: 'u2', name: 'Bob' }] });
    groupId = g.body.id;
  });

  it('stores valid category_id and returns it in expense', async () => {
    const res = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set('x-user-id', 'u1')
      .send({ amount: 50, description: 'Tacos', paid_by: 'u1', split_mode: 'equal', category_id: 'food' });
    expect(res.status).toBe(201);
    expect(res.body.category_id).toBe('food');
  });

  it('returns 400 for invalid category_id', async () => {
    const res = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set('x-user-id', 'u1')
      .send({ amount: 50, description: 'Tacos', paid_by: 'u1', split_mode: 'equal', category_id: 'invalid-cat' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/category_id/);
  });

  it('stores expense without category_id (null)', async () => {
    const res = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set('x-user-id', 'u1')
      .send({ amount: 30, description: 'Bus', paid_by: 'u1', split_mode: 'equal' });
    expect(res.status).toBe(201);
    expect(res.body.category_id).toBeNull();
  });
});

describe('GET /api/groups/:id/summary?by=category', () => {
  let groupId;
  beforeEach(async () => {
    const g = await request(app)
      .post('/api/groups')
      .send({ name: 'Budget', members: [{ id: 'u1', name: 'Alice' }, { id: 'u2', name: 'Bob' }] });
    groupId = g.body.id;
  });

  it('returns 400 if x-user-id missing', async () => {
    const res = await request(app).get(`/api/groups/${groupId}/summary?by=category`);
    expect(res.status).toBe(400);
  });

  it('returns 404 if group not found', async () => {
    const res = await request(app)
      .get('/api/groups/no-such-group/summary?by=category')
      .set('x-user-id', 'u1');
    expect(res.status).toBe(404);
  });

  it('returns empty object for group with no expenses', async () => {
    const res = await request(app)
      .get(`/api/groups/${groupId}/summary?by=category`)
      .set('x-user-id', 'u1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });

  it('returns correct per-category totals', async () => {
    await request(app).post(`/api/groups/${groupId}/expenses`).set('x-user-id', 'u1')
      .send({ amount: 100, description: 'Dinner', paid_by: 'u1', split_mode: 'equal', category_id: 'food' });
    await request(app).post(`/api/groups/${groupId}/expenses`).set('x-user-id', 'u1')
      .send({ amount: 60, description: 'Lunch', paid_by: 'u1', split_mode: 'equal', category_id: 'food' });
    await request(app).post(`/api/groups/${groupId}/expenses`).set('x-user-id', 'u1')
      .send({ amount: 40, description: 'Taxi', paid_by: 'u1', split_mode: 'equal', category_id: 'transport' });

    const res = await request(app)
      .get(`/api/groups/${groupId}/summary?by=category`)
      .set('x-user-id', 'u1');
    expect(res.status).toBe(200);
    expect(res.body.food).toBe(160);
    expect(res.body.transport).toBe(40);
    expect(res.body.accommodation).toBeUndefined();
  });
});
