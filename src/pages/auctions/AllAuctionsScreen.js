import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import AuctionCard from '../../components/auctions/AuctionCard';
import { getResponseItems, mapAuctionToCard } from '../../utils/auctions';
import { apiFetch, getApiErrorMessage } from '../../utils/http';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

export default function AllAuctionsScreen({ isSubastador, onAuctionPress }) {
  const [subastas, setSubastas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchSubastas() {
    setLoading(true);
    setError(null);
    try {
      const endpoint = isSubastador
        ? '/v1/subastador/subastas?pagina=1&cantidad=50'
        : '/v1/subastas?pagina=1&cantidad=50';
      const res = await apiFetch(endpoint);
      setSubastas(getResponseItems(res).map(mapAuctionToCard));
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudieron cargar las subastas.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSubastas();
  }, [isSubastador]);

  const title = isSubastador ? 'Mis subastas' : 'Todas las subastas';

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{title}</Text>

      {loading ? (
        <ActivityIndicator color={colors.burgundy} size="large" style={styles.loader} />
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.stateText}>{error}</Text>
          <Pressable onPress={fetchSubastas} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : subastas.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={styles.stateText}>
            {isSubastador
              ? 'Todavia no creaste ninguna subasta.'
              : 'No hay subastas disponibles.'}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {subastas.map((auction) => (
            <AuctionCard
              category={auction.category}
              dateTime={auction.dateTime}
              imageSource={auction.imageSource}
              key={auction.id}
              location={auction.location}
              onPress={() => onAuctionPress?.(auction.rawData)}
              pieces={auction.pieces}
              status={auction.status}
              style={styles.card}
              title={auction.title}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 20,
    zIndex: 2,
  },
  title: {
    color: colors.cocoa,
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 32,
    marginBottom: 16,
    maxWidth: 327,
    width: '100%',
  },
  list: {
    alignItems: 'center',
    rowGap: 20,
    width: '100%',
  },
  card: {
    maxWidth: 327,
  },
  loader: {
    marginTop: 48,
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
});
