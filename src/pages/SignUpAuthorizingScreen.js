import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import PrimaryButton from '../components/forms/PrimaryButton';
import SignUpProgress from '../components/signup/SignUpProgress';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

export default function SignUpAuthorizingScreen({ onAuthorized }) {
  return (
    <View style={styles.screen}>
      <SignUpProgress currentStep={2} />

      <Text style={styles.title}>Registrarse</Text>

      <View style={styles.card}>
        <ActivityIndicator color={colors.burgundy} size="large" style={styles.spinner} />

        <Text style={styles.statusTitle}>Solicitud enviada</Text>
        <Text style={styles.statusText}>
          Recibimos tus datos. Si la verificación es aprobada, vas a recibir un
          mail para ingresar a la app y generar tu clave personal.
        </Text>

        <View style={styles.action}>
          <PrimaryButton onPress={onAuthorized}>
            Volver a iniciar sesión
          </PrimaryButton>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 53,
    paddingTop: 38,
    zIndex: 2,
  },
  title: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 36,
    letterSpacing: 0,
    lineHeight: 44,
    marginBottom: 34,
  },
  card: {
    alignItems: 'center',
    backgroundColor: 'rgba(242, 211, 200, 0.5)',
    borderColor: 'rgba(159, 2, 29, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 34,
  },
  spinner: {
    height: 76,
    marginBottom: 22,
    width: 76,
  },
  statusTitle: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 27,
    lineHeight: 34,
    marginBottom: 7,
    textAlign: 'center',
  },
  statusText: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  action: {
    alignItems: 'center',
    marginTop: 24,
    width: '100%',
  },
});
