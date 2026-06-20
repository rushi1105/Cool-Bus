/**
 * OperatorStack — Stack + Tab navigator for operator screens
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import Colors from '../constants/colors';

import OperatorDashboardRouter from './OperatorDashboardRouter';
import OperatorHome from '../screens/operator/OperatorHome';
import FleetMap from '../screens/operator/FleetMap';
import DriverAttendance from '../screens/operator/DriverAttendance';
import FeeManagement from '../screens/operator/FeeManagement';
import CouponManager from '../screens/operator/CouponManager';
import SendReminder from '../screens/operator/SendReminder';
import RouteEditor from '../screens/operator/RouteEditor';
import BusManager from '../screens/operator/BusManager';
import AssignmentScheduler from '../screens/operator/AssignmentScheduler';
import DriverManagement from '../screens/operator/DriverManagement';
import RequestsScreen from '../screens/operator/RequestsScreen';

import OperatorSettings from '../screens/operator/OperatorSettings';

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
            Settings: '⚙️',
          };
          return (
            <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
              <Text style={styles.tabIconText}>{icons[route.name]}</Text>
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={OperatorDashboardRouter} />
      <Tab.Screen name="Fleet" component={FleetMap} />
      <Tab.Screen name="Drivers" component={AssignmentScheduler} />
      <Tab.Screen name="Fees" component={FeeManagement} />
      <Tab.Screen name="Settings" component={OperatorSettings} />
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
      <Stack.Screen name="RouteEditor" component={RouteEditor} />
      <Stack.Screen name="BusManager" component={BusManager} />
      <Stack.Screen name="AssignmentScheduler" component={AssignmentScheduler} />
      <Stack.Screen name="DriverManagement" component={DriverManagement} />
      <Stack.Screen name="Requests" component={RequestsScreen} />
      <Stack.Screen name="Settings" component={OperatorSettings} />
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
