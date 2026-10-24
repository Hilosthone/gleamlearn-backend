# API route inventory (generated)

Generated 2026-10-24 by a static scan of every `*.controller.ts` at `origin/main` (`5ff08d8`), joined with the deployed OpenAPI document (`/api/docs-json`) and the frontend API layer (`gleamlearn-landing/src/lib`). Regenerate rather than edit by hand.

- **Auth:** `public` = no guard; `learner` = `JwtAuthGuard` / `AuthGuard('jwt')` (also enforces account status); `admin` = `@AdminOnly` / admin JWT guard.
- **Throttle:** per IP and route. `global` = the app-wide defaults (3/s, 60/min).
- **Body / Resp:** whether Swagger documents a request body (writes only) and a 2xx response schema.
- **FE:** whether `gleamlearn-landing/src/lib` defines a call for it. A definition doesn't mean a page uses it.

Totals: 458 routes; 37 public, 281 learner, 140 admin. Swagger response schemas: 10. Flashcards and decks are also served without the `/api/v1` prefix (array `@Controller`); `GET /api/v1/throttler/status` is not in Swagger.

## (not in Swagger)

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/throttler/status` | public | global |  | no |  |  |

## Academic Structure & Levels

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/academic-levels` | public | global |  | no | yes | Get standardized academic levels for secondary and university tracks |

## Academic Structure & Management

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/departments` | learner | global |  | no | yes | Get all departments |
| POST | `/api/v1/departments` | admin | 1/3s, 20/1min | yes | no | yes | Create a new department |
| DELETE | `/api/v1/departments/:id` | admin | 1/5s, 5/1min |  | no | yes | Delete a department |
| PATCH | `/api/v1/departments/:id` | admin | 1/3s, 20/1min | yes | no | yes | Update a department |
| GET | `/api/v1/faculties` | learner | global |  | no | yes | Get all faculties |
| POST | `/api/v1/faculties` | admin | 1/3s, 15/1min | yes | no | yes | Create a new faculty |
| DELETE | `/api/v1/faculties/:id` | admin | 1/5s, 5/1min |  | no | yes | Delete a faculty |
| PATCH | `/api/v1/faculties/:id` | admin | 1/3s, 15/1min | yes | no | yes | Update a faculty |
| GET | `/api/v1/institutions` | learner | global |  | no | yes | Get all institutions with faculties and departments |
| POST | `/api/v1/institutions` | admin | 1/3s, 10/1min | yes | no | yes | Create a new institution |
| DELETE | `/api/v1/institutions/:id` | admin | 1/5s, 5/1min |  | no | yes | Delete an institution |
| PATCH | `/api/v1/institutions/:id` | admin | 1/3s, 10/1min | yes | no | yes | Update an institution |

## Achievements

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/achievements` | public | 2/2s, 20/1min |  | no | yes | Get global achievements catalog |
| GET | `/api/v1/achievements/:id` | public | 2/2s, 30/1min |  | no | yes | Get specific achievement details by unique ID |
| GET | `/api/v1/achievements/me` | learner | 2/2s, 20/1min |  | no | yes | Get authenticated user unlocked achievements |

## Admin - Learning Content

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/admin/content/courses` | admin | global |  | no |  | List learner catalog courses with topic, lesson and enrollment counts |
| POST | `/api/v1/admin/content/courses` | admin | global | yes | no | yes |  |
| DELETE | `/api/v1/admin/content/courses/:id` | admin | global |  | no | yes | Delete an EMPTY course (409 if it has topics, lessons or enrollments) |
| GET | `/api/v1/admin/content/courses/:id` | admin | global |  | no | yes |  |
| PATCH | `/api/v1/admin/content/courses/:id` | admin | global | yes | no | yes |  |
| POST | `/api/v1/admin/content/courses/:id/lessons` | admin | global | yes | no | yes |  |
| POST | `/api/v1/admin/content/courses/:id/topics` | admin | global | yes | no | yes |  |
| DELETE | `/api/v1/admin/content/lessons/:id` | admin | global |  | no | yes |  |
| PATCH | `/api/v1/admin/content/lessons/:id` | admin | global | yes | no | yes |  |
| DELETE | `/api/v1/admin/content/topics/:id` | admin | global |  | no | yes |  |
| PATCH | `/api/v1/admin/content/topics/:id` | admin | global | yes | no | yes |  |

## Admin Activity Monitoring

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/admin/activity` | admin | global |  | no |  | Get global platform activity logs |
| GET | `/api/v1/admin/activity/ai` | admin | global |  | no |  | Get AI session and usage activity logs |
| GET | `/api/v1/admin/activity/assessments` | admin | global |  | no |  | Get assessment activity logs (quizzes, tests, exams) |
| GET | `/api/v1/admin/activity/learning` | admin | global |  | no |  | Get learning activity logs (course creation, enrollments, lessons) |
| GET | `/api/v1/admin/activity/payments` | admin | global |  | no |  | Get payment, subscription, and financial activity logs |
| GET | `/api/v1/admin/activity/users` | admin | global |  | no |  | Get user-related activity logs (logins, account changes, etc.) |

## Admin AI Content Moderation

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/admin/ai/generated-content` | admin | global |  | no |  | List all AI generated content awaiting moderation |
| DELETE | `/api/v1/admin/ai/generated-content/:id` | admin | global |  | no |  | Permanently delete an AI generated content record |
| GET | `/api/v1/admin/ai/generated-content/:id` | admin | global |  | no |  | Get a specific AI generated content record by ID |
| PATCH | `/api/v1/admin/ai/generated-content/:id/approve` | admin | global | no | no |  | Approve AI generated content |
| PATCH | `/api/v1/admin/ai/generated-content/:id/reject` | admin | global | no | no |  | Reject AI generated content |

## Admin Audit Logs

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/admin/audit-logs` | admin | global |  | no |  | List all platform audit logs with pagination and filters (category, action, adminId) |
| GET | `/api/v1/admin/audit-logs/:id` | admin | global |  | no |  | Get details for a specific audit log entry by ID |

## Admin Authentication

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| POST | `/api/v1/admin/auth/forgot-password` | public | global | yes | no |  | Request admin password reset instructions |
| POST | `/api/v1/admin/auth/login` | public | global | yes | no | yes | Admin login with dedicated credentials |
| POST | `/api/v1/admin/auth/logout` | public | global | no | no | yes | Admin logout |
| GET | `/api/v1/admin/auth/me` | admin | global |  | no | yes | Get current authenticated admin profile and role |
| POST | `/api/v1/admin/auth/refresh` | public | global | yes | no |  | Refresh admin JWT access token |
| POST | `/api/v1/admin/auth/reset-password` | public | global | yes | no |  | Reset admin password using token |

