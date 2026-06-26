import { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import AddressAutocompleteField from '../../components/forms/address/AddressAutocompleteField';
import AddressMapPreview from '../../components/forms/address/AddressMapPreview';
import CountrySelectField from '../../components/forms/address/CountrySelectField';
import { useToast } from '../../components/feedback/ToastProvider';
import AuthTextField from '../../components/forms/auth/AuthTextField';
import DniUploadButton from '../../components/forms/uploads/DniUploadButton';
import PasswordChecklist, {
  passwordRules,
} from '../../components/forms/auth/PasswordChecklist';
import PrimaryButton from '../../components/forms/controls/PrimaryButton';
import PaymentMethodsScreen from '../signup/PaymentMethodsScreen';
import {
  deletePaymentMethod,
  listCountries,
  listPaymentMethods,
} from '../../services/paymentMethodsApi';
import {
  changePassword,
  getProfile,
  toUploadValue,
  updateProfile,
} from '../../services/profileApi';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { resolveApiAssetUrl } from '../../utils/config';
import { getApiErrorMessage } from '../../utils/http';

const INITIAL_ADDRESS = {
  addressLine: 'Av. Callao 1234, CABA, Argentina',
  apartment: '',
  country: 'Argentina',
  countryId: '',
  displayAddressLine: 'Av. Callao 1234, CABA, Argentina',
  latitude: null,
  locality: 'CABA',
  longitude: null,
  number: '1234',
  postalCode: '',
  province: 'Buenos Aires',
  street: 'Av. Callao',
};

const REQUIRED_ADDRESS_FIELDS = [
  'country',
  'province',
  'locality',
  'postalCode',
  'street',
  'number',
];

function normalizeAddressPart(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function requiredError(value, label) {
  return String(value || '').trim() ? '' : `Completá ${label}.`;
}

function normalizeCountryName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function findCountryByName(countries, value) {
  const normalized = normalizeCountryName(value);
  return countries.find(
    (country) => normalizeCountryName(country.nombre) === normalized
  );
}

function capitalizeCategory(value) {
  const category = String(value || 'comun').toLowerCase();
  const labels = {
    comun: 'Común',
    especial: 'Especial',
    oro: 'Oro',
    plata: 'Plata',
    platino: 'Platino',
  };

  return (
    labels[category] ||
    `${category.charAt(0).toUpperCase()}${category.slice(1)}`
  );
}

function formatPaymentExpiration(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})/);

  if (match) {
    return `${match[2]}/${match[1].slice(-2)}`;
  }

  return value || '-';
}

function getProfileInitials(profile) {
  const initials = [profile?.nombre, profile?.apellido]
    .map((value) => String(value || '').trim().charAt(0))
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return initials || '?';
}

function isAuctioneerProfile(profile) {
  const roleValues = [
    profile?.rol,
    profile?.role,
    profile?.tipoUsuario,
    profile?.tipo_usuario,
    ...(Array.isArray(profile?.roles) ? profile.roles : []),
  ];

  return (
    Boolean(profile?.subastador || profile?.matricula || profile?.region) ||
    roleValues.some((value) =>
      String(value || '').toLowerCase().includes('subastador')
    )
  );
}

function profileFieldValue(profile, ...fieldNames) {
  for (const fieldName of fieldNames) {
    const value = profile?.[fieldName];

    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return '';
}

function paymentPresentation(payment) {
  const detail = payment.detalle || {};

  if (payment.tipo === 'cuentaBancaria') {
    return {
      icon: 'bank',
      lines: [
        detail.nombreBanco || 'Banco sin nombre',
        `Cuenta: ${detail.numeroCuenta || '-'}`,
      ],
      title: 'Cuenta bancaria',
    };
  }

  if (payment.tipo === 'chequeCertificado') {
    const availableAmount =
      detail.montoDisponible ?? detail.montoGarantizado ?? 0;
    return {
      icon: 'check',
      lines: [
        `${payment.moneda || 'ARS'} ${availableAmount}`,
        `Entrega: ${detail.fechaEntrega || '-'}`,
      ],
      title: 'Cheque certificado',
    };
  }

  return {
    icon: 'card',
    lines: [
      `${detail.red || 'Tarjeta'} terminada en ${
        detail.ultimosCuatroDigitos || '----'
      }`,
      `Vencimiento: ${formatPaymentExpiration(detail.fechaVencimiento)}`,
    ],
    title: 'Tarjeta de crédito',
  };
}

function buildAddressSearchValue(address) {
  const streetLine = [address.street, address.number]
    .map(normalizeAddressPart)
    .filter(Boolean)
    .join(' ');
  const locationLine = [
    address.locality,
    address.province,
    address.postalCode,
    address.country,
  ]
    .map(normalizeAddressPart)
    .filter(Boolean);

  return [streetLine, ...locationLine].filter(Boolean).join(', ');
}

function formatApartment(value) {
  const apartment = normalizeAddressPart(value);

  if (!apartment) {
    return '';
  }

  return /^(dpto\.?|depto\.?)\s*/i.test(apartment)
    ? apartment
    : `Dpto. ${apartment}`;
}

function buildAddressDisplayValue(address) {
  const streetLine = [address.street, address.number]
    .map(normalizeAddressPart)
    .filter(Boolean)
    .join(' ');
  const apartmentLine = formatApartment(address.apartment);
  const locationLine = [
    address.locality,
    address.province,
    address.postalCode,
    address.country,
  ]
    .map(normalizeAddressPart)
    .filter(Boolean);

  return [streetLine, apartmentLine, ...locationLine].filter(Boolean).join(', ');
}

function IconButton({ accessibilityLabel, children, onPress }) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.iconButton}
    >
      {children}
    </Pressable>
  );
}

