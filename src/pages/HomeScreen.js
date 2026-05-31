import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import AuctionCard from '../components/auctions/AuctionCard';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

const featuredAuction = {
  category: 'Oro',
  dateTime: '22/08/2026 · 19:30h',
  imageSource: require('../assets/auctions/strawberry-pattern-special.jpeg'),
  location: 'Hotel Alvear Art, CABA',
  pieces: 3,
  status: 'en curso',
};

export default function HomeScreen({ onViewAllAuctions }) {
  return (
    <View style={styles.screen}>
      <Image
        source={require('../assets/brand/midnight-lace-logo.png')}
        resizeMode="contain"
        style={styles.brandLogo}
      />

      <View style={styles.featuredTitle}>
        <Text style={styles.featuredSerif}>Subasta</Text>
        <View style={styles.featuredScriptWrapper}>
          <Text style={styles.featuredScript}>destacada</Text>
          <View style={styles.featuredUnderline} />
        </View>
      </View>

      <AuctionCard
        category={featuredAuction.category}
        dateTime={featuredAuction.dateTime}
        imageSource={featuredAuction.imageSource}
        location={featuredAuction.location}
        pieces={featuredAuction.pieces}
        status={featuredAuction.status}
        style={styles.card}
      />

      <Pressable style={styles.allAuctionsButton} onPress={onViewAllAuctions}>
        <Text style={styles.allAuctionsLabel}>Ver todas las subastas</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    paddingHorizontal: 37,
    paddingTop: 14,
    zIndex: 2,
  },
  brandLogo: {
    height: 106,
    marginBottom: 2,
    width: '112%',
  },
  featuredTitle: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featuredSerif: {
    color: colors.cocoa,
    fontFamily: fonts.playfairBold,
    fontSize: 27,
    letterSpacing: 0,
    lineHeight: 43,
    marginRight: 7,
  },
  featuredScriptWrapper: {
    position: 'relative',
  },
  featuredScript: {
    color: colors.cocoa,
    fontFamily: fonts.greatVibes,
    fontSize: 36,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 43,
  },
  featuredUnderline: {
    backgroundColor: colors.cocoa,
    bottom: 8,
    height: 2,
    left: 0,
    opacity: 0.85,
    position: 'absolute',
    right: 0,
  },
  card: {
    maxWidth: 327,
  },
  allAuctionsButton: {
    alignItems: 'center',
    backgroundColor: colors.burgundy,
    borderRadius: 16,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 32,
    paddingHorizontal: 17,
  },
  allAuctionsLabel: {
    color: colors.white,
    fontFamily: fonts.regular,
    fontSize: 15,
    letterSpacing: 0,
  },
});
