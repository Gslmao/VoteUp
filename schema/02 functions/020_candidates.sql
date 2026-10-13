-- ============================================================
-- RPC: CANDIDATE MANAGEMENT
-- ============================================================

-- Creates a candidate, a FILED nomination, and a zero-vote result row.
-- The candidate cannot receive votes until the nomination is ACCEPTED.
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
    SELECT status INTO v_status FROM public.elections WHERE election_id = p_election_id;
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

CREATE OR REPLACE FUNCTION public.admin_create_candidate_with_assets_api(
    p_admin_id INT,
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
    v_status VARCHAR(20);
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

    INSERT INTO public.candidates (
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

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'candidates',
        'INSERT',
        v_candidate.candidate_id,
        jsonb_build_object('action', 'candidate_created', 'admin_id', p_admin_id)
    );
    RETURN NEXT v_candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_candidate_api(
    p_admin_id INT,
    p_candidate_id INT,
    p_full_name VARCHAR(150),
    p_dob DATE,
    p_party_id INT,
    p_constituency_id INT,
    p_assets_declared_inr NUMERIC(15, 2)
)
RETURNS SETOF public.candidates
LANGUAGE plpgsql
AS $$
DECLARE
    v_candidate public.candidates%ROWTYPE;
BEGIN
    SELECT * INTO v_candidate
    FROM public.candidates
    WHERE candidate_id = p_candidate_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Candidate not found' USING ERRCODE = 'VT003';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.vote_events WHERE candidate_id = p_candidate_id
    ) THEN
        RAISE EXCEPTION 'Candidate has recorded votes and cannot be changed'
            USING ERRCODE = 'VT008';
    END IF;

    UPDATE public.candidates
    SET full_name = p_full_name,
        dob = p_dob,
        party_id = p_party_id,
        constituency_id = p_constituency_id,
        assets_declared_inr = p_assets_declared_inr
    WHERE candidate_id = p_candidate_id
    RETURNING * INTO v_candidate;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'candidates',
        'UPDATE',
        v_candidate.candidate_id,
        jsonb_build_object('action', 'candidate_updated', 'admin_id', p_admin_id)
    );
    RETURN NEXT v_candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_candidate_api(
    p_admin_id INT,
    p_candidate_id INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_candidate_id INT;
BEGIN
    PERFORM 1 FROM public.candidates
    WHERE candidate_id = p_candidate_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Candidate not found' USING ERRCODE = 'VT003';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.vote_events WHERE candidate_id = p_candidate_id
    ) OR EXISTS (
        SELECT 1
        FROM public.results r
        JOIN public.elections e ON e.election_id = r.election_id
        WHERE r.candidate_id = p_candidate_id AND e.status = 'COMPLETED'
    ) THEN
        RAISE EXCEPTION 'Candidate with recorded or declared results cannot be deleted'
            USING ERRCODE = 'VT008';
    END IF;

    DELETE FROM public.results WHERE candidate_id = p_candidate_id;
    DELETE FROM public.nominations WHERE candidate_id = p_candidate_id;
    DELETE FROM public.candidates
    WHERE candidate_id = p_candidate_id
    RETURNING candidate_id INTO v_candidate_id;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'candidates',
        'DELETE',
        v_candidate_id,
        jsonb_build_object('action', 'candidate_deleted', 'admin_id', p_admin_id)
    );
    RETURN TRUE;
END;
$$;
