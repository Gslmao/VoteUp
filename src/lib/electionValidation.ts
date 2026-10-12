import { z } from 'zod';

const electionFields = {
  electionName: z.string().trim().min(2).max(150),
  electionType: z.enum(['GENERAL', 'BY_ELECTION', 'STATE']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
};

export const createElectionSchema = z.object(electionFields).strict().refine(
  (data) => data.endDate >= data.startDate,
  { path: ['endDate'], message: 'End date must be on or after the start date' }
);

export const updateElectionSchema = createElectionSchema;

export const electionStatusSchema = z.object({
  status: z.enum(['ONGOING', 'COMPLETED']),
}).strict();
