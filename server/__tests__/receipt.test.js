const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../index');
const store = require('../store');

beforeEach(() => store.reset());

afterAll(() => {
  // Clean up any uploaded files created during tests
  const uploadsDir = path.join(__dirname, '../uploads');
  if (fs.existsSync(uploadsDir)) {
    fs.readdirSync(uploadsDir).forEach((file) => {
      if (file !== '.gitkeep') {
        try { fs.unlinkSync(path.join(uploadsDir, file)); } catch { /* ignore */ }
      }
    });
  }
});

function makeGroup() {
  return store.createGroup('Test Group', [{ id: 'u1', name: 'Alice' }]);
}

function makeExpense(groupId) {
  return store.addExpense(groupId, {
    amount: 50,
    description: 'Dinner',
    paid_by: 'u1',
    split_mode: 'equal',
  });
}

const jpegFixture = path.join(__dirname, 'fixtures/test.jpg');
const pngFixture = path.join(__dirname, 'fixtures/test.png');
const txtFixture = path.join(__dirname, 'fixtures/test.txt');

beforeAll(() => {
  // Create minimal fixture files for testing
  const fixturesDir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(fixturesDir)) fs.mkdirSync(fixturesDir);
  // Minimal valid JPEG (SOI + EOI markers)
  if (!fs.existsSync(jpegFixture)) fs.writeFileSync(jpegFixture, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  // Minimal valid PNG header
  if (!fs.existsSync(pngFixture)) fs.writeFileSync(pngFixture, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (!fs.existsSync(txtFixture)) fs.writeFileSync(txtFixture, 'not an image');
});

describe('POST /api/groups/:groupId/expenses/:expenseId/receipt', () => {
  it('returns 400 when x-user-id header is missing', async () => {
    const group = makeGroup();
    const expense = makeExpense(group.id);
    const res = await request(app)
      .post(`/api/groups/${group.id}/expenses/${expense.id}/receipt`)
      .attach('receipt', jpegFixture);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/x-user-id/i);
  });

  it('returns 404 when group not found', async () => {
    const group = makeGroup();
    const expense = makeExpense(group.id);
    const res = await request(app)
      .post(`/api/groups/nonexistent/expenses/${expense.id}/receipt`)
      .set('x-user-id', 'u1')
      .attach('receipt', jpegFixture);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/group/i);
  });

  it('returns 404 when expense not found', async () => {
    const group = makeGroup();
    const res = await request(app)
      .post(`/api/groups/${group.id}/expenses/nonexistent/receipt`)
      .set('x-user-id', 'u1')
      .attach('receipt', jpegFixture);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/expense/i);
  });

  it('returns 400 when file type is not jpeg or png', async () => {
    const group = makeGroup();
    const expense = makeExpense(group.id);
    const res = await request(app)
      .post(`/api/groups/${group.id}/expenses/${expense.id}/receipt`)
      .set('x-user-id', 'u1')
      .attach('receipt', txtFixture, { contentType: 'text/plain' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/jpeg|png/i);
  });

  it('returns 200 with receiptUrl for a valid JPEG upload', async () => {
    const group = makeGroup();
    const expense = makeExpense(group.id);
    const res = await request(app)
      .post(`/api/groups/${group.id}/expenses/${expense.id}/receipt`)
      .set('x-user-id', 'u1')
      .attach('receipt', jpegFixture, { contentType: 'image/jpeg' });
    expect(res.status).toBe(200);
    expect(res.body.receiptUrl).toMatch(/^\/uploads\/.+\.jpg$/);
  });

  it('returns 200 with receiptUrl for a valid PNG upload', async () => {
    const group = makeGroup();
    const expense = makeExpense(group.id);
    const res = await request(app)
      .post(`/api/groups/${group.id}/expenses/${expense.id}/receipt`)
      .set('x-user-id', 'u1')
      .attach('receipt', pngFixture, { contentType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body.receiptUrl).toMatch(/^\/uploads\/.+\.png$/);
  });

  it('updates expense receiptUrl in store after successful upload', async () => {
    const group = makeGroup();
    const expense = makeExpense(group.id);
    await request(app)
      .post(`/api/groups/${group.id}/expenses/${expense.id}/receipt`)
      .set('x-user-id', 'u1')
      .attach('receipt', jpegFixture, { contentType: 'image/jpeg' });
    const updated = store.getExpenses(group.id).find((e) => e.id === expense.id);
    expect(updated.receiptUrl).toMatch(/^\/uploads\//);
  });
});

describe('store.setExpenseReceipt', () => {
  it('returns undefined when group not found', () => {
    expect(store.setExpenseReceipt('e1', 'nope', '/uploads/x.jpg')).toBeUndefined();
  });

  it('returns undefined when expense not found', () => {
    const group = makeGroup();
    expect(store.setExpenseReceipt('nope', group.id, '/uploads/x.jpg')).toBeUndefined();
  });

  it('sets receiptUrl on the expense', () => {
    const group = makeGroup();
    const expense = makeExpense(group.id);
    const updated = store.setExpenseReceipt(expense.id, group.id, '/uploads/test.jpg');
    expect(updated.receiptUrl).toBe('/uploads/test.jpg');
  });
});
