
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';

import RegistrationScreen from '../screens/registration/RegistrationScreen';
import DriverHomeScreen from '../screens/home/DriverHomeScreen';
import EarningsScreen from '../screens/home/EarningsScreen';
import ProfileScreen from '../screens/home/ProfileScreen';
import TripHistoryScreen from '../screens/home/TripHistoryScreen';
import PaymentSummaryScreen from '../screens/home/PaymentSummaryScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function EarningsTabs({ uid }) {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { display: 'none' }, // We use custom sub-tabs in the screen
        headerShown: false,
      }}
    >
      <Tab.Screen name="EarningsSummary">
        {(props) => <EarningsScreen {...props} uid={uid} />}
      </Tab.Screen>
      <Tab.Screen name="PaymentSummary">
        {(props) => <PaymentSummaryScreen {...props} uid={uid} />}
      </Tab.Screen>
      <Tab.Screen name="TripHistory">
        {(props) => <TripHistoryScreen {...props} uid={uid} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function MainTabs({ uid }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#276EF1',
        tabBarInactiveTintColor: '#697386',
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        options={{ title: 'Inicio' }}
      >
        {(props) => <DriverHomeScreen {...props} uid={uid} />}
      </Tab.Screen>
      <Tab.Screen 
        name="EarningsTab" 
        options={{ title: 'Ganancias' }}
      >
        {(props) => <EarningsTabs {...props} uid={uid} />}
      </Tab.Screen>
      <Tab.Screen 
        name="ProfileTab" 
        options={{ title: 'Perfil' }}
      >
        {(props) => <ProfileScreen {...props} uid={uid} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function AppNavigator({ driverUid, screen, onEditRegistration, onRegistrationSaved, onBackToHome }) {
  if (screen === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#276EF1" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {screen === 'registration' ? (
        <Stack.Screen name="Registration">
          {(props) => (
            <RegistrationScreen 
              {...props} 
              uid={driverUid} 
              onRegistrationSaved={onRegistrationSaved}
              onBackToHome={onBackToHome}
            />
          )}
        </Stack.Screen>
      ) : (
        <Stack.Screen name="Main">
          {(props) => (
            <DriverHomeScreen 
              {...props} 
              uid={driverUid} 
              onEditRegistration={onEditRegistration}
            />
          )}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
}
