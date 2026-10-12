-- -- Complete voting backend schema. Run once against a new, empty project/database.

-- -- Order: base schema, v2 fixes, admin auth, development seed, Supabase API wrappers.

-- -- Do not run against a database that already contains this schema.

-- -- ===== Base schema =====

-- -- ============================================================
-- -- ELECTION COMMISSION DATABASE (Simplified)
-- -- PostgreSQL DDL | BACSE202 Database Systems Project
-- -- 15 tables | straightforward keys & constraints
-- -- ============================================================

-- CREATE TABLE states (
--     state_id        SERIAL PRIMARY KEY,
--     state_name      VARCHAR(100) NOT NULL UNIQUE
-- );

-- CREATE TABLE constituencies (
--     constituency_id SERIAL PRIMARY KEY,
--     name            VARCHAR(150) NOT NULL,
--     state_id        INT NOT NULL REFERENCES states(state_id),
--     total_registered_voters INT DEFAULT 0 CHECK (total_registered_voters >= 0),
--     UNIQUE (name, state_id)
-- );

-- CREATE TABLE parties (
--     party_id        SERIAL PRIMARY KEY,
--     party_name      VARCHAR(150) NOT NULL UNIQUE,
--     symbol          VARCHAR(100),
--     founded_date    DATE
-- );

-- CREATE TABLE candidates (
--     candidate_id    SERIAL PRIMARY KEY,
--     full_name       VARCHAR(150) NOT NULL,
--     dob             DATE NOT NULL,
--     party_id        INT REFERENCES parties(party_id),
--     constituency_id INT NOT NULL REFERENCES constituencies(constituency_id),
--     assets_declared_inr NUMERIC(15,2) DEFAULT 0,
--     CHECK (dob <= CURRENT_DATE - INTERVAL '25 years')
-- );

-- CREATE TABLE nominations (
--     nomination_id   SERIAL PRIMARY KEY,
--     candidate_id    INT NOT NULL REFERENCES candidates(candidate_id),
--     filed_date      DATE NOT NULL,
--     status          VARCHAR(20) CHECK (status IN ('FILED','ACCEPTED','REJECTED','WITHDRAWN')) DEFAULT 'FILED'
-- );

-- CREATE TABLE voters (
--     voter_id        SERIAL PRIMARY KEY,
--     epic_number     VARCHAR(20) NOT NULL UNIQUE,
--     full_name       VARCHAR(150) NOT NULL,
--     dob             DATE NOT NULL,
--     constituency_id INT NOT NULL REFERENCES constituencies(constituency_id),
--     CHECK (dob <= CURRENT_DATE - INTERVAL '18 years')
-- );

-- CREATE TABLE elections (
--     election_id     SERIAL PRIMARY KEY,
--     election_name   VARCHAR(150) NOT NULL,
--     election_type   VARCHAR(30) CHECK (election_type IN ('GENERAL','BY_ELECTION','STATE')),
--     start_date      DATE NOT NULL,
--     end_date        DATE NOT NULL,
--     status          VARCHAR(20) CHECK (status IN ('SCHEDULED','ONGOING','COMPLETED')) DEFAULT 'SCHEDULED',
--     CHECK (end_date >= start_date)
-- );

-- -- tracks WHO has voted, without ever linking to WHAT they voted for
-- CREATE TABLE has_voted (
--     voter_id        INT NOT NULL REFERENCES voters(voter_id),
--     election_id     INT NOT NULL REFERENCES elections(election_id),
--     voted_at        TIMESTAMP NOT NULL DEFAULT NOW(),
--     PRIMARY KEY (voter_id, election_id)   -- enforces one vote per voter per election
-- );

-- -- anonymous ballot: deliberately no FK back to voters/has_voted
-- CREATE TABLE vote_events (
--     vote_id         BIGSERIAL PRIMARY KEY,
--     election_id     INT NOT NULL REFERENCES elections(election_id),
--     candidate_id    INT NOT NULL REFERENCES candidates(candidate_id),
--     cast_at         TIMESTAMP NOT NULL DEFAULT NOW()
-- );

-- CREATE TABLE results (
--     result_id       SERIAL PRIMARY KEY,
--     election_id     INT NOT NULL REFERENCES elections(election_id),
--     candidate_id    INT NOT NULL REFERENCES candidates(candidate_id),
--     total_votes     INT NOT NULL DEFAULT 0 CHECK (total_votes >= 0),
--     declared_at     TIMESTAMP,
--     UNIQUE (election_id, candidate_id)
-- );

-- CREATE TABLE complaints (
--     complaint_id    SERIAL PRIMARY KEY,
--     filed_by        VARCHAR(150),
--     constituency_id INT REFERENCES constituencies(constituency_id),
--     election_id     INT NOT NULL REFERENCES elections(election_id),
--     description     TEXT NOT NULL,
--     status          VARCHAR(20) CHECK (status IN ('OPEN','INVESTIGATING','RESOLVED','DISMISSED')) DEFAULT 'OPEN'
-- );

-- CREATE TABLE observers (
--     observer_id     SERIAL PRIMARY KEY,
--     full_name       VARCHAR(150) NOT NULL,
--     constituency_id INT REFERENCES constituencies(constituency_id),
--     election_id     INT REFERENCES elections(election_id)
-- );

-- CREATE TABLE audit_log (
--     log_id          BIGSERIAL PRIMARY KEY,
--     table_name      VARCHAR(50) NOT NULL,
--     operation       VARCHAR(10) NOT NULL,
--     changed_at      TIMESTAMP DEFAULT NOW(),
--     row_id          BIGINT,
--     details         JSONB
-- );

-- -- ============================================================
-- -- INDEXES
-- -- ============================================================
-- CREATE INDEX idx_voters_epic ON voters(epic_number);
-- CREATE INDEX idx_vote_events_election ON vote_events(election_id);
-- CREATE INDEX idx_candidates_constituency ON candidates(constituency_id);

-- -- ============================================================
-- -- TRIGGER: log every vote cast to audit_log
-- -- ============================================================
-- CREATE OR REPLACE FUNCTION fn_log_vote()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     INSERT INTO results(election_id, candidate_id, total_votes)
--     VALUES (NEW.election_id, NEW.candidate_id, 1)
--     ON CONFLICT (election_id, candidate_id)
--     DO UPDATE SET total_votes = results.total_votes + 1;

--     INSERT INTO audit_log(table_name, operation, row_id, details)
--     VALUES ('vote_events', 'INSERT', NEW.vote_id, jsonb_build_object('election_id', NEW.election_id));
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER trg_vote_audit
-- AFTER INSERT ON vote_events
-- FOR EACH ROW EXECUTE FUNCTION fn_log_vote();

-- -- ============================================================
-- -- STORED PROCEDURE: cast_vote (atomic, rejects double voting)
-- -- ============================================================
-- CREATE OR REPLACE PROCEDURE cast_vote(
--     p_voter_id INT, p_election_id INT, p_candidate_id INT
-- ) LANGUAGE plpgsql AS $$
-- DECLARE
--     v_constituency_id INT;
-- BEGIN
--     SELECT constituency_id INTO v_constituency_id
--     FROM voters
--     WHERE voter_id = p_voter_id;

--     IF NOT FOUND THEN
--         RAISE EXCEPTION 'Voter not found';
--     END IF;

--     PERFORM 1 FROM elections
--     WHERE election_id = p_election_id AND status = 'ONGOING'
--     FOR SHARE;

--     IF NOT FOUND THEN
--         RAISE EXCEPTION 'Election is not open for voting';
--     END IF;

