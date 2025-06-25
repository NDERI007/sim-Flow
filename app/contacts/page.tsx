'use client';

import { useState } from 'react';
import ContactGroupForm from '../components/Contact-comp/contact-form';
import ContactGroupList from '../components/Contact-comp/Group-list';
import { useContactGroups } from '../lib/contactGroup'; // ✅ use the custom hook
import { ContactGroup } from '../lib/smsStore';

export default function ContactGroupsPage() {
  const { groups, error, isLoading } = useContactGroups(); // ✅ cleaner
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);

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
          editingGroup={editingGroup}
          setEditingGroup={setEditingGroup}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Groups List */}
      {isLoading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error.message}</p>}
      {groups && <ContactGroupList groups={groups} onEdit={handleEdit} />}
    </div>
  );
}
