import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { listPaymentMethods } from '../../services/paymentMethodsApi';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { resolveApiAssetUrl } from '../../utils/config';
import { apiFetch, getApiErrorMessage } from '../../utils/http';
import { formatMoney } from '../../utils/money';
import { useWinnerModal } from '../../components/feedback/WinnerModalProvider';

const HOME_SHIPPING_COST = 8000;
const tabs = ['Subastas', 'Compras', 'Pujas', 'Multas', 'Metricas'];
const tabLabels = {
  Compras: 'Compras realizadas',
  Metricas: 'Métricas',
  Multas: 'Multas',
  Pujas: 'Historial de pujas',
  Subastas: 'Subastas en las que participaste',
};

function formatAmount(value, moneda = 'ARS') {
  return formatMoney(value, moneda);
}

function isUsdCurrency(currency) {
  return normalizeCurrency(currency) === 'USD';
}

function formatShippingTotal(productAmount, shippingAmount, currency) {
  const product = Number(productAmount) || 0;
  const shipping = Number(shippingAmount) || 0;
  if (isUsdCurrency(currency)) {
    return `${formatAmount(product, 'USD')} + ${formatAmount(shipping, 'ARS')}`;
  }
  return formatAmount(product + shipping, currency || 'ARS');
}

function getDepositAddress(source = {}) {
  const product = source.detallesProducto || source.producto || source.productoDetalle || source;
  const depositName =
    source.depositoNombre ||
    source.deposito_nombre ||
    product.depositoNombre ||
    product.deposito_nombre ||
    '';
  const depositDirection =
    source.depositoDireccion ||
    source.deposito_direccion ||
    source.direccionDeposito ||
    source.direccion_deposito ||
    product.depositoDireccion ||
    product.deposito_direccion ||
    product.direccionDeposito ||
    product.direccion_deposito ||
    '';

  if (depositName || depositDirection) {
    return {
      addressText: depositDirection,
      name: depositName,
    };
  }

  const deposit =
    source.deposito ||
    source.depositoProducto ||
    source.direccionRetiro ||
    product.deposito ||
    product.depositoAsignado ||
    product.direccionRetiro ||
    product.direccionDeposito ||
    null;

  if (deposit && typeof deposit === 'object') {
    return {
      country: deposit.pais || deposit.country || 'Argentina',
      latitude: deposit.latitud || deposit.latitude || null,
      locality: deposit.localidad || deposit.locality || deposit.ciudad || '',
      longitude: deposit.longitud || deposit.longitude || null,
      name: deposit.nombre || deposit.name || '',
      number: deposit.numero || deposit.number || '',
      postalCode: deposit.codigoPostal || deposit.codigo_postal || deposit.postalCode || deposit.cp || '',
      province: deposit.provincia || deposit.province || '',
      street: deposit.calle || deposit.street || deposit.direccion || '',
    };
  }

  const text =
    source.direccionRetiroTexto ||
    product.direccionRetiroTexto ||
    product.direccionDepositoTexto ||
    source.ubicacion ||
    product.ubicacion ||
    '';

  return text ? { addressText: text } : null;
}

function formatAddressText(address) {
  if (!address) return '';
  if (typeof address === 'string') return address;
  if (address.addressText || address.addressLine || address.displayAddressLine) {
    return address.addressText || address.addressLine || address.displayAddressLine;
  }

  const streetLine = [address.street, address.number]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ');
  const locationLine = [
    address.locality,
    address.province,
    address.postalCode,
    address.country,
  ]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ');

  return [streetLine, locationLine].filter(Boolean).join(', ');
}

function getProductIdFromPurchase(rawPurchase = {}) {
  const product = rawPurchase.detallesProducto || rawPurchase.productoDetalle || rawPurchase.producto;
  if (typeof product === 'number' || typeof product === 'string') return product;
  return (
    product?.identificador ||
    product?.id ||
    rawPurchase.idProducto ||
    rawPurchase.id_producto ||
    rawPurchase.productoId ||
    rawPurchase.producto_id ||
    null
  );
}

function formatDateTime(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()} · ${hours}:${minutes}h`;
}

function formatDateOnly(isoString) {
  if (!isoString) return '-';
  const parts = String(isoString).split('T')[0].split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return isoString;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function mapEstadoSubasta(estado) {
  if (estado === 'programada') return 'inscripción abierta';
  if (estado === 'abierta') return 'en curso';
  return 'finalizada';
}

function buildMonthlyBids(pujas) {
  const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const result = {};
  (pujas || []).forEach((puja) => {
    if (!puja.realizadaEn) return;
    const d = new Date(puja.realizadaEn);
    const year = String(d.getFullYear());
    if (!result[year]) result[year] = MONTHS.map((label) => ({ label, value: 0 }));
    result[year][d.getMonth()].value += 1;
  });
  return result;
}

function buildMonthlyBidsFromMetrics(pujasPorMes) {
  const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const result = {};

  (pujasPorMes || []).forEach((item) => {
    const year = String(item.anio || item.year || '');
    const monthIndex = Number(item.mes ?? item.month) - 1;
    const value = Number(item.cantidad ?? item.value ?? 0);

    if (!year || monthIndex < 0 || monthIndex > 11) return;

    if (!result[year]) result[year] = MONTHS.map((label) => ({ label, value: 0 }));
    result[year][monthIndex].value += Number.isFinite(value) ? value : 0;
  });

  return result;
}

function getResponseItems(response) {
  if (Array.isArray(response?.datos)) return response.datos;
  if (Array.isArray(response)) return response;
  return [];
}

function isTruthyFlag(value) {
  if (typeof value === 'boolean') return value;
  if (value == null) return false;
  return ['si', 'true', '1'].includes(String(value).trim().toLowerCase());
}

function parseMoney(value) {
  if (typeof value === 'number') return value;
  const normalized = String(value || '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function isCheckPaymentMethod(payment) {
  const type = String(payment?.tipo || '').trim();
  return (
    payment?.isCheck ||
    type === 'chequeCertificado' ||
    type === 'cheque_certificado' ||
    type === 'cheque'
  );
}

function normalizeCurrency(value) {
  return String(value || '').trim().toUpperCase();
}

function hasPaymentCurrencyMismatch(payment, targetCurrency) {
  const paymentCurrency = normalizeCurrency(payment?.moneda);
  const purchaseCurrency = normalizeCurrency(targetCurrency);

  return Boolean(paymentCurrency && purchaseCurrency && paymentCurrency !== purchaseCurrency);
}

function buildCurrencyMismatchMessage(payment, targetCurrency) {
  const paymentCurrency = normalizeCurrency(payment?.moneda) || 'otra moneda';
  const purchaseCurrency = normalizeCurrency(targetCurrency) || 'la moneda de la subasta';

  return `El medio de pago seleccionado es en ${paymentCurrency}, pero la subasta es en ${purchaseCurrency}. Por favor, reintentá con un medio de pago en ${purchaseCurrency}.`;
}

function getPaymentAvailableAmount(payment) {
  if (!isCheckPaymentMethod(payment)) return null;
  const detail = payment?.detalle || {};
  const rawAmount =
    payment?.availableAmount ??
    detail.montoDisponible ??
    detail.montoGarantizado ??
    detail.amount;

  return rawAmount == null ? null : parseMoney(rawAmount);
}

function hasInsufficientFunds(payment, amount) {
  const available = getPaymentAvailableAmount(payment);
  return available != null && available < amount;
}

function isCurrencyMismatchError(error) {
  const message = [
    error?.message,
    typeof error?.payload === 'string' ? error.payload : '',
    error?.payload?.mensaje,
    error?.payload?.message,
    error?.payload?.detail,
    error?.payload?.detalle,
    error?.payload?.codigo,
    error?.payload?.code,
  ]
    .flat()
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    message.includes('moneda') ||
    message.includes('currency')
  ) && (
    message.includes('medio de pago') ||
    message.includes('tarjeta') ||
    message.includes('transferencia') ||
    message.includes('cuenta') ||
    message.includes('payment')
  );
}

function isInsufficientFundsError(error) {
  const message = [
    error?.message,
    typeof error?.payload === 'string' ? error.payload : '',
    error?.payload?.mensaje,
    error?.payload?.message,
    error?.payload?.detail,
    error?.payload?.detalle,
    error?.payload?.codigo,
    error?.payload?.code,
  ]
    .flat()
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    message.includes('fondos insuficientes') ||
    message.includes('saldo insuficiente') ||
    (message.includes('fondo') && message.includes('insuficiente')) ||
    (message.includes('saldo') && message.includes('insuficiente')) ||
    (message.includes('insuficiente') && message.includes('disponible')) ||
    message.includes('insufficient funds')
  );
}

function normalizePaymentMethod(payment) {
  const detail = payment?.detalle || {};
  const isCheck = isCheckPaymentMethod(payment);
  const type = payment?.tipo;
  const last4 =
    detail.ultimosCuatroDigitos ||
    detail.ultimos4 ||
    payment?.last4 ||
    detail.cbu?.slice(-4) ||
    detail.numeroCuenta?.slice(-4) ||
    '';

  return {
    id: String(payment?.identificador || payment?.id || ''),
    tipo: type,
    moneda: payment?.moneda,
    isCheck,
    brand: isCheck
      ? 'Cheque'
      : detail.red ||
        detail.nombreBanco ||
        payment?.brand ||
        (type === 'cuentaBancaria' ? 'Banco' : 'Tarjeta'),
    last4,
    accountNumber: detail.numeroCuenta || detail.cbu || payment?.accountNumber || '',
    number: detail.numero || payment?.number || payment?.identificador || payment?.id,
    availableAmount: getPaymentAvailableAmount(payment),
    expiry: formatPaymentExpiration(
      detail.vencimiento || detail.fechaVencimiento || payment?.expiry
    ),
    cardholder:
      detail.titular ||
      detail.nombreTitular ||
      payment?.cardholder ||
      '',
  };
}

function buildPaidPaymentDisplay(payment) {
  if (!payment) {
    return {
      badge: 'PAGO',
      subtitle: 'Medio de pago no disponible',
      title: 'Pago registrado',
    };
  }

  if (payment.isCheck) {
    return {
      badge: 'CHEQUE',
      subtitle: payment.moneda ? `Moneda: ${payment.moneda}` : '',
      title: payment.number ? `Cheque certificado N° ${payment.number}` : 'Cheque certificado',
    };
  }

  if (payment.tipo === 'cuentaBancaria') {
    const accountSuffix = payment.accountNumber ? ` terminada en ${payment.accountNumber.slice(-4)}` : '';
    return {
      badge: 'BANCO',
      subtitle: payment.moneda ? `Moneda: ${payment.moneda}` : '',
      title: `${payment.brand || 'Cuenta bancaria'}${accountSuffix}`,
    };
  }

  return {
    badge: (payment.brand || 'Tarjeta').toUpperCase(),
    subtitle: [
      payment.cardholder,
      payment.expiry ? `Vencimiento: ${payment.expiry}` : '',
    ].filter(Boolean).join(' · '),
    title: payment.last4 ? `•••• ${payment.last4}` : 'Tarjeta registrada',
  };
}

function getPurchaseTotal(item) {
  const finalPrice = Number(item?.finalPrice ?? 140);
  const shipping = Number(item?.shipping ?? 0);

  return (
    (Number.isFinite(finalPrice) ? finalPrice : 0) +
    (isUsdCurrency(item?.currency) ? 0 : (Number.isFinite(shipping) ? shipping : 0))
  );
}

function mapSubasta(s) {
  const hora = s.hora ? ` · ${String(s.hora).slice(0, 5)}h` : '';
  const cover =
    s.fotoPrincipal ||
    s.foto_principal ||
    s.portada ||
    s.imagenPortada ||
    s.imagen_portada ||
    s.producto?.fotoPrincipal ||
    (Array.isArray(s.producto?.fotos) ? s.producto.fotos[0] : null);
  return {
    identificador: s.identificador,
    title: s.nombre || `Subasta #${s.identificador}`,
    image: cover ? { uri: resolveApiAssetUrl(cover) } : null,
    date: s.fecha ? `${formatDateOnly(s.fecha)}${hora}` : '-',
    location: s.ubicacion || '',
    category: capitalize(s.categoria),
    status: mapEstadoSubasta(s.estado),
    description: s.descripcion || '',
    organizer: '',
    pieces: s.cantidadItems != null ? `${s.cantidadItems} PIEZAS` : '',
    minimumBid: '',
    registration: '',
  };
}

