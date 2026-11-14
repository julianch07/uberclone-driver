// AI-assisted: see docs/AI_LOG.md #12
// AI-assisted: see docs/AI_LOG.md #7
// AI-assisted: see docs/AI_LOG.md #3
// AI-assisted: see docs/AI_LOG.md #24
// Los estilos de carga y error se trasladaron a AppNavigator.
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
// AI-assisted: see docs/AI_LOG.md #22
import { NavigationContainer } from '@react-navigation/native';
// AI-assisted: see docs/AI_LOG.md #16
import { DriverProvider } from './src/context/DriverContext';
// AI-assisted: see docs/AI_LOG.md #22
import AppNavigator from './src/navigation/AppNavigator';
import {
  signInDriverAnonymously,
  subscribeToAuthChanges,
} from './src/services/authService';
import { getDriverRegistration } from './src/services/firestoreService';
import { hasSavedRegistration } from './src/utils/driverRegistration';
// AI-assisted: see docs/AI_LOG.md #38
import DemoModeBanner from './src/components/DemoModeBanner';
// AI-assisted: see docs/AI_LOG.md #39
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { PAYMENTS_DEMO } from './src/config/paymentsDemo';

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

  const app = (
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

  // AI-assisted: see docs/AI_LOG.md #38
  // AI-assisted: see docs/AI_LOG.md #39
  // Sin MODO DEMOSTRACIÓN la app se renderiza igual que siempre. Con el
  // modo, el SafeAreaProvider raíz da al aviso el margen superior del
  // dispositivo, y la navegación va en un SafeAreaProvider anidado debajo
  // del aviso: sus márgenes se miden desde ahí, así no se duplica el margen
  // superior y el aviso no tapa la hora ni la batería.
  if (!PAYMENTS_DEMO.enabled) {
    return app;
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <DemoModeBanner />
      <SafeAreaProvider>{app}</SafeAreaProvider>
    </SafeAreaProvider>
  );
}
