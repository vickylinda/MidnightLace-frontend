import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import AddressMapPreview from '../../components/forms/address/AddressMapPreview';
import { listPaymentMethods } from '../../services/paymentMethodsApi';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { resolveApiAssetUrl } from '../../utils/config';
import { apiFetch } from '../../utils/http';

const tabs = ['Subastas', 'Compras', 'Pujas', 'Multas', 'Metricas'];
const tabLabels = {
  Compras: 'Compras realizadas',
  Metricas: 'Métricas',
  Multas: 'Multas',
  Pujas: 'Historial de pujas',
  Subastas: 'Subastas en las que participaste',
};

const auctionRows = [
  {
    category: 'Oro',
    date: '20/04/2026 · 20:00h',
    description: 'Subasta especial de piezas gothic lolita, accesorios oscuros y prendas de coleccion usadas en excelente estado.',
    image: require('../../assets/activity/gothic-night.png'),
    location: 'Palacio San Miguel, CABA',
    minimumBid: '$18.000',
    organizer: 'Tesoro EGL',
    pieces: '2 PIEZAS',
    registration: 'Inscripcion abierta hasta 20/04/2026 · 18:00h',
    status: 'en curso',
    title: 'Gothic Night',
  },
  {
    category: 'Plata',
    date: '20/04/2026 · 17:00h',
    description: 'Lotes sweet lolita con vestidos, accesorios pastel y piezas delicadas de coleccion usada.',
    image: require('../../assets/activity/sweet-dreams.png'),
    location: 'Centro Cultural Recoleta, CABA',
    minimumBid: '$12.500',
    organizer: 'Atelier Sweet Rose',
    pieces: '5 PIEZAS',
    registration: 'Inscripcion abierta hasta 20/04/2026 · 15:00h',
    status: 'en curso',
    title: 'Sweet Dreams',
  },
  {
    category: 'Especial',
    date: '20/04/2026 · 21:00h',
    description: 'Subasta Y2K con conjuntos, accesorios brillantes y prendas gyaru seleccionadas.',
    image: require('../../assets/activity/y2k-reloaded.png'),
    location: 'Complejo C Art Media, CABA',
    minimumBid: '$15.200',
    organizer: 'Y2K Archive BA',
    pieces: '8 PIEZAS',
    registration: 'Finalizada el 20/04/2026 · 21:45h',
    status: 'finalizada',
    title: 'Y2K Reloaded',
  },
];

const purchaseRows = [
  {
    action: 'Ver detalle',
    amount: '$32.000',
    auction: 'Sweet Dreams',
    date: '30/08/2026',
    details: {
      condition: 'Excelente estado, sin manchas ni roturas visibles.',
      lot: 'Lote 08',
      material: 'Algodon bordado con puntilla importada',
      seller: 'Atelier Sweet Rose',
      size: 'Talle M ajustable',
    },
    id: 'sweet-lolita-dress',
    image: require('../../assets/activity/sweet-lolita-dress.webp'),
    status: 'entregado',
    title: 'Vestido Sweet Lolita Lace Dress',
  },
  {
    action: 'Retirar personalmente',
    amount: '$21.300',
    auction: 'Y2K Reloaded',
    date: '08/09/2026',
    details: {
      condition: 'Usado en excelente estado, cierre funcionando.',
      lot: 'Lote 14',
      material: 'Poliester satinado con detalles dorados',
      seller: 'Y2K Archive BA',
      size: 'Talle S',
    },
    id: 'y2k-club-set',
    image: require('../../assets/activity/y2k-club-set.png'),
    pickup: {
      country: 'Argentina',
      latitude: -34.5896,
      locality: 'Recoleta',
      longitude: -58.3937,
      number: '1930',
      postalCode: 'C1128',
      province: 'Ciudad Autonoma de Buenos Aires',
      street: 'Av. Pueyrredon',
    },
    pickupAddress: 'Av. Pueyrredon 1930, Recoleta, CABA',
    pickupWindow: 'del 16/09/2026 al 20/09/2026, de 11:00h a 18:00h',
    status: 'pendiente de retiro',
    title: 'Conjunto Y2K Club Set',
  },
];