--     PERFORM 1
--     FROM candidates c
--     JOIN results r ON r.candidate_id = c.candidate_id
--                  AND r.election_id = p_election_id
--     WHERE c.candidate_id = p_candidate_id
--       AND c.constituency_id = v_constituency_id
--     FOR SHARE OF c, r;

--     IF NOT FOUND THEN
--         RAISE EXCEPTION 'Candidate is not registered for this election and constituency';
--     END IF;

--     INSERT INTO has_voted(voter_id, election_id)
--     VALUES (p_voter_id, p_election_id)
--     ON CONFLICT DO NOTHING;

--     IF NOT FOUND THEN
--         RAISE EXCEPTION 'Voter % has already voted in election %', p_voter_id, p_election_id;
--     END IF;

--     INSERT INTO vote_events(election_id, candidate_id)
--     VALUES (p_election_id, p_candidate_id);
-- END;
-- $$;

-- -- ============================================================
-- -- VIEW: live turnout percentage per constituency
-- -- ============================================================
-- CREATE VIEW view_live_turnout AS
-- SELECT c.constituency_id, c.name,
--        c.total_registered_voters,
--        COUNT(hv.voter_id) AS votes_cast,
--        ROUND(100.0 * COUNT(hv.voter_id) / NULLIF(c.total_registered_voters,0), 2) AS turnout_pct
-- FROM constituencies c
-- LEFT JOIN voters v ON v.constituency_id = c.constituency_id
-- LEFT JOIN has_voted hv ON hv.voter_id = v.voter_id
-- GROUP BY c.constituency_id, c.name, c.total_registered_voters;

-- -- ============================================================
-- -- VIEW: results leaderboard
-- -- ============================================================
-- CREATE VIEW view_results_leaderboard AS
-- SELECT r.election_id, ca.full_name AS candidate_name, p.party_name, r.total_votes,
--        RANK() OVER (PARTITION BY r.election_id ORDER BY r.total_votes DESC) AS rank
-- FROM results r
-- JOIN candidates ca ON ca.candidate_id = r.candidate_id
-- LEFT JOIN parties p ON p.party_id = ca.party_id;
-- -- ===== V2 procedure and view fixes =====

-- CREATE OR REPLACE PROCEDURE cast_vote(
--     p_voter_id INT, p_election_id INT, p_candidate_id INT
-- ) LANGUAGE plpgsql AS $$
-- DECLARE
--     v_constituency_id INT;
-- BEGIN
--     SELECT constituency_id INTO v_constituency_id
--     FROM voters
--     WHERE voter_id = p_voter_id;

--     IF NOT FOUND THEN
--         RAISE EXCEPTION 'Voter not found';
--     END IF;

--     PERFORM 1 FROM elections
--     WHERE election_id = p_election_id AND status = 'ONGOING'
--     FOR SHARE;

--     IF NOT FOUND THEN
--         RAISE EXCEPTION 'Election is not open for voting';
--     END IF;

--     PERFORM 1
--     FROM candidates c
--     JOIN results r ON r.candidate_id = c.candidate_id
--                  AND r.election_id = p_election_id
--     WHERE c.candidate_id = p_candidate_id
--       AND c.constituency_id = v_constituency_id
--     FOR SHARE OF c, r;

--     IF NOT FOUND THEN
--         RAISE EXCEPTION 'Candidate is not registered for this election and constituency';
--     END IF;

--     INSERT INTO has_voted(voter_id, election_id)
--     VALUES (p_voter_id, p_election_id)
--     ON CONFLICT DO NOTHING;

--     IF NOT FOUND THEN
--         RAISE EXCEPTION 'Voter % has already voted in election %', p_voter_id, p_election_id;
--     END IF;

--     INSERT INTO vote_events(election_id, candidate_id)
--     VALUES (p_election_id, p_candidate_id);
-- END;
-- $$;

-- DROP VIEW IF EXISTS view_results_leaderboard;
-- CREATE VIEW view_results_leaderboard AS
-- SELECT r.election_id, ca.constituency_id, cn.name AS constituency_name,
--        ca.full_name AS candidate_name, p.party_name, r.total_votes,
--        RANK() OVER (PARTITION BY ca.constituency_id, r.election_id
--                     ORDER BY r.total_votes DESC) AS rank
-- FROM results r
-- JOIN candidates ca ON ca.candidate_id = r.candidate_id
-- JOIN constituencies cn ON cn.constituency_id = ca.constituency_id
-- LEFT JOIN parties p ON p.party_id = ca.party_id;

-- DROP VIEW IF EXISTS view_live_turnout;
-- CREATE VIEW view_live_turnout AS
-- SELECT c.constituency_id, c.name, e.election_id,
--        c.total_registered_voters,
--        COUNT(hv.voter_id) AS votes_cast,
--        ROUND(100.0 * COUNT(hv.voter_id) / NULLIF(c.total_registered_voters, 0), 2) AS turnout_pct
-- FROM constituencies c
-- CROSS JOIN elections e
-- LEFT JOIN voters v ON v.constituency_id = c.constituency_id
-- LEFT JOIN has_voted hv ON hv.voter_id = v.voter_id AND hv.election_id = e.election_id
-- GROUP BY c.constituency_id, c.name, e.election_id, c.total_registered_voters;
-- -- ===== Admin authentication table =====

-- CREATE TABLE admins (
--     id              SERIAL PRIMARY KEY,
--     email           VARCHAR(255) NOT NULL UNIQUE,
--     password_hash   TEXT NOT NULL,
--     created_at      TIMESTAMP NOT NULL DEFAULT NOW()
-- );

-- CREATE UNIQUE INDEX admins_singleton_idx ON admins ((TRUE));
-- -- ===== Development seed data =====

-- INSERT INTO states(state_name)
-- VALUES ('Example State');

-- INSERT INTO constituencies(name, state_id, total_registered_voters)
-- VALUES ('Central Constituency', 1, 1000);

-- INSERT INTO parties(party_name, symbol, founded_date)
-- VALUES
--     ('Civic Party', 'Lamp', '2000-01-01'),
--     ('People Party', 'Tree', '2005-01-01');

-- INSERT INTO candidates(full_name, dob, party_id, constituency_id, assets_declared_inr)
-- VALUES
--     ('Candidate One', '1980-01-01', 1, 1, 0),
--     ('Candidate Two', '1982-02-02', 2, 1, 0);

-- INSERT INTO nominations(candidate_id, filed_date, status)
-- VALUES
--     (1, CURRENT_DATE, 'ACCEPTED'),
--     (2, CURRENT_DATE, 'ACCEPTED');

-- INSERT INTO voters(epic_number, full_name, dob, constituency_id)
-- VALUES
--     ('DEMO0000001', 'Demo Voter One', '1990-01-01', 1),
--     ('DEMO0000002', 'Demo Voter Two', '1991-01-01', 1);

-- INSERT INTO elections(election_name, election_type, start_date, end_date, status)
-- VALUES ('Demo Election', 'GENERAL', CURRENT_DATE, CURRENT_DATE + 1, 'ONGOING');

-- INSERT INTO results(election_id, candidate_id, total_votes)
-- VALUES (1, 1, 0), (1, 2, 0);
-- -- ===== Supabase PostgREST API wrappers and vote tally trigger fix =====

-- -- PostgREST exposes PostgreSQL functions as RPC endpoints, but not procedures.
-- -- These wrappers keep writes transactional and preserve the existing vote procedure.

-- CREATE OR REPLACE FUNCTION public.fn_log_vote()
-- RETURNS TRIGGER
-- LANGUAGE plpgsql
-- AS $$
-- BEGIN
--     INSERT INTO public.results AS current_result(election_id, candidate_id, total_votes)
--     VALUES (NEW.election_id, NEW.candidate_id, 1)
--     ON CONFLICT (election_id, candidate_id)
--     DO UPDATE SET total_votes = current_result.total_votes + 1;

