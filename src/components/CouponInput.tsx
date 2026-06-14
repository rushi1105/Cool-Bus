/**
 * CouponInput Component
 *
 * Inline coupon code entry with validation feedback.
 */

import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Colors from '../constants/colors';

interface CouponInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onValidate: () => void;
  isValidating: boolean;
  validationMessage?: string | null;
  isValid?: boolean;
  placeholder?: string;
}

export const CouponInput: React.FC<CouponInputProps> = ({
  value,
  onChangeText,
  onValidate,
  isValidating,
  validationMessage,
  isValid,
  placeholder = 'Enter coupon code (e.g. OPERATOR-FREE-1234)',
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Coupon Code</Text>
      <Text style={styles.hint}>Optional — Get 1 month free</Text>

      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            validationMessage && isValid ? styles.inputValid : undefined,
            validationMessage && !isValid ? styles.inputInvalid : undefined,
          ]}
          value={value}
          onChangeText={(text) => onChangeText(text.toUpperCase())}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={onValidate}
        />

        <TouchableOpacity
          style={[
            styles.applyButton,
            !value.trim() && styles.applyButtonDisabled,
          ]}
          onPress={onValidate}
          disabled={!value.trim() || isValidating}
          activeOpacity={0.7}
        >
          {isValidating ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.applyButtonText}>Apply</Text>
          )}
        </TouchableOpacity>
      </View>

      {validationMessage && (
        <View
          style={[
            styles.feedback,
            {
              backgroundColor: isValid ? Colors.successFaded : Colors.errorFaded,
              borderColor: isValid ? Colors.success : Colors.error,
            },
          ]}
        >
          <Text
            style={[
              styles.feedbackText,
              { color: isValid ? Colors.success : Colors.error },
            ]}
          >
            {validationMessage}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
    letterSpacing: 1,
  },
  inputValid: {
    borderColor: Colors.success,
    backgroundColor: Colors.successFaded,
  },
  inputInvalid: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorFaded,
  },
  applyButton: {
    height: 48,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonDisabled: {
    backgroundColor: Colors.textTertiary,
  },
  applyButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  feedback: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default CouponInput;
