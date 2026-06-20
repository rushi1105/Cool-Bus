import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { Marker, LongPressEvent, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Crypto from 'expo-crypto';
import Colors from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { createRoute, updateRoute } from '../../repositories/routeRepository';
import type { Route, RouteStop } from '../../repositories/types';

interface RouteEditorProps {
  navigation: any;
  route: any;
}

const INITIAL_REGION = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export const RouteEditor: React.FC<RouteEditorProps> = ({ navigation, route }) => {
  const { profile } = useAuth();
  const existingRoute: Route | undefined = route.params?.route;
  const operatorId: string = route.params?.operatorId ?? profile?.operatorId ?? '';

  const [name, setName] = useState(existingRoute?.name || '');
  const [stops, setStops] = useState<RouteStop[]>(existingRoute?.stops || []);
  const [saving, setSaving] = useState(false);
  const [selectedStopIndex, setSelectedStopIndex] = useState<number | null>(null);
  const [editStopName, setEditStopName] = useState('');

  const isEditing = !!existingRoute;

  const handleMapLongPress = useCallback((e: LongPressEvent) => {
    const { coordinate } = e.nativeEvent;
    const newStop: RouteStop = {
      id: Crypto.randomUUID(),
      name: `Stop ${stops.length + 1}`,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    };
    setStops((prev) => [...prev, newStop]);
  }, [stops.length]);

  const handleDeleteStop = useCallback((index: number) => {
    setStops((prev) => prev.filter((_, i) => i !== index));
    setSelectedStopIndex(null);
  }, []);

  const handleMoveStopUp = useCallback((index: number) => {
    if (index === 0) return;
    setStops((prev) => {
      const updated = [...prev];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      return updated;
    });
  }, []);

  const handleMoveStopDown = useCallback((index: number) => {
    if (index >= stops.length - 1) return;
    setStops((prev) => {
      const updated = [...prev];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      return updated;
    });
  }, [stops.length]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Please enter a route name.');
      return;
    }
    if (stops.length < 2) {
      Alert.alert('Validation', 'A route must have at least 2 stops.');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && existingRoute) {
        await updateRoute(existingRoute.id, {
          name: name.trim(),
          stops,
          isActive: true,
        });
      } else {
        await createRoute({
          operatorId,
          name: name.trim(),
          stops,
          isActive: true,
        });
      }
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  }, [name, stops, operatorId, isEditing, existingRoute, navigation]);

  const renderStopItem = ({ item, index }: { item: RouteStop; index: number }) => (
    <TouchableOpacity
      style={[styles.stopItem, selectedStopIndex === index && styles.stopItemSelected]}
      onPress={() => { setSelectedStopIndex(index); setEditStopName(item.name); }}
      activeOpacity={0.7}
    >
      <View style={styles.stopOrder}>
        <Text style={styles.stopOrderText}>{index + 1}</Text>
      </View>
      <View style={styles.stopInfo}>
        {selectedStopIndex === index ? (
          <TextInput
            style={styles.stopNameInput}
            value={editStopName}
            onChangeText={setEditStopName}
            onBlur={() => {
              setStops((prev) => prev.map((s, i) => i === index ? { ...s, name: editStopName } : s));
              setSelectedStopIndex(null);
            }}
            onSubmitEditing={() => {
              setStops((prev) => prev.map((s, i) => i === index ? { ...s, name: editStopName } : s));
              setSelectedStopIndex(null);
            }}
            autoFocus
            selectTextOnFocus
            placeholder="Stop name"
            placeholderTextColor={Colors.textTertiary}
          />
        ) : (
          <Text style={styles.stopName} numberOfLines={1}>{item.name}</Text>
        )}
        <Text style={styles.stopCoords}>
          {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
        </Text>
      </View>
      <View style={styles.stopActions}>
        <TouchableOpacity onPress={() => handleMoveStopUp(index)} style={styles.moveBtn} disabled={index === 0}>
          <Text style={[styles.moveBtnText, index === 0 && styles.moveBtnDisabled]}>↑</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleMoveStopDown(index)} style={styles.moveBtn} disabled={index >= stops.length - 1}>
          <Text style={[styles.moveBtnText, index >= stops.length - 1 && styles.moveBtnDisabled]}>↓</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteStop(index)} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? 'Edit Route' : 'New Route'}</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Route Name */}
        <View style={styles.nameRow}>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="Route name (e.g. Morning Route A)"
            placeholderTextColor={Colors.textTertiary}
          />
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={INITIAL_REGION}
            onLongPress={handleMapLongPress}
          >
            {stops.map((s, i) => (
              <Marker
                key={s.id}
                coordinate={{ latitude: s.latitude, longitude: s.longitude }}
                title={s.name}
                description={`Stop ${i + 1}`}
                pinColor={i === 0 ? 'green' : i === stops.length - 1 ? 'red' : 'blue'}
                draggable
                onDragEnd={(e) => {
                  const { coordinate } = e.nativeEvent;
                  setStops((prev) => prev.map((p, j) => j === i ? { ...p, latitude: coordinate.latitude, longitude: coordinate.longitude } : p));
                }}
              />
            ))}
          </MapView>
          <View style={styles.mapHint}>
            <Text style={styles.mapHintText}>Long-press on the map to drop a stop pin</Text>
          </View>
        </View>

        {/* Stops List */}
        {stops.length > 0 && (
          <View style={styles.stopsContainer}>
            <Text style={styles.stopsTitle}>Stops ({stops.length})</Text>
            <FlatList
              data={stops}
              renderItem={renderStopItem}
              keyExtractor={(item) => item.id}
              style={styles.stopsList}
              contentContainerStyle={styles.stopsListContent}
            />
          </View>
        )}

        {/* Validation Hint */}
        {stops.length < 2 && stops.length > 0 && (
          <View style={styles.validationHint}>
            <Text style={styles.validationHintText}>Add at least 1 more stop</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    paddingVertical: 6,
    paddingRight: 12,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.dark,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  nameRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  nameInput: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
  },
  mapContainer: {
    height: 280,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapHint: {
    position: 'absolute',
    bottom: 8,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  mapHintText: {
    fontSize: 12,
    color: Colors.white,
    textAlign: 'center',
  },
  stopsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  stopsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  stopsList: {
    flex: 1,
  },
  stopsListContent: {
    paddingBottom: 16,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginBottom: 6,
  },
  stopItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFaded,
  },
  stopOrder: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stopOrderText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
  },
  stopNameInput: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
  },
  stopCoords: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  stopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moveBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
  },
  moveBtnDisabled: {
    opacity: 0.3,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: Colors.errorFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.error,
  },
  validationHint: {
    backgroundColor: Colors.warningFaded,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.warning,
  },
  validationHintText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.warning,
    textAlign: 'center',
  },
});

export default RouteEditor;
