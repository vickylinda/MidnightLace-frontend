import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import ErrorModal from '../components/feedback/ErrorModal';
import AuthTextField from '../components/forms/AuthTextField';
import PrimaryButton from '../components/forms/PrimaryButton';
import RememberCheckbox from '../components/forms/RememberCheckbox';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { validateEmail, validatePassword } from '../utils/authValidation';
import { apiFetch, getApiErrorMessage } from '../utils/http';
import { setSession } from '../utils/session';

export default function LoginScreen({
  onForgotPasswordPress,
  onLoginSuccess,
  onRegisterPress,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  const isFormValid = !emailError && !passwordError;
  const visibleEmailError = touched.email || submitted ? emailError : '';
  const visiblePasswordError = touched.password || submitted ? passwordError : '';

  function handleBlur(field) {
    setTouched((currentTouched) => ({
      ...currentTouched,
      [field]: true,
    }));
  }

  async function handleSubmit() {
    setSubmitted(true);
    setTouched({ email: true, password: true });
    setApiError('');

    if (emailError || passwordError) {
      return;
    }

    setLoading(true);
    try {
      const session = await apiFetch('/v1/auth/login', {
        method: 'POST',
        body: { email, clave: password },
        auth: false,
      });
      setSession(session);
      onLoginSuccess?.();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'No pudimos iniciar sesión.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ErrorModal
        message={apiError}
        onRetry={() => setApiError('')}
        visible={Boolean(apiError)}
      />

      <View style={styles.form}>
        <Text style={styles.title}>Iniciar Sesión</Text>

        <AuthTextField
          autoComplete="email"
          error={visibleEmailError}
          keyboardType="email-address"
          label="Email"
          onBlur={() => handleBlur('email')}
          onChangeText={setEmail}
          textContentType="emailAddress"
          value={email}
        />
        <AuthTextField
          autoComplete="password"
          error={visiblePasswordError}
          label="Contraseña"
          onBlur={() => handleBlur('password')}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          value={password}
        />

        <View style={styles.actionsRow}>
          <RememberCheckbox
            checked={rememberMe}
            onPress={setRememberMe}
          />
          <Pressable onPress={onForgotPasswordPress} style={styles.forgotLink}>
            <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
          </Pressable>
        </View>

        <PrimaryButton disabled={!isFormValid || loading} onPress={handleSubmit}>
          {loading ? 'Ingresando...' : 'Enviar'}
        </PrimaryButton>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>¿No tenes una cuenta? </Text>
          <Pressable onPress={onRegisterPress}>
            <Text style={styles.link}>Registrate</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    zIndex: 2,
  },
  form: {
    alignItems: 'center',
    paddingHorizontal: 38,
    paddingTop: 54,
  },
  title: {
    alignSelf: 'flex-start',
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 32,
    letterSpacing: 0,
    marginBottom: 30,
  },
  actionsRow: {
    alignItems: 'center',
    columnGap: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 49,
    marginTop: -2,
    rowGap: 10,
    width: '100%',
  },
  link: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  forgotLink: {
    flexShrink: 1,
  },
  registerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 18,
  },
  registerText: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
});
