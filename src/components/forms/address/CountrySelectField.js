import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/fonts';

function ErrorIcon() {
  return (
    <Svg height={16} viewBox="0 0 16 16" width={16}>
      <Circle cx={8} cy={8} fill="none" r={7} stroke={colors.burgundy} strokeWidth={1.5} />
      <Rect fill={colors.burgundy} height={6} rx={0.75} width={1.5} x={7.25} y={3.75} />
      <Circle cx={8} cy={12.1} fill={colors.burgundy} r={0.9} />
    </Svg>
  );
}

function ChevronIcon() {
  return (
    <Svg height={18} viewBox="0 0 24 24" width={18}>
      <Path
        d="M6 9L12 15L18 9"
        fill="none"
        stroke={colors.burgundy}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.3}
      />
    </Svg>
  );
}

export default function CountrySelectField({
  countries = [],
  error,
  label,
  onChange,
  value,
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);

  const selected = countries.find((c) => String(c.numero) === String(value));
  const filtered = search.trim()
    ? countries.filter((c) =>
        c.nombre.toLowerCase().includes(search.trim().toLowerCase())
      )
    : countries;

  function handleOpen() {
    setSearch('');
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSelect(country) {
    onChange?.(country.numero);
    setSearch('');
    setIsOpen(false);
  }

  function handleClose() {
    setSearch('');
    setIsOpen(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {isOpen ? (
        <View style={styles.openBox}>
          <TextInput
            ref={inputRef}
            onChangeText={setSearch}
            placeholder="Buscar país..."
            placeholderTextColor="rgba(139, 92, 95, 0.72)"
            style={styles.searchInput}
            value={search}
          />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={styles.list}
          >
            {filtered.map((item) => (
              <Pressable
                key={String(item.numero)}
                onPress={() => handleSelect(item)}
                style={[
                  styles.option,
                  String(item.numero) === String(value) ? styles.optionSelected : null,
                ]}
              >
                <Text style={styles.optionText}>{item.nombre}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Cancelar</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={handleOpen} style={styles.trigger}>
          <Text
            numberOfLines={1}
            style={[styles.value, !selected ? styles.placeholder : null]}
          >
            {selected?.nombre || 'Seleccioná un país'}
          </Text>
          <ChevronIcon />
        </Pressable>
      )}

      {error ? (
        <View style={styles.errorRow}>
          <ErrorIcon />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 29,
    width: '100%',
    zIndex: 10,
  },
  label: {
    color: colors.mutedRose,
    fontFamily: fonts.regular,
    fontSize: 17,
    marginBottom: 7,
  },
  trigger: {
    alignItems: 'center',
    borderBottomColor: colors.burgundy,
    borderBottomWidth: 7,
    columnGap: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 35,
    paddingBottom: 2,
  },
  value: {
    color: colors.textBurgundy,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 18,
  },
  placeholder: {
    color: 'rgba(139, 92, 95, 0.72)',
  },
  openBox: {
    backgroundColor: colors.cream,
    borderColor: 'rgba(159, 2, 29, 0.3)',
    borderRadius: 6,
    borderWidth: 1,
    maxHeight: 280,
    overflow: 'hidden',
  },
  searchInput: {
    borderBottomColor: 'rgba(159, 2, 29, 0.2)',
    borderBottomWidth: 1,
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  list: {
    maxHeight: 190,
  },
  option: {
    borderBottomColor: 'rgba(159, 2, 29, 0.1)',
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  optionSelected: {
    backgroundColor: 'rgba(214, 136, 143, 0.2)',
  },
  optionText: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  closeBtn: {
    alignItems: 'center',
    borderTopColor: 'rgba(159, 2, 29, 0.15)',
    borderTopWidth: 1,
    paddingVertical: 10,
  },
  closeBtnText: {
    color: colors.mutedRose,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  errorRow: {
    alignItems: 'flex-start',
    columnGap: 6,
    flexDirection: 'row',
    marginTop: 8,
  },
  errorText: {
    color: colors.burgundy,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 17,
  },
});
