import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

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

function RemoveIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 7L17 17M17 7L7 17"
        stroke={colors.burgundy}
        strokeLinecap="round"
        strokeWidth={2.2}
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
    file: asset?.file,
    id: `${Date.now()}-${index}-${asset?.uri || asset?.name || 'dni'}`,
    mimeType: asset?.mimeType || asset?.type,
    name: getAssetName(asset, `dni-${index + 1}`),
    uri: asset?.uri || '',
  };
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
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setIsMenuOpen(false);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: ['images'],
      quality: 0.8,
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
            <Text style={styles.menuText}>Abrir camara</Text>
          </Pressable>

          <Pressable onPress={pickFromLibrary} style={styles.menuItem}>
            <Text style={styles.menuText}>Elegir de fotos</Text>
          </Pressable>

          <Pressable onPress={pickDocument} style={styles.menuItem}>
            <Text style={styles.menuText}>Subir archivo</Text>
          </Pressable>
        </View>
      ) : null}

      {uploadedFiles.length ? (
        <View style={styles.fileList}>
          {uploadedFiles.map((file, index) => (
            <View key={file.id} style={styles.fileRow}>
              <FileIcon />

              <Text numberOfLines={1} style={styles.fileName}>
                {index + 1}. {file.name}
              </Text>

              <Pressable
                accessibilityLabel={`Eliminar ${file.name}`}
                accessibilityRole="button"
                onPress={() => removeFile(file.id)}
                style={styles.removeButton}
              >
                <RemoveIcon />
              </Pressable>
            </View>
          ))}
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  menuText: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  fileList: {
    marginTop: 10,
    rowGap: 7,
  },
  fileRow: {
    alignItems: 'center',
    columnGap: 8,
    flexDirection: 'row',
    minHeight: 32,
  },
  fileName: {
    color: colors.textBurgundy,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
  },
  removeButton: {
    alignItems: 'center',
    borderColor: 'rgba(159, 2, 29, 0.18)',
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
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
