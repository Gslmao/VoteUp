-- ============================================================
-- FUNCTION / PROCEDURE PRIVILEGES
-- ============================================================

-- Remove default access to RPC functions and the stored procedure.
REVOKE ALL ON FUNCTION public.cast_vote_api(INT, INT, INT)                FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_candidates_api(INT)                     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_candidate_with_assets_api(VARCHAR, DATE, INT, INT, INT, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_complaint_api(INT, INT, INT, TEXT)   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_admin_api(VARCHAR, TEXT)             FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_create_voter_api(INT, VARCHAR, VARCHAR, DATE, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_voter_api(INT, INT, VARCHAR, VARCHAR, DATE, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_voter_api(INT, INT)             FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_create_election_api(INT, VARCHAR, VARCHAR, DATE, DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_election_api(INT, INT, VARCHAR, VARCHAR, DATE, DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_election_status_api(INT, INT, VARCHAR) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_election_api(INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_create_candidate_with_assets_api(INT, VARCHAR, DATE, INT, INT, INT, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_candidate_api(INT, INT, VARCHAR, DATE, INT, INT, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_candidate_api(INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_nomination_status_api(INT, INT, VARCHAR) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_complaint_status_api(INT, INT, VARCHAR) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_mutate_reference_api(INT, VARCHAR, VARCHAR, INT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_states_api()                            FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_constituencies_api(INT)                 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_parties_api()                           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_nomination_status_api(INT, VARCHAR)     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_election_status_api(INT, VARCHAR)       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.declare_results_api(INT)                    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_complaint_status_api(INT, VARCHAR)      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_audit_log_api(INT, INT)                 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON PROCEDURE public.cast_vote(INT, INT, INT)                   FROM PUBLIC, anon, authenticated;

-- Grant RPC execution to the backend role.
GRANT EXECUTE ON FUNCTION public.cast_vote_api(INT, INT, INT)                TO service_role;
GRANT EXECUTE ON FUNCTION public.get_candidates_api(INT)                     TO service_role;
GRANT EXECUTE ON FUNCTION public.create_candidate_with_assets_api(VARCHAR, DATE, INT, INT, INT, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_complaint_api(INT, INT, INT, TEXT)   TO service_role;
GRANT EXECUTE ON FUNCTION public.create_admin_api(VARCHAR, TEXT)             TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_voter_api(INT, VARCHAR, VARCHAR, DATE, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_voter_api(INT, INT, VARCHAR, VARCHAR, DATE, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_voter_api(INT, INT)             TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_election_api(INT, VARCHAR, VARCHAR, DATE, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_election_api(INT, INT, VARCHAR, VARCHAR, DATE, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_election_status_api(INT, INT, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_election_api(INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_candidate_with_assets_api(INT, VARCHAR, DATE, INT, INT, INT, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_candidate_api(INT, INT, VARCHAR, DATE, INT, INT, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_candidate_api(INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_nomination_status_api(INT, INT, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_complaint_status_api(INT, INT, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_mutate_reference_api(INT, VARCHAR, VARCHAR, INT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_states_api()                            TO service_role;
GRANT EXECUTE ON FUNCTION public.get_constituencies_api(INT)                 TO service_role;
GRANT EXECUTE ON FUNCTION public.get_parties_api()                           TO service_role;
GRANT EXECUTE ON FUNCTION public.set_nomination_status_api(INT, VARCHAR)     TO service_role;
GRANT EXECUTE ON FUNCTION public.set_election_status_api(INT, VARCHAR)       TO service_role;
GRANT EXECUTE ON FUNCTION public.declare_results_api(INT)                    TO service_role;
GRANT EXECUTE ON FUNCTION public.set_complaint_status_api(INT, VARCHAR)      TO service_role;
GRANT EXECUTE ON FUNCTION public.get_audit_log_api(INT, INT)                 TO service_role;
GRANT EXECUTE ON PROCEDURE public.cast_vote(INT, INT, INT)                   TO service_role;