function mapPuja(p) {
  const producto = p.producto || p.detallesProducto || {};
  const subasta = p.subasta || {};
  const productName =
    producto.nombre && producto.descripcionCatalogo
      ? `${producto.nombre} - ${producto.descripcionCatalogo}`
      : producto.nombre ||
        producto.descripcionCatalogo ||
        producto.descripcionCompleta ||
        p.nombreProducto ||
        p.descripcionProducto ||
        `Ítem #${p.idItem}`;
  const auctionName =
    subasta.nombre ||
    p.nombreSubasta ||
    p.subastaNombre ||
    (p.idSubasta ? `Subasta #${p.idSubasta}` : `Subasta #${p.idItem}`);
  const photo =
    producto.fotoPrincipal ||
    producto.foto_principal ||
    (Array.isArray(producto.fotos) ? producto.fotos[0] : null) ||
    p.fotoProducto;
  return {
    title: productName,
    image: photo ? { uri: resolveApiAssetUrl(photo) } : null,
    auction: auctionName,
    date: formatDateTime(p.realizadaEn),
    amount: formatAmount(p.importe, subasta.moneda || p.moneda),
    result: p.ganador === 'si' ? 'Ganadora' : 'Superada',
    resultTone: p.ganador === 'si' ? 'success' : 'danger',
  };
}

function mapCompra(r) {
  const importe = Number(r.importe || 0);
  const retiraPersonalmente = isTruthyFlag(r.retiraPersonalmente);
  const pagado = isTruthyFlag(r.pagado);
  const shipping = retiraPersonalmente ? 0 : HOME_SHIPPING_COST;
  const totalLabel = formatShippingTotal(importe, shipping, r.moneda);
  const producto = r.detallesProducto || r.producto || {};
  const fotoProducto =
    r.fotoProducto ||
    producto.fotoPrincipal ||
    (Array.isArray(producto.fotos) ? producto.fotos[0] : null);
  const fechaCompra = r.fechaRegistro || r.fechaPago;
  const fechaBase = fechaCompra ? new Date(fechaCompra) : new Date();
  const fechaVencimiento = r.fechaVencimiento
    ? new Date(r.fechaVencimiento)
    : new Date(fechaBase.getTime() + 2 * 24 * 60 * 60 * 1000);
  const title =
    producto.nombre && producto.descripcionCatalogo
      ? `${producto.nombre} - ${producto.descripcionCatalogo}`
      : producto.nombre ||
        producto.descripcionCatalogo ||
        r.descripcionProducto ||
        `Compra #${r.identificador}`;
  const medioPago = r.medioPago || r.paymentMethod || null;
  const depositAddress = getDepositAddress(r);
  const productId = getProductIdFromPurchase(r);

  return {
    id: String(r.identificador),
    identificador: r.identificador,
    productId,
    code: producto.codigo || r.codigoProducto || `SUB-${r.identificador}`,
    title,
    image: fotoProducto
      ? { uri: resolveApiAssetUrl(fotoProducto) }
      : require('../../assets/activity/sweet-lolita-dress.webp'),
    auction: r.nombreSubasta || r.subasta?.nombre || `Subasta #${r.idSubasta || r.subasta || r.identificador}`,
    date: fechaCompra ? formatDateOnly(fechaCompra) : '-',
    amount: totalLabel,
    baseAmount: formatAmount(importe, r.moneda),
    shippingCost: formatAmount(shipping, 'ARS'),
    finalPrice: importe,
    shipping,
    currency: r.moneda || 'USD',
    status: pagado ? 'pagado' : 'pendiente',
    auctionDate: fechaCompra ? formatDateOnly(fechaCompra) : '-',
    dueDate: Number.isNaN(fechaVencimiento.getTime())
      ? '-'
      : formatDateOnly(fechaVencimiento.toISOString()),
    fineAmount:
      r.importeMulta != null || r.montoMulta != null
        ? formatAmount(r.importeMulta ?? r.montoMulta, r.moneda)
        : formatAmount(importe * 0.1, r.moneda),
    paidDate: pagado && r.fechaPago ? formatDateOnly(r.fechaPago) : null,
    paymentMethod: pagado ? normalizePaymentMethod(medioPago) : null,
    retiraPersonalmente,
    pickup: r.direccionRetiro || depositAddress || null,
    pickupAddress: r.direccionRetiroTexto || formatAddressText(depositAddress),
    depositAddress,
    pickupWindow: r.ventanaRetiro || null,
    details: r.detalles || null,
  };
}

function mapMulta(m) {
  return {
    id: m.identificador,
    identificador: m.identificador,
    image: null,
    auction: m.nombreSubasta || `Registro #${m.idRegistroSubasta}`,
    date: formatDateTime(m.fechaEmision),
    amount: m.montoOfertado != null ? formatAmount(m.montoOfertado, m.moneda) : '-',
    penalty: formatAmount(m.importe),
    status: m.pagada === 'si' ? 'pagada' : 'pendiente',
  };
}

function StatusPill({ label, style }) {
  const safeLabel = String(label || '');
  const normalizedLabel = safeLabel.toLowerCase();
  const tone =
    normalizedLabel.includes('finalizada') || normalizedLabel.includes('superada')
      ? 'danger'
      : normalizedLabel.includes('pendiente') || normalizedLabel.includes('abierta')
      ? 'warning'
      : 'success';

  return (
    <View style={[styles.statusPill, styles[`status_${tone}`], style]}>
      <Text numberOfLines={1} style={styles.statusText}>{safeLabel || '-'}</Text>
    </View>
  );
}

function WarningIcon() {
  return (
    <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4L21 20H3L12 4Z" fill={colors.burgundy} />
      <Path d="M12 9V14M12 17H12.01" stroke={colors.cream} strokeLinecap="round" strokeWidth={2.2} />
    </Svg>
  );
}

function InfoIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill={colors.burgundy} />
      <Path d="M12 10.8V17M12 7.2H12.01" stroke={colors.cream} strokeLinecap="round" strokeWidth={2.1} />
    </Svg>
  );
}

function ChequePaymentIcon() {
  return (
    <Svg width={32} height={22} viewBox="0 0 40 28" fill="none">
      <Path
        d="M4 5.5H36V22.5H4V5.5Z"
        stroke="#FFFFFF"
        strokeLinejoin="round"
        strokeWidth={2}
      />
      <Path
        d="M9 11H21M9 17H16"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeWidth={2}
      />
      <Path
        d="M25 17.2L28.1 20.2L34 13.5"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.4}
      />
    </Svg>
  );
}

function ChevronIcon() {
  return (
    <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9L12 15L18 9" stroke={colors.cream} strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
    </Svg>
  );
}

function ActivityCard({ children, title, style }) {
  return (
    <View style={[styles.card, style]}>
      {title ? (
        <>
          <Text style={styles.cardTitle}>{title}</Text>
          <View style={styles.divider} />
        </>
      ) : null}
      {children}
    </View>
  );
}

function ErrorSectionTitle({ children }) {
  return (
    <View style={styles.errorSectionTitle}>
      <WarningIcon />
      <Text style={styles.errorSectionTitleText}>{children}</Text>
    </View>
  );
}

