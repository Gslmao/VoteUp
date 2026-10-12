import type {
  Candidate,
  Complaint,
  Constituency,
  Election,
  Party,
  Result,
  Voter,
} from '@/types/portal';

type ApiElection = {
  election_id: number;
  election_name: string;
  election_type: string;
  start_date: string;
  end_date: string;
  status: Election['status'];
};

type ApiParty = {
  party_id: number;
  party_name: string;
  symbol: string | null;
  founded_date: string | null;
};

type ApiConstituency = {
  constituency_id: number;
  name: string;
  total_registered_voters: number | null;
  states: { state_name: string } | null;
};

type ApiCandidate = {
  candidate_id: number;
  full_name: string;
  dob: string;
  party_id: number | null;
  party_name: string | null;
  constituency_id: number;
  assets_declared_inr: number | string | null;
};

type ApiComplaint = {
  complaint_id: number;
  constituency_id: number | null;
  election_id: number;
  description: string;
  status: Complaint['status'];
};

type ApiTurnout = {
  votes_cast: number | string;
  total_registered_voters: number | string | null;
};

export type ApiVoter = {
  voter_id: number;
  epic_number: string;
  full_name: string;
  dob: string;
  constituency_id: number;
  has_voted: boolean | null;
};

const electionTypeLabels: Record<string, string> = {
  GENERAL: "General",
  BY_ELECTION: "By-election",
  STATE: "State Assembly",
};

export async function getApiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof body.error === 'string'
        ? body.error
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}

export async function loadAdminPortalData() {
  const [apiElections, apiParties, apiConstituencies, apiCandidates, apiComplaints] =
    await Promise.all([
      getApiJson<ApiElection[]>('/api/elections'),
      getApiJson<ApiParty[]>('/api/parties'),
      getApiJson<ApiConstituency[]>('/api/constituencies'),
      getApiJson<ApiCandidate[]>('/api/candidates'),
      getApiJson<ApiComplaint[]>('/api/admin/complaints'),
    ]);

  const elections: Election[] = apiElections.map((election) => ({
    id: String(election.election_id),
    name: election.election_name,
    type: electionTypeLabels[election.election_type] ?? election.election_type,
    start: election.start_date,
    end: election.end_date,
    status: election.status,
  }));
  const electionNames = new Map(
    elections.map((election) => [Number(election.id), election.name])
  );

  const parties: Party[] = apiParties.map((party) => ({
    id: String(party.party_id),
    name: party.party_name,
    symbol: party.symbol ?? '',
    founded: party.founded_date ?? '',
  }));
  const constituencies: Constituency[] = apiConstituencies.map((constituency) => ({
    id: String(constituency.constituency_id),
    name: constituency.name,
    state: constituency.states?.state_name ?? 'Unknown',
    voters: constituency.total_registered_voters ?? 0,
  }));
  const constituencyNames = new Map(
    constituencies.map((constituency) => [
      Number(constituency.id),
      constituency.name,
    ])
  );
  const candidates: Candidate[] = apiCandidates.map((candidate) => ({
    id: String(candidate.candidate_id),
    name: candidate.full_name,
    dob: candidate.dob,
    party: candidate.party_name ?? 'Independent',
    constituency: constituencyNames.get(candidate.constituency_id) ?? 'Unknown',
    assets: Number(candidate.assets_declared_inr ?? 0),
  }));
  const complaints: Complaint[] = apiComplaints.map((complaint) => ({
    id: String(complaint.complaint_id),
    filed: '',
    constituency: complaint.constituency_id
      ? constituencyNames.get(complaint.constituency_id) ?? 'Unknown'
      : 'Unassigned',
    election: electionNames.get(complaint.election_id) ?? `Election ${complaint.election_id}`,
    description: complaint.description,
    status: complaint.status,
  }));

  const activeElectionId = elections[0]?.id;
  const voterPath = activeElectionId
    ? `/api/admin/voters?electionId=${encodeURIComponent(activeElectionId)}`
    : '/api/admin/voters';
  const [apiVoters, turnoutRows] = await Promise.all([
    getApiJson<ApiVoter[]>(voterPath),
    activeElectionId
      ? getApiJson<ApiTurnout[]>(
          `/api/elections/${encodeURIComponent(activeElectionId)}/turnout`
        )
      : Promise.resolve([]),
  ]);
  const voters = mapApiVoters(apiVoters, constituencyNames);
  const votesCast = turnoutRows.reduce(
    (sum, row) => sum + Number(row.votes_cast),
    0
  );
  const registeredVoters = turnoutRows.reduce(
    (sum, row) => sum + Number(row.total_registered_voters ?? 0),
    0
  );
  const turnout =
    registeredVoters > 0
      ? {
          votesCast,
          registeredVoters,
          percentage: (votesCast / registeredVoters) * 100,
          electionName: elections[0].name,
        }
      : null;

  return { elections, parties, constituencies, candidates, complaints, voters, turnout };
}

export function mapApiVoters(
  records: ApiVoter[],
  constituencyNames: Map<number, string>
): Voter[] {
  return records.map((voter) => ({
    id: String(voter.voter_id),
    epic: voter.epic_number,
    name: voter.full_name,
    constituency:
      constituencyNames.get(voter.constituency_id) ?? 'Unknown constituency',
    dob: voter.dob,
    participation:
      voter.has_voted === null
        ? 'Unavailable'
        : voter.has_voted
          ? 'Recorded'
          : 'Not recorded',
  }));
}

export type ApiResult = {
  election_id: number;
  constituency_id: number;
  constituency_name: string;
  candidate_name: string;
  party_name: string | null;
  total_votes: number;
  rank: number;
};

export function mapApiResults(rows: ApiResult[], electionName: string): Result[] {
  return rows.map((row) => ({
    id: `${row.election_id}-${row.constituency_id}-${row.candidate_name}`,
    election: electionName,
    constituency: row.constituency_name,
    candidate: row.candidate_name,
    party: row.party_name ?? 'Independent',
    votes: row.total_votes,
    rank: row.rank,
    declared: false,
    timestamp: 'Not declared',
  }));
}
