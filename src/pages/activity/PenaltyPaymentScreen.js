import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { listPaymentMethods } from '../../services/paymentMethodsApi';
import { apiFetch, getApiErrorMessage } from '../../utils/http';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
function WarningIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4L21 20H3L12 4Z" fill={colors.burgundy} />
      <Path
        d="M12 9V14M12 17H12.01"
        stroke={colors.cream}
        strokeLinecap="round"
        strokeWidth={2.2}
      />
    </Svg>
  );
}

function SmallIcon({ type }) {
  if (type === 'auction') {
    return (
      <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
        <Path
          d="M9 7L15 13M7 9L13 15M6 10L10 6L16 12L12 16L6 10ZM14 15L20 21"
          stroke={colors.cocoa}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
        />
      </Svg>
    );
  }

  if (type === 'calendar') {
    return (
      <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
        <Rect x={4} y={5.5} width={16} height={14.5} rx={2} stroke={colors.cocoa} strokeWidth={1.8} />
        <Path d="M7.5 3.8V7.5M16.5 3.8V7.5M4 10H20" stroke={colors.cocoa} strokeLinecap="round" strokeWidth={1.8} />
      </Svg>
    );
  }

  if (type === 'percent') {
    return (
      <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
        <Path d="M7 17L17 7" stroke={colors.cocoa} strokeLinecap="round" strokeWidth={2} />
        <Circle cx={8} cy={8} r={2} stroke={colors.cocoa} strokeWidth={1.8} />
        <Circle cx={16} cy={16} r={2} stroke={colors.cocoa} strokeWidth={1.8} />
      </Svg>
    );
  }

  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8} stroke={colors.cocoa} strokeWidth={1.8} />
      <Path d="M12 7V17M8.8 10H13.5C15 10 16 10.9 16 12.1C16 13.4 15 14.2 13.5 14.2H10.2" stroke={colors.cocoa} strokeLinecap="round" strokeWidth={1.8} />
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

function DetailRow({ label, value, type, valueDanger = false }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <SmallIcon type={type} />
      </View>
      <View>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, valueDanger ? styles.valueDanger : null]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function RadioButton({ isSelected }) {
  return (
    <View style={[styles.radio, isSelected ? styles.radioSelected : null]}>
      {isSelected ? <View style={styles.radioDot} /> : null}
    </View>
  );
}

function buildMethodLabel(m) {
  if (m.tipo === 'tarjetaCredito') {
    const red = m.detalle?.red || 'Tarjeta';
    const digits = m.detalle?.ultimosCuatroDigitos || '????';
    return `${red} **** ${digits}`;
  }
  if (m.tipo === 'cuentaBancaria') {
    const banco = m.detalle?.nombreBanco || 'Banco';
    const cuenta = String(m.detalle?.numeroCuenta || '');
    const last4 = cuenta.length >= 4 ? cuenta.slice(-4) : cuenta || '????';
    return `${banco} **** ${last4}`;
  }
  return 'Cheque certificado';
}

function buildMethodDetail(m) {
  if (m.tipo === 'tarjetaCredito' && m.detalle?.fechaVencimiento) {
    const parts = String(m.detalle.fechaVencimiento).split('-');
    return parts.length >= 2 ? `Venc. ${parts[1]}/${parts[0]}` : '';
  }
  if (m.tipo === 'cuentaBancaria') {
    return m.detalle?.nombreBanco || '';
  }
  if (m.tipo === 'chequeCertificado' && m.detalle?.montoDisponible != null) {
    return `Disponible: $${Number(m.detalle.montoDisponible).toLocaleString('es-AR')}`;
  }
  return '';
}

