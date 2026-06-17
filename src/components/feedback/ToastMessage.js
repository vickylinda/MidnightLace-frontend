import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

const BOTTOM_NAV_OFFSET = 82;

export default function ToastMessage({
  duration = 2600,
  message,
  onDismiss,
}) {
  const insets = useSafeAreaInsets();
  const onDismissRef = useRef(onDismiss);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    opacity.setValue(0);
    translateY.setValue(28);

    Animated.parallel([
      Animated.timing(opacity, {
        duration: 180,
        toValue: 1,
        useNativeDriver: false,
      }),
      Animated.timing(translateY, {
        duration: 180,
        toValue: 0,
        useNativeDriver: false,
      }),
    ]).start();

    const hideTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          duration: 180,
          toValue: 0,
          useNativeDriver: false,
        }),
        Animated.timing(translateY, {
          duration: 180,
          toValue: 28,
          useNativeDriver: false,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          onDismissRef.current?.();
        }
      });
    }, duration);

    return () => clearTimeout(hideTimer);
  }, [duration, message, opacity, translateY]);

  if (!message) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          bottom: Math.max(insets.bottom, 8) + BOTTOM_NAV_OFFSET,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.burgundy,
    borderColor: 'rgba(252, 235, 219, 0.72)',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 24,
    left: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'absolute',
    right: 20,
    zIndex: 1000,
  },
  text: {
    color: colors.cream,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 19,
    textAlign: 'center',
  },
});
