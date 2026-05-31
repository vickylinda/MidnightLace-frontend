import { StyleSheet, Text, View } from 'react-native';

import AuctionCard from '../components/auctions/AuctionCard';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

const auctions = [
  {
    category: 'Especial',
    dateTime: '20/04/2026 · 18:30h',
    imageSource: require('../assets/auctions/gyaru-deluxe.png'),
    location: 'La Rural, Palermo, CABA',
    pieces: 6,
    status: 'en curso',
    title: 'Gyaru Deluxe',
  },
  {
    category: 'Especial',
    dateTime: '20/04/2026 · 21:00h',
    imageSource: require('../assets/auctions/y2k-reloaded.png'),
    location: 'Complejo C Art Media, CABA',
    pieces: 8,
    status: 'en curso',
    title: 'Y2K Reloaded',
  },
  {
    category: 'Plata',
    dateTime: '20/04/2026 · 17:00h',
    imageSource: require('../assets/auctions/sweet-dreams.png'),
    location: 'Centro Cultural Recoleta, CABA',
    pieces: 5,
    status: 'en curso',
    title: 'Sweet Dreams',
  },
  {
    category: 'Oro',
    dateTime: '20/04/2026 · 20:00h',
    imageSource: require('../assets/auctions/gothic-night.png'),
    location: 'Palacio San Miguel, CABA',
    pieces: 2,
    status: 'en curso',
    title: 'Gothic Night',
  },
  {
    category: 'Oro',
    dateTime: '20/04/2026 · 19:30h',
    imageSource: require('../assets/auctions/strawberry-pattern-special.jpeg'),
    location: 'Hotel Alvear Art, CABA',
    pieces: 3,
    status: 'en curso',
    title: 'Strawberry Bloom',
  },
  {
    category: 'Platino',
    dateTime: '20/04/2026 · 21:00h',
    imageSource: require('../assets/auctions/visual-eclipse.png'),
    location: 'Complejo Art Media, CABA',
    pieces: 5,
    status: 'en curso',
    title: 'Visual Eclipse',
  },
  {
    category: 'Comun',
    dateTime: '02/09/2026 · 19:00h',
    imageSource: require('../assets/auctions/ganguro-fever.png'),
    location: 'Niceto Club, Palermo, CABA',
    pieces: 7,
    status: 'programada',
    title: 'Ganguro Fever',
  },
  {
    category: 'Plata',
    dateTime: '05/04/2026 · 16:30h',
    imageSource: require('../assets/auctions/fairy-magic.png'),
    location: 'Usina del Arte, CABA',
    pieces: 3,
    status: 'finalizado',
    title: 'Fairy Magic',
  },
];

export default function AllAuctionsScreen() {
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
