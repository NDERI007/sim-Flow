import { NextRequest, NextResponse } from 'next/server';
import { ServerClient } from '../../../lib/supabase/serverClient';

// Manually extract user ID from URL
function getIdFromUrl(req: NextRequest) {
  const url = new URL(req.url);
  const segments = url.pathname.split('/');
  return segments[segments.length - 1]; // should be the [id] segment
}

export async function PATCH(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = ServerClient(req, res);

  const id = getIdFromUrl(req);
  if (!id) {
    return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
  }

  try {
    // 3. Parse and validate input
    const body = await req.json();
    const { sender_id, quota, role } = body;

    // 4. Call Supabase RPC
    const { error: rpcError } = await supabase.rpc('update_user_admin', {
      uid: id,
      new_sender_id: sender_id ?? null,
      new_quota: quota ?? null,
      new_role: role ?? null,
    });

    if (rpcError) {
      console.error('Supabase RPC Error:', rpcError.message);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error) {
      console.error('Unexpected Error while updating user:', err.message);
      return NextResponse.json(
        { error: 'Something went wrong: ' + err.message },
        { status: 500 },
      );
    }

    // Fallback for non-Error values (rare but possible)
    console.error('Unknown error caught:', err);
    return NextResponse.json(
      { error: 'An unknown error occurred while updating user.' },
      { status: 500 },
    );
  }
}
