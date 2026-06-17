import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import PrimaryButton from '../../components/forms/controls/PrimaryButton';
import ProductStatusCard from '../../components/products/ProductStatusCard';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { resolveApiAssetUrl } from '../../utils/config';
import { apiFetch, getApiErrorMessage } from '../../utils/http';

const STATUS_MAP = {
  pendiente: { status: 'pending', statusLabel: 'pendiente' },
  asignado: { status: 'assigned', statusLabel: 'asignado' },
  pendiente_confirmacion: { status: 'confirming', statusLabel: 'a confirmar' },
  en_subasta: { status: 'auction', statusLabel: 'en subasta' },
  rechazado: { status: 'rejected', statusLabel: 'rechazado' },
  vendido: { status: 'sold', statusLabel: 'vendido' },
};

const EMPTY_PRODUCTS_GIF_URL = 'https://media1.tenor.com/m/FmgqXydqf_UAAAAC/tantrum.gif';

function CloseIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.5 6.5L17.5 17.5M17.5 6.5L6.5 17.5"
        stroke={colors.burgundy}
        strokeLinecap="round"
        strokeWidth={2.5}
      />
    </Svg>
  );
}

const STATUS_DETAILS = {
  pending: 'En proceso de verificación por la empresa.',
  confirming: 'Asignado a catalogo con precio definido. Esperando su confirmación.',
  assigned: 'Aprobado y asignado a una futura subasta.',
  auction: 'Actualmente disponible para pujas.',
  rejected: 'No cumple con los criterios de aceptación.',
  sold: 'Subastado y vendido exitosamente.',
};

const STATUS_BADGE_STYLES = {
  pending: {
    backgroundColor: 'rgba(232, 177, 50, 0.72)',
    borderColor: '#B88310',
  },
  confirming: {
    backgroundColor: 'rgba(225, 119, 36, 0.76)',
    borderColor: '#B55E16',
  },
  assigned: {
    backgroundColor: 'rgba(92, 176, 74, 0.72)',
    borderColor: '#498E3C',
  },
  auction: {
    backgroundColor: 'rgba(66, 92, 196, 0.76)',
    borderColor: '#304BAF',
  },
  rejected: {
    backgroundColor: 'rgba(159, 2, 29, 0.76)',
    borderColor: colors.burgundy,
  },
  sold: {
    backgroundColor: 'rgba(112, 100, 96, 0.72)',
    borderColor: '#655B58',
  },
};