## Admin Course Management

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/admin/courses` | admin | global |  | no |  | List all courses with pagination and search |
| POST | `/api/v1/admin/courses` | admin | global | yes | no |  | Create a new course |
| DELETE | `/api/v1/admin/courses/:id` | admin | global |  | no |  | Permanently delete a course |
| GET | `/api/v1/admin/courses/:id` | admin | global |  | no |  | Get a specific course by ID |
| PATCH | `/api/v1/admin/courses/:id` | admin | global | yes | no |  | Update an existing course |
| PATCH | `/api/v1/admin/courses/:id/publish` | admin | global | no | no |  | Publish a course |
| PATCH | `/api/v1/admin/courses/:id/unpublish` | admin | global | no | no |  | Unpublish a course |

## Admin Dashboard

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/admin/dashboard` | admin | global |  | no | yes | Get comprehensive admin dashboard overview statistics |
| GET | `/api/v1/admin/dashboard/activity` | admin | global |  | no |  | Get platform activity logs and session metrics |
| GET | `/api/v1/admin/dashboard/counts` | admin | global |  | no | yes |  |
| GET | `/api/v1/admin/dashboard/engagement` | admin | global |  | no |  | Get user engagement metrics |
| GET | `/api/v1/admin/dashboard/learning` | admin | global |  | no |  | Get educational content metrics |
| GET | `/api/v1/admin/dashboard/revenue` | admin | global |  | no |  | Get subscription revenue and financial metrics |
| GET | `/api/v1/admin/dashboard/users` | admin | global |  | no |  | Get detailed user statistics |

## Admin Gamification Management

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/admin/gamification/coins` | admin | global |  | no |  | Get coin economy distribution and analytics |
| GET | `/api/v1/admin/gamification/leaderboards` | admin | global |  | no |  | Get global gamification leaderboard |
| GET | `/api/v1/admin/gamification/streaks` | admin | global |  | no |  | Get student streaks distribution and analytics |
| GET | `/api/v1/admin/gamification/xp` | admin | global |  | no |  | Get XP distribution and analytics overview |
| POST | `/api/v1/admin/users/:id/coins` | admin | global | yes | no |  | Manually adjust user coins (requires reason and creates audit trail) |
| POST | `/api/v1/admin/users/:id/xp` | admin | global | yes | no |  | Manually adjust user XP (requires reason and creates audit trail) |

## Admin Notifications

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/admin/notifications` | admin | global |  | no |  | List all notifications sent by admins |
| POST | `/api/v1/admin/notifications` | admin | global | yes | no |  | Send a notification to a specific user |
| DELETE | `/api/v1/admin/notifications/:id` | admin | global |  | no |  | Delete or revoke a sent notification log by ID |
| POST | `/api/v1/admin/notifications/broadcast` | admin | global | yes | no |  | Broadcast a notification to specific audience segments (Everyone, Secondary, University, Premium, etc.) |

## Admin Performance Analytics

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/admin/analytics/courses` | admin | global |  | no |  | Get course performance analytics |
| GET | `/api/v1/admin/analytics/exams` | admin | global |  | no |  | Get exam performance analytics |
| GET | `/api/v1/admin/analytics/learning` | admin | global |  | no |  | Get overall learning analytics (study hours, XP, coins) |
| GET | `/api/v1/admin/analytics/overview` | admin | global |  | no |  | Get performance analytics overview |
| GET | `/api/v1/admin/analytics/quizzes` | admin | global |  | no |  | Get quiz performance analytics |
| GET | `/api/v1/admin/analytics/retention` | admin | global |  | no |  | Get user retention analytics (Day 1, 7, 30) |
| GET | `/api/v1/admin/analytics/streaks` | admin | global |  | no |  | Get student learning streak analytics |
| GET | `/api/v1/admin/analytics/students` | admin | global |  | no |  | Get student performance analytics |
| GET | `/api/v1/admin/analytics/subjects` | admin | global |  | no |  | Get subject performance analytics |
| GET | `/api/v1/admin/analytics/tests` | admin | global |  | no |  | Get test performance analytics |

## Admin Question Management

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/admin/questions` | admin | global |  | no |  | List all questions with filtering and pagination |
| POST | `/api/v1/admin/questions` | admin | global | yes | no |  | Create a new question |
| DELETE | `/api/v1/admin/questions/:id` | admin | global |  | no |  | Permanently delete a question |
| GET | `/api/v1/admin/questions/:id` | admin | global |  | no |  | Get a specific question by ID |
| PATCH | `/api/v1/admin/questions/:id` | admin | global | yes | no |  | Update an existing question |
| PATCH | `/api/v1/admin/questions/:id/approve` | admin | global | no | no |  | Approve a submitted question |
| PATCH | `/api/v1/admin/questions/:id/reject` | admin | global | no | no |  | Reject a submitted question |

## Admin Reports Management

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/admin/reports` | admin | global |  | no |  | List all platform reports with pagination and filters |
| GET | `/api/v1/admin/reports/:id` | admin | global |  | no |  | Get a specific report by ID |
| PATCH | `/api/v1/admin/reports/:id` | admin | global | yes | no |  | Update report details |
| PATCH | `/api/v1/admin/reports/:id/reject` | admin | global | no | no |  | Reject a report |
| PATCH | `/api/v1/admin/reports/:id/resolve` | admin | global | no | no |  | Mark a report as resolved |

## Admin Revenue & Finance

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/admin/finance/overview` | admin | global |  | no |  | Get financial overview and key financial metrics |
| GET | `/api/v1/admin/finance/refunds` | admin | global |  | no |  | List user refund requests and statuses |
| GET | `/api/v1/admin/finance/revenue` | admin | global |  | no |  | Get overall revenue breakdown |
| GET | `/api/v1/admin/finance/revenue/daily` | admin | global |  | no |  | Get daily revenue time-series data |
| GET | `/api/v1/admin/finance/revenue/monthly` | admin | global |  | no |  | Get monthly revenue time-series data |
| GET | `/api/v1/admin/finance/subscriptions` | admin | global |  | no |  | List active and past platform subscriptions |
| GET | `/api/v1/admin/finance/transactions` | admin | global |  | no |  | List all financial transactions with filters |

## Admin Roles & Permissions

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/admin/permissions` | admin | global |  | no |  | List all available system permissions |
| GET | `/api/v1/admin/roles` | admin | global |  | no |  | List all custom administrative roles with permissions |
| POST | `/api/v1/admin/roles` | admin | global | yes | no |  | Create a new administrative role |
| DELETE | `/api/v1/admin/roles/:id` | admin | global |  | no |  | Delete an administrative role |
| GET | `/api/v1/admin/roles/:id` | admin | global |  | no |  | Get details for a specific role by ID |
| PATCH | `/api/v1/admin/roles/:id` | admin | global | yes | no |  | Update an administrative role |
| DELETE | `/api/v1/admin/roles/:id/permissions` | admin | global |  | no |  | Revoke permissions from a specific role |
| POST | `/api/v1/admin/roles/:id/permissions` | admin | global | yes | no |  | Assign permissions to a specific role |

## Admin Security & Abuse Management

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/admin/security/events` | admin | global |  | no |  | Retrieve security events, failed login alerts, and threat logs |
| GET | `/api/v1/admin/security/suspicious-users` | admin | global |  | no |  | List flagged or restricted users with abuse history |
| POST | `/api/v1/admin/users/:id/force-logout` | admin | global | no | no |  | Revoke user refresh tokens and force immediate logout across all devices |
| POST | `/api/v1/admin/users/:id/restrict` | admin | global | yes | no |  | Restrict/suspend a user account due to policy violation or abuse |
| POST | `/api/v1/admin/users/:id/unrestrict` | admin | global | no | no |  | Lift suspension and restore user account access |

