// AI-assisted: see docs/AI_LOG.md #38
// Aviso permanente mientras la app está en MODO DEMOSTRACIÓN de pagos.
// No se muestra fuera de ese modo.
//
// AI-assisted: see docs/AI_LOG.md #39
// Respeta el área segura superior (hora, batería, notch o isla dinámica):
// el margen sale de useSafeAreaInsets del SafeAreaProvider raíz de App.js.
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DEMO_LABEL, PAYMENTS_DEMO } from '../config/paymentsDemo';

export default function DemoModeBanner() {
  const insets = useSafeAreaInsets();

  if (!PAYMENTS_DEMO.enabled) {
    return null;
  }

  return (
    <View
      accessibilityRole="header"
      style={[
        styles.banner,
        {
          paddingTop: insets.top + 4,
          paddingLeft: insets.left + 12,
          paddingRight: insets.right + 12,
        },
      ]}
    >
      <Text style={styles.title}>{DEMO_LABEL}</Text>
      <Text style={styles.text}>
        Datos en emuladores locales. Pagos simulados: no es Mercado Pago ni dinero real.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#B26A00',
    paddingBottom: 6,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
    fontSize: 14,
  },
  text: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 11,
  },
});
