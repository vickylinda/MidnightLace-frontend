import React, { createContext, useContext, useRef, useState } from 'react';

import { apiFetch } from '../utils/http';
import { getAccessToken, getSession } from '../utils/session';
import { connectUserSocket } from '../utils/ws';

const NotificationsContext = createContext(null);
const NOTIFICATION_ROLES = ['cliente', 'comprador', 'dueno', 'duenio', 'empleado'];

function canUseNotifications() {
  const roles = getSession()?.roles || [];
  return roles.some((role) => NOTIFICATION_ROLES.includes(role));
}

function isPermissionError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.status === 401 ||
    error?.status === 403 ||
    message.includes('permisos') ||
    message.includes('no autenticado')
  );
}

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [lastEvent, setLastEvent] = useState(null);
  const lastNotificationIdRef = useRef(null);
  const socketOpenedRef = useRef(false);
  const socketRef = useRef(null);

  const unreadCount = notifications.filter((n) => n.leida === 'no').length;

  function eventFromNotification(notification) {
    return {
      datos: notification?.detalle || {},
      evento: notification?.tipo,
      notificationId: notification?.identificador,
      receivedAt: Date.now(),
    };
  }

  async function refetch({ emitLatest = true, quiet = false } = {}) {
    if (!getAccessToken() || !canUseNotifications()) {
      setNotifications([]);
      return;
    }

    try {
      const data = await apiFetch('/v1/mi/notificaciones?cantidad=50');
      const nextNotifications = data.datos ?? [];
      const latest = nextNotifications[0] || null;

      setNotifications(nextNotifications);

      if (
        emitLatest &&
        latest?.identificador &&
        latest.identificador !== lastNotificationIdRef.current
      ) {
        lastNotificationIdRef.current = latest.identificador;
        setLastEvent(eventFromNotification(latest));
      }
    } catch (e) {
      if (isPermissionError(e)) {
        setNotifications([]);
        return;
      }

      if (!quiet) {
        console.warn('[notifications] refetch failed:', e?.message ?? e);
      }
    }
  }

  async function markAsRead(id) {
    try {
      await apiFetch(`/v1/mi/notificaciones/${id}`, {
        method: 'PATCH',
        body: { leida: true },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.identificador === id ? { ...n, leida: 'si' } : n))
      );
    } catch {}
  }

  function connect() {
    if (!getAccessToken() || socketRef.current || !canUseNotifications()) return;
    socketOpenedRef.current = false;
    refetch({ emitLatest: false, quiet: true });
    const socket = connectUserSocket((event) => {
      setLastEvent({ ...event, receivedAt: Date.now() });
      refetch({ quiet: true });
    }, {
      onOpen: () => {
        if (socketOpenedRef.current) {
          refetch({ emitLatest: false, quiet: true });
          return;
        }

        socketOpenedRef.current = true;
      },
    });
    socketRef.current = socket;
  }

  function disconnect() {
    socketRef.current?.close();
    socketRef.current = null;
    socketOpenedRef.current = false;
    lastNotificationIdRef.current = null;
    setLastEvent(null);
    setNotifications([]);
  }

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, lastEvent, markAsRead, refetch, connect, disconnect }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