## Admin Subscription Management

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/admin/subscriptions` | admin | global |  | no |  | List all platform subscriptions with filtering and pagination |
| GET | `/api/v1/admin/subscriptions/:id` | admin | global |  | no |  | Get details for a specific subscription by ID |
| PATCH | `/api/v1/admin/subscriptions/:id` | admin | global | yes | no |  | Update subscription details or status |
| POST | `/api/v1/admin/subscriptions/:id/cancel` | admin | global | no | no |  | Cancel an active user subscription |
| POST | `/api/v1/admin/subscriptions/:id/refund` | admin | global | no | no |  | Issue a refund and revoke a user subscription |

## Admin System Configuration

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/admin/settings` | admin | global |  | no | yes | Retrieve current platform-wide system settings and configuration limits |
| PATCH | `/api/v1/admin/settings` | admin | global | yes | no |  | Update system configuration values (XP/Coin tables, AI limits, maintenance mode, etc.) |

## Admin System Monitoring

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/admin/system/ai` | admin | global |  | no |  | Get AI service integration metrics, latency, and token consumption |
| GET | `/api/v1/admin/system/errors` | admin | global |  | no |  | Retrieve recent application error logs and runtime warnings |
| GET | `/api/v1/admin/system/health` | admin | global |  | no |  | Get core server health status, uptime, memory, and database connectivity |
| GET | `/api/v1/admin/system/queues` | admin | global |  | no |  | Monitor background worker and job queue statistics |
| GET | `/api/v1/admin/system/storage` | admin | global |  | no |  | Get file storage bucket utilization and capacity breakdown |

## Admin User Management

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/admin/users` | admin | global |  | no |  | List all platform users with pagination and search |
| DELETE | `/api/v1/admin/users/:id` | admin | global |  | no |  | Permanently delete a user account |
| GET | `/api/v1/admin/users/:id` | admin | global |  | no | yes | Get a specific user by ID |
| GET | `/api/v1/admin/users/:id/activity` | admin | global |  | no | yes | Get activity logs for a specific user |
| GET | `/api/v1/admin/users/:id/analytics` | admin | global |  | no |  | Get engagement analytics (study hours, XP, coins) for a user |
| PATCH | `/api/v1/admin/users/:id/freeze` | admin | global | no | no |  | Freeze a user account |
| GET | `/api/v1/admin/users/:id/profile` | admin | global |  | no |  | Get detailed profile information for a user |
| GET | `/api/v1/admin/users/:id/progress` | admin | global |  | no |  | Get learning and course progress for a user |
| PATCH | `/api/v1/admin/users/:id/reset-password` | admin | global | yes | no |  | Manually reset user password as an admin |
| PATCH | `/api/v1/admin/users/:id/suspend` | admin | global | no | no |  | Suspend a user account |
| PATCH | `/api/v1/admin/users/:id/unfreeze` | admin | global | no | no |  | Unfreeze a user account |
| PATCH | `/api/v1/admin/users/:id/unsuspend` | admin | global | no | no |  | Unsuspend a user account |
| PATCH | `/api/v1/admin/users/:id/unverify` | admin | global | no | no |  | Revoke user account verification status |
| PATCH | `/api/v1/admin/users/:id/verify` | admin | global | no | no |  | Manually mark a user account as verified |

## AdminExport

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/admin/export/activity` | admin | global |  | no |  |  |
| GET | `/api/v1/admin/export/analytics` | admin | global |  | no |  |  |
| GET | `/api/v1/admin/export/transactions` | admin | global |  | no |  |  |
| GET | `/api/v1/admin/export/users` | admin | global |  | no |  |  |

## AI Document Processing

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/ai/documents/:id/analysis` | learner | global |  | no | yes | Retrieve cached AI analysis results for a document |
| POST | `/api/v1/ai/documents/:id/analyze` | learner | 1/2s, 10/1min | yes | no | yes | Trigger AI deep analysis on an uploaded document |
| POST | `/api/v1/ai/documents/:id/create-course` | learner | 1/2s, 10/1min | yes | no | yes | Automatically construct a multi-tier course outline and topics from document |
| POST | `/api/v1/ai/documents/:id/export-pdf` | learner | 1/3s, 5/1min | yes | no | yes | Compile generated notes, class scripts, or summaries into a downloadable PDF document |
| POST | `/api/v1/ai/documents/:id/generate-exam` | learner | 1/3s, 5/1min | yes | no | yes | Generate full academic final exam papers |
| POST | `/api/v1/ai/documents/:id/generate-flashcards` | learner | 1/2s, 10/1min | yes | no | yes | Generate interactive study flashcards |
| POST | `/api/v1/ai/documents/:id/generate-live-class` | learner | 1/3s, 5/1min | yes | no | yes | Generate timeline script and visual canvas instructions for an interactive live AI class |
| POST | `/api/v1/ai/documents/:id/generate-notes` | learner | 1/2s, 10/1min | yes | no | yes | Generate structured lecture notes from document content |
| POST | `/api/v1/ai/documents/:id/generate-questions` | learner | 1/2s, 10/1min | yes | no | yes | Generate study review questions |
| POST | `/api/v1/ai/documents/:id/generate-quiz` | learner | 1/2s, 10/1min | yes | no | yes | Generate graded quiz assessment |
| POST | `/api/v1/ai/documents/:id/generate-summary` | learner | 1/2s, 10/1min | yes | no | yes | Generate executive summary from document |
| POST | `/api/v1/ai/documents/:id/generate-test` | learner | 1/3s, 5/1min | yes | no | yes | Generate comprehensive midterm test structure |
| GET | `/api/v1/ai/documents/:id/generated-content` | learner | global |  | no | yes | Get all AI-generated assets linked to this document |
| GET | `/api/v1/ai/documents/:id/live-class-stream` | learner | global |  | no | yes | Stream playback sync metadata and session states for the interactive live class player |

## AI Recommendations

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/recommendations` | learner | 1/2s, 15/1min |  | no | yes | Get all personalized recommendations for the authenticated student |
| GET | `/api/v1/recommendations/courses` | learner | 1/2s, 15/1min |  | no | yes | Get personalized course recommendations |
| GET | `/api/v1/recommendations/exams` | learner | 1/2s, 15/1min |  | no | yes | Get recommended mock exam simulations |
| GET | `/api/v1/recommendations/quizzes` | learner | 1/2s, 15/1min |  | no | yes | Get recommended practice quizzes for skill gaps |
| GET | `/api/v1/recommendations/revision` | learner | 1/2s, 15/1min |  | no | yes | Get spaced-repetition revision recommendations |
| GET | `/api/v1/recommendations/topics` | learner | 1/2s, 15/1min |  | no | yes | Get recommended study topics based on progress |

## AI Study Planner

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/planner` | learner | global |  | no | yes | Retrieve all planner sessions |
| PATCH | `/api/v1/planner/:id` | learner | 1/3s, 10/1min | yes | no | yes | Update study plan item |
| POST | `/api/v1/planner/:id/complete` | learner | 1/2s, 15/1min | no | no | yes | Mark study session as complete |
| POST | `/api/v1/planner/:id/skip` | learner | 1/2s, 15/1min | no | no | yes | Mark study session as skipped |
| POST | `/api/v1/planner/generate` | learner | 1/3s, 10/1min | yes | no | yes | Generate initial AI study plan |
| GET | `/api/v1/planner/month` | learner | global |  | no | yes | Get monthly study schedule |
| POST | `/api/v1/planner/regenerate` | learner | 1/3s, 5/1min | no | no | yes | Regenerate AI study plan (Backlog adjustment) |
| GET | `/api/v1/planner/today` | learner | global |  | no | yes | Get today study agenda |
| GET | `/api/v1/planner/week` | learner | global |  | no | yes | Get weekly study schedule |

