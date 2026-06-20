import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import Colors from '../../../constants/colors';
import { useAuth } from '../../../hooks/useAuth';
import { useOnboardingChecklist } from '../../../hooks/useOnboardingChecklist';

import { WelcomeCard } from '../../../components/LaunchKit/WelcomeCard';
import { GuidedActionCard } from '../../../components/LaunchKit/GuidedActionCard';
import { InteractiveChecklistCard } from '../../../components/LaunchKit/InteractiveChecklistCard';
import { InviteCard } from '../../../components/LaunchKit/InviteCard';
import { InviteHistoryCard } from '../../../components/LaunchKit/InviteHistoryCard';
import { TemplatesCard } from '../../../components/LaunchKit/TemplatesCard';

export const OperatorLaunchKit: React.FC = () => {
  const { profile } = useAuth();
  const operatorId = profile?.operatorId || null;
  const operatorName = profile?.name || 'Operator';

  const { state, loading } = useOnboardingChecklist(operatorId);

  if (loading || !state) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <WelcomeCard 
          operatorName={operatorName} 
          missingStepsCount={state.missingItems.length} 
        />
        
        {!state.isFullyComplete && (
          <GuidedActionCard nextAction={state.nextRecommendedAction} />
        )}
        
        <InteractiveChecklistCard 
          steps={state.allSteps} 
          completionPercentage={state.completionPercentage} 
        />
        
        <InviteCard />
        <InviteHistoryCard />
        
        <TemplatesCard />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
});

export default OperatorLaunchKit;
