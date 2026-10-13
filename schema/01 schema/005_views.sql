-- ============================================================
-- 5. VIEWS
-- ============================================================
CREATE VIEW view_live_turnout WITH (security_invoker = true) AS
SELECT c.constituency_id, c.name, e.election_id,
       c.total_registered_voters,
       COUNT(hv.voter_id) AS votes_cast,
       ROUND(100.0 * COUNT(hv.voter_id) / NULLIF(c.total_registered_voters, 0), 2) AS turnout_pct
FROM constituencies c
CROSS JOIN elections e
LEFT JOIN voters v ON v.constituency_id = c.constituency_id
LEFT JOIN has_voted hv ON hv.voter_id = v.voter_id AND hv.election_id = e.election_id
GROUP BY c.constituency_id, c.name, e.election_id, c.total_registered_voters;

CREATE VIEW view_results_leaderboard WITH (security_invoker = true) AS
SELECT r.election_id, ca.constituency_id, cn.name AS constituency_name,
       ca.full_name AS candidate_name, p.party_name, r.total_votes,
       RANK() OVER (PARTITION BY ca.constituency_id, r.election_id
                    ORDER BY r.total_votes DESC) AS rank
FROM results r
JOIN candidates ca ON ca.candidate_id = r.candidate_id
JOIN constituencies cn ON cn.constituency_id = ca.constituency_id
LEFT JOIN parties p ON p.party_id = ca.party_id;
