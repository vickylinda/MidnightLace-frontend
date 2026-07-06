import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Modal,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { apiFetch } from '../../utils/http';
import { getAccessToken } from '../../utils/session';
import { API_BASE_URL, resolveApiAssetUrl } from '../../utils/config';
import { formatMoney } from '../../utils/money';
import { useNotifications } from '../../context/NotificationsContext';

const HOME_SHIPPING_COST = 8000;

function normalizeCurrency(value) {
  return String(value || '').trim().toUpperCase();
}

function isUsdCurrency(currency) {
  return normalizeCurrency(currency) === 'USD';
}

function formatShippingTotal(productAmount, shippingAmount, currency) {
  const product = Number(productAmount) || 0;
  const shipping = Number(shippingAmount) || 0;
  if (isUsdCurrency(currency)) {
    return `${formatMoney(product, 'USD', { emptyValue: '' })} + ${formatMoney(shipping, 'ARS', { emptyValue: '' })}`;
  }
  return formatMoney(product + shipping, currency || 'ARS', { emptyValue: '' });
}

function getDepositAddress(product) {
  const depositName =
    product?.depositoNombre ||
    product?.deposito_nombre ||
    '';
  const depositDirection =
    product?.depositoDireccion ||
    product?.deposito_direccion ||
    product?.direccionDeposito ||
    product?.direccion_deposito ||
    '';

  if (depositName || depositDirection) {
    return {
      addressText: depositDirection,
      name: depositName,
    };
  }

  const deposit =
    product?.deposito ||
    product?.depositoAsignado ||
    product?.direccionRetiro ||
    product?.direccionDeposito ||
    null;

  if (deposit && typeof deposit === 'object') {
    return {
      country: deposit.pais || deposit.country || 'Argentina',
      locality: deposit.localidad || deposit.locality || deposit.ciudad || '',
      name: deposit.nombre || deposit.name || '',
      number: deposit.numero || deposit.number || '',
      postalCode: deposit.codigoPostal || deposit.codigo_postal || deposit.postalCode || deposit.cp || '',
      province: deposit.provincia || deposit.province || '',
      street: deposit.calle || deposit.street || deposit.direccion || '',
    };
  }

  return product?.direccionRetiroTexto || product?.direccionDepositoTexto || product?.ubicacion || null;
}

function formatAddressText(address) {
  if (!address) return '';
  if (typeof address === 'string') return address;
  if (address.addressText || address.addressLine || address.displayAddressLine) {
    return address.addressText || address.addressLine || address.displayAddressLine;
  }

  const streetLine = [address.street, address.number].filter(Boolean).join(' ');
  const locationLine = [
    address.locality,
    address.province,
    address.postalCode,
    address.country,
  ].filter(Boolean).join(', ');

  return [streetLine, locationLine].filter(Boolean).join(', ');
}

function getProductId(source = {}) {
  const product = source.productoDetalle || source.detallesProducto || source.producto || source;
  if (typeof product === 'number' || typeof product === 'string') return product;
  return (
    product?.identificador ||
    product?.id ||
    source.idProducto ||
    source.id_producto ||
    source.productoId ||
    source.producto_id ||
    null
  );
}

function normalizeEventData(data) {
  if (!data) {
    return {};
  }

  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  return data;
}

function isCheckPaymentMethod(payment) {
  const type = String(payment?.tipo || '').trim();
  return (
    type === 'chequeCertificado' ||
    type === 'cheque_certificado' ||
    type === 'cheque'
  );
}

function hasPaymentCurrencyMismatch(payment, targetCurrency) {
  const paymentCurrency = normalizeCurrency(payment?.moneda);
  const purchaseCurrency = normalizeCurrency(targetCurrency);

  return Boolean(paymentCurrency && purchaseCurrency && paymentCurrency !== purchaseCurrency);
}

function buildCurrencyMismatchMessage(payment, targetCurrency) {
  const paymentCurrency = normalizeCurrency(payment?.moneda) || 'otra moneda';
  const purchaseCurrency = normalizeCurrency(targetCurrency) || 'la moneda de la subasta';

  return `El medio de pago seleccionado es en ${paymentCurrency}, pero la subasta es en ${purchaseCurrency}. Reintentá con un medio de pago en ${purchaseCurrency}.`;
}

