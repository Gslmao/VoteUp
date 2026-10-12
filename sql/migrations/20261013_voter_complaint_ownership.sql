ALTER TABLE public.complaints
    ADD COLUMN IF NOT EXISTS voter_id INT REFERENCES public.voters(voter_id);

CREATE INDEX IF NOT EXISTS idx_complaints_voter_id
    ON public.complaints (voter_id);

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
    v_filed_by    VARCHAR(150);
    v_voter_const INT;
    v_complaint   public.complaints%ROWTYPE;
BEGIN
    SELECT full_name, constituency_id INTO v_filed_by, v_voter_const
    FROM public.voters
    WHERE voter_id = p_voter_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF p_constituency_id IS DISTINCT FROM v_voter_const THEN
        RAISE EXCEPTION 'Complaint constituency must match the voter''s constituency'
            USING ERRCODE = 'VT006';
    END IF;

    INSERT INTO public.complaints (
        voter_id, filed_by, constituency_id, election_id, description
    )
    VALUES (p_voter_id, v_filed_by, p_constituency_id, p_election_id, p_description)
    RETURNING * INTO v_complaint;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'complaints',
        'INSERT',
        v_complaint.complaint_id,
        jsonb_build_object(
            'action', 'complaint_filed',
            'constituency_id', p_constituency_id,
            'election_id', p_election_id
        )
    );
    RETURN NEXT v_complaint;
END;
$$;
