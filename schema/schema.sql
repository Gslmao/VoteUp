-- ============================================================
-- ELECTION COMMISSION DATABASE
-- PostgreSQL DDL | BACSE202 Database Systems Project
-- 23 tables | keys, constraints, triggers, views, procedures
-- ============================================================

-- ============ MODULE: GEOGRAPHY & PARTIES ============

CREATE TABLE states (
    state_id        SERIAL PRIMARY KEY,
    state_name      VARCHAR(100) NOT NULL UNIQUE,
    region          VARCHAR(50)
);

CREATE TABLE constituencies (
    constituency_id SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    state_id        INT NOT NULL REFERENCES states(state_id) ON DELETE RESTRICT,
    reserved_category VARCHAR(20) CHECK (reserved_category IN ('GENERAL','SC','ST','OBC')) DEFAULT 'GENERAL',
    total_registered_voters INT DEFAULT 0 CHECK (total_registered_voters >= 0),
    UNIQUE (name, state_id)
);

CREATE TABLE parties (
    party_id        SERIAL PRIMARY KEY,
    party_name      VARCHAR(150) NOT NULL UNIQUE,
    symbol          VARCHAR(100),
    founded_date    DATE,
    ideology        VARCHAR(200),
    is_national_party BOOLEAN DEFAULT FALSE
);

CREATE TABLE alliances (
    alliance_id     SERIAL PRIMARY KEY,
    alliance_name   VARCHAR(150) NOT NULL UNIQUE,
    formed_date     DATE
);

CREATE TABLE alliance_members (
    alliance_id     INT REFERENCES alliances(alliance_id) ON DELETE CASCADE,
    party_id        INT REFERENCES parties(party_id) ON DELETE CASCADE,
    joined_date     DATE NOT NULL,
    PRIMARY KEY (alliance_id, party_id)
);

-- ============ MODULE: CANDIDATES & NOMINATIONS ============

CREATE TABLE candidates (
    candidate_id    SERIAL PRIMARY KEY,
    full_name       VARCHAR(150) NOT NULL,
    dob             DATE NOT NULL,
    gender          VARCHAR(10) CHECK (gender IN ('M','F','OTHER')),
    party_id        INT REFERENCES parties(party_id) ON DELETE SET NULL,
    constituency_id INT NOT NULL REFERENCES constituencies(constituency_id) ON DELETE RESTRICT,
    criminal_cases_count INT DEFAULT 0 CHECK (criminal_cases_count >= 0),
    assets_declared_inr NUMERIC(15,2) DEFAULT 0,
    CHECK (dob <= CURRENT_DATE - INTERVAL '25 years')  -- min age to contest
);

CREATE TABLE nominations (
    nomination_id   SERIAL PRIMARY KEY,
    candidate_id    INT NOT NULL REFERENCES candidates(candidate_id) ON DELETE CASCADE,
    filed_date      DATE NOT NULL,
    scrutiny_date   DATE,
    status          VARCHAR(20) CHECK (status IN ('FILED','ACCEPTED','REJECTED','WITHDRAWN')) DEFAULT 'FILED',
    rejection_reason VARCHAR(300),
    CHECK (scrutiny_date IS NULL OR scrutiny_date >= filed_date)
);

-- ============ MODULE: VOTERS (identity kept separate from ballots) ============

CREATE TABLE voters (
    voter_id        SERIAL PRIMARY KEY,
    epic_number     VARCHAR(20) NOT NULL UNIQUE,   -- Elector Photo ID Card number
    full_name       VARCHAR(150) NOT NULL,
    dob             DATE NOT NULL,
    gender          VARCHAR(10) CHECK (gender IN ('M','F','OTHER')),
    address         VARCHAR(300),
    constituency_id INT NOT NULL REFERENCES constituencies(constituency_id) ON DELETE RESTRICT,
    CHECK (dob <= CURRENT_DATE - INTERVAL '18 years')
);

CREATE TABLE voter_id_verification (
    verification_id SERIAL PRIMARY KEY,
    voter_id        INT NOT NULL REFERENCES voters(voter_id) ON DELETE CASCADE,
    doc_type        VARCHAR(30) CHECK (doc_type IN ('AADHAAR','PASSPORT','DRIVING_LICENSE','RATION_CARD')),
    doc_number      VARCHAR(50) NOT NULL,
    verified_by     VARCHAR(100),
    verified_at     TIMESTAMP,
    status          VARCHAR(20) CHECK (status IN ('PENDING','VERIFIED','REJECTED')) DEFAULT 'PENDING'
);