--     INSERT INTO public.audit_log(table_name, operation, row_id, details)
--     VALUES (
--         'vote_events',
--         'INSERT',
--         NEW.vote_id,
--         jsonb_build_object('election_id', NEW.election_id)
--     );

--     RETURN NEW;
-- END;
-- $$;

-- CREATE OR REPLACE FUNCTION public.cast_vote_api(
--     p_voter_id INT,
--     p_election_id INT,
--     p_candidate_id INT
-- )
-- RETURNS VOID
-- LANGUAGE plpgsql
-- AS $$
-- BEGIN
--     CALL public.cast_vote(p_voter_id, p_election_id, p_candidate_id);
-- END;
-- $$;

-- CREATE OR REPLACE FUNCTION public.get_candidates_api(p_constituency_id INT DEFAULT NULL)
-- RETURNS TABLE (
--     candidate_id INT,
--     full_name VARCHAR(150),
--     dob DATE,
--     party_id INT,
--     party_name VARCHAR(150),
--     constituency_id INT,
--     assets_declared_inr NUMERIC(15, 2)
-- )
-- LANGUAGE sql
-- STABLE
-- AS $$
--     SELECT c.candidate_id, c.full_name, c.dob, c.party_id, p.party_name,
--            c.constituency_id, c.assets_declared_inr
--     FROM public.candidates AS c
--     LEFT JOIN public.parties AS p ON p.party_id = c.party_id
--     WHERE p_constituency_id IS NULL OR c.constituency_id = p_constituency_id
--     ORDER BY c.candidate_id;
-- $$;

-- CREATE OR REPLACE FUNCTION public.create_candidate_api(
--     p_full_name VARCHAR(150),
--     p_dob DATE,
--     p_party_id INT,
--     p_constituency_id INT,
--     p_election_id INT
-- )
-- RETURNS SETOF public.candidates
-- LANGUAGE plpgsql
-- AS $$
-- DECLARE
--     v_candidate public.candidates%ROWTYPE;
-- BEGIN
--     INSERT INTO public.candidates(full_name, dob, party_id, constituency_id)
--     VALUES (p_full_name, p_dob, p_party_id, p_constituency_id)
--     RETURNING * INTO v_candidate;

--     INSERT INTO public.nominations(candidate_id, filed_date)
--     VALUES (v_candidate.candidate_id, CURRENT_DATE);

--     INSERT INTO public.results(election_id, candidate_id, total_votes)
--     VALUES (p_election_id, v_candidate.candidate_id, 0);

--     RETURN NEXT v_candidate;
-- END;
-- $$;

-- CREATE OR REPLACE FUNCTION public.create_complaint_api(
--     p_voter_id INT,
--     p_constituency_id INT,
--     p_election_id INT,
--     p_description TEXT
-- )
-- RETURNS SETOF public.complaints
-- LANGUAGE plpgsql
-- AS $$
-- DECLARE
--     v_filed_by VARCHAR(150);
--     v_complaint public.complaints%ROWTYPE;
-- BEGIN
--     SELECT full_name INTO v_filed_by
--     FROM public.voters
--     WHERE voter_id = p_voter_id;

--     IF NOT FOUND THEN
--         RETURN;
--     END IF;

--     INSERT INTO public.complaints(filed_by, constituency_id, election_id, description)
--     VALUES (v_filed_by, p_constituency_id, p_election_id, p_description)
--     RETURNING * INTO v_complaint;

--     RETURN NEXT v_complaint;
-- END;
-- $$;

-- CREATE OR REPLACE FUNCTION public.create_admin_api(
--     p_email VARCHAR(255),
--     p_password_hash TEXT
-- )
-- RETURNS TABLE(id INT, email VARCHAR(255))
-- LANGUAGE plpgsql
-- AS $$
-- BEGIN
--     RETURN QUERY
--     INSERT INTO public.admins AS a(email, password_hash)
--     VALUES (p_email, p_password_hash)
--     RETURNING a.id, a.email;
-- END;
-- $$;

-- REVOKE ALL ON FUNCTION public.cast_vote_api(INT, INT, INT) FROM PUBLIC, anon, authenticated;
-- REVOKE ALL ON FUNCTION public.get_candidates_api(INT) FROM PUBLIC, anon, authenticated;
-- REVOKE ALL ON FUNCTION public.create_candidate_api(VARCHAR, DATE, INT, INT, INT) FROM PUBLIC, anon, authenticated;
-- REVOKE ALL ON FUNCTION public.create_complaint_api(INT, INT, INT, TEXT) FROM PUBLIC, anon, authenticated;
-- REVOKE ALL ON FUNCTION public.create_admin_api(VARCHAR, TEXT) FROM PUBLIC, anon, authenticated;

-- GRANT EXECUTE ON FUNCTION public.cast_vote_api(INT, INT, INT) TO service_role;
-- GRANT EXECUTE ON FUNCTION public.get_candidates_api(INT) TO service_role;
-- GRANT EXECUTE ON FUNCTION public.create_candidate_api(VARCHAR, DATE, INT, INT, INT) TO service_role;
-- GRANT EXECUTE ON FUNCTION public.create_complaint_api(INT, INT, INT, TEXT) TO service_role;
-- GRANT EXECUTE ON FUNCTION public.create_admin_api(VARCHAR, TEXT) TO service_role;

-- REVOKE ALL ON PROCEDURE public.cast_vote(INT, INT, INT) FROM PUBLIC, anon, authenticated;
-- GRANT EXECUTE ON PROCEDURE public.cast_vote(INT, INT, INT) TO service_role;


