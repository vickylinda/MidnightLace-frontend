import { apiFetch } from '../utils/http';

export function listPaymentMethods() {
  return apiFetch('/v1/medios-de-pago?pagina=1&cantidad=100');
}

export function createPaymentMethod(payload) {
  return apiFetch('/v1/medios-de-pago', {
    body: payload,
    method: 'POST',
  });
}

export function updatePaymentMethod(paymentId, payload) {
  return apiFetch(`/v1/medios-de-pago/${paymentId}`, {
    body: payload,
    method: 'PATCH',
  });
}

export function deletePaymentMethod(paymentId) {
  return apiFetch(`/v1/medios-de-pago/${paymentId}`, {
    method: 'DELETE',
  });
}

export function listCountries() {
  return apiFetch('/v1/paises?pagina=1&cantidad=100', {
    auth: false,
  });
}
