import { StyleSheet, Text, View } from 'react-native';
import * as Checkbox from '@rn-primitives/checkbox';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

function CheckIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <Path
        d="M11.7 3.6L5.75 9.55L2.75 6.55"
        stroke={colors.white}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function RememberCheckbox({ checked, onPress }) {
  return (
    <Checkbox.Root
      checked={checked}
      onCheckedChange={onPress}
      style={styles.container}
    >
      <View style={[styles.box, checked ? styles.boxChecked : null]}>
        <Checkbox.Indicator style={styles.indicator}>
          <CheckIcon />
        </Checkbox.Indicator>
      </View>
      <Text style={styles.label}>Recordarme</Text>
    </Checkbox.Root>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  box: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E7C1C4',
    borderRadius: 3,
    borderWidth: 1,
    height: 18,
    justifyContent: 'center',
    marginRight: 8,
    width: 18,
  },
  boxChecked: {
    backgroundColor: colors.blush,
    borderColor: colors.blush,
  },
  indicator: {
    alignItems: 'center',
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  label: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
});
