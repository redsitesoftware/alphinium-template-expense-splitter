const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const store = require('../store');

const router = Router();

const uploadsDir = path.join(__dirname, '../uploads/');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// POST /api/groups
// Body: { name: string, members: [{id, name}] }
// Returns 201 with the created group object
router.post('/', (req, res) => {
  const { name, members, baseCurrency } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required and must be a non-empty string' });
  }

  const group = store.createGroup(name.trim(), members || [], baseCurrency);
  return res.status(201).json(group);
});

// GET /api/groups/me
// Header: x-user-id
// Returns 200 with array of groups the user belongs to
router.get('/me', (req, res) => {
  const userId = req.headers['x-user-id'];

  if (!userId) {
    return res.status(400).json({ error: 'x-user-id header is required' });
  }

  const userGroups = store.getGroupsByUser(userId);
  return res.status(200).json(userGroups);
});

// POST /api/groups/:id/invite
// Returns 200 with { inviteUrl }
router.post('/:id/invite', (req, res) => {
  const group = store.getGroupById(req.params.id);

  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  const { token } = store.createInviteToken(group.id);
  const inviteUrl = `/api/groups/join/${token}`;
  return res.status(200).json({ inviteUrl });
});

// GET /api/groups/join/:token
// Optional headers: x-user-id, x-user-name (auto-joins if both present)
// Returns 200 with group preview or updated group; 404 if token not found
router.get('/join/:token', (req, res) => {
  const group = store.getGroupByToken(req.params.token);

  if (!group) {
    return res.status(404).json({ error: 'Invite token not found or expired' });
  }

  const userId = req.headers['x-user-id'];
  const userName = req.headers['x-user-name'];

  if (userId && userName) {
    const updated = store.addMemberToGroup(group.id, { id: userId, name: userName });
    return res.status(200).json(updated);
  }

  return res.status(200).json({
    id: group.id,
    name: group.name,
    memberCount: group.members.length,
  });
});

// POST /api/groups/:id/expenses
// Header: x-user-id (required)
// Body: { amount, description, paid_by, split_mode, split_amounts? }
// Returns 201 with saved expense; 400/404 on validation errors
router.post('/:id/expenses', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(400).json({ error: 'x-user-id header is required' });
  }

  const group = store.getGroupById(req.params.id);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  const { amount, description, paid_by, split_mode, split_amounts, category_id, currency } = req.body;

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }
  if (!description || typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ error: 'description must be a non-empty string' });
  }
  if (!paid_by || typeof paid_by !== 'string') {
    return res.status(400).json({ error: 'paid_by is required' });
  }
  const VALID_MODES = ['equal', 'exact', 'percent'];
  if (!VALID_MODES.includes(split_mode)) {
    return res.status(400).json({ error: `split_mode must be one of: ${VALID_MODES.join(', ')}` });
  }
  if ((split_mode === 'exact' || split_mode === 'percent') && (!split_amounts || typeof split_amounts !== 'object')) {
    return res.status(400).json({ error: 'split_amounts is required for exact and percent modes' });
  }
  if (category_id !== undefined && !store.isValidCategoryId(category_id)) {
    return res.status(400).json({ error: `category_id must be one of: ${['food','transport','accommodation','activities','other'].join(', ')}` });
  }

  const expense = store.addExpense(req.params.id, {
    amount,
    description: description.trim(),
    paid_by,
    split_mode,
    split_amounts: split_amounts || {},
    category_id: category_id || null,
    currency: currency || null,
  });

  return res.status(201).json(expense);
});

// GET /api/groups/:id/expenses
// Header: x-user-id (required)
// Returns 200 with expenses array; 400/404 on errors
router.get('/:id/expenses', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(400).json({ error: 'x-user-id header is required' });
  }

  const expenses = store.getExpenses(req.params.id);
  if (expenses === undefined) {
    return res.status(404).json({ error: 'Group not found' });
  }

  return res.status(200).json(expenses);
});

