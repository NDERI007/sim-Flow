'use server';

import { createClient } from '../supabase/serverSSR';
export async function deleteScheduledMessage(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Unauthorized' };
  }

  const { data: msg, error: fetchError } = await supabase
    .from('messages')
    .select('id, user_id, status')
    .eq('id', id)
    .single();

  if (fetchError || !msg) {
    return { error: 'Message not found' };
  }

  if (msg.user_id !== user.id) {
    return { error: 'Forbidden' };
  }

  if (msg.status !== 'scheduled') {
    return { error: 'Only scheduled messages can be deleted' };
  }

  const { error: deleteError } = await supabase
    .from('messages')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return { error: 'Failed to delete message' };
  }

  return { success: true };
}
