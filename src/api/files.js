export function getPickedAssetName(asset, fallbackName = 'archivo') {
  return (
    asset?.fileName ||
    asset?.name ||
    asset?.uri?.split('/').pop()?.split('?')[0] ||
    fallbackName
  );
}

export function appendPickedFile(formData, fieldName, asset, fallbackName) {
  if (!asset) {
    return;
  }

  const file =
    asset.file ||
    asset;

  if (typeof File !== 'undefined' && file instanceof File) {
    formData.append(fieldName, file);
    return;
  }

  formData.append(fieldName, {
    name: getPickedAssetName(asset, fallbackName),
    type: asset.mimeType || asset.type || 'application/octet-stream',
    uri: asset.uri,
  });
}
