import React, { useState, useEffect, useRef } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Animated,
  ActivityIndicator,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

import SubastadoStamp from '../../components/status/SubastadoStamp';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { apiFetch } from '../../utils/http';
import { getAccessToken } from '../../utils/session';
import { API_BASE_URL, resolveApiAssetUrl } from '../../utils/config';
import { getAuctionDetails, getActiveItem } from '../../services/auctionsApi';
import { getProfile } from '../../services/profileApi';

const palette = {
  card: '#F6E3D1',
  divider: 'rgba(81, 3, 16, 0.14)',
  green: '#3FA54B',
  text: '#510310',
};

const CATEGORIES_ORDER = ['comun', 'especial', 'plata', 'oro', 'platino'];

function getCategoryRank(catName) {
  if (!catName) return 0;
  const index = CATEGORIES_ORDER.indexOf(String(catName).toLowerCase().trim());
  return index >= 0 ? index : 0;
}

function checkCanBid({ isLoggedIn, userCategory, auctionCategory, hasVerifiedPaymentMethod }) {
  if (!isLoggedIn) {
    return {
      canBid: false,
      reason: 'NOT_LOGGED_IN',
      buttonText: 'INICIÁ SESIÓN PARA PUJAR',
    };
  }

  const userRank = getCategoryRank(userCategory);
  const auctionRank = getCategoryRank(auctionCategory);

  if (userRank < auctionRank) {
    return {
      canBid: false,
      reason: 'CATEGORY_TOO_LOW',
      buttonText: 'CATEGORÍA INSUFICIENTE PARA PUJAR',
    };
  }

  if (hasVerifiedPaymentMethod === false) {
    return {
      canBid: false,
      reason: 'NO_VERIFIED_PAYMENT',
      buttonText: 'REQUIERE MEDIO DE PAGO VERIFICADO',
    };
  }

  return {
    canBid: true,
    reason: 'OK',
    buttonText: null,
  };
}

// Pure JS base64 decoder for Hermers / React Native environment
function getUserId() {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let str = base64.replace(/=+$/, '');
    let bc = 0, bs = 0, result = '';
    for (let idx = 0; idx < str.length; idx++) {
      const char = str.charAt(idx);
      const pos = chars.indexOf(char);
      if (pos === -1) continue;
      bs = bc % 4 ? bs * 64 + pos : pos;
      if (bc++ % 4) {
        result += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
      }
    }
    const decoded = JSON.parse(result);
    return decoded.sub;
  } catch (err) {
    console.log('Error decoding token:', err);
    return null;
  }
}

function LiveIcon() {
  return (
    <Svg width={14} height={12} viewBox="0 0 14 12" fill="none">
      <Circle cx={7} cy={6} r={1.35} fill={colors.white} />
      <Path
        d="M4.8 3.8C4.25 4.35 3.92 5.13 3.92 6C3.92 6.87 4.25 7.65 4.8 8.2"
        stroke={colors.white}
        strokeLinecap="round"
        strokeWidth={1.2}
      />
      <Path
        d="M9.2 3.8C9.75 4.35 10.08 5.13 10.08 6C10.08 6.87 9.75 7.65 9.2 8.2"
        stroke={colors.white}
        strokeLinecap="round"
        strokeWidth={1.2}
      />
      <Path
        d="M2.55 2.35C1.75 3.27 1.27 4.53 1.27 6C1.27 7.47 1.75 8.73 2.55 9.65"
        stroke={colors.white}
        strokeLinecap="round"
        strokeWidth={1.2}
      />
      <Path
        d="M11.45 2.35C12.25 3.27 12.73 4.53 12.73 6C12.73 7.47 12.25 8.73 11.45 9.65"
        stroke={colors.white}
        strokeLinecap="round"
        strokeWidth={1.2}
      />
    </Svg>
  );
}

function WebCameraView({ style, children }) {
  const videoRef = useRef(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let stream = null;
    let isMounted = true;

    async function initCamera() {
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          });
          if (isMounted) {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(() => {});
            }
          }
        } else {
          if (isMounted) setErrorMsg('Cámara no compatible o no disponible');
        }
      } catch (err) {
        console.log('[WebCameraView] Camera access error:', err);
        if (isMounted) setErrorMsg('Permiso de cámara denegado');
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  if (Platform.OS === 'web') {
    return (
      <View style={[{ backgroundColor: '#0A0103', overflow: 'hidden', justifyContent: 'center', alignItems: 'center', position: 'relative' }, style]}>
        {errorMsg ? (
          <View style={{ padding: 16, alignItems: 'center' }}>
            <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" style={{ marginBottom: 8 }}>
              <Circle cx={12} cy={12} r={10} stroke={colors.burgundy} strokeWidth={2} />
              <Path d="M12 8V12M12 16H12.01" stroke={colors.burgundy} strokeWidth={2} strokeLinecap="round" />
            </Svg>
            <Text style={{ color: '#fff', textAlign: 'center', fontSize: 13, fontFamily: fonts.medium }}>
              {errorMsg}
            </Text>
          </View>
        ) : (
          React.createElement('video', {
            ref: videoRef,
            autoPlay: true,
            playsInline: true,
            muted: true,
            style: { width: '100%', height: '100%', objectFit: 'cover' },
          })
        )}

        <View style={styles.cameraLiveOverlay}>
          <View style={styles.cameraLiveDot} />
          <Text style={styles.cameraLiveText}>EN VIVO</Text>
        </View>
        {children}
      </View>
    );
  }

  return (
    <View style={[{ backgroundColor: '#0A0103', overflow: 'hidden', justifyContent: 'center', alignItems: 'center', position: 'relative' }, style]}>
      <Text style={{ color: '#fff', textAlign: 'center', fontSize: 13, fontFamily: fonts.medium }}>
        Transmisión en Vivo activa
      </Text>
      <View style={styles.cameraLiveOverlay}>
        <View style={styles.cameraLiveDot} />
        <Text style={styles.cameraLiveText}>EN VIVO</Text>
      </View>
      {children}
    </View>
  );
}

