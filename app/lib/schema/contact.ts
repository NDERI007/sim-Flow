// lib/schemas/contact.ts
import { z } from 'zod';

export const ContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'contact is required'), // You can add phone validation here if needed
});

export const ContactGroupSchema = z.object({
  group_name: z.string().min(1, 'Group name is required'),
  contacts: z.array(ContactSchema).min(1, 'Atleast one contact required'),
});

export type Contact = z.infer<typeof ContactSchema>;
export type ContactGroup = z.infer<typeof ContactGroupSchema>;
export type ContactGroupWithId = ContactGroup & { id: string };
