-- Complete voting backend schema. Run once against a new, empty project/database.

-- Order: base schema, v2 fixes, admin auth, development seed, Supabase API wrappers.

-- Do not run against a database that already contains this schema.

-- ===== Base schema =====

-- ============================================================
-- ELECTION COMMISSION DATABASE (Simplified)
-- PostgreSQL DDL | BACSE202 Database Systems Project
-- 15 tables | straightforward keys & constraints
-- ============================================================

CREATE TABLE states (
    state_id        SERIAL PRIMARY KEY,
    state_name      VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE constituencies (
    constituency_id SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    state_id        INT NOT NULL REFERENCES states(state_id),
    total_registered_voters INT DEFAULT 0 CHECK (total_registered_voters >= 0),
    UNIQUE (name, state_id)
);

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
    assets_declared_inr NUMERIC(15,2) DEFAULT 0,
    CHECK (dob <= CURRENT_DATE - INTERVAL '25 years')
);

CREATE TABLE nominations (
    nomination_id   SERIAL PRIMARY KEY,
    candidate_id    INT NOT NULL REFERENCES candidates(candidate_id),
    filed_date      DATE NOT NULL,
    status          VARCHAR(20) CHECK (status IN ('FILED','ACCEPTED','REJECTED','WITHDRAWN')) DEFAULT 'FILED'
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
    election_type   VARCHAR(30) CHECK (election_type IN ('GENERAL','BY_ELECTION','STATE')),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    status          VARCHAR(20) CHECK (status IN ('SCHEDULED','ONGOING','COMPLETED')) DEFAULT 'SCHEDULED',
    CHECK (end_date >= start_date)
);

-- tracks WHO has voted, without ever linking to WHAT they voted for
CREATE TABLE has_voted (
    voter_id        INT NOT NULL REFERENCES voters(voter_id),
    election_id     INT NOT NULL REFERENCES elections(election_id),
    voted_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (voter_id, election_id)   -- enforces one vote per voter per election
);

-- anonymous ballot: deliberately no FK back to voters/has_voted
CREATE TABLE vote_events (
    vote_id         BIGSERIAL PRIMARY KEY,
    election_id     INT NOT NULL REFERENCES elections(election_id),
    candidate_id    INT NOT NULL REFERENCES candidates(candidate_id),
    cast_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

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
    filed_by        VARCHAR(150),
    constituency_id INT REFERENCES constituencies(constituency_id),
    election_id     INT NOT NULL REFERENCES elections(election_id),
    description     TEXT NOT NULL,
    status          VARCHAR(20) CHECK (status IN ('OPEN','INVESTIGATING','RESOLVED','DISMISSED')) DEFAULT 'OPEN'
);

CREATE TABLE observers (
    observer_id     SERIAL PRIMARY KEY,
    full_name       VARCHAR(150) NOT NULL,
    constituency_id INT REFERENCES constituencies(constituency_id),
    election_id     INT REFERENCES elections(election_id)
);

