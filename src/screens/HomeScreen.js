import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSplitStore } from '../store/splitStore';
import { colors, radii, spacing } from '../theme';

function MemberStack({ members }) {
  return (
    <View style={styles.memberStack}>
      {members.map((member, index) => (
        <View
          key={member.id}
          style={[
            styles.memberBubble,
            { backgroundColor: member.color, marginLeft: index === 0 ? 0 : -10, zIndex: members.length - index },
          ]}
        >
          <Text style={styles.memberBubbleText}>{member.initial || (member.name ? member.name[0] : '?')}</Text>
        </View>
      ))}
    </View>
  );
}

function ChatChip({ label, onPress }) {
  return (
    <Pressable style={styles.chatChip} onPress={onPress}>
      <Text style={styles.chatChipText}>{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { groups, overall, openGroup, openSettle, openAddExpense, formatCurrency, formatSignedCurrency, createGroup } = useSplitStore();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatReply, setChatReply] = useState(
    "Hey! I'm Finn, your demo expense assistant — powered by ChatInstance + alphinium-payments. I track who owes what, send reminders, and handle settlements. Interested for your app?"
  );
  const [newGroupVisible, setNewGroupVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState('');
  const [creating, setCreating] = useState(false);

  const baliTrip = groups.find((group) => group.id === 'g1');
  const baliSettlements = baliTrip?.summary.settlements || [];

  const chatActions = useMemo(
    () => ({
      owes: () => setChatReply(`Bali Trip update: Sarah owes you ${formatCurrency(143.25)}, Marcus owes ${formatCurrency(86.75)}, and Priya owes ${formatCurrency(82.25)}.`),
      expense: () => {
        openAddExpense('g1', baliTrip?.members.map((member) => member.id) || []);
        setChatReply('Jumping into Add Expense so you can log a new shared cost for Bali.');
      },
      settle: () => {
        openSettle('g1');
        setChatReply('Opening settlement options so you can request money or mark a payment as cash.');
      },
      explain: () => setChatReply('SplitEasy keeps a running balance per group, then Finn turns open balances into reminders and alphinium-payments settlement prompts.'),
    }),
    [baliTrip, formatCurrency, openAddExpense, openSettle]
  );

  async function handleCreateGroup() {
    const name = newGroupName.trim();
    if (!name) {
      Alert.alert('Group name required', 'Please enter a name for the group.');
      return;
    }
    const memberNames = newGroupMembers
      .split(',')
      .map((m) => m.trim())
      .filter((m) => m.length > 0);
    setCreating(true);
    try {
      await createGroup(name, memberNames);
      setNewGroupName('');
      setNewGroupMembers('');
      setNewGroupVisible(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.logo}>SplitEasy</Text>
            <Text style={styles.balanceHeadline}>Your balance: {formatSignedCurrency(overall.net)}</Text>
          </View>
          <Pressable style={styles.fabMini} onPress={() => setChatOpen((value) => !value)}>
            <Text style={styles.fabMiniText}>Finn</Text>
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>You are owed</Text>
              <Text style={styles.summaryPositive}>{formatCurrency(overall.owed)}</Text>
            </View>
            <View>
              <Text style={styles.summaryLabel}>You owe</Text>
              <Text style={styles.summaryMuted}>{formatCurrency(overall.owe)}</Text>
            </View>
          </View>
          <Text style={styles.netText}>Net: {formatSignedCurrency(overall.net)} OK</Text>
          <Pressable style={styles.primaryButton} onPress={() => openSettle('g1')}>
            <Text style={styles.primaryButtonText}>Settle Up</Text>
          </Pressable>
        </View>

        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            alphinium-payments powers SplitEasy — Instant Stripe settlements, bank transfers, payment requests, and split history. Add to any group app with one install.
          </Text>
        </View>

        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Your groups</Text>
          <Pressable style={styles.newGroupButton} onPress={() => setNewGroupVisible(true)}>
            <Text style={styles.newGroupButtonText}>+ New Group</Text>
          </Pressable>
        </View>
        {groups.map((group) => (
          <Pressable key={group.id} style={styles.groupCard} onPress={() => openGroup(group.id)}>
            {group.image && (
              <Image source={{ uri: group.image }} style={styles.groupImage} resizeMode="cover" />
            )}
            <View style={styles.groupTopRow}>
              <View style={styles.groupTitleWrap}>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.groupMeta}>{group.members.length} members</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </View>
            <MemberStack members={group.members} />
            <View style={styles.groupBottomRow}>
              <View>
                <Text style={styles.summaryLabel}>Total expenses</Text>
                <Text style={styles.groupAmount}>{formatCurrency(group.summary.totalExpenses)}</Text>
              </View>
              <View style={styles.groupBalanceWrap}>
                <Text style={styles.summaryLabel}>Your balance</Text>
                <Text style={[styles.groupBalance, group.summary.yourBalance >= 0 ? styles.positiveText : styles.negativeText]}>
                  {formatSignedCurrency(group.summary.yourBalance)}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {chatOpen ? (
        <View style={styles.chatCard}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Finn payments agent</Text>
            <Pressable onPress={() => setChatOpen(false)}>
              <Text style={styles.chatClose}>X</Text>
            </Pressable>
          </View>
          <Text style={styles.chatBody}>{chatReply}</Text>
          {baliSettlements.length > 0 ? (
            <Text style={styles.chatContext}>Bali Trip context: {baliSettlements.length} people still owe you.</Text>
          ) : null}
          <View style={styles.chatChipWrap}>
            <ChatChip label="Who owes me?" onPress={chatActions.owes} />
            <ChatChip label="Add an expense +" onPress={chatActions.expense} />
            <ChatChip label="Settle up" onPress={chatActions.settle} />
            <ChatChip label="How does this work?" onPress={chatActions.explain} />
          </View>
        </View>
      ) : null}

      {!chatOpen ? (
        <Pressable style={styles.fab} onPress={() => setChatOpen(true)}>
          <Text style={styles.fabText}>Finn</Text>
        </Pressable>
      ) : null}

      <Modal visible={newGroupVisible} animationType="slide" transparent onRequestClose={() => setNewGroupVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Group</Text>
              <Pressable onPress={() => setNewGroupVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.inputLabel}>Group name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Weekend Trip"
              placeholderTextColor={colors.textMuted}
              value={newGroupName}
              onChangeText={setNewGroupName}
              autoFocus
            />
            <Text style={styles.inputLabel}>Members (comma-separated)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Sarah, Marcus, Priya"
              placeholderTextColor={colors.textMuted}
              value={newGroupMembers}
              onChangeText={setNewGroupMembers}
            />
            <Text style={styles.inputHint}>You are always included. Add other members by name.</Text>
            <Pressable
              style={[styles.primaryButton, creating && styles.primaryButtonDisabled]}
              onPress={handleCreateGroup}
              disabled={creating}
            >
              <Text style={styles.primaryButtonText}>{creating ? 'Creating…' : 'Create Group'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 120,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  balanceHeadline: {
    marginTop: 6,
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  fabMini: {
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  fabMiniText: {
    color: colors.accent,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  summaryPositive: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  summaryMuted: {
    color: colors.textMuted,
    fontSize: 28,
    fontWeight: '700',
    marginTop: 4,
  },
  netText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 18,
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.card,
    fontWeight: '800',
    fontSize: 16,
  },
  banner: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  bannerText: {
    color: colors.text,
    lineHeight: 20,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newGroupButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  newGroupButtonText: {
    color: colors.card,
    fontWeight: '800',
    fontSize: 14,
  },
  groupCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 0,
  },
  groupImage: {
    width: '100%',
    height: 120,
  },
  groupTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  groupTitleWrap: {
    flex: 1,
    paddingRight: spacing.md,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  groupMeta: {
    marginTop: 4,
    color: colors.textMuted,
  },
  arrow: {
    fontSize: 28,
    color: colors.textMuted,
  },
  memberStack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  memberBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberBubbleText: {
    fontSize: 16,
  },
  groupBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  groupAmount: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  groupBalanceWrap: {
    alignItems: 'flex-end',
  },
  groupBalance: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  positiveText: {
    color: colors.primary,
  },
  negativeText: {
    color: colors.danger,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 26,
    backgroundColor: colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: radii.pill,
  },
  fabText: {
    color: colors.card,
    fontWeight: '800',
    fontSize: 16,
  },
  chatCard: {
    position: 'absolute',
    right: 16,
    left: 16,
    bottom: 20,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  chatClose: {
    fontSize: 16,
    color: colors.textMuted,
  },
  chatBody: {
    color: colors.text,
    lineHeight: 22,
  },
  chatContext: {
    color: colors.primary,
    fontWeight: '700',
  },
  chatChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chatChip: {
    backgroundColor: colors.bg,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chatChipText: {
    color: colors.text,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  modalClose: {
    fontSize: 20,
    color: colors.textMuted,
    paddingHorizontal: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: -6,
  },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  inputHint: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: -6,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.card,
    fontWeight: '800',
    fontSize: 16,
  },
});
