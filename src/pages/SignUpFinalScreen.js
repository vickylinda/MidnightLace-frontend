import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AuthTextField from '../components/forms/AuthTextField';
import PasswordChecklist from '../components/forms/PasswordChecklist';
import PrimaryButton from '../components/forms/PrimaryButton';
import SignUpProgress from '../components/signup/SignUpProgress';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import {
  validateNewPassword,
  validatePasswordConfirmation,
} from '../utils/authValidation';

export default function SignUpFinalScreen({ onSubmitSuccess }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitted, setSubmitted] = useState(false);
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
  submit: {
    alignItems: 'center',
    marginTop: 34,
  },
});
