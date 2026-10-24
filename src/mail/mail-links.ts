// src/mail/mail-links.ts
/**
 * Links placed in emails. They must point at routes that exist in the frontend (gleamlearn-landing/src/app):
 *   /auth/verify-email?email=…   (reads `email`; the learner types the code from the email)
 *   /auth/reset-password?email=… (reads `email`; the learner types the code)
 *   /auth/login, /auth/forgot-password
 * One-time codes are deliberately NOT put in URLs (they would end up in browser history, proxies and referrers).
 */
const DEFAULT_FRONTEND_URL = 'https://gleamlearn.vercel.app';

export function frontendBase(configured: string | undefined): string {
  return (configured?.trim() || DEFAULT_FRONTEND_URL).replace(/\/+$/, '');
}

export const mailLinks = (base: string) => ({
  verifyEmail: (email: string) => `${base}/auth/verify-email?email=${encodeURIComponent(email)}`,
  resetPassword: (email: string) => `${base}/auth/reset-password?email=${encodeURIComponent(email)}`,
  login: () => `${base}/auth/login`,
  forgotPassword: () => `${base}/auth/forgot-password`,
});
