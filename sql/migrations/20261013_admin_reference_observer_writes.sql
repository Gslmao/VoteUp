-- Atomic, audited writes for party, constituency, and observer reference data.
CREATE OR REPLACE FUNCTION public.admin_mutate_reference_api(
    p_admin_id INT,
    p_entity VARCHAR(20),
    p_operation VARCHAR(10),
    p_record_id INT,
    p_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_party public.parties%ROWTYPE;
    v_constituency public.constituencies%ROWTYPE;
    v_observer public.observers%ROWTYPE;
    v_result JSONB;
    v_row_id BIGINT;
BEGIN
    IF p_entity = 'parties' THEN
        IF p_operation = 'CREATE' THEN
            INSERT INTO public.parties (party_name, symbol, founded_date)
            VALUES (
                p_data->>'name',
                NULLIF(p_data->>'symbol', ''),
                NULLIF(p_data->>'founded', '')::DATE
            )
            RETURNING * INTO v_party;
        ELSIF p_operation = 'UPDATE' THEN
            UPDATE public.parties
            SET party_name = p_data->>'name',
                symbol = NULLIF(p_data->>'symbol', ''),
                founded_date = NULLIF(p_data->>'founded', '')::DATE
            WHERE party_id = p_record_id
            RETURNING * INTO v_party;
        ELSIF p_operation = 'DELETE' THEN
            DELETE FROM public.parties WHERE party_id = p_record_id
            RETURNING * INTO v_party;
        ELSE
            RAISE EXCEPTION 'Unsupported operation' USING ERRCODE = '22023';
        END IF;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Party not found' USING ERRCODE = 'P0002';
        END IF;
        v_row_id := v_party.party_id;
        v_result := to_jsonb(v_party);
    ELSIF p_entity = 'constituencies' THEN
        IF p_operation = 'CREATE' THEN
            INSERT INTO public.constituencies (
                name, state_id, total_registered_voters
            )
            VALUES (
                p_data->>'name',
                (p_data->>'state_id')::INT,
                (p_data->>'voters')::INT
            )
            RETURNING * INTO v_constituency;
        ELSIF p_operation = 'UPDATE' THEN
            UPDATE public.constituencies
            SET name = p_data->>'name',
                state_id = (p_data->>'state_id')::INT,
                total_registered_voters = (p_data->>'voters')::INT
            WHERE constituency_id = p_record_id
            RETURNING * INTO v_constituency;
        ELSIF p_operation = 'DELETE' THEN
            DELETE FROM public.constituencies WHERE constituency_id = p_record_id
            RETURNING * INTO v_constituency;
        ELSE
            RAISE EXCEPTION 'Unsupported operation' USING ERRCODE = '22023';
        END IF;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Constituency not found' USING ERRCODE = 'P0002';
        END IF;
        v_row_id := v_constituency.constituency_id;
        v_result := to_jsonb(v_constituency);
    ELSIF p_entity = 'observers' THEN
        IF p_operation = 'CREATE' THEN
            INSERT INTO public.observers (full_name, constituency_id, election_id)
            VALUES (
                p_data->>'name',
                (p_data->>'constituency_id')::INT,
                (p_data->>'election_id')::INT
            )
            RETURNING * INTO v_observer;
        ELSIF p_operation = 'UPDATE' THEN
            UPDATE public.observers
            SET full_name = p_data->>'name',
                constituency_id = (p_data->>'constituency_id')::INT,
                election_id = (p_data->>'election_id')::INT
            WHERE observer_id = p_record_id
            RETURNING * INTO v_observer;
        ELSIF p_operation = 'DELETE' THEN
            DELETE FROM public.observers WHERE observer_id = p_record_id
            RETURNING * INTO v_observer;
        ELSE
            RAISE EXCEPTION 'Unsupported operation' USING ERRCODE = '22023';
        END IF;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Observer not found' USING ERRCODE = 'P0002';
        END IF;
        v_row_id := v_observer.observer_id;
        v_result := to_jsonb(v_observer);
    ELSE
        RAISE EXCEPTION 'Unsupported entity' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        p_entity,
        p_operation,
        v_row_id,
        jsonb_build_object('action', 'admin_reference_write', 'admin_id', p_admin_id)
    );
    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_mutate_reference_api(
    INT, VARCHAR, VARCHAR, INT, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mutate_reference_api(
    INT, VARCHAR, VARCHAR, INT, JSONB
) TO service_role;