function LiveBadge({ style, onPress }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.95,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.10,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.delay(450),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  return (
    <Animated.View style={[{ transform: [{ scale: pulseAnim }], position: 'absolute', zIndex: 10 }, style]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.liveBadge,
          { position: 'relative', left: 0, top: 0 },
          pressed ? { opacity: 0.8 } : null,
        ]}
      >
        <LiveIcon />
        <Text style={styles.liveText}>EN VIVO</Text>
      </Pressable>
    </Animated.View>
  );
}

function BidHistoryItem({ amount, bidder, time, isLast }) {
  return (
    <View style={[styles.bidHistoryItem, isLast && { marginBottom: 0 }]}>
      <View style={styles.bidMarker} />
      <View style={styles.bidCopy}>
        <Text numberOfLines={1} style={styles.bidUser}>
          <Text style={styles.bidUserName}>{bidder}</Text> pujó
        </Text>
        <Text numberOfLines={1} style={styles.bidAmount}>
          {amount} {time}
        </Text>
      </View>
    </View>
  );
}

function DescriptionItem({ detail, title }) {
  return (
    <View style={styles.descriptionItem}>
      <View style={styles.bulletDot} />
      <Text style={styles.descriptionItemText}>
        <Text style={styles.descriptionItemTitle}>{title}</Text>
        {'\n'}
        {detail}
      </Text>
    </View>
  );
}

