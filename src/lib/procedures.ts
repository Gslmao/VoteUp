import type { PostgrestError } from '@supabase/supabase-js';
import { getSupabaseClient } from './db';

class DatabaseError extends Error {
  constructor(error: PostgrestError) {
    super(error.message);
    this.name = 'DatabaseError';
    this.code = error.code;
  }

  readonly code: string;
}

function throwIfError(error: PostgrestError | null): void {
  if (error) throw new DatabaseError(error);
}

export async function castVote(params: {
  voterId: number;
  electionId: number;
  candidateId: number;
}) {
  const { error } = await getSupabaseClient().rpc('cast_vote_api', {
    p_voter_id: params.voterId,
    p_election_id: params.electionId,
    p_candidate_id: params.candidateId,
  });
  throwIfError(error);
}

export async function getLiveTurnout(constituencyId: number, electionId: number) {
  const { data, error } = await getSupabaseClient()
    .from('view_live_turnout')
    .select('*')
    .eq('constituency_id', constituencyId)
    .eq('election_id', electionId);
  throwIfError(error);
  return { rows: data ?? [] };
}

export async function getElectionTurnout(electionId: number) {
  const { data, error } = await getSupabaseClient()
    .from('view_live_turnout')
    .select('*')
    .eq('election_id', electionId)
    .order('constituency_id');
  throwIfError(error);
  return { rows: data ?? [] };
}

export async function getElections(status?: string) {
  let request = getSupabaseClient().from('elections').select('*').order('election_id');
  if (status) request = request.eq('status', status);
  const { data, error } = await request;
  throwIfError(error);
  return { rows: data ?? [] };
}

export async function adminCreateElection(
  adminId: number,
  data: {
    electionName: string;
    electionType: string;
    startDate: string;
    endDate: string;
  }
) {
  const { data: rows, error } = await getSupabaseClient().rpc(
    'admin_create_election_api',
    {
      p_admin_id: adminId,
      p_election_name: data.electionName,
      p_election_type: data.electionType,
      p_start_date: data.startDate,
      p_end_date: data.endDate,
    }
  );
  throwIfError(error);
  return { rows: rows ?? [] };
}

export async function adminUpdateElection(
  adminId: number,
  electionId: number,
  data: {
    electionName: string;
    electionType: string;
    startDate: string;
    endDate: string;
  }
) {
  const { data: rows, error } = await getSupabaseClient().rpc(
    'admin_update_election_api',
    {
      p_admin_id: adminId,
      p_election_id: electionId,
      p_election_name: data.electionName,
      p_election_type: data.electionType,
      p_start_date: data.startDate,
      p_end_date: data.endDate,
    }
  );
  throwIfError(error);
  return { rows: rows ?? [] };
}

export async function adminSetElectionStatus(
  adminId: number,
  electionId: number,
  status: string
) {
  const { data: rows, error } = await getSupabaseClient().rpc(
    'admin_set_election_status_api',
    {
      p_admin_id: adminId,
      p_election_id: electionId,
      p_status: status,
    }
  );
  throwIfError(error);
  return { rows: rows ?? [] };
}

export async function adminDeleteElection(adminId: number, electionId: number) {
  const { data, error } = await getSupabaseClient().rpc(
    'admin_delete_election_api',
    { p_admin_id: adminId, p_election_id: electionId }
  );
  throwIfError(error);
  return data;
}

export async function getResultsLeaderboard(electionId: number, constituencyId?: number) {
  let request = getSupabaseClient()
    .from('view_results_leaderboard')
    .select('*')
    .eq('election_id', electionId);
  if (constituencyId !== undefined) request = request.eq('constituency_id', constituencyId);
  const { data, error } = await request.order('constituency_id').order('rank');
  throwIfError(error);
  return { rows: data ?? [] };
}

export async function getCandidates(constituencyId?: number) {
  const { data, error } = await getSupabaseClient().rpc('get_candidates_api', {
    p_constituency_id: constituencyId ?? null,
  });
  throwIfError(error);
  return { rows: data ?? [] };
}

export async function getConstituencies() {
  const { data, error } = await getSupabaseClient()
    .from('constituencies')
    .select('constituency_id, name, state_id, total_registered_voters, states(state_name)')
    .order('constituency_id');
  throwIfError(error);
  return { rows: data ?? [] };
}

export async function getParties() {
  const { data, error } = await getSupabaseClient()
    .from('parties')
    .select('party_id, party_name, symbol, founded_date')
    .order('party_id');
  throwIfError(error);
  return { rows: data ?? [] };
}

export async function getStates() {
  const { data, error } = await getSupabaseClient()
    .from('states')
    .select('state_id, state_name')
    .order('state_name');
  throwIfError(error);
  return { rows: data ?? [] };
}

