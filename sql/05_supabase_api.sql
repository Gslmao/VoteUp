-- PostgREST exposes PostgreSQL functions as RPC endpoints, but not procedures.
-- These wrappers keep writes transactional and preserve the existing vote procedure.

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
