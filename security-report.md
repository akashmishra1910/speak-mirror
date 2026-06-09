# Security Audit Report

This report outlines the security posture of **SpeakMirror**, detailing risk mitigations, defense mechanisms, and policy verifications.

---

## 1. Vulnerability Audit

| Threat Category | Risk Level | Mitigation Mechanism | Status |
| --- | --- | --- | --- |
| **Cross-Site Scripting (XSS)** | Low | React auto-escaping, strict Content Security Policy (CSP) headers. | Verified |
| **Cross-Site Request Forgery (CSRF)** | Low | Custom header checks for REST endpoints, secure cookie flags (`SameSite=Lax`). | Verified |
| **SQL Injection** | Low | Supabase JS client parameterized queries (PostgREST) + server-side Zod validators. | Verified |
| **Insecure Uploads** | Medium | Restricted pre-signed upload URLs with strict content-type and size limits (100MB). | Verified |

---

## 2. API Security Gates

All API routes under `src/app/api` have been updated to prevent data leakage and administrative bypass:

- **Authentication Guard**: Custom cookie parser rejects calls without a valid JWT signature.
- **RBAC (Role-Based Access Control)**: Admin actions `/api/admin` verify `user.app_metadata.role === 'admin'`.
- **Validation Filtering**: All request payloads are passed through strict Zod validators, filtering out undeclared keys.

---

## 3. Database RLS Coverage

All active SQL tables possess Row-Level Security policies:
- User-specific data (`recordings`, `profiles`) is walled off via:
  ```sql
  CREATE POLICY "Users can edit own recordings" ON recordings
  FOR ALL TO authenticated USING (auth.uid() = user_id);
  ```
- Workspace teams enforce membership queries:
  ```sql
  CREATE POLICY "Members can view room content" ON rooms
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM room_members 
      WHERE room_members.room_id = id AND room_members.user_id = auth.uid()
    )
  );
  ```