const bidRows = [
  {
    amount: '$32.000',
    auction: 'Sweet Dreams',
    date: '30/08/2026 · 17:10h',
    image: require('../../assets/activity/sweet-lolita-dress.webp'),
    result: 'Ganadora',
    resultTone: 'success',
    title: 'Vestido Sweet Lolita Lace Dress',
  },
  {
    amount: '$15.200',
    auction: 'Y2K Reloaded',
    date: '28/08/2026 · 22:30h',
    image: require('../../assets/activity/leopard-skirt.jpg'),
    result: 'Superada',
    resultTone: 'danger',
    title: 'Mini skirt Leopard Y2K Set',
  },
];

const penaltyRows = [
  {
    amount: '$18.000',
    auction: 'Fairy Magic',
    date: '05/04/2026 · 16:30h',
    image: require('../../assets/activity/paw-top.jpg'),
    penalty: '$1.800',
    status: 'pendiente',
  },
  {
    amount: '$24.500',
    auction: 'Gyaru Deluxe',
    date: '28/08/2026 · 18:30h',
    image: require('../../assets/activity/fairy-skirt.jpg'),
    penalty: '$2.450',
    status: 'pagada',
  },
];

function StatusPill({ label, style }) {
  const normalizedLabel = label.toLowerCase();
  const tone =
    normalizedLabel.includes('finalizada')
      ? 'danger'
      : normalizedLabel.includes('pendiente')
      ? 'warning'
      : 'success';

  return (
    <View style={[styles.statusPill, styles[`status_${tone}`], style]}>
      <Text numberOfLines={1} style={styles.statusText}>{label}</Text>
    </View>
  );
}

function WarningIcon() {
  return (
    <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4L21 20H3L12 4Z"
        fill={colors.burgundy}
      />
      <Path
        d="M12 9V14M12 17H12.01"
        stroke={colors.cream}
        strokeLinecap="round"
        strokeWidth={2.2}
      />
    </Svg>
  );
}

function InfoIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill={colors.burgundy} />
      <Path
        d="M12 10.8V17M12 7.2H12.01"
        stroke={colors.cream}
        strokeLinecap="round"
        strokeWidth={2.1}
      />
    </Svg>
  );
}

