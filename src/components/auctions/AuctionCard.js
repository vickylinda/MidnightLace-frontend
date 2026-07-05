import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import StatusBadge from '../status/StatusBadge';

export default function AuctionCard({
  category,
  dateTime,
  imageSource,
  location,
  onPress,
  pieces,
  status,
  style,
  title,
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        style,
        pressed && onPress ? styles.cardPressed : null,
      ]}
    >
      <View style={styles.imageFrame}>
        {imageSource ? (
          <Image source={imageSource} resizeMode="contain" style={styles.image} />
        ) : null}
      </View>
      <View style={styles.footer}>
        <View style={styles.info}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <Text style={styles.detail}>{dateTime}</Text>
          <Text style={styles.detail}>{location}</Text>
          <Text style={styles.detail}>
            {pieces != null ? `${pieces} PIEZAS · ` : ''}Categoría: {category}
          </Text>
        </View>
        <StatusBadge label={status} style={styles.status} />
      </View>
    </Pressable>
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
  cardPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.995 }],
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
