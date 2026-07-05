import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts } from '../../theme/fonts';

export default function SubastadoStamp({ text = 'SUBASTADO', style, textStyle }) {
  return (
    <View style={[styles.overlay, style]}>
      <View style={styles.stampBox}>
        <Text style={[styles.stampText, textStyle]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    zIndex: 15,
  },
  stampBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderColor: '#3D3D3D',
    borderRadius: 8,
    borderWidth: 3,
    elevation: 3,
    paddingHorizontal: 10,
    paddingVertical: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    transform: [{ rotate: '-18deg' }],
  },
  stampText: {
    color: '#3D3D3D',
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 1.5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
