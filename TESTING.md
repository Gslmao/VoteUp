# API Testing Guide

## Prerequisites

- Configure `DATABASE_URL` for the disposable development PostgreSQL database.
- Apply `sql/01_schema.sql`, `sql/02_patch_v2_fixes.sql`, `sql/03_auth.sql`, then `sql/04_seed.sql` as described in `INTEGRATION.md`.
- Start the application with `pnpm dev`.

## Static and Database Checks

```sh
npx tsc --noEmit
npx tsx scripts/test-connection.ts
```

The connection check lists the exact 15 base tables, reports the separate `admins` auth table when present, and verifies `cast_vote`.

## Voter Session and Vote

Registration establishes the current mock voter session cookie:

```sh
BASE=http://localhost:3000
curl -i -c voter-cookies.txt -X POST "$BASE/api/voters" \
  -H 'Content-Type: application/json' \
  -d '{"epicNumber":"TEST0000001","fullName":"Test Voter","dob":"1990-01-01","constituencyId":1}'
```

Cast the vote without sending a voter ID:

```sh
curl -i -b voter-cookies.txt -X POST "$BASE/api/vote" \
  -H 'Content-Type: application/json' \
  -d '{"electionId":1,"boothId":1,"evmId":1,"candidateId":1}'
```

Repeat the same request with the same cookie. The first vote should return `200`; the second should return `409`. The procedure's primary-key conflict handling serializes concurrent duplicate attempts. After the requests, verify the test voter/election pair has one `has_voted` row, the corresponding election has one additional `vote_events` row, and the vote trigger added one audit row.

For the race check, use a newly registered voter and issue two simultaneous identical requests using that voter's cookie; expect exactly one `200` and one `409`.

## Election-Specific Turnout

Before any vote in the seeded election, this should return one row with `votes_cast: 0`; after one valid vote it should return `votes_cast: 1`:

```sh
curl "$BASE/api/turnout/1?electionId=1"
```

The election ID is required. The v2 view includes zero-vote constituency/election combinations.