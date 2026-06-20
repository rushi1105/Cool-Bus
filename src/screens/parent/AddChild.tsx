/**
 * AddChild Screen
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, StatusBar, Alert, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import CouponInput from '../../components/CouponInput';
import { useCoupon } from '../../hooks/useCoupon';
import { useAuth } from '../../hooks/useAuth';
import { getUserByUid } from '../../repositories/authRepository';
import { getOperatorByCode } from '../../repositories/operatorRepository';
import { getStudentCountByParent, addStudentDoc } from '../../repositories/studentRepository';
import { createFeeDoc } from '../../repositories/feeRepository';
import type { User } from '../../repositories/types';

interface AddChildProps {
  navigation: any;
}

export const AddChild: React.FC<AddChildProps> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [gender, setGender] = useState('Male');

  const { user } = useAuth();
  const [parentProfile, setParentProfile] = useState<User | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileErrorMsg, setProfileErrorMsg] = useState('');
  const [operatorId, setOperatorId] = useState('');

  const coupon = useCoupon();

  // Fetch parent profile and validate operator code on mount
  useEffect(() => {
    if (!user?.uid) return;

    const loadProfile = async () => {
      setIsLoadingProfile(true);
      setProfileErrorMsg('');
      try {
        const profile = await getUserByUid(user.uid);
        if (!profile) {
          setProfileErrorMsg('Parent profile not found.');
          return;
        }
        setParentProfile(profile);

        if (!profile.operatorCode) {
          setProfileErrorMsg('No operator code found on your profile. Please register with an operator first.');
          return;
        }

        const operator = await getOperatorByCode(profile.operatorCode);
        if (!operator) {
          setProfileErrorMsg(`Operator code "${profile.operatorCode}" on your profile is invalid.`);
          return;
        }

        setOperatorId(operator.id);
      } catch (err) {
        console.error('[AddChild] Load profile error:', err);
        setProfileErrorMsg('Failed to load parent profile information.');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadProfile();
  }, [user?.uid]);

  const isCreationBlocked = !operatorId || !!profileErrorMsg;
  const isValid = name.trim() && grade.trim() && !isCreationBlocked && !isLoadingProfile;

  const handleAdd = async () => {
    if (!user?.uid || !operatorId || !parentProfile) {
      Alert.alert('Error', 'Unable to create student. Profile info is missing.');
      return;
    }

    try {
      // 1. Check coupon redemption
      let isCouponApplied = false;
      if (coupon.validation?.valid && coupon.validation.coupon) {
        // Redeem the coupon using parent uid and phone (if available)
        const success = await coupon.redeemCode(user.uid, parentProfile.phone);
        if (success) {
          isCouponApplied = true;
        } else {
          Alert.alert('Coupon Error', 'Failed to redeem coupon. Proceeding without coupon.');
        }
      }

      // 2. Count existing children to see if first child or additional
      const studentCount = await getStudentCountByParent(user.uid);
      const isFirstChild = studentCount === 0;

      // 3. Create student document
      // We pass busId as "" and stopLocation as null (since they are unassigned initially)
      const studentId = await addStudentDoc({
        name: name.trim(),
        parentId: user.uid,
        busId: '',
        operatorId: operatorId,
        grade: grade.trim(),
        gender: gender as 'Male' | 'Female' | 'Other',
        stopLocation: null,
      });

      // 4. Create fee document
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Rules:
      // - First child OR coupon applied -> TRIAL
      // - Additional children without coupon -> UNPAID
      const feeStatus = (isFirstChild || isCouponApplied) ? 'TRIAL' : 'UNPAID';
      const total = feeStatus === 'TRIAL' ? 0 : 2500;

      await createFeeDoc({
        parentId: user.uid,
        operatorId: operatorId,
        studentId: studentId,
        status: feeStatus,
        month: currentMonth,
        total: total,
        trialUsed: isFirstChild || isCouponApplied,
        trialExpiry: feeStatus === 'TRIAL' ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : undefined,
      });

      Alert.alert('Child Added', `${name} has been added successfully!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error('[AddChild] Add student failed:', err);
      Alert.alert('Error', 'Failed to add child. Please try again.');
    }
  };

  if (isLoadingProfile) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading profile details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add Child</Text>
        <Text style={styles.subtitle}>Add another child to track on BusTrack</Text>

        {profileErrorMsg ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{profileErrorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Child Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter child's name" placeholderTextColor={Colors.textTertiary} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Grade</Text>
            <TextInput style={styles.input} value={grade} onChangeText={setGrade} placeholder="e.g. 5th" placeholderTextColor={Colors.textTertiary} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderRow}>
              {['Male', 'Female', 'Other'].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderChip, gender === g && styles.genderActive]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <CouponInput
              value={coupon.code}
              onChangeText={coupon.setCode}
              onValidate={() => coupon.validateCode(parentProfile?.phone || '')}
              isValidating={coupon.isValidating}
              validationMessage={coupon.validation?.message}
              isValid={coupon.validation?.valid}
            />
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Note: Additional children do not automatically qualify for a free trial.
            Use a coupon code during registration for 1 free month.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addButton, !isValid && styles.addButtonDisabled]}
          onPress={handleAdd}
          disabled={!isValid}
          activeOpacity={0.85}
        >
          <Text style={styles.addButtonText}>Add Child</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 15, color: Colors.textSecondary, fontWeight: '600' },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.dark, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 32 },
  form: { gap: 20 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  input: {
    height: 52, backgroundColor: Colors.white, borderRadius: 14, paddingHorizontal: 16,
    fontSize: 15, color: Colors.textPrimary, borderWidth: 1.5, borderColor: Colors.border,
  },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderChip: {
    flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border,
  },
  genderActive: { backgroundColor: Colors.primaryFaded, borderColor: Colors.primary },
  genderText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  genderTextActive: { color: Colors.primary },
  infoCard: {
    flexDirection: 'row', backgroundColor: Colors.primaryFaded, borderRadius: 14,
    padding: 14, gap: 10, marginTop: 28, marginBottom: 24, alignItems: 'flex-start',
  },
  infoIcon: { fontSize: 16 },
  infoText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  addButton: {
    height: 56, backgroundColor: Colors.primary, borderRadius: 16, justifyContent: 'center',
    alignItems: 'center', elevation: 4, shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  addButtonDisabled: { backgroundColor: Colors.textTertiary, elevation: 0, shadowOpacity: 0 },
  addButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  errorBanner: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  errorBannerText: {
    color: '#721c24',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
});

export default AddChild;
