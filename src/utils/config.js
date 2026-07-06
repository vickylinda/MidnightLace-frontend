export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export const API_KEY = process.env.EXPO_PUBLIC_API_KEY || '';

export const ENVIOSPACK_API_KEY = process.env.EXPO_PUBLIC_ENVIOSPACK_API_KEY || '';
export const ENVIOSPACK_SECRET_KEY = process.env.EXPO_PUBLIC_ENVIOSPACK_SECRET_KEY || '';

export function resolveApiAssetUrl(value) {
  if (!value) {
    return '';
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${API_BASE_URL.replace(/\/$/, '')}/${String(value).replace(/^\//, '')}`;
}
