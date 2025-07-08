import { NextResponse, type NextRequest } from 'next/server';
import Redis from 'ioredis';
import { prepareRecipients } from '../../lib/prepareRE/receipients';
import { FlowProducer } from 'bullmq';
import { getSupabaseClientFromRequest } from '../../lib/supabase-server/server';

// Redis & BullMQ
const connection = new Redis(process.env.REDIS_URL!, {
  tls: {},
  maxRetriesPerRequest: null,
});
const flowProducer = new FlowProducer({ connection });

// Define the batch size for SMS jobs
const BATCH_SIZE = 500;

export async function POST(req: NextRequest) {
  try {
    const { supabase, user, error } = await getSupabaseClientFromRequest(req);
    if (error || !user || !supabase) {
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

    let groupContacts: { id: string; phone: string; group_id: string }[] = [];

    if (Array.isArray(contact_group_ids) && contact_group_ids.length > 0) {
      const { data, error } = await supabase.rpc('get_contacts_by_group_ids', {
        group_ids: contact_group_ids,
      });
      console.log('Raw rpc', data);
      console.log('raw rpc error if any', error);

      if (error) {
        return NextResponse.json(
          { message: 'Failed to fetch group contacts', error: error.message },
          { status: 500 },
        );
      }

      groupContacts = (data ?? []).map((row) => ({
        id: row.contact_id,
        phone: row.phone,
        group_id: row.group_id,
      }));
    }

    const { allPhones, totalRecipients, totalSegments, segmentsPerMessage } =
      prepareRecipients({
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

    const groupContactsPayload = groupContacts.map(({ id, group_id }) => ({
      contact_id: id,
      group_id,
    }));

    console.log('📝 Sending to RPC:', {
      user_id: user.id,
      message,
      status: scheduledAt ? 'scheduled' : 'queued',
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      group_contacts_payload: groupContactsPayload,
    });

    const { data: messageRows, error: rpcError } = await supabase.rpc(
      'insert_message_with_contacts',
      {
        p_user_id: user.id,
        p_message: message,
        p_status: scheduledAt ? 'scheduled' : 'queued',
        p_scheduled_at: scheduledAt
          ? new Date(scheduledAt).toISOString()
          : null,
        p_group_contacts: groupContactsPayload,
      },
    );
    console.log('📬 RPC Result:', messageRows);
    console.log('❌ RPC Error:', rpcError);

    const messageRow = messageRows?.[0];

    if (rpcError || !messageRow) {
      return NextResponse.json(
        {
          message: 'Failed to save message and contacts',
          error: rpcError?.message,
        },
        { status: 500 },
      );
    }

    // Create batches of phone numbers
    const phoneBatches = [];
    for (let i = 0; i < allPhones.length; i += BATCH_SIZE) {
      phoneBatches.push(allPhones.slice(i, i + BATCH_SIZE));
    }

    // Create a job for each batch
    if (phoneBatches.length > 0) {
      // Build parent + child jobs using FlowProducer
      await flowProducer.add({
        name: `send_sms_flow_${messageRow.id}`,
        queueName: 'smsQueue',
        data: {
          message_id: messageRow.id,
          user_id: user.id,
          totalRecipients,
          provider: 'onfon',
          metadata: {
            source: 'dashboard',
            scheduled: Boolean(scheduledAt),
          },
        },
        opts: {
          delay, // handles scheduled SMS
          attempts: 1,
          removeOnComplete: true,
        },
        children: phoneBatches.map((batch, i) => ({
          name: 'send_sms_batch',
          queueName: 'smsQueue',
          data: {
            message_id: messageRow.id,
            user_id: user.id,
            message,
            to_number: batch,
            segmentsPerMessage,
            provider: 'onfon',
            metadata: {
              source: 'dashboard',
              batchIndex: i,
            },
          },
          opts: {
            delay: i * 1000, // Optional: stagger batches 1s apart
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        })),
      });
    }

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
