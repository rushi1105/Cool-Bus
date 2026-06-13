/**
 * BusMarker Component
 *
 * Animated bus icon for map display. Works without react-native-maps
 * by rendering a styled view with bus emoji and status indicator.
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Colors from '../constants/colors';

interface BusMarkerProps {
  busNumber: string;
  isActive: boolean;
  speed?: number;
  driverName?: string;
  size?: 'small' | 'medium' | 'large';
}

export const BusMarker: React.FC<BusMarkerProps> = ({
  busNumber,
  isActive,
  speed = 0,
  driverName,
  size = 'medium',
}) => {
  const sizeMap = { small: 36, medium: 48, large: 60 };
  const iconSize = sizeMap[size];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.marker,
          {
            width: iconSize,
            height: iconSize,
            backgroundColor: isActive ? Colors.success : Colors.textTertiary,
          },
        ]}
      >
        <Text style={[styles.busIcon, { fontSize: iconSize * 0.45 }]}>🚌</Text>
        {isActive && <View style={styles.pulse} />}
      </View>
      <View style={styles.label}>
        <Text style={styles.busNumber} numberOfLines={1}>
          {busNumber}
        </Text>
        {speed > 0 && (
          <Text style={styles.speed}>{speed} km/h</Text>
        )}
      </View>
      {driverName && (
        <Text style={styles.driverName} numberOfLines={1}>
          {driverName}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    minWidth: 80,
  },
  marker: {
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  busIcon: {
    textAlign: 'center',
  },
  pulse: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.success,
    opacity: 0.4,
  },
  label: {
    marginTop: 4,
    backgroundColor: Colors.dark,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  busNumber: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  speed: {
    color: Colors.successLight,
    fontSize: 9,
    fontWeight: '600',
  },
  driverName: {
    marginTop: 2,
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});

export default BusMarker;
