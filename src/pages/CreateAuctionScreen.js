import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import PrimaryButton from '../components/forms/controls/PrimaryButton';
import LineSelectField from '../components/forms/fields/LineSelectField';
import LineTextField from '../components/forms/fields/LineTextField';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { resolveApiAssetUrl } from '../utils/config';
import { apiFetch, getApiErrorMessage } from '../utils/http';
import { toUploadValue } from '../services/profileApi';
import { formatMoney } from '../utils/money';

const CATEGORIAS = [
  { label: 'Común', value: 'comun' },
  { label: 'Especial', value: 'especial' },
  { label: 'Plata', value: 'plata' },
  { label: 'Oro', value: 'oro' },
  { label: 'Platino', value: 'platino' },
];

const INITIAL_FORM = {
  nombre: '',
  fecha: '',
  hora: '',
  categoria: '',
  duracionItemMinutos: '',
  ubicacion: '',
  destacada: false,
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

function CheckIcon() {
  return (
    <Svg height={14} viewBox="0 0 16 16" width={14}>
      <Path
        d="M3.2 8.2L6.4 11.4L12.8 4.6"
        fill="none"
        stroke={colors.white}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.2}
      />
    </Svg>
  );
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

function AuctionProgress({ currentStep = 1 }) {
  const steps = [
    { label: 'Datos', value: 1 },
    { label: 'Catalogo', value: 2 },
  ];

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: currentStep === 1 ? '0%' : '100%' }]} />
      </View>
      <View style={styles.progressSteps}>
        {steps.map((step) => {
          const isActive = step.value <= currentStep;

          return (
            <View key={step.value} style={styles.progressStep}>
              <View style={[styles.progressCircle, isActive ? styles.progressCircleActive : null]}>
                <Text style={styles.progressNumber}>{step.value}</Text>
              </View>
              <Text style={styles.progressLabel}>{step.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function cleanProductText(value) {
  const text = String(value ?? '').trim();
  return text && text.toLowerCase() !== 'no posee' ? text : '';
}

function normalizePhotoSource(photo) {
  if (!photo) return null;
  if (typeof photo === 'string') return { uri: resolveApiAssetUrl(photo) };

  const photoPath =
    photo.url ??
    photo.uri ??
    photo.ruta ??
    photo.path ??
    photo.archivo ??
    photo.nombreArchivo ??
    photo.foto;

  return photoPath ? { uri: resolveApiAssetUrl(photoPath) } : null;
}

function getProductPhotos(producto) {
  const photos = [];
  if (producto.fotoPrincipal) photos.push(producto.fotoPrincipal);

  [
    producto.fotos,
    producto.imagenes,
    producto.fotosProducto,
    producto.urlsFotos,
    producto.archivos,
  ].forEach((list) => {
    if (Array.isArray(list)) photos.push(...list);
  });

  return photos.map(normalizePhotoSource).filter(Boolean);
}

function formatPrice(value, currency) {
  return formatMoney(value, currency, { emptyValue: null });
}

function getSuggestedCommission(value) {
  const price = Number(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(price)) return '';
  return String(Math.max(1, Math.round(price * 0.1)));
}

function mapPoolProduct(producto) {
  const catalogText = cleanProductText(producto.descripcionCatalogo ?? producto.descripcion_catalogo);
  const completeText = cleanProductText(producto.descripcionCompleta ?? producto.descripcion_completa);
  const photos = getProductPhotos(producto);
  const owner = cleanProductText(producto.publicadoPor ?? producto.nombreUsuario ?? producto.owner);
  const id = producto.identificador ?? producto.id;

  return {
    id: String(id),
    rawId: id,
    title:
      cleanProductText(producto.nombre) ||
      cleanProductText(producto.titulo) ||
      (id ? `Producto #${id}` : 'Producto sin nombre'),
    description: catalogText || completeText || null,
    imageSource: photos[0] ?? null,
    owner: owner ? `@${owner.replace(/^@/, '')}` : producto.duenio ? `#${producto.duenio}` : null,
    priceLabel: formatPrice(producto.precioBase, producto.moneda),
    rawPrice: producto.precioBase,
  };
}

function AuctionProductOption({
  commission,
  isSelected,
  onCommissionChange,
  onPress,
  product,
}) {
  return (
    <View style={[styles.productOption, isSelected ? styles.productOptionSelected : null]}>
      <View style={styles.productOptionBody}>
        <View style={styles.productImageFrame}>
          {product.imageSource ? (
            <Image source={product.imageSource} style={styles.productImage} resizeMode="cover" />
          ) : (
            <Text style={styles.productImageFallback}>Sin foto</Text>
          )}
        </View>
        <View style={styles.productCopy}>
          <Text style={styles.productTitle}>{product.title}</Text>
          {product.owner ? (
            <Text style={styles.productOwner}>Publicado por {product.owner}</Text>
          ) : null}
          {product.description ? (
            <Text numberOfLines={4} style={styles.productDescription}>
              {product.description}
            </Text>
          ) : null}
          {product.priceLabel ? (
            <Text style={styles.productPrice}>Precio base: {product.priceLabel}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.productActions}>
        <LineTextField
          keyboardType="numeric"
          label="Comision"
          onChangeText={onCommissionChange}
          placeholder="Ej: 4500"
          style={styles.commissionField}
          value={commission}
        />
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={[styles.selectProductButton, isSelected ? styles.selectProductButtonActive : null]}
        >
          <Text style={[styles.selectProductButtonText, isSelected ? styles.selectProductButtonTextActive : null]}>
            {isSelected ? 'seleccionado' : 'seleccionar'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
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
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [coverImage, setCoverImage] = useState(null);
  const [createdAuction, setCreatedAuction] = useState(null);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [commissions, setCommissions] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const errors = useMemo(() => {
    const fechaISO = parseFecha(form.fecha);
    const horaStr = parseHora(form.hora);
    const duracion = parseInt(form.duracionItemMinutos, 10);

    return {
      nombre: requiredError(form.nombre, 'el nombre'),
      fecha: (() => {
        if (!form.fecha.trim()) return 'Completá la fecha.';
        if (!fechaISO) return 'Formato válido: DD/MM/AAAA o AAAA-MM-DD.';
        return '';
      })(),
      hora: (() => {
        if (!form.hora.trim()) return 'Completá la hora.';
        if (!horaStr) return 'Formato válido: HH:MM.';
        return '';
      })(),
      categoria: requiredError(form.categoria, 'la categoría'),
      ubicacion: requiredError(form.ubicacion, 'la ubicación'),
      duracionItemMinutos: (() => {
        if (!form.duracionItemMinutos.trim()) return 'Completá la duración por ítem.';
        if (isNaN(duracion) || duracion < 1) return 'Debe ser un número entero mayor a 0.';
        return '';
      })(),
    };
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean);
  const selectedProducts = useMemo(
    () => catalogProducts.filter((product) => selectedProductIds.includes(product.id)),
    [catalogProducts, selectedProductIds]
  );

  useEffect(() => {
    if (step !== 2) return undefined;

    let cancelled = false;

    async function fetchCatalogProducts() {
      setCatalogLoading(true);
      setCatalogError('');

      try {
        const data = await apiFetch('/v1/subastador/productos?estado=asignado&cantidad=100');
        const mappedProducts = (data.datos ?? []).map(mapPoolProduct);

        if (cancelled) return;

        setCatalogProducts(mappedProducts);
        setCommissions((prev) => {
          const next = { ...prev };
          mappedProducts.forEach((product) => {
            if (!next[product.id]) {
              next[product.id] = getSuggestedCommission(product.rawPrice);
            }
          });
          return next;
        });
      } catch (err) {
        if (!cancelled) {
          setCatalogError(getApiErrorMessage(err, 'No pudimos cargar tus productos asignados.'));
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }

    fetchCatalogProducts();

    return () => {
      cancelled = true;
    };
  }, [step]);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleBlur(field) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function showError(field) {
    return (submitted || touched[field]) && errors[field] ? errors[field] : '';
  }

  async function createAuctionRecord() {
    const body = new FormData();

    body.append('nombre', form.nombre.trim());
    body.append('fecha', parseFecha(form.fecha));
    body.append('hora', parseHora(form.hora));
    body.append('categoria', form.categoria);
    body.append('duracionItemMinutos', String(parseInt(form.duracionItemMinutos, 10)));
    body.append('ubicacion', form.ubicacion.trim());
    body.append('destacada', form.destacada ? 'true' : 'false');

    if (coverImage) {
      const upload = await toUploadValue(coverImage, 'portada-subasta.jpg');
      if (upload) body.append('fotoPortada', upload);
    }

    return apiFetch('/v1/subastador/subastas', { method: 'POST', body });
  }

  function handleCreateAuction() {
    setSubmitted(true);
    if (hasErrors) return;

    setApiError('');
    setStep(2);
  }

  function toggleProduct(product) {
    setSelectedProductIds((prev) =>
      prev.includes(product.id)
        ? prev.filter((id) => id !== product.id)
        : [...prev, product.id]
    );
  }

  function handleCommissionChange(productId, value) {
    setCommissions((prev) => ({ ...prev, [productId]: value }));
  }

  async function handleFinishCatalog() {
    if (selectedProducts.length === 0) {
      setCatalogError('Selecciona al menos un producto para crear la subasta.');
      return;
    }

    const invalidProduct = selectedProducts.find((product) => {
      const value = Number(String(commissions[product.id] ?? '').replace(',', '.'));
      return !Number.isFinite(value) || value <= 0;
    });

    if (invalidProduct) {
      setCatalogError('Revisa las comisiones: todas tienen que ser mayores a 0.');
      return;
    }

    setLoading(true);
    setCatalogError('');

    try {
      const auction = createdAuction?.identificador ? createdAuction : await createAuctionRecord();
      setCreatedAuction(auction);

      const catalog = await apiFetch('/v1/subastador/catalogos', {
        method: 'POST',
        body: {
          descripcion: `Catalogo de ${auction.nombre}`,
          idSubasta: auction.identificador,
        },
      });

      for (let index = 0; index < selectedProducts.length; index += 1) {
        const product = selectedProducts[index];
        await apiFetch(`/v1/subastador/catalogos/${catalog.identificador}/items`, {
          method: 'POST',
          body: {
            idProducto: product.rawId,
            orden: index + 1,
            comision: String(commissions[product.id]).replace(',', '.'),
          },
        });
      }

      onSubmitSuccess?.();
    } catch (err) {
      setCatalogError(getApiErrorMessage(err, 'No pudimos agregar los productos al catalogo.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Crear subasta</Text>
      <AuctionProgress currentStep={step} />

      {step === 1 ? (
        <>
      <View style={styles.section}>
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


        <LineTextField
          error={showError('duracionItemMinutos')}
          keyboardType="numeric"
          label="Duración por ítem (minutos)"
          onBlur={() => handleBlur('duracionItemMinutos')}
          onChangeText={(v) => handleChange('duracionItemMinutos', v)}
          placeholder="Ej: 3"
          value={form.duracionItemMinutos}
        />
        <LineTextField
          error={showError('ubicacion')}
          label="Ubicación"
          onBlur={() => handleBlur('ubicacion')}
          onChangeText={(v) => handleChange('ubicacion', v)}
          placeholder="Ej: La Rural, Palermo, CABA"
          value={form.ubicacion}
        />

        <AuctionCoverPicker cover={coverImage} onChange={setCoverImage} />

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: form.destacada }}
          onPress={() => handleChange('destacada', !form.destacada)}
          style={styles.featuredOption}
        >
          <View style={[styles.checkbox, form.destacada ? styles.checkboxChecked : null]}>
            {form.destacada ? <CheckIcon /> : null}
          </View>
          <View style={styles.featuredOptionText}>
            <Text style={styles.featuredOptionTitle}>Mostrar esta subasta en la home</Text>
            <Text style={styles.featuredOptionHelper}>
              Si la marcas, reemplaza la subasta destacada actual.
            </Text>
          </View>
        </Pressable>
      </View>

      {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

      <View style={styles.submit}>
        <PrimaryButton
          disabled={loading}
          onPress={handleCreateAuction}
          style={styles.submitButton}
        >
          {loading ? 'Creando...' : 'Continuar'}
        </PrimaryButton>
      </View>
        </>
      ) : (
        <>
          <View style={styles.catalogHeader}>
            <Text style={styles.catalogTitle}>Catalogo de productos</Text>
            <Text style={styles.catalogSubtitle}>
              Selecciona los productos asignados que queres sumar a esta subasta.
            </Text>
          </View>

          {catalogLoading ? (
            <ActivityIndicator color={colors.burgundy} style={styles.catalogSpinner} />
          ) : catalogError ? (
            <Text style={styles.apiError}>{catalogError}</Text>
          ) : catalogProducts.length === 0 ? (
            <Text style={styles.emptyCatalogText}>
              No tenes productos asignados disponibles para catalogar.
            </Text>
          ) : (
            <View style={styles.productsList}>
              {catalogProducts.map((product) => (
                <AuctionProductOption
                  commission={commissions[product.id] ?? ''}
                  isSelected={selectedProductIds.includes(product.id)}
                  key={product.id}
                  onCommissionChange={(value) => handleCommissionChange(product.id, value)}
                  onPress={() => toggleProduct(product)}
                  product={product}
                />
              ))}
            </View>
          )}

          <View style={styles.stepActions}>
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={() => setStep(1)}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Volver</Text>
            </Pressable>
            <PrimaryButton
              disabled={loading || selectedProductIds.length === 0}
              onPress={handleFinishCatalog}
              style={styles.finishButton}
            >
              {loading ? 'Guardando...' : 'Finalizar'}
            </PrimaryButton>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  progressContainer: {
    marginBottom: 24,
    position: 'relative',
    width: '100%',
  },
  progressTrack: {
    backgroundColor: 'rgba(117, 7, 25, 0.35)',
    height: 4,
    left: '25%',
    position: 'absolute',
    right: '25%',
    top: 17,
  },
  progressFill: {
    backgroundColor: colors.burgundy,
    height: '100%',
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressCircle: {
    alignItems: 'center',
    backgroundColor: '#70362E',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  progressCircleActive: {
    backgroundColor: colors.burgundy,
    borderColor: colors.blush,
    borderWidth: 2,
  },
  progressNumber: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  progressLabel: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
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
  catalogHeader: {
    borderBottomColor: 'rgba(138, 74, 58, 0.55)',
    borderBottomWidth: 1,
    marginBottom: 14,
    paddingBottom: 8,
  },
  catalogTitle: {
    color: colors.cocoa,
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 31,
  },
  catalogSubtitle: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  catalogSpinner: {
    marginVertical: 28,
  },
  emptyCatalogText: {
    color: colors.cocoa,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    marginVertical: 24,
    textAlign: 'center',
  },
  productsList: {
    rowGap: 18,
  },
  productOption: {
    backgroundColor: 'rgba(242, 211, 200, 0.52)',
    borderColor: 'rgba(159, 2, 29, 0.14)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  productOptionSelected: {
    borderColor: colors.burgundy,
    borderWidth: 2,
  },
  productOptionBody: {
    columnGap: 12,
    flexDirection: 'row',
  },
  productImageFrame: {
    alignItems: 'center',
    backgroundColor: 'rgba(252, 235, 219, 0.78)',
    borderRadius: 4,
    height: 178,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 134,
  },
  productImage: {
    height: '100%',
    width: '100%',
  },
  productImageFallback: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 17,
  },
  productCopy: {
    flex: 1,
    minWidth: 0,
  },
  productTitle: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 19,
  },
  productOwner: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  productDescription: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  productPrice: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 17,
    marginTop: 6,
  },
  productActions: {
    alignItems: 'flex-end',
    columnGap: 12,
    flexDirection: 'row',
    marginTop: 12,
  },
  commissionField: {
    flex: 1,
    marginBottom: 0,
  },
  selectProductButton: {
    alignItems: 'center',
    borderColor: colors.burgundy,
    borderRadius: 4,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    marginBottom: 2,
    paddingHorizontal: 10,
  },
  selectProductButtonActive: {
    backgroundColor: colors.burgundy,
  },
  selectProductButtonText: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 17,
  },
  selectProductButtonTextActive: {
    color: colors.white,
  },
  stepActions: {
    alignItems: 'center',
    columnGap: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
    marginTop: 24,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.burgundy,
    borderRadius: 25,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    width: 120,
  },
  secondaryButtonText: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  finishButton: {
    width: 138,
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
  featuredOption: {
    alignItems: 'flex-start',
    borderColor: 'rgba(159, 2, 29, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    columnGap: 12,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.burgundy,
    borderRadius: 4,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    marginTop: 2,
    width: 22,
  },
  checkboxChecked: {
    backgroundColor: colors.burgundy,
  },
  featuredOptionText: {
    flex: 1,
    minWidth: 0,
  },
  featuredOptionTitle: {
    color: colors.textBurgundy,
    fontFamily: fonts.semiBold,
    fontSize: 15,
    lineHeight: 19,
  },
  featuredOptionHelper: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
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
