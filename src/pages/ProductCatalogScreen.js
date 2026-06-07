import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import ProductStatusCard from '../components/products/ProductStatusCard';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { apiFetch, getApiErrorMessage } from '../utils/http';
import { resolveApiAssetUrl } from '../utils/config';

const STATUS_MAP = {
  pendiente: { status: 'pending', statusLabel: 'pendiente' },
  asignado: { status: 'assigned', statusLabel: 'asignado' },
  pendiente_confirmacion: { status: 'confirming', statusLabel: 'a confirmar' },
  en_subasta: { status: 'auction', statusLabel: 'en subasta' },
  rechazado: { status: 'rejected', statusLabel: 'rechazado' },
  vendido: { status: 'sold', statusLabel: 'vendido' },
};

function mapProduct(producto) {
  const mapped = STATUS_MAP[producto.estadoProducto] ?? {
    status: 'pending',
    statusLabel: producto.estadoProducto,
  };
  const primeraFoto = producto.fotos?.[0]?.foto;
  return {
    description: producto.descripcionCompleta,
    imageSource: primeraFoto ? { uri: resolveApiAssetUrl(primeraFoto) } : null,
    key: String(producto.identificador),
    status: mapped.status,
    statusLabel: mapped.statusLabel,
    title: producto.descripcionCompleta.split('\n')[0].slice(0, 60),
  };
}

export default function ProductCatalogScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/v1/productos?cantidad=50');
      setProducts((data.datos ?? []).map(mapProduct));
    } catch (err) {
      setError(getApiErrorMessage(err, 'No pudimos cargar tus productos.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Estado de los productos</Text>
      <Text style={styles.subtitle}>
        Seguí el proceso de evaluación y asignación de los bienes que publicaste.
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.burgundy} size="large" style={styles.spinner} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : products.length === 0 ? (
        <Text style={styles.empty}>Todavía no publicaste ningún producto.</Text>
      ) : (
        <View style={styles.list}>
          {products.map((product) => (
            <ProductStatusCard key={product.key} {...product} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    paddingBottom: 38,
    paddingHorizontal: 24,
    paddingTop: 25,
    zIndex: 2,
  },
  title: {
    color: colors.cocoa,
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 33,
    maxWidth: 370,
    width: '100%',
  },
  subtitle: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
    marginTop: 4,
    maxWidth: 370,
    width: '100%',
  },
  list: {
    alignItems: 'center',
    rowGap: 16,
    width: '100%',
  },
  spinner: {
    marginTop: 40,
  },
  error: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 24,
    textAlign: 'center',
  },
  empty: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 40,
    textAlign: 'center',
  },
});
