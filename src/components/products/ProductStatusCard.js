import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import SubastadoStamp from '../status/SubastadoStamp';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

const STATUS_STYLES = {
  pending: {
    backgroundColor: 'rgba(232, 177, 50, 0.72)',
    borderColor: '#B88310',
  },
  confirming: {
    backgroundColor: 'rgba(225, 119, 36, 0.76)',
    borderColor: '#B55E16',
  },
  assigned: {
    backgroundColor: 'rgba(92, 176, 74, 0.72)',
    borderColor: '#498E3C',
  },
  auction: {
    backgroundColor: 'rgba(66, 92, 196, 0.76)',
    borderColor: '#304BAF',
  },
  rejected: {
    backgroundColor: 'rgba(159, 2, 29, 0.76)',
    borderColor: colors.burgundy,
  },
  sold: {
    backgroundColor: 'rgba(112, 100, 96, 0.72)',
    borderColor: '#655B58',
  },
};

export default function ProductStatusCard({
  description,
  imageSource,
  onPress,
  owner,
  status,
  statusLabel,
  title,
}) {
  const Container = onPress ? Pressable : View;
  const isSubastado = status === 'sold' || status === 'subastado' || String(statusLabel).toLowerCase().includes('subastad') || String(statusLabel).toLowerCase().includes('vendid');

  return (
    <Container
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={
        onPress
          ? ({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]
          : styles.card
      }
    >
      <View style={styles.imageFrame}>
        {imageSource ? (
          <Image resizeMode="contain" source={imageSource} style={styles.image} />
        ) : null}
        {isSubastado ? (
          <SubastadoStamp style={{ borderRadius: 4 }} textStyle={{ fontSize: 13 }} />
        ) : null}
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {owner ? <Text style={styles.owner}>Publicado por @{owner}</Text> : null}

        <View style={styles.statusRow}>
          <Text style={styles.statusPrefix}>Estado:</Text>
          <View style={[styles.badge, STATUS_STYLES[status]]}>
            <Text style={styles.badgeText}>{statusLabel}</Text>
          </View>
        </View>

        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'stretch',
    backgroundColor: 'rgba(242, 211, 200, 0.62)',
    borderRadius: 8,
    flexDirection: 'row',
    maxWidth: 370,
    minHeight: 176,
    overflow: 'hidden',
    padding: 12,
    width: '100%',
  },
  cardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.992 }],
  },
  imageFrame: {
    alignItems: 'center',
    backgroundColor: 'rgba(252, 235, 219, 0.72)',
    borderRadius: 4,
    flexShrink: 0,
    height: 152,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 112,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  content: {
    flex: 1,
    paddingLeft: 13,
    paddingVertical: 2,
  },
  title: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 20,
  },
  owner: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  statusRow: {
    alignItems: 'center',
    columnGap: 7,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 13,
  },
  statusPrefix: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.white,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 15,
  },
  description: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 13,
  },
});
