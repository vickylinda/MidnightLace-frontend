import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

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

export default function PenaltyPaymentScreen({ multa, onPaid }) {
  const [methods, setMethods] = useState([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [methodsError, setMethodsError] = useState('');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  async function loadMethods() {
    setLoadingMethods(true);
    setMethodsError('');
    try {
      const res = await apiFetch('/v1/medios-de-pago');
      const all = res.datos || res || [];
      const valid = all.filter((m) => m.verificado === 'si' && m.activo === 'si');
      setMethods(valid);
      if (valid.length > 0) setSelectedMethod(valid[0].identificador);
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
    setSubmitting(true);
    setSubmitError('');
    try {
      await apiFetch(`/v1/mi/multas/${multa.identificador}/pagar`, {
        method: 'POST',
        body: { idMedioDePago: selectedMethod },
      });
      onPaid?.();
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, 'No se pudo procesar el pago.'));
    } finally {
      setSubmitting(false);
    }
  }

  const canPay = selectedMethod !== null && !submitting;

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Pagar multa</Text>

      <View style={styles.warningBox}>
        <WarningIcon />
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
            No tenés medios de pago verificados. Agregá uno desde tu perfil.
          </Text>
        ) : (
          methods.map((m) => (
            <Pressable
              key={m.identificador}
              onPress={() => setSelectedMethod(m.identificador)}
              style={styles.paymentOption}
            >
              <RadioButton isSelected={selectedMethod === m.identificador} />
              <View style={styles.paymentTextBlock}>
                <Text style={styles.paymentLabel}>{buildMethodLabel(m)}</Text>
                <Text style={styles.paymentDetail}>{buildMethodDetail(m)}</Text>
              </View>
            </Pressable>
          ))
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
          style={[styles.payButton, !canPay ? styles.payButtonDisabled : null]}
        >
          <Text style={styles.payButtonText}>
            {submitting ? 'Procesando...' : `Pagar ${multa?.penalty || ''}`}
          </Text>
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
    alignItems: 'center',
    backgroundColor: 'rgba(242, 211, 200, 0.66)',
    borderColor: colors.burgundy,
    borderRadius: 5,
    borderWidth: 1,
    columnGap: 13,
    flexDirection: 'row',
    marginBottom: 16,
    minHeight: 76,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  warningTextBlock: {
    flex: 1,
  },
  warningTitle: {
    color: '#2A0E0E',
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
  },
  warningText: {
    color: '#2A0E0E',
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 15,
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
    width: '100%',
  },
  payButtonDisabled: {
    backgroundColor: 'rgba(159, 2, 29, 0.38)',
  },
  payButtonText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
});
