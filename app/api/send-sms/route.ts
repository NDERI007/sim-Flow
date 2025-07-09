import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import { FlowProducer } from 'bullmq';
import { prepareRecipients } from '../../lib/prepareRE/receipients';
import { fetchGroupContacts } from '../../lib/fetchContacts/fetchgroup';
import {
  insertMessage,
  type MessageRow,
} from '../../lib/Insert-link/contact-link';

// Redis & BullMQ setup
const connection = new Redis(process.env.REDIS_URL!, {
  tls: {},
  maxRetriesPerRequest: null,
});
const flowProducer = new FlowProducer({ connection });
const BATCH_SIZE = 500;

export async function POST(req: NextRequest) {
  try {
    const rawAuth = req.headers.get('authorization');
    const token = rawAuth?.toLowerCase().startsWith('bearer ')
      ? rawAuth.slice(7)
      : null;

    if (!token) {
      console.warn('⚠️ Missing or malformed Authorization header');
      return NextResponse.json(
        { message: 'Missing or invalid token' },
        { status: 401 },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      },
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('❌ Failed to validate token:', { error, user });
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      to_number = [],
      message,
      scheduledAt,
      contact_group_ids = [],
      testmode,
    } = body;

    console.log('📨 Incoming send-sms request:', {
      user: user.id,
      to_number,
      message,
      scheduledAt,
      contact_group_ids,
      testmode,
    });

    if (typeof message !== 'string' || message.trim().length === 0) {
      console.warn('⚠️ Message is empty');
      return NextResponse.json(
        { message: 'Message cannot be blank.' },
        { status: 400 },
      );
    }

    let delay = 0;
    if (scheduledAt) {
      const scheduledTime = new Date(scheduledAt);
      if (isNaN(scheduledTime.getTime()) || scheduledTime <= new Date()) {
        console.warn('⚠️ Invalid or past scheduledAt:', { scheduledAt });
        return NextResponse.json(
          { message: 'Invalid future date' },
          { status: 400 },
        );
      }
      delay = scheduledTime.getTime() - Date.now();
    }

    let groupContacts = [];
    if (Array.isArray(contact_group_ids) && contact_group_ids.length > 0) {
      try {
        groupContacts = await fetchGroupContacts(contact_group_ids, token);
      } catch (err) {
        console.error('❌ fetchGroupContacts failed:', {
          error: err instanceof Error ? err.message : err,
          stack: err instanceof Error ? err.stack : null,
          contact_group_ids,
        });
        return NextResponse.json(
          {
            message: 'Failed to fetch contacts',
            error: err instanceof Error ? err.message : String(err),
          },
          { status: 500 },
        );
      }
    }

    const { allPhones, totalRecipients, totalSegments, segmentsPerMessage } =
      prepareRecipients({
        manualNumbers: to_number,
        groupContacts,
        message,
        devMode: true,
      });

    console.log('✅ Recipients prepared:', {
      totalRecipients,
      totalSegments,
      hasPhones: allPhones.length > 0,
    });

    if (totalRecipients === 0) {
      console.warn('⚠️ No valid recipients found');
      return NextResponse.json(
        { message: 'No valid recipients found.' },
        { status: 400 },
      );
    }

    let messageRow: MessageRow;
    try {
      messageRow = await insertMessage({
        supabase,
        message,
        scheduledAt,
        groupContacts,
        to_number,
        user_id: user.id,
      });
      console.log('✅ Message inserted with ID:', messageRow.id);
    } catch (err) {
      console.error('❌ insertMessage failed:', {
        error: err instanceof Error ? err.message : err,
        stack: err instanceof Error ? err.stack : null,
        inputs: {
          message,
          scheduledAt,
          groupContacts,
          to_number,
          user_id: user.id,
        },
      });
      return NextResponse.json(
        { message: (err as Error).message ?? 'Failed to insert message' },
        { status: 500 },
      );
    }

    const phoneBatches = [];
    for (let i = 0; i < allPhones.length; i += BATCH_SIZE) {
      phoneBatches.push(allPhones.slice(i, i + BATCH_SIZE));
    }
    // STEP 2: Create contact_map: phone -> contact_id | null
    const contact_map: Record<string, string | null> = {};

    // From groupContacts
    for (const contact of groupContacts ?? []) {
      if (contact.phone) {
        contact_map[contact.phone] = contact.id;
      }
    }

    // From manualNumbers
    for (const number of to_number ?? []) {
      contact_map[number] = null;
    }

    try {
      if (phoneBatches.length > 0) {
        await flowProducer.add({
          name: `send_sms_flow_${messageRow.id}`,
          queueName: 'smsQueue',
          data: {
            message_id: messageRow.id,
            totalRecipients,
            provider: 'onfon',
            metadata: {
              source: 'dashboard',
              scheduled: Boolean(scheduledAt),
            },
          },
          opts: {
            delay,
            attempts: 1,
            removeOnComplete: true,
          },
          children: phoneBatches.map((batch, i) => ({
            name: 'send_sms_batch',
            queueName: 'smsQueue',
            data: {
              message_id: messageRow.id,
              message,
              to_number: batch,
              contact_map,
              segmentsPerMessage,
              provider: 'onfon',
              metadata: {
                source: 'dashboard',
                batchIndex: i,
              },
            },
            opts: {
              delay: i * 1000,
              attempts: 1,
              backoff: { type: 'exponential', delay: 5000 },
              removeOnComplete: true,
              removeOnFail: false,
            },
          })),
        });
        console.log('✅ Flow added to BullMQ:', {
          batches: phoneBatches.length,
          delay,
        });
      }
    } catch (err) {
      console.error('❌ BullMQ flowProducer failed:', {
        error: err instanceof Error ? err.message : err,
        stack: err instanceof Error ? err.stack : null,
      });
      return NextResponse.json(
        { message: 'Failed to queue jobs', error: String(err) },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      recipients: totalRecipients,
      scheduled: Boolean(scheduledAt),
      scheduledFor: scheduledAt ?? null,
      totalSegments,
    });
  } catch (err) {
    console.error('❌ Uncaught error in /api/send-sms:', {
      error: err instanceof Error ? err.message : err,
      stack: err instanceof Error ? err.stack : null,
    });
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
