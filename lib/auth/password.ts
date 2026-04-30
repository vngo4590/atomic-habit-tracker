import bcrypt from "bcryptjs";

const PASSWORD_COST = 12;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_COST);
}

export async function verifyPassword(password: string, hash: string | null | undefined) {
  if (!hash || !password) {
    return false;
  }

  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
