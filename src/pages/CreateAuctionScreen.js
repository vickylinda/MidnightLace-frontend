import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import LineSelectField from '../components/forms/LineSelectField';
import LineTextField from '../components/forms/LineTextField';
import PrimaryButton from '../components/forms/PrimaryButton';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { apiFetch, getApiErrorMessage } from '../utils/http';

const CATEGORIAS = [
  { label: 'Común', value: 'comun' },
  { label: 'Especial', value: 'especial' },
  { label: 'Plata', value: 'plata' },
  { label: 'Oro', value: 'oro' },
  { label: 'Platino', value: 'platino' },
];

const MONEDAS = [
  { label: 'Pesos (ARS)', value: 'ARS' },
  { label: 'Dólares (USD)', value: 'USD' },
];

const SINO = [
  { label: 'Sí', value: 'si' },
  { label: 'No', value: 'no' },
];

const INITIAL_FORM = {
  nombre: '',
  fecha: '',
  hora: '',
  categoria: '',
  moneda: '',
  duracionItemMinutos: '',
  ubicacion: '',
  capacidadAsistentes: '',
  tieneDeposito: '',
  seguridadPropia: '',
};

function getMinFecha() {
  const d = new Date();
  d.setDate(d.getDate() + 10);
  return d.toISOString().split('T')[0];
}

function parseFecha(str) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str.trim());
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str.trim())) return str.trim();
  return null;
}

function parseHora(str) {
  const s = str.trim();
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
  return null;
}

function requiredError(value, label) {
  return String(value || '').trim() ? '' : `Completá ${label}.`;
}

export default function CreateAuctionScreen({ onSubmitSuccess }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const errors = useMemo(() => {
    const minFecha = getMinFecha();
    const fechaISO = parseFecha(form.fecha);
    const horaStr = parseHora(form.hora);
    const duracion = parseInt(form.duracionItemMinutos, 10);

    return {
      nombre: requiredError(form.nombre, 'el nombre'),
      fecha: (() => {
        if (!form.fecha.trim()) return 'Completá la fecha.';
        if (!fechaISO) return 'Formato válido: DD/MM/AAAA o AAAA-MM-DD.';
        if (fechaISO < minFecha) return 'La fecha debe ser al menos 10 días a partir de hoy.';
        return '';
      })(),
      hora: (() => {
        if (!form.hora.trim()) return 'Completá la hora.';
        if (!horaStr) return 'Formato válido: HH:MM.';
        return '';
      })(),
      categoria: requiredError(form.categoria, 'la categoría'),
      moneda: requiredError(form.moneda, 'la moneda'),
      duracionItemMinutos: (() => {
        if (!form.duracionItemMinutos.trim()) return 'Completá la duración por ítem.';
        if (isNaN(duracion) || duracion < 1) return 'Debe ser un número entero mayor a 0.';
        return '';
      })(),
    };
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleBlur(field) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function showError(field) {
    return (submitted || touched[field]) && errors[field] ? errors[field] : '';
  }

  async function handleSubmit() {
    setSubmitted(true);
    if (hasErrors) return;

    setLoading(true);
    setApiError('');

    try {
      const body = {
        nombre: form.nombre.trim(),
        fecha: parseFecha(form.fecha),
        hora: parseHora(form.hora),
        categoria: form.categoria,
        moneda: form.moneda,
        duracionItemMinutos: parseInt(form.duracionItemMinutos, 10),
      };

      if (form.ubicacion.trim()) body.ubicacion = form.ubicacion.trim();
      if (form.capacidadAsistentes.trim()) {
        const n = parseInt(form.capacidadAsistentes, 10);
        if (!isNaN(n)) body.capacidadAsistentes = n;
      }
      if (form.tieneDeposito) body.tieneDeposito = form.tieneDeposito;
      if (form.seguridadPropia) body.seguridadPropia = form.seguridadPropia;

      await apiFetch('/v1/subastador/subastas', { method: 'POST', body });
      onSubmitSuccess?.();
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'No se pudo crear la subasta.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Crear subasta</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Datos obligatorios</Text>

        <LineTextField
          error={showError('nombre')}
          label="Nombre"
          onBlur={() => handleBlur('nombre')}
          onChangeText={(v) => handleChange('nombre', v)}
          placeholder="Ej: Colección Otoño 2026"
          value={form.nombre}
        />

        <LineTextField
          error={showError('fecha')}
          label="Fecha"
          onBlur={() => handleBlur('fecha')}
          onChangeText={(v) => handleChange('fecha', v)}
          placeholder="DD/MM/AAAA"
          value={form.fecha}
        />

        <LineTextField
          error={showError('hora')}
          label="Hora de inicio"
          onBlur={() => handleBlur('hora')}
          onChangeText={(v) => handleChange('hora', v)}
          placeholder="HH:MM"
          value={form.hora}
        />

        <LineSelectField
          error={showError('categoria')}
          label="Categoría"
          onBlur={() => handleBlur('categoria')}
          onChange={(v) => handleChange('categoria', v)}
          options={CATEGORIAS}
          placeholder="Seleccioná una categoría"
          value={form.categoria}
        />

        <LineSelectField
          error={showError('moneda')}
          label="Moneda"
          onBlur={() => handleBlur('moneda')}
          onChange={(v) => handleChange('moneda', v)}
          options={MONEDAS}
          placeholder="Seleccioná la moneda"
          value={form.moneda}
        />

        <LineTextField
          error={showError('duracionItemMinutos')}
          keyboardType="numeric"
          label="Duración por ítem (minutos)"
          onBlur={() => handleBlur('duracionItemMinutos')}
          onChangeText={(v) => handleChange('duracionItemMinutos', v)}
          placeholder="Ej: 3"
          value={form.duracionItemMinutos}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Datos opcionales</Text>

        <LineTextField
          label="Ubicación"
          onChangeText={(v) => handleChange('ubicacion', v)}
          placeholder="Ej: La Rural, Palermo, CABA"
          value={form.ubicacion}
        />

        <LineTextField
          keyboardType="numeric"
          label="Capacidad de asistentes"
          onChangeText={(v) => handleChange('capacidadAsistentes', v)}
          placeholder="Ej: 200"
          value={form.capacidadAsistentes}
        />

        <LineSelectField
          label="¿Tiene depósito?"
          onChange={(v) => handleChange('tieneDeposito', v)}
          options={SINO}
          placeholder="Seleccioná"
          value={form.tieneDeposito}
        />

        <LineSelectField
          label="¿Seguridad propia?"
          onChange={(v) => handleChange('seguridadPropia', v)}
          options={SINO}
          placeholder="Seleccioná"
          value={form.seguridadPropia}
        />
      </View>

      {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

      <PrimaryButton
        disabled={loading}
        label={loading ? 'Creando...' : 'Crear subasta'}
        onPress={handleSubmit}
        style={styles.submitButton}
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
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
    rowGap: 12,
  },
  sectionLabel: {
    color: colors.burgundy,
    fontFamily: fonts.semiBold,
    fontSize: 13,
    lineHeight: 17,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  apiError: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 12,
    textAlign: 'center',
  },
  submitButton: {
    marginBottom: 32,
    marginTop: 4,
  },
});