## AI Tutor

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| POST | `/api/v1/ai-tutor/drawing-instructions` | learner | global | yes | no | yes | Get canvas drawing layout instructions for concepts |
| POST | `/api/v1/ai-tutor/explain` | learner | 1/3s, 8/1min | yes | no | yes | Trigger python AI microservice to explain a concept |
| POST | `/api/v1/ai-tutor/generate-diagram` | learner | 1/3s, 5/1min | yes | no | yes | Generate structural diagram specs via AI |
| GET | `/api/v1/ai-tutor/sessions` | learner | global |  | no | yes | Retrieve all classroom sessions for the authenticated user |
| POST | `/api/v1/ai-tutor/sessions` | learner | 2/2s, 10/1min | yes | no | yes | Create a new interactive AI tutor classroom session |
| GET | `/api/v1/ai-tutor/sessions/:id` | learner | global |  | no | yes | Get a specific tutor session by ID with its messages |
| POST | `/api/v1/ai-tutor/sessions/:id/answer` | learner | 1/2s, 15/1min | yes | no | yes | Submit an answer response to a tutor prompt |
| POST | `/api/v1/ai-tutor/sessions/:id/end` | learner | global | no | no | yes | End an active classroom session |
| POST | `/api/v1/ai-tutor/sessions/:id/message` | learner | 1/2s, 15/1min | yes | no | yes | Send a message to the AI tutor within a session |
| POST | `/api/v1/ai-tutor/sessions/:id/question` | learner | 1/2s, 15/1min | yes | no | yes | Ask a targeted review question to the AI tutor |
| POST | `/api/v1/ai-tutor/teach` | learner | 1/3s, 8/1min | yes | no | yes | Trigger python AI microservice to teach a specific topic |

## App

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/` | public | global |  | no |  |  |

## Assessment Analytics

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/analytics/courses` | learner | 1/2s, 20/1min |  | no | yes | Get aggregated course analytics |
| GET | `/api/v1/analytics/courses/:id` | learner | global |  | no | yes | Get course analytics by ID |
| GET | `/api/v1/analytics/exam-performance` | learner | global |  | no | yes | Get exam performance |
| GET | `/api/v1/analytics/mastery` | learner | 1/3s, 15/1min |  | no | yes | Get overall mastery |
| GET | `/api/v1/analytics/overview` | learner | 1/2s, 20/1min |  | no |  | Get performance overview |
| GET | `/api/v1/analytics/quiz-performance` | learner | global |  | no | yes | Get quiz performance |
| GET | `/api/v1/analytics/strong-topics` | learner | 1/2s, 20/1min |  | no | yes | Get strong topics |
| GET | `/api/v1/analytics/test-performance` | learner | global |  | no | yes | Get test performance |
| GET | `/api/v1/analytics/time-spent` | learner | global |  | no | yes | Get time spent metrics |
| GET | `/api/v1/analytics/topics` | learner | 1/2s, 20/1min |  | no | yes | Get topic analytics |
| GET | `/api/v1/analytics/weak-topics` | learner | 1/2s, 20/1min |  | no | yes | Get weak topics |

## Auth

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| POST | `/api/v1/auth/change-password` | learner | global | yes | no | yes | Change password for authenticated user |
| POST | `/api/v1/auth/forgot-password` | public | 1/2s, 3/1min | yes | no | yes | Initiate password reset process |
| POST | `/api/v1/auth/login` | public | 1/1s, 5/1min | yes | no | yes | Authenticate user and return tokens |
| POST | `/api/v1/auth/logout` | public | global | no | no | yes | Log out current user session |
| GET | `/api/v1/auth/me` | learner | global |  | no | yes | Get profile details of the authenticated user |
| PATCH | `/api/v1/auth/me` | learner | global | yes | no | yes | Update profile details of the authenticated user |
| POST | `/api/v1/auth/refresh-token` | public | global | yes | no | yes | Generate a new access token using a refresh token |
| POST | `/api/v1/auth/resend-verification` | public | global | yes | no | yes | Resend email verification token |
| POST | `/api/v1/auth/reset-password` | public | 1/2s, 3/1min | yes | no | yes | Complete password reset |
| POST | `/api/v1/auth/signup` | public | 2/1s, 10/1min | yes | no | yes | Register a new user account |
| POST | `/api/v1/auth/verify-email` | public | global | yes | no | yes | Verify user email address |

## Badges

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/badges` | public | 2/2s, 20/1min |  | no | yes | Get all system available badges |
| GET | `/api/v1/badges/me` | learner | 2/2s, 20/1min |  | no | yes | Get authenticated user unlocked badges |

## Calendar & Schedule

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/calendar` | learner | 2/2s, 20/1min |  | no | yes | Get all calendar events for authenticated user |
| GET | `/api/v1/calendar/day` | learner | 2/2s, 20/1min |  | no | yes | Get calendar events for a specific date |
| POST | `/api/v1/calendar/events` | learner | 1/3s, 10/1min | yes | no | yes | Create a new calendar schedule event |
| DELETE | `/api/v1/calendar/events/:id` | learner | 1/4s, 10/1min |  | no | yes | Delete a calendar event |
| PATCH | `/api/v1/calendar/events/:id` | learner | 1/3s, 15/1min | yes | no | yes | Update an existing calendar event |
| GET | `/api/v1/calendar/month` | learner | 2/2s, 15/1min |  | no | yes | Get calendar events filtered by specific month |
| GET | `/api/v1/calendar/week` | learner | 2/2s, 15/1min |  | no | yes | Get calendar events filtered by specific week starting date |

## Coins & Economy

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/coins` | learner | 2/2s, 25/1min |  | no | yes | Get coin balance overview |
| GET | `/api/v1/coins/history` | learner | 2/2s, 15/1min |  | no | yes | Get coin transaction history |
| POST | `/api/v1/coins/spend` | learner | 1/4s, 10/1min | yes | no | yes | Spend coins securely |
| GET | `/api/v1/coins/transactions` | learner | 2/2s, 15/1min |  | no | yes | Get coin transactions list |

## Course Lessons & Progress

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/courses/:courseId/lessons` | learner | global |  | no | yes | Get all lessons for a specific course |
| POST | `/api/v1/courses/:courseId/lessons` | admin | 1/3s, 15/1min | yes | no | yes | Create a new lesson under a course |
| DELETE | `/api/v1/lessons/:id` | admin | 1/5s, 5/1min |  | no | yes | Delete a lesson |
| GET | `/api/v1/lessons/:id` | learner | global |  | no | yes | Get a single lesson by ID |
| PATCH | `/api/v1/lessons/:id` | admin | 1/3s, 15/1min | yes | no | yes | Update a lesson |
| POST | `/api/v1/lessons/:id/complete` | learner | 1/2s, 20/1min | no | no | yes | Mark a lesson as completed |
| GET | `/api/v1/lessons/:id/progress` | learner | global |  | no | yes | Get student progress for a specific lesson |
| POST | `/api/v1/lessons/:id/start` | learner | 1/2s, 20/1min | no | no | yes | Mark a lesson as started |

