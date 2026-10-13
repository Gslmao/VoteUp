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
