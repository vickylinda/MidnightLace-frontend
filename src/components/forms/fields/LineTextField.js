import { StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';

function ErrorIcon() {
  return (
    <Svg height={16} viewBox="0 0 16 16" width={16}>
      <Circle cx={8} cy={8} fill="none" r={7} stroke={colors.burgundy} strokeWidth={1.5} />
      <Rect fill={colors.burgundy} height={6} rx={0.75} width={1.5} x={7.25} y={3.75} />
      <Circle cx={8} cy={12.1} fill={colors.burgundy} r={0.9} />
    </Svg>
  );
}

export default function LineTextField({
  autoCapitalize = 'sentences',
  error,
  keyboardType = 'default',
  label,
  maxLength,
  multiline = false,
  onBlur,
  onChangeText,
  placeholder,
  style,
  value,
}) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, multiline ? styles.inputRowMultiline : null]}>
        <TextInput
          autoCapitalize={autoCapitalize}
          autoCorrect
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          onBlur={onBlur}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(139, 92, 95, 0.62)"
          style={[styles.input, multiline ? styles.inputMultiline : null]}
          textAlignVertical={multiline ? 'top' : 'center'}
          value={value}
        />
      </View>
      {error ? (
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
    minHeight: 35,
    width: '100%',
  },
  inputRowMultiline: {
    minHeight: 88,
  },
  input: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 18,
    minHeight: 28,
    padding: 0,
  },
  inputMultiline: {
    lineHeight: 23,
    minHeight: 78,
    paddingBottom: 8,
    paddingTop: 2,
  },
  errorRow: {
    alignItems: 'flex-start',
    columnGap: 6,
    flexDirection: 'row',
    marginTop: 8,
  },
  errorText: {
    color: colors.burgundy,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 17,
  },
});
