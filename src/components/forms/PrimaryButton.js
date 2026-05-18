import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

export default function PrimaryButton({ children, onPress }) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.label}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.blush,
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    width: 138,
  },
  label: {
    color: colors.white,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
});
