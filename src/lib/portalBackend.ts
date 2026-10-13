import type {
  Candidate,
  Complaint,
  Constituency,
  Election,
  Nomination,
  Observer,
  Party,
  Result,
  Voter,
  Audit,
} from '@/types/portal';

export type ApiElection = {
  election_id: number;
  election_name: string;
  election_type: string;
  start_date: string;
  end_date: string;
  status: Election['status'];
};

type ApiNomination = {
  nomination_id: number;
  candidate_id: number;
  candidate_name: string;
  constituency_name: string;
  election_name: string;
  filed_date: string;
  status: Nomination['status'];
};

type ApiParty = {
  party_id: number;
  party_name: string;
  symbol: string | null;
  founded_date: string | null;
};

type ApiConstituency = {
  constituency_id: number;
  state_id: number;
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

type ApiObserver = {
  observer_id: number;
  full_name: string;
  constituency_id: number | null;
  election_id: number | null;
  constituencies: { name: string } | { name: string }[] | null;
  elections: { election_name: string } | { election_name: string }[] | null;
};

export type ApiAudit = {
  log_id: number;
  table_name: string;
  operation: string;
  changed_at: string;
  row_id: number | null;
  details: Record<string, unknown> | null;
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

export function mapApiElection(election: ApiElection): Election {
  return {
    id: String(election.election_id),
    name: election.election_name,
    type: electionTypeLabels[election.election_type] ?? election.election_type,
    start: election.start_date,
    end: election.end_date,
    status: election.status,
    constituency: "All Constituencies",
    eligibleConstituencies: ["All Constituencies"],
  };
}

export function mapApiElections(records: ApiElection[]): Election[] {
  return records.map(mapApiElection);
}

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
  const [
    apiElections,
    apiParties,
    apiConstituencies,
    apiCandidates,
    apiComplaints,
    apiNominations,
    apiObservers,
    apiAudits,
  ] =
    await Promise.all([
      getApiJson<ApiElection[]>('/api/admin/elections'),
      getApiJson<ApiParty[]>('/api/parties'),
      getApiJson<ApiConstituency[]>('/api/constituencies'),
      getApiJson<ApiCandidate[]>('/api/candidates'),
      getApiJson<ApiComplaint[]>('/api/admin/complaints'),
      getApiJson<ApiNomination[]>('/api/admin/nominations'),
      getApiJson<ApiObserver[]>('/api/admin/reference/observers'),
      getApiJson<ApiAudit[]>('/api/admin/audit'),
    ]);

  const elections = mapApiElections(apiElections);
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
    stateId: constituency.state_id,
    voters: constituency.total_registered_voters ?? 0,
  }));
  const constituencyNames = new Map(
    constituencies.map((constituency) => [
      Number(constituency.id),
      constituency.name,
    ])
  );
  const nominations: Nomination[] = apiNominations.map((nomination) => ({
    id: String(nomination.nomination_id),
    candidate: nomination.candidate_name,
    election: nomination.election_name,
    constituency: nomination.constituency_name,
    filed: nomination.filed_date,
    status: nomination.status,
  }));
  const candidateStatuses = new Map(
    apiNominations.map((nomination) => [
      String(nomination.candidate_id),
      nomination.status,
    ])
  );
  const candidates: Candidate[] = apiCandidates.map((candidate) => ({
    id: String(candidate.candidate_id),
    name: candidate.full_name,
    dob: candidate.dob,
    party: candidate.party_name ?? 'Independent',
    constituency: constituencyNames.get(candidate.constituency_id) ?? 'Unknown',
    assets: Number(candidate.assets_declared_inr ?? 0),
    status: candidateStatuses.get(String(candidate.candidate_id)),
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
  const observers: Observer[] = apiObservers.map((observer) => {
    const constituency = Array.isArray(observer.constituencies)
      ? observer.constituencies[0]
      : observer.constituencies;
    const election = Array.isArray(observer.elections)
      ? observer.elections[0]
      : observer.elections;
    return {
      id: String(observer.observer_id),
      name: observer.full_name,
      constituency: constituency?.name ?? 'Unassigned',
      constituencyId: observer.constituency_id ?? undefined,
      election: election?.election_name ?? 'Unassigned',
      electionId: observer.election_id ?? undefined,
    };
  });
  const audits = mapApiAudits(apiAudits);

  const voterElectionId = elections[0]?.id;
  const activeElection = elections.find((election) => election.status === 'ONGOING');
  const voterPath = voterElectionId
    ? `/api/admin/voters?electionId=${encodeURIComponent(voterElectionId)}`
    : '/api/admin/voters';
  const [apiVoters, turnoutRows] = await Promise.all([
    getApiJson<ApiVoter[]>(voterPath),
    activeElection
      ? getApiJson<ApiTurnout[]>(
          `/api/elections/${encodeURIComponent(activeElection.id)}/turnout`
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
          electionName: activeElection?.name ?? '',
        }
      : null;

  return {
    elections,
    parties,
    constituencies,
    candidates,
    nominations,
    complaints,
    observers,
    audits,
    voters,
    turnout,
  };
}

export function mapApiAudits(records: ApiAudit[]): Audit[] {
  return records.map((audit) => ({
    id: String(audit.log_id),
    timestamp: audit.changed_at,
    entity: audit.table_name,
    operation: audit.operation,
    reference: audit.row_id === null ? 'n/a' : String(audit.row_id),
    details: audit.details
      ? Object.entries(audit.details)
          .filter(([key]) => key !== 'admin_id')
          .map(([key, value]) => `${key}: ${String(value)}`)
          .join(', ')
      : '',
  }));
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
