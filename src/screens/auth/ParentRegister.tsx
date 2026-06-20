/**
 * ParentRegister Screen
 *
 * Parent name, phone, email, child details, operator code, coupon field, OTP.
 */

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
import CouponInput from '../../components/CouponInput';
import { useCoupon } from '../../hooks/useCoupon';
import { checkPhoneExists } from '../../repositories/authRepository';
import { getOperatorByCode } from '../../repositories/operatorRepository';
import { validateEmail, validatePhone } from '../../utils/validation';

interface ParentRegisterProps {
  navigation: any;
}

export const ParentRegister: React.FC<ParentRegisterProps> = ({ navigation }) => {
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');

  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const checkedPhoneRef = useRef('');

  // Per-field validation error states
  const [parentNameError, setParentNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [childNameError, setChildNameError] = useState('');
  const [gradeError, setGradeError] = useState('');

  const checkPhoneNumber = async (phoneNumber: string) => {
    if (phoneNumber.length !== 10) {
      setPhoneError('Enter valid 10-digit phone number');
      return;
    }
    if (phoneNumber === checkedPhoneRef.current) return;

    checkedPhoneRef.current = phoneNumber;
    setIsCheckingPhone(true);
    setPhoneError('');

    try {
      const exists = await checkPhoneExists(phoneNumber);
      if (exists) {
        setPhoneError('This phone number is already registered.\n\nUse Log In to access your account,\nor enter a different phone number.');
      } else {
        setPhoneError('');
      }
    } catch (err) {
      console.error('[Register] Phone verification failed:', err);
      setPhoneError('Unable to verify phone number');
      checkedPhoneRef.current = '';
    } finally {
      setIsCheckingPhone(false);
    }
  };

  const handlePhoneChange = (text: string) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    setPhone(cleanText);
    
    if (phoneError) {
      setPhoneError('');
    }
    if (cleanText.length < 10) {
      checkedPhoneRef.current = '';
    }
    
    if (cleanText.length === 10) {
      checkPhoneNumber(cleanText);
    }
  };

  const handlePhoneBlur = () => {
    if (phone.length === 0) {
      setPhoneError('Enter valid 10-digit phone number');
      checkedPhoneRef.current = '';
    } else if (phone.length < 10) {
      setPhoneError('Enter valid 10-digit phone number');
      checkedPhoneRef.current = '';
    } else if (phone.length === 10) {
      checkPhoneNumber(phone);
    }
  };

  const [email, setEmail] = useState('');
  const [childName, setChildName] = useState('');
  const [grade, setGrade] = useState('');
  const [selectedGender, setSelectedGender] = useState<string>('Male');
  const [operatorCode, setOperatorCode] = useState('');

  const [operatorId, setOperatorId] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [operatorVerified, setOperatorVerified] = useState(false);
  const [isVerifyingOperator, setIsVerifyingOperator] = useState(false);
  const [operatorError, setOperatorError] = useState('');

  // Stop selection result from StopSelectionScreen
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  const coupon = useCoupon();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // New Per-Field Change and Blur Handlers
  const handleParentNameChange = (text: string) => {
    setParentName(text);
    if (text.trim()) {
      setParentNameError('');
    }
  };

  const handleParentNameBlur = () => {
    if (!parentName.trim()) {
      setParentNameError('Name is required');
    } else {
      setParentNameError('');
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (text.trim() && validateEmail(text)) {
      setEmailError('');
    }
  };

  const handleEmailBlur = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError('Email is required');
    } else if (!validateEmail(trimmed)) {
      setEmailError('Enter valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleChildNameChange = (text: string) => {
    setChildName(text);
    if (text.trim()) {
      setChildNameError('');
    }
  };

  const handleChildNameBlur = () => {
    if (!childName.trim()) {
      setChildNameError('Child name is required');
    } else {
      setChildNameError('');
    }
  };

  const handleGradeChange = (text: string) => {
    setGrade(text);
    if (text.trim()) {
      setGradeError('');
    }
  };

  const handleGradeBlur = () => {
    if (!grade.trim()) {
      setGradeError('Grade is required');
    } else {
      setGradeError('');
    }
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    const isEmailValid = validateEmail(email);
    const isPhoneValid = validatePhone(phone) && !phoneError && !isCheckingPhone;
    const isOperatorValid = operatorVerified && operatorId !== '' && !operatorError && !isVerifyingOperator;

    const basicFieldsValid = !!(
      parentName.trim() &&
      isPhoneValid &&
      email.trim() &&
      isEmailValid &&
      childName.trim() &&
      grade.trim()
    );

    setIsFormValid(isOperatorValid && basicFieldsValid);
  }, [
    parentName,
    phone,
    email,
    childName,
    grade,
    operatorVerified,
    phoneError,
    isCheckingPhone,
    operatorId,
    operatorError,
    isVerifyingOperator,
  ]);

  const verifyOperator = async () => {
    if (!operatorCode.trim()) return;
    setIsVerifyingOperator(true);
    setOperatorError('');
    setOperatorName('');
    setOperatorId('');
    setOperatorVerified(false);

    try {
      const op = await getOperatorByCode(operatorCode);
      if (!op) {
        setOperatorError('Invalid operator code. Please check and try again.');
        setIsVerifyingOperator(false);
        setOperatorVerified(false);
        return;
      }

      setOperatorId(op.id);
      setOperatorName(op.name || '');
      setOperatorVerified(true);
      setSelectedStopId(null);
    } catch (err) {
      console.error('Verify Operator Error:', err);
      setOperatorError('Failed to verify operator. Please try again.');
      setOperatorVerified(false);
    } finally {
      setIsVerifyingOperator(false);
    }
  };

  const handleContinue = () => {
    const registrationData = {
      parentName,
      phone: '+91' + phone,
      email,
      childName,
      grade,
      gender: selectedGender,
      operatorCode,
      operatorId,
      couponCode: coupon.code,
    };

    navigation.navigate('StopSelection', {
      operatorId,
      operatorCode,
      phone,
      registrationData,
    });
  };

  const handleFindNearbyStops = () => {
    const registrationData = {
      parentName,
      phone: '+91' + phone,
      email,
      childName,
      grade,
      gender: selectedGender,
      operatorCode: '',
      operatorId: '',
      couponCode: coupon.code,
    };

    navigation.navigate('StopSelection', {
      operatorId: '',
      operatorCode: '',
      phone,
      registrationData,
    });
  };

  const genders = ['Male', 'Female', 'Other'];

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
          {/* Header */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Text style={styles.headerEmoji}>👨‍👩‍👧</Text>
            </View>
            <Text style={styles.title}>Parent Registration</Text>
            <Text style={styles.subtitle}>
              Track your child's school bus in real-time
            </Text>
          </View>

          {/* Trial Badge */}
          <View style={styles.trialBadge}>
            <Text style={styles.trialBadgeIcon}>🎁</Text>
            <View>
              <Text style={styles.trialBadgeTitle}>
                First child gets 1 month FREE trial!
              </Text>
              <Text style={styles.trialBadgeSubtitle}>
                No credit card required
              </Text>
            </View>
          </View>

          {/* Parent Details Section */}
          <Text style={styles.sectionTitle}>Parent Details</Text>
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={[styles.input, parentNameError ? styles.inputError : undefined]}
                value={parentName}
                onChangeText={handleParentNameChange}
                onBlur={handleParentNameBlur}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.textTertiary}
              />
              {parentNameError ? <Text style={styles.errorText}>{parentNameError}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone Number</Text>
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
                <View style={styles.phoneStatusRow}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.phoneStatusText}>Checking availability...</Text>
                </View>
              )}
              {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, emailError ? styles.inputError : undefined]}
                value={email}
                onChangeText={handleEmailChange}
                onBlur={handleEmailBlur}
                placeholder="parent@email.com"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>
          </View>

          {/* Child Details Section */}
          <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Child Details</Text>
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Child Name</Text>
              <TextInput
                style={[styles.input, childNameError ? styles.inputError : undefined]}
                value={childName}
                onChangeText={handleChildNameChange}
                onBlur={handleChildNameBlur}
                placeholder="Enter child's name"
                placeholderTextColor={Colors.textTertiary}
              />
              {childNameError ? <Text style={styles.errorText}>{childNameError}</Text> : null}
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Grade</Text>
                <TextInput
                  style={[styles.input, gradeError ? styles.inputError : undefined]}
                  value={grade}
                  onChangeText={handleGradeChange}
                  onBlur={handleGradeBlur}
                  placeholder="e.g. 5th"
                  placeholderTextColor={Colors.textTertiary}
                />
                {gradeError ? <Text style={styles.errorText}>{gradeError}</Text> : null}
              </View>
              <View style={[styles.field, { flex: 2 }]}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.genderRow}>
                  {genders.map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.genderChip,
                        selectedGender === g && styles.genderChipActive,
                      ]}
                      onPress={() => setSelectedGender(g)}
                    >
                      <Text
                        style={[
                          styles.genderChipText,
                          selectedGender === g && styles.genderChipTextActive,
                        ]}
                      >
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Registration Path Selection */}
          <Text style={[styles.sectionTitle, { marginTop: 28 }]}>
            Select Registration Method
          </Text>

          {/* Option A: Operator Code */}
          <View style={styles.form}>
            <View style={styles.optionACard}>
              <View style={styles.optionHeader}>
                <View style={styles.optionBadge}>
                  <Text style={styles.optionBadgeText}>Option A</Text>
                </View>
                <Text style={styles.optionTitle}>I Have an Operator Code</Text>
              </View>
              <Text style={styles.optionDesc}>
                Ask your bus operator for their code
              </Text>
              <View style={styles.operatorCodeRow}>
                <TextInput
                  style={[styles.input, styles.operatorInput]}
                  value={operatorCode}
                  onChangeText={(text) => {
                    setOperatorCode(text.toUpperCase());
                    setOperatorVerified(false);
                    setOperatorId('');
                    setOperatorName('');
                  }}
                  placeholder="e.g. SAFERIDE"
                  placeholderTextColor={Colors.textTertiary}
                  autoCapitalize="characters"
                />
                <TouchableOpacity 
                  style={[styles.verifyButton, (!operatorCode.trim() || isVerifyingOperator) && styles.verifyButtonDisabled]} 
                  onPress={verifyOperator}
                  disabled={isVerifyingOperator || !operatorCode.trim()}
                >
                  <Text style={styles.verifyButtonText}>Check</Text>
                </TouchableOpacity>
              </View>
              {isVerifyingOperator && <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 8 }} />}
              {operatorError ? <Text style={styles.errorText}>{operatorError}</Text> : null}
              {operatorName ? <Text style={styles.successText}>✓ {operatorName}</Text> : null}

              {operatorVerified && (
                <TouchableOpacity
                  style={styles.continueFromCodeButton}
                  onPress={handleContinue}
                  activeOpacity={0.85}
                >
                  <Text style={styles.continueFromCodeButtonText}>Continue with {operatorName}</Text>
                  <Text style={styles.continueFromCodeButtonArrow}>→</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Option B: Find Nearby Stops */}
            <View style={styles.optionBCard}>
              <View style={styles.optionHeader}>
                <View style={[styles.optionBadge, styles.optionBadgeB]}>
                  <Text style={[styles.optionBadgeText, styles.optionBadgeTextB]}>Option B</Text>
                </View>
                <Text style={styles.optionTitle}>Find Nearby Stops</Text>
              </View>
              <Text style={styles.optionDesc}>
                Discover stops near your location and choose an operator
              </Text>
              <TouchableOpacity
                style={styles.findStopsButton}
                onPress={handleFindNearbyStops}
                activeOpacity={0.85}
              >
                <Text style={styles.findStopsButtonText}>📍 Find Nearby Stops</Text>
              </TouchableOpacity>
            </View>

            <CouponInput
              value={coupon.code}
              onChangeText={coupon.setCode}
              onValidate={() => coupon.validateCode(phone)}
              isValidating={coupon.isValidating}
              validationMessage={coupon.validation?.message}
              isValid={coupon.validation?.valid}
            />
          </View>
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
    marginTop: 8,
    marginBottom: 20,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.successFaded,
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
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successFaded,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.success,
    padding: 14,
    marginBottom: 28,
    gap: 12,
  },
  trialBadgeIcon: {
    fontSize: 28,
  },
  trialBadgeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.success,
  },
  trialBadgeSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
    marginBottom: 16,
  },
  form: {
    gap: 16,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderChip: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  genderChipActive: {
    backgroundColor: Colors.primaryFaded,
    borderColor: Colors.primary,
  },
  genderChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  genderChipTextActive: {
    color: Colors.primary,
  },
  continueButton: {
    marginTop: 32,
    height: 56,
    backgroundColor: Colors.success,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: Colors.success,
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
  selectionItem: {
    justifyContent: 'center',
    marginBottom: 8,
  },
  selectionItemActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFaded,
  },
  selectionText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  selectionTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  successText: {
    color: Colors.success,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  operatorCodeRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  operatorInput: {
    flex: 1,
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    backgroundColor: Colors.textTertiary,
  },
  verifyButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 1,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  dropdownHeaderText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  dropdownIcon: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  dropdownList: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    marginTop: 8,
    maxHeight: 250,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  dropdownItemActive: {
    backgroundColor: Colors.primaryFaded,
  },
  phoneStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  phoneStatusText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  inputError: {
    borderColor: Colors.error,
  },
  optionACard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  optionBCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionBadge: {
    backgroundColor: Colors.primaryFaded,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  optionBadgeB: {
    backgroundColor: Colors.successFaded,
  },
  optionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  optionBadgeTextB: {
    color: Colors.success,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
  },
  optionDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  continueFromCodeButton: {
    height: 48,
    backgroundColor: Colors.success,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  continueFromCodeButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  continueFromCodeButtonArrow: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '300',
  },
  findStopsButton: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  findStopsButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ParentRegister;
