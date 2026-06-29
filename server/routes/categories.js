const { Router } = require('express');
const { CATEGORIES } = require('../store');

const router = Router();

// GET /api/categories
// Returns the static list of expense categories
router.get('/', (req, res) => {
  return res.status(200).json(CATEGORIES);
});

module.exports = router;
