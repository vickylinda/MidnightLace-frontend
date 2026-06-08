import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AuthTextField from '../../components/forms/auth/AuthTextField';
import PasswordChecklist from '../../components/forms/auth/PasswordChecklist';
import PrimaryButton from '../../components/forms/controls/PrimaryButton';
import SignUpProgress from '../../components/signup/SignUpProgress';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import {
  validateNewPassword,
  validatePasswordConfirmation,
} from '../../utils/authValidation';
import { apiFetch, getApiErrorMessage } from '../../utils/http';
import { setSession } from '../../utils/session';

export default function SignUpFinalScreen({ code, email, onSubmitSuccess }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({
    confirmation: false,
    password: false,
  });
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const passwordError = validateNewPassword(password);
  const confirmationError = validatePasswordConfirmation(password, confirmation);
  const isFormValid = !passwordError && !confirmationError;
  const visiblePasswordError =
    (touched.password || submitted) && !password ? passwordError : '';
  const visibleConfirmationError =
    touched.confirmation || submitted ? confirmationError : '';

  function handleBlur(field) {
    setTouched((currentTouched) => ({
      ...currentTouched,
      [field]: true,
    }));
  }

  async function handleSubmit() {
    setSubmitted(true);
    setTouched({ confirmation: true, password: true });
    setApiError('');

    if (!isFormValid) return;

    setLoading(true);
    try {
      const session = await apiFetch('/v1/auth/confirmar', {
        method: 'POST',
        body: { codigo: code, clave: password, tipo: 'registro' },
        auth: false,
      });
      setSession(session);
      onSubmitSuccess?.();
    } catch (error) {
      const msg = getApiErrorMessage(error, 'No pudimos confirmar el registro.');
      setApiError(
        error?.status === 400
          ? 'El código es incorrecto o expiró. Volvé al paso anterior para reenviarlo.'
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <SignUpProgress currentStep={3} />

      <Text style={styles.title}>Registrarse</Text>
      <Text style={styles.sectionTitle}>Generación de clave</Text>

      <AuthTextField
        error={visiblePasswordError}
        label="Contraseña"
        onBlur={() => handleBlur('password')}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.passwordField}
        value={password}
      />

      <PasswordChecklist value={password} />

      <AuthTextField
        error={visibleConfirmationError}
        label="Confirme su contraseña"
        onBlur={() => handleBlur('confirmation')}
        onChangeText={setConfirmation}
        secureTextEntry
        value={confirmation}
      />

      {apiError ? (
        <Text style={styles.apiError}>{apiError}</Text>
      ) : null}

      <View style={styles.submit}>
        <PrimaryButton disabled={!isFormValid || loading} onPress={handleSubmit}>
          {loading ? 'Confirmando...' : 'Enviar'}
        </PrimaryButton>
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
    marginBottom: 17,
  },
  sectionTitle: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 25,
    letterSpacing: 0,
    lineHeight: 32,
    marginBottom: 21,
  },
  passwordField: {
    marginBottom: 11,
  },
  apiError: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 8,
    textAlign: 'center',
  },
  submit: {
    alignItems: 'center',
    marginTop: 34,
  },
});
