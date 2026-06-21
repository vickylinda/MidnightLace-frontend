import React, { createContext, useContext, useRef, useState } from 'react';

import { apiFetch } from '../utils/http';
import { getAccessToken } from '../utils/session';
import { connectUserSocket } from '../utils/ws';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  const unreadCount = notifications.filter((n) => n.leida === 'no').length;

  async function refetch() {
    try {
      const data = await apiFetch('/v1/mi/notificaciones?cantidad=50');
      setNotifications(data.datos ?? []);
    } catch (e) {
      console.error('[notifications] refetch failed:', e?.message ?? e);
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
    if (!getAccessToken() || socketRef.current) return;
    refetch();
    const socket = connectUserSocket(() => refetch());
    socketRef.current = socket;
  }

  function disconnect() {
    socketRef.current?.close();
    socketRef.current = null;
    setNotifications([]);
  }

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, markAsRead, refetch, connect, disconnect }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
