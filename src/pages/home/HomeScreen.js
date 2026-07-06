import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import AuctionCard from '../../components/auctions/AuctionCard';
import {
  getResponseItems,
  isHomeFeaturedAuction,
  mapAuctionToCard,
  pickRandomAuction,
} from '../../utils/auctions';
import { apiFetch, getApiErrorMessage } from '../../utils/http';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

function isAvailableAuction(auction) {
  const estado = String(auction?.estado || auction?.status || '').toLowerCase();
  return estado.includes('programada') || estado.includes('abierta') || estado.includes('en curso');
}

function pickAvailableAuction(auctions) {
  return pickRandomAuction(auctions.filter(isAvailableAuction));
}

function selectFeaturedAuction(auctions) {
  const explicitFeatured = auctions.find(isHomeFeaturedAuction);

  if (explicitFeatured) {
    if (isAvailableAuction(explicitFeatured)) return explicitFeatured;
    return pickAvailableAuction(auctions);
  }

  return pickAvailableAuction(auctions);
}

export default function HomeScreen({ onAuctionPress, onViewAllAuctions }) {
  const [featuredAuction, setFeaturedAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchFeaturedAuction() {
    setLoading(true);
    setError('');

    try {
      let auction = null;

      try {
        auction = await apiFetch('/v1/subastas/destacada');
        if (!isAvailableAuction(auction)) {
          auction = null;
        }
      } catch (err) {
        if (err?.status !== 404) throw err;
      }

      if (!auction) {
        const response = await apiFetch('/v1/subastas?pagina=1&cantidad=100');
        auction = selectFeaturedAuction(getResponseItems(response));
      }

      setFeaturedAuction(auction ? mapAuctionToCard(auction) : null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No pudimos cargar la subasta destacada.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFeaturedAuction();
  }, []);

  return (
    <View style={styles.screen}>
      <Image
        source={require('../../assets/brand/midnight-lace-logo.png')}
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

      {loading ? (
        <ActivityIndicator color={colors.burgundy} style={styles.loader} />
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.stateText}>{error}</Text>
          <Pressable onPress={fetchFeaturedAuction} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : featuredAuction ? (
        <AuctionCard
          category={featuredAuction.category}
          dateTime={featuredAuction.dateTime}
          imageSource={featuredAuction.imageSource}
          location={featuredAuction.location}
          onPress={() => onAuctionPress?.(featuredAuction.rawData)}
          pieces={featuredAuction.pieces}
          status={featuredAuction.status}
          style={styles.card}
          title={featuredAuction.title}
        />
      ) : (
        <View style={styles.centerState}>
          <Text style={styles.stateText}>No hay subastas disponibles en el momento.</Text>
        </View>
      )}

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
  loader: {
    marginTop: 56,
  },
  centerState: {
    alignItems: 'center',
    marginTop: 48,
    rowGap: 16,
  },
  stateText: {
    color: colors.cocoa,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    maxWidth: 327,
    textAlign: 'center',
  },
  retryButton: {
    alignItems: 'center',
    borderColor: colors.burgundy,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 20,
  },
  retryButtonText: {
    color: colors.textBurgundy,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 18,
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
