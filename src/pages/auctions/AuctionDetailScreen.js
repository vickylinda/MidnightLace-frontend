import { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  getAuctionCatalog,
  getAuctionDetails,
  getActiveItem,
} from '../../services/auctionsApi';
import SubastadoStamp from '../../components/status/SubastadoStamp';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { resolveApiAssetUrl, API_BASE_URL } from '../../utils/config';
import { getAccessToken } from '../../utils/session';
import { apiFetch } from '../../utils/http';

const referenceColors = {
  card: '#F6E3D1',
  text: '#510310',
};

const CATALOG_PAGE_SIZE = 6;

function LocationPinIcon({ size = 31 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 31 31" fill="none">
      <Path
        d="M15.5 3.4C10.8 3.4 7 7.2 7 11.9C7 18.1 15.5 27.6 15.5 27.6C15.5 27.6 24 18.1 24 11.9C24 7.2 20.2 3.4 15.5 3.4ZM15.5 15.1C13.7 15.1 12.3 13.7 12.3 11.9C12.3 10.1 13.7 8.7 15.5 8.7C17.3 8.7 18.7 10.1 18.7 11.9C18.7 13.7 17.3 15.1 15.5 15.1Z"
        fill={colors.burgundy}
      />
    </Svg>
  );
}

function formatPrice(value) {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value ?? '-';
  }

  const formattedAmount = new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);

  return `$ ${formattedAmount}`;
}

function getAuctionStartDate(dateValue, timeValue) {
  if (!dateValue || !timeValue) {
    return null;
  }

  const [year, month, day] = String(dateValue).split('-').map(Number);
  const [hours, minutes, seconds = 0] = String(timeValue)
    .split(':')
    .map(Number);
  const dateParts = [year, month, day, hours, minutes, seconds];

  if (!dateParts.every(Number.isFinite)) {
    return null;
  }

  const startDate = new Date(
    year,
    month - 1,
    day,
    hours,
    minutes,
    seconds
  );

  if (
    startDate.getFullYear() !== year ||
    startDate.getMonth() !== month - 1 ||
    startDate.getDate() !== day ||
    startDate.getHours() !== hours ||
    startDate.getMinutes() !== minutes
  ) {
    return null;
  }

  return startDate;
}

function formatTimeRemaining(dateValue, timeValue, now) {
  const startDate = getAuctionStartDate(dateValue, timeValue);

  if (!startDate) {
    return null;
  }

  const totalMinutes = Math.max(
    0,
    Math.ceil((startDate.getTime() - now) / 60000)
  );
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  return {
    days,
    hours,
    minutes,
  };
}

function getFirstPhotoSource(lot) {
  const firstPhoto = Array.isArray(lot.fotos) ? lot.fotos[0] : null;
  const photoPath =
    typeof firstPhoto === 'string'
      ? firstPhoto
      : firstPhoto?.foto ?? firstPhoto?.url ?? firstPhoto?.uri;

  return photoPath ? { uri: resolveApiAssetUrl(photoPath) } : null;
}

function hasMoreCatalogPages(catalog) {
  const meta = catalog?.meta ?? {};
  const currentPage = Number(meta.pagina ?? meta.page ?? 1);
  const pageSize = Number(
    meta.cantidad ?? meta.pageSize ?? CATALOG_PAGE_SIZE
  );
  const total = Number(meta.total ?? catalog?.total);
  const totalPages = Number(
    meta.total_paginas ?? meta.totalPaginas ?? meta.totalPages
  );

  if (
    Number.isFinite(currentPage) &&
    Number.isFinite(pageSize) &&
    Number.isFinite(total)
  ) {
    return currentPage * pageSize < total;
  }

  if (
    Number.isFinite(currentPage) &&
    Number.isFinite(totalPages) &&
    currentPage < totalPages
  ) {
    return true;
  }

  return (
    Array.isArray(catalog?.items) &&
    catalog.items.length === CATALOG_PAGE_SIZE
  );
}

function formatActiveTimeCard(totalSecs) {
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const pad = (num) => String(num).padStart(2, '0');
  return `${pad(mins)}:${pad(secs)}`;
}

