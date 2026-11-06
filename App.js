// AI-assisted: see docs/AI_LOG.md #3
// AI-assisted: see docs/AI_LOG.md #5
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import RegistrationScreen from './src/screens/registration/RegistrationScreen';
import {
  signInDriverAnonymously,
  subscribeToAuthChanges,
} from './src/services/authService';
import { testDriverFirestoreAccess } from './src/services/firestoreService';

export default function App() {
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      if (!user) {
        signInDriverAnonymously().catch((error) => {
          console.error('Error en la autenticación del conductor:', error);
        });
        return;
      }

      console.log('Conductor autenticado:', user.uid);

      testDriverFirestoreAccess(user.uid)
        .then(() => {
          console.log('Conexión con Firestore verificada correctamente.');
        })
        .catch((error) => {
          console.error('Error al probar Firestore:', error);
        });
    });

    return unsubscribe;
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <RegistrationScreen />
    </>
  );
}