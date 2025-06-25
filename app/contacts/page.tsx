'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import ContactGroupForm from '../components/Contact-comp/contact-form';
import ContactGroupList from '../components/Contact-comp/Group-list';
import { useContactGroups } from '../lib/contactGroup'; // ✅ use the custom hook
import { ContactGroup } from '../lib/smsStore';

export default function ContactGroupsPage() {
  const { groups, error, isLoading, mutate } = useContactGroups(); // ✅ cleaner
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);

  // Supabase real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('public:contact_groups')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contact_groups' },
        () => mutate(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'contact_groups' },
        () => mutate(),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'contact_groups' },
        () => mutate(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mutate]);

  const handleEdit = (group: ContactGroup) => {
    setEditingGroup(group);
    setShowForm(true);
  };

  const handleNewGroup = () => {
    setEditingGroup(null);
    setShowForm(true);
  };
  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('contact_groups')
      .delete()
      .eq('id', id);
    if (!error) mutate(); // re-fetch with SWR
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Contact Groups</h1>
        <button
          onClick={handleNewGroup}
          className="rounded-xl bg-purple-600 px-5 py-2 font-semibold text-white shadow-md transition hover:scale-105"
        >
          + New Group
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <ContactGroupForm
          editingGroup={editingGroup}
          setEditingGroup={setEditingGroup}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Groups List */}
      {isLoading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error.message}</p>}
      {groups && (
        <ContactGroupList
          groups={groups}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
