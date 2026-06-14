/**
 * SOSButton Screen
 *
 * One-tap emergency button with confirmation dialog.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Colors from '../../constants/colors';
import { firebaseService } from '../../services/firebase';
import notificationService from '../../services/notifications';

interface SOSButtonProps {
  navigation: any;
}

export const SOSButton: React.FC<SOSButtonProps> = ({ navigation }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Continuous pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const handleSOS = async () => {
    setIsSending(true);
    try {
      await firebaseService.sendSOS(
        'drv-1',
        'KA-01-AB-1234',
        { latitude: 12.9716, longitude: 77.5946 },
      );
      await notificationService.sendSOSAlert(
        'Rajesh Kumar',
        'KA-01-AB-1234',
        { latitude: 12.9716, longitude: 77.5946 },
      );
      setSent(true);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Emergency SOS</Text>
          <Text style={styles.subtitle}>
            Use this button only in case of a real emergency.{'\n'}
            Your operator will be notified immediately.
          </Text>
        </View>

        {/* SOS Button */}
        <View style={styles.sosContainer}>
          {!sent ? (
            <>
              <Animated.View
                style={[
                  styles.sosRing3,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.sosRing2,
                  {
                    transform: [
                      {
                        scale: pulseAnim.interpolate({
                          inputRange: [1, 1.2],
                          outputRange: [1, 1.15],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.sosRing1,
                  {
                    transform: [
                      {
                        scale: pulseAnim.interpolate({
                          inputRange: [1, 1.2],
                          outputRange: [1, 1.08],
                        }),
                      },
                    ],
                  },
                ]}
              />

              <TouchableOpacity
                style={styles.sosButton}
                onPress={() => setShowConfirm(true)}
                activeOpacity={0.9}
              >
                <Text style={styles.sosIcon}>🚨</Text>
                <Text style={styles.sosText}>SOS</Text>
                <Text style={styles.sosHint}>Tap to alert</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.sentContainer}>
              <View style={styles.sentIcon}>
                <Text style={styles.sentIconText}>✅</Text>
              </View>
              <Text style={styles.sentTitle}>Alert Sent!</Text>
              <Text style={styles.sentSubtitle}>
                Your operator has been notified with your{'\n'}current location and bus details.
              </Text>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => setSent(false)}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            This will send your name, bus number, and live GPS location to your operator instantly.
          </Text>
        </View>
      </Animated.View>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>Confirm Emergency Alert</Text>
            <Text style={styles.modalBody}>
              Are you sure you want to send an SOS alert?{'\n'}
              This will immediately notify your operator.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowConfirm(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={() => {
                  setShowConfirm(false);
                  handleSOS();
                }}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Send Alert</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  sosContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 280,
    marginBottom: 32,
  },
  sosRing3: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  sosRing2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  sosRing1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  sosButton: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  sosIcon: {
    fontSize: 32,
    marginBottom: 2,
  },
  sosText: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  sosHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  sentContainer: {
    alignItems: 'center',
  },
  sentIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.successFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  sentIconText: {
    fontSize: 36,
  },
  sentTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.success,
    marginBottom: 8,
  },
  sentSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  resetButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.background,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryFaded,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 18,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
  },
  modalIcon: {
    fontSize: 44,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancel: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalConfirm: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.error,
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
});

export default SOSButton;
