import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert, Animated } from 'react-native';
import Colors from '../../constants/colors';
import { resolveInviteCode } from '../../services/invites/InviteService';

interface InviteResolverScreenProps {
  route: any;
  navigation: any;
}

export const InviteResolverScreen: React.FC<InviteResolverScreenProps> = ({ route, navigation }) => {
  const { code } = route.params || {};
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const verifyInvite = async () => {
      try {
        if (!code) {
          throw new Error('No invite code provided.');
        }

        const resolved = await resolveInviteCode(code);
        
        if (!resolved) {
          throw new Error('This invite link is invalid, expired, or has been revoked.');
        }

        // Navigate to appropriate registration screen
        if (resolved.role === 'driver') {
          navigation.replace('DriverRegister', { resolvedInvite: resolved });
        } else if (resolved.role === 'parent') {
          navigation.replace('ParentRegister', { resolvedInvite: resolved });
        } else {
          throw new Error(`Unknown role: ${resolved.role}`);
        }
        
      } catch (error: any) {
        Alert.alert(
          'Invite Error',
          error.message || 'Failed to resolve the invite link.',
          [
            { text: 'OK', onPress: () => navigation.replace('Welcome') }
          ]
        );
      }
    };

    // Small delay for smooth transition
    const timer = setTimeout(verifyInvite, 800);

    return () => clearTimeout(timer);
  }, [code, navigation, fadeAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>💌</Text>
        </View>
        <Text style={styles.title}>Opening Invite...</Text>
        <Text style={styles.subtitle}>Please wait while we verify your link.</Text>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  loader: {
    transform: [{ scale: 1.2 }],
  },
});

export default InviteResolverScreen;
