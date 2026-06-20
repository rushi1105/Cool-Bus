import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Colors from '../../constants/colors';
import { checkPhoneExists } from '../../repositories/authRepository';
import { checkOperatorCodeExists } from '../../repositories/operatorRepository';
import { validatePhone } from '../../utils/validation';

interface OperatorRegisterProps {
  navigation: any;
}

export const OperatorRegister: React.FC<OperatorRegisterProps> = ({ navigation }) => {
  const [companyName, setCompanyName] = useState('');
  const [operatorCode, setOperatorCode] = useState('');
  const [phone, setPhone] = useState('');

  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [codeVerified, setCodeVerified] = useState(false);

  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const checkedPhoneRef = useRef('');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const checkOperatorCode = async (code: string) => {
    if (code.length < 2) return;
    setIsCheckingCode(true);
    setCodeError('');
    setCodeVerified(false);

    try {
      const exists = await checkOperatorCodeExists(code);
      if (exists) {
        setCodeError('This operator code is already taken. Please choose another.');
      } else {
        setCodeVerified(true);
      }
    } catch (err) {
      console.error('[OperatorRegister] Code check failed:', err);
      setCodeError('Unable to verify operator code.');
    } finally {
      setIsCheckingCode(false);
    }
  };

  const checkPhoneNumber = async (phoneNumber: string) => {
    if (phoneNumber.length !== 10) return;
    if (phoneNumber === checkedPhoneRef.current) return;

    checkedPhoneRef.current = phoneNumber;
    setIsCheckingPhone(true);
    setPhoneError('');

    try {
      const exists = await checkPhoneExists(phoneNumber);
      if (exists) {
        setPhoneError('This phone number is already registered.');
      }
    } catch (err) {
      console.error('[OperatorRegister] Phone verification failed:', err);
      setPhoneError('Unable to verify phone number');
      checkedPhoneRef.current = '';
    } finally {
      setIsCheckingPhone(false);
    }
  };

  const handleCodeChange = (text: string) => {
    const upper = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setOperatorCode(upper);
    setCodeVerified(false);
    setCodeError('');
    if (upper.length >= 2) {
      checkOperatorCode(upper);
    }
  };

  const handlePhoneChange = (text: string) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    setPhone(cleanText);
    if (phoneError) setPhoneError('');
    if (cleanText.length < 10) checkedPhoneRef.current = '';
    if (cleanText.length === 10) checkPhoneNumber(cleanText);
  };

  const handlePhoneBlur = () => {
    if (phone.length > 0 && phone.length < 10) {
      setPhoneError('Enter a valid 10-digit phone number.');
    } else if (phone.length === 10) {
      checkPhoneNumber(phone);
    }
  };

  const isFormValid =
    companyName.trim().length >= 2 &&
    operatorCode.trim().length >= 2 &&
    codeVerified &&
    validatePhone(phone) &&
    !phoneError &&
    !isCheckingPhone;

  const handleContinue = () => {
    if (!isFormValid || isCheckingPhone || isCheckingCode) return;

    navigation.navigate('OTPVerify', {
      role: 'operator',
      phone,
      registrationData: {
        companyName,
        operatorCode: operatorCode.toUpperCase(),
        phone: '+91' + phone,
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Text style={styles.headerEmoji}>🏢</Text>
            </View>
            <Text style={styles.title}>Operator Registration</Text>
            <Text style={styles.subtitle}>
              Register your transport company and start managing your fleet
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Company Name</Text>
              <TextInput
                style={styles.input}
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="Your transport company name"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Operator Code</Text>
              <Text style={styles.hint}>
                A unique short code parents will use to find you (e.g. SAFERIDE)
              </Text>
              <TextInput
                style={[styles.input, codeError ? styles.inputError : codeVerified ? styles.inputSuccess : undefined]}
                value={operatorCode}
                onChangeText={handleCodeChange}
                placeholder="e.g. SAFERIDE"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="characters"
              />
              {isCheckingCode && (
                <View style={styles.statusRow}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.statusText}>Checking availability...</Text>
                </View>
              )}
              {codeError ? <Text style={styles.errorText}>{codeError}</Text> : null}
              {codeVerified && !codeError ? (
                <Text style={styles.successText}>✓ Code available</Text>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone Number</Text>
              <Text style={styles.hint}>
                Your personal admin contact number
              </Text>
              <View style={styles.phoneRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.phoneInput, phoneError ? styles.inputError : undefined]}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  onBlur={handlePhoneBlur}
                  placeholder="9876543210"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              {isCheckingPhone && (
                <View style={styles.statusRow}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.statusText}>Checking availability...</Text>
                </View>
              )}
              {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.continueButton, !isFormValid && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!isFormValid}
            activeOpacity={0.85}
          >
            <Text style={styles.continueButtonText}>Continue to Verify</Text>
            <Text style={styles.continueButtonArrow}>→</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
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
    marginTop: 16,
    marginBottom: 32,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerEmoji: {
    fontSize: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    gap: 20,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  hint: {
    fontSize: 12,
    color: Colors.textTertiary,
    lineHeight: 16,
  },
  input: {
    height: 52,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
  },
  countryCode: {
    height: 52,
    paddingHorizontal: 14,
    backgroundColor: Colors.white,
    borderRadius: 14,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
  },
  continueButton: {
    marginTop: 32,
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.textTertiary,
    elevation: 0,
    shadowOpacity: 0,
  },
  continueButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  continueButtonArrow: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '300',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  statusText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  successText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputSuccess: {
    borderColor: Colors.success,
  },
});

export default OperatorRegister;
