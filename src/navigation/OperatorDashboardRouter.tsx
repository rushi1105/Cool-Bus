import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Colors from '../constants/colors';
import { useAuth } from '../hooks/useAuth';
import { useOnboardingChecklist } from '../hooks/useOnboardingChecklist';
import OperatorLaunchKit from '../screens/operator/LaunchKit/OperatorLaunchKit';
import OperatorHome from '../screens/operator/OperatorHome';

export const OperatorDashboardRouter: React.FC = () => {
  const { profile } = useAuth();
  const operatorId = profile?.operatorId || null;

  const { state, loading } = useOnboardingChecklist(operatorId);

  if (loading || !state) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // If onboarding is not fully complete, show Launch Kit
  if (!state.isFullyComplete) {
    return <OperatorLaunchKit />;
  }

  // If complete, transition to the standard Dashboard
  return <OperatorHome />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
});

export default OperatorDashboardRouter;
