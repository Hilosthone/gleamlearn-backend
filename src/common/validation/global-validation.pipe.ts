// src/common/validation/global-validation.pipe.ts
import { ValidationPipe } from '@nestjs/common';

/**
 * Global request validation for all class-validator DTOs.
 *
 * - transform: true  -> DTO classes are instantiated, so query DTO @Type(() => Number) conversions
 *                       and property defaults (e.g. page = 1) take effect.
 * - whitelist: false -> undeclared fields are NOT stripped. Several services read fields their DTO
 *                       does not declare (e.g. confirmNewPassword in change-password), so stripping
 *                       would silently break existing clients. Declared validators are still enforced.
 * - Error responses do not echo the submitted values back.
 *
 * Set REQUEST_VALIDATION=off to disable globally (rollback switch, no code change needed).
 */
export function isRequestValidationEnabled(): boolean {
  return (process.env.REQUEST_VALIDATION ?? 'on').trim().toLowerCase() !== 'off';
}

export function createGlobalValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    transform: true,
    whitelist: false,
    forbidNonWhitelisted: false,
    forbidUnknownValues: false,
    validationError: { target: false, value: false },
  });
}
