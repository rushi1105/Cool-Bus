/**
 * TripButton Component
 *
 * Ola-inspired large start/end trip button with animated states.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Colors from '../constants/colors';

interface TripButtonProps {
  isActive: boolean;
  onPress: () => void;
  disabled?: boolean;
  elapsedTime?: string; // e.g. "01:23:45"
}

export const TripButton: React.FC<TripButtonProps> = ({
  isActive,
  onPress,
  disabled = false,
  elapsedTime,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isActive, pulseAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      {isActive && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseAnim }],
              backgroundColor: Colors.errorFaded,
              borderColor: Colors.error,
            },
          ]}
        />
      )}

      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: isActive ? Colors.error : Colors.success,
            },
            disabled && styles.disabled,
          ]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          activeOpacity={0.9}
        >
          <Text style={styles.buttonIcon}>{isActive ? '⏹' : '▶️'}</Text>
          <Text style={styles.buttonText}>
            {isActive ? 'END TRIP' : 'START TRIP'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {elapsedTime && isActive && (
        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>Trip Duration</Text>
          <Text style={styles.timerValue}>{elapsedTime}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
  },
  button: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  buttonIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  timerContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timerValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.dark,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
});

export default TripButton;
