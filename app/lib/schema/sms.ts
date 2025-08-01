import { DateTime } from 'luxon';
import { z } from 'zod';
const MAX_DELAY_HOURS = 48;
export const smsFormSchema = z
  .object({
    manualNumbers: z.string().optional(),
    message: z.string().min(1, 'Message is required'),
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

    selectedGroup: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      const hasNumbers =
        data.manualNumbers
          ?.split(/[\n,]+/)
          .map((n) => n.trim())
          .filter(Boolean).length > 0;
      const hasGroups = data.selectedGroup && data.selectedGroup.length > 0;
      return hasNumbers || hasGroups;
    },
    {
      message: 'At least one phone number or group is required',
      path: ['manualNumbers'], // could also use ['selectedGroup'] or both
    },
  );

export type SmsFormValues = z.infer<typeof smsFormSchema>;