-- ============================================================
-- ELECTION COMMISSION DATABASE
-- PostgreSQL 15+ / Supabase | BACSE202 Database Systems Project
-- Schema: 14 tables
-- Run once against a new, empty database. This is not an idempotent
-- migration; do not rerun against an existing copy of this schema.
--
-- Execution order:
--   1. Tables and indexes
--   2. Trigger and stored procedure
--   3. Views and development seed data
--   4. PostgREST RPC functions
--   5. Permissions and row-level security
--
-- Custom error codes raised by the database:
--   VT001 voter not found        VT005 election not found
--   VT002 election not open      VT006 complaint constituency mismatch
--   VT003 invalid candidate      VT007 nomination not found
--   VT004 already voted          VT008 invalid status transition
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Geographic reference data
CREATE TABLE states (
    state_id        SERIAL PRIMARY KEY,
    state_name      VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE constituencies (
    constituency_id SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    state_id        INT NOT NULL REFERENCES states(state_id),
    total_registered_voters INT DEFAULT 0
                        CHECK (total_registered_voters >= 0),
    UNIQUE (name, state_id)
);

-- Parties and candidates
CREATE TABLE parties (
    party_id        SERIAL PRIMARY KEY,
    party_name      VARCHAR(150) NOT NULL UNIQUE,
    symbol          VARCHAR(100),
    founded_date    DATE
);

CREATE TABLE candidates (
    candidate_id    SERIAL PRIMARY KEY,
    full_name       VARCHAR(150) NOT NULL,
    dob             DATE NOT NULL,
    party_id        INT REFERENCES parties(party_id),
    constituency_id INT NOT NULL REFERENCES constituencies(constituency_id),
    assets_declared_inr NUMERIC(15, 2) DEFAULT 0,
    CHECK (dob <= CURRENT_DATE - INTERVAL '25 years')
);

-- Nomination and voter records
CREATE TABLE nominations (
    nomination_id   SERIAL PRIMARY KEY,
    candidate_id    INT NOT NULL REFERENCES candidates(candidate_id),
    filed_date      DATE NOT NULL,
    status          VARCHAR(20) DEFAULT 'FILED'
                    CHECK (status IN ('FILED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'))
);

CREATE TABLE voters (
    voter_id        SERIAL PRIMARY KEY,
    epic_number     VARCHAR(20) NOT NULL UNIQUE,
    full_name       VARCHAR(150) NOT NULL,
    dob             DATE NOT NULL,
    constituency_id INT NOT NULL REFERENCES constituencies(constituency_id),
    CHECK (dob <= CURRENT_DATE - INTERVAL '18 years')
);

CREATE TABLE elections (
    election_id     SERIAL PRIMARY KEY,
    election_name   VARCHAR(150) NOT NULL,
    election_type   VARCHAR(30)
                    CHECK (election_type IN ('GENERAL', 'BY_ELECTION', 'STATE')),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    status          VARCHAR(20) DEFAULT 'SCHEDULED'
                    CHECK (status IN ('SCHEDULED', 'ONGOING', 'COMPLETED')),
    CHECK (end_date >= start_date)
);

-- Voting participation is kept separate from the anonymous ballot.
-- The timestamp is rounded to the hour to reduce correlation with ballots.
CREATE TABLE has_voted (
    voter_id        INT NOT NULL REFERENCES voters(voter_id),
    election_id     INT NOT NULL REFERENCES elections(election_id),
    voted_at        TIMESTAMP NOT NULL DEFAULT date_trunc('hour', LOCALTIMESTAMP),
    PRIMARY KEY (voter_id, election_id)   -- enforces one vote per voter per election
);

-- Anonymous ballot: intentionally has no link to voters/has_voted and no timestamp.
CREATE TABLE vote_events (
    vote_id         BIGSERIAL PRIMARY KEY,
    election_id     INT NOT NULL REFERENCES elections(election_id),
    candidate_id    INT NOT NULL REFERENCES candidates(candidate_id)
);

-- Vote totals and election complaints
CREATE TABLE results (
    result_id       SERIAL PRIMARY KEY,
    election_id     INT NOT NULL REFERENCES elections(election_id),
    candidate_id    INT NOT NULL REFERENCES candidates(candidate_id),
    total_votes     INT NOT NULL DEFAULT 0 CHECK (total_votes >= 0),
    declared_at     TIMESTAMP,
    UNIQUE (election_id, candidate_id)
);

CREATE TABLE complaints (
    complaint_id    SERIAL PRIMARY KEY,
    voter_id        INT REFERENCES voters(voter_id),
    filed_by        VARCHAR(150),
    constituency_id INT REFERENCES constituencies(constituency_id),
    election_id     INT NOT NULL REFERENCES elections(election_id),
    description     TEXT NOT NULL,
    status          VARCHAR(20) DEFAULT 'OPEN'
                    CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'))
);

CREATE TABLE observers (
    observer_id     SERIAL PRIMARY KEY,
    full_name       VARCHAR(150) NOT NULL,
    constituency_id INT REFERENCES constituencies(constituency_id),
    election_id     INT REFERENCES elections(election_id)
);

-- Audit history and administrator account
CREATE TABLE audit_log (
    log_id          BIGSERIAL PRIMARY KEY,
    table_name      VARCHAR(50) NOT NULL,
    operation       VARCHAR(10) NOT NULL,
    changed_at      TIMESTAMP DEFAULT NOW(),
    row_id          BIGINT,
    details         JSONB
);

CREATE TABLE admins (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- only one admin account may ever exist
CREATE UNIQUE INDEX admins_singleton_idx
    ON admins ((TRUE));

-- ============================================================
-- 2. INDEXES
-- ============================================================
CREATE INDEX idx_voters_epic
    ON voters (epic_number);
CREATE INDEX idx_voters_constituency
    ON voters (constituency_id);
CREATE INDEX idx_vote_events_election
    ON vote_events (election_id);
CREATE INDEX idx_candidates_constituency
    ON candidates (constituency_id);
CREATE INDEX idx_has_voted_election
    ON has_voted (election_id);
CREATE INDEX idx_nominations_candidate
    ON nominations (candidate_id);
CREATE INDEX idx_results_candidate
    ON results (candidate_id);
CREATE INDEX idx_audit_log_changed_at
    ON audit_log (changed_at DESC);
CREATE INDEX idx_complaints_voter_id
    ON complaints (voter_id);

-- ============================================================
-- 3. VOTE AUDIT TRIGGER
-- Increments the candidate tally and records the vote event.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_log_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.results AS current_result (
        election_id, candidate_id, total_votes
    )
    VALUES (NEW.election_id, NEW.candidate_id, 1)
    ON CONFLICT (election_id, candidate_id)
    DO UPDATE SET total_votes = current_result.total_votes + 1;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'vote_events',
        'INSERT',
        NEW.vote_id,
        jsonb_build_object('election_id', NEW.election_id)
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vote_audit
AFTER INSERT ON vote_events
FOR EACH ROW EXECUTE FUNCTION public.fn_log_vote();

-- ============================================================
-- 4. STORED PROCEDURE: CAST A VOTE
-- Validates eligibility and rejects duplicate voting atomically.
-- Requires an ACCEPTED nomination. The results row is not locked here;
-- the trigger updates it, and taking a share lock there risks deadlocks.
-- ============================================================
CREATE OR REPLACE PROCEDURE cast_vote(
    p_voter_id INT, p_election_id INT, p_candidate_id INT
) LANGUAGE plpgsql
AS $$
DECLARE
    v_constituency_id INT;
BEGIN
    SELECT constituency_id INTO v_constituency_id
    FROM voters
    WHERE voter_id = p_voter_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Voter not found' USING ERRCODE = 'VT001';
    END IF;

    PERFORM 1 FROM elections
    WHERE election_id = p_election_id AND status = 'ONGOING'
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Election is not open for voting' USING ERRCODE = 'VT002';
    END IF;

    PERFORM 1
    FROM candidates c
    JOIN nominations n ON n.candidate_id = c.candidate_id
                      AND n.status = 'ACCEPTED'
    JOIN results r     ON r.candidate_id = c.candidate_id
                      AND r.election_id = p_election_id
    WHERE c.candidate_id = p_candidate_id
      AND c.constituency_id = v_constituency_id
    FOR SHARE OF c, n;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Candidate is not an accepted nominee for this election and constituency'
            USING ERRCODE = 'VT003';
    END IF;

    INSERT INTO has_voted (voter_id, election_id)
    VALUES (p_voter_id, p_election_id)
    ON CONFLICT DO NOTHING;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Voter % has already voted in election %', p_voter_id, p_election_id
            USING ERRCODE = 'VT004';
    END IF;

    INSERT INTO vote_events (election_id, candidate_id)
    VALUES (p_election_id, p_candidate_id);
END;
$$;

-- ============================================================
-- 5. VIEWS
-- ============================================================
CREATE VIEW view_live_turnout WITH (security_invoker = true) AS
SELECT c.constituency_id, c.name, e.election_id,
       c.total_registered_voters,
       COUNT(hv.voter_id) AS votes_cast,
       ROUND(100.0 * COUNT(hv.voter_id) / NULLIF(c.total_registered_voters, 0), 2) AS turnout_pct
FROM constituencies c
CROSS JOIN elections e
LEFT JOIN voters v ON v.constituency_id = c.constituency_id
LEFT JOIN has_voted hv ON hv.voter_id = v.voter_id AND hv.election_id = e.election_id
GROUP BY c.constituency_id, c.name, e.election_id, c.total_registered_voters;

CREATE VIEW view_results_leaderboard WITH (security_invoker = true) AS
SELECT r.election_id, ca.constituency_id, cn.name AS constituency_name,
       ca.full_name AS candidate_name, p.party_name, r.total_votes,
       RANK() OVER (PARTITION BY ca.constituency_id, r.election_id
                    ORDER BY r.total_votes DESC) AS rank
FROM results r
JOIN candidates ca ON ca.candidate_id = r.candidate_id
JOIN constituencies cn ON cn.constituency_id = ca.constituency_id
LEFT JOIN parties p ON p.party_id = ca.party_id;

-- ============================================================
-- 7. POSTGREST RPC FUNCTIONS
-- PostgREST exposes PostgreSQL functions through /rpc, not procedures.
-- ============================================================

-- Voting
CREATE OR REPLACE FUNCTION public.cast_vote_api(
    p_voter_id INT,
    p_election_id INT,
    p_candidate_id INT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    CALL public.cast_vote(p_voter_id, p_election_id, p_candidate_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_candidates_api(
    p_constituency_id INT DEFAULT NULL
)
RETURNS TABLE (
    candidate_id INT,
    full_name VARCHAR(150),
    dob DATE,
    party_id INT,
    party_name VARCHAR(150),
    constituency_id INT,
    assets_declared_inr NUMERIC(15, 2)
)
LANGUAGE sql
STABLE
AS $$
    SELECT c.candidate_id, c.full_name, c.dob, c.party_id, p.party_name,
           c.constituency_id, c.assets_declared_inr
    FROM public.candidates AS c
    LEFT JOIN public.parties AS p ON p.party_id = c.party_id
    WHERE p_constituency_id IS NULL OR c.constituency_id = p_constituency_id
    ORDER BY c.candidate_id;
$$;

-- Candidate management
-- Creates a candidate, a FILED nomination, and a zero-vote result row.
-- The candidate cannot receive votes until the nomination is ACCEPTED.
CREATE OR REPLACE FUNCTION public.create_candidate_with_assets_api(
    p_full_name VARCHAR(150),
    p_dob DATE,
    p_party_id INT,
    p_constituency_id INT,
    p_election_id INT,
    p_assets_declared_inr NUMERIC(15, 2)
)
RETURNS SETOF public.candidates
LANGUAGE plpgsql
AS $$
DECLARE
    v_candidate public.candidates%ROWTYPE;
    v_status    VARCHAR(20);
BEGIN
    SELECT status INTO v_status FROM public.elections WHERE election_id = p_election_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Election not found' USING ERRCODE = 'VT005';
    END IF;
    IF v_status = 'COMPLETED' THEN
        RAISE EXCEPTION 'Election already completed' USING ERRCODE = 'VT002';
    END IF;

    INSERT INTO public.candidates(
        full_name, dob, party_id, constituency_id, assets_declared_inr
    )
    VALUES (
        p_full_name, p_dob, p_party_id, p_constituency_id, p_assets_declared_inr
    )
    RETURNING * INTO v_candidate;

    INSERT INTO public.nominations (candidate_id, filed_date)
    VALUES (v_candidate.candidate_id, CURRENT_DATE);

    INSERT INTO public.results (election_id, candidate_id, total_votes)
    VALUES (p_election_id, v_candidate.candidate_id, 0);

    RETURN NEXT v_candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_candidate_with_assets_api(
    p_admin_id INT,
    p_full_name VARCHAR(150),
    p_dob DATE,
    p_party_id INT,
    p_constituency_id INT,
    p_election_id INT,
    p_assets_declared_inr NUMERIC(15, 2)
)
RETURNS SETOF public.candidates
LANGUAGE plpgsql
AS $$
DECLARE
    v_candidate public.candidates%ROWTYPE;
    v_status VARCHAR(20);
BEGIN
    SELECT status INTO v_status
    FROM public.elections
    WHERE election_id = p_election_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Election not found' USING ERRCODE = 'VT005';
    END IF;
    IF v_status = 'COMPLETED' THEN
        RAISE EXCEPTION 'Election already completed' USING ERRCODE = 'VT002';
    END IF;

    INSERT INTO public.candidates (
        full_name, dob, party_id, constituency_id, assets_declared_inr
    )
    VALUES (
        p_full_name, p_dob, p_party_id, p_constituency_id, p_assets_declared_inr
    )
    RETURNING * INTO v_candidate;

    INSERT INTO public.nominations (candidate_id, filed_date)
    VALUES (v_candidate.candidate_id, CURRENT_DATE);
    INSERT INTO public.results (election_id, candidate_id, total_votes)
    VALUES (p_election_id, v_candidate.candidate_id, 0);

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'candidates',
        'INSERT',
        v_candidate.candidate_id,
        jsonb_build_object('action', 'candidate_created', 'admin_id', p_admin_id)
    );
    RETURN NEXT v_candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_candidate_api(
    p_admin_id INT,
    p_candidate_id INT,
    p_full_name VARCHAR(150),
    p_dob DATE,
    p_party_id INT,
    p_constituency_id INT,
    p_assets_declared_inr NUMERIC(15, 2)
)
RETURNS SETOF public.candidates
LANGUAGE plpgsql
AS $$
DECLARE
    v_candidate public.candidates%ROWTYPE;
BEGIN
    SELECT * INTO v_candidate
    FROM public.candidates
    WHERE candidate_id = p_candidate_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Candidate not found' USING ERRCODE = 'VT003';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.vote_events WHERE candidate_id = p_candidate_id
    ) THEN
        RAISE EXCEPTION 'Candidate has recorded votes and cannot be changed'
            USING ERRCODE = 'VT008';
    END IF;

    UPDATE public.candidates
    SET full_name = p_full_name,
        dob = p_dob,
        party_id = p_party_id,
        constituency_id = p_constituency_id,
        assets_declared_inr = p_assets_declared_inr
    WHERE candidate_id = p_candidate_id
    RETURNING * INTO v_candidate;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'candidates',
        'UPDATE',
        v_candidate.candidate_id,
        jsonb_build_object('action', 'candidate_updated', 'admin_id', p_admin_id)
    );
    RETURN NEXT v_candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_candidate_api(
    p_admin_id INT,
    p_candidate_id INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_candidate_id INT;
BEGIN
    PERFORM 1 FROM public.candidates
    WHERE candidate_id = p_candidate_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Candidate not found' USING ERRCODE = 'VT003';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.vote_events WHERE candidate_id = p_candidate_id
    ) OR EXISTS (
        SELECT 1
        FROM public.results r
        JOIN public.elections e ON e.election_id = r.election_id
        WHERE r.candidate_id = p_candidate_id AND e.status = 'COMPLETED'
    ) THEN
        RAISE EXCEPTION 'Candidate with recorded or declared results cannot be deleted'
            USING ERRCODE = 'VT008';
    END IF;

    DELETE FROM public.results WHERE candidate_id = p_candidate_id;
    DELETE FROM public.nominations WHERE candidate_id = p_candidate_id;
    DELETE FROM public.candidates
    WHERE candidate_id = p_candidate_id
    RETURNING candidate_id INTO v_candidate_id;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'candidates',
        'DELETE',
        v_candidate_id,
        jsonb_build_object('action', 'candidate_deleted', 'admin_id', p_admin_id)
    );
    RETURN TRUE;
