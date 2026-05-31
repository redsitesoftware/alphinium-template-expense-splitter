import React, { createContext, useContext, useMemo, useReducer } from 'react';

const SplitContext = createContext(null);

const initialNewExpense = {
  description: '',
  amount: '',
  paidBy: 'me',
  splitWith: [],
  splitType: 'equal',
  customSplit: {},
};

const seededGroups = [
  {
    id: 'g1',
    name: 'Bali Trip',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
    members: [
      { id: 'm1', name: 'You', initial: 'Y', color: '#6366F1' },
      { id: 'm2', name: 'Sarah', initial: 'S', color: '#EC4899' },
      { id: 'm3', name: 'Marcus', initial: 'M', color: '#F59E0B' },
      { id: 'm4', name: 'Priya', initial: 'P', color: '#10B981' },
    ],
    expenses: [
      {
        id: 'e1',
        desc: 'Villa Airbnb (3 nights)',
        amount: 1240,
        paidBy: 'm1',
        date: '3 days ago',
        split: 'equal',
        splitWith: ['m1', 'm2', 'm3', 'm4'],
        shares: { m1: 981.75, m2: 160, m3: 60, m4: 38.25 },
      },
      {
        id: 'e2',
        desc: 'Scooter rentals',
        amount: 180,
        paidBy: 'm2',
        date: '2 days ago',
        split: 'equal',
        splitWith: ['m1', 'm2', 'm3'],
        shares: { m1: 80, m2: 60, m3: 40 },
      },
      {
        id: 'e3',
        desc: 'Warung dinner',
        amount: 86,
        paidBy: 'm3',
        date: 'yesterday',
        split: 'equal',
        splitWith: ['m1', 'm2', 'm3', 'm4'],
        shares: { m1: 26, m2: 20, m3: 20, m4: 20 },
      },
      {
        id: 'e4',
        desc: 'Snorkelling tour',
        amount: 320,
        paidBy: 'm1',
        date: 'today',
        split: 'equal',
        splitWith: ['m1', 'm2', 'm3', 'm4'],
        shares: { m1: 160, m2: 63.25, m3: 42.75, m4: 54 },
      },
      {
        id: 'e5',
        desc: 'Airport taxi',
        amount: 45,
        paidBy: 'm4',
        date: 'today',
        split: 'equal',
        splitWith: ['m2', 'm3', 'm4'],
        shares: { m2: 20, m3: 10, m4: 15 },
      },
    ],
  },
  {
    id: 'g2',
    name: 'Flat Share - June',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
    members: [
      { id: 'm1', name: 'You', initial: 'Y', color: '#6366F1' },
      { id: 'm5', name: 'James', initial: 'J', color: '#0EA5E9' },
      { id: 'm6', name: 'Lily', initial: 'L', color: '#F43F5E' },
    ],
    expenses: [
      {
        id: 'e6',
        desc: 'Electricity bill',
        amount: 210,
        paidBy: 'm1',
        date: '1 week ago',
        split: 'equal',
        splitWith: ['m1', 'm5', 'm6'],
        shares: { m1: 170, m5: 20, m6: 20 },
      },
      {
        id: 'e7',
        desc: 'Internet',
        amount: 89,
        paidBy: 'm5',
        date: '1 week ago',
        split: 'equal',
        splitWith: ['m1', 'm5'],
        shares: { m1: 64, m5: 25 },
      },
      {
        id: 'e8',
        desc: 'Cleaning supplies',
        amount: 47,
        paidBy: 'm6',
        date: '3 days ago',
        split: 'equal',
        splitWith: ['m1', 'm6'],
        shares: { m1: 40, m6: 7 },
      },
      {
        id: 'e9',
        desc: 'Shared groceries',
        amount: 124,
        paidBy: 'm1',
        date: 'yesterday',
        split: 'equal',
        splitWith: ['m1', 'm5', 'm6'],
        shares: { m1: 60, m5: 44, m6: 20 },
      },
    ],
  },
  {
    id: 'g3',
    name: "Tom's Birthday Dinner",
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    members: [
      { id: 'm1', name: 'You', initial: 'Y', color: '#6366F1' },
      { id: 'm7', name: 'Tom', initial: 'T', color: '#F59E0B' },
      { id: 'm8', name: 'Anna', initial: 'A', color: '#EC4899' },
      { id: 'm9', name: 'Chris', initial: 'C', color: '#10B981' },
      { id: 'm10', name: 'Nina', initial: 'N', color: '#8B5CF6' },
    ],
    expenses: [
      {
        id: 'e10',
        desc: 'Restaurant bill',
        amount: 380,
        paidBy: 'm1',
        date: 'last Friday',
        split: 'equal',
        splitWith: ['m1'],
        shares: { m1: 380 },
      },
      {
        id: 'e11',
        desc: 'Birthday cake',
        amount: 65,
        paidBy: 'm8',
        date: 'last Friday',
        split: 'equal',
        splitWith: ['m8'],
        shares: { m8: 65 },
      },
      {
        id: 'e12',
        desc: 'Wine & cocktails',
        amount: 145,
        paidBy: 'm9',
        date: 'last Friday',
        split: 'equal',
        splitWith: ['m9'],
        shares: { m9: 145 },
      },
    ],
  },
];

