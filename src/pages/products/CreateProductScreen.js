import { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import DeclarationCheckbox from '../../components/forms/fields/DeclarationCheckbox';
import LineSelectField from '../../components/forms/fields/LineSelectField';
import LineTextField from '../../components/forms/fields/LineTextField';
import PrimaryButton from '../../components/forms/controls/PrimaryButton';
import ProductImagePicker from '../../components/products/ProductImagePicker';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { apiFetch, getApiErrorMessage } from '../../utils/http';

const PRODUCT_TYPES = [
  { label: 'Prenda, accesorio u otro bien', value: 'standard' },
  { label: 'Colección o conjunto de elementos', value: 'collection' },
  { label: 'Obra de arte', value: 'artwork' },
  { label: 'Objeto de diseñador', value: 'designer' },
];

const CURRENCY_OPTIONS = [
  { label: 'ARS', value: 'ARS' },
  { label: 'USD', value: 'USD' },
];

const PRODUCT_CONDITION_OPTIONS = [
  { label: 'Nuevo', value: 'nuevo' },
  { label: 'Usado', value: 'usado' },
];

const CATALOG_DESCRIPTION_MAX_LENGTH = 160;

const INITIAL_FORM = {
  catalogDescription: '',
  completeDescription: '',
  creator: '',
  description: '',
  history: '',
  itemCount: '1',
  moneda: '',
  name: '',
  objectDate: '',
  precioBase: '',
  productCondition: '',
  productType: '',
  relevantDetails: '',
};

function requiredError(value, label) {
  return String(value || '').trim() ? '' : `Completá ${label}.`;
}

export default function CreateProductScreen({ onSubmitSuccess }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [images, setImages] = useState([]);
  const [legalDeclaration, setLegalDeclaration] = useState(false);
  const [returnAgreement, setReturnAgreement] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const isSpecialProduct =
    form.productType === 'artwork' || form.productType === 'designer';
  const errors = useMemo(() => {
    const itemCount = Number(form.itemCount);

    const precio = parseFloat(form.precioBase);

    return {
      creator: isSpecialProduct
        ? requiredError(form.creator, 'el artista o diseñador')
        : '',
      catalogDescription:
        form.catalogDescription.trim().length > 0 &&
        form.catalogDescription.trim().length <= CATALOG_DESCRIPTION_MAX_LENGTH
          ? ''
          : `La descripción breve es obligatoria y no puede superar los ${CATALOG_DESCRIPTION_MAX_LENGTH} caracteres.`,

      completeDescription: requiredError(
        form.completeDescription,
        'la descripción completa'
      ),
      history: isSpecialProduct
        ? requiredError(form.history, 'la historia y procedencia')
        : '',
      images:
        images.length >= 6 ? '' : `Agregá ${6 - images.length} foto${6 - images.length === 1 ? '' : 's'} más.`,
      itemCount:
        Number.isInteger(itemCount) && itemCount >= 1 && itemCount <= 99
          ? ''
          : 'Ingresá una cantidad entre 1 y 99.',
      legalDeclaration: legalDeclaration
        ? ''
        : 'Debés aceptar esta declaración para continuar.',
      name:
        form.name.trim().length >= 3
          ? ''
          : 'El nombre debe tener al menos 3 caracteres.',
      moneda: requiredError(form.moneda, 'la moneda'),
      objectDate: isSpecialProduct
        ? requiredError(form.objectDate, 'la fecha del objeto')
        : '',
      precioBase:
        Number.isFinite(precio) && precio > 0.01
          ? ''
          : 'Ingresá un precio base mayor a $0.01.',
      productType: requiredError(form.productType, 'el tipo de producto'),
      productCondition: requiredError(form.productCondition, 'si el producto es nuevo o usado'),
      returnAgreement: returnAgreement
        ? ''
        : 'Debés aceptar las condiciones de devolución.',
    };
  }, [form, images.length, isSpecialProduct, legalDeclaration, returnAgreement]);
  const isFormValid = Object.values(errors).every((error) => !error);

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function handleBlur(field) {
    setTouched((currentTouched) => ({
      ...currentTouched,
      [field]: true,
    }));
  }

  function visibleError(field) {
    return touched[field] || submitted ? errors[field] : '';
  }

  async function handleSubmit() {
    setSubmitted(true);
    setApiError('');

    if (!isFormValid) {
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();

      const descripcionCompletaParts = [form.completeDescription.trim()];

      if (form.relevantDetails.trim()) {
        descripcionCompletaParts.push(
          `Otros datos de interés:\n${form.relevantDetails.trim()}`
        );
      }

      formData.append('nombre', form.name.trim());
      formData.append('descripcionCatalogo', form.catalogDescription.trim());
      formData.append('descripcionCompleta', descripcionCompletaParts.join('\n\n'));
      formData.append('declaracionPropiedad', String(legalDeclaration));
      formData.append('precioBase', String(parseFloat(form.precioBase)));
      formData.append('moneda', form.moneda);
      formData.append('estadoProducto', form.productCondition);

      const imageValues = await Promise.all(
        images.slice(0, 8).map(async (image) => {
          if (Platform.OS === 'web') {
            const res = await fetch(image.uri);
            const blob = await res.blob();
            return new File([blob], image.name, { type: blob.type || 'image/jpeg' });
          }
          return { uri: image.uri, name: image.name, type: 'image/jpeg' };
        })
      );
      imageValues.forEach((value, index) => {
        formData.append(`foto${index + 1}`, value);
      });

      if (isSpecialProduct) {
        formData.append('detallesArtisticos', JSON.stringify({
          artista: form.creator,
          fechaObra: form.objectDate || null,
          historia: form.history || null,
        }));
      }

      await apiFetch('/v1/productos', { method: 'POST', body: formData });
      onSubmitSuccess?.();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'No pudimos registrar el producto.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Nuevo producto</Text>
      <Text style={styles.intro}>
        Cargá la información para que la empresa evalúe el bien y pueda
        asignarlo a una futura subasta.
      </Text>

      <LineTextField
        error={visibleError('name')}
        label="Nombre*"
        maxLength={80}
        onBlur={() => handleBlur('name')}
        onChangeText={(value) => updateField('name', value)}
        placeholder="Ej. Vestido Cottage Grape Lolita"
        value={form.name}
      />

      <LineTextField
        error={visibleError('catalogDescription')}
        label="Descripción breve*"
        maxLength={CATALOG_DESCRIPTION_MAX_LENGTH}
        multiline
        onBlur={() => handleBlur('catalogDescription')}
        onChangeText={(value) => updateField('catalogDescription', value)}
        placeholder="Ej. Vestido lolita color uva con encaje, moños y detalles delicados."
        value={form.catalogDescription}
      />

      <LineTextField
        error={visibleError('completeDescription')}
        label="Descripción completa*"
        multiline
        onBlur={() => handleBlur('completeDescription')}
        onChangeText={(value) => updateField('completeDescription', value)}
        placeholder="Incluí talle, medidas, marca, material, color, estado de uso, fallas o detalles visibles."
        value={form.completeDescription}
      />

      <LineSelectField
        error={visibleError('productType')}
        label="Tipo de producto*"
        onChange={(value) => {
          updateField('productType', value);
          handleBlur('productType');
        }}
        options={PRODUCT_TYPES}
        value={form.productType}
      />

      <LineSelectField
        error={visibleError('productCondition')}
        label="Estado del producto*"
        onChange={(value) => {
          updateField('productCondition', value);
          handleBlur('productCondition');
        }}
        options={PRODUCT_CONDITION_OPTIONS}
        value={form.productCondition}
      />

      <LineTextField
        error={visibleError('itemCount')}
        keyboardType="number-pad"
        label="Cantidad de elementos o piezas*"
        maxLength={2}
        onBlur={() => handleBlur('itemCount')}
        onChangeText={(value) =>
          updateField('itemCount', value.replace(/\D/g, ''))
        }
        placeholder="Ej. 18"
        value={form.itemCount}
      />

      <LineTextField
        error={visibleError('precioBase')}
        keyboardType="decimal-pad"
        label="Precio base*"
        maxLength={12}
        onBlur={() => handleBlur('precioBase')}
        onChangeText={(value) => updateField('precioBase', value.replace(/[^0-9.]/g, ''))}
        placeholder="Ej. 15000"
        value={form.precioBase}
      />

      <LineSelectField
        error={visibleError('moneda')}
        label="Moneda*"
        onChange={(value) => {
          updateField('moneda', value);
          handleBlur('moneda');
        }}
        options={CURRENCY_OPTIONS}
        value={form.moneda}
      />

      {isSpecialProduct ? (
        <View style={styles.specialSection}>
          <Text style={styles.sectionTitle}>Información de autoría</Text>
          <Text style={styles.sectionDescription}>
            Estos datos son obligatorios para obras de arte y objetos de
            diseñador.
          </Text>
          <LineTextField
            error={visibleError('creator')}
            label="Artista o diseñador*"
            maxLength={100}
            onBlur={() => handleBlur('creator')}
            onChangeText={(value) => updateField('creator', value)}
            placeholder="Nombre del autor o diseñador"
            value={form.creator}
          />
          <LineTextField
            error={visibleError('objectDate')}
            label="Fecha o período del objeto*"
            maxLength={40}
            onBlur={() => handleBlur('objectDate')}
            onChangeText={(value) => updateField('objectDate', value)}
            placeholder="Ej. 1923 o década de 1980"
            value={form.objectDate}
          />
          <LineTextField
            error={visibleError('history')}
            label="Historia y procedencia*"
            maxLength={1000}
            multiline
            onBlur={() => handleBlur('history')}
            onChangeText={(value) => updateField('history', value)}
            placeholder="Contexto, dueños anteriores, curiosidades y procedencia."
            value={form.history}
          />
        </View>
      ) : null}

      <LineTextField
        label="Otros datos de interés"
        maxLength={800}
        multiline
        onChangeText={(value) => updateField('relevantDetails', value)}
        placeholder="Historia, conservación, certificados o cualquier dato relevante."
        value={form.relevantDetails}
      />

      <ProductImagePicker
        error={visibleError('images')}
        images={images}
        onChange={(nextImages) => {
          setImages(nextImages);
          handleBlur('images');
        }}
      />

      <View style={styles.declarations}>
        <DeclarationCheckbox
          checked={legalDeclaration}
          error={visibleError('legalDeclaration')}
          label="Declaro que el bien es de mi propiedad, tiene origen lícito y no posee impedimentos para su venta."
          onChange={(value) => {
            setLegalDeclaration(Boolean(value));
            handleBlur('legalDeclaration');
          }}
        />
        <DeclarationCheckbox
          checked={returnAgreement}
          error={visibleError('returnAgreement')}
          label="Acepto que, si el bien no es aprobado luego de la inspección, será devuelto con gastos a mi cargo."
          onChange={(value) => {
            setReturnAgreement(Boolean(value));
            handleBlur('returnAgreement');
          }}
        />
      </View>

      {apiError ? (
        <Text style={styles.apiError}>{apiError}</Text>
      ) : null}

      <View style={styles.submit}>
        <PrimaryButton
          disabled={!isFormValid || loading}
          onPress={handleSubmit}
          style={styles.submitButton}
        >
          {loading ? 'Enviando...' : 'Solicitar aprobación'}
        </PrimaryButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignSelf: 'center',
    maxWidth: 520,
    paddingBottom: 44,
    paddingHorizontal: 34,
    paddingTop: 28,
    width: '100%',
    zIndex: 2,
  },
  title: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 30,
    lineHeight: 38,
  },
  intro: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 28,
    marginTop: 5,
  },
  specialSection: {
    backgroundColor: 'rgba(242, 211, 200, 0.3)',
    borderColor: 'rgba(159, 2, 29, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 28,
    paddingHorizontal: 16,
    paddingTop: 17,
  },
  sectionTitle: {
    color: colors.textBurgundy,
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 25,
  },
  sectionDescription: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
    marginTop: 3,
  },
  declarations: {
    marginTop: 3,
  },
  submit: {
    alignItems: 'center',
    marginTop: 13,
  },
  submitButton: {
    width: 220,
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
