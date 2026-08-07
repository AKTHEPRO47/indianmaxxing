# Neelaansh Contribution Area

Neelaansh owns login, account identity, and session security. The source stays in the shared runnable application to preserve the frontend route tree and Express middleware flow.

## Source ownership

- `frontend/src/pages/LoginPage.tsx`, `RegisterPage.tsx`, `ForgotPasswordPage.tsx`, and `ResetPasswordPage.tsx`
- `frontend/src/context/AuthContext.tsx` and `frontend/src/components/ProtectedRoute.tsx`
- `backend-node/src/routes/auth.js`, `backend-node/src/routes/account.js`, and `backend-node/src/middleware/auth.js`
- `backend-node/src/utils/security.js` and the `User`, `UserSession`, and `PasswordResetToken` Prisma models

## Evidence

Brief documentation and focused tests are in `docs/Neelaansh/` and `tests/Neelaansh/`.