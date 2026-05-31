import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  const { groups, overall, openGroup, openSettle, openAddExpense, formatCurrency, formatSignedCurrency } = useSplitStore();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatReply, setChatReply] = useState(
    "Hey! I'm Finn, your demo expense assistant — powered by ChatInstance + alphinium-payments. I track who owes what, send reminders, and handle settlements. Interested for your app?"
  );

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

        <Text style={styles.sectionTitle}>Your groups</Text>
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
});
