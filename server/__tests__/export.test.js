const request = require('supertest');
const app = require('../index');
const store = require('../store');

beforeEach(() => store.reset());

describe('GET /api/groups/:id/export', () => {
  let groupId;
  const headers = { 'x-user-id': 'u1' };

  beforeEach(async () => {
    const g = await request(app)
      .post('/api/groups')
      .send({ name: 'Trip', members: [{ id: 'u1', name: 'Alice' }, { id: 'u2', name: 'Bob' }] });
    groupId = g.body.id;
  });

  it('returns 400 when x-user-id missing', async () => {
    const res = await request(app).get(`/api/groups/${groupId}/export?format=csv`);
    expect(res.status).toBe(400);
  });

  it('returns 400 when format is missing', async () => {
    const res = await request(app).get(`/api/groups/${groupId}/export`).set(headers);
    expect(res.status).toBe(400);
  });

  it('returns 400 when format is not csv', async () => {
    const res = await request(app).get(`/api/groups/${groupId}/export?format=json`).set(headers);
    expect(res.status).toBe(400);
  });

  it('returns 404 when group not found', async () => {
    const res = await request(app).get('/api/groups/no-such/export?format=csv').set(headers);
    expect(res.status).toBe(404);
  });

  it('returns correct Content-Type and Content-Disposition', async () => {
    const res = await request(app).get(`/api/groups/${groupId}/export?format=csv`).set(headers);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(res.headers['content-disposition']).toMatch(groupId);
  });

  it('returns header row only for empty group', async () => {
    const res = await request(app).get(`/api/groups/${groupId}/export?format=csv`).set(headers);
    expect(res.status).toBe(200);
    const lines = res.text.trim().split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('date,description,amount,paid_by,split_mode,split_details');
  });

  it('returns all expenses as CSV rows', async () => {
    await request(app).post(`/api/groups/${groupId}/expenses`).set(headers)
      .send({ amount: 50, description: 'Dinner', paid_by: 'u1', split_mode: 'equal' });
    await request(app).post(`/api/groups/${groupId}/expenses`).set(headers)
      .send({ amount: 30, description: 'Taxi', paid_by: 'u2', split_mode: 'equal' });

    const res = await request(app).get(`/api/groups/${groupId}/export?format=csv`).set(headers);
    const lines = res.text.trim().split('\n');
    expect(lines).toHaveLength(3); // header + 2 rows
    expect(lines[1]).toContain('Dinner');
    expect(lines[2]).toContain('Taxi');
  });

  it('applies from/to date filters', async () => {
    await request(app).post(`/api/groups/${groupId}/expenses`).set(headers)
      .send({ amount: 50, description: 'Old expense', paid_by: 'u1', split_mode: 'equal' });

    // Expense is just created; filter to yesterday should exclude it
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const tomorrow = new Date(Date.now() - 1000).toISOString(); // 1 second ago
    const res = await request(app)
      .get(`/api/groups/${groupId}/export?format=csv&from=${yesterday}&to=${tomorrow}`)
      .set(headers);
    const lines = res.text.trim().split('\n');
    // The expense was created after "tomorrow" (1s ago) so it should be excluded
    expect(lines).toHaveLength(1); // header only
  });
});
