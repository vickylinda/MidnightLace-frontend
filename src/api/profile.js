import { appendPickedFile } from './files';
import { apiFetch } from './http';

export function mapProfileToAddress(profile = {}) {
  return {
    addressLine: '',
    apartment: profile.departamento || '',
    country: profile.pais?.nombre || '',
    displayAddressLine: [
      [profile.direccion, profile.altura].filter(Boolean).join(' '),
      profile.localidad,
      profile.ciudad,
      profile.pais?.nombre,
    ]
      .filter(Boolean)
      .join(', '),
    latitude: null,
    locality: profile.localidad || '',
    longitude: null,
    number: profile.altura || '',
    postalCode: '',
    province: profile.ciudad || '',
    street: profile.direccion || '',
  };
}

export async function getProfile() {
  return apiFetch('/v1/perfil', {
    method: 'GET',
  });
}

export async function updateProfile({
  address,
  countryId,
  dniBack,
  dniFront,
  profilePhoto,
}) {
  const formData = new FormData();

  if (address) {
    formData.append('direccion', address.street.trim());
    formData.append('altura', address.number.trim());
    formData.append('localidad', address.locality.trim());
    formData.append('ciudad', (address.province || address.locality).trim());
    if (countryId) {
      formData.append('idPais', String(countryId));
    }

    if (address.apartment?.trim()) {
      formData.append('departamento', address.apartment.trim());
    }
  }

  appendPickedFile(formData, 'fotoDocFrente', dniFront, 'dni-frente.jpg');
  appendPickedFile(formData, 'fotoDocDorso', dniBack, 'dni-dorso.jpg');
  appendPickedFile(formData, 'fotoPerfil', profilePhoto, 'foto-perfil.jpg');

  return apiFetch('/v1/perfil', {
    body: formData,
    method: 'PATCH',
  });
}
