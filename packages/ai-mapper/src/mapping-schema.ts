import { z } from "zod";

export const MappingRequestSchema = z.object({
  sourceField: z.string().min(1).max(120),
  candidateTargetFields: z.array(z.string().min(1).max(120)).min(1).max(100),
  sampleValues: z.array(z.string().max(200)).max(5)
}).strict();

export type MappingRequest = z.infer<typeof MappingRequestSchema>;

export const MappingProposalSchema = z.object({
  sourceField: z.string().min(1).max(120),
  proposedTargetField: z.string().min(1).max(120),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1).max(500),
  alternativeTargets: z.array(z.string().min(1).max(120)).max(100)
}).strict();

export type MappingProposal = z.infer<typeof MappingProposalSchema>;
