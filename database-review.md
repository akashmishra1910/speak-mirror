# Database Review & Performance Audit

This document reviews the Supabase database schema and recommends optimization strategies for production scaling.

---

## 1. Indexing Strategy Analysis

To guarantee quick query responses as our tables grow, we analyzed high-frequency queries and recommended the following secondary indexes:

### Critical Indexes Required:

1. **`recordings` Table Queries**
   - **Common Query**: `SELECT * FROM recordings WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10;`
   - **Recommended Index**:
     ```sql
     CREATE INDEX IF NOT EXISTS idx_recordings_user_id_created_at
     ON recordings(user_id, created_at DESC);
     ```

2. **Room Shared Recordings**
   - **Common Query**: `SELECT * FROM recordings WHERE room_id = $1 ORDER BY created_at DESC;`
   - **Recommended Index**:
     ```sql
     CREATE INDEX IF NOT EXISTS idx_recordings_room_id
     ON recordings(room_id);
     ```

3. **Room Members Search**
   - **Common Query**: Checking user memberships across multiple rooms.
   - **Recommended Index**:
     ```sql
     CREATE INDEX IF NOT EXISTS idx_room_members_user_id
     ON room_members(user_id);
     ```
     *(Note: The primary key already covers `(room_id, user_id)`, indexing searches by `room_id` automatically).*

---

## 2. Integrity Constraints & Cascades

### Cascade Deletions:
- When a user profile is deleted, their recordings must be cleaned up to save database space.
- Foreign Key constraint on `recordings.user_id` should use `ON DELETE CASCADE`.
- Junction table `room_members` foreign keys must use `ON DELETE CASCADE` on both `room_id` and `user_id` to prevent dangling references.

---

## 3. Query Execution & Connection Pooling

- **Client Queries**: Always paginate query streams using `.range(from, to)` instead of fetching full arrays.
- **Connection Limits**: Next.js serverless functions connect using the Supabase pooler (port 6543) instead of direct database connections (port 5432) to prevent connection pool exhaustion during traffic spikes.