function LoadingState() {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator color={colors.burgundy} size="large" />
    </View>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <View style={styles.centerState}>
      <Text style={styles.stateText}>{message}</Text>
      <Pressable onPress={onRetry} style={styles.retryButton}>
        <Text style={styles.retryButtonText}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

function EmptyState({ message }) {
  return (
    <View style={styles.centerState}>
      <Text style={styles.stateText}>{message || 'No hay datos para mostrar.'}</Text>
    </View>
  );
}

function AuctionRow({ item, onPress }) {
  return (
    <View style={styles.auctionRow}>
      <Pressable onPress={onPress} style={styles.auctionTouchable}>
        {item.image ? (
          <Image source={item.image} resizeMode="cover" style={styles.auctionImage} />
        ) : null}
        <View style={styles.rowBody}>
          <Text numberOfLines={1} style={styles.rowTitle}>{item.title}</Text>
          <Text style={styles.rowText}>{item.date}</Text>
          <Text numberOfLines={1} style={styles.rowText}>{item.location}</Text>
          {item.pieces ? <Text style={styles.rowText}>{item.pieces} · Categoria: {item.category}</Text> : (
            <Text style={styles.rowText}>Categoria: {item.category}</Text>
          )}
        </View>
      </Pressable>
      <StatusPill label={item.status} style={styles.rowStatusBottom} />
    </View>
  );
}

function PurchaseRow({ item, onRequestPickup, onShowDetail, onShowPickupLocation }) {
  const isPickupConfirmed = item.retiraPersonalmente;

  return (
    <View style={styles.purchaseRow}>
      <View style={styles.purchaseTopRow}>
        {item.image ? (
          <Image source={item.image} resizeMode="cover" style={styles.productImage} />
        ) : null}
        <View style={styles.purchaseBody}>
          <Text numberOfLines={2} style={styles.rowTitle}>{item.title}</Text>
          <Text style={styles.rowText}>Ganaste el {item.date}</Text>
          <Text style={styles.rowText}>en la subasta {item.auction}</Text>
          <Text style={styles.rowBold}>Total pagado: {item.amount}</Text>
        </View>
      </View>
      <View style={styles.purchaseActions}>
        {isPickupConfirmed ? (
          <>
            <StatusPill label="retira personalmente" style={styles.pickupConfirmedStatus} />
            {item.pickup ? (
              <Pressable onPress={onShowPickupLocation} style={[styles.outlineButton, styles.purchaseActionButton]}>
                <Text style={styles.outlineButtonText}>Ubicacion</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
            <Pressable
              onPress={item.details ? onShowDetail : onRequestPickup}
              style={[styles.outlineButton, styles.purchaseActionButton]}
            >
              <Text style={styles.outlineButtonText}>{item.details ? 'Ver detalle' : 'Retirar personalmente'}</Text>
            </Pressable>
            {!item.details ? null : (
              <Pressable onPress={onRequestPickup} style={[styles.outlineButton, styles.purchaseActionButton]}>
                <Text style={styles.outlineButtonText}>Retirar personalmente</Text>
              </Pressable>
            )}
            <StatusPill label={item.status} style={styles.purchaseStatus} />
          </>
        )}
      </View>
    </View>
  );
}

const DEFAULT_PAYMENT_METHODS = [
  { id: '1', brand: 'Visa', last4: '4367', expiry: '09/27', cardholder: 'Juana Mendez' },
  { id: '2', brand: 'Mastercard', last4: '2398', expiry: '12/28', cardholder: 'Juana Mendez' },
];

const INITIAL_WON_AUCTIONS = [
  {
    id: 'subasta-ganada-1',
    code: 'PUIFT-017-BLACK&PINK-FREESIZE',
    title: 'Clearance - Black & Pink Polka-dot Pattern Bowknot Gyaru Fashion Beret',
    image: require('../../assets/activity/paw-top.jpg'),
    finalPrice: 140,
    shipping: 0,
    commission: 20,
    currency: 'USD',
    status: 'pendiente',
    auctionDate: '13/05/2026',
    dueDate: '15/05/2026',
    fineAmount: formatAmount(300, 'USD'),
    paidDate: null,
    paymentMethod: null,
  },
  {
    id: 'subasta-ganada-2',
    code: 'M-O-073',
    title: 'Red Butterfly Jacquard Fabric Black Collar and Ruffle Hem Lolita Dress',
    image: require('../../assets/activity/sweet-lolita-dress.webp'),
    finalPrice: 140,
    shipping: 0,
    commission: 20,
    currency: 'USD',
    status: 'pagado',
    auctionDate: '12/04/2026',
    dueDate: '14/04/2026',
    paidDate: '14/04/2026',
    paymentMethod: {
      brand: 'Visa',
      last4: '4367',
      cardholder: 'Juana Mendez',
    },
  },
];

function formatPaymentExpiration(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})/);
  if (match) {
    return `${match[2]}/${match[1].slice(-2)}`;
  }
  return value || '09/27';
}

function formatNumberWithDots(value) {
  if (value === undefined || value === null || value === '') return '0';
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(num);
}

function PaymentSweep() {
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(sweep, {
        duration: 900,
        toValue: 1,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [sweep]);

  const translateX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-130, 210],
  });

  return (
    <View style={styles.paymentSweepTrack}>
      <Animated.View style={[styles.paymentSweepBar, { transform: [{ translateX }] }]} />
    </View>
  );
}

