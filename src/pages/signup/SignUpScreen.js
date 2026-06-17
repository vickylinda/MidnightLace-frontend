import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import AddressAutocompleteField from '../../components/forms/address/AddressAutocompleteField';
import AddressMapPreview from '../../components/forms/address/AddressMapPreview';
import AuthTextField from '../../components/forms/auth/AuthTextField';
import CountrySelectField from '../../components/forms/address/CountrySelectField';
import DniUploadButton from '../../components/forms/uploads/DniUploadButton';
import PrimaryButton from '../../components/forms/controls/PrimaryButton';
import SignUpProgress from '../../components/signup/SignUpProgress';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { validateEmail, validateUsername } from '../../utils/authValidation';
import { apiFetch, getApiErrorMessage } from '../../utils/http';

const INITIAL_ADDRESS = {
  addressLine: '',
  apartment: '',
  country: '',
  latitude: null,
  locality: '',
  longitude: null,
  number: '',
  postalCode: '',
  province: '',
  street: '',
};

const REQUIRED_FIELD_NAMES = [
  'firstName',
  'lastName',
  'username',
  'email',
  'documento',
  'dni',
  'country',
  'province',
  'locality',
  'postalCode',
  'street',
  'number',
];

function requiredError(value, label) {
  return String(value || '').trim() ? '' : `Completá ${label}.`;
}

function getVisibleError(touched, submitted, field, error) {
  return touched[field] || submitted ? error : '';
}

