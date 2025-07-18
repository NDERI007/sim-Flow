import { SupabaseClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';
type GroupContact = { id: string; group_id: string };

function LocalInputToUTC(input: string): string {
  return DateTime.fromISO(input, { zone: 'Africa/Nairobi' }) // interpret as EAT
    .toUTC()
    .toISO(); // convert to UTC ISO string
}

export type MessageRow = {
  id: string;
  to_number: string[] | null;
  message: string;
  status: 'queued' | 'scheduled' | 'sent' | 'failed';
  scheduled_at: string | null;
  created_at: string;
};

export async function insertMessage({
  supabase,
  user_id,
  message,
  scheduledAt,
  groupContacts,
  to_number,
}: {
  supabase: SupabaseClient;
  user_id: string;
  message: string;
  scheduledAt?: string;
  groupContacts: GroupContact[];
  to_number: string[];
}): Promise<MessageRow> {
  try {
    if (groupContacts.length > 0) {
      const groupContactsPayload = groupContacts.map(({ id, group_id }) => ({
        contact_id: id,
        group_id,
      }));

      const { data, error } = await supabase.rpc('insert_message_with_groups', {
        p_uid: user_id,
        p_message: message,
        p_status: scheduledAt ? 'scheduled' : 'queued',
        p_scheduled_at: scheduledAt ? LocalInputToUTC(scheduledAt) : null,
        p_group_contacts: groupContactsPayload,
      });

      if (error || !data?.[0]) {
        console.error('❌ insertMessage RPC Error:', {
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
          inputs: {
            message,
            status: scheduledAt ? 'scheduled' : 'queued',
            scheduledAt,
            groupContactsPayload,
          },
        });

        throw new Error(
          error?.message ?? 'Insert message with contacts failed.',
        );
      }

      return data[0] as MessageRow;
    } else {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            user_id,
            to_number,
            message,
            status: scheduledAt ? 'scheduled' : 'queued',
            scheduled_at: scheduledAt ? LocalInputToUTC(scheduledAt) : null,
          },
        ])
        .select()
        .single();

      if (error || !data) {
        console.error('❌ insertMessage Direct Insert Error:', {
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
          inputs: {
            to_number,
            message,
            status: scheduledAt ? 'scheduled' : 'queued',
            scheduled_at: scheduledAt ? LocalInputToUTC(scheduledAt) : null,
          },
        });

        throw new Error(error?.message ?? 'Insert message failed.');
      }

      return data as MessageRow;
    }
  } catch (err) {
    console.error('❌ insertMessage Unexpected Error:', {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : null,
    });

    throw err;
  }
}
