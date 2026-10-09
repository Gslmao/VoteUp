import { z } from 'zod';

export const createVoterSchema = z.object({
  epicNumber: z.string().min(1).max(20),
  fullName: z.string().min(2).max(150),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  constituencyId: z.number().int().positive(),
}).strict();

export const createCandidateSchema = z.object({
  fullName: z.string().min(2).max(150),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  partyId: z.number().int().positive().nullable().optional(),
  constituencyId: z.number().int().positive(),
}).strict();

export const castVoteSchema = z.object({
  electionId: z.number().int().positive(),
  boothId: z.number().int().positive(),
  evmId: z.number().int().positive(),
  candidateId: z.number().int().positive(),
}).strict();

export const createBoothSchema = z.object({
  location: z.string().min(2).max(200),
  constituencyId: z.number().int().positive(),
  officerName: z.string().max(150).nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
}).strict();

export const createEVMSchema = z.object({
  serialNumber: z.string().min(5).max(50),
  boothId: z.number().int().positive(),
}).strict();

export const createComplaintSchema = z.object({
  filedBy: z.string().max(150).optional(),
  boothId: z.number().int().positive().optional(),
  electionId: z.number().int().positive(),
  description: z.string().min(10).max(1000),
}).strict();

export type CreateVoterInput = z.infer<typeof createVoterSchema>;
export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;
export type CastVoteInput = z.infer<typeof castVoteSchema>;
export type CreateBoothInput = z.infer<typeof createBoothSchema>;
export type CreateEVMInput = z.infer<typeof createEVMSchema>;
export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;