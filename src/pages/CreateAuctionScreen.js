import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import PrimaryButton from '../components/forms/controls/PrimaryButton';
import LineSelectField from '../components/forms/fields/LineSelectField';
import LineTextField from '../components/forms/fields/LineTextField';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { apiFetch, getApiErrorMessage } from '../utils/http';
import { toUploadValue } from '../services/profileApi';

const CATEGORIAS = [
  { label: 'Común', value: 'comun' },
  { label: 'Especial', value: 'especial' },
  { label: 'Plata', value: 'plata' },
  { label: 'Oro', value: 'oro' },
  { label: 'Platino', value: 'platino' },
];

const MONEDAS = [
  { label: 'Pesos (ARS)', value: 'ARS' },
  { label: 'Dólares (USD)', value: 'USD' },
];

const SINO = [
  { label: 'Sí', value: 'si' },
  { label: 'No', value: 'no' },
];

const INITIAL_FORM = {
  nombre: '',
  fecha: '',
  hora: '',
  categoria: '',
  moneda: '',
  duracionItemMinutos: '',
  ubicacion: '',
  capacidadAsistentes: '',
  tieneDeposito: '',
  seguridadPropia: '',
};

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
    <Svg height={18} viewBox="0 0 24 24" width={18}>
      <Path
        d="M7 3.8H14.2L18 7.6V20.2H7V3.8Z"
        fill="none"
        stroke={colors.burgundy}
        strokeLinejoin="round"
        strokeWidth={2}
      />
      <Path
        d="M14 4V8H18"
        fill="none"
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

function getMinFecha() {
  const d = new Date();
  d.setDate(d.getDate() + 10);
  return d.toISOString().split('T')[0];
}

function parseFecha(str) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str.trim());
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str.trim())) return str.trim();
  return null;
}

function parseHora(str) {
  const s = str.trim();
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
  return null;
}

function requiredError(value, label) {
  return String(value || '').trim() ? '' : `Completá ${label}.`;
}

function formatDateInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function formatTimeInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 4);

  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function getAssetName(asset, fallbackName) {
  return (
    asset?.fileName ||
    asset?.name ||
    asset?.uri?.split('/').pop()?.split('?')[0] ||
    fallbackName
  );
}

function buildCoverFile(asset) {
  return {
    id: `${Date.now()}-${asset?.uri || asset?.name || 'portada'}`,
    mimeType: asset?.mimeType || asset?.type || 'image/jpeg',
    name: getAssetName(asset, 'portada-subasta.jpg'),
    uri: asset?.uri || '',
  };
}

function AuctionCoverPicker({ cover, onChange }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [permissionError, setPermissionError] = useState('');

  function updateCover(asset) {
    if (!asset) return;

    onChange?.(buildCoverFile(asset));
    setPermissionError('');
    setIsMenuOpen(false);
  }

  async function openGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setPermissionError('Necesitamos acceso a tus fotos para adjuntar la portada.');
      setIsMenuOpen(false);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (!result.canceled) {
      updateCover(result.assets?.[0]);
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
      allowsEditing: true,
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (!result.canceled) {
      updateCover(result.assets?.[0]);
    }
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      base64: false,
      copyToCacheDirectory: true,
      multiple: false,
      type: 'image/*',
    });

    if (!result.canceled) {
      updateCover(result.assets?.[0]);
    }

    setIsMenuOpen(false);
  }

  return (
    <View style={styles.coverContainer}>
      <View style={styles.coverHeaderRow}>
        <View style={styles.coverHeaderText}>
          <Text style={styles.coverTitle}>Foto de portada</Text>
          <Text style={styles.coverHelper}>Subí una imagen para identificar la subasta.</Text>
        </View>
        <Text style={styles.coverCounter}>{cover ? '1/1' : '0/1'}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => setIsMenuOpen((value) => !value)}
        style={styles.coverButton}
      >
        <UploadIcon />
        <Text style={styles.coverButtonText}>
          {cover ? 'Cambiar portada' : 'Subir portada'}
        </Text>
      </Pressable>

      {isMenuOpen ? (
        <View style={styles.coverMenu}>
          <Pressable onPress={openCamera} style={styles.coverMenuItem}>
            <CameraIcon />
            <Text style={styles.coverMenuText}>Abrir cámara</Text>
          </Pressable>
          <Pressable onPress={openGallery} style={styles.coverMenuItem}>
            <GalleryIcon />
            <Text style={styles.coverMenuText}>Elegir de fotos</Text>
          </Pressable>
          <Pressable onPress={pickDocument} style={styles.coverMenuItem}>
            <FileIcon />
            <Text style={styles.coverMenuText}>Subir archivo</Text>
          </Pressable>
        </View>
      ) : null}

      {cover ? (
        <View style={styles.coverPreviewCard}>
          <Image source={{ uri: cover.uri }} style={styles.coverPreviewImage} />
          <Pressable
            accessibilityLabel={`Eliminar ${cover.name}`}
            accessibilityRole="button"
            onPress={() => onChange?.(null)}
            style={styles.coverRemoveButton}
          >
            <CloseIcon />
          </Pressable>
          <Text numberOfLines={1} style={styles.coverFileName}>
            {cover.name}
          </Text>
        </View>
      ) : null}

      {permissionError ? <Text style={styles.coverError}>{permissionError}</Text> : null}
    </View>
  );
}

