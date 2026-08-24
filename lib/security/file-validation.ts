const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function hasPrefix(bytes: Uint8Array, prefix: number[]) {
  return prefix.every((value, index) => bytes[index] === value);
}

/** Validate the actual file signature instead of trusting the browser MIME type. */
export async function validateUploadedDocument(file: File) {
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return { ok: false as const, error: "Le fichier doit être compris entre 1 octet et 10 Mo." };
  }

  if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) {
    return { ok: false as const, error: "Format de document non accepté." };
  }

  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const isPdf = hasPrefix(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  const isOle = hasPrefix(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  const isZip = hasPrefix(bytes, [0x50, 0x4b, 0x03, 0x04]);

  const signatureMatches =
    (file.type === "application/pdf" && isPdf) ||
    (file.type === "application/msword" && isOle) ||
    (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && isZip);

  if (!signatureMatches) {
    return { ok: false as const, error: "Le contenu réel du fichier ne correspond pas à son type déclaré." };
  }

  return { ok: true as const };
}
