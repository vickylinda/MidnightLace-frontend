import { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Rect } from 'react-native-svg';

import AddressAutocompleteField from '../components/forms/AddressAutocompleteField';
import AddressMapPreview from '../components/forms/AddressMapPreview';
import AuthTextField from '../components/forms/AuthTextField';
import DniUploadButton from '../components/forms/DniUploadButton';
import PasswordChecklist, {
  passwordRules,
} from '../components/forms/PasswordChecklist';
import PrimaryButton from '../components/forms/PrimaryButton';
import PaymentMethodsScreen from './PaymentMethodsScreen';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

const INITIAL_ADDRESS = {
  addressLine: 'Av. Callao 1234, CABA, Argentina',
  apartment: '',
  country: 'Argentina',
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
  'street',
  'number',
];

const mockProfile = {
  category: 'Oro',
  email: 'camila.rose@gmail.com',
  firstName: 'Camila',
  lastName: 'Rose',
};

const initialProfileImage = require('../assets/profile/profile-pic.jpg');

const initialPayments = [
  {
    id: 'card-1',
    icon: 'card',
    lines: ['Visa terminada en 1234', 'Vencimiento: 07/2028'],
    title: 'Tarjeta de credito',
  },
  {
    id: 'bank-1',
    icon: 'bank',
    lines: ['Banco Galicia', 'CBU: 28505909 40090418135201'],
    title: 'Cuenta Bancaria',
  },
  {
    id: 'check-1',
    icon: 'check',
    lines: ['N° 00034567'],
    title: 'Cheque certificado',
  },
];

function normalizeAddressPart(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function requiredError(value, label) {
  return String(value || '').trim() ? '' : `Completa ${label}.`;
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

function AvatarMenuOption({ children, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.avatarMenuOption}>
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
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <IconButton accessibilityLabel="Cerrar modal" onPress={onClose}>
              <CloseIcon />
            </IconButton>
          </View>
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function AddressEditModal({ address, onClose, onSave, visible }) {
  const [draft, setDraft] = useState(address);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraft(address);
      setSubmitted(false);
    }
  }, [address, visible]);

  const errors = {
    country: requiredError(draft.country, 'el pais'),
    locality: requiredError(draft.locality, 'la localidad'),
    number: requiredError(draft.number, 'la altura'),
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
        onSelect={(nextAddress) =>
          setDraft((currentAddress) => ({
            ...currentAddress,
            ...nextAddress,
          }))
        }
      />

      <AuthTextField
        error={submitted ? errors.country : ''}
        label="Pais*"
        onChangeText={(value) => setAddressField('country', value)}
        value={draft.country}
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
        label="Codigo postal"
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

      <Text style={styles.modalSectionTitle}>Confirmar ubicacion</Text>
      <AddressMapPreview address={draft} />

      <View style={styles.modalSubmit}>
        <PrimaryButton disabled={!isValid} onPress={handleSave}>
          Guardar
        </PrimaryButton>
      </View>
    </ProfileModal>
  );
}

function DniEditModal({ files, onChange, onClose, visible }) {
  return (
    <ProfileModal onClose={onClose} title="Fotos DNI" visible={visible}>
      <Text style={styles.modalDescription}>
        Subi una foto o archivo del frente y otra del dorso.
      </Text>
      <DniUploadButton files={files} onChange={onChange} />
    </ProfileModal>
  );
}

function PaymentEditModal({ onClose, onSave, visible }) {
  return (
    <ProfileModal onClose={onClose} title="Medio de pago" visible={visible}>
      <PaymentMethodsScreen
        allowSkip={false}
        onContinue={onSave}
        showHeader={false}
      />
    </ProfileModal>
  );
}

function validatePassword(password) {
  if (!password) {
    return 'Ingresa una contraseña.';
  }

  return passwordRules.every((rule) => rule.test(password))
    ? ''
    : 'La contraseña todavia no cumple los requisitos.';
}

