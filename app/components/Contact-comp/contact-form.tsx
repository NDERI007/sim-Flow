'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { mutate } from 'swr';
import { supabase } from '../../lib/supabase/BrowserClient';
import { useAuthStore } from '../../lib/WithAuth/AuthStore';
import { ContactGroup, ContactGroupSchema } from '../../lib/schema/contact';

interface Props {
  editingGroup: (ContactGroup & { id: string }) | null;
  setEditingGroup: (group: ContactGroup | null) => void;
  onClose: () => void;
}

export default function ContactGroupForm({
  editingGroup,
  setEditingGroup,
  onClose,
}: Props) {
  const { user } = useAuthStore();
  const userId = user?.id;
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactGroup>({
    resolver: zodResolver(ContactGroupSchema),
    defaultValues: {
      group_name: '',
      contacts: [{ name: '', phone: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'contacts',
  });

  useEffect(() => {
    if (editingGroup) {
      reset({
        group_name: editingGroup.group_name,
        contacts: editingGroup.contacts,
      });
    } else {
      reset({
        group_name: '',
        contacts: [{ name: '', phone: '' }],
      });
    }
  }, [editingGroup, reset]);

  const onSubmit = async (data: ContactGroup) => {
    if (!userId) {
      setMessage('❌ You must be logged in.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const cleanedContacts = data.contacts.map((c) => ({
        name: c.name.trim(),
        phone: c.phone.trim(),
        user_id: userId,
      }));

      let groupId = editingGroup?.id;

      if (!editingGroup) {
        const { data: existing, error: existsError } = await supabase
          .from('contact_groups')
          .select('id')
          .eq('user_id', userId)
          .eq('group_name', data.group_name)
          .maybeSingle();

        if (existsError) throw existsError;
        if (existing) {
          setMessage('A group with this name already exists.');
          setLoading(false);
          return;
        }
      }

      if (editingGroup) {
        const { error } = await supabase
          .from('contact_groups')
          .update({ group_name: data.group_name })
          .eq('id', editingGroup.id)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase
          .from('contact_groups')
          .insert({ group_name: data.group_name, user_id: userId })
          .select()
          .single();
        if (error) throw error;
        groupId = created.id;
      }

      const { error: upsertError } = await supabase
        .from('contacts')
        .upsert(cleanedContacts, { onConflict: 'user_id,phone' });
      if (upsertError) throw upsertError;

      const { data: allContacts, error: fetchError } = await supabase
        .from('contacts')
        .select('id,phone')
        .in(
          'phone',
          cleanedContacts.map((c) => c.phone),
        )
        .eq('user_id', userId);
      if (fetchError) throw fetchError;

      const contactIds = allContacts.map((c) => c.id);

      if (editingGroup) {
        const { error: unlinkError } = await supabase
          .from('contact_group_members')
          .delete()
          .eq('group_id', editingGroup.id);

        if (unlinkError) throw unlinkError;
      }

      const linkData = contactIds.map((contact_id) => ({
        contact_id,
        group_id: groupId,
      }));

      const { error: linkError } = await supabase
        .from('contact_group_members')
        .upsert(linkData, { onConflict: 'contact_id,group_id' });
      if (linkError) throw linkError;

      setMessage('✅ Group saved!');
      reset();
      setEditingGroup(null);
      onClose();
      await mutate('rpc:contacts-with-groups');
    } catch (err) {
      setMessage(
        err instanceof Error ? `❌ ${err.message}` : 'Unexpected error',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-8 rounded-2xl bg-slate-900 p-6 text-gray-200 shadow-2xl">
      <h2 className="mb-6 text-2xl font-semibold">
        {editingGroup ? 'Edit Group' : 'Create New Group'}
      </h2>

      {message && (
        <p
          className={`mb-4 font-medium ${
            message.includes('✅') ? 'text-green-500' : 'text-pink-400'
          }`}
        >
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-400">
            Group Name
          </label>
          <input
            type="text"
            {...register('group_name')}
            className="w-full rounded-xl bg-slate-800 px-4 py-3 text-gray-100 outline-none"
            placeholder="e.g. Marketing Team"
          />
          {errors.group_name && (
            <p className="text-sm text-pink-400">{errors.group_name.message}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-400">
            Contacts
          </label>
          {fields.map((field, index) => (
            <div key={field.id} className="mb-3 flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Name"
                {...register(`contacts.${index}.name`)}
                className="min-w-[150px] flex-1 rounded-xl bg-slate-800 px-4 py-2 text-gray-100 outline-none"
              />
              <input
                type="text"
                placeholder="Phone"
                {...register(`contacts.${index}.phone`)}
                className="min-w-[150px] flex-1 rounded-xl bg-slate-800 px-4 py-2 text-gray-100 outline-none"
              />
              <button
                type="button"
                onClick={() => remove(index)}
                className="rounded bg-gray-800 px-3 text-white hover:bg-gray-700"
              >
                ✕
              </button>
              <div className="w-full">
                {errors.contacts?.[index]?.name && (
                  <p className="text-sm text-pink-400">
                    {errors.contacts[index]?.name?.message}
                  </p>
                )}
                {errors.contacts?.[index]?.phone && (
                  <p className="text-sm text-pink-400">
                    {errors.contacts[index]?.phone?.message}
                  </p>
                )}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => append({ name: '', phone: '' })}
            className="mt-2 rounded-xl bg-pink-900 px-4 py-2 text-white hover:bg-pink-800"
          >
            + Add Contact
          </button>

          {errors.contacts && typeof errors.contacts.message === 'string' && (
            <p className="text-sm text-pink-400">{errors.contacts.message}</p>
          )}
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-pink-900 py-3 text-white shadow-lg hover:scale-105 disabled:opacity-50"
          >
            {loading
              ? 'Saving...'
              : editingGroup
                ? 'Update Group'
                : 'Create Group'}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingGroup(null);
              onClose();
            }}
            className="flex-1 rounded-xl bg-slate-700 py-3 text-white shadow-lg hover:scale-105"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
