const { customAlphabet } = require('nanoid');

const alphabet = '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nanoid = customAlphabet(alphabet, 6); // Generates 6-character codes
export const generateUserCode = () => `${nanoid()}`;
export const generateUserTransCode = () => `ESGH-${nanoid()}`;
export const releaseRef = () => `RELEASE-${nanoid()}`;


