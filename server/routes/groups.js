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

module.exports = router;
