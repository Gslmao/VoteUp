# Election System Backend

Next.js API routes + Supabase (PostgreSQL) backend for an election voting system. All business logic lives in PostgreSQL stored procedures/views; API routes are thin callers.

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Supabase project URL and anon key

# 3. Set up Supabase project and run schema
# In Supabase SQL editor, run election_voting_schema_v2.sql

# 4. Seed reference data (constituencies, parties, etc.)

# 5. Run dev server
pnpm dev
```

Server runs at `http://localhost:3000`

## Project Structure

```
src/
├── app/api/
│   ├── voters/route.ts              # POST - register voter
│   ├── candidates/route.ts          # GET list, POST create (admin)
│   ├── elections/route.ts           # GET ongoing elections
│   ├── elections/[id]/results/route.ts  # GET results leaderboard
│   ├── vote/route.ts                # POST cast_vote (critical)
│   ├── turnout/[constituencyId]/route.ts  # GET live turnout
│   └── admin/
│       ├── booths/route.ts          # GET/POST polling booths
│       ├── evms/route.ts            # GET/POST EVMs
│       └── complaints/route.ts      # GET/POST complaints
├── lib/
│   ├── db.ts                        # Supabase client
│   ├── procedures.ts                # Typed wrappers for stored procs & tables
│   └── validation.ts                # Zod schemas
```

## API Reference

### Public Routes

#### `POST /api/voters`
Register a new voter.

```json
{
  "name": "John Doe",
  "dob": "1990-01-15",
  "address": "123 Main St, City",
  "constituencyId": 1,
  "idDocumentType": "AADHAAR",
  "idDocumentNumber": "123456789012"
}
```

Response: `{ "success": true, "voterId": 123 }`

Errors: `400` invalid input, `409` duplicate ID document

---

#### `GET /api/candidates?electionId=1`
List candidates, optionally filtered by election.

Response: `[{ "id": 1, "name": "...", "party": "...", "symbol_url": "...", "election_id": 1 }]`

---

#### `POST /api/candidates` (Admin)
Create candidate + nomination.

```json
{
  "name": "Jane Smith",
  "party": "Progressive Party",
  "symbolUrl": "https://example.com/symbol.png",
  "electionId": 1,
  "constituencyId": 1
}
```

---

#### `GET /api/elections`
List ongoing elections.

Response: `[{ "id": 1, "name": "General Election 2024", "status": "ONGOING", ... }]`

---

#### `GET /api/elections/[id]/results`
Get live results leaderboard for an election.

Response: `[{ "candidate_id": 1, "candidate_name": "...", "party": "...", "vote_count": 1234, "constituency_name": "..." }]`

---

#### `POST /api/vote` **Critical Route**
Cast a vote. Calls `cast_vote` stored procedure via Supabase RPC.

```json
{
  "voterId": 123,
  "electionId": 1,
  "boothId": 5,
  "evmId": 10,
  "candidateId": 7
}
```

Response: `{ "success": true }`

Errors: 
- `400` invalid input / voter not eligible / invalid booth/EVM
- `409` voter already voted in this election
- `500` internal error

---

#### `GET /api/turnout/[constituencyId]`
Live turnout for a constituency.

Response: `[{ "constituency_id": 1, "constituency_name": "...", "total_voters": 50000, "votes_cast": 12345, "turnout_percentage": 24.69 }]`

---

### Admin Routes

#### `GET/POST /api/admin/booths`
List or create polling booths.

POST body:
```json
{ "name": "Booth 101", "constituencyId": 1, "address": "School Building, Ward 5" }
```

---

#### `GET/POST /api/admin/evms`
List or register EVMs.

POST body:
```json
{ "serialNumber": "EVM-2024-00123", "boothId": 5 }
```

---

#### `GET/POST /api/admin/complaints`
List or file complaints.

POST body:
```json
{ 
  "voterId": 123, 
  "boothId": 5, 
  "electionId": 1, 
  "description": "EVM not working properly" 
}
```

All fields optional except `description`.

## Database Schema Requirements

The backend expects these PostgreSQL objects (from `election_voting_schema_v2.sql`) in your Supabase project:

### Tables
- `voters` - voter registry
- `candidates` - candidate master
- `nominations` - candidate ↔ election ↔ constituency
- `elections` - election metadata
- `constituencies` - electoral boundaries
- `polling_booths` - physical booths
- `evms` - EVM machines linked to booths
- `votes` - vote records (append-only)
- `complaints` - voter complaints
- `admins` - admin users (optional)

### Stored Procedures
- `cast_vote(p_voter_id, p_election_id, p_booth_id, p_evm_id, p_candidate_id)` - atomic vote casting with double-vote prevention

### Views
- `view_live_turnout` - real-time turnout by constituency
- `view_results_leaderboard` - candidate vote counts per constituency

**Row Level Security (RLS)**: Enable RLS on all tables. For admin routes, use the `SUPABASE_SERVICE_ROLE_KEY` server-side to bypass RLS, or define policies that allow the required operations.

## Key Architecture Decisions

1. **All integrity in PostgreSQL** - `cast_vote` uses `EXCEPTION WHEN unique_violation` to prevent double-voting atomically. No application-level checks.

2. **Supabase client** - Single `supabase` instance in `lib/db.ts` reused across requests.

3. **Zod validation at API boundary** - Input validated before any DB call.

4. **Thin API routes** - Routes validate → call procedure/view → return JSON. No business logic.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Public anon key (client-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Service role key for admin routes (bypass RLS). Keep secret! |

## Integration Checklist

- [ ] Supabase project created
- [ ] Schema applied (`election_voting_schema_v2.sql` in SQL editor)
- [ ] Reference data seeded (constituencies, parties, elections)
- [ ] RLS policies configured (or use service role key for admin routes)
- [ ] `.env` configured with `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- [ ] `pnpm dev` starts without errors
- [ ] Test `GET /api/elections` returns data
- [ ] Test `POST /api/vote` with valid data succeeds
- [ ] Test `POST /api/vote` duplicate returns 409

## Testing the Critical Path

```bash
# 1. Register a voter
curl -X POST http://localhost:3000/api/voters \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Voter","dob":"1990-01-01","address":"123 Test St","constituencyId":1,"idDocumentType":"AADHAAR","idDocumentNumber":"111122223333"}'

# 2. Cast vote (use returned voterId)
curl -X POST http://localhost:3000/api/vote \
  -H "Content-Type: application/json" \
  -d '{"voterId":1,"electionId":1,"boothId":1,"evmId":1,"candidateId":1}'

# 3. Verify turnout updates
curl http://localhost:3000/api/turnout/1

# 4. Verify results
curl http://localhost:3000/api/elections/1/results

# 5. Try duplicate vote → should get 409
curl -X POST http://localhost:3000/api/vote \
  -H "Content-Type: application/json" \
  -d '{"voterId":1,"electionId":1,"boothId":1,"evmId":1,"candidateId":1}'
```

## Extending

Add new admin routes in `src/app/api/admin/` following the same pattern:
1. Add procedure wrapper in `lib/procedures.ts` using Supabase client
2. Add Zod schema in `lib/validation.ts`
3. Create route file with GET/POST handlers

Add new public routes in `src/app/api/` similarly.

## Supabase Notes

- Use the **anon key** for public routes (voting, results, turnout). RLS policies should allow reads/writes as needed.
- For admin routes (booths, EVMs, complaints), either:
  - Use the **service role key** server-side (create a separate Supabase client with it), or
  - Define RLS policies that allow authenticated admin users.
- Realtime: You can subscribe to `view_live_turnout` or `votes` table changes via Supabase Realtime for live UI updates without polling.