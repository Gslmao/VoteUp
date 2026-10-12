# Case Study Brief: Database Design for an Online Election System

## Purpose

Use this brief and the repository's SQL as primary sources to generate a DBMS case study. The database is the subject of the case study. The API and authentication code should appear only as context showing how clients invoke database operations; do not make the report a software-stack or endpoint tour.

Describe the repository as it exists, distinguish implemented behavior from proposed future design, and do not invent measurements, test results, deployments, certifications, or guarantees.

## Case Study Focus

The system is an online election backend whose central data problem is to enforce voter eligibility and one-vote-per-election while separating proof of participation from the anonymous candidate choice. The case study should explain how the relational model, keys, constraints, transactions, stored procedure, trigger, and views work together to protect that invariant.

Target an approximate **70% database and 30% backend** balance. The database remains the primary subject; use the backend portion to explain how the application authenticates users, validates requests, invokes database operations, handles outcomes, and verifies integrated behavior.

## Current Database Baseline

The operational installation sequence is:

1. `sql/01_schema.sql`: 13 base tables, indexes, vote audit trigger/function, base procedure, and base views.
2. `sql/02_patch_v2_fixes.sql`: replaces the vote procedure and turnout/results views with their applied versions.
3. `sql/03_auth.sql`: adds the separate `admins` table and a unique singleton index that limits setup to one admin account.
4. `sql/04_seed.sql`: development seed data.

The applied database therefore contains 13 base tables plus the additive `admins` table. Use the SQL definitions and the order above as the authority; do not rely on stale comments or documentation that contradict them.

The API uses PostgreSQL through a shared `pg` pool. It validates inputs and delegates persistence to database operations. Voter identity is derived from a role-checked JWT session, not supplied in the vote body. These details explain the database boundary but should remain secondary in the generated report.

## Data Model Overview

Do not write a repetitive table-by-table catalog. Explain the model by its responsibilities and relationships:

- **Reference geography:** states and constituencies establish electoral scope.
- **Election participants:** parties and candidates store participant data; nominations record candidacy status. The v2 `nominations` relation has no election key.
- **Election and voter registry:** elections define time/status; voters are associated with one constituency and have unique EPIC identifiers.
- **Participation:** `has_voted` records that a voter participated in an election. Its composite primary key is `(voter_id, election_id)`.
- **Anonymous ballot:** `vote_events` records the election, candidate, and cast time, with no voter identifier and no foreign key to `has_voted`.
- **Results and oversight:** `results` stores per-election/per-candidate totals; complaints and observers support oversight; `audit_log` records vote-event activity.
- **Authentication extension:** `admins` is separate from the 13-table base schema and is introduced additively.

An ER diagram may be included to show the major relationships, but it must not draw a path that links a voter or `has_voted` row to a specific `vote_events` row.

## Required DBMS Analysis

Organize the main analysis around design decisions, invariants, and trade-offs. Discuss these topics in depth:

### Keys and Constraints

Explain how surrogate primary keys identify entities; foreign keys prevent orphan records; unique constraints enforce natural uniqueness and one result row per election/candidate; `CHECK` constraints enforce valid ages, dates, statuses, and nonnegative totals. Give particular attention to why `(voter_id, election_id)` is a composite primary key and how it acts as the final defense against duplicate participation.

Distinguish what the database enforces declaratively from what is checked in `cast_vote`. Explain why API validation alone cannot guarantee integrity under concurrency or alternate database clients.

### Normalization and Anonymous Ballot Design

Analyze the separation among voter identity, participation, ballot choice, and result aggregation. Explain the privacy and consistency motivations, but be precise about limitations: absence of a direct voter-to-ballot key does not by itself prove end-to-end anonymity or prevent timing correlation.

Discuss the duplication and coupling in the current model: `results` is both an aggregate table and the `(election_id, candidate_id)` registration marker used by vote eligibility checks, while `nominations` has no election ID. Explain why this is pragmatic for the current schema and why a future dedicated election-candidacy relation would be cleaner.

### Transaction and Concurrency Behavior

Walk through `cast_vote(p_voter_id, p_election_id, p_candidate_id)` from start to finish:

1. Verify the voter exists and derive the voter's constituency.
2. Verify the election is ongoing.
3. Verify the candidate is registered for that election and constituency.
4. Insert into `has_voted` with `ON CONFLICT DO NOTHING`.
5. Inspect `FOUND` and reject duplicate participation.
6. Insert the anonymous ballot event.

