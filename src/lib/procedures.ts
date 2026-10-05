import { query } from './db';

export async function castVote(params: {
  voterId: number;
  electionId: number;
  boothId: number;
  evmId: number;
  candidateId: number;
}) {
  return query(
    `CALL cast_vote($1, $2, $3, $4, $5)`,
    [params.voterId, params.electionId, params.boothId, params.evmId, params.candidateId]
  );
}

export async function getLiveTurnout(constituencyId: number) {
  return query(
    `SELECT * FROM view_live_turnout WHERE constituency_id = $1`,
    [constituencyId]
  );
}

export async function getElections(status?: string) {
  if (status) {
    return query(`SELECT * FROM elections WHERE status = $1`, [status]);
  }
  return query(`SELECT * FROM elections`);
}

export async function getElectionResults(electionId: number) {
  return query(
    `SELECT * FROM view_results_leaderboard WHERE election_id = $1`,
    [electionId]
  );
}

export async function getCandidates(electionId?: number) {
  if (electionId) {
    return query(
      `SELECT c.*, n.election_id FROM candidates c 
       JOIN nominations n ON c.id = n.candidate_id 
       WHERE n.election_id = $1`,
      [electionId]
    );
  }
  return query(`SELECT * FROM candidates`);
}

export async function createCandidate(data: {
  name: string;
  party: string;
  symbol_url?: string;
  electionId: number;
  constituencyId: number;
}) {
  const client = await query('BEGIN');
  try {
    const candidateResult = await query(
      `INSERT INTO candidates (name, party, symbol_url) VALUES ($1, $2, $3) RETURNING id`,
      [data.name, data.party, data.symbol_url || null]
    );
    const candidateId = candidateResult.rows[0].id;
    await query(
      `INSERT INTO nominations (candidate_id, election_id, constituency_id) VALUES ($1, $2, $3)`,
      [candidateId, data.electionId, data.constituencyId]
    );
    await query('COMMIT');
    return { id: candidateId, ...data };
  } catch (e) {
    await query('ROLLBACK');
    throw e;
  }
}

export async function createVoter(data: {
  name: string;
  dob: string;
  address: string;
  constituencyId: number;
  idDocumentType: string;
  idDocumentNumber: string;
}) {
  return query(
    `INSERT INTO voters (name, dob, address, constituency_id, id_document_type, id_document_number)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [data.name, data.dob, data.address, data.constituencyId, data.idDocumentType, data.idDocumentNumber]
  );
}

export async function getBooths() {
  return query(`SELECT * FROM polling_booths ORDER BY id`);
}

export async function createBooth(data: {
  name: string;
  constituencyId: number;
  address: string;
}) {
  return query(
    `INSERT INTO polling_booths (name, constituency_id, address) VALUES ($1, $2, $3) RETURNING *`,
    [data.name, data.constituencyId, data.address]
  );
}

export async function getEVMs() {
  return query(`SELECT * FROM evms ORDER BY id`);
}

export async function createEVM(data: {
  serialNumber: string;
  boothId: number;
}) {
  return query(
    `INSERT INTO evms (serial_number, booth_id) VALUES ($1, $2) RETURNING *`,
    [data.serialNumber, data.boothId]
  );
}

export async function getComplaints() {
  return query(`SELECT * FROM complaints ORDER BY created_at DESC`);
}

export async function createComplaint(data: {
  voterId?: number;
  boothId?: number;
  electionId?: number;
  description: string;
}) {
  return query(
    `INSERT INTO complaints (voter_id, booth_id, election_id, description) VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.voterId || null, data.boothId || null, data.electionId || null, data.description]
  );
}