import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';

const GEOAPIFY_GEOCODE_URL = 'https://api.geoapify.com/v1/geocode/search';
const GEOAPIFY_STATIC_MAP_URL = 'https://maps.geoapify.com/v1/staticmap';
const geoapifyApiKey = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY || '';
const GEOCODE_DELAY = 450;
const MIN_SPINNER_MS = 400;

function hasValidCoordinates(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

function normalizeAddressPart(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function hasAddressPart(value) {
  return Boolean(normalizeAddressPart(value));
}

function hasCompleteManualAddress(address) {
  return (
    hasAddressPart(address?.country) &&
    hasAddressPart(address?.province) &&
    hasAddressPart(address?.locality) &&
    hasAddressPart(address?.postalCode) &&
    hasAddressPart(address?.street) &&
    hasAddressPart(address?.number)
  );
}

function buildManualAddressText(address) {
  const streetLine = [address?.street, address?.number]
    .map(normalizeAddressPart)
    .filter(Boolean)
    .join(' ');
  const locationLine = [
    address?.locality,
    address?.province,
    address?.postalCode,
    address?.country,
  ]
    .map(normalizeAddressPart)
    .filter(Boolean);

  return [streetLine, ...locationLine].filter(Boolean).join(', ');
}

function normalizeResults(data) {
  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.features)) {
    return data.features.map((feature) => feature.properties);
  }

  return [];
}

function buildMapUrl({ latitude, longitude }) {
  const marker = `lonlat:${longitude},${latitude}`;
  const params = new URLSearchParams({
    apiKey: geoapifyApiKey,
    center: `lonlat:${longitude},${latitude}`,
    format: 'png',
    height: '300',
    marker,
    scaleFactor: '2',
    style: 'osm-bright-smooth',
    width: '760',
    zoom: '16',
  });

  return `${GEOAPIFY_STATIC_MAP_URL}?${params.toString()}`;
}