END;
$$;

-- A voter may only file a complaint for their own constituency.
CREATE OR REPLACE FUNCTION public.create_complaint_api(
    p_voter_id INT,
    p_constituency_id INT,
    p_election_id INT,
    p_description TEXT
)
RETURNS SETOF public.complaints
LANGUAGE plpgsql
AS $$
DECLARE
    v_filed_by    VARCHAR(150);
    v_voter_const INT;
    v_complaint   public.complaints%ROWTYPE;
BEGIN
    SELECT full_name, constituency_id INTO v_filed_by, v_voter_const
    FROM public.voters
    WHERE voter_id = p_voter_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF p_constituency_id IS DISTINCT FROM v_voter_const THEN
        RAISE EXCEPTION 'Complaint constituency must match the voter''s constituency'
            USING ERRCODE = 'VT006';
    END IF;

    INSERT INTO public.complaints (
        voter_id, filed_by, constituency_id, election_id, description
    )
    VALUES (p_voter_id, v_filed_by, p_constituency_id, p_election_id, p_description)
    RETURNING * INTO v_complaint;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'complaints',
        'INSERT',
        v_complaint.complaint_id,
        jsonb_build_object(
            'action', 'complaint_filed',
            'constituency_id', p_constituency_id,
            'election_id', p_election_id
        )
    );
    RETURN NEXT v_complaint;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_admin_api(
    p_email VARCHAR(255),
    p_password_hash TEXT
)
RETURNS TABLE(id INT, email VARCHAR(255))
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    INSERT INTO public.admins AS a (email, password_hash)
    VALUES (p_email, p_password_hash)
    RETURNING a.id, a.email;
