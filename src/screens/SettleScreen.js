import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSplitStore } from '../store/splitStore';
import { colors, radii, spacing } from '../theme';

export default function SettleScreen() {
  const { selectedGroup, openGroup, goHome, formatCurrency, setFlashMessage } = useSplitStore();
  const [selectedMethod, setSelectedMethod] = useState('Request via Stripe');

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

  const sendReminder = () => {
    if (!featured) return;
    const from = memberLookup[featured.from];
    setFlashMessage(`Reminder sent to ${from?.name} via ${selectedMethod}. Push notification simulated successfully.`);
    openGroup(selectedGroup.id);
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
          <Text style={styles.helperText}>Choose a payment flow for the demo settlement.</Text>
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
          </View>
        );
      })}

      <Pressable style={styles.primaryButton} onPress={sendReminder}>
        <Text style={styles.primaryButtonText}>Send Reminder</Text>
      </Pressable>
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
  },
  settlementText: {
    color: colors.text,
    fontWeight: '700',
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
