const { customAlphabet } = require('nanoid');

const alphabet = '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nanoid = customAlphabet(alphabet, 6); // Generates 6-character codes
const generateUserCode = () => `${nanoid()}`;
const generateUserTransCode = () => `ESGH-${nanoid()}`;

module.exports = {
  generateUserCode,
  generateUserTransCode
};

