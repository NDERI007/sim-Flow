import { z } from 'zod';

export const ContactSchema = z.object({
  id: z.string(),
  phone: z.string().min(1, 'Phone number is required'),
  group_id: z.string().optional(),
});

export const PrepareRecipientsSchema = z.object({
  manualNumbers: z.array(z.string()).optional(),
  groupContacts: z.array(ContactSchema).optional(),
  message: z.string().min(1, 'Message cannot be empty'),
  devMode: z.boolean().optional(),
});

export type PrepareRecipientsOptions = z.infer<typeof PrepareRecipientsSchema>;
