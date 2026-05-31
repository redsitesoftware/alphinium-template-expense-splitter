import React from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { useSplitStore } from '../store/splitStore';
import { colors } from '../theme';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import GroupScreen from '../screens/GroupScreen';
import HomeScreen from '../screens/HomeScreen';
import SettleScreen from '../screens/SettleScreen';

export default function AppNavigator() {
  const { state } = useSplitStore();

  const renderScreen = () => {
    if (state.phase === 'group') return <GroupScreen />;
    if (state.phase === 'add-expense') return <AddExpenseScreen />;
    if (state.phase === 'settle') return <SettleScreen />;
    return <HomeScreen />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>{renderScreen()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