function ChevronIcon() {
  return (
    <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9L12 15L18 9"
        stroke={colors.cream}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3}
      />
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

function AuctionRow({ item, onPress }) {
  return (
    <View style={styles.auctionRow}>
      <Pressable onPress={onPress} style={styles.auctionTouchable}>
        <Image source={item.image} resizeMode="cover" style={styles.auctionImage} />
        <View style={styles.rowBody}>
          <Text numberOfLines={1} style={styles.rowTitle}>{item.title}</Text>
          <Text style={styles.rowText}>{item.date}</Text>
          <Text numberOfLines={1} style={styles.rowText}>{item.location}</Text>
          <Text style={styles.rowText}>{item.pieces} · Categoria: {item.category}</Text>
        </View>
      </Pressable>
      <StatusPill label={item.status} style={styles.rowStatusBottom} />
    </View>
  );
}

function PurchaseRow({
  isPickupConfirmed,
  item,
  onRequestPickup,
  onShowDetail,
  onShowPickupLocation,
}) {
  const isPickupAction = item.action === 'Retirar personalmente';

  return (
    <View style={styles.purchaseRow}>
      <View style={styles.purchaseTopRow}>
        <Image source={item.image} resizeMode="cover" style={styles.productImage} />
        <View style={styles.purchaseBody}>
          <Text numberOfLines={2} style={styles.rowTitle}>{item.title}</Text>
          <Text style={styles.rowText}>Ganaste el {item.date}</Text>
          <Text style={styles.rowText}>en la subasta {item.auction}</Text>
          <Text style={styles.rowBold}>Total pagado: {item.amount}</Text>
        </View>
      </View>
      <View style={styles.purchaseActions}>
        {isPickupAction && isPickupConfirmed ? (
          <>
            <StatusPill label="retira personalmente" style={styles.pickupConfirmedStatus} />
            <Pressable
              onPress={onShowPickupLocation}
              style={[styles.outlineButton, styles.purchaseActionButton]}
            >
              <Text style={styles.outlineButtonText}>Ubicacion</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={isPickupAction ? onRequestPickup : onShowDetail}
              style={[styles.outlineButton, styles.purchaseActionButton]}
            >
              <Text style={styles.outlineButtonText}>{item.action}</Text>
            </Pressable>
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
    fineAmount: '$300 USD',
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

function WonAuctionCard({
  item,
  paymentMethods = [],
  selectedPaymentId,
  onSelectPayment,
  onPay,
}) {
  const isPending = item.status === 'pendiente';
  const finalPrice = item.finalPrice || 140;
  const shipping = item.shipping ?? 0;
  const commission = item.commission ?? 20;
  const currency = item.currency || 'USD';
  const totalAmount = finalPrice + shipping + commission;

  const formattedFinalPrice = `$${formatNumberWithDots(finalPrice)} ${currency}`;
  const formattedShipping = `$${formatNumberWithDots(shipping)} ${currency} (recogida en tienda)`;
  const formattedCommission = `$${formatNumberWithDots(commission)} ${currency}`;
  const formattedTotal = `$${formatNumberWithDots(totalAmount)} ${currency}`;

  const defaultPaymentId = paymentMethods[0]?.id;
  const currentSelectedPaymentId = selectedPaymentId || defaultPaymentId;

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
        <Text style={styles.wonPriceLabel}>Envio:</Text>
        <Text style={styles.wonPriceValue}>{formattedShipping}</Text>
      </View>
      <View style={styles.wonPriceRow}>
        <Text style={styles.wonPriceLabel}>Comision de servicio:</Text>
        <Text style={styles.wonPriceValue}>{formattedCommission}</Text>
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
              con un valor de {item.fineAmount || '$300 USD'}.
            </Text>
          </View>

          {/* Elige como pagar */}
          <Text style={styles.wonSectionTitle}>Elige como pagar</Text>
          <View style={styles.wonPaymentCardsTable}>
            {paymentMethods.map((pm, idx) => {
              const isSelected = String(pm.id) === String(currentSelectedPaymentId);
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
                        {pm.brand || 'Visa'} •••• {pm.last4 || '4367'}
                      </Text>
                    </View>
                    <Text style={styles.wonPaymentExpiry}>
                      Vence {pm.expiry || '09/27'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* Pay Button */}
          <Pressable
            style={styles.wonPayButton}
            onPress={() => onPay(item.id, currentSelectedPaymentId)}
          >
            <Text style={styles.wonPayButtonText}>PAGAR {formattedTotal}</Text>
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
            <View style={styles.visaBadge}>
              <Text style={styles.visaBadgeText}>
                {(item.paymentMethod?.brand || 'VISA').toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.wonPaidMethodTitle}>
                •••• {item.paymentMethod?.last4 || '4367'}
              </Text>
              <Text style={styles.wonPaidMethodSubtitle}>
                {item.paymentMethod?.cardholder || 'Juana Mendez'}
              </Text>
            </View>
          </View>
          <Text style={styles.wonSuccessNotice}>
            Tu pago se ha procesado correctamente. Estaras recibiendo un email con
            proximas instrucciones en la brevedad.
          </Text>
        </>
      )}
    </View>
  );
}

function BidRow({ item }) {
  return (
    <View style={styles.bidRow}>
      <Image source={item.image} resizeMode="cover" style={styles.productImage} />
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
        <Image source={item.image} resizeMode="cover" style={styles.productImage} />
        <View style={styles.penaltyBody}>
          <Text numberOfLines={2} style={styles.rowTitle}>{item.auction}</Text>
          <Text style={styles.rowText}>Fecha: {item.date}</Text>
          <Text style={styles.rowText}>Monto ofertado: {item.amount}</Text>
          <Text style={styles.rowBold}>Multa aplicada (10%): {item.penalty}</Text>
        </View>
      </View>
      <View style={styles.purchaseActions}>
        {item.status === 'pendiente' ? (
          <Pressable
            onPress={onPayPenalty}
            style={[styles.outlineButton, styles.purchaseActionButton]}
          >
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
        onPress={() => setIsOpen((currentValue) => !currentValue)}
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
                style={[
                  styles.selectOption,
                  isSelected ? styles.selectOptionActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.selectOptionText,
                    isSelected ? styles.selectOptionTextActive : null,
                  ]}
                >
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

const dashboardStats = [
  { label: 'Participaste', value: '12', helper: 'subastas' },
  { label: 'Pujas realizadas', value: '28', helper: 'ofertas' },
  { label: 'Ganadas', value: '4', helper: 'subastas' },
  { label: 'Pagado', value: '$120k', helper: 'total' },
];

const categoryMetrics = [
  { category: 'Comun', participated: 5, won: 2 },
  { category: 'Especial', participated: 3, won: 1 },
  { category: 'Plata', participated: 2, won: 1 },
  { category: 'Oro', participated: 1, won: 0 },
  { category: 'Platino', participated: 1, won: 0 },
];

const monthlyBidHistory = {
  2026: [
    { label: 'Ene', value: 1 },
    { label: 'Feb', value: 0 },
    { label: 'Mar', value: 2 },
    { label: 'Abr', value: 6 },
    { label: 'May', value: 4 },
    { label: 'Jun', value: 3 },
    { label: 'Jul', value: 4 },
    { label: 'Ago', value: 5 },
    { label: 'Sep', value: 2 },
    { label: 'Oct', value: 1 },
    { label: 'Nov', value: 0 },
    { label: 'Dic', value: 0 },
  ],
  2025: [
    { label: 'Ene', value: 0 },
    { label: 'Feb', value: 1 },
    { label: 'Mar', value: 3 },
    { label: 'Abr', value: 2 },
    { label: 'May', value: 0 },
    { label: 'Jun', value: 1 },
    { label: 'Jul', value: 4 },
    { label: 'Ago', value: 2 },
    { label: 'Sep', value: 3 },
    { label: 'Oct', value: 1 },
    { label: 'Nov', value: 1 },
    { label: 'Dic', value: 0 },
  ],
};
const metricYears = Object.keys(monthlyBidHistory).sort((firstYear, secondYear) =>
  Number(secondYear) - Number(firstYear)
);

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
          {
            backgroundColor: color,
            width: normalizedValue > 0 ? `${Math.max(7, normalizedValue)}%` : '0%',
          },
        ]}
      />
    </View>
  );
}

function DonutChart({ value }) {
  const size = 118;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference * value;

  return (
    <View style={styles.donutWrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke="rgba(138, 74, 58, 0.16)"
          strokeWidth={strokeWidth}
        />
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
        <Text style={styles.donutValue}>33%</Text>
        <Text style={styles.donutLabel}>ganadas</Text>
      </View>
    </View>
  );
}

function YearSelect({ onChange, selectedYear }) {
  const [isOpen, setIsOpen] = useState(false);

  function handleSelect(year) {
    onChange(year);
    setIsOpen(false);
  }

  return (
    <View style={styles.yearSelectContainer}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsOpen((currentValue) => !currentValue)}
        style={styles.yearSelectTrigger}
      >
        <Text style={styles.yearSelectValue}>Año {selectedYear}</Text>
        <ChevronIcon />
      </Pressable>

      {isOpen ? (
        <View style={styles.yearSelectMenu}>
          {metricYears.map((year) => {
            const isSelected = year === selectedYear;

            return (
              <Pressable
                key={year}
                onPress={() => handleSelect(year)}
                style={[
                  styles.yearSelectOption,
                  isSelected ? styles.yearSelectOptionActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.yearSelectOptionText,
                    isSelected ? styles.yearSelectOptionTextActive : null,
                  ]}
                >
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

function MonthlyBars({ selectedYear }) {
  const monthlyBids = monthlyBidHistory[selectedYear] || [];
  const maxValue = Math.max(1, ...monthlyBids.map((item) => item.value));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.barScroll}
      contentContainerStyle={styles.barChart}
    >
      {monthlyBids.map((item) => {
        const height = item.value > 0 ? Math.max(18, (item.value / maxValue) * 96) : 0;

        return (
          <View key={`${selectedYear}-${item.label}`} style={styles.barColumn}>
            <View style={styles.barSlot}>
              {height > 0 ? <View style={[styles.barFill, { height }]} /> : null}
            </View>
            <Text style={styles.barValue}>{item.value}</Text>
            <Text style={styles.barLabel}>{item.label}</Text>
            <Text style={styles.barYear}>{selectedYear}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

function MetricsContent() {
  const [selectedYear, setSelectedYear] = useState(metricYears[0]);

  return (
    <>
      <View style={styles.statsGrid}>
        {dashboardStats.map((item) => (
          <DashboardStat
            helper={item.helper}
            key={item.label}
            label={item.label}
            value={item.value}
          />
        ))}
      </View>

      <ActivityCard title="Resumen de actividad">
        <View style={styles.dashboardRow}>
          <DonutChart value={4 / 12} />
          <View style={styles.dashboardCopy}>
            <Text style={styles.metricLine}>
              <Text style={styles.metricStrong}>Participaste en:</Text> 12
            </Text>
            <Text style={styles.metricLine}>
              <Text style={styles.metricStrong}>Pujas realizadas:</Text> 28
            </Text>
            <Text style={styles.metricLine}>
              <Text style={styles.metricStrong}>Subastas ganadas:</Text> 4
            </Text>
          </View>
        </View>
      </ActivityCard>

      <ActivityCard title="Montos">
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Total ofertado</Text>
          <Text style={styles.amountValue}>$185.000</Text>
        </View>
        <MiniProgress value={100} />
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Total pagado</Text>
          <Text style={styles.amountValue}>$120.000</Text>
        </View>
        <MiniProgress color={colors.blush} value={65} />
      </ActivityCard>

      <ActivityCard title="Pujas por mes">
        <YearSelect selectedYear={selectedYear} onChange={setSelectedYear} />
        <MonthlyBars selectedYear={selectedYear} />
      </ActivityCard>

      <ActivityCard title="Por categoria" style={styles.categoryCard}>
        {categoryMetrics.map((item) => {
          const value = item.participated > 0 ? (item.won / item.participated) * 100 : 0;

          return (
            <View key={item.category} style={styles.categoryMetricRow}>
              <View style={styles.categoryMetricHeader}>
                <Text style={styles.categoryName}>{item.category}</Text>
                <Text style={styles.categoryValue}>
                  {item.won} ganadas de {item.participated} participaciones
                </Text>
              </View>
              <MiniProgress color={colors.cocoa} value={value} />
            </View>
          );
        })}
      </ActivityCard>
    </>
  );
}

function AppModal({ children, onClose, title, visible }) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>x</Text>
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

function AuctionDetailModal({ item, onClose }) {
  if (!item) {
    return null;
  }

  return (
    <AppModal onClose={onClose} title="Detalle de subasta" visible={Boolean(item)}>
      <ScrollView contentContainerStyle={styles.modalScrollContent}>
        <Image source={item.image} resizeMode="contain" style={styles.detailImage} />
        <View style={styles.auctionModalTitleRow}>
          <Text style={[styles.modalProductTitle, styles.auctionModalTitle]}>{item.title}</Text>
          <StatusPill label={item.status} style={styles.auctionModalStatus} />
        </View>
        <Text style={styles.modalText}>{item.description}</Text>
        <View style={styles.detailList}>
          <Text style={styles.detailLine}>Fecha: {item.date}</Text>
          <Text style={styles.detailLine}>Ubicacion: {item.location}</Text>
          <Text style={styles.detailLine}>Organiza: {item.organizer}</Text>
          <Text style={styles.detailLine}>Piezas: {item.pieces}</Text>
          <Text style={styles.detailLine}>Categoria: {item.category}</Text>
          <Text style={styles.detailLine}>Puja minima: {item.minimumBid}</Text>
          <Text style={styles.detailLine}>{item.registration}</Text>
        </View>
        <Pressable onPress={onClose} style={styles.modalPrimaryButton}>
          <Text style={styles.modalPrimaryText}>Cerrar</Text>
        </Pressable>
      </ScrollView>
    </AppModal>
  );
}

function PurchaseDetailModal({ item, onClose }) {
  if (!item) {
    return null;
  }

  return (
    <AppModal onClose={onClose} title="Detalle de compra" visible={Boolean(item)}>
      <ScrollView contentContainerStyle={styles.modalScrollContent}>
        <Image source={item.image} resizeMode="contain" style={styles.detailImage} />
        <Text style={styles.modalProductTitle}>{item.title}</Text>
        <Text style={styles.modalText}>Subasta: {item.auction}</Text>
        <Text style={styles.modalText}>Total pagado: {item.amount}</Text>
        <Text style={styles.modalText}>Fecha de compra: {item.date}</Text>
        <View style={styles.detailList}>
          <Text style={styles.detailLine}>Vendedor: {item.details.seller}</Text>
          <Text style={styles.detailLine}>Lote: {item.details.lot}</Text>
          <Text style={styles.detailLine}>Talle: {item.details.size}</Text>
          <Text style={styles.detailLine}>Material: {item.details.material}</Text>
          <Text style={styles.detailLine}>Estado: {item.details.condition}</Text>
        </View>
        <Pressable onPress={onClose} style={styles.modalPrimaryButton}>
          <Text style={styles.modalPrimaryText}>Cerrar</Text>
        </Pressable>
      </ScrollView>
    </AppModal>
  );
}

function PickupConfirmModal({ item, onClose, onConfirm }) {
  if (!item) {
    return null;
  }

  return (
    <AppModal onClose={onClose} title="Retiro personal" visible={Boolean(item)}>
      <Text style={styles.modalText}>
        Si confirmas el retiro personal, no podras deshacer esta accion y
        perderas la cobertura del seguro sobre tu compra.
      </Text>
      <Text style={styles.modalStrongText}>
        ¿Estas segura de que queres retirar "{item.title}" personalmente?
      </Text>
      <View style={styles.pickupAddressBox}>
        <Text style={styles.pickupAddressLabel}>Direccion de retiro</Text>
        <Text style={styles.pickupAddressText}>{item.pickupAddress}</Text>
        <Text style={styles.pickupAddressText}>{item.pickupWindow}</Text>
      </View>
      <View style={styles.modalActions}>
        <Pressable onPress={onClose} style={styles.modalSecondaryButton}>
          <Text style={styles.modalSecondaryText}>Cancelar</Text>
        </Pressable>
        <Pressable onPress={onConfirm} style={styles.modalPrimaryButtonSmall}>
          <Text style={styles.modalPrimaryText}>Si, retirar</Text>
        </Pressable>
      </View>
    </AppModal>
  );
}

function PickupLocationModal({ item, onClose }) {
  if (!item) {
    return null;
  }

  return (
    <AppModal onClose={onClose} title="Ubicacion de retiro" visible={Boolean(item)}>
      <Text style={styles.modalText}>
        Puede retirar en {item.pickupAddress} {item.pickupWindow}.
      </Text>
      <View style={styles.locationMap}>
        <AddressMapPreview address={item.pickup} />
      </View>
      <Pressable onPress={onClose} style={styles.modalPrimaryButton}>
        <Text style={styles.modalPrimaryText}>Entendido</Text>
      </Pressable>
    </AppModal>
  );
}

export default function MyActivityScreen({ onPayPenalty }) {
  const [activeTab, setActiveTab] = useState('Subastas');
  const [auctionDetailItem, setAuctionDetailItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [pickupConfirmationItem, setPickupConfirmationItem] = useState(null);
  const [pickupLocationItem, setPickupLocationItem] = useState(null);
  const [confirmedPickupIds, setConfirmedPickupIds] = useState({});

  const [wonAuctions, setWonAuctions] = useState(INITIAL_WON_AUCTIONS);
  const [userPaymentMethods, setUserPaymentMethods] = useState(DEFAULT_PAYMENT_METHODS);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState({});

  useEffect(() => {
    async function loadData() {
      try {
        const pmRes = await listPaymentMethods();
        if (pmRes && Array.isArray(pmRes.datos) && pmRes.datos.length > 0) {
          const mapped = pmRes.datos.map((pm) => ({
            id: String(pm.identificador || pm.id),
            brand: pm.detalle?.red || (pm.tipo === 'cuentaBancaria' ? 'Banco' : 'Visa'),
            last4: pm.detalle?.ultimosCuatroDigitos || pm.detalle?.numeroCuenta?.slice(-4) || '4367',
            expiry: formatPaymentExpiration(pm.detalle?.fechaVencimiento),
            cardholder: pm.detalle?.titular || pm.detalle?.nombreTitular || 'Juana Mendez',
          }));
          setUserPaymentMethods(mapped);
        }
      } catch (err) {
        // use default payment methods
      }

      try {
        const purchasesRes = await apiFetch('/v1/mi/compras');
        if (purchasesRes && Array.isArray(purchasesRes.datos) && purchasesRes.datos.length > 0) {
          const mappedPurchases = purchasesRes.datos.map((compra) => {
            const isPagado = Boolean(compra.pagado);
            const fecSubasta = compra.fechaPago ? new Date(compra.fechaPago) : new Date();
            const venc = compra.fechaVencimiento
              ? new Date(compra.fechaVencimiento)
              : new Date(fecSubasta.getTime() + 2 * 24 * 60 * 60 * 1000);

            const formatDateStr = (d) => {
              if (!d || isNaN(d.getTime())) return '14/04/2026';
              const day = String(d.getDate()).padStart(2, '0');
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const year = d.getFullYear();
              return `${day}/${month}/${year}`;
            };

            const prod = compra.detallesProducto || {};
            const firstFoto = Array.isArray(prod.fotos) && prod.fotos[0]
              ? { uri: resolveApiAssetUrl(prod.fotos[0]) }
              : require('../../assets/activity/sweet-lolita-dress.webp');

            let fullTitle = '';
            if (prod.nombre && prod.descripcionCatalogo) {
              fullTitle = `${prod.nombre} - ${prod.descripcionCatalogo}`;
            } else {
              fullTitle = prod.nombre || prod.descripcionCatalogo || `Subasta #${compra.subasta} - Producto #${compra.producto}`;
            }

            return {
              id: compra.identificador,
              code: prod.codigo || `SUB-${compra.identificador}`,
              title: fullTitle,
              image: firstFoto,
              finalPrice: Number(compra.importe) || 140,
              shipping: Number(compra.costoEnvio) || 0,
              commission: Number(compra.comision) || 20,
              currency: compra.moneda || 'USD',
              status: isPagado ? 'pagado' : 'pendiente',
              auctionDate: formatDateStr(fecSubasta),
              dueDate: formatDateStr(venc),
              fineAmount: '$300 USD',
              paidDate: isPagado ? formatDateStr(new Date(compra.fechaPago)) : null,
              paymentMethod: isPagado
                ? { brand: 'Visa', last4: '4367', cardholder: 'Juana Mendez' }
                : null,
            };
          });

          setWonAuctions(mappedPurchases);
        }
      } catch (err) {
        // keep initial won auctions state
      }
    }

    loadData();
  }, []);

  function handleSelectPayment(itemId, paymentId) {
    setSelectedPaymentMethods((prev) => ({
      ...prev,
      [itemId]: paymentId,
    }));
  }

  async function handlePayWonAuction(itemId, paymentId) {
    const pm = userPaymentMethods.find((p) => String(p.id) === String(paymentId)) || userPaymentMethods[0];

    if (typeof itemId === 'number' || (!isNaN(itemId) && Number(itemId) > 0)) {
      try {
        await apiFetch(`/v1/mi/compras/${itemId}/pagar`, {
          body: { idMedioPago: Number(paymentId) },
          method: 'POST',
        });
      } catch (err) {
        console.log('[MyActivityScreen] Error paying purchase via API:', err);
      }
    }

    const todayStr = new Date().toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    setWonAuctions((prev) =>
      prev.map((auc) => {
        if (auc.id === itemId) {
          return {
            ...auc,
            status: 'pagado',
            paidDate: todayStr,
            paymentMethod: pm,
          };
        }
        return auc;
      })
    );
  }

  function confirmPickup() {
    if (!pickupConfirmationItem) {
      return;
    }

    setConfirmedPickupIds((currentValues) => ({
      ...currentValues,
      [pickupConfirmationItem.id]: true,
    }));
    setPickupConfirmationItem(null);
  }

  return (
    <View style={styles.screen}>
      <ActivityCard style={styles.mainOuterCard}>
        <Text style={styles.title}>Mi actividad</Text>
        <ActivitySelect activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'Subastas' ? (
          <View style={styles.tabSection}>
            {auctionRows.map((item) => (
              <AuctionRow
                item={item}
                key={item.title}
                onPress={() => setAuctionDetailItem(item)}
              />
            ))}
          </View>
        ) : null}

        {activeTab === 'Compras' ? (
          <View style={styles.tabSection}>
            {wonAuctions.map((item) => (
              <WonAuctionCard
                item={item}
                key={item.id}
                onPay={handlePayWonAuction}
                onSelectPayment={(paymentId) => handleSelectPayment(item.id, paymentId)}
                paymentMethods={userPaymentMethods}
                selectedPaymentId={selectedPaymentMethods[item.id]}
              />
            ))}
            <Pressable style={styles.loadMoreButton}>
              <Text style={styles.loadMoreButtonText}>Cargar mas</Text>
            </Pressable>
          </View>
        ) : null}

        {activeTab === 'Pujas' ? (
          <View style={styles.tabSection}>
            {bidRows.map((item) => (
              <BidRow item={item} key={item.title} />
            ))}
          </View>
        ) : null}

        {activeTab === 'Multas' ? (
          <View style={styles.tabSection}>
            <ErrorSectionTitle>Incumplimiento de pago</ErrorSectionTitle>
            <View style={styles.penaltyGroupDivider} />
            {penaltyRows.map((item) => (
              <PenaltyRow
                item={item}
                key={`${item.auction}-${item.status}`}
                onPayPenalty={onPayPenalty}
              />
            ))}
            <Notice>
              Si no abonas la/s multa/s no podras participar en nuevas subastas.
            </Notice>
          </View>
        ) : null}

        {activeTab === 'Metricas' ? <MetricsContent /> : null}
      </ActivityCard>

      <AuctionDetailModal item={auctionDetailItem} onClose={() => setAuctionDetailItem(null)} />
      <PurchaseDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
      <PickupConfirmModal
        item={pickupConfirmationItem}
        onClose={() => setPickupConfirmationItem(null)}
        onConfirm={confirmPickup}
      />
      <PickupLocationModal
        item={pickupLocationItem}
        onClose={() => setPickupLocationItem(null)}
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
  purchaseAside: {
    alignItems: 'flex-end',
    rowGap: 7,
    width: 105,
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
  penaltyTitleRow: {
    alignItems: 'center',
    columnGap: 4,
    flexDirection: 'row',
  },
  penaltyTitle: {
    color: colors.cocoa,
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 17,
  },
  payPenaltyButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    borderColor: colors.burgundy,
    borderRadius: 5,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 26,
    paddingHorizontal: 6,
  },
  payPenaltyText: {
    color: colors.textBurgundy,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 16,
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
  barYear: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 10,
    lineHeight: 13,
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
  locationMap: {
    marginTop: 8,
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
    paddingVertical: 12,
    width: '100%',
  },
  wonPayButtonText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 0.5,
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
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  loadMoreButton: {
    alignSelf: 'center',
    backgroundColor: colors.burgundy,
    borderRadius: 20,
    marginBottom: 24,
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 10,
  },
  loadMoreButtonText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
});
