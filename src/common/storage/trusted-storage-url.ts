// src/common/storage/trusted-storage-url.ts

/**
 * A document URL is trusted only if it points at this project's own Cloudinary storage:
 *   https://res.cloudinary.com/<CLOUDINARY_CLOUD_NAME>/...
 * Fail-closed: when CLOUDINARY_CLOUD_NAME is not configured, no URL is trusted.
 */
export function isTrustedStorageUrl(rawUrl: unknown, cloudName = process.env.CLOUDINARY_CLOUD_NAME): boolean {
  if (typeof rawUrl !== 'string' || !rawUrl) return false;
  const name = (cloudName ?? '').trim();
  if (!name) return false;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  return (
    url.protocol === 'https:' &&
    url.hostname === 'res.cloudinary.com' &&
    url.port === '' &&
    url.username === '' &&
    url.password === '' &&
    url.pathname.startsWith(`/${name}/`)
  );
}