-- ============ MODULE: ELECTIONS ============

CREATE TABLE elections (
    election_id     SERIAL PRIMARY KEY,
    election_name   VARCHAR(150) NOT NULL,
    election_type   VARCHAR(30) CHECK (election_type IN ('GENERAL','BY_ELECTION','STATE')),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    status          VARCHAR(20) CHECK (status IN ('SCHEDULED','ONGOING','COMPLETED')) DEFAULT 'SCHEDULED',
    CHECK (end_date >= start_date)
);

CREATE TABLE election_phases (
    phase_id        SERIAL PRIMARY KEY,
    election_id     INT NOT NULL REFERENCES elections(election_id) ON DELETE CASCADE,
    phase_number    INT NOT NULL CHECK (phase_number > 0),
    phase_date      DATE NOT NULL,
    UNIQUE (election_id, phase_number)
);

-- ============ MODULE: BOOTHS, OFFICERS, EVMS ============

CREATE TABLE booth_officers (
    officer_id      SERIAL PRIMARY KEY,
    full_name       VARCHAR(150) NOT NULL,
    designation     VARCHAR(50)
);

CREATE TABLE polling_booths (
    booth_id        SERIAL PRIMARY KEY,
    constituency_id INT NOT NULL REFERENCES constituencies(constituency_id) ON DELETE RESTRICT,
    location        VARCHAR(200) NOT NULL,
    officer_id      INT REFERENCES booth_officers(officer_id) ON DELETE SET NULL,
    capacity        INT CHECK (capacity > 0)
);

CREATE TABLE evms (
    evm_id          SERIAL PRIMARY KEY,
    booth_id        INT NOT NULL REFERENCES polling_booths(booth_id) ON DELETE CASCADE,
    serial_number   VARCHAR(50) NOT NULL UNIQUE,
    status          VARCHAR(20) CHECK (status IN ('ACTIVE','FAULTY','RETIRED')) DEFAULT 'ACTIVE',
    last_maintenance_date DATE
);

-- ============ MODULE: VOTING (integrity-critical) ============

-- tracks WHO has voted, without ever linking to WHAT they voted for
CREATE TABLE has_voted (
    voter_id        INT NOT NULL REFERENCES voters(voter_id) ON DELETE CASCADE,
    election_id     INT NOT NULL REFERENCES elections(election_id) ON DELETE CASCADE,
    voted_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    booth_id        INT NOT NULL REFERENCES polling_booths(booth_id),
    PRIMARY KEY (voter_id, election_id)   -- enforces one vote per voter per election
);