END;
$$;

-- Administrative voter CRUD. Audit metadata deliberately excludes voter PII.
CREATE OR REPLACE FUNCTION public.admin_create_voter_api(
    p_admin_id INT,
    p_epic_number VARCHAR(20),
    p_full_name VARCHAR(150),
    p_dob DATE,
    p_constituency_id INT
)
RETURNS SETOF public.voters
LANGUAGE plpgsql
AS $$
DECLARE
    v_voter public.voters%ROWTYPE;
BEGIN
    INSERT INTO public.voters (
        epic_number, full_name, dob, constituency_id
    )
    VALUES (
        p_epic_number, p_full_name, p_dob, p_constituency_id
    )
    RETURNING * INTO v_voter;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'voters',
        'INSERT',
        v_voter.voter_id,
        jsonb_build_object('action', 'voter_created', 'admin_id', p_admin_id)
    );

    RETURN NEXT v_voter;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_voter_api(
    p_admin_id INT,
    p_voter_id INT,
    p_epic_number VARCHAR(20),
    p_full_name VARCHAR(150),
    p_dob DATE,
    p_constituency_id INT
)
RETURNS SETOF public.voters
LANGUAGE plpgsql
AS $$
DECLARE
    v_voter public.voters%ROWTYPE;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.has_voted
        WHERE voter_id = p_voter_id
    ) THEN
        RAISE EXCEPTION 'Voter with recorded participation cannot be updated'
            USING ERRCODE = 'VT008';
    END IF;

    UPDATE public.voters
    SET epic_number = p_epic_number,
        full_name = p_full_name,
        dob = p_dob,
        constituency_id = p_constituency_id
    WHERE voter_id = p_voter_id
    RETURNING * INTO v_voter;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Voter not found' USING ERRCODE = 'VT001';
    END IF;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'voters',
        'UPDATE',
        v_voter.voter_id,
        jsonb_build_object('action', 'voter_updated', 'admin_id', p_admin_id)
    );

    RETURN NEXT v_voter;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_voter_api(
    p_admin_id INT,
    p_voter_id INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_voter_id INT;
BEGIN
    DELETE FROM public.voters
    WHERE voter_id = p_voter_id
    RETURNING voter_id INTO v_voter_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Voter not found' USING ERRCODE = 'VT001';
    END IF;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'voters',
        'DELETE',
        v_voter_id,
        jsonb_build_object('action', 'voter_deleted', 'admin_id', p_admin_id)
    );

    RETURN TRUE;
END;
$$;

-- Administrative election CRUD and the supported lifecycle transitions.
CREATE OR REPLACE FUNCTION public.admin_create_election_api(
    p_admin_id INT,
    p_election_name VARCHAR(150),
    p_election_type VARCHAR(30),
    p_start_date DATE,
    p_end_date DATE
)
RETURNS SETOF public.elections
LANGUAGE plpgsql
AS $$
DECLARE
    v_election public.elections%ROWTYPE;
BEGIN
    INSERT INTO public.elections (
        election_name, election_type, start_date, end_date, status
    )
    VALUES (
        p_election_name, p_election_type, p_start_date, p_end_date, 'SCHEDULED'
    )
    RETURNING * INTO v_election;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'elections',
        'INSERT',
        v_election.election_id,
        jsonb_build_object('action', 'election_created', 'admin_id', p_admin_id)
    );
    RETURN NEXT v_election;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_election_api(
    p_admin_id INT,
    p_election_id INT,
    p_election_name VARCHAR(150),
    p_election_type VARCHAR(30),
    p_start_date DATE,
    p_end_date DATE
)
RETURNS SETOF public.elections
LANGUAGE plpgsql
AS $$
DECLARE
    v_election public.elections%ROWTYPE;
BEGIN
    SELECT * INTO v_election
    FROM public.elections
    WHERE election_id = p_election_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Election not found' USING ERRCODE = 'VT005';
    END IF;
    IF v_election.status <> 'SCHEDULED' THEN
        RAISE EXCEPTION 'Only scheduled elections can be edited'
            USING ERRCODE = 'VT008';
    END IF;

    UPDATE public.elections
    SET election_name = p_election_name,
        election_type = p_election_type,
        start_date = p_start_date,
        end_date = p_end_date
    WHERE election_id = p_election_id
    RETURNING * INTO v_election;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'elections',
        'UPDATE',
        v_election.election_id,
        jsonb_build_object('action', 'election_updated', 'admin_id', p_admin_id)
    );
    RETURN NEXT v_election;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_election_status_api(
    p_admin_id INT,
    p_election_id INT,
    p_status VARCHAR(20)
)
RETURNS SETOF public.elections
LANGUAGE plpgsql
AS $$
DECLARE
    v_election public.elections%ROWTYPE;
BEGIN
    SELECT * INTO v_election
    FROM public.elections
    WHERE election_id = p_election_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Election not found' USING ERRCODE = 'VT005';
    END IF;
    IF NOT (
        (v_election.status = 'SCHEDULED' AND p_status = 'ONGOING') OR
        (v_election.status = 'ONGOING' AND p_status = 'COMPLETED')
    ) THEN
        RAISE EXCEPTION 'Invalid election status transition'
            USING ERRCODE = 'VT008';
    END IF;

    UPDATE public.elections
    SET status = p_status
    WHERE election_id = p_election_id
    RETURNING * INTO v_election;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'elections',
        'UPDATE',
        v_election.election_id,
        jsonb_build_object(
            'action', 'election_status_changed',
            'status', p_status,
            'admin_id', p_admin_id
        )
    );
    RETURN NEXT v_election;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_election_api(
    p_admin_id INT,
    p_election_id INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_election_id INT;
BEGIN
    DELETE FROM public.elections
    WHERE election_id = p_election_id
    RETURNING election_id INTO v_election_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Election not found' USING ERRCODE = 'VT005';
    END IF;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'elections',
        'DELETE',
        v_election_id,
        jsonb_build_object('action', 'election_deleted', 'admin_id', p_admin_id)
    );
    RETURN TRUE;
END;
$$;

-- Reference-data lookups
CREATE OR REPLACE FUNCTION public.get_states_api()
RETURNS SETOF public.states
LANGUAGE sql
STABLE
AS $$
    SELECT * FROM public.states ORDER BY state_name;
