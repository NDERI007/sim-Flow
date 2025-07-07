import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClientFromRequest } from '../../../lib/supabase-server/server';

// Helper to extract `id` from request URL
function getIdFromUrl(req: NextRequest) {
  const url = new URL(req.url);
  const segments = url.pathname.split('/');
  return segments[segments.length - 1]; // assumes [...]/[id]/route.ts
}

// PATCH: Update a template
export async function PATCH(req: NextRequest) {
  const { supabase, user, error } = await getSupabaseClientFromRequest(req);
  if (error || !supabase || !user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const id = getIdFromUrl(req);
  const { name, content } = await req.json();

  if (!name || !content) {
    return NextResponse.json(
      { error: 'Missing name or content' },
      { status: 400 },
    );
  }

  const { error: updateError } = await supabase
    .from('templates')
    .update({ name, content })
    .eq('id', id)
    .eq('user_id', user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE: Remove a template
export async function DELETE(req: NextRequest) {
  const { supabase, user, error } = await getSupabaseClientFromRequest(req);
  if (error || !supabase || !user) {
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