CREATE TABLE audit_log (
    log_id          BIGSERIAL PRIMARY KEY,
    table_name      VARCHAR(50) NOT NULL,
    operation       VARCHAR(10) NOT NULL,
    changed_at      TIMESTAMP DEFAULT NOW(),
    row_id          BIGINT,
    details         JSONB
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_voters_epic ON voters(epic_number);
CREATE INDEX idx_vote_events_election ON vote_events(election_id);
CREATE INDEX idx_candidates_constituency ON candidates(constituency_id);

-- ============================================================
-- TRIGGER: log every vote cast to audit_log
-- ============================================================
CREATE OR REPLACE FUNCTION fn_log_vote()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO results(election_id, candidate_id, total_votes)
    VALUES (NEW.election_id, NEW.candidate_id, 1)
    ON CONFLICT (election_id, candidate_id)
    DO UPDATE SET total_votes = results.total_votes + 1;

    INSERT INTO audit_log(table_name, operation, row_id, details)
    VALUES ('vote_events', 'INSERT', NEW.vote_id, jsonb_build_object('election_id', NEW.election_id));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vote_audit
AFTER INSERT ON vote_events
FOR EACH ROW EXECUTE FUNCTION fn_log_vote();

-- ============================================================
-- STORED PROCEDURE: cast_vote (atomic, rejects double voting)
-- ============================================================
CREATE OR REPLACE PROCEDURE cast_vote(
    p_voter_id INT, p_election_id INT, p_candidate_id INT
) LANGUAGE plpgsql AS $$
DECLARE
    v_constituency_id INT;
BEGIN
    SELECT constituency_id INTO v_constituency_id
    FROM voters
    WHERE voter_id = p_voter_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Voter not found';
    END IF;

    PERFORM 1 FROM elections
    WHERE election_id = p_election_id AND status = 'ONGOING'
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Election is not open for voting';
    END IF;

    PERFORM 1
    FROM candidates c
    JOIN results r ON r.candidate_id = c.candidate_id
                 AND r.election_id = p_election_id
    WHERE c.candidate_id = p_candidate_id
      AND c.constituency_id = v_constituency_id
    FOR SHARE OF c, r;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Candidate is not registered for this election and constituency';
    END IF;

    INSERT INTO has_voted(voter_id, election_id)
    VALUES (p_voter_id, p_election_id)
    ON CONFLICT DO NOTHING;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Voter % has already voted in election %', p_voter_id, p_election_id;
    END IF;

    INSERT INTO vote_events(election_id, candidate_id)
    VALUES (p_election_id, p_candidate_id);
END;
$$;

-- ============================================================
-- VIEW: live turnout percentage per constituency
-- ============================================================
CREATE VIEW view_live_turnout AS
SELECT c.constituency_id, c.name,
       c.total_registered_voters,
       COUNT(hv.voter_id) AS votes_cast,
       ROUND(100.0 * COUNT(hv.voter_id) / NULLIF(c.total_registered_voters,0), 2) AS turnout_pct
FROM constituencies c
LEFT JOIN voters v ON v.constituency_id = c.constituency_id
LEFT JOIN has_voted hv ON hv.voter_id = v.voter_id
GROUP BY c.constituency_id, c.name, c.total_registered_voters;

-- ============================================================
-- VIEW: results leaderboard
-- ============================================================
CREATE VIEW view_results_leaderboard AS
SELECT r.election_id, ca.full_name AS candidate_name, p.party_name, r.total_votes,
       RANK() OVER (PARTITION BY r.election_id ORDER BY r.total_votes DESC) AS rank
FROM results r
JOIN candidates ca ON ca.candidate_id = r.candidate_id
LEFT JOIN parties p ON p.party_id = ca.party_id;
-- ===== V2 procedure and view fixes =====

CREATE OR REPLACE PROCEDURE cast_vote(
    p_voter_id INT, p_election_id INT, p_candidate_id INT
) LANGUAGE plpgsql AS $$
DECLARE
    v_constituency_id INT;
BEGIN
    SELECT constituency_id INTO v_constituency_id
    FROM voters
    WHERE voter_id = p_voter_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Voter not found';
    END IF;

    PERFORM 1 FROM elections
    WHERE election_id = p_election_id AND status = 'ONGOING'
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Election is not open for voting';
    END IF;

    PERFORM 1
    FROM candidates c
    JOIN results r ON r.candidate_id = c.candidate_id
                 AND r.election_id = p_election_id
    WHERE c.candidate_id = p_candidate_id
      AND c.constituency_id = v_constituency_id
    FOR SHARE OF c, r;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Candidate is not registered for this election and constituency';
    END IF;

    INSERT INTO has_voted(voter_id, election_id)
    VALUES (p_voter_id, p_election_id)
    ON CONFLICT DO NOTHING;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Voter % has already voted in election %', p_voter_id, p_election_id;
    END IF;

    INSERT INTO vote_events(election_id, candidate_id)
    VALUES (p_election_id, p_candidate_id);
END;
$$;

DROP VIEW IF EXISTS view_results_leaderboard;
CREATE VIEW view_results_leaderboard AS
SELECT r.election_id, ca.constituency_id, cn.name AS constituency_name,
       ca.full_name AS candidate_name, p.party_name, r.total_votes,
       RANK() OVER (PARTITION BY ca.constituency_id, r.election_id
                    ORDER BY r.total_votes DESC) AS rank
FROM results r
JOIN candidates ca ON ca.candidate_id = r.candidate_id
JOIN constituencies cn ON cn.constituency_id = ca.constituency_id
LEFT JOIN parties p ON p.party_id = ca.party_id;

DROP VIEW IF EXISTS view_live_turnout;
CREATE VIEW view_live_turnout AS
SELECT c.constituency_id, c.name, e.election_id,
       c.total_registered_voters,
       COUNT(hv.voter_id) AS votes_cast,
       ROUND(100.0 * COUNT(hv.voter_id) / NULLIF(c.total_registered_voters, 0), 2) AS turnout_pct
FROM constituencies c
CROSS JOIN elections e
LEFT JOIN voters v ON v.constituency_id = c.constituency_id
LEFT JOIN has_voted hv ON hv.voter_id = v.voter_id AND hv.election_id = e.election_id
GROUP BY c.constituency_id, c.name, e.election_id, c.total_registered_voters;
-- ===== Admin authentication table =====

CREATE TABLE admins (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX admins_singleton_idx ON admins ((TRUE));
-- ===== Development seed data =====

INSERT INTO states(state_name)
VALUES ('Example State');

INSERT INTO constituencies(name, state_id, total_registered_voters)
VALUES ('Central Constituency', 1, 1000);

INSERT INTO parties(party_name, symbol, founded_date)
VALUES
    ('Civic Party', 'Lamp', '2000-01-01'),
    ('People Party', 'Tree', '2005-01-01');

INSERT INTO candidates(full_name, dob, party_id, constituency_id, assets_declared_inr)
VALUES
    ('Candidate One', '1980-01-01', 1, 1, 0),
    ('Candidate Two', '1982-02-02', 2, 1, 0);

INSERT INTO nominations(candidate_id, filed_date, status)
VALUES
    (1, CURRENT_DATE, 'ACCEPTED'),
    (2, CURRENT_DATE, 'ACCEPTED');

INSERT INTO voters(epic_number, full_name, dob, constituency_id)
VALUES
    ('DEMO0000001', 'Demo Voter One', '1990-01-01', 1),
    ('DEMO0000002', 'Demo Voter Two', '1991-01-01', 1);

INSERT INTO elections(election_name, election_type, start_date, end_date, status)
VALUES ('Demo Election', 'GENERAL', CURRENT_DATE, CURRENT_DATE + 1, 'ONGOING');

INSERT INTO results(election_id, candidate_id, total_votes)
VALUES (1, 1, 0), (1, 2, 0);
-- ===== Supabase PostgREST API wrappers and vote tally trigger fix =====

-- PostgREST exposes PostgreSQL functions as RPC endpoints, but not procedures.
-- These wrappers keep writes transactional and preserve the existing vote procedure.

CREATE OR REPLACE FUNCTION public.fn_log_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.results AS current_result(election_id, candidate_id, total_votes)
    VALUES (NEW.election_id, NEW.candidate_id, 1)
    ON CONFLICT (election_id, candidate_id)
    DO UPDATE SET total_votes = current_result.total_votes + 1;

    INSERT INTO public.audit_log(table_name, operation, row_id, details)
    VALUES (
        'vote_events',
        'INSERT',
        NEW.vote_id,
        jsonb_build_object('election_id', NEW.election_id)
    );

    RETURN NEW;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.get_candidates_api(p_constituency_id INT DEFAULT NULL)
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

CREATE OR REPLACE FUNCTION public.create_candidate_api(
    p_full_name VARCHAR(150),
    p_dob DATE,
    p_party_id INT,
    p_constituency_id INT,
    p_election_id INT
)
RETURNS SETOF public.candidates
LANGUAGE plpgsql
AS $$
DECLARE
    v_candidate public.candidates%ROWTYPE;
BEGIN
    INSERT INTO public.candidates(full_name, dob, party_id, constituency_id)
    VALUES (p_full_name, p_dob, p_party_id, p_constituency_id)
    RETURNING * INTO v_candidate;

    INSERT INTO public.nominations(candidate_id, filed_date)
    VALUES (v_candidate.candidate_id, CURRENT_DATE);

    INSERT INTO public.results(election_id, candidate_id, total_votes)
    VALUES (p_election_id, v_candidate.candidate_id, 0);

    RETURN NEXT v_candidate;
END;
$$;

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
    v_filed_by VARCHAR(150);
    v_complaint public.complaints%ROWTYPE;
BEGIN
    SELECT full_name INTO v_filed_by
    FROM public.voters
    WHERE voter_id = p_voter_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    INSERT INTO public.complaints(filed_by, constituency_id, election_id, description)
    VALUES (v_filed_by, p_constituency_id, p_election_id, p_description)
    RETURNING * INTO v_complaint;

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
    INSERT INTO public.admins AS a(email, password_hash)
    VALUES (p_email, p_password_hash)
    RETURNING a.id, a.email;
END;
$$;

REVOKE ALL ON FUNCTION public.cast_vote_api(INT, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_candidates_api(INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_candidate_api(VARCHAR, DATE, INT, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_complaint_api(INT, INT, INT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_admin_api(VARCHAR, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.cast_vote_api(INT, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_candidates_api(INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_candidate_api(VARCHAR, DATE, INT, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_complaint_api(INT, INT, INT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_admin_api(VARCHAR, TEXT) TO service_role;

REVOKE ALL ON PROCEDURE public.cast_vote(INT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON PROCEDURE public.cast_vote(INT, INT, INT) TO service_role;
