const { randomUUID } = require('crypto');

// In-memory data store
const groups = new Map();
const tokens = new Map();

// ── FX Rate Cache ─────────────────────────────────────────────────────────────
let _fxCache = { base: 'USD', rates: {}, updatedAt: 0 };
const FX_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch (or return cached) FX rates from open.er-api.com.
 * Falls back to an empty rates object (1:1) if the request fails.
 * @returns {{ base: string, rates: object, updatedAt: number }}
 */
async function fetchFxRates() {
  const now = Date.now();
  if (_fxCache.updatedAt && now - _fxCache.updatedAt < FX_CACHE_TTL) {
    return _fxCache;
  }
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    _fxCache = { base: 'USD', rates: data.rates || {}, updatedAt: now };
  } catch {
    if (!_fxCache.updatedAt) {
      _fxCache = { base: 'USD', rates: {}, updatedAt: now };
    }
  }
  return _fxCache;
}

/** @internal — for test use only */
function _setFxCache(cache) {
  _fxCache = cache;
}

/**
 * Create a new group.
 * @param {string} name
 * @param {Array<{id: string, name: string}>} members
 * @param {string} [baseCurrency='USD']
 * @returns {{ id: string, name: string, members: Array, expenses: Array, createdAt: string }}
 */
function createGroup(name, members, baseCurrency) {
  const now = new Date().toISOString();
  const group = {
    id: randomUUID(),
    name,
    members: (members || []).map((m) => ({ ...m, joinedAt: now })),
    expenses: [],
    settlements: [],
    baseCurrency: (typeof baseCurrency === 'string' && baseCurrency.trim()) ? baseCurrency.trim().toUpperCase() : 'USD',
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
 * Stores the original currency and convertedAmount (in group's baseCurrency).
 * @param {string} groupId
 * @param {{ amount, description, paid_by, split_mode, split_amounts, currency?, category_id? }} expense
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

  const currency = (expense.currency || group.baseCurrency || 'USD').toUpperCase();
  const baseCurrency = (group.baseCurrency || 'USD').toUpperCase();

  let convertedAmount = expense.amount;
  if (currency !== baseCurrency) {
    const rates = _fxCache.rates;
    // Rates are USD-based: rates[X] = units of X per 1 USD
    // To convert: amount_currency → USD → baseCurrency
    const toUSD = currency === 'USD' ? 1 : (rates[currency] ? 1 / rates[currency] : 1);
    const fromUSD = baseCurrency === 'USD' ? 1 : (rates[baseCurrency] || 1);
    convertedAmount = Math.round(expense.amount * toUSD * fromUSD * 100) / 100;
  }

  const saved = {
    id: randomUUID(),
    groupId,
    amount: expense.amount,
    description: expense.description,
    paid_by: expense.paid_by,
    split_mode: expense.split_mode,
    split_amounts,
    category_id: expense.category_id || null,
    currency,
    originalAmount: currency !== baseCurrency ? expense.amount : null,
    convertedAmount,
    receiptUrl: null,
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
 * Set the receipt URL on an expense.
 * @param {string} expenseId
 * @param {string} groupId
 * @param {string} url
 * @returns {object|undefined} updated expense or undefined if not found
 */
function setExpenseReceipt(expenseId, groupId, url) {
  const group = groups.get(groupId);
  if (!group) return undefined;
  const expense = group.expenses.find((e) => e.id === expenseId);
  if (!expense) return undefined;
  expense.receiptUrl = url;
  return expense;
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
 * Get all settlements for a group.
 * @param {string} groupId
 * @returns {Array|undefined} settlements array or undefined if group not found
 */
function getSettlements(groupId) {
  const group = groups.get(groupId);
  if (!group) return undefined;
  return group.settlements;
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

// ── Categories ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'food',          name: 'Food & Drink',    emoji: '🍔' },
  { id: 'transport',     name: 'Transport',        emoji: '🚗' },
  { id: 'accommodation', name: 'Accommodation',    emoji: '🏨' },
  { id: 'activities',    name: 'Activities',       emoji: '🎉' },
  { id: 'other',         name: 'Other',            emoji: '📦' },
];
const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));

function getCategories() {
  return CATEGORIES;
}

function isValidCategoryId(id) {
  return CATEGORY_IDS.has(id);
}

function getCategorySummary(groupId) {
  const group = groups.get(groupId);
  if (!group) return undefined;
  const totals = {};
  for (const expense of group.expenses) {
    const key = expense.category_id || 'other';
    totals[key] = Math.round(((totals[key] || 0) + expense.amount) * 100) / 100;
  }
  return totals;
}

// ── Balances ──────────────────────────────────────────────────────────────────
function round2(n) { return Math.round(n * 100) / 100; }

function getBalances(groupId) {
  const group = groups.get(groupId);
  if (!group) return undefined;

  const net = {};
  group.members.forEach((m) => { net[m.id] = 0; });
  group.expenses.forEach((expense) => {
    const amount = expense.convertedAmount ?? expense.amount;
    // Scale split_amounts by the same conversion ratio so debts balance correctly
    const scaleFactor = expense.amount > 0 ? amount / expense.amount : 1;
    net[expense.paid_by] = round2((net[expense.paid_by] || 0) + amount);
    Object.entries(expense.split_amounts || {}).forEach(([memberId, share]) => {
      net[memberId] = round2((net[memberId] || 0) - round2(share * scaleFactor));
    });
  });

  // Deduct recorded settlements: payer's debt decreases, payee's credit decreases
  (group.settlements || []).forEach((settlement) => {
    net[settlement.from] = round2((net[settlement.from] || 0) + settlement.amount);
    net[settlement.to]   = round2((net[settlement.to]   || 0) - settlement.amount);
  });

  const creditors = Object.entries(net)
    .filter(([, v]) => v > 0.009)
    .map(([id, amount]) => ({ id, amount: round2(amount) }))
    .sort((a, b) => b.amount - a.amount);
  const debtors = Object.entries(net)
    .filter(([, v]) => v < -0.009)
    .map(([id, amount]) => ({ id, amount: round2(-amount) }))
    .sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let ci = 0; let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const amount = round2(Math.min(creditors[ci].amount, debtors[di].amount));
    settlements.push({ from: debtors[di].id, to: creditors[ci].id, amount });
    creditors[ci].amount = round2(creditors[ci].amount - amount);
    debtors[di].amount = round2(debtors[di].amount - amount);
    if (creditors[ci].amount < 0.009) ci++;
    if (debtors[di].amount < 0.009) di++;
  }

  return { net, settlements };
}

/**
 * Reset all store data. Intended for use in tests only.
 */
function reset() {
  groups.clear();
  tokens.clear();
}

/**
 * Seed the store with demo groups matching the frontend seed data.
 * Uses the same hardcoded IDs (g1, g2, g3) so the activity endpoint resolves correctly.
 * Only seeds if the store is empty (idempotent on server restart).
 */
function seedDemoData() {
  if (groups.size > 0) return;

  const now = Date.now();
  const ts = (daysAgo, hoursOffset = 0) =>
    new Date(now - daysAgo * 86400000 - hoursOffset * 3600000).toISOString();

  // Group g1 — Bali Trip
  groups.set('g1', {
    id: 'g1',
    name: 'Bali Trip',
    baseCurrency: 'USD',
    members: [
      { id: 'm1', name: 'You', joinedAt: ts(10) },
      { id: 'm2', name: 'Sarah', joinedAt: ts(10) },
      { id: 'm3', name: 'Marcus', joinedAt: ts(10) },
      { id: 'm4', name: 'Priya', joinedAt: ts(10) },
    ],
    expenses: [
      { id: 'e1', groupId: 'g1', amount: 1240, description: 'Villa Airbnb (3 nights)', paid_by: 'm1', split_mode: 'equal', split_amounts: { m1: 310, m2: 310, m3: 310, m4: 310 }, createdAt: ts(3) },
      { id: 'e2', groupId: 'g1', amount: 180, description: 'Scooter rentals', paid_by: 'm2', split_mode: 'equal', split_amounts: { m1: 60, m2: 60, m3: 60 }, createdAt: ts(2) },
      { id: 'e3', groupId: 'g1', amount: 86, description: 'Warung dinner', paid_by: 'm3', split_mode: 'equal', split_amounts: { m1: 21.5, m2: 21.5, m3: 21.5, m4: 21.5 }, createdAt: ts(1) },
      { id: 'e4', groupId: 'g1', amount: 320, description: 'Snorkelling tour', paid_by: 'm1', split_mode: 'equal', split_amounts: { m1: 80, m2: 80, m3: 80, m4: 80 }, createdAt: ts(0, 8) },
      { id: 'e5', groupId: 'g1', amount: 45, description: 'Airport taxi', paid_by: 'm4', split_mode: 'equal', split_amounts: { m2: 15, m3: 15, m4: 15 }, createdAt: ts(0, 4) },
    ],
    settlements: [
      { id: 's1', groupId: 'g1', from: 'm2', to: 'm1', amount: 310, createdAt: ts(0, 2) },
    ],
    createdAt: ts(10),
  });

  // Group g2 — Flat Share
  groups.set('g2', {
    id: 'g2',
    name: 'Flat Share - June',
    baseCurrency: 'USD',
    members: [
      { id: 'm1', name: 'You', joinedAt: ts(14) },
      { id: 'm5', name: 'James', joinedAt: ts(14) },
      { id: 'm6', name: 'Lily', joinedAt: ts(14) },
    ],
    expenses: [
      { id: 'e6', groupId: 'g2', amount: 210, description: 'Electricity bill', paid_by: 'm1', split_mode: 'equal', split_amounts: { m1: 70, m5: 70, m6: 70 }, createdAt: ts(7) },
      { id: 'e7', groupId: 'g2', amount: 89, description: 'Internet', paid_by: 'm5', split_mode: 'equal', split_amounts: { m1: 44.5, m5: 44.5 }, createdAt: ts(7, 2) },
      { id: 'e8', groupId: 'g2', amount: 47, description: 'Cleaning supplies', paid_by: 'm6', split_mode: 'equal', split_amounts: { m1: 23.5, m6: 23.5 }, createdAt: ts(3) },
      { id: 'e9', groupId: 'g2', amount: 124, description: 'Shared groceries', paid_by: 'm1', split_mode: 'equal', split_amounts: { m1: 41.33, m5: 41.33, m6: 41.34 }, createdAt: ts(1) },
    ],
    settlements: [
      { id: 's2', groupId: 'g2', from: 'm5', to: 'm1', amount: 70, createdAt: ts(0, 6) },
    ],
    createdAt: ts(14),
  });

  // Group g3 — Birthday Dinner
  groups.set('g3', {
    id: 'g3',
    name: "Tom's Birthday Dinner",
    baseCurrency: 'USD',
    members: [
      { id: 'm1', name: 'You', joinedAt: ts(7) },
      { id: 'm7', name: 'Tom', joinedAt: ts(7) },
      { id: 'm8', name: 'Anna', joinedAt: ts(7) },
      { id: 'm9', name: 'Chris', joinedAt: ts(7) },
      { id: 'm10', name: 'Nina', joinedAt: ts(7) },
    ],
    expenses: [
      { id: 'e10', groupId: 'g3', amount: 380, description: 'Restaurant bill', paid_by: 'm1', split_mode: 'equal', split_amounts: { m1: 76, m7: 76, m8: 76, m9: 76, m10: 76 }, createdAt: ts(7) },
      { id: 'e11', groupId: 'g3', amount: 65, description: 'Birthday cake', paid_by: 'm8', split_mode: 'equal', split_amounts: { m8: 65 }, createdAt: ts(7, 1) },
      { id: 'e12', groupId: 'g3', amount: 145, description: 'Wine & cocktails', paid_by: 'm9', split_mode: 'equal', split_amounts: { m9: 145 }, createdAt: ts(6, 20) },
    ],
    settlements: [
      { id: 's3', groupId: 'g3', from: 'm7', to: 'm1', amount: 76, createdAt: ts(6) },
    ],
    createdAt: ts(7),
  });
}

// Seed demo data on module load (skipped in test environments)
if (process.env.NODE_ENV !== 'test') {
  seedDemoData();
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
  setExpenseReceipt,
  addSettlement,
  getSettlements,
  getActivity,
  getCategories,
  isValidCategoryId,
  getCategorySummary,
  getBalances,
  fetchFxRates,
  _setFxCache,
  reset,
};
