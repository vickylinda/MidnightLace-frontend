import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

function EyeIcon({ hidden }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.5 12C4.45 7.85 7.75 5.75 12 5.75C16.25 5.75 19.55 7.85 21.5 12C19.55 16.15 16.25 18.25 12 18.25C7.75 18.25 4.45 16.15 2.5 12Z"
        stroke={colors.textBurgundy}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx={12}
        cy={12}
        r={3.1}
        stroke={colors.textBurgundy}
        strokeWidth={1.8}
      />
      {hidden ? (
        <Line
          x1={4}
          y1={20}
          x2={20}
          y2={4}
          stroke={colors.textBurgundy}
          strokeWidth={2}
          strokeLinecap="round"
        />
      ) : null}
    </Svg>
  );
}

function ErrorIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Circle cx={8} cy={8} r={7} stroke={colors.burgundy} strokeWidth={1.5} />
      <Rect x={7.25} y={3.75} width={1.5} height={6} rx={0.75} fill={colors.burgundy} />
      <Circle cx={8} cy={12.1} r={0.9} fill={colors.burgundy} />
    </Svg>
  );
}

export default function AuthTextField({
  autoComplete,
  error,
  keyboardType = 'default',
  label,
  onBlur,
  onChangeText,
  secureTextEntry = false,
  textContentType,
  value,
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordField = secureTextEntry;
  const hasError = Boolean(error);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, hasError ? styles.inputRowError : null]}>
        <TextInput
          autoCapitalize="none"
          autoComplete={autoComplete}
          autoCorrect={false}
          keyboardType={keyboardType}
          onBlur={onBlur}
          onChangeText={onChangeText}
          secureTextEntry={isPasswordField && !isPasswordVisible}
          style={[styles.input, isPasswordField ? styles.passwordInput : null]}
          textContentType={textContentType}
          value={value}
        />
        {isPasswordField ? (
          <Pressable
            accessibilityLabel={
              isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'
            }
            accessibilityRole="button"
            onPress={() => setIsPasswordVisible((value) => !value)}
            style={styles.visibilityButton}
          >
            <EyeIcon hidden={!isPasswordVisible} />
          </Pressable>
        ) : null}
      </View>
      {hasError ? (
        <View style={styles.errorRow}>
          <ErrorIcon />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 29,
    width: '100%',
  },
  label: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 17,
    marginBottom: 7,
  },
  inputRow: {
    borderBottomColor: colors.burgundy,
    borderBottomWidth: 7,
    flexDirection: 'row',
    width: '100%',
  },
  inputRowError: {
    borderBottomColor: colors.burgundy,
  },
  input: {
    color: colors.textBurgundy,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 18,
    height: 28,
    padding: 0,
  },
  passwordInput: {
    paddingRight: 36,
  },
  visibilityButton: {
    alignItems: 'center',
    bottom: 0,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    width: 32,
  },
  errorRow: {
    alignItems: 'flex-start',
    columnGap: 6,
    flexDirection: 'row',
    marginTop: 8,
    width: '100%',
  },
  errorText: {
    color: colors.burgundy,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 17,
  },
});
