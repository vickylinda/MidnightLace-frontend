import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'ml_session';

let _session = null;

export function getAccessToken() {
  return _session?.tokenAcceso ?? null;
}

export function getRefreshToken() {
  return _session?.tokenRenovacion ?? null;
}

export function getSession() {
  return _session;
}

export function setSession(session) {
  _session = session;
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session)).catch(() => {});
}

export function clearSession() {
  _session = null;
  AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

export async function loadSession() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      _session = JSON.parse(raw);
    }
  } catch {
    _session = null;
  }
  return _session;
}