function isCurrencyMismatchError(error) {
  const message = [
    error?.message,
    typeof error?.payload === 'string' ? error.payload : '',
    error?.payload?.mensaje,
    error?.payload?.message,
    error?.payload?.detail,
    error?.payload?.detalle,
    error?.payload?.codigo,
    error?.payload?.code,
  ]
    .flat()
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    message.includes('moneda') ||
    message.includes('currency')
  ) && (
    message.includes('medio de pago') ||
    message.includes('tarjeta') ||
    message.includes('transferencia') ||
    message.includes('cuenta') ||
    message.includes('payment')
  );
}

function dispatchAuctionSwapBack() {
  if (typeof window === 'undefined' || !window.dispatchEvent) {
    return;
  }

  const EventConstructor =
    typeof window.CustomEvent === 'function'
      ? window.CustomEvent
      : typeof CustomEvent === 'function'
      ? CustomEvent
      : typeof window.Event === 'function'
      ? window.Event
      : null;

  if (EventConstructor) {
    window.dispatchEvent(new EventConstructor('auction_swap_back'));
  }
}

function ConfettiPiece({ delay, color, initialX, initialRotate, size, shape, containerWidth }) {
  const fallAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fallAnim, {
        toValue: 1,
        duration: 2600 + Math.random() * 1400,
        useNativeDriver: true,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, fallAnim]);

  const translateY = fallAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 650 + Math.random() * 200],
  });

  const translateX = fallAnim.interpolate({
    inputRange: [0, 0.4, 0.8, 1],
    outputRange: [
      initialX,
      initialX + (Math.random() > 0.5 ? 30 : -30),
      initialX + (Math.random() > 0.5 ? -40 : 40),
      initialX + (Math.random() > 0.5 ? 60 : -60),
    ],
  });

  const rotate = fallAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [`${initialRotate}deg`, `${initialRotate + 720 + Math.random() * 360}deg`],
  });

  const opacity = fallAnim.interpolate({
    inputRange: [0, 0.75, 1],
    outputRange: [1, 1, 0],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: shape === 'circle' ? size : size * 0.7,
        height: size,
        borderRadius: shape === 'circle' ? size / 2 : 2,
        backgroundColor: color,
        transform: [
          { translateX },
          { translateY },
          { rotate },
        ],
        opacity,
        zIndex: 9999,
      }}
    />
  );
}

function ConfettiCannon() {
  const { width } = useWindowDimensions();

  const pieces = useMemo(() => {
    const colorsList = [
      '#FF1744', '#F48FB1', '#FF4081', '#FF9100', '#FFEA00',
      '#00E676', '#00E5FF', '#651FFF', '#D500F9', '#FFD700',
      '#510310', '#E74C3C', '#2ECC71', '#3498DB', '#F1C40F',
    ];
    const shapes = ['rect', 'rect', 'circle', 'ribbon'];
    const count = 65;

    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      color: colorsList[Math.floor(Math.random() * colorsList.length)],
      delay: Math.random() * 1500,
      initialX: Math.random() * (width || 360),
      initialRotate: Math.random() * 360,
      size: 7 + Math.random() * 9,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      containerWidth: width || 360,
    }));
  }, [width]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} {...p} />
      ))}
    </View>
  );
}

const WinnerModalContext = createContext({
  triggerWinnerModal: () => {},
  showAscensoModal: () => {},
});

