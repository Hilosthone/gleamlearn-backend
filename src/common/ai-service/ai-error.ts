// src/common/ai-service/ai-error.ts
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { callInfo, failureCategory } from './ai-http.client.js';
import { currentRequestId } from '../request-context.js';

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

/** Codes in AI error bodies, so clients can tell our rate limit from the provider's capacity or an outage. */
export const AI_ERROR_CODES = {
  rateLimited: 'AI_RATE_LIMITED', // this learner sent too many AI requests (the AI service's per-learner limit)
  providerBusy: 'AI_PROVIDER_BUSY', // the model provider is rate-limiting GleamLearn; retry later
  providerQuota: 'AI_PROVIDER_QUOTA', // GleamLearn's provider quota/credits are used up; needs an operator
  unavailable: 'AI_UNAVAILABLE', // AI service down, unreachable or misconfigured
  timeout: 'AI_TIMEOUT',
  failed: 'AI_FAILED',
} as const;

/** Coded errors from the AI service's /learn routes whose message is safe to show as-is. */
const LEARN_CODES = new Set(['NO_TEXT', 'UNSUPPORTED', 'TOO_LARGE', 'BAD_FILE', 'SOURCE_TOO_SHORT', 'AI_BAD_OUTPUT']);

function retryAfterSeconds(error: any): number | undefined {
  const raw = error?.response?.headers?.['retry-after'] ?? error?.response?.data?.detail?.retryAfterSeconds;
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.ceil(n), 3600) : undefined;
}

function aiError(status: number, code: string, message: string, retryAfter?: number): HttpException {
  return new HttpException({ statusCode: status, code, message, ...(retryAfter ? { retryAfterSeconds: retryAfter } : {}) }, status);
}

/**
 * Converts any failure from a call to the Python AI service into a safe HttpException.
 * Body: `{ statusCode, code, message, retryAfterSeconds? }`; the frontend reads `message`, `code` and the wait time.
 * Logs status/code/truncated upstream detail only — never request headers, payloads or credentials.
 */
export function toAiHttpException(error: any, operation: string): HttpException {
  if (error instanceof HttpException) return error;

  const status: number | undefined = error?.response?.status;
  const rawDetail = error?.response?.data?.detail;
  const upstreamCode: string | undefined = rawDetail && typeof rawDetail === 'object' ? rawDetail.code : undefined;
  const detail = rawDetail && typeof rawDetail === 'object' && 'message' in rawDetail ? rawDetail.message : rawDetail;
  const code: string | undefined = error?.code;
  const wait = retryAfterSeconds(error);

  let result: HttpException;

  if (status !== undefined) {
    if (upstreamCode && LEARN_CODES.has(upstreamCode) && typeof detail === 'string' && detail) {
      // written for learners by routers/learn.py (e.g. a scanned PDF, too little text, unusable AI output)
      result = aiError(status, upstreamCode, detail.slice(0, 300));
    } else if (CLIENT_STATUSES.has(status) && safeClientMessage(detail)) {
      result = new HttpException(safeClientMessage(detail)!, status);
    } else if (status === 404) {
      result = new HttpException('The requested AI resource was not found.', HttpStatus.NOT_FOUND);
    } else if (status === 429) {
      const s = wait ?? 60;
      result = aiError(429, AI_ERROR_CODES.rateLimited, `You've reached the AI request limit for now. Please wait ${s} seconds and try again.`, s);
    } else if (upstreamCode === 'AI_PROVIDER_QUOTA_EXHAUSTED') {
      result = aiError(503, AI_ERROR_CODES.providerQuota, "GleamLearn's AI has reached its usage limit with our AI provider. Please try again later.");
    } else if (upstreamCode === 'AI_PROVIDER_RATE_LIMITED') {
      result = aiError(503, AI_ERROR_CODES.providerBusy, 'The AI provider is busy right now. Please try again in a moment.', wait ?? 30);
    } else if (status === 401 || status === 403 || upstreamCode === 'AI_PROVIDER_AUTH') {
      // the backend's AI_API_KEY or the AI service's provider key is wrong: an operator problem, not the learner's
      result = aiError(503, AI_ERROR_CODES.unavailable, 'AI features are temporarily unavailable. Please try again later.');
    } else if (status === 504 || upstreamCode === 'AI_PROVIDER_TIMEOUT') {
      result = aiError(504, AI_ERROR_CODES.timeout, 'The AI took too long to respond. Please try again.');
    } else if (status === 413) {
      result = new HttpException('The content is too large to process.', HttpStatus.PAYLOAD_TOO_LARGE);
    } else {
      result = aiError(502, AI_ERROR_CODES.failed, 'AI generation failed. Please try again later.');
    }
  } else if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || /timeout/i.test(error?.message ?? '')) {
    result = aiError(504, AI_ERROR_CODES.timeout, 'The AI service took too long to respond. Please try again.');
  } else {
    result = aiError(503, AI_ERROR_CODES.unavailable, 'The AI service is currently unavailable. Please try again later.');
  }

  const call = callInfo(error?.config);
  logger.warn(
    `${operation} failed: id=${call.id ?? currentRequestId() ?? '-'} upstreamStatus=${status ?? 'none'} upstreamCode=${upstreamCode ?? 'none'} code=${code ?? 'none'} ` +
      `category=${failureCategory(error)} returned=${result.getStatus()} ms=${call.ms ?? '-'} detail=${describe(detail ?? error?.message)}`,
  );

  return result;
}
