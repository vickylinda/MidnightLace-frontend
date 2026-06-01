import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import AuthTextField from '../components/forms/AuthTextField';
import PrimaryButton from '../components/forms/PrimaryButton';
import { recoverPassword } from '../api/auth';
import { getApiErrorMessage } from '../api/http';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { validateEmail } from '../utils/authValidation';

const RESEND_SECONDS = 10;

function MailSentIcon() {
  return (
    <Svg width={31} height={31} viewBox="0 0 32 32" fill="none">
      <Circle cx={16} cy={16} r={15} fill="rgba(159, 2, 29, 0.1)" />
      <Path
        d="M8 11.4C8 10.65 8.62 10 9.4 10H22.6C23.38 10 24 10.65 24 11.4V20.6C24 21.35 23.38 22 22.6 22H9.4C8.62 22 8 21.35 8 20.6V11.4Z"
        stroke={colors.burgundy}
        strokeWidth={1.8}
      />
      <Path
        d="M8.7 11.1L16 16.5L23.3 11.1"
        stroke={colors.burgundy}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
      <Path
        d="M19.15 21.2L23.2 17.15M20.65 21.2L23.2 18.65"
        stroke={colors.burgundy}
        strokeLinecap="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [serverError, setServerError] = useState('');
  const countdownTimerRef = useRef(null);

  const emailError = validateEmail(email);
  const visibleEmailError = touched || submitted ? emailError : '';
  const isFormValid = !emailError;

  function clearTimers() {
    clearInterval(countdownTimerRef.current);
  }

  useEffect(() => () => clearTimers(), []);

  function startResendCountdown() {
    setCountdown(RESEND_SECONDS);
    countdownTimerRef.current = setInterval(() => {
      setCountdown((currentValue) => {
        if (currentValue <= 1) {
          clearInterval(countdownTimerRef.current);
          return 0;
        }

        return currentValue - 1;
      });
    }, 1000);
  }

  async function sendRecoveryEmail() {
    clearTimers();
    setIsSending(true);
    setServerError('');

    try {
      await recoverPassword(email);
      setIsEmailSent(true);
      startResendCountdown();
    } catch (error) {
      setServerError(
        getApiErrorMessage(error, 'No pudimos enviar el mail de recuperación.')
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleSubmit() {
    setSubmitted(true);
    setTouched(true);

    if (emailError) {
      return;
    }

    await sendRecoveryEmail();
  }

  function handleEmailChange(value) {
    clearTimers();
    setEmail(value);
    setIsSending(false);
    setIsEmailSent(false);
    setServerError('');
    setCountdown(0);
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Recuperar contraseña</Text>
      <Text style={styles.subtitle}>
        Ingresá tu email y te vamos a mandar un link para crear una contraseña nueva.
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

      {isEmailSent ? (
        <View style={styles.successBox}>
          <MailSentIcon />
          <View style={styles.successTextWrapper}>
            <Text style={styles.successTitle}>Link enviado</Text>
            <Text style={styles.successText}>
              Te enviamos un link a {email.trim()} para restablecer tu contraseña.
            </Text>
          </View>
        </View>
      ) : null}

      {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}

      <View style={styles.submit}>
        {!isEmailSent ? (
          <PrimaryButton disabled={!isFormValid || isSending} onPress={handleSubmit}>
            {isSending ? 'Enviando' : 'Enviar link'}
          </PrimaryButton>
        ) : null}
        {isSending ? (
          <ActivityIndicator color={colors.burgundy} style={styles.spinner} />
        ) : null}
      </View>

      {isEmailSent ? (
        <View style={styles.resendRow}>
          <Text style={styles.resendText}>¿No recibiste el mail? </Text>
          <Pressable
            accessibilityRole="button"
            disabled={countdown > 0 || isSending}
            onPress={sendRecoveryEmail}
          >
            <Text
              style={[
                styles.resendLink,
                countdown > 0 || isSending ? styles.resendLinkDisabled : null,
              ]}
            >
              {countdown > 0 ? `Reenviar en ${countdown}s` : 'Reenviar mail'}
            </Text>
          </Pressable>
        </View>
      ) : null}
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
  successBox: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(159, 2, 29, 0.08)',
    borderColor: 'rgba(159, 2, 29, 0.42)',
    borderRadius: 8,
    borderWidth: 1,
    columnGap: 11,
    flexDirection: 'row',
    marginBottom: 20,
    marginTop: -5,
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
  serverError: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 18,
    marginTop: -7,
  },
  submit: {
    alignItems: 'center',
    minHeight: 65,
  },
  spinner: {
    marginTop: 12,
  },
  resendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: -2,
    rowGap: 4,
  },
  resendText: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  resendLink: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  resendLinkDisabled: {
    opacity: 0.55,
  },
});
