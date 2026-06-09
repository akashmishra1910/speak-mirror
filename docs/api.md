# API Reference

All SpeakMirror backend endpoints are located under `/api/*` and return standard JSON envelopes conforming to:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

---

## 1. Authentication Gateways

All endpoints (except `/api/cron/reminders` which uses bearer token authorization) require a valid Supabase user session (via Cookie or Bearer header).

---

## 2. Endpoint Specifications

### GET `/api/admin`
Retrieve admin statistics, active users, and system status.
- **Headers**: `Authorization: Bearer <JWT>` (Must have `role: admin` in app_metadata)
- **Query Params**:
  - `action`: `"stats" | "users" | "feedback" | "tasks" | "tickets"` (Required)
- **Success Status**: `200 OK`
- **Error Statuses**: `401 Unauthorized`, `403 Forbidden`, `400 Bad Request`

### POST `/api/admin`
Pre-generate speaking topics using AI.
- **Headers**: Same as GET.
- **Body**:
  ```json
  {
    "action": "generate-topics",
    "count": 5
  }
  ```
- **Success Status**: `200 OK`

---

### POST `/api/analyze`
Analyze recorded audio files for speech metrics and transcripts.
- **Body**:
  ```json
  {
    "audioBase64": "data:audio/webm;base64,...",
    "topic": "The generated topic string",
    "expectedWord": "assertive",
    "expectedIdiom": "beat around the bush"
  }
  ```
- **Success Status**: `200 OK`
- **Error Statuses**: `400 Bad Request`, `401 Unauthorized`, `500 Internal Server Error`

---

### GET `/api/cron/reminders`
Invoked via Vercel Cron or GitHub Actions to dispatch speaking streaks reminders.
- **Headers**: `Authorization: Bearer <CRON_SECRET>`
- **Success Status**: `200 OK`

---

### DELETE `/api/delete-recording`
Delete a speech recording record and its associated video file from storage.
- **Query Params**:
  - `recordingId`: UUID (Required)
  - `roomId`: UUID (Optional)
- **Success Status**: `200 OK`

---

### POST `/api/generate-task`
Generate structural assignments and coach scripts based on target metrics.
- **Body**:
  ```json
  {
    "title": "Boardroom Pitch",
    "prompt": "Pitch a SaaS product in 60 seconds",
    "expectedWord": "scaling",
    "expectedIdiom": "low-hanging fruit",
    "timeLimit": 60
  }
  ```
- **Success Status**: `200 OK`

---

### GET `/api/generate-topic`
Generate a speaking prompt using user history and difficulty rules.
- **Query Params**:
  - `level`: `"beginner" | "intermediate" | "advanced"` (Optional)
- **Success Status**: `200 OK`

---

### POST `/api/notify-team`
Deliver email notifications to team members regarding assignment progress.
- **Body**:
  ```json
  {
    "roomId": "UUID",
    "roomName": "Sales Masterminds",
    "task": "Pitching Practice"
  }
  ```
- **Success Status**: `200 OK`

---

### GET `/api/room-members`
Fetch member list of a collaboration room.
- **Query Params**:
  - `roomId`: UUID (Required)
- **Success Status**: `200 OK`

---

### GET `/api/room-recordings`
Query all shared recordings uploaded to a room.
- **Query Params**:
  - `roomId`: UUID (Required)
- **Success Status**: `200 OK`

---

### POST `/api/video`
Obtain pre-signed S3/Supabase storage URLs for uploading video files directly.
- **Body**:
  ```json
  {
    "fileName": "my-speech.webm",
    "contentType": "video/webm"
  }
  ```
- **Success Status**: `200 OK`
