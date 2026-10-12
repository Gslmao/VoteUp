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

export async function getElections(status?: string) {
  let request = getSupabaseClient().from('elections').select('*').order('election_id');
  if (status) request = request.eq('status', status);
  const { data, error } = await request;
  throwIfError(error);
  return { rows: data ?? [] };
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

export async function createCandidate(data: {
  fullName: string;
  dob: string;
  partyId?: number | null;
  constituencyId: number;
  electionId: number;
}) {
  const { data: candidate, error } = await getSupabaseClient()
    .rpc('create_candidate_api', {
      p_full_name: data.fullName,
      p_dob: data.dob,
      p_party_id: data.partyId ?? null,
      p_constituency_id: data.constituencyId,
      p_election_id: data.electionId,
    })
    .single();
  throwIfError(error);
  return candidate;
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

export async function getComplaints() {
  const { data, error } = await getSupabaseClient()
    .from('complaints')
    .select('*')
    .order('complaint_id', { ascending: false });
  throwIfError(error);
  return { rows: data ?? [] };
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
