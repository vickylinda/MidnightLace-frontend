import creditCardType from 'credit-card-type';

import { findCountryIdByName } from './countries';
import { apiFetch } from './http';

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function toIsoMonthDate(value) {
  const [month, year] = String(value || '').split('/');
  const fullYear = year?.length === 2 ? `20${year}` : year;

  return `${fullYear}-${month}-01`;
}

function toIsoDateFromShortDate(value) {
  const [day, month, year] = String(value || '').split('/');
  const fullYear = year?.length === 2 ? `20${year}` : year;

  return `${fullYear}-${month}-${day}`;
}

function getCardNetwork(cardNumber) {
  const [brand] = creditCardType(digitsOnly(cardNumber));

  return brand?.niceType || brand?.type || null;
}

export function mapPaymentResponse(payment) {
  const detalle = payment?.detalle || {};

  if (payment?.tipo === 'tarjetaCredito') {
    return {
      id: payment.identificador,
      icon: 'card',
      lines: [
        `${detalle.red || 'Tarjeta'} terminada en ${detalle.ultimosCuatroDigitos || '----'}`,
        detalle.fechaVencimiento
          ? `Vencimiento: ${String(detalle.fechaVencimiento).slice(5, 7)}/${String(detalle.fechaVencimiento).slice(0, 4)}`
          : 'Vencimiento pendiente',
      ],
      raw: payment,
      title: 'Tarjeta de credito',
    };
  }

  if (payment?.tipo === 'cuentaBancaria') {
    return {
      id: payment.identificador,
      icon: 'bank',
      lines: [
        detalle.nombreBanco || 'Banco sin informar',
        `Cuenta: ${detalle.numeroCuenta || '-'}`,
      ],
      raw: payment,
      title: 'Cuenta Bancaria',
    };
  }

  return {
    id: payment?.identificador,
    icon: 'check',
    lines: [
      `Monto disponible: ${payment?.moneda || 'ARS'} ${detalle.montoDisponible || '-'}`,
    ],
    raw: payment,
    title: 'Cheque certificado',
  };
}

export async function listPaymentMethods() {
  const response = await apiFetch('/v1/medios-de-pago?pagina=1&cantidad=100', {
    method: 'GET',
  });

  return (response?.datos || []).map(mapPaymentResponse);
}

export async function deletePaymentMethod(id) {
  return apiFetch(`/v1/medios-de-pago/${id}`, {
    method: 'DELETE',
  });
}

export async function createPaymentMethod({ data, method }) {
  if (method === 'bank') {
    const countryId = data.country
      ? await findCountryIdByName(data.country)
      : null;
    const detalle = {
      nombreBanco: data.bankName.trim(),
      numeroCuenta: data.accountNumber.trim(),
    };

    if (countryId) {
      detalle.idPais = countryId;
    }

    return apiFetch('/v1/medios-de-pago', {
      body: {
        detalle,
        moneda: data.reservedFundsCurrency || 'ARS',
        tipo: 'cuentaBancaria',
      },
      method: 'POST',
    });
  }

  if (method === 'card') {
    const cardDigits = digitsOnly(data.cardNumber);

    return apiFetch('/v1/medios-de-pago', {
      body: {
        detalle: {
          esInternacional: data.scope === 'international' ? 'si' : 'no',
          fechaVencimiento: toIsoMonthDate(data.expiration),
          nombreTitular: data.cardholder.trim(),
          red: getCardNetwork(data.cardNumber),
          ultimosCuatroDigitos: cardDigits.slice(-4),
        },
        moneda: data.scope === 'international' ? 'USD' : 'ARS',
        tipo: 'tarjetaCredito',
      },
      method: 'POST',
    });
  }

  return apiFetch('/v1/medios-de-pago', {
    body: {
      detalle: {
        fechaEntrega: toIsoDateFromShortDate(data.emissionDate),
        montoDisponible: Number(data.amount),
        montoGarantizado: Number(data.amount),
      },
      moneda: data.amountCurrency || 'ARS',
      tipo: 'chequeCertificado',
    },
    method: 'POST',
  });
}
