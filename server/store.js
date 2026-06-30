const { randomUUID } = require('crypto');

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
  const now = new Date().toISOString();
  const group = {
    id: randomUUID(),
    name,
    members: (members || []).map((m) => ({ ...m, joinedAt: now })),
    expenses: [],
    settlements: [],
    createdAt: now,
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
 * Add an expense to a group.
 * For 'equal' split_mode, auto-distributes amount evenly across group members.
 * For 'exact' and 'percent' modes, uses the caller-supplied split_amounts.
 * @param {string} groupId
 * @param {{ amount, description, paid_by, split_mode, split_amounts }} expense
 * @returns {object|undefined} saved expense or undefined if group not found
 */
function addExpense(groupId, expense) {
  const group = groups.get(groupId);
  if (!group) return undefined;

  let split_amounts = expense.split_amounts || {};

  if (expense.split_mode === 'equal') {
    const memberCount = group.members.length || 1;
    const share = Math.round((expense.amount / memberCount) * 100) / 100;
    split_amounts = {};
    group.members.forEach((member) => {
      split_amounts[member.id] = share;
    });
  }

  const saved = {
    id: randomUUID(),
    groupId,
    amount: expense.amount,
    description: expense.description,
    paid_by: expense.paid_by,
    split_mode: expense.split_mode,
    split_amounts,
    createdAt: new Date().toISOString(),
  };

  group.expenses.push(saved);
  return saved;
}

/**
 * Get all expenses for a group.
 * @param {string} groupId
 * @returns {Array|undefined} expenses array or undefined if group not found
 */
function getExpenses(groupId) {
  const group = groups.get(groupId);
  if (!group) return undefined;
  return group.expenses;
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
    group.members.push({ ...member, joinedAt: new Date().toISOString() });
  }
  return group;
}

/**
 * Add a settlement to a group.
 * @param {string} groupId
 * @param {{ from: string, to: string, amount: number }} settlement
 * @returns {object|undefined} saved settlement or undefined if group not found
 */
function addSettlement(groupId, { from, to, amount }) {
  const group = groups.get(groupId);
  if (!group) return undefined;
  const saved = {
    id: randomUUID(),
    groupId,
    from,
    to,
    amount,
    createdAt: new Date().toISOString(),
  };
  group.settlements.push(saved);
  return saved;
}

/**
 * Get a unified chronological activity feed for a group.
 * Merges expenses, settlements, and member join events sorted by createdAt ascending.
 * @param {string} groupId
 * @returns {Array|undefined} sorted events or undefined if group not found
 */
function getActivity(groupId) {
  const group = groups.get(groupId);
  if (!group) return undefined;

  const events = [];

  for (const expense of group.expenses) {
    events.push({
      type: 'expense',
      id: expense.id,
      actor: expense.paid_by,
      amount: expense.amount,
      description: expense.description,
      createdAt: expense.createdAt,
    });
  }

  for (const settlement of (group.settlements || [])) {
    events.push({
      type: 'settlement',
      id: settlement.id,
      actor: settlement.from,
      to: settlement.to,
      amount: settlement.amount,
      createdAt: settlement.createdAt,
    });
  }

  for (const member of group.members) {
    events.push({
      type: 'member_joined',
      actor: member.id,
      name: member.name,
      createdAt: member.joinedAt || group.createdAt,
    });
  }

  events.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return events;
}

/**
 * Reset all store data. Intended for use in tests only.
 */
function reset() {
  groups.clear();
  tokens.clear();
}

module.exports = {
  createGroup,
  getGroupsByUser,
  getGroupById,
  createInviteToken,
  getGroupByToken,
  addMemberToGroup,
  addExpense,
  getExpenses,
  addSettlement,
  getActivity,
  reset,
};