export function WinnerModalProvider({ children }) {
  const notificationsContext = useNotifications();
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winnerDetails, setWinnerDetails] = useState(null);
  const [productDetails, setProductDetails] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [isPaying, setIsPaying] = useState(false);
  const [pickupSelected, setPickupSelected] = useState(false);
  const handledWinnerIdsRef = useRef(new Set());
  const processingWinnerIdsRef = useRef(new Set());
  const [paymentResultModal, setPaymentResultModal] = useState({
    visible: false,
    success: false,
    title: '',
    message: '',
  });

  const [ascensoModal, setAscensoModal] = useState({
    visible: false,
    categoriaAnterior: '',
    nuevaCategoria: '',
    mensaje: '',
  });
  const pendingPromotionRef = useRef(null);

  const handleClosePaymentResult = () => {
    setPaymentResultModal((prev) => ({ ...prev, visible: false }));
    if (pendingPromotionRef.current) {
      const promo = pendingPromotionRef.current;
      pendingPromotionRef.current = null;
      setAscensoModal({
        visible: true,
        categoriaAnterior: promo.categoriaAnterior,
        nuevaCategoria: promo.nuevaCategoria,
        mensaje: promo.mensaje,
      });
    }
  };

  const handlePayment = async () => {
    if (!winnerDetails || !winnerDetails.idRegistroSubasta) {
      setShowWinnerModal(false);
      setPaymentResultModal({
        visible: true,
        success: false,
        title: 'No se pudo efectuar el pago',
        message: 'No se encontraron los datos de la subasta ganada.',
      });
      return;
    }

    if (!selectedMethodId) {
      setShowWinnerModal(false);
      setPaymentResultModal({
        visible: true,
        success: false,
        title: 'No se pudo efectuar el pago',
        message: 'Por favor, seleccioná un medio de pago válido en tu perfil.',
      });
      return;
    }

    const selectedPaymentMethod = paymentMethods.find(
      (method) => String(method.identificador) === String(selectedMethodId)
    );

    if (hasPaymentCurrencyMismatch(selectedPaymentMethod, winnerDetails.currency)) {
      setPaymentResultModal({
        visible: true,
        success: false,
        title: 'No se pudo efectuar el pago',
        message: buildCurrencyMismatchMessage(
          selectedPaymentMethod,
          winnerDetails.currency
        ),
        buttonText: 'ELEGIR OTRO MEDIO',
      });
      return;
    }

    try {
      setIsPaying(true);

      const res = await apiFetch(`/v1/mi/compras/${winnerDetails.idRegistroSubasta}/pagar`, {
        method: 'POST',
        body: {
          idMedioPago: Number(selectedMethodId),
          retiraPersonalmente: pickupSelected,
        },
      });

      setShowWinnerModal(false);

      if (res?.ascenso) {
        pendingPromotionRef.current = res.ascenso;
      }
      setPaymentResultModal({
        visible: true,
        success: true,
        title: 'Pago exitoso',
        message: pickupSelected ? 'El pago se efectuo exitosamente. Podras retirar tu pedido personalmente.' : 'El pago se efectuo exitosamente. Tu pedido se enviara a domicilio.',
      });
    } catch (err) {
      console.log('[WinnerModalProvider] Payment error:', err);
      if (
        isCurrencyMismatchError(err)
      ) {
        setPaymentResultModal({
          visible: true,
          success: false,
          title: 'No se pudo efectuar el pago',
          message: buildCurrencyMismatchMessage(
            selectedPaymentMethod,
            winnerDetails.currency
          ),
          buttonText: 'ELEGIR OTRO MEDIO',
        });
        return;
      }

      setShowWinnerModal(false);
      setPaymentResultModal({
        visible: true,
        success: false,
        title: 'No se pudo efectuar el pago',
        message: err.message || 'No se pudo efectuar el pago. Por favor, verificá tu medio de pago e intentalo nuevamente.',
      });
    } finally {
      setIsPaying(false);
    }
  };

  // Format price helper
  const formatPrice = (amount, curr) => {
    return formatMoney(amount, curr, { emptyValue: '' });
  };

  const handleCompraGanada = useCallback(async (rawDatos) => {
    try {
      const datos = normalizeEventData(rawDatos);
      const winnerEventId = datos.idRegistroSubasta || datos.notificationId
        ? String(datos.idRegistroSubasta || datos.notificationId)
        : '';

      if (
        winnerEventId &&
        (
          handledWinnerIdsRef.current.has(winnerEventId) ||
          processingWinnerIdsRef.current.has(winnerEventId)
        )
      ) {
        return;
      }

      if (winnerEventId) {
        processingWinnerIdsRef.current.add(winnerEventId);
      }

      const finalPrice = parseFloat(datos.importe);
      const currency = datos.moneda || 'USD';
      setPickupSelected(false);

      if (datos.productoDetalle) {
        setProductDetails(datos.productoDetalle);
      }

      // 1. Fetch active payment methods
      let validMethods = [];
      try {
        const methods = await apiFetch('/v1/medios-de-pago?pagina=1&cantidad=20');
        const itemsList = Array.isArray(methods) ? methods : (methods?.datos ?? methods?.items ?? []);
        validMethods = itemsList.filter(
          (m) =>
            (m.activo === 'si' || m.activo === true) &&
            (m.tipo === 'tarjeta_credito' ||
             m.tipo === 'tarjetaCredito' ||
             m.tipo === 'cuentaBancaria' ||
             m.tipo === 'chequeCertificado' ||
             m.tipo === 'cheque_certificado' ||
             m.tipo === 'cheque')
        );
        setPaymentMethods(validMethods);
        if (validMethods.length > 0) {
          setSelectedMethodId(validMethods[0].identificador);
        }
      } catch (err) {
        console.log('[WinnerModalProvider] Error prefetching payment methods:', err);
      }

      // 2. Fetch purchases list to find the matching product ID
      let productId = null;
      try {
        const purchasesRes = await apiFetch('/v1/mi/compras?pagina=1&cantidad=50');
        const purchasesList = Array.isArray(purchasesRes) ? purchasesRes : (purchasesRes?.datos ?? []);
        const matchingPurchase = purchasesList.find(
          (p) => Number(p.identificador) === Number(datos.idRegistroSubasta)
        );
        if (matchingPurchase) {
          productId = getProductId(matchingPurchase);
        }
      } catch (err) {
        console.log('[WinnerModalProvider] Error fetching purchases:', err);
      }

      // 3. Fetch product details
      let prodDetails = null;
      if (productId) {
        try {
          prodDetails = await apiFetch(`/v1/productos/${productId}`);
          setProductDetails(prodDetails);
        } catch (err) {
          console.log('[WinnerModalProvider] Error fetching product details:', err);
        }
      }

      const depositAddress = getDepositAddress(prodDetails || datos.productoDetalle || {});

      setWinnerDetails({
        finalPrice,
        marketValue: finalPrice * 1.25,
        savedAmount: finalPrice * 0.25,
        shipping: HOME_SHIPPING_COST,
        pickupDepositName: depositAddress?.name || '',
        pickupAddress: formatAddressText(depositAddress),
        total: finalPrice,
        currency,
        idRegistroSubasta: datos.idRegistroSubasta,
      });

      const isProductScreen =
        typeof window !== 'undefined' &&
        window.location.pathname.includes('/subasta/producto');

      if (isProductScreen) {
        dispatchAuctionSwapBack();
      }
      setShowWinnerModal(true);
      if (winnerEventId) {
        handledWinnerIdsRef.current.add(winnerEventId);
      }
    } catch (err) {
      console.log('[WinnerModalProvider] Error handling compra_ganada:', err);
    } finally {
      const datos = normalizeEventData(rawDatos);
      const winnerEventId = datos.idRegistroSubasta || datos.notificationId
        ? String(datos.idRegistroSubasta || datos.notificationId)
        : '';
      if (winnerEventId) {
        processingWinnerIdsRef.current.delete(winnerEventId);
      }
    }
  }, []);

  useEffect(() => {
    const event = notificationsContext?.lastEvent;
    if (event?.evento !== 'compra_ganada') {
      return;
    }

    handleCompraGanada({ ...normalizeEventData(event.datos), notificationId: event.notificationId });
  }, [notificationsContext?.lastEvent, handleCompraGanada]);

  useEffect(() => {
    const winnerNotification = (notificationsContext?.notifications || []).find(
      (notification) => notification?.tipo === 'compra_ganada'
    );
    if (!winnerNotification) {
      return;
    }

    handleCompraGanada({
      ...normalizeEventData(winnerNotification.detalle),
      notificationId: winnerNotification.identificador,
    });
  }, [notificationsContext?.notifications, handleCompraGanada]);

  // Poll-based check for user WebSocket connection to /v1/ws/usuario
  useEffect(() => {
    let ws = null;
    let active = true;

    const checkConnection = () => {
      const token = getAccessToken();
      if (!token) {
        if (ws) {
          console.log('[WinnerModalProvider] Token cleared, closing user socket');
          ws.close();
          ws = null;
        }
        return;
      }

      if (ws) {
        return; // Already connected
      }

      const wsBase = API_BASE_URL.replace(/^http/, 'ws');
      const wsUrl = `${wsBase}/v1/ws/usuario?token=${token}`;
      console.log('[WinnerModalProvider] Connecting global user socket:', wsUrl);

      const newWs = new WebSocket(wsUrl);
      newWs.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.evento === 'compra_ganada') {
            console.log('[WinnerModalProvider] Received global compra_ganada event:', message.datos);
            if (active) {
              await handleCompraGanada(message.datos);
            }
          }
        } catch (err) {
          console.log('[WinnerModalProvider] Error parsing user socket message:', err);
        }
      };

      newWs.onerror = (err) => {
        console.log('[WinnerModalProvider] Global user socket error:', err);
      };

      newWs.onclose = () => {
        console.log('[WinnerModalProvider] Global user socket closed');
        ws = null;
      };

      ws = newWs;
    };

    const interval = setInterval(checkConnection, 3000);
    checkConnection();

    return () => {
      active = false;
      clearInterval(interval);
      if (ws) {
        ws.close();
      }
    };
  }, [handleCompraGanada]);

  const showAscensoModal = useCallback((promo) => {
    if (!promo) return;
    setAscensoModal({
      visible: true,
      categoriaAnterior: promo.categoriaAnterior,
      nuevaCategoria: promo.nuevaCategoria,
      mensaje: promo.mensaje,
    });
  }, []);

  const value = useMemo(() => ({
    triggerWinnerModal: handleCompraGanada,
    showAscensoModal,
  }), [handleCompraGanada, showAscensoModal]);

  const photosList = productDetails?.fotos ?? [];
  const title = productDetails
    ? (productDetails.descripcion_catalogo || productDetails.descripcionCatalogo
      ? `${productDetails.nombre} - ${productDetails.descripcion_catalogo || productDetails.descripcionCatalogo}`
      : productDetails.nombre)
    : '';

  return (
    <WinnerModalContext.Provider value={value}>
      <View style={styles.root}>
        {children}

        {/* Global Winner Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showWinnerModal}
          onRequestClose={() => setShowWinnerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <ConfettiCannon />
            <View style={styles.modalCard}>
              {/* Close Button */}
              <Pressable
                onPress={() => setShowWinnerModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>

              {/* Header Row */}
              <View style={styles.modalHeaderRow}>
                <Svg width={38} height={38} viewBox="0 0 24 24" fill="none">
                  <Circle cx={12} cy={12} r={10} stroke={colors.burgundy} strokeWidth={2.5} />
                  <Path d="M8 12L11 15L16 9" stroke={colors.burgundy} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <View style={styles.modalHeaderTextContainer}>
                  <Text style={styles.modalTitleText}>¡Felicidades!</Text>
                  <Text style={styles.modalSubTitleText}>Has ganado la subasta</Text>
                </View>
              </View>

              {/* Product Row */}
              <View style={styles.modalProductRow}>
                {photosList.length > 0 ? (
                  <Image
                    source={{ uri: resolveApiAssetUrl(photosList[0].foto ?? photosList[0].rutaArchivo ?? photosList[0].ruta_archivo) }}
                    style={styles.modalProductImage}
                  />
                ) : (
                  <View style={[styles.modalProductImage, { backgroundColor: colors.cardBlush }]} />
                )}
                <View style={styles.modalProductCopy}>
                  <Text style={styles.modalProductIdText}>
                    {productDetails ? `ID: ${productDetails.identificador}` : ''}
                  </Text>
                  <Text numberOfLines={2} style={styles.modalProductTitleText}>
                    {title}
                  </Text>
                </View>
              </View>

              {winnerDetails && (
                <>
                  <View style={styles.modalInternalCard}>
                    {/* Price Block */}
                    <View style={styles.priceBlock}>
                      <Text style={styles.priceBlockLabel}>Precio final de la subasta</Text>
                      <Text style={styles.priceBlockVal}>
                        {formatPrice(winnerDetails.finalPrice, winnerDetails.currency)}
                      </Text>
                      <Text style={styles.priceBlockMarket}>
                        {`Valor de mercado: ${formatPrice(winnerDetails.marketValue, winnerDetails.currency)}`}
                      </Text>
                      <View style={styles.savedPill}>
                        <Text style={styles.savedText}>
                          {`¡Ahorrado ${formatPrice(winnerDetails.savedAmount, winnerDetails.currency)}!`}
                        </Text>
                      </View>
                    </View>

                    {/* Payment Selection */}
                    <Text style={styles.paymentSectionTitle}>Confirma tu pago</Text>
                    <View style={styles.paymentCardsContainer}>
                      {paymentMethods.map((m, idx) => {
                        const isCheck =
                          m.tipo === 'chequeCertificado' ||
                          m.tipo === 'cheque_certificado' ||
                          m.tipo === 'cheque';
                        const isBank = m.tipo === 'cuentaBancaria';

                        const brand = isCheck
                          ? 'Cheque Certificado'
                          : isBank
                          ? m.detalle?.nombreBanco || 'Transferencia'
                          : m.detalle?.red || m.marca || 'Tarjeta';

                        const lastFour =
                          m.detalle?.ultimosCuatroDigitos ||
                          m.ultimos_cuatro ||
                          'XXXX';

                        let expiryFormatted = '';
                        const rawExpiry = m.detalle?.fechaVencimiento || m.fecha_vencimiento || '';
                        expiryFormatted = rawExpiry;
                        if (rawExpiry && rawExpiry.includes('-')) {
                          const parts = rawExpiry.split('-');
                          if (parts.length >= 2) {
                            expiryFormatted = `${parts[1]}/${parts[0].slice(-2)}`;
                          }
                        }

                        const isSelected = selectedMethodId === m.identificador;

                        return (
                          <View key={m.identificador}>
                            <Pressable
                              onPress={() => setSelectedMethodId(m.identificador)}
                              style={styles.paymentCardRow}
                            >
                              <View style={styles.paymentCardLeft}>
                                <View style={styles.radioOutline}>
                                  {isSelected && <View style={styles.radioDot} />}
                                </View>
                                <Text style={styles.methodText}>
                                  {isCheck
                                    ? `Cheque Certificado (${m.moneda || 'ARS'})`
                                    : isBank
                                    ? `${brand} (${m.moneda || 'ARS'})`
                                    : `${brand} •••• ${lastFour}`}
                                </Text>
                              </View>
                              {!isCheck && !isBank ? (
                                <Text style={styles.expiryText}>
                                  {`Vence ${expiryFormatted}`}
                                </Text>
                              ) : null}
                            </Pressable>
                            {idx < paymentMethods.length - 1 && (
                              <View style={styles.paymentCardSeparator} />
                            )}
                          </View>
                        );
                      })}
                      {paymentMethods.length === 0 && (
                        <View style={{ padding: 12 }}>
                          <Text style={[styles.methodText, { opacity: 0.6, fontStyle: 'italic' }]}>
                            No tenés medios de pago activos (tarjetas, transferencias o cheques) registrados.
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Breakdown Table */}
                    <View style={styles.breakdownTable}>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Precio final:</Text>
                        <Text style={styles.breakdownValue}>
                          {formatPrice(winnerDetails.finalPrice, winnerDetails.currency)}
                        </Text>
                      </View>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Envio a domicilio:</Text>
                        <Text style={styles.breakdownValue}>
                          {formatPrice(pickupSelected ? 0 : winnerDetails.shipping, 'ARS')}
                        </Text>
                      </View>
                      <View style={[styles.breakdownRow, { marginTop: 4 }]}>
                        <Text style={styles.breakdownTotalLabel}>Total a pagar:</Text>
                        <Text style={styles.breakdownTotalValue}>
                          {formatShippingTotal(
                            winnerDetails.finalPrice,
                            pickupSelected ? 0 : winnerDetails.shipping,
                            winnerDetails.currency
                          )}
                        </Text>
                      </View>
                    </View>
                    {/* Pay Button */}
                    <Pressable
                      disabled={isPaying}
                      onPress={handlePayment}
                      style={({ pressed }) => [
                        styles.modalPayButton,
                        isPaying ? { opacity: 0.7 } : null,
                        pressed && !isPaying ? { opacity: 0.88, transform: [{ scale: 0.98 }] } : null,
                      ]}
                    >
                      {isPaying ? (
                        <ActivityIndicator color={colors.white} size="small" />
                      ) : (
                        <Text style={styles.modalPayButtonText}>
                          {`PAGAR AHORA ${formatShippingTotal(
                            winnerDetails.finalPrice,
                            pickupSelected ? 0 : winnerDetails.shipping,
                            winnerDetails.currency
                          )}`}
                        </Text>
                      )}
                    </Pressable>
                    <Pressable
                      disabled={isPaying}
                      onPress={() => setPickupSelected((selected) => !selected)}
                      style={[
                        styles.modalPickupButton,
                        pickupSelected ? styles.modalPickupButtonSelected : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalPickupButtonText,
                          pickupSelected ? styles.modalPickupButtonTextSelected : null,
                        ]}
                      >
                        {pickupSelected ? 'Retiro personal seleccionado' : 'Retirar personalmente'}
                      </Text>
                    </Pressable>
                    {pickupSelected ? (
                      <View style={styles.modalPickupAddressBox}>
                        {winnerDetails.pickupAddress ? (
                          <>
                            <Text style={styles.modalPickupAddressLabel}>Deposito de retiro</Text>
                            {winnerDetails.pickupDepositName ? (
                              <Text style={styles.modalPickupDepositName}>
                                {winnerDetails.pickupDepositName}
                              </Text>
                            ) : null}
                            <Text style={styles.modalPickupAddressLabel}>Direccion</Text>
                            <Text style={styles.modalPickupAddressText}>{winnerDetails.pickupAddress}</Text>
                          </>
                        ) : null}
                        <Text style={styles.modalPickupAddressText}>
                          El envio a domicilio no se cobra y queda en {formatPrice(0, 'ARS')}.
                        </Text>
                      </View>
                    ) : null}

                    <Text style={styles.modalDisclaimer}>
                      Al confirmar aceptas nuestros Términos y Política de privacidad
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Payment Result Modal (Success / Failure Notification) */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={paymentResultModal.visible}
          onRequestClose={handleClosePaymentResult}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.resultModalCard}>
              {paymentResultModal.success ? (
                <View style={styles.resultIconCircleSuccess}>
                  <Svg width={46} height={46} viewBox="0 0 24 24" fill="none">
                    <Circle cx={12} cy={12} r={10} fill="#9FB98D" />
                    <Path d="M8 12L11 15L16 9" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </View>
              ) : (
                <View style={styles.resultIconCircleError}>
                  <Svg width={46} height={46} viewBox="0 0 24 24" fill="none">
                    <Circle cx={12} cy={12} r={10} fill={colors.burgundy} />
                    <Path d="M15 9L9 15M9 9L15 15" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </View>
              )}

              <Text style={styles.resultModalTitle}>
                {paymentResultModal.title}
              </Text>

              <Text style={styles.resultModalMessage}>
                {paymentResultModal.message}
              </Text>

              <Pressable
                onPress={handleClosePaymentResult}
                style={({ pressed }) => [
                  styles.resultModalButton,
                  pressed ? { opacity: 0.88, transform: [{ scale: 0.98 }] } : null,
                ]}
              >
                <Text style={styles.resultModalButtonText}>
                  {paymentResultModal.buttonText || 'ENTENDIDO'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Ascenso de Categoria Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={ascensoModal.visible}
          onRequestClose={() => setAscensoModal((prev) => ({ ...prev, visible: false }))}
        >
          <View style={styles.modalOverlay}>
            <ConfettiCannon />
            <View style={styles.ascensoModalCard}>
              <View style={styles.ascensoIconCircle}>
                <Svg width={54} height={54} viewBox="0 0 24 24" fill="none">
                  <Path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#D4AF37" stroke="#D4AF37" strokeWidth={1} />
                </Svg>
              </View>

              <Text style={styles.ascensoModalTitle}>
                ¡ASCENSO DE CATEGORÍA!
              </Text>

              <Text style={styles.ascensoModalMessage}>
                {ascensoModal.mensaje}
              </Text>

              <View style={styles.ascensoBadgesRow}>
                <View style={styles.ascensoBadgeOld}>
                  <Text style={styles.ascensoBadgeTextOld}>{(ascensoModal.categoriaAnterior || '').toUpperCase()}</Text>
                </View>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="#8C777A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <View style={styles.ascensoBadgeNew}>
                  <Text style={styles.ascensoBadgeTextNew}>{(ascensoModal.nuevaCategoria || '').toUpperCase()}</Text>
                </View>
              </View>

              <Pressable
                onPress={() => setAscensoModal((prev) => ({ ...prev, visible: false }))}
                style={({ pressed }) => [
                  styles.ascensoModalButton,
                  pressed ? { opacity: 0.88, transform: [{ scale: 0.98 }] } : null,
                ]}
              >
                <Text style={styles.ascensoModalButtonText}>
                  ¡BUENÍSIMO!
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </WinnerModalContext.Provider>
  );
}

export function useWinnerModal() {
  return useContext(WinnerModalContext);
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  modalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: colors.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBlush,
    padding: 20,
    width: '90%',
    maxWidth: 350,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  modalCloseButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 20,
  },
  modalCloseText: {
    color: '#999999',
    fontSize: 20,
    fontFamily: fonts.bold,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    marginBottom: 14,
  },
  modalHeaderTextContainer: {
    flex: 1,
  },
  modalTitleText: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 22,
  },
  modalSubTitleText: {
    color: colors.burgundy,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 18,
  },
  modalProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  modalProductImage: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: colors.cardBlush,
  },
  modalProductCopy: {
    flex: 1,
  },
  modalProductIdText: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 11,
    marginBottom: 2,
  },
  modalProductTitleText: {
    color: '#510310',
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 14,
  },
  modalInternalCard: {
    backgroundColor: '#F6E3D1',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EBD8C6',
    padding: 12,
    marginBottom: 12,
  },
  priceBlock: {
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  priceBlockLabel: {
    color: '#510310',
    fontFamily: fonts.regular,
    fontSize: 12,
    marginBottom: 2,
  },
  priceBlockVal: {
    color: '#510310',
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 27,
    marginBottom: 2,
  },
  priceBlockMarket: {
    color: '#510310',
    fontFamily: fonts.regular,
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginBottom: 6,
    opacity: 0.85,
  },
  savedPill: {
    backgroundColor: '#C7E5D5',
    borderRadius: 6,
    paddingVertical: 6,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  savedText: {
    color: '#002401',
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  paymentSectionTitle: {
    color: '#510310',
    fontFamily: fonts.bold,
    fontSize: 13,
    marginBottom: 8,
  },
  paymentCardsContainer: {
    borderWidth: 1,
    borderColor: '#D6C0AF',
    borderRadius: 8,
    backgroundColor: '#FAF1E8',
    overflow: 'hidden',
    marginBottom: 12,
  },
  paymentCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  paymentCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
  },
  paymentCardSeparator: {
    height: 1,
    backgroundColor: '#D6C0AF',
  },
  radioOutline: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#510310',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#510310',
  },
  methodText: {
    color: '#510310',
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  expiryText: {
    color: '#510310',
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  breakdownTable: {
    backgroundColor: '#EBD8C6',
    borderRadius: 8,
    padding: 10,
    marginVertical: 12,
    rowGap: 5,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    color: '#510310',
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  breakdownValue: {
    color: '#510310',
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  breakdownTotalLabel: {
    color: '#510310',
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  breakdownTotalValue: {
    color: '#510310',
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  modalPayButton: {
    backgroundColor: colors.burgundy,
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  modalPayButtonText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  modalPickupButton: {
    alignItems: 'center',
    borderColor: colors.burgundy,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 10,
  },
  modalPickupButtonSelected: {
    backgroundColor: colors.burgundy,
  },
  modalPickupButtonText: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  modalPickupButtonTextSelected: {
    color: colors.white,
  },
  modalPickupAddressBox: {
    backgroundColor: '#FAF1E8',
    borderColor: '#D6C0AF',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    padding: 10,
  },
  modalPickupAddressLabel: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 12,
    marginBottom: 4,
  },
  modalPickupDepositName: {
    color: '#510310',
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  modalPickupAddressText: {
    color: '#510310',
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  modalDisclaimer: {
    color: '#8C777A',
    fontFamily: fonts.regular,
    fontSize: 9,
    textAlign: 'center',
    marginTop: 6,
  },
  resultModalCard: {
    alignItems: 'center',
    backgroundColor: '#F6E3D1',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(81, 3, 16, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: '88%',
    maxWidth: 380,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  resultIconCircleSuccess: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resultIconCircleError: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resultModalTitle: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 20,
    letterSpacing: 0,
    marginBottom: 10,
    textAlign: 'center',
  },
  resultModalMessage: {
    color: '#510310',
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  resultModalButton: {
    alignItems: 'center',
    backgroundColor: colors.burgundy,
    borderRadius: 8,
    height: 46,
    justifyContent: 'center',
    width: '100%',
  },
  resultModalButtonText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  ascensoModalCard: {
    alignItems: 'center',
    backgroundColor: '#F6E3D1',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: '88%',
    maxWidth: 380,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  ascensoIconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ascensoModalTitle: {
    color: '#D4AF37',
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: 1,
    marginBottom: 10,
    textAlign: 'center',
  },
  ascensoModalMessage: {
    color: '#510310',
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  ascensoBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 26,
  },
  ascensoBadgeOld: {
    backgroundColor: '#8C777A',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ascensoBadgeTextOld: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  ascensoBadgeNew: {
    backgroundColor: '#D4AF37',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  ascensoBadgeTextNew: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  ascensoModalButton: {
    alignItems: 'center',
    backgroundColor: '#D4AF37',
    borderRadius: 8,
    height: 46,
    justifyContent: 'center',
    width: '100%',
  },
  ascensoModalButtonText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
});