## Courses, Topics & Enrollments

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/courses` | learner | global |  | no | yes | Retrieve all available courses |
| POST | `/api/v1/courses` | admin | 1/3s, 10/1min | yes | no | yes | Create a new course |
| DELETE | `/api/v1/courses/:courseId/enroll` | learner | 1/2s, 10/1min |  | no | yes | Unenroll the authenticated user from a course |
| POST | `/api/v1/courses/:courseId/enroll` | learner | 1/2s, 10/1min | no | no | yes | Enroll the authenticated user in a course |
| GET | `/api/v1/courses/:courseId/topics` | learner | global |  | no | yes | Get all topics belonging to a specific course |
| POST | `/api/v1/courses/:courseId/topics` | admin | 1/3s, 15/1min | yes | no | yes | Create a new topic within a course |
| DELETE | `/api/v1/courses/:id` | admin | 1/5s, 5/1min |  | no | yes | Delete a course |
| GET | `/api/v1/courses/:id` | learner | global |  | no | yes | Get a specific course by ID |
| PATCH | `/api/v1/courses/:id` | admin | 1/3s, 10/1min | yes | no | yes | Update an existing course |
| GET | `/api/v1/courses/search` | learner | global |  | no | yes | Search courses by query string, track, or level |
| DELETE | `/api/v1/topics/:id` | admin | 1/5s, 5/1min |  | no | yes | Delete a topic |
| GET | `/api/v1/topics/:id` | learner | global |  | no | yes | Get a specific topic by ID |
| PATCH | `/api/v1/topics/:id` | admin | 1/3s, 15/1min | yes | no | yes | Update an existing topic |
| GET | `/api/v1/users/me/courses` | learner | global |  | no | yes | Get current user enrolled courses |

## Examination Preparation & Past Questions

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/exam-prep` | learner | global |  | no | yes | Retrieve all exam prep plans |
| POST | `/api/v1/exam-prep` | learner | 1/3s, 10/1min | yes | no | yes | Create exam preparation plan |
| DELETE | `/api/v1/exam-prep/:id` | learner | 1/5s, 5/1min |  | no | yes | Delete exam prep plan |
| GET | `/api/v1/exam-prep/:id` | learner | global |  | no | yes | Get exam prep plan by ID |
| PATCH | `/api/v1/exam-prep/:id` | learner | 1/3s, 10/1min | no | no | yes | Update exam prep plan |
| GET | `/api/v1/examinations` | learner | global |  | no | yes | Retrieve all examination boards |
| GET | `/api/v1/examinations/:id` | learner | global |  | no | yes | Get examination board by ID |
| GET | `/api/v1/past-questions` | learner | global |  | no |  | Retrieve past questions |
| GET | `/api/v1/past-questions/:id` | learner | global |  | no | yes | Get past question by ID |
| GET | `/api/v1/past-questions/subjects` | learner | global |  | no | yes | Get distinct past question subjects |
| GET | `/api/v1/past-questions/topics` | learner | global |  | no | yes | Get distinct past question topics |
| GET | `/api/v1/past-questions/years` | learner | global |  | no | yes | Get distinct past question years |

## Examinations System

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/exams` | learner | global |  | no | yes | Retrieve all examinations |
| POST | `/api/v1/exams` | learner | 1/3s, 5/1min | yes | no | yes | Create a new examination |
| DELETE | `/api/v1/exams/:id` | learner | 1/5s, 5/1min |  | no | yes | Delete an examination |
| GET | `/api/v1/exams/:id` | learner | global |  | no | yes | Get examination by ID |
| PATCH | `/api/v1/exams/:id` | learner | 1/3s, 10/1min | yes | no | yes | Update an examination |
| GET | `/api/v1/exams/:id/readiness` | learner | global |  | no | yes | Get exam readiness score |
| GET | `/api/v1/exams/:id/result` | learner | global |  | no | yes | Get exam result |
| POST | `/api/v1/exams/:id/simulate` | learner | 1/3s, 10/1min | no | no | yes | Simulate an examination |
| POST | `/api/v1/exams/:id/start` | learner | 1/2s, 15/1min | no | no | yes | Start an exam attempt |
| POST | `/api/v1/exams/:id/submit` | learner | 1/3s, 10/1min | yes | no | yes | Submit an exam attempt |
| GET | `/api/v1/exams/attempts/:id` | learner | global |  | no | yes | Get specific exam attempt details |
| POST | `/api/v1/exams/generate` | learner | 1/3s, 10/1min | no | no | yes | Generate AI examination |
| POST | `/api/v1/exams/generate-from-course` | learner | 1/3s, 10/1min | no | no | yes | Generate exam from course |
| POST | `/api/v1/exams/generate-from-document` | learner | 1/3s, 10/1min | no | no | yes | Generate exam from document |
| GET | `/api/v1/exams/history` | learner | global |  | no | yes | Get student exam history |

## File & PDF Upload

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/files` | learner | global |  | no |  | Get all uploaded file records with optional status or MIME type filters |
| DELETE | `/api/v1/files/:id` | learner | global |  | no | yes | Delete a file record and storage artifact |
| GET | `/api/v1/files/:id` | learner | global |  | no | yes | Get file metadata record by ID |
| POST | `/api/v1/files/:id/process` | learner | 1/3s, 10/1min | no | no | yes | Trigger asynchronous parsing and indexing for an uploaded file |
| POST | `/api/v1/files/:id/reprocess` | learner | 1/3s, 10/1min | no | no | yes | Reprocess a failed or updated file |
| GET | `/api/v1/files/:id/status` | learner | global |  | no | yes | Check background processing status of a file |
| POST | `/api/v1/files/upload` | learner | 1/3s, 10/1min | no | no | yes | Upload a single course material file (PDF, DOCX, PPTX, TXT, Image) |
| POST | `/api/v1/files/upload/multiple` | learner | 1/5s, 5/1min | no | no | yes | Upload multiple course material files simultaneously |

## Flashcard Decks

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/flashcard-decks` | learner | global |  | no | yes | Retrieve all flashcard decks for the authenticated user |
| POST | `/api/v1/flashcard-decks` | learner | 1/3s, 10/1min | yes | no | yes | Create a new flashcard deck |
| DELETE | `/api/v1/flashcard-decks/:id` | learner | 1/5s, 5/1min |  | no | yes | Delete a flashcard deck |
| GET | `/api/v1/flashcard-decks/:id` | learner | global |  | no | yes | Get a specific flashcard deck by ID |
| PATCH | `/api/v1/flashcard-decks/:id` | learner | 1/3s, 10/1min | yes | no | yes | Update an existing flashcard deck |

## Flashcards

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/flashcards` | learner | global |  | no | yes | Retrieve all flashcards for the authenticated user |
| POST | `/api/v1/flashcards` | learner | 1/3s, 10/1min | yes | no | yes | Create a new flashcard |
| DELETE | `/api/v1/flashcards/:id` | learner | 1/5s, 5/1min |  | no | yes | Delete a flashcard |
| GET | `/api/v1/flashcards/:id` | learner | global |  | no | yes | Get a specific flashcard by ID |
| PATCH | `/api/v1/flashcards/:id` | learner | 1/3s, 10/1min | yes | no | yes | Update an existing flashcard |
| POST | `/api/v1/flashcards/:id/review` | learner | 1/1s, 30/1min | yes | no | yes | Submit review response for a flashcard (Leitner system progression) |
| GET | `/api/v1/flashcards/review/today` | learner | global |  | no | yes | Get flashcards due for review today (Spaced Repetition) |

