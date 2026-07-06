import { resolveApiAssetUrl } from './config';

export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function mapAuctionStatus(estado) {
  if (estado === 'programada') return 'inscripcion abierta';
  if (estado === 'abierta') return 'en curso';
  if (estado === 'cerrada') return 'finalizada';
  return 'sin estado';
}

export function mapAuctionToCard(auction) {
  const hora = auction.hora ? ` - ${String(auction.hora).slice(0, 5)}h` : '';
  const fecha = auction.fecha ? String(auction.fecha).split('-').reverse().join('/') : '-';

  return {
    category: capitalize(auction.categoria),
    dateTime: `${fecha}${hora}`,
    id: auction.identificador,
    imageSource: auction.fotoPrincipal ? { uri: resolveApiAssetUrl(auction.fotoPrincipal) } : null,
    location: auction.ubicacion || 'Ubicacion por confirmar',
    pieces: null,
    rawData: auction,
    status: mapAuctionStatus(auction.estado),
    title: auction.nombre,
  };
}

export function getResponseItems(response) {
  if (Array.isArray(response)) return response;
  return response?.datos ?? [];
}

export function isHomeFeaturedAuction(auction) {
  return Boolean(
    auction?.destacada ??
      auction?.esDestacada ??
      auction?.mostrarEnHome ??
      auction?.enHome ??
      auction?.subastaDestacada
  );
}

export function pickRandomAuction(auctions) {
  if (!auctions.length) return null;
  return auctions[Math.floor(Math.random() * auctions.length)];
}
