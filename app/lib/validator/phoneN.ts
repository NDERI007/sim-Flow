export function validateAndFormatKenyanNumber(
  inputs: string[],
  options?: { dev?: boolean },
): string[] {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const raw of inputs) {
    let cleaned = raw.trim().replace(/[\s\-().]/g, '');

    // Normalize to E.164 without the +
    if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
    if (cleaned.startsWith('0')) cleaned = '254' + cleaned.slice(1);
    else if (cleaned.startsWith('7')) cleaned = '254' + cleaned;
    else if (!cleaned.startsWith('254')) {
      invalid.push(raw);
      if (options?.dev) console.log(`🔴 Invalid: ${raw}`);
      continue;
    }

    // Final validation
    if (/^2547\d{8}$/.test(cleaned)) {
      valid.push(cleaned);
      if (options?.dev) console.log(`✅ Valid: ${raw} → ${cleaned}`);
    } else {
      invalid.push(raw);
      if (options?.dev) console.log(`🔴 Invalid: ${raw}`);
    }
  }

  if (invalid.length > 0) {
    throw new Error(`Invalid phone number(s): ${invalid.join(', ')}`);
  }

  return valid;
}
