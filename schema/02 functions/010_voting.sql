-- ============================================================
-- RPC: VOTING
-- PostgREST exposes PostgreSQL functions through /rpc, not procedures.
-- ============================================================
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
