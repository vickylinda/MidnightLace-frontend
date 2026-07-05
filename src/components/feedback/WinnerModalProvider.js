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
});

export function WinnerModalProvider({ children }) {
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winnerDetails, setWinnerDetails] = useState(null);
  const [productDetails, setProductDetails] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentResultModal, setPaymentResultModal] = useState({
    visible: false,
    success: false,
    title: '',
    message: '',
  });

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

    try {
      setIsPaying(true);

      await apiFetch(`/v1/mi/compras/${winnerDetails.idRegistroSubasta}/pagar`, {
        method: 'POST',
        body: {
          idMedioPago: Number(selectedMethodId),
        },
      });

      setShowWinnerModal(false);
      setPaymentResultModal({
        visible: true,
        success: true,
        title: '¡Pago Exitoso!',
        message: 'El pago se efectuó exitosamente. Tu compra ha sido procesada con éxito.',
      });
    } catch (err) {
      console.log('[WinnerModalProvider] Payment error:', err);
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
    if (amount === undefined || amount === null || isNaN(amount)) return '';
    const formatted = Number(amount).toLocaleString('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return `$ ${formatted}`;
  };

  const handleCompraGanada = useCallback(async (datos) => {
    try {
      const finalPrice = parseFloat(datos.importe);
      const commission = parseFloat(datos.comision) || 20000;
      const shipping = parseFloat(datos.costoEnvio) || 0;
      const currency = datos.moneda || 'USD';

      // 1. Fetch active payment methods
      let activeCards = [];
      try {
        const methods = await apiFetch('/v1/medios-de-pago?pagina=1&cantidad=20');
        const itemsList = Array.isArray(methods) ? methods : (methods?.datos ?? methods?.items ?? []);
        activeCards = itemsList.filter(
          (m) => m.activo === 'si' && (m.tipo === 'tarjeta_credito' || m.tipo === 'tarjetaCredito')
        );
        setPaymentMethods(activeCards);
        if (activeCards.length > 0) {
          setSelectedMethodId(activeCards[0].identificador);
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
          productId = matchingPurchase.producto;
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

      setWinnerDetails({
        finalPrice,
        marketValue: finalPrice * 1.25,
        savedAmount: finalPrice * 0.25,
        commission,
        shipping,
        total: finalPrice,
        currency,
        idRegistroSubasta: datos.idRegistroSubasta,
      });

      setShowWinnerModal(true);
    } catch (err) {
      console.log('[WinnerModalProvider] Error handling compra_ganada:', err);
    }
  }, []);

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

  const value = useMemo(() => ({
    triggerWinnerModal: handleCompraGanada,
  }), [handleCompraGanada]);

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
                        const brand = m.detalle?.red || m.marca || 'Tarjeta';
                        const lastFour = m.detalle?.ultimosCuatroDigitos || m.ultimos_cuatro || 'XXXX';
                        const rawExpiry = m.detalle?.fechaVencimiento || m.fecha_vencimiento || '';

                        let expiryFormatted = rawExpiry;
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
                                  {`${brand} •••• ${lastFour}`}
                                </Text>
                              </View>
                              <Text style={styles.expiryText}>
                                {`Vence ${expiryFormatted}`}
                              </Text>
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
                            No tenés tarjetas registradas.
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
                        <Text style={styles.breakdownLabel}>Envío:</Text>
                        <Text style={styles.breakdownValue}>
                          {formatPrice(winnerDetails.shipping, winnerDetails.currency)} (recogida en tienda)
                        </Text>
                      </View>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Comisión de servicio:</Text>
                        <Text style={styles.breakdownValue}>
                          {formatPrice(winnerDetails.commission, winnerDetails.currency)}
                        </Text>
                      </View>
                      <View style={[styles.breakdownRow, { marginTop: 4 }]}>
                        <Text style={styles.breakdownTotalLabel}>Total a pagar:</Text>
                        <Text style={styles.breakdownTotalValue}>
                          {formatPrice(winnerDetails.total, winnerDetails.currency)}
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
                          {`PAGAR AHORA ${formatPrice(winnerDetails.total, winnerDetails.currency)}`}
                        </Text>
                      )}
                    </Pressable>

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
          onRequestClose={() => setPaymentResultModal((prev) => ({ ...prev, visible: false }))}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.resultModalCard}>
              {paymentResultModal.success ? (
                <View style={styles.resultIconCircleSuccess}>
                  <Svg width={46} height={46} viewBox="0 0 24 24" fill="none">
                    <Circle cx={12} cy={12} r={10} fill="#3FA54B" />
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
                onPress={() => setPaymentResultModal((prev) => ({ ...prev, visible: false }))}
                style={({ pressed }) => [
                  styles.resultModalButton,
                  pressed ? { opacity: 0.88, transform: [{ scale: 0.98 }] } : null,
                ]}
              >
                <Text style={styles.resultModalButtonText}>ENTENDIDO</Text>
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
});
