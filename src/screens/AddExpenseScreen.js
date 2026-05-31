import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSplitStore } from '../store/splitStore';
import { colors, radii, spacing } from '../theme';

function OptionPill({ active, label, onPress }) {
  return (
    <Pressable style={[styles.optionPill, active && styles.optionPillActive]} onPress={onPress}>
      <Text style={[styles.optionPillText, active && styles.optionPillTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function AddExpenseScreen() {
  const {
    selectedGroup,
    state,
    goHome,
    openGroup,
    setAddExpenseStep,
    updateNewExpense,
    toggleSplitMember,
    updateCustomSplit,
    addExpense,
    formatCurrency,
  } = useSplitStore();

  if (!selectedGroup) {
    return null;
  }

  const step = state.addExpenseStep;
  const draft = state.newExpense;
  const memberIds = selectedGroup.members.map((member) => member.id);
  const activeSplitWith = draft.splitWith.length ? draft.splitWith : memberIds;
  const paidByValue = draft.paidBy === 'me' ? 'm1' : draft.paidBy;
  const amount = Number(draft.amount || 0);

  const isStepOneValid = draft.description.trim() && amount > 0;
  const hasSplitTargets = activeSplitWith.length > 0;
  const amountTotal = activeSplitWith.reduce((sum, memberId) => sum + Number(draft.customSplit?.[memberId] || 0), 0);
  const percentTotal = activeSplitWith.reduce((sum, memberId) => sum + Number(draft.customSplit?.[memberId] || 0), 0);
  const isStepTwoValid = draft.splitType === 'equal'
    ? hasSplitTargets
    : draft.splitType === 'amount'
      ? hasSplitTargets && Math.abs(amountTotal - amount) < 0.02
      : hasSplitTargets && Math.abs(percentTotal - 100) < 0.02;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Pressable style={styles.backButton} onPress={() => (step === 0 ? openGroup(selectedGroup.id) : setAddExpenseStep(step - 1))}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>Add Expense</Text>
      <Text style={styles.subtitle}>Step {step + 1} of 3 · {selectedGroup.name}</Text>

      <View style={styles.stepperRow}>
        {[0, 1, 2].map((index) => (
          <View key={index} style={[styles.stepDot, index <= step && styles.stepDotActive]} />
        ))}
      </View>

      {step === 0 ? (
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            value={draft.description}
            onChangeText={(value) => updateNewExpense({ description: value })}
            placeholder="Dinner, taxi, tickets..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Amount</Text>
          <TextInput
            value={draft.amount}
            onChangeText={(value) => updateNewExpense({ amount: value.replace(/[^0-9.]/g, '') })}
            placeholder="0.00"
            keyboardType="decimal-pad"
            placeholderTextColor={colors.textMuted}
            style={styles.amountInput}
          />

          <Text style={styles.fieldLabel}>Paid by</Text>
          <View style={styles.pillWrap}>
            {selectedGroup.members.map((member) => (
              <OptionPill
                key={member.id}
                active={paidByValue === member.id}
                label={`${member.emoji} ${member.name}`}
                onPress={() => updateNewExpense({ paidBy: member.id })}
              />
            ))}
          </View>
        </View>
      ) : null}

      {step === 1 ? (
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Split with</Text>
          <View style={styles.checkboxWrap}>
            {selectedGroup.members.map((member) => {
              const active = activeSplitWith.includes(member.id);
              return (
                <Pressable key={member.id} style={styles.checkboxRow} onPress={() => toggleSplitMember(member.id)}>
                  <View style={[styles.checkbox, active && styles.checkboxActive]}>
                    <Text style={styles.checkboxTick}>{active ? 'v' : ''}</Text>
                  </View>
                  <Text style={styles.checkboxText}>{member.emoji} {member.name}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Split type</Text>
          <View style={styles.pillWrap}>
            <OptionPill active={draft.splitType === 'equal'} label="Equal" onPress={() => updateNewExpense({ splitType: 'equal' })} />
            <OptionPill active={draft.splitType === 'amount'} label="By Amount" onPress={() => updateNewExpense({ splitType: 'amount' })} />
            <OptionPill active={draft.splitType === '%'} label="By %" onPress={() => updateNewExpense({ splitType: '%' })} />
          </View>

          {draft.splitType !== 'equal' ? (
            <View style={styles.customSplitBlock}>
              {activeSplitWith.map((memberId) => {
                const member = selectedGroup.members.find((item) => item.id === memberId);
                return (
                  <View key={memberId} style={styles.customSplitRow}>
                    <Text style={styles.customSplitLabel}>{member?.emoji} {member?.name}</Text>
                    <TextInput
                      value={draft.customSplit?.[memberId]?.toString() || ''}
                      onChangeText={(value) => updateCustomSplit(memberId, value.replace(/[^0-9.]/g, ''))}
                      placeholder={draft.splitType === 'amount' ? '0.00' : '0'}
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.textMuted}
                      style={styles.customSplitInput}
                    />
                  </View>
                );
              })}
              <Text style={styles.helperText}>
                {draft.splitType === 'amount'
                  ? `Target total: ${formatCurrency(amount)} · Current total: ${formatCurrency(amountTotal)}`
                  : `Percent total: ${percentTotal.toFixed(0)}%`}
              </Text>
            </View>
          ) : (
            <Text style={styles.helperText}>Equal split will divide {formatCurrency(amount)} across {activeSplitWith.length || 0} selected members.</Text>
          )}
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.card}>
          <Text style={styles.summaryTitle}>Ready to add</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Description</Text>
            <Text style={styles.summaryValue}>{draft.description}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text style={styles.summaryValue}>{formatCurrency(amount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Paid by</Text>
            <Text style={styles.summaryValue}>{selectedGroup.members.find((member) => member.id === paidByValue)?.name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Split type</Text>
            <Text style={styles.summaryValue}>{draft.splitType === '%' ? 'By %' : draft.splitType === 'amount' ? 'By Amount' : 'Equal'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Split with</Text>
            <Text style={styles.summaryValue}>
              {activeSplitWith
                .map((memberId) => selectedGroup.members.find((member) => member.id === memberId)?.name)
                .join(', ')}
            </Text>
          </View>
          <Pressable style={styles.primaryButton} onPress={addExpense}>
            <Text style={styles.primaryButtonText}>Add Expense</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.navRow}>
        <Pressable style={styles.lightButton} onPress={goHome}>
          <Text style={styles.lightButtonText}>Home</Text>
        </Pressable>
        {step < 2 ? (
          <Pressable
            style={[styles.primaryButton, (!isStepOneValid && step === 0) || (!isStepTwoValid && step === 1) ? styles.disabledButton : null]}
            disabled={(step === 0 && !isStepOneValid) || (step === 1 && !isStepTwoValid)}
            onPress={() => setAddExpenseStep(step + 1)}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: 40,
    gap: spacing.md,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
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
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: -8,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepDot: {
    height: 8,
    flex: 1,
    borderRadius: radii.pill,
    backgroundColor: '#D1D5DB',
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  fieldLabel: {
    color: colors.text,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 16,
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionPill: {
    backgroundColor: colors.bg,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionPillActive: {
    backgroundColor: colors.primary,
  },
  optionPillText: {
    color: colors.text,
    fontWeight: '700',
  },
  optionPillTextActive: {
    color: colors.card,
  },
  checkboxWrap: {
    gap: spacing.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxTick: {
    color: colors.card,
    fontWeight: '900',
  },
  checkboxText: {
    color: colors.text,
    fontWeight: '600',
  },
  customSplitBlock: {
    gap: spacing.sm,
  },
  customSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  customSplitLabel: {
    flex: 1,
    color: colors.text,
    fontWeight: '600',
  },
  customSplitInput: {
    width: 110,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: 'right',
    color: colors.text,
  },
  helperText: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  summaryLabel: {
    color: colors.textMuted,
  },
  summaryValue: {
    flex: 1,
    textAlign: 'right',
    color: colors.text,
    fontWeight: '700',
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  lightButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  lightButtonText: {
    color: colors.text,
    fontWeight: '800',
  },
  primaryButton: {
    flex: 1,
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
  disabledButton: {
    opacity: 0.5,
  },
});
