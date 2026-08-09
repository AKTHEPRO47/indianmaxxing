# Neelaansh Use Cases: Authentication and Account Security

## Scope

This document covers the authentication and account-security features implemented by the active Node backend in `backend-node/`.

## Roles

| Role | Goal | Access |
|---|---|---|
| Visitor | Create an account, sign in, recover access, or use Google sign-in. | Public `/auth` routes subject to rate limits. |
| Authenticated user | View profile, change password, manage 2FA, and revoke sessions. | Routes guarded by `requireAuth`. |
| Administrator | Manage platform users through the separate administration routes. | Admin-only routes; not covered by this authentication flow. |

## UC-AUTH-01: Register an Account

**Actor:** Visitor  
**Trigger:** The visitor submits an email, password, and optional profile preferences.

1. The system requires an email and a password of at least eight characters.
2. The email is normalized to lowercase.
3. The system rejects an existing email with `409`.
4. The password is hashed before persistence.
5. The system stores a hashed email-verification token and attempts non-blocking verification-email delivery.
6. The system creates an HTTP-only session cookie and returns the safe user profile with `201`.

**Edge cases:** missing fields or a short password return `400`; duplicate emails return `409`; rate-limited requests return `429`.

## UC-AUTH-02: Sign In and Sign Out

**Actor:** Visitor or authenticated user  
**Trigger:** A user submits login credentials or requests logout.

1. Login normalizes the email and verifies the stored password hash.
2. Disabled, unknown, or invalid accounts receive a generic `401` response.
3. A successful login creates a server-side session record and sends the raw session token only as an HTTP-only cookie.
4. Logout hashes the presented cookie token, marks the corresponding session as revoked, and clears the cookie.

**Edge cases:** missing login fields return `400`; no valid session on logout returns `401`.

## UC-AUTH-03: Sign In with Google

**Actor:** Visitor  
**Trigger:** The frontend submits a Google ID credential.

1. The service rejects a missing credential with `400`.
2. The Google token is verified against the configured Google client ID.
3. The system creates a user for a new Google identity or links the Google subject to an existing account with the same email.
4. An inactive account is rejected with `403`; otherwise a regular HTTP-only session is issued.

**Edge cases:** absent Google configuration returns `503`; failed token verification returns `401`; a Google response without email returns `400`.

## UC-AUTH-04: Recover and Reset a Password

**Actor:** Visitor  
**Trigger:** The visitor requests password recovery or submits a reset token and new password.

1. The recovery endpoint always returns a generic success message to avoid email enumeration.
2. For an active matching user, a random token is created, only its hash is stored, and it expires after 24 hours.
3. Reset requires a valid, unused, non-expired token and a password of at least eight characters.
4. Reset updates the password hash, marks the reset token used, and revokes every active user session in one transaction.
5. The user signs in again with the new password.

**Edge cases:** missing data, a short password, invalid token, used token, or expired token return `400`.

## UC-AUTH-05: Verify Email and Change Password

**Actor:** Visitor or authenticated user  
**Trigger:** A user follows an email verification link or changes their password while signed in.

1. Email verification hashes the submitted token and finds the matching pending verification record.
2. On success, the account is marked verified and the verification token is removed.
3. Password changes require the current password when a password hash exists.
4. The new password must have at least eight characters before its replacement hash is saved.

**Edge cases:** invalid/used verification tokens return `400`; an incorrect current password returns `401`.

## UC-AUTH-06: Enable and Disable Two-Factor Authentication

**Actor:** Authenticated user  
**Trigger:** The user chooses to set up or disable TOTP-based 2FA.

1. Setup creates a TOTP secret and returns a QR-code data URL for the authenticated user.
2. Verification accepts a current TOTP code with a one-step time window.
3. A valid code enables 2FA; an invalid code returns `400`.
4. Disable clears both the enabled flag and stored TOTP secret.

**Edge cases:** verification before setup returns `400`; all 2FA routes require authentication and return `401` without a valid session.

## UC-AUTH-07: Manage Active Sessions

**Actor:** Authenticated user  
**Trigger:** The user opens session management or revokes a session.

1. The system returns only the user’s unrevoked, unexpired sessions, newest first.
2. Session metadata includes device user agent, IP address, creation time, and expiry time; token hashes are never returned.
3. The user can revoke only a session that belongs to that user.

**Edge cases:** unauthenticated requests return `401`; a non-owned or already-revoked session is not changed.