// AI-assisted: see docs/AI_LOG.md #7
// AI-assisted: see docs/AI_LOG.md #3
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import RegistrationScreen from './src/screens/registration/RegistrationScreen';
import {
  signInDriverAnonymously,
  subscribeToAuthChanges,
} from './src/services/authService';

export default function App() {
  const [driverUid, setDriverUid] = useState(null);

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

  return (
    <>
      <StatusBar style="dark" />
      {driverUid ? (
        <RegistrationScreen uid={driverUid} />
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#276EF1" />
          <Text style={styles.loadingText}>
            Preparando el registro del conductor...
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
