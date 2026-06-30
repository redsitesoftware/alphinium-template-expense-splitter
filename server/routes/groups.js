const { Router } = require('express');
const store = require('../store');

const router = Router();

// POST /api/groups
// Body: { name: string, members: [{id, name}] }
// Returns 201 with the created group object
router.post('/', (req, res) => {
  const { name, members } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required and must be a non-empty string' });
  }

  const group = store.createGroup(name.trim(), members || []);
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

  const { amount, description, paid_by, split_mode, split_amounts } = req.body;

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

  const expense = store.addExpense(req.params.id, {
    amount,
    description: description.trim(),
    paid_by,
    split_mode,
    split_amounts: split_amounts || {},
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

module.exports = router;
