import { z } from 'zod';

export const ScheduleSchema = z.object({
  id: z.string(),
  message: z.string(),
  scheduled_at: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  group_names: z.array(z.string()).optional(),
});

export type ScheduledMessage = z.infer<typeof ScheduleSchema>;
