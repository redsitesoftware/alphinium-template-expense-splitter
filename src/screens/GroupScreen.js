import React from 'react';
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

export default function GroupScreen() {
  const {
    selectedGroup,
    state,
    goHome,
    openAddExpense,
    openSettle,
    formatCurrency,
    formatSignedCurrency,
    getSplitLabel,
    clearFlashMessage,
  } = useSplitStore();

  if (!selectedGroup) {
    return null;
  }

  const memberLookup = selectedGroup.members.reduce((acc, member) => {
    acc[member.id] = member;
    return acc;
  }, {});

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {selectedGroup.image && (
        <Image source={{ uri: selectedGroup.image }} style={styles.heroImage} resizeMode="cover" />
      )}
      <Pressable style={styles.backButton} onPress={goHome}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>{selectedGroup.name}</Text>
      <Text style={styles.subtitle}>{selectedGroup.members.length} members</Text>

      <View style={styles.memberRow}>
        {selectedGroup.members.map((member) => (
          <View key={member.id} style={[styles.memberChip, { backgroundColor: member.color }]}>
            <Text style={styles.memberInitial}>{member.initial || member.name?.[0] || '?'}</Text>
            <Text style={styles.memberName}>{member.name}</Text>
          </View>
        ))}
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Your balance</Text>
        <Text style={[styles.balanceValue, selectedGroup.summary.yourBalance >= 0 ? styles.positive : styles.negative]}>
          {formatSignedCurrency(selectedGroup.summary.yourBalance)}
        </Text>
        <View style={styles.actionRow}>
          <Pressable style={styles.secondaryButton} onPress={() => openAddExpense(selectedGroup.id, selectedGroup.members.map((member) => member.id))}>
            <Text style={styles.secondaryButtonText}>Add Expense</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={() => openSettle(selectedGroup.id)}>
            <Text style={styles.primaryButtonText}>Settle Up</Text>
          </Pressable>
        </View>
      </View>

      {state.flashMessage ? (
        <Pressable style={styles.flash} onPress={clearFlashMessage}>
          <Text style={styles.flashText}>{state.flashMessage}</Text>
        </Pressable>
      ) : null}

      <Text style={styles.sectionTitle}>Expenses</Text>
      {selectedGroup.expenses.map((expense) => (
        <View key={expense.id} style={styles.expenseCard}>
          <View style={styles.expenseTopRow}>
            <Text style={styles.expenseDesc}>{expense.desc}</Text>
            <Text style={styles.expenseAmount}>{formatCurrency(expense.amount)}</Text>
          </View>
          <Text style={styles.expenseMeta}>paid by {memberLookup[expense.paidBy]?.name || 'You'} · {expense.date}</Text>
          <Text style={styles.expenseSplit}>{getSplitLabel(expense, selectedGroup)}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Who owes who</Text>
      {selectedGroup.summary.settlements.length ? (
        selectedGroup.summary.settlements.map((settlement, index) => {
          const from = memberLookup[settlement.from];
          const to = memberLookup[settlement.to];
          const sentence = settlement.to === 'm1'
            ? `${from?.name} owes you ${formatCurrency(settlement.amount)}`
            : settlement.from === 'm1'
              ? `You owe ${to?.name} ${formatCurrency(settlement.amount)}`
              : `${from?.name} owes ${to?.name} ${formatCurrency(settlement.amount)}`;

          return (
            <View key={`${settlement.from}-${settlement.to}-${index}`} style={styles.settlementCard}>
              <Text style={styles.settlementText}>{sentence}</Text>
              <View style={styles.settlementActions}>
                <Pressable style={styles.remindButton} onPress={() => openSettle(selectedGroup.id)}>
                  <Text style={styles.remindText}>Remind</Text>
                </Pressable>
                <Pressable style={styles.settleButton} onPress={() => openSettle(selectedGroup.id)}>
                  <Text style={styles.settleText}>Settle</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Everyone is square right now.</Text>
        </View>
      )}

      <Pressable style={[styles.primaryButton, styles.bottomButton]} onPress={() => openSettle(selectedGroup.id)}>
        <Text style={styles.primaryButtonText}>Settle Up</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
    gap: spacing.md,
  },
  heroImage: {
    width: '100%',
    height: 180,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: spacing.lg,
  },
  backText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: spacing.lg,
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: -8,
    paddingHorizontal: spacing.lg,
  },
  memberRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  memberInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.card,
  },
  memberName: {
    color: colors.card,
    fontWeight: '700',
  },
  balanceCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  balanceLabel: {
    color: colors.textMuted,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  positive: {
    color: colors.primary,
  },
  negative: {
    color: colors.danger,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  primaryButtonText: {
    color: colors.card,
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  secondaryButtonText: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 16,
  },
  flash: {
    backgroundColor: colors.successSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
  },
  flashText: {
    color: colors.primary,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: spacing.lg,
  },
  expenseCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  expenseTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  expenseDesc: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '700',
  },
  expenseAmount: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 18,
  },
  expenseMeta: {
    color: colors.textMuted,
  },
  expenseSplit: {
    color: colors.accent,
    fontWeight: '700',
  },
  settlementCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  settlementText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  settlementActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  remindButton: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  remindText: {
    color: colors.accent,
    fontWeight: '800',
  },
  settleButton: {
    backgroundColor: colors.successSoft,
    borderRadius: radii.pill,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  settleText: {
    color: colors.primary,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  bottomButton: {
    marginTop: spacing.sm,
    flex: 0,
  },
});
