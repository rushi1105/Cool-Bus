import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useStudents } from '../../hooks/useStudents';
import { getRoute } from '../../repositories/routeRepository';
import { createRequest } from '../../repositories/requestRepository';
import type { Student, Route, RouteStop } from '../../repositories/types';

export default function RequestStopChange({ navigation }: any) {
  const { profile } = useAuth();
  const parentId = profile?.id ?? '';
  const operatorId = profile?.operatorId ?? '';
  const { students, loading: studentsLoading } = useStudents(operatorId);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedStudent?.routeId) {
      setRoute(null);
      return;
    }
    getRoute(selectedStudent.routeId).then((r) => setRoute(r)).catch((err) => console.error('[RequestStopChange] getRoute error:', err));
  }, [selectedStudent?.routeId]);

  const parentStudents = students.filter((s) => s.parentId === parentId && s.isActive !== false);

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setSelectedStopId(null);
  };

  const handleSubmit = async () => {
    if (!selectedStudent || !selectedStopId || !route || !operatorId) return;
    setSubmitting(true);
    try {
      await createRequest({
        operatorId,
        parentId,
        studentId: selectedStudent.id,
        routeId: route.id,
        currentStopId: selectedStudent.stopId ?? '',
        requestedStopId: selectedStopId,
        reason: reason || undefined,
      });
      Alert.alert('Request Submitted', 'Your stop change request has been sent to the operator.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (studentsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Request Stop Change</Text>

      <Text style={styles.sectionTitle}>Select Student</Text>
      {parentStudents.map((student) => (
        <TouchableOpacity
          key={student.id}
          style={[
            styles.studentCard,
            selectedStudent?.id === student.id && styles.selectedCard,
          ]}
          onPress={() => handleStudentSelect(student)}
        >
          <Text style={styles.studentName}>{student.name}</Text>
          <Text style={styles.studentStop}>
            Current: {student.stopLocation?.label ?? student.stopId ?? 'Not set'}
          </Text>
        </TouchableOpacity>
      ))}

      {selectedStudent && route && (
        <>
          <Text style={styles.sectionTitle}>Route: {route.name}</Text>
          <Text style={styles.sectionSubtitle}>Select a new stop:</Text>
          {route.stops.map((stop: RouteStop) => (
            <TouchableOpacity
              key={stop.id}
              style={[
                styles.stopCard,
                selectedStopId === stop.id && styles.selectedCard,
              ]}
              disabled={stop.id === selectedStudent.stopId}
              onPress={() => setSelectedStopId(stop.id)}
            >
              <Text style={styles.stopName}>{stop.name}</Text>
              <Text style={styles.stopAddress}>{stop.address ?? ''}</Text>
              {stop.id === selectedStudent.stopId && (
                <Text style={styles.currentLabel}>Current Stop</Text>
              )}
            </TouchableOpacity>
          ))}
        </>
      )}

      {selectedStudent && !route && (
        <Text style={styles.noRoute}>This student is not assigned to a route.</Text>
      )}

      <TouchableOpacity
        style={[styles.submitButton, (!selectedStudent || !selectedStopId || submitting) && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={!selectedStudent || !selectedStopId || submitting}
      >
        <Text style={styles.submitText}>
          {submitting ? 'Submitting...' : 'Submit Request'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginVertical: 12 },
  sectionSubtitle: { fontSize: 14, color: '#666', marginBottom: 8 },
  studentCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  selectedCard: { borderColor: '#4a90d9', backgroundColor: '#e8f0fe' },
  studentName: { fontSize: 16, fontWeight: '600' },
  studentStop: { fontSize: 13, color: '#666', marginTop: 4 },
  stopCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  stopName: { fontSize: 15, fontWeight: '500' },
  stopAddress: { fontSize: 12, color: '#999', marginTop: 2 },
  currentLabel: { fontSize: 11, color: '#999', marginTop: 4, fontStyle: 'italic' },
  noRoute: { textAlign: 'center', color: '#999', marginTop: 20 },
  submitButton: {
    backgroundColor: '#4a90d9',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  disabledButton: { opacity: 0.5 },
  submitText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
