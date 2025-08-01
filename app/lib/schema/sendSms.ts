import { DateTime } from 'luxon';
import { z } from 'zod';
const MAX_DELAY_HOURS = 48;
export const sendSmsSchema = z.object({
  to_number: z.array(z.string()).optional(),
  message: z.string().min(1, 'Message cannot be blank'),
  scheduledAt: z
    .union([
      z.literal(''),
      z
        .string()
        .refine(
          (value) => {
            const dt = DateTime.fromISO(value, { zone: 'Africa/Nairobi' });
            return dt.isValid && dt > DateTime.now();
          },
          {
            message: 'Scheduled time must be in the future.',
          },
        )
        .refine(
          (value) => {
            const dt = DateTime.fromISO(value, { zone: 'Africa/Nairobi' });
            return dt.diffNow('hours').hours <= MAX_DELAY_HOURS;
          },
          {
            message: 'Scheduled time cannot exceed 2 days from now.',
          },
        ),
    ])
    .optional(),

  contact_group_ids: z.array(z.string()).optional(),
});

// For typing convenience
export type SendSmsInput = z.infer<typeof sendSmsSchema>;
