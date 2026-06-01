import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AuctionCard from '../components/auctions/AuctionCard';
import { listAuctions } from '../api/auctions';
import { getApiErrorMessage } from '../api/http';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

export default function AllAuctionsScreen() {
  const [auctions, setAuctions] = useState([]);
  const [screenError, setScreenError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadAuctions() {
      try {
        const nextAuctions = await listAuctions();

        if (isMounted) {
          setAuctions(nextAuctions);
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

    loadAuctions();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Todas las subastas</Text>

      {screenError ? <Text style={styles.errorText}>{screenError}</Text> : null}
      {isLoading ? <Text style={styles.emptyText}>Cargando subastas...</Text> : null}

      {!isLoading && !auctions.length && !screenError ? (
        <Text style={styles.emptyText}>No hay subastas disponibles.</Text>
      ) : null}

      <View style={styles.list}>
        {auctions.map((auction) => (
          <AuctionCard
            category={auction.category}
            dateTime={auction.dateTime}
            imageSource={auction.imageSource}
            key={auction.id || auction.title}
            location={auction.location}
            pieces={auction.pieces}
            status={auction.status}
            style={styles.card}
            title={auction.title}
          />
        ))}
      </View>
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
  errorText: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 12,
    maxWidth: 327,
    width: '100%',
  },
  emptyText: {
    color: colors.cocoa,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 12,
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
});
