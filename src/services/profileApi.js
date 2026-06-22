import { Platform } from 'react-native';

import { apiFetch } from '../utils/http';

export function getProfile() {
  return apiFetch('/v1/perfil');
}

export function updateProfile(formData) {
  return apiFetch('/v1/perfil', {
    body: formData,
    method: 'PATCH',
  });
}

export function changePassword(currentPassword, newPassword) {
  return apiFetch('/v1/auth/cambiar-clave', {
    body: {
      claveActual: currentPassword,
      claveNueva: newPassword,
    },
    method: 'POST',
  });
}

export async function toUploadValue(file, fallbackName = 'archivo.jpg') {
  if (!file?.uri) {
    return null;
  }

  if (Platform.OS === 'web') {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    return new File([blob], file.name || fallbackName, {
      type: file.mimeType || blob.type || 'image/jpeg',
    });
  }

  return {
    name: file.name || fallbackName,
    type: file.mimeType || 'image/jpeg',
    uri: file.uri,
  };
}
