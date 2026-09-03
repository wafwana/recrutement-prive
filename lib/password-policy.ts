export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export const PASSWORD_REQUIREMENTS = [
  "Au moins 8 caractères",
  "Au moins 1 majuscule",
  "Au moins 1 minuscule",
  "Au moins 1 chiffre",
  "Au moins 1 caractère spécial (ex: @ . : ! &)",
];

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Au moins 8 caractères requis.");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Au moins 1 majuscule requise.");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Au moins 1 minuscule requise.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Au moins 1 chiffre requis.");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Au moins 1 caractère spécial requis (ex: @ . : ! &).");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
