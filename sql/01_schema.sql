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
BEGIN
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