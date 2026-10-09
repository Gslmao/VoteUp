import { query } from './db';

export async function castVote(params: {
  voterId: number;
  electionId: number;
  candidateId: number;
}) {
  return query('CALL cast_vote($1, $2, $3)', [
    params.voterId,
    params.electionId,
    params.candidateId,
  ]);
}

export async function getLiveTurnout(constituencyId: number, electionId: number) {
  const result = await query(
    `SELECT * FROM view_live_turnout
     WHERE constituency_id = $1 AND election_id = $2`,
    [constituencyId, electionId]
  );
  return { rows: result.rows };
}

export async function getElections(status?: string) {
  const result = status
    ? await query('SELECT * FROM elections WHERE status = $1 ORDER BY election_id', [status])
    : await query('SELECT * FROM elections ORDER BY election_id');
  return { rows: result.rows };
}

export async function getResultsLeaderboard(electionId: number, constituencyId?: number) {
  const result = await query(
    `SELECT * FROM view_results_leaderboard
     WHERE election_id = $1 AND ($2::INT IS NULL OR constituency_id = $2)
     ORDER BY constituency_id, rank`,
    [electionId, constituencyId ?? null]
  );
  return { rows: result.rows };
}

export async function getCandidates(constituencyId?: number) {
  const result = await query(
        `SELECT c.candidate_id, c.full_name, c.dob, c.party_id, p.party_name,
          c.constituency_id, c.assets_declared_inr
     FROM candidates c
     LEFT JOIN parties p ON p.party_id = c.party_id
     WHERE ($1::INT IS NULL OR c.constituency_id = $1)
     ORDER BY c.candidate_id`,
    [constituencyId ?? null]
  );
  return { rows: result.rows };
}

export async function createCandidate(data: {
  fullName: string;
  dob: string;
  partyId?: number | null;
  constituencyId: number;
  electionId: number;
}) {
  const result = await query(
    `WITH new_candidate AS (
       INSERT INTO candidates(full_name, dob, party_id, constituency_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *
     ), new_nomination AS (
       INSERT INTO nominations(candidate_id, filed_date)
       SELECT candidate_id, CURRENT_DATE FROM new_candidate
       RETURNING candidate_id
     ), new_result AS (
       INSERT INTO results(election_id, candidate_id, total_votes)
       SELECT $5, candidate_id, 0 FROM new_candidate
       RETURNING candidate_id
     )
     SELECT new_candidate.* FROM new_candidate
     JOIN new_nomination USING (candidate_id)
     JOIN new_result USING (candidate_id)`,
    [data.fullName, data.dob, data.partyId ?? null, data.constituencyId, data.electionId]
  );
  return result.rows[0];
}

export async function getVoterByCredentials(epicNumber: string, dob: string) {
  const result = await query<{ voter_id: number }>(
    'SELECT voter_id FROM voters WHERE epic_number = $1 AND dob = $2',
    [epicNumber, dob]
  );
  return result.rows[0] ?? null;
}

export async function getComplaints() {
  const result = await query('SELECT * FROM complaints ORDER BY complaint_id DESC');
  return { rows: result.rows };
}

export async function createComplaint(data: {
  voterId: number;
  constituencyId?: number;
  electionId: number;
  description: string;
}) {
  const result = await query(
    `INSERT INTO complaints(filed_by, constituency_id, election_id, description)
     SELECT v.full_name, $2, $3, $4
     FROM voters v
     WHERE v.voter_id = $1
     RETURNING *`,
    [data.voterId, data.constituencyId ?? null, data.electionId, data.description]
  );
  return { rows: result.rows };
}

export async function createAdmin(data: {
  email: string;
  passwordHash: string;
}) {
  const result = await query(
    'INSERT INTO admins(email, password_hash) VALUES ($1, $2) RETURNING id, email',
    [data.email, data.passwordHash]
  );
  return { rows: result.rows };
}

export async function getAdminByEmail(email: string) {
  const result = await query(
    'SELECT id, email, password_hash FROM admins WHERE email = $1',
    [email]
  );
  return result.rows[0] ?? null;
}