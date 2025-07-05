// /app/api/send-sms/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { PostgrestError } from '@supabase/supabase-js';

// Setup BullMQ
const connection = new Redis(process.env.REDIS_URL!, {
  tls: {},
  maxRetriesPerRequest: null,
});
const smsQueue = new Queue('smsQueue', { connection });
type GroupContact = {
  contact: {
    id: string;
    phone: string;
  } | null;
  group_id: string;
};

function validateAndFormatKenyanNumber(
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

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: () => {},
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      to_number = [],
      message,
      scheduledAt,
      contact_group_ids = [],
    } = body;
    console.log('📨 Incoming SMS payload:', {
      to_number,
      message,
      scheduledAt,
      contact_group_ids,
    });

    if (typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { message: 'Message cannot be blank.' },
        { status: 400 },
      );
    }

    let delay = 0;
    if (scheduledAt) {
      const scheduledTime = new Date(scheduledAt);
      if (isNaN(scheduledTime.getTime()) || scheduledTime <= new Date()) {
        return NextResponse.json(
          { message: 'Invalid future date' },
          { status: 400 },
        );
      }
      delay = scheduledTime.getTime() - Date.now();
    }

    // 🟢 Fetch numbers from groups (if any)
    let groupNumbers: { id: string; phone: string; group_id: string }[] = [];

    if (Array.isArray(contact_group_ids) && contact_group_ids.length > 0) {
      const { data: groupContacts, error: groupError } = (await supabase
        .from('contact_group_members')
        .select(
          `
          group_id,
    contact:contacts (
      id,
      phone
    )
  `,
        )
        .in('group_id', contact_group_ids)) as unknown as {
        data: GroupContact[];
        error: PostgrestError | null;
      };

      if (groupError) {
        console.error('Failed to fetch group contacts:', groupError);
        return NextResponse.json(
          { message: 'Failed to fetch contacts' },
          { status: 500 },
        );
      }
      console.log('📇 Raw group contacts:', groupContacts);

      groupNumbers = (groupContacts ?? [])
        .filter((row) => row.contact?.id && row.contact?.phone && row.group_id)
        .map((row) => ({
          id: row.contact.id,
          phone: row.contact.phone,
          group_id: row.group_id,
        }));
    }

    // Validate manual numbers if provided
    let manualNumbers: string[] = [];
    if (Array.isArray(to_number) && to_number.length > 0) {
      try {
        manualNumbers = validateAndFormatKenyanNumber(to_number, { dev: true });
      } catch (err) {
        if (err instanceof Error) {
          return NextResponse.json({ message: err.message }, { status: 400 });
        }

        return NextResponse.json({ message: 'Unknown error' }, { status: 500 });
      }
    }

    // Merge & deduplicate all numbers
    const allRecipients = [
      ...new Set([...manualNumbers, ...groupNumbers.map((g) => g.phone)]),
    ];

    if (allRecipients.length === 0) {
      return NextResponse.json(
        { message: 'No valid recipients found.' },
        { status: 400 },
      );
    }
    console.log(
      '📦 Recipients to insert into message_contacts:',
      allRecipients,
    );

    const segmentsPerMessage = Math.ceil((message.length || 0) / 160) || 1;
    const totalSegments = segmentsPerMessage * allRecipients.length;

    // 📝 Insert a single message row
    const { data: messageRow, error: insertError } = await supabase
      .from('messages')
      .insert([
        {
          user_id: user.id,
          message,
          status: scheduledAt ? 'scheduled' : 'queued',
          scheduled_at: scheduledAt
            ? new Date(scheduledAt).toISOString()
            : null,
        },
      ])
      .select()
      .single();

    if (insertError || !messageRow) {
      return NextResponse.json(
        { message: 'Failed to insert message', error: insertError?.message },
        { status: 500 },
      );
    }

    //  Insert into message_contacts join table
    // 🟢 Insert into message_contacts with group_id
    const { error: joinError } = await supabase.from('message_contacts').insert(
      groupNumbers.map(({ id, group_id }) => ({
        message_id: messageRow.id,
        contact_id: id,
        group_id,
      })),
    );

    if (joinError) {
      console.error('❌ Supabase insert error:', {
        message: joinError.message,
        details: joinError.details,
        hint: joinError.hint,
      });
      return NextResponse.json(
        { message: 'Failed to link contacts', error: joinError?.message },
        { status: 500 },
      );
    }

    // 📬 Queue the job once (with full recipient list)
    await smsQueue.add(
      'send_sms',
      {
        message_id: messageRow.id,
        user_id: user.id,
        message,
        to_number: allRecipients,
        metadata: { source: 'dashboard', scheduled: Boolean(scheduledAt) },
      },
      {
        delay,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return NextResponse.json({
      success: true,
      recipients: allRecipients.length,
      scheduled: Boolean(scheduledAt),
      scheduledFor: scheduledAt ?? null,
      totalSegments,
    });
  } catch (err) {
    console.error('❌ Error in /api/send-sms:', err);

    if (err instanceof Error) {
      return NextResponse.json(
        {
          message: 'Internal Server Error',
          error: err.message,
          stack: err.stack ?? null,
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      {
        message: 'Internal Server Error',
        error: err?.message || String(err),
        stack: err?.stack || null,
      },
      { status: 500 },
    );
  }
}
