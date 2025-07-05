// lib/validators/phone.ts
export function validateAndFormatKenyanNumber(
  inputs: string[],
  options?: { dev?: boolean },
): string[] {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const raw of inputs) {
    const cleaned = raw
      .trim()
      .replace(/[\s\-().]/g, '')
      .replace(/^(\+)?254/, '0');
    const isValid = /^07\d{8}$/.test(cleaned);

    if (options?.dev) {
      if (isValid) console.log(`✅ Fixed: ${raw} → ${cleaned}`);
      else console.log(`🔴 Invalid: ${raw}`);
    }

    if (isValid) valid.push(cleaned);
    else invalid.push(raw);
  }

  if (invalid.length > 0) {
    throw new Error(`Invalid phone number(s): ${invalid.join(', ')}`);
  }

  return valid;
}
