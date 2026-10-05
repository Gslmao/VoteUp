import { supabase } from './db';

export async function castVote(params: {
  voterId: number;
  electionId: number;
  boothId: number;
  evmId: number;
  candidateId: number;
}) {
  const { data, error } = await supabase.rpc('cast_vote', {
    p_voter_id: params.voterId,
    p_election_id: params.electionId,
    p_booth_id: params.boothId,
    p_evm_id: params.evmId,
    p_candidate_id: params.candidateId,
  });
  if (error) throw error;
  return { data };
}

export async function getLiveTurnout(constituencyId: number) {
  const { data, error } = await supabase
    .from('view_live_turnout')
    .select('*')
    .eq('constituency_id', constituencyId);
  if (error) throw error;
  return { rows: data };
}

export async function getElections(status?: string) {
  let query = supabase.from('elections').select('*');
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return { rows: data };
}

export async function getElectionResults(electionId: number) {
  const { data, error } = await supabase
    .from('view_results_leaderboard')
    .select('*')
    .eq('election_id', electionId);
  if (error) throw error;
  return { rows: data };
}

export async function getCandidates(electionId?: number) {
  let query = supabase.from('candidates').select('*, nominations(election_id, constituency_id)');
  if (electionId) {
    query = query.eq('nominations.election_id', electionId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return { rows: data };
}

export async function createCandidate(data: {
  name: string;
  party: string;
  symbol_url?: string;
  electionId: number;
  constituencyId: number;
}) {
  // Insert candidate
  const { data: candidate, error: candError } = await supabase
    .from('candidates')
    .insert({ name: data.name, party: data.party, symbol_url: data.symbol_url || null })
    .select('id')
    .single();
  if (candError) throw candError;

  // Insert nomination
  const { error: nomError } = await supabase.from('nominations').insert({
    candidate_id: candidate.id,
    election_id: data.electionId,
    constituency_id: data.constituencyId,
  });
  if (nomError) throw nomError;

  return { id: candidate.id, ...data };
}

export async function createVoter(data: {
  name: string;
  dob: string;
  address: string;
  constituencyId: number;
  idDocumentType: string;
  idDocumentNumber: string;
}) {
  const { data: result, error } = await supabase
    .from('voters')
    .insert({
      name: data.name,
      dob: data.dob,
      address: data.address,
      constituency_id: data.constituencyId,
      id_document_type: data.idDocumentType,
      id_document_number: data.idDocumentNumber,
    })
    .select('id')
    .single();
  if (error) throw error;
  return { rows: [result] };
}

export async function getBooths() {
  const { data, error } = await supabase.from('polling_booths').select('*').order('id');
  if (error) throw error;
  return { rows: data };
}

export async function createBooth(data: {
  name: string;
  constituencyId: number;
  address: string;
}) {
  const { data: result, error } = await supabase
    .from('polling_booths')
    .insert({ name: data.name, constituency_id: data.constituencyId, address: data.address })
    .select('*')
    .single();
  if (error) throw error;
  return { rows: [result] };
}

export async function getEVMs() {
  const { data, error } = await supabase.from('evms').select('*').order('id');
  if (error) throw error;
  return { rows: data };
}

export async function createEVM(data: {
  serialNumber: string;
  boothId: number;
}) {
  const { data: result, error } = await supabase
    .from('evms')
    .insert({ serial_number: data.serialNumber, booth_id: data.boothId })
    .select('*')
    .single();
  if (error) throw error;
  return { rows: [result] };
}

export async function getComplaints() {
  const { data, error } = await supabase.from('complaints').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return { rows: data };
}

export async function createComplaint(data: {
  voterId?: number;
  boothId?: number;
  electionId?: number;
  description: string;
}) {
  const { data: result, error } = await supabase
    .from('complaints')
    .insert({
      voter_id: data.voterId || null,
      booth_id: data.boothId || null,
      election_id: data.electionId || null,
      description: data.description,
    })
    .select('*')
    .single();
  if (error) throw error;
  return { rows: [result] };
}