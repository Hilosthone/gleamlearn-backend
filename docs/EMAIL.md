# Email

Status **2026-10-25**. Code: `src/mail/`. Tests: `src/mail/**/*.spec.ts`, `test/live/` (SMTP sink).

## Architecture

```
AuthService ──> MailService (templates, subjects, links; src/mail/mail.service.ts)
                    └──> MailTransport (src/mail/mail-transport.ts), chosen once at startup
                           ├─ ResendTransport  (official `resend` SDK, HTTPS API)
                           ├─ SmtpTransport    (nodemailer; local development and the test/live SMTP sink)
                           └─ disabled         (nothing configured: every send fails honestly)
```

- **AuthService is provider-independent.** Its calls are unchanged.
- **Unchanged by the migration:**
  - OTP generation, expiry and account binding;
  - `verify-email`, `resend-verification`, `forgot-password` and `reset-password`;
  - the 3-second response budget, with `verificationEmail: 'sent' | 'pending' | 'failed'` (`AuthService.sendWithinBudget`);
  - throttles.

## Choosing the provider (`src/mail/mail-transport.factory.ts`)

| Variable | Meaning |
|---|---|
| `MAIL_PROVIDER` | `resend` or `smtp`. Optional. When unset: **Resend** if `RESEND_API_KEY` is set, else **SMTP** if `SMTP_HOST` is set, else **disabled**. |
| `RESEND_API_KEY` | Resend API key. Secret: set it in Render, never in code or logs. |
| `RESEND_FROM` | Resend sender. Default (also set explicitly in the local `.env`): `GleamLearn <onboarding@resend.dev>`, Resend's **testing sender** (see the restriction below). |
| `SMTP_HOST`, `SMTP_PORT` (587; 465 = implicit TLS), `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | SMTP, unchanged from before |
| `FRONTEND_URL` | Base for links in emails (default `https://gleamlearn.vercel.app`) |

**Startup log:** one line states the choice. Example: `Mail provider: resend (API key present; sender domain resend.dev — testing sender: delivers only to the Resend account owner)`. It never includes the key, passwords or full addresses. **This is how to check, after a deploy, that Render has the key.**

## The Resend testing restriction (production email is BLOCKED until a domain is owned and verified)

**Production readiness: blocked.** GleamLearn has no custom domain yet (the frontend is `https://gleamlearn.vercel.app`). A `vercel.app` subdomain can't be verified in Resend, because its DNS isn't yours.

**Exact restriction, as Resend states it** (live, 2026-10-25; the address is redacted): `403 validation_error`: *"You can only send testing emails to your own email address (…). To send emails to other recipients, please verify a domain at resend.com/domains, and change the `from` address to an email using this domain."*

**With the testing sender `onboarding@resend.dev`:**

| Recipient | What happens |
|---|---|
| The email address of the Resend account owner | Delivered |
| Resend's test addresses `delivered@resend.dev`, `bounced@resend.dev`, `complained@resend.dev` (also with labels, e.g. `delivered+run1@resend.dev`) | Accepted. They simulate the outcome and no person receives anything. `bounced@` is accepted first and bounces afterwards. |
| Anyone else | **Refused** (403 `validation_error`) |

- **A gmail.com (or any other unverified) sender is always refused.** Verified live: `resend:validation_error`.
- **"sent" means accepted by Resend, not delivered.** A later bounce isn't reported back yet (there's no webhook).
- **To send to everyone:** buy or own a domain, add and verify it at resend.com/domains (DNS records), then set `RESEND_FROM="GleamLearn <no-reply@your-domain>"` on Render. **No code change is needed.**

## Local configuration (2026-10-25)

The local `.env` (git-ignored) has:
- `RESEND_API_KEY` (already there; never printed or logged);
- `RESEND_FROM="GleamLearn <onboarding@resend.dev>"` (Resend's testing sender);
- `FRONTEND_URL=https://gleamlearn.vercel.app` (links in emails stay on the Vercel deployment).

`MAIL_PROVIDER` is unset, so Resend is chosen because the key is present. Startup log: `Mail provider: resend (API key present; sender domain resend.dev — testing sender: delivers only to the Resend account owner)`.

**To receive a real verification email locally:** sign up with the email address of the Resend account owner. Any other address gets `verificationEmail: 'failed'`.

### Honest failure, verified live through the app (local backend, disposable database)

| Sign-up email | Response |
|---|---|
| `delivered+<run>@resend.dev` | `201`, `verificationEmail: "sent"` |
| `learner-<run>@example.test` | `201`: the account is created (verification isn't required to sign in). `verificationEmail: "failed"`, message *"Account created, but we could not send the verification email right now. Please request a new code shortly."* `resend-verification` for it also reports `failed`. |

- **Backend log lines:** `Verification email sent (resend).` / `Verification email failed (resend:validation_error).`. They contain no address, no code and no Resend message text.
- **Known wording gap:** "request a new code shortly" can't succeed while the testing sender is in use. The frontend verify page shows the delivery state, but a clearer message needs the domain decision.

## Links in emails (fixed 2026-10-25)

These now point at real frontend routes (`gleamlearn-landing/src/app`):

| Email | Link |
|---|---|
| Verification | `/auth/verify-email?email=…` |
| Password reset | `/auth/reset-password?email=…` |
| Reset confirmation | `/auth/login` |

- **Before the fix** they pointed at `/verify-email?token=…`, `/reset-password?token=…` and `/login`, which don't exist. The login alert's "Secure my account" button rendered as `mailto:https://…`.
- **Codes are never put in URLs.** They would end up in browser history and referrers. The learner types the code shown in the email.

## Failures and logging

- **Codes the learner waits for** (verification, reset, 2FA, email change): a failure throws a generic 500 inside `MailService`. `AuthService` turns that into `'failed'` (or `'pending'` after 3 s), so the HTTP response is never held.
- **Notifications** (login alert, password changed, reset confirmation): failures are logged and swallowed.
- **Logs** contain the email kind and the provider error code only, for example `Verification email failed (resend:validation_error).`. They never contain the recipient, the code or the provider's message.
- **The Resend SDK's own console error printer is disabled.** Its messages can contain email addresses.

## Tests

| Test | What it proves |
|---|---|
| `src/mail/mail.service.spec.ts` | Links, codes, the throw/swallow split, logs without personal data |
| `src/mail/mail-transport.factory.spec.ts` | Provider selection and senders; no secrets in logs |
| `src/mail/transports/resend.transport.spec.ts` | SDK payload, error mapping, the silenced SDK printer (SDK faked, no network) |
| Live, local (2026-10-25) | Backend with `MAIL_PROVIDER=smtp` and the SMTP sink. Sign-up → `sent` → code and correct link → resend → verify → forgot → reset → confirmation link → login with the new password: **12/12**. |
| Live, Resend API (2026-10-25) | Testing sender → `delivered@resend.dev` (Resend's simulated recipient, no person): **accepted**. Unverified gmail.com sender: **refused** and reported as `resend:validation_error`. |

| Live, through the app with Resend (2026-10-25) | `E2E_MAIL_PROVIDER=resend`: provider log, `sent` for a Resend test address, honest `failed` for a normal address, clean logs: **7/7** |

`test/live/start-backend.mjs` uses `MAIL_PROVIDER=smtp` (the local sink) unless `E2E_MAIL_PROVIDER=resend` is set. With Resend, only use Resend's test addresses.