export async function getAdminObservers() {
  const { data, error } = await getSupabaseClient()
    .from('observers')
    .select(
      'observer_id, full_name, constituency_id, election_id, constituencies(name), elections(election_name)'
    )
    .order('observer_id');
  throwIfError(error);
  return { rows: data ?? [] };
}

export async function getAuditLog(limit = 100, offset = 0) {
  const { data, error } = await getSupabaseClient().rpc('get_audit_log_api', {
    p_limit: limit,
    p_offset: offset,
  });
  throwIfError(error);
  return { rows: data ?? [] };
}

export async function adminMutateReference(
  adminId: number,
  entity: 'parties' | 'constituencies' | 'observers',
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  recordId: number | null,
  data: Record<string, unknown>
) {
  const { data: row, error } = await getSupabaseClient().rpc(
    'admin_mutate_reference_api',
    {
      p_admin_id: adminId,
      p_entity: entity,
      p_operation: operation,
      p_record_id: recordId,
      p_data: data,
    }
  );
  throwIfError(error);
  return row;
}

export async function createCandidate(adminId: number, data: {
  fullName: string;
  dob: string;
  partyId?: number | null;
  constituencyId: number;
  electionId: number;
  assetsDeclaredInr: number;
}) {
  const { data: candidate, error } = await getSupabaseClient()
    .rpc('admin_create_candidate_with_assets_api', {
      p_admin_id: adminId,
      p_full_name: data.fullName,
      p_dob: data.dob,
      p_party_id: data.partyId ?? null,
      p_constituency_id: data.constituencyId,
      p_election_id: data.electionId,
      p_assets_declared_inr: data.assetsDeclaredInr,
    })
    .single();
  throwIfError(error);
  return candidate;
}

export async function updateCandidate(
  adminId: number,
  candidateId: number,
  data: {
    fullName: string;
    dob: string;
    partyId?: number | null;
    constituencyId: number;
    assetsDeclaredInr: number;
  }
) {
  const { data: candidate, error } = await getSupabaseClient()
    .rpc('admin_update_candidate_api', {
      p_admin_id: adminId,
      p_candidate_id: candidateId,
      p_full_name: data.fullName,
      p_dob: data.dob,
      p_party_id: data.partyId ?? null,
      p_constituency_id: data.constituencyId,
      p_assets_declared_inr: data.assetsDeclaredInr,
    })
    .maybeSingle();
  throwIfError(error);
  return candidate;
}

export async function deleteCandidate(adminId: number, candidateId: number) {
  const { data, error } = await getSupabaseClient().rpc(
    'admin_delete_candidate_api',
    { p_admin_id: adminId, p_candidate_id: candidateId }
  );
  throwIfError(error);
  return data;
}

export async function adminSetNominationStatus(
  adminId: number,
  nominationId: number,
  status: string
) {
  const { data: rows, error } = await getSupabaseClient().rpc(
    'admin_set_nomination_status_api',
    {
      p_admin_id: adminId,
      p_nomination_id: nominationId,
      p_status: status,
    }
  );
  throwIfError(error);
  return { rows: rows ?? [] };
}

export async function getVoterByCredentials(epicNumber: string, dob: string) {
  const { data, error } = await getSupabaseClient()
    .from('voters')
    .select('voter_id')
    .eq('epic_number', epicNumber)
    .eq('dob', dob)
    .maybeSingle();
  throwIfError(error);
  return data;
}

export async function getAdminVoters(electionId?: number) {
  const supabase = getSupabaseClient();
  const voters: {
    voter_id: number;
    epic_number: string;
    full_name: string;
    dob: string;
    constituency_id: number;
  }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
        .from('voters')
        .select('voter_id, epic_number, full_name, dob, constituency_id')
        .order('voter_id')
        .range(offset, offset + 999);
    throwIfError(error);
    voters.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }

  const participated = new Set<number>();
  if (electionId !== undefined) {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase
        .from('has_voted')
        .select('voter_id')
        .eq('election_id', electionId)
        .order('voter_id')
        .range(offset, offset + 999);
      throwIfError(error);
      for (const record of data ?? []) participated.add(record.voter_id);
      if ((data?.length ?? 0) < 1000) break;
    }
  }

  return {
    rows: (voters ?? []).map((voter) => ({
      ...voter,
      has_voted: electionId === undefined ? null : participated.has(voter.voter_id),
    })),
  };
}

