# Security Architecture

This document describes the security protocols, policies, and practices implemented in **SpeakMirror**.

## 1. Authentication & RBAC

All backend API routes and database queries are secured using a defense-in-depth model combining Next.js API guards and PostgreSQL Row-Level Security (RLS).

### API Route Guards (`src/lib/auth.ts`)
- **`requireAuth(request)`**: Verifies that the incoming request contains a valid JWT session in either the HTTP Cookie (`sb-access-token`) or the `Authorization: Bearer <token>` header. If invalid, it immediately terminates with a `401 Unauthorized` response.
- **`requireAdmin(request)`**: Validates the JWT metadata claims. Only accounts marked with `role: admin` are permitted to pass. If a non-admin attempts access, it yields a `403 Forbidden` response.

---

## 2. Input Validation (Zod Schemas)

To eliminate parsing errors, parameter pollution, and malicious payloads, all client requests sent to `/api/*` are validated through standard Zod schemas (`src/lib/validation.ts`):
- All request parameters (query params or JSON bodies) must match the strict schemas.
- Extra parameters are stripped automatically, blocking parameter injection.
- Failures trigger an immediate `400 Bad Request` with type-safe, user-friendly error messages.

---

## 3. Secure HTTP Headers

We set strict HTTP security headers in `next.config.ts` to defend against attacks in the browser:

```typescript
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net; ...",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=()",
  }
];
```

### Protection Summary:
- **XSS Prevention**: Strict Content Security Policy (CSP) limits scripts execution sources.
- **Clickjacking Protection**: `X-Frame-Options: DENY` stops the app from being embedded inside unauthorized external `<iframe>` blocks.
- **MIME Sniffing Prevention**: `X-Content-Type-Options: nosniff` stops browsers from running non-executable files as scripts.
- **Camera & Mic Privacy**: `Permissions-Policy` restricts microphone and camera usage to the app's origin only.

---

## 4. Supabase RLS Policies

Database connections are executed through Row-Level Security:
- Service-role admin client (`supabaseAdmin`) is restricted to server-side tasks.
- Public client uses the authenticated user's JWT context, ensuring database queries automatically filter rows without relying on client-supplied filters.
