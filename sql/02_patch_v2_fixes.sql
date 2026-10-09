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