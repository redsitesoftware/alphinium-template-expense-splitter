import React, { useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { useSplitStore } from '../store/splitStore';
import { colors, radii, spacing } from '../theme';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'INR', 'MXN', 'THB'];

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
    categories,
    goHome,
    openGroup,
    setAddExpenseStep,
    updateNewExpense,
    toggleSplitMember,
    updateCustomSplit,
    addExpense,
    addExpenseAndUploadReceipt,
    formatCurrency,
  } = useSplitStore();

  const [receiptUri, setReceiptUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  async function handleAttachReceipt() {
    Alert.alert('Attach Receipt', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission denied', 'Camera access is required to take a photo.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
          });
          if (!result.canceled && result.assets?.[0]?.uri) {
            setReceiptUri(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission denied', 'Photo library access is required.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
          });
          if (!result.canceled && result.assets?.[0]?.uri) {
            setReceiptUri(result.assets[0].uri);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleSubmitExpense() {
    setUploading(true);
    try {
      const result = await addExpenseAndUploadReceipt(receiptUri);
      if (receiptUri && result && !result.uploadSuccess) {
        Alert.alert(
          'Receipt not saved',
          'Your expense was added, but the receipt photo could not be uploaded. You can try attaching it again later.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setUploading(false);
      setReceiptUri(null);
    }
  }

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
          <View style={styles.amountRow}>
            <TextInput
              value={draft.amount}
              onChangeText={(value) => updateNewExpense({ amount: value.replace(/[^0-9.]/g, '') })}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textMuted}
              style={[styles.amountInput, styles.amountInputFlex]}
            />
            <Pressable style={styles.currencyButton} onPress={() => setShowCurrencyPicker(true)}>
              <Text style={styles.currencyButtonText}>{draft.currency || 'USD'} ▾</Text>
            </Pressable>
          </View>

          <Modal
            visible={showCurrencyPicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowCurrencyPicker(false)}
          >
            <Pressable style={styles.modalOverlay} onPress={() => setShowCurrencyPicker(false)}>
              <View style={styles.currencyModal}>
                <Text style={styles.currencyModalTitle}>Select Currency</Text>
                {CURRENCIES.map((code) => (
                  <Pressable
                    key={code}
                    style={[styles.currencyOption, (draft.currency || 'USD') === code && styles.currencyOptionActive]}
                    onPress={() => { updateNewExpense({ currency: code }); setShowCurrencyPicker(false); }}
                  >
                    <Text style={[(draft.currency || 'USD') === code ? styles.currencyOptionTextActive : styles.currencyOptionText]}>{code}</Text>
                  </Pressable>
                ))}
              </View>
            </Pressable>
          </Modal>

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

          <Text style={styles.fieldLabel}>Category <Text style={styles.optionalLabel}>(optional)</Text></Text>
          <View style={styles.pillWrap}>
            {categories.map((cat) => {
              const active = draft.category_id === cat.id;
              return (
                <OptionPill
                  key={cat.id}
                  active={active}
                  label={`${cat.emoji} ${cat.name}`}
                  onPress={() => updateNewExpense({ category_id: active ? null : cat.id })}
                />
              );
            })}
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
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Currency</Text>
            <Text style={styles.summaryValue}>{draft.currency || 'USD'}</Text>
          </View>
          <View style={styles.receiptSection}>
            <Pressable style={styles.attachButton} onPress={handleAttachReceipt}>
              <Text style={styles.attachButtonText}>📷 {receiptUri ? 'Change Receipt' : 'Attach Receipt'}</Text>
            </Pressable>
            {receiptUri ? (
              <Image source={{ uri: receiptUri }} style={styles.receiptThumbnail} resizeMode="cover" />
            ) : null}
          </View>
          <Pressable
            style={[styles.primaryButton, uploading && styles.disabledButton]}
            onPress={handleSubmitExpense}
            disabled={uploading}
          >
            <Text style={styles.primaryButtonText}>{uploading ? 'Adding…' : 'Add Expense'}</Text>
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
  optionalLabel: {
    color: colors.textMuted,
    fontWeight: '400',
    fontSize: 13,
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
  receiptSection: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  attachButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  attachButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
  receiptThumbnail: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  amountInputFlex: {
    flex: 1,
  },
  currencyButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    minWidth: 72,
  },
  currencyButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyModal: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    width: 220,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  currencyModalTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  currencyOption: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  currencyOptionActive: {
    backgroundColor: colors.primary,
  },
  currencyOptionText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  currencyOptionTextActive: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
