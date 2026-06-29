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

module.exports = {
  createGroup,
  getGroupsByUser,
  getGroupById,
  createInviteToken,
  getGroupByToken,
  addMemberToGroup,
};
