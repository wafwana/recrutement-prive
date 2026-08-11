import { scrypt as nodeScrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scrypt = promisify(nodeScrypt);
const KEY_LENGTH = 64;

export async function hashE2EPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}