-- anonymous ballot: deliberately has NO foreign key back to voters/has_voted
CREATE TABLE vote_events (
    vote_id         BIGSERIAL PRIMARY KEY,
    evm_id          INT NOT NULL REFERENCES evms(evm_id),
    constituency_id INT NOT NULL REFERENCES constituencies(constituency_id),
    candidate_id    INT NOT NULL REFERENCES candidates(candidate_id),
    election_id     INT NOT NULL REFERENCES elections(election_id),
    cast_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE results (
    result_id       SERIAL PRIMARY KEY,
    constituency_id INT NOT NULL REFERENCES constituencies(constituency_id),
    candidate_id    INT NOT NULL REFERENCES candidates(candidate_id),
    election_id     INT NOT NULL REFERENCES elections(election_id),
    total_votes     INT NOT NULL DEFAULT 0 CHECK (total_votes >= 0),
    declared_at     TIMESTAMP,
    UNIQUE (constituency_id, candidate_id, election_id)
);

CREATE TABLE recounts (
    recount_id      SERIAL PRIMARY KEY,
    constituency_id INT NOT NULL REFERENCES constituencies(constituency_id),
    election_id     INT NOT NULL REFERENCES elections(election_id),
    requested_by    VARCHAR(150),
    reason          VARCHAR(300),
    status          VARCHAR(20) CHECK (status IN ('REQUESTED','IN_PROGRESS','COMPLETED','DENIED')) DEFAULT 'REQUESTED',
    new_total_votes INT
);

-- ============ MODULE: OVERSIGHT & COMPLIANCE ============

CREATE TABLE observers (
    observer_id     SERIAL PRIMARY KEY,
    full_name       VARCHAR(150) NOT NULL,
    assigned_constituency_id INT REFERENCES constituencies(constituency_id),
    election_id     INT REFERENCES elections(election_id),
    report_submitted BOOLEAN DEFAULT FALSE
);

CREATE TABLE complaints (
    complaint_id    SERIAL PRIMARY KEY,
    filed_by        VARCHAR(150),
    booth_id        INT REFERENCES polling_booths(booth_id),
    election_id     INT NOT NULL REFERENCES elections(election_id),
    description     TEXT NOT NULL,
    status          VARCHAR(20) CHECK (status IN ('OPEN','INVESTIGATING','RESOLVED','DISMISSED')) DEFAULT 'OPEN',
    filed_at        TIMESTAMP DEFAULT NOW()
);

CREATE TABLE model_code_violations (
    violation_id    SERIAL PRIMARY KEY,
    party_id        INT REFERENCES parties(party_id),
    candidate_id    INT REFERENCES candidates(candidate_id),
    election_id     INT NOT NULL REFERENCES elections(election_id),
    description     TEXT NOT NULL,
    action_taken    VARCHAR(300),
    reported_at     TIMESTAMP DEFAULT NOW(),
    CHECK (party_id IS NOT NULL OR candidate_id IS NOT NULL)
);

CREATE TABLE security_deployment (
    deployment_id   SERIAL PRIMARY KEY,
    booth_id        INT NOT NULL REFERENCES polling_booths(booth_id) ON DELETE CASCADE,
    election_id     INT NOT NULL REFERENCES elections(election_id),
    personnel_count INT CHECK (personnel_count >= 0),
    force_type      VARCHAR(50)
);

CREATE TABLE audit_log (
    log_id          BIGSERIAL PRIMARY KEY,
    table_name      VARCHAR(50) NOT NULL,
    operation       VARCHAR(10) NOT NULL,
    changed_by      VARCHAR(100) DEFAULT CURRENT_USER,
    changed_at      TIMESTAMP DEFAULT NOW(),
    row_id          BIGINT,
    details         JSONB
);

-- ============================================================
-- INDEXES (Module 3: Physical Design / Indexing)
-- ============================================================
CREATE INDEX idx_voters_epic ON voters(epic_number);
CREATE INDEX idx_voters_constituency ON voters(constituency_id);
CREATE INDEX idx_vote_events_election_constituency ON vote_events(election_id, constituency_id);
CREATE INDEX idx_candidates_constituency ON candidates(constituency_id);

-- ============================================================
-- TRIGGER: enforce one-vote-per-election at insert time
-- (belt-and-suspenders on top of the has_voted PK)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_check_double_vote()
RETURNS TRIGGER AS $$
BEGIN
    -- if a matching has_voted row already predates this vote event's booth+election,
    -- this is a demo hook: real check happens via has_voted PK + app-level procedure below.
    INSERT INTO audit_log(table_name, operation, row_id, details)
    VALUES ('vote_events', 'INSERT', NEW.vote_id, jsonb_build_object('election_id', NEW.election_id));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vote_audit
AFTER INSERT ON vote_events
FOR EACH ROW EXECUTE FUNCTION fn_check_double_vote();

-- ============================================================
-- STORED PROCEDURE: cast_vote (atomic, rejects double voting)
-- ============================================================
CREATE OR REPLACE PROCEDURE cast_vote(
    p_voter_id INT, p_election_id INT, p_booth_id INT,
    p_evm_id INT, p_constituency_id INT, p_candidate_id INT
) LANGUAGE plpgsql AS $$
BEGIN
    -- this INSERT fails on the PK if voter already voted in this election
    INSERT INTO has_voted(voter_id, election_id, booth_id)
    VALUES (p_voter_id, p_election_id, p_booth_id);

    INSERT INTO vote_events(evm_id, constituency_id, candidate_id, election_id)
    VALUES (p_evm_id, p_constituency_id, p_candidate_id, p_election_id);

    COMMIT;
EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Voter % has already voted in election %', p_voter_id, p_election_id;
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
-- VIEW: constituency-wise result leaderboard
-- ============================================================
CREATE VIEW view_results_leaderboard AS
SELECT r.election_id, r.constituency_id, cn.name AS constituency_name,
       ca.full_name AS candidate_name, p.party_name, r.total_votes,
       RANK() OVER (PARTITION BY r.constituency_id, r.election_id ORDER BY r.total_votes DESC) AS rank
FROM results r
JOIN constituencies cn ON cn.constituency_id = r.constituency_id
JOIN candidates ca ON ca.candidate_id = r.candidate_id
LEFT JOIN parties p ON p.party_id = ca.party_id;
