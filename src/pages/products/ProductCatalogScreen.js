import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useNotifications } from '../../context/NotificationsContext';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { resolveApiAssetUrl } from '../../utils/config';
import { apiFetch, getApiErrorMessage } from '../../utils/http';
import { formatMoney } from '../../utils/money';

const STATUS_MAP = {
  pendiente: { status: 'pending', statusLabel: 'pendiente' },
  asignado: { status: 'assigned', statusLabel: 'asignado' },
  pendiente_confirmacion: { status: 'confirming', statusLabel: 'a confirmar' },
  en_subasta: { status: 'auction', statusLabel: 'en subasta' },
  rechazado: { status: 'rejected', statusLabel: 'rechazado' },
  vendido: { status: 'sold', statusLabel: 'vendido' },
};

const PRODUCT_NOTIFICATION_TYPES = new Set([
  'producto_aceptado',
  'producto_en_subasta',
  'producto_rechazado',
  'producto_vendido',
  'producto_no_vendido',
  'devolucion_producto',
]);

const EMPTY_PRODUCTS_GIF_URL = 'https://media.tenor.com/cUpWnIdngvwAAAAC/sad-happy.gif';

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

const OWNER_STATUS_DETAILS = {
  pending: 'La empresa esta revisando la documentacion, fotos y datos del bien.',
  confirming: 'El subastador lo agrego a un catalogo. Tenes que aceptar o rechazar las condiciones para avanzar.',
  assigned: 'El producto fue aprobado y esta disponible para que el subastador lo asigne a otra subasta.',
  auction: 'Aceptaste las condiciones y el producto esta participando en la subasta.',
  rejected: 'La empresa rechazo el producto. Este flujo termina aca.',
  sold: 'El producto fue subastado y vendido exitosamente.',
};

const AUCTIONEER_STATUS_DETAILS = {
  pending: 'La empresa todavia esta revisando el producto.',
  confirming: 'El producto ya esta en un catalogo y espera la respuesta del dueño sobre las condiciones.',
  assigned: 'Producto aprobado en tu pool. Podes sumarlo a un catalogo programado.',
  auction: 'El dueño acepto las condiciones y el producto ya puede subastarse.',
  rejected: 'La empresa rechazo el producto. No puede incorporarse a subastas.',
  sold: 'El producto fue vendido en subasta.',
};

const OWNER_STATUS_NOTES = {
  pending: 'Revision inicial',
  confirming: 'Accion requerida: revisar condiciones',
  assigned: 'Esperando asignacion a catalogo',
  auction: 'Condiciones aceptadas',
  rejected: 'Finalizado por rechazo',
  sold: 'Finalizado por venta',
};

