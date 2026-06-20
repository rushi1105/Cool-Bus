/**
 * DriverRegister Screen
 *
 * Full name, phone, operator dropdown, bus number, shift selector, OTP.
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
import { checkPhoneExists } from '../../repositories/authRepository';
import { fetchOperators } from '../../repositories/operatorRepository';
import type { Operator } from '../../repositories/types';
import Config from '../../constants/config';

interface DriverRegisterProps {
  navigation: any;
}

export const DriverRegister: React.FC<DriverRegisterProps> = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const checkedPhoneRef = useRef('');

  const [pendingInvite, setPendingInvite] = useState<{ id: string; operatorId: string; operatorName: string } | null>(null);

  const checkPhoneNumber = async (phoneNumber: string) => {
    if (phoneNumber.length !== 10) return;
    if (phoneNumber === checkedPhoneRef.current) return;

    checkedPhoneRef.current = phoneNumber;
    setIsCheckingPhone(true);
    setPhoneError('');
    setPendingInvite(null);

    try {
      const exists = await checkPhoneExists(phoneNumber);
      if (exists) {
        setPhoneError('This phone number is already registered.\n\nUse Log In to access your account,\nor enter a different phone number.');
      } else {
        setPhoneError('');
        const { getPendingInviteByPhone } = require('../../repositories/userRepository');
        const invite = await getPendingInviteByPhone('+91' + phoneNumber);
        if (invite) {
          setPendingInvite(invite);
          setSelectedOperator(invite.operatorId);
        }
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
    if (phone.length > 0 && phone.length < 10) {
      setPhoneError('Please enter a valid 10-digit phone number.');
      checkedPhoneRef.current = '';
    } else if (phone.length === 10) {
      checkPhoneNumber(phone);
    }
  };
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<string>('Both');
  const [showOperatorPicker, setShowOperatorPicker] = useState(false);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loadingOperators, setLoadingOperators] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Fetch operators from Firestore
    (async () => {
      try {
        const ops = await fetchOperators();
        setOperators(ops);
      } catch (err) {
        console.error('[DriverRegister] Failed to fetch operators:', err);
      } finally {
        setLoadingOperators(false);
      }
    })();
  }, []);



  const isFormValid =
    fullName.trim() &&
    phone.trim().length === 10 &&
    selectedOperator &&
    !phoneError &&
    !isCheckingPhone;

  const handleContinue = () => {
    if (isCheckingPhone) return;
    navigation.navigate('OTPVerify', {
      role: 'driver',
      phone,
      registrationData: {
        name: fullName,
        phone: '+91' + phone,
        operatorId: selectedOperator,
        shift: selectedShift,
        inviteId: pendingInvite?.id,
      },
    });
  };

  const operator = operators.find((o) => o.id === selectedOperator);

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
              <Text style={styles.headerEmoji}>🚗</Text>
            </View>
            <Text style={styles.title}>Driver Registration</Text>
            <Text style={styles.subtitle}>
              Join your transport operator and start managing trips
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            {/* Phone */}
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

            {/* Operator */}
            <View style={styles.field}>
              <Text style={styles.label}>Operator / Agency</Text>
              {pendingInvite ? (
                <View style={[styles.input, styles.picker, { backgroundColor: Colors.primaryFaded }]}>
                  <Text style={[styles.pickerText, { color: Colors.primary, fontWeight: '700' }]}>
                    {pendingInvite.operatorName} (Invited)
                  </Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.input, styles.picker]}
                    onPress={() => setShowOperatorPicker(!showOperatorPicker)}
                  >
                    <Text
                      style={[
                        styles.pickerText,
                        !operator && styles.pickerPlaceholder,
                      ]}
                    >
                      {operator?.name ?? 'Select your operator'}
                    </Text>
                    <Text style={styles.pickerArrow}>
                      {showOperatorPicker ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>

                  {showOperatorPicker && (
                    <View style={styles.pickerDropdown}>
                      {operators.map((op) => (
                        <TouchableOpacity
                          key={op.id}
                          style={[
                            styles.pickerOption,
                            selectedOperator === op.id && styles.pickerOptionActive,
                          ]}
                          onPress={() => {
                            setSelectedOperator(op.id);
                            setShowOperatorPicker(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.pickerOptionText,
                              selectedOperator === op.id && styles.pickerOptionTextActive,
                            ]}
                          >
                            {op.name}
                          </Text>
                          <Text style={styles.pickerOptionCode}>{op.code}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>



            {/* Shift Selector */}
            <View style={styles.field}>
              <Text style={styles.label}>Shift</Text>
              <View style={styles.shiftRow}>
                {Config.shifts.map((shift) => (
                  <TouchableOpacity
                    key={shift}
                    style={[
                      styles.shiftChip,
                      selectedShift === shift && styles.shiftChipActive,
                    ]}
                    onPress={() => setSelectedShift(shift)}
                  >
                    <Text
                      style={[
                        styles.shiftChipText,
                        selectedShift === shift && styles.shiftChipTextActive,
                      ]}
                    >
                      {shift === 'Morning' ? '🌅 ' : shift === 'Evening' ? '🌆 ' : '🔄 '}
                      {shift}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Continue Button */}
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
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
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
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  pickerPlaceholder: {
    color: Colors.textTertiary,
  },
  pickerArrow: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  pickerDropdown: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  pickerOptionActive: {
    backgroundColor: Colors.primaryFaded,
  },
  pickerOptionText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  pickerOptionTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  pickerOptionCode: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '600',
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  shiftRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shiftChip: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  shiftChipActive: {
    backgroundColor: Colors.primaryFaded,
    borderColor: Colors.primary,
  },
  shiftChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  shiftChipTextActive: {
    color: Colors.primary,
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
  dropdownStateView: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  dropdownStateText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  dropdownErrorText: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '600',
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
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  inputError: {
    borderColor: Colors.error,
  },
});

export default DriverRegister;
