import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AuthTextField from '../../components/forms/auth/AuthTextField';
import PrimaryButton from '../../components/forms/controls/PrimaryButton';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { validateEmail } from '../../utils/authValidation';
import { apiFetch, getApiErrorMessage } from '../../utils/http';

export default function ForgotPasswordScreen({ onCodeSent }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [apiError, setApiError] = useState('');

  const emailError = validateEmail(email);
  const visibleEmailError = touched || submitted ? emailError : '';
  const isFormValid = !emailError;

  async function handleSubmit() {
    setSubmitted(true);
    setTouched(true);
    setApiError('');

    if (emailError) {
      return;
    }

    setIsSending(true);
    try {
      await apiFetch('/v1/auth/recuperar-clave', {
        method: 'POST',
        body: { email: email.trim() },
        auth: false,
      });
      onCodeSent?.({ email: email.trim() });
    } catch (error) {
      setApiError(
        getApiErrorMessage(error, 'No pudimos enviar el código de recuperación.')
      );
    } finally {
      setIsSending(false);
    }
  }

  function handleEmailChange(value) {
    setEmail(value);
    setApiError('');
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Recuperar contraseña</Text>
      <Text style={styles.subtitle}>
        Ingresá tu email y te vamos a mandar un código para crear una contraseña nueva.
      </Text>

      <AuthTextField
        autoComplete="email"
        error={visibleEmailError}
        keyboardType="email-address"
        label="Email"
        onBlur={() => setTouched(true)}
        onChangeText={handleEmailChange}
        textContentType="emailAddress"
        value={email}
      />

      {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

      <View style={styles.submit}>
        <PrimaryButton disabled={!isFormValid || isSending} onPress={handleSubmit}>
          {isSending ? 'Enviando' : 'Enviar código'}
        </PrimaryButton>
        {isSending ? (
          <ActivityIndicator color={colors.burgundy} style={styles.spinner} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 38,
    paddingTop: 54,
    zIndex: 2,
  },
  title: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 32,
    letterSpacing: 0,
    lineHeight: 39,
    marginBottom: 13,
  },
  subtitle: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 34,
  },
  apiError: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 15,
    marginTop: -8,
    textAlign: 'center',
  },
  submit: {
    alignItems: 'center',
    minHeight: 65,
  },
  spinner: {
    marginTop: 12,
  },
});
