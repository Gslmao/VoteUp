<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Election System Backend — Complete Implementation Guide

## Overview

A production-ready election voting backend built with **Next.js 16 (App Router)** + **PostgreSQL**. All business logic resides in PostgreSQL stored procedures/views; API routes are thin, validated callers. Designed for atomic integrity, horizontal scalability, and secure authentication.

---

## Architecture Principles

1. **Database-First Integrity** — `cast_vote` uses `EXCEPTION WHEN unique_violation` for atomic double-vote prevention. No application-level checks.
2. **Single Connection Pool** — One `pg.Pool` instance (global singleton) reused across all requests.
3. **Validation at Boundary** — Every route validates input with Zod before touching the database.
4. **Thin API Layer** — Routes: validate → call procedure/view → return JSON. Zero business logic.
5. **Dual-Audience JWT** — Admin tokens (default audience) and voter tokens (`audience='voter'`) share secret but cannot cross-use.
6. **HttpOnly Cookies** — Sessions via secure cookies; Bearer header also accepted for API clients.

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router, TypeScript) | 16.3.8 |
| Database | PostgreSQL (via `pg`) | 8.16.3 |
| Auth | JWT HS256 via `jose` | 6.2.12 |
| Password Hashing | `bcrypt` | 6.0.0 (cost 12) |
| Validation | `zod` | 4.6.5 |
| Runtime | Node.js (`export const runtime = 'nodejs'`) | 20+ |

---

## Project Structure

```
src/
├── app/api/
│   ├── voters/route.ts                    # POST register voter + set voter session cookie
│   ├── candidates/route.ts                # GET list, POST create (admin)
│   ├── elections/route.ts                 # GET ongoing elections
│   ├── elections/[id]/results/route.ts    # GET results leaderboard (opt. constituency filter)
│   ├── vote/route.ts                      # POST cast_vote (voter session required)
│   ├── turnout/[constituencyId]/route.ts  # GET live turnout (requires electionId query)
│   └── admin/
│       ├── setup/route.ts                 # POST create first admin (protected by ADMIN_SETUP_KEY)
│       ├── login/route.ts                 # POST admin login → sets admin_token cookie
│       ├── booths/route.ts                # GET/POST polling booths (admin)
│       ├── evms/route.ts                  # GET/POST EVMs (admin)
│       └── complaints/route.ts            # GET/POST complaints (admin)
├── lib/
│   ├── db.ts                              # pg Pool + query helper (global singleton)
│   ├── auth.ts                            # JWT create/verify (admin)
│   ├── adminAuth.ts                       # withAdminAuth wrapper (Bearer + cookie)
│   ├── voterSession.ts                    # JWT create/verify (voter, audience='voter')
│   ├── procedures.ts                      # Typed wrappers for stored procs & tables
│   └── validation.ts                      # Zod schemas for all inputs
```

---

## Environment Variables

```bash
# PostgreSQL
DATABASE_URL=postgresql://postgres:password@localhost:5432/voting_dev

# JWT Secret for admin & voter auth (generate: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# One-time setup key for creating first admin (change after use)
ADMIN_SETUP_KEY=your-secure-setup-key
```

---

## Database Schema Requirements

Run `sql/schema.sql` once against a new, empty PostgreSQL database or Supabase project. It contains the complete schema, fixes, admin table, development seed data, and Supabase API wrappers. Do not run it against an existing database. Expected objects:

### Tables
| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `voters` | `voter_id`, `epic_number`, `full_name`, `dob`, `constituency_id` | Voter registry |
| `candidates` | `candidate_id`, `full_name`, `dob`, `party_id`, `constituency_id`, `assets_declared_inr` | Candidate master |
| `parties` | `party_id`, `party_name` | Political parties |
| `nominations` | `nomination_id`, `candidate_id`, `filed_date` | Candidate ↔ election linkage |
| `elections` | `election_id`, `name`, `status`, `start_date`, `end_date` | Election metadata |
| `constituencies` | `constituency_id`, `name` | Electoral boundaries |
| `polling_booths` | `booth_id`, `constituency_id`, `location`, `officer_name`, `capacity` | Physical booths |
| `evms` | `evm_id`, `serial_number`, `booth_id` | EVM machines |
| `votes` | `vote_id`, `voter_id`, `election_id`, `booth_id`, `evm_id`, `candidate_id`, `cast_at` | Vote records (unique on voter_id + election_id) |
| `complaints` | `complaint_id`, `filed_by`, `booth_id`, `election_id`, `description`, `created_at` | Voter complaints |
| `admins` | `id`, `email`, `password_hash` | Admin users |

