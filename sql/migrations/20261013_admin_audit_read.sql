-- Paginated audit-log reads for authenticated admin API requests.
CREATE OR REPLACE FUNCTION public.get_audit_log_api(
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS SETOF public.audit_log
LANGUAGE sql
STABLE
AS $$
    SELECT *
    FROM public.audit_log
    ORDER BY log_id DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 200)
    OFFSET GREATEST(p_offset, 0);
$$;

REVOKE ALL ON FUNCTION public.get_audit_log_api(INT, INT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_audit_log_api(INT, INT)
    TO service_role;

NOTIFY pgrst, 'reload schema';
