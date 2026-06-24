import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import AddressMapPreview from '../components/forms/AddressMapPreview';
import { resolveApiAssetUrl } from '../utils/config';
import { apiFetch, getApiErrorMessage } from '../utils/http';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

const tabs = ['Subastas', 'Compras', 'Pujas', 'Multas', 'Metricas'];
const tabLabels = {
  Compras: 'Compras realizadas',
  Metricas: 'Métricas',
  Multas: 'Multas',
  Pujas: 'Historial de pujas',
  Subastas: 'Subastas en las que participaste',
};

function formatAmount(value, moneda = 'ARS') {
  if (value == null) return '-';
  const formatted = Number(value).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  return moneda === 'USD' ? `U$S ${formatted}` : `$${formatted}`;
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

function mapSubasta(s) {
  const hora = s.hora ? ` · ${String(s.hora).slice(0, 5)}h` : '';
  return {
    identificador: s.identificador,
    title: s.nombre || `Subasta #${s.identificador}`,
    image: s.fotoPrincipal ? { uri: resolveApiAssetUrl(s.fotoPrincipal) } : null,
    date: s.fecha ? `${formatDateOnly(s.fecha)}${hora}` : '-',
    location: s.ubicacion || '-',
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
  return {
    title: p.producto?.descripcionCatalogo || `Ítem #${p.idItem}`,
    image: p.producto?.fotoPrincipal ? { uri: resolveApiAssetUrl(p.producto.fotoPrincipal) } : null,
    auction: p.subasta?.nombre || `Subasta #${p.idItem}`,
    date: formatDateTime(p.realizadaEn),
    amount: formatAmount(p.importe, p.subasta?.moneda),
    result: p.ganador === 'si' ? 'Ganadora' : 'Superada',
    resultTone: p.ganador === 'si' ? 'success' : 'danger',
  };
}

function mapCompra(r) {
  return {
    id: String(r.identificador),
    identificador: r.identificador,
    title: r.descripcionProducto || `Compra #${r.identificador}`,
    image: r.fotoProducto ? { uri: resolveApiAssetUrl(r.fotoProducto) } : null,
    auction: r.nombreSubasta || `Subasta #${r.idSubasta}`,
    date: r.fechaRegistro ? formatDateOnly(r.fechaRegistro) : '-',
    amount: formatAmount(r.importe, r.moneda),
    status: r.retiraPersonalmente ? 'retira personalmente' : r.pagado ? 'pagado' : 'pendiente de pago',
    retiraPersonalmente: Boolean(r.retiraPersonalmente),
    pickup: r.direccionRetiro || null,
    pickupAddress: r.direccionRetiroTexto || null,
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
  const normalizedLabel = label.toLowerCase();
  const tone =
    normalizedLabel.includes('finalizada') || normalizedLabel.includes('superada')
      ? 'danger'
      : normalizedLabel.includes('pendiente') || normalizedLabel.includes('abierta')
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

function DonutChart({ value, wonPercent }) {
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
        <Text style={styles.donutLabel}>ganadas</Text>
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

  const totalGanadas =
    metricas?.totalGanadas ??
    metricas?.pujasGanadas ??
    0;

  const totalPujas =
    metricas?.totalPujasRealizadas ??
    metricas?.totalPujas ??
    0;

  const totalPagado =
    metricas?.totalImportePagado ??
    0;

  const totalPujado =
    metricas?.totalImportePujado ??
    0;

  const wonRatio = totalParticipated > 0 ? totalGanadas / totalParticipated : 0;
  const wonPercent = Math.round(wonRatio * 100);
  const paidRatio = totalPujado > 0 ? (totalPagado / totalPujado) * 100 : 0;

  const dashboardStats = [
    { label: 'Participaste', value: String(totalParticipated), helper: 'subastas' },
    { label: 'Pujas realizadas', value: String(totalPujas), helper: 'ofertas' },
    { label: 'Ganadas', value: String(totalGanadas), helper: 'subastas' },
    { label: 'Pagado', value: formatAmount(totalPagado), helper: 'total' },
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
          <DonutChart value={wonRatio} wonPercent={wonPercent} />
          <View style={styles.dashboardCopy}>
            <Text style={styles.metricLine}>
              <Text style={styles.metricStrong}>Participaste en:</Text> {totalParticipated}
            </Text>
            <Text style={styles.metricLine}>
              <Text style={styles.metricStrong}>Pujas realizadas:</Text> {totalPujas}
            </Text>
            <Text style={styles.metricLine}>
              <Text style={styles.metricStrong}>Subastas ganadas:</Text> {totalGanadas}
            </Text>
          </View>
        </View>
      </ActivityCard>

      <ActivityCard title="Montos">
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Total ofertado</Text>
          <Text style={styles.amountValue}>{formatAmount(totalPujado)}</Text>
        </View>
        <MiniProgress value={100} />
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Total pagado</Text>
          <Text style={styles.amountValue}>{formatAmount(totalPagado)}</Text>
        </View>
        <MiniProgress color={colors.blush} value={paidRatio} />
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
                    {item.won} ganadas de {item.participated} participaciones
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

function AppModal({ children, onClose, title, visible }) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
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
        <Text style={styles.modalText}>Total pagado: {item.amount}</Text>
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

  return (
    <AppModal onClose={onClose} title="Retiro personal" visible={Boolean(item)}>
      <Text style={styles.modalText}>
        Si confirmas el retiro personal, no podras deshacer esta accion y
        perderas la cobertura del seguro sobre tu compra.
      </Text>
      <Text style={styles.modalStrongText}>
        ¿Estas segura de que queres retirar "{item.title}" personalmente?
      </Text>
      {item.pickupAddress ? (
        <View style={styles.pickupAddressBox}>
          <Text style={styles.pickupAddressLabel}>Direccion de retiro</Text>
          <Text style={styles.pickupAddressText}>{item.pickupAddress}</Text>
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

  return (
    <AppModal onClose={onClose} title="Ubicacion de retiro" visible={Boolean(item)}>
      <Text style={styles.modalText}>
        Puede retirar en {item.pickupAddress} {item.pickupWindow}.
      </Text>
      {item.pickup ? (
        <View style={styles.locationMap}>
          <AddressMapPreview address={item.pickup} />
        </View>
      ) : null}
      <Pressable onPress={onClose} style={styles.modalPrimaryButton}>
        <Text style={styles.modalPrimaryText}>Entendido</Text>
      </Pressable>
    </AppModal>
  );
}

export default function MyActivityScreen({ onPayPenalty }) {
  const [activeTab, setActiveTab] = useState('Subastas');
  const [tabData, setTabData] = useState({});
  const [tabLoading, setTabLoading] = useState({});
  const [tabError, setTabError] = useState({});

  const [auctionDetailItem, setAuctionDetailItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [pickupConfirmationItem, setPickupConfirmationItem] = useState(null);
  const [pickupLocationItem, setPickupLocationItem] = useState(null);
  const [isConfirmingPickup, setIsConfirmingPickup] = useState(false);

  const loadedTabs = useRef(new Set());
  const loadingTabs = useRef(new Set());

  const fetchTab = useCallback(async (tab) => {
    if (loadedTabs.current.has(tab) || loadingTabs.current.has(tab)) return;

    loadingTabs.current.add(tab);
    setTabLoading((prev) => ({ ...prev, [tab]: true }));
    setTabError((prev) => ({ ...prev, [tab]: null }));

    try {
      let result;

      if (tab === 'Subastas') {
        const res = await apiFetch('/v1/mi/subastas?pagina=1&cantidad=50');
        result = (res.datos || res || []).map(mapSubasta);
      } else if (tab === 'Pujas') {
        const res = await apiFetch('/v1/mi/pujas?pagina=1&cantidad=100');
        result = (res.datos || res || []).map(mapPuja);
      } else if (tab === 'Compras') {
        const res = await apiFetch('/v1/mi/compras?pagina=1&cantidad=50');
        result = (res.datos || res || []).map(mapCompra);
      } else if (tab === 'Multas') {
        const res = await apiFetch('/v1/mi/multas?pagina=1&cantidad=50');
        result = (res.datos || res || []).map(mapMulta);
      } else if (tab === 'Metricas') {
        const [metricasRes, pujasRes, comprasRes, subastasRes] = await Promise.all([
          apiFetch('/v1/mi/metricas'),
          apiFetch('/v1/mi/pujas?pagina=1&cantidad=100'),
          apiFetch('/v1/mi/compras?pagina=1&cantidad=100'),
          apiFetch('/v1/mi/subastas?pagina=1&cantidad=100'),
        ]);

        const pujas = pujasRes.datos || pujasRes || [];
        const compras = comprasRes.datos || comprasRes || [];
        const subastas = subastasRes.datos || subastasRes || [];

        const totalImportePujado = pujas.reduce(
          (acc, puja) => acc + Number(puja.importe || 0),
          0
        );

        const totalImportePagado = compras
          .filter((compra) => compra.pagado === true)
          .reduce((acc, compra) => acc + Number(compra.importe || 0), 0);

        const categoriasMap = {};

        subastas.forEach((subasta) => {
          const categoria = subasta.categoria || 'sin categoria';

          if (!categoriasMap[categoria]) {
            categoriasMap[categoria] = {
              categoria,
              participaciones: 0,
              ganadas: 0,
            };
          }

          categoriasMap[categoria].participaciones += 1;
        });

        const subastasPorId = {};

        subastas.forEach((subasta) => {
          subastasPorId[subasta.identificador] = subasta;
        });

        pujas.forEach((puja) => {
          if (puja.ganador !== 'si') return;

          const subastaId =
            puja.subasta?.identificador ??
            puja.subasta?.id ??
            puja.idSubasta;

          const subasta = subastasPorId[subastaId];

          if (!subasta?.categoria) return;

          const categoria = subasta.categoria;

          if (!categoriasMap[categoria]) {
            categoriasMap[categoria] = {
              categoria,
              participaciones: 0,
              ganadas: 0,
            };
          }

          categoriasMap[categoria].ganadas += 1;
        });

        result = {
          metricas: {
            ...metricasRes,
            totalSubastasParticipadas: subastas.length,
            totalGanadas: metricasRes.pujasGanadas ?? 0,
            totalPujasRealizadas: metricasRes.totalPujas ?? pujas.length,
            totalImportePagado,
            totalImportePujado,
            porCategoria: Object.values(categoriasMap),
          },
          monthlyBidHistory: buildMonthlyBids(pujas),
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
      <Text style={styles.title}>Mi actividad</Text>
      <ActivitySelect activeTab={activeTab} onChange={setActiveTab} />

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => retryTab(activeTab)} />
      ) : activeTab === 'Subastas' ? (
        !data || data.length === 0 ? (
          <EmptyState message="No participaste en ninguna subasta todavía." />
        ) : (
          <ActivityCard>
            {data.map((item) => (
              <AuctionRow
                item={item}
                key={item.identificador}
                onPress={() => setAuctionDetailItem(item)}
              />
            ))}
          </ActivityCard>
        )
      ) : activeTab === 'Compras' ? (
        !data || data.length === 0 ? (
          <EmptyState message="No realizaste compras todavía." />
        ) : (
          <>
            <ActivityCard>
              {data.map((item) => (
                <PurchaseRow
                  item={item}
                  key={item.id}
                  onRequestPickup={() => setPickupConfirmationItem(item)}
                  onShowDetail={() => setDetailItem(item)}
                  onShowPickupLocation={() => setPickupLocationItem(item)}
                />
              ))}
            </ActivityCard>
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
          <ActivityCard>
            {data.map((item, idx) => (
              <BidRow item={item} key={idx} />
            ))}
          </ActivityCard>
        )
      ) : activeTab === 'Multas' ? (
        !data || data.length === 0 ? (
          <EmptyState message="No tenés multas registradas." />
        ) : (
          <>
            <ActivityCard>
              <ErrorSectionTitle>Incumplimiento de pago</ErrorSectionTitle>
              <View style={styles.penaltyGroupDivider} />
              {data.map((item) => (
                <PenaltyRow
                  item={item}
                  key={item.id}
                  onPayPenalty={onPayPenalty}
                />
              ))}
            </ActivityCard>
            <Notice>
              Si no abonas la/s multa/s no podras participar en nuevas subastas.
            </Notice>
          </>
        )
      ) : activeTab === 'Metricas' && data ? (
        <MetricsContent metricas={data.metricas} monthlyBidHistory={data.monthlyBidHistory} />
      ) : null}

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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 32,
    paddingTop: 31,
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
  locationMap: {
    marginTop: 8,
  },
});