function WonAuctionCard({
  isPaying = false,
  item,
  onRequestPickup,
  paymentMethods = [],
  selectedPaymentId,
  onSelectPayment,
  onShowDetail,
  onShowPickupLocation,
  onPay,
}) {
  const isPending = item.status === 'pendiente';
  const finalPrice = item.finalPrice || 140;
  const shipping = item.shipping ?? 0;
  const currency = item.currency || 'USD';

  const formattedFinalPrice = formatAmount(finalPrice, currency);
  const formattedShipping = item.retiraPersonalmente
    ? formatAmount(0, 'ARS')
    : formatAmount(shipping, 'ARS');
  const formattedTotal = formatShippingTotal(finalPrice, shipping, currency);

  const defaultPaymentId = paymentMethods[0]?.id;
  const currentSelectedPaymentId = selectedPaymentId || defaultPaymentId;
  const paidPaymentDisplay = buildPaidPaymentDisplay(item.paymentMethod);

  return (
    <View style={styles.wonAuctionCard}>
      {/* Top right Badge */}
      <View style={isPending ? styles.badgePending : styles.badgePaid}>
        <Text style={isPending ? styles.badgePendingText : styles.badgePaidText}>
          {isPending ? 'PENDIENTE' : 'PAGADO'}
        </Text>
      </View>

      {/* Product info row */}
      <View style={styles.wonProductRow}>
        <Image
          source={typeof item.image === 'string' ? { uri: item.image } : item.image}
          resizeMode="cover"
          style={styles.wonProductImage}
        />
        <View style={styles.wonProductCopy}>
          <Text style={styles.wonProductCode}>{item.code || item.title}</Text>
          {item.code ? (
            <Text style={styles.wonProductDesc}>{item.title}</Text>
          ) : null}
        </View>
      </View>

      {/* Price breakdown */}
      <View style={styles.wonPriceRow}>
        <Text style={styles.wonPriceLabel}>Precio final:</Text>
        <Text style={styles.wonPriceValue}>{formattedFinalPrice}</Text>
      </View>
      <View style={styles.wonPriceRow}>
        <Text style={styles.wonPriceLabel}>Envio a domicilio:</Text>
        <Text style={styles.wonPriceValue}>{formattedShipping}</Text>
      </View>

      <View style={styles.wonPriceDivider} />

      <View style={styles.wonPriceTotalRow}>
        <Text style={styles.wonPriceTotalLabel}>Total a pagar</Text>
        <Text style={styles.wonPriceTotalValue}>{formattedTotal}</Text>
      </View>

      {isPending ? (
        <>
          {/* Warning notice box */}
          <View style={styles.wonWarningBox}>
            <WarningIcon />
            <Text style={styles.wonWarningText}>
              Esta subasta esta pendiente de pago. Si no pagas antes del{' '}
              {item.dueDate || '15/05/2026'} perderas el articulo y seras multado
              con el 10% del valor ofertado: {item.fineAmount}.
            </Text>
          </View>

          {/* Elige como pagar */}
          <Text style={styles.wonSectionTitle}>Elige como pagar</Text>
          <View style={styles.wonPaymentCardsTable}>
            {paymentMethods.map((pm, idx) => {
              const isSelected = String(pm.id) === String(currentSelectedPaymentId);
              const isCheck = isCheckPaymentMethod(pm);
              const isBank = pm.tipo === 'cuentaBancaria';
              const labelText = isCheck
                ? `Cheque Certificado (${pm.moneda || 'ARS'})`
                : isBank
                ? `${pm.brand || 'Transferencia'} (${pm.moneda || 'ARS'})`
                : `${pm.brand || 'Tarjeta'} •••• ${pm.last4 || '4367'}`;
              const subText = isCheck || isBank ? '' : `Vence ${pm.expiry || '09/27'}`;

              return (
                <View key={pm.id || idx}>
                  {idx > 0 && <View style={styles.wonPaymentSeparator} />}
                  <Pressable
                    style={styles.wonPaymentRow}
                    onPress={() => onSelectPayment(pm.id)}
                  >
                    <View style={styles.wonPaymentLeft}>
                      <View style={styles.wonRadioCircle}>
                        {isSelected ? <View style={styles.wonRadioDot} /> : null}
                      </View>
                      <Text style={styles.wonPaymentText}>
                        {labelText}
                      </Text>
                    </View>
                    {subText ? (
                      <Text style={styles.wonPaymentExpiry}>
                        {subText}
                      </Text>
                    ) : null}
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* Pay Button */}
          <Pressable
            style={[styles.wonPayButton, isPaying ? styles.wonPayButtonDisabled : null]}
            disabled={isPaying}
            onPress={() => onPay(item.id, currentSelectedPaymentId)}
          >
            {isPaying ? (
              <PaymentSweep />
            ) : (
              <Text style={styles.wonPayButtonText}>PAGAR {formattedTotal}</Text>
            )}
          </Pressable>
          <Pressable
            disabled={isPaying || item.retiraPersonalmente}
            onPress={onRequestPickup}
            style={[styles.pickupInlineButton, item.retiraPersonalmente ? styles.modalButtonDisabled : null]}
          >
            <Text style={styles.pickupInlineButtonText}>Retirar personalmente</Text>
          </Pressable>
          <Text style={styles.wonDisclaimerText}>
            Al confirmar aceptas nuestros Terminos y Politica de privacidad
          </Text>
        </>
      ) : (
        <>
          {/* Paid info */}
          <View style={styles.wonPriceDivider} />
          <View style={styles.wonDateRow}>
            <Text style={styles.wonPriceLabel}>Fecha de cierre:</Text>
            <Text style={styles.wonPriceValue}>{item.dueDate || '14/04/2026'}</Text>
          </View>
          <View style={styles.wonDateRow}>
            <Text style={styles.wonPriceLabel}>Fecha de pago:</Text>
            <Text style={styles.wonPriceValue}>{item.paidDate || '14/04/2026'}</Text>
          </View>

          <Text style={[styles.wonSectionTitle, { marginTop: 12 }]}>Metodo de pago</Text>
          <View style={styles.wonPaidMethodCard}>
            <View style={[styles.visaBadge, item.paymentMethod?.isCheck ? styles.chequeBadge : null]}>
              {item.paymentMethod?.isCheck ? (
                <ChequePaymentIcon />
              ) : (
                <Text style={styles.visaBadgeText}>{paidPaymentDisplay.badge}</Text>
              )}
            </View>
            <View>
              <Text style={styles.wonPaidMethodTitle}>
                {paidPaymentDisplay.title}
              </Text>
              {paidPaymentDisplay.subtitle ? (
                <Text style={styles.wonPaidMethodSubtitle}>
                  {paidPaymentDisplay.subtitle}
                </Text>
              ) : null}
            </View>
          </View>
          <Text style={styles.wonSuccessNotice}>
            {item.retiraPersonalmente
              ? 'Tu pago se ha procesado correctamente. Podras retirar tu pedido personalmente.'
              : 'Tu pago se ha procesado correctamente. Tu pedido se enviara a domicilio.'}
          </Text>
        </>
      )}
      <View style={styles.wonPurchaseActions}>
        {item.details ? (
          <Pressable onPress={onShowDetail} style={[styles.outlineButton, styles.purchaseActionButton]}>
            <Text style={styles.outlineButtonText}>Ver detalle</Text>
          </Pressable>
        ) : null}
        {item.retiraPersonalmente ? (
          <>
            <StatusPill label="retira personalmente" style={styles.pickupConfirmedStatus} />
            {item.pickup ? (
              <Pressable onPress={onShowPickupLocation} style={[styles.outlineButton, styles.purchaseActionButton]}>
                <Text style={styles.outlineButtonText}>Ubicacion</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

function BidRow({ item }) {
  return (
    <View style={styles.bidRow}>
      {item.image ? (
        <Image source={item.image} resizeMode="cover" style={styles.productImage} />
      ) : null}
      <View style={styles.bidBody}>
        <Text numberOfLines={2} style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowText}>{item.auction}</Text>
        <Text style={styles.rowText}>{item.date}</Text>
        <Text style={styles.rowBold}>
          Puja: {item.amount} ·{' '}
          <Text style={item.resultTone === 'success' ? styles.successText : styles.dangerText}>
            {item.result}
          </Text>
        </Text>
      </View>
    </View>
  );
}

function PenaltyRow({ item, onPayPenalty }) {
  return (
    <View style={styles.penaltyRow}>
      <View style={styles.purchaseTopRow}>
        {item.image ? (
          <Image source={item.image} resizeMode="cover" style={styles.productImage} />
        ) : null}
        <View style={styles.penaltyBody}>
          <Text numberOfLines={2} style={styles.rowTitle}>{item.auction}</Text>
          <Text style={styles.rowText}>Fecha: {item.date}</Text>
          {item.amount !== '-' ? (
            <Text style={styles.rowText}>Monto ofertado: {item.amount}</Text>
          ) : null}
          <Text style={styles.rowBold}>Multa aplicada (10%): {item.penalty}</Text>
        </View>
      </View>
      <View style={styles.purchaseActions}>
        {item.status === 'pendiente' ? (
          <Pressable onPress={() => onPayPenalty(item)} style={[styles.outlineButton, styles.purchaseActionButton]}>
            <Text style={styles.outlineButtonText}>Pagar multa</Text>
          </Pressable>
        ) : null}
        <StatusPill label={item.status} style={styles.penaltyStatus} />
      </View>
    </View>
  );
}

function Notice({ children }) {
  return (
    <View style={styles.notice}>
      <InfoIcon />
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}

function ActivitySelect({ activeTab, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  function handleSelect(tab) {
    onChange(tab);
    setIsOpen(false);
  }

  return (
    <View style={styles.selectContainer}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsOpen((v) => !v)}
        style={styles.selectTrigger}
      >
        <View>
          <Text style={styles.selectEyebrow}>Ver actividad</Text>
          <Text style={styles.selectValue}>{tabLabels[activeTab]}</Text>
        </View>
        <ChevronIcon />
      </Pressable>

      {isOpen ? (
        <View style={styles.selectMenu}>
          {tabs.map((tab) => {
            const isSelected = tab === activeTab;
            return (
              <Pressable
                key={tab}
                onPress={() => handleSelect(tab)}
                style={[styles.selectOption, isSelected ? styles.selectOptionActive : null]}
              >
                <Text style={[styles.selectOptionText, isSelected ? styles.selectOptionTextActive : null]}>
                  {tabLabels[tab]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function DashboardStat({ helper, label, value }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statHelper}>{helper}</Text>
    </View>
  );
}

function MiniProgress({ color = colors.burgundy, value }) {
  const normalizedValue = Math.max(0, Math.min(value, 100));
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { backgroundColor: color, width: normalizedValue > 0 ? `${Math.max(7, normalizedValue)}%` : '0%' },
        ]}
      />
    </View>
  );
}

function DonutChart({ label = 'ganados', value, wonPercent }) {
  const size = 118;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference * value;

  return (
    <View style={styles.donutWrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke="rgba(138, 74, 58, 0.16)" strokeWidth={strokeWidth} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke={colors.burgundy}
          strokeDasharray={`${progress} ${circumference - progress}`}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.donutCenter}>
        <Text style={styles.donutValue}>{wonPercent}%</Text>
        <Text style={styles.donutLabel}>{label}</Text>
      </View>
    </View>
  );
}

function YearSelect({ onChange, selectedYear, years }) {
  const [isOpen, setIsOpen] = useState(false);

  function handleSelect(year) {
    onChange(year);
    setIsOpen(false);
  }

  return (
    <View style={styles.yearSelectContainer}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsOpen((v) => !v)}
        style={styles.yearSelectTrigger}
      >
        <Text style={styles.yearSelectValue}>Año {selectedYear}</Text>
        <ChevronIcon />
      </Pressable>

      {isOpen ? (
        <View style={styles.yearSelectMenu}>
          {years.map((year) => {
            const isSelected = year === selectedYear;
            return (
              <Pressable
                key={year}
                onPress={() => handleSelect(year)}
                style={[styles.yearSelectOption, isSelected ? styles.yearSelectOptionActive : null]}
              >
                <Text style={[styles.yearSelectOptionText, isSelected ? styles.yearSelectOptionTextActive : null]}>
                  {year}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function MonthlyBars({ data }) {
  const monthlyBids = data || [];
  const maxValue = Math.max(1, ...monthlyBids.map((item) => item.value));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.barScroll} contentContainerStyle={styles.barChart}>
      {monthlyBids.map((item) => {
        const height = item.value > 0 ? Math.max(18, (item.value / maxValue) * 96) : 0;
        return (
          <View key={item.label} style={styles.barColumn}>
            <View style={styles.barSlot}>
              {height > 0 ? <View style={[styles.barFill, { height }]} /> : null}
            </View>
            <Text style={styles.barValue}>{item.value}</Text>
            <Text style={styles.barLabel}>{item.label}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

function MetricsContent({ metricas, monthlyBidHistory }) {
  const metricYears = Object.keys(monthlyBidHistory).sort((a, b) => Number(b) - Number(a));
  const [selectedYear, setSelectedYear] = useState(() => metricYears[0] || String(new Date().getFullYear()));

  const totalParticipated =
    metricas?.totalSubastasParticipadas ??
    metricas?.totalCompras ??
    0;

  const productosGanados =
    metricas?.productosGanados ??
    metricas?.totalProductosGanados ??
    metricas?.totalGanadas ??
    metricas?.pujasGanadas ??
    0;

  const productosPujadosFallback =
    metricas?.totalProductosPujados ??
    metricas?.totalItemsPujados ??
    totalParticipated;

  const productosNoGanados =
    metricas?.productosNoGanados ??
    metricas?.totalProductosNoGanados ??
    Math.max(0, productosPujadosFallback - productosGanados);

  const totalPujas =
    metricas?.totalPujasRealizadas ??
    metricas?.totalPujas ??
    0;

  const totalPagadoArs =
    metricas?.totalImportePagadoARS ??
    metricas?.totalImportePagadoArs ??
    (metricas?.monedaImportePagado === 'ARS' ? metricas?.totalImportePagado : 0) ??
    0;

  const totalPagadoUsd =
    metricas?.totalImportePagadoUSD ??
    metricas?.totalImportePagadoUsd ??
    (metricas?.monedaImportePagado === 'USD' ? metricas?.totalImportePagado : 0) ??
    0;

  const productosConResultado = productosGanados + productosNoGanados;
  const wonRatio = productosConResultado > 0 ? productosGanados / productosConResultado : 0;
  const wonPercent = Math.round(wonRatio * 100);

  const dashboardStats = [
    { label: 'Participaste', value: String(totalParticipated), helper: 'subastas' },
    { label: 'Pujas realizadas', value: String(totalPujas), helper: 'ofertas' },
    { label: 'Productos ganados', value: String(productosGanados), helper: 'ganados' },
    { label: 'No ganados', value: String(productosNoGanados), helper: 'productos' },
  ];

  const categoryMetrics = (metricas?.porCategoria || []).map((item) => ({
    category: capitalize(item.categoria),
    participated: item.participaciones,
    won: item.ganadas,
  }));

  return (
    <>
      <View style={styles.statsGrid}>
        {dashboardStats.map((item) => (
          <DashboardStat helper={item.helper} key={item.label} label={item.label} value={item.value} />
        ))}
      </View>

      <ActivityCard title="Resumen de actividad">
        <View style={styles.dashboardRow}>
          <DonutChart label="ganados" value={wonRatio} wonPercent={wonPercent} />
          <View style={styles.dashboardCopy}>
            <Text style={styles.metricLine}>
              <Text style={styles.metricStrong}>Participaste en:</Text> {totalParticipated}
            </Text>
            <Text style={styles.metricLine}>
              <Text style={styles.metricStrong}>Pujas realizadas:</Text> {totalPujas}
            </Text>
            <Text style={styles.metricLine}>
              <Text style={styles.metricStrong}>Productos ganados:</Text> {productosGanados}
            </Text>
            <Text style={styles.metricLine}>
              <Text style={styles.metricStrong}>Productos no ganados:</Text> {productosNoGanados}
            </Text>
          </View>
        </View>
      </ActivityCard>

      <ActivityCard title="Montos">
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Pagado en pesos</Text>
          <Text style={styles.amountValue}>{formatAmount(totalPagadoArs, 'ARS')}</Text>
        </View>
        <MiniProgress color={colors.cocoa} value={totalPagadoArs > 0 ? 100 : 0} />
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Pagado en dolares</Text>
          <Text style={styles.amountValue}>{formatAmount(totalPagadoUsd, 'USD')}</Text>
        </View>
        <MiniProgress color={colors.burgundy} value={totalPagadoUsd > 0 ? 100 : 0} />
      </ActivityCard>

      {metricYears.length > 0 ? (
        <ActivityCard title="Pujas por mes">
          <YearSelect selectedYear={selectedYear} onChange={setSelectedYear} years={metricYears} />
          <MonthlyBars data={monthlyBidHistory[selectedYear] || []} />
        </ActivityCard>
      ) : null}

      {categoryMetrics.length > 0 ? (
        <ActivityCard title="Por categoria" style={styles.categoryCard}>
          {categoryMetrics.map((item) => {
            const value = item.participated > 0 ? (item.won / item.participated) * 100 : 0;
            return (
              <View key={item.category} style={styles.categoryMetricRow}>
                <View style={styles.categoryMetricHeader}>
                  <Text style={styles.categoryName}>{item.category}</Text>
                  <Text style={styles.categoryValue}>
                    {item.won} productos ganados de {item.participated} participaciones
                  </Text>
                </View>
                <MiniProgress color={colors.cocoa} value={value} />
              </View>
            );
          })}
        </ActivityCard>
      ) : null}
    </>
  );
}

function AppModal({ children, onClose, showCloseButton = true, title, visible }) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {title ? (
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              {showCloseButton ? (
                <Pressable onPress={onClose} style={styles.modalCloseButton}>
                  <Text style={styles.modalCloseText}>x</Text>
                </Pressable>
              ) : null}
            </View>
          ) : showCloseButton ? (
            <View style={styles.modalHeaderNoTitle}>
              <Pressable onPress={onClose} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>x</Text>
              </Pressable>
            </View>
          ) : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

function AuctionDetailModal({ item, onClose }) {
  if (!item) return null;

  return (
    <AppModal onClose={onClose} title="Detalle de subasta" visible={Boolean(item)}>
      <ScrollView contentContainerStyle={styles.modalScrollContent}>
        {item.image ? (
          <Image source={item.image} resizeMode="contain" style={styles.detailImage} />
        ) : null}
        <View style={styles.auctionModalTitleRow}>
          <Text style={[styles.modalProductTitle, styles.auctionModalTitle]}>{item.title}</Text>
          <StatusPill label={item.status} style={styles.auctionModalStatus} />
        </View>
        {item.description ? <Text style={styles.modalText}>{item.description}</Text> : null}
        <View style={styles.detailList}>
          <Text style={styles.detailLine}>Fecha: {item.date}</Text>
          {item.location !== '-' ? <Text style={styles.detailLine}>Ubicacion: {item.location}</Text> : null}
          {item.organizer ? <Text style={styles.detailLine}>Organiza: {item.organizer}</Text> : null}
          {item.pieces ? <Text style={styles.detailLine}>Piezas: {item.pieces}</Text> : null}
          <Text style={styles.detailLine}>Categoria: {item.category}</Text>
          {item.minimumBid ? <Text style={styles.detailLine}>Puja minima: {item.minimumBid}</Text> : null}
          {item.registration ? <Text style={styles.detailLine}>{item.registration}</Text> : null}
        </View>
        <Pressable onPress={onClose} style={styles.modalPrimaryButton}>
          <Text style={styles.modalPrimaryText}>Cerrar</Text>
        </Pressable>
      </ScrollView>
    </AppModal>
  );
}

function PurchaseDetailModal({ item, onClose }) {
  if (!item) return null;

  return (
    <AppModal onClose={onClose} title="Detalle de compra" visible={Boolean(item)}>
      <ScrollView contentContainerStyle={styles.modalScrollContent}>
        {item.image ? (
          <Image source={item.image} resizeMode="contain" style={styles.detailImage} />
        ) : null}
        <Text style={styles.modalProductTitle}>{item.title}</Text>
        <Text style={styles.modalText}>Subasta: {item.auction}</Text>
        <Text style={styles.modalText}>Total: {item.amount}</Text>
        <Text style={styles.modalText}>Importe: {item.baseAmount}</Text>
        <Text style={styles.modalText}>
          Envio a domicilio: {item.retiraPersonalmente ? formatAmount(0, 'ARS') : item.shippingCost}
        </Text>
        {item.retiraPersonalmente ? (
          <Text style={styles.modalStrongText}>Seguro eliminado por retiro personal.</Text>
        ) : null}
        <Text style={styles.modalText}>Fecha de compra: {item.date}</Text>
        {item.details ? (
          <View style={styles.detailList}>
            {item.details.seller ? <Text style={styles.detailLine}>Vendedor: {item.details.seller}</Text> : null}
            {item.details.lot ? <Text style={styles.detailLine}>Lote: {item.details.lot}</Text> : null}
            {item.details.size ? <Text style={styles.detailLine}>Talle: {item.details.size}</Text> : null}
            {item.details.material ? <Text style={styles.detailLine}>Material: {item.details.material}</Text> : null}
            {item.details.condition ? <Text style={styles.detailLine}>Estado: {item.details.condition}</Text> : null}
          </View>
        ) : null}
        <Pressable onPress={onClose} style={styles.modalPrimaryButton}>
          <Text style={styles.modalPrimaryText}>Cerrar</Text>
        </Pressable>
      </ScrollView>
    </AppModal>
  );
}

function PickupConfirmModal({ item, isLoading, onClose, onConfirm }) {
  if (!item) return null;

  const pickupAddressText = item.pickupAddress || formatAddressText(item.depositAddress || item.pickup);
  const pickupDepositName = item.depositAddress?.name || '';

  return (
    <AppModal onClose={onClose} title="Retiro personal" visible={Boolean(item)}>
      <Text style={styles.modalText}>
        Si confirmas el retiro personal, no podras deshacer esta accion y
        perderas la cobertura del seguro sobre tu compra.
      </Text>
      <Text style={styles.modalText}>
        Al elegir esta opcion, el envio a domicilio no se cobra y queda en {formatAmount(0, 'ARS')}.
      </Text>
      <Text style={styles.modalStrongText}>
        ¿Estas segura de que queres retirar "{item.title}" personalmente?
      </Text>
      {pickupAddressText ? (
        <View style={styles.pickupAddressBox}>
          <Text style={styles.pickupAddressLabel}>Deposito de retiro</Text>
          {pickupDepositName ? (
            <Text style={styles.pickupDepositName}>{pickupDepositName}</Text>
          ) : null}
          <Text style={styles.pickupAddressLabel}>Direccion</Text>
          <Text style={styles.pickupAddressText}>{pickupAddressText}</Text>
          {item.pickupWindow ? <Text style={styles.pickupAddressText}>{item.pickupWindow}</Text> : null}
        </View>
      ) : null}
      <View style={styles.modalActions}>
        <Pressable disabled={isLoading} onPress={onClose} style={styles.modalSecondaryButton}>
          <Text style={styles.modalSecondaryText}>Cancelar</Text>
        </Pressable>
        <Pressable
          disabled={isLoading}
          onPress={onConfirm}
          style={[styles.modalPrimaryButtonSmall, isLoading ? styles.modalButtonDisabled : null]}
        >
          <Text style={styles.modalPrimaryText}>{isLoading ? 'Confirmando...' : 'Si, retirar'}</Text>
        </Pressable>
      </View>
    </AppModal>
  );
}

function PickupLocationModal({ item, onClose }) {
  if (!item) return null;

  const pickupAddressText = item.pickupAddress || formatAddressText(item.depositAddress || item.pickup);
  const pickupDepositName = item.depositAddress?.name || '';

  return (
    <AppModal onClose={onClose} title="Ubicacion de retiro" visible={Boolean(item)}>
      <View style={styles.pickupAddressBox}>
        <Text style={styles.pickupAddressLabel}>Deposito de retiro</Text>
        {pickupDepositName ? (
          <Text style={styles.pickupDepositName}>{pickupDepositName}</Text>
        ) : null}
        <Text style={styles.pickupAddressLabel}>Direccion</Text>
        <Text style={styles.pickupAddressText}>{pickupAddressText || '-'}</Text>
        {item.pickupWindow ? <Text style={styles.pickupAddressText}>{item.pickupWindow}</Text> : null}
      </View>
      <Pressable onPress={onClose} style={styles.modalPrimaryButton}>
        <Text style={styles.modalPrimaryText}>Entendido</Text>
      </Pressable>
    </AppModal>
  );
}

function PaymentSuccessModal({ item, onClose }) {
  if (!item) return null;

  const formattedTotal = formatShippingTotal(
    item.finalPrice || 140,
    item.shipping || 0,
    item.currency || 'USD'
  );

  return (
    <AppModal onClose={onClose} showCloseButton={false} visible={Boolean(item)}>
      <View style={styles.successModalContent}>
        <View style={styles.successIconCircle}>
          <Text style={styles.successIconCheck}>✓</Text>
        </View>
        <Text style={styles.successModalTitle}>¡Pago exitoso!</Text>
        <Text style={styles.successModalBody}>
          Tu pago de <Text style={styles.successModalStrongText}>{formattedTotal}</Text> por el artículo{' '}
          <Text style={styles.successModalStrongText}>"{item.code || item.title}"</Text> se procesó correctamente.
        </Text>
        <Text style={styles.modalSubNotice}>Tu pedido se enviara a domicilio.</Text>
        <Pressable onPress={onClose} style={styles.modalPrimaryButton}>
          <Text style={styles.modalPrimaryText}>Entendido</Text>
        </Pressable>
      </View>
    </AppModal>
  );
}

function InsufficientFundsModal({ onClose, visible }) {
  return (
    <AppModal
      onClose={onClose}
      showCloseButton={false}
      visible={visible}
    >
      <View style={styles.successModalContent}>
        <Text style={styles.failureIconX}>x</Text>
        <Text style={styles.successModalTitle}>No se pudo efectuar el pago</Text>
        <Text style={styles.insufficientFundsModalBody}>
          El cheque seleccionado no tiene fondos suficientes para cubrir esta compra. Por favor, reintentá con otro medio de pago.
        </Text>
        <Pressable onPress={onClose} style={styles.modalPrimaryButton}>
          <Text style={styles.modalPrimaryText}>Elegir otro medio</Text>
        </Pressable>
      </View>
    </AppModal>
  );
}

function CurrencyMismatchModal({ message, onClose, visible }) {
  return (
    <AppModal
      onClose={onClose}
      showCloseButton={false}
      visible={visible}
    >
      <View style={styles.successModalContent}>
        <Text style={styles.failureIconX}>x</Text>
        <Text style={styles.successModalTitle}>No se pudo efectuar el pago</Text>
        <Text style={styles.insufficientFundsModalBody}>
          {message}
        </Text>
        <Pressable onPress={onClose} style={styles.modalPrimaryButton}>
          <Text style={styles.modalPrimaryText}>Elegir otro medio</Text>
        </Pressable>
      </View>
    </AppModal>
  );
}

export default function MyActivityScreen({ onPayPenalty }) {
  const { showAscensoModal } = useWinnerModal();
  const [activeTab, setActiveTab] = useState('Subastas');
  const [tabData, setTabData] = useState({});
  const [tabLoading, setTabLoading] = useState({});
  const [tabError, setTabError] = useState({});

  const [auctionDetailItem, setAuctionDetailItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [pickupConfirmationItem, setPickupConfirmationItem] = useState(null);
  const [pickupLocationItem, setPickupLocationItem] = useState(null);
  const [isConfirmingPickup, setIsConfirmingPickup] = useState(false);
  const [userPaymentMethods, setUserPaymentMethods] = useState(DEFAULT_PAYMENT_METHODS);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState({});
  const [payingItemId, setPayingItemId] = useState(null);
  const [paymentSuccessItem, setPaymentSuccessItem] = useState(null);
  const [insufficientFundsModalVisible, setInsufficientFundsModalVisible] = useState(false);
  const [currencyMismatchModal, setCurrencyMismatchModal] = useState({
    message: '',
    visible: false,
  });

  const loadedTabs = useRef(new Set());
  const loadingTabs = useRef(new Set());

  useEffect(() => {
    async function loadPaymentMethods() {
      try {
        const pmRes = await listPaymentMethods();
        const paymentMethods = getResponseItems(pmRes);

        if (paymentMethods.length > 0) {
          setUserPaymentMethods(
            paymentMethods.map((pm) => normalizePaymentMethod(pm))
          );
        }
      } catch (err) {
        // Fallback to default payment methods
      }
    }

    loadPaymentMethods();
  }, []);

  const fetchTab = useCallback(async (tab) => {
    if (loadedTabs.current.has(tab) || loadingTabs.current.has(tab)) {
      return;
    }

    loadingTabs.current.add(tab);
    setTabLoading((prev) => ({ ...prev, [tab]: true }));
    setTabError((prev) => ({ ...prev, [tab]: null }));

    try {
      let result = null;

      if (tab === 'Subastas') {
        const subastasRes = await apiFetch('/v1/mi/subastas');
        result = getResponseItems(subastasRes).map(mapSubasta);
      } else if (tab === 'Compras') {
        const comprasRes = await apiFetch('/v1/mi/compras');
        const items = getResponseItems(comprasRes);
        result = items.map(mapCompra);
        result = await Promise.all(
          result.map(async (item) => {
            if (
              !item.productId ||
              (item.depositAddress?.name && formatAddressText(item.depositAddress))
            ) {
              return item;
            }

            try {
              const productDetails = await apiFetch(`/v1/productos/${item.productId}`);
              const depositAddress = getDepositAddress(productDetails);
              if (!depositAddress) return item;
              return {
                ...item,
                depositAddress,
                pickup: item.pickup || depositAddress,
                pickupAddress: item.pickupAddress || formatAddressText(depositAddress),
              };
            } catch {
              return item;
            }
          })
        );
      } else if (tab === 'Pujas') {
        const pujasRes = await apiFetch('/v1/mi/pujas');
        result = getResponseItems(pujasRes).map(mapPuja);
      } else if (tab === 'Multas') {
        const multasRes = await apiFetch('/v1/mi/multas');
        result = getResponseItems(multasRes).map(mapMulta);
      } else if (tab === 'Metricas') {
        const metricasRes = await apiFetch('/v1/mi/metricas');

        result = {
          metricas: metricasRes || {},
          monthlyBidHistory: buildMonthlyBidsFromMetrics(metricasRes?.pujasPorMes),
        };
      }

      loadedTabs.current.add(tab);
      setTabData((prev) => ({ ...prev, [tab]: result }));
    } catch (err) {
      setTabError((prev) => ({ ...prev, [tab]: getApiErrorMessage(err, 'No se pudo cargar la información.') }));
    } finally {
      loadingTabs.current.delete(tab);
      setTabLoading((prev) => ({ ...prev, [tab]: false }));
    }
  }, []);

  function handleSelectPayment(itemId, paymentId) {
    setSelectedPaymentMethods((prev) => ({
      ...prev,
      [itemId]: paymentId,
    }));
  }

  async function handlePayWonAuction(itemId, paymentId) {
    if (payingItemId) return;

    const selectedPaymentMethod =
      userPaymentMethods.find((p) => String(p.id) === String(paymentId)) ||
      userPaymentMethods[0];
    const paymentMethod = normalizePaymentMethod(selectedPaymentMethod);
    const selectedPurchase = (tabData.Compras || []).find(
      (compra) => String(compra.id) === String(itemId)
    );
    const totalAmount = getPurchaseTotal(selectedPurchase);
    const purchaseCurrency = selectedPurchase?.currency;
    const numericItemId = Number(itemId);
    const numericPaymentId = Number(paymentId);

    if (hasPaymentCurrencyMismatch(paymentMethod, purchaseCurrency)) {
      setCurrencyMismatchModal({
        message: buildCurrencyMismatchMessage(paymentMethod, purchaseCurrency),
        visible: true,
      });
      return;
    }

    if (hasInsufficientFunds(paymentMethod, totalAmount)) {
      setInsufficientFundsModalVisible(true);
      return;
    }

    setPayingItemId(itemId);

    // 2-second loading animation delay as requested
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (Number.isFinite(numericItemId) && numericItemId > 0) {
      try {
      const res = await apiFetch(`/v1/mi/compras/${itemId}/pagar`, {
        body: {
          ...(Number.isFinite(numericPaymentId) ? { idMedioPago: numericPaymentId } : {}),
          retiraPersonalmente: Boolean(selectedPurchase?.retiraPersonalmente),
          costoEnvio: Number(selectedPurchase?.shipping ?? 0),
        },
        method: 'POST',
      });

        if (res?.ascenso && showAscensoModal) {
          showAscensoModal(res.ascenso);
        }
      } catch (err) {
        setPayingItemId(null);
        if (paymentMethod.isCheck && isInsufficientFundsError(err)) {
          setInsufficientFundsModalVisible(true);
          return;
        }
        if (isCurrencyMismatchError(err)) {
          setCurrencyMismatchModal({
            message: buildCurrencyMismatchMessage(paymentMethod, purchaseCurrency),
            visible: true,
          });
          return;
        }
        setTabError((prev) => ({
          ...prev,
          Compras: getApiErrorMessage(err, 'No se pudo registrar el pago.'),
        }));
        return;
      }
    }

    const paidDate = new Date().toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    let paidItemObj = null;

    setTabData((prev) => {
      const currentList = prev.Compras || [];
      const updatedList = currentList.map((compra) => {
        if (String(compra.id) === String(itemId)) {
          paidItemObj = {
            ...compra,
            paidDate,
            paymentMethod,
            status: 'pagado',
          };
          return paidItemObj;
        }
        return compra;
      });
      return {
        ...prev,
        Compras: updatedList,
      };
    });

    setPayingItemId(null);
    if (paidItemObj) {
      setPaymentSuccessItem(paidItemObj);
    }
  }

  function retryTab(tab) {
    loadedTabs.current.delete(tab);
    fetchTab(tab);
  }

  useEffect(() => {
    fetchTab(activeTab);
  }, [activeTab, fetchTab]);

  async function handleConfirmPickup() {
    if (!pickupConfirmationItem) return;
    setIsConfirmingPickup(true);
    try {
      await apiFetch(`/v1/mi/compras/${pickupConfirmationItem.identificador}`, {
        method: 'PATCH',
        body: { retiraPersonalmente: true },
      });
      setPickupConfirmationItem(null);
      loadedTabs.current.delete('Compras');
      fetchTab('Compras');
    } catch {
      setPickupConfirmationItem(null);
    } finally {
      setIsConfirmingPickup(false);
    }
  }

  const isLoading = Boolean(tabLoading[activeTab]);
  const error = tabError[activeTab];
  const data = tabData[activeTab];

  return (
    <View style={styles.screen}>
      <ActivityCard style={styles.mainOuterCard}>
        <Text style={styles.title}>Mi actividad</Text>
        <ActivitySelect activeTab={activeTab} onChange={setActiveTab} />

        <View style={styles.tabSection}>
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={() => retryTab(activeTab)} />
          ) : activeTab === 'Subastas' ? (
            !data || data.length === 0 ? (
              <EmptyState message="No participaste en ninguna subasta todavía." />
            ) : (
              data.map((item) => (
                <AuctionRow
                  item={item}
                  key={item.identificador}
                  onPress={() => setAuctionDetailItem(item)}
                />
              ))
            )
          ) : activeTab === 'Compras' ? (
            !data || data.length === 0 ? (
              <EmptyState message="No realizaste compras todavía." />
            ) : (
              <>
                {data.map((item) => (
                  <WonAuctionCard
                    isPaying={String(payingItemId) === String(item.id)}
                    item={item}
                    key={item.id}
                    onPay={handlePayWonAuction}
                    onRequestPickup={() => setPickupConfirmationItem(item)}
                    onSelectPayment={(paymentId) => handleSelectPayment(item.id, paymentId)}
                    onShowDetail={() => setDetailItem(item)}
                    onShowPickupLocation={() => setPickupLocationItem(item)}
                    paymentMethods={userPaymentMethods}
                    selectedPaymentId={selectedPaymentMethods[item.id]}
                  />
                ))}
                <Notice>
                  Si marcas que retiras personalmente, no podras deshacer esta accion
                  y perderas la cobertura del seguro sobre tu compra. Si no seleccionas
                  esta opcion, el producto sera enviado automaticamente a tu domicilio registrado.
                </Notice>
              </>
            )
          ) : activeTab === 'Pujas' ? (
            !data || data.length === 0 ? (
              <EmptyState message="No realizaste pujas todavía." />
            ) : (
              data.map((item, idx) => (
                <BidRow item={item} key={`${item.title}-${idx}`} />
              ))
            )
          ) : activeTab === 'Multas' ? (
            !data || data.length === 0 ? (
              <EmptyState message="No tenés multas registradas." />
            ) : (
              <>
                <ErrorSectionTitle>Incumplimiento de pago</ErrorSectionTitle>
                <View style={styles.penaltyGroupDivider} />
                {data.map((item) => (
                  <PenaltyRow
                    item={item}
                    key={item.id}
                    onPayPenalty={onPayPenalty}
                  />
                ))}
                <Notice>
                  Si no abonas la/s multa/s no podras participar en nuevas subastas.
                </Notice>
              </>
            )
          ) : activeTab === 'Metricas' && data ? (
            <MetricsContent metricas={data.metricas} monthlyBidHistory={data.monthlyBidHistory} />
          ) : null}
        </View>
      </ActivityCard>

      <AuctionDetailModal item={auctionDetailItem} onClose={() => setAuctionDetailItem(null)} />
      <PurchaseDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
      <PickupConfirmModal
        item={pickupConfirmationItem}
        isLoading={isConfirmingPickup}
        onClose={() => setPickupConfirmationItem(null)}
        onConfirm={handleConfirmPickup}
      />
      <PickupLocationModal
        item={pickupLocationItem}
        onClose={() => setPickupLocationItem(null)}
      />
      <PaymentSuccessModal
        item={paymentSuccessItem}
        onClose={() => setPaymentSuccessItem(null)}
      />
      <InsufficientFundsModal
        onClose={() => setInsufficientFundsModalVisible(false)}
        visible={insufficientFundsModalVisible}
      />
      <CurrencyMismatchModal
        message={currencyMismatchModal.message}
        onClose={() => setCurrencyMismatchModal({ message: '', visible: false })}
        visible={currencyMismatchModal.visible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 20,
    paddingTop: 24,
    zIndex: 2,
  },
  title: {
    color: colors.cocoa,
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 32,
    marginBottom: 16,
  },
  selectContainer: {
    marginBottom: 16,
    width: '100%',
    zIndex: 4,
  },
  selectTrigger: {
    alignItems: 'center',
    backgroundColor: colors.burgundy,
    borderRadius: 13,
    columnGap: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 9,
    width: '100%',
  },
  selectEyebrow: {
    color: 'rgba(252, 235, 219, 0.78)',
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 15,
    marginBottom: 1,
  },
  selectValue: {
    color: colors.cream,
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 21,
  },
  selectMenu: {
    backgroundColor: colors.cream,
    borderColor: 'rgba(159, 2, 29, 0.25)',
    borderRadius: 13,
    borderWidth: 1,
    marginTop: 7,
    overflow: 'hidden',
    width: '100%',
  },
  selectOption: {
    borderBottomColor: 'rgba(159, 2, 29, 0.12)',
    borderBottomWidth: 1,
    minHeight: 43,
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  selectOptionActive: {
    backgroundColor: 'rgba(214, 136, 143, 0.28)',
  },
  selectOptionText: {
    color: colors.cocoa,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 19,
  },
  selectOptionTextActive: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
  },
  card: {
    backgroundColor: 'rgba(242, 211, 200, 0.5)',
    borderRadius: 17,
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    width: '100%',
  },
  categoryCard: {
    marginTop: -6,
  },
  cardTitle: {
    color: colors.cocoa,
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 24,
  },
  divider: {
    backgroundColor: colors.cocoa,
    height: 1,
    marginBottom: 8,
    opacity: 0.65,
    width: '100%',
  },
  errorSectionTitle: {
    alignItems: 'center',
    backgroundColor: 'rgba(159, 2, 29, 0.13)',
    borderColor: colors.burgundy,
    borderRadius: 8,
    borderWidth: 1,
    columnGap: 8,
    flexDirection: 'row',
    marginBottom: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorSectionTitleText: {
    color: colors.burgundy,
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 21,
  },
  penaltyGroupDivider: {
    backgroundColor: colors.cocoa,
    height: 1,
    marginBottom: 3,
    opacity: 0.45,
    width: '100%',
  },
  centerState: {
    alignItems: 'center',
    paddingTop: 48,
    rowGap: 16,
  },
  stateText: {
    color: colors.cocoa,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  retryButton: {
    alignItems: 'center',
    borderColor: colors.burgundy,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  retryButtonText: {
    color: colors.textBurgundy,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 18,
  },
  auctionRow: {
    alignItems: 'flex-start',
    borderBottomColor: 'rgba(138, 74, 58, 0.42)',
    borderBottomWidth: 1,
    columnGap: 8,
    flexDirection: 'row',
    minHeight: 84,
    paddingVertical: 8,
  },
  auctionTouchable: {
    alignItems: 'flex-start',
    columnGap: 9,
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
  },
  purchaseRow: {
    alignItems: 'stretch',
    borderBottomColor: 'rgba(138, 74, 58, 0.42)',
    borderBottomWidth: 1,
    minHeight: 128,
    paddingVertical: 10,
  },
  bidRow: {
    alignItems: 'flex-start',
    borderBottomColor: 'rgba(138, 74, 58, 0.42)',
    borderBottomWidth: 1,
    columnGap: 9,
    flexDirection: 'row',
    minHeight: 100,
    paddingVertical: 9,
  },
  penaltyRow: {
    alignItems: 'stretch',
    borderBottomColor: 'rgba(138, 74, 58, 0.42)',
    borderBottomWidth: 1,
    minHeight: 128,
    paddingVertical: 9,
  },
  auctionImage: {
    flexShrink: 0,
    height: 65,
    width: 102,
  },
  productImage: {
    flexShrink: 0,
    height: 82,
    width: 68,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    paddingTop: 0,
  },
  purchaseBody: {
    flex: 1,
    minWidth: 0,
    paddingTop: 0,
  },
  purchaseTopRow: {
    alignItems: 'flex-start',
    columnGap: 10,
    flexDirection: 'row',
    width: '100%',
  },
  purchaseActions: {
    alignItems: 'center',
    columnGap: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 11,
    rowGap: 8,
    width: '100%',
  },
  bidBody: {
    flex: 1,
    minWidth: 0,
    paddingTop: 0,
  },
  penaltyBody: {
    flex: 1,
    minWidth: 0,
    paddingTop: 0,
  },
  rowTitle: {
    color: colors.cocoa,
    fontFamily: fonts.bold,
    fontSize: 15,
    includeFontPadding: false,
    lineHeight: 17,
  },
  rowText: {
    color: colors.cocoa,
    fontFamily: fonts.regular,
    fontSize: 14,
    includeFontPadding: false,
    lineHeight: 17,
  },
  rowBold: {
    color: colors.cocoa,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    includeFontPadding: false,
    lineHeight: 17,
  },
  successText: {
    color: '#3E8B35',
    fontFamily: fonts.bold,
  },
  dangerText: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
  },
  statusPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
    maxWidth: '100%',
    minHeight: 24,
    paddingHorizontal: 10,
  },
  status_success: {
    backgroundColor: 'rgba(127, 174, 118, 0.78)',
    borderColor: colors.statusGreenBorder,
  },
  status_warning: {
    backgroundColor: 'rgba(231, 184, 78, 0.78)',
    borderColor: '#B48618',
  },
  status_danger: {
    backgroundColor: 'rgba(159, 2, 29, 0.78)',
    borderColor: colors.burgundy,
  },
  statusText: {
    color: colors.white,
    fontFamily: fonts.semiBold,
    fontSize: 13,
    lineHeight: 16,
    textAlign: 'center',
  },
  rowStatusBottom: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  pickupConfirmedStatus: {
    alignSelf: 'center',
  },
  purchaseStatus: {
    alignSelf: 'center',
  },
  outlineButton: {
    alignItems: 'center',
    borderColor: colors.burgundy,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 11,
  },
  purchaseActionButton: {
    alignSelf: 'flex-start',
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
    width: 'auto',
  },
  outlineButtonText: {
    color: colors.textBurgundy,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 16,
    textAlign: 'center',
  },
  penaltyStatus: {
    alignSelf: 'center',
    marginLeft: 'auto',
  },
  notice: {
    alignItems: 'center',
    backgroundColor: 'rgba(159, 2, 29, 0.08)',
    borderColor: colors.burgundy,
    borderRadius: 5,
    borderWidth: 1,
    columnGap: 8,
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  noticeText: {
    color: colors.textBurgundy,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 17,
  },
  statsGrid: {
    columnGap: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    rowGap: 10,
  },
  statTile: {
    backgroundColor: 'rgba(242, 211, 200, 0.62)',
    borderColor: 'rgba(138, 74, 58, 0.12)',
    borderRadius: 15,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  statValue: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 27,
  },
  statLabel: {
    color: colors.cocoa,
    fontFamily: fonts.semiBold,
    fontSize: 13,
    lineHeight: 17,
  },
  statHelper: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  dashboardRow: {
    alignItems: 'center',
    columnGap: 12,
    flexDirection: 'row',
    paddingTop: 8,
  },
  dashboardCopy: {
    flex: 1,
    rowGap: 6,
  },
  donutWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  donutValue: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 25,
  },
  donutLabel: {
    color: colors.cocoa,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 14,
  },
  metricLine: {
    color: colors.cocoa,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  metricStrong: {
    fontFamily: fonts.bold,
  },
  amountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  amountLabel: {
    color: colors.cocoa,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 19,
  },
  amountValue: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 19,
  },
  progressTrack: {
    backgroundColor: 'rgba(138, 74, 58, 0.14)',
    borderRadius: 999,
    height: 9,
    marginBottom: 9,
    marginTop: 6,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    borderRadius: 999,
    height: '100%',
  },
  yearSelectContainer: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    width: 132,
    zIndex: 3,
  },
  yearSelectTrigger: {
    alignItems: 'center',
    backgroundColor: colors.burgundy,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 39,
    paddingHorizontal: 12,
  },
  yearSelectValue: {
    color: colors.cream,
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 18,
  },
  yearSelectMenu: {
    backgroundColor: colors.cream,
    borderColor: 'rgba(159, 2, 29, 0.25)',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
    width: '100%',
  },
  yearSelectOption: {
    minHeight: 37,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  yearSelectOptionActive: {
    backgroundColor: 'rgba(214, 136, 143, 0.28)',
  },
  yearSelectOptionText: {
    color: colors.cocoa,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 17,
  },
  yearSelectOptionTextActive: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
  },
  barScroll: {
    marginHorizontal: -4,
  },
  barChart: {
    alignItems: 'flex-end',
    columnGap: 14,
    flexDirection: 'row',
    minHeight: 152,
    paddingHorizontal: 4,
    paddingTop: 14,
    paddingBottom: 2,
  },
  barColumn: {
    alignItems: 'center',
    width: 43,
  },
  barSlot: {
    alignItems: 'center',
    backgroundColor: 'rgba(138, 74, 58, 0.12)',
    borderRadius: 999,
    height: 105,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: 28,
  },
  barFill: {
    backgroundColor: colors.blush,
    borderRadius: 999,
    width: '100%',
  },
  barValue: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 17,
    marginTop: 7,
  },
  barLabel: {
    color: colors.cocoa,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 15,
  },
  categoryMetricRow: {
    marginTop: 8,
  },
  categoryMetricHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryName: {
    color: colors.cocoa,
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 19,
  },
  categoryValue: {
    color: colors.cocoa,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(34, 0, 8, 0.45)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: colors.cream,
    borderColor: 'rgba(159, 2, 29, 0.32)',
    borderRadius: 18,
    borderWidth: 1,
    maxHeight: '82%',
    maxWidth: 430,
    paddingHorizontal: 18,
    paddingVertical: 16,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalHeaderNoTitle: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 0,
    marginTop: -4,
  },
  modalTitle: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 25,
  },
  modalCloseButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 31,
    justifyContent: 'center',
    width: 31,
  },
  modalCloseText: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 22,
  },
  modalScrollContent: {
    paddingBottom: 4,
  },
  detailImage: {
    backgroundColor: 'rgba(242, 211, 200, 0.42)',
    borderRadius: 12,
    height: 206,
    marginBottom: 12,
    width: '100%',
  },
  auctionModalTitleRow: {
    alignItems: 'center',
    columnGap: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  auctionModalStatus: {
    alignSelf: 'center',
  },
  auctionModalTitle: {
    flex: 1,
    marginBottom: 0,
  },
  modalProductTitle: {
    color: colors.cocoa,
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 21,
    marginBottom: 6,
  },
  modalText: {
    color: colors.cocoa,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 8,
  },
  modalStrongText: {
    color: colors.burgundy,
    fontFamily: fonts.semiBold,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 14,
  },
  detailList: {
    backgroundColor: 'rgba(242, 211, 200, 0.45)',
    borderRadius: 13,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detailLine: {
    color: colors.cocoa,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 5,
  },
  modalActions: {
    columnGap: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  pickupAddressBox: {
    backgroundColor: 'rgba(242, 211, 200, 0.5)',
    borderColor: 'rgba(159, 2, 29, 0.18)',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickupAddressLabel: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 3,
  },
  pickupDepositName: {
    color: colors.cocoa,
    fontFamily: fonts.semiBold,
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 8,
  },
  pickupAddressText: {
    color: colors.cocoa,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
  },
  modalPrimaryButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.burgundy,
    borderRadius: 999,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 42,
    minWidth: 142,
    paddingHorizontal: 18,
  },
  modalPrimaryButtonSmall: {
    alignItems: 'center',
    backgroundColor: colors.burgundy,
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 16,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalPrimaryText: {
    color: colors.cream,
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 18,
  },
  modalSecondaryButton: {
    alignItems: 'center',
    borderColor: colors.burgundy,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 14,
  },
  modalSecondaryText: {
    color: colors.burgundy,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 18,
  },
  mainOuterCard: {
    backgroundColor: '#FCEBDB',
    borderRadius: 18,
    marginBottom: 24,
    overflow: 'visible',
    paddingHorizontal: 14,
    paddingVertical: 16,
    width: '100%',
  },
  tabSection: {
    marginTop: 8,
    width: '100%',
  },
  wonAuctionCard: {
    backgroundColor: '#F6E3D1',
    borderRadius: 14,
    marginBottom: 22,
    marginTop: 14,
    overflow: 'visible',
    padding: 14,
    position: 'relative',
    width: '100%',
  },
  badgePending: {
    backgroundColor: colors.burgundy,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    position: 'absolute',
    right: 0,
    top: -14,
    zIndex: 10,
  },
  badgePendingText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  badgePaid: {
    backgroundColor: '#508B57',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    position: 'absolute',
    right: 0,
    top: -14,
    zIndex: 10,
  },
  badgePaidText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  wonProductRow: {
    alignItems: 'center',
    columnGap: 14,
    flexDirection: 'row',
    marginBottom: 14,
    marginTop: 0,
    paddingRight: 28,
    width: '100%',
  },
  wonProductImage: {
    backgroundColor: '#EBD8C6',
    borderRadius: 8,
    height: 90,
    width: 90,
  },
  wonProductCopy: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  wonProductCode: {
    color: '#510310',
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 18,
  },
  wonProductDesc: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 17,
    marginTop: 2,
  },
  wonPriceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    width: '100%',
  },
  wonPriceLabel: {
    color: '#510310',
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  wonPriceValue: {
    color: '#510310',
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  wonPriceTotalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingVertical: 4,
    width: '100%',
  },
  wonPriceTotalLabel: {
    color: '#510310',
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  wonPriceTotalValue: {
    color: '#510310',
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  wonWarningBox: {
    alignItems: 'center',
    backgroundColor: '#F5B8B2',
    borderRadius: 8,
    columnGap: 10,
    flexDirection: 'row',
    marginVertical: 12,
    padding: 10,
    width: '100%',
  },
  wonWarningText: {
    color: '#510310',
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  wonSectionTitle: {
    color: '#510310',
    fontFamily: fonts.bold,
    fontSize: 15,
    marginBottom: 8,
    marginTop: 6,
  },
  wonPaymentCardsTable: {
    backgroundColor: '#F5E7DA',
    borderColor: '#DDCCBD',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
    width: '100%',
  },
  wonPaymentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  wonPaymentLeft: {
    alignItems: 'center',
    columnGap: 10,
    flexDirection: 'row',
  },
  wonRadioCircle: {
    alignItems: 'center',
    borderColor: '#510310',
    borderRadius: 999,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  wonRadioDot: {
    backgroundColor: '#510310',
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  wonPaymentText: {
    color: '#510310',
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  wonPaymentExpiry: {
    color: '#510310',
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  wonPaymentSeparator: {
    backgroundColor: '#DDCCBD',
    height: 1,
    width: '100%',
  },
  wonPayButton: {
    alignItems: 'center',
    backgroundColor: colors.burgundy,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 12,
    width: '100%',
  },
  wonPayButtonDisabled: {
    opacity: 0.7,
  },
  wonPayButtonText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  pickupInlineButton: {
    alignItems: 'center',
    borderColor: colors.burgundy,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 42,
    paddingVertical: 10,
    width: '100%',
  },
  pickupInlineButtonText: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  paymentSweepTrack: {
    backgroundColor: 'rgba(255,255,255,0.26)',
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
    width: 180,
  },
  paymentSweepBar: {
    backgroundColor: colors.white,
    borderRadius: 999,
    height: 8,
    width: 84,
  },
  wonDisclaimerText: {
    color: '#510310',
    fontFamily: fonts.regular,
    fontSize: 9.5,
    lineHeight: 13,
    marginTop: 6,
    opacity: 0.75,
    textAlign: 'center',
  },
  successModalContent: {
    alignItems: 'center',
    paddingBottom: 8,
    paddingTop: 0,
  },
  successIconCircle: {
    alignItems: 'center',
    backgroundColor: '#508B57',
    borderRadius: 999,
    height: 48,
    justifyContent: 'center',
    marginBottom: 10,
    width: 48,
  },
  successIconCheck: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: 24,
  },
  failureIconX: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 48,
    lineHeight: 52,
    marginBottom: 6,
  },
  successModalTitle: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 25,
    marginBottom: 12,
    textAlign: 'center',
  },
  successModalBody: {
    color: '#510310',
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    marginVertical: 8,
    paddingHorizontal: 4,
    textAlign: 'center',
    width: '100%',
  },
  insufficientFundsModalBody: {
    alignSelf: 'stretch',
    color: '#510310',
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    marginVertical: 8,
    paddingHorizontal: 0,
    textAlign: 'justify',
    width: '100%',
  },
  successModalStrongText: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
  },
  modalSubNotice: {
    color: '#510310',
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 8,
    opacity: 0.8,
    textAlign: 'center',
  },
  wonPriceDivider: {
    backgroundColor: '#DDCCBD',
    height: 1,
    marginVertical: 6,
    width: '100%',
  },
  wonDateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    width: '100%',
  },
  wonPaidMethodCard: {
    alignItems: 'center',
    backgroundColor: '#EBD8C6',
    borderRadius: 8,
    columnGap: 12,
    flexDirection: 'row',
    marginBottom: 10,
    marginTop: 6,
    padding: 12,
    width: '100%',
  },
  visaBadge: {
    alignItems: 'center',
    backgroundColor: '#0057B8',
    borderRadius: 4,
    minHeight: 30,
    minWidth: 52,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chequeBadge: {
    backgroundColor: colors.burgundy,
    minHeight: 34,
    minWidth: 58,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  visaBadgeText: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: 13,
    fontStyle: 'italic',
  },
  wonPaidMethodTitle: {
    color: '#510310',
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  wonPaidMethodSubtitle: {
    color: '#510310',
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  wonSuccessNotice: {
    color: '#510310',
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 15,
    opacity: 0.85,
    textAlign: 'center',
  },
  wonPurchaseActions: {
    alignItems: 'center',
    columnGap: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
    rowGap: 8,
    width: '100%',
  },
});
