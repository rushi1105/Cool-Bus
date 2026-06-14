/**
 * AppNavigator — Root navigator with auth-aware, role-based routing
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import WelcomeScreen from '../screens/auth/WelcomeScreen';
import DriverRegister from '../screens/auth/DriverRegister';
import ParentRegister from '../screens/auth/ParentRegister';
import OTPVerify from '../screens/auth/OTPVerify';

import { DriverStack } from './DriverStack';
import { ParentStack } from './ParentStack';
import { OperatorStack } from './OperatorStack';

import { useAuth } from '../hooks/useAuth';
import Colors from '../constants/colors';

const RootStack = createNativeStackNavigator();

export function AppNavigator() {
  const { user, role, loading } = useAuth();

  // Show loading screen while auth state resolves
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Determine initial route based on auth state
  const initialRoute = !user
    ? 'Welcome'
    : role === 'driver'
      ? 'DriverTabs'
      : role === 'parent'
        ? 'ParentTabs'
        : role === 'operator'
          ? 'OperatorTabs'
          : 'Welcome';

  return (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
        initialRouteName={initialRoute}
      >
        {/* Auth Flow */}
        <RootStack.Screen name="Welcome" component={WelcomeScreen} />
        <RootStack.Screen name="DriverRegister" component={DriverRegister} />
        <RootStack.Screen name="ParentRegister" component={ParentRegister} />
        <RootStack.Screen name="OTPVerify" component={OTPVerify} />

        {/* Role-based Main Flows */}
        <RootStack.Screen
          name="DriverTabs"
          component={DriverStack}
          options={{ animation: 'fade' }}
        />
        <RootStack.Screen
          name="ParentTabs"
          component={ParentStack}
          options={{ animation: 'fade' }}
        />
        <RootStack.Screen
          name="OperatorTabs"
          component={OperatorStack}
          options={{ animation: 'fade' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});

export default AppNavigator;