export async function getAdminNominations() {
  const supabase = getSupabaseClient();
  const [
    { data: nominations, error: nominationError },
    { data: candidates, error: candidateError },
    { data: results, error: resultError },
    { data: elections, error: electionError },
    { data: constituencies, error: constituencyError },
  ] = await Promise.all([
    supabase
      .from('nominations')
      .select('nomination_id, candidate_id, filed_date, status')
      .order('nomination_id'),
    supabase
      .from('candidates')
      .select('candidate_id, full_name, constituency_id'),
    supabase.from('results').select('candidate_id, election_id'),
    supabase.from('elections').select('election_id, election_name'),
    supabase.from('constituencies').select('constituency_id, name'),
  ]);
  throwIfError(nominationError);
  throwIfError(candidateError);
  throwIfError(resultError);
  throwIfError(electionError);
  throwIfError(constituencyError);

  const candidateById = new Map((candidates ?? []).map((row) => [row.candidate_id, row]));
  const electionById = new Map((elections ?? []).map((row) => [row.election_id, row.election_name]));
  const constituencyById = new Map((constituencies ?? []).map((row) => [row.constituency_id, row.name]));
  const electionForCandidate = new Map<number, number>();
  for (const result of results ?? []) {
    if (!electionForCandidate.has(result.candidate_id)) {
      electionForCandidate.set(result.candidate_id, result.election_id);
    }
  }

  return {
    rows: (nominations ?? []).map((nomination) => {
      const candidate = candidateById.get(nomination.candidate_id);
      const electionId = electionForCandidate.get(nomination.candidate_id);
      return {
        nomination_id: nomination.nomination_id,
        candidate_id: nomination.candidate_id,
        candidate_name: candidate?.full_name ?? 'Unknown candidate',
        constituency_name: candidate
          ? constituencyById.get(candidate.constituency_id) ?? 'Unknown constituency'
          : 'Unknown constituency',
        election_name: electionId
          ? electionById.get(electionId) ?? `Election ${electionId}`
          : 'Unassigned',
        filed_date: nomination.filed_date,
        status: nomination.status,
      };
    }),
  };
}

export async function createVoter(adminId: number, data: {
  epicNumber: string;
  fullName: string;
  dob: string;
  constituencyId: number;
}) {
  const { data: voter, error } = await getSupabaseClient()
    .rpc('admin_create_voter_api', {
      p_admin_id: adminId,
      p_epic_number: data.epicNumber,
      p_full_name: data.fullName,
      p_dob: data.dob,
      p_constituency_id: data.constituencyId,
    })
    .single();
  throwIfError(error);
  return voter;
}

export async function updateVoter(
  adminId: number,
  voterId: number,
  data: {
    epicNumber: string;
    fullName: string;
    dob: string;
    constituencyId: number;
  }
) {
  const { data: voter, error } = await getSupabaseClient()
    .rpc('admin_update_voter_api', {
      p_admin_id: adminId,
      p_voter_id: voterId,
      p_epic_number: data.epicNumber,
      p_full_name: data.fullName,
      p_dob: data.dob,
      p_constituency_id: data.constituencyId,
    })
    .maybeSingle();
  throwIfError(error);
  return voter;
}

export async function deleteVoter(adminId: number, voterId: number) {
  const { data, error } = await getSupabaseClient().rpc('admin_delete_voter_api', {
    p_admin_id: adminId,
    p_voter_id: voterId,
  });
  throwIfError(error);
  return data;
}

export async function getComplaints() {
  const { data, error } = await getSupabaseClient()
    .from('complaints')
    .select('*')
    .order('complaint_id', { ascending: false });
  throwIfError(error);
  return { rows: data ?? [] };
}

export async function adminSetComplaintStatus(
  adminId: number,
  complaintId: number,
  status: string
) {
  const { data: rows, error } = await getSupabaseClient().rpc(
    'admin_set_complaint_status_api',
    {
      p_admin_id: adminId,
      p_complaint_id: complaintId,
      p_status: status,
    }
  );
  throwIfError(error);
  return { rows: rows ?? [] };
}

export async function createComplaint(data: {
  voterId: number;
  constituencyId?: number;
  electionId: number;
  description: string;
}) {
  const { data: rows, error } = await getSupabaseClient().rpc('create_complaint_api', {
    p_voter_id: data.voterId,
    p_constituency_id: data.constituencyId ?? null,
    p_election_id: data.electionId,
    p_description: data.description,
  });
  throwIfError(error);
  return { rows: rows ?? [] };
}

export async function createAdmin(data: {
  email: string;
  passwordHash: string;
}) {
  const { data: admin, error } = await getSupabaseClient()
    .rpc('create_admin_api', {
      p_email: data.email,
      p_password_hash: data.passwordHash,
    })
    .single();
  throwIfError(error);
  return { rows: [admin] };
}

export async function getAdminByEmail(email: string) {
  const { data, error } = await getSupabaseClient()
    .from('admins')
    .select('id, email, password_hash')
    .eq('email', email)
    .maybeSingle();
  throwIfError(error);
  return data;
}
