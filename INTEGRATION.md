# Election System Backend — Full Functionality Report

Next.js 16 (App Router) + PostgreSQL backend for an election voting system. All business logic lives in PostgreSQL stored procedures/views; API routes are thin callers with Zod validation.

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.3.8 (App Router, TypeScript) |
| Database | PostgreSQL (via `pg` pool) |
| Auth | JWT (HS256) via `jose` — admin + voter sessions |
| Password Hashing | `bcrypt` (cost 12) |
| Validation | `zod` on every route |
| Runtime | Node.js (`export const runtime = 'nodejs'`) |

---

## Project Structure

```
src/
├── app/api/
│   ├── voters/route.ts                    # POST voter login + set voter session cookie
│   ├── candidates/route.ts                # GET list, POST create (admin)
│   ├── elections/route.ts                 # GET ongoing elections
│   ├── elections/[id]/results/route.ts    # GET results leaderboard (opt. constituency filter)
│   ├── vote/route.ts                      # POST cast_vote (voter session required)
│   ├── complaints/route.ts                # POST complaint (voter session + rate limit)
│   ├── turnout/[constituencyId]/route.ts  # GET live turnout (requires electionId query)
│   ├── auth/login/route.ts               # POST admin login → sets admin_token cookie
│   └── admin/
│       ├── setup/route.ts                 # POST create first admin (protected by ADMIN_SETUP_KEY)
│       ├── booths/route.ts                # GET/POST polling booths (admin)
│       ├── evms/route.ts                  # GET/POST EVMs (admin)
│       └── complaints/route.ts            # GET complaints (admin)
├── lib/
│   ├── db.ts                              # pg Pool + query helper (global singleton)
│   ├── auth.ts                            # Shared JWT create/verify with role flag
│   ├── adminAuth.ts                       # withAdminAuth wrapper (Bearer + cookie)
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

## Database Objects Required

Run `election_voting_schema_v2.sql` in PostgreSQL. Expected objects:

### Tables
| Table | Purpose |
|-------|---------|
| `voters` | Voter registry (epic_number, full_name, dob, constituency_id) |
| `candidates` | Candidate master (full_name, dob, party_id, constituency_id, assets_declared_inr) |
| `parties` | Political parties (party_name) |
| `nominations` | Candidate ↔ election linkage (candidate_id, filed_date) |
| `elections` | Election metadata (name, status, start_date, end_date) |
| `constituencies` | Electoral boundaries (name) |
| `polling_booths` | Physical booths (constituency_id, location, officer_name, capacity) |
| `evms` | EVM machines (serial_number, booth_id) |
| `votes` | Vote records (append-only, unique on voter_id + election_id) |
| `complaints` | Voter complaints (filed_by, booth_id, election_id, description) |
| `admins` | Admin users (email, password_hash) |

### Stored Procedures
- `cast_vote(p_voter_id, p_election_id, p_booth_id, p_evm_id, p_candidate_id)` — atomic vote casting with double-vote prevention via `EXCEPTION WHEN unique_violation`

### Views
- `view_live_turnout` — real-time turnout by constituency & election (columns: constituency_id, constituency_name, election_id, total_voters, votes_cast, turnout_percentage)
- `view_results_leaderboard` — candidate vote counts per constituency (columns: election_id, constituency_id, constituency_name, candidate_id, full_name, party_name, vote_count, rank)

---

## API Reference

### Public Routes (No Auth)

#### `POST /api/voters`
Log in an existing voter using their EPIC number and date of birth; this endpoint does not create voter records.

```json
{
  "epicNumber": "ABC1234567",
  "dob": "1990-05-15"
}
```

Response: `{ "success": true }` + sets `voter_session` cookie (8h, HttpOnly, Secure in prod, SameSite=Lax)

Errors: `400` invalid input, `401` invalid voter credentials, `500` server error

---

#### `GET /api/candidates?constituencyId=1`
List candidates, optionally filtered by constituency. Returns party name via LEFT JOIN.

Response: `[{ "candidate_id": 1, "full_name": "...", "dob": "...", "party_id": 1, "party_name": "...", "constituency_id": 1, "assets_declared_inr": null }]`

---

#### `POST /api/candidates` (Admin)
Create candidate + nomination in a single transaction.

```json
{
  "fullName": "Jane Smith",
  "dob": "1985-03-20",
  "partyId": 1,
  "constituencyId": 1
}
```
`partyId` is optional/nullable.

Response: `{ "success": true, "candidate": { "candidate_id": 1, "full_name": "...", ... } }`

---

#### `GET /api/elections`
List ongoing elections (`status = 'ONGOING'`).

Response: `[{ "election_id": 1, "name": "General Election 2024", "status": "ONGOING", "start_date": "...", "end_date": "..." }]`

---

#### `GET /api/elections/[id]/results?constituencyId=1`
Get live results leaderboard for an election. Optional `constituencyId` filter.

Response: `[{ "election_id": 1, "constituency_id": 1, "constituency_name": "...", "candidate_id": 1, "full_name": "...", "party_name": "...", "vote_count": 1234, "rank": 1 }]`

---

#### `POST /api/vote` **Critical Route**
Cast a vote. Requires valid `voter_session` cookie (set on voter login). Calls `cast_vote` stored procedure.

```json
{
  "electionId": 1,
  "boothId": 1,
  "evmId": 1,
  "candidateId": 1
}
```

`voterId` is extracted from the session cookie automatically.

Response: `{ "success": true }`

Errors:
- `400` invalid input
- `401` missing/invalid voter session
- `409` voter already voted in this election (DB-level unique constraint)
- `500` internal error

---

#### `GET /api/turnout/[constituencyId]?electionId=1`
Live turnout for a constituency in a specific election. Requires `electionId` query param.

Response: `[{ "constituency_id": 1, "constituency_name": "...", "election_id": 1, "total_voters": 50000, "votes_cast": 12345, "turnout_percentage": 24.69 }]`

---

### Admin Routes (Require Admin Auth)

All admin routes accept auth via:
- `Authorization: Bearer <token>` header, OR
- `admin_token` cookie (set on login)

#### `POST /api/admin/setup` (One-time)
Create the first admin user. Protected by `ADMIN_SETUP_KEY`.

```json
{
  "email": "admin@example.com",
  "password": "securepass123",
  "setupKey": "your-secure-setup-key"
}
```

Response: `{ "success": true, "admin": { "id": 1, "email": "..." }, "message": "..." }`

Errors: `400` invalid input, `403` invalid setup key, `409` email exists

---

#### `POST /api/auth/login`
Admin login. Returns token in `admin_token` cookie (8h, HttpOnly, Secure in prod, SameSite=Lax).

```json
{
  "email": "admin@example.com",
  "password": "securepass123"
}
```

Response: `{ "success": true }` + sets cookie

Errors: `400` invalid input, `401` invalid credentials

---

#### `GET/POST /api/admin/booths`
List or create polling booths.

POST body:
```json
{
  "location": "Central School, Ward 5",
  "constituencyId": 1,
  "officerName": "Officer Name",
  "capacity": 1000
}
```
`officerName` and `capacity` are optional/nullable.

---

#### `GET/POST /api/admin/evms`
List or register EVMs.

POST body:
```json
{
  "serialNumber": "EVM-2024-00123",
  "boothId": 1
}
```
Unique constraint on `serial_number` → `409` on duplicate.

---

#### `POST /api/complaints` (Voter)
File a complaint. Requires a voter session cookie; `filed_by` is taken from the authenticated voter record, not the request body. Limit: 3 complaints per voter per 15 minutes; limited responses return `429` with `Retry-After`.

POST body:
```json
{
  "boothId": 1,
  "electionId": 1,
  "description": "EVM display not working"
}
```

#### `GET /api/admin/complaints` (Admin)
List complaints, newest first. Complaint listing remains admin-only.

---

## Authentication Flow

### Admin
1. **Setup** (once): `POST /api/admin/setup` with `ADMIN_SETUP_KEY`
2. **Login**: `POST /api/auth/login` → receives `admin_token` cookie
3. **Access**: Include cookie or `Authorization: Bearer <token>` on admin routes

### Voter
1. **Login**: `POST /api/voters` with EPIC number and date of birth → receives `voter_session` cookie
2. **Vote**: `POST /api/vote` with session cookie (automatic)
3. **Session**: 8-hour JWT, role/audience=`voter`, subject=`voterId`

---

## Key Architecture Decisions

1. **All integrity in PostgreSQL** — `cast_vote` uses `EXCEPTION WHEN unique_violation` for atomic double-vote prevention. No application-level checks.

2. **Single pooled connection** — `lib/db.ts` exports one `Pool` reused across requests (global singleton pattern).

3. **Zod validation at API boundary** — Every route validates input before any DB call.

4. **Thin API routes** — Routes validate → call procedure/view → return JSON. No business logic.

5. **Role-flag JWTs** — Admin and voter tokens use the same signer, verifier, and secret; the `role` claim and matching audience prevent cross-use.

6. **HttpOnly cookies** — Both admin and voter sessions use secure, HttpOnly cookies; admin tokens are also accepted via Bearer header.
7. **Complaint rate limiting** — Voter complaint creation is limited per voter in the current Node.js process. Multi-instance deployments need a shared rate-limit store for a global limit.

---

## Integration Checklist

- [ ] PostgreSQL 14+ running
- [ ] Schema applied (`election_voting_schema_v2.sql`)
- [ ] Reference data seeded (constituencies, parties, elections with `status='ONGOING'`)
- [ ] `.env` configured with `DATABASE_URL`, `JWT_SECRET`, `ADMIN_SETUP_KEY`
- [ ] `pnpm dev` starts without errors
- [ ] Test `GET /api/elections` returns data
- [ ] Admin setup → login → access `/api/admin/booths`
- [ ] Log in seeded voter → vote → verify turnout & results
- [ ] Duplicate vote returns `409`

---

## Testing the Critical Path

```bash
BASE="http://localhost:3000"