export default function CreateAuctionScreen({ onSubmitSuccess }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [coverImage, setCoverImage] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const errors = useMemo(() => {
    const minFecha = getMinFecha();
    const fechaISO = parseFecha(form.fecha);
    const horaStr = parseHora(form.hora);
    const duracion = parseInt(form.duracionItemMinutos, 10);

    return {
      nombre: requiredError(form.nombre, 'el nombre'),
      fecha: (() => {
        if (!form.fecha.trim()) return 'Completá la fecha.';
        if (!fechaISO) return 'Formato válido: DD/MM/AAAA o AAAA-MM-DD.';
        if (fechaISO < minFecha) return 'La fecha debe ser al menos 10 días a partir de hoy.';
        return '';
      })(),
      hora: (() => {
        if (!form.hora.trim()) return 'Completá la hora.';
        if (!horaStr) return 'Formato válido: HH:MM.';
        return '';
      })(),
      categoria: requiredError(form.categoria, 'la categoría'),
      moneda: requiredError(form.moneda, 'la moneda'),
      duracionItemMinutos: (() => {
        if (!form.duracionItemMinutos.trim()) return 'Completá la duración por ítem.';
        if (isNaN(duracion) || duracion < 1) return 'Debe ser un número entero mayor a 0.';
        return '';
      })(),
    };
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleBlur(field) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function showError(field) {
    return (submitted || touched[field]) && errors[field] ? errors[field] : '';
  }

  async function handleSubmit() {
    setSubmitted(true);
    if (hasErrors) return;

    setLoading(true);
    setApiError('');

    try {
      const body = new FormData();

      body.append('nombre', form.nombre.trim());
      body.append('fecha', parseFecha(form.fecha));
      body.append('hora', parseHora(form.hora));
      body.append('categoria', form.categoria);
      body.append('moneda', form.moneda);
      body.append('duracionItemMinutos', String(parseInt(form.duracionItemMinutos, 10)));

      if (form.ubicacion.trim()) body.append('ubicacion', form.ubicacion.trim());
      if (form.capacidadAsistentes.trim()) {
        const n = parseInt(form.capacidadAsistentes, 10);
        if (!isNaN(n)) body.append('capacidadAsistentes', String(n));
      }
      if (form.tieneDeposito) body.append('tieneDeposito', form.tieneDeposito);
      if (form.seguridadPropia) body.append('seguridadPropia', form.seguridadPropia);
      if (coverImage) {
        const upload = await toUploadValue(coverImage, 'portada-subasta.jpg');
        if (upload) body.append('fotoPortada', upload);
      }

      await apiFetch('/v1/subastador/subastas', { method: 'POST', body });
      onSubmitSuccess?.();
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'No se pudo crear la subasta.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Crear subasta</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Datos obligatorios</Text>

        <LineTextField
          error={showError('nombre')}
          label="Nombre"
          onBlur={() => handleBlur('nombre')}
          onChangeText={(v) => handleChange('nombre', v)}
          placeholder="Ej: Colección Otoño 2026"
          value={form.nombre}
        />

        <LineTextField
          error={showError('fecha')}
          keyboardType="number-pad"
          label="Fecha"
          maxLength={10}
          onBlur={() => handleBlur('fecha')}
          onChangeText={(v) => handleChange('fecha', formatDateInput(v))}
          placeholder="DD/MM/AAAA"
          value={form.fecha}
        />

        <LineTextField
          error={showError('hora')}
          keyboardType="number-pad"
          label="Hora de inicio"
          maxLength={5}
          onBlur={() => handleBlur('hora')}
          onChangeText={(v) => handleChange('hora', formatTimeInput(v))}
          placeholder="HH:MM"
          value={form.hora}
        />

        <LineSelectField
          error={showError('categoria')}
          label="Categoría"
          onBlur={() => handleBlur('categoria')}
          onChange={(v) => handleChange('categoria', v)}
          options={CATEGORIAS}
          placeholder="Seleccioná una categoría"
          value={form.categoria}
        />

        <LineSelectField
          error={showError('moneda')}
          label="Moneda"
          onBlur={() => handleBlur('moneda')}
          onChange={(v) => handleChange('moneda', v)}
          options={MONEDAS}
          placeholder="Seleccioná la moneda"
          value={form.moneda}
        />

        <LineTextField
          error={showError('duracionItemMinutos')}
          keyboardType="numeric"
          label="Duración por ítem (minutos)"
          onBlur={() => handleBlur('duracionItemMinutos')}
          onChangeText={(v) => handleChange('duracionItemMinutos', v)}
          placeholder="Ej: 3"
          value={form.duracionItemMinutos}
        />
      </View>

      <AuctionCoverPicker cover={coverImage} onChange={setCoverImage} />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Datos opcionales</Text>

        <LineTextField
          label="Ubicación"
          onChangeText={(v) => handleChange('ubicacion', v)}
          placeholder="Ej: La Rural, Palermo, CABA"
          value={form.ubicacion}
        />

        <LineTextField
          keyboardType="numeric"
          label="Capacidad de asistentes"
          onChangeText={(v) => handleChange('capacidadAsistentes', v)}
          placeholder="Ej: 200"
          value={form.capacidadAsistentes}
        />

        <LineSelectField
          label="¿Tiene depósito?"
          onChange={(v) => handleChange('tieneDeposito', v)}
          options={SINO}
          placeholder="Seleccioná"
          value={form.tieneDeposito}
        />

        <LineSelectField
          label="¿Seguridad propia?"
          onChange={(v) => handleChange('seguridadPropia', v)}
          options={SINO}
          placeholder="Seleccioná"
          value={form.seguridadPropia}
        />
      </View>

      {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

      <View style={styles.submit}>
        <PrimaryButton
          disabled={loading}
          onPress={handleSubmit}
          style={styles.submitButton}
        >
          {loading ? 'Creando...' : 'Crear subasta'}
        </PrimaryButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 32,
    paddingTop: 31,
    zIndex: 2,
  },
  title: {
    color: colors.cocoa,
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 32,
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
    rowGap: 12,
  },
  sectionLabel: {
    color: colors.burgundy,
    fontFamily: fonts.semiBold,
    fontSize: 13,
    lineHeight: 17,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  apiError: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 12,
    textAlign: 'center',
  },
  coverContainer: {
    marginBottom: 22,
    width: '100%',
  },
  coverHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  coverHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  coverTitle: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 19,
    lineHeight: 24,
  },
  coverHelper: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  coverCounter: {
    color: colors.burgundy,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 18,
    marginTop: 2,
  },
  coverButton: {
    alignItems: 'center',
    borderColor: colors.burgundy,
    borderRadius: 6,
    borderWidth: 2,
    columnGap: 9,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 50,
  },
  coverButtonText: {
    color: colors.burgundy,
    fontFamily: fonts.semiBold,
    fontSize: 16,
    lineHeight: 20,
  },
  coverMenu: {
    backgroundColor: colors.cream,
    borderColor: colors.blush,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
    width: '100%',
  },
  coverMenuItem: {
    alignItems: 'center',
    borderTopColor: 'rgba(159, 2, 29, 0.12)',
    borderTopWidth: 1,
    columnGap: 10,
    flexDirection: 'row',
    minHeight: 46,
    paddingHorizontal: 16,
  },
  coverMenuText: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 19,
  },
  coverPreviewCard: {
    backgroundColor: 'rgba(242, 211, 200, 0.58)',
    borderRadius: 6,
    marginTop: 14,
    overflow: 'hidden',
    paddingBottom: 8,
    width: '100%',
  },
  coverPreviewImage: {
    height: 174,
    width: '100%',
  },
  coverRemoveButton: {
    alignItems: 'center',
    backgroundColor: colors.burgundy,
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    top: 8,
    width: 30,
  },
  coverFileName: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 7,
    paddingHorizontal: 9,
  },
  coverError: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 17,
    marginTop: 8,
  },
  submit: {
    alignItems: 'center',
    marginTop: 4,
  },
  submitButton: {
    marginBottom: 32,
    width: 170,
  },
});