### Stored Procedures
- `cast_vote(p_voter_id, p_election_id, p_booth_id, p_evm_id, p_candidate_id)` — atomic vote casting with double-vote prevention via `EXCEPTION WHEN unique_violation`

### Views
- `view_live_turnout` — real-time turnout by constituency & election
- `view_results_leaderboard` — candidate vote counts per constituency with ranking

---

## API Endpoints (12 Routes)

### Public Routes (No Auth)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/voters` | Register voter + set `voter_session` cookie |
| `GET` | `/api/candidates?constituencyId=` | List candidates (opt. filter) |
| `POST` | `/api/candidates` | Create candidate + nomination (admin) |
| `GET` | `/api/elections` | List ongoing elections |
| `GET` | `/api/elections/[id]/results?constituencyId=` | Results leaderboard (opt. filter) |
| `POST` | `/api/vote` | Cast vote (requires `voter_session` cookie) |
| `GET` | `/api/turnout/[constituencyId]?electionId=` | Live turnout for constituency+election |

### Admin Routes (Require Auth)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/admin/setup` | Create first admin (protected by `ADMIN_SETUP_KEY`) |
| `POST` | `/api/admin/login` | Admin login → sets `admin_token` cookie |
| `GET/POST` | `/api/admin/booths` | Polling booths CRUD |
| `GET/POST` | `/api/admin/evms` | EVMs CRUD |
| `GET/POST` | `/api/admin/complaints` | Complaints CRUD |

**Auth Methods for Admin Routes:**
- `Authorization: Bearer <token>` header
- `admin_token` cookie (set on login)

---

## Authentication Flows

### Admin Flow
```
1. POST /api/admin/setup {email, password, setupKey}  →  creates first admin
2. POST /api/admin/login {email, password}            →  sets admin_token cookie (8h)
3. Subsequent requests: cookie OR Authorization header
```

### Voter Flow
```
1. POST /api/voters {epicNumber, fullName, dob, constituencyId}
   → creates voter + sets voter_session cookie (8h, audience='voter')
2. POST /api/vote {electionId, boothId, evmId, candidateId}
   → voterId extracted from cookie automatically
3. Session auto-expires after 8 hours
```

---

## Key Implementation Details

### `lib/db.ts` — Connection Pool
```typescript
const globalForPg = globalThis as typeof globalThis & { pgPool?: Pool };
export const pool = globalForPg.pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== 'production') globalForPg.pgPool = pool;
```
Global singleton prevents connection exhaustion in serverless/edge environments.

### `lib/auth.ts` — Admin JWT
- `createToken({adminId, email})` → HS256, 8h expiry
- `verifyToken(token)` → returns payload or null
- `getTokenFromHeader()` → extracts Bearer token

### `lib/voterSession.ts` — Voter JWT
- Separate audience (`'voter'`) prevents token confusion
- Subject = voterId string
- Cookie name: `voter_session`

### `lib/adminAuth.ts` — Route Protection
```typescript
export function withAdminAuth(handler) {
  return async (request) => {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;
    return handler(request, auth.payload!);
  };
}
```
Checks both `Authorization` header and `admin_token` cookie.

### `lib/procedures.ts` — Database Wrappers
All functions return `{ rows: T[] }` for consistency. Uses parameterized queries exclusively. Transactions for multi-step operations (candidate + nomination).

### `lib/validation.ts` — Zod Schemas
Strict schemas (`.strict()`) for all inputs. Types exported for TypeScript inference.

---

## Critical Route: `POST /api/vote`

```typescript
const voterId = await getVoterIdFromSession(request);
if (!voterId) return 401;

await castVote({ ...parsed.data, voterId });  // calls stored proc
return 200 { success: true };
```

**Why it's secure:**
- Voter identity from HttpOnly cookie (not request body)
- `cast_vote` proc enforces uniqueness at DB level
- Race conditions impossible — PostgreSQL serializes on unique constraint

---

## Error Handling Patterns

