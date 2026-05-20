const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9._]+$/;

export function validateEmail(value) {
  const email = value.trim();

  if (!email) {
    return 'Ingresá tu email.';
  }

  if (!EMAIL_PATTERN.test(email)) {
    return 'Ingresá un email válido, con @ y dominio.';
  }

  return '';
}

export function validatePassword(value) {
  if (!value) {
    return 'Ingresá tu contraseña.';
  }

  const hasMinLength = value.length >= 8;
  const hasUppercase = /[A-Z]/.test(value);
  const hasLowercase = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);

  if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
    return 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.';
  }

  return '';
}

export function validateUsername(value) {
  const username = value.trim();

  if (!username) {
    return 'Ingresá tu nombre de usuario.';
  }

  if (username.length < 4) {
    return 'El nombre de usuario debe tener al menos 4 caracteres.';
  }

  if (!USERNAME_PATTERN.test(username)) {
    return 'Usá solo letras, números, puntos o guiones bajos.';
  }

  return '';
}
