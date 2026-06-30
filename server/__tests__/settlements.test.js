const request = require('supertest');
const app = require('../index');
const store = require('../store');

beforeEach(() => {
  store.reset();
});

describe('GET /api/groups/:id/settlements', () => {
  it('returns 400 when x-user-id header is missing', async () => {
    const group = store.createGroup('Test', [{ id: 'm1', name: 'Alice' }]);
    const res = await request(app).get(`/api/groups/${group.id}/settlements`);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 404 for unknown group', async () => {
    const res = await request(app)
      .get('/api/groups/unknown-id/settlements')
      .set('x-user-id', 'm1');
    expect(res.status).toBe(404);
  });

  it('returns empty array for a new group with no settlements', async () => {
    const group = store.createGroup('Empty', [{ id: 'm1', name: 'Alice' }]);
    const res = await request(app)
      .get(`/api/groups/${group.id}/settlements`)
      .set('x-user-id', 'm1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns settlements after POST', async () => {
    const group = store.createGroup('Group', [
      { id: 'm1', name: 'Alice' },
      { id: 'm2', name: 'Bob' },
    ]);

    await request(app)
      .post(`/api/groups/${group.id}/settlements`)
      .set('x-user-id', 'm1')
      .send({ from: 'm2', to: 'm1', amount: 50 });

    const res = await request(app)
      .get(`/api/groups/${group.id}/settlements`)
      .set('x-user-id', 'm1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ from: 'm2', to: 'm1', amount: 50 });
  });

  it('returns all settlements after multiple POSTs', async () => {
    const group = store.createGroup('Group', [
      { id: 'm1', name: 'Alice' },
      { id: 'm2', name: 'Bob' },
    ]);

    await request(app)
      .post(`/api/groups/${group.id}/settlements`)
      .set('x-user-id', 'm1')
      .send({ from: 'm2', to: 'm1', amount: 25 });

    await request(app)
      .post(`/api/groups/${group.id}/settlements`)
      .set('x-user-id', 'm1')
      .send({ from: 'm1', to: 'm2', amount: 10 });

    const res = await request(app)
      .get(`/api/groups/${group.id}/settlements`)
      .set('x-user-id', 'm1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('getSettlements store function', () => {
  it('returns undefined for non-existent group', () => {
    expect(store.getSettlements('no-such-id')).toBeUndefined();
  });

  it('returns empty array for new group', () => {
    const group = store.createGroup('G', []);
    expect(store.getSettlements(group.id)).toEqual([]);
  });

  it('returns added settlements', () => {
    const group = store.createGroup('G', [
      { id: 'm1', name: 'Alice' },
      { id: 'm2', name: 'Bob' },
    ]);
    store.addSettlement(group.id, { from: 'm2', to: 'm1', amount: 30 });
    const result = store.getSettlements(group.id);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ from: 'm2', to: 'm1', amount: 30 });
  });
});
