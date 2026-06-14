/**
 * AddChild Screen
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, StatusBar, Alert } from 'react-native';
import Colors from '../../constants/colors';
import CouponInput from '../../components/CouponInput';
import { useCoupon } from '../../hooks/useCoupon';
import { firebaseService } from '../../services/firebase';

interface AddChildProps {
  navigation: any;
}

export const AddChild: React.FC<AddChildProps> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [gender, setGender] = useState('Male');

  const coupon = useCoupon();

  const isValid = name.trim() && grade.trim();

  const handleAdd = async () => {
    // Mock parent and operator IDs for now
    const parentId = 'par-1';
    const operatorId = 'op-1';

    // Redeem coupon if valid
    let hasCoupon = false;
    if (coupon.validation?.valid && coupon.validation.coupon) {
      // In a real app we would get the parent's phone from their profile
      await coupon.redeemCode(parentId, '+919876543210');
      hasCoupon = true;
    }

    await firebaseService.addStudent({
      name,
      parentId,
      busId: 'bus-1',
      operatorId,
      grade,
      gender: gender as any,
      stopLocation: { latitude: 12.9750, longitude: 77.5980, label: 'Custom Stop' }
    }, hasCoupon);

    Alert.alert('Child Added', `${name} has been added successfully!`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add Child</Text>
        <Text style={styles.subtitle}>Add another child to track on BusTrack</Text>

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
              onValidate={() => coupon.validateCode('+919876543210')}
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
});

export default AddChild;