Explain how the primary key arbitrates simultaneous requests and how PostgreSQL transaction semantics ensure an error in the procedure or vote trigger rolls back the whole operation.

### Trigger-Maintained Results and Audit

Explain how the `vote_events` trigger increments `results.total_votes` and writes an audit entry in the transaction that records the event. Analyze the benefits of immediate consistency and simple reads, as well as write amplification, counter contention, trigger transparency, and recovery/reconciliation needs. Do not claim the aggregate is independently verified unless the repository implements such a verification process.

### Views, Indexes, and Query Design

Analyze the applied `view_live_turnout` patch: the constituency/election cross join creates rows even at zero turnout, and the join to `has_voted` scopes counts to the selected election. Analyze `view_results_leaderboard`: ranking is partitioned by constituency and election.

Discuss the existing indexes on EPIC, vote-event election, and candidate constituency. Explain which access paths they support and identify query-plan review, workload-based index tuning, and scale testing as future evaluation work unless measured evidence is available.

## Backend Integration (Approximately 30%)

Give the backend a substantial but secondary section, focused on its relationship to the database rather than generic framework details. Explain:

- **Request boundary:** strict Zod schemas reject malformed or unexpected payload fields before database calls. Explain the vote payload and why voter identity is excluded from it.
- **Authentication and authorization:** admin and voter JWTs use a shared signer/verifier but distinct role claims and audiences. Voter identity comes from the HTTP-only session cookie; admin-only operations use admin authorization.
- **Database access layer:** a single shared `pg` pool and parameterized query helpers separate route handling from persistence. Describe how thin handlers delegate to procedures/views without duplicating integrity rules in TypeScript.
- **Vote interaction:** trace a request from session verification through `CALL cast_vote`, including mapping duplicate-vote outcomes to `409` and eligibility failures to client errors. Make clear that PostgreSQL remains authoritative.
- **Configuration and operational safeguards:** policy settings are centralized in `src/lib/config.ts`; secrets and database URLs are environment-provided. Mention setup fail-closed behavior and the current process-local scope of rate limiting.
- **Integrated verification:** explain the isolated voting test's fixtures, cleanup, sequential duplicate check, concurrent race check, and assertions for participation, ballot events, results, audit, and turnout. State that live execution requires a configured disposable development/test database and running API.

Keep the backend discussion to approximately 30% of the overall case study. Do not turn it into a route-by-route inventory or spend space on frontend functionality and generic Next.js features.

## Future Database Scope

Present these explicitly as proposals, not current capabilities:

- Add an `election_candidates` relation with a composite key and relevant foreign keys, separating candidacy registration from aggregate results.
- Decide whether result totals are derived from `vote_events` or maintained as a materialized/trigger-maintained aggregate, and define reconciliation rules.
- Review timestamp precision and access controls to reduce timing-correlation risks between participation and anonymous event records.
- Define retention, backup/restore, recovery, migrations, audit access, and database privilege policies.
- Add transaction-level tests for rollback, eligibility failures, concurrent voting, trigger failures, and aggregate reconciliation.
- Evaluate plans and indexes with representative workloads; do not invent throughput or latency targets/results.

The future vision may be optimistic about a robust and auditable database, but must not claim cryptographic ballot secrecy, coercion resistance, certified election security, production deployment, or measured scale without evidence.

## Claude Generation Instructions

Generate a database-led case study with an approximate 70% database / 30% backend balance, using this priority order:

1. Problem statement, database requirements, and integrity invariants.
2. Conceptual model and rationale for separating identity, participation, anonymous ballots, and aggregates.
3. Detailed key/constraint analysis, normalization decisions, and schema trade-offs.
4. Vote transaction walkthrough, concurrency behavior, trigger-maintained results, audit, and views.
5. Index rationale and proposed query-plan/testing approach.
6. Backend integration: request validation, JWT roles, shared database access, error mapping, and integration testing (about 30% overall).
7. Limitations, lessons, and future database design.

Avoid a table-by-table exposition. Keep SQL identifiers accurate. Clearly label baseline facts, analysis/inference, and proposed future work. Do not make up performance metrics, test outcomes, security guarantees, or implementation details.

End with this project-status assessment, worded as an approximate planning judgment rather than a measured result: **About 50% of the overall project is complete.** Explain briefly that the core relational model and voting integrity path exist, while deeper privacy/security review, stronger voter authentication, operational readiness, broader verification, and future schema refinements remain to be completed.
