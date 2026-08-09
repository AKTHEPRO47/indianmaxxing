# Neelaansh API Documentation: Authentication

## Conventions

- Development base URL: `http://localhost:8000`
- Production browser requests are sent through the frontend `/api` proxy.
- Authentication uses the `tricard_session` HTTP-only cookie.
- Auth requests are rate-limited.
- Success responses expose safe profile fields only; password hashes and raw tokens are never returned.

## Public Endpoints

| Method | Endpoint | Request example | Success | Common errors |
|---|---|---|---|---|
| POST | `/auth/register` | `{"email":"investor@example.com","password":"correct-horse-battery-staple","full_name":"Ada"}` | `201` user and session cookie | `400`, `409`, `429`, `500` |
| POST | `/auth/login` | `{"email":"investor@example.com","password":"correct-horse-battery-staple"}` | `200` user and session cookie | `400`, `401`, `429`, `500` |
| POST | `/auth/google` | `{"credential":"<google-id-token>"}` | `200` user and session cookie | `400`, `401`, `403`, `429`, `503`, `500` |
| POST | `/auth/forgot-password` | `{"email":"investor@example.com"}` | `200` generic recovery response | `400`, `429`, `500` |
| POST | `/auth/reset-password` | `{"token":"<reset-token>","password":"new-secure-password"}` | `200` reset confirmation | `400`, `429`, `500` |
| GET | `/auth/verify-email?token=<token>` | Query token from verification link | `200` verification confirmation | `400`, `500` |

## Authenticated Endpoints

| Method | Endpoint | Request example | Success | Common errors |
|---|---|---|---|---|
| GET | `/auth/me` | Cookie-authenticated request | `200` current user profile | `401`, `500` |
| POST | `/auth/logout` | Cookie-authenticated request | `200` and cleared cookie | `401`, `500` |
| POST | `/auth/change-password` | `{"current_password":"old-password","new_password":"new-secure-password"}` | `200` confirmation | `400`, `401`, `500` |
| POST | `/auth/2fa/setup` | No request body | `200` TOTP secret and QR-code data URL | `401`, `500` |
| POST | `/auth/2fa/verify` | `{"token":"123456"}` | `200` 2FA enabled | `400`, `401`, `500` |
| POST | `/auth/2fa/disable` | No request body | `200` 2FA disabled | `401`, `500` |
| GET | `/auth/sessions` | Cookie-authenticated request | `200` active-session list | `401`, `500` |
| DELETE | `/auth/sessions/:sessionId` | `DELETE /auth/sessions/12` | `200` revocation confirmation | `401`, `500` |

## Example: Register

```http
POST /auth/register
Content-Type: application/json

{
  "email": "investor@example.com",
  "password": "correct-horse-battery-staple",
  "full_name": "Ada Investor",
  "investing_style": "balanced"
}
```

The response sets the `tricard_session` cookie with `HttpOnly`; production settings also enable `Secure` and use the configured `SameSite` policy.

## Example: Read Active Sessions

```http
GET /auth/sessions
Cookie: tricard_session=<session-token>
```

```json
[
  {
    "id": 12,
    "user_agent": "Mozilla/5.0",
    "ip_address": "203.0.113.10",
    "created_at": "2026-08-09T10:00:00.000Z",
    "expires_at": "2026-09-08T10:00:00.000Z"
  }
]
```

## Security Behavior

- Passwords are stored as PBKDF2 hashes.
- Session, reset, and verification tokens are persisted only as SHA-256 hashes.
- Password reset revokes all active sessions.
- The password-recovery response does not disclose whether an email exists.
- Protected endpoints use `requireAuth`; anonymous requests receive `401`.