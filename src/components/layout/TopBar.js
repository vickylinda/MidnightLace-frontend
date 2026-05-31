import { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

const TOP_BAR_HEIGHT = 86;
const LOGO_RATIO = 965 / 258;
const HORIZONTAL_PADDING = 20;
const SIDE_SLOT_WIDTH = 50;

const mockNotifications = [
  {
    id: 'private-payment-message',
    text: 'Ganaste un producto en la subasta Gothic Night. Tenes mas informacion en Mi actividad > Compras realizadas.',
    time: 'Hoy · 20:18',
    title: 'Producto ganado',
    unread: true,
  },
  {
    id: 'outbid',
    text: 'Tu puja en Sweet Dreams fue superada. Podes ofertar nuevamente si la subasta sigue abierta.',
    time: 'Hoy · 18:42',
    title: 'Puja superada',
    unread: true,
  },
  {
    id: 'payment-verified',
    text: 'Tu tarjeta Visa terminada en 1234 fue verificada y ya puede usarse para pujar.',
    time: 'Ayer · 11:05',
    title: 'Medio de pago verificado',
    unread: false,
  },
  {
    id: 'penalty',
    text: 'Tenes una multa pendiente del 10% por incumplimiento de pago. Debe abonarse para participar en nuevas subastas.',
    time: '15/05 · 09:30',
    title: 'Multa pendiente',
    unread: false,
  },
  {
    id: 'registration',
    text: 'Recibiste el mail para ingresar a la app, completar el registro y generar tu clave personal.',
    time: '12/05 · 16:20',
    title: 'Registro autorizado',
    unread: false,
  },
];

function BackIcon() {
  return (
    <Svg width={36} height={36} viewBox="0 0 36 36" fill="none">
      <Path
        d="M22.5 8L12.5 18L22.5 28"
        stroke={colors.cream}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
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

export default function TopBar({
  onBackPress,
  showLogo = true,
  showNotifications = true,
}) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const canGoBack = typeof onBackPress === 'function';
  const unreadCount = mockNotifications.filter((notification) => notification.unread).length;
  const notificationsTop = insets.top + TOP_BAR_HEIGHT - 6;
  const notificationsMaxHeight = Math.max(240, height - notificationsTop - 18);
  const availableLogoWidth =
    width - HORIZONTAL_PADDING * 2 - SIDE_SLOT_WIDTH * 2;
  const logoWidth = Math.min(
    Math.max(width * 0.62, 215),
    availableLogoWidth,
    320
  );
  const logoHeight = logoWidth / LOGO_RATIO;

  return (
    <View style={[styles.wrapper, { height: TOP_BAR_HEIGHT + insets.top }]}>
      <View
        style={[
          styles.container,
          {
            height: TOP_BAR_HEIGHT + insets.top,
            paddingTop: insets.top,
          },
        ]}
      >
        {canGoBack ? (
          <Pressable
            accessibilityLabel="Volver"
            accessibilityRole="button"
            hitSlop={10}
            onPress={onBackPress}
            style={styles.sideSlot}
          >
            <BackIcon />
          </Pressable>
        ) : (
          <View style={styles.sideSlot} />
        )}

        <View style={styles.logoSlot}>
          {showLogo ? (
            <Image
              source={require('../../assets/brand/midnight-lace-logo.png')}
              tintColor={colors.cream}
              style={[
                styles.logo,
                {
                  height: logoHeight,
                  width: logoWidth,
                },
              ]}
              resizeMode="contain"
            />
          ) : null}
        </View>

        {showNotifications ? (
          <Pressable
            accessibilityLabel="Abrir notificaciones"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => setIsNotificationsOpen(true)}
            style={styles.sideSlot}
          >
            <NotificationIcon />
            {unreadCount > 0 ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : (
          <View style={styles.sideSlot} />
        )}
      </View>

      {showNotifications ? (
        <Modal
          animationType="fade"
          onRequestClose={() => setIsNotificationsOpen(false)}
          transparent
          visible={isNotificationsOpen}
        >
          <View style={styles.notificationsOverlay}>
            <Pressable
              accessibilityLabel="Cerrar notificaciones"
              accessibilityRole="button"
              onPress={() => setIsNotificationsOpen(false)}
              style={styles.notificationsBackdrop}
            />
            <View
              style={[
                styles.notificationsPopover,
                {
                  maxHeight: notificationsMaxHeight,
                  maxWidth: Math.min(width - 28, 380),
                  right: HORIZONTAL_PADDING,
                  top: notificationsTop,
                },
              ]}
            >
              <View style={styles.notificationsHeader}>
                <View>
                  <Text style={styles.notificationsTitle}>Notificaciones</Text>
                  <Text style={styles.notificationsSubtitle}>
                    {unreadCount} nuevas
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Cerrar notificaciones"
                  accessibilityRole="button"
                  onPress={() => setIsNotificationsOpen(false)}
                  style={styles.notificationsClose}
                >
                  <Text style={styles.notificationsCloseText}>x</Text>
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={styles.notificationsList}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                style={styles.notificationsScroller}
              >
                {mockNotifications.map((notification) => (
                  <View
                    key={notification.id}
                    style={[
                      styles.notificationItem,
                      notification.unread ? styles.notificationItemUnread : null,
                    ]}
                  >
                    <View
                      style={[
                        styles.notificationDot,
                        notification.unread ? styles.notificationDotUnread : null,
                      ]}
                    />
                    <View style={styles.notificationCopy}>
                      <View style={styles.notificationTitleRow}>
                        <Text style={styles.notificationTitle}>{notification.title}</Text>
                        <Text style={styles.notificationTime}>{notification.time}</Text>
                      </View>
                      <Text style={styles.notificationText}>{notification.text}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    zIndex: 10,
  },
  container: {
    alignItems: 'center',
    backgroundColor: colors.burgundy,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    width: '100%',
  },
  sideSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    width: SIDE_SLOT_WIDTH,
  },
  notificationBadge: {
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderColor: colors.burgundy,
    borderRadius: 999,
    borderWidth: 1,
    height: 20,
    justifyContent: 'center',
    minWidth: 20,
    paddingHorizontal: 4,
    position: 'absolute',
    right: 3,
    top: 13,
  },
  notificationBadgeText: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 13,
  },
  logoSlot: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
  },
  notificationsOverlay: {
    flex: 1,
  },
  notificationsBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  notificationsPopover: {
    backgroundColor: colors.cream,
    borderColor: 'rgba(159, 2, 29, 0.32)',
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: 430,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 8,
    position: 'absolute',
    boxShadow: '0 8px 16px rgba(45, 0, 8, 0.18)',
    width: '100%',
  },
  notificationsScroller: {
    flexShrink: 1,
  },
  notificationsHeader: {
    alignItems: 'center',
    borderBottomColor: 'rgba(138, 74, 58, 0.22)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 9,
  },
  notificationsTitle: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 23,
  },
  notificationsSubtitle: {
    color: colors.mutedRose,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  notificationsClose: {
    alignItems: 'center',
    borderRadius: 999,
    height: 31,
    justifyContent: 'center',
    width: 31,
  },
  notificationsCloseText: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 22,
  },
  notificationsList: {
    paddingTop: 5,
  },
  notificationItem: {
    alignItems: 'flex-start',
    borderBottomColor: 'rgba(138, 74, 58, 0.14)',
    borderBottomWidth: 1,
    columnGap: 9,
    flexDirection: 'row',
    paddingVertical: 10,
  },
  notificationItemUnread: {
    backgroundColor: 'rgba(159, 2, 29, 0.06)',
    borderRadius: 10,
    marginHorizontal: -5,
    paddingHorizontal: 5,
  },
  notificationDot: {
    backgroundColor: 'rgba(138, 74, 58, 0.25)',
    borderRadius: 999,
    height: 8,
    marginTop: 6,
    width: 8,
  },
  notificationDotUnread: {
    backgroundColor: colors.burgundy,
  },
  notificationCopy: {
    flex: 1,
    minWidth: 0,
  },
  notificationTitleRow: {
    columnGap: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notificationTitle: {
    color: colors.cocoa,
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 18,
  },
  notificationTime: {
    color: colors.mutedRose,
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 15,
  },
  notificationText: {
    color: colors.cocoa,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
});