function extractPaymentMethods(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.datos)) return response.datos;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function isEnabledFlag(value, defaultValue = false) {
  if (value == null) return defaultValue;
  if (typeof value === 'boolean') return value;
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

function getMethodAvailableAmount(method) {
  if (method?.tipo !== 'chequeCertificado') return null;
  const rawAmount =
    method.detalle?.montoDisponible ??
    method.detalle?.montoGarantizado ??
    method.detalle?.amount;
  return parseMoney(rawAmount);
}

function hasInsufficientFunds(method, amount) {
  const available = getMethodAvailableAmount(method);
  return available != null && available < amount;
}

export default function PenaltyPaymentScreen({ multa, onPaid }) {
  const [methods, setMethods] = useState([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [methodsError, setMethodsError] = useState('');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const paymentProgress = useRef(new Animated.Value(0)).current;

  async function loadMethods() {
    setLoadingMethods(true);
    setMethodsError('');
    try {
      const res = await listPaymentMethods();
      const all = extractPaymentMethods(res);
      const active = all.filter((m) => isEnabledFlag(m.activo, true));
      setMethods(active);
      setSelectedMethod(active[0]?.identificador || null);
    } catch (err) {
      setMethodsError(getApiErrorMessage(err, 'No se pudieron cargar los medios de pago.'));
    } finally {
      setLoadingMethods(false);
    }
  }

  useEffect(() => {
    loadMethods();
  }, []);

  async function handlePay() {
    if (!selectedMethod || !multa?.identificador) return;
    if (selectedMethodInsufficientFunds) return;
    setSubmitting(true);
    setSubmitError('');
    setPaymentStatus('processing');
    paymentProgress.setValue(0);
    Animated.timing(paymentProgress, {
      duration: 1300,
      toValue: 0.88,
      useNativeDriver: false,
    }).start();
    try {
      await Promise.all([
        apiFetch(`/v1/mi/multas/${multa.identificador}/pagar`, {
          method: 'POST',
          body: { idMedioPago: selectedMethod },
        }),
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ]);
      Animated.timing(paymentProgress, {
        duration: 260,
        toValue: 1,
        useNativeDriver: false,
      }).start(() => {
        setPaymentStatus('paid');
        setTimeout(() => onPaid?.(), 650);
      });
    } catch (err) {
      paymentProgress.stopAnimation();
      Animated.timing(paymentProgress, {
        duration: 180,
        toValue: 0,
        useNativeDriver: false,
      }).start();
      setPaymentStatus('idle');
      setSubmitError(getApiErrorMessage(err, 'No se pudo procesar el pago.'));
      setSubmitting(false);
    }
  }

  const penaltyAmount = parseMoney(multa?.penalty);
  const selectedPaymentMethod = methods.find(
    (method) => method.identificador === selectedMethod
  );
  const selectedMethodInsufficientFunds = hasInsufficientFunds(
    selectedPaymentMethod,
    penaltyAmount
  );
  const paymentFillWidth = paymentProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  const canPay =
    selectedMethod !== null &&
    !selectedMethodInsufficientFunds &&
    !submitting &&
    paymentStatus !== 'paid';
  const payButtonLabel = selectedMethodInsufficientFunds
    ? 'Saldo insuficiente'
    : paymentStatus === 'paid'
    ? 'Pago realizado'
    : submitting
    ? 'Procesando...'
    : `Pagar ${multa?.penalty || ''}`;

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Pagar multa</Text>

      <View style={styles.warningBox}>
        <View style={styles.warningIconWrap}>
          <WarningIcon />
        </View>
        <View style={styles.warningTextBlock}>
          <Text style={styles.warningTitle}>Incumplimiento de pago</Text>
          <Text style={styles.warningText}>
            No pudiste completar el pago de la subasta. La multa corresponde al
            10% del valor ofertado.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Detalle de la multa</Text>
        <View style={styles.divider} />
        <DetailRow label="Subasta" type="auction" value={multa?.auction || '-'} />
        <DetailRow label="Fecha" type="calendar" value={multa?.date || '-'} />
        {multa?.amount && multa.amount !== '-' ? (
          <DetailRow label="Monto ofertado" type="money" value={multa.amount} />
        ) : null}
        <DetailRow
          label="Multa aplicada (10%)"
          type="percent"
          value={multa?.penalty || '-'}
          valueDanger
        />
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total a pagar</Text>
        <Text style={styles.totalAmount}>{multa?.penalty || '-'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Elegí un medio de pago</Text>
        <View style={styles.divider} />
        {loadingMethods ? (
          <ActivityIndicator color={colors.burgundy} size="small" style={styles.loader} />
        ) : methodsError ? (
          <View style={styles.methodError}>
            <Text style={styles.methodErrorText}>{methodsError}</Text>
            <Pressable onPress={loadMethods} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : methods.length === 0 ? (
          <Text style={styles.emptyMethods}>
            No tenés medios de pago activos. Agregá uno desde tu perfil.
          </Text>
        ) : (
          methods.map((m) => {
            const insufficientFunds = hasInsufficientFunds(m, penaltyAmount);
            return (
              <Pressable
                key={m.identificador}
                onPress={() => setSelectedMethod(m.identificador)}
                style={styles.paymentOption}
              >
                <RadioButton isSelected={selectedMethod === m.identificador} />
                <View style={styles.paymentTextBlock}>
                  <Text style={styles.paymentLabel}>{buildMethodLabel(m)}</Text>
                  <Text
                    style={[
                      styles.paymentDetail,
                      insufficientFunds ? styles.paymentDetailDanger : null,
                    ]}
                  >
                    {insufficientFunds
                      ? `${buildMethodDetail(m)} · saldo insuficiente`
                      : buildMethodDetail(m)}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </View>

      {submitError ? (
        <Text style={styles.submitError}>{submitError}</Text>
      ) : null}

      <View style={styles.payNotice}>
        <InfoIcon />
        <Text style={styles.payNoticeText}>
          Al pagar la multa podras volver a participar en todas las subastas.
        </Text>
      </View>

      <View style={styles.submit}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canPay }}
          disabled={!canPay}
          onPress={handlePay}
          style={[
            styles.payButton,
            !canPay && paymentStatus !== 'paid' ? styles.payButtonDisabled : null,
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.payButtonFill,
              { width: paymentFillWidth },
              paymentStatus === 'paid' ? styles.payButtonFillDone : null,
            ]}
          />
          <Text style={styles.payButtonText}>{payButtonLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 44,
    paddingTop: 50,
    zIndex: 2,
  },
  title: {
    color: colors.cocoa,
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 32,
    marginBottom: 16,
  },
  warningBox: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(242, 211, 200, 0.54)',
    borderColor: 'rgba(138, 74, 58, 0.22)',
    borderRadius: 16,
    borderWidth: 1,
    columnGap: 11,
    flexDirection: 'row',
    marginBottom: 16,
    minHeight: 82,
    paddingHorizontal: 13,
    paddingVertical: 13,
  },
  warningIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(159, 2, 29, 0.12)',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    marginTop: 1,
    width: 36,
  },
  warningTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  warningTitle: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 2,
  },
  warningText: {
    color: colors.cocoa,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 17,
  },
  card: {
    backgroundColor: 'rgba(242, 211, 200, 0.5)',
    borderRadius: 16,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    width: '100%',
  },
  cardTitle: {
    color: colors.cocoa,
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 24,
  },
  divider: {
    backgroundColor: colors.cocoa,
    height: 1,
    marginBottom: 9,
    opacity: 0.65,
    width: '100%',
  },
  detailRow: {
    alignItems: 'center',
    columnGap: 10,
    flexDirection: 'row',
    minHeight: 50,
  },
  detailIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(214, 136, 143, 0.24)',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  detailLabel: {
    color: colors.cocoa,
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 14,
  },
  detailValue: {
    color: '#2A0E0E',
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 18,
  },
  valueDanger: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
  },
  totalRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(242, 211, 200, 0.7)',
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    minHeight: 38,
    paddingHorizontal: 15,
  },
  totalLabel: {
    color: colors.cocoa,
    fontFamily: fonts.bold,
    fontSize: 17,
  },
  totalAmount: {
    color: colors.burgundy,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  loader: {
    marginVertical: 12,
  },
  methodError: {
    alignItems: 'center',
    paddingVertical: 8,
    rowGap: 8,
  },
  methodErrorText: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 17,
    textAlign: 'center',
  },
  retryButton: {
    borderColor: colors.burgundy,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  retryButtonText: {
    color: colors.burgundy,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  emptyMethods: {
    color: colors.cocoa,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 17,
    paddingVertical: 8,
    textAlign: 'center',
  },
  paymentOption: {
    alignItems: 'center',
    columnGap: 10,
    flexDirection: 'row',
    minHeight: 42,
  },
  radio: {
    alignItems: 'center',
    borderColor: '#20100D',
    borderRadius: 8,
    borderWidth: 1.4,
    height: 17,
    justifyContent: 'center',
    width: 17,
  },
  radioSelected: {
    borderColor: colors.cocoa,
  },
  radioDot: {
    backgroundColor: colors.cocoa,
    borderRadius: 5,
    height: 9,
    width: 9,
  },
  paymentTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  paymentLabel: {
    color: colors.cocoa,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 17,
  },
  paymentDetail: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 14,
  },
  paymentDetailDanger: {
    color: colors.burgundy,
    fontFamily: fonts.medium,
  },
  submitError: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 17,
    marginBottom: 10,
    textAlign: 'center',
  },
  payNotice: {
    alignItems: 'center',
    backgroundColor: 'rgba(159, 2, 29, 0.08)',
    borderColor: colors.burgundy,
    borderRadius: 5,
    borderWidth: 1,
    columnGap: 8,
    flexDirection: 'row',
    marginBottom: 12,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  payNoticeText: {
    color: colors.textBurgundy,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 17,
  },
  submit: {
    alignItems: 'center',
    marginBottom: 22,
  },
  payButton: {
    alignItems: 'center',
    backgroundColor: colors.burgundy,
    borderRadius: 5,
    height: 45,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  payButtonFill: {
    backgroundColor: colors.textBurgundy,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  payButtonFillDone: {
    backgroundColor: '#7FAE76',
  },
  payButtonDisabled: {
    backgroundColor: 'rgba(159, 2, 29, 0.38)',
  },
  payButtonText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 15,
    zIndex: 1,
  },
});
