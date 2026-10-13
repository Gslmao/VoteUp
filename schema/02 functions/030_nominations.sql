-- ============================================================
-- RPC: NOMINATION REVIEW
-- FILED -> ACCEPTED/REJECTED/WITHDRAWN, ACCEPTED -> WITHDRAWN
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_nomination_status_api(
    p_nomination_id INT, p_status VARCHAR(20)
)
RETURNS SETOF public.nominations
LANGUAGE plpgsql
AS $$
DECLARE
    v_current VARCHAR(20);
BEGIN
    SELECT status INTO v_current FROM public.nominations
    WHERE nomination_id = p_nomination_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Nomination not found' USING ERRCODE = 'VT007';
    END IF;

    IF NOT (
        (v_current = 'FILED'    AND p_status IN ('ACCEPTED','REJECTED','WITHDRAWN')) OR
        (v_current = 'ACCEPTED' AND p_status = 'WITHDRAWN')
    ) THEN
        RAISE EXCEPTION 'Invalid nomination transition % -> %', v_current, p_status
            USING ERRCODE = 'VT008';
    END IF;

    RETURN QUERY
    UPDATE public.nominations SET status = p_status
    WHERE nomination_id = p_nomination_id
    RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_nomination_status_api(
    p_admin_id INT,
    p_nomination_id INT,
    p_status VARCHAR(20)
)
RETURNS SETOF public.nominations
LANGUAGE plpgsql
AS $$
DECLARE
    v_nomination public.nominations%ROWTYPE;
BEGIN
    SELECT * INTO v_nomination
    FROM public.nominations
    WHERE nomination_id = p_nomination_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Nomination not found' USING ERRCODE = 'VT007';
    END IF;
    IF NOT (
        (v_nomination.status = 'FILED' AND p_status IN ('ACCEPTED', 'REJECTED', 'WITHDRAWN')) OR
        (v_nomination.status = 'ACCEPTED' AND p_status = 'WITHDRAWN')
    ) THEN
        RAISE EXCEPTION 'Invalid nomination transition'
            USING ERRCODE = 'VT008';
    END IF;

    UPDATE public.nominations
    SET status = p_status
    WHERE nomination_id = p_nomination_id
    RETURNING * INTO v_nomination;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'nominations',
        'UPDATE',
        v_nomination.nomination_id,
        jsonb_build_object(
            'action', 'nomination_status_changed',
            'status', p_status,
            'admin_id', p_admin_id
        )
    );
    RETURN NEXT v_nomination;
END;
$$;