function BiddersAvatarStack({ bidders = [], totalCount = 0 }) {
  const popAnim = useRef(new Animated.Value(0)).current;
  const prevTopIdRef = useRef(null);

  const topBidderId = bidders && bidders[0]?.id;

  useEffect(() => {
    if (topBidderId && topBidderId !== prevTopIdRef.current) {
      prevTopIdRef.current = topBidderId;
      popAnim.setValue(0);
      Animated.spring(popAnim, {
        toValue: 1,
        friction: 5,
        tension: 85,
        useNativeDriver: true,
      }).start();
    }
  }, [topBidderId, popAnim]);

  if (!bidders || bidders.length === 0) {
    return null;
  }

  const visible = bidders.slice(0, 4);
  const recent = visible.slice(0, 2);
  const older = visible.slice(2, 4);

  return (
    <View style={styles.avatarStackWrapper}>
      {/* 2 Most Recent Bids (Large, on the left) */}
      <View style={styles.recentAvatarsRow}>
        {recent.map((b, idx) => {
          const isFirst = idx === 0;
          return (
            <Animated.View
              key={String(b.id || idx)}
              style={[
                styles.recentAvatarItem,
                idx > 0 && { marginLeft: -6 },
                { zIndex: 10 - idx },
                isFirst
                  ? {
                      transform: [
                        {
                          scale: popAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0.2, 1.25, 1],
                          }),
                        },
                      ],
                      opacity: popAnim,
                    }
                  : null,
              ]}
            >
              {b.photo ? (
                <Image
                  source={{ uri: resolveApiAssetUrl(b.photo) }}
                  style={styles.avatarImg}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>
                    {b.name?.charAt(0)?.toUpperCase() || 'C'}
                  </Text>
                </View>
              )}
            </Animated.View>
          );
        })}
      </View>

      {/* Pujas Badge with Older Bids sticking out behind top edge */}
      <View style={styles.badgeWithOlderContainer}>
        {older.length > 0 ? (
          <View style={styles.olderAvatarsRow}>
            {older.map((b, idx) => (
              <View
                key={String(b.id || idx)}
                style={[
                  styles.olderAvatarItem,
                  idx > 0 && { marginLeft: -4 },
                ]}
              >
                {b.photo ? (
                  <Image
                    source={{ uri: resolveApiAssetUrl(b.photo) }}
                    style={styles.avatarImg}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={[styles.avatarFallbackText, { fontSize: 9 }]}>
                      {b.name?.charAt(0)?.toUpperCase() || 'C'}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.pujasBadge}>
          <Text style={styles.pujasBadgeText}>{`${totalCount} ${totalCount === 1 ? 'puja' : 'pujas'}`}</Text>
        </View>
      </View>
    </View>
  );
}

function ProductLotCard({
  currency,
  imageSize,
  lot,
  onPress,
  isActive,
  isFinished,
  activeItemData,
  now,
  biddersInfo,
}) {
  const identifier = lot.identificador ?? lot.idProducto;
  const imageSource = getFirstPhotoSource(lot);
  const productName = lot.nombre || lot.titulo || 'Producto sin nombre';
  const status = lot.estado || 'Sin estado';
  const title = lot.descripcionCatalogo
    ? `${productName} - ${lot.descripcionCatalogo}`
    : productName;

  const isLoggedIn = Boolean(getAccessToken());

  let activeItemRemainingSecs = 0;
  const activeEndTime = activeItemData?.finalizaEn ?? activeItemData?.finaliza_en;
  if (isActive && activeEndTime) {
    const endTime = new Date(activeEndTime).getTime();
    activeItemRemainingSecs = Math.max(0, Math.floor((endTime - now) / 1000));
  }

  const neonPulse = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (!isActive) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(neonPulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: false,
        }),
        Animated.timing(neonPulse, {
          toValue: 0.5,
          duration: 900,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [isActive, neonPulse]);

  return (
    <Pressable
      accessibilityLabel={`Ver producto ${title}`}
      accessibilityRole="button"
      disabled={isFinished}
      onPress={onPress}
      style={({ pressed }) => [
        styles.productCard,
        isActive ? styles.productCardActive : null,
        isFinished ? styles.productCardFinished : null,
        pressed && !isFinished ? styles.productCardPressed : null,
      ]}
    >
      <View
        style={{
          height: isActive ? imageSize + 2 : imageSize,
          width: isActive ? imageSize + 1 : imageSize,
          position: 'relative',
          borderTopLeftRadius: isActive ? 3 : 5,
          borderBottomLeftRadius: isActive ? 3 : 5,
          marginTop: isActive ? -1 : 0,
          marginLeft: isActive ? -1 : 0,
          marginBottom: isActive ? -1 : 0,
          overflow: 'hidden',
          backgroundColor: '#000000',
        }}
      >
        {imageSource ? (
          <Image
            accessibilityLabel={`Foto de ${productName}`}
            resizeMode="cover"
            source={imageSource}
            style={[styles.productImage, { height: imageSize, width: imageSize }]}
          />
        ) : (
          <View
            style={[
              styles.productImage,
              styles.productImageFallback,
              { height: imageSize, width: imageSize },
            ]}
          >
            <Text style={styles.productImageFallbackText}>Sin foto</Text>
          </View>
        )}
        {isFinished ? <SubastadoStamp /> : null}
      </View>

      <View style={styles.productBody}>
        <View>
          <Text numberOfLines={1} style={[styles.productCode, isFinished ? { color: '#555555' } : null]}>
            ID #{identifier ?? '-'}
          </Text>
          <Text numberOfLines={isActive ? 2 : 4} style={[styles.productTitle, isFinished ? { color: '#444444' } : null]}>
            {title}
          </Text>
          {isActive && isLoggedIn ? (
            <Text style={styles.activePriceLabel}>
              Precio inicial: {formatPrice(lot.precioBase, currency)}
            </Text>
          ) : null}
        </View>

        <View style={styles.productFooter}>
          {isActive ? (
            <View style={{ flex: 1, marginTop: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 8, flexWrap: 'nowrap', marginBottom: 2 }}>
                <Text numberOfLines={1} style={[styles.activePriceValue, { marginBottom: 0 }]}>
                  {formatPrice(activeItemData?.mejorOferta ?? activeItemData?.mejor_oferta ?? lot.precioBase, currency)}
                </Text>
                <BiddersAvatarStack bidders={biddersInfo?.recentBidders} totalCount={biddersInfo?.totalCount} />
              </View>
              <Text style={styles.activeTimeLabel}>
                Tiempo restante:{' '}
                <Text style={styles.activeTimeValue}>
                  {formatActiveTimeCard(activeItemRemainingSecs)}
                </Text>
              </Text>
            </View>
          ) : isFinished ? (
            <View style={styles.priceBlock}>
              <Text style={[styles.priceLabel, { color: '#555555' }]}>Precio final:</Text>
              <Text numberOfLines={1} style={[styles.priceValue, { color: '#444444' }]}>
                {formatPrice(lot.mejorOferta ?? lot.mejor_oferta ?? lot.precioFinal ?? lot.precio_final ?? lot.precioBase, currency)}
              </Text>
            </View>
          ) : (
            <>
              {isLoggedIn ? (
                <View style={styles.priceBlock}>
                  <Text style={styles.priceLabel}>Precio base</Text>
                  <Text numberOfLines={1} style={styles.priceValue}>
                    {formatPrice(lot.precioBase, currency)}
                  </Text>
                </View>
              ) : null}

              <View
                style={[
                  styles.statusBadge,
                  String(status).toLowerCase() === 'nuevo'
                    ? styles.statusBadgeNuevo
                    : String(status).toLowerCase() === 'usado'
                    ? styles.statusBadgeUsado
                    : null,
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.statusBadgeText,
                    String(status).toLowerCase() === 'nuevo'
                      ? styles.statusBadgeTextNuevo
                      : String(status).toLowerCase() === 'usado'
                      ? styles.statusBadgeTextUsado
                      : null,
                  ]}
                >
                  {status.toUpperCase()}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
      {isActive ? (
        <Animated.View
          style={[
            styles.activeBadge,
            {
              shadowRadius: neonPulse.interpolate({
                inputRange: [0.5, 1],
                outputRange: [6, 14],
              }),
              shadowOpacity: neonPulse,
            },
          ]}
        >
          <Text style={styles.activeBadgeText}>SUBASTANDO AHORA</Text>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

export default function AuctionDetailScreen({
  auction,
  auctionId,
  onProductPress,
}) {
  const { width } = useWindowDimensions();
  const [auctionDetails, setAuctionDetails] = useState(null);
  const [catalogPage, setCatalogPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasMoreLots, setHasMoreLots] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState('');
  const [lots, setLots] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  const [activeItem, setActiveItem] = useState(null);
  const [recentBiddersMap, setRecentBiddersMap] = useState({});
  const wsRef = useRef(null);
  const hasRefreshedForStartRef = useRef(false);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const serverTimeOffsetRef = useRef(0);

  const horizontalPadding = width < 360 ? 18 : 30;
  const contentWidth = Math.min(width - horizontalPadding * 2, 347);
  const imageSize = Math.max(116, Math.min(145, contentWidth * (145 / 347)));
  const compact = contentWidth < 325;
  const resolvedAuctionId =
    auctionId ?? auction?.identificador ?? auction?.id;

  useEffect(() => {
    if (!resolvedAuctionId) return;
    const startTime = Date.now();
    fetch(`${API_BASE_URL}/health`)
      .then((res) => {
        const dateHeader = res.headers.get('date');
        if (dateHeader) {
          const serverTime = new Date(dateHeader).getTime();
          const latency = (Date.now() - startTime) / 2;
          serverTimeOffsetRef.current = (serverTime + latency) - Date.now();
          console.log('Synchronized time offset with server:', serverTimeOffsetRef.current, 'ms');
        }
      })
      .catch((err) => console.log('Error syncing time with server:', err));
  }, [resolvedAuctionId]);

  const countdown = formatTimeRemaining(
    auctionDetails?.fecha,
    auctionDetails?.hora,
    now + serverTimeOffsetRef.current
  );

  const formatActiveTimeHeader = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins > 0) {
      return `${mins} m y ${secs} s`;
    }
    return `${secs} s`;
  };

  let activeItemRemainingSecs = 0;
  const activeEndTime = activeItem?.finalizaEn ?? activeItem?.finaliza_en;
  if (activeEndTime) {
    const endTime = new Date(activeEndTime).getTime();
    const syncNow = now + serverTimeOffsetRef.current;
    activeItemRemainingSecs = Math.max(0, Math.floor((endTime - syncNow) / 1000));
  }

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;

    setAuctionDetails(null);
    setCatalogPage(1);
    setHasMoreLots(false);
    setIsLoadingMore(false);
    setLoadMoreError('');
    setLots([]);
    setErrorMessage('');

    if (resolvedAuctionId === undefined || resolvedAuctionId === null) {
      setIsLoading(false);
      setErrorMessage('No pudimos identificar la subasta seleccionada.');
      return undefined;
    }

    setIsLoading(true);

    Promise.all([
      getAuctionDetails(resolvedAuctionId),
      getAuctionCatalog(resolvedAuctionId, 1, CATALOG_PAGE_SIZE),
    ])
      .then(([details, catalog]) => {
        if (active) {
          const detailDoesNotMatch =
            String(details?.identificador) !== String(resolvedAuctionId);
          const catalogDoesNotMatch =
            catalog?.idSubasta !== undefined &&
            String(catalog.idSubasta) !== String(details?.identificador);

          if (
            detailDoesNotMatch ||
            catalogDoesNotMatch
          ) {
            throw new Error('El catalogo recibido no corresponde a la subasta.');
          }

          setAuctionDetails(details);
          setCatalogPage(1);
          setHasMoreLots(hasMoreCatalogPages(catalog));
          setLots(Array.isArray(catalog?.items) ? catalog.items : []);
          setNow(Date.now());
        }
      })
      .catch((error) => {
        if (active) {
          setErrorMessage(
            error?.message || 'No pudimos cargar la subasta y su catalogo.'
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [resolvedAuctionId]);

  useEffect(() => {
    if (!resolvedAuctionId || auctionDetails?.estado !== 'programada') {
      return;
    }

    let active = true;

    const checkStatus = () => {
      getAuctionDetails(resolvedAuctionId)
        .then((details) => {
          if (active && details && details.estado !== 'programada') {
            setAuctionDetails(details);
            getAuctionCatalog(resolvedAuctionId, 1, CATALOG_PAGE_SIZE)
              .then((catalog) => {
                if (active) {
                  setLots(Array.isArray(catalog?.items) ? catalog.items : []);
                  setHasMoreLots(hasMoreCatalogPages(catalog));
                }
              })
              .catch((err) => console.log('Error refreshing catalog:', err));
          }
        })
        .catch((err) => console.log('Error polling status:', err));
    };

    const interval = setInterval(checkStatus, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [resolvedAuctionId, auctionDetails?.estado]);

  useEffect(() => {
    if (auctionDetails?.estado !== 'programada') {
      return;
    }

    const startDate = getAuctionStartDate(auctionDetails.fecha, auctionDetails.hora);
    const syncNow = now + serverTimeOffsetRef.current;
    if (startDate && startDate.getTime() <= syncNow && !hasRefreshedForStartRef.current) {
      hasRefreshedForStartRef.current = true;
      
      getAuctionDetails(resolvedAuctionId)
        .then((details) => {
          if (details && details.estado !== 'programada') {
            setAuctionDetails(details);
            getAuctionCatalog(resolvedAuctionId, 1, CATALOG_PAGE_SIZE)
              .then((catalog) => {
                setLots(Array.isArray(catalog?.items) ? catalog.items : []);
                setHasMoreLots(hasMoreCatalogPages(catalog));
              })
              .catch((err) => console.log('Error refreshing catalog:', err));
          }
        })
        .catch((err) => console.log('Error refreshing start:', err));
    }
  }, [now, resolvedAuctionId, auctionDetails]);

  useEffect(() => {
    if (!resolvedAuctionId || auctionDetails?.estado !== 'abierta') {
      setActiveItem(null);
      return;
    }

    let active = true;

    getActiveItem(resolvedAuctionId)
      .then(async (data) => {
        if (active) {
          setActiveItem(data);
          const activeItemId = data?.idItem ?? data?.id_item;
          if (activeItemId) {
            try {
              const bidsRes = await apiFetch(`/v1/subastas/${resolvedAuctionId}/items/${activeItemId}/pujas?pagina=1&cantidad=20`);
              const bidsList = Array.isArray(bidsRes) ? bidsRes : (bidsRes?.datos ?? []);
              const totalCount = bidsRes?.meta?.total ?? bidsList.length;
              
              const recentBidders = [...bidsList].reverse().map((b) => ({
                id: b.identificador,
                name: b.nombreUsuario ?? b.nombre_usuario ?? 'Comprador',
                photo: b.fotoPerfil ?? b.urlFotoPerfil ?? b.foto_perfil ?? b.url_foto_perfil ?? null,
              })).slice(0, 4);

              setRecentBiddersMap((prevMap) => ({
                ...prevMap,
                [activeItemId]: { totalCount, recentBidders },
              }));
            } catch (err) {
              console.log('Error loading initial bids for active item:', err);
            }
          }
        }
      })
      .catch((err) => {
        console.log('Error fetching active item:', err);
      });

    const wsBase = API_BASE_URL.replace(/^http/, 'ws');
    const token = getAccessToken();
    const wsUrl = `${wsBase}/v1/ws/subastas/${resolvedAuctionId}${token ? `?token=${token}` : ''}`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket event:', message);
        if (message.evento === 'nuevaPuja') {
          const datos = message.datos;
          const datosIdItem = datos?.idItem ?? datos?.id_item;
          if (active && datosIdItem) {
            const newBidder = {
              id: datos.idPuja ?? datos.id_puja ?? Date.now(),
              name: datos.nombreUsuario ?? datos.nombre_usuario ?? 'Comprador',
              photo: datos.fotoPerfil ?? datos.urlFotoPerfil ?? datos.foto_perfil ?? datos.url_foto_perfil ?? null,
            };

            setRecentBiddersMap((prevMap) => {
              const current = prevMap[datosIdItem] || { totalCount: 0, recentBidders: [] };
              const filtered = (current.recentBidders || []).filter((b) => b.name !== newBidder.name);
              const updatedList = [newBidder, ...filtered].slice(0, 4);
              return {
                ...prevMap,
                [datosIdItem]: {
                  totalCount: (current.totalCount || 0) + 1,
                  recentBidders: updatedList,
                },
              };
            });

            setActiveItem((current) => {
              const currentIdItem = current?.idItem ?? current?.id_item;
              if (current && Number(currentIdItem) === Number(datosIdItem)) {
                return {
                  ...current,
                  mejorOferta: datos.importe,
                  mejor_oferta: datos.importe,
                  pujaMinima: datos.pujaMinima ?? datos.puja_minima,
                  puja_minima: datos.pujaMinima ?? datos.puja_minima,
                  pujaMaxima: datos.pujaMaxima ?? datos.puja_maxima,
                  puja_maxima: datos.pujaMaxima ?? datos.puja_maxima,
                };
              }
              return current;
            });
          }
        } else if (message.evento === 'cambioItem') {
          const datos = message.datos;
          if (active) {
            setActiveItem(datos.itemActual);
            if (datos.itemAnterior) {
              const prevIdItem = datos.itemAnterior.idItem ?? datos.itemAnterior.id_item;
              setLots((currentLots) =>
                currentLots.map((lot) => {
                  if (Number(lot.identificador) === Number(prevIdItem)) {
                    const finalPrice = datos.itemAnterior.mejorOferta ?? datos.itemAnterior.mejor_oferta ?? datos.itemAnterior.precioFinal ?? datos.itemAnterior.precio_final;
                    return { ...lot, subastado: 'si', mejorOferta: finalPrice ?? lot.mejorOferta };
                  }
                  return lot;
                })
              );
            }
          }
        } else if (message.evento === 'subastaFinalizada') {
          if (active) {
            setActiveItem(null);
            getAuctionDetails(resolvedAuctionId)
              .then((details) => {
                if (active) {
                  setAuctionDetails(details);
                }
              })
              .catch((err) => console.log('Error refreshing auction details on finish:', err));
          }
        }
      } catch (err) {
        console.log('Error parsing WebSocket message:', err);
      }
    };

    ws.onopen = () => {
      console.log('WebSocket connected');
      if (active) setWsStatus('connected');
    };

    ws.onerror = (err) => {
      console.log('WebSocket error:', err);
      if (active) setWsStatus('error');
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      if (active) setWsStatus('disconnected');
    };

    return () => {
      active = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [resolvedAuctionId, auctionDetails?.estado]);

  async function handleLoadMore() {
    if (!hasMoreLots || isLoadingMore) {
      return;
    }

    const nextPage = catalogPage + 1;
    setIsLoadingMore(true);
    setLoadMoreError('');

    try {
      const catalog = await getAuctionCatalog(
        resolvedAuctionId,
        nextPage,
        CATALOG_PAGE_SIZE
      );

      if (
        catalog?.idSubasta !== undefined &&
        String(catalog.idSubasta) !== String(resolvedAuctionId)
      ) {
        throw new Error('El catalogo recibido no corresponde a la subasta.');
      }

      const nextLots = Array.isArray(catalog?.items) ? catalog.items : [];
      setLots((currentLots) => [...currentLots, ...nextLots]);
      setCatalogPage(nextPage);
      setHasMoreLots(hasMoreCatalogPages(catalog));
    } catch (error) {
      setLoadMoreError(
        error?.message || 'No pudimos cargar mas productos.'
      );
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <View style={[styles.screen, { paddingHorizontal: horizontalPadding }]}>
      <View style={[styles.content, { maxWidth: contentWidth }]}>
        <View style={styles.summaryShell}>
          <View style={styles.auctionPill}>
            <Text numberOfLines={1} style={styles.auctionPillText}>
              {auctionDetails?.nombre || 'Subasta'}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            {auctionDetails?.estado === 'abierta' ? (
              <View style={styles.countdownBlock}>
                <Text style={styles.countdownLabel}>Proximo item en</Text>
                <Text style={styles.countdownValue}>
                  {activeItem ? formatActiveTimeHeader(activeItemRemainingSecs) : 'Cargando...'}
                </Text>
              </View>
            ) : auctionDetails?.estado === 'cerrada' ? (
              <View style={styles.countdownBlock}>
                <Text style={styles.countdownLabel}>Estado</Text>
                <Text style={styles.countdownValue}>Subasta finalizada</Text>
              </View>
            ) : (
              <View style={styles.countdownBlock}>
                <Text style={styles.countdownLabel}>La subasta inicia en</Text>
                <Text style={styles.countdownValue}>
                  {countdown
                    ? `${countdown.days} dias, ${countdown.hours}h y ${countdown.minutes}m`
                    : 'Fecha a confirmar'}
                </Text>
              </View>
            )}

            <View style={styles.auctionMeta}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {(auctionDetails?.categoria || 'Sin categoria').toUpperCase()}
                </Text>
              </View>

              <View style={styles.locationRow}>
                <LocationPinIcon size={compact ? 25 : 31} />
                <Text style={styles.locationText}>
                  {auctionDetails?.ubicacion || 'Ubicacion a confirmar'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.feedbackCard}>
            <ActivityIndicator color={colors.burgundy} size="large" />
            <Text style={styles.feedbackText}>Cargando subasta...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackText}>{errorMessage}</Text>
          </View>
        ) : lots.length === 0 ? (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackText}>
              Esta subasta todavia no tiene productos en su catalogo.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.lotList}>
              {lots.map((lot, index) => {
                const activeItemId = activeItem?.idItem ?? activeItem?.id_item;
                const isActive = activeItem && activeItemId && Number(lot.identificador) === Number(activeItemId);
                const isFinished = lot.subastado === 'si';
                return (
                  <ProductLotCard
                    currency={auctionDetails?.moneda}
                    imageSize={imageSize}
                    key={String(lot.identificador ?? lot.idProducto ?? index)}
                    lot={lot}
                    onPress={() => onProductPress?.(lot)}
                    isActive={isActive}
                    isFinished={isFinished}
                    activeItemData={activeItem}
                    now={now + serverTimeOffsetRef.current}
                    biddersInfo={recentBiddersMap[lot.identificador] || recentBiddersMap[lot.idProducto]}
                  />
                );
              })}
            </View>

            {loadMoreError ? (
              <Text style={styles.loadMoreError}>{loadMoreError}</Text>
            ) : null}

            {hasMoreLots ? (
              <Pressable
                accessibilityLabel="Ver más productos"
                accessibilityRole="button"
                disabled={isLoadingMore}
                onPress={handleLoadMore}
                style={({ pressed }) => [
                  styles.loadMoreButton,
                  pressed ? styles.loadMoreButtonPressed : null,
                  isLoadingMore ? styles.loadMoreButtonDisabled : null,
                ]}
              >
                {isLoadingMore ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.loadMoreText}>Ver más</Text>
                )}
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    paddingTop: 12,
    zIndex: 2,
  },
  content: {
    width: '100%',
  },
  summaryShell: {
    marginBottom: 13,
    minHeight: 92,
    position: 'relative',
    width: '100%',
  },
  auctionPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.burgundy,
    borderRadius: 5,
    height: 28,
    justifyContent: 'center',
    left: -11,
    maxWidth: '95%',
    paddingHorizontal: 10,
    position: 'absolute',
    top: 0,
    zIndex: 2,
  },
  auctionPillText: {
    color: colors.cream,
    fontFamily: fonts.greatVibes,
    fontSize: 20,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 27,
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: referenceColors.card,
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 11,
    minHeight: 86,
    paddingLeft: 16,
    paddingRight: 11,
    paddingTop: 10,
    width: '100%',
  },
  countdownBlock: {
    flex: 1,
    minWidth: 0,
  },
  countdownLabel: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 19,
    marginTop: 10,
  },
  countdownValue: {
    color: colors.burgundy,
    fontFamily: fonts.semiBold,
    fontSize: 20,
    letterSpacing: 0,
    lineHeight: 26,
  },
  auctionMeta: {
    alignItems: 'flex-end',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    marginLeft: 8,
    paddingBottom: 12,
    paddingTop: 0,
    gap: 4,
  },
  categoryBadge: {
    alignItems: 'center',
    backgroundColor: '#BC1A50',
    borderRadius: 5,
    height: 24,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  categoryBadgeText: {
    color: colors.white,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: 15,
  },
  locationRow: {
    alignItems: 'center',
    columnGap: 2,
    flexDirection: 'row',
  },
  locationText: {
    color: referenceColors.text,
    fontFamily: fonts.medium,
    fontSize: 10,
    letterSpacing: 0,
    lineHeight: 12,
    width: 79,
  },
  lotList: {
    rowGap: 18,
    width: '100%',
  },
  productCard: {
    backgroundColor: referenceColors.card,
    borderRadius: 5,
    flexDirection: 'row',
    minHeight: 128,
    overflow: 'hidden',
    width: '100%',
  },
  productCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.995 }],
  },
  productBody: {
    flex: 1,
    justifyContent: 'space-between',
    minWidth: 0,
    paddingBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  productImage: {
    backgroundColor: colors.cardBlush,
    flexShrink: 0,
  },
  productImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImageFallbackText: {
    color: referenceColors.text,
    fontFamily: fonts.medium,
    fontSize: 12,
    opacity: 0.62,
  },
  productCode: {
    color: referenceColors.text,
    fontFamily: fonts.regular,
    fontSize: 10,
    letterSpacing: 0,
    lineHeight: 12,
    marginBottom: 1,
  },
  productTitle: {
    color: referenceColors.text,
    fontFamily: fonts.bold,
    fontSize: 14,
    letterSpacing: 0,
    lineHeight: 16,
  },
  productFooter: {
    alignItems: 'flex-end',
    columnGap: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  priceBlock: {
    flex: 1,
    minWidth: 0,
  },
  priceLabel: {
    color: referenceColors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 17,
  },
  priceValue: {
    color: referenceColors.text,
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 18,
  },
  statusBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(81, 3, 16, 0.12)',
    borderColor: colors.burgundy,
    borderRadius: 4,
    borderWidth: 1,
    height: 23,
    justifyContent: 'center',
    maxWidth: 116,
    minWidth: 66,
    paddingHorizontal: 8,
  },
  statusBadgeNuevo: {
    backgroundColor: 'rgba(92, 176, 74, 0.15)',
    borderColor: '#498E3C',
  },
  statusBadgeUsado: {
    backgroundColor: 'rgba(224, 102, 28, 0.15)',
    borderColor: '#E0661C',
  },
  statusBadgeText: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  statusBadgeTextNuevo: {
    color: '#2E6B23',
  },
  statusBadgeTextUsado: {
    color: '#D35400',
  },
  loadMoreButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.burgundy,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    marginTop: 30,
    width: 155,
  },
  loadMoreButtonDisabled: {
    opacity: 0.7,
  },
  loadMoreButtonPressed: {
    opacity: 0.88,
  },
  loadMoreError: {
    color: referenceColors.text,
    fontFamily: fonts.medium,
    fontSize: 13,
    marginTop: 16,
    textAlign: 'center',
  },
  loadMoreText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 19,
  },
  feedbackCard: {
    alignItems: 'center',
    backgroundColor: referenceColors.card,
    borderRadius: 5,
    justifyContent: 'center',
    minHeight: 128,
    padding: 20,
    rowGap: 12,
  },
  feedbackText: {
    color: referenceColors.text,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  productCardActive: {
    borderWidth: 3,
    borderColor: colors.burgundy,
    borderRadius: 6,
    overflow: 'visible',
    shadowColor: colors.burgundy,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 10,
  },
  productCardFinished: {
    backgroundColor: '#C8B2A0',
    opacity: 0.9,
  },
  activeBadge: {
    position: 'absolute',
    bottom: -10,
    left: -6,
    backgroundColor: colors.burgundy,
    borderWidth: 0,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    zIndex: 10,
    shadowColor: colors.burgundy,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 10,
    elevation: 10,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    textShadowColor: colors.burgundy,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  activePriceLabel: {
    color: referenceColors.text,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 14,
    marginTop: 4,
    marginBottom: 2,
  },
  activePriceValue: {
    color: colors.statusGreenBorder,
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 22,
    marginBottom: 4,
  },
  activeTimeLabel: {
    color: referenceColors.text,
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 13,
  },
  activeTimeValue: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
  },
  avatarStackWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 5,
  },
  recentAvatarItem: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: colors.cardBlush,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 3,
  },
  badgeWithOlderContainer: {
    position: 'relative',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginLeft: -6,
    zIndex: 1,
  },
  olderAvatarsRow: {
    position: 'absolute',
    top: -14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  olderAvatarItem: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: colors.cardBlush,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.burgundy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 9,
  },
  pujasBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(81, 3, 16, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1.5,
    elevation: 2,
  },
  pujasBadgeText: {
    color: referenceColors.text,
    fontFamily: fonts.medium,
    fontSize: 10,
  },
});
