export function formatMoney(value, currency = 'ARS', options = {}) {
  if (value === undefined || value === null || value === '') {
    return options.emptyValue ?? '-';
  }

  const amount =
    typeof value === 'number'
      ? value
      : Number(String(value).replace(',', '.').replace(/[^0-9.-]/g, ''));

  if (!Number.isFinite(amount)) {
    return options.emptyValue ?? '-';
  }

  const currencyCode = String(currency || 'ARS').trim().toUpperCase();
  const decimals = amount % 1 === 0 ? 0 : 2;
  const formatted = amount.toLocaleString('es-AR', {
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? decimals,
  });

  if (currencyCode === 'USD') {
    return `USD ${formatted}`;
  }

  if (currencyCode === 'ARS') {
    return `$ ${formatted}`;
  }

  return `${currencyCode} ${formatted}`;
}
