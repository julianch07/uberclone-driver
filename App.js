// AI-assisted: see docs/AI_LOG.md #3
import { StatusBar } from 'expo-status-bar';
import RegistrationScreen from './src/screens/registration/RegistrationScreen';

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <RegistrationScreen />
    </>
  );
}