// POST /api/groups/:id/settlements
// Body: { from: string, to: string, amount: number }
// Header: x-user-id (required)
// Returns 201 with the created settlement; 400/404 on errors
router.post('/:id/settlements', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(400).json({ error: 'x-user-id header is required' });
  }

  const { from, to, amount } = req.body;

  if (!from || typeof from !== 'string') {
    return res.status(400).json({ error: 'from is required' });
  }
  if (!to || typeof to !== 'string') {
    return res.status(400).json({ error: 'to is required' });
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  const settlement = store.addSettlement(req.params.id, { from, to, amount });
  if (settlement === undefined) {
    return res.status(404).json({ error: 'Group not found' });
  }

  return res.status(201).json(settlement);
});

// GET /api/groups/:id/activity
// Header: x-user-id (required)
// Returns 200 with chronological unified event feed; 400/404 on errors
router.get('/:id/activity', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(400).json({ error: 'x-user-id header is required' });
  }

  const events = store.getActivity(req.params.id);
  if (events === undefined) {
    return res.status(404).json({ error: 'Group not found' });
  }

  return res.status(200).json(events);
});

// POST /api/groups/:groupId/expenses/:expenseId/receipt
// Multipart upload (field: receipt). x-user-id required.
// Returns 200 { receiptUrl }; 400/404 on errors.
router.post('/:groupId/expenses/:expenseId/receipt',
  (req, res, next) => {
    upload.single('receipt')(req, res, (err) => {
      if (err && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large (max 5MB)' });
      }
      if (err) return next(err);
      next();
    });
  },
  (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'x-user-id header is required' });
    }

    const { groupId, expenseId } = req.params;
    const group = store.getGroupById(groupId);
    if (!group) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: 'Group not found' });
    }

    const expense = group.expenses.find((e) => e.id === expenseId);
    if (!expense) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const mime = req.file.mimetype;
    if (mime !== 'image/jpeg' && mime !== 'image/png') {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Only JPEG and PNG images are accepted' });
    }

    const ext = mime === 'image/png' ? '.png' : '.jpg';
    const newFilename = `${req.file.filename}${ext}`;
    const newPath = path.join(path.dirname(req.file.path), newFilename);
    fs.renameSync(req.file.path, newPath);

    const receiptUrl = `/uploads/${newFilename}`;
    store.setExpenseReceipt(expenseId, groupId, receiptUrl);

    return res.status(200).json({ receiptUrl });
  }
);

// GET /api/groups/:id/balances
// Returns net balances per member and optimal settle-up list
router.get('/:id/balances', (req, res) => {
  if (!req.headers['x-user-id']) {
    return res.status(400).json({ error: 'x-user-id header is required' });
  }
  const result = store.getBalances(req.params.id);
  if (result === undefined) return res.status(404).json({ error: 'Group not found' });
  return res.status(200).json(result);
});

// GET /api/groups/:id/export?format=csv[&from=ISO&to=ISO]
// Returns CSV of expenses with optional date range filter
router.get('/:id/export', (req, res) => {
  if (!req.headers['x-user-id']) {
    return res.status(400).json({ error: 'x-user-id header is required' });
  }
  if (req.query.format !== 'csv') {
    return res.status(400).json({ error: "format query param must be 'csv'" });
  }
  const group = store.getGroupById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  let expenses = group.expenses;
  if (req.query.from) {
    const from = new Date(req.query.from);
    expenses = expenses.filter((e) => new Date(e.createdAt) >= from);
  }
  if (req.query.to) {
    const to = new Date(req.query.to);
    expenses = expenses.filter((e) => new Date(e.createdAt) <= to);
  }

  const rows = ['date,description,amount,paid_by,split_mode,split_details'];
  for (const e of expenses) {
    const splitDetails = Object.entries(e.split_amounts || {}).map(([k, v]) => `${k}:${v}`).join(' ');
    rows.push(`${e.createdAt},${e.description},${e.amount},${e.paid_by},${e.split_mode},"${splitDetails}"`);
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="expenses-${req.params.id}.csv"`);
  return res.status(200).send(rows.join('\n'));
});

// GET /api/groups/:id/summary?by=category
router.get('/:id/summary', (req, res) => {
  if (!req.headers['x-user-id']) {
    return res.status(400).json({ error: 'x-user-id header is required' });
  }
  if (req.query.by !== 'category') {
    return res.status(400).json({ error: "by query param must be 'category'" });
  }
  const totals = store.getCategorySummary(req.params.id);
  if (totals === undefined) return res.status(404).json({ error: 'Group not found' });
  return res.status(200).json(totals);
});

module.exports = router;
