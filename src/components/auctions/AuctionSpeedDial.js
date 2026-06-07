import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

function PlusIcon({ isOpen }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d={isOpen ? 'M7 7L17 17M17 7L7 17' : 'M12 5V19M5 12H19'}
        stroke={colors.cream}
        strokeLinecap="round"
        strokeWidth={2.8}
      />
    </Svg>
  );
}

function ProductIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 8.3L12 5L18 8.3V15.7L12 19L6 15.7V8.3Z"
        stroke={colors.burgundy}
        strokeLinejoin="round"
        strokeWidth={2}
      />
      <Path
        d="M6.4 8.5L12 11.7L17.6 8.5M12 11.8V18.6"
        stroke={colors.burgundy}
        strokeLinecap="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

export default function AuctionSpeedDial({ onCreateProduct }) {
  const [isOpen, setIsOpen] = useState(false);

  function handleCreateProduct() {
    setIsOpen(false);
    onCreateProduct?.();
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {isOpen ? (
        <View style={styles.options}>
          <Pressable
            accessibilityRole="button"
            onPress={handleCreateProduct}
            style={styles.option}
          >
            <Text style={styles.optionText}>Crear producto</Text>
            <View style={styles.optionIcon}>
              <ProductIcon />
            </View>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        accessibilityLabel={isOpen ? 'Cerrar acciones' : 'Abrir acciones'}
        accessibilityRole="button"
        onPress={() => setIsOpen((currentValue) => !currentValue)}
        style={styles.mainButton}
      >
        <PlusIcon isOpen={isOpen} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'flex-end',
  },
  options: {
    marginBottom: 10,
    rowGap: 9,
  },
  option: {
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderColor: 'rgba(159, 2, 29, 0.3)',
    borderRadius: 999,
    borderWidth: 1,
    columnGap: 10,
    flexDirection: 'row',
    minHeight: 42,
    paddingLeft: 15,
    paddingRight: 7,
    boxShadow: '0 7px 14px rgba(45, 0, 8, 0.18)',
  },
  optionText: {
    color: colors.burgundy,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 18,
  },
  optionIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(159, 2, 29, 0.08)',
    borderRadius: 999,
    height: 31,
    justifyContent: 'center',
    width: 31,
  },
  mainButton: {
    alignItems: 'center',
    backgroundColor: colors.burgundy,
    borderColor: 'rgba(252, 235, 219, 0.68)',
    borderRadius: 999,
    borderWidth: 1,
    height: 58,
    justifyContent: 'center',
    width: 58,
    boxShadow: '0 8px 18px rgba(45, 0, 8, 0.28)',
  },
});
