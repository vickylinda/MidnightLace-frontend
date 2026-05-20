import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import AuthTextField from '../components/forms/AuthTextField';
import PrimaryButton from '../components/forms/PrimaryButton';
import SignUpProgress from '../components/signup/SignUpProgress';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

const passwordRules = [
  {
    label: 'Al menos una mayúscula',
    test: (value) => /[A-Z]/.test(value),
  },
  {
    label: 'Al menos una minúscula',
    test: (value) => /[a-z]/.test(value),
  },
  {
    label: 'Al menos un número',
    test: (value) => /\d/.test(value),
  },
  {
    label: 'Mínimo 8 caracteres',
    test: (value) => value.length >= 8,
  },
];

function RuleIcon({ isValid }) {
  if (isValid) {
    return (
      <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <Path
          d="M3.25 8.3L6.45 11.45L12.85 4.75"
          stroke="#4F8F45"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.2}
        />
      </Svg>
    );
  }

  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5"
        stroke={colors.mutedRose}
        strokeLinecap="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

function PasswordChecklist({ value }) {
  return (
    <View style={styles.passwordChecklist}>
      {passwordRules.map((rule) => {
        const isValid = rule.test(value);

        return (
          <View key={rule.label} style={styles.passwordRule}>
            <RuleIcon isValid={isValid} />
            <Text
              style={[
                styles.passwordRuleText,
                isValid ? styles.passwordRuleTextValid : null,
              ]}
            >
              {rule.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function validateFinalPassword(password) {
  if (!password) {
    return 'Ingresa una contraseña.';
  }

  const missingRules = passwordRules
    .filter((rule) => !rule.test(password))
    .map((rule) => rule.label);

  if (missingRules.length) {
    return `La clave debe incluir ${missingRules.join(', ')}.`;
  }

  return '';
}

function validateConfirmation(password, confirmation) {
  if (!confirmation) {
    return 'Confirmá tu contraseña.';
  }

  if (password !== confirmation) {
    return 'Las contraseñas no coinciden.';
  }

  return '';
}

export default function SignUpFinalScreen({ onSubmitSuccess }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({
    confirmation: false,
    password: false,
  });

  const passwordError = validateFinalPassword(password);
  const confirmationError = validateConfirmation(password, confirmation);
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

  function handleSubmit() {
    setSubmitted(true);
    setTouched({
      confirmation: true,
      password: true,
    });

    if (isFormValid) {
      onSubmitSuccess?.();
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

      <View style={styles.submit}>
        <PrimaryButton disabled={!isFormValid} onPress={handleSubmit}>
          Enviar
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
  passwordChecklist: {
    marginBottom: 29,
    rowGap: 8,
    width: '100%',
  },
  passwordRule: {
    alignItems: 'center',
    columnGap: 8,
    flexDirection: 'row',
  },
  passwordRuleText: {
    color: colors.mutedRose,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
  },
  passwordRuleTextValid: {
    color: '#4F8F45',
    fontFamily: fonts.medium,
  },
  submit: {
    alignItems: 'center',
    marginTop: 34,
  },
});
