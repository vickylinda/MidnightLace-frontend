import { StatusBar } from 'expo-status-bar';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';

import RadialGradientBackground from '../components/RadialGradientBackground';

const LOGO_RATIO = 965 / 258;

export default function SplashScreen() {
  const { width } = useWindowDimensions();
  const logoWidth = width * 0.985;
  const logoHeight = logoWidth / LOGO_RATIO;

  return (
    <RadialGradientBackground>
      <StatusBar style="light" />
      <View style={styles.content}>
        <Image
          source={require('../assets/brand/midnight-lace-logo.png')}
          tintColor="#9F021D"
          style={[
            styles.logo,
            {
              width: logoWidth,
              height: logoHeight,
              transform: [{ translateX: -4 }],
            },
          ]}
          resizeMode="contain"
        />
      </View>
    </RadialGradientBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    transform: [{ translateY: -6 }],
  },
  logo: {},
});
