import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import AuctionCard from '../components/auctions/AuctionCard';
import { listAuctions } from '../api/auctions';
import { getApiErrorMessage } from '../api/http';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

export default function HomeScreen({ onViewAllAuctions }) {
  const [featuredAuction, setFeaturedAuction] = useState(null);
  const [screenError, setScreenError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadFeaturedAuction() {
      try {
        const auctions = await listAuctions();

        if (isMounted) {
          setFeaturedAuction(auctions[0] || null);
        }
      } catch (error) {
        if (isMounted) {
          setScreenError(getApiErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadFeaturedAuction();

    return () => {
      isMounted = false;
    };
  }, []);

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

      {screenError ? <Text style={styles.errorText}>{screenError}</Text> : null}
      {isLoading ? <Text style={styles.emptyText}>Cargando subasta...</Text> : null}

      {featuredAuction ? (
        <AuctionCard
          category={featuredAuction.category}
          dateTime={featuredAuction.dateTime}
          imageSource={featuredAuction.imageSource}
          location={featuredAuction.location}
          pieces={featuredAuction.pieces}
          status={featuredAuction.status}
          style={styles.card}
          title={featuredAuction.title}
        />
      ) : !isLoading && !screenError ? (
        <Text style={styles.emptyText}>No hay subastas disponibles.</Text>
      ) : null}

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
  emptyText: {
    color: colors.cocoa,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  errorText: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 12,
    textAlign: 'center',
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