# 1. Admin setup (once)
curl -X POST "$BASE/api/admin/setup" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"securepass123","setupKey":"your-secure-setup-key"}'

# 2. Admin login
curl -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"securepass123"}' \
  -c cookies.txt

# 3. Create booth & EVM
curl -b cookies.txt -X POST "$BASE/api/admin/booths" \
  -H "Content-Type: application/json" \
  -d '{"location":"School","constituencyId":1}'

curl -b cookies.txt -X POST "$BASE/api/admin/evms" \
  -H "Content-Type: application/json" \
  -d '{"serialNumber":"EVM-001","boothId":1}'

# 4. Create candidate
curl -b cookies.txt -X POST "$BASE/api/candidates" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Candidate A","dob":"1980-01-01","partyId":1,"constituencyId":1}'

# 5. Log in a voter preloaded by the seed script (sets voter_session cookie)
curl -X POST "$BASE/api/voters" \
  -H "Content-Type: application/json" \
  -d '{"epicNumber":"DEMO0000001","dob":"1990-01-01"}' \
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

## Available Scripts

```bash
pnpm dev              # Start dev server (port 3000)
pnpm build            # Production build + typecheck
pnpm start            # Run production build
pnpm lint             # ESLint
pnpm test:connection  # Test DB connection (tsx scripts/test-connection.ts)
pnpm test:voting      # Run voting flow test (tsx scripts/test-voting.ts)
```

---

## Extending

Add new routes following the same pattern:
1. Add Zod schema in `lib/validation.ts`
2. Add procedure wrapper in `lib/procedures.ts`
3. Create route file in `app/api/...`
4. Use `withAdminAuth` for admin routes, voter session for voter routes

For new admin entities: add CRUD in `procedures.ts`, schema in `validation.ts`, route with `withAdminAuth`.