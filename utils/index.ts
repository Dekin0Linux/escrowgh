const { customAlphabet } = require('nanoid');

const alphabet = '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nanoid = customAlphabet(alphabet, 6); // Generates 6-character codes
const sixDigitsCode = customAlphabet('1234567890', 6);
export const generateUserCode = () => `${nanoid()}`;
export const generateUserTransCode = () => `ESGH-${nanoid()}`;
export const generateShopCode = () => `${sixDigitsCode()}`;
export const releaseRef = () => `RELEASE-${nanoid()}`;


