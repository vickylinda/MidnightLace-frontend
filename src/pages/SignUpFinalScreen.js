import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AuthTextField from '../components/forms/AuthTextField';
import PasswordChecklist from '../components/forms/PasswordChecklist';
import PrimaryButton from '../components/forms/PrimaryButton';
import SignUpProgress from '../components/signup/SignUpProgress';
import { confirmPassword } from '../api/auth';
import { getApiErrorMessage } from '../api/http';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import {
  validateNewPassword,
  validatePasswordConfirmation,
} from '../utils/authValidation';

export default function SignUpFinalScreen({ onSubmitSuccess, token }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [touched, setTouched] = useState({
    confirmation: false,
    password: false,
  });

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
    setTouched({
      confirmation: true,
      password: true,
    });
    setServerError('');

    if (!isFormValid) {
      return;
    }

    if (!token) {
      setServerError('Falta el token del link de registro.');
      return;
    }

    setIsSubmitting(true);

    try {
      await confirmPassword({ password, token });
      onSubmitSuccess?.();
    } catch (error) {
      setServerError(
        getApiErrorMessage(error, 'No pudimos generar tu clave.')
      );
    } finally {
      setIsSubmitting(false);
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
        onChangeText={(value) => {
          setPassword(value);
          setServerError('');
        }}
        secureTextEntry
        style={styles.passwordField}
        value={password}
      />

      <PasswordChecklist value={password} />

      <AuthTextField
        error={visibleConfirmationError}
        label="Confirme su contraseña"
        onBlur={() => handleBlur('confirmation')}
        onChangeText={(value) => {
          setConfirmation(value);
          setServerError('');
        }}
        secureTextEntry
        value={confirmation}
      />

      {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

      <View style={styles.submit}>
        <PrimaryButton disabled={!isFormValid || isSubmitting} onPress={handleSubmit}>
          {isSubmitting ? 'Enviando' : 'Enviar'}
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
  submit: {
    alignItems: 'center',
    marginTop: 34,
  },
  serverError: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    marginTop: -5,
  },
});
