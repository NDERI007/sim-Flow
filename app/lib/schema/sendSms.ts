import { z } from 'zod';

export const sendSmsSchema = z.object({
  to_number: z.array(z.string()).optional(),
  message: z.string().min(1, 'Message cannot be blank'),
  scheduledAt: z
    .union([
      z.literal(''), // Accept empty string
      z.iso.datetime({ local: true }),
    ])
    .optional(),

  contact_group_ids: z.array(z.string()).optional(),
});

// For typing convenience
export type SendSmsInput = z.infer<typeof sendSmsSchema>;
