import { Image, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../../theme/colors';

function MenuIcon() {
  return (
    <Svg width={36} height={36} viewBox="0 0 36 36" fill="none">
      <Path
        d="M7 9H29M7 18H29M7 27H29"
        stroke={colors.cream}
        strokeWidth={4.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function NotificationIcon() {
  return (
    <Svg width={36} height={36} viewBox="0 0 36 36" fill="none">
      <Path
        d="M18 31.5C20.05 31.5 21.75 30.08 22.2 28.15H13.8C14.25 30.08 15.95 31.5 18 31.5Z"
        fill={colors.cream}
      />
      <Path
        d="M29.5 25.2C27.75 23.55 26.8 21.38 26.8 19.05V15.2C26.8 10.72 23.78 6.95 19.75 5.85C19.45 5 18.78 4.5 18 4.5C17.22 4.5 16.55 5 16.25 5.85C12.22 6.95 9.2 10.72 9.2 15.2V19.05C9.2 21.38 8.25 23.55 6.5 25.2C5.82 25.84 6.28 27 7.23 27H28.77C29.72 27 30.18 25.84 29.5 25.2Z"
        fill={colors.cream}
      />
    </Svg>
  );
}

export default function TopBar() {
  return (
    <View style={styles.container}>
      <MenuIcon />
      <Image
        source={require('../../assets/brand/midnight-lace-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <NotificationIcon />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.burgundy,
    flexDirection: 'row',
    height: 120,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 34,
    width: '100%',
  },
  logo: {
    height: 68,
    tintColor: colors.cream,
    transform: [{ translateX: -2 }],
    width: 240,
  },
});
