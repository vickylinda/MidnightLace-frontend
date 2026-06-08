import { API_BASE_URL, API_KEY } from './config';
import {
  getAccessToken,
  getRefreshToken,
  setSession,
} from './session';

function isFormData(body) {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(payload, fallback) {
  if (typeof payload === 'string') {
    return payload;
  }

  if (Array.isArray(payload?.detalle)) {
    return payload.detalle.join('\n');
  }

  if (typeof payload?.detail === 'string') {
    return payload.detail;
  }

  if (Array.isArray(payload?.detail)) {
    return payload.detail
      .map((detail) => detail?.msg || detail?.message || String(detail))
      .join('\n');
  }

  return (
    payload?.mensaje ||
    payload?.detail?.mensaje ||
    payload?.message ||
    fallback
  );
}

async function refreshSession() {
  const tokenRenovacion = getRefreshToken();

  if (!tokenRenovacion) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/v1/auth/renovar`, {
    body: JSON.stringify({ tokenRenovacion }),
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY ? { 'X-Api-Key': API_KEY } : {}),
    },
    method: 'POST',
  });

  if (!response.ok) {
    return null;
  }

  const session = await parseResponse(response);
  setSession(session);

  return session;
}

export async function apiFetch(path, options = {}) {
  const {
    auth = true,
    body,
    headers,
    retryOnUnauthorized = true,
    ...fetchOptions
  } = options;
  const requestHeaders = {
    ...(API_KEY ? { 'X-Api-Key': API_KEY } : {}),
    ...(headers || {}),
  };
  const requestBody = isFormData(body)
    ? body
    : body === undefined
    ? undefined
    : JSON.stringify(body);

  if (body !== undefined && !isFormData(body)) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = getAccessToken();

    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    body: requestBody,
    headers: requestHeaders,
  });

  if (response.status === 401 && auth && retryOnUnauthorized) {
    const refreshedSession = await refreshSession();

    if (refreshedSession?.tokenAcceso) {
      return apiFetch(path, {
        ...options,
        retryOnUnauthorized: false,
      });
    }
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    const error = new Error(
      getErrorMessage(payload, 'No pudimos completar la operacion.')
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function getApiErrorMessage(error, fallback) {
  return error?.message || fallback || 'No pudimos completar la operacion.';
}
