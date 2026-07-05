import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import creditCardType from 'credit-card-type';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import AuthTextField from '../../components/forms/auth/AuthTextField';
import PrimaryButton from '../../components/forms/controls/PrimaryButton';
import AmexIcon from '../../assets/payment/amex.svg';
import DinersIcon from '../../assets/payment/diners.svg';
import DiscoverIcon from '../../assets/payment/discover.svg';
import JcbIcon from '../../assets/payment/jcb.svg';
import MaestroIcon from '../../assets/payment/maestro.svg';
import MastercardIcon from '../../assets/payment/mastercard.svg';
import UnionpayIcon from '../../assets/payment/unionpay.svg';
import VisaIcon from '../../assets/payment/visa.svg';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import {
  createPaymentMethod,
  listCountries,
  updatePaymentMethod,
} from '../../services/paymentMethodsApi';
import { getApiErrorMessage } from '../../utils/http';

const PAYMENT_METHODS = [
  { label: 'Cuenta bancaria', value: 'bank' },
  { label: 'Tarjeta de crédito', value: 'card' },
  { label: 'Cheque certificado', value: 'check' },
];

const ACCOUNT_TYPES = [
  { label: 'Caja de ahorro', value: 'savings' },
  { label: 'Cuenta corriente', value: 'checking' },
];

const CARD_SCOPE_TYPES = [
  { label: 'Nacional', value: 'national' },
  { label: 'Internacional / Extranjera', value: 'international' },
];

const CURRENCIES = [
  { label: 'ARS', value: 'ARS' },
  { label: 'USD', value: 'USD' },
];

const CARDHOLDER_MAX_LENGTH = 26;
const DEFAULT_CARD_DIGIT_LIMIT = 19;

const CARD_BRAND_ICONS = {
  'american-express': AmexIcon,
  'diners-club': DinersIcon,
  discover: DiscoverIcon,
  jcb: JcbIcon,
  maestro: MaestroIcon,
  mastercard: MastercardIcon,
  unionpay: UnionpayIcon,
  visa: VisaIcon,
};

const INITIAL_BANK = {
  accountNumber: '',
  accountType: '',
  bankName: '',
  country: '',
  cbu: '',
  reservedFunds: '',
  reservedFundsCurrency: '',
};

const INITIAL_CARD = {
  cardholder: '',
  cardNumber: '',
  cvv: '',
  expiration: '',
  scope: '',
};

const INITIAL_CHECK = {
  amount: '',
  amountCurrency: '',
  bankName: '',
  checkNumber: '',
  emissionDate: '',
  proof: null,
};

function ChevronIcon({ color = colors.cream }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9L12 15L18 9"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3}
      />
    </Svg>
  );
}

function UploadIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 15.5V4.8M12 4.8L8.25 8.55M12 4.8L15.75 8.55"
        stroke={colors.burgundy}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
      <Path
        d="M5 14.6V18.2C5 19.3 5.9 20.2 7 20.2H17C18.1 20.2 19 19.3 19 18.2V14.6"
        stroke={colors.burgundy}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