function AvatarMenuOption({ children, icon, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.avatarMenuOption}>
      {icon}
      <Text style={styles.avatarMenuText}>{children}</Text>
    </Pressable>
  );
}

function CloseIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.5 6.5L17.5 17.5M17.5 6.5L6.5 17.5"
        stroke={colors.textBurgundy}
        strokeLinecap="round"
        strokeWidth={2.4}
      />
    </Svg>
  );
}

function CrownIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.5 9.2L8.25 12.8L12 6.2L15.75 12.8L19.5 9.2L18.2 18.5H5.8L4.5 9.2Z"
        fill={colors.cocoa}
      />
      <Path d="M6 20H18" stroke={colors.cocoa} strokeLinecap="round" strokeWidth={2} />
    </Svg>
  );
}

function EditIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 18.6L5.8 14.7L15.9 4.6C16.65 3.85 17.85 3.85 18.6 4.6L19.4 5.4C20.15 6.15 20.15 7.35 19.4 8.1L9.3 18.2L5 18.6Z"
        fill={colors.cocoa}
      />
      <Path d="M14.4 6.1L17.9 9.6" stroke={colors.cream} strokeWidth={1.7} />
      <Path d="M4.8 21H19.2" stroke={colors.cocoa} strokeLinecap="round" strokeWidth={2} />
    </Svg>
  );
}

function TrashIcon() {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7.2 8.2H16.8L16.1 19.4C16.05 20.2 15.4 20.8 14.6 20.8H9.4C8.6 20.8 7.95 20.2 7.9 19.4L7.2 8.2Z"
        fill={colors.cocoa}
      />
      <Path
        d="M5.5 6.6H18.5M9.4 6.6V4.6H14.6V6.6"
        stroke={colors.cocoa}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

function UploadSmallIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 15.2V4.8M12 4.8L8.4 8.4M12 4.8L15.6 8.4"
        stroke={colors.cocoa}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.1}
      />
      <Path
        d="M5 14.5V19H19V14.5"
        stroke={colors.cocoa}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.1}
      />
    </Svg>
  );
}

