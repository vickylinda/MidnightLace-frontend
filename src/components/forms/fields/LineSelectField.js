import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';

function ChevronIcon({ isOpen }) {
  return (
    <Svg
      height={22}
      style={isOpen ? styles.chevronOpen : null}
      viewBox="0 0 24 24"
      width={22}
    >
      <Path
        d="M6 9L12 15L18 9"
        fill="none"
        stroke={colors.burgundy}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
      />
    </Svg>
  );
}

function ErrorIcon() {
  return (
    <Svg height={16} viewBox="0 0 16 16" width={16}>
      <Circle cx={8} cy={8} fill="none" r={7} stroke={colors.burgundy} strokeWidth={1.5} />
      <Rect fill={colors.burgundy} height={6} rx={0.75} width={1.5} x={7.25} y={3.75} />
      <Circle cx={8} cy={12.1} fill={colors.burgundy} r={0.9} />
    </Svg>
  );
}

export default function LineSelectField({
  error,
  label,
  onChange,
  options,
  placeholder = 'Seleccioná una opción',
  style,
  value,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  function handleSelect(nextValue) {
    onChange?.(nextValue);
    setIsOpen(false);
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsOpen((currentValue) => !currentValue)}
        style={styles.trigger}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.value,
            !selectedOption ? styles.placeholder : null,
          ]}
        >
          {selectedOption?.label || placeholder}
        </Text>
        <ChevronIcon isOpen={isOpen} />
      </Pressable>

      {isOpen ? (
        <View style={styles.menu}>
          {options.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => handleSelect(option.value)}
              style={[
                styles.option,
                option.value === value ? styles.optionSelected : null,
              ]}
            >
              <Text style={styles.optionText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

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
  trigger: {
    alignItems: 'center',
    borderBottomColor: colors.burgundy,
    borderBottomWidth: 7,
    flexDirection: 'row',
    minHeight: 35,
    paddingBottom: 2,
  },
  value: {
    color: colors.textBurgundy,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 18,
  },
  placeholder: {
    color: 'rgba(139, 92, 95, 0.72)',
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  menu: {
    backgroundColor: colors.cream,
    borderColor: 'rgba(159, 2, 29, 0.3)',
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
    width: '100%',
  },
  option: {
    borderBottomColor: 'rgba(159, 2, 29, 0.12)',
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionSelected: {
    backgroundColor: 'rgba(214, 136, 143, 0.2)',
  },
  optionText: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 16,
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