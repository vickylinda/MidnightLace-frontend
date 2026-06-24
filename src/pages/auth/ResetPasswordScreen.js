import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import AuthTextField from '../../components/forms/auth/AuthTextField';
import PasswordChecklist from '../../components/forms/auth/PasswordChecklist';
import PrimaryButton from '../../components/forms/controls/PrimaryButton';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import {
  validateNewPassword,
  validatePasswordConfirmation,
} from '../../utils/authValidation';
import { apiFetch, getApiErrorMessage } from '../../utils/http';

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

export default function ResetPasswordScreen({ code, email, onFinish }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [touched, setTouched] = useState({
    confirmation: false,
    password: false,
  });

  const passwordError = validateNewPassword(password);
  const confirmationError = validatePasswordConfirmation(password, confirmation);
  const isFormValid = !passwordError && !confirmationError;
  const visiblePasswordError =
    (touched.password || submitted) && !password ? passwordError : '';
  const showConfirmationError = touched.confirmation || submitted || confirmation.length > 0;
  const visibleConfirmationError = showConfirmationError ? confirmationError : '';

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
    setApiError('');

    if (!isFormValid) {
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/v1/auth/confirmar', {
        method: 'POST',
        body: { codigo: code, clave: password, tipo: 'recuperacion' },
        auth: false,
      });
      setIsCompleted(true);
    } catch (error) {
      const msg = getApiErrorMessage(error, 'No pudimos actualizar la contraseña.');
      setApiError(
        error?.status === 400
          ? 'El código es incorrecto o expiró. Volvé al paso anterior para reenviarlo.'
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  function handleFinishPress() {
    onFinish?.();
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
        onChangeText={(value) => {
          setPassword(value);
          setIsCompleted(false);
          setApiError('');
          if (confirmation) {
            setTouched((currentTouched) => ({
              ...currentTouched,
              confirmation: true,
            }));
          }
        }}
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
        onChangeText={(value) => {
          setConfirmation(value);
          setIsCompleted(false);
          setApiError('');
          setTouched((currentTouched) => ({
            ...currentTouched,
            confirmation: true,
          }));
        }}
        secureTextEntry
        textContentType="newPassword"
        value={confirmation}
      />

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

      {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

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
          <PrimaryButton disabled={!isFormValid || loading} onPress={handleSubmit}>
            {loading ? 'Actualizando...' : 'Enviar'}
          </PrimaryButton>
        )}
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
  apiError: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 8,
    marginTop: -5,
    textAlign: 'center',
  },
  submit: {
    alignItems: 'center',
    marginTop: 7,
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
