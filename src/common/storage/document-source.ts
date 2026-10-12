// src/common/storage/document-source.ts
import { BadRequestException, Logger, UnprocessableEntityException } from '@nestjs/common';
import { isTrustedStorageUrl } from './trusted-storage-url.js';

const logger = new Logger('DocumentSource');

export interface StoredFileRef {
  id: string;
  url: string;
}

/**
 * Loads a stored file the caller is allowed to use, or throws (e.g. 404).
 * Today this is FilesService.findFileById; once file ownership (B4) is approved it becomes the
 * owner-scoped lookup, without changing callers of resolveDocumentPayload.
 */
export type FileAccessCheck = (fileId: string) => Promise<StoredFileRef>;

/** Throws if a stored file's URL is not on the project's trusted storage. */
export function assertTrustedStoredFile(file: StoredFileRef): void {
  if (!isTrustedStorageUrl(file.url)) {
    logger.warn(`Refused to process file ${file.id}: stored URL is not on trusted storage`);
    throw new UnprocessableEntityException('This file cannot be processed.');
  }
}

/**
 * Builds the payload for document-based generation from an authenticated, authorized file identifier.
 * - `fileId` (or legacy `documentId`) is required; a client-supplied `fileUrl` is never fetched.
 * - The stored URL replaces any client URL, and must be on trusted storage.
 */
export async function resolveDocumentPayload<T extends Record<string, any>>(
  payload: T | undefined,
  loadFile: FileAccessCheck,
): Promise<T & { fileId: string; fileUrl: string }> {
  const body = (payload ?? {}) as Record<string, any>;
  const fileId = typeof body.fileId === 'string' && body.fileId ? body.fileId : body.documentId;

  if (typeof fileId !== 'string' || !fileId.trim()) {
    throw new BadRequestException('fileId is required for document-based generation. Upload the document first.');
  }

  const file = await loadFile(fileId);
  assertTrustedStoredFile(file);

  return { ...(body as T), fileId: file.id, fileUrl: file.url };
}
