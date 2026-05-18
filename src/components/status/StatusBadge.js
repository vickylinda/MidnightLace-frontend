import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

export default function StatusBadge({ label, style }) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'rgba(127, 174, 118, 0.6)',
    borderColor: colors.statusGreenBorder,
    borderRadius: 13,
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 26,
    paddingHorizontal: 10,
  },
  label: {
    color: colors.white,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    letterSpacing: 0,
  },
});
