import { z } from 'zod';

export const smsFormSchema = z
  .object({
    manualNumbers: z.string().optional(),
    message: z.string().min(1, 'Message is required'),
    scheduledAt: z.string().optional(),
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
