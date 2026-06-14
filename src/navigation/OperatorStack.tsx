/**
 * OperatorStack — Stack + Tab navigator for operator screens
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import Colors from '../constants/colors';

import OperatorHome from '../screens/operator/OperatorHome';
import FleetMap from '../screens/operator/FleetMap';
import DriverAttendance from '../screens/operator/DriverAttendance';
import FeeManagement from '../screens/operator/FeeManagement';
import CouponManager from '../screens/operator/CouponManager';
import SendReminder from '../screens/operator/SendReminder';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function OperatorTabs() {
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
            Dashboard: '📊',
            Fleet: '🗺️',
            Drivers: '🚗',
            Fees: '💰',
            More: '⚙️',
          };
          return (
            <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
              <Text style={styles.tabIconText}>{icons[route.name]}</Text>
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={OperatorHome} />
      <Tab.Screen name="Fleet" component={FleetMap} />
      <Tab.Screen name="Drivers" component={DriverAttendance} />
      <Tab.Screen name="Fees" component={FeeManagement} />
      <Tab.Screen name="More" component={CouponManager} />
    </Tab.Navigator>
  );
}

export function OperatorStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OperatorTabsInner" component={OperatorTabs} />
      <Stack.Screen name="FleetMap" component={FleetMap} />
      <Stack.Screen name="FeeManagement" component={FeeManagement} />
      <Stack.Screen name="CouponManager" component={CouponManager} />
      <Stack.Screen name="SendReminder" component={SendReminder} />
      <Stack.Screen name="DriverAttendance" component={DriverAttendance} />
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

export default OperatorStack;
