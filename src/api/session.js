import { Platform } from 'react-native';

const STORAGE_KEY = 'midnightlace.session';

let currentSession = null;

function canUseWebStorage() {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    typeof window.localStorage !== 'undefined'
  );
}

function readStoredSession() {
  if (!canUseWebStorage()) {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);

    return storedValue ? JSON.parse(storedValue) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session) {
  if (!canUseWebStorage()) {
    return;
  }

  try {
    if (session) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable in private browsing or restricted webviews.
  }
}

export function getSession() {
  if (!currentSession) {
    currentSession = readStoredSession();
  }

  return currentSession;
}

export function setSession(session) {
  currentSession = session || null;
  writeStoredSession(currentSession);
}

export function clearSession() {
  currentSession = null;
  writeStoredSession(null);
}

export function getAccessToken() {
  return getSession()?.tokenAcceso || '';
}

export function getRefreshToken() {
  return getSession()?.tokenRenovacion || '';
}
