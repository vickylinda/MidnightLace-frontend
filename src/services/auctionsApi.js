import { apiFetch } from '../utils/http';

function getAuctionBasePath(isSubastador = false) {
  return isSubastador ? '/v1/subastador/subastas' : '/v1/subastas';
}

export function getAuctionDetails(auctionId, { isSubastador = false } = {}) {
  const basePath = getAuctionBasePath(isSubastador);
  return apiFetch(`${basePath}/${encodeURIComponent(auctionId)}`);
}

export function getAuctionCatalog(
  auctionId,
  page = 1,
  amount = 6,
  { isSubastador = false } = {}
) {
  const basePath = getAuctionBasePath(isSubastador);
  return apiFetch(
    `${basePath}/${encodeURIComponent(auctionId)}/catalogo?pagina=${page}&cantidad=${amount}`
  );
}

export function getActiveItem(auctionId, { isSubastador = false } = {}) {
  const basePath = getAuctionBasePath(isSubastador);
  return apiFetch(`${basePath}/${encodeURIComponent(auctionId)}/item-actual`);
}

export function startAuctionNow(auctionId) {
  return apiFetch(
    `/v1/subastador/subastas/${encodeURIComponent(auctionId)}/estado`,
    {
      method: 'PATCH',
      body: { estado: 'abierta' },
    }
  );
}

export function getAuctionBids(
  auctionId,
  itemId,
  page = 1,
  amount = 20,
  { isSubastador = false } = {}
) {
  const basePath = getAuctionBasePath(isSubastador);
  return apiFetch(
    `${basePath}/${encodeURIComponent(auctionId)}/items/${encodeURIComponent(
      itemId
    )}/pujas?pagina=${page}&cantidad=${amount}`
  );
}

