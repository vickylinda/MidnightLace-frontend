import { StyleSheet, Text, View } from 'react-native';

import AuctionCard from '../components/auctions/AuctionCard';
import { auctions } from '../data/auctions';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

export default function AllAuctionsScreen({ onAuctionPress }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Todas las subastas</Text>

      <View style={styles.list}>
        {auctions.map((auction) => (
          <AuctionCard
            category={auction.category}
            dateTime={auction.dateTime}
            imageSource={auction.imageSource}
            key={auction.title}
            location={auction.location}
            onPress={() => onAuctionPress?.(auction)}
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
  list: {
    alignItems: 'center',
    rowGap: 20,
    width: '100%',
  },
  card: {
    maxWidth: 327,
  },
});
