/**
 * BusTrack — Main Application Entry Point
 *
 * School bus tracking app for parents, drivers, and operators.
 */

import React from 'react';
import { StatusBar, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';

// Suppress specific harmless warnings in development
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F1F5F9" />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}
