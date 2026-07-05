import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import PrimaryButton from '../../components/forms/controls/PrimaryButton';
import AuthTextField from '../../components/forms/auth/AuthTextField';
import PasswordChecklist, { passwordRules } from '../../components/forms/auth/PasswordChecklist';
import { useNotifications } from '../../context/NotificationsContext';
import {
  listAdminPaymentMethods,
  listAdminProducts,
  listAdminClients,
  verifyAdminClient,
  verifyAdminProduct,
  verifyPaymentMethod,
} from '../../services/adminApi';
import { changePassword, getProfile } from '../../services/profileApi';
import { clearSession } from '../../utils/session';
import { getApiErrorMessage } from '../../utils/http';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

const CATEGORIES = [
  { label: 'Comun', value: 'comun' },
  { label: 'Especial', value: 'especial' },
  { label: 'Plata', value: 'plata' },
  { label: 'Oro', value: 'oro' },
  { label: 'Platino', value: 'platino' },
];

function ChevronDownIcon() {
  return (
    <Svg height={14} viewBox="0 0 16 16" width={14}>
      <Path
        d="M4 6L8 10L12 6"
        fill="none"
        stroke={colors.burgundy}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

function CategorySelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = CATEGORIES.find((item) => item.value === value);

  return (
    <View style={styles.selectWrap}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.selectButton}>
        <Text style={styles.selectButtonText}>{selected?.label || 'Categoria'}</Text>
        <ChevronDownIcon />
      </Pressable>
      {open ? (
        <View style={styles.selectMenu}>
          {CATEGORIES.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => {
                onChange(item.value);
                setOpen(false);
              }}
              style={styles.selectOption}
            >
              <Text style={styles.selectOptionText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ClientRow({ client, onDone }) {
  const [category, setCategory] = useState(client.categoria || 'comun');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(aprobado) {
    setLoading(true);
    setError('');
    try {
      await verifyAdminClient(client.identificador, {
        aprobado,
        categoria: aprobado ? category : undefined,
      });
      onDone?.();
    } catch (err) {
      setError(getApiErrorMessage(err, 'No pudimos verificar la cuenta.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.rowCard}>
      <View style={styles.rowTextBlock}>
        <Text style={styles.rowTitle}>
          {client.nombre} {client.apellido}
        </Text>
        <Text style={styles.rowMeta}>{client.email}</Text>
        <Text style={styles.rowMeta}>Doc. {client.documento || '-'}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <View style={styles.rowActions}>
        <CategorySelect value={category} onChange={setCategory} />
        <View style={styles.iconActions}>
          <Pressable disabled={loading} onPress={() => submit(true)} style={[styles.iconButton, styles.okButton]}>
            <Text style={styles.iconButtonText}>✓</Text>
          </Pressable>
          <Pressable disabled={loading} onPress={() => submit(false)} style={[styles.iconButton, styles.noButton]}>
            <Text style={styles.iconButtonText}>×</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ActionButtons({ loading, onReject, onVerify, showReject = true }) {
  return (
    <View style={styles.iconActions}>
      <Pressable disabled={loading} onPress={onVerify} style={[styles.iconButton, styles.okButton]}>
        <Text style={styles.iconButtonText}>✓</Text>
      </Pressable>
      {showReject ? (
        <Pressable disabled={loading} onPress={onReject} style={[styles.iconButton, styles.noButton]}>
          <Text style={styles.iconButtonText}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function paymentSummary(payment) {
  const detail = payment.detalle || {};

  if (payment.tipo === 'tarjetaCredito') {
    return `${detail.red || 'Tarjeta de credito'} terminada en ${
      detail.ultimosCuatroDigitos || '----'
    }`;
  }

  if (payment.tipo === 'cuentaBancaria') {
    return `${detail.nombreBanco || 'Cuenta bancaria'} - cuenta ${
      detail.numeroCuenta || '-'
    }`;
  }

  if (payment.tipo === 'chequeCertificado') {
    return `Cheque por ${payment.moneda || 'ARS'} ${
      detail.montoDisponible ?? detail.montoGarantizado ?? '-'
    }`;
  }

  return payment.tipo || 'Medio de pago';
}

function isNotFoundError(error) {
  const status = error?.status || error?.statusCode || error?.response?.status;
  const message = String(error?.message || error?.detail?.mensaje || '').toLowerCase();

  return (
    status === 404 ||
    message.includes('not found') ||
    message.includes('no encontrado')
  );
}

function requiredError(value, label) {
  return String(value || '').trim() ? '' : `Completa ${label}.`;
}

function validatePassword(password) {
  if (!password) {
    return 'Ingresa una contrasenia.';
  }

  return passwordRules.every((rule) => rule.test(password))
    ? ''
    : 'La contrasenia todavia no cumple los requisitos.';
}

function profileInitials(profile) {
  const initials = [profile?.nombre, profile?.apellido]
    .map((value) => String(value || '').trim().charAt(0))
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return initials || 'E';
}

function PaymentRow({ payment, onDone }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const client = payment.cliente || {};

  async function submit() {
    setLoading(true);
    setError('');
    try {
      await verifyPaymentMethod(payment.identificador);
      onDone?.();
    } catch (err) {
      setError(getApiErrorMessage(err, 'No pudimos verificar el medio de pago.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.rowCard}>
      <View style={styles.rowTextBlock}>
        <Text style={styles.rowTitle}>
          {client.nombre || 'Usuario'} {client.apellido || ''}
        </Text>
        <Text style={styles.rowMeta}>{client.email || '-'}</Text>
        <Text style={styles.rowMeta}>{paymentSummary(payment)}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <View style={styles.rowActions}>
        <ActionButtons
          loading={loading}
          onVerify={submit}
          showReject={false}
        />
      </View>
    </View>
  );
}

function ProductRow({ product, onDone }) {
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const owner = product.duenio || {};

  async function submit(aprobado) {
    if (!aprobado && !reason.trim()) {
      setMessage('Ingresa el motivo del rechazo.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await verifyAdminProduct(product.identificador, {
        aprobado,
        motivo: aprobado ? undefined : reason.trim(),
      });
      setMessage(aprobado ? 'Verificado correctamente.' : 'Rechazado correctamente.');
      setReason('');
      onDone?.();
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'No pudimos procesar la verificacion.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.rowCard}>
      <View style={styles.rowTextBlock}>
        <Text style={styles.rowTitle}>{product.nombre || 'Producto'}</Text>
        <Text style={styles.rowMeta}>
          {owner.nombre || 'Usuario'} {owner.apellido || ''} · {owner.email || '-'}
        </Text>
        <Text style={styles.rowMeta}>
          {product.moneda || 'ARS'} {product.precioBase || '-'}
        </Text>
        <Text numberOfLines={2} style={styles.rowMeta}>
          {product.descripcionCatalogo || product.descripcionCompleta || '-'}
        </Text>
        <AuthTextField
          label="Motivo de rechazo"
          onChangeText={setReason}
          value={reason}
        />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
      <View style={styles.rowActions}>
        <ActionButtons
          loading={loading}
          onReject={() => submit(false)}
          onVerify={() => submit(true)}
        />
      </View>
    </View>
  );
}

function VerifyTab() {
  const { lastEvent } = useNotifications() ?? {};
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState('');
  const [paymentsError, setPaymentsError] = useState('');
  const [productsError, setProductsError] = useState('');

  async function fetchClients({ showLoader = true } = {}) {
    if (showLoader) {
      setLoading(true);
    }
    setError('');
    try {
      const data = await listAdminClients();
      setClients((data.datos || []).filter((client) => client.admitido == null));
    } catch (err) {
      setError(getApiErrorMessage(err, 'No pudimos cargar las cuentas.'));
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }

  async function fetchPayments({ showLoader = true } = {}) {
    if (showLoader) {
      setLoadingPayments(true);
    }
    setPaymentsError('');
    try {
      const data = await listAdminPaymentMethods({ verificado: 'no' });
      setPayments(data.datos || []);
    } catch (err) {
      if (isNotFoundError(err)) {
        setPayments([]);
        return;
      }
      setPaymentsError(getApiErrorMessage(err, 'No pudimos cargar los medios de pago.'));
    } finally {
      if (showLoader) {
        setLoadingPayments(false);
      }
    }
  }

  async function fetchProducts({ showLoader = true } = {}) {
    if (showLoader) {
      setLoadingProducts(true);
    }
    setProductsError('');
    try {
      const data = await listAdminProducts({ estado: 'pendiente' });
      setProducts(data.datos || []);
    } catch (err) {
      if (isNotFoundError(err)) {
        setProducts([]);
        return;
      }
      setProductsError(getApiErrorMessage(err, 'No pudimos cargar los productos.'));
    } finally {
      if (showLoader) {
        setLoadingProducts(false);
      }
    }
  }

  useEffect(() => {
    fetchClients();
    fetchPayments();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (lastEvent?.evento === 'admin_cliente_pendiente') {
      fetchClients({ showLoader: false });
    }

    if (lastEvent?.evento === 'admin_medio_pago_pendiente') {
      fetchPayments({ showLoader: false });
    }

    if (lastEvent?.evento === 'admin_producto_pendiente') {
      fetchProducts({ showLoader: false });
    }
  }, [lastEvent?.receivedAt]);

  return (
    <View>
      <Text style={styles.sectionTitle}>Validaciones de cuenta</Text>
      {loading ? (
        <ActivityIndicator color={colors.burgundy} style={styles.loader} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : clients.length ? (
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={clients.length > 3}
          style={styles.verificationList}
        >
          {clients.map((client) => (
            <ClientRow client={client} key={client.identificador} onDone={fetchClients} />
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.empty}>No hay cuentas pendientes.</Text>
      )}

      <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Medios de pago</Text>
      {loadingPayments ? (
        <ActivityIndicator color={colors.burgundy} style={styles.loader} />
      ) : paymentsError ? (
        <Text style={styles.error}>{paymentsError}</Text>
      ) : payments.length ? (
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={payments.length > 3}
          style={styles.verificationList}
        >
          {payments.map((payment) => (
            <PaymentRow
              key={payment.identificador}
              payment={payment}
              onDone={fetchPayments}
            />
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.empty}>No hay medios de pago para verificar.</Text>
      )}

      <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Productos</Text>
      {loadingProducts ? (
        <ActivityIndicator color={colors.burgundy} style={styles.loader} />
      ) : productsError ? (
        <Text style={styles.error}>{productsError}</Text>
      ) : products.length ? (
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={products.length > 3}
          style={[styles.verificationList, styles.productVerificationList]}
        >
          {products.map((product) => (
            <ProductRow
              key={product.identificador}
              product={product}
              onDone={fetchProducts}
            />
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.empty}>No hay productos pendientes.</Text>
      )}
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
              <Pressable
                accessibilityLabel="Cerrar modal"
                accessibilityRole="button"
                onPress={onClose}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>x</Text>
              </Pressable>
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
        : 'Las contrasenias no coinciden.',
    currentPassword: requiredError(currentPassword, 'tu contrasenia actual'),
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
        getApiErrorMessage(error, 'No pudimos cambiar la contrasenia.')
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProfileModal onClose={onClose} title="Cambiar contrasenia" visible={visible}>
      <AuthTextField
        error={submitted ? errors.currentPassword : ''}
        label="Contrasenia actual"
        onChangeText={setCurrentPassword}
        secureTextEntry
        value={currentPassword}
      />
      <AuthTextField
        error={submitted && !newPassword ? errors.newPassword : ''}
        label="Nueva contrasenia"
        onChangeText={setNewPassword}
        secureTextEntry
        style={styles.passwordField}
        value={newPassword}
      />
      <PasswordChecklist value={newPassword} />
      <AuthTextField
        error={submitted ? errors.confirmation : ''}
        label="Confirmar nueva contrasenia"
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
    <ProfileModal onClose={onClose} title="Cerrar sesion" visible={visible}>
      <Text style={styles.logoutModalText}>
        Estas segura/o de que queres cerrar sesion?
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

function ProfileTab({ onLogout }) {
  const [profile, setProfile] = useState(null);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    getProfile().then(setProfile).catch(() => {});
  }, []);

  function closeModal() {
    setModal(null);
  }

  return (
    <View>
      <View style={styles.employeeProfileCard}>
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarInitials}>{profileInitials(profile)}</Text>
        </View>
        <View style={styles.employeeProfileInfo}>
          <Text style={styles.profileName}>
            {profile?.nombre || '-'} {profile?.apellido || ''}
          </Text>
          <Text style={styles.profileEmail}>{profile?.email || '-'}</Text>
          <Text style={styles.rolePill}>ROL ADMIN/EMPLEADO</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionCardTitle}>Datos de empleado</Text>
        <View style={styles.sectionDivider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Nombre</Text>
          <Text style={styles.infoValue}>{profile?.nombre || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Apellido</Text>
          <Text style={styles.infoValue}>{profile?.apellido || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{profile?.email || '-'}</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => setModal('password')}
        style={styles.actionRow}
      >
        <Text style={styles.actionRowText}>Cambiar contrasenia</Text>
        <Text style={styles.actionArrow}>›</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => setModal('logout')}
        style={styles.actionRow}
      >
        <Text style={styles.actionRowText}>Cerrar sesion</Text>
        <Text style={styles.actionArrow}>›</Text>
      </Pressable>

      <PasswordEditModal onClose={closeModal} visible={modal === 'password'} />
      <LogoutModal
        onClose={closeModal}
        onConfirm={() => {
          clearSession();
          onLogout?.();
        }}
        visible={modal === 'logout'}
      />
    </View>
  );
}

export default function EmployeeDashboardScreen({ activeTab = 'verify', onLogout }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Panel de empleados</Text>
      <View style={styles.content}>
        {activeTab === 'verify' ? <VerifyTab /> : <ProfileTab onLogout={onLogout} />}
      </View>
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
    alignSelf: 'center',
    maxWidth: 620,
    paddingBottom: 24,
    paddingHorizontal: 28,
    paddingTop: 24,
    width: '100%',
    zIndex: 2,
  },
  title: {
    color: colors.cocoa,
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 36,
    marginBottom: 14,
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 21,
    lineHeight: 27,
    marginBottom: 10,
  },
  sectionSpacing: {
    marginTop: 20,
  },
  loader: {
    marginVertical: 20,
  },
  verificationList: {
    maxHeight: 368,
  },
  productVerificationList: {
    maxHeight: 640,
  },
  rowCard: {
    backgroundColor: 'rgba(252, 235, 219, 0.78)',
    borderColor: 'rgba(159, 2, 29, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    columnGap: 12,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 12,
  },
  rowTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: colors.cocoa,
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 21,
  },
  rowMeta: {
    color: colors.cocoa,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  rowActions: {
    alignItems: 'flex-end',
    rowGap: 8,
  },
  selectWrap: {
    minWidth: 112,
    zIndex: 4,
  },
  selectButton: {
    alignItems: 'center',
    borderColor: colors.burgundy,
    borderRadius: 6,
    borderWidth: 1,
    columnGap: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 34,
    paddingHorizontal: 10,
  },
  selectButtonText: {
    color: colors.textBurgundy,
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  selectMenu: {
    backgroundColor: colors.cream,
    borderColor: colors.blush,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
    position: 'absolute',
    top: 34,
    width: '100%',
    zIndex: 8,
  },
  selectOption: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  selectOptionText: {
    color: colors.cocoa,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  iconActions: {
    columnGap: 8,
    flexDirection: 'row',
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  okButton: {
    backgroundColor: '#4D9C45',
  },
  noButton: {
    backgroundColor: colors.burgundy,
  },
  iconButtonText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 25,
  },
  manualCard: {
    backgroundColor: 'rgba(242, 211, 200, 0.55)',
    borderRadius: 8,
    marginTop: 16,
    padding: 14,
  },
  cardTitle: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 23,
  },
  cardHint: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
    marginTop: 3,
  },
  manualActions: {
    columnGap: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  smallPrimary: {
    width: 128,
  },
  smallDanger: {
    backgroundColor: colors.mutedRose,
    width: 128,
  },
  empty: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 14,
    marginBottom: 8,
  },
  error: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  message: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
    textAlign: 'center',
  },
  employeeProfileCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(242, 211, 200, 0.62)',
    borderRadius: 18,
    columnGap: 18,
    flexDirection: 'row',
    marginBottom: 15,
    minHeight: 142,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: colors.burgundy,
    borderRadius: 999,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  avatarInitials: {
    color: colors.cream,
    fontFamily: fonts.bold,
    fontSize: 34,
  },
  employeeProfileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    color: colors.cocoa,
    fontFamily: fonts.bold,
    fontSize: 19,
    lineHeight: 25,
  },
  profileEmail: {
    color: colors.cocoa,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.burgundy,
    borderRadius: 999,
    color: colors.cream,
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  sectionCard: {
    backgroundColor: 'rgba(242, 211, 200, 0.58)',
    borderRadius: 15,
    marginBottom: 18,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  sectionCardTitle: {
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
    borderBottomColor: 'rgba(138, 74, 58, 0.48)',
    borderBottomWidth: 1,
    minHeight: 41,
    paddingBottom: 3,
    paddingTop: 5,
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
  actionArrow: {
    color: colors.cocoa,
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 28,
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
  modalCloseButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 30,
    minWidth: 30,
  },
  modalCloseText: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 24,
  },
  modalContent: {
    padding: 22,
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
  logoutModalText: {
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