## Health

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/health` | public | global |  | no |  |  |
| GET | `/api/v1/health/ai` | public | global |  | no |  |  |
| GET | `/api/v1/health/database` | public | global |  | no |  |  |
| GET | `/api/v1/health/redis` | public | global |  | no |  |  |

## Leaderboards

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/leaderboards/country` | public | 2/2s, 15/1min |  | yes | yes | Get country-specific leaderboard |
| GET | `/api/v1/leaderboards/course` | public | 2/2s, 15/1min |  | yes | yes | Get course-specific leaderboard |
| GET | `/api/v1/leaderboards/department` | public | 2/2s, 15/1min |  | yes | yes | Get department-specific leaderboard |
| GET | `/api/v1/leaderboards/friends` | learner | 2/2s, 20/1min |  | yes | yes | Get friends network leaderboard |
| GET | `/api/v1/leaderboards/global` | public | 2/2s, 15/1min |  | yes | yes | Get global XP leaderboard standings |
| GET | `/api/v1/leaderboards/me` | learner | 2/2s, 20/1min |  | yes | yes | Get authenticated user current rank and standing |
| GET | `/api/v1/leaderboards/monthly` | public | 2/2s, 15/1min |  | yes | yes | Get monthly XP leaderboard |
| GET | `/api/v1/leaderboards/school` | public | 2/2s, 15/1min |  | yes | yes | Get school-specific leaderboard |
| GET | `/api/v1/leaderboards/university` | public | 2/2s, 15/1min |  | yes | yes | Get university-specific leaderboard |
| GET | `/api/v1/leaderboards/weekly` | public | 2/2s, 15/1min |  | yes | yes | Get weekly XP leaderboard |

## Learning Progress & Mastery

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/mastery` | learner | 1/3s, 15/1min |  | no | yes | Get overall mastery metrics |
| GET | `/api/v1/mastery/courses/:id` | learner | global |  | no | yes | Get course mastery by ID |
| GET | `/api/v1/mastery/topics/:id` | learner | global |  | no | yes | Get topic mastery by ID |
| GET | `/api/v1/progress` | learner | global |  | no | yes | Get overall learning progress |
| GET | `/api/v1/progress/courses/:id` | learner | global |  | no | yes | Get course progress by ID |
| GET | `/api/v1/progress/history` | learner | global |  | no | yes | Get progress history log |
| GET | `/api/v1/progress/topics/:id` | learner | global |  | no | yes | Get topic progress by ID |
| POST | `/api/v1/progress/update` | learner | 1/2s, 20/1min | yes | no | yes | Update learning progress |

## Levels & Ranks

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/levels` | public | 2/2s, 20/1min |  | no | yes | Get all system levels and progression configuration |
| GET | `/api/v1/levels/me` | learner | 2/2s, 20/1min |  | no | yes | Get current authenticated user level and XP progress |

## Notes & Learning Materials

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/notes` | learner | global |  | no | yes | Retrieve all study notes for the authenticated user |
| POST | `/api/v1/notes` | learner | 1/3s, 10/1min | yes | no | yes | Create a new study note |
| DELETE | `/api/v1/notes/:id` | learner | 1/5s, 5/1min |  | no | yes | Delete a study note |
| GET | `/api/v1/notes/:id` | learner | global |  | no | yes | Retrieve a single study note by ID |
| PATCH | `/api/v1/notes/:id` | learner | 1/3s, 10/1min | no | no | yes | Update an existing study note |

## Notifications

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/notifications` | learner | 2/2s, 20/1min |  | no | yes | Get all notifications for the authenticated user |
| DELETE | `/api/v1/notifications/:id` | learner | 1/2s, 20/1min |  | no | yes | Delete a specific notification item |
| PATCH | `/api/v1/notifications/:id/read` | learner | 1/2s, 30/1min | no | no | yes | Mark a specific notification as read |
| PATCH | `/api/v1/notifications/read-all` | learner | 1/3s, 10/1min | no | no | yes | Mark all notifications as read for user |
| GET | `/api/v1/notifications/settings` | learner | 2/2s, 20/1min |  | no | yes | Retrieve user notification preferences and settings |
| PATCH | `/api/v1/notifications/settings` | learner | 1/3s, 15/1min | yes | no | yes | Update user notification preferences and toggles |
| DELETE | `/api/v1/notifications/token` | learner | 2/2s, 20/1min |  | no | yes | Remove push token on user logout |
| POST | `/api/v1/notifications/token` | learner | 2/2s, 20/1min | no | no | yes | Register or update device push token for mobile/web notifications |
| GET | `/api/v1/notifications/unread` | learner | 2/2s, 20/1min |  | no | yes | Get unread notifications count/list |

## Personal AI Assistant

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| POST | `/api/v1/ai/chat` | learner | 1/2s, 15/1min | yes | no | yes | Send message to AI chat assistant |
| GET | `/api/v1/ai/conversations` | learner | global |  | no | yes | List all user AI conversations |
| POST | `/api/v1/ai/conversations` | learner | global | no | no | yes | Create a new AI conversation session |
| DELETE | `/api/v1/ai/conversations/:id` | learner | global |  | no | yes | Delete AI conversation thread |
| GET | `/api/v1/ai/conversations/:id` | learner | global |  | no | yes | Get specific conversation thread by ID |
| POST | `/api/v1/ai/evaluate-answer` | learner | 1/2s, 10/1min | yes | no | yes | Evaluate user answers against grading criteria |
| POST | `/api/v1/ai/explain` | learner | 1/2s, 10/1min | yes | no | yes | Get AI explanation for a concept or snippet |
| POST | `/api/v1/ai/explain-mistake` | learner | 1/2s, 10/1min | yes | no | yes | Analyze user answer and explain mistakes |
| POST | `/api/v1/ai/generate-example` | learner | 1/2s, 10/1min | yes | no | yes | Generate real-world example for a topic |
| POST | `/api/v1/ai/generate-practice` | learner | 1/2s, 10/1min | yes | no | yes | Generate practice quiz question from text |
| POST | `/api/v1/ai/summarize` | learner | 1/2s, 10/1min | yes | no | yes | Get AI summary of study notes or text |

## Personal AI Companion

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| DELETE | `/api/v1/ai-companion` | learner | 1/5s, 5/1min |  | no | yes | Delete custom personal AI companion setup |
| GET | `/api/v1/ai-companion` | learner | global |  | no | yes | Retrieve the authenticated user custom AI companion configuration |
| PATCH | `/api/v1/ai-companion` | learner | 1/3s, 10/1min | yes | no | yes | Update personal AI companion configuration |
| POST | `/api/v1/ai-companion` | learner | 1/3s, 5/1min | yes | no | yes | Create a custom personal AI companion profile |