export default function AuctionProductScreen({ product, subastaId }) {
  const { width } = useWindowDimensions();
  const [subastaDetails, setSubastaDetails] = useState(null);
  const [productDetails, setProductDetails] = useState(null);
  const [sellerInfo, setSellerInfo] = useState(null);
  const [bidsList, setBidsList] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const [currentPriceStr, setCurrentPriceStr] = useState('');
  const [minBidVal, setMinBidVal] = useState(0);
  const [isBidding, setIsBidding] = useState(false);
  const [bidIncrement, setBidIncrement] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [startIndex, setStartIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(null);
  const [showLiveCameraModal, setShowLiveCameraModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;
  const swapAnim = useRef(new Animated.Value(0)).current;
  const cameraBidFadeAnim = useRef(new Animated.Value(0)).current;
  const cameraBidSlideAnim = useRef(new Animated.Value(15)).current;
  const newBidPushAnim = useRef(new Animated.Value(1)).current;
  const [latestCameraBid, setLatestCameraBid] = useState(null);

  const currentUserId = getUserId();
  const currency = subastaDetails?.moneda || product.moneda || 'USD';

  // Format price helper
  const formatPrice = (amount, curr) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '';
    const formatted = Number(amount).toLocaleString('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return `$ ${formatted}`;
  };

  // 10-second interval to tick relative times (hace X min)
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial data
  useEffect(() => {
    if (!subastaId || !product) return;

    let active = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        // 1. Fetch subasta details
        const subRes = await getAuctionDetails(subastaId);
        if (!active) return;
        setSubastaDetails(subRes);

        // 2. Fetch seller details
        if (product.vendedor ?? product.idVendedor) {
          apiFetch(`/v1/perfil/vendedor/${product.vendedor ?? product.idVendedor}`)
            .then((seller) => {
              if (active) setSellerInfo(seller);
            })
            .catch((err) => console.log('Error loading seller info:', err));
        }

        // 3. Fetch product details
        const idProd = product.idProducto ?? product.producto;
        if (idProd) {
          apiFetch(`/v1/productos/${idProd}`)
            .then((prod) => {
              if (active) setProductDetails(prod);
            })
            .catch((err) => console.log('Error loading product details:', err));
        }

        // 4. Fetch bid history
        const bidsRes = await apiFetch(`/v1/subastas/${subastaId}/items/${product.identificador}/pujas?pagina=1&cantidad=50`);
        if (!active) return;
        const fetchedBids = Array.isArray(bidsRes) ? bidsRes : bidsRes?.datos ?? [];
        // Sort newest first
        setBidsList([...fetchedBids].reverse());

        // 5. Fetch active item
        const activeItemData = await getActiveItem(subastaId);
        if (!active) return;
        setActiveItem(activeItemData);

        // Set active item prices
        const isCurrentActive = activeItemData && Number(activeItemData.idItem ?? activeItemData.id_item) === Number(product.identificador);
        if (isCurrentActive) {
          setCurrentPriceStr(activeItemData.mejorOferta ?? activeItemData.mejor_oferta ?? product.precioBase);
          setMinBidVal(Number(activeItemData.pujaMinima ?? activeItemData.puja_minima));
        } else {
          setCurrentPriceStr(product.precioBase);
          setMinBidVal(Number(product.precioBase));
        }
      } catch (err) {
        console.log('Error loading product auction details:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [subastaId, product]);

  // WebSocket connection for real-time bids
  useEffect(() => {
    if (!subastaId || subastaDetails?.estado !== 'abierta') {
      return;
    }

    let active = true;

    const wsBase = API_BASE_URL.replace(/^http/, 'ws');
    const token = getAccessToken();
    const wsUrl = `${wsBase}/v1/ws/subastas/${subastaId}${token ? `?token=${token}` : ''}`;
    
    console.log('[Product Details] Connecting to WS:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.evento === 'nuevaPuja') {
          const datos = message.datos;
          const datosIdItem = datos.idItem ?? datos.id_item;
          
          if (Number(datosIdItem) === Number(product.identificador)) {
            if (active) {
              const cleanNumericPrice = (val) => {
                if (typeof val === 'number') return val;
                if (!val) return 0;
                const cleaned = String(val).replace(/[^0-9.-]/g, '');
                return parseFloat(cleaned) || 0;
              };

              const previousPrice = cleanNumericPrice(currentPriceStr) || cleanNumericPrice(product.precioBase);
              const newPrice = cleanNumericPrice(datos.importe);
              const diff = newPrice > previousPrice ? (newPrice - previousPrice) : cleanNumericPrice(datos.incremento ?? datos.pujaMinima ?? 0);
              
              setCurrentPriceStr(String(newPrice));
              setMinBidVal(Number(datos.pujaMinima ?? datos.puja_minima));
              
              // Add bid to history list at the top
              const newBidEntry = {
                identificador: datos.idPuja ?? Date.now(),
                idCliente: datos.idCliente ?? datos.id_cliente,
                nombreUsuario: datos.nombreUsuario ?? datos.nombre_usuario ?? 'Comprador',
                importe: datos.importe,
                realizadaEn: new Date().toISOString(),
              };
              setBidsList((current) => [newBidEntry, ...current]);
              
              // Trigger push animation for stack layout
              LayoutAnimation.configureNext({
                duration: 400,
                create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
                update: { type: LayoutAnimation.Types.spring, springDamping: 0.75 },
              });
              newBidPushAnim.setValue(0);
              Animated.spring(newBidPushAnim, {
                toValue: 1,
                friction: 6,
                tension: 70,
                useNativeDriver: true,
              }).start();

              // Trigger animation with the exact increment added
              setBidIncrement(formatPrice(diff));
              
              fadeAnim.setValue(0);
              slideAnim.setValue(15);
              Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
              ]).start(() => {
                setTimeout(() => {
                  Animated.parallel([
                    Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
                    Animated.timing(slideAnim, { toValue: 15, duration: 400, useNativeDriver: true }),
                  ]).start();
                }, 1200);
              });

              // Trigger camera notification animation
              const bidderName = datos.nombreUsuario ?? datos.nombre_usuario ?? 'Comprador';
              const bidAmountFormatted = formatPrice(datos.importe, currency);
              setLatestCameraBid({ bidder: bidderName, amount: bidAmountFormatted });

              cameraBidFadeAnim.setValue(0);
              cameraBidSlideAnim.setValue(15);
              Animated.parallel([
                Animated.timing(cameraBidFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(cameraBidSlideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
              ]).start(() => {
                setTimeout(() => {
                  Animated.parallel([
                    Animated.timing(cameraBidFadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
                    Animated.timing(cameraBidSlideAnim, { toValue: 15, duration: 300, useNativeDriver: true }),
                  ]).start();
                }, 1000);
              });
            }
          }
        }
      } catch (err) {
        console.log('[Product Details] Error parsing WS message:', err);
      }
    };

    return () => {
      active = false;
      ws.close();
    };
  }, [subastaId, subastaDetails, currentPriceStr]);

  // Format relative time helper
  const formatRelativeTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
    if (seconds < 60) return 'hace segundos';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return `hace ${days} d`;
  };

  // Calculate highest bid of current user
  const userBids = bidsList.filter((bid) => Number(bid.idCliente) === Number(currentUserId));
  const myHighestBid = userBids.length > 0
    ? Math.max(...userBids.map((b) => Number(b.importe)))
    : 0;

  // Determine user category and payment verification for bidding permission
  const [userCategory, setUserCategory] = useState('comun');
  const [hasVerifiedPaymentMethod, setHasVerifiedPaymentMethod] = useState(null);

  useEffect(() => {
    if (!getAccessToken()) return;
    getProfile()
      .then((data) => {
        if (data?.categoria) {
          setUserCategory(data.categoria);
        }
      })
      .catch((err) => console.log('Error fetching user category for bid check:', err));
  }, []);

  const isLoggedIn = Boolean(getAccessToken());

  useEffect(() => {
    if (!isLoggedIn) {
      setHasVerifiedPaymentMethod(false);
      return;
    }
    apiFetch('/v1/medios-de-pago?pagina=1&cantidad=20')
      .then((methods) => {
        const itemsList = Array.isArray(methods) ? methods : (methods?.datos ?? methods?.items ?? []);
        const valid = itemsList.some(
          (m) =>
            (m.activo === 'si' || m.activo === true) &&
            (m.verificado === 'si' || m.verificado === true) &&
            (m.moneda === currency)
        );
        setHasVerifiedPaymentMethod(valid);
      })
      .catch((err) => {
        console.log('Error checking verified payment methods:', err);
        setHasVerifiedPaymentMethod(false);
      });
  }, [isLoggedIn, currency]);

  // Determine if currently being subastado and subasta is active
  const isAuctionActive = subastaDetails?.estado === 'abierta';
  const isBeingSubastado = isAuctionActive && Boolean(activeItem) && Number(activeItem.idItem ?? activeItem.id_item) === Number(product.identificador);
  const isFinished = product.subastado === 'si';

  const productStateRaw = String(productDetails?.estado || product?.estado || productDetails?.condicion || product?.condicion || 'usado').toLowerCase();
  const isNuevo = productStateRaw === 'nuevo';
  const productStateLabel = isNuevo ? 'NUEVO' : 'USADO';

  const bidPermission = checkCanBid({
    isLoggedIn,
    userCategory,
    auctionCategory: subastaDetails?.categoria,
    hasVerifiedPaymentMethod,
  });

  const cleanNumericPrice = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const str = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  // Handle Bid with specific increment option
  const isBiddingRef = useRef(false);
  const handleBidWithIncrement = async (inc) => {
    if (!isBeingSubastado || isBiddingRef.current) return;

    if (!bidPermission.canBid) {
      if (!isLoggedIn) {
        alert('Debés iniciar sesión para poder pujar.');
      } else if (getCategoryRank(userCategory) < getCategoryRank(subastaDetails?.categoria)) {
        const userCatStr = (userCategory || 'comun').toUpperCase();
        const auctionCatStr = (subastaDetails?.categoria || 'comun').toUpperCase();
        alert(`Tu categoría (${userCatStr}) es menor a la requerida para esta subasta (${auctionCatStr}).`);
      } else if (hasVerifiedPaymentMethod === false) {
        alert(`No tenés un medio de pago verificado y activo en ${currency} registrado. Por favor, agregalo en tu Perfil.`);
      }
      return;
    }

    try {
      isBiddingRef.current = true;

      // 1. Get payment methods to find an active one in the correct currency
      const methods = await apiFetch('/v1/medios-de-pago?pagina=1&cantidad=20');
      const itemsList = Array.isArray(methods) ? methods : (methods?.datos ?? methods?.items ?? []);
      const validMethod = itemsList.find(
        (m) =>
          (m.activo === 'si' || m.activo === true) &&
          (m.verificado === 'si' || m.verificado === true) &&
          m.moneda === currency
      );

      if (!validMethod) {
        alert(`No tenés un medio de pago verificado y activo en ${currency} registrado. Por favor, agregalo en tu Perfil.`);
        return;
      }

      // Calculate total bid target price
      const currentVal = cleanNumericPrice(currentPriceStr) || Number(product.precioBase);
      const newBidTotal = currentVal + inc;

      // 2. Perform the bid
      await apiFetch(`/v1/subastas/${subastaId}/items/${product.identificador}/pujas`, {
        method: 'POST',
        body: {
          importe: Number(newBidTotal),
          idMedioDePago: validMethod.identificador,
        },
      });
    } catch (err) {
      console.log('Error creating bid:', err);
      alert(err.message || 'No se pudo realizar la puja.');
    } finally {
      isBiddingRef.current = false;
    }
  };

  // Render 4 mini bid buttons (+1%, +5%, +10%, +20%)
  const renderBidOptions = () => {
    const baseVal = Number(product.precioBase || productDetails?.precioBase || 0);
    const inc1 = Math.max(1, Math.round(baseVal * 0.01));
    const inc2 = Math.max(inc1 + 1, Math.round(baseVal * 0.05));
    const inc3 = Math.max(inc2 + 1, Math.round(baseVal * 0.10));
    const inc4 = Math.max(inc3 + 1, Math.round(baseVal * 0.20));

    const options = [inc1, inc2, inc3, inc4];
    const isDisabled = !isBeingSubastado || !bidPermission.canBid;

    return (
      <View style={styles.bidButtonsContainer}>
        <View style={styles.bidButtonsRow}>
          {options.map((inc, index) => {
            const formattedInc = new Intl.NumberFormat('es-AR').format(inc);
            const label = `+ $ ${formattedInc}`;

            return (
              <Pressable
                key={index}
                accessibilityRole="button"
                disabled={isDisabled}
                onPress={() => handleBidWithIncrement(inc)}
                style={[
                  styles.miniBidButton,
                  isDisabled ? styles.miniBidButtonDisabled : null,
                ]}
              >
                <Text numberOfLines={1} style={styles.miniBidButtonText}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {!bidPermission.canBid && isBeingSubastado ? (
          <Text style={styles.bidNoticeText}>{bidPermission.buttonText}</Text>
        ) : null}
      </View>
    );
  };

  // UI photo mapping
  const photosList = productDetails?.fotos ?? product?.fotos ?? [];

  const getPhotoSource = (index) => {
    if (photosList.length > index) {
      const path = photosList[index].foto ?? photosList[index].rutaArchivo ?? photosList[index].ruta_archivo;
      if (path) {
        return { uri: resolveApiAssetUrl(path) };
      }
    }
    return null;
  };

  const getSellerLocation = () => {
    if (!sellerInfo) return 'Ubicación a confirmar';
    const city = sellerInfo.region || sellerInfo.ciudad;
    const country = sellerInfo.pais?.nombre || 'Argentina';
    if (city) {
      return `${city} - ${country}`;
    }
    return country;
  };

  const handlePrevPhoto = () => {
    if (startIndex <= 0 || isAnimating) return;

    setIsAnimating('prev');
    swapAnim.setValue(0);
    Animated.timing(swapAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: false,
    }).start(() => {
      setStartIndex(prev => prev - 1);
      setIsAnimating(null);
      swapAnim.setValue(0);
    });
  };

  const handleNextPhoto = () => {
    if (startIndex >= photosList.length - 3 || isAnimating) return;

    setIsAnimating('next');
    swapAnim.setValue(0);
    Animated.timing(swapAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: false,
    }).start(() => {
      setStartIndex(prev => prev + 1);
      setIsAnimating(null);
      swapAnim.setValue(0);
    });
  };

  const horizontalPadding = width < 360 ? 15 : 16;
  const contentWidth = Math.min(width - horizontalPadding * 2, 370);
  const scale = contentWidth / 370;
  const mediaLeftPadding = Math.max(12, 18 * scale);
  const mediaRightPadding = Math.max(10, 14 * scale);
  const mediaGap = Math.max(8, 11 * scale);
  const mainImageSize = 202 * scale;
  const thumbnailWidth = 125 * scale;
  const thumbnailHeight = 95 * scale;
  const thumbnailGap = Math.max(7, 9 * scale);
  const imageRadius = 5;

  const slot1 = { x: mediaLeftPadding, y: 0, w: mainImageSize, h: mainImageSize };
  const slot2 = { x: mediaLeftPadding + mainImageSize + mediaGap, y: 0, w: thumbnailWidth, h: thumbnailHeight };
  const slot3 = { x: mediaLeftPadding + mainImageSize + mediaGap, y: thumbnailHeight + thumbnailGap, w: thumbnailWidth, h: thumbnailHeight };

  const renderGallery = () => {
    if (isAnimating === 'next') {
      const img1Src = getPhotoSource(startIndex);
      const img2Src = getPhotoSource(startIndex + 1);
      const img3Src = getPhotoSource(startIndex + 2);
      const img4Src = getPhotoSource(startIndex + 3);

      return (
        <>
          {img1Src && (
            <Animated.Image
              key={photosList[startIndex]?.foto ?? `img_${startIndex}`}
              source={img1Src}
              style={[
                styles.mainImage,
                {
                  borderRadius: imageRadius,
                  position: 'absolute',
                  left: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [slot1.x, -slot1.w] }),
                  top: slot1.y,
                  width: slot1.w,
                  height: slot1.h,
                  opacity: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                },
              ]}
            />
          )}
          {img2Src && (
            <Animated.Image
              key={photosList[startIndex + 1]?.foto ?? `img_${startIndex + 1}`}
              source={img2Src}
              style={[
                styles.mainImage,
                {
                  borderRadius: imageRadius,
                  position: 'absolute',
                  left: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [slot2.x, slot1.x] }),
                  top: slot1.y,
                  width: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [slot2.w, slot1.w] }),
                  height: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [slot2.h, slot1.h] }),
                },
              ]}
            />
          )}
          {img3Src && (
            <Animated.Image
              key={photosList[startIndex + 2]?.foto ?? `img_${startIndex + 2}`}
              source={img3Src}
              style={[
                styles.thumbnailImage,
                {
                  borderRadius: imageRadius,
                  position: 'absolute',
                  left: slot2.x,
                  top: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [slot3.y, slot2.y] }),
                  width: slot2.w,
                  height: slot2.h,
                },
              ]}
            />
          )}
          {img4Src && (
            <Animated.Image
              key={photosList[startIndex + 3]?.foto ?? `img_${startIndex + 3}`}
              source={img4Src}
              style={[
                styles.thumbnailImage,
                {
                  borderRadius: imageRadius,
                  position: 'absolute',
                  left: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [width, slot3.x] }),
                  top: slot3.y,
                  width: slot3.w,
                  height: slot3.h,
                  opacity: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
                },
              ]}
            />
          )}
        </>
      );
    }

    if (isAnimating === 'prev') {
      const img0Src = getPhotoSource(startIndex - 1);
      const img1Src = getPhotoSource(startIndex);
      const img2Src = getPhotoSource(startIndex + 1);
      const img3Src = getPhotoSource(startIndex + 2);

      return (
        <>
          {img0Src && (
            <Animated.Image
              key={photosList[startIndex - 1]?.foto ?? `img_${startIndex - 1}`}
              source={img0Src}
              style={[
                styles.mainImage,
                {
                  borderRadius: imageRadius,
                  position: 'absolute',
                  left: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [-slot1.w, slot1.x] }),
                  top: slot1.y,
                  width: slot1.w,
                  height: slot1.h,
                  opacity: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
                },
              ]}
            />
          )}
          {img1Src && (
            <Animated.Image
              key={photosList[startIndex]?.foto ?? `img_${startIndex}`}
              source={img1Src}
              style={[
                styles.thumbnailImage,
                {
                  borderRadius: imageRadius,
                  position: 'absolute',
                  left: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [slot1.x, slot2.x] }),
                  top: slot1.y,
                  width: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [slot1.w, slot2.w] }),
                  height: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [slot1.h, slot2.h] }),
                },
              ]}
            />
          )}
          {img2Src && (
            <Animated.Image
              key={photosList[startIndex + 1]?.foto ?? `img_${startIndex + 1}`}
              source={img2Src}
              style={[
                styles.thumbnailImage,
                {
                  borderRadius: imageRadius,
                  position: 'absolute',
                  left: slot2.x,
                  top: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [slot2.y, slot3.y] }),
                  width: slot2.w,
                  height: slot2.h,
                },
              ]}
            />
          )}
          {img3Src && (
            <Animated.Image
              key={photosList[startIndex + 2]?.foto ?? `img_${startIndex + 2}`}
              source={img3Src}
              style={[
                styles.thumbnailImage,
                {
                  borderRadius: imageRadius,
                  position: 'absolute',
                  left: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [slot3.x, width] }),
                  top: slot3.y,
                  width: slot3.w,
                  height: slot3.h,
                  opacity: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                },
              ]}
            />
          )}
        </>
      );
    }

    const img1Src = getPhotoSource(startIndex);
    const img2Src = getPhotoSource(startIndex + 1);
    const img3Src = getPhotoSource(startIndex + 2);

    return (
      <>
        {img1Src ? (
          <Animated.Image
            key={photosList[startIndex]?.foto ?? `img_${startIndex}`}
            source={img1Src}
            style={[
              styles.mainImage,
              {
                borderRadius: imageRadius,
                position: 'absolute',
                left: slot1.x,
                top: slot1.y,
                width: slot1.w,
                height: slot1.h,
              },
            ]}
          />
        ) : (
          <View
            style={[
              styles.mainImage,
              {
                borderRadius: imageRadius,
                position: 'absolute',
                left: slot1.x,
                top: slot1.y,
                height: slot1.h,
                width: slot1.w,
                backgroundColor: '#D6888F',
                borderColor: '#C2747B',
                borderWidth: 1,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 12,
              },
            ]}
          >
            <Text style={{ fontFamily: fonts.bold, color: '#6B232D', fontSize: 13, textAlign: 'center' }}>
              Foto no disponible
            </Text>
          </View>
        )}

        {img2Src ? (
          <Animated.Image
            key={photosList[startIndex + 1]?.foto ?? `img_${startIndex + 1}`}
            source={img2Src}
            style={[
              styles.thumbnailImage,
              {
                borderRadius: imageRadius,
                position: 'absolute',
                left: slot2.x,
                top: slot2.y,
                width: slot2.w,
                height: slot2.h,
              },
            ]}
          />
        ) : (
          <View
            style={[
              styles.thumbnailImage,
              {
                borderRadius: imageRadius,
                position: 'absolute',
                left: slot2.x,
                top: slot2.y,
                width: slot2.w,
                height: slot2.h,
                backgroundColor: '#D6888F',
                borderColor: '#C2747B',
                borderWidth: 1,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 4,
              },
            ]}
          >
            <Text style={{ fontFamily: fonts.bold, color: '#6B232D', fontSize: 9, textAlign: 'center', lineHeight: 11 }}>
              Foto no disponible
            </Text>
          </View>
        )}

        {img3Src ? (
          <Animated.Image
            key={photosList[startIndex + 2]?.foto ?? `img_${startIndex + 2}`}
            source={img3Src}
            style={[
              styles.thumbnailImage,
              {
                borderRadius: imageRadius,
                position: 'absolute',
                left: slot3.x,
                top: slot3.y,
                width: slot3.w,
                height: slot3.h,
              },
            ]}
          />
        ) : (
          <View
            style={[
              styles.thumbnailImage,
              {
                borderRadius: imageRadius,
                position: 'absolute',
                left: slot3.x,
                top: slot3.y,
                width: slot3.w,
                height: slot3.h,
                backgroundColor: '#D6888F',
                borderColor: '#C2747B',
                borderWidth: 1,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 4,
              },
            ]}
          >
            <Text style={{ fontFamily: fonts.bold, color: '#6B232D', fontSize: 9, textAlign: 'center', lineHeight: 11 }}>
              Foto no disponible
            </Text>
          </View>
        )}
        {isFinished ? (
          <SubastadoStamp
            style={{
              position: 'absolute',
              left: slot1.x,
              top: slot1.y,
              width: slot1.w,
              height: slot1.h,
              borderRadius: imageRadius,
            }}
          />
        ) : null}
      </>
    );
  };

  const title = product.descripcionCatalogo
    ? `${product.nombre || product.titulo} - ${product.descripcionCatalogo}`
    : (product.nombre || product.titulo);

  if (isLoading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400 }]}>
        <ActivityIndicator color={colors.burgundy} size="large" />
      </View>
    );
  }

  // Slice last 3 bids for display
  const visibleBids = bidsList.slice(0, 3);

  return (
    <View style={[styles.screen, { paddingHorizontal: horizontalPadding }]}>
      <View style={[styles.content, { maxWidth: contentWidth }]}>
        <View style={styles.hero}>
          {isBeingSubastado ? (
            <LiveBadge
              onPress={() => setShowLiveCameraModal(true)}
              style={{
                left: Math.max(8, 11 * scale),
                top: Math.max(3, 5 * scale),
              }}
            />
          ) : null}

          <View
            style={{
              height: mainImageSize,
              width: '100%',
              marginTop: Math.max(15, 17 * scale),
              position: 'relative',
            }}
          >
            {renderGallery()}
          </View>

          {/* Left Arrow Button */}
          {photosList.length > 3 && startIndex > 0 ? (
            <Pressable
              onPress={handlePrevPhoto}
              style={[styles.arrowButton, { left: 4 }]}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="M15 19L8 12L15 5" stroke={colors.white} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
          ) : null}

          {/* Right Arrow Button */}
          {photosList.length > 3 && startIndex < photosList.length - 3 ? (
            <Pressable
              onPress={handleNextPhoto}
              style={[styles.arrowButton, { right: 2 }]}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="M9 5L16 12L9 19" stroke={colors.white} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.title}>{title}</Text>

        {!isBeingSubastado ? (
          <View style={styles.priceBelowTitleRow}>
            {isFinished ? (
              <Text style={[styles.priceLeft, { color: colors.burgundy }]}>
                {formatPrice(product.precioFinal ?? currentPriceStr)}
              </Text>
            ) : isLoggedIn ? (
              <Text style={styles.priceLeft}>
                {formatPrice(product.precioBase)}
              </Text>
            ) : null}
            <View style={[styles.conditionBadge, isNuevo ? styles.conditionBadgeNuevo : styles.conditionBadgeUsado]}>
              <Text style={[styles.conditionBadgeText, isNuevo ? styles.conditionBadgeTextNuevo : styles.conditionBadgeTextUsado]}>
                {productStateLabel}
              </Text>
            </View>
          </View>
        ) : null}

        {isBeingSubastado ? (
          <View style={styles.infoGrid}>
            <View style={[styles.infoPanel, styles.pricePanel]}>
              <Text style={styles.priceLabel}>Precio actual:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', position: 'relative' }}>
                <Text style={styles.priceValue}>
                  {formatPrice(currentPriceStr)}
                </Text>
                
                <Animated.Text
                  style={[
                    styles.priceDeltaAnimated,
                    {
                      opacity: fadeAnim,
                      transform: [{ translateY: slideAnim }],
                    },
                  ]}
                >
                  ↑ {bidIncrement}
                </Animated.Text>
              </View>

              <View style={styles.priceDivider} />

              <Text style={styles.secondaryLabel}>Puja mínima</Text>
              <Text style={styles.secondaryValue}>{formatPrice(minBidVal)}</Text>

              <Text style={[styles.secondaryLabel, styles.highestLabel]}>
                Tu puja más alta
              </Text>
              <Text style={styles.secondaryValue}>
                {myHighestBid > 0 ? formatPrice(myHighestBid) : 'Ninguna'}
              </Text>
            </View>

            <View style={[styles.infoPanel, styles.historyPanel]}>
              {visibleBids.length > 0 ? (
                visibleBids.map((bid, index) => {
                  const isNewest = index === 0;
                  return (
                    <Animated.View
                      key={String(bid.identificador)}
                      style={
                        isNewest
                          ? {
                              opacity: newBidPushAnim,
                              transform: [
                                {
                                  translateY: newBidPushAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-20, 0],
                                  }),
                                },
                                {
                                  scale: newBidPushAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.92, 1],
                                  }),
                                },
                              ],
                            }
                          : null
                      }
                    >
                      <BidHistoryItem
                        amount={formatPrice(bid.importe)}
                        bidder={bid.nombreUsuario || bid.nombre_usuario || 'Comprador'}
                        time={formatRelativeTime(bid.realizadaEn)}
                        isLast={index === visibleBids.length - 1}
                      />
                    </Animated.View>
                  );
                })
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: palette.text, opacity: 0.6 }}>
                    Sin pujas aún
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : null}

        {isBeingSubastado ? renderBidOptions() : null}

        <View style={styles.sellerRow}>
          {sellerInfo?.url_foto_perfil ? (
            <Image
              resizeMode="cover"
              source={{ uri: resolveApiAssetUrl(sellerInfo.url_foto_perfil) }}
              style={styles.sellerAvatar}
            />
          ) : (
            <View style={[styles.sellerAvatar, { backgroundColor: colors.cardBlush, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontFamily: fonts.bold, color: colors.burgundy, fontSize: 18 }}>
                {sellerInfo?.nombre?.charAt(0)?.toUpperCase() || 'S'}
              </Text>
            </View>
          )}

          <View style={styles.sellerCopy}>
            <Text style={styles.sellerText}>
              Publicado por{' '}
              <Text style={styles.sellerName}>{sellerInfo?.nombre_usuario || sellerInfo?.nombre || 'Subastador'}</Text>
            </Text>
            <Text style={styles.sellerText}>{getSellerLocation()}</Text>
          </View>
        </View>

        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionHeading}>Descripción del producto</Text>
          <Text style={styles.descriptionBody}>
            {productDetails?.descripcionCompleta ?? productDetails?.descripcion_completa ?? 'No hay descripción disponible para este producto.'}
          </Text>

          <View style={styles.descriptionDivider} />

          <DescriptionItem
            detail={productDetails?.estado === 'nuevo' ? 'Completamente nuevo, sin uso anterior.' : 'En buen estado, usado previamente.'}
            title={`Estado del artículo: ${productDetails?.estado || 'usado'}`}
          />
        </View>
      </View>

      {/* Live Stream Camera Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showLiveCameraModal}
        onRequestClose={() => setShowLiveCameraModal(false)}
      >
        <View style={styles.cameraModalOverlay}>
          <View style={styles.cameraModalCard}>
            {/* Modal Header */}
            <View style={styles.cameraModalHeader}>
              <View style={styles.cameraModalHeaderTitleRow}>
                <LiveIcon />
                <Text style={styles.cameraModalTitle}>TRANSMISIÓN EN VIVO</Text>
              </View>
              <Pressable
                onPress={() => setShowLiveCameraModal(false)}
                style={styles.cameraModalCloseBtn}
              >
                <Text style={styles.cameraModalCloseText}>✕</Text>
              </Pressable>
            </View>

            {/* Camera View Box */}
            <WebCameraView style={styles.cameraFrame}>
              {latestCameraBid && (
                <Animated.View
                  style={[
                    styles.cameraBidNotification,
                    {
                      opacity: cameraBidFadeAnim,
                      transform: [{ translateY: cameraBidSlideAnim }],
                    },
                  ]}
                >
                  <Text style={styles.cameraBidNotificationText}>
                    <Text style={{ fontFamily: fonts.bold }}>{latestCameraBid.bidder}</Text>
                    {' pujó '}
                    <Text style={{ fontFamily: fonts.bold, color: '#3FA54B' }}>{latestCameraBid.amount}</Text>
                  </Text>
                </Animated.View>
              )}
            </WebCameraView>

            {isBeingSubastado ? renderBidOptions() : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  arrowButton: {
    alignItems: 'center',
    backgroundColor: colors.burgundy,
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    position: 'absolute',
    top: '55%',
    transform: [{ translateY: -19 }],
    width: 38,
    zIndex: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  screen: {
    alignItems: 'center',
    paddingTop: 12,
    zIndex: 2,
  },
  content: {
    width: '100%',
  },
  hero: {
    position: 'relative',
    width: '100%',
  },
  liveBadge: {
    alignItems: 'center',
    backgroundColor: colors.burgundy,
    borderRadius: 5,
    columnGap: 2,
    flexDirection: 'row',
    height: 23,
    justifyContent: 'center',
    paddingHorizontal: 5,
    position: 'absolute',
    width: 83,
    zIndex: 2,
  },
  liveText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: 14,
  },
  mediaRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    width: '100%',
  },
  mainImage: {
    backgroundColor: palette.card,
  },
  thumbnailColumn: {
    flexShrink: 0,
  },
  thumbnailImage: {
    backgroundColor: palette.card,
  },
  title: {
    color: palette.text,
    fontFamily: fonts.bold,
    fontSize: 20,
    letterSpacing: 0,
    lineHeight: 25,
    marginTop: 12,
    paddingHorizontal: 18,
    width: '100%',
  },
  priceBelowTitleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 18,
    width: '100%',
  },
  priceLeft: {
    color: colors.statusGreenBorder,
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: 0,
    lineHeight: 26,
    textAlign: 'left',
  },
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conditionBadgeNuevo: {
    backgroundColor: 'rgba(92, 176, 74, 0.15)',
    borderColor: '#498E3C',
  },
  conditionBadgeUsado: {
    backgroundColor: 'rgba(224, 102, 28, 0.15)',
    borderColor: '#E0661C',
  },
  conditionBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  conditionBadgeTextNuevo: {
    color: '#2E6B23',
  },
  conditionBadgeTextUsado: {
    color: '#D35400',
  },
  infoGrid: {
    columnGap: 6,
    flexDirection: 'row',
    marginTop: 14,
    minHeight: 175,
    paddingHorizontal: 8,
    width: '100%',
  },
  infoPanel: {
    backgroundColor: palette.card,
    borderRadius: 5,
    minHeight: 175,
  },
  pricePanel: {
    flex: 200,
    paddingBottom: 12,
    paddingHorizontal: 11,
    paddingTop: 10,
  },
  historyPanel: {
    flex: 150,
    justifyContent: 'center',
    paddingBottom: 14,
    paddingLeft: 12,
    paddingRight: 8,
    paddingTop: 17,
  },
  priceLabel: {
    color: palette.text,
    fontFamily: fonts.regular,
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 21,
  },
  priceValue: {
    color: palette.text,
    fontFamily: fonts.bold,
    fontSize: 20,
    letterSpacing: 0,
    lineHeight: 25,
  },
  priceDeltaAnimated: {
    color: palette.green,
    fontFamily: fonts.bold,
    fontSize: 12,
    marginLeft: 4,
  },
  priceDivider: {
    backgroundColor: palette.divider,
    height: 1,
    marginBottom: 9,
    marginTop: 5,
    width: '100%',
  },
  secondaryLabel: {
    color: palette.text,
    fontFamily: fonts.regular,
    fontSize: 14,
    letterSpacing: 0,
    lineHeight: 18,
  },
  secondaryValue: {
    color: palette.text,
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 19,
  },
  highestLabel: {
    marginTop: 8,
  },
  bidHistoryItem: {
    alignItems: 'flex-start',
    columnGap: 7,
    flexDirection: 'row',
    marginBottom: 14,
  },
  bidMarker: {
    backgroundColor: colors.burgundy,
    borderRadius: 999,
    height: 36,
    marginTop: 1,
    width: 3,
  },
  bidCopy: {
    flex: 1,
    minWidth: 0,
  },
  bidUser: {
    color: palette.text,
    fontFamily: fonts.regular,
    fontSize: 13,
    letterSpacing: 0,
    lineHeight: 17,
  },
  bidUserName: {
    fontFamily: fonts.bold,
  },
  bidAmount: {
    color: palette.text,
    fontFamily: fonts.regular,
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: 16,
  },
  bidButtonsContainer: {
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 16,
    width: '90.8%',
  },
  bidButtonsRow: {
    columnGap: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  miniBidButton: {
    alignItems: 'center',
    backgroundColor: colors.burgundy,
    borderRadius: 8,
    flex: 1,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  miniBidButtonDisabled: {
    backgroundColor: '#8C7B7E',
    opacity: 0.6,
  },
  miniBidButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  miniBidButtonText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 0,
    textAlign: 'center',
  },
  bidNoticeText: {
    color: colors.burgundy,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    letterSpacing: 0,
    marginTop: 8,
    textAlign: 'center',
  },
  bidButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.burgundy,
    borderRadius: 5,
    height: 51,
    justifyContent: 'center',
    marginTop: 16,
    width: '90.8%',
  },
  bidButtonDisabled: {
    backgroundColor: '#8C7B7E',
    opacity: 0.75,
  },
  bidButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.995 }],
  },
  bidButtonText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 20,
  },
  sellerRow: {
    alignItems: 'center',
    columnGap: 11,
    flexDirection: 'row',
    marginTop: 23,
    paddingHorizontal: 20,
    width: '100%',
  },
  sellerAvatar: {
    borderRadius: 999,
    height: 49,
    width: 49,
  },
  sellerCopy: {
    flex: 1,
    minWidth: 0,
  },
  sellerText: {
    color: palette.text,
    fontFamily: fonts.regular,
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 18,
  },
  sellerName: {
    fontFamily: fonts.bold,
  },
  descriptionCard: {
    backgroundColor: palette.card,
    borderRadius: 5,
    marginHorizontal: 11,
    marginTop: 14,
    minHeight: 200,
    paddingBottom: 14,
    paddingHorizontal: 17,
    paddingTop: 14,
  },
  descriptionHeading: {
    color: '#000000',
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 20,
    marginBottom: 6,
  },
  descriptionBody: {
    color: '#000000',
    fontFamily: fonts.regular,
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 20,
  },
  descriptionDivider: {
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    height: 1,
    marginBottom: 14,
    marginTop: 14,
    width: '100%',
  },
  descriptionItem: {
    alignItems: 'flex-start',
    columnGap: 9,
    flexDirection: 'row',
    marginBottom: 11,
  },
  bulletDot: {
    backgroundColor: '#000000',
    borderRadius: 999,
    height: 4,
    marginTop: 8,
    width: 4,
  },
  descriptionItemText: {
    color: '#000000',
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 19,
  },
  descriptionItemTitle: {
    fontFamily: fonts.bold,
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
    color: '#713229',
    right: 16,
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
    color: palette.text,
    fontFamily: fonts.bold,
    fontSize: 11,
    marginBottom: 2,
  },
  modalProductTitleText: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 14,
  },
  modalInternalCard: {
    backgroundColor: '#F6E3D1',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EBD8C6',
    padding: 12,
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
    borderColor: '#DDCCBD',
    borderRadius: 8,
    backgroundColor: '#F5E7DA',
    overflow: 'hidden',

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
    backgroundColor: '#DDCCBD',
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
  cameraModalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  cameraModalCard: {
    backgroundColor: '#FCEBDB',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#F2D3C8',
    padding: 16,
    width: '95%',
    maxWidth: 420,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 12,
  },
  cameraModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cameraModalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    backgroundColor: colors.burgundy,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  cameraModalTitle: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  cameraModalCloseBtn: {
    padding: 4,
  },
  cameraModalCloseText: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 20,
  },
  cameraFrame: {
    height: 240,
    width: '100%',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.burgundy,
    marginBottom: 10,
  },
  cameraLiveOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    backgroundColor: 'rgba(159, 2, 29, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cameraLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#FFF',
  },
  cameraLiveText: {
    color: '#FFF',
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  cameraBidNotification: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    zIndex: 20,
  },
  cameraBidNotificationText: {
    color: '#FFFFFF',
    fontFamily: fonts.regular,
    fontSize: 13,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cameraModalBidBtn: {
    width: '100%',
    marginTop: 12,
  },
});
