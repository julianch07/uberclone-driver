// AI-assisted: see docs/AI_LOG.md #13
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PERMISSION } from '../../utils/locationLogic';

function Button({ label, onPress, disabled, busy }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      {busy ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.buttonText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

function openSettings() {
  Linking.openSettings().catch((error) => {
    console.error('No se pudieron abrir los ajustes:', error);
  });
}

// Muestra una explicación y una acción cuando no se puede usar la
// ubicación. Devuelve null si el permiso está concedido y el GPS activo.
export default function LocationPermission({
  permission,
  servicesEnabled,
  requesting,
  onRequestPermission,
  onRecheck,
}) {
  const status = permission && permission.status;

  if (status === PERMISSION.GRANTED && servicesEnabled) {
    return null;
  }

  if (status === PERMISSION.GRANTED && !servicesEnabled) {
    return (
      <View>
        <Text style={styles.title}>El GPS está desactivado</Text>
        <Text style={styles.text}>
          Activa los servicios de ubicación del dispositivo para ver tu
          posición en el mapa. Luego pulsa "Comprobar de nuevo".
        </Text>
        <Button label="Abrir ajustes" onPress={openSettings} />
        <Button label="Comprobar de nuevo" onPress={onRecheck} />
      </View>
    );
  }

  if (status === PERMISSION.BLOCKED) {
    return (
      <View>
        <Text style={styles.title}>Permiso de ubicación bloqueado</Text>
        <Text style={styles.text}>
          Rechazaste el permiso de ubicación y el sistema ya no puede volver
          a preguntarlo. Ábrelo desde Ajustes, en los permisos de
          UberClone Driver, y elige "Mientras se usa la app".
        </Text>
        <Button label="Abrir ajustes" onPress={openSettings} />
        <Button label="Comprobar de nuevo" onPress={onRecheck} />
      </View>
    );
  }

  if (status === PERMISSION.DENIED) {
    return (
      <View>
        <Text style={styles.title}>Permiso de ubicación rechazado</Text>
        <Text style={styles.text}>
          Sin tu ubicación no podemos mostrarte en el mapa. Puedes seguir
          usando la aplicación y conceder el permiso cuando quieras.
        </Text>
        <Button
          label="Permitir ubicación"
          onPress={onRequestPermission}
          disabled={requesting}
          busy={requesting}
        />
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.title}>Activa tu ubicación</Text>
      <Text style={styles.text}>
        UberClone Driver usa tu ubicación mientras la app está abierta para
        mostrarte en el mapa y, cuando estés conectado, publicarla.
      </Text>
      <Button
        label="Permitir ubicación"
        onPress={onRequestPermission}
        disabled={requesting}
        busy={requesting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#161B26',
    marginBottom: 6,
  },
  text: {
    color: '#616B78',
    lineHeight: 21,
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#276EF1',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  disabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
