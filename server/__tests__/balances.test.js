const request = require('supertest');
const app = require('../index');
const store = require('../store');

beforeEach(() => store.reset());

describe('GET /api/groups/:id/balances', () => {
  let groupId;
  let headers;

  beforeEach(async () => {
    const g = await request(app)
      .post('/api/groups')
      .send({ name: 'Test', members: [{ id: 'u1', name: 'Alice' }, { id: 'u2', name: 'Bob' }, { id: 'u3', name: 'Carol' }] });
    groupId = g.body.id;
    headers = { 'x-user-id': 'u1' };
  });

  it('returns 400 when x-user-id missing', async () => {
    const res = await request(app).get(`/api/groups/${groupId}/balances`);
    expect(res.status).toBe(400);
  });

  it('returns 404 when group not found', async () => {
    const res = await request(app).get('/api/groups/no-such/balances').set(headers);
    expect(res.status).toBe(404);
  });

  it('returns empty net and settlements for group with no expenses', async () => {
    const res = await request(app).get(`/api/groups/${groupId}/balances`).set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('net');
    expect(res.body).toHaveProperty('settlements');
    expect(res.body.settlements).toHaveLength(0);
    expect(Object.values(res.body.net).every((v) => v === 0)).toBe(true);
  });

  it('returns correct net balances after expenses', async () => {
    // u1 pays $90 split equally among 3 → each owes $30; u1 net = +60
    await request(app).post(`/api/groups/${groupId}/expenses`).set(headers)
      .send({ amount: 90, description: 'Dinner', paid_by: 'u1', split_mode: 'equal' });

    const res = await request(app).get(`/api/groups/${groupId}/balances`).set(headers);
    expect(res.status).toBe(200);
    expect(res.body.net.u1).toBeCloseTo(60, 1);
    expect(res.body.net.u2).toBeCloseTo(-30, 1);
    expect(res.body.net.u3).toBeCloseTo(-30, 1);
  });

  it('deducts recorded settlements from net balances', async () => {
    // u1 pays $90 split equally → u2 and u3 each owe u1 $30
    await request(app).post(`/api/groups/${groupId}/expenses`).set(headers)
      .send({ amount: 90, description: 'Dinner', paid_by: 'u1', split_mode: 'equal' });

    // u2 settles their full debt of $30
    await request(app).post(`/api/groups/${groupId}/settlements`).set(headers)
      .send({ from: 'u2', to: 'u1', amount: 30 });

    const res = await request(app).get(`/api/groups/${groupId}/balances`).set(headers);
    expect(res.status).toBe(200);
    // u2 fully settled — net should be 0
    expect(res.body.net.u2).toBeCloseTo(0, 1);
    // u1 credit reduced by 30
    expect(res.body.net.u1).toBeCloseTo(30, 1);
    // u3 unchanged
    expect(res.body.net.u3).toBeCloseTo(-30, 1);
    // only 1 remaining settlement (u3 → u1)
    expect(res.body.settlements).toHaveLength(1);
    expect(res.body.settlements[0].from).toBe('u3');
    expect(res.body.settlements[0].to).toBe('u1');
  });
});
