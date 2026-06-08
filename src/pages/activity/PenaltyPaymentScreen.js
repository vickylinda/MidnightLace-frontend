import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

const paymentMethods = [
  {
    detail: 'Venc. 06/2028',
    id: 'visa',
    label: 'Tarjeta Visa **** 4242',
  },
  {
    detail: 'Banco Nacion',
    id: 'bank',
    label: 'Cuenta corriente **** 1567',
  },
  {
    detail: 'Venc. 11/2027',
    id: 'mastercard',
    label: 'Tarjeta Mastercard **** 8821',
  },
  {
    detail: 'Disponible: $50.000',
    id: 'check',
    label: 'Cheque certificado',
  },
];

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

export default function PenaltyPaymentScreen({ onPaid }) {
  const [selectedMethod, setSelectedMethod] = useState('visa');

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
        <DetailRow label="Subasta" type="auction" value="Gothic Night" />
        <DetailRow label="Fecha" type="calendar" value="22/08/2026 · 20:00h" />
        <DetailRow label="Monto ofertado" type="money" value="$32.500" />
        <DetailRow
          label="Multa aplicada (10%)"
          type="percent"
          value="$3.250"
          valueDanger
        />
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total a pagar</Text>
        <Text style={styles.totalAmount}>$3.250</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Elegi un medio de pago</Text>
        <View style={styles.divider} />
        {paymentMethods.map((method) => (
          <Pressable
            key={method.id}
            onPress={() => setSelectedMethod(method.id)}
            style={styles.paymentOption}
          >
            <RadioButton isSelected={selectedMethod === method.id} />
            <View style={styles.paymentTextBlock}>
              <Text style={styles.paymentLabel}>{method.label}</Text>
              <Text style={styles.paymentDetail}>{method.detail}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.payNotice}>
        <InfoIcon />
        <Text style={styles.payNoticeText}>
          Al pagar la multa podras volver a participar en todas las subastas.
        </Text>
      </View>

      <View style={styles.submit}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !selectedMethod }}
          disabled={!selectedMethod}
          onPress={onPaid}
          style={[styles.payButton, !selectedMethod ? styles.payButtonDisabled : null]}
        >
          <Text style={styles.payButtonText}>Pagar $3.250</Text>
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
