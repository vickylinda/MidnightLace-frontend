import { apiFetch } from './http';

const FALLBACK_IMAGES = [
  require('../assets/auctions/gyaru-deluxe.png'),
  require('../assets/auctions/y2k-reloaded.png'),
  require('../assets/auctions/sweet-dreams.png'),
  require('../assets/auctions/gothic-night.png'),
  require('../assets/auctions/strawberry-pattern-special.jpeg'),
  require('../assets/auctions/visual-eclipse.png'),
  require('../assets/auctions/ganguro-fever.png'),
  require('../assets/auctions/fairy-magic.png'),
];

const STATUS_LABELS = {
  abierta: 'en curso',
  cerrada: 'finalizado',
  finalizada: 'finalizado',
  programada: 'programada',
};

function formatDateTime(auction) {
  const date = auction.fecha
    ? String(auction.fecha).split('-').reverse().join('/')
    : '';
  const time = auction.hora ? `${String(auction.hora).slice(0, 5)}h` : '';

  return [date, time].filter(Boolean).join(' · ');
}

export function mapAuctionResponse(auction, index = 0) {
  return {
    category: auction.categoria || '-',
    dateTime: formatDateTime(auction),
    id: auction.identificador,
    imageSource: FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
    location: auction.ubicacion || '-',
    pieces: auction.cantidadItems || auction.itemsCount || auction.piezas || 0,
    raw: auction,
    status: STATUS_LABELS[auction.estado] || auction.estado || '-',
    title: auction.nombre || `Subasta ${auction.identificador}`,
  };
}

export async function listAuctions() {
  const response = await apiFetch('/v1/subastas?pagina=1&cantidad=100', {
    method: 'GET',
  });

  return (response?.datos || []).map(mapAuctionResponse);
}

export async function getAuction(id) {
  return apiFetch(`/v1/subastas/${id}`, {
    method: 'GET',
  });
}

export async function getAuctionCatalog(id) {
  return apiFetch(`/v1/subastas/${id}/catalogo?pagina=1&cantidad=100`, {
    method: 'GET',
  });
}
