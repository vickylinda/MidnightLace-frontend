const ENVIOSPACK_BASE_URL =
  process.env.EXPO_PUBLIC_ENVIOSPACK_BASE_URL || 'https://api.enviopack.com';
const ENVIOSPACK_API_KEY = process.env.EXPO_PUBLIC_ENVIOSPACK_API_KEY || '';
const ENVIOSPACK_SECRET_KEY = process.env.EXPO_PUBLIC_ENVIOSPACK_SECRET_KEY || '';

const DEFAULT_PACKAGE = {
  alto: 1,
  ancho: 1,
  largo: 1,
  peso: 0.1,
};

function normalizePostalCode(value) {
  const match = String(value || '').match(/[A-Z]?(\d{4})/i);
  return match?.[1] || String(value || '').trim();
}

function readPostalCode(address) {
  if (!address) return '';
  if (typeof address === 'string') return normalizePostalCode(address);
  return normalizePostalCode(
    address.codigoPostal ||
      address.codigo_postal ||
      address.postalCode ||
      address.cp ||
      address.zipCode
  );
}

function pickPrice(data) {
  const candidates = Array.isArray(data)
    ? data
    : data?.cotizaciones || data?.servicios || data?.opciones || data?.datos || data?.data || [];
  const list = Array.isArray(candidates) ? candidates : [data];

  const prices = list
    .map((item) =>
      Number(
        item?.precio ||
          item?.importe ||
          item?.valor ||
          item?.costo ||
          item?.total ||
          item?.price
      )
    )
    .filter((price) => Number.isFinite(price) && price >= 0);

  return prices.length ? Math.min(...prices) : null;
}

async function requestQuote(path, params) {
  const search = new URLSearchParams({
    api_key: ENVIOSPACK_API_KEY,
    secret_key: ENVIOSPACK_SECRET_KEY,
    ...params,
  });
  const response = await fetch(
    `${ENVIOSPACK_BASE_URL.replace(/\/$/, '')}${path}?${search.toString()}`
  );

  if (!response.ok) {
    throw new Error('No se pudo cotizar el envio');
  }

  return response.json();
}

export async function quoteHomeShipping({ destinationAddress, originAddress }) {
  if (!ENVIOSPACK_API_KEY || !ENVIOSPACK_SECRET_KEY) {
    return null;
  }

  const codigoPostalOrigen = readPostalCode(originAddress);
  const codigoPostalDestino = readPostalCode(destinationAddress);

  if (!codigoPostalOrigen || !codigoPostalDestino) {
    return null;
  }

  const params = {
    alto: String(DEFAULT_PACKAGE.alto),
    ancho: String(DEFAULT_PACKAGE.ancho),
    codigo_postal_destino: codigoPostalDestino,
    codigo_postal_origen: codigoPostalOrigen,
    largo: String(DEFAULT_PACKAGE.largo),
    peso: String(DEFAULT_PACKAGE.peso),
  };

  const endpoints = ['/cotizar/precio/a-domicilio', '/cotizar/precio'];
  for (const endpoint of endpoints) {
    try {
      const data = await requestQuote(endpoint, params);
      const price = pickPrice(data);
      if (price != null) {
        return price;
      }
    } catch {
      // Try the next known quote shape.
    }
  }

  return null;
}
