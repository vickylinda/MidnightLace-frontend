import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

const product = {
  currentPrice: '120 USD',
  delta: '$5',
  highestBid: '95 USD',
  images: {
    bow: require('../../assets/subasta/auction-product-bow.jpg'),
    hat: require('../../assets/subasta/auction-product-hat.jpg'),
    main: require('../../assets/subasta/auction-product-main.jpg'),
  },
  minimumBid: '10 USD',
  nextBid: '130 USD',
  seller: {
    avatar: require('../../assets/subasta/auction-seller-avatar.jpg'),
    location: 'Buenos Aires - Argentina',
    username: 'jorgereial23',
  },
  title: 'First Otome - Black Old School Lolita OP Dress, Lace Details',
};

const bidHistory = [
  { amount: '120 USD', bidder: 'luisdiaz95', time: 'hace 2 min' },
  { amount: '115 USD', bidder: 'mariana_glez', time: 'hace 7 min' },
  { amount: '105 USD', bidder: 'juancho_loli', time: 'hace 13 min' },
];

const descriptionItems = [
  {
    detail:
      'Negro con encaje blanco, silueta acampanada y detalles romanticos.',
    title: 'Vestido estilo Lolita',
  },
  {
    detail: 'Con volados y moño, toque elegante y clasico.',
    title: 'Sombrero vintage',
  },
  {
    detail: 'Charol negro, comodos y atemporales.',
    title: 'Zapatos Mary Jane',
  },
  {
    detail: 'Finos y femeninos, completan el look sofisticado.',
    title: 'Guantes de encaje',
  },
];

const palette = {
  card: '#F6E3D1',
  divider: 'rgba(81, 3, 16, 0.14)',
  green: '#3FA54B',
  text: '#510310',
};

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

function LiveBadge({ style }) {
  return (
    <View style={[styles.liveBadge, style]}>
      <LiveIcon />
      <Text style={styles.liveText}>EN VIVO</Text>
    </View>
  );
}

function BidHistoryItem({ amount, bidder, time }) {
  return (
    <View style={styles.bidHistoryItem}>
      <View style={styles.bidMarker} />
      <View style={styles.bidCopy}>
        <Text numberOfLines={1} style={styles.bidUser}>
          <Text style={styles.bidUserName}>{bidder}</Text> pujo
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

export default function AuctionProductScreen() {
  const { width } = useWindowDimensions();
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

  return (
    <View style={[styles.screen, { paddingHorizontal: horizontalPadding }]}>
      <View style={[styles.content, { maxWidth: contentWidth }]}>
        <View style={styles.hero}>
          <LiveBadge
            style={{
              left: Math.max(8, 11 * scale),
              top: Math.max(3, 5 * scale),
            }}
          />

          <View
            style={[
              styles.mediaRow,
              {
                columnGap: mediaGap,
                paddingLeft: mediaLeftPadding,
                paddingRight: mediaRightPadding,
                paddingTop: Math.max(15, 17 * scale),
              },
            ]}
          >
            <Image
              resizeMode="cover"
              source={product.images.main}
              style={[
                styles.mainImage,
                {
                  borderRadius: imageRadius,
                  height: mainImageSize,
                  width: mainImageSize,
                },
              ]}
            />

            <View style={[styles.thumbnailColumn, { rowGap: thumbnailGap }]}>
              <Image
                resizeMode="cover"
                source={product.images.hat}
                style={[
                  styles.thumbnailImage,
                  {
                    borderRadius: imageRadius,
                    height: thumbnailHeight,
                    width: thumbnailWidth,
                  },
                ]}
              />
              <Image
                resizeMode="cover"
                source={product.images.bow}
                style={[
                  styles.thumbnailImage,
                  {
                    borderRadius: imageRadius,
                    height: thumbnailHeight,
                    width: thumbnailWidth,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        <Text style={styles.title}>{product.title}</Text>

        <View style={styles.infoGrid}>
          <View style={[styles.infoPanel, styles.pricePanel]}>
            <Text style={styles.priceLabel}>Precio actual:</Text>
            <Text style={styles.priceValue}>
              {product.currentPrice}{' '}
              <Text style={styles.priceDelta}>↑ {product.delta}</Text>
            </Text>

            <View style={styles.priceDivider} />

            <Text style={styles.secondaryLabel}>Puja minima</Text>
            <Text style={styles.secondaryValue}>{product.minimumBid}</Text>

            <Text style={[styles.secondaryLabel, styles.highestLabel]}>
              Tu puja mas alta
            </Text>
            <Text style={styles.secondaryValue}>{product.highestBid}</Text>
          </View>

          <View style={[styles.infoPanel, styles.historyPanel]}>
            {bidHistory.map((bid) => (
              <BidHistoryItem
                amount={bid.amount}
                bidder={bid.bidder}
                key={bid.bidder}
                time={bid.time}
              />
            ))}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {}}
          style={({ pressed }) => [
            styles.bidButton,
            pressed ? styles.bidButtonPressed : null,
          ]}
        >
          <Text style={styles.bidButtonText}>PUJAR {product.nextBid}</Text>
        </Pressable>

        <View style={styles.sellerRow}>
          <Image
            resizeMode="cover"
            source={product.seller.avatar}
            style={styles.sellerAvatar}
          />

          <View style={styles.sellerCopy}>
            <Text style={styles.sellerText}>
              Publicado por{' '}
              <Text style={styles.sellerName}>{product.seller.username}</Text>
            </Text>
            <Text style={styles.sellerText}>{product.seller.location}</Text>
          </View>
        </View>

        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionHeading}>Descripcion del vendedor</Text>
          <Text style={styles.descriptionBody}>
            Hola comunidad les comento que me canse de ser una lolita, asi que
            estoy transicionado a la moda steampunk, por ende necesito plata.
          </Text>

          <View style={styles.descriptionDivider} />

          {descriptionItems.map((item) => (
            <DescriptionItem
              detail={item.detail}
              key={item.title}
              title={item.title}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    paddingBottom: 12,
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
    flex: 183,
    paddingBottom: 12,
    paddingHorizontal: 11,
    paddingTop: 10,
  },
  historyPanel: {
    flex: 161,
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
    fontSize: 26,
    letterSpacing: 0,
    lineHeight: 32,
  },
  priceDelta: {
    color: palette.green,
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 20,
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
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 20,
  },
  secondaryValue: {
    color: palette.text,
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 20,
  },
  highestLabel: {
    marginTop: 8,
  },
  bidHistoryItem: {
    alignItems: 'flex-start',
    columnGap: 7,
    flexDirection: 'row',
    marginBottom: 15,
  },
  bidMarker: {
    backgroundColor: colors.burgundy,
    borderRadius: 999,
    height: 35,
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
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: 16,
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
    minHeight: 397,
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
  },
  descriptionBody: {
    color: '#000000',
    fontFamily: fonts.regular,
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 18,
  },
  descriptionDivider: {
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    height: 1,
    marginBottom: 18,
    marginTop: 20,
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
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 19,
  },
  descriptionItemTitle: {
    fontFamily: fonts.bold,
  },
});
