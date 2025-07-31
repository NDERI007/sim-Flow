import { PrepareRecipientsSchema } from '../schema/recipients';
import { calculateSmsSegments } from '../smsSegm/segments';
import { validateAndFormatKenyanNumber } from '../validation/phoneN';

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

export function prepareRecipients(raw: unknown): PreparedRecipientsResult {
  const {
    manualNumbers = [],
    groupContacts = [],
    message,
    devMode = false,
  } = PrepareRecipientsSchema.parse(raw); // Validated at runtime

  const formattedManual = validateAndFormatKenyanNumber(manualNumbers, {
    dev: devMode,
  });

  const groupPhonesRaw = groupContacts.map((c) => c.phone.trim());

  const formattedGroup = validateAndFormatKenyanNumber(groupPhonesRaw, {
    dev: devMode,
  });

  const merged = [...formattedManual, ...formattedGroup];
  const deduped = Array.from(new Set(merged));

  const segmentsPerMessage = calculateSmsSegments(message);
  const totalSegments = segmentsPerMessage * deduped.length;

  return {
    allPhones: deduped,
    totalRecipients: deduped.length,
    segmentsPerMessage,
    totalSegments,
    debug: {
      manualCount: formattedManual.length,
      groupCount: formattedGroup.length,
    },
  };
}
