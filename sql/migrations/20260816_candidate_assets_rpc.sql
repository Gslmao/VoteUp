-- Apply to an existing database to enable admin candidate creation with
-- declared assets. This is an incremental migration; do not rerun schema.sql.
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
    SELECT status INTO v_status
    FROM public.elections
    WHERE election_id = p_election_id;
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

REVOKE ALL ON FUNCTION public.create_candidate_with_assets_api(
    VARCHAR, DATE, INT, INT, INT, NUMERIC
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_candidate_with_assets_api(
    VARCHAR, DATE, INT, INT, INT, NUMERIC
) TO service_role;
