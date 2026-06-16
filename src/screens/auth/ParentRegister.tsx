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
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface ParentRegisterProps {
  navigation: any;
}

export const ParentRegister: React.FC<ParentRegisterProps> = ({ navigation }) => {
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [childName, setChildName] = useState('');
  const [grade, setGrade] = useState('');
  const [selectedGender, setSelectedGender] = useState<string>('Male');
  const [operatorCode, setOperatorCode] = useState('');

  const [operatorId, setOperatorId] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [buses, setBuses] = useState<any[]>([]);
  const [selectedBusId, setSelectedBusId] = useState('');
  const [selectedBusNumber, setSelectedBusNumber] = useState('');
  const [stops, setStops] = useState<any[]>([]);
  const [selectedStopIndex, setSelectedStopIndex] = useState(-1);
  const [selectedStopName, setSelectedStopName] = useState('');
  const [selectedStopLat, setSelectedStopLat] = useState(0);
  const [selectedStopLng, setSelectedStopLng] = useState(0);
  const [isVerifyingOperator, setIsVerifyingOperator] = useState(false);
  const [operatorError, setOperatorError] = useState('');

  const coupon = useCoupon();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const isFormValid =
    parentName.trim() &&
    phone.trim().length >= 10 &&
    childName.trim() &&
    grade.trim() &&
    operatorCode.trim() &&
    operatorId !== '' &&
    selectedBusId !== '' &&
    selectedStopIndex !== -1;

  const verifyOperator = async () => {
    if (!operatorCode.trim()) return;
    setIsVerifyingOperator(true);
    setOperatorError('');
    setOperatorName('');
    setOperatorId('');
    setBuses([]);
    setSelectedBusId('');
    setStops([]);
    setSelectedStopIndex(-1);

    try {
      const opQ = query(
        collection(db, 'operators'),
        where('code', '==', operatorCode.trim().toUpperCase())
      );
      const opSnap = await getDocs(opQ);

      if (opSnap.empty) {
        setOperatorError('Invalid operator code. Please check and try again.');
        setIsVerifyingOperator(false);
        return;
      }

      const opDoc = opSnap.docs[0];
      const opId = opDoc.id;
      const opData = opDoc.data() as any;

      setOperatorId(opId);
      setOperatorName(opData.name || '');

      const busQ = query(
        collection(db, 'buses'),
        where('operatorId', '==', opId),
        where('shift', '==', 'morning')
      );
      const busSnap = await getDocs(busQ);

      const fetchedBuses = busSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBuses(fetchedBuses);
    } catch (err) {
      console.error('Verify Operator Error:', err);
      setOperatorError('Failed to verify operator. Please try again.');
    } finally {
      setIsVerifyingOperator(false);
    }
  };

  const handleBusSelection = (busId: string) => {
    setSelectedBusId(busId);
    setSelectedStopIndex(-1);
    setSelectedStopName('');
    
    const bus = buses.find(b => b.id === busId);
    if (bus) {
      setSelectedBusNumber(bus.busNumber);
      setStops(bus.stops || []);
    } else {
      setSelectedBusNumber('');
      setStops([]);
    }
  };

  const handleStopSelection = (index: number) => {
    setSelectedStopIndex(index);
    const stop = stops[index];
    if (stop) {
      setSelectedStopName(stop.name || '');
      setSelectedStopLat(stop.lat || 0);
      setSelectedStopLng(stop.lng || 0);
    }
  };

  const handleContinue = () => {
    navigation.navigate('OTPVerify', {
      role: 'parent',
      phone,
      registrationData: {
        parentName,
        phone: '+91' + phone,
        email,
        childName,
        grade,
        gender: selectedGender,
        operatorCode,
        operatorId,
        operatorName,
        selectedBusId,
        selectedBusNumber,
        selectedStopIndex,
        selectedStopName,
        selectedStopLat,
        selectedStopLng,
        couponCode: coupon.code,
      },
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
                style={styles.input}
                value={parentName}
                onChangeText={setParentName}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="9876543210"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email (Optional)</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="parent@email.com"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Child Details Section */}
          <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Child Details</Text>
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Child Name</Text>
              <TextInput
                style={styles.input}
                value={childName}
                onChangeText={setChildName}
                placeholder="Enter child's name"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Grade</Text>
                <TextInput
                  style={styles.input}
                  value={grade}
                  onChangeText={setGrade}
                  placeholder="e.g. 5th"
                  placeholderTextColor={Colors.textTertiary}
                />
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

          {/* Operator & Coupon Section */}
          <Text style={[styles.sectionTitle, { marginTop: 28 }]}>
            Operator & Coupon
          </Text>
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Operator Code</Text>
              <Text style={styles.hint}>
                Ask your bus operator for their code
              </Text>
              <TextInput
                style={styles.input}
                value={operatorCode}
                onChangeText={(text) => setOperatorCode(text.toUpperCase())}
                onBlur={verifyOperator}
                placeholder="e.g. SAFERIDE"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="characters"
              />
              {isVerifyingOperator && <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 8 }} />}
              {operatorError ? <Text style={styles.errorText}>{operatorError}</Text> : null}
              {operatorName ? <Text style={styles.successText}>✓ {operatorName}</Text> : null}
            </View>

            {operatorId ? (
              <View style={styles.field}>
                <Text style={styles.label}>Select Bus</Text>
                {buses.length === 0 ? (
                  <Text style={styles.hint}>No morning buses found.</Text>
                ) : (
                  buses.map((bus) => (
                    <TouchableOpacity
                      key={bus.id}
                      style={[styles.input, styles.selectionItem, selectedBusId === bus.id && styles.selectionItemActive]}
                      onPress={() => handleBusSelection(bus.id)}
                    >
                      <Text style={[styles.selectionText, selectedBusId === bus.id && styles.selectionTextActive]}>
                        {bus.busNumber} {bus.routeName ? `— ${bus.routeName}` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            ) : null}

            {selectedBusId ? (
              <View style={styles.field}>
                <Text style={styles.label}>Select Stop</Text>
                {stops.length === 0 ? (
                  <Text style={styles.hint}>No stops defined for this bus.</Text>
                ) : (
                  stops.map((stop, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.input, styles.selectionItem, selectedStopIndex === index && styles.selectionItemActive]}
                      onPress={() => handleStopSelection(index)}
                    >
                      <Text style={[styles.selectionText, selectedStopIndex === index && styles.selectionTextActive]}>
                        {stop.name || `Stop ${index + 1}`}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            ) : null}

            <CouponInput
              value={coupon.code}
              onChangeText={coupon.setCode}
              onValidate={() => coupon.validateCode(phone)}
              isValidating={coupon.isValidating}
              validationMessage={coupon.validation?.message}
              isValid={coupon.validation?.valid}
            />
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              !isFormValid && styles.continueButtonDisabled,
            ]}
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
});

export default ParentRegister;