const initialState = {
  phase: 'home',
  selectedGroup: null,
  addExpenseStep: 0,
  newExpense: initialNewExpense,
  settleMode: false,
  groups: seededGroups,
  flashMessage: '',
};

function cents(value) {
  return Math.round(Number(value || 0) * 100);
}

function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function formatCurrency(value) {
  return `$${roundCurrency(value).toFixed(2)}`;
}

function formatSignedCurrency(value) {
  const amount = roundCurrency(value);
  const prefix = amount > 0 ? '+' : amount < 0 ? '-' : '';
  return `${prefix}${formatCurrency(Math.abs(amount))}`;
}

function resolveMemberId(group, memberId) {
  if (memberId === 'me') {
    return group.members[0]?.id;
  }
  return memberId;
}

function splitEvenly(totalAmount, memberIds) {
  const totalCents = cents(totalAmount);
  const ids = memberIds.length ? memberIds : [];
  const base = ids.length ? Math.floor(totalCents / ids.length) : 0;
  let remainder = ids.length ? totalCents - base * ids.length : 0;
  return ids.reduce((acc, memberId) => {
    acc[memberId] = (base + (remainder > 0 ? 1 : 0)) / 100;
    remainder = Math.max(0, remainder - 1);
    return acc;
  }, {});
}

function normalizeShareMap(shareMap) {
  return Object.entries(shareMap || {}).reduce((acc, [memberId, value]) => {
    const amount = roundCurrency(Number(value || 0));
    if (amount > 0) {
      acc[memberId] = amount;
    }
    return acc;
  }, {});
}

function getExpenseShares(expense, group) {
  if (expense.shares) {
    return normalizeShareMap(expense.shares);
  }

  const memberIds = group.members.map((member) => member.id);
  const participants = (expense.splitWith?.length ? expense.splitWith : memberIds).map((id) => resolveMemberId(group, id));
  const splitType = expense.splitType || expense.split || 'equal';
  const amount = Number(expense.amount || 0);

  if (splitType === 'amount') {
    return normalizeShareMap(expense.customSplit);
  }

  if (splitType === '%') {
    const percentages = normalizeShareMap(expense.customSplit);
    const calculated = {};
    let allocated = 0;
    participants.forEach((memberId, index) => {
      const percentage = Number(percentages[memberId] || 0);
      const value = index === participants.length - 1 ? roundCurrency(amount - allocated) : roundCurrency((amount * percentage) / 100);
      calculated[memberId] = value;
      allocated = roundCurrency(allocated + value);
    });
    return calculated;
  }

  return splitEvenly(amount, participants);
}

