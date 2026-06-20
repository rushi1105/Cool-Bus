import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Colors from '../../constants/colors';
import { useInvites } from '../../hooks/useInvites';
import { useAuth } from '../../hooks/useAuth';
import type { InviteRole } from '../../repositories/types';

export const InviteCard: React.FC = () => {
  const { profile } = useAuth();
  const operatorId = profile?.operatorId || null;
  const operatorName = profile?.name || 'Operator';
  
  const { invites, getPermanent, regeneratePermanent, generating } = useInvites(operatorId, operatorName);

  const driverInvite = invites.find(i => i.role === 'driver' && i.isPermanent && i.status === 'active');
  const parentInvite = invites.find(i => i.role === 'parent' && i.isPermanent && i.status === 'active');

  const handleAction = async (role: InviteRole, action: 'get' | 'regenerate') => {
    try {
      const { deepLink } = action === 'get' 
        ? await getPermanent(role)
        : await regeneratePermanent(role, role === 'driver' ? driverInvite?.id : parentInvite?.id);
      
      if (action === 'regenerate') {
        Alert.alert('Success', `${role.charAt(0).toUpperCase() + role.slice(1)} invite link has been regenerated.`);
      }
    } catch (error) {
      console.error('[InviteCard] Error handling invite:', error);
      Alert.alert('Error', 'Failed to process invite link.');
    }
  };

  const handleCopy = async (code: string) => {
    const deepLink = `coolbus://invite/${code}`;
    await Clipboard.setStringAsync(deepLink);
    Alert.alert('Copied', 'Invite link copied to clipboard.');
  };

  const handleShare = async (code: string) => {
    const deepLink = `coolbus://invite/${code}`;
    await Share.share({ message: deepLink });
  };

  const handleQR = () => {
    Alert.alert('Coming Soon', 'QR Code generation will be available in the next phase.');
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Quick Invites</Text>
      <Text style={styles.description}>Generate invite links for your drivers and parents.</Text>

      <View style={styles.actionsContainer}>
        <View style={styles.roleSection}>
          <Text style={styles.roleTitle}>Drivers</Text>
          <View style={styles.buttonRow}>
            {driverInvite ? (
              <>
                <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={() => handleCopy(driverInvite.code)}>
                  <Text style={styles.buttonTextSecondary}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={() => handleShare(driverInvite.code)}>
                  <Text style={styles.buttonTextSecondary}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.button, styles.buttonDangerOutline]} 
                  onPress={() => handleAction('driver', 'regenerate')}
                  disabled={generating}
                >
                  <Text style={styles.buttonTextDanger}>Reset</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity 
                style={[styles.button, styles.buttonPrimary]} 
                onPress={() => handleAction('driver', 'get')}
                disabled={generating}
              >
                {generating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonTextPrimary}>Create Link</Text>}
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={handleQR}>
              <Text style={styles.buttonTextSecondary}>QR</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.roleSection}>
          <Text style={styles.roleTitle}>Parents</Text>
          <View style={styles.buttonRow}>
            {parentInvite ? (
              <>
                <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={() => handleCopy(parentInvite.code)}>
                  <Text style={styles.buttonTextSecondary}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={() => handleShare(parentInvite.code)}>
                  <Text style={styles.buttonTextSecondary}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.button, styles.buttonDangerOutline]} 
                  onPress={() => handleAction('parent', 'regenerate')}
                  disabled={generating}
                >
                  <Text style={styles.buttonTextDanger}>Reset</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity 
                style={[styles.button, styles.buttonPrimary]} 
                onPress={() => handleAction('parent', 'get')}
                disabled={generating}
              >
                {generating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonTextPrimary}>Create Link</Text>}
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={handleQR}>
              <Text style={styles.buttonTextSecondary}>QR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  actionsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
  },
  roleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
    minWidth: 110,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  buttonDangerOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  buttonTextPrimary: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  buttonTextDanger: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
});
