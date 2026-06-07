import { StyleSheet, Text, View } from 'react-native';
import * as Checkbox from '@rn-primitives/checkbox';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

function CheckIcon() {
  return (
    <Svg height={14} viewBox="0 0 14 14" width={14}>
      <Path
        d="M11.7 3.6L5.75 9.55L2.75 6.55"
        fill="none"
        stroke={colors.white}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.2}
      />
    </Svg>
  );
}

export default function DeclarationCheckbox({
  checked,
  error,
  label,
  onChange,
}) {
  return (
    <View style={styles.wrapper}>
      <Checkbox.Root
        checked={checked}
        onCheckedChange={onChange}
        style={styles.container}
      >
        <View style={[styles.box, checked ? styles.boxChecked : null]}>
          <Checkbox.Indicator style={styles.indicator}>
            <CheckIcon />
          </Checkbox.Indicator>
        </View>
        <Text style={styles.label}>{label}</Text>
      </Checkbox.Root>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 18,
    width: '100%',
  },
  container: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  box: {
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderColor: colors.burgundy,
    borderRadius: 3,
    borderWidth: 1.5,
    height: 21,
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
    width: 21,
  },
  boxChecked: {
    backgroundColor: colors.burgundy,
  },
  indicator: {
    alignItems: 'center',
    height: 19,
    justifyContent: 'center',
    width: 19,
  },
  label: {
    color: colors.textBurgundy,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
  },
  error: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 17,
    marginLeft: 31,
    marginTop: 5,
  },
});
