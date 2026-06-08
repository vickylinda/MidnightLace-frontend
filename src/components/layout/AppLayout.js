import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  findNodeHandle,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
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
const KEYBOARD_INPUT_EXTRA_OFFSET = 180;

export default function AppLayout({
  activeNavItem = 'inicio',
  children,
  floatingAction,
  isBottomNavigationInteractive = true,
  onBackPress,
  onNavItemPress,
  enableSwipeBack = true,
  showLogo = true,
  showNotifications = true,
  variant = 'auth',
}) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef(null);
  const isDraggingScrollRef = useRef(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const canSwipeBack = enableSwipeBack && typeof onBackPress === 'function';
  const swipeBackEdgeWidth = Math.min(48, Math.max(30, width * 0.1));
  const topBarHeight = TOP_BAR_HEIGHT + insets.top;
  const bottomNavHeight =
    BOTTOM_NAV_CONTENT_HEIGHT +
    Math.max(insets.bottom, BOTTOM_NAV_MIN_BOTTOM_PADDING);

  const bottomInset = variant === 'app' ? bottomNavHeight : 0;
  const keyboardBehavior =
    Platform.OS === 'ios'
      ? 'padding'
      : Platform.OS === 'android'
      ? 'height'
      : undefined;

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

  const scrollFocusedInputAboveKeyboard = useCallback(() => {
    if (Platform.OS === 'web') {
      return;
    }

    requestAnimationFrame(() => {
      const focusedInput = TextInput.State.currentlyFocusedInput?.();
      if (!focusedInput) {
        return;
      }

      const scrollResponder = scrollViewRef.current?.getScrollResponder?.();
      const focusedHandle = findNodeHandle(focusedInput);

      if (
        focusedHandle &&
        scrollResponder?.scrollResponderScrollNativeHandleToKeyboard
      ) {
        scrollResponder.scrollResponderScrollNativeHandleToKeyboard(
          focusedHandle,
          KEYBOARD_INPUT_EXTRA_OFFSET,
          true
        );
      }
    });
  }, []);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
      setTimeout(
        scrollFocusedInputAboveKeyboard,
        Platform.OS === 'ios' ? 120 : 220
      );
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [scrollFocusedInputAboveKeyboard]);

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

        <KeyboardAvoidingView
          behavior={keyboardBehavior}
          keyboardVerticalOffset={0}
          style={styles.keyboardAvoider}
        >
          <ScrollView
            ref={scrollViewRef}
            bounces={false}
            contentContainerStyle={[
              styles.content,
              {
                minHeight: contentHeight,
                paddingBottom: variant === 'app' ? bottomInset + 18 : 0,
              },
            ]}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            onMomentumScrollEnd={() => {
              isDraggingScrollRef.current = false;
            }}
            onScrollBeginDrag={() => {
              isDraggingScrollRef.current = true;
            }}
            onScrollEndDrag={() => {
              setTimeout(() => {
                isDraggingScrollRef.current = false;
              }, 220);
            }}
            onTouchEnd={() => {
              if (isKeyboardVisible && !isDraggingScrollRef.current) {
                setTimeout(scrollFocusedInputAboveKeyboard, 80);
              }
            }}
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

            {variant !== 'app' && isKeyboardVisible ? (
              <View style={styles.keyboardScrollSpacer} />
            ) : null}

            {variant !== 'app' ? (
              <Image
                source={require('../../assets/decor/puntilla.png')}
                style={styles.bottomLace}
                resizeMode="stretch"
              />
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>

        {variant === 'app' ? (
          <BottomNavigation
            activeItem={activeNavItem}
            isInteractive={isBottomNavigationInteractive}
            onItemPress={onNavItemPress}
          />
        ) : null}

        {floatingAction ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.floatingAction,
              {
                bottom: bottomInset + 18,
                right: 18,
              },
            ]}
          >
            {floatingAction}
          </View>
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
  keyboardAvoider: {
    flex: 1,
    zIndex: 2,
  },
  content: {
    flexGrow: 1,
    overflow: 'hidden',
  },
  childrenWrapper: {
    flex: 1,
    paddingBottom: 50,
  },
  keyboardScrollSpacer: {
    height: 160,
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
    pointerEvents: 'none',
    transform: [{ rotate: '180deg' }],
    width: '100%',
  },
  floatingAction: {
    position: 'absolute',
    zIndex: 14,
  },
});
