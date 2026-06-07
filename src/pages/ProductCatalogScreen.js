import { StyleSheet, Text, View } from 'react-native';

import ProductStatusCard from '../components/products/ProductStatusCard';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

const PRODUCTS = [
  {
    description: 'En proceso de verificación por la empresa.',
    imageSource: require('../assets/products/cottage-grape.png'),
    owner: 'forestlace',
    status: 'pending',
    statusLabel: 'pendiente',
    title: 'Vestido Cottage Grape Lolita',
  },
  {
    description: 'Asignado a catálogo con precio definido. Esperando tu confirmación.',
    imageSource: require('../assets/products/soft-fur.jpg'),
    owner: 'laceatelier',
    status: 'confirming',
    statusLabel: 'a confirmar',
    title: 'Campera Soft Fur Pink',
  },
  {
    description: 'Aprobado y asignado a una futura subasta.',
    imageSource: require('../assets/products/layered-star.jpg'),
    owner: 'velvetnoir',
    status: 'assigned',
    statusLabel: 'asignado',
    title: 'Falda Layered Star Punk Skirt',
  },
  {
    description: 'Actualmente disponible para pujas.',
    imageSource: require('../assets/products/kawaii-sky.jpg'),
    owner: 'moonangel',
    status: 'auction',
    statusLabel: 'en subasta',
    title: 'Hoodie Kawaii Sky Blue Oversize',
  },
  {
    description: 'No cumple con los criterios de aceptación.',
    imageSource: require('../assets/products/grunge-stripe.jpg'),
    owner: 'noirgrunge',
    status: 'rejected',
    statusLabel: 'rechazado',
    title: 'Top Grunge Stripe Gothic Tee',
  },
  {
    description: 'Subastado y vendido exitosamente.',
    imageSource: require('../assets/products/sweet-bow.jpg'),
    owner: 'pastelatelier',
    status: 'sold',
    statusLabel: 'vendido',
    title: 'Zapatos Sweet Bow Mary Jane',
  },
];

export default function ProductCatalogScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Estado de los productos</Text>
      <Text style={styles.subtitle}>
        Seguí el proceso de evaluación y asignación de los bienes que publicaste.
      </Text>

      <View style={styles.list}>
        {PRODUCTS.map((product) => (
          <ProductStatusCard key={product.title} {...product} />
        ))}
      </View>
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
});
