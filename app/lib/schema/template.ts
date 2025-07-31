import { z } from 'zod';

export const templateSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  content: z.string().min(1, 'content is required'),
});

export type Template = z.infer<typeof templateSchema>;
export type TemplateWithId = Template & { id: string };
