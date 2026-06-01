import { apiFetch } from './http';

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export async function listCountries() {
  const response = await apiFetch('/v1/paises?pagina=1&cantidad=100', {
    auth: false,
    method: 'GET',
  });

  return response?.datos || [];
}

export async function findCountryIdByName(countryName) {
  const countries = await listCountries();
  const normalizedName = normalize(countryName);
  const foundCountry = countries.find((country) => {
    const names = [
      country.nombre,
      country.nombre_corto,
      country.nombreCorto,
      country.nacionalidad,
    ];

    return names.some((name) => normalize(name) === normalizedName);
  });

  return foundCountry?.numero || null;
}
