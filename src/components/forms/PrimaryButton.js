import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

export default function PrimaryButton({ children, disabled = false, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled ? styles.buttonDisabled : null]}
    >
      <Text style={[styles.label, disabled ? styles.labelDisabled : null]}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.burgundy,
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    width: 138,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(159, 2, 29, 0.38)',
  },
  label: {
    color: colors.white,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  labelDisabled: {
    color: 'rgba(255, 255, 255, 0.72)',
  },
});
