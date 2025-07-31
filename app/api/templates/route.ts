import { NextRequest, NextResponse } from 'next/server';
import { ServerClient } from '../../lib/supabase/serverClient';
import { templateSchema } from '../../lib/schema/template';
import { treeifyError, ZodError } from 'zod';

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

export async function GET(req: NextRequest) {
  const res = NextResponse.next();
  const { supabase, user, error } = await SupabaseRequest(req, res);
  if (error) return NextResponse.json({ error }, { status: 401 });

  const { data, error: fetchError } = await supabase
    .from('templates')
    .select('*')
    .eq('user_id', user.id);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const res = NextResponse.next();
  const { supabase, user, error } = await SupabaseRequest(req, res);
  if (error) return NextResponse.json({ error }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = templateSchema.parse(body);

    const { label, content } = {
      label: parsed.label.trim(),
      content: parsed.content.trim(),
    };

    await supabase
      .from('templates')
      .insert([{ label, content, user_id: user.id }]);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ZodError) {
      const tree = treeifyError(err);
      console.warn('Zod validation failed in template insert');
      return NextResponse.json(
        { message: 'Invalid input', issues: tree },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
