/**
 * SHA-256 Hashing Utility for User Data
 * Meta requires user data (email, phone, etc.) to be SHA-256 hashed
 */

export async function sha256(data) {
  if (!data) return null;

  // Normalize: lowercase and trim
  const normalized = String(data).toLowerCase().trim();

  if (!normalized) return null;

  // Convert string to Uint8Array
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(normalized);

  // Hash with SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Hash user data for Meta CAPI
 * @param {Object} userData - Raw user data from Lightspeed
 * @returns {Object} Hashed user data ready for Meta CAPI
 */
export async function hashUserData(userData) {
  const hashed = {};

  // Email (required)
  if (userData.email) {
    hashed.em = [await sha256(userData.email)];
  }

  // Phone (normalize: remove non-digits, then hash)
  if (userData.phone) {
    const phoneDigits = userData.phone.replace(/\D/g, '');
    if (phoneDigits) {
      hashed.ph = [await sha256(phoneDigits)];
    }
  }

  // First name
  if (userData.firstName) {
    hashed.fn = [await sha256(userData.firstName)];
  }

  // Last name
  if (userData.lastName) {
    hashed.ln = [await sha256(userData.lastName)];
  }

  // City
  if (userData.city) {
    hashed.ct = [await sha256(userData.city)];
  }

  // Zip code
  if (userData.zipcode) {
    hashed.zp = [await sha256(userData.zipcode)];
  }

  // Country (ISO 2-letter code, lowercase, NOT hashed)
  if (userData.country) {
    hashed.country = [userData.country.toLowerCase()];
  }

  return hashed;
}
