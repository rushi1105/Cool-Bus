import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Colors from '../../constants/colors';
import { formatDistance, formatWalkingTime } from '../../utils/stopUtils';
import type { StopCandidate } from '../../hooks/useStopsForOperator';

const SHEET_HEIGHT = 380;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StopBottomSheetProps {
  stop: StopCandidate | null;
  operators: Array<{ operatorId: string; operatorName: string; routeId: string; routeName: string }>;
  visible: boolean;
  loading?: boolean;
  isRecommended?: boolean;
  onSelectOperator: (operatorId: string, routeId: string) => void;
  onConfirm: (stop: StopCandidate, operatorId: string) => void;
  onDismiss: () => void;
  selectedOperatorId?: string | null;
}

export const StopBottomSheet: React.FC<StopBottomSheetProps> = ({
  stop,
  operators,
  visible,
  loading,
  isRecommended,
  onSelectOperator,
  onConfirm,
  onDismiss,
  selectedOperatorId,
}) => {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible && stop) {
      Animated.spring(translateY, {
        toValue: 0,
        damping: 20,
        stiffness: 150,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, stop, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          translateY.setValue(gs.dy);
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 100) {
          onDismiss();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            damping: 20,
            stiffness: 150,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!visible || !stop) return null;

  const uniqueOperators = operators.filter(
    (o, i, arr) => arr.findIndex(a => a.operatorId === o.operatorId) === i
  );

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }] },
      ]}
    >
      <View style={styles.handleContainer} {...panResponder.panHandlers}>
        <View style={styles.handle} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <View style={styles.nameRow}>
              <Text style={styles.stopName}>{stop.name}</Text>
              {isRecommended && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedBadgeText}>Best Match</Text>
                </View>
              )}
            </View>
            {stop.landmark ? (
              <Text style={styles.landmark}>{stop.landmark}</Text>
            ) : null}
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>🚶</Text>
              <Text style={styles.infoValue}>{formatDistance(stop.distanceMeters)}</Text>
              <Text style={styles.infoLabel}>Distance</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>⏱</Text>
              <Text style={styles.infoValue}>{formatWalkingTime(stop.walkingMinutes)}</Text>
              <Text style={styles.infoLabel}>Walk time</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>🕐</Text>
              <Text style={styles.infoValue}>—</Text>
              <Text style={styles.infoLabel}>Pickup time</Text>
            </View>
          </View>

          {uniqueOperators.length > 1 && (
            <View style={styles.operatorSection}>
              <Text style={styles.operatorSectionTitle}>Served by</Text>
              {uniqueOperators.map(op => (
                <TouchableOpacity
                  key={op.operatorId}
                  style={[
                    styles.operatorRow,
                    selectedOperatorId === op.operatorId && styles.operatorRowActive,
                  ]}
                  onPress={() => onSelectOperator(op.operatorId, op.routeId)}
                  activeOpacity={0.7}
                >
                  <View style={styles.operatorInfo}>
                    <Text
                      style={[
                        styles.operatorName,
                        selectedOperatorId === op.operatorId && styles.operatorNameActive,
                      ]}
                    >
                      {op.operatorName}
                    </Text>
                    <Text style={styles.operatorRoute}>{op.routeName}</Text>
                  </View>
                  {selectedOperatorId === op.operatorId && (
                    <Text style={styles.operatorCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {uniqueOperators.length === 1 && (
            <View style={styles.singleOperatorInfo}>
              <Text style={styles.singleOperatorLabel}>Operator</Text>
              <Text style={styles.singleOperatorName}>{uniqueOperators[0].operatorName}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.confirmButton,
              uniqueOperators.length > 1 && !selectedOperatorId && styles.confirmButtonDisabled,
            ]}
            onPress={() => {
              const targetOp = selectedOperatorId
                ? operators.find(o => o.operatorId === selectedOperatorId)
                : operators[0];
              if (targetOp) {
                onConfirm(stop, targetOp.operatorId);
              }
            }}
            disabled={uniqueOperators.length > 1 && !selectedOperatorId}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmButtonText}>
              {uniqueOperators.length > 1 && !selectedOperatorId
                ? 'Select an operator above'
                : 'Select This Stop'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 32,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stopName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark,
    flexShrink: 1,
  },
  recommendedBadge: {
    backgroundColor: Colors.successFaded,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  recommendedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.success,
  },
  landmark: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  infoItem: {
    alignItems: 'center',
    gap: 4,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  operatorSection: {
    marginBottom: 16,
  },
  operatorSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  operatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.background,
    marginBottom: 6,
  },
  operatorRowActive: {
    backgroundColor: Colors.primaryFaded,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  operatorInfo: {
    flex: 1,
  },
  operatorName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
  },
  operatorNameActive: {
    color: Colors.primary,
  },
  operatorRoute: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  operatorCheck: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '700',
  },
  singleOperatorInfo: {
    marginBottom: 16,
  },
  singleOperatorLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  singleOperatorName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
    marginTop: 2,
  },
  confirmButton: {
    height: 52,
    backgroundColor: Colors.success,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.textTertiary,
    elevation: 0,
    shadowOpacity: 0,
  },
  confirmButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
