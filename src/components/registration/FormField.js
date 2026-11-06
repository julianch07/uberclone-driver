// AI-assisted: see docs/AI_LOG.md #6
import { StyleSheet, Text, View } from 'react-native';

export default function FormField({ label, error, children }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {children}

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  error: {
    fontSize: 12,
    color: '#D93025',
    marginTop: 6,
  },
});