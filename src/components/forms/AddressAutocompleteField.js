import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

const GEOAPIFY_AUTOCOMPLETE_URL =
  'https://api.geoapify.com/v1/geocode/autocomplete';
const SEARCH_DELAY = 280;
const SEARCH_MIN_LENGTH = 3;
const geoapifyApiKey = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY || '';

function SearchIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={10.7}
        cy={10.7}
        r={6.2}
        stroke={colors.textBurgundy}
        strokeWidth={2}
      />
      <Path
        d="M15.5 15.5L20 20"
        stroke={colors.textBurgundy}
        strokeLinecap="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

function PinIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21C14.8 17.65 18 13.55 18 9.9C18 6.55 15.3 4 12 4C8.7 4 6 6.55 6 9.9C6 13.55 9.2 17.65 12 21Z"
        fill={colors.mutedRose}
      />
      <Circle cx={12} cy={10} r={2.2} fill={colors.cream} />
    </Svg>
  );
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

function getLocality(place) {
  return (
    place.city ||
    place.town ||
    place.village ||
    place.municipality ||
    ''
  );
}

function isArgentinaPlace(place) {
  return (
    String(place.country_code || '').toLowerCase() === 'ar' ||
    String(place.country || '').toLowerCase() === 'argentina'
  );
}

function normalizeArgentinePostalCode(postalCode = '') {
  const match = String(postalCode).match(/[A-Z]?(\d{4})/i);

  return match?.[1] || postalCode;
}

function getPostalCode(place) {
  const postalCode = place.postcode || '';

  if (isArgentinaPlace(place)) {
    return normalizeArgentinePostalCode(postalCode || place.formatted || '');
  }

  return postalCode;
}

function getProvince(place, locality) {
  if (place.state) {
    return place.state;
  }

  if (place.region) {
    return place.region;
  }

  if (
    isArgentinaPlace(place) &&
    (locality === 'Buenos Aires' ||
      String(place.county || '').toLowerCase().includes('comuna'))
  ) {
    return 'Ciudad Autónoma de Buenos Aires';
  }

  return '';
}

function getCountry(place) {
  if (place.country) {
    return place.country;
  }

  if (isArgentinaPlace(place)) {
    return 'Argentina';
  }

  return '';
}

function shouldSwapArgentineCityFields(place, locality, province) {
  const provinceName = String(province || '').toLowerCase();

  return (
    isArgentinaPlace(place) &&
    locality === 'Buenos Aires' &&
    provinceName.includes('ciudad') &&
    provinceName.includes('buenos aires')
  );
}

function getStreetAndNumber(place) {
  const rawAddress = [place.address_line1, place.formatted]
    .filter(Boolean)
    .join(', ');
  const rawMatch = rawAddress.match(/^(.+?)\s+(\d+[A-Za-z]?)\b/);
  const street = place.street || rawMatch?.[1] || '';
  const number =
    place.housenumber ||
    rawMatch?.[2] ||
    rawAddress.match(/\b(\d+[A-Za-z]?)\b/)?.[1] ||
    '';

  return { number, street };
}

function buildCleanAddressLine(address) {
  const streetLine = [address.street, address.number].filter(Boolean).join(' ');
  const locationLine = [
    address.locality,
    address.province,
    address.postalCode,
    address.country,
  ].filter(Boolean);

  return [streetLine, ...locationLine].filter(Boolean).join(', ');
}

function getSuggestionLabel(place) {
  const address = parseAddress(place);

  return address.addressLine || place.address_line1 || place.formatted;
}

function dedupeResults(results) {
  const seenLabels = new Set();

  return results.filter((place) => {
    const label = getSuggestionLabel(place);
    const key = label.toLowerCase();

    if (seenLabels.has(key)) {
      return false;
    }

    seenLabels.add(key);
    return true;
  });
}

function parseAddress(place) {
  const rawLocality = getLocality(place);
  const rawProvince = getProvince(place, rawLocality);
  const country = getCountry(place);
  const postalCode = getPostalCode(place);
  const { number, street } = getStreetAndNumber(place);
  const addressLine = buildCleanAddressLine({
    country,
    locality: rawLocality,
    number,
    postalCode,
    province: rawProvince,
    street,
  });
  const shouldSwapCityFields = shouldSwapArgentineCityFields(
    place,
    rawLocality,
    rawProvince
  );
  const address = {
    country,
    latitude: Number(place.lat),
    locality: shouldSwapCityFields ? rawProvince : rawLocality,
    longitude: Number(place.lon),
    number,
    postalCode,
    province: shouldSwapCityFields ? rawLocality : rawProvince,
    street,
  };

  return {
    ...address,
    addressLine,
    displayAddressLine: buildCleanAddressLine(address),
  };
}

