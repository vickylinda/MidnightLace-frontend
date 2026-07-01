import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useEffect, useState } from 'react';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { resolveApiAssetUrl } from '../../utils/config';
import { apiFetch, getApiErrorMessage } from '../../utils/http';

const referenceLots = [
  {
    code: 'PUIFT-017-BLACK&PINK-FREESIZE',
    imageSource: require('../../assets/subasta/subasta-lot-01.jpg'),
    openingBid: '10 USD',
    title:
      'Clearance - Black & Pink Polka-dot Pattern Bowknot Gyaru Fashion Beret',
  },
  {
    code: 'LLGU-001',
    imageSource: require('../../assets/subasta/subasta-lot-02.jpg'),
    openingBid: '35 USD',
    title: 'Pink/Gold Gyaru Fashion Platform High 12.7cm Heel Shoes',
  },
  {
    code: 'LCHYY-118',
    imageSource: require('../../assets/subasta/subasta-lot-03.jpg'),
    openingBid: '5 USD',
    title:
      'Hime Gyaru Leopard Print Pink/Rose Red Mini Hat with Opulent Rose & Ruffled Lace Trim',
  },
  {
    code: 'SEHGT-004',
    imageSource: require('../../assets/subasta/subasta-lot-04.jpg'),
    openingBid: '42 USD',
    title: 'Gyaru Fashion Leopard Pattern Tote Bag with Big Bows',
  },
  {
    code: 'PUIFT-002',
    imageSource: require('../../assets/subasta/subasta-lot-05.jpg'),
    openingBid: '15 USD',
    title: 'Pink & White/Pink & Brown Kitty Design Floral Gyaru Fashion Visor Cap',
  },
  {
    code: 'BNTSW-024',
    imageSource: require('../../assets/subasta/subasta-lot-06.jpg'),
    openingBid: '48 USD',
    title:
      'Hime Gyaru Purple Leopard Print Tiered Skirt with Ruffle Trim and Chain Accent',
  },
];

const referenceColors = {
  card: '#F6E3D1',
  text: '#510310',
};

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

function normalizePhotoSource(photo) {
  const path = typeof photo === 'string' ? photo : photo?.foto || photo?.url || photo?.uri;
  return path ? { uri: resolveApiAssetUrl(path) } : null;
}

function mapCatalogItem(item) {
  const photos = item.fotos || item.producto?.fotos || [];
  return {
    code: `ITEM-${item.identificador}`,
    imageSource: normalizePhotoSource(photos[0]),
    openingBid: `${item.precioBase || '-'} ${item.moneda || ''}`.trim(),
    rawData: item,
    title: item.descripcionProducto || item.producto?.nombre || `Producto #${item.idProducto}`,
  };
}

