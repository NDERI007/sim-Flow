import { z } from 'zod';

export const UserRecordSchema = z.object({
  id: z.string(),
  email: z.email().optional(),
  sender_id: z.string().nullable(),
  quota: z.number().optional(),
  role: z.enum(['admin', 'member']),
});

// Optional: TypeScript inference
export type UserRecord = z.infer<typeof UserRecordSchema>;
