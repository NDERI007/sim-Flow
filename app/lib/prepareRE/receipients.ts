import { validateAndFormatKenyanNumber } from '../validator/phoneN';

export type Contact = {
  id: string;
  phone: string;
  group_id?: string;
};

export type PrepareRecipientsOptions = {
  manualNumbers?: string[];
  groupContacts?: Contact[];
  message: string;
  devMode?: boolean;
};

export type PreparedRecipientsResult = {
  allPhones: string[];
  totalRecipients: number;
  segmentsPerMessage: number;
  totalSegments: number;
  debug?: {
    manualCount: number;
    groupCount: number;
  };
};

export function prepareRecipients({
  manualNumbers = [],
  groupContacts = [],
  message,
  devMode = false,
}: PrepareRecipientsOptions): PreparedRecipientsResult {
  // Validate + format manual numbers
  const formattedManual = validateAndFormatKenyanNumber(manualNumbers, {
    dev: devMode,
  });

  const groupPhones = groupContacts
    .filter((c) => c.phone && /^07\d{8}$/.test(c.phone))
    .map((c) => c.phone.trim());

  const merged = [...formattedManual, ...groupPhones];

  const deduped = Array.from(new Set(merged));

  const segmentsPerMessage = Math.ceil((message?.length || 1) / 160) || 1;
  const totalSegments = segmentsPerMessage * deduped.length;

  return {
    allPhones: deduped,
    totalRecipients: deduped.length,
    segmentsPerMessage,
    totalSegments,
    debug: {
      manualCount: formattedManual.length,
      groupCount: groupPhones.length,
    },
  };
}