function normalizePhotoSource(photo) {
  if (!photo) {
    return null;
  }

  if (typeof photo === 'string') {
    return { uri: resolveApiAssetUrl(photo) };
  }

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
  const possibleLists = [
    producto.fotos,
    producto.imagenes,
    producto.fotosProducto,
    producto.urlsFotos,
    producto.archivos,
  ];
  const photos = [];

  if (producto.fotoPrincipal) {
    photos.push(producto.fotoPrincipal);
  }

  possibleLists.forEach((list) => {
    if (Array.isArray(list)) {
      photos.push(...list);
    }
  });

  const sources = photos.map(normalizePhotoSource).filter(Boolean);
  const seen = new Set();

  return sources.filter((source) => {
    const key = source.uri;
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function mapProduct(producto) {
  const mapped = STATUS_MAP[producto.estadoProducto] ?? {
    status: 'pending',
    statusLabel: producto.estadoProducto,
  };
  const lines = String(producto.descripcionCompleta ?? '').split('\n');
  const title = String(producto.nombre ?? lines[0] ?? '').slice(0, 60);
  const description = lines.slice(1).join('\n').trim() || null;
  const imageSources = getProductPhotos(producto);
  const imageSource = imageSources[0] ?? null;
  const ownerValue = producto.publicadoPor ?? producto.owner ?? producto.usuario ?? producto.vendedor;
  const owner =
    typeof ownerValue === 'string'
      ? ownerValue
      : ownerValue?.username ?? ownerValue?.nombreUsuario ?? ownerValue?.nombre ?? null;

  return {
    description,
    id: String(producto.identificador ?? producto.id ?? title),
    imageSource,
    imageSources,
    owner,
    status: mapped.status,
    statusLabel: mapped.statusLabel,
    title: title || 'Producto sin nombre',
  };
}

function ProductDetailsModal({ product, onClose }) {
  const { width } = useWindowDimensions();

  if (!product) {
    return null;
  }

  const detail = STATUS_DETAILS[product.status] ?? 'Estado registrado por el sistema.';
  const statusTitle = product.statusLabel
    ? product.statusLabel.charAt(0).toUpperCase() + product.statusLabel.slice(1)
    : 'Estado';
  const imageWidth = Math.min(width * 0.78, 308);
  const modalInnerWidth = Math.min(width * 0.9, 390) - 32;
  const imageGap = 12;
  const carouselSidePadding = Math.max((modalInnerWidth - imageWidth) / 2, 0);

  return (
    <Modal animationType="fade" transparent visible={Boolean(product)} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{product.title}</Text>
            <Pressable
              accessibilityLabel="Cerrar detalle del producto"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.modalCloseButton}
            >
              <CloseIcon />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {product.imageSources.length > 0 ? (
              <ScrollView
                decelerationRate="fast"
                horizontal
                contentContainerStyle={[
                  styles.modalCarouselContent,
                  { paddingHorizontal: carouselSidePadding },
                ]}
                showsHorizontalScrollIndicator={false}
                snapToInterval={imageWidth + imageGap}
                snapToAlignment="start"
                style={styles.modalCarousel}
              >
                {product.imageSources.map((source, index) => (
                  <View
                    key={`${source.uri}-${index}`}
                    style={[styles.modalImageFrame, { width: imageWidth }]}
                  >
                    <Image
                      resizeMode="contain"
                      source={source}
                      style={styles.modalImage}
                    />
                    <View style={styles.modalImageCount}>
                      <Text style={styles.modalImageCountText}>
                        {index + 1}/{product.imageSources.length}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.modalImageFallback}>
                <Text style={styles.modalImageFallbackText}>Sin fotos cargadas.</Text>
              </View>
            )}

            <View style={styles.modalStatusRow}>
              <Text style={styles.modalStatusPrefix}>Estado:</Text>
              <View style={[styles.modalBadge, STATUS_BADGE_STYLES[product.status]]}>
                <Text style={styles.modalBadgeText}>{product.statusLabel}</Text>
              </View>
            </View>

            <View style={styles.modalInfoBox}>
              <Text style={styles.modalInfoTitle}>{statusTitle}</Text>
              <Text style={styles.modalInfoText}>{detail}</Text>
            </View>

            {product.owner ? (
              <Text style={styles.modalMeta}>Publicado por @{product.owner}</Text>
            ) : null}
            {product.description ? (
              <View style={styles.modalDescriptionBox}>
                <Text style={styles.modalDescriptionTitle}>Descripcion</Text>
                <Text style={styles.modalDescription}>{product.description}</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function EmptyProductsNotice({ onCreateProduct, onGoHome }) {
  return (
    <View style={styles.emptyCard}>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={{ uri: EMPTY_PRODUCTS_GIF_URL }}
        style={styles.emptyGif}
      />

      <Text style={styles.emptyTitle}>
        ups! parece que no publicaste ningun producto todavía...
      </Text>
      <Text style={styles.emptyMessage}>pero nunca es tarde!</Text>

      <View style={styles.emptyActions}>
        <PrimaryButton onPress={onCreateProduct} style={styles.emptyButton}>
          Crear producto
        </PrimaryButton>
        <PrimaryButton onPress={onGoHome} style={styles.emptyButton}>
          Volver a home
        </PrimaryButton>
      </View>
    </View>
  );
}

export default function ProductCatalogScreen({ onCreateProduct, onGoHome }) {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/v1/productos?cantidad=50');
      setProducts((data.datos ?? []).map(mapProduct));
    } catch (err) {
      const message = getApiErrorMessage(err, 'No pudimos cargar tus productos.');

      if (/permiso|permisos|autoriz/i.test(message)) {
        setProducts([]);
        setError('');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Estado de los productos</Text>
      <Text style={styles.subtitle}>
        Seguí el proceso de evaluación y asignación de los bienes que publicaste.
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.burgundy} size="large" style={styles.spinner} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : products.length === 0 ? (
        <EmptyProductsNotice
          onCreateProduct={onCreateProduct}
          onGoHome={onGoHome}
        />
      ) : (
        <View style={styles.list}>
          {products.map((product) => (
            <ProductStatusCard
              key={product.id}
              {...product}
              onPress={() => setSelectedProduct(product)}
            />
          ))}
        </View>
      )}

      <ProductDetailsModal
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    paddingBottom: 38,
    paddingHorizontal: 24,
    paddingTop: 25,
    zIndex: 2,
  },
  title: {
    color: colors.cocoa,
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 33,
    maxWidth: 370,
    width: '100%',
  },
  subtitle: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
    marginTop: 4,
    maxWidth: 370,
    width: '100%',
  },
  list: {
    alignItems: 'center',
    rowGap: 16,
    width: '100%',
  },
  spinner: {
    marginTop: 40,
  },
  error: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 24,
    textAlign: 'center',
  },
  emptyActions: {
    alignItems: 'center',
    rowGap: 10,
    width: '100%',
  },
  emptyButton: {
    width: 178,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(242, 211, 200, 0.78)',
    borderColor: 'rgba(159, 2, 29, 0.28)',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 6,
    maxWidth: 370,
    paddingBottom: 22,
    paddingHorizontal: 20,
    paddingTop: 18,
    width: '100%',
  },
  emptyGif: {
    borderRadius: 14,
    height: 150,
    marginBottom: 14,
    width: 190,
  },
  emptyMessage: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 18,
    textAlign: 'center',
  },
  emptyTitle: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 25,
    marginBottom: 6,
    textAlign: 'center',
  },
  modalBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  modalBadgeText: {
    color: colors.white,
    fontFamily: fonts.semiBold,
    fontSize: 13,
    lineHeight: 16,
  },
  modalCard: {
    backgroundColor: colors.cream,
    borderColor: 'rgba(159, 2, 29, 0.34)',
    borderRadius: 18,
    borderWidth: 1,
    maxHeight: '86%',
    maxWidth: 390,
    paddingBottom: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    width: '90%',
  },
  modalCarousel: {
    marginTop: 10,
  },
  modalCarouselContent: {
    alignItems: 'center',
    columnGap: 12,
    paddingHorizontal: 0,
  },
  modalCloseButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  modalDescription: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  modalDescriptionBox: {
    marginTop: 12,
  },
  modalDescriptionTitle: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 19,
  },
  modalHeader: {
    alignItems: 'center',
    columnGap: 10,
    flexDirection: 'row',
  },
  modalImage: {
    height: '100%',
    width: '100%',
  },
  modalImageCount: {
    backgroundColor: 'rgba(159, 2, 29, 0.82)',
    borderRadius: 999,
    bottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    position: 'absolute',
    right: 10,
  },
  modalImageCountText: {
    color: colors.white,
    fontFamily: fonts.semiBold,
    fontSize: 12,
  },
  modalImageFallback: {
    alignItems: 'center',
    backgroundColor: 'rgba(242, 211, 200, 0.58)',
    borderRadius: 12,
    height: 230,
    justifyContent: 'center',
    marginTop: 10,
  },
  modalImageFallbackText: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  modalImageFrame: {
    alignItems: 'center',
    backgroundColor: 'rgba(242, 211, 200, 0.58)',
    borderRadius: 12,
    height: 250,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 310,
  },
  modalInfoBox: {
    backgroundColor: 'rgba(242, 211, 200, 0.58)',
    borderColor: 'rgba(159, 2, 29, 0.22)',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
    padding: 12,
  },
  modalInfoText: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  modalInfoTitle: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 19,
  },
  modalMeta: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(50, 0, 12, 0.58)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalStatusPrefix: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 19,
  },
  modalStatusRow: {
    alignItems: 'center',
    columnGap: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  modalTitle: {
    color: colors.textBurgundy,
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 25,
  },
});
