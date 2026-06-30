import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSplitStore } from '../store/splitStore';
import { colors, radii, spacing } from '../theme';

export default function SettleScreen() {
  const { selectedGroup, openGroup, goHome, formatCurrency, recordSettlement } = useSplitStore();
  const [selectedMethod, setSelectedMethod] = useState('Request via Stripe');
  const [confirming, setConfirming] = useState(false);

  const visibleSettlements = useMemo(() => {
    if (!selectedGroup) return [];
    return selectedGroup.summary.settlements.filter((item) => item.to === 'm1' || item.from === 'm1');
  }, [selectedGroup]);

  if (!selectedGroup) {
    return null;
  }

  const memberLookup = selectedGroup.members.reduce((acc, member) => {
    acc[member.id] = member;
    return acc;
  }, {});
  const featured = visibleSettlements[0];

  async function handleConfirmSettlement(settlement) {
    if (!settlement) return;
    setConfirming(true);
    try {
      const result = await recordSettlement(
        selectedGroup.id,
        settlement.from,
        settlement.to,
        settlement.amount
      );
      if (!result.success) {
        Alert.alert('Error', result.error || 'Could not record settlement. Please try again.');
      }
      // On success, RECORD_SETTLEMENT dispatches navigate to group view with flash message
    } finally {
      setConfirming(false);
    }
  }

  const sendReminder = () => {
    if (!featured) return;
    const from = memberLookup[featured.from];
    Alert.alert('Reminder sent', `Reminder sent to ${from?.name} via ${selectedMethod}.`);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Pressable style={styles.backButton} onPress={() => openGroup(selectedGroup.id)}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>Settle Up</Text>
      <Text style={styles.subtitle}>{selectedGroup.name}</Text>

      {featured ? (
        <View style={styles.heroCard}>
          <Text style={styles.heroText}>
            {featured.to === 'm1'
              ? `${memberLookup[featured.from]?.name} owes you ${formatCurrency(featured.amount)}`
              : `You owe ${memberLookup[featured.to]?.name} ${formatCurrency(featured.amount)}`}
          </Text>
          <Text style={styles.helperText}>Choose a payment method and confirm to record the settlement.</Text>
        </View>
      ) : (
        <View style={styles.heroCard}>
          <Text style={styles.heroText}>Everyone is already settled.</Text>
        </View>
      )}

      <View style={styles.methodCard}>
        <Text style={styles.sectionTitle}>Payment methods</Text>
        {['Request via Stripe', 'Mark as Cash', 'PayID/BSB'].map((method) => (
          <Pressable key={method} style={[styles.methodButton, selectedMethod === method && styles.methodButtonActive]} onPress={() => setSelectedMethod(method)}>
            <Text style={[styles.methodButtonText, selectedMethod === method && styles.methodButtonTextActive]}>{method}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>* alphinium-payments</Text>
        <Text style={styles.bannerText}>
          Real settlement with instant Stripe transfers. Request money, split bills, track who's paid.
        </Text>
      </View>

      {visibleSettlements.map((settlement, index) => {
        const from = memberLookup[settlement.from];
        const to = memberLookup[settlement.to];
        return (
          <View key={`${settlement.from}-${settlement.to}-${index}`} style={styles.settlementCard}>
            <Text style={styles.settlementText}>
              {settlement.to === 'm1'
                ? `${from?.name} owes you ${formatCurrency(settlement.amount)}`
                : `You owe ${to?.name} ${formatCurrency(settlement.amount)}`}
            </Text>
            <Pressable
              style={[styles.confirmButton, confirming && styles.confirmButtonDisabled]}
              onPress={() => handleConfirmSettlement(settlement)}
              disabled={confirming}
            >
              <Text style={styles.confirmButtonText}>{confirming ? 'Recording…' : '✓ Confirm Settlement'}</Text>
            </Pressable>
          </View>
        );
      })}

      {featured ? (
        <Pressable style={styles.primaryButton} onPress={sendReminder}>
          <Text style={styles.primaryButtonText}>Send Reminder</Text>
        </Pressable>
      ) : null}
      <Pressable style={styles.lightButton} onPress={goHome}>
        <Text style={styles.lightButtonText}>Back Home</Text>
      </Pressable>
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
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  heroText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
  },
  helperText: {
    color: colors.textMuted,
  },
  methodCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  methodButton: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  methodButtonActive: {
    backgroundColor: colors.primary,
  },
  methodButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  methodButtonTextActive: {
    color: colors.card,
  },
  banner: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: spacing.xs,
  },
  bannerTitle: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 18,
  },
  bannerText: {
    color: colors.text,
    lineHeight: 22,
  },
  settlementCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  settlementText: {
    color: colors.text,
    fontWeight: '700',
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: colors.card,
    fontWeight: '800',
    fontSize: 14,
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
  lightButton: {
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  lightButtonText: {
    color: colors.text,
    fontWeight: '800',
  },
});
