import { z } from 'zod';

export const voterLoginSchema = z.object({
  epicNumber: z.string().min(1).max(20),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).strict();

export const createCandidateSchema = z.object({
  fullName: z.string().min(2).max(150),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  partyId: z.number().int().positive().nullable().optional(),
  constituencyId: z.number().int().positive(),
  electionId: z.number().int().positive(),
  assetsDeclaredInr: z.number().nonnegative().max(9999999999999.99),
}).strict();

export const castVoteSchema = z.object({
  electionId: z.number().int().positive(),
  candidateId: z.number().int().positive(),
}).strict();

export const voterComplaintSchema = z.object({
  constituencyId: z.number().int().positive().optional(),
  electionId: z.number().int().positive(),
  description: z.string().min(10).max(1000),
}).strict();

export type VoterLoginInput = z.infer<typeof voterLoginSchema>;
export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;
export type CastVoteInput = z.infer<typeof castVoteSchema>;
export type VoterComplaintInput = z.infer<typeof voterComplaintSchema>;