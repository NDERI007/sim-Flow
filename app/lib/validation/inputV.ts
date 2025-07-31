import { ZodError } from 'zod';
import { treeifyError } from 'zod';
import { NextResponse } from 'next/server';

export async function validateInput<T>(
  schema: { parse: (data: unknown) => T },
  body: unknown,
) {
  try {
    const parsed = schema.parse(body);
    return { data: parsed, error: null };
  } catch (err) {
    if (err instanceof ZodError) {
      return {
        data: null,
        error: NextResponse.json(
          {
            message: 'Invalid request body',
            issues: treeifyError(err),
          },
          { status: 400 },
        ),
      };
    }

    return {
      data: null,
      error: NextResponse.json(
        { message: 'Unexpected input error', detail: String(err) },
        { status: 400 },
      ),
    };
  }
}