function normalizeAddressPart(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
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

function normalizeCountryName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function findCountryByName(countries, countryName) {
  const normalizedCountry = normalizeCountryName(countryName);

  if (!normalizedCountry) {
    return null;
  }

  return (
    countries.find((country) => {
      const normalizedName = normalizeCountryName(country.nombre);

      return (
        normalizedName === normalizedCountry ||
        normalizedName.includes(normalizedCountry) ||
        normalizedCountry.includes(normalizedName)
      );
    }) || null
  );
}

function findCountryById(countries, countryId) {
  return (
    countries.find((country) => String(country.numero) === String(countryId)) ||
    null
  );
}

export default function SignUpScreen({ onSubmitSuccess }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [documento, setDocumento] = useState('');
  const [dniFiles, setDniFiles] = useState([]);
  const [address, setAddress] = useState(INITIAL_ADDRESS);
  const [selectedCountryId, setSelectedCountryId] = useState(null);
  const [countries, setCountries] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState(
    REQUIRED_FIELD_NAMES.reduce(
      (fields, field) => ({
        ...fields,
        [field]: false,
      }),
      {}
    )
  );
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    apiFetch('/v1/paises?cantidad=100', { auth: false })
      .then((data) => setCountries(data.datos ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const country = findCountryByName(countries, address.country);

    if (
      country &&
      String(country.numero) !== String(selectedCountryId)
    ) {
      setSelectedCountryId(country.numero);
    }
  }, [address.country, countries, selectedCountryId]);

  const errors = {
    country: selectedCountryId ? '' : 'Seleccioná el país.',
    documento: requiredError(documento, 'tu número de documento'),
    dni:
      dniFiles.length >= 2
        ? ''
        : 'Subí una foto o archivo del frente y otra del dorso.',
    email: validateEmail(email),
    firstName: requiredError(firstName, 'tu nombre'),
    lastName: requiredError(lastName, 'tu apellido'),
    locality: requiredError(address.locality, 'la localidad'),
    number: requiredError(address.number, 'la altura'),
    postalCode: requiredError(address.postalCode, 'el codigo postal'),
    province: requiredError(address.province, 'la provincia'),
    street: requiredError(address.street, 'la calle'),
    username: validateUsername(username),
  };
  const isFormValid = Object.values(errors).every((error) => !error);
  const addressSearchValue =
    address.addressLine ||
    address.displayAddressLine ||
    buildAddressSearchValue(address);

  function handleBlur(field) {
    setTouched((currentTouched) => ({
      ...currentTouched,
      [field]: true,
    }));
  }

  function setAddressField(field, value) {
    const shouldResolveAgain = field !== 'apartment';

    setAddress((currentAddress) => ({
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

  function handleAddressSelect(nextAddress) {
    const country = findCountryByName(countries, nextAddress.country);

    if (country) {
      setSelectedCountryId(country.numero);
    }

    setAddress((currentAddress) => ({
      ...currentAddress,
      ...nextAddress,
    }));
  }

  function handleDniChange(nextFiles) {
    setDniFiles(nextFiles);
    setTouched((currentTouched) => ({
      ...currentTouched,
      dni: true,
    }));
  }

  async function handleSubmit() {
    setSubmitted(true);
    setTouched(
      REQUIRED_FIELD_NAMES.reduce((fields, field) => ({ ...fields, [field]: true }), {})
    );
    setApiError('');

    if (!isFormValid) {
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('documento', documento);
      formData.append('nombre', firstName);
      formData.append('apellido', lastName);
      formData.append('email', email);
      formData.append('nombreUsuario', username);
      formData.append('direccion', address.street);
      formData.append('altura', address.number);
      formData.append('codigoPostal', address.postalCode);
      formData.append('localidad', address.locality);
      formData.append('ciudad', address.province);
      formData.append('idPais', String(selectedCountryId));
      if (address.apartment) {
        formData.append('departamento', address.apartment);
      }
      const dniValues = await Promise.all(
        [dniFiles[0], dniFiles[1]].map(async (file) => {
          if (Platform.OS === 'web') {
            const res = await fetch(file.uri);
            const blob = await res.blob();
            return new File([blob], file.name, { type: blob.type || 'image/jpeg' });
          }
          return { uri: file.uri, name: file.name, type: 'image/jpeg' };
        })
      );
      formData.append('fotoDocFrente', dniValues[0]);
      formData.append('fotoDocDorso', dniValues[1]);

      const result = await apiFetch('/v1/auth/registro', {
        method: 'POST',
        body: formData,
        auth: false,
      });

      if (!result.aprobado) {
        setApiError(result.mensaje);
        return;
      }

      onSubmitSuccess?.({ email, categoria: result.categoria });
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'No pudimos completar el registro.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <SignUpProgress currentStep={1} />

      <Text style={styles.title}>Registrarse</Text>

      <Text style={styles.sectionTitle}>Datos de cuenta</Text>

      <View style={styles.row}>
        <AuthTextField
          error={getVisibleError(touched, submitted, 'firstName', errors.firstName)}
          label="Nombre*"
          onBlur={() => handleBlur('firstName')}
          onChangeText={setFirstName}
          style={styles.halfField}
          value={firstName}
        />
        <AuthTextField
          error={getVisibleError(touched, submitted, 'lastName', errors.lastName)}
          label="Apellido*"
          onBlur={() => handleBlur('lastName')}
          onChangeText={setLastName}
          style={styles.halfField}
          value={lastName}
        />
      </View>

      <AuthTextField
        autoComplete="username"
        error={getVisibleError(touched, submitted, 'username', errors.username)}
        label="Nombre de usuario*"
        onBlur={() => handleBlur('username')}
        onChangeText={setUsername}
        textContentType="username"
        value={username}
      />

      <AuthTextField
        autoComplete="email"
        error={getVisibleError(touched, submitted, 'email', errors.email)}
        keyboardType="email-address"
        label="Email*"
        onBlur={() => handleBlur('email')}
        onChangeText={setEmail}
        textContentType="emailAddress"
        value={email}
      />

      <AuthTextField
        error={getVisibleError(touched, submitted, 'documento', errors.documento)}
        keyboardType="numeric"
        label="Número de documento*"
        onBlur={() => handleBlur('documento')}
        onChangeText={setDocumento}
        value={documento}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subir DNI</Text>
        <Text style={styles.sectionDescription}>
          Subí una foto o archivo del frente y otra del dorso.
        </Text>
        <DniUploadButton
          error={getVisibleError(touched, submitted, 'dni', errors.dni)}
          files={dniFiles}
          onChange={handleDniChange}
        />
      </View>

      <Text style={styles.sectionTitle}>Domicilio</Text>

      <AddressAutocompleteField
        displayValue={addressSearchValue}
        onSelect={handleAddressSelect}
      />

      <CountrySelectField
        countries={countries}
        error={getVisibleError(touched, submitted, 'country', errors.country)}
        label="País*"
        onChange={(numero) => {
          const country = findCountryById(countries, numero);

          setSelectedCountryId(numero);
          setAddressField('country', country?.nombre || '');
          handleBlur('country');
        }}
        value={selectedCountryId}
      />

      <AuthTextField
        error={getVisibleError(touched, submitted, 'province', errors.province)}
        label="Provincia*"
        onBlur={() => handleBlur('province')}
        onChangeText={(value) => setAddressField('province', value)}
        value={address.province}
      />

      <AuthTextField
        error={getVisibleError(touched, submitted, 'locality', errors.locality)}
        label="Localidad*"
        onBlur={() => handleBlur('locality')}
        onChangeText={(value) => setAddressField('locality', value)}
        value={address.locality}
      />

      <AuthTextField
        error={getVisibleError(touched, submitted, 'postalCode', errors.postalCode)}
        label="Código postal*"
        onBlur={() => handleBlur('postalCode')}
        onChangeText={(value) => setAddressField('postalCode', value)}
        value={address.postalCode}
      />

      <AuthTextField
        error={getVisibleError(touched, submitted, 'street', errors.street)}
        label="Calle*"
        onBlur={() => handleBlur('street')}
        onChangeText={(value) => setAddressField('street', value)}
        value={address.street}
      />

      <View style={styles.row}>
        <AuthTextField
          error={getVisibleError(touched, submitted, 'number', errors.number)}
          keyboardType="numeric"
          label="Altura*"
          onBlur={() => handleBlur('number')}
          onChangeText={(value) => setAddressField('number', value)}
          style={styles.halfField}
          value={address.number}
        />

        <AuthTextField
          label="Dpto."
          onChangeText={(value) => setAddressField('apartment', value)}
          style={styles.halfField}
          value={address.apartment}
        />
      </View>

      <View style={styles.mapSection}>
        <Text style={[styles.sectionTitle, styles.mapTitle]}>
          Confirmar ubicación
        </Text>
        <AddressMapPreview address={address} />
        {addressSearchValue ? (
          <Text style={styles.mapAddressText}>{addressSearchValue}</Text>
        ) : null}
      </View>

      {apiError ? (
        <Text style={styles.apiError}>{apiError}</Text>
      ) : null}

      <View style={styles.submit}>
        <PrimaryButton disabled={!isFormValid || loading} onPress={handleSubmit}>
          {loading ? 'Enviando...' : 'Enviar'}
        </PrimaryButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 53,
    paddingTop: 38,
    zIndex: 2,
  },
  title: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 36,
    letterSpacing: 0,
    lineHeight: 44,
    marginBottom: 17,
  },
  section: {
    marginBottom: 34,
    width: '100%',
    zIndex: 4,
  },
  sectionTitle: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 25,
    letterSpacing: 0,
    lineHeight: 32,
    marginBottom: 21,
  },
  sectionDescription: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 10,
    marginTop: -15,
  },
  row: {
    columnGap: 28,
    flexDirection: 'row',
    width: '100%',
  },
  halfField: {
    flex: 1,
  },
  mapSection: {
    marginBottom: 30,
    width: '100%',
  },
  mapTitle: {
    marginBottom: 12,
  },
  mapAddressText: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 18,
    marginTop: 8,
  },
  submit: {
    alignItems: 'center',
    marginTop: 20,
  },
  apiError: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 8,
    textAlign: 'center',
  },
});
