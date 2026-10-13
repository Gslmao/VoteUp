-- ============================================================
-- 3. VOTE AUDIT TRIGGER
-- Increments the candidate tally and records the vote event.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_log_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.results AS current_result (
        election_id, candidate_id, total_votes
    )
    VALUES (NEW.election_id, NEW.candidate_id, 1)
    ON CONFLICT (election_id, candidate_id)
    DO UPDATE SET total_votes = current_result.total_votes + 1;

    INSERT INTO public.audit_log (table_name, operation, row_id, details)
    VALUES (
        'vote_events',
        'INSERT',
        NEW.vote_id,
        jsonb_build_object('election_id', NEW.election_id)
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vote_audit
AFTER INSERT ON vote_events
FOR EACH ROW EXECUTE FUNCTION public.fn_log_vote();
