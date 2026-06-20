import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Colors from '../../constants/colors';
import type { OnboardingStep } from '../../services/onboarding/OnboardingChecklistService';

interface InteractiveChecklistCardProps {
  steps: OnboardingStep[];
  completionPercentage: number;
}

export const InteractiveChecklistCard: React.FC<InteractiveChecklistCardProps> = ({ steps, completionPercentage }) => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Setup Progress</Text>
        <Text style={styles.percentage}>{completionPercentage}%</Text>
      </View>
      
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${completionPercentage}%` }]} />
      </View>

      <View style={styles.list}>
        {steps.map((step) => (
          <TouchableOpacity
            key={step.id}
            style={[styles.stepItem, step.isComplete ? styles.stepItemComplete : undefined]}
            onPress={() => {
              if (step.isComplete) {
                // If it's complete, allow them to manage it
                navigation.navigate(step.navigateTo);
              }
            }}
            activeOpacity={step.isComplete ? 0.7 : 1}
          >
            <View style={[styles.checkbox, step.isComplete ? styles.checkboxComplete : undefined]}>
              {step.isComplete && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.stepText, step.isComplete ? styles.stepTextComplete : undefined]}>
              {step.title}
            </Text>
            {step.isComplete && (
              <Text style={styles.editHint}>Edit</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  percentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  list: {
    gap: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  stepItemComplete: {
    backgroundColor: '#F8FAFC',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxComplete: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkmark: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  stepTextComplete: {
    color: Colors.textPrimary,
  },
  editHint: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
});