## Questions Bank

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/questions` | learner | global |  | no |  | Retrieve all questions |
| POST | `/api/v1/questions` | learner | 1/3s, 10/1min | yes | no | yes | Create a new question |
| DELETE | `/api/v1/questions/:id` | learner | 1/5s, 5/1min |  | no | yes | Delete a question |
| GET | `/api/v1/questions/:id` | learner | global |  | no | yes | Get a specific question by ID |
| PATCH | `/api/v1/questions/:id` | learner | 1/3s, 10/1min | yes | no | yes | Update an existing question |

## Quizzes System

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/quizzes` | learner | global |  | no | yes | Retrieve all quizzes |
| POST | `/api/v1/quizzes` | learner | 1/3s, 5/1min | yes | no | yes | Create a new quiz |
| DELETE | `/api/v1/quizzes/:id` | learner | 1/5s, 5/1min |  | no | yes | Delete a quiz |
| GET | `/api/v1/quizzes/:id` | learner | global |  | no | yes | Get quiz by ID |
| PATCH | `/api/v1/quizzes/:id` | learner | 1/3s, 10/1min | yes | no | yes | Update a quiz |
| GET | `/api/v1/quizzes/:id/results` | learner | global |  | no | yes | Get quiz results |
| POST | `/api/v1/quizzes/:id/start` | learner | 1/2s, 15/1min | no | no | yes | Start a quiz attempt |
| POST | `/api/v1/quizzes/:id/submit` | learner | 1/3s, 10/1min | yes | no | yes | Submit a quiz attempt |
| GET | `/api/v1/quizzes/attempts` | learner | global |  | no | yes | Get user quiz attempts |
| GET | `/api/v1/quizzes/attempts/:id` | learner | global |  | no | yes | Get specific quiz attempt details |
| POST | `/api/v1/quizzes/generate` | learner | 1/3s, 10/1min | no | no | yes | Generate AI quiz |
| POST | `/api/v1/quizzes/generate-from-course` | learner | 1/3s, 10/1min | no | no | yes | Generate quiz from course |
| POST | `/api/v1/quizzes/generate-from-document` | learner | 1/3s, 10/1min | no | no | yes | Generate quiz from document |
| POST | `/api/v1/quizzes/generate-from-topic` | learner | 1/3s, 10/1min | no | no | yes | Generate quiz from topic |

## Reports & Feedback

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| POST | `/api/v1/content/:id/report` | learner | 1/3s, 10/1min | yes | no | yes | Report a specific content item or material |
| POST | `/api/v1/feedback` | learner | 1/5s, 5/1min | yes | no | yes | Submit user platform feedback and rating |
| POST | `/api/v1/questions/:id/report` | learner | 1/3s, 10/1min | yes | no | yes | Report a specific question item |
| POST | `/api/v1/reports` | learner | 1/5s, 5/1min | yes | no | yes | Submit a general system or user report |
| GET | `/api/v1/reports/me` | learner | global |  | no | yes | Get reports submitted by the current authenticated user |

## Search

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/search` | learner | 2/2s, 30/1min |  | no |  | Perform a global search across all categories (courses, topics, questions, materials, users) |
| GET | `/api/v1/search/courses` | learner | 2/2s, 30/1min |  | no |  | Search specifically within courses |
| GET | `/api/v1/search/materials` | learner | 2/2s, 30/1min |  | no |  | Search specifically within study materials |
| GET | `/api/v1/search/questions` | learner | 2/2s, 30/1min |  | no |  | Search specifically within questions |
| GET | `/api/v1/search/topics` | learner | 2/2s, 30/1min |  | no |  | Search specifically within topics |
| GET | `/api/v1/search/users` | learner | 2/2s, 30/1min |  | no |  | Search specifically within users |

## Streaks

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/streak` | learner | 2/2s, 20/1min |  | no | yes | Get current streak summary |
| GET | `/api/v1/streak/calendar` | learner | 2/2s, 15/1min |  | no | yes | Get calendar check-in map |
| POST | `/api/v1/streak/check-in` | learner | 1/5s, 10/1min | yes | no | yes | Perform daily streak check-in |
| GET | `/api/v1/streak/history` | learner | 2/2s, 15/1min |  | no | yes | Get streak check-in history |
| POST | `/api/v1/streak/recover` | learner | 1/5s, 5/1min | yes | no | yes | Recover a broken streak |
| GET | `/api/v1/streak/recovery` | learner | 2/2s, 15/1min |  | no | yes | Check streak recovery availability |

## Student Library

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/library` | learner | global |  | no | yes | Get summary overview of student library items |
| GET | `/api/v1/library/courses` | learner | global |  | no | yes | Get all saved courses in student library |
| DELETE | `/api/v1/library/courses/:courseId` | learner | 1/2s, 20/1min |  | no | yes | Remove a saved course from the library |
| POST | `/api/v1/library/courses/:courseId` | learner | 1/2s, 20/1min | no | no | yes | Save a course to the student library |
| GET | `/api/v1/library/exams` | learner | global |  | no | yes | Get all saved exams in student library |
| DELETE | `/api/v1/library/favorites/:id` | learner | 1/2s, 20/1min |  | no | yes | Remove an item from library favorites |
| POST | `/api/v1/library/favorites/:id` | learner | 1/2s, 20/1min | yes | no | yes | Add an item to library favorites |
| GET | `/api/v1/library/materials` | learner | global |  | no | yes | Get all saved study materials in student library |
| GET | `/api/v1/library/quizzes` | learner | global |  | no | yes | Get all saved quizzes in student library |
| GET | `/api/v1/library/tests` | learner | global |  | no | yes | Get all saved tests in student library |
| GET | `/api/v1/library/topics` | learner | global |  | no | yes | Get all saved topics in student library |

## Study Goals

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/goals` | learner | 2/2s, 20/1min |  | no | yes | Retrieve all study goals |
| POST | `/api/v1/goals` | learner | 1/3s, 10/1min | yes | no | yes | Create a new study goal |
| DELETE | `/api/v1/goals/:id` | learner | 1/5s, 10/1min |  | no | yes | Delete a study goal |
| GET | `/api/v1/goals/:id` | learner | 2/2s, 25/1min |  | no | yes | Get study goal by ID |
| PATCH | `/api/v1/goals/:id` | learner | 1/3s, 15/1min | yes | no | yes | Update a study goal |
| POST | `/api/v1/goals/:id/complete` | learner | 1/3s, 10/1min | no | no | yes | Mark goal as complete |
| GET | `/api/v1/goals/:id/progress` | learner | 2/2s, 25/1min |  | no | yes | Get goal progress metrics |

