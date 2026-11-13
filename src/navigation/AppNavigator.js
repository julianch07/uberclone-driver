// AI-assisted: see docs/AI_LOG.md #22
// AI-assisted: see docs/AI_LOG.md #24
// Navegación principal: registro o pantalla del conductor. Las pestañas
// Inicio, Viajes (viaje activo), Ganancias (Resumen, Pagos, Historial) y
// Perfil se gestionan dentro de DriverHomeScreen. Se eliminaron MainTabs y
// EarningsTabs, que nunca se renderizaban y duplicaban esas pantallas.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import RegistrationScreen from '../screens/registration/RegistrationScreen';
import DriverHomeScreen from '../screens/home/DriverHomeScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator({
  driverUid,
  screen,
  onEditRegistration,
  onRegistrationSaved,
  onBackToHome,
  loadError,
}) {
  // Restaura el comportamiento previo a la navegación: mientras no hay
  // usuario o se consulta el registro se muestra la carga, y si la consulta
  // falla se muestra el error en lugar de abrir la pantalla de inicio.
  if (!driverUid || screen === 'loading' || screen === 'error') {
    return (
      <View style={styles.loadingContainer}>
        {screen === 'error' ? null : (
          <ActivityIndicator size="large" color="#276EF1" />
        )}
        <Text style={styles.loadingText}>
          {screen === 'error'
            ? loadError
            : 'Preparando el registro del conductor...'}
        </Text>
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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F5F6F8',
  },
  loadingText: {
    marginTop: 14,
    color: '#686868',
    fontSize: 14,
    textAlign: 'center',
  },
});