function ProductLotCard({ imageSize, lot, onPress }) {
  return (
    <Pressable
      accessibilityLabel={`Ver producto ${lot.title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.productCard,
        { minHeight: imageSize },
        pressed ? styles.productCardPressed : null,
      ]}
    >
      {lot.imageSource ? (
        <Image
          resizeMode="cover"
          source={lot.imageSource}
          style={[
            styles.productImage,
            {
              height: imageSize,
              width: imageSize,
            },
          ]}
        />
      ) : (
        <View style={[styles.productImage, styles.productImageFallback, { height: imageSize, width: imageSize }]}>
          <Text style={styles.productImageFallbackText}>Sin foto</Text>
        </View>
      )}

      <View style={styles.productBody}>
        <View>
          <Text numberOfLines={1} style={styles.productCode}>
            {lot.code}
          </Text>
          <Text numberOfLines={4} style={styles.productTitle}>
            {lot.title}
          </Text>
        </View>

        <View style={styles.productFooter}>
          <View style={styles.priceBlock}>
            <Text style={styles.priceLabel}>Oferta inicial</Text>
            <Text style={styles.priceValue}>{lot.openingBid}</Text>
          </View>

          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NUEVO</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function AuctionDetailScreen({ auction, isSubastador = false, onProductPress }) {
  const { width } = useWindowDimensions();
  const [currentAuction, setCurrentAuction] = useState(auction);
  const [lots, setLots] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState('');
  const horizontalPadding = width < 360 ? 18 : 30;
  const contentWidth = Math.min(width - horizontalPadding * 2, 347);
  const imageSize = Math.max(116, Math.min(145, contentWidth * (145 / 347)));
  const compact = contentWidth < 325;
  const canStartNow = isSubastador && currentAuction?.estado === 'programada';

  useEffect(() => {
    setCurrentAuction(auction);
  }, [auction]);

  useEffect(() => {
    let cancelled = false;

    async function fetchCatalog() {
      if (!currentAuction?.identificador) return;
      setLoadingCatalog(true);
      try {
        const data = await apiFetch(`/v1/subastas/${currentAuction.identificador}/catalogo?pagina=1&cantidad=100`);
        if (!cancelled) {
          setLots((data.items || []).map(mapCatalogItem));
        }
      } catch {
        if (!cancelled) {
          setLots(referenceLots);
        }
      } finally {
        if (!cancelled) {
          setLoadingCatalog(false);
        }
      }
    }

    fetchCatalog();
    return () => {
      cancelled = true;
    };
  }, [currentAuction?.identificador]);

  async function handleStartNow() {
    if (!currentAuction?.identificador || starting) return;
    setStarting(true);
    setMessage('');
    try {
      const updated = await apiFetch(`/v1/subastador/subastas/${currentAuction.identificador}/estado`, {
        method: 'PATCH',
        body: { estado: 'abierta' },
      });
      setCurrentAuction(updated);
      setMessage('Subasta iniciada.');
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'No pudimos iniciar la subasta.'));
    } finally {
      setStarting(false);
    }
  }

  return (
    <View style={[styles.screen, { paddingHorizontal: horizontalPadding }]}>
      <View style={[styles.content, { maxWidth: contentWidth }]}>
        <View style={styles.summaryShell}>
          <View style={styles.auctionPill}>
            <Text numberOfLines={1} style={styles.auctionPillText}>
              {currentAuction?.nombre || 'Subasta'}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.countdownBlock}>
              <Text style={styles.countdownLabel}>
                {currentAuction?.estado === 'abierta' ? 'La subasta esta' : 'La subasta inicia'}
              </Text>
              <Text style={styles.countdownValue}>
                {currentAuction?.estado === 'abierta'
                  ? 'En curso'
                  : currentAuction?.fecha
                  ? `${String(currentAuction.fecha).split('-').reverse().join('/')} ${String(currentAuction.hora || '').slice(0, 5)}`
                  : 'Programada'}
              </Text>
            </View>

            <View style={styles.auctionMeta}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {String(currentAuction?.categoria || 'especial').toUpperCase()}
                </Text>
              </View>

              <View style={styles.locationRow}>
                <LocationPinIcon size={compact ? 25 : 31} />
                <Text style={styles.locationText}>
                  {currentAuction?.ubicacion || 'Ubicacion a confirmar'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {canStartNow ? (
          <Pressable
            disabled={starting}
            onPress={handleStartNow}
            style={[styles.startNowButton, starting ? styles.startNowButtonDisabled : null]}
          >
            <Text style={styles.startNowText}>{starting ? 'INICIANDO...' : 'INICIAR AHORA'}</Text>
          </Pressable>
        ) : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.lotList}>
          {loadingCatalog ? (
            <ActivityIndicator color={colors.burgundy} style={styles.loader} />
          ) : (
            (lots.length ? lots : referenceLots).map((lot) => (
              <ProductLotCard
                imageSize={imageSize}
                key={lot.code}
                lot={lot}
                onPress={() => onProductPress?.(lot.rawData || lot)}
              />
            ))
          )}
        </View>

        <View style={styles.loadMoreButton}>
          <Text style={styles.loadMoreText}>Cargar mas</Text>
        </View>
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
    backgroundColor: colors.burgundy,
    borderRadius: 5,
    height: 28,
    justifyContent: 'center',
    left: -11,
    paddingHorizontal: 10,
    position: 'absolute',
    top: 0,
    width: 126,
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
    fontSize: 24,
    letterSpacing: 0,
    lineHeight: 31,
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
    overflow: 'hidden',
    width: '100%',
  },
  productCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.995 }],
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
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  productBody: {
    flex: 1,
    justifyContent: 'space-between',
    minWidth: 0,
    paddingBottom: 8,
    paddingLeft: 11,
    paddingRight: 11,
    paddingTop: 9,
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
    fontSize: 17,
    letterSpacing: 0,
    lineHeight: 19,
  },
  newBadge: {
    alignItems: 'center',
    backgroundColor: colors.burgundy,
    borderRadius: 5,
    height: 23,
    justifyContent: 'center',
    width: 66,
  },
  newBadgeText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0,
    lineHeight: 14,
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
  loadMoreText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 19,
  },
  startNowButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.burgundy,
    borderRadius: 999,
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 42,
    paddingHorizontal: 22,
  },
  startNowButtonDisabled: {
    opacity: 0.62,
  },
  startNowText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 14,
    letterSpacing: 0,
  },
  message: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    textAlign: 'center',
  },
  loader: {
    marginVertical: 24,
  },
});
