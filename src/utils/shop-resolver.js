/**
 * Shop Resolver Utility
 * Extracts shop identifier from webhook request
 */

export function resolveShopFromRequest(request) {
  // Try URL parameter: ?shop=vikginchoice
  const url = new URL(request.url);
  const shopParam = url.searchParams.get('shop');

  if (shopParam) {
    return shopParam.toLowerCase().trim();
  }

  // Try request headers (custom header)
  const shopHeader = request.headers.get('x-shop-id');
  if (shopHeader) {
    return shopHeader.toLowerCase().trim();
  }

  // No shop identifier found
  return null;
}

export function validateShopId(shopId) {
  const validShops = ['vikginchoice', 'retoertje'];
  return validShops.includes(shopId?.toLowerCase());
}
