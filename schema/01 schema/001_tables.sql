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
