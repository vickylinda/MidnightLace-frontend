import { useMemo } from 'react';
import {
  Image,
  PanResponder,
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
const BOTTOM_NAV_CONTENT_HEIGHT = 64;
const BOTTOM_NAV_MIN_BOTTOM_PADDING = 5;

export default function AppLayout({
  activeNavItem = 'inicio',
  children,
  onBackPress,
  onNavItemPress,
  enableSwipeBack = true,
  showLogo = true,
  showNotifications = true,
  variant = 'auth',
}) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const canSwipeBack = enableSwipeBack && typeof onBackPress === 'function';
  const swipeBackEdgeWidth = Math.min(48, Math.max(30, width * 0.1));
  const topBarHeight = TOP_BAR_HEIGHT + insets.top;
  const bottomNavHeight =
    BOTTOM_NAV_CONTENT_HEIGHT +
    Math.max(insets.bottom, BOTTOM_NAV_MIN_BOTTOM_PADDING);

  const bottomInset = variant === 'app' ? bottomNavHeight : 0;

  const contentHeight = Math.max(
    height - topBarHeight - bottomInset,
    0
  );

  const patternSize = Math.max(
    width * (902 / 402),
    contentHeight + width * 0.2
  );

  const swipeBackResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          canSwipeBack &&
          gestureState.x0 <= swipeBackEdgeWidth &&
          gestureState.dx > 8 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.4,
        onPanResponderRelease: (_, gestureState) => {
          if (
            gestureState.dx > 76 &&
            Math.abs(gestureState.dy) < 70
          ) {
            onBackPress();
          }
        },
        onPanResponderTerminationRequest: () => true,
      }),
    [canSwipeBack, onBackPress, swipeBackEdgeWidth]
  );

  return (
    <View style={styles.outer}>
      <View
        style={styles.screen}
        {...(canSwipeBack ? swipeBackResponder.panHandlers : {})}
      >
        <TopBar
          onBackPress={onBackPress}
          showLogo={showLogo}
          showNotifications={showNotifications}
        />

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
