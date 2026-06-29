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
// Body: { description: string, amount: number, paid_by: string, category_id?: string }
// Returns 201 with the expense object; 400 if unknown category_id
router.post('/:id/expenses', (req, res) => {
  const group = store.getGroupById(req.params.id);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  const { description, amount, paid_by, category_id } = req.body;

  if (!description || typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ error: 'description is required' });
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }
  if (!paid_by || typeof paid_by !== 'string') {
    return res.status(400).json({ error: 'paid_by is required' });
  }
  if (category_id !== undefined && !store.CATEGORY_IDS.has(category_id)) {
    return res.status(400).json({ error: `Unknown category_id '${category_id}'. Valid values: ${[...store.CATEGORY_IDS].join(', ')}` });
  }

  const expense = store.addExpense(group.id, { description: description.trim(), amount, paid_by, category_id });
  return res.status(201).json(expense);
});

// GET /api/groups/:id/summary?by=category
// Returns total spend per category for a group
router.get('/:id/summary', (req, res) => {
  const group = store.getGroupById(req.params.id);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  if (req.query.by === 'category') {
    const summary = store.getGroupSummaryByCategory(group.id);
    return res.status(200).json(summary);
  }

  return res.status(400).json({ error: "Unsupported summary type. Use ?by=category" });
});

module.exports = router;

