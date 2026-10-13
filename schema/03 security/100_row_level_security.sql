-- ============================================================
-- ROW LEVEL SECURITY AND TABLE PRIVILEGES
-- Access is intended for service_role only; anon and authenticated
-- receive no direct table/sequence privileges.
-- ============================================================

ALTER TABLE states          ENABLE ROW LEVEL SECURITY;
ALTER TABLE constituencies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties         ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE voters          ENABLE ROW LEVEL SECURITY;
ALTER TABLE elections       ENABLE ROW LEVEL SECURITY;
ALTER TABLE has_voted       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE results         ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints      ENABLE ROW LEVEL SECURITY;
ALTER TABLE observers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins          ENABLE ROW LEVEL SECURITY;

-- covers tables, views and sequences
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- future objects too
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

GRANT SELECT ON view_live_turnout, view_results_leaderboard TO service_role;
