-- ============================================================
-- RPC: ADMIN VOTER CRUD
-- Audit metadata deliberately excludes voter PII.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_create_voter_api(
    p_admin_id INT,
    p_epic_number VARCHAR(20),
    p_full_name VARCHAR(150),
    p_dob DATE,
    p_constituency_id INT
)
RETURNS SETOF public.voters
LANGUAGE plpgsql
AS $$
DECLARE
    v_voter public.voters%ROWTYPE;
BEGIN
    INSERT INTO public.voters (
        epic_number, full_name, dob, constituency_id
    )
    VALUES (
        p_epic_number, p_full_name, p_dob, p_constituency_id
    )
    RETURNING * INTO v_voter;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'voters',
        'INSERT',
        v_voter.voter_id,
        jsonb_build_object('action', 'voter_created', 'admin_id', p_admin_id)
    );

    RETURN NEXT v_voter;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_voter_api(
    p_admin_id INT,
    p_voter_id INT,
    p_epic_number VARCHAR(20),
    p_full_name VARCHAR(150),
    p_dob DATE,
    p_constituency_id INT
)
RETURNS SETOF public.voters
LANGUAGE plpgsql
AS $$
DECLARE
    v_voter public.voters%ROWTYPE;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.has_voted
        WHERE voter_id = p_voter_id
    ) THEN
        RAISE EXCEPTION 'Voter with recorded participation cannot be updated'
            USING ERRCODE = 'VT008';
    END IF;

    UPDATE public.voters
    SET epic_number = p_epic_number,
        full_name = p_full_name,
        dob = p_dob,
        constituency_id = p_constituency_id
    WHERE voter_id = p_voter_id
    RETURNING * INTO v_voter;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Voter not found' USING ERRCODE = 'VT001';
    END IF;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'voters',
        'UPDATE',
        v_voter.voter_id,
        jsonb_build_object('action', 'voter_updated', 'admin_id', p_admin_id)
    );

    RETURN NEXT v_voter;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_voter_api(
    p_admin_id INT,
    p_voter_id INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_voter_id INT;
BEGIN
    DELETE FROM public.voters
    WHERE voter_id = p_voter_id
    RETURNING voter_id INTO v_voter_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Voter not found' USING ERRCODE = 'VT001';
    END IF;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'voters',
        'DELETE',
        v_voter_id,
        jsonb_build_object('action', 'voter_deleted', 'admin_id', p_admin_id)
    );

    RETURN TRUE;
END;
$$;