## Study Sessions

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/study-sessions` | learner | global |  | no | yes | Retrieve all study sessions |
| POST | `/api/v1/study-sessions/:id/complete` | learner | 1/2s, 15/1min | no | no | yes | Complete a study session |
| POST | `/api/v1/study-sessions/:id/pause` | learner | 1/1s, 30/1min | no | no | yes | Pause an active study session |
| POST | `/api/v1/study-sessions/:id/resume` | learner | 1/1s, 30/1min | no | no | yes | Resume a paused study session |
| GET | `/api/v1/study-sessions/history` | learner | global |  | no | yes | Get completed study session history |
| POST | `/api/v1/study-sessions/start` | learner | 1/2s, 15/1min | yes | no | yes | Start a live study session |
| GET | `/api/v1/study-sessions/stats` | learner | global |  | no | yes | Get overall study time statistics |
| GET | `/api/v1/study-sessions/today` | learner | global |  | no | yes | Get today study sessions and totals |

## Subscriptions & Payments

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| POST | `/api/v1/payments/initialize` | learner | 1/5s, 5/1min | yes | no | yes | Initialize a payment transaction (e.g. Paystack / Flutterwave) |
| POST | `/api/v1/payments/verify` | learner | 1/3s, 10/1min | yes | no | yes | Verify a payment transaction reference |
| POST | `/api/v1/payments/webhook` | public | global | no | no | yes | Payment gateway webhook listener |
| GET | `/api/v1/plans` | public | global |  | no | yes | Get available subscription plans |
| GET | `/api/v1/subscription` | learner | global |  | no | yes | Get current user active subscription details |
| POST | `/api/v1/subscription/cancel` | learner | 1/5s, 5/1min | no | no | yes | Cancel current active subscription |
| GET | `/api/v1/subscription/history` | learner | global |  | no | yes | Get user subscription and billing history |
| POST | `/api/v1/subscription/subscribe` | learner | 1/5s, 5/1min | yes | no | yes | Subscribe to a plan |
| POST | `/api/v1/subscription/upgrade` | learner | 1/5s, 5/1min | yes | no | yes | Upgrade current subscription plan |

## Tests & Assessments System

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/tests` | learner | global |  | no | yes | Retrieve all tests |
| POST | `/api/v1/tests` | learner | 1/3s, 5/1min | yes | no | yes | Create a new test |
| DELETE | `/api/v1/tests/:id` | learner | 1/5s, 5/1min |  | no | yes | Delete a test |
| GET | `/api/v1/tests/:id` | learner | global |  | no | yes | Get test by ID |
| PATCH | `/api/v1/tests/:id` | learner | 1/3s, 10/1min | yes | no | yes | Update a test |
| GET | `/api/v1/tests/:id/results` | learner | global |  | no | yes | Get test results |
| POST | `/api/v1/tests/:id/start` | learner | 1/2s, 15/1min | no | no | yes | Start a test attempt |
| POST | `/api/v1/tests/:id/submit` | learner | 1/3s, 10/1min | yes | no | yes | Submit a test attempt |
| GET | `/api/v1/tests/attempts` | learner | global |  | no | yes | Get user test attempts |
| GET | `/api/v1/tests/attempts/:id` | learner | global |  | no | yes | Get specific test attempt details |
| POST | `/api/v1/tests/generate` | learner | 1/3s, 10/1min | no | no | yes | Generate AI test |
| POST | `/api/v1/tests/generate-from-course` | learner | 1/3s, 10/1min | no | no | yes | Generate test from course |
| POST | `/api/v1/tests/generate-from-document` | learner | 1/3s, 10/1min | no | no | yes | Generate test from document |

## Usage Limits

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/usage` | learner | 2/2s, 20/1min |  | no | yes | Get overall account usage overview and quotas |
| GET | `/api/v1/usage/ai` | learner | 2/2s, 20/1min |  | no | yes | Get AI generation usage and daily limits |
| GET | `/api/v1/usage/documents` | learner | 2/2s, 20/1min |  | no | yes | Get document generation and upload usage metrics |
| GET | `/api/v1/usage/quizzes` | learner | 2/2s, 20/1min |  | no | yes | Get quiz generation and attempt usage stats |

## Users & Profile

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/users/:username` | public | 2/2s, 30/1min |  | no | yes | Get public profile details by username |
| GET | `/api/v1/users/:username/achievements` | public | 2/2s, 30/1min |  | no | yes | Get unlocked badges and achievements for a user |
| GET | `/api/v1/users/:username/stats` | public | 2/2s, 30/1min |  | no | yes | Get learning stats, streak counts, and activity metrics |
| DELETE | `/api/v1/users/me` | learner | 1/5s, 5/1min |  | no | yes | Soft delete current user account (requires { password }; data is retained) |
| GET | `/api/v1/users/me` | learner | global |  | no | yes | Get current authenticated user profile |
| PATCH | `/api/v1/users/me` | learner | 1/3s, 15/1min | yes | no | yes | Update basic authenticated user details |
| PATCH | `/api/v1/users/me/academic-profile` | learner | 1/3s, 15/1min | yes | no | yes | Update academic profile (Secondary or University details) |
| POST | `/api/v1/users/me/freeze` | learner | 1/5s, 5/1min | no | no | yes | Freeze current user account temporarily |
| PATCH | `/api/v1/users/me/notification-preferences` | learner | 1/3s, 15/1min | no | no | yes | Update push/email notification settings |
| PATCH | `/api/v1/users/me/preferences` | learner | 1/3s, 15/1min | yes | no | yes | Update learning preferences and study times |
| PATCH | `/api/v1/users/me/privacy-settings` | learner | 1/3s, 15/1min | no | no | yes | Update profile visibility and privacy controls |
| DELETE | `/api/v1/users/me/profile-picture` | learner | 1/3s, 10/1min |  | no | yes | Remove profile picture |
| POST | `/api/v1/users/me/profile-picture` | learner | 1/3s, 10/1min | no | no | yes | Upload or update profile picture |
| POST | `/api/v1/users/me/unfreeze` | learner | 1/5s, 5/1min | no | no | yes | Unfreeze current user account |

## Voice AI

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| POST | `/api/v1/ai/voice/respond` | learner | global | no | no | yes | Process speech text to generate conversational AI responses |
| POST | `/api/v1/ai/voice/synthesize` | learner | global | no | no | yes | Synthesize text answers back into audio streams/metadata |
| POST | `/api/v1/ai/voice/transcribe` | learner | global | no | no | yes | Transcribe recorded audio clips to text |

## XP & Gamification

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/xp` | learner | 2/2s, 20/1min |  | no | yes | Get XP Overview |
| POST | `/api/v1/xp/award` | admin | 1/3s, 10/1min | yes | no | yes | Award XP to User (Admin) |
| GET | `/api/v1/xp/history` | learner | 2/2s, 15/1min |  | no | yes | Get XP History |
| GET | `/api/v1/xp/level` | learner | 2/2s, 20/1min |  | no | yes | Get Level Details |
| GET | `/api/v1/xp/transactions` | learner | 2/2s, 15/1min |  | no | yes | Get XP Transactions |

## YouTube Learning Material

| Method | Path | Auth | Throttle | Body | Resp | FE | Summary |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/youtube` | learner | global |  | no | yes | Get all YouTube resources submitted by the user |
| POST | `/api/v1/youtube` | learner | global | yes | no | yes | Submit a YouTube video URL for learning pipeline conversion |
| DELETE | `/api/v1/youtube/:id` | learner | global |  | no | yes | Delete a submitted YouTube resource |
| GET | `/api/v1/youtube/:id` | learner | global |  | no | yes | Get details and structured material of a specific YouTube resource |
| POST | `/api/v1/youtube/:id/process` | learner | global | no | no | yes | Trigger transcription and OpenAI structuring for a YouTube video |
| POST | `/api/v1/youtube/:id/reprocess` | learner | global | no | no | yes | Reprocess a failed or outdated YouTube resource |
| GET | `/api/v1/youtube/:id/status` | learner | global |  | no | yes | Check processing status of a YouTube resource |