| Scenario | HTTP Code | Response |
|----------|-----------|----------|
| Zod validation fail | 400 | `{ error: 'Invalid input', details: {...} }` |
| Missing/invalid admin token | 401 | `{ error: 'Unauthorized' }` |
| Missing/invalid voter session | 401 | `{ error: 'Voter session required' }` |
| Invalid setup key | 403 | `{ error: 'Invalid setup key' }` |
| Duplicate (epic, serial, vote) | 409 | `{ error: '...already exists/already voted' }` |
| DB/Internal error | 500 | `{ error: 'Internal server error' }` |

Postgres error codes checked: `23505` (unique_violation).

---

## Available Scripts

```bash
pnpm dev              # Start dev server (port 3000)
pnpm build            # Production build + typecheck
pnpm start            # Run production build
pnpm lint             # ESLint
pnpm test:connection  # Test DB connection
pnpm test:voting      # Run voting flow test
```

---

## Integration Checklist

- [ ] PostgreSQL 14+ running
- [ ] Schema applied from `sql/schema.sql` to a new, empty database
- [ ] Reference data seeded (constituencies, parties, elections with `status='ONGOING'`)
- [ ] `.env` configured with `DATABASE_URL`, `JWT_SECRET`, `ADMIN_SETUP_KEY`
- [ ] `pnpm dev` starts without errors
- [ ] Test `GET /api/elections` returns data
- [ ] Admin setup → login → access `/api/admin/booths`
- [ ] Register voter → vote → verify turnout & results
- [ ] Duplicate vote returns `409`

---

## Testing Critical Path

```bash
BASE="http://localhost:3000"

# 1. Admin setup (once)
curl -X POST "$BASE/api/admin/setup" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"securepass123","setupKey":"your-secure-setup-key"}'

# 2. Admin login
curl -X POST "$BASE/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"securepass123"}' -c cookies.txt

# 3. Create booth & EVM
curl -b cookies.txt -X POST "$BASE/api/admin/booths" \
  -H "Content-Type: application/json" -d '{"location":"School","constituencyId":1}'
curl -b cookies.txt -X POST "$BASE/api/admin/evms" \
  -H "Content-Type: application/json" -d '{"serialNumber":"EVM-001","boothId":1}'

# 4. Create candidate
curl -b cookies.txt -X POST "$BASE/api/candidates" \
  -H "Content-Type: application/json" -d '{"fullName":"Candidate A","dob":"1980-01-01","partyId":1,"constituencyId":1}'

# 5. Register voter (sets voter_session cookie)
curl -X POST "$BASE/api/voters" \
  -H "Content-Type: application/json" \
  -d '{"epicNumber":"EPIC123","fullName":"Voter One","dob":"1990-01-01","constituencyId":1}' \
  -c voter_cookies.txt

# 6. Cast vote (uses voter_session cookie)
curl -b voter_cookies.txt -X POST "$BASE/api/vote" \
  -H "Content-Type: application/json" \
  -d '{"electionId":1,"boothId":1,"evmId":1,"candidateId":1}'

# 7. Verify turnout
curl "$BASE/api/turnout/1?electionId=1"

# 8. Verify results
curl "$BASE/api/elections/1/results"

# 9. Duplicate vote → 409
curl -b voter_cookies.txt -X POST "$BASE/api/vote" \
  -H "Content-Type: application/json" \
  -d '{"electionId":1,"boothId":1,"evmId":1,"candidateId":1}'
```

---

## Extending the Backend

To add a new entity (e.g., `observers`):

1. **Database** — Add table, indexes, RLS policies in SQL
2. **Procedures** — Add typed wrapper in `lib/procedures.ts`
3. **Validation** — Add Zod schema in `lib/validation.ts`
4. **Route** — Create `app/api/admin/observers/route.ts` with `withAdminAuth`
5. **Types** — TypeScript infers from Zod; no manual types needed

For new public routes: same pattern without `withAdminAuth`, add voter session check if needed.

---

## Security Notes

- **Never log secrets** — No `console.log` of passwords, tokens, or `JWT_SECRET`
- **HttpOnly + Secure cookies** — Prevents XSS token theft
- **SameSite=Lax** — CSRF protection for browser flows
- **bcrypt cost 12** — ~250ms/hash, balances security vs latency
- **Parameterized queries everywhere** — SQL injection impossible
- **RLS-ready** — Schema designed for Row Level Security policies