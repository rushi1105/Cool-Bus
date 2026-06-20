/**
 * OTPVerify Screen
 *
 * 6-digit OTP code entry with auto-focus, resend timer, and verification.
 * Uses real Firebase Phone Auth via WebView reCAPTCHA.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Colors from '../../constants/colors';
import { auth } from '../../services/firebase';
import {
  getUserByUid,
  registerDriver,
  registerParent,
  registerOperator,
} from '../../repositories/authRepository';
import {
  signInWithCredential,
  PhoneAuthProvider,
  signOut,
  type ConfirmationResult,
} from 'firebase/auth';
import FirebaseRecaptcha, {
  type FirebaseRecaptchaHandle,
} from '../../components/FirebaseRecaptcha';


// TEST MODE — set to false before production
const TEST_MODE = false;
const TEST_CODE = '123456';
interface OTPVerifyProps {
  navigation: any;
  route: any;
}

const OTP_LENGTH = 6;

export const OTPVerify: React.FC<OTPVerifyProps> = ({ navigation, route }) => {
  const {
    mode = 'register',
    role = 'parent',
    phone = '9876543210',
    registrationData,
  } = route?.params ?? {};

  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(true);
  const [resendTimer, setResendTimer] = useState(30);
  const [error, setError] = useState('');
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const recaptchaRef = useRef<FirebaseRecaptchaHandle>(null);
  const [recaptchaReady, setRecaptchaReady] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Send OTP once reCAPTCHA is ready
  useEffect(() => {
    if (recaptchaReady) {
      sendOTP();
    }
  }, [recaptchaReady]);

  // Resend timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const sendOTP = async () => {
    setIsSendingOTP(true);
    setError('');
    try {
      const fullPhone = `+91${phone}`;

      // ── TEST BYPASS ──────────────────────────────
      if (TEST_MODE) {
        // Create a fake confirmationResult that accepts only 123456
        const fakeResult: any = {
          verificationId: 'test-verification-id',
          confirm: async (code: string) => {
            if (code !== TEST_CODE) {
              const err: any = new Error('Invalid code');
              err.code = 'auth/invalid-verification-code';
              throw err;
            }
            // Return a fake user credential
            return {
              user: {
                uid: `test-uid-${phone}`,
                phoneNumber: fullPhone,
              },
            };
          },
        };
        setConfirmationResult(fakeResult);
        setIsSendingOTP(false);
        setResendTimer(30);
        setTimeout(() => inputRefs.current[0]?.focus(), 300);
        return;
      }
      // ── END TEST BYPASS ──────────────────────────

      // Real OTP flow (your original code)
      const verificationId = await recaptchaRef.current?.sendOTP(fullPhone);
      if (!verificationId) {
        throw new Error('Failed to send OTP or get verification ID');
      }

      const fakeResult: any = {
        verificationId,
        confirm: async (code: string) => {
          const credential = PhoneAuthProvider.credential(verificationId, code);
          return await signInWithCredential(auth, credential);
        },
      };

      setConfirmationResult(fakeResult);
      setIsSendingOTP(false);
      setResendTimer(30);
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    } catch (err: any) {
      console.error('[OTPVerify] sendOTP error:', err);
      setIsSendingOTP(false);
      setError(err.message || 'Failed to send OTP. Please try again.');
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    setError('');
    const newOtp = [...otp];

    if (value.length > 1) {
      // Handle paste
      const chars = value.split('').slice(0, OTP_LENGTH - index);
      chars.forEach((char, i) => {
        if (index + i < OTP_LENGTH) newOtp[index + i] = char;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + chars.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
    } else {
      newOtp[index] = value;
      setOtp(newOtp);
      if (value && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }

    // Auto-verify when all filled
    const fullOtp = newOtp.join('');
    if (fullOtp.length === OTP_LENGTH && !newOtp.includes('')) {
      handleVerify(fullOtp);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code ?? otp.join('');
    if (otpCode.length < OTP_LENGTH) return;
    if (!confirmationResult) {
      setError('OTP not sent yet. Please wait or try resending.');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      // 1. Confirm the OTP code
      const credential = await confirmationResult.confirm(otpCode);
      const uid = credential.user.uid;

      // 2. Check if user already exists in Firestore
      const existingUser = await getUserByUid(uid);

      if (existingUser) {
        // Treat as a valid login, let AppNavigator route automatically
        return;
      } else if (mode === 'login') {
        // Try to find if they are a seeded operator without a user doc
        const fullPhone = `+91${phone}`;
        const { getOperatorByPhone } = require('../../repositories/operatorRepository');
        const { linkExistingOperator } = require('../../repositories/authRepository');
        const opByPhone = await getOperatorByPhone(fullPhone);
        if (opByPhone) {
           if (__DEV__) {
             // In development, automatically create the missing user document
             await linkExistingOperator(uid, opByPhone.id, {
                 companyName: opByPhone.name,
                 operatorCode: opByPhone.code,
                 phone: fullPhone
             });
             return;
           } else {
             // In production, reject login for inconsistency
             await signOut(auth);
             Alert.alert('Inconsistent Account', 'Operator profile found but no auth user linked. Please contact support.');
             navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
             return;
           }
        }

        // User does not exist, and we are in login mode
        await signOut(auth);
        Alert.alert('No Account Found', 'No account found. Please register first.');
        navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        return;
      } else if (registrationData) {
        // New user — create docs in Firestore
        setIsCreatingProfile(true);
        try {
          if (role === 'driver') {
            await registerDriver(uid, {
              name: registrationData.name,
              phone: registrationData.phone,
              operatorId: registrationData.operatorId,
              shift: registrationData.shift,
            });
            if (registrationData.inviteId) {
              const { acceptInvite } = require('../../services/invites/InviteService');
              await acceptInvite(registrationData.inviteId, uid, registrationData.name, 'driver');
            }
          } else if (role === 'parent') {
            await registerParent(uid, {
              parentName: registrationData.parentName,
              phone: registrationData.phone,
              email: registrationData.email || '',
              childName: registrationData.childName,
              grade: registrationData.grade,
              gender: registrationData.gender,
              operatorCode: registrationData.operatorCode,
              operatorId: registrationData.operatorId,
              routeId: registrationData.routeId,
              stopId: registrationData.stopId,
            });
            if (registrationData.inviteId) {
              const { acceptInvite } = require('../../services/invites/InviteService');
              await acceptInvite(registrationData.inviteId, uid, registrationData.parentName, 'parent');
            }
          } else if (role === 'operator') {
            await registerOperator(uid, {
              companyName: registrationData.companyName,
              operatorCode: registrationData.operatorCode,
              phone: registrationData.phone,
            });
          }
          // Do NOT manually navigate. Let AppNavigator handle it.
        } catch (writeErr) {
          console.error('Firestore write error during registration:', writeErr);
          setError('Failed to create account profile. Please try again.');
          setIsCreatingProfile(false);
        }
      } else {
        // Authenticated but no profile and no registration data
        await signOut(auth);
        setError('Registration data missing. Please try again.');
        navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
      }
    } catch (err: any) {
      console.error('[OTPVerify] verify error:', err);
      shake();
      if (err.code === 'auth/invalid-verification-code') {
        setError('Invalid OTP code. Please try again.');
      } else if (err.code === 'auth/code-expired') {
        setError('OTP has expired. Please resend.');
      } else {
        setError(err.message || 'Verification failed. Please try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = () => {
    setOtp(new Array(OTP_LENGTH).fill(''));
    setConfirmationResult(null);
    sendOTP();
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const maskedPhone = `+91 ${phone.slice(0, 2)}****${phone.slice(-4)}`;

  if (isCreatingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Setting up your account...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Hidden reCAPTCHA WebView */}
      <FirebaseRecaptcha
        ref={recaptchaRef}
        onReady={() => setRecaptchaReady(true)}
      />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerEmoji}>🔐</Text>
          </View>
          <Text style={styles.title}>Verify Your Number</Text>
          <Text style={styles.subtitle}>
            {isSendingOTP
              ? 'Sending OTP...'
              : `We sent a 6-digit code to\n`}
            {!isSendingOTP && (
              <Text style={styles.phoneHighlight}>{maskedPhone}</Text>
            )}
          </Text>
        </View>

        {/* Sending OTP indicator */}
        {isSendingOTP ? (
          <View style={styles.sendingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.sendingText}>
              Sending verification code...
            </Text>
          </View>
        ) : (
          <>
            {/* OTP Input */}
            <Animated.View
              style={[styles.otpContainer, { transform: [{ translateX: shakeAnim }] }]}
            >
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={[
                    styles.otpInput,
                    digit ? styles.otpInputFilled : undefined,
                    error ? styles.otpInputError : undefined,
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  keyboardType="number-pad"
                  maxLength={index === 0 ? OTP_LENGTH : 1}
                  selectTextOnFocus
                />
              ))}
            </Animated.View>

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            {/* Verify Button */}
            <TouchableOpacity
              style={[
                styles.verifyButton,
                otp.join('').length < OTP_LENGTH && styles.verifyButtonDisabled,
              ]}
              onPress={() => handleVerify()}
              disabled={otp.join('').length < OTP_LENGTH || isVerifying}
              activeOpacity={0.85}
            >
              {isVerifying ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.verifyButtonText}>Verify & Continue</Text>
              )}
            </TouchableOpacity>

            {/* Resend */}
            <View style={styles.resendContainer}>
              {resendTimer > 0 ? (
                <Text style={styles.resendTimer}>
                  Resend code in{' '}
                  <Text style={styles.resendTimerBold}>{resendTimer}s</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend}>
                  <Text style={styles.resendLink}>Resend Code</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </Animated.View>
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
    paddingTop: 16,
  },
  backButton: {
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerEmoji: {
    fontSize: 34,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  phoneHighlight: {
    fontWeight: '700',
    color: Colors.dark,
  },
  sendingContainer: {
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
  },
  sendingText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: Colors.dark,
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFaded,
  },
  otpInputError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorFaded,
  },
  errorText: {
    textAlign: 'center',
    color: Colors.error,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
  },
  verifyButton: {
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  verifyButtonDisabled: {
    backgroundColor: Colors.textTertiary,
    elevation: 0,
    shadowOpacity: 0,
  },
  verifyButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  resendTimer: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  resendTimerBold: {
    fontWeight: '700',
    color: Colors.primary,
  },
  resendLink: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});

export default OTPVerify;
