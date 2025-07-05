import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { PostgrestError } from '@supabase/supabase-js';
import { prepareRecipients } from '../../lib/prepareRE/receipients';

// Redis & BullMQ
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

    // Fetch group contacts from Supabase
    let groupContacts: { id: string; phone: string; group_id: string }[] = [];

    if (Array.isArray(contact_group_ids) && contact_group_ids.length > 0) {
      const { data, error } = (await supabase
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

      if (error) {
        return NextResponse.json(
          { message: 'Failed to fetch contacts' },
          { status: 500 },
        );
      }

      groupContacts = (data ?? [])
        .filter((row) => row.contact?.id && row.contact?.phone && row.group_id)
        .map((row) => ({
          id: row.contact!.id,
          phone: row.contact!.phone,
          group_id: row.group_id,
        }));
    }

    const { allPhones, totalRecipients, totalSegments } = prepareRecipients({
      manualNumbers: to_number,
      groupContacts,
      message,
      devMode: true,
    });

    if (totalRecipients === 0) {
      return NextResponse.json(
        { message: 'No valid recipients found.' },
        { status: 400 },
      );
    }

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

    // Link group contacts (if any) via join table
    if (groupContacts.length > 0) {
      const { error: joinError } = await supabase
        .from('message_contacts')
        .insert(
          groupContacts.map(({ id, group_id }) => ({
            message_id: messageRow.id,
            contact_id: id,
            group_id,
          })),
        );

      if (joinError) {
        return NextResponse.json(
          { message: 'Failed to link contacts', error: joinError?.message },
          { status: 500 },
        );
      }
    }

    //Queue for sending
    await smsQueue.add(
      'send_sms',
      {
        message_id: messageRow.id,
        user_id: user.id,
        message,
        to_number: allPhones,
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
      recipients: totalRecipients,
      scheduled: Boolean(scheduledAt),
      scheduledFor: scheduledAt ?? null,
      totalSegments,
    });
  } catch (err) {
    console.error('❌ Error in /api/send-sms:', err);

    return NextResponse.json(
      {
        message: 'Internal Server Error',
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : null,
      },
      { status: 500 },
    );
  }
}
