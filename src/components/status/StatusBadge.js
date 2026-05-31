import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

export default function StatusBadge({ label, style }) {
  const normalizedLabel = label.toLowerCase();
  const tone =
    normalizedLabel.includes('final')
      ? 'danger'
      : normalizedLabel.includes('programada')
      ? 'warning'
      : 'success';

  return (
    <View style={[styles.container, styles[tone], style]}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 13,
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 26,
    paddingHorizontal: 10,
  },
  success: {
    backgroundColor: 'rgba(127, 174, 118, 0.72)',
    borderColor: colors.statusGreenBorder,
  },
  warning: {
    backgroundColor: 'rgba(231, 184, 78, 0.78)',
    borderColor: '#B48618',
  },
  danger: {
    backgroundColor: 'rgba(159, 2, 29, 0.72)',
    borderColor: colors.burgundy,
  },
  label: {
    color: colors.white,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    letterSpacing: 0,
  },
});
