# gleamLearn Backend API Documentation

The official backend API specification and endpoint documentation for the **myCoursea** multi-track academic infrastructure platform. Built with **NestJS**, **TypeORM**, and **PostgreSQL**, this platform supports both Secondary (JSS/SSS) and University (100L–600L) academic structures, complete course catalogs, dynamic topic management, and student enrollments.

---

## Technical Stack & Architecture
* **Framework:** NestJS (Node.js)
* **Database & ORM:** PostgreSQL with TypeORM (using asynchronous configuration and ESM-compatible string-based entity references to prevent circular dependencies)
* **Documentation:** Swagger / OpenAPI 3.0 (`/api`)
* **Validation & DTOs:** `class-validator` & `class-transformer`

---

## Base URL & Configuration
* **Local Base URL:** `http://localhost:3000`
* **Swagger UI Documentation:** `http://localhost:3000/api`

---

## API Endpoints Reference

### 1. Authentication & Onboarding (`/api/v1/auth`)
Handles user registration, session tokens, email verification, and password management.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/signup` | Register a new user account |
| `POST` | `/api/v1/auth/login` | Authenticate user and return access/refresh tokens |
| `POST` | `/api/v1/auth/logout` | Log out current user session |
| `POST` | `/api/v1/auth/refresh-token` | Generate a new access token using a refresh token |
| `POST` | `/api/v1/auth/verify-email` | Verify user email address via token |
| `POST` | `/api/v1/auth/resend-verification` | Resend email verification token |
| `POST` | `/api/v1/auth/forgot-password` | Initiate password reset process |
| `POST` | `/api/v1/auth/reset-password` | Complete password reset using token |
| `POST` | `/api/v1/auth/change-password` | Change password for authenticated user |
| `GET` | `/api/v1/auth/me` | Get profile details of authenticated user |
| `PATCH` | `/api/v1/auth/me` | Update profile details of authenticated user |

---

### 2. Users & Profile Management (`/api/v1/users`)
Manages personal user settings, academic profiles, preferences, privacy, and public discovery.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/users/me` | Get current authenticated user profile |
| `PATCH` | `/api/v1/users/me` | Update basic authenticated user details |
| `DELETE` | `/api/v1/users/me` | Deactivate or delete current user account |
| `POST` | `/api/v1/users/me/profile-picture` | Upload or update profile picture |
| `DELETE` | `/api/v1/users/me/profile-picture` | Remove profile picture |
| `PATCH` | `/api/v1/users/me/academic-profile` | Update academic profile (Secondary or University details) |
| `PATCH` | `/api/v1/users/me/preferences` | Update learning preferences and study times |
| `PATCH` | `/api/v1/users/me/notification-preferences` | Update push/email notification settings |
| `PATCH` | `/api/v1/users/me/privacy-settings` | Update profile visibility and privacy controls |
| `GET` | `/api/v1/users/{username}` | Get public profile details by username |
| `GET` | `/api/v1/users/{username}/achievements` | Get unlocked badges and achievements for a user |
| `GET` | `/api/v1/users/{username}/stats` | Get learning stats, streak counts, and activity metrics |

---

### 3. Academic Structure & Levels (`/api/v1/academic-levels`)
Provides standardized academic metadata constraints for secondary and university tracks.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/academic-levels` | Get standardized academic levels (JSS1–SS3, 100L–600L) and streams (Science, Arts, Commercial) |

---

### 4. Academic Management (`/api/v1`)
Dynamic CRUD operations for institutions, faculties, and departments mapped in a hierarchical structure.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/institutions` | Get all institutions with faculties and departments |
| `POST` | `/api/v1/institutions` | Create a new institution |
| `PATCH` | `/api/v1/institutions/{id}` | Update an institution |
| `DELETE` | `/api/v1/institutions/{id}` | Delete an institution |
| `GET` | `/api/v1/faculties` | Get all faculties |
| `POST` | `/api/v1/faculties` | Create a new faculty |
| `PATCH` | `/api/v1/faculties/{id}` | Update a faculty |
| `DELETE` | `/api/v1/faculties/{id}` | Delete a faculty |
| `GET` | `/api/v1/departments` | Get all departments |
| `POST` | `/api/v1/departments` | Create a new department |
| `PATCH` | `/api/v1/departments/{id}` | Update a department |
| `DELETE` | `/api/v1/departments/{id}` | Delete a department |

---

### 5. Courses, Topics & Enrollments (`/api/v1`)
Manages the curriculum catalog, nested chapter/topic structures, and student course enrollments.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/courses/search` | Search courses by query string (`q`), track, or level |
| `GET` | `/api/v1/users/me/courses` | Get current user enrolled courses and progress |
| `GET` | `/api/v1/courses` | Retrieve all courses in the catalog |
| `POST` | `/api/v1/courses` | Create a new course |
| `GET` | `/api/v1/courses/{id}` | Get course details by ID (including topics and department) |
| `PATCH` | `/api/v1/courses/{id}` | Update course information |
| `DELETE` | `/api/v1/courses/{id}` | Delete a course |
| `GET` | `/api/v1/courses/{courseId}/topics` | Get all ordered topics for a specific course |
| `POST` | `/api/v1/courses/{courseId}/topics` | Create a new topic under a course |
| `GET` | `/api/v1/topics/{id}` | Get topic details by ID |
| `PATCH` | `/api/v1/topics/{id}` | Update a topic |
| `DELETE` | `/api/v1/topics/{id}` | Delete a topic |
| `POST` | `/api/v1/courses/{courseId}/enroll` | Enroll the authenticated user in a course |
| `DELETE` | `/api/v1/courses/{courseId}/enroll` | Unenroll the authenticated user from a course |