function PasswordEditModal({ onClose, visible }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (visible) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
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

  function handleSubmit() {
    setSubmitted(true);

    if (isValid) {
      onClose();
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
        <PrimaryButton disabled={!isValid} onPress={handleSubmit}>
          Guardar
        </PrimaryButton>
      </View>
    </ProfileModal>
  );
}

function LogoutModal({ onClose, onConfirm, visible }) {
  return (
    <ProfileModal onClose={onClose} title="Cerrar sesión" visible={visible}>
      <Text style={styles.logoutText}>
        ¿Estas seguro/a que queres cerrar sesión?
      </Text>
      <View style={styles.logoutActions}>
        <Pressable onPress={onClose} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>No</Text>
        </Pressable>
        <PrimaryButton onPress={onConfirm}>Si</PrimaryButton>
      </View>
    </ProfileModal>
  );
}

export default function ProfileScreen({ onLogout }) {
  const [address, setAddress] = useState(INITIAL_ADDRESS);
  const [profileImage, setProfileImage] = useState(initialProfileImage);
  const [isProfileImageMenuOpen, setIsProfileImageMenuOpen] = useState(false);
  const [dniFiles, setDniFiles] = useState([
    {
      id: 'dni-front',
      name: 'dni-frente.jpg',
      uri: '',
    },
    {
      id: 'dni-back',
      name: 'dni-dorso.jpg',
      uri: '',
    },
  ]);
  const [payments, setPayments] = useState(initialPayments);
  const [modal, setModal] = useState(null);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const addressDisplay = address.displayAddressLine || buildAddressSearchValue(address);

  function applyProfileImage(asset) {
    if (!asset?.uri) {
      setIsProfileImageMenuOpen(false);
      return;
    }

    setProfileImage({ uri: asset.uri });
    setIsProfileImageMenuOpen(false);
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
      applyProfileImage(result.assets?.[0]);
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
      applyProfileImage(result.assets?.[0]);
    }
  }

  async function pickProfileDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: 'image/*',
    });

    if (!result.canceled) {
      applyProfileImage(result.assets?.[0]);
    } else {
      setIsProfileImageMenuOpen(false);
    }
  }

  function closeModal() {
    setModal(null);
    setEditingPaymentId(null);
  }

  function handleAddressSave(nextAddress) {
    setAddress(nextAddress);
    closeModal();
  }

  function handlePaymentSave(selectedMethod) {
    if (!selectedMethod) {
      closeModal();
      return;
    }

    if (editingPaymentId) {
      setPayments((currentPayments) =>
        currentPayments.map((payment) =>
          payment.id === editingPaymentId
            ? {
                ...payment,
                lines: ['Actualizado recientemente'],
              }
            : payment
        )
      );
    } else {
      setPayments((currentPayments) => [
        ...currentPayments,
        {
          id: `payment-${Date.now()}`,
          icon: selectedMethod === 'check' ? 'check' : selectedMethod === 'bank' ? 'bank' : 'card',
          lines: ['Agregado recientemente'],
          title:
            selectedMethod === 'check'
              ? 'Cheque certificado'
              : selectedMethod === 'bank'
              ? 'Cuenta Bancaria'
              : 'Tarjeta de credito',
        },
      ]);
    }

    closeModal();
  }

  function handlePaymentEdit(paymentId) {
    setEditingPaymentId(paymentId);
    setModal('payment');
  }

  function handlePaymentDelete(paymentId) {
    setPayments((currentPayments) =>
      currentPayments.filter((payment) => payment.id !== paymentId)
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.profileCard}>
        <View style={styles.avatarWrapper}>
          <Image source={profileImage} style={styles.avatar} />
          <Pressable
            accessibilityLabel="Editar foto de perfil"
            accessibilityRole="button"
            onPress={() =>
              setIsProfileImageMenuOpen((currentValue) => !currentValue)
            }
            style={styles.avatarEditButton}
          >
            <EditIcon />
          </Pressable>
          {isProfileImageMenuOpen ? (
            <View style={styles.avatarMenu}>
              <AvatarMenuOption onPress={openProfileCamera}>
                Abrir camara
              </AvatarMenuOption>
              <AvatarMenuOption onPress={pickProfileFromLibrary}>
                Elegir de fotos
              </AvatarMenuOption>
              <AvatarMenuOption onPress={pickProfileDocument}>
                Subir archivo
              </AvatarMenuOption>
            </View>
          ) : null}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {mockProfile.firstName} {mockProfile.lastName}
          </Text>
          <Text style={styles.profileEmail}>{mockProfile.email}</Text>
          <View style={styles.categoryPill}>
            <CrownIcon />
            <Text style={styles.categoryText}>Categoría: {mockProfile.category}</Text>
          </View>
        </View>
      </View>

      <SectionCard title="Datos personales">
        <InfoRow label="Nombre" value={mockProfile.firstName} />
        <InfoRow label="Apellido" value={mockProfile.lastName} />
        <InfoRow label="Pais" value={address.country} />
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
          value={addressDisplay}
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
          value="Actualizadas: 10/04/26"
        />
      </SectionCard>

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
          {payments.map((payment) => (
            <View key={payment.id} style={styles.paymentRow}>
              <PaymentTypeIcon type={payment.icon} />
              <View style={styles.paymentTextBlock}>
                <Text style={styles.paymentTitle}>{payment.title}</Text>
                {payment.lines.map((line) => (
                  <Text key={line} numberOfLines={1} style={styles.paymentLine}>
                    {line}
                  </Text>
                ))}
              </View>
              <View style={styles.paymentActions}>
                <IconButton
                  accessibilityLabel={`Editar ${payment.title}`}
                  onPress={() => handlePaymentEdit(payment.id)}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  accessibilityLabel={`Eliminar ${payment.title}`}
                  onPress={() => handlePaymentDelete(payment.id)}
                >
                  <TrashIcon />
                </IconButton>
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.paymentHint}>
          Necesitas al menos un medio de pago para poder pujar.
        </Text>
      </SectionCard>

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

      <AddressEditModal
        address={address}
        onClose={closeModal}
        onSave={handleAddressSave}
        visible={modal === 'address'}
      />
      <DniEditModal
        files={dniFiles}
        onChange={setDniFiles}
        onClose={closeModal}
        visible={modal === 'dni'}
      />
      <PaymentEditModal
        onClose={closeModal}
        onSave={handlePaymentSave}
        visible={modal === 'payment'}
      />
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
    borderBottomColor: 'rgba(159, 2, 29, 0.12)',
    borderBottomWidth: 1,
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