export default function AddressAutocompleteField({ displayValue = '', onSelect }) {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSelectedPlace, setHasSelectedPlace] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState('');
  const lastDisplayValueRef = useRef('');
  const [error, setError] = useState(
    geoapifyApiKey ? '' : 'Falta configurar EXPO_PUBLIC_GEOAPIFY_API_KEY.'
  );

  const shouldSearch = query.trim().length >= SEARCH_MIN_LENGTH;

  useEffect(() => {
    const nextDisplayValue = displayValue || '';

    if (nextDisplayValue === lastDisplayValueRef.current) {
      return;
    }

    lastDisplayValueRef.current = nextDisplayValue;
    setQuery(nextDisplayValue);
    setSelectedQuery(nextDisplayValue);
    setPlaces([]);
    setError('');
    setHasSelectedPlace(Boolean(nextDisplayValue));
  }, [displayValue]);

  useEffect(() => {
    let isActive = true;
    const normalizedQuery = query.trim();

    if (!geoapifyApiKey) {
      setPlaces([]);
      setIsLoading(false);
      setError('Falta configurar EXPO_PUBLIC_GEOAPIFY_API_KEY.');
      return undefined;
    }

    if (
      hasSelectedPlace ||
      normalizedQuery === selectedQuery ||
      normalizedQuery.length < SEARCH_MIN_LENGTH
    ) {
      setPlaces([]);
      setError('');
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    setError('');

    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          apiKey: geoapifyApiKey,
          format: 'json',
          lang: 'es',
          limit: '6',
          text: normalizedQuery,
        });
        const response = await fetch(
          `${GEOAPIFY_AUTOCOMPLETE_URL}?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error('Address search failed');
        }

        const data = await response.json();

        if (isActive) {
          setPlaces(dedupeResults(normalizeResults(data)));
        }
      } catch (fetchError) {
        if (isActive) {
          setPlaces([]);
          setError('No pudimos buscar direcciones ahora.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }, SEARCH_DELAY);

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, [hasSelectedPlace, query, selectedQuery]);

  const showEmptyState = useMemo(
    () =>
      shouldSearch &&
      !hasSelectedPlace &&
      query.trim() !== selectedQuery &&
      !isLoading &&
      !error &&
      places.length === 0,
    [error, hasSelectedPlace, isLoading, places.length, query, selectedQuery, shouldSearch]
  );

  function handleSelect(place) {
    const address = parseAddress(place);

    lastDisplayValueRef.current = address.addressLine;
    setQuery(address.addressLine);
    setSelectedQuery(address.addressLine);
    setPlaces([]);
    setError('');
    setHasSelectedPlace(true);
    onSelect?.(address);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Buscar domicilio</Text>
      <View style={styles.inputRow}>
        <TextInput
          autoCapitalize="words"
          autoCorrect={false}
          editable={Boolean(geoapifyApiKey)}
          onChangeText={(value) => {
            setQuery(value);
            setSelectedQuery('');
            setHasSelectedPlace(false);
          }}
          placeholder="Ej: Conesa 406, Quilmes"
          placeholderTextColor={colors.mutedRose}
          style={[styles.input, !geoapifyApiKey ? styles.inputDisabled : null]}
          value={query}
        />
        <View style={styles.searchIcon}>
          {isLoading ? (
            <ActivityIndicator color={colors.textBurgundy} size="small" />
          ) : (
            <SearchIcon />
          )}
        </View>
      </View>

      {places.length ? (
        <View style={styles.suggestions}>
          {places.map((place, index) => (
            <Pressable
              key={String(place.place_id || place.formatted || index)}
              onPress={() => handleSelect(place)}
              style={styles.suggestion}
            >
              <PinIcon />
              <Text numberOfLines={2} style={styles.suggestionText}>
                {getSuggestionLabel(place)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {showEmptyState ? (
        <Text style={styles.helpText}>No encontramos direcciones con ese texto.</Text>
      ) : null}
      {error ? <Text style={styles.helpText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 29,
    width: '100%',
    zIndex: 3,
  },
  label: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 17,
    marginBottom: 7,
  },
  inputRow: {
    alignItems: 'center',
    borderBottomColor: colors.burgundy,
    borderBottomWidth: 7,
    flexDirection: 'row',
    minHeight: 36,
    width: '100%',
  },
  input: {
    color: colors.textBurgundy,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 18,
    minHeight: 30,
    padding: 0,
    paddingRight: 38,
  },
  inputDisabled: {
    opacity: 0.58,
  },
  searchIcon: {
    alignItems: 'center',
    bottom: 0,
    height: 30,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    width: 32,
  },
  suggestions: {
    backgroundColor: colors.cream,
    borderColor: colors.blush,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    maxHeight: 190,
    overflow: 'hidden',
  },
  suggestion: {
    alignItems: 'flex-start',
    borderBottomColor: 'rgba(159, 2, 29, 0.12)',
    borderBottomWidth: 1,
    columnGap: 8,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestionText: {
    color: colors.textBurgundy,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 19,
  },
  helpText: {
    color: colors.burgundy,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
});
