export type ContactFields = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

export type ContactValidation =
  | { ok: true; data: ContactFields }
  | { ok: false; error: string };

const MAX_LENGTHS = {
  name: 120,
  email: 254,
  phone: 40,
  subject: 160,
  message: 5_000,
} as const;

export function validateContactFields(input: ContactFields): ContactValidation {
  const data: ContactFields = {
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    subject: input.subject.trim(),
    message: input.message.trim(),
  };

  if (!data.name || !data.email || !data.subject || !data.message) {
    return { ok: false, error: "Champs requis manquants." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { ok: false, error: "Adresse email invalide." };
  }

  for (const [field, maximum] of Object.entries(MAX_LENGTHS)) {
    if (data[field as keyof ContactFields].length > maximum) {
      return { ok: false, error: "Un ou plusieurs champs dépassent la longueur autorisée." };
    }
  }

  return { ok: true, data };
}
