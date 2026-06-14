/**
 * WelcomeScreen
 *
 * Entry point — choose Driver or Parent role.
 * Clean, professional with two large cards.
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import Colors from '../../constants/colors';

const { width } = Dimensions.get('window');

interface WelcomeScreenProps {
  navigation: any;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(card1Anim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(card2Anim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Background decoration */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      {/* Logo Section */}
      <Animated.View
        style={[
          styles.logoSection,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🚌</Text>
          <View style={styles.logoPulse} />
        </View>
        <Text style={styles.appName}>BusTrack</Text>
        <Text style={styles.tagline}>
          Real-time school bus tracking for{'\n'}parents and drivers
        </Text>
      </Animated.View>

      {/* Role Selection Cards */}
      <View style={styles.cardsContainer}>
        <Animated.View
          style={{
            opacity: card1Anim,
            transform: [
              {
                translateY: card1Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [60, 0],
                }),
              },
            ],
          }}
        >
          <TouchableOpacity
            style={[styles.roleCard, styles.driverCard]}
            onPress={() => navigation.navigate('DriverRegister')}
            activeOpacity={0.85}
          >
            <View style={styles.cardContent}>
              <View style={[styles.cardIcon, { backgroundColor: Colors.primaryFaded }]}>
                <Text style={styles.cardEmoji}>🚗</Text>
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>I am a Driver</Text>
                <Text style={styles.cardDescription}>
                  Manage trips, track routes, and connect with your operator
                </Text>
              </View>
              <Text style={styles.cardArrow}>→</Text>
            </View>
            <View style={[styles.cardAccent, { backgroundColor: Colors.primary }]} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={{
            opacity: card2Anim,
            transform: [
              {
                translateY: card2Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [60, 0],
                }),
              },
            ],
          }}
        >
          <TouchableOpacity
            style={[styles.roleCard, styles.parentCard]}
            onPress={() => navigation.navigate('ParentRegister')}
            activeOpacity={0.85}
          >
            <View style={styles.cardContent}>
              <View style={[styles.cardIcon, { backgroundColor: Colors.successFaded }]}>
                <Text style={styles.cardEmoji}>👨‍👩‍👧</Text>
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>I am a Parent</Text>
                <Text style={styles.cardDescription}>
                  Track your child's bus in real-time and manage payments
                </Text>
              </View>
              <Text style={styles.cardArrow}>→</Text>
            </View>
            <View style={[styles.cardAccent, { backgroundColor: Colors.success }]} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Operator Login Link */}
      <Animated.View
        style={[styles.operatorLink, { opacity: card2Anim }]}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate('OperatorTabs')}
          activeOpacity={0.7}
        >
          <Text style={styles.operatorText}>
            Are you an operator?{' '}
            <Text style={styles.operatorLinkText}>Login here</Text>
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Footer */}
      <Animated.View style={[styles.footer, { opacity: card2Anim }]}>
        <Text style={styles.footerText}>
          By continuing, you agree to our Terms of Service
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  bgCircle1: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.primaryFaded,
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.successFaded,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 36,
  },
  logoPulse: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    opacity: 0.3,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.dark,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  cardsContainer: {
    gap: 16,
  },
  roleCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  driverCard: {},
  parentCard: {},
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardEmoji: {
    fontSize: 26,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  cardArrow: {
    fontSize: 20,
    color: Colors.textTertiary,
    fontWeight: '300',
    marginLeft: 8,
  },
  cardAccent: {
    height: 4,
  },
  operatorLink: {
    alignItems: 'center',
    marginTop: 24,
  },
  operatorText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  operatorLinkText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
});

export default WelcomeScreen;
