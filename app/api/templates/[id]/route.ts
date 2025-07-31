import { NextRequest, NextResponse } from 'next/server';
import { ServerClient } from '../../../lib/supabase/serverClient';
import { templateSchema } from '../../../lib/schema/template';
import { ZodError } from 'zod';
import { treeifyError } from 'zod';

// Helper to extract `id` from request URL
function getIdFromUrl(req: NextRequest) {
  const url = new URL(req.url);
  const segments = url.pathname.split('/');
  return segments[segments.length - 1]; // assumes [...]/[id]/route.ts
}

async function SupabaseRequest(req: NextRequest, res: NextResponse) {
  const supabase = ServerClient(req, res);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: 'Invalid user' };
  }

  return { supabase, user };
}

// PATCH: Update a template
export async function PATCH(req: NextRequest) {
  const res = NextResponse.next();
  const { supabase, user, error } = await SupabaseRequest(req, res);
  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const id = getIdFromUrl(req);
  if (!id || typeof id !== 'string') {
    return NextResponse.json(
      { error: 'Missing or invalid ID' },
      { status: 400 },
    );
  }
  try {
    const body = await req.json();
    const parsed = templateSchema.parse(body);
    const { label, content } = {
      label: parsed.label.trim(),
      content: parsed.content.trim(),
    };
    if (!label || !content) {
      return NextResponse.json(
        { error: 'Missing name or content' },
        { status: 400 },
      );
    }

    const { error: updateError } = await supabase
      .from('templates')
      .update({ label, content })
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ZodError) {
      const tree = treeifyError(err);
      console.warn(' Zod validation failed in templateUpdate');

      return NextResponse.json(
        {
          message: 'Invalid input for template.',
          issues: tree, // Contains detailed form-like errors
        },
        { status: 400 },
      );
    }
  }
}

// DELETE: Remove a template
export async function DELETE(req: NextRequest) {
  const res = NextResponse.next();
  const { supabase, user, error } = await SupabaseRequest(req, res);
  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const id = getIdFromUrl(req);
  if (!id) {
    return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
  }

  const { error: deleteError } = await supabase
    .from('templates')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
