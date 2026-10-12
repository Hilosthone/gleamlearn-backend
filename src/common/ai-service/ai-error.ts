// src/common/ai-service/ai-error.ts
import { HttpException, HttpStatus, Logger } from '@nestjs/common';

const logger = new Logger('AiServiceClient');

// Messages authored by the AI service itself that are safe and useful to show to users.
// Anything else (provider errors, library exceptions, URLs) is replaced with a generic message.
const SAFE_UPSTREAM_DETAILS = [
  'Invalid YouTube URL.',
  'No transcript could be retrieved for this video.',
  'Document file URL is required.',
  'Document is too large to process.',
  'Unsupported document type. Upload a PDF, DOCX or text file.',
  'The PDF could not be read. It may be corrupted or password-protected.',
  'No extractable text was found in this PDF. Scanned/image-only PDFs are not supported yet.',
  'The Word document could not be read.',
  'The document does not contain any readable text.',
  'courseId is required.',
  'documentId or fileId is required.',
  'fileUrl is required for document-based test generation.',
  'fileUrl is required for document-based exam generation.',
  'Either audioData or text is required.',
  'text is required for voice response generation.',
  'text is required for speech synthesis.',
];

const PREFIX_MESSAGES: Array<[string, string]> = [
  ['Failed to fetch document content', 'The document could not be downloaded for processing.'],
  ['Failed to retrieve YouTube transcript', 'A transcript could not be retrieved for this video.'],
];

const CLIENT_STATUSES = new Set([400, 404, 413, 415, 422]);

function safeClientMessage(detail: unknown): string | null {
  if (typeof detail !== 'string') return null;
  if (SAFE_UPSTREAM_DETAILS.includes(detail)) return detail;
  for (const [prefix, message] of PREFIX_MESSAGES) {
    if (detail.startsWith(prefix)) return message;
  }
  return null;
}

function describe(detail: unknown): string {
  try {
    const text = typeof detail === 'string' ? detail : JSON.stringify(detail);
    return (text ?? '').slice(0, 300);
  } catch {
    return '[unserializable detail]';
  }
}

/**
 * Converts any failure from a call to the Python AI service into a safe HttpException.
 * Response body stays the standard Nest shape `{ statusCode, message }` (the frontend reads `message`).
 * Logs status/code/truncated upstream detail only — never request headers, payloads or credentials.
 */
export function toAiHttpException(error: any, operation: string): HttpException {
  if (error instanceof HttpException) return error;

  const status: number | undefined = error?.response?.status;
  const detail = error?.response?.data?.detail;
  const code: string | undefined = error?.code;

  let result: HttpException;

  if (status !== undefined) {
    if (CLIENT_STATUSES.has(status) && safeClientMessage(detail)) {
      result = new HttpException(safeClientMessage(detail)!, status);
    } else if (status === 404) {
      result = new HttpException('The requested AI resource was not found.', HttpStatus.NOT_FOUND);
    } else if (status === 429) {
      result = new HttpException('The AI service is busy. Please try again shortly.', HttpStatus.TOO_MANY_REQUESTS);
    } else if (status === 413) {
      result = new HttpException('The content is too large to process.', HttpStatus.PAYLOAD_TOO_LARGE);
    } else {
      // 401/403 (internal key misconfiguration), 422 schema mismatches, and 5xx provider failures
      // are server-side problems: the user cannot fix them, so they surface as 502.
      result = new HttpException('AI generation failed. Please try again later.', HttpStatus.BAD_GATEWAY);
    }
  } else if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || /timeout/i.test(error?.message ?? '')) {
    result = new HttpException('The AI service took too long to respond. Please try again.', HttpStatus.GATEWAY_TIMEOUT);
  } else {
    result = new HttpException('The AI service is currently unavailable. Please try again later.', HttpStatus.SERVICE_UNAVAILABLE);
  }

  logger.warn(
    `${operation} failed: upstreamStatus=${status ?? 'none'} code=${code ?? 'none'} ` +
      `returned=${result.getStatus()} detail=${describe(detail ?? error?.message)}`,
  );

  return result;
}
