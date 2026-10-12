# API Testing Guide

## Prerequisites

- Configure `DATABASE_URL` for the disposable development PostgreSQL database.
- Apply `sql/schema.sql` once to a new, empty development database as described in `INTEGRATION.md`. Do not run it against an existing database.
- Start the application with `pnpm dev`.

## Static and Database Checks

```sh
npx tsc --noEmit
npx tsx scripts/test-connection.ts
pnpm test:voting
```

The connection check lists the v2 base tables, reports the separate `admins` auth table, and verifies `cast_vote`. Keep the application running for `pnpm test:voting`; it creates uniquely named voter/election fixtures, checks invalid candidate, sequential duplicate, concurrent duplicate, turnout, audit, and results behavior, then removes its test rows. It refuses database names that do not contain `dev` or `test`.

## Voter Session and Vote

Voter login establishes the mock voter session cookie. The endpoint authenticates an existing voter and does not register voters.

```sh
BASE=http://localhost:3000
curl -i -c voter-cookies.txt -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"epicNumber":"DEMO0000001","dob":"1990-01-01"}'
```

Cast the vote without sending a voter ID:

```sh
curl -i -b voter-cookies.txt -X POST "$BASE/api/vote" \
  -H 'Content-Type: application/json' \
  -d '{"electionId":1,"candidateId":1}'
```

The automated voting test performs the duplicate and race requests using fresh isolated fixtures, so it can be run repeatedly without depending on seeded voter state.

## Voter Complaint

With the voter session cookie from login, create a complaint through the voter API:

```sh
curl -i -b voter-cookies.txt -X POST "$BASE/api/complaints" \
  -H 'Content-Type: application/json' \
  -d '{"electionId":1,"constituencyId":1,"description":"Online voting issue"}'
```

The API records the authenticated voter's name as `filed_by`; callers cannot supply it. A fourth complaint from the same voter inside 15 minutes returns `429` with `Retry-After`. `GET /api/admin/complaints` remains admin-authenticated and read-only.

## Election-Specific Turnout

Before any vote in the seeded election, this should return one row with `votes_cast: 0`; after one valid vote it should return `votes_cast: 1`:

```sh
curl "$BASE/api/turnout/1?electionId=1"
```

The election ID is required. The v2 view includes zero-vote constituency/election combinations.