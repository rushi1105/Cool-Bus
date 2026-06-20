import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Colors from '../../constants/colors';
import type { OnboardingStep } from '../../services/onboarding/OnboardingChecklistService';

interface GuidedActionCardProps {
  nextAction: OnboardingStep | null;
}

export const GuidedActionCard: React.FC<GuidedActionCardProps> = ({ nextAction }) => {
  const navigation = useNavigation<any>();

  if (!nextAction) {
    return null; // All done
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Next Step</Text>
      <Text style={styles.description}>
        To continue setting up your network, please complete the following:
      </Text>
      
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => navigation.navigate(nextAction.navigateTo)}
        activeOpacity={0.8}
      >
        <Text style={styles.actionButtonText}>{nextAction.actionText}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#EEF2FF', // light indigo background to stand out
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4338CA',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#4F46E5',
    marginBottom: 16,
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: '#4338CA',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#4338CA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
