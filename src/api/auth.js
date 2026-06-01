import { appendPickedFile } from './files';
import { apiFetch } from './http';
import { setSession } from './session';

export async function loginUser({ email, password }) {
  const session = await apiFetch('/v1/auth/login', {
    auth: false,
    body: {
      clave: password,
      email: email.trim(),
    },
    method: 'POST',
  });

  setSession(session);

  return session;
}

export async function recoverPassword(email) {
  return apiFetch('/v1/auth/recuperar-clave', {
    auth: false,
    body: {
      email: email.trim(),
    },
    method: 'POST',
  });
}

export async function confirmPassword({ password, token }) {
  const session = await apiFetch('/v1/auth/confirmar', {
    auth: false,
    body: {
      clave: password,
      token,
    },
    method: 'POST',
  });

  setSession(session);

  return session;
}

export async function changePassword({ currentPassword, newPassword }) {
  return apiFetch('/v1/auth/cambiar-clave', {
    body: {
      claveActual: currentPassword,
      claveNueva: newPassword,
    },
    method: 'POST',
  });
}

export async function registerUser({
  address,
  countryId,
  dniFiles,
  documentNumber,
  email,
  firstName,
  lastName,
  profilePhoto,
  username,
}) {
  const formData = new FormData();
  const [dniFront, dniBack] = dniFiles;

  formData.append('documento', documentNumber.trim());
  formData.append('nombre', firstName.trim());
  formData.append('apellido', lastName.trim());
  formData.append('email', email.trim());
  formData.append('nombreUsuario', username.trim());
  formData.append('direccion', address.street.trim());
  formData.append('altura', address.number.trim());
  formData.append('localidad', address.locality.trim());
  formData.append('ciudad', (address.province || address.locality).trim());
  formData.append('idPais', String(countryId));

  if (address.apartment?.trim()) {
    formData.append('departamento', address.apartment.trim());
  }

  appendPickedFile(formData, 'fotoDocFrente', dniFront, 'dni-frente.jpg');
  appendPickedFile(formData, 'fotoDocDorso', dniBack, 'dni-dorso.jpg');
  appendPickedFile(formData, 'fotoPerfil', profilePhoto, 'foto-perfil.jpg');

  return apiFetch('/v1/auth/registro', {
    auth: false,
    body: formData,
    method: 'POST',
  });
}