function calculateGroupBalances(group) {
  const net = group.members.reduce((acc, member) => {
    acc[member.id] = 0;
    return acc;
  }, {});

  group.expenses.forEach((expense) => {
    const payerId = resolveMemberId(group, expense.paidBy);
    net[payerId] = roundCurrency((net[payerId] || 0) + Number(expense.amount || 0));

    const shares = getExpenseShares(expense, group);
    Object.entries(shares).forEach(([memberId, shareAmount]) => {
      net[memberId] = roundCurrency((net[memberId] || 0) - Number(shareAmount || 0));
    });
  });

  const creditors = Object.entries(net)
    .filter(([, amount]) => amount > 0.009)
    .map(([memberId, amount]) => ({ memberId, amount: roundCurrency(amount) }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = Object.entries(net)
    .filter(([, amount]) => amount < -0.009)
    .map(([memberId, amount]) => ({ memberId, amount: roundCurrency(Math.abs(amount)) }))
    .sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amount = roundCurrency(Math.min(creditor.amount, debtor.amount));

    settlements.push({ from: debtor.memberId, to: creditor.memberId, amount });
    creditor.amount = roundCurrency(creditor.amount - amount);
    debtor.amount = roundCurrency(debtor.amount - amount);

    if (creditor.amount <= 0.009) creditorIndex += 1;
    if (debtor.amount <= 0.009) debtorIndex += 1;
  }

  const totalExpenses = roundCurrency(group.expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0));
  const yourBalance = roundCurrency(net[group.members[0]?.id] || 0);

  return {
    net,
    settlements,
    totalExpenses,
    yourBalance,
  };
}

function getSplitLabel(expense, group) {
  const splitType = expense.splitType || expense.split || 'equal';
  if (splitType === 'amount') {
    return 'custom amounts';
  }
  if (splitType === '%') {
    return 'custom percentages';
  }
  const count = (expense.splitWith?.length || group.members.length);
  return `÷ ${count} equally`;
}

function createExpenseFromDraft(group, draft) {
  const amount = roundCurrency(Number(draft.amount || 0));
  const paidBy = resolveMemberId(group, draft.paidBy);
  const splitWith = (draft.splitWith.length ? draft.splitWith : group.members.map((member) => member.id)).map((id) => resolveMemberId(group, id));
  const splitType = draft.splitType || 'equal';
  let shares;

  if (splitType === 'amount') {
    shares = normalizeShareMap(draft.customSplit);
  } else if (splitType === '%') {
    shares = {};
    let allocated = 0;
    splitWith.forEach((memberId, index) => {
      const percentage = Number(draft.customSplit?.[memberId] || 0);
      const shareAmount = index === splitWith.length - 1 ? roundCurrency(amount - allocated) : roundCurrency((amount * percentage) / 100);
      shares[memberId] = shareAmount;
      allocated = roundCurrency(allocated + shareAmount);
    });
  } else {
    shares = splitEvenly(amount, splitWith);
  }

  return {
    id: `e${Date.now()}`,
    desc: draft.description.trim(),
    amount,
    paidBy,
    date: 'just now',
    split: splitType,
    splitType,
    splitWith,
    shares,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'OPEN_GROUP':
      return {
        ...state,
        phase: 'group',
        selectedGroup: action.groupId,
        settleMode: false,
        flashMessage: '',
      };
    case 'GO_HOME':
      return {
        ...state,
        phase: 'home',
        settleMode: false,
        addExpenseStep: 0,
        newExpense: initialNewExpense,
      };
    case 'OPEN_ADD_EXPENSE':
      return {
        ...state,
        phase: 'add-expense',
        selectedGroup: action.groupId,
        addExpenseStep: 0,
        settleMode: false,
        newExpense: {
          ...initialNewExpense,
          splitWith: action.memberIds || [],
        },
      };
    case 'OPEN_SETTLE':
      return {
        ...state,
        phase: 'settle',
        selectedGroup: action.groupId,
        settleMode: true,
      };
    case 'SET_ADD_EXPENSE_STEP':
      return {
        ...state,
        addExpenseStep: action.step,
      };
    case 'UPDATE_NEW_EXPENSE':
      return {
        ...state,
        newExpense: {
          ...state.newExpense,
          ...action.payload,
        },
      };
    case 'TOGGLE_SPLIT_MEMBER': {
      const memberId = action.memberId;
      const current = state.newExpense.splitWith;
      const next = current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId];
      return {
        ...state,
        newExpense: {
          ...state.newExpense,
          splitWith: next,
        },
      };
    }
    case 'UPDATE_CUSTOM_SPLIT':
      return {
        ...state,
        newExpense: {
          ...state.newExpense,
          customSplit: {
            ...state.newExpense.customSplit,
            [action.memberId]: action.value,
          },
        },
      };
    case 'ADD_EXPENSE': {
      const group = state.groups.find((item) => item.id === state.selectedGroup);
      if (!group) return state;
      const expense = createExpenseFromDraft(group, state.newExpense);
      return {
        ...state,
        phase: 'group',
        addExpenseStep: 0,
        newExpense: initialNewExpense,
        flashMessage: `${expense.desc} added to ${group.name}.`,
        groups: state.groups.map((item) => {
          if (item.id !== group.id) return item;
          return { ...item, expenses: [expense, ...item.expenses] };
        }),
      };
    }
    case 'SET_FLASH_MESSAGE':
      return {
        ...state,
        flashMessage: action.message,
      };
    case 'CLEAR_FLASH_MESSAGE':
      return {
        ...state,
        flashMessage: '',
      };
    default:
      return state;
  }
}

