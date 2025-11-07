const { customAlphabet } = require('nanoid');

const alphabet = '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nanoid = customAlphabet(alphabet, 6); // Generates 6-character codes
const sixDigitsCode = customAlphabet('1234567890', 6);
const twelveDigitsCode = customAlphabet('1234567890', 12);


export const generateUserCode = () => `${nanoid()}`;
export const generateUserTransCode = () => `ESGH-${nanoid()}`;
export const generateShopCode = () => `${sixDigitsCode()}`;
export const releaseRef = () => `RELEASE-${nanoid()}`;

// generate transaction id of 12 numerics
export const generateTransactionId = () => twelveDigitsCode();

export function getNetworkCode(phoneNumber: string): string | null {
  // Normalize the number (remove spaces, country code, etc.)
  const normalized = phoneNumber
    .replace(/\s+/g, '')
    .replace(/^(\+233|233)/, '0'); // Replace +233 / 233 with 0

  // Map of prefixes to network codes
  const networkMap: Record<string, string> = {
    '024': 'MTN',
    '054': 'MTN',
    '055': 'MTN',
    '059': 'MTN',
    '025': 'MTN', // sometimes reused

    '020': 'VDF',
    '050': 'VDF',

    '027': 'TGO',
    '057': 'TGO',

    '026': 'ATL',
    '056': 'ATL',
  };

  // Extract first 3 digits
  const prefix = normalized.substring(0, 3);

  // Return network code or null if not found
  return networkMap[prefix] || null;
}



