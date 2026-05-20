import {
  Image,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';
import BottomNavigation from './BottomNavigation';
import TopBar from './TopBar';

const TOP_BAR_HEIGHT = 86;
const LACE_HEIGHT = 30;
const BOTTOM_NAV_HEIGHT = 86;

export default function AppLayout({
  activeNavItem = 'inicio',
  children,
  onNavItemPress,
  showLogo = true,
  variant = 'auth',
}) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const topBarHeight = TOP_BAR_HEIGHT + insets.top;
  const bottomNavHeight = BOTTOM_NAV_HEIGHT + insets.bottom;

  const bottomInset = variant === 'app' ? bottomNavHeight : 0;

  const contentHeight = Math.max(
    height - topBarHeight - bottomInset,
    0
  );

  const patternSize = Math.max(
    width * (902 / 402),
    contentHeight + width * 0.2
  );

  return (
    <View style={styles.outer}>
      <View style={styles.screen}>
        <TopBar showLogo={showLogo} />

        <Image
          source={require('../../assets/decor/login-ornament.png')}
          style={[
            styles.backgroundPattern,
            {
              height: patternSize,
              left: width * (-253 / 402),
              top: topBarHeight + width * (-28 / 402),
              width: patternSize,
            },
          ]}
          resizeMode="stretch"
        />

        <ScrollView
          bounces={false}
          contentContainerStyle={[
            styles.content,
            {
              minHeight: contentHeight,
              paddingBottom: variant === 'app' ? bottomInset + 18 : 0,
            },
          ]}
          style={styles.scroller}
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={require('../../assets/decor/puntilla.png')}
            style={styles.topLace}
            resizeMode="stretch"
          />

          <View style={styles.childrenWrapper}>
            {children}
          </View>

          {variant !== 'app' ? (
            <Image
              source={require('../../assets/decor/puntilla.png')}
              style={styles.bottomLace}
              resizeMode="stretch"
            />
          ) : null}
        </ScrollView>

        {variant === 'app' ? (
          <BottomNavigation
            activeItem={activeNavItem}
            onItemPress={onNavItemPress}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: '#F7EAF0',
    flex: 1,
  },
  screen: {
    backgroundColor: colors.cream,
    flex: 1,
    overflow: 'hidden',
  },
  scroller: {
    flex: 1,
    zIndex: 2,
  },
  content: {
    flexGrow: 1,
    overflow: 'hidden',
  },
  childrenWrapper: {
    flex: 1,
  },
  topLace: {
    height: LACE_HEIGHT,
    pointerEvents: 'none',
    width: '100%',
    zIndex: 9,
  },
  backgroundPattern: {
    opacity: 0.5,
    pointerEvents: 'none',
    position: 'absolute',
    zIndex: 0,
  },
  bottomLace: {
    height: LACE_HEIGHT,
    marginTop: 30,
    pointerEvents: 'none',
    transform: [{ rotate: '180deg' }],
    width: '100%',
    zIndex: 12,
  },
});
