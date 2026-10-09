import { randomUUID } from 'node:crypto';
import { pool, query } from '../src/lib/db';

type VotingFixture = {
  stateId: number;
  constituencyId: number;
  electionId: number;
  candidateIds: [number, number];
  voterIds: [number, number];
  voterEpics: [string, string];
};

const baseUrl = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const voterDob = ['1990-01-01', '1991-01-01'] as const;

async function loginVoter(epicNumber: string, dob: string) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ epicNumber, dob }),
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

async function createVotingFixture(): Promise<VotingFixture> {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const stateResult = await client.query<{ state_id: number }>(
      'INSERT INTO states(state_name) VALUES ($1) RETURNING state_id',
      [`Voting Test State ${suffix}`]
    );
    const stateId = stateResult.rows[0].state_id;

    const constituencyResult = await client.query<{ constituency_id: number }>(
      `INSERT INTO constituencies(name, state_id, total_registered_voters)
       VALUES ($1, $2, 2) RETURNING constituency_id`,
      [`Voting Test Constituency ${suffix}`, stateId]
    );
    const constituencyId = constituencyResult.rows[0].constituency_id;

    const electionResult = await client.query<{ election_id: number }>(
      `INSERT INTO elections(election_name, election_type, start_date, end_date, status)
       VALUES ($1, 'GENERAL', CURRENT_DATE, CURRENT_DATE + 1, 'ONGOING')
       RETURNING election_id`,
      [`Voting Test Election ${suffix}`]
    );
    const electionId = electionResult.rows[0].election_id;

    const candidatesResult = await client.query<{ candidate_id: number }>(
      `INSERT INTO candidates(full_name, dob, constituency_id)
       VALUES ($1, '1980-01-01', $3), ($2, '1981-01-01', $3)
       RETURNING candidate_id`,
      [`Voting Test Candidate A ${suffix}`, `Voting Test Candidate B ${suffix}`, constituencyId]
    );
    const candidateIds = candidatesResult.rows.map((row) => row.candidate_id) as [number, number];

    await client.query(
      `INSERT INTO nominations(candidate_id, filed_date, status)
       VALUES ($1, CURRENT_DATE, 'ACCEPTED'), ($2, CURRENT_DATE, 'ACCEPTED')`,
      candidateIds
    );
    await client.query(
      `INSERT INTO results(election_id, candidate_id, total_votes)
       VALUES ($1, $2, 0), ($1, $3, 0)`,
      [electionId, ...candidateIds]
    );

    const voterEpics: [string, string] = [`VT${suffix}01`, `VT${suffix}02`];
    const votersResult = await client.query<{ voter_id: number }>(
      `INSERT INTO voters(epic_number, full_name, dob, constituency_id)
       VALUES ($1, $2, $3, $5), ($4, $6, $7, $5)
       RETURNING voter_id`,
      [
        voterEpics[0],
        `Voting Test Voter A ${suffix}`,
        voterDob[0],
        voterEpics[1],
        constituencyId,
        `Voting Test Voter B ${suffix}`,
        voterDob[1],
      ]
    );
    const voterIds = votersResult.rows.map((row) => row.voter_id) as [number, number];

    await client.query('COMMIT');
    return { stateId, constituencyId, electionId, candidateIds, voterIds, voterEpics };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function cleanupVotingFixture(fixture: VotingFixture) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM vote_events WHERE election_id = $1', [fixture.electionId]);
    await client.query(
      `DELETE FROM audit_log
       WHERE table_name = 'vote_events' AND details->>'election_id' = $1`,
      [String(fixture.electionId)]
    );
    await client.query('DELETE FROM has_voted WHERE election_id = $1', [fixture.electionId]);
    await client.query('DELETE FROM results WHERE election_id = $1', [fixture.electionId]);
    await client.query('DELETE FROM nominations WHERE candidate_id = ANY($1::INT[])', [fixture.candidateIds]);
    await client.query('DELETE FROM voters WHERE voter_id = ANY($1::INT[])', [fixture.voterIds]);
    await client.query('DELETE FROM candidates WHERE candidate_id = ANY($1::INT[])', [fixture.candidateIds]);
    await client.query('DELETE FROM elections WHERE election_id = $1', [fixture.electionId]);
    await client.query('DELETE FROM constituencies WHERE constituency_id = $1', [fixture.constituencyId]);
    await client.query('DELETE FROM states WHERE state_id = $1', [fixture.stateId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required; configure it for the disposable development database');
  }

  let fixture: VotingFixture | undefined;
  try {
    const database = await query<{ database_name: string }>(
      'SELECT current_database() AS database_name'
    );
    const databaseName = database.rows[0].database_name;
    if (!/(^|[_-])(dev|test)([_-]|$)/i.test(databaseName)) {
      throw new Error(`Refusing to create integration fixtures in non-dev/test database "${databaseName}"`);
    }

    const serverCheck = await fetch(`${baseUrl}/api/elections`);
    if (!serverCheck.ok) {
      throw new Error(`Application health check returned ${serverCheck.status}`);
    }

    fixture = await createVotingFixture();
    const vote = {
      electionId: fixture.electionId,
      candidateId: fixture.candidateIds[0],
    };

    const turnoutBefore = await fetch(
      `${baseUrl}/api/turnout/${fixture.constituencyId}?electionId=${fixture.electionId}`
    ).then((response) => response.json()) as { votes_cast: number }[];
    if (turnoutBefore[0]?.votes_cast !== 0) {
      throw new Error(`Expected test-election turnout to start at zero; received ${JSON.stringify(turnoutBefore)}`);
    }

    const sequentialVoter = await loginVoter(fixture.voterEpics[0], voterDob[0]);
    const unregisteredCandidate = await submitVote(sequentialVoter.cookie, {
      electionId: vote.electionId,
      candidateId: 2147483647,
    });
    if (unregisteredCandidate.status !== 400) {
      throw new Error(`Unregistered candidate vote returned ${unregisteredCandidate.status}; expected 400`);
    }

    const eventsBefore = await countRows(
      'SELECT COUNT(*)::INT AS count FROM vote_events WHERE election_id = $1',
      [vote.electionId]
    );
    const auditsBefore = await countRows(
      `SELECT COUNT(*)::INT AS count FROM audit_log WHERE details->>'election_id' = $1`,
      [String(vote.electionId)]
    );
    const resultsBefore = await countRows(
      'SELECT total_votes::INT AS count FROM results WHERE election_id = $1 AND candidate_id = $2',
      [vote.electionId, vote.candidateId]
    );

    const firstVote = await submitVote(sequentialVoter.cookie, vote);
    const duplicateVote = await submitVote(sequentialVoter.cookie, vote);
    if (firstVote.status !== 200 || duplicateVote.status !== 409) {
      throw new Error(`Sequential vote statuses were ${firstVote.status}, ${duplicateVote.status}; expected 200, 409`);
    }

    const participationRows = await countRows(
      'SELECT COUNT(*)::INT AS count FROM has_voted WHERE voter_id = $1 AND election_id = $2',
      [sequentialVoter.voterId, vote.electionId]
    );
    const eventsAfter = await countRows(
      'SELECT COUNT(*)::INT AS count FROM vote_events WHERE election_id = $1',
      [vote.electionId]
    );
    const auditsAfter = await countRows(
      `SELECT COUNT(*)::INT AS count FROM audit_log WHERE details->>'election_id' = $1`,
      [String(vote.electionId)]
    );
    const resultsAfter = await countRows(
      'SELECT total_votes::INT AS count FROM results WHERE election_id = $1 AND candidate_id = $2',
      [vote.electionId, vote.candidateId]
    );
    if (participationRows !== 1 || eventsAfter !== eventsBefore + 1 || auditsAfter !== auditsBefore + 1 || resultsAfter !== resultsBefore + 1) {
      throw new Error('Sequential duplicate test produced unexpected participation, ballot, audit, or results counts');
    }

    const turnoutAfterSequential = await fetch(
      `${baseUrl}/api/turnout/${fixture.constituencyId}?electionId=${fixture.electionId}`
    ).then((response) => response.json()) as { votes_cast: number }[];
    if (turnoutAfterSequential[0]?.votes_cast !== 1) {
      throw new Error(`Expected turnout to be one after the first accepted vote; received ${JSON.stringify(turnoutAfterSequential)}`);
    }

    const raceVoter = await loginVoter(fixture.voterEpics[1], voterDob[1]);
    const raceEventsBefore = await countRows(
      'SELECT COUNT(*)::INT AS count FROM vote_events WHERE election_id = $1',
      [vote.electionId]
    );
    const raceAuditsBefore = await countRows(
      `SELECT COUNT(*)::INT AS count FROM audit_log WHERE details->>'election_id' = $1`,
      [String(vote.electionId)]
    );
    const raceResultsBefore = await countRows(
      'SELECT total_votes::INT AS count FROM results WHERE election_id = $1 AND candidate_id = $2',
      [vote.electionId, vote.candidateId]
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
    const raceResultsAfter = await countRows(
      'SELECT total_votes::INT AS count FROM results WHERE election_id = $1 AND candidate_id = $2',
      [vote.electionId, vote.candidateId]
    );
    if (raceParticipationRows !== 1 || raceEventsAfter !== raceEventsBefore + 1 || raceAuditsAfter !== raceAuditsBefore + 1 || raceResultsAfter !== raceResultsBefore + 1) {
      throw new Error('Concurrent duplicate test produced unexpected participation, ballot, audit, or results counts');
    }

    const turnoutAfterRace = await fetch(
      `${baseUrl}/api/turnout/${fixture.constituencyId}?electionId=${fixture.electionId}`
    ).then((response) => response.json()) as { votes_cast: number }[];
    if (turnoutAfterRace[0]?.votes_cast !== 2) {
      throw new Error(`Expected turnout to be two after both accepted test votes; received ${JSON.stringify(turnoutAfterRace)}`);
    }

    console.log('Unregistered candidate: 400.');
    console.log('Sequential duplicate: 200, 409; one participation, ballot, audit, and result increment.');
    console.log('Concurrent duplicate: one 200, one 409; one participation, ballot, audit, and result increment.');
    console.log('Turnout: 0 before votes, 1 after the sequential test, 2 after the race test.');
  } finally {
    try {
      if (fixture) await cleanupVotingFixture(fixture);
    } finally {
      await pool.end();
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
