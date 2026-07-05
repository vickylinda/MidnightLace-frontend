import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';

import AuthTextField from '../../components/forms/auth/AuthTextField';
import PrimaryButton from '../../components/forms/controls/PrimaryButton';
import SignUpProgress from '../../components/signup/SignUpProgress';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { apiFetch, getApiErrorMessage } from '../../utils/http';

const CELL_COUNT = 6;
const RESEND_SECONDS = 60;
const CATEGORY_LABELS = {
  comun: 'Comun',
  especial: 'Especial',
  oro: 'Oro',
  plata: 'Plata',
  platino: 'Platino',
};

function formatCategory(value) {
  const key = String(value || '').trim().toLowerCase();
  return CATEGORY_LABELS[key] || value || 'Asignada por Midnight Lace';
}

export default function SignUpVerificationScreen({ email, onVerified }) {
  const [value, setValue] = useState('');
  const [emailValue, setEmailValue] = useState(email || '');
  const [error, setError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(RESEND_SECONDS);
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [validated, setValidated] = useState(false);
  const [assignedCategory, setAssignedCategory] = useState('');
  const ref = useBlurOnFulfill({ cellCount: CELL_COUNT, value });
  const [codeFieldProps, getCellOnLayoutHandler] = useClearByFocusCell({
    setValue,
    value,
  });

  useEffect(() => {
    if (remainingSeconds <= 0) return undefined;
    const timer = setTimeout(
      () => setRemainingSeconds((seconds) => Math.max(seconds - 1, 0)),
      1000
    );
    return () => clearTimeout(timer);
  }, [remainingSeconds]);

  function handleChange(nextValue) {
    setValue(nextValue.replace(/\D/g, '').slice(0, CELL_COUNT));
    setError('');
    setMessage('');
    setValidated(false);
    setAssignedCategory('');
  }

  async function handleContinue() {
    if (!emailValue.trim()) {
      setError('Ingresa el mail con el que te registraste.');
      return;
    }

    if (value.length !== CELL_COUNT) {
      setError('Ingresa el codigo de 6 digitos.');
      return;
    }

    setError('');
    try {
      const result = await apiFetch('/v1/auth/validar-codigo', {
        method: 'POST',
        body: { email: emailValue.trim(), codigo: value, tipo: 'registro' },
        auth: false,
      });
      setAssignedCategory(result?.categoria || result?.category || '');
      setValidated(true);
      setMessage(
        `Cuenta aceptada. Categoria asignada: ${formatCategory(
          result?.categoria || result?.category
        )}.`
      );
    } catch (err) {
      setError(getApiErrorMessage(err, 'No pudimos validar el codigo.'));
    }
  }

  async function handleResend() {
    if (remainingSeconds > 0 || resending || !emailValue.trim()) return;
    setResending(true);
    setError('');
    setMessage('');
    try {
      await apiFetch('/v1/auth/reenviar-codigo', {
        method: 'POST',
        body: { email: emailValue.trim(), tipo: 'registro' },
        auth: false,
      });
      setValue('');
      setAssignedCategory('');
      setMessage('Te enviamos un codigo nuevo.');
      setRemainingSeconds(RESEND_SECONDS);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No pudimos reenviar el codigo.'));
    } finally {
      setResending(false);
    }
  }

  return (
    <View style={styles.screen}>
      <SignUpProgress currentStep={2} />

      <Text style={styles.title}>Setear contrasenia</Text>
      <Text style={styles.description}>
        Ingresa el mail con el que te registraste y el codigo que recibiste por
        correo cuando tu cuenta fue aceptada.
      </Text>

      <AuthTextField
        autoComplete="email"
        keyboardType="email-address"
        label="Email"
        onChangeText={(nextEmail) => {
          setEmailValue(nextEmail);
          setValidated(false);
          setAssignedCategory('');
        }}
        textContentType="emailAddress"
        value={emailValue}
      />

      <CodeField
        ref={ref}
        {...codeFieldProps}
        autoFocus
        cellCount={CELL_COUNT}
        keyboardType="number-pad"
        onChangeText={handleChange}
        renderCell={({ index, isFocused, symbol }) => (
          <Animated.Text
            key={index}
            onLayout={getCellOnLayoutHandler(index)}
            style={[
              styles.cell,
              isFocused ? styles.cellFocused : null,
              symbol ? styles.cellFilled : null,
            ]}
          >
            {symbol || (isFocused ? <Cursor /> : null)}
          </Animated.Text>
        )}
        rootStyle={styles.codeField}
        textContentType="oneTimeCode"
        value={value}
      />

      {validated ? (
        <View style={styles.categoryCard}>
          <Text style={styles.categoryLabel}>Tu categoria</Text>
          <Text style={styles.categoryValue}>{formatCategory(assignedCategory)}</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}

      <View style={styles.continueButton}>
        {validated ? (
          <PrimaryButton
            onPress={() =>
              onVerified?.({
                category: assignedCategory,
                code: value,
                email: emailValue.trim(),
              })
            }
          >
            Generar clave
          </PrimaryButton>
        ) : (
          <PrimaryButton
            disabled={value.length !== CELL_COUNT || !emailValue.trim()}
            onPress={handleContinue}
          >
            Validar codigo
          </PrimaryButton>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={remainingSeconds > 0 || !emailValue.trim()}
        onPress={handleResend}
        style={styles.resendButton}
      >
        <Text
          style={[
            styles.resendText,
            remainingSeconds > 0 || !emailValue.trim() ? styles.resendTextDisabled : null,
          ]}
        >
          {remainingSeconds > 0
            ? `Reenviar codigo en ${remainingSeconds}s`
            : 'Reenviar codigo'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignSelf: 'center',
    maxWidth: 520,
    paddingBottom: 70,
    paddingHorizontal: 34,
    paddingTop: 38,
    width: '100%',
    zIndex: 2,
  },
  title: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 31,
    lineHeight: 39,
    marginTop: 8,
  },
  description: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 22,
    marginTop: 8,
  },
  codeField: {
    justifyContent: 'space-between',
    marginTop: 18,
    width: '100%',
  },
  cell: {
    backgroundColor: 'rgba(242, 211, 200, 0.42)',
    borderBottomColor: colors.burgundy,
    borderBottomWidth: 4,
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 25,
    height: 51,
    lineHeight: 48,
    textAlign: 'center',
    width: '13.5%',
  },
  cellFocused: {
    backgroundColor: 'rgba(214, 136, 143, 0.22)',
    borderBottomWidth: 6,
  },
  cellFilled: {
    backgroundColor: 'rgba(252, 235, 219, 0.86)',
  },
  categoryCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(159, 2, 29, 0.09)',
    borderColor: colors.burgundy,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  categoryLabel: {
    color: colors.mutedRose,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  categoryValue: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 23,
  },
  error: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    marginTop: 13,
    textAlign: 'center',
  },
  success: {
    color: '#397F31',
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 19,
    marginTop: 13,
    textAlign: 'center',
  },
  continueButton: {
    alignItems: 'center',
    marginTop: 28,
    width: '100%',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 22,
    paddingVertical: 8,
  },
  resendText: {
    color: colors.burgundy,
    fontFamily: fonts.semiBold,
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  resendTextDisabled: {
    color: 'rgba(139, 92, 95, 0.65)',
  },
});
