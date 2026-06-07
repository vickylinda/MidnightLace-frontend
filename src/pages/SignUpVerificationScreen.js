import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';

import SignUpProgress from '../components/signup/SignUpProgress';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

const CELL_COUNT = 6;
const MOCK_CODE = '482731';
const RESEND_SECONDS = 30;

export default function SignUpVerificationScreen({
  email,
  onVerified,
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(RESEND_SECONDS);
  const [message, setMessage] = useState('');
  const hasVerifiedRef = useRef(false);
  const ref = useBlurOnFulfill({ cellCount: CELL_COUNT, value });
  const [codeFieldProps, getCellOnLayoutHandler] = useClearByFocusCell({
    setValue,
    value,
  });

  useEffect(() => {
    if (remainingSeconds <= 0) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setRemainingSeconds((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [remainingSeconds]);

  useEffect(() => {
    if (value.length !== CELL_COUNT || hasVerifiedRef.current) {
      return undefined;
    }

    if (value !== MOCK_CODE) {
      setError('El código ingresado no es correcto.');
      return undefined;
    }

    hasVerifiedRef.current = true;
    setError('');
    setMessage('Correo verificado. Continuando...');
    const timer = setTimeout(() => onVerified?.(), 550);

    return () => clearTimeout(timer);
  }, [onVerified, value]);

  function handleChange(nextValue) {
    setValue(nextValue.replace(/\D/g, '').slice(0, CELL_COUNT));
    setError('');
    setMessage('');
  }

  function handleResend() {
    if (remainingSeconds > 0) {
      return;
    }

    hasVerifiedRef.current = false;
    setValue('');
    setError('');
    setMessage('Te enviamos un código nuevo.');
    setRemainingSeconds(RESEND_SECONDS);
  }

  return (
    <View style={styles.screen}>
      <SignUpProgress currentStep={2} />

      <Text style={styles.title}>Verificá tu correo</Text>
      <Text style={styles.description}>
        Ingresá el código de 6 dígitos que enviamos a{' '}
        <Text style={styles.email}>{email || 'tu casilla de correo'}</Text>.
      </Text>

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

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}

      <Text style={styles.mockHint}>
        Para probar este flujo, usá el código <Text style={styles.mockCode}>{MOCK_CODE}</Text>.
      </Text>

      <Pressable
        accessibilityRole="button"
        disabled={remainingSeconds > 0}
        onPress={handleResend}
        style={styles.resendButton}
      >
        <Text
          style={[
            styles.resendText,
            remainingSeconds > 0 ? styles.resendTextDisabled : null,
          ]}
        >
          {remainingSeconds > 0
            ? `Reenviar código en ${remainingSeconds}s`
            : 'Reenviar código'}
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
    marginTop: 8,
  },
  email: {
    color: colors.textBurgundy,
    fontFamily: fonts.semiBold,
  },
  codeField: {
    justifyContent: 'space-between',
    marginTop: 34,
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
  mockHint: {
    backgroundColor: 'rgba(242, 211, 200, 0.52)',
    borderColor: 'rgba(159, 2, 29, 0.18)',
    borderRadius: 6,
    borderWidth: 1,
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 28,
    padding: 12,
    textAlign: 'center',
  },
  mockCode: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
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
