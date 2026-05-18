import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import StatusBadge from '../status/StatusBadge';

export default function AuctionCard({
  category,
  dateTime,
  imageSource,
  location,
  pieces,
  status,
  style,
  title,
}) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.imageFrame}>
        <Image source={imageSource} resizeMode="contain" style={styles.image} />
      </View>
      <View style={styles.footer}>
        <View style={styles.info}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <Text style={styles.detail}>{dateTime}</Text>
          <Text style={styles.detail}>{location}</Text>
          <Text style={styles.detail}>
            {pieces} PIEZAS · Categoría: {category}
          </Text>
        </View>
        <StatusBadge label={status} style={styles.status} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBlush,
    borderRadius: 16,
    overflow: 'hidden',
    padding: 11,
    width: '100%',
  },
  imageFrame: {
    aspectRatio: 1264 / 843,
    backgroundColor: colors.cream,
    overflow: 'hidden',
    width: '100%',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  footer: {
    alignItems: 'flex-end',
    columnGap: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.cocoa,
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 2,
  },
  detail: {
    color: colors.cocoa,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 19,
  },
  status: {
    marginBottom: 3,
  },
});
