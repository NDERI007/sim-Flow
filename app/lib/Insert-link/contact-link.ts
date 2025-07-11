import { SupabaseClient } from '@supabase/supabase-js';

type GroupContact = { id: string; group_id: string };

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
  message,
  scheduledAt,
  groupContacts,
  to_number,
  user_id,
}: {
  supabase: SupabaseClient;
  message: string;
  scheduledAt?: string;
  groupContacts: GroupContact[];
  to_number: string[];
  user_id: string;
}): Promise<MessageRow> {
  try {
    if (groupContacts.length > 0) {
      const groupContactsPayload = groupContacts.map(({ id, group_id }) => ({
        contact_id: id,
        group_id,
      }));

      const { data, error } = await supabase.rpc(
        'insert_message_with_contacts',
        {
          p_message: message,
          p_status: scheduledAt ? 'scheduled' : 'queued',
          p_scheduled_at: scheduledAt
            ? new Date(scheduledAt).toISOString()
            : null,
          p_group_contacts: groupContactsPayload,
          p_user_id: user_id,
        },
      );

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
            user_id,
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
            to_number,
            message,
            user_id,
            status: scheduledAt ? 'scheduled' : 'queued',
            scheduled_at: scheduledAt
              ? new Date(scheduledAt).toISOString()
              : null,
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
            user_id,
            status: scheduledAt ? 'scheduled' : 'queued',
            scheduled_at: scheduledAt
              ? new Date(scheduledAt).toISOString()
              : null,
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
