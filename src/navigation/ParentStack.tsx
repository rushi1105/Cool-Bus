/**
 * ParentStack — Stack + Tab navigator for parent screens
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import Colors from '../constants/colors';

import ParentHome from '../screens/parent/ParentHome';
import LiveTracking from '../screens/parent/LiveTracking';
import PaymentScreen from '../screens/parent/PaymentScreen';
import TransactionHistory from '../screens/parent/TransactionHistory';
import AddChild from '../screens/parent/AddChild';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ParentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => {
          const icons: Record<string, string> = {
            Home: '🏠',
            Track: '📍',
            Pay: '💳',
            History: '📜',
          };
          return (
            <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
              <Text style={styles.tabIconText}>{icons[route.name]}</Text>
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={ParentHome} />
      <Tab.Screen name="Track" component={LiveTracking} />
      <Tab.Screen name="Pay" component={PaymentScreen} />
      <Tab.Screen name="History" component={TransactionHistory} />
    </Tab.Navigator>
  );
}

export function ParentStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ParentTabsInner" component={ParentTabs} />
      <Stack.Screen name="LiveTracking" component={LiveTracking} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="AddChild" component={AddChild} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 0,
    elevation: 12,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    height: 70,
    paddingBottom: 10,
    paddingTop: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'absolute',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tabIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconActive: {
    backgroundColor: Colors.primaryFaded,
  },
  tabIconText: {
    fontSize: 18,
  },
});

export default ParentStack;
