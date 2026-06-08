import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';

export const passwordRules = [
  {
    label: 'Al menos una mayuscula',
    test: (value) => /[A-Z]/.test(value),
  },
  {
    label: 'Al menos una minuscula',
    test: (value) => /[a-z]/.test(value),
  },
  {
    label: 'Al menos un numero',
    test: (value) => /\d/.test(value),
  },
  {
    label: 'Minimo 8 caracteres',
    test: (value) => value.length >= 8,
  },
];

function RuleIcon({ isValid }) {
  if (isValid) {
    return (
      <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <Path
          d="M3.25 8.3L6.45 11.45L12.85 4.75"
          stroke="#3F7F35"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.2}
        />
      </Svg>
    );
  }

  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5"
        stroke={colors.mutedRose}
        strokeLinecap="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

export default function PasswordChecklist({ value }) {
  return (
    <View style={styles.passwordChecklist}>
      {passwordRules.map((rule) => {
        const isValid = rule.test(value);

        return (
          <View key={rule.label} style={styles.passwordRule}>
            <RuleIcon isValid={isValid} />
            <Text
              style={[
                styles.passwordRuleText,
                isValid ? styles.passwordRuleTextValid : null,
              ]}
            >
              {rule.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  passwordChecklist: {
    marginBottom: 29,
    rowGap: 8,
    width: '100%',
  },
  passwordRule: {
    alignItems: 'center',
    columnGap: 8,
    flexDirection: 'row',
  },
  passwordRuleText: {
    color: colors.mutedRose,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
  },
  passwordRuleTextValid: {
    color: '#3F7F35',
    fontFamily: fonts.medium,
  },
});
