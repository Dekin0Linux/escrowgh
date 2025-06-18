import * as bcrypt from 'bcrypt';

const saltOrRounds = 10;
// HASH PASSWORD
export const hashPassword = async (password: string) => {
    return await bcrypt.hash(password, saltOrRounds);
}

// COMPARE PASSWORD
export const comparePassword = async (password: string, hash: string) => {
    return await bcrypt.compare(password, hash);
}
