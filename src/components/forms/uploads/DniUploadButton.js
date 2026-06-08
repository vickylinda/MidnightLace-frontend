import { useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';

const MAX_DNI_FILES = 2;
const menuShadowStyle = Platform.select({
  web: {
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.12)',
  },
  android: {
    elevation: 3,
  },
  default: {},
});

function UploadIcon() {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 15.5V4.8M12 4.8L8.25 8.55M12 4.8L15.75 8.55"
        stroke={colors.burgundy}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
      <Path
        d="M5 14.6V18.2C5 19.3 5.9 20.2 7 20.2H17C18.1 20.2 19 19.3 19 18.2V14.6"
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
    <Svg height={22} viewBox="0 0 24 24" width={22}>
      <Path
        d="M4.5 8.5H7L8.3 6H15.7L17 8.5H19.5V18.5H4.5V8.5Z"
        fill="none"
        stroke={colors.burgundy}
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
      <Circle
        cx={12}
        cy={13.2}
        fill="none"
        r={3.2}
        stroke={colors.burgundy}
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function GalleryIcon() {
  return (
    <Svg height={22} viewBox="0 0 24 24" width={22}>
      <Rect
        fill="none"
        height={15}
        rx={2}
        stroke={colors.burgundy}
        strokeWidth={1.8}
        width={17}
        x={3.5}
        y={4.5}
      />
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

function FileIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 3.8H14.2L18 7.6V20.2H7V3.8Z"
        stroke={colors.burgundy}
        strokeLinejoin="round"
        strokeWidth={2}
      />
      <Path
        d="M14 4V8H18"
        stroke={colors.burgundy}
        strokeLinejoin="round"
        strokeWidth={2}
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

function getAssetName(asset, fallbackName) {
  return (
    asset?.fileName ||
    asset?.name ||
    asset?.uri?.split('/').pop()?.split('?')[0] ||
    fallbackName
  );
}

function buildUploadedFile(asset, index) {
  return {
    id: `${Date.now()}-${index}-${asset?.uri || asset?.name || 'dni'}`,
    mimeType: asset?.mimeType || asset?.type || '',
    name: getAssetName(asset, `dni-${index + 1}`),
    uri: asset?.uri || '',
  };
}

function canPreviewFile(file) {
  return Boolean(
    file?.uri &&
      (
        !file?.mimeType ||
        file.mimeType.startsWith('image') ||
        /\.(jpe?g|png|webp|gif|heic)$/i.test(file.name || file.uri)
      )
  );
}

export default function DniUploadButton({ error, files, onChange }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [internalFiles, setInternalFiles] = useState([]);
  const uploadedFiles = files || internalFiles;
  const canUploadMore = uploadedFiles.length < MAX_DNI_FILES;

  function updateFiles(nextFiles) {
    if (onChange) {
      onChange(nextFiles);
      return;
    }

    setInternalFiles(nextFiles);
  }

  function addFiles(assets = []) {
    const remainingSlots = MAX_DNI_FILES - uploadedFiles.length;

    if (remainingSlots <= 0) {
      return;
    }

    const nextFiles = assets
      .filter(Boolean)
      .slice(0, remainingSlots)
      .map((asset, index) =>
        buildUploadedFile(asset, uploadedFiles.length + index)
      );

    updateFiles([...uploadedFiles, ...nextFiles]);
  }

  async function pickFromLibrary() {
    const remainingSlots = MAX_DNI_FILES - uploadedFiles.length;

    if (remainingSlots <= 0) {
      setIsMenuOpen(false);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setIsMenuOpen(false);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: true,
      mediaTypes: ['images'],
      quality: 0.8,
      selectionLimit: remainingSlots,
    });

    if (!result.canceled) {
      addFiles(result.assets);
    }

    setIsMenuOpen(false);
  }

  async function openCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setIsMenuOpen(false);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled) {
      addFiles(result.assets);
    }

    setIsMenuOpen(false);
  }

  async function pickDocument() {
    const remainingSlots = MAX_DNI_FILES - uploadedFiles.length;

    const result = await DocumentPicker.getDocumentAsync({
      base64: false,
      copyToCacheDirectory: true,
      multiple: remainingSlots > 1,
      type: ['image/*', 'application/pdf'],
    });

    if (!result.canceled) {
      addFiles(result.assets);
    }

    setIsMenuOpen(false);
  }

  function handlePress() {
    if (!canUploadMore) {
      setIsMenuOpen(false);
      return;
    }

    setIsMenuOpen((value) => !value);
  }

  function removeFile(fileId) {
    updateFiles(uploadedFiles.filter((file) => file.id !== fileId));
  }

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        onPress={handlePress}
        style={[styles.button, !canUploadMore ? styles.buttonDisabled : null]}
      >
        <UploadIcon />
        <Text style={styles.buttonText}>Subir DNI</Text>
      </Pressable>

      {isMenuOpen ? (
        <View style={[styles.menu, menuShadowStyle]}>
          <Pressable onPress={openCamera} style={styles.menuItem}>
            <CameraIcon />
            <Text style={styles.menuText}>Abrir camara</Text>
          </Pressable>

          <Pressable onPress={pickFromLibrary} style={styles.menuItem}>
            <GalleryIcon />
            <Text style={styles.menuText}>Elegir de fotos</Text>
          </Pressable>

          <Pressable onPress={pickDocument} style={styles.menuItem}>
            <FileIcon />
            <Text style={styles.menuText}>Subir archivo</Text>
          </Pressable>
        </View>
      ) : null}

      {uploadedFiles.length ? (
        <ScrollView
          contentContainerStyle={styles.carousel}
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
        >
          {uploadedFiles.map((file, index) => (
            <View key={file.id} style={styles.previewCard}>
              {canPreviewFile(file) ? (
                <Image source={{ uri: file.uri }} style={styles.previewImage} />
              ) : (
                <View style={styles.documentPreview}>
                  <FileIcon />
                  <Text style={styles.documentText}>Archivo</Text>
                </View>
              )}

              <View style={styles.fileNumber}>
                <Text style={styles.fileNumberText}>{index + 1}</Text>
              </View>

              <Pressable
                accessibilityLabel={`Eliminar ${file.name}`}
                accessibilityRole="button"
                onPress={() => removeFile(file.id)}
                style={styles.removeButton}
              >
                <CloseIcon />
              </Pressable>

              <Text numberOfLines={1} style={styles.fileName}>
                {file.name}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {!canUploadMore ? (
        <Text style={styles.limitText}>Ya cargaste el maximo de 2 archivos.</Text>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  button: {
    alignItems: 'center',
    borderColor: colors.burgundy,
    borderWidth: 4,
    columnGap: 10,
    flexDirection: 'row',
    height: 47,
    paddingHorizontal: 16,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.62,
  },
  buttonText: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  menu: {
    backgroundColor: colors.cream,
    borderColor: colors.blush,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
    width: '100%',
  },
  menuItem: {
    alignItems: 'center',
    columnGap: 10,
    flexDirection: 'row',
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  menuText: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  carousel: {
    columnGap: 12,
    paddingTop: 14,
  },
  documentPreview: {
    alignItems: 'center',
    backgroundColor: 'rgba(252, 235, 219, 0.72)',
    height: 112,
    justifyContent: 'center',
    width: 112,
  },
  documentText: {
    color: colors.burgundy,
    fontFamily: fonts.medium,
    fontSize: 12,
    marginTop: 5,
  },
  fileNumber: {
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
  fileNumberText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  fileName: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: 6,
    paddingHorizontal: 7,
  },
  previewCard: {
    backgroundColor: 'rgba(242, 211, 200, 0.58)',
    borderRadius: 6,
    overflow: 'hidden',
    paddingBottom: 7,
    width: 112,
  },
  previewImage: {
    height: 112,
    width: 112,
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
  limitText: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  errorText: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
});
