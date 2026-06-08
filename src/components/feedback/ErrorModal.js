import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import PrimaryButton from '../forms/controls/PrimaryButton';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

const ERROR_GIF_URL = 'https://media1.tenor.com/m/MxvGiauFTesAAAAd/helpies.gif';

export default function ErrorModal({
  message,
  onRetry,
  visible,
}) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onRetry}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.backdrop} />

        <View
          accessibilityLiveRegion="polite"
          accessibilityViewIsModal
          style={styles.card}
        >
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={{ uri: ERROR_GIF_URL }}
            style={styles.gif}
          />

          <Text style={styles.title}>miau... algo salió mal</Text>
          <Text style={styles.message}>{message}</Text>

          <PrimaryButton onPress={onRetry} style={styles.button}>
            Intentar de nuevo
          </PrimaryButton>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(37, 0, 9, 0.52)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderColor: colors.blush,
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: 340,
    paddingBottom: 24,
    paddingHorizontal: 22,
    paddingTop: 20,
    width: '100%',
  },
  gif: {
    borderRadius: 14,
    height: 152,
    marginBottom: 14,
    width: 188,
  },
  title: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: 0,
    lineHeight: 27,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    width: 178,
  },
});
