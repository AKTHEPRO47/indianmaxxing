# Neelaansh Authentication Documentation

## Scope

Email/password registration and login, secure cookie sessions, Google sign-in, password reset, email verification, TOTP 2FA, active-session management, and protected frontend routing.

## Main endpoints

| Method | Endpoint | Success | Common errors |
|---|---|---|---|
| POST | `/auth/register` | `201` and session cookie | `400` invalid data, `409` existing email, `429` rate-limited |
| POST | `/auth/login` | `200` and session cookie | `400` missing credentials, `401` invalid/deactivated account, `429` rate-limited |
| POST | `/auth/logout` | `200` and session revoked | `401` no valid session |
| GET | `/auth/me` | `200` current profile | `401` no valid session |
| POST | `/auth/forgot-password` | `200` generic confirmation | `400` missing email |
| POST | `/auth/reset-password` | `200` password updated | `400` invalid/expired token or weak password |

### Example login

```http
POST /auth/login
Content-Type: application/json

{"email":"investor@example.com","password":"correct-horse-battery-staple"}
```

The response sets the `tricard_session` HTTP-only, SameSite=Lax cookie. The raw session token is not persisted; only its SHA-256 hash is stored.

## Tests

`npm --prefix backend-node run test:unit` runs `tests/Neelaansh/authentication-security.test.js`, confirming password verification and token hashing behavior.