import { z } from 'zod';

export const createVoterSchema = z.object({
  name: z.string().min(2).max(100),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  address: z.string().min(5).max(255),
  constituencyId: z.number().int().positive(),
  idDocumentType: z.enum(['AADHAAR', 'VOTER_ID', 'PASSPORT', 'DRIVING_LICENSE']),
  idDocumentNumber: z.string().min(5).max(50),
});

export const createCandidateSchema = z.object({
  name: z.string().min(2).max(100),
  party: z.string().min(2).max(100),
  symbolUrl: z.string().url().optional().nullable(),
  electionId: z.number().int().positive(),
  constituencyId: z.number().int().positive(),
});

export const castVoteSchema = z.object({
  voterId: z.number().int().positive(),
  electionId: z.number().int().positive(),
  boothId: z.number().int().positive(),
  evmId: z.number().int().positive(),
  candidateId: z.number().int().positive(),
});

export const createBoothSchema = z.object({
  name: z.string().min(2).max(100),
  constituencyId: z.number().int().positive(),
  address: z.string().min(5).max(255),
});

export const createEVMSchema = z.object({
  serialNumber: z.string().min(5).max(50),
  boothId: z.number().int().positive(),
});

export const createComplaintSchema = z.object({
  voterId: z.number().int().positive().optional(),
  boothId: z.number().int().positive().optional(),
  electionId: z.number().int().positive().optional(),
  description: z.string().min(10).max(1000),
});

export type CreateVoterInput = z.infer<typeof createVoterSchema>;
export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;
export type CastVoteInput = z.infer<typeof castVoteSchema>;
export type CreateBoothInput = z.infer<typeof createBoothSchema>;
export type CreateEVMInput = z.infer<typeof createEVMSchema>;
export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;