$$;

CREATE OR REPLACE FUNCTION public.get_constituencies_api(
    p_state_id INT DEFAULT NULL
)
RETURNS SETOF public.constituencies
LANGUAGE sql
STABLE
AS $$
    SELECT * FROM public.constituencies
    WHERE p_state_id IS NULL OR state_id = p_state_id
    ORDER BY name;
$$;

CREATE OR REPLACE FUNCTION public.get_parties_api()
RETURNS SETOF public.parties
LANGUAGE sql
STABLE
AS $$
    SELECT * FROM public.parties ORDER BY party_name;
$$;

-- Administrative workflows

-- Nomination review: FILED -> ACCEPTED/REJECTED/WITHDRAWN, ACCEPTED -> WITHDRAWN
CREATE OR REPLACE FUNCTION public.set_nomination_status_api(
    p_nomination_id INT, p_status VARCHAR(20)
)
RETURNS SETOF public.nominations
LANGUAGE plpgsql
AS $$
DECLARE
    v_current VARCHAR(20);
BEGIN
    SELECT status INTO v_current FROM public.nominations
    WHERE nomination_id = p_nomination_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Nomination not found' USING ERRCODE = 'VT007';
    END IF;

    IF NOT (
        (v_current = 'FILED'    AND p_status IN ('ACCEPTED','REJECTED','WITHDRAWN')) OR
        (v_current = 'ACCEPTED' AND p_status = 'WITHDRAWN')
    ) THEN
        RAISE EXCEPTION 'Invalid nomination transition % -> %', v_current, p_status
            USING ERRCODE = 'VT008';
    END IF;

    RETURN QUERY
    UPDATE public.nominations SET status = p_status
    WHERE nomination_id = p_nomination_id
    RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_nomination_status_api(
    p_admin_id INT,
    p_nomination_id INT,
    p_status VARCHAR(20)
)
RETURNS SETOF public.nominations
LANGUAGE plpgsql
AS $$
DECLARE
    v_nomination public.nominations%ROWTYPE;
BEGIN
    SELECT * INTO v_nomination
    FROM public.nominations
    WHERE nomination_id = p_nomination_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Nomination not found' USING ERRCODE = 'VT007';
    END IF;
    IF NOT (
        (v_nomination.status = 'FILED' AND p_status IN ('ACCEPTED', 'REJECTED', 'WITHDRAWN')) OR
        (v_nomination.status = 'ACCEPTED' AND p_status = 'WITHDRAWN')
    ) THEN
        RAISE EXCEPTION 'Invalid nomination transition'
            USING ERRCODE = 'VT008';
    END IF;

    UPDATE public.nominations
    SET status = p_status
    WHERE nomination_id = p_nomination_id
    RETURNING * INTO v_nomination;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'nominations',
        'UPDATE',
        v_nomination.nomination_id,
        jsonb_build_object(
            'action', 'nomination_status_changed',
            'status', p_status,
            'admin_id', p_admin_id
        )
    );
    RETURN NEXT v_nomination;
END;
$$;

-- Election lifecycle: SCHEDULED -> ONGOING -> COMPLETED
CREATE OR REPLACE FUNCTION public.set_election_status_api(
    p_election_id INT, p_status VARCHAR(20)
)
RETURNS SETOF public.elections
LANGUAGE plpgsql
AS $$
DECLARE
    v_current VARCHAR(20);
BEGIN
    SELECT status INTO v_current FROM public.elections
    WHERE election_id = p_election_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Election not found' USING ERRCODE = 'VT005';
    END IF;

    IF NOT (
        (v_current = 'SCHEDULED' AND p_status = 'ONGOING') OR
        (v_current = 'ONGOING'   AND p_status = 'COMPLETED')
    ) THEN
        RAISE EXCEPTION 'Invalid election transition % -> %', v_current, p_status
            USING ERRCODE = 'VT008';
    END IF;

    RETURN QUERY
    UPDATE public.elections SET status = p_status
    WHERE election_id = p_election_id
    RETURNING *;
END;
$$;

