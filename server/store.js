const { randomUUID } = require('crypto');

// Static categories list
const CATEGORIES = [
  { id: 'food', name: 'Food', emoji: '🍔' },
  { id: 'transport', name: 'Transport', emoji: '🚌' },
  { id: 'accommodation', name: 'Accommodation', emoji: '🏨' },
  { id: 'entertainment', name: 'Entertainment', emoji: '🎬' },
  { id: 'other', name: 'Other', emoji: '📦' },
];

const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));

// In-memory data store
const groups = new Map();
const tokens = new Map();

/**
 * Create a new group.
 * @param {string} name
 * @param {Array<{id: string, name: string}>} members
 * @returns {{ id: string, name: string, members: Array, expenses: Array, createdAt: string }}
 */
function createGroup(name, members) {
  const group = {
    id: randomUUID(),
    name,
    members: members || [],
    expenses: [],
    createdAt: new Date().toISOString(),
  };
  groups.set(group.id, group);
  return group;
}

/**
 * Return all groups that include a member with the given userId.
 * @param {string} userId
 * @returns {Array}
 */
function getGroupsByUser(userId) {
  return Array.from(groups.values()).filter((group) =>
    group.members.some((member) => member.id === userId)
  );
}

/**
 * Return a group by id.
 * @param {string} id
 * @returns {object|undefined}
 */
function getGroupById(id) {
  return groups.get(id);
}

/**
 * Create an invite token for a group.
 * @param {string} groupId
 * @returns {{ token: string, groupId: string, createdAt: string }}
 */
function createInviteToken(groupId) {
  const token = randomUUID();
  const entry = { token, groupId, createdAt: new Date().toISOString() };
  tokens.set(token, entry);
  return entry;
}

/**
 * Look up a group by invite token.
 * @param {string} token
 * @returns {object|undefined}
 */
function getGroupByToken(token) {
  const entry = tokens.get(token);
  if (!entry) return undefined;
  return groups.get(entry.groupId);
}

/**
 * Add a member to an existing group.
 * @param {string} groupId
 * @param {{ id: string, name: string }} member
 * @returns {object|undefined} updated group or undefined if not found
 */
function addMemberToGroup(groupId, member) {
  const group = groups.get(groupId);
  if (!group) return undefined;
  const already = group.members.some((m) => m.id === member.id);
  if (!already) {
    group.members.push(member);
  }
  return group;
}

/**
 * Reset all store data. Intended for use in tests only.
 */
function reset() {
  groups.clear();
  tokens.clear();
}

/**
 * Add an expense to a group.
 * @param {string} groupId
 * @param {{ description: string, amount: number, paid_by: string, category_id?: string }} expense
 * @returns {{ id: string, description: string, amount: number, paid_by: string, category_id: string|null, createdAt: string }|undefined}
 */
function addExpense(groupId, expense) {
  const group = groups.get(groupId);
  if (!group) return undefined;

  const entry = {
    id: randomUUID(),
    description: expense.description,
    amount: expense.amount,
    paid_by: expense.paid_by,
    category_id: expense.category_id || null,
    createdAt: new Date().toISOString(),
  };
  group.expenses.push(entry);
  return entry;
}

/**
 * Return total spend per category for a group.
 * @param {string} groupId
 * @returns {Object.<string, number>|undefined} e.g. { Food: 120.00, Transport: 45.00 }
 */
function getGroupSummaryByCategory(groupId) {
  const group = groups.get(groupId);
  if (!group) return undefined;

  const summary = {};
  for (const expense of group.expenses) {
    const category = CATEGORIES.find((c) => c.id === expense.category_id);
    const label = category ? category.name : 'Uncategorised';
    summary[label] = parseFloat(((summary[label] || 0) + expense.amount).toFixed(2));
  }
  return summary;
}

module.exports = {
  CATEGORIES,
  CATEGORY_IDS,
  createGroup,
  getGroupsByUser,
  getGroupById,
  createInviteToken,
  getGroupByToken,
  addMemberToGroup,
  addExpense,
  getGroupSummaryByCategory,
  reset,
};
