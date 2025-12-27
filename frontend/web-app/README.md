# NovaMart Web App

Primary customer-facing web application.

- Tech stack: React or Next.js (TypeScript)
- Features:
  - Browsing products and categories
  - Personalized recommendations integration
  - Cart and checkout flows
- Security:
  - Auth via NextAuth (AWS Cognito by default)
  - Optional local demo login (Credentials + JWT)
  - Sends Bearer JWTs with backend requests

## Local JWT auth (no AWS)

- Set `NEXT_PUBLIC_AUTH_MODE=local` (and optionally `AUTH_MODE=local`) in `frontend/web-app/.env.local`.
- Use the built-in demo user from `frontend/web-app/local-users.json` via `/signin`.
