-- Adds audited admin election CRUD and status transitions.
CREATE OR REPLACE FUNCTION public.admin_create_election_api(
    p_admin_id INT,
    p_election_name VARCHAR(150),
    p_election_type VARCHAR(30),
    p_start_date DATE,
    p_end_date DATE
)
RETURNS SETOF public.elections
LANGUAGE plpgsql
AS $$
DECLARE
    v_election public.elections%ROWTYPE;
BEGIN
    INSERT INTO public.elections (
        election_name, election_type, start_date, end_date, status
    )
    VALUES (
        p_election_name, p_election_type, p_start_date, p_end_date, 'SCHEDULED'
    )
    RETURNING * INTO v_election;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'elections',
        'INSERT',
        v_election.election_id,
        jsonb_build_object('action', 'election_created', 'admin_id', p_admin_id)
    );
    RETURN NEXT v_election;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_election_api(
    p_admin_id INT,
    p_election_id INT,
    p_election_name VARCHAR(150),
    p_election_type VARCHAR(30),
    p_start_date DATE,
    p_end_date DATE
)
RETURNS SETOF public.elections
LANGUAGE plpgsql
AS $$
DECLARE
    v_election public.elections%ROWTYPE;
BEGIN
    SELECT * INTO v_election
    FROM public.elections
    WHERE election_id = p_election_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Election not found' USING ERRCODE = 'VT005';
    END IF;
    IF v_election.status <> 'SCHEDULED' THEN
        RAISE EXCEPTION 'Only scheduled elections can be edited'
            USING ERRCODE = 'VT008';
    END IF;

    UPDATE public.elections
    SET election_name = p_election_name,
        election_type = p_election_type,
        start_date = p_start_date,
        end_date = p_end_date
    WHERE election_id = p_election_id
    RETURNING * INTO v_election;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'elections',
        'UPDATE',
        v_election.election_id,
        jsonb_build_object('action', 'election_updated', 'admin_id', p_admin_id)
    );
    RETURN NEXT v_election;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_election_status_api(
    p_admin_id INT,
    p_election_id INT,
    p_status VARCHAR(20)
)
RETURNS SETOF public.elections
LANGUAGE plpgsql
AS $$
DECLARE
    v_election public.elections%ROWTYPE;
BEGIN
    SELECT * INTO v_election
    FROM public.elections
    WHERE election_id = p_election_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Election not found' USING ERRCODE = 'VT005';
    END IF;
    IF NOT (
        (v_election.status = 'SCHEDULED' AND p_status = 'ONGOING') OR
        (v_election.status = 'ONGOING' AND p_status = 'COMPLETED')
    ) THEN
        RAISE EXCEPTION 'Invalid election status transition'
            USING ERRCODE = 'VT008';
    END IF;

    UPDATE public.elections
    SET status = p_status
    WHERE election_id = p_election_id
    RETURNING * INTO v_election;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'elections',
        'UPDATE',
        v_election.election_id,
        jsonb_build_object(
            'action', 'election_status_changed',
            'status', p_status,
            'admin_id', p_admin_id
        )
    );
    RETURN NEXT v_election;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_election_api(
    p_admin_id INT,
    p_election_id INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_election_id INT;
BEGIN
    DELETE FROM public.elections
    WHERE election_id = p_election_id
    RETURNING election_id INTO v_election_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Election not found' USING ERRCODE = 'VT005';
    END IF;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'elections',
        'DELETE',
        v_election_id,
        jsonb_build_object('action', 'election_deleted', 'admin_id', p_admin_id)
    );
    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_election_api(
    INT, VARCHAR, VARCHAR, DATE, DATE
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_election_api(
    INT, INT, VARCHAR, VARCHAR, DATE, DATE
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_election_status_api(
    INT, INT, VARCHAR
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_election_api(
    INT, INT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_create_election_api(
    INT, VARCHAR, VARCHAR, DATE, DATE
) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_election_api(
    INT, INT, VARCHAR, VARCHAR, DATE, DATE
) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_election_status_api(
    INT, INT, VARCHAR
) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_election_api(
    INT, INT
) TO service_role;
