import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import AuctionCard from '../../components/auctions/AuctionCard';
import { apiFetch, getApiErrorMessage } from '../../utils/http';
import { resolveApiAssetUrl } from '../../utils/config';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function mapEstado(estado) {
  if (estado === 'programada') return 'inscripción abierta';
  if (estado === 'abierta') return 'en curso';
  return 'finalizada';
}

function mapSubastaToCard(s) {
  const hora = s.hora ? ` · ${String(s.hora).slice(0, 5)}h` : '';
  const fecha = s.fecha ? s.fecha.split('-').reverse().join('/') : '-';
  return {
    category: capitalize(s.categoria),
    dateTime: `${fecha}${hora}`,
    imageSource: s.fotoPrincipal ? { uri: resolveApiAssetUrl(s.fotoPrincipal) } : null,
    location: s.ubicacion || 'Ubicación por confirmar',
    pieces: null,
    status: mapEstado(s.estado),
    title: s.nombre,
    id: s.identificador,
    rawData: s,
  };
}

export default function AllAuctionsScreen({ isSubastador, onAuctionPress }) {
  const [subastas, setSubastas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchSubastas() {
    setLoading(true);
    setError(null);
    try {
      const endpoint = isSubastador
        ? '/v1/subastador/subastas?pagina=1&cantidad=50'
        : '/v1/subastas?pagina=1&cantidad=50';
      const res = await apiFetch(endpoint);
      const datos = res.datos || res || [];
      setSubastas(datos.map(mapSubastaToCard));
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudieron cargar las subastas.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSubastas();
  }, [isSubastador]);

  const title = isSubastador ? 'Mis subastas' : 'Todas las subastas';

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{title}</Text>

      {loading ? (
        <ActivityIndicator color={colors.burgundy} size="large" style={styles.loader} />
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.stateText}>{error}</Text>
          <Pressable onPress={fetchSubastas} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : subastas.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={styles.stateText}>
            {isSubastador
              ? 'Todavía no creaste ninguna subasta.'
              : 'No hay subastas disponibles.'}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {subastas.map((auction) => (
            <AuctionCard
              category={auction.category}
              dateTime={auction.dateTime}
              imageSource={auction.imageSource}
              key={auction.id}
              location={auction.location}
              onPress={() => onAuctionPress?.(auction.rawData)}
              pieces={auction.pieces}
              status={auction.status}
              style={styles.card}
              title={auction.title}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 20,
    zIndex: 2,
  },
  title: {
    color: colors.cocoa,
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 32,
    marginBottom: 16,
    maxWidth: 327,
    width: '100%',
  },
  list: {
    alignItems: 'center',
    rowGap: 20,
    width: '100%',
  },
  card: {
    maxWidth: 327,
  },
  loader: {
    marginTop: 48,
  },
  centerState: {
    alignItems: 'center',
    marginTop: 48,
    rowGap: 16,
  },
  stateText: {
    color: colors.cocoa,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  retryButton: {
    alignItems: 'center',
    borderColor: colors.burgundy,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 20,
  },
  retryButtonText: {
    color: colors.textBurgundy,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 18,
  },
});
