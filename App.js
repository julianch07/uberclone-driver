// AI-assisted: see docs/AI_LOG.md #12
// AI-assisted: see docs/AI_LOG.md #7
// AI-assisted: see docs/AI_LOG.md #3
// AI-assisted: see docs/AI_LOG.md #24 (estilos de carga/error movidos a AppNavigator)
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
// AI-assisted: see docs/AI_LOG.md #16
import { NavigationContainer } from '@react-navigation/native';
import { DriverProvider } from './src/context/DriverContext';
import AppNavigator from './src/navigation/AppNavigator';
import {
  signInDriverAnonymously,
  subscribeToAuthChanges,
} from './src/services/authService';
import { getDriverRegistration } from './src/services/firestoreService';
import { hasSavedRegistration } from './src/utils/driverRegistration';

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
    <NavigationContainer>
      <StatusBar style="dark" />
      <DriverProvider key={driverUid || 'guest'} uid={driverUid}>
        <AppNavigator 
          driverUid={driverUid}
          screen={screen}
          onEditRegistration={() => setScreen('registration')}
          onRegistrationSaved={() => setScreen('home')}
          onBackToHome={() => setScreen('home')}
          loadError={loadError}
        />
      </DriverProvider>
    </NavigationContainer>
  );
}
