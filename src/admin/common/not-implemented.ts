// src/admin/common/not-implemented.ts
import { NotImplementedException } from '@nestjs/common';

/**
 * Used for admin operations that previously reported success without doing anything.
 * They now fail honestly with 501 and change no data, so no client can show a false success.
 */
export function notImplementedAction(action: string, reason: string): NotImplementedException {
  return new NotImplementedException(`${action} is not available yet: ${reason}`);
}
