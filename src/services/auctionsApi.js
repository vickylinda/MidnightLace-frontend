import { apiFetch } from '../utils/http';

export function getAuctionDetails(auctionId) {
  return apiFetch(`/v1/subastas/${encodeURIComponent(auctionId)}`);
}

export function getAuctionCatalog(auctionId, page = 1, amount = 6) {
  return apiFetch(
    `/v1/subastas/${encodeURIComponent(auctionId)}/catalogo?pagina=${page}&cantidad=${amount}`
  );
}
