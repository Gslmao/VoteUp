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