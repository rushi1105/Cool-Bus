import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useRequests } from '../../hooks/useRequests';
import { useStudents } from '../../hooks/useStudents';
import { getRoute } from '../../repositories/routeRepository';
import { resolveRequest } from '../../repositories/requestRepository';
import { updateStudentStop } from '../../repositories/studentRepository';
import { NotificationService } from '../../services/notifications/NotificationService';
import type { StopChangeRequest, Student, Route } from '../../repositories/types';

export default function RequestsScreen() {
  const { profile } = useAuth();
  const operatorId = profile?.operatorId ?? null;
  const { requests, pendingCount, loading } = useRequests(operatorId);
  const { students } = useStudents(operatorId);

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');

  const handleApprove = async (req: StopChangeRequest) => {
    const student = students.find((s) => s.id === req.studentId);
    if (!student) {
      Alert.alert('Error', 'Student not found');
      return;
    }

    try {
      await resolveRequest(req.id, 'APPROVED');
      await updateStudentStop(req.studentId, req.requestedStopId);

      const route = await getRoute(req.routeId);
      const newStop = route?.stops.find((s) => s.id === req.requestedStopId);
      await NotificationService.sendStopChangeApproved(
        req.parentId,
        student.name,
        newStop?.name ?? req.requestedStopId,
      );

      Alert.alert('Approved', `Stop change approved for ${student.name}.`);
    } catch {
      Alert.alert('Error', 'Failed to approve request.');
    }
  };

  const handleReject = async (req: StopChangeRequest) => {
    const student = students.find((s) => s.id === req.studentId);
    try {
      await resolveRequest(req.id, 'REJECTED');
      await NotificationService.sendStopChangeRejected(
        req.parentId,
        student?.name ?? 'Student',
      );
      Alert.alert('Rejected', 'Request has been rejected.');
    } catch {
      Alert.alert('Error', 'Failed to reject request.');
    }
  };

  const renderRequest = ({ item }: { item: StopChangeRequest }) => {
    const student = students.find((s) => s.id === item.studentId);
    return (
      <View style={styles.requestCard}>
        <Text style={styles.studentName}>{student?.name ?? 'Unknown'}</Text>
        <Text style={styles.detail}>Current stop ID: {item.currentStopId}</Text>
        <Text style={styles.detail}>Requested stop ID: {item.requestedStopId}</Text>
        {item.reason && <Text style={styles.reason}>Reason: {item.reason}</Text>}
        <Text style={[styles.status, item.status === 'PENDING' && styles.pending]}>
          {item.status}
        </Text>
        {item.status === 'PENDING' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.approveButton}
              onPress={() => handleApprove(item)}
            >
              <Text style={styles.actionText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleReject(item)}
            >
              <Text style={styles.actionText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Requests ({pendingCount} pending)</Text>
      <FlatList
        data={requests}
        renderItem={renderRequest}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No requests yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  requestCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  studentName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  detail: { fontSize: 13, color: '#666', marginTop: 2 },
  reason: { fontSize: 13, color: '#333', marginTop: 4, fontStyle: 'italic' },
  status: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  pending: { color: '#ff9800' },
  actions: { flexDirection: 'row', marginTop: 12, gap: 8 },
  approveButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#e53935',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionText: { color: '#fff', fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40 },
});
