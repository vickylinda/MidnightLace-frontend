import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import AuthTextField from '../components/forms/AuthTextField';
import PasswordChecklist from '../components/forms/PasswordChecklist';
import PrimaryButton from '../components/forms/PrimaryButton';
import { confirmPassword } from '../api/auth';
import { getApiErrorMessage } from '../api/http';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import {
  validateNewPassword,
  validatePasswordConfirmation,
} from '../utils/authValidation';

const REDIRECT_SECONDS = 10;

function SuccessIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 30 30" fill="none">
      <Circle cx={15} cy={15} r={14} fill="rgba(63, 127, 53, 0.14)" />
      <Path
        d="M8.8 15.35L12.8 19.15L21.3 10.7"
        stroke="#3F7F35"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
      />
    </Svg>
  );
}

export default function ResetPasswordScreen({ onFinish, token }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);
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

  useEffect(() => {
    if (!isCompleted) {
      setCountdown(REDIRECT_SECONDS);
      return undefined;
    }

    const countdownTimer = setInterval(() => {
      setCountdown((currentValue) => Math.max(currentValue - 1, 0));
    }, 1000);
    const redirectTimer = setTimeout(() => {
      clearInterval(countdownTimer);
      onFinish?.();
    }, REDIRECT_SECONDS * 1000);

    return () => {
      clearInterval(countdownTimer);
      clearTimeout(redirectTimer);
    };
  }, [isCompleted, onFinish]);

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
      setServerError('Falta el token del link de recuperación.');
      return;
    }

    setIsSubmitting(true);

    try {
      await confirmPassword({ password, token });
      setIsCompleted(true);
    } catch (error) {
      setServerError(
        getApiErrorMessage(error, 'No pudimos actualizar la contraseña.')
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFinishPress() {
    onFinish?.();
  }

  function handlePasswordChange(value) {
    setPassword(value);
    setIsCompleted(false);
    setServerError('');
  }

  function handleConfirmationChange(value) {
    setConfirmation(value);
    setIsCompleted(false);
    setServerError('');
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Restablecer contraseña</Text>
      <Text style={styles.subtitle}>
        Creá una contraseña nueva para volver a ingresar a Midnight Lace.
      </Text>

      <AuthTextField
        autoComplete="new-password"
        error={visiblePasswordError}
        label="Nueva contraseña"
        onBlur={() => handleBlur('password')}
        onChangeText={handlePasswordChange}
        secureTextEntry
        style={styles.passwordField}
        textContentType="newPassword"
        value={password}
      />

      <PasswordChecklist value={password} />

      <AuthTextField
        autoComplete="new-password"
        error={visibleConfirmationError}
        label="Confirme su contraseña"
        onBlur={() => handleBlur('confirmation')}
        onChangeText={handleConfirmationChange}
        secureTextEntry
        textContentType="newPassword"
        value={confirmation}
      />

      {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

      {isCompleted ? (
        <View style={styles.successBox}>
          <SuccessIcon />
          <View style={styles.successTextWrapper}>
            <Text style={styles.successTitle}>Contraseña actualizada</Text>
            <Text style={styles.successText}>
              Ya podés iniciar sesión con tu nueva clave.
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.submit}>
        {isCompleted ? (
          <Pressable
            accessibilityRole="button"
            onPress={handleFinishPress}
            style={styles.loginButton}
          >
            <Text style={styles.loginButtonText}>Volver a iniciar sesión</Text>
          </Pressable>
        ) : (
          <PrimaryButton
            disabled={!isFormValid || isSubmitting}
            onPress={handleSubmit}
          >
            {isSubmitting ? 'Enviando' : 'Enviar'}
          </PrimaryButton>
        )}
        {isSubmitting ? (
          <ActivityIndicator color={colors.burgundy} style={styles.spinner} />
        ) : null}
      </View>

      {isCompleted ? (
        <Text style={styles.countdownText}>
          Redirigiendo en {countdown} segundos...
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 38,
    paddingTop: 46,
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
    marginBottom: 31,
  },
  passwordField: {
    marginBottom: 11,
  },
  serverError: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 16,
    marginTop: -6,
  },
  successBox: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(63, 127, 53, 0.1)',
    borderColor: 'rgba(63, 127, 53, 0.38)',
    borderRadius: 8,
    borderWidth: 1,
    columnGap: 11,
    flexDirection: 'row',
    marginBottom: 25,
    marginTop: -4,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  successTextWrapper: {
    flex: 1,
  },
  successTitle: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 2,
  },
  successText: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  submit: {
    alignItems: 'center',
    marginTop: 7,
  },
  spinner: {
    marginTop: 12,
  },
  loginButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.burgundy,
    borderRadius: 25,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  loginButtonText: {
    color: colors.white,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  countdownText: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
    marginTop: 15,
    textAlign: 'center',
  },
});
