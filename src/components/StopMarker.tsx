/**
 * StopMarker Component
 *
 * Displays a bus stop marker with student info.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../constants/colors';

interface StopMarkerProps {
  label: string;
  studentNames?: string[];
  isNext?: boolean;
  isHighlighted?: boolean;
  stopNumber?: number;
}

export const StopMarker: React.FC<StopMarkerProps> = ({
  label,
  studentNames = [],
  isNext = false,
  isHighlighted = false,
  stopNumber,
}) => {
  const markerColor = isNext
    ? Colors.error
    : isHighlighted
    ? Colors.warning
    : Colors.primary;

  return (
    <View style={styles.container}>
      <View style={[styles.pin, { backgroundColor: markerColor }]}>
        {stopNumber !== undefined ? (
          <Text style={styles.pinText}>{stopNumber}</Text>
        ) : (
          <Text style={styles.pinText}>📍</Text>
        )}
      </View>
      <View
        style={[
          styles.labelContainer,
          isNext && styles.labelNext,
          isHighlighted && styles.labelHighlighted,
        ]}
      >
        <Text
          style={[styles.label, isNext && styles.labelTextNext]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {isNext && <Text style={styles.nextBadge}>NEXT</Text>}
      </View>
      {studentNames.length > 0 && (
        <View style={styles.students}>
          {studentNames.slice(0, 3).map((name, idx) => (
            <Text key={idx} style={styles.studentName} numberOfLines={1}>
              👤 {name}
            </Text>
          ))}
          {studentNames.length > 3 && (
            <Text style={styles.moreStudents}>
              +{studentNames.length - 3} more
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    minWidth: 100,
  },
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
    elevation: 3,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  pinText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  labelContainer: {
    marginTop: 4,
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    elevation: 2,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelNext: {
    backgroundColor: Colors.errorFaded,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  labelHighlighted: {
    backgroundColor: Colors.warningFaded,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  labelTextNext: {
    color: Colors.error,
    fontWeight: '700',
  },
  nextBadge: {
    fontSize: 8,
    fontWeight: '800',
    color: Colors.white,
    backgroundColor: Colors.error,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  students: {
    marginTop: 4,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    padding: 6,
    minWidth: 100,
  },
  studentName: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginVertical: 1,
  },
  moreStudents: {
    fontSize: 9,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    marginTop: 2,
  },
});

export default StopMarker;