export default function AddressMapPreview({ address }) {
  const [hasMapError, setHasMapError] = useState(false);
  const [imageLoadId, setImageLoadId] = useState(0);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [lookupError, setLookupError] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState(null);
  const geocodeRequestRef = useRef(0);
  const loadIdRef = useRef(0);
  const mapLoadStartRef = useRef(0);
  const mapLoadTimerRef = useRef(null);
  const latitude = address?.latitude;
  const longitude = address?.longitude;
  const numericLatitude = Number(latitude);
  const numericLongitude = Number(longitude);
  const hasSelectedCoordinates =
    latitude !== null &&
    latitude !== undefined &&
    latitude !== '' &&
    longitude !== null &&
    longitude !== undefined &&
    longitude !== '' &&
    hasValidCoordinates(numericLatitude, numericLongitude);
  const manualAddressText = useMemo(
    () => buildManualAddressText(address || {}),
    [
      address?.country,
      address?.locality,
      address?.number,
      address?.postalCode,
      address?.province,
      address?.street,
    ]
  );
  const canResolveManualAddress =
    Boolean(geoapifyApiKey) &&
    !hasSelectedCoordinates &&
    hasCompleteManualAddress(address || {});
  const mapCoordinates = hasSelectedCoordinates
    ? {
        latitude: numericLatitude,
        longitude: numericLongitude,
      }
    : resolvedAddress;
  const canShowMap =
    Boolean(geoapifyApiKey) &&
    mapCoordinates &&
    hasValidCoordinates(mapCoordinates.latitude, mapCoordinates.longitude);
  const mapUrl = useMemo(() => {
    if (!canShowMap) {
      return '';
    }

    return buildMapUrl(mapCoordinates);
  }, [canShowMap, mapCoordinates]);

  useEffect(() => {
    if (hasSelectedCoordinates) {
      setIsGeocoding(false);
      setLookupError(false);
      setResolvedAddress(null);
      return undefined;
    }

    if (!canResolveManualAddress) {
      setIsGeocoding(false);
      setLookupError(false);
      setResolvedAddress(null);
      return undefined;
    }

    const requestId = geocodeRequestRef.current + 1;
    geocodeRequestRef.current = requestId;
    setIsGeocoding(true);
    setLookupError(false);
    setResolvedAddress(null);

    const geocodeTimer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          apiKey: geoapifyApiKey,
          format: 'json',
          lang: 'es',
          limit: '1',
          text: manualAddressText,
        });
        const response = await fetch(
          `${GEOAPIFY_GEOCODE_URL}?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error('Address geocoding failed');
        }

        const result = normalizeResults(await response.json())[0];
        const resolvedLatitude = Number(result?.lat);
        const resolvedLongitude = Number(result?.lon);

        if (requestId !== geocodeRequestRef.current) {
          return;
        }

        if (!hasValidCoordinates(resolvedLatitude, resolvedLongitude)) {
          setLookupError(true);
          setResolvedAddress(null);
          return;
        }

        setResolvedAddress({
          addressText: manualAddressText,
          latitude: resolvedLatitude,
          longitude: resolvedLongitude,
        });
        setLookupError(false);
      } catch (error) {
        if (requestId === geocodeRequestRef.current) {
          setLookupError(true);
          setResolvedAddress(null);
        }
      } finally {
        if (requestId === geocodeRequestRef.current) {
          setIsGeocoding(false);
        }
      }
    }, GEOCODE_DELAY);

    return () => {
      clearTimeout(geocodeTimer);
    };
  }, [
    canResolveManualAddress,
    hasSelectedCoordinates,
    manualAddressText,
  ]);

  useEffect(() => {
    setHasMapError(false);

    if (mapLoadTimerRef.current) {
      clearTimeout(mapLoadTimerRef.current);
      mapLoadTimerRef.current = null;
    }

    if (mapUrl) {
      loadIdRef.current += 1;
      setImageLoadId(loadIdRef.current);
      setMapLoading(true);
      mapLoadStartRef.current = Date.now();
    } else {
      setMapLoading(false);
      setImageLoadId(0);
      mapLoadStartRef.current = 0;
    }
  }, [mapUrl]);

  useEffect(
    () => () => {
      if (mapLoadTimerRef.current) {
        clearTimeout(mapLoadTimerRef.current);
      }
    },
    []
  );

  function finishLoading() {
    if (!imageLoadId || imageLoadId !== loadIdRef.current) {
      return;
    }

    const elapsed = Date.now() - (mapLoadStartRef.current || 0);

    if (elapsed >= MIN_SPINNER_MS) {
      setMapLoading(false);
      return;
    }

    if (mapLoadTimerRef.current) {
      clearTimeout(mapLoadTimerRef.current);
    }

    mapLoadTimerRef.current = setTimeout(() => {
      if (imageLoadId && imageLoadId === loadIdRef.current) {
        setMapLoading(false);
      }
      mapLoadTimerRef.current = null;
    }, MIN_SPINNER_MS - elapsed);
  }

  function handleMapError() {
    if (!imageLoadId || imageLoadId !== loadIdRef.current) {
      return;
    }

    if (mapLoadTimerRef.current) {
      clearTimeout(mapLoadTimerRef.current);
      mapLoadTimerRef.current = null;
    }

    setMapLoading(false);
    setHasMapError(true);
  }

  function renderLoadingState(message) {
    return (
      <View style={styles.loadingPanel}>
        <ActivityIndicator color={colors.textBurgundy} size="large" />
        <Text style={styles.loadingText}>{message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {canShowMap && !hasMapError ? (
        <View style={styles.mapFrame}>
          <Image
            onError={handleMapError}
            onLoadEnd={finishLoading}
            resizeMode="cover"
            source={{ uri: mapUrl }}
            style={styles.map}
          />
          {mapLoading ? renderLoadingState('Cargando mapa...') : null}
        </View>
      ) : (
        <View style={styles.mapFrame}>
          {isGeocoding ? (
            renderLoadingState('Buscando ubicacion...')
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.placeholderText}>
                {lookupError || hasMapError
                  ? 'No pudimos ubicar esa dirección. Revisá los datos ingresados.'
                  : 'Completá los campos de domicilio o usá el buscador para ver el mapa.'}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  mapFrame: {
    backgroundColor: colors.cardBlush,
    borderColor: colors.burgundy,
    borderRadius: 8,
    borderWidth: 2,
    height: 178,
    overflow: 'hidden',
    width: '100%',
  },
  map: {
    height: '100%',
    width: '100%',
  },
  loadingPanel: {
    alignItems: 'center',
    backgroundColor: colors.cardBlush,
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  loadingText: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 18,
    width: '100%',
  },
  placeholderText: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
  },
});