-- Declare results: closes the election and stamps declared_at. Returns rows declared.
CREATE OR REPLACE FUNCTION public.declare_results_api(
    p_election_id INT
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_status VARCHAR(20);
    v_count  INT;
BEGIN
    SELECT status INTO v_status FROM public.elections
    WHERE election_id = p_election_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Election not found' USING ERRCODE = 'VT005';
    END IF;

    IF v_status = 'SCHEDULED' THEN
        RAISE EXCEPTION 'Cannot declare results for an election that has not started'
            USING ERRCODE = 'VT008';
    END IF;

    UPDATE public.elections SET status = 'COMPLETED' WHERE election_id = p_election_id;

    UPDATE public.results
    SET declared_at = COALESCE(declared_at, NOW())
    WHERE election_id = p_election_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_complaint_status_api(
    p_complaint_id INT, p_status VARCHAR(20)
)
RETURNS SETOF public.complaints
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.complaints SET status = p_status
    WHERE complaint_id = p_complaint_id
    RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_complaint_status_api(
    p_admin_id INT,
    p_complaint_id INT,
    p_status VARCHAR(20)
)
RETURNS SETOF public.complaints
LANGUAGE plpgsql
AS $$
DECLARE
    v_complaint public.complaints%ROWTYPE;
BEGIN
    UPDATE public.complaints
    SET status = p_status
    WHERE complaint_id = p_complaint_id
    RETURNING * INTO v_complaint;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'complaints',
        'UPDATE',
        v_complaint.complaint_id,
        jsonb_build_object(
            'action', 'complaint_status_changed',
            'status', p_status,
            'admin_id', p_admin_id
        )
    );
    RETURN NEXT v_complaint;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_mutate_reference_api(
    p_admin_id INT,
    p_entity VARCHAR(20),
    p_operation VARCHAR(10),
    p_record_id INT,
    p_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_party public.parties%ROWTYPE;
    v_constituency public.constituencies%ROWTYPE;
    v_observer public.observers%ROWTYPE;
    v_result JSONB;
    v_row_id BIGINT;
BEGIN
    IF p_entity = 'parties' THEN
        IF p_operation = 'CREATE' THEN
            INSERT INTO public.parties (party_name, symbol, founded_date)
            VALUES (p_data->>'name', NULLIF(p_data->>'symbol', ''),
                    NULLIF(p_data->>'founded', '')::DATE)
            RETURNING * INTO v_party;
        ELSIF p_operation = 'UPDATE' THEN
            UPDATE public.parties
            SET party_name = p_data->>'name',
                symbol = NULLIF(p_data->>'symbol', ''),
                founded_date = NULLIF(p_data->>'founded', '')::DATE
            WHERE party_id = p_record_id RETURNING * INTO v_party;
        ELSIF p_operation = 'DELETE' THEN
            DELETE FROM public.parties WHERE party_id = p_record_id
            RETURNING * INTO v_party;
        ELSE
            RAISE EXCEPTION 'Unsupported operation' USING ERRCODE = '22023';
        END IF;
        IF NOT FOUND THEN RAISE EXCEPTION 'Party not found' USING ERRCODE = 'P0002'; END IF;
        v_row_id := v_party.party_id;
        v_result := to_jsonb(v_party);
    ELSIF p_entity = 'constituencies' THEN
        IF p_operation = 'CREATE' THEN
            INSERT INTO public.constituencies (name, state_id, total_registered_voters)
            VALUES (p_data->>'name', (p_data->>'state_id')::INT, (p_data->>'voters')::INT)
            RETURNING * INTO v_constituency;
        ELSIF p_operation = 'UPDATE' THEN
            UPDATE public.constituencies
            SET name = p_data->>'name', state_id = (p_data->>'state_id')::INT,
                total_registered_voters = (p_data->>'voters')::INT
            WHERE constituency_id = p_record_id RETURNING * INTO v_constituency;
        ELSIF p_operation = 'DELETE' THEN
            DELETE FROM public.constituencies WHERE constituency_id = p_record_id
            RETURNING * INTO v_constituency;
        ELSE
            RAISE EXCEPTION 'Unsupported operation' USING ERRCODE = '22023';
        END IF;
        IF NOT FOUND THEN RAISE EXCEPTION 'Constituency not found' USING ERRCODE = 'P0002'; END IF;
        v_row_id := v_constituency.constituency_id;
        v_result := to_jsonb(v_constituency);
    ELSIF p_entity = 'observers' THEN
        IF p_operation = 'CREATE' THEN
            INSERT INTO public.observers (full_name, constituency_id, election_id)
            VALUES (p_data->>'name', (p_data->>'constituency_id')::INT,
                    (p_data->>'election_id')::INT)
            RETURNING * INTO v_observer;
        ELSIF p_operation = 'UPDATE' THEN
            UPDATE public.observers
            SET full_name = p_data->>'name',
                constituency_id = (p_data->>'constituency_id')::INT,
                election_id = (p_data->>'election_id')::INT
            WHERE observer_id = p_record_id RETURNING * INTO v_observer;
        ELSIF p_operation = 'DELETE' THEN
            DELETE FROM public.observers WHERE observer_id = p_record_id
            RETURNING * INTO v_observer;
        ELSE
            RAISE EXCEPTION 'Unsupported operation' USING ERRCODE = '22023';
        END IF;
        IF NOT FOUND THEN RAISE EXCEPTION 'Observer not found' USING ERRCODE = 'P0002'; END IF;
        v_row_id := v_observer.observer_id;
        v_result := to_jsonb(v_observer);
    ELSE
        RAISE EXCEPTION 'Unsupported entity' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (p_entity, p_operation, v_row_id,
            jsonb_build_object('action', 'admin_reference_write', 'admin_id', p_admin_id));
    RETURN v_result;
END;
$$;

-- Audit log lookup: paginated, with a maximum of 200 rows per call
CREATE OR REPLACE FUNCTION public.get_audit_log_api(
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS SETOF public.audit_log
LANGUAGE sql
STABLE
AS $$
    SELECT * FROM public.audit_log
    ORDER BY log_id DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 200)
    OFFSET GREATEST(p_offset, 0);
$$;

-- ============================================================
-- 8. PERMISSIONS AND ROW LEVEL SECURITY
-- Keep this section last. Access is intended for service_role only;
-- anon and authenticated receive no direct table/sequence privileges.
-- ============================================================

ALTER TABLE states          ENABLE ROW LEVEL SECURITY;
ALTER TABLE constituencies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties         ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE voters          ENABLE ROW LEVEL SECURITY;
ALTER TABLE elections       ENABLE ROW LEVEL SECURITY;
ALTER TABLE has_voted       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE results         ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints      ENABLE ROW LEVEL SECURITY;
ALTER TABLE observers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins          ENABLE ROW LEVEL SECURITY;

-- covers tables, views and sequences
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- future objects too
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

GRANT SELECT ON view_live_turnout, view_results_leaderboard TO service_role;

-- Remove default access to RPC functions and the stored procedure.
REVOKE ALL ON FUNCTION public.cast_vote_api(INT, INT, INT)                FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_candidates_api(INT)                     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_candidate_with_assets_api(VARCHAR, DATE, INT, INT, INT, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_complaint_api(INT, INT, INT, TEXT)   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_admin_api(VARCHAR, TEXT)             FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_create_voter_api(INT, VARCHAR, VARCHAR, DATE, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_voter_api(INT, INT, VARCHAR, VARCHAR, DATE, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_voter_api(INT, INT)             FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_create_election_api(INT, VARCHAR, VARCHAR, DATE, DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_election_api(INT, INT, VARCHAR, VARCHAR, DATE, DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_election_status_api(INT, INT, VARCHAR) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_election_api(INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_create_candidate_with_assets_api(INT, VARCHAR, DATE, INT, INT, INT, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_candidate_api(INT, INT, VARCHAR, DATE, INT, INT, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_candidate_api(INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_nomination_status_api(INT, INT, VARCHAR) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_complaint_status_api(INT, INT, VARCHAR) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_mutate_reference_api(INT, VARCHAR, VARCHAR, INT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_states_api()                            FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_constituencies_api(INT)                 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_parties_api()                           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_nomination_status_api(INT, VARCHAR)     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_election_status_api(INT, VARCHAR)       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.declare_results_api(INT)                    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_complaint_status_api(INT, VARCHAR)      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_audit_log_api(INT, INT)                 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON PROCEDURE public.cast_vote(INT, INT, INT)                   FROM PUBLIC, anon, authenticated;

-- Grant RPC execution to the backend role.
GRANT EXECUTE ON FUNCTION public.cast_vote_api(INT, INT, INT)                TO service_role;
GRANT EXECUTE ON FUNCTION public.get_candidates_api(INT)                     TO service_role;
GRANT EXECUTE ON FUNCTION public.create_candidate_with_assets_api(VARCHAR, DATE, INT, INT, INT, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_complaint_api(INT, INT, INT, TEXT)   TO service_role;
GRANT EXECUTE ON FUNCTION public.create_admin_api(VARCHAR, TEXT)             TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_voter_api(INT, VARCHAR, VARCHAR, DATE, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_voter_api(INT, INT, VARCHAR, VARCHAR, DATE, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_voter_api(INT, INT)             TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_election_api(INT, VARCHAR, VARCHAR, DATE, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_election_api(INT, INT, VARCHAR, VARCHAR, DATE, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_election_status_api(INT, INT, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_election_api(INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_candidate_with_assets_api(INT, VARCHAR, DATE, INT, INT, INT, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_candidate_api(INT, INT, VARCHAR, DATE, INT, INT, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_candidate_api(INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_nomination_status_api(INT, INT, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_complaint_status_api(INT, INT, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_mutate_reference_api(INT, VARCHAR, VARCHAR, INT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_states_api()                            TO service_role;
GRANT EXECUTE ON FUNCTION public.get_constituencies_api(INT)                 TO service_role;
GRANT EXECUTE ON FUNCTION public.get_parties_api()                           TO service_role;
GRANT EXECUTE ON FUNCTION public.set_nomination_status_api(INT, VARCHAR)     TO service_role;
GRANT EXECUTE ON FUNCTION public.set_election_status_api(INT, VARCHAR)       TO service_role;
GRANT EXECUTE ON FUNCTION public.declare_results_api(INT)                    TO service_role;
GRANT EXECUTE ON FUNCTION public.set_complaint_status_api(INT, VARCHAR)      TO service_role;
GRANT EXECUTE ON FUNCTION public.get_audit_log_api(INT, INT)                 TO service_role;
GRANT EXECUTE ON PROCEDURE public.cast_vote(INT, INT, INT)                   TO service_role;

-- ============================================================
-- 9. MANUAL VERIFICATION (run after setup)
-- ============================================================
-- With the anon key, these should return 401/403 or an empty result:
--   GET /rest/v1/voters | /rest/v1/admins | /rest/v1/has_voted | /rest/v1/vote_events
-- SELECT relname, relrowsecurity FROM pg_class
--   WHERE relnamespace = 'public'::regnamespace AND relkind = 'r';