const AUCTIONEER_STATUS_NOTES = {
  pending: 'Pendiente de revision',
  confirming: 'Esperando respuesta del dueño',
  assigned: 'Disponible para catalogar',
  auction: 'Listo para subasta',
  rejected: 'No disponible',
  sold: 'Venta completada',
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

function cleanProductText(value) {
  const text = String(value ?? '').trim();
  return text && text.toLowerCase() !== 'no posee' ? text : '';
}

function splitCatalogDescription(producto, isSubastador = false) {
  const catalogDescription = cleanProductText(
    producto.descripcionCatalogo ?? producto.descripcion_catalogo
  );

  const title =
    cleanProductText(producto.nombre) ||
    cleanProductText(producto.titulo) ||
    cleanProductText(producto.title) ||
    cleanProductText(producto.name) ||
    catalogDescription ||
    ((producto.identificador ?? producto.id) ? `Producto #${producto.identificador ?? producto.id}` : 'Producto sin nombre');

  const shortDescription =
    cleanProductText(producto.descripcionBreve ?? producto.descripcion_breve) ||
    null;

  return {
    catalogDescription,
    title,
    shortDescription,
  };
}

function formatPrice(value, currency) {
  return formatMoney(value, currency, { emptyValue: null });
}

function parseArtisticDetails(producto) {
  const rawDetails =
    producto.detalleArtistico ??
    producto.detallesArtisticos ??
    producto.detalleArtisticoProducto ??
    null;

  if (!rawDetails) {
    return [];
  }

  let details = rawDetails;

  if (typeof rawDetails === 'string') {
    try {
      details = JSON.parse(rawDetails);
    } catch {
      return [];
    }
  }

  return [
    { label: 'Artista o diseñador', value: details.artista },
    { label: 'Fecha o período', value: details.fechaObra },
    { label: 'Historia y procedencia', value: details.historia },
  ].filter((item) => item.value);
}

function appendArtisticDetails(description, artisticDetails) {
  if (artisticDetails.length === 0) {
    return description;
  }

  const detailText = artisticDetails
    .map((item) => `${item.label}: ${item.value}`)
    .join('\n');

  return [description, detailText].filter(Boolean).join('\n\n');
}

function mapProduct(producto, isSubastador = false) {
  const mapped = STATUS_MAP[producto.estadoProducto] ?? {
    status: 'pending',
    statusLabel: producto.estadoProducto,
  };

  const { catalogDescription, title, shortDescription } = splitCatalogDescription(producto, isSubastador);

  const baseCompleteDescription =
    String(producto.descripcionCompleta ?? producto.descripcion_completa ?? '').trim() || null;
  const artisticDetails = parseArtisticDetails(producto);
  const completeDescription = appendArtisticDetails(
    baseCompleteDescription,
    artisticDetails
  );

  const imageSources = getProductPhotos(producto);
  const imageSource = imageSources[0] ?? null;

  const ownerValue =
    producto.publicadoPor ??
    producto.owner ??
    producto.usuario ??
    producto.vendedor;

  const owner =
    typeof ownerValue === 'string'
      ? ownerValue
      : ownerValue?.username ??
        ownerValue?.nombreUsuario ??
        ownerValue?.nombre ??
        null;
  const ownerId = producto.duenio ?? producto.idDuenio ?? producto.dueno ?? null;

  const rawId = producto.identificador ?? null;
  const ownerDisplay = owner
    ? `@${String(owner).replace(/^@/, '')}`
    : ownerId ? `#${ownerId}` : null;

  return {
    artisticDetails,
    catalogDescription,
    completeDescription,
    description: catalogDescription,
    id: String(rawId ?? producto.id ?? title),
    rawId,
    imageSource,
    imageSources,
    owner: isSubastador ? ownerDisplay : null,
    ownerLabel: 'Publicado por',
    priceLabel: formatPrice(producto.precioBase, producto.moneda),
    rejectionReason:
      cleanProductText(producto.motivoRechazo ?? producto.motivo_rechazo) || null,
    insurance: producto.seguro || null,
    deposit: producto.deposito || null,
    shortDescription,
    status: mapped.status,
    statusLabel: mapped.statusLabel,
    title: title.slice(0, 60) || 'Producto sin nombre',
  };
}

function ProductDetailsModal({ product, onClose, onReviewConditions, isSubastador = false }) {
  const { width } = useWindowDimensions();

  if (!product) {
    return null;
  }

  const detailMap = isSubastador ? AUCTIONEER_STATUS_DETAILS : OWNER_STATUS_DETAILS;
  const defaultDetail = detailMap[product.status] ?? STATUS_DETAILS[product.status] ?? 'Estado registrado por el sistema.';
  const detail =
    product.status === 'rejected' && product.rejectionReason
      ? `Motivo: ${product.rejectionReason}`
      : defaultDetail;
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
              <Text style={styles.modalMeta}>{product.ownerLabel} {product.owner}</Text>
            ) : null}
            {product.priceLabel ? (
              <View style={styles.modalPriceRow}>
                <Text style={styles.modalPriceLabel}>Precio base:</Text>
                <Text style={styles.modalPriceValue}>{product.priceLabel}</Text>
              </View>
            ) : null}

            {product.insurance ? (
              <View style={styles.modalDescriptionBox}>
                <Text style={styles.modalDescriptionTitle}>Seguro</Text>
                <Text style={styles.modalDescription}>
                  {product.insurance.compania || '-'} - Poliza {product.insurance.nroPoliza || '-'} - {product.insurance.importe || '-'}
                </Text>
              </View>
            ) : null}

            {product.deposit ? (
              <View style={styles.modalDescriptionBox}>
                <Text style={styles.modalDescriptionTitle}>Deposito asignado</Text>
                <Text style={styles.modalDescription}>
                  {product.deposit.nombre || '-'} - {product.deposit.direccion || '-'}
                </Text>
              </View>
            ) : null}

            {(product.shortDescription || product.catalogDescription) ? (
              <View style={styles.modalDescriptionBox}>
                <Text style={styles.modalDescriptionTitle}>Descripción breve</Text>
                <Text style={styles.modalDescription}>{product.shortDescription || product.catalogDescription}</Text>
              </View>
            ) : null}

            {product.completeDescription ? (
              <View style={styles.modalDescriptionBox}>
                <Text style={styles.modalDescriptionTitle}>Descripción completa</Text>
                <Text style={styles.modalDescription}>{product.completeDescription}</Text>
              </View>
            ) : null}

            {onReviewConditions ? (
              <PrimaryButton onPress={onReviewConditions} style={styles.modalReviewButton}>
                Revisar condiciones
              </PrimaryButton>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function EmptyProductsNotice({
  canCreateProduct,
  isSubastador,
  onCreateProduct,
  onGoAuctions,
  onGoHome,
}) {
  return (
    <View style={styles.emptyCard}>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={{ uri: EMPTY_PRODUCTS_GIF_URL }}
        style={styles.emptyGif}
      />

      <Text style={styles.emptyTitle}>
        {isSubastador
          ? 'ups! todavia no tenes productos asignados...'
          : 'ups! parece que no publicaste ningun producto todavía...'}
      </Text>
      <Text style={styles.emptyMessage}>
        {isSubastador ? 'cuando te asignen bienes, los vas a ver aca.' : 'pero nunca es tarde!'}
      </Text>

      <View style={styles.emptyActions}>
        {isSubastador ? (
          <PrimaryButton onPress={onGoAuctions} style={styles.emptyButton}>
            Ir a subastas
          </PrimaryButton>
        ) : canCreateProduct ? (
          <PrimaryButton onPress={onCreateProduct} style={styles.emptyButton}>
            Crear producto
          </PrimaryButton>
        ) : (
          <PrimaryButton onPress={onGoHome} style={styles.emptyButton}>
            Volver a home
          </PrimaryButton>
        )}
      </View>
    </View>
  );
}

function ConditionsModal({ state, onAccept, onReject, onClose }) {
  const { product, data, loading: cLoading, error: cError, submitting } = state;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={Boolean(product)}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Condiciones de subasta</Text>
            <Pressable
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.modalCloseButton}
            >
              <CloseIcon />
            </Pressable>
          </View>

          {cLoading ? (
            <ActivityIndicator color={colors.burgundy} style={styles.conditionsSpinner} />
          ) : cError ? (
            <Text style={styles.error}>{cError}</Text>
          ) : data ? (
            <>
              <View style={styles.conditionRow}>
                <Text style={styles.conditionLabel}>Precio base:</Text>
                <Text style={styles.conditionValue}>{formatPrice(data.precioBase, data.moneda)}</Text>
              </View>
              <View style={styles.conditionRow}>
                <Text style={styles.conditionLabel}>Comisión:</Text>
                <Text style={styles.conditionValue}>{formatPrice(data.comision, data.moneda)}</Text>
              </View>
              <View style={styles.conditionRow}>
                <Text style={styles.conditionLabel}>Fecha:</Text>
                <Text style={styles.conditionValue}>{data.fecha ?? '—'}</Text>
              </View>
              <View style={styles.conditionRow}>
                <Text style={styles.conditionLabel}>Hora:</Text>
                <Text style={styles.conditionValue}>{data.hora ?? '—'}</Text>
              </View>
              <View style={styles.conditionRow}>
                <Text style={styles.conditionLabel}>Lugar:</Text>
                <Text style={styles.conditionValue}>{data.lugar ?? '—'}</Text>
              </View>
              <Text style={styles.conditionHint}>
                Si aceptas, el producto pasa a subasta. Si rechazas, vuelve al pool asignado para otra oportunidad.
              </Text>
              <View style={styles.conditionActions}>
                <PrimaryButton onPress={onAccept} disabled={submitting} style={styles.conditionAccept}>
                  Aceptar
                </PrimaryButton>
                <PrimaryButton onPress={onReject} disabled={submitting} style={styles.conditionReject}>
                  Rechazar
                </PrimaryButton>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const EMPTY_CONDITIONS = { product: null, data: null, loading: false, error: null, submitting: false };

export default function ProductCatalogScreen({
  canCreateProduct = false,
  isSubastador = false,
  onCreateProduct,
  onGoAuctions,
  onGoHome,
}) {
  const { notifications } = useNotifications() ?? {};
  const lastProductNotificationIdRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [conditionsState, setConditionsState] = useState(EMPTY_CONDITIONS);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = isSubastador
        ? '/v1/subastador/productos?cantidad=50'
        : '/v1/productos?cantidad=50';
      const data = await apiFetch(endpoint);
      setProducts((data.datos ?? []).map((producto) => mapProduct(producto, isSubastador)));
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
  }, [isSubastador]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const productNotification = (notifications ?? []).reduce((latest, notification) => {
      if (!PRODUCT_NOTIFICATION_TYPES.has(notification.tipo)) {
        return latest;
      }

      if (!latest || notification.identificador > latest.identificador) {
        return notification;
      }

      return latest;
    }, null);

    if (!productNotification || productNotification.identificador === lastProductNotificationIdRef.current) {
      return;
    }

    lastProductNotificationIdRef.current = productNotification.identificador;
    fetchProducts();
  }, [fetchProducts, notifications]);

  async function openConditions(product) {
    setConditionsState({ product, data: null, loading: true, error: null, submitting: false });
    try {
      const data = await apiFetch(`/v1/productos/${product.rawId}/condiciones`);
      setConditionsState((s) => ({ ...s, data, loading: false }));
    } catch (err) {
      const msg = getApiErrorMessage(err, 'No pudimos cargar las condiciones.');
      setConditionsState((s) => ({ ...s, error: msg, loading: false }));
    }
  }

  async function submitConditions(accepts) {
    const { product } = conditionsState;
    if (!product) return;
    setConditionsState((s) => ({ ...s, submitting: true, error: null }));
    try {
      await apiFetch(`/v1/productos/${product.rawId}/aceptar-condiciones`, {
        method: 'PATCH',
        body: { acepta: accepts },
      });
      setConditionsState(EMPTY_CONDITIONS);
      fetchProducts();
    } catch (err) {
      const msg = getApiErrorMessage(err, 'No pudimos procesar tu respuesta.');
      setConditionsState((s) => ({ ...s, submitting: false, error: msg }));
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Estado de los productos</Text>
      <Text style={styles.subtitle}>
        {isSubastador
          ? 'Segui el pool asignado, las confirmaciones pendientes y el resultado de cada subasta.'
          : 'Segui la evaluacion, confirma condiciones cuando te notifiquen y consulta el resultado final.'}
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.burgundy} size="large" style={styles.spinner} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : products.length === 0 ? (
        <EmptyProductsNotice
          canCreateProduct={canCreateProduct}
          isSubastador={isSubastador}
          onCreateProduct={onCreateProduct}
          onGoAuctions={onGoAuctions}
          onGoHome={onGoHome}
        />
      ) : (
        <View style={styles.list}>
          {products.map((product) => (
            <ProductStatusCard
              key={product.id}
              {...product}
              onPress={() => setSelectedProduct(product)}
              statusNote={(isSubastador ? AUCTIONEER_STATUS_NOTES : OWNER_STATUS_NOTES)[product.status]}
              action={
                !isSubastador && product.status === 'confirming' ? (
                  <PrimaryButton
                    onPress={() => openConditions(product)}
                    style={styles.reviewButton}
                  >
                    Revisar condiciones
                  </PrimaryButton>
                ) : null
              }
            />
          ))}
        </View>
      )}

      <ProductDetailsModal
        onClose={() => setSelectedProduct(null)}
        isSubastador={isSubastador}
        product={selectedProduct}
        onReviewConditions={!isSubastador && selectedProduct?.status === 'confirming' ? () => {
          setSelectedProduct(null);
          openConditions(selectedProduct);
        } : undefined}
      />

      <ConditionsModal
        state={conditionsState}
        onAccept={() => submitConditions(true)}
        onReject={() => submitConditions(false)}
        onClose={() => setConditionsState(EMPTY_CONDITIONS)}
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
  modalReviewButton: {
    marginTop: 16,
    width: '100%',
  },
  reviewButton: {
    height: 42,
    width: '100%',
  },
  conditionsSpinner: {
    marginVertical: 24,
  },
  conditionRow: {
    alignItems: 'center',
    columnGap: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  conditionLabel: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 18,
  },
  conditionValue: {
    color: colors.cocoa,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 18,
  },
  conditionHint: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  conditionActions: {
    flexDirection: 'row',
    columnGap: 12,
    justifyContent: 'center',
    marginTop: 22,
  },
  conditionAccept: {
    width: 128,
  },
  conditionReject: {
    backgroundColor: colors.mutedRose,
    width: 128,
  },
  modalPriceRow: {
  alignItems: 'center',
  columnGap: 8,
  flexDirection: 'row',
  flexWrap: 'wrap',
  marginTop: 14,
},
modalPriceLabel: {
  color: colors.textBurgundy,
  fontFamily: fonts.bold,
  fontSize: 15,
  lineHeight: 19,
},
modalPriceValue: {
  color: colors.cocoa,
  fontFamily: fonts.semiBold,
  fontSize: 15,
  lineHeight: 19,
},
});
