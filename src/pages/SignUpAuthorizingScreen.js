import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import PrimaryButton from '../components/forms/PrimaryButton';
import SignUpProgress from '../components/signup/SignUpProgress';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

const AUTH_SECONDS = 5;
const MAIL_DELAY = 5200;
const USER_CATEGORIES = ['común', 'especial', 'plata', 'oro', 'platino'];

export default function SignUpAuthorizingScreen({ onAuthorized }) {
  const [remainingSeconds, setRemainingSeconds] = useState(AUTH_SECONDS);
  const [phase, setPhase] = useState('authorizing');
  const [assignedCategory] = useState(
    () => USER_CATEGORIES[Math.floor(Math.random() * USER_CATEGORIES.length)]
  );
  const categoryScale = useRef(new Animated.Value(0.9)).current;
  const categoryOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSeconds((currentSeconds) => {
        if (currentSeconds <= 1) {
          clearInterval(interval);
          setPhase('category');
          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (phase !== 'category') {
      return undefined;
    }

    categoryScale.setValue(0.9);
    categoryOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(categoryOpacity, {
        duration: 280,
        toValue: 1,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.spring(categoryScale, {
          friction: 4,
          tension: 130,
          toValue: 1.08,
          useNativeDriver: false,
        }),
        Animated.spring(categoryScale, {
          friction: 5,
          tension: 90,
          toValue: 1,
          useNativeDriver: false,
        }),
      ]),
    ]).start();

    const mailTimer = setTimeout(() => {
      setPhase('mailSent');
    }, MAIL_DELAY);

    return () => clearTimeout(mailTimer);
  }, [categoryOpacity, categoryScale, phase]);

  const canContinue = phase === 'mailSent';

  return (
    <View style={styles.screen}>
      <SignUpProgress currentStep={2} />

      <Text style={styles.title}>Registrarse</Text>

      <View style={styles.card}>
        {phase === 'authorizing' ? (
          <View style={styles.spinner}>
            <ActivityIndicator color={colors.burgundy} size="large" />
          </View>
        ) : (
          <Animated.View
            style={[
              styles.categoryBadge,
              {
                opacity: categoryOpacity,
                transform: [{ scale: categoryScale }],
              },
            ]}
          >
            <Text style={styles.categoryLabel}>Tu categoría es</Text>
            <Text style={styles.categoryName}>{assignedCategory}</Text>
          </Animated.View>
        )}

        <Text style={styles.statusTitle}>
          {phase === 'authorizing' ? 'Autorizando' : '¡Autorizado!'}
        </Text>
        <Text style={styles.statusText}>
          {phase === 'mailSent'
            ? 'Te enviamos un código por mail para verificar tu casilla y completar el registro.'
            : phase === 'category'
            ? 'Asignamos tu categoría y estamos preparando el mail de acceso.'
            : `Validando tus datos. ${remainingSeconds}s`}
        </Text>

        {phase === 'category' ? (
          <ActivityIndicator
            color={colors.burgundy}
            size="small"
            style={styles.mailSpinner}
          />
        ) : null}

        <View style={styles.action}>
          <PrimaryButton disabled={!canContinue} onPress={onAuthorized}>
            Verificar correo
          </PrimaryButton>
        </View>
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
    marginBottom: 34,
  },
  card: {
    alignItems: 'center',
    backgroundColor: 'rgba(242, 211, 200, 0.5)',
    borderColor: 'rgba(159, 2, 29, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 34,
  },
  spinner: {
    alignItems: 'center',
    height: 76,
    justifyContent: 'center',
    marginBottom: 22,
    width: 76,
  },
  categoryBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(159, 2, 29, 0.1)',
    borderColor: colors.burgundy,
    borderRadius: 999,
    borderWidth: 2,
    marginBottom: 22,
    minWidth: 172,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  categoryLabel: {
    color: colors.mutedRose,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 17,
    textAlign: 'center',
  },
  categoryName: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  statusTitle: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 27,
    lineHeight: 34,
    marginBottom: 7,
    textAlign: 'center',
  },
  statusText: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  mailSpinner: {
    height: 30,
    marginTop: 16,
    width: 30,
  },
  action: {
    alignItems: 'center',
    marginTop: 24,
    width: '100%',
  },
});
