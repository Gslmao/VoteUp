-- ============================================================
-- 2. INDEXES
-- ============================================================
CREATE INDEX idx_voters_epic
    ON voters (epic_number);
CREATE INDEX idx_voters_constituency
    ON voters (constituency_id);
CREATE INDEX idx_vote_events_election
    ON vote_events (election_id);
CREATE INDEX idx_candidates_constituency
    ON candidates (constituency_id);
CREATE INDEX idx_has_voted_election
    ON has_voted (election_id);
CREATE INDEX idx_nominations_candidate
    ON nominations (candidate_id);
CREATE INDEX idx_results_candidate
    ON results (candidate_id);
CREATE INDEX idx_audit_log_changed_at
    ON audit_log (changed_at DESC);
CREATE INDEX idx_complaints_voter_id
    ON complaints (voter_id);
