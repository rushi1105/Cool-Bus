import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../constants/colors';

interface WelcomeCardProps {
  operatorName: string;
  missingStepsCount: number;
}

export const WelcomeCard: React.FC<WelcomeCardProps> = ({ operatorName, missingStepsCount }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.greeting}>Welcome, {operatorName}!</Text>
      <Text style={styles.message}>
        Let's get your transport network set up and running.
      </Text>
      {missingStepsCount > 0 ? (
        <View style={styles.etaBadge}>
          <Text style={styles.etaText}>
            ⏱️ Final {missingStepsCount} step{missingStepsCount !== 1 ? 's' : ''} remaining
          </Text>
        </View>
      ) : (
        <View style={[styles.etaBadge, styles.completeBadge]}>
          <Text style={styles.completeText}>🎉 All set up!</Text>
        </View>
      )}
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
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 22,
  },
  etaBadge: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  completeBadge: {
    backgroundColor: '#E6F4EA',
  },
  etaText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  completeText: {
    fontSize: 13,
    color: '#137333',
    fontWeight: '600',
  },
});