function CameraSmallIcon() {
  return (
    <Svg height={20} viewBox="0 0 24 24" width={20}>
      <Path
        d="M4.5 8.5H7L8.3 6H15.7L17 8.5H19.5V18.5H4.5V8.5Z"
        fill="none"
        stroke={colors.textBurgundy}
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
      <Circle
        cx={12}
        cy={13.2}
        fill="none"
        r={3.2}
        stroke={colors.textBurgundy}
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function GallerySmallIcon() {
  return (
    <Svg height={20} viewBox="0 0 24 24" width={20}>
      <Rect
        fill="none"
        height={15}
        rx={2}
        stroke={colors.textBurgundy}
        strokeWidth={1.8}
        width={17}
        x={3.5}
        y={4.5}
      />
      <Circle cx={9} cy={9.3} fill={colors.textBurgundy} r={1.45} />
      <Path
        d="M5.5 17L10.3 12.3L13.3 15.1L15.8 12.7L18.6 15.6"
        fill="none"
        stroke={colors.textBurgundy}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function AddPaymentIcon() {
  return (
    <Svg width={25} height={25} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5V19M5 12H19"
        stroke={colors.cocoa}
        strokeLinecap="round"
        strokeWidth={2.5}
      />
    </Svg>
  );
}

function ArrowIcon() {
  return (
    <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12H18M13 7L18 12L13 17"
        stroke={colors.cocoa}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.4}
      />
    </Svg>
  );
}

function LogoutIcon() {
  return (
    <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.5 5.2H5.5V18.8H10.5"
        stroke={colors.cocoa}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
      <Path
        d="M12 12H20M16.5 7.5L21 12L16.5 16.5"
        stroke={colors.cocoa}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

function PaymentTypeIcon({ type }) {
  if (type === 'bank') {
    return (
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <Path d="M3.5 9.2L12 4L20.5 9.2H3.5Z" fill={colors.cocoa} />
        <Path d="M5 10.6H7.2V18H5V10.6ZM10.9 10.6H13.1V18H10.9V10.6ZM16.8 10.6H19V18H16.8V10.6ZM4 19.5H20" stroke={colors.cocoa} strokeLinecap="round" strokeWidth={2} />
      </Svg>
    );
  }

  if (type === 'check') {
    return (
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <Path
          d="M4 6H20V16H13.2L10 19.2V16H4V6Z"
          stroke={colors.cocoa}
          strokeLinejoin="round"
          strokeWidth={2}
        />
        <Path d="M7 10H16M7 13H12" stroke={colors.cocoa} strokeLinecap="round" strokeWidth={2} />
      </Svg>
    );
  }

  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5.5} width={18} height={13} rx={2} fill={colors.cocoa} />
      <Path d="M3 9H21" stroke={colors.cream} strokeWidth={2} />
      <Path d="M6 14.5H12" stroke={colors.cream} strokeLinecap="round" strokeWidth={1.8} />
    </Svg>
  );
}

function SectionCard({ children, headerAction, title }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {headerAction}
      </View>
      <View style={styles.sectionDivider} />
      {children}
    </View>
  );
}

function ProfileModal({ children, onClose, title, visible }) {
  const keyboardBehavior =
    Platform.OS === 'ios'
      ? 'padding'
      : Platform.OS === 'android'
      ? 'height'
      : undefined;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={keyboardBehavior}
          keyboardVerticalOffset={0}
          style={styles.modalKeyboardAvoider}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <IconButton accessibilityLabel="Cerrar modal" onPress={onClose}>
                <CloseIcon />
              </IconButton>
            </View>
            <ScrollView
              automaticallyAdjustKeyboardInsets
              bounces={false}
              contentContainerStyle={styles.modalContent}
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function AddressEditModal({
  address,
  apiError,
  countries,
  onClose,
  onSave,
  saving,
  visible,
}) {
  const [draft, setDraft] = useState(address);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraft(address);
      setSubmitted(false);
    }
  }, [address, visible]);

  const errors = {
    country: requiredError(draft.countryId, 'el país'),
    locality: requiredError(draft.locality, 'la localidad'),
    number: requiredError(draft.number, 'la altura'),
    postalCode: requiredError(draft.postalCode, 'el código postal'),
    province: requiredError(draft.province, 'la provincia'),
    street: requiredError(draft.street, 'la calle'),
  };
  const isValid = REQUIRED_ADDRESS_FIELDS.every((field) => !errors[field]);
  const addressSearchValue =
    draft.addressLine ||
    draft.displayAddressLine ||
    buildAddressSearchValue(draft);

  function setAddressField(field, value) {
    const shouldResolveAgain = field !== 'apartment';

    setDraft((currentAddress) => ({
      ...currentAddress,
      ...(shouldResolveAgain
        ? {
            addressLine: '',
            displayAddressLine: '',
            latitude: null,
            longitude: null,
          }
        : null),
      [field]: value,
    }));
  }

  function handleSave() {
    setSubmitted(true);

    if (isValid) {
      const displayAddress = buildAddressSearchValue(draft);
      onSave({
        ...draft,
        addressLine: draft.addressLine || displayAddress,
        displayAddressLine: displayAddress,
      });
    }
  }

  return (
    <ProfileModal onClose={onClose} title="Editar domicilio" visible={visible}>
      <AddressAutocompleteField
        displayValue={addressSearchValue}
        onSelect={(nextAddress) => {
          const selectedCountry = findCountryByName(
            countries,
            nextAddress.country
          );
          setDraft((currentAddress) => ({
            ...currentAddress,
            ...nextAddress,
            countryId: selectedCountry
              ? String(selectedCountry.numero)
              : currentAddress.countryId,
          }));
        }}
      />

      <CountrySelectField
        countries={countries}
        error={submitted ? errors.country : ''}
        label="País*"
        onChange={(countryId) => {
          const selectedCountry = countries.find(
            (country) => String(country.numero) === String(countryId)
          );
          setDraft((currentAddress) => ({
            ...currentAddress,
            country: selectedCountry?.nombre || '',
            countryId: String(countryId),
          }));
        }}
        value={draft.countryId}
      />
      <AuthTextField
        error={submitted ? errors.province : ''}
        label="Provincia*"
        onChangeText={(value) => setAddressField('province', value)}
        value={draft.province}
      />
      <AuthTextField
        error={submitted ? errors.locality : ''}
        label="Localidad*"
        onChangeText={(value) => setAddressField('locality', value)}
        value={draft.locality}
      />
      <AuthTextField
        error={submitted ? errors.postalCode : ''}
        label="Código postal*"
        onChangeText={(value) => setAddressField('postalCode', value)}
        value={draft.postalCode}
      />
      <AuthTextField
        error={submitted ? errors.street : ''}
        label="Calle*"
        onChangeText={(value) => setAddressField('street', value)}
        value={draft.street}
      />

      <View style={styles.modalRow}>
        <AuthTextField
          error={submitted ? errors.number : ''}
          keyboardType="numeric"
          label="Altura*"
          onChangeText={(value) => setAddressField('number', value)}
          style={styles.modalHalfField}
          value={draft.number}
        />
        <AuthTextField
          label="Dpto."
          onChangeText={(value) => setAddressField('apartment', value)}
          style={styles.modalHalfField}
          value={draft.apartment}
        />
      </View>

      <Text style={styles.modalSectionTitle}>Confirmar ubicación</Text>
      <AddressMapPreview address={draft} />

      <View style={styles.modalSubmit}>
        {apiError ? <Text style={styles.modalApiError}>{apiError}</Text> : null}
        <PrimaryButton disabled={!isValid || saving} onPress={handleSave}>
          {saving ? 'Guardando...' : 'Guardar'}
        </PrimaryButton>
      </View>
    </ProfileModal>
  );
}

