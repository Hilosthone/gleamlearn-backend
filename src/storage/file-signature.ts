/**
 * Identifies an uploaded file by its contents (magic bytes), not by the name or the Content-Type the browser sent.
 * Only the formats GleamLearn actually handles are recognised; everything else is rejected.
 */

export interface DetectedType {
  mime: string;
  ext: string;
}

const startsWith = (buf: Buffer, bytes: number[], offset = 0) => buf.length >= offset + bytes.length && bytes.every((b, i) => buf[offset + i] === b);

function isUtf8Text(buf: Buffer): boolean {
  if (buf.length === 0 || buf.includes(0)) return false;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buf);
    return true;
  } catch {
    return false;
  }
}

export function detectFileType(buf: Buffer | undefined | null): DetectedType | null {
  if (!buf || buf.length === 0) return null;
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: 'image/png', ext: 'png' };
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return { mime: 'image/jpeg', ext: 'jpg' };
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) return { mime: 'image/webp', ext: 'webp' };
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { mime: 'application/pdf', ext: 'pdf' }; // %PDF-
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) {
    // a .docx is a zip whose entry names (stored uncompressed) include [Content_Types].xml and word/
    const head = buf.subarray(0, Math.min(buf.length, 64 * 1024)).toString('latin1');
    return head.includes('[Content_Types].xml') && head.includes('word/')
      ? { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx' }
      : null;
  }
  return isUtf8Text(buf) ? { mime: 'text/plain', ext: 'txt' } : null;
}

export const AVATAR_TYPES: readonly string[] = ['image/png', 'image/jpeg', 'image/webp'];
export const MATERIAL_TYPES: readonly string[] = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const MATERIAL_MAX_BYTES = 15 * 1024 * 1024;
