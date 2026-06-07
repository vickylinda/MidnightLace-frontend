import { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

const MIN_IMAGES = 6;
const MAX_IMAGES = 10;

function UploadIcon() {
  return (
    <Svg height={22} viewBox="0 0 24 24" width={22}>
      <Path
        d="M12 15.5V4.8M12 4.8L8.25 8.55M12 4.8L15.75 8.55"
        fill="none"
        stroke={colors.burgundy}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
      <Path
        d="M5 14.6V18.2C5 19.3 5.9 20.2 7 20.2H17C18.1 20.2 19 19.3 19 18.2V14.6"
        fill="none"
        stroke={colors.burgundy}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

function CameraIcon() {
  return (
    <Svg height={23} viewBox="0 0 24 24" width={23}>
      <Path
        d="M4.5 8.5H7L8.3 6H15.7L17 8.5H19.5V18.5H4.5V8.5Z"
        fill="none"
        stroke={colors.burgundy}
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
      <Circle cx={12} cy={13.2} fill="none" r={3.2} stroke={colors.burgundy} strokeWidth={1.8} />
    </Svg>
  );
}

function GalleryIcon() {
  return (
    <Svg height={23} viewBox="0 0 24 24" width={23}>
      <Rect fill="none" height={15} rx={2} stroke={colors.burgundy} strokeWidth={1.8} width={17} x={3.5} y={4.5} />
      <Circle cx={9} cy={9.3} fill={colors.burgundy} r={1.5} />
      <Path
        d="M5.5 17L10.3 12.3L13.3 15.1L15.8 12.7L18.6 15.6"
        fill="none"
        stroke={colors.burgundy}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function CloseIcon() {
  return (
    <Svg height={16} viewBox="0 0 16 16" width={16}>
      <Path
        d="M4 4L12 12M12 4L4 12"
        fill="none"
        stroke={colors.white}
        strokeLinecap="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

function getImageName(asset, index) {
  return (
    asset?.fileName ||
    asset?.uri?.split('/').pop()?.split('?')[0] ||
    `foto-${index + 1}.jpg`
  );
}

export default function ProductImagePicker({ error, images, onChange }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [permissionError, setPermissionError] = useState('');
  const remainingSlots = Math.max(MAX_IMAGES - images.length, 0);

  function appendAssets(assets = []) {
    if (!assets.length || remainingSlots <= 0) {
      return;
    }

    const nextAssets = assets.slice(0, remainingSlots).map((asset, index) => ({
      id: `${asset.uri}-${Date.now()}-${index}`,
      name: getImageName(asset, images.length + index),
      uri: asset.uri,
    }));

    onChange?.([...images, ...nextAssets]);
    setPermissionError('');
    setIsMenuOpen(false);
  }

  async function openGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setPermissionError('Necesitamos acceso a tus fotos para adjuntarlas.');
      setIsMenuOpen(false);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ['images'],
      quality: 0.85,
      selectionLimit: remainingSlots,
    });

    if (!result.canceled) {
      appendAssets(result.assets);
    }
  }

  async function openCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setPermissionError('Necesitamos acceso a la cámara para tomar la foto.');
      setIsMenuOpen(false);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (!result.canceled) {
      appendAssets(result.assets);
    }
  }

  function removeImage(id) {
    onChange?.(images.filter((image) => image.id !== id));
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Fotos del producto*</Text>
          <Text style={styles.helper}>Mínimo {MIN_IMAGES}, máximo {MAX_IMAGES}.</Text>
        </View>
        <Text style={styles.counter}>{images.length}/{MAX_IMAGES}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={remainingSlots === 0}
        onPress={() => setIsMenuOpen(true)}
        style={[
          styles.uploadButton,
          remainingSlots === 0 ? styles.uploadButtonDisabled : null,
        ]}
      >
        <UploadIcon />
        <Text style={styles.uploadText}>
          {remainingSlots === 0 ? 'Límite alcanzado' : 'Agregar fotos'}
        </Text>
      </Pressable>

      {images.length ? (
        <ScrollView
          contentContainerStyle={styles.carousel}
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
        >
          {images.map((image, index) => (
            <View key={image.id} style={styles.previewCard}>
              <Image source={{ uri: image.uri }} style={styles.previewImage} />
              <View style={styles.imageNumber}>
                <Text style={styles.imageNumberText}>{index + 1}</Text>
              </View>
              <Pressable
                accessibilityLabel={`Eliminar ${image.name}`}
                onPress={() => removeImage(image.id)}
                style={styles.removeButton}
              >
                <CloseIcon />
              </Pressable>
              <Text numberOfLines={1} style={styles.fileName}>{image.name}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {error || permissionError ? (
        <Text style={styles.error}>{error || permissionError}</Text>
      ) : null}

      <Modal
        animationType="fade"
        onRequestClose={() => setIsMenuOpen(false)}
        transparent
        visible={isMenuOpen}
      >
        <Pressable onPress={() => setIsMenuOpen(false)} style={styles.backdrop}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>Agregar fotos</Text>
            <Text style={styles.sheetText}>
              Podés seleccionar varias imágenes de una vez.
            </Text>
            <Pressable onPress={openGallery} style={styles.sheetOption}>
              <GalleryIcon />
              <Text style={styles.sheetOptionText}>Elegir de la galería</Text>
            </Pressable>
            <Pressable onPress={openCamera} style={styles.sheetOption}>
              <CameraIcon />
              <Text style={styles.sheetOptionText}>Abrir cámara</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 28,
    width: '100%',
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  title: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 19,
    lineHeight: 24,
  },
  helper: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  counter: {
    color: colors.burgundy,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    marginTop: 2,
  },
  uploadButton: {
    alignItems: 'center',
    borderColor: colors.burgundy,
    borderRadius: 6,
    borderWidth: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 50,
  },
  uploadButtonDisabled: {
    opacity: 0.55,
  },
  uploadText: {
    color: colors.burgundy,
    fontFamily: fonts.semiBold,
    fontSize: 16,
    marginLeft: 9,
  },
  carousel: {
    columnGap: 12,
    paddingTop: 14,
  },
  previewCard: {
    backgroundColor: 'rgba(242, 211, 200, 0.58)',
    borderRadius: 6,
    overflow: 'hidden',
    paddingBottom: 7,
    width: 126,
  },
  previewImage: {
    height: 126,
    width: 126,
  },
  imageNumber: {
    alignItems: 'center',
    backgroundColor: 'rgba(117, 7, 25, 0.84)',
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    left: 7,
    position: 'absolute',
    top: 7,
    width: 24,
  },
  imageNumberText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  removeButton: {
    alignItems: 'center',
    backgroundColor: colors.burgundy,
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 7,
    top: 7,
    width: 28,
  },
  fileName: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: 6,
    paddingHorizontal: 7,
  },
  error: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 17,
    marginTop: 8,
  },
  backdrop: {
    backgroundColor: 'rgba(45, 0, 8, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: 18,
  },
  sheet: {
    backgroundColor: colors.cream,
    borderColor: 'rgba(159, 2, 29, 0.28)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 20,
  },
  sheetTitle: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 21,
    marginBottom: 4,
  },
  sheetText: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 14,
  },
  sheetOption: {
    alignItems: 'center',
    borderTopColor: 'rgba(159, 2, 29, 0.14)',
    borderTopWidth: 1,
    flexDirection: 'row',
    minHeight: 52,
  },
  sheetOptionText: {
    color: colors.textBurgundy,
    fontFamily: fonts.medium,
    fontSize: 16,
    marginLeft: 12,
  },
});
