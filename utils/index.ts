import { customAlphabet } from 'nanoid';


const alphabet = '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nanoid = customAlphabet(alphabet, 8); // Generates 8-character codes
export const generateUserCode = () => `ESGH-${nanoid()}`;

