const request = require('supertest');
const app = require('../index');
const store = require('../store');

beforeEach(() => store.reset());

describe('GET /api/categories', () => {
  test('returns all 5 categories with id, name, emoji', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(5);

    const ids = res.body.map((c) => c.id);
    expect(ids).toContain('food');
    expect(ids).toContain('transport');
    expect(ids).toContain('accommodation');
    expect(ids).toContain('entertainment');
    expect(ids).toContain('other');

    for (const cat of res.body) {
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('name');
      expect(cat).toHaveProperty('emoji');
    }
  });
});

describe('POST /api/groups/:id/expenses', () => {
  let groupId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/groups')
      .send({ name: 'Test Group', members: [{ id: 'u1', name: 'Alice' }] });
    groupId = res.body.id;
  });

  test('creates expense without category_id', async () => {
    const res = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({ description: 'Lunch', amount: 25.00, paid_by: 'u1' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      description: 'Lunch',
      amount: 25,
      paid_by: 'u1',
      category_id: null,
    });
    expect(res.body.id).toBeDefined();
  });

  test('creates expense with valid category_id', async () => {
    const res = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({ description: 'Taxi', amount: 15.50, paid_by: 'u1', category_id: 'transport' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ category_id: 'transport', amount: 15.5 });
  });

  test('rejects unknown category_id with 400', async () => {
    const res = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({ description: 'Hotel', amount: 200, paid_by: 'u1', category_id: 'nonexistent' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Unknown category_id/);
  });

  test('rejects missing description with 400', async () => {
    const res = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({ amount: 10, paid_by: 'u1' });
    expect(res.status).toBe(400);
  });

  test('rejects invalid amount with 400', async () => {
    const res = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({ description: 'Coffee', amount: -5, paid_by: 'u1' });
    expect(res.status).toBe(400);
  });

  test('returns 404 for unknown group', async () => {
    const res = await request(app)
      .post('/api/groups/nonexistent-id/expenses')
      .send({ description: 'Coffee', amount: 5, paid_by: 'u1' });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/groups/:id/summary?by=category', () => {
  let groupId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/groups')
      .send({ name: 'Trip', members: [{ id: 'u1', name: 'Alice' }] });
    groupId = res.body.id;
  });

  test('returns empty object when no expenses', async () => {
    const res = await request(app).get(`/api/groups/${groupId}/summary?by=category`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });

  test('aggregates spend by category name', async () => {
    await request(app).post(`/api/groups/${groupId}/expenses`)
      .send({ description: 'Lunch', amount: 20, paid_by: 'u1', category_id: 'food' });
    await request(app).post(`/api/groups/${groupId}/expenses`)
      .send({ description: 'Dinner', amount: 30, paid_by: 'u1', category_id: 'food' });
    await request(app).post(`/api/groups/${groupId}/expenses`)
      .send({ description: 'Taxi', amount: 15, paid_by: 'u1', category_id: 'transport' });

    const res = await request(app).get(`/api/groups/${groupId}/summary?by=category`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ Food: 50, Transport: 15 });
  });

  test('groups uncategorised expenses under Uncategorised', async () => {
    await request(app).post(`/api/groups/${groupId}/expenses`)
      .send({ description: 'Mystery', amount: 10, paid_by: 'u1' });

    const res = await request(app).get(`/api/groups/${groupId}/summary?by=category`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('Uncategorised', 10);
  });

  test('returns 400 for unsupported summary type', async () => {
    const res = await request(app).get(`/api/groups/${groupId}/summary?by=member`);
    expect(res.status).toBe(400);
  });

  test('returns 404 for unknown group', async () => {
    const res = await request(app).get('/api/groups/fake-id/summary?by=category');
    expect(res.status).toBe(404);
  });
});