function CameraIcon() {
  return (
    <Svg height={22} viewBox="0 0 24 24" width={22}>
      <Path
        d="M4.5 8.5H7L8.3 6H15.7L17 8.5H19.5V18.5H4.5V8.5Z"
        fill="none"
        stroke={colors.burgundy}
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
      <Circle
        cx={12}
        cy={13.2}
        fill="none"
        r={3.2}
        stroke={colors.burgundy}
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function GalleryIcon() {
  return (
    <Svg height={22} viewBox="0 0 24 24" width={22}>
      <Rect
        fill="none"
        height={15}
        rx={2}
        stroke={colors.burgundy}
        strokeWidth={1.8}
        width={17}
        x={3.5}
        y={4.5}
      />
      <Circle cx={9} cy={9.3} fill={colors.burgundy} r={1.5} />
      <Path
        d="M5.5 17L10.3 12.3L13.3 15.1L15.8 12.7L18.6 15.6"
        fill="none"
        stroke={colors.burgundy}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function FileIcon() {
  return (
    <Svg height={20} viewBox="0 0 24 24" width={20}>
      <Path
        d="M7 3.8H14.2L18 7.6V20.2H7V3.8Z"
        fill="none"
        stroke={colors.burgundy}
        strokeLinejoin="round"
        strokeWidth={2}
      />
      <Path
        d="M14 4V8H18"
        fill="none"
        stroke={colors.burgundy}
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

function ErrorIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Circle cx={8} cy={8} r={7} stroke={colors.burgundy} strokeWidth={1.5} />
      <Rect x={7.25} y={3.75} width={1.5} height={6} rx={0.75} fill={colors.burgundy} />
      <Circle cx={8} cy={12.1} r={0.9} fill={colors.burgundy} />
    </Svg>
  );
}

function ErrorMessage({ children }) {
  if (!children) {
    return null;
  }

  return (
    <View style={styles.errorRow}>
      <ErrorIcon />
      <Text style={styles.errorText}>{children}</Text>
    </View>
  );
}

function SelectField({
  compact = false,
  error,
  label,
  onChange,
  options,
  placeholder,
  style,
  value,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  function handleSelect(nextValue) {
    onChange(nextValue);
    setIsOpen(false);
  }

  return (
    <View
      style={[
        compact ? styles.compactSelectContainer : styles.selectContainer,
        style,
      ]}
    >
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => setIsOpen((currentValue) => !currentValue)}
        style={compact ? styles.lineSelectButton : styles.methodSelectButton}
      >
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          numberOfLines={1}
          style={compact ? styles.lineSelectText : styles.methodSelectText}
        >
          {selectedOption?.label || placeholder}
        </Text>
        <ChevronIcon color={compact ? colors.burgundy : colors.cream} />
      </Pressable>

      {isOpen ? (
        <View style={compact ? styles.lineSelectMenu : styles.methodSelectMenu}>
          {options.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => handleSelect(option.value)}
              style={styles.selectOption}
            >
              <Text style={styles.selectOptionText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <ErrorMessage>{error}</ErrorMessage>
    </View>
  );
}

function CountrySelectField({
  countries,
  error,
  label,
  onBlur,
  onChange,
  value,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const countryOptions = useMemo(
    () =>
      countries.map((country) => ({
        label: country.nombre,
        value: String(country.numero),
      })),
    [countries]
  );
  const visibleOptions = useMemo(() => {
    const search = query.trim().toLowerCase();

    return countryOptions.filter((option) =>
      search ? option.label.toLowerCase().includes(search) : true
    ).slice(0, 8);
  }, [countryOptions, query]);
  const selectedLabel =
    countryOptions.find((option) => option.value === String(value))?.label || '';

  function handleSelect(countryId) {
    onChange(countryId);
    setQuery('');
    setIsOpen(false);
  }

  return (
    <View style={styles.countryContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        <TextInput
          autoCapitalize="words"
          onBlur={onBlur}
          onChangeText={(text) => {
            setQuery(text);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Seleccioná un país"
          placeholderTextColor={colors.mutedRose}
          style={styles.cardInput}
          value={isOpen ? query : selectedLabel}
        />
        <ChevronIcon color={colors.burgundy} />
      </View>

      {isOpen ? (
        <View style={styles.countryMenu}>
          {visibleOptions.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => handleSelect(option.value)}
              style={styles.selectOption}
            >
              <Text style={styles.selectOptionText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <ErrorMessage>{error}</ErrorMessage>
    </View>
  );
}

function getCardBrand(cardNumber) {
  const sanitizedNumber = cardNumber.replace(/\D/g, '');

  if (!sanitizedNumber) {
    return null;
  }

  const [brand] = creditCardType(sanitizedNumber);

  return brand || null;
}

function getCardDigitLimit(cardNumber) {
  const brand = getCardBrand(cardNumber);
  const lengths = brand?.lengths?.length ? brand.lengths : [DEFAULT_CARD_DIGIT_LIMIT];

  return Math.max(...lengths);
}

function getCardInputMaxLength(cardNumber) {
  const digitLimit = getCardDigitLimit(cardNumber);

  return digitLimit + Math.floor((digitLimit - 1) / 4);
}

function getCvvLimit(cardNumber) {
  return getCardBrand(cardNumber)?.code?.size || 3;
}

function formatCardNumberInput(value) {
  const digitLimit = getCardDigitLimit(value);
  const digits = value.replace(/\D/g, '').slice(0, digitLimit);

  return digits.match(/.{1,4}/g)?.join(' ') || '';
}

function formatExpirationInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function formatShortDateInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 6);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function CardBrandMark({ brand, compact = false, light = false }) {
  const type = brand?.type;
  const Icon = type ? CARD_BRAND_ICONS[type] : null;

  if (!Icon) {
    return compact ? null : <View style={styles.brandIconPlaceholder} />;
  }

  return (
    <View
      style={[
        styles.brandIconMark,
        compact ? styles.brandIconMarkCompact : null,
        compact ? styles.brandMarkCompact : null,
        light ? styles.brandIconMarkLight : null,
      ]}
    >
      <Icon height={compact ? 20 : 48} width={compact ? 32 : 76} />
    </View>
  );
}

function formatCardNumber(value) {
  const digits = value.replace(/\D/g, '');

  return digits.match(/.{1,4}/g)?.join(' ') || '0000 0000 0000 0000';
}

function formatCvv(value) {
  return value ? value.replace(/./g, '*') : '***';
}

function CreditCardPreview({ cardData, focusedField }) {
  const brand = useMemo(() => getCardBrand(cardData.cardNumber), [
    cardData.cardNumber,
  ]);
  const isBackVisible = focusedField === 'cvv';

  return (
    <View style={styles.creditCardFrame}>
      <View style={styles.creditCardPreview}>
        <View style={styles.cardPatternLarge} />
        <View style={styles.cardPatternSmall} />
        <Svg
          height="100%"
          style={styles.cardMapPattern}
          viewBox="0 0 320 205"
          width="100%"
        >
          <Path
            d="M70 62C95 36 134 39 153 68C173 99 220 79 238 111C253 138 228 166 192 153C165 144 151 169 117 157C88 147 96 119 67 108C41 99 47 77 70 62Z"
            fill="rgba(252,235,219,0.08)"
          />
          <Path
            d="M208 37C241 25 273 47 271 80C268 112 298 121 287 150C275 182 230 179 219 148C210 124 178 128 172 101C166 75 184 46 208 37Z"
            fill="rgba(252,235,219,0.06)"
          />
        </Svg>

        {isBackVisible ? (
          <View style={styles.cardBackContent}>
            <View style={styles.cardMagneticStripe} />
            <View style={styles.cardSignatureRow}>
              <View style={styles.cardSignatureBox}>
                <Text style={styles.cardSignatureText}>Midnight Lace</Text>
              </View>
              <View style={styles.cardCvvBox}>
                <Text style={styles.cardCvvText}>{formatCvv(cardData.cvv)}</Text>
              </View>
            </View>
            <Text style={styles.cardBackHint}>CVV</Text>
          </View>
        ) : (
          <View style={styles.cardFrontContent}>
            <View style={styles.cardBrandRow}>
              <CardBrandMark brand={brand} light />
            </View>

            <Text adjustsFontSizeToFit minimumFontScale={0.72} style={styles.previewNumber}>
              {formatCardNumber(cardData.cardNumber)}
            </Text>

            <View style={styles.previewBottomRow}>
              <View style={styles.previewHolder}>
                <Text style={styles.previewLabel}>TITULAR</Text>
                <Text numberOfLines={1} style={styles.previewValue}>
                  {cardData.cardholder || 'NOMBRE APELLIDO'}
                </Text>
              </View>
              <View>
                <Text style={styles.previewLabel}>VTO</Text>
                <Text style={styles.previewValue}>
                  {cardData.expiration || 'MM/AA'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
      <View style={styles.cardStepDots}>
        <View
          style={[
            styles.cardStepDot,
            focusedField === 'cardNumber' ? styles.cardStepDotActive : null,
          ]}
        />
        <View
          style={[
            styles.cardStepDot,
            focusedField === 'cardholder' ? styles.cardStepDotActive : null,
          ]}
        />
        <View
          style={[
            styles.cardStepDot,
            focusedField === 'expiration' ? styles.cardStepDotActive : null,
          ]}
        />
        <View
          style={[
            styles.cardStepDot,
            focusedField === 'cvv' ? styles.cardStepDotActive : null,
          ]}
        />
      </View>
    </View>
  );
}

function CreditCardNumberField({
  error,
  maxLength,
  onBlur,
  onChangeText,
  onFocus,
  value,
}) {
  const brand = useMemo(() => getCardBrand(value), [value]);

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>Número de tarjeta*</Text>
      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        <TextInput
          autoComplete="cc-number"
          keyboardType="number-pad"
          maxLength={maxLength}
          onBlur={onBlur}
          onChangeText={onChangeText}
          onFocus={onFocus}
          style={styles.cardInput}
          value={value}
        />
        <CardBrandMark brand={brand} compact />
      </View>
      <ErrorMessage>{error}</ErrorMessage>
    </View>
  );
}

function getAssetName(asset, fallbackName) {
  return (
    asset?.fileName ||
    asset?.name ||
    asset?.uri?.split('/').pop()?.split('?')[0] ||
    fallbackName
  );
}

function ProofUploadButton({ error, onChange, value }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function applyProof(asset, fallbackName) {
    if (!asset) {
      return;
    }

    onChange({
      name: getAssetName(asset, fallbackName),
      uri: asset.uri || '',
    });
    setIsMenuOpen(false);
  }

  async function pickFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setIsMenuOpen(false);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled) {
      applyProof(result.assets?.[0], 'comprobante.jpg');
    }
  }

  async function openCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setIsMenuOpen(false);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled) {
      applyProof(result.assets?.[0], 'comprobante-camara.jpg');
    }
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['image/*', 'application/pdf'],
    });

    if (!result.canceled) {
      applyProof(result.assets?.[0], 'comprobante');
    } else {
      setIsMenuOpen(false);
    }
  }

  return (
    <View style={styles.proofContainer}>
      <Text style={styles.fieldLabel}>Comprobante*</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsMenuOpen((currentValue) => !currentValue)}
        style={styles.proofButton}
      >
        <UploadIcon />
        <Text style={styles.proofButtonText}>Subir comprobante</Text>
      </Pressable>

      {isMenuOpen ? (
        <View style={styles.proofMenu}>
          <Pressable onPress={openCamera} style={styles.selectOption}>
            <CameraIcon />
            <Text style={styles.selectOptionText}>Abrir camara</Text>
          </Pressable>
          <Pressable onPress={pickFromLibrary} style={styles.selectOption}>
            <GalleryIcon />
            <Text style={styles.selectOptionText}>Elegir de fotos</Text>
          </Pressable>
          <Pressable onPress={pickDocument} style={styles.selectOption}>
            <FileIcon />
            <Text style={styles.selectOptionText}>Subir archivo</Text>
          </Pressable>
        </View>
      ) : null}

      {value?.name ? (
        <Text numberOfLines={1} style={styles.proofFileName}>
          {value.name}
        </Text>
      ) : null}

      <ErrorMessage>{error}</ErrorMessage>
    </View>
  );
}

function requiredError(value, label) {
  return String(value || '').trim() ? '' : `Completá ${label}.`;
}

function validateCardNumber(value) {
  const sanitizedNumber = value.replace(/\D/g, '');
  const brand = getCardBrand(value);

  if (!sanitizedNumber) {
    return 'Completá el número de tarjeta.';
  }

  if (
    sanitizedNumber.length < 13 ||
    !brand ||
    !brand.lengths?.includes(sanitizedNumber.length)
  ) {
    return 'Ingresa una tarjeta valida.';
  }

  return '';
}

function validateExpiration(value) {
  const expiration = value.trim();

  if (!expiration) {
    return 'Completá el vencimiento.';
  }

  if (!/^(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/.test(expiration)) {
    return 'Usá formato MM/AA.';
  }

  return '';
}

function validateShortDate(value) {
  const date = value.trim();

  if (!date) {
    return 'Completa la fecha de emision.';
  }

  if (!/^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{2}$/.test(date)) {
    return 'Usa formato DD/MM/AA.';
  }

  return '';
}

function validateCvv(value, cardNumber) {
  const cvv = value.trim();
  const cvvLimit = getCvvLimit(cardNumber);

  return new RegExp(`^\\d{${cvvLimit}}$`).test(cvv)
    ? ''
    : `Ingresa un CVV de ${cvvLimit} digitos.`;
}

function formatBackendExpiration(value) {
  if (!value) {
    return '';
  }

  const [year, month] = String(value).split('-');
  return month && year ? `${month}/${year.slice(-2)}` : '';
}

function formatBackendShortDate(value) {
  if (!value) {
    return '';
  }

  const [year, month, day] = String(value).split('-');
  return day && month && year ? `${day}/${month}/${year.slice(-2)}` : '';
}

function toIsoExpiration(value) {
  const [month, shortYear] = value.split('/');
  const year = shortYear.length === 2 ? `20${shortYear}` : shortYear;
  return `${year}-${month}-01`;
}

function toIsoShortDate(value) {
  const [day, month, shortYear] = value.split('/');
  return `20${shortYear}-${month}-${day}`;
}

function methodFromApiType(type) {
  if (type === 'cuentaBancaria') {
    return 'bank';
  }
  if (type === 'tarjetaCredito') {
    return 'card';
  }
  if (type === 'chequeCertificado') {
    return 'check';
  }
  return '';
}

export default function PaymentMethodsScreen({
  allowSkip = true,
  initialPayment = null,
  onContinue,
  showHeader = true,
  submitLabel = 'Guardar',
}) {
  const [bankData, setBankData] = useState(INITIAL_BANK);
  const [cardData, setCardData] = useState(INITIAL_CARD);
  const [checkData, setCheckData] = useState(INITIAL_CHECK);
  const [countries, setCountries] = useState([]);
  const [apiError, setApiError] = useState('');
  const [focusedCardField, setFocusedCardField] = useState('cardNumber');
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState(methodFromApiType(initialPayment?.tipo));
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    let active = true;

    listCountries()
      .then((response) => {
        if (active) {
          setCountries(response?.datos || []);
        }
      })
      .catch((error) => {
        if (active) {
          setApiError(getApiErrorMessage(error, 'No pudimos cargar los paises.'));
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!initialPayment) {
      return;
    }

    const nextMethod = methodFromApiType(initialPayment.tipo);
    const detail = initialPayment.detalle || {};
    setMethod(nextMethod);

    if (nextMethod === 'bank') {
      setBankData({
        ...INITIAL_BANK,
        accountNumber: detail.numeroCuenta || '',
        accountType: 'savings',
        bankName: detail.nombreBanco || '',
        country: detail.idPais ? String(detail.idPais) : '',
        cbu: detail.numeroCuenta || '',
        reservedFundsCurrency: initialPayment.moneda || 'ARS',
      });
    } else if (nextMethod === 'card') {
      setCardData({
        ...INITIAL_CARD,
        cardholder: detail.nombreTitular || '',
        expiration: formatBackendExpiration(detail.fechaVencimiento),
        scope: detail.esInternacional === 'si' ? 'international' : 'national',
      });
    } else if (nextMethod === 'check') {
      setCheckData({
        ...INITIAL_CHECK,
        amount: String(detail.montoDisponible ?? detail.montoGarantizado ?? ''),
        amountCurrency: initialPayment.moneda || 'ARS',
        emissionDate: formatBackendShortDate(detail.fechaEntrega),
      });
    }
  }, [initialPayment]);

  const bankErrors = {
    accountNumber: requiredError(bankData.accountNumber, 'el número de cuenta'),
    accountType: requiredError(bankData.accountType, 'el tipo de cuenta'),
    bankName: requiredError(bankData.bankName, 'el banco'),
    country: requiredError(bankData.country, 'el país'),
    cbu: requiredError(bankData.cbu, 'el CBU'),
    reservedFunds: requiredError(bankData.reservedFunds, 'el monto reservado'),
    reservedFundsCurrency: requiredError(
      bankData.reservedFundsCurrency,
      'la moneda'
    ),
  };
  const cardErrors = {
    cardholder: requiredError(cardData.cardholder, 'el titular'),
    cardNumber: validateCardNumber(cardData.cardNumber),
    cvv: validateCvv(cardData.cvv, cardData.cardNumber),
    expiration: validateExpiration(cardData.expiration),
    scope: requiredError(cardData.scope, 'el tipo de tarjeta'),
  };
  const checkErrors = {
    amount: requiredError(checkData.amount, 'el limite de compra'),
    amountCurrency: requiredError(checkData.amountCurrency, 'la moneda'),
    bankName: requiredError(checkData.bankName, 'el banco emisor'),
    checkNumber: requiredError(checkData.checkNumber, 'el número de cheque'),
    emissionDate: validateShortDate(checkData.emissionDate),
    proof: checkData.proof ? '' : 'Subí una imagen o comprobante.',
  };
  const currentErrors =
    method === 'bank'
      ? bankErrors
      : method === 'card'
      ? cardErrors
      : method === 'check'
      ? checkErrors
      : {};
  const canSave = method
    ? Object.values(currentErrors).every((error) => !error)
    : true;
  const hasMethodInteraction = Object.keys(currentErrors).some(
    (field) => touched[field]
  );

  function getVisibleError(field, error) {
    return touched[field] || submitted || hasMethodInteraction ? error : '';
  }

  function handleBlur(field) {
    setTouched((currentTouched) => ({
      ...currentTouched,
      [field]: true,
    }));
  }

  function updateBank(field, value) {
    setBankData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  }

  function updateCard(field, value) {
    setCardData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  }

  function updateCardNumber(value) {
    setCardData((currentData) => {
      const formattedNumber = formatCardNumberInput(value);
      const cvvLimit = getCvvLimit(formattedNumber);

      return {
        ...currentData,
        cardNumber: formattedNumber,
        cvv: currentData.cvv.slice(0, cvvLimit),
      };
    });
  }

  function updateCardholder(value) {
    updateCard('cardholder', value.slice(0, CARDHOLDER_MAX_LENGTH));
  }

  function updateExpiration(value) {
    updateCard('expiration', formatExpirationInput(value));
  }

  function updateCvv(value) {
    const cvvLimit = getCvvLimit(cardData.cardNumber);

    updateCard('cvv', value.replace(/\D/g, '').slice(0, cvvLimit));
  }

  function updateCheck(field, value) {
    setCheckData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  }

  function updateCheckEmissionDate(value) {
    updateCheck('emissionDate', formatShortDateInput(value));
  }

  function buildPayload() {
    if (method === 'bank') {
      return {
        detalle: {
          idPais: Number(bankData.country),
          nombreBanco: bankData.bankName.trim(),
          numeroCuenta: bankData.accountNumber.trim(),
        },
        evaluarCategoria: !initialPayment,
        moneda: bankData.reservedFundsCurrency,
        tipo: 'cuentaBancaria',
      };
    }

    if (method === 'card') {
      const digits = cardData.cardNumber.replace(/\D/g, '');
      const brand = getCardBrand(cardData.cardNumber);
      return {
        detalle: {
          esInternacional: cardData.scope === 'international' ? 'si' : 'no',
          fechaVencimiento: toIsoExpiration(cardData.expiration),
          nombreTitular: cardData.cardholder.trim(),
          red: brand?.niceType || brand?.type || null,
          ultimosCuatroDigitos: digits.slice(-4),
        },
        evaluarCategoria: !initialPayment,
        moneda: cardData.scope === 'international' ? 'USD' : 'ARS',
        tipo: 'tarjetaCredito',
      };
    }

    return {
      detalle: {
        fechaEntrega: toIsoShortDate(checkData.emissionDate),
        montoDisponible: Number(checkData.amount),
        montoGarantizado: Number(checkData.amount),
      },
      evaluarCategoria: !initialPayment,
      moneda: checkData.amountCurrency,
      tipo: 'chequeCertificado',
    };
  }

  async function handleSave() {
    setSubmitted(true);
    setTouched((currentTouched) => ({
      ...currentTouched,
      ...Object.keys(currentErrors).reduce(
        (fields, field) => ({
          ...fields,
          [field]: true,
        }),
        {}
      ),
    }));

    if (!canSave) {
      return;
    }

    setLoading(true);
    setApiError('');
    try {
      const payload = buildPayload();
      const result = initialPayment?.identificador
        ? await updatePaymentMethod(initialPayment.identificador, payload)
        : await createPaymentMethod(payload);
      onContinue?.({
        method,
        payment: result,
      });
    } catch (error) {
      setApiError(
        getApiErrorMessage(error, 'No pudimos guardar el medio de pago.')
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.screen, !showHeader ? styles.embeddedScreen : null]}>
      {showHeader ? (
        <>
          <Text style={styles.title}>
            Medio de pago <Text style={styles.optionalTitle}>(opcional)</Text>
          </Text>
          <Text style={styles.subtitle}>
            Podes agregarlo ahora o mas tarde desde tu perfil.
          </Text>
        </>
      ) : null}

      <SelectField
        onChange={(nextMethod) => {
          setMethod(nextMethod);
          setSubmitted(false);
          setTouched({});
        }}
        options={PAYMENT_METHODS}
        placeholder="Seleccioná un medio de pago"
        value={method}
      />

      {method === 'bank' ? (
        <View>
          <AuthTextField
            error={getVisibleError('bankName', bankErrors.bankName)}
            label="Nombre del Banco*"
            onBlur={() => handleBlur('bankName')}
            onChangeText={(value) => updateBank('bankName', value)}
            value={bankData.bankName}
          />
          <CountrySelectField
            countries={countries}
            error={getVisibleError('country', bankErrors.country)}
            label="País*"
            onBlur={() => handleBlur('country')}
            onChange={(value) => updateBank('country', value)}
            value={bankData.country}
          />
          <AuthTextField
            error={getVisibleError('accountNumber', bankErrors.accountNumber)}
            keyboardType="number-pad"
            label="Número de Cuenta*"
            onBlur={() => handleBlur('accountNumber')}
            onChangeText={(value) => updateBank('accountNumber', value)}
            value={bankData.accountNumber}
          />
          <AuthTextField
            error={getVisibleError('cbu', bankErrors.cbu)}
            keyboardType="number-pad"
            label="CBU*"
            onBlur={() => handleBlur('cbu')}
            onChangeText={(value) => updateBank('cbu', value)}
            value={bankData.cbu}
          />
          <SelectField
            compact
            error={getVisibleError('accountType', bankErrors.accountType)}
            label="Tipo de cuenta*"
            onChange={(value) => updateBank('accountType', value)}
            options={ACCOUNT_TYPES}
            placeholder="Seleccioná el tipo"
            value={bankData.accountType}
          />
          <View style={styles.row}>
            <AuthTextField
              error={getVisibleError('reservedFunds', bankErrors.reservedFunds)}
              keyboardType="decimal-pad"
              label="Monto (límite)*"
              onBlur={() => handleBlur('reservedFunds')}
              onChangeText={(value) => updateBank('reservedFunds', value)}
              style={styles.amountField}
              value={bankData.reservedFunds}
            />
            <SelectField
              compact
              error={getVisibleError(
                'reservedFundsCurrency',
                bankErrors.reservedFundsCurrency
              )}
              label="Moneda*"
              onChange={(value) => updateBank('reservedFundsCurrency', value)}
              options={CURRENCIES}
              placeholder="ARS/USD"
              style={styles.currencyField}
              value={bankData.reservedFundsCurrency}
            />
          </View>
        </View>
      ) : null}

      {method === 'card' ? (
        <View>
          <CreditCardPreview
            cardData={cardData}
            focusedField={focusedCardField}
          />
          <CreditCardNumberField
            error={getVisibleError('cardNumber', cardErrors.cardNumber)}
            maxLength={getCardInputMaxLength(cardData.cardNumber)}
            onBlur={() => handleBlur('cardNumber')}
            onChangeText={updateCardNumber}
            onFocus={() => setFocusedCardField('cardNumber')}
            value={cardData.cardNumber}
          />
          <AuthTextField
            error={getVisibleError('cardholder', cardErrors.cardholder)}
            label="Titular*"
            maxLength={CARDHOLDER_MAX_LENGTH}
            onBlur={() => handleBlur('cardholder')}
            onChangeText={updateCardholder}
            onFocus={() => setFocusedCardField('cardholder')}
            value={cardData.cardholder}
          />
          <View style={styles.row}>
            <AuthTextField
              error={getVisibleError('expiration', cardErrors.expiration)}
              label="Vencimiento*"
              maxLength={5}
              onBlur={() => handleBlur('expiration')}
              onChangeText={updateExpiration}
              onFocus={() => setFocusedCardField('expiration')}
              style={styles.halfField}
              value={cardData.expiration}
            />
            <AuthTextField
              error={getVisibleError('cvv', cardErrors.cvv)}
              keyboardType="number-pad"
              label="CVV*"
              maxLength={getCvvLimit(cardData.cardNumber)}
              onBlur={() => handleBlur('cvv')}
              onChangeText={updateCvv}
              onFocus={() => setFocusedCardField('cvv')}
              style={styles.halfField}
              value={cardData.cvv}
            />
          </View>
          <SelectField
            compact
            error={getVisibleError('scope', cardErrors.scope)}
            label="Tipo*"
            onChange={(value) => updateCard('scope', value)}
            options={CARD_SCOPE_TYPES}
            placeholder="Nacional o Internacional"
            value={cardData.scope}
          />
          <Text style={styles.note}>
            Subastas en dólares requieren tarjetas internacionales.
          </Text>
        </View>
      ) : null}

      {method === 'check' ? (
        <View>
          <View style={styles.row}>
            <AuthTextField
              error={getVisibleError('amount', checkErrors.amount)}
              keyboardType="decimal-pad"
              label="Monto (límite)*"
              onBlur={() => handleBlur('amount')}
              onChangeText={(value) => updateCheck('amount', value)}
              style={styles.amountField}
              value={checkData.amount}
            />
            <SelectField
              compact
              error={getVisibleError(
                'amountCurrency',
                checkErrors.amountCurrency
              )}
              label="Moneda*"
              onChange={(value) => updateCheck('amountCurrency', value)}
              options={CURRENCIES}
              placeholder="ARS/USD"
              style={styles.currencyField}
              value={checkData.amountCurrency}
            />
          </View>
          <AuthTextField
            error={getVisibleError('bankName', checkErrors.bankName)}
            label="Banco Emisor*"
            onBlur={() => handleBlur('bankName')}
            onChangeText={(value) => updateCheck('bankName', value)}
            value={checkData.bankName}
          />
          <AuthTextField
            error={getVisibleError('checkNumber', checkErrors.checkNumber)}
            keyboardType="number-pad"
            label="Número de cheque*"
            onBlur={() => handleBlur('checkNumber')}
            onChangeText={(value) => updateCheck('checkNumber', value)}
            value={checkData.checkNumber}
          />
          <AuthTextField
            error={getVisibleError('emissionDate', checkErrors.emissionDate)}
            label="Fecha de emisión*"
            keyboardType="number-pad"
            maxLength={8}
            onBlur={() => handleBlur('emissionDate')}
            onChangeText={updateCheckEmissionDate}
            value={checkData.emissionDate}
          />
          <ProofUploadButton
            error={getVisibleError('proof', checkErrors.proof)}
            onChange={(file) => {
              updateCheck('proof', file);
              handleBlur('proof');
            }}
            value={checkData.proof}
          />
        </View>
      ) : null}

      {method || allowSkip ? (
        <View style={styles.submit}>
          {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}
          <PrimaryButton
            disabled={loading || (method ? !canSave : false)}
            onPress={method ? handleSave : () => onContinue?.('')}
          >
            {method ? (loading ? 'Guardando...' : submitLabel) : 'Omitir'}
          </PrimaryButton>

          {allowSkip && method ? (
            <Pressable onPress={() => onContinue?.('')} style={styles.skipButton}>
              <Text style={styles.skipText}>Omitir por ahora</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 53,
    paddingTop: 38,
    zIndex: 2,
  },
  embeddedScreen: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  title: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 30,
    letterSpacing: 0,
    lineHeight: 38,
    marginBottom: 6,
  },
  optionalTitle: {
    fontSize: 18,
  },
  subtitle: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 21,
    marginBottom: 26,
  },
  selectContainer: {
    marginBottom: 29,
    width: '100%',
    zIndex: 8,
  },
  compactSelectContainer: {
    marginBottom: 29,
    width: '100%',
    zIndex: 7,
  },
  methodSelectButton: {
    alignItems: 'center',
    backgroundColor: colors.burgundy,
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 64,
    paddingHorizontal: 20,
    paddingVertical: 10,
    width: '100%',
  },
  methodSelectText: {
    color: colors.cream,
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 17,
    lineHeight: 22,
    marginRight: 10,
  },
  methodSelectMenu: {
    backgroundColor: colors.cream,
    borderColor: colors.burgundy,
    borderRadius: 5,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
    width: '100%',
  },
  lineSelectButton: {
    alignItems: 'center',
    borderBottomColor: colors.burgundy,
    borderBottomWidth: 7,
    flexDirection: 'row',
    minHeight: 35,
    justifyContent: 'space-between',
    width: '100%',
  },
  lineSelectText: {
    color: colors.textBurgundy,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 18,
    marginRight: 6,
  },
  lineSelectMenu: {
    backgroundColor: colors.cream,
    borderColor: colors.blush,
    borderRadius: 5,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
    width: '100%',
  },
  countryContainer: {
    marginBottom: 29,
    width: '100%',
    zIndex: 10,
  },
  countryMenu: {
    backgroundColor: colors.cream,
    borderColor: colors.blush,
    borderRadius: 5,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
    width: '100%',
  },
  selectOption: {
    alignItems: 'center',
    columnGap: 10,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectOptionText: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  fieldContainer: {
    marginBottom: 29,
    width: '100%',
  },
  fieldLabel: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 17,
    marginBottom: 7,
  },
  inputRow: {
    alignItems: 'center',
    borderBottomColor: colors.burgundy,
    borderBottomWidth: 7,
    flexDirection: 'row',
    width: '100%',
  },
  inputRowError: {
    borderBottomColor: colors.burgundy,
  },
  cardInput: {
    color: colors.textBurgundy,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 18,
    height: 28,
    minWidth: 0,
    padding: 0,
  },
  brandMarkCompact: {
    marginLeft: 6,
  },
  brandIconMark: {
    alignItems: 'center',
    borderRadius: 5,
    justifyContent: 'center',
  },
  brandIconMarkCompact: {
    flexShrink: 0,
    maxWidth: 34,
    overflow: 'hidden',
  },
  brandIconMarkLight: {
    padding: 0,
  },
  brandIconPlaceholder: {
    height: 38,
    width: 57,
  },
  creditCardFrame: {
    alignSelf: 'center',
    marginBottom: 28,
    maxWidth: 340,
    width: '100%',
  },
  creditCardPreview: {
    aspectRatio: 1.58,
    backgroundColor: colors.mutedRose,
    borderColor: 'rgba(252, 235, 219, 0.22)',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  cardFrontContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  cardBackContent: {
    flex: 1,
    paddingVertical: 22,
  },
  cardPatternLarge: {
    backgroundColor: 'rgba(252, 235, 219, 0.08)',
    borderRadius: 95,
    height: 190,
    position: 'absolute',
    right: -54,
    top: -56,
    width: 190,
  },
  cardPatternSmall: {
    backgroundColor: 'rgba(214, 136, 143, 0.2)',
    borderRadius: 72,
    bottom: -38,
    height: 144,
    left: -28,
    position: 'absolute',
    width: 144,
  },
  cardMapPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  cardBrandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cardMagneticStripe: {
    backgroundColor: '#4F0712',
    height: 42,
    marginTop: 8,
    width: '100%',
  },
  cardSignatureRow: {
    alignItems: 'center',
    columnGap: 10,
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 28,
  },
  cardSignatureBox: {
    backgroundColor: colors.cream,
    borderRadius: 4,
    flex: 1,
    height: 34,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 12,
  },
  cardSignatureText: {
    color: 'rgba(117, 7, 25, 0.42)',
    fontFamily: fonts.regular,
    fontSize: 14,
    fontStyle: 'italic',
  },
  cardCvvBox: {
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: 4,
    height: 34,
    justifyContent: 'center',
    minWidth: 58,
    paddingHorizontal: 10,
  },
  cardCvvText: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 14,
    letterSpacing: 1,
  },
  cardBackHint: {
    color: 'rgba(252, 235, 219, 0.72)',
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1,
    marginRight: 24,
    marginTop: 8,
    textAlign: 'right',
  },
  previewNumber: {
    color: colors.cream,
    fontFamily: fonts.medium,
    fontSize: 21,
    letterSpacing: 1,
    lineHeight: 28,
    textAlign: 'center',
  },
  previewBottomRow: {
    alignItems: 'flex-end',
    columnGap: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewHolder: {
    flex: 1,
    minWidth: 0,
  },
  previewLabel: {
    color: 'rgba(252, 235, 219, 0.75)',
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    lineHeight: 13,
  },
  previewValue: {
    color: colors.cream,
    fontFamily: fonts.medium,
    fontSize: 13,
    letterSpacing: 0.4,
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  cardStepDots: {
    alignItems: 'center',
    columnGap: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  cardStepDot: {
    backgroundColor: 'rgba(159, 2, 29, 0.22)',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  cardStepDotActive: {
    backgroundColor: colors.burgundy,
  },
  row: {
    columnGap: 28,
    flexDirection: 'row',
    width: '100%',
  },
  halfField: {
    flex: 1,
  },
  amountField: {
    flex: 1.15,
  },
  currencyField: {
    flex: 0.85,
  },
  note: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: -14,
  },
  proofContainer: {
    marginBottom: 29,
    width: '100%',
    zIndex: 8,
  },
  proofButton: {
    alignItems: 'center',
    borderColor: colors.burgundy,
    borderWidth: 4,
    columnGap: 10,
    flexDirection: 'row',
    height: 47,
    paddingHorizontal: 16,
    width: '100%',
  },
  proofButtonText: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  proofMenu: {
    backgroundColor: colors.cream,
    borderColor: colors.blush,
    borderRadius: 5,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
    width: '100%',
  },
  proofFileName: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 18,
    marginTop: 8,
  },
  errorRow: {
    alignItems: 'flex-start',
    columnGap: 6,
    flexDirection: 'row',
    marginTop: 8,
    width: '100%',
  },
  errorText: {
    color: colors.burgundy,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  apiError: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 14,
    textAlign: 'center',
  },
  submit: {
    alignItems: 'center',
    marginTop: 24,
  },
  skipButton: {
    marginTop: 14,
  },
  skipText: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 15,
    textDecorationLine: 'underline',
  },
});