export function SplitProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo(() => {
    const groups = state.groups.map((group) => ({
      ...group,
      summary: calculateGroupBalances(group),
    }));
    const selectedGroup = groups.find((group) => group.id === state.selectedGroup) || null;
    const overall = groups.reduce(
      (acc, group) => {
        if (group.summary.yourBalance > 0) {
          acc.owed += group.summary.yourBalance;
        }
        if (group.summary.yourBalance < 0) {
          acc.owe += Math.abs(group.summary.yourBalance);
        }
        return acc;
      },
      { owed: 0, owe: 0 }
    );
    overall.owed = roundCurrency(overall.owed);
    overall.owe = roundCurrency(overall.owe);
    overall.net = roundCurrency(overall.owed - overall.owe);

    return {
      state,
      groups,
      selectedGroup,
      overall,
      dispatch,
      formatCurrency,
      formatSignedCurrency,
      calculateGroupBalances,
      getSplitLabel,
      openGroup: (groupId) => dispatch({ type: 'OPEN_GROUP', groupId }),
      openAddExpense: (groupId, memberIds) => dispatch({ type: 'OPEN_ADD_EXPENSE', groupId, memberIds }),
      openSettle: (groupId) => dispatch({ type: 'OPEN_SETTLE', groupId }),
      goHome: () => dispatch({ type: 'GO_HOME' }),
      setAddExpenseStep: (step) => dispatch({ type: 'SET_ADD_EXPENSE_STEP', step }),
      updateNewExpense: (payload) => dispatch({ type: 'UPDATE_NEW_EXPENSE', payload }),
      toggleSplitMember: (memberId) => dispatch({ type: 'TOGGLE_SPLIT_MEMBER', memberId }),
      updateCustomSplit: (memberId, value) => dispatch({ type: 'UPDATE_CUSTOM_SPLIT', memberId, value }),
      addExpense: () => dispatch({ type: 'ADD_EXPENSE' }),
      setFlashMessage: (message) => dispatch({ type: 'SET_FLASH_MESSAGE', message }),
      clearFlashMessage: () => dispatch({ type: 'CLEAR_FLASH_MESSAGE' }),
    };
  }, [state]);

  return <SplitContext.Provider value={value}>{children}</SplitContext.Provider>;
}

export function useSplitStore() {
  const context = useContext(SplitContext);
  if (!context) {
    throw new Error('useSplitStore must be used within a SplitProvider');
  }
  return context;
}
