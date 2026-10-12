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

export const updateCandidateSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  partyId: z.number().int().positive().nullable(),
  constituencyId: z.number().int().positive(),
  assetsDeclaredInr: z.number().nonnegative().max(9999999999999.99),
}).strict();

const voterRecordSchema = z.object({
  epicNumber: z.string().trim().min(1).max(20),
  fullName: z.string().trim().min(2).max(150),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      return false;
    }
    const today = new Date();
    const birthdayThisYear = new Date(
      Date.UTC(today.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    );
    const age =
      today.getUTCFullYear() -
      date.getUTCFullYear() -
      (today < birthdayThisYear ? 1 : 0);
    return age >= 18;
  }, 'Voter must be at least 18 years old'),
  constituencyId: z.number().int().positive(),
}).strict();

export const createVoterSchema = voterRecordSchema;
export const updateVoterSchema = voterRecordSchema;

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