import { apiFetch } from '../utils/http';

export function listAdminClients(params = {}) {
  const search = new URLSearchParams({
    pagina: String(params.pagina || 1),
    cantidad: String(params.cantidad || 50),
  });

  if (params.admitido) {
    search.set('admitido', params.admitido);
  }

  if (params.categoria) {
    search.set('categoria', params.categoria);
  }

  return apiFetch(`/v1/admin/clientes?${search.toString()}`);
}

export function verifyAdminClient(clientId, payload) {
  return apiFetch(`/v1/admin/clientes/${clientId}/verificar`, {
    body: payload,
    method: 'POST',
  });
}

export function updateAdminClient(clientId, payload) {
  return apiFetch(`/v1/admin/clientes/${clientId}`, {
    body: payload,
    method: 'PATCH',
  });
}

export function listAdminPaymentMethods(params = {}) {
  const search = new URLSearchParams({
    pagina: String(params.pagina || 1),
    cantidad: String(params.cantidad || 50),
  });

  if (params.verificado) {
    search.set('verificado', params.verificado);
  }

  return apiFetch(`/v1/admin/medios-pago?${search.toString()}`);
}

export function listAdminProducts(params = {}) {
  const search = new URLSearchParams({
    pagina: String(params.pagina || 1),
    cantidad: String(params.cantidad || 50),
  });

  if (params.estado) {
    search.set('estado', params.estado);
  }

  return apiFetch(`/v1/admin/productos?${search.toString()}`);
}

export function verifyAdminProduct(productId, payload) {
  return apiFetch(`/v1/admin/productos/${productId}/verificar`, {
    body: payload,
    method: 'POST',
  });
}

export function verifyPaymentMethod(paymentId) {
  return apiFetch(`/v1/medios-de-pago/${paymentId}/verificar`, {
    method: 'POST',
  });
}
