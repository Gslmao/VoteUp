import { pool, query } from '../src/lib/db';

const baseUrl = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

async function loginVoter(epicNumber: string, dob: string) {
  const response = await fetch(`${baseUrl}/api/voters`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      epicNumber,
      dob,
    }),
  });
  if (!response.ok) throw new Error(`Voter login returned ${response.status}`);

  const cookie = response.headers.get('set-cookie')?.split(';', 1)[0];
  if (!cookie) throw new Error('Voter login did not establish a session');
  const result = await query<{ voter_id: number }>(
    'SELECT voter_id FROM voters WHERE epic_number = $1 AND dob = $2',
    [epicNumber, dob]
  );
  const voter = result.rows[0];
  if (!voter) throw new Error('The logged-in voter does not exist in the database');
  return { voterId: voter.voter_id, cookie };
}

async function submitVote(cookie: string, vote: Record<string, number>) {
  return fetch(`${baseUrl}/api/vote`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(vote),
  });
}

async function countRows(text: string, values: (string | number)[]) {
  const result = await query<{ count: number }>(text, values);
  return result.rows[0].count;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required; configure it for the disposable development database');
  }

  try {
  const fixture = await query<{
    election_id: number;
    constituency_id: number;
    booth_id: number;
    evm_id: number;
    candidate_id: number;
  }>(
    `SELECT e.election_id, c.constituency_id, b.booth_id, ev.evm_id,
            MIN(ca.candidate_id) AS candidate_id
     FROM elections e
     JOIN constituencies c ON TRUE
     JOIN polling_booths b ON b.constituency_id = c.constituency_id
     JOIN evms ev ON ev.booth_id = b.booth_id AND ev.status = 'ACTIVE'
     JOIN candidates ca ON ca.constituency_id = c.constituency_id
     WHERE e.status = 'ONGOING'
     GROUP BY e.election_id, c.constituency_id, b.booth_id, ev.evm_id
     HAVING COUNT(DISTINCT ca.candidate_id) >= 2
     ORDER BY e.election_id, c.constituency_id
     LIMIT 1`
  );
  const selected = fixture.rows[0];
  if (!selected) throw new Error('Seed at least one ongoing election and two candidates with a booth/EVM in one constituency');

  const vote = {
    electionId: selected.election_id,
    boothId: selected.booth_id,
    evmId: selected.evm_id,
    candidateId: selected.candidate_id,
  };
  const turnoutResponse = await fetch(
    `${baseUrl}/api/turnout/${selected.constituency_id}?electionId=${selected.election_id}`
  );
  const turnout = await turnoutResponse.json() as { votes_cast: number }[];
  if (!turnoutResponse.ok || turnout[0]?.votes_cast !== 0) {
    throw new Error(`Expected seeded turnout to start at zero; received ${JSON.stringify(turnout)}`);
  }

  const sequentialVoter = await loginVoter('DEMO0000001', '1990-01-01');
  const electionEventsBefore = await countRows(
    'SELECT COUNT(*)::INT AS count FROM vote_events WHERE election_id = $1',
    [vote.electionId]
  );
  const electionAuditsBefore = await countRows(
    `SELECT COUNT(*)::INT AS count FROM audit_log WHERE details->>'election_id' = $1`,
    [String(vote.electionId)]
  );

  const first = await submitVote(sequentialVoter.cookie, vote);
  const duplicate = await submitVote(sequentialVoter.cookie, vote);
  if (first.status !== 200 || duplicate.status !== 409) {
    throw new Error(`Sequential vote statuses were ${first.status}, ${duplicate.status}; expected 200, 409`);
  }
  const participationRows = await countRows(
    'SELECT COUNT(*)::INT AS count FROM has_voted WHERE voter_id = $1 AND election_id = $2',
    [sequentialVoter.voterId, vote.electionId]
  );
  const electionEventsAfter = await countRows(
    'SELECT COUNT(*)::INT AS count FROM vote_events WHERE election_id = $1',
    [vote.electionId]
  );
  const electionAuditsAfter = await countRows(
    `SELECT COUNT(*)::INT AS count FROM audit_log WHERE details->>'election_id' = $1`,
    [String(vote.electionId)]
  );
  if (participationRows !== 1 || electionEventsAfter !== electionEventsBefore + 1 || electionAuditsAfter !== electionAuditsBefore + 1) {
    throw new Error('Sequential duplicate test produced unexpected has_voted, vote_events, or audit_log counts');
  }

  const turnoutAfter = await fetch(
    `${baseUrl}/api/turnout/${selected.constituency_id}?electionId=${selected.election_id}`
  ).then((response) => response.json()) as { votes_cast: number }[];
  if (turnoutAfter[0]?.votes_cast !== 1) {
    throw new Error(`Expected turnout to be one after the test vote; received ${JSON.stringify(turnoutAfter)}`);
  }

  const raceVoter = await loginVoter('DEMO0000002', '1991-01-01');
  const raceEventsBefore = await countRows(
    'SELECT COUNT(*)::INT AS count FROM vote_events WHERE election_id = $1',
    [vote.electionId]
  );
  const raceAuditsBefore = await countRows(
    `SELECT COUNT(*)::INT AS count FROM audit_log WHERE details->>'election_id' = $1`,
    [String(vote.electionId)]
  );
  const raceResponses = await Promise.all([
    submitVote(raceVoter.cookie, vote),
    submitVote(raceVoter.cookie, vote),
  ]);
  const statuses = raceResponses.map((response) => response.status).sort();
  if (statuses[0] !== 200 || statuses[1] !== 409) {
    throw new Error(`Concurrent vote statuses were ${statuses.join(', ')}; expected one 200 and one 409`);
  }

  const raceParticipationRows = await countRows(
    'SELECT COUNT(*)::INT AS count FROM has_voted WHERE voter_id = $1 AND election_id = $2',
    [raceVoter.voterId, vote.electionId]
  );
  const raceEventsAfter = await countRows(
    'SELECT COUNT(*)::INT AS count FROM vote_events WHERE election_id = $1',
    [vote.electionId]
  );
  const raceAuditsAfter = await countRows(
    `SELECT COUNT(*)::INT AS count FROM audit_log WHERE details->>'election_id' = $1`,
    [String(vote.electionId)]
  );
  if (raceParticipationRows !== 1 || raceEventsAfter !== raceEventsBefore + 1 || raceAuditsAfter !== raceAuditsBefore + 1) {
    throw new Error('Concurrent duplicate test produced unexpected has_voted, vote_events, or audit_log counts');
  }

  console.log('Sequential duplicate: 200, 409; one participation, ballot, and audit row.');
  console.log('Concurrent duplicate: one 200, one 409; one participation, ballot, and audit row.');
  console.log('Turnout: 0 before vote, 1 after vote.');
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});