function DniEditModal({
  apiError,
  files,
  onClose,
  onSave,
  saving,
  visible,
}) {
  const [draftFiles, setDraftFiles] = useState(files);

  useEffect(() => {
    if (visible) {
      setDraftFiles(files);
    }
  }, [files, visible]);

  return (
    <ProfileModal onClose={onClose} title="Fotos DNI" visible={visible}>
      <Text style={styles.modalDescription}>
        Subí una foto o archivo del frente y otra del dorso.
      </Text>
      <DniUploadButton files={draftFiles} onChange={setDraftFiles} />
      <View style={styles.modalSubmit}>
        {apiError ? <Text style={styles.modalApiError}>{apiError}</Text> : null}
        <PrimaryButton
          disabled={draftFiles.length !== 2 || saving}
          onPress={() => onSave(draftFiles)}
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </PrimaryButton>
      </View>
    </ProfileModal>
  );
}

function PaymentEditModal({
  initialPayment,
  onClose,
  onSave,
  visible,
}) {
  return (
    <ProfileModal onClose={onClose} title="Medio de pago" visible={visible}>
      <PaymentMethodsScreen
        allowSkip={false}
        initialPayment={initialPayment}
        onContinue={onSave}
        showHeader={false}
      />
    </ProfileModal>
  );
}

function validatePassword(password) {
  if (!password) {
    return 'Ingresá una contraseña.';
  }

  return passwordRules.every((rule) => rule.test(password))
    ? ''
    : 'La contraseña todavía no cumple los requisitos.';
}

function PasswordEditModal({ onClose, visible }) {
  const [apiError, setApiError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (visible) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      setApiError('');
      setLoading(false);
      setSubmitted(false);
    }
  }, [visible]);

  const errors = {
    confirmation:
      confirmation && newPassword === confirmation
        ? ''
        : 'Las contraseñas no coinciden.',
    currentPassword: requiredError(currentPassword, 'tu contraseña actual'),
    newPassword: validatePassword(newPassword),
  };
  const isValid = Object.values(errors).every((error) => !error);

  async function handleSubmit() {
    setSubmitted(true);

    if (!isValid) {
      return;
    }

    setLoading(true);
    setApiError('');
    try {
      await changePassword(currentPassword, newPassword);
      onClose();
    } catch (error) {
      setApiError(
        getApiErrorMessage(error, 'No pudimos cambiar la contraseña.')
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProfileModal onClose={onClose} title="Cambiar contraseña" visible={visible}>
      <AuthTextField
        error={submitted ? errors.currentPassword : ''}
        label="Contraseña actual"
        onChangeText={setCurrentPassword}
        secureTextEntry
        value={currentPassword}
      />
      <AuthTextField
        error={submitted && !newPassword ? errors.newPassword : ''}
        label="Nueva contraseña"
        onChangeText={setNewPassword}
        secureTextEntry
        style={styles.passwordField}
        value={newPassword}
      />
      <PasswordChecklist value={newPassword} />
      <AuthTextField
        error={submitted ? errors.confirmation : ''}
        label="Confirmar nueva contraseña"
        onChangeText={setConfirmation}
        secureTextEntry
        value={confirmation}
      />

      <View style={styles.modalSubmit}>
        {apiError ? <Text style={styles.modalApiError}>{apiError}</Text> : null}
        <PrimaryButton disabled={!isValid || loading} onPress={handleSubmit}>
          {loading ? 'Guardando...' : 'Guardar'}
        </PrimaryButton>
      </View>
    </ProfileModal>
  );
}

function LogoutModal({ onClose, onConfirm, visible }) {
  return (
    <ProfileModal onClose={onClose} title="Cerrar sesión" visible={visible}>
      <Text style={styles.logoutText}>
        ¿Estás seguro/a de que querés cerrar sesión?
      </Text>
      <View style={styles.logoutActions}>
        <Pressable onPress={onClose} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>No</Text>
        </Pressable>
        <PrimaryButton onPress={onConfirm}>Sí</PrimaryButton>
      </View>
    </ProfileModal>
  );
}

export default function ProfileScreen({ onLogout }) {
  const { showToast } = useToast();
  const [address, setAddress] = useState(INITIAL_ADDRESS);
  const [countries, setCountries] = useState([]);
  const [dniFiles, setDniFiles] = useState([]);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [isProfileImageMenuOpen, setIsProfileImageMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [pageError, setPageError] = useState('');
  const [payments, setPayments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [savingSection, setSavingSection] = useState('');
  const isAuctioneer = isAuctioneerProfile(profile);
  const addressDisplay = buildAddressDisplayValue(address);

  function profileField(data, camelName, snakeName) {
    return data?.[camelName] ?? data?.[snakeName] ?? '';
  }

  function hydrateProfile(nextProfile) {
    if (!nextProfile) {
      return;
    }

    const country = nextProfile.pais || null;
    const nextAddress = {
      ...INITIAL_ADDRESS,
      apartment: nextProfile.departamento || '',
      country: country?.nombre || '',
      countryId: country?.numero ? String(country.numero) : '',
      locality: nextProfile.localidad || '',
      number: nextProfile.altura || '',
      postalCode:
        profileField(nextProfile, 'codigoPostal', 'codigo_postal') || '',
      province: nextProfile.ciudad || '',
      street: nextProfile.direccion || '',
    };
    const displayAddressLine = buildAddressSearchValue(nextAddress);
    const profilePhoto = profileField(
      nextProfile,
      'urlFotoPerfil',
      'url_foto_perfil'
    );
    const dniFront = profileField(
      nextProfile,
      'urlFotoDocFrente',
      'url_foto_doc_frente'
    );
    const dniBack = profileField(
      nextProfile,
      'urlFotoDocDorso',
      'url_foto_doc_dorso'
    );

    setAddress({
      ...nextAddress,
      addressLine: displayAddressLine,
      displayAddressLine,
    });
    setProfile(nextProfile);
    setProfileImage(
      profilePhoto
        ? {
            uri: `${resolveApiAssetUrl(profilePhoto)}${
              String(profilePhoto).includes('?') ? '&' : '?'
            }v=${Date.now()}`,
          }
        : null
    );
    setDniFiles(
      [
        dniFront
          ? {
              id: 'dni-front',
              name: 'dni-frente.jpg',
              uri: resolveApiAssetUrl(dniFront),
            }
          : null,
        dniBack
          ? {
              id: 'dni-back',
              name: 'dni-dorso.jpg',
              uri: resolveApiAssetUrl(dniBack),
            }
          : null,
      ].filter(Boolean)
    );
  }

  async function loadData({ showLoader = true } = {}) {
    if (showLoader) {
      setLoading(true);
    }
    setPageError('');

    try {
      const profileResult = await getProfile();
      hydrateProfile(profileResult);

      if (isAuctioneerProfile(profileResult)) {
        setPayments([]);
        setCountries([]);
      } else {
        const [paymentResult, countryResult] = await Promise.all([
          listPaymentMethods(),
          listCountries(),
        ]);
        setPayments(paymentResult?.datos || []);
        setCountries(countryResult?.datos || []);
      }
    } catch (error) {
      setPageError(
        getApiErrorMessage(error, 'No pudimos cargar los datos de tu perfil.')
      );
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function applyProfileImage(asset) {
    if (!asset?.uri) {
      setIsProfileImageMenuOpen(false);
      return;
    }

    setSavingSection('profile-image');
    setPageError('');
    setIsProfileImageMenuOpen(false);

    try {
      const upload = await toUploadValue(asset, 'foto-perfil.jpg');
      const formData = new FormData();
      formData.append('fotoPerfil', upload);
      const updatedProfile = await updateProfile(formData);
      hydrateProfile(updatedProfile);
      showToast('Foto de perfil actualizada.');
    } catch (error) {
      setPageError(
        getApiErrorMessage(error, 'No pudimos actualizar la foto de perfil.')
      );
    } finally {
      setSavingSection('');
    }
  }

  async function pickProfileFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setIsProfileImageMenuOpen(false);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (!result.canceled) {
      await applyProfileImage(result.assets?.[0]);
    }
  }

  async function openProfileCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setIsProfileImageMenuOpen(false);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (!result.canceled) {
      await applyProfileImage(result.assets?.[0]);
    }
  }

  function closeModal() {
    setModal(null);
    setEditingPaymentId(null);
    setPageError('');
  }

  async function handleAddressSave(nextAddress) {
    setSavingSection('address');
    setPageError('');

    try {
      const formData = new FormData();
      formData.append('direccion', nextAddress.street.trim());
      formData.append('altura', nextAddress.number.trim());
      formData.append('codigoPostal', nextAddress.postalCode.trim());
      formData.append('departamento', nextAddress.apartment.trim());
      formData.append('localidad', nextAddress.locality.trim());
      formData.append('ciudad', nextAddress.province.trim());
      formData.append('idPais', String(nextAddress.countryId));
      const updatedProfile = await updateProfile(formData);
      const persistedPostalCode = String(
        profileField(updatedProfile, 'codigoPostal', 'codigo_postal') || ''
      ).trim();

      if (persistedPostalCode !== nextAddress.postalCode.trim()) {
        throw new Error(
          'El servidor no confirmó el código postal. Verificá que la última migración del backend esté aplicada.'
        );
      }

      hydrateProfile(updatedProfile);
      showToast('Domicilio actualizado.');
      closeModal();
    } catch (error) {
      setPageError(
        getApiErrorMessage(error, 'No pudimos actualizar el domicilio.')
      );
    } finally {
      setSavingSection('');
    }
  }

  async function handleDniSave(nextFiles) {
    setSavingSection('dni');
    setPageError('');

    try {
      const frontFile =
        nextFiles.find((file) => file.id === 'dni-front') ||
        nextFiles.find((file) => file.id !== 'dni-back');
      const backFile =
        nextFiles.find((file) => file.id === 'dni-back') ||
        nextFiles.find((file) => file !== frontFile);
      const formData = new FormData();
      let hasUpload = false;

      if (frontFile?.uri && !/^https?:\/\//i.test(frontFile.uri)) {
        formData.append(
          'fotoDocFrente',
          await toUploadValue(frontFile, 'dni-frente.jpg')
        );
        hasUpload = true;
      }
      if (backFile?.uri && !/^https?:\/\//i.test(backFile.uri)) {
        formData.append(
          'fotoDocDorso',
          await toUploadValue(backFile, 'dni-dorso.jpg')
        );
        hasUpload = true;
      }

      if (!hasUpload) {
        closeModal();
        return;
      }

      const updatedProfile = await updateProfile(formData);
      hydrateProfile(updatedProfile);
      showToast('Fotos del DNI actualizadas.');
      closeModal();
    } catch (error) {
      setPageError(
        getApiErrorMessage(error, 'No pudimos actualizar las fotos del DNI.')
      );
    } finally {
      setSavingSection('');
    }
  }

  async function handlePaymentSave(result) {
    if (!result?.payment) {
      closeModal();
      return;
    }

    setSavingSection('payment');
    setPageError('');

    try {
      const [paymentResult, profileResult] = await Promise.all([
        listPaymentMethods(),
        getProfile(),
      ]);
      setPayments(paymentResult?.datos || []);
      hydrateProfile(profileResult);

      if (result.payment.subioCategoria) {
        showToast(
          `Tu categoría subió a ${capitalizeCategory(
            result.payment.categoriaActual
          )}.`
        );
      }

      showToast(
        editingPaymentId
          ? 'Medio de pago actualizado.'
          : 'Medio de pago agregado.'
      );
      closeModal();
    } catch (error) {
      setPageError(
        getApiErrorMessage(error, 'No pudimos actualizar los medios de pago.')
      );
    } finally {
      setSavingSection('');
    }
  }

  function handlePaymentEdit(paymentId) {
    setEditingPaymentId(paymentId);
    setModal('payment');
  }

  async function handlePaymentDelete(paymentId) {
    setSavingSection('payment');
    setPageError('');

    try {
      await deletePaymentMethod(paymentId);
      const paymentResult = await listPaymentMethods();
      setPayments(paymentResult?.datos || []);
      showToast('Medio de pago eliminado.');
    } catch (error) {
      setPageError(
        getApiErrorMessage(error, 'No pudimos eliminar el medio de pago.')
      );
    } finally {
      setSavingSection('');
    }
  }

  const editingPayment = payments.find(
    (payment) =>
      String(payment.identificador) === String(editingPaymentId)
  );
  const dniUpdatedAt = profileField(
    profile,
    'fechaActualizacionFotoDni',
    'fecha_actualizacion_foto_dni'
  );
  const auctioneerData = profile?.subastador || {};
  const auctioneerLicense =
    profileFieldValue(auctioneerData, 'matricula') ||
    profileFieldValue(profile, 'matricula');
  const auctioneerRegion =
    profileFieldValue(auctioneerData, 'region') ||
    profileFieldValue(profile, 'region');

  if (loading) {
    return (
      <View style={styles.loadingState}>
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {pageError ? <Text style={styles.pageError}>{pageError}</Text> : null}

      <View style={styles.profileCard}>
        <View style={styles.avatarWrapper}>
          {profileImage ? (
            <Image source={profileImage} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitials}>
                {getProfileInitials(profile)}
              </Text>
            </View>
          )}
          <Pressable
            accessibilityLabel="Editar foto de perfil"
            accessibilityRole="button"
            disabled={savingSection === 'profile-image'}
            onPress={() =>
              setIsProfileImageMenuOpen((currentValue) => !currentValue)
            }
            style={styles.avatarEditButton}
          >
            <EditIcon />
          </Pressable>
          {isProfileImageMenuOpen ? (
            <View style={styles.avatarMenu}>
              <AvatarMenuOption icon={<CameraSmallIcon />} onPress={openProfileCamera}>
                Abrir cámara
              </AvatarMenuOption>
              <AvatarMenuOption
                icon={<GallerySmallIcon />}
                onPress={pickProfileFromLibrary}
              >
                Subir foto
              </AvatarMenuOption>
            </View>
          ) : null}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {profile?.nombre || ''} {profile?.apellido || ''}
          </Text>
          <Text style={styles.profileEmail}>{profile?.email || ''}</Text>
          <View style={styles.categoryPill}>
            <CrownIcon />
            <Text style={styles.categoryText}>
              {isAuctioneer
                ? 'Subastador'
                : `Categoría: ${capitalizeCategory(profile?.categoria)}`}
            </Text>
          </View>
          {savingSection === 'profile-image' ? (
            <Text style={styles.savingText}>Guardando foto...</Text>
          ) : null}
        </View>
      </View>

      <SectionCard title="Datos personales">
        <InfoRow label="Nombre" value={profile?.nombre || '-'} />
        <InfoRow label="Apellido" value={profile?.apellido || '-'} />
        {isAuctioneer ? (
          <>
            <InfoRow
              label="Usuario"
              value={
                profileFieldValue(profile, 'nombreUsuario', 'nombre_usuario') ||
                '-'
              }
            />
            <InfoRow label="Email" value={profile?.email || '-'} />
            <InfoRow label="Documento" value={profile?.documento || '-'} />
            <InfoRow label="Matrícula" value={auctioneerLicense || '-'} />
            <InfoRow label="Región" value={auctioneerRegion || '-'} />
            <InfoRow label="Domicilio" value={addressDisplay || '-'} />
            <InfoRow label="Localidad" value={profile?.localidad || '-'} />
            <InfoRow label="Ciudad" value={profile?.ciudad || '-'} />
            <InfoRow label="Estado" value={profile?.estado || '-'} />
          </>
        ) : (
          <>
            <InfoRow label="País" value={address.country || '-'} />
            <InfoRow
              action={
                <IconButton
                  accessibilityLabel="Editar domicilio"
                  onPress={() => setModal('address')}
                >
                  <EditIcon />
                </IconButton>
              }
              label="Domicilio"
              value={addressDisplay || '-'}
            />
            <InfoRow
              action={
                <IconButton
                  accessibilityLabel="Editar fotos DNI"
                  onPress={() => setModal('dni')}
                >
                  <UploadSmallIcon />
                </IconButton>
              }
              label="Fotos DNI"
              value={
                dniUpdatedAt
                  ? `Actualizadas: ${String(dniUpdatedAt).slice(0, 10)}`
                  : 'Sin fecha de actualización'
              }
            />
          </>
        )}
      </SectionCard>

      {!isAuctioneer ? (
        <SectionCard
          headerAction={
            <IconButton
              accessibilityLabel="Agregar medio de pago"
              onPress={() => setModal('payment')}
            >
              <AddPaymentIcon />
            </IconButton>
          }
          title="Medios de pago"
        >
          <View style={styles.paymentsList}>
            {payments.length ? (
              payments.map((payment) => {
                const presentation = paymentPresentation(payment);
                return (
                  <View key={payment.identificador} style={styles.paymentRow}>
                    <PaymentTypeIcon type={presentation.icon} />
                    <View style={styles.paymentTextBlock}>
                      <Text style={styles.paymentTitle}>
                        {presentation.title}
                      </Text>
                      {presentation.lines.map((line) => (
                        <Text
                          key={line}
                          numberOfLines={1}
                          style={styles.paymentLine}
                        >
                          {line}
                        </Text>
                      ))}
                    </View>
                    <View style={styles.paymentActions}>
                      <IconButton
                        accessibilityLabel={`Editar ${presentation.title}`}
                        onPress={() =>
                          handlePaymentEdit(payment.identificador)
                        }
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        accessibilityLabel={`Eliminar ${presentation.title}`}
                        onPress={() =>
                          handlePaymentDelete(payment.identificador)
                        }
                      >
                        <TrashIcon />
                      </IconButton>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyPayments}>
                Todavía no agregaste medios de pago.
              </Text>
            )}
          </View>
          <Text style={styles.paymentHint}>
            Necesitás al menos un medio de pago para poder pujar.
          </Text>
        </SectionCard>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => setModal('password')}
        style={styles.actionRow}
      >
        <Text style={styles.actionRowText}>Cambiar contraseña</Text>
        <ArrowIcon />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => setModal('logout')}
        style={styles.actionRow}
      >
        <Text style={styles.actionRowText}>Cerrar sesión</Text>
        <LogoutIcon />
      </Pressable>

      {!isAuctioneer ? (
        <>
          <AddressEditModal
            address={address}
            apiError={pageError}
            countries={countries}
            onClose={closeModal}
            onSave={handleAddressSave}
            saving={savingSection === 'address'}
            visible={modal === 'address'}
          />
          <DniEditModal
            apiError={pageError}
            files={dniFiles}
            onClose={closeModal}
            onSave={handleDniSave}
            saving={savingSection === 'dni'}
            visible={modal === 'dni'}
          />
        </>
      ) : null}
      {!isAuctioneer && modal === 'payment' ? (
        <PaymentEditModal
          initialPayment={editingPayment}
          onClose={closeModal}
          onSave={handlePaymentSave}
          visible
        />
      ) : null}
      <PasswordEditModal
        onClose={closeModal}
        visible={modal === 'password'}
      />
      <LogoutModal
        onClose={closeModal}
        onConfirm={onLogout}
        visible={modal === 'logout'}
      />
    </View>
  );
}

function InfoRow({ action, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoTextBlock}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text numberOfLines={2} style={styles.infoValue}>{value}</Text>
      </View>
      {action}
    </View>
  );
}

const modalShadowStyle = Platform.select({
  web: {
    boxShadow: '0px 14px 34px rgba(75, 13, 24, 0.24)',
  },
  android: {
    elevation: 12,
  },
  default: {},
});

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 38,
    paddingTop: 24,
    zIndex: 2,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 360,
    paddingHorizontal: 38,
  },
  loadingText: {
    color: colors.textBurgundy,
    fontFamily: fonts.medium,
    fontSize: 17,
  },
  pageError: {
    backgroundColor: 'rgba(159, 2, 29, 0.08)',
    borderColor: colors.burgundy,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 12,
    padding: 11,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(242, 211, 200, 0.62)',
    borderRadius: 18,
    columnGap: 18,
    flexDirection: 'row',
    marginBottom: 15,
    minHeight: 166,
    paddingHorizontal: 16,
    paddingVertical: 18,
    zIndex: 5,
  },
  avatarWrapper: {
    position: 'relative',
    zIndex: 8,
  },
  avatar: {
    borderRadius: 999,
    height: 116,
    width: 116,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: colors.burgundy,
    justifyContent: 'center',
  },
  avatarInitials: {
    color: colors.cream,
    fontFamily: fonts.bold,
    fontSize: 38,
  },
  avatarEditButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(252, 235, 219, 0.9)',
    borderColor: 'rgba(138, 74, 58, 0.28)',
    borderRadius: 18,
    borderWidth: 1,
    bottom: 1,
    height: 35,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    width: 35,
  },
  avatarMenu: {
    backgroundColor: colors.cream,
    borderColor: colors.blush,
    borderRadius: 8,
    borderWidth: 1,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    top: 123,
    width: 154,
    zIndex: 20,
  },
  avatarMenuOption: {
    alignItems: 'center',
    borderBottomColor: 'rgba(159, 2, 29, 0.12)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  avatarMenuText: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 18,
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    color: colors.cocoa,
    fontFamily: fonts.bold,
    fontSize: 19,
    lineHeight: 24,
  },
  profileEmail: {
    color: colors.cocoa,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 17,
  },
  categoryPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(252, 235, 219, 0.72)',
    borderRadius: 7,
    columnGap: 7,
    flexDirection: 'row',
    minHeight: 30,
    paddingHorizontal: 11,
  },
  categoryText: {
    color: colors.cocoa,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  savingText: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 6,
  },
  sectionCard: {
    backgroundColor: 'rgba(242, 211, 200, 0.58)',
    borderRadius: 15,
    marginBottom: 18,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 31,
  },
  sectionTitle: {
    color: colors.cocoa,
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
  },
  sectionDivider: {
    backgroundColor: colors.cocoa,
    height: 1,
    marginBottom: 5,
    opacity: 0.75,
    width: '100%',
  },
  infoRow: {
    alignItems: 'flex-end',
    borderBottomColor: 'rgba(138, 74, 58, 0.48)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 41,
    paddingBottom: 3,
  },
  infoTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  infoLabel: {
    color: colors.cocoa,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 15,
    opacity: 0.78,
  },
  infoValue: {
    color: '#3E1B1A',
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 21,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 30,
    minWidth: 30,
  },
  paymentsList: {
    rowGap: 7,
  },
  emptyPayments: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    paddingVertical: 12,
    textAlign: 'center',
  },
  paymentRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(252, 235, 219, 0.55)',
    borderRadius: 6,
    columnGap: 10,
    flexDirection: 'row',
    minHeight: 66,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  paymentTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  paymentTitle: {
    color: '#2B0F0F',
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 19,
  },
  paymentLine: {
    color: '#2B0F0F',
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 18,
  },
  paymentActions: {
    alignItems: 'center',
    columnGap: 2,
    flexDirection: 'row',
  },
  paymentHint: {
    color: '#3E1B1A',
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 9,
    textAlign: 'center',
  },
  actionRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(242, 211, 200, 0.58)',
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    minHeight: 43,
    paddingHorizontal: 15,
  },
  actionRowText: {
    color: colors.cocoa,
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 21,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(34, 4, 10, 0.34)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 42,
  },
  modalKeyboardAvoider: {
    maxWidth: 520,
    width: '100%',
  },
  modalCard: {
    ...modalShadowStyle,
    backgroundColor: colors.cream,
    borderColor: 'rgba(159, 2, 29, 0.32)',
    borderRadius: 18,
    borderWidth: 1,
    maxHeight: '92%',
    maxWidth: 520,
    overflow: 'hidden',
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    backgroundColor: colors.cardBlush,
    borderBottomColor: 'rgba(159, 2, 29, 0.24)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  modalTitle: {
    color: colors.textBurgundy,
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 25,
  },
  modalContent: {
    padding: 22,
  },
  modalDescription: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 12,
  },
  modalRow: {
    columnGap: 28,
    flexDirection: 'row',
    width: '100%',
  },
  modalHalfField: {
    flex: 1,
  },
  modalSectionTitle: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 23,
    lineHeight: 29,
    marginBottom: 12,
  },
  modalSubmit: {
    alignItems: 'center',
    marginTop: 24,
  },
  modalApiError: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 12,
    textAlign: 'center',
  },
  passwordField: {
    marginBottom: 11,
  },
  logoutText: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 17,
    lineHeight: 23,
    textAlign: 'center',
  },
  logoutActions: {
    alignItems: 'center',
    columnGap: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.burgundy,
    borderRadius: 25,
    borderWidth: 2,
    height: 50,
    justifyContent: 'center',
    width: 112,
  },
  secondaryButtonText: {
    color: colors.burgundy,
    fontFamily: fonts.medium,
    fontSize: 16,
  },
});
