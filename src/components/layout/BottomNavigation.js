import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

const navItems = [
  { id: 'inicio', icon: HomeIcon, label: 'Inicio' },
  { id: 'subastas', icon: AuctionsIcon, label: 'Subastas' },
  { id: 'catalogo', icon: CatalogIcon, label: 'Catálogo' },
  { id: 'actividad', icon: ActivityIcon, label: 'Actividad' },
  { id: 'perfil', icon: ProfileIcon, label: 'Perfil' },
];
const BOTTOM_NAV_CONTENT_HEIGHT = 64;
const BOTTOM_NAV_MIN_BOTTOM_PADDING = 5;
const BOTTOM_NAV_TOP_PADDING = 4;

function HomeIcon({ color }) {
  return (
    <Svg width={25} height={25} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.5 10.7L12 4.6L19.5 10.7V19.3C19.5 19.85 19.05 20.3 18.5 20.3H14.4V14.2H9.6V20.3H5.5C4.95 20.3 4.5 19.85 4.5 19.3V10.7Z"
        fill={color}
      />
    </Svg>
  );
}

function AuctionsIcon({ color }) {
  return (
    <Svg width={25} height={25} viewBox="0 0 32 32" fill="none">
      <Path
        fill={color}
        d="M11.623 7.603l6.062 3.5c0.479 0.276 1.090 0.112 1.365-0.366 0.277-0.478 0.113-1.090-0.365-1.365l-6.062-3.5c-0.479-0.276-1.090-0.112-1.366 0.365s-0.112 1.089 0.366 1.366zM17.186 11.969l-6.062-3.5-3.5 6.062 6.062 3.5 3.5-6.062zM6.123 17.129l6.062 3.5c0.478 0.276 1.090 0.112 1.365-0.366s0.112-1.090-0.365-1.365l-6.062-3.5c-0.479-0.276-1.090-0.112-1.366 0.365-0.277 0.478-0.112 1.090 0.366 1.366zM27.012 19.951l-11.076-5.817-1 1.732 10.576 6.683c0.717 0.414 1.635 0.169 2.049-0.549s0.168-1.635-0.549-2.049zM16.033 25c0-0.553-0.448-1-1-1h-9c-0.553 0-1 0.447-1 1 0 0.552 0 1 0 1l-1.033-0.021 0.033 1.021h13l0.047-0.958-0.984-0.042c0 0-0.063-0.448-0.063-1z"
      />
    </Svg>
  );
}

function CatalogIcon({ color }) {
  return (
    <Svg width={25} height={25} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 6.5H10V11.5H5V6.5ZM14 6.5H19V11.5H14V6.5ZM5 15H10V20H5V15ZM14 15H19V20H14V15Z"
        stroke={color}
        strokeLinejoin="round"
        strokeWidth={2.2}
      />
    </Svg>
  );
}

function ActivityIcon({ color }) {
  return (
    <Svg width={25} height={25} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={7.5} stroke={color} strokeWidth={2.3} />
      <Path
        d="M12 7.8V12.4L15.1 15"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.3}
      />
    </Svg>
  );
}

function ProfileIcon({ color }) {
  return (
    <Svg width={25} height={25} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8.2} r={3.6} stroke={color} strokeWidth={2.2} />
      <Path
        d="M5.3 20C6.15 16.75 8.7 14.8 12 14.8C15.3 14.8 17.85 16.75 18.7 20"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={2.2}
      />
    </Svg>
  );
}

export default function BottomNavigation({
  activeItem = 'inicio',
  onItemPress,
}) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, BOTTOM_NAV_MIN_BOTTOM_PADDING);

  return (
    <View
      style={[
        styles.wrapper,
        {
          height: BOTTOM_NAV_CONTENT_HEIGHT + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: BOTTOM_NAV_TOP_PADDING,
        },
      ]}
    >
      <View style={styles.container}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeItem;
          const color = isActive ? colors.burgundy : colors.cream;

          return (
            <Pressable
              accessibilityRole="button"
              key={item.id}
              onPress={() => onItemPress?.(item.id)}
              style={[styles.item, isActive ? styles.activeItem : null]}
            >
              <Icon color={color} />

              <Text
                numberOfLines={1}
                style={[styles.label, isActive ? styles.activeLabel : null]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    backgroundColor: colors.burgundy,
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    paddingHorizontal: 14,
    position: 'absolute',
    right: 0,
    zIndex: 12,
  },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  item: {
    alignItems: 'center',
    borderRadius: 28,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 4,
  },
  activeItem: {
    backgroundColor: colors.cream,
    columnGap: 5,
    flexDirection: 'row',
    flexGrow: 1.12,
    minHeight: 38,
    paddingHorizontal: 7,
  },
  label: {
    color: colors.cream,
    fontFamily: fonts.medium,
    fontSize: 10,
    lineHeight: 13,
    marginTop: 3,
  },
  activeLabel: {
    color: colors.burgundy,
    fontFamily: fonts.semiBold,
    fontSize: 13,
    lineHeight: 17,
    marginTop: 0,
  },
});
