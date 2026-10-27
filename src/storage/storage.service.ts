import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { v2 as cloudinary } from 'cloudinary';

export type StorageFolder = 'avatars' | 'materials';
export type StorageDriver = 'cloudinary' | 'local';

/**
 * Private object storage for learner uploads (profile pictures, learning materials).
 *
 *   STORAGE_DRIVER=cloudinary (default when CLOUDINARY_CLOUD_NAME is set): Cloudinary's "authenticated" delivery
 *       type, so objects are NOT publicly reachable; browsers only get short-lived signed download links.
 *   STORAGE_DRIVER=local: files under STORAGE_LOCAL_DIR, served by GET /api/v1/storage/local/:token with an
 *       HMAC-signed, expiring token. For development and the disposable e2e stack (never touches real storage).
 *
 * Course files uploaded by admins keep using FilesService (public Cloudinary uploads); these are separate.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  driver(): StorageDriver {
    const d = process.env.STORAGE_DRIVER?.trim().toLowerCase();
    if (d === 'local' || d === 'cloudinary') return d;
    return process.env.CLOUDINARY_CLOUD_NAME ? 'cloudinary' : 'local';
  }

  private localDir(): string {
    return path.resolve(process.env.STORAGE_LOCAL_DIR || '.local-storage');
  }

  private signingSecret(): string {
    const s = process.env.STORAGE_SIGNING_SECRET || process.env.JWT_SECRET;
    if (!s) throw new ServiceUnavailableException('File storage is not configured.');
    return s;
  }

  private cloudinary() {
    const { CLOUDINARY_CLOUD_NAME: cloud_name, CLOUDINARY_API_KEY: api_key, CLOUDINARY_API_SECRET: api_secret } = process.env;
    if (!cloud_name || !api_key || !api_secret) throw new ServiceUnavailableException('File storage is not configured.');
    cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
    return cloudinary;
  }

  /** Stores the bytes; returns an opaque, driver-prefixed key to keep with the record. */
  async put(folder: StorageFolder, data: Buffer, ext: string): Promise<string> {
    if (this.driver() === 'local') {
      const name = `${randomUUID()}.${ext}`;
      const dir = path.join(this.localDir(), folder);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, name), data);
      return `local:${folder}/${name}`;
    }
    const resourceType = folder === 'avatars' ? 'image' : 'raw';
    try {
      const result = await new Promise<{ public_id: string }>((resolve, reject) => {
        const stream = this.cloudinary().uploader.upload_stream(
          {
            folder: `gleamlearn-${folder}`,
            type: 'authenticated',
            resource_type: resourceType,
            // raw files keep their extension in the id so downloads open with the right application
            ...(resourceType === 'raw' ? { public_id: `${randomUUID()}.${ext}` } : {}),
          },
          (error, res) => (error || !res ? reject(error ?? new Error('upload failed')) : resolve(res)),
        );
        Readable.from(data).pipe(stream);
      });
      return `cloudinary:${resourceType}:${result.public_id}`;
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.error(`storage upload failed: ${(err as Error)?.message}`);
      throw new ServiceUnavailableException('The file could not be stored. Please try again.');
    }
  }

  async remove(key: string): Promise<void> {
    try {
      if (key.startsWith('local:')) {
        await fs.rm(this.localPath(key), { force: true });
      } else if (key.startsWith('cloudinary:')) {
        const [resourceType, publicId] = this.cloudinaryParts(key);
        await this.cloudinary().uploader.destroy(publicId, { type: 'authenticated', resource_type: resourceType, invalidate: true });
      }
    } catch (err) {
      // the record is deleted regardless; an orphaned object is logged for clean-up, never shown to the learner
      this.logger.warn(`storage delete failed for a ${key.split(':')[0]} object: ${(err as Error)?.message}`);
    }
  }

  /**
   * A short-lived link for the owner's browser. Cloudinary: a signed private download URL that expires.
   * Local: a path under the API (`/storage/local/<token>`) that the frontend joins to its API base URL.
   */
  signedUrl(key: string, ttlSeconds: number, mime: string): { url: string; expiresAt: string } {
    const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
    const expiresAt = new Date(expires * 1000).toISOString();
    if (key.startsWith('local:')) {
      const payload = Buffer.from(JSON.stringify({ k: key, e: expires, m: mime })).toString('base64url');
      return { url: `/storage/local/${payload}.${this.sign(payload)}`, expiresAt };
    }
    const [resourceType, publicId] = this.cloudinaryParts(key);
    const sub = mime.split('/')[1] ?? '';
    const format = resourceType === 'raw' ? '' : sub === 'jpeg' ? 'jpg' : sub;
    const url = this.cloudinary().utils.private_download_url(publicId, format, { resource_type: resourceType, type: 'authenticated', expires_at: expires });
    return { url, expiresAt };
  }

  /**
   * A URL the private AI service can download (it accepts only https on res.cloudinary.com). Server-to-server only,
   * never returned to a browser. null when the driver cannot provide one (local storage).
   */
  aiFetchUrl(key: string): string | null {
    if (!key.startsWith('cloudinary:')) return null;
    const [resourceType, publicId] = this.cloudinaryParts(key);
    return this.cloudinary().url(publicId, { resource_type: resourceType, type: 'authenticated', sign_url: true, secure: true });
  }

  /** Verifies a local download token; returns the file path and type, or null if invalid or expired. */
  verifyLocalToken(token: string): { filePath: string; mime: string } | null {
    const dot = token.lastIndexOf('.');
    if (dot <= 0) return null;
    const payload = token.slice(0, dot);
    const sig = Buffer.from(token.slice(dot + 1));
    const expected = Buffer.from(this.sign(payload));
    if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
    try {
      const { k, e, m } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (typeof k !== 'string' || !k.startsWith('local:') || typeof e !== 'number' || e < Math.floor(Date.now() / 1000)) return null;
      return { filePath: this.localPath(k), mime: typeof m === 'string' ? m : 'application/octet-stream' };
    } catch {
      return null;
    }
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.signingSecret()).update(`storage:${payload}`).digest('base64url');
  }

  private localPath(key: string): string {
    const full = path.resolve(this.localDir(), key.slice('local:'.length));
    if (!full.startsWith(this.localDir() + path.sep)) throw new Error('invalid storage key'); // no path traversal
    return full;
  }

  private cloudinaryParts(key: string): [string, string] {
    const rest = key.slice('cloudinary:'.length);
    const i = rest.indexOf(':');
    return [rest.slice(0, i), rest.slice(i + 1)];
  }
}
