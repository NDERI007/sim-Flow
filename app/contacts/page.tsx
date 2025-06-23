'use client';

import { useEffect, useState } from 'react';
import { useContactGroupStore, type ContactGroup } from '@/app/lib/smsStore';
import ContactGroupForm from '../components/Contact-comp/contact-form';
import ContactGroupList from '../components/Contact-comp/Group-list';

interface Props {
  userId: string;
}

export default function ContactGroupsPage({ userId }: Props) {
  const { groups, loading, fetchGroups } = useContactGroupStore();

  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);

  // Fetch contact groups when the component mounts
  useEffect(() => {
    if (userId) fetchGroups(userId);
  }, [userId, fetchGroups]);

  const handleEdit = (group: ContactGroup) => {
    setEditingGroup(group);
    setShowForm(true);
  };

  const handleNewGroup = () => {
    setEditingGroup(null);
    setShowForm(true);
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
          userId={userId}
          editingGroup={editingGroup}
          setEditingGroup={setEditingGroup}
          onClose={() => setShowForm(false)}
          onRefresh={() => fetchGroups(userId)}
        />
      )}

      {/* Groups */}
      {loading ? (
        <p className="text-gray-500">Loading groups...</p>
      ) : (
        <ContactGroupList groups={groups} onEdit={handleEdit} />
      )}
    </div>
  );
}
