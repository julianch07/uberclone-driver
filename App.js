// AI-assisted: see docs/AI_LOG.md #12
// AI-assisted: see docs/AI_LOG.md #7
// AI-assisted: see docs/AI_LOG.md #3
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import RegistrationScreen from './src/screens/registration/RegistrationScreen';
import DriverHomeScreen from './src/screens/home/DriverHomeScreen';
import { getDriverRegistration } from './src/services/firestoreService';
import { hasSavedRegistration } from './src/utils/driverRegistration';
import {
  signInDriverAnonymously,
  subscribeToAuthChanges,
} from './src/services/authService';

export default function App() {
  const [driverUid, setDriverUid] = useState(null);
  const [screen, setScreen] = useState('loading');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      if (!user) {
        signInDriverAnonymously().catch((error) => {
          console.error('Error en la autenticación del conductor:', error);
        });
        return;
      }

      console.log('Conductor autenticado:', user.uid);
      setDriverUid(user.uid);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!driverUid) return;
    let active = true;
    setScreen('loading');
    getDriverRegistration(driverUid).then((registration) => {
      if (active) setScreen(hasSavedRegistration(registration) ? 'home' : 'registration');
    }).catch((error) => {
      console.error('Error al consultar el registro:', error);
      if (active) { setLoadError('No se pudo comprobar el registro. Revisa tu conexión y reinicia la aplicación.'); setScreen('error'); }
    });
    return () => { active = false; };
  }, [driverUid]);

  return (
    <>
      <StatusBar style="dark" />
      {driverUid && screen === 'home' ? (
        <DriverHomeScreen uid={driverUid} onEditRegistration={() => setScreen('registration')} />
      ) : driverUid && screen === 'registration' ? (
        <RegistrationScreen uid={driverUid} onRegistrationSaved={() => setScreen('home')} onBackToHome={() => setScreen('home')} />
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#276EF1" />
          <Text style={styles.loadingText}>
            {screen === 'error' ? loadError : 'Preparando el registro del conductor...'}
          </Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6F8',
  },
  loadingText: {
    marginTop: 14,
    color: '#686868',
    fontSize: 14,
  },
});
