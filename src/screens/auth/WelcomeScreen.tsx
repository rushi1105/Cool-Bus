/**
 * WelcomeScreen
 *
 * Entry point — login is the primary action.
 * Registration (choosing parent/driver role) is conditionally rendered.
 * Clean, modern layout matching the application styling tokens.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import Colors from '../../constants/colors';

interface WelcomeScreenProps {
  navigation: any;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const [showRoleSelection, setShowRoleSelection] = useState(false);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Background decoration */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      {!showRoleSelection ? (
        /* WELCOME VIEW (Log In is primary) */
        <View style={styles.welcomeView}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoIcon}>🚌</Text>
              <View style={styles.logoPulse} />
            </View>
            <Text style={styles.appName}>BusTrack</Text>
            <Text style={styles.tagline}>
              Real-time school bus tracking for{"\n"}parents and drivers
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Log In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryLink}
              onPress={() => setShowRoleSelection(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryText}>
                Don't have an account?{" "}
                <Text style={styles.secondaryLinkText}>Create Account</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* ROLE SELECTION VIEW (For Registration) */
        <View style={styles.roleSelectionView}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowRoleSelection(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.roleHeader}>
            <Text style={styles.roleTitle}>Create Account</Text>
            <Text style={styles.roleSubtitle}>
              Choose your role to get started
            </Text>
          </View>

          {/* Role Selection Cards */}
          <View style={styles.cardsContainer}>
            <TouchableOpacity
              style={[styles.roleCard, styles.driverCard]}
              onPress={() => navigation.navigate('DriverRegister')}
              activeOpacity={0.85}
            >
              <View style={styles.cardContent}>
                <View
                  style={[
                    styles.cardIcon,
                    { backgroundColor: Colors.primaryFaded },
                  ]}
                >
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
              <View
                style={[styles.cardAccent, { backgroundColor: Colors.primary }]}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleCard, styles.parentCard]}
              onPress={() => navigation.navigate('ParentRegister')}
              activeOpacity={0.85}
            >
              <View style={styles.cardContent}>
                <View
                  style={[
                    styles.cardIcon,
                    { backgroundColor: Colors.successFaded },
                  ]}
                >
                  <Text style={styles.cardEmoji}>👨‍👩‍👧</Text>
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>I am a Parent</Text>
                  <Text style={styles.cardDescription}>
                    Track your child's school bus in real-time and manage
                    payments
                  </Text>
                </View>
                <Text style={styles.cardArrow}>→</Text>
              </View>
              <View
                style={[styles.cardAccent, { backgroundColor: Colors.success }]}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you agree to our Terms of Service
        </Text>
      </View>
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
  welcomeView: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 60,
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
  actionsContainer: {
    gap: 16,
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryLink: {
    paddingVertical: 8,
  },
  secondaryText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  secondaryLinkText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  roleSelectionView: {
    flex: 1,
    paddingTop: 60,
  },
  backButton: {
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  backButtonText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
  },
  roleHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  roleTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 8,
  },
  roleSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